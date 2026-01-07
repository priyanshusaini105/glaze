/**
 * Concierge Agent (Planner)
 *
 * Uses AI to generate an enrichment execution plan based on the input.
 * Decides which tools to run in what order.
 */

import { generateObject } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod";
import { logger } from "@trigger.dev/sdk";
import type { EnrichmentPlan, NormalizedInput, EnrichmentFieldKey } from "../types/enrichment";
import { providers } from "../tools/providers";

// Initialize Groq via OpenAI-compatible API
const groq = createOpenAI({
    baseURL: "https://api.groq.com/openai/v1",
    apiKey: process.env.GROQ_API_KEY,
});

// Schema for the plan
const PlanStepSchema = z.object({
    step: z.number(),
    tool: z.string().describe("Provider name to call"),
    field: z.string().describe("Field to enrich"),
    priority: z.enum(["high", "medium", "low"]),
});

const EnrichmentPlanSchema = z.object({
    plan: z.array(PlanStepSchema),
    maxCostCents: z.number(),
    notes: z.string().optional(),
});

/**
 * Generate an enrichment plan for a given input.
 */
export async function generateEnrichmentPlan(
    input: NormalizedInput,
    fieldsToEnrich: EnrichmentFieldKey[],
    budgetCents: number = 100
): Promise<EnrichmentPlan> {
    logger.info("🧠 Concierge: Generating enrichment plan", {
        rowId: input.rowId,
        fieldsToEnrich,
        budgetCents,
    });

    // Build context about available providers
    const availableProviders = providers.map((p) => ({
        name: p.name,
        tier: p.tier,
        costCents: p.costCents,
    }));

    const systemPrompt = `You are an enrichment planning agent. Your job is to create an optimal execution plan for data enrichment.

Available providers:
${JSON.stringify(availableProviders, null, 2)}

Rules:
1. Prefer FREE providers first, then CHEAP, then PREMIUM.
2. Total cost must not exceed the budget.
3. If linkedinUrl is provided, prioritize LinkedIn provider for person fields.
4. If domain is provided, use it for company lookups and email inference.
5. Order steps logically - get foundational data (name, company) before derived data (email).
6. Include notes explaining your reasoning.`;

    const userPrompt = `Create an enrichment plan for this input:
${JSON.stringify(input, null, 2)}

Fields to enrich: ${fieldsToEnrich.join(", ")}
Budget: ${budgetCents} cents`;

    try {
        const result = await generateObject({
            model: groq("llama-3.3-70b-versatile"),
            schema: EnrichmentPlanSchema,
            system: systemPrompt,
            prompt: userPrompt,
            temperature: 0.3,
        });

        logger.info("✅ Concierge: Plan generated", {
            steps: result.object.plan.length,
            estimatedCost: result.object.plan.reduce((sum: number, s: { tool: string }) => {
                const provider = providers.find((p) => p.name === s.tool);
                return sum + (provider?.costCents || 0);
            }, 0),
        });

        return result.object as EnrichmentPlan;
    } catch (error) {
        logger.warn("⚠️ Concierge: LLM planning failed, using fallback", {
            error: error instanceof Error ? error.message : "Unknown error",
        });

        // Fallback: Simple rule-based planning
        return generateFallbackPlan(input, fieldsToEnrich, budgetCents);
    }
}

/**
 * Fallback rule-based planner when LLM is unavailable.
 */
function generateFallbackPlan(
    input: NormalizedInput,
    fieldsToEnrich: EnrichmentFieldKey[],
    budgetCents: number
): EnrichmentPlan {
    const plan: EnrichmentPlan["plan"] = [];
    let stepNum = 1;
    let remainingBudget = budgetCents;

    // Priority order: free first, then cheap, then premium
    const tierOrder: ("free" | "cheap" | "premium")[] = ["free", "cheap", "premium"];

    for (const field of fieldsToEnrich) {
        for (const tier of tierOrder) {
            const provider = providers.find(
                (p) => p.tier === tier && p.canEnrich(field) && p.costCents <= remainingBudget
            );

            if (provider) {
                plan.push({
                    step: stepNum++,
                    tool: provider.name,
                    field,
                    priority: tier === "free" ? "high" : tier === "cheap" ? "medium" : "low",
                });
                remainingBudget -= provider.costCents;
                break; // Found a provider for this field
            }
        }
    }

    return {
        plan,
        maxCostCents: budgetCents,
        notes: "Fallback rule-based plan: free providers first, then cheap, then premium.",
    };
}

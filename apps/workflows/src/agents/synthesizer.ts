/**
 * Synthesizer Agent
 *
 * Uses LLM to generate missing fields (like shortBio) from available evidence.
 * Always marks outputs with low confidence and "llm" source.
 */

import { generateObject } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod";
import { logger } from "@trigger.dev/sdk";
import type {
    CanonicalData,
    EnrichmentFieldKey,
    ProviderResult,
} from "../types/enrichment";

const groq = createOpenAI({
    baseURL: "https://api.groq.com/openai/v1",
    apiKey: process.env.GROQ_API_KEY,
});

const SynthesizedFieldSchema = z.object({
    shortBio: z.string().optional().describe("1-2 sentence professional summary"),
    companySummary: z.string().optional().describe("1-2 sentence company description"),
});

/**
 * Synthesize missing fields using LLM.
 */
export async function synthesizeMissingFields(
    canonical: CanonicalData,
    evidence: ProviderResult[],
    missingFields: EnrichmentFieldKey[]
): Promise<ProviderResult[]> {
    // Only synthesize specific fields
    const synthesizableFields = ["shortBio", "companySummary"] as const;
    const fieldsToSynthesize = missingFields.filter((f) =>
        synthesizableFields.includes(f as (typeof synthesizableFields)[number])
    );

    if (fieldsToSynthesize.length === 0) {
        logger.info("✨ Synthesizer: No fields to synthesize");
        return [];
    }

    logger.info("🤖 Synthesizer: Generating fields", { fields: fieldsToSynthesize });

    // Build context from canonical data and evidence
    const context = {
        name: canonical["name"]?.value,
        company: canonical["company"]?.value,
        title: canonical["title"]?.value,
        location: canonical["location"]?.value,
    };

    const systemPrompt = `You are a professional profile synthesizer. Given available data, generate concise professional summaries.

Rules:
1. Keep each summary to 1-2 sentences max.
2. Be factual and professional.
3. Don't make up specific details not present in the data.
4. If data is insufficient, return a generic but professional summary.`;

    const userPrompt = `Generate summaries based on this data:
${JSON.stringify(context, null, 2)}

Generate for fields: ${fieldsToSynthesize.join(", ")}`;

    try {
        const result = await generateObject({
            model: groq("llama-3.3-70b-versatile"),
            schema: SynthesizedFieldSchema,
            system: systemPrompt,
            prompt: userPrompt,
            temperature: 0.5,
        });

        const synthesized: ProviderResult[] = [];

        if (result.object.shortBio && fieldsToSynthesize.includes("shortBio")) {
            synthesized.push({
                field: "shortBio",
                value: result.object.shortBio,
                confidence: 0.4, // Low confidence for LLM-generated
                source: "llm",
                timestamp: new Date().toISOString(),
                raw: { generated: true },
            });
        }

        if (result.object.companySummary && fieldsToSynthesize.includes("companySummary")) {
            synthesized.push({
                field: "companySummary",
                value: result.object.companySummary,
                confidence: 0.4,
                source: "llm",
                timestamp: new Date().toISOString(),
                raw: { generated: true },
            });
        }

        logger.info("✅ Synthesizer: Generated fields", {
            count: synthesized.length,
        });

        return synthesized;
    } catch (error) {
        logger.error("❌ Synthesizer: Failed to generate", {
            error: error instanceof Error ? error.message : "Unknown error",
        });
        return [];
    }
}

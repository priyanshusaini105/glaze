/**
 * Multi-Agent Enrichment Workflow
 *
 * Main Trigger.dev workflow that orchestrates all agents for data enrichment.
 *
 * Flow:
 * 1. Normalize input
 * 2. Generate plan (Concierge)
 * 3. Execute plan (Specialist providers)
 * 4. Reconcile evidence
 * 5. Synthesize missing fields (optional LLM fallback)
 * 6. Persist results
 */

import { task, logger } from "@trigger.dev/sdk";
import type {
    EnrichmentFieldKey,
    EnrichmentWorkflowContext,
    NormalizedInput,
    ProviderResult,
} from "../types/enrichment";
import { generateEnrichmentPlan } from "../agents/concierge";
import { reconcileEvidence, getMissingFields } from "../agents/reconciler";
import { synthesizeMissingFields } from "../agents/synthesizer";
import { getProviderByName } from "../tools/providers";

// Default fields to enrich
const DEFAULT_FIELDS: EnrichmentFieldKey[] = [
    "name",
    "company",
    "emailCandidates",
    "title",
    "location",
    "shortBio",
];

/**
 * Main multi-agent enrichment task.
 */
export const multiAgentEnrichment = task({
    id: "multi-agent-enrichment",
    maxDuration: 300, // 5 minutes max
    retry: {
        maxAttempts: 2,
    },
    run: async (
        payload: {
            rowId: string;
            tableId: string;
            inputData: Record<string, unknown>;
            fieldsToEnrich?: EnrichmentFieldKey[];
            budgetCents?: number;
        },
        { ctx }
    ) => {
        const startTime = Date.now();
        logger.info("🚀 Multi-Agent Enrichment: Starting", {
            rowId: payload.rowId,
            tableId: payload.tableId,
        });

        // Initialize context
        const context: EnrichmentWorkflowContext = {
            input: normalizeInput(payload.rowId, payload.tableId, payload.inputData),
            evidence: [],
            provenance: [],
            costCentsTotal: 0,
            status: "processing",
            errors: [],
        };

        const fieldsToEnrich = payload.fieldsToEnrich || DEFAULT_FIELDS;
        const budgetCents = payload.budgetCents || 100;

        try {
            // Step 1: Generate Plan (Concierge)
            logger.info("📋 Step 1: Generating enrichment plan");
            context.plan = await generateEnrichmentPlan(
                context.input,
                fieldsToEnrich,
                budgetCents
            );

            // Step 2: Execute Plan (Specialists)
            logger.info("⚡ Step 2: Executing enrichment plan", {
                steps: context.plan.plan.length,
            });

            for (const step of context.plan.plan) {
                // Check budget
                if (context.costCentsTotal >= budgetCents) {
                    logger.warn("💰 Budget exhausted, stopping execution");
                    break;
                }

                const provider = getProviderByName(step.tool);
                if (!provider) {
                    logger.warn(`⚠️ Provider not found: ${step.tool}`);
                    continue;
                }

                try {
                    logger.info(`🔌 Calling provider: ${step.tool} for field: ${step.field}`);
                    const result = await provider.enrich(
                        context.input,
                        step.field as EnrichmentFieldKey
                    );

                    if (result) {
                        context.evidence.push(result);
                        context.costCentsTotal += result.costCents || 0;
                        logger.info(`✅ Provider success: ${step.tool}`, {
                            field: step.field,
                            confidence: result.confidence,
                        });
                    }
                } catch (error) {
                    const errorMsg = error instanceof Error ? error.message : "Unknown error";
                    context.errors.push(`${step.tool}: ${errorMsg}`);
                    logger.error(`❌ Provider failed: ${step.tool}`, { error: errorMsg });
                }
            }

            // Step 3: Reconcile Evidence
            logger.info("🔄 Step 3: Reconciling evidence", {
                evidenceCount: context.evidence.length,
            });

            const { canonical, provenance, ambiguousFields } = reconcileEvidence(
                context.evidence
            );
            context.canonical = canonical;
            context.provenance = provenance;

            // Step 4: Synthesize Missing Fields (LLM Fallback)
            const missingFields = getMissingFields(canonical, fieldsToEnrich);
            if (missingFields.length > 0) {
                logger.info("🤖 Step 4: Synthesizing missing fields", { missingFields });
                const synthesized = await synthesizeMissingFields(
                    canonical,
                    context.evidence,
                    missingFields
                );

                // Add synthesized results to evidence and re-reconcile
                if (synthesized.length > 0) {
                    context.evidence.push(...synthesized);
                    const recon = reconcileEvidence(context.evidence);
                    context.canonical = recon.canonical;
                    context.provenance = recon.provenance;
                }
            }

            // Step 5: Determine final status
            const finalMissing = getMissingFields(context.canonical!, fieldsToEnrich);
            if (finalMissing.length > 0 || ambiguousFields.length > 0) {
                context.status = "ambiguous";
            } else {
                context.status = "completed";
            }

            const duration = Date.now() - startTime;
            logger.info("🎉 Multi-Agent Enrichment: Complete", {
                status: context.status,
                durationMs: duration,
                costCents: context.costCentsTotal,
                fieldsEnriched: Object.keys(context.canonical || {}),
            });

            return {
                rowId: payload.rowId,
                tableId: payload.tableId,
                status: context.status,
                canonical: context.canonical,
                provenance: context.provenance,
                costCentsTotal: context.costCentsTotal,
                errors: context.errors,
                durationMs: duration,
            };
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : "Unknown error";
            logger.error("💥 Multi-Agent Enrichment: Failed", { error: errorMsg });
            context.status = "failed";
            context.errors.push(errorMsg);

            return {
                rowId: payload.rowId,
                tableId: payload.tableId,
                status: "failed",
                errors: context.errors,
                durationMs: Date.now() - startTime,
            };
        }
    },
});

/**
 * Normalize input data for enrichment.
 */
function normalizeInput(
    rowId: string,
    tableId: string,
    data: Record<string, unknown>
): NormalizedInput {
    return {
        rowId,
        tableId,
        name: (data.name as string) || undefined,
        domain: extractDomain(data),
        linkedinUrl: (data.linkedinUrl as string) || (data.linkedin as string) || undefined,
        email: (data.email as string) || undefined,
        company: (data.company as string) || (data.companyName as string) || undefined,
        raw: data,
    };
}

/**
 * Extract domain from various input sources.
 */
function extractDomain(data: Record<string, unknown>): string | undefined {
    if (data.domain) return data.domain as string;
    if (data.website) {
        try {
            const url = new URL(data.website as string);
            return url.hostname.replace(/^www\./, "");
        } catch {
            return undefined;
        }
    }
    if (data.email) {
        const email = data.email as string;
        const atIndex = email.indexOf("@");
        if (atIndex > 0) {
            return email.slice(atIndex + 1);
        }
    }
    return undefined;
}

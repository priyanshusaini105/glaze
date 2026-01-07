/**
 * Agentic Enrichment Workflow
 * 
 * Main workflow that orchestrates the complete enrichment pipeline:
 * 1. Identity Resolution (Phase 1)
 * 2. Deterministic Enrichment (Phase 2)
 * 3. Email Verification (Phase 3)
 * 4. Agentic Control Loop (Phase 4)
 * 5. LLM Synthesis (Phase 5)
 * 
 * Follows the principle: Discover facts first → verify → normalize → only then let LLM summarize
 */

import { task, logger } from "@trigger.dev/sdk";
import { db } from "../db";
import type { EnrichmentFieldKey, NormalizedInput, ProviderResult, CanonicalData } from "../types/enrichment";

// Tools
import { resolveIdentity, hasMinimumIdentity } from "../tools/identity-resolver";
import { resetProvenanceStore, exportProvenanceRecords, getProvenanceSummary } from "../tools/provenance-recorder";

// Agents
import { generatePlan } from "../agents/planner";
import { verifyResults, getVerificationSummary } from "../agents/verifier";

// Providers
import { serperProvider } from "../tools/providers/serper-provider";
import { linkedInProvider } from "../tools/providers/linkedin-provider";
import { githubProvider } from "../tools/providers/github-provider";
import { companyScraperProvider } from "../tools/providers/company-scraper";
import { emailPatternInferenceProvider } from "../tools/email-pattern-inference";
import { emailVerifierProvider } from "../tools/email-verifier";

// LLM Synthesizers
import { bioSynthesizerProvider } from "../tools/bio-synthesizer";
import { companySummarizerProvider } from "../tools/company-summarizer";

// Services
import { CostGovernor, createCostGovernor } from "../services/cost-governor";
import { ConfidenceAggregator } from "../tools/confidence-aggregator";

/**
 * Payload for agentic enrichment task
 */
export interface AgenticEnrichmentPayload {
    tableId: string;
    rowId: string;
    fieldsToEnrich: EnrichmentFieldKey[];
    budgetCents?: number;
    mode?: 'critical' | 'normal' | 'bestEffort';
}

/**
 * Result from agentic enrichment
 */
export interface AgenticEnrichmentResult {
    status: 'success' | 'partial' | 'failed';
    rowId: string;
    canonical: CanonicalData;
    fieldsEnriched: EnrichmentFieldKey[];
    fieldsFailed: EnrichmentFieldKey[];
    costCents: number;
    durationMs: number;
    summary: {
        identity: { type: string; confidence: number };
        providers: string[];
        conflicts: number;
        llmSynthesized: string[];
    };
}

/**
 * All available providers
 */
const PROVIDERS = [
    serperProvider,
    linkedInProvider,
    githubProvider,
    companyScraperProvider,
    emailPatternInferenceProvider,
    emailVerifierProvider,
];

/**
 * Execute enrichment using a specific provider
 */
async function executeProvider(
    provider: typeof PROVIDERS[0],
    input: NormalizedInput,
    field: EnrichmentFieldKey,
    costGovernor: CostGovernor
): Promise<ProviderResult | null> {
    // Check if we can afford this provider
    if (!costGovernor.canAfford(provider.name, provider.costCents, input.rowId)) {
        logger.debug(`⏭️ Skipping ${provider.name} - budget limit`, { rowId: input.rowId });
        return null;
    }
    
    // Check if provider supports this field
    if (!provider.canEnrich(field)) {
        return null;
    }
    
    try {
        const result = await provider.enrich(input, field);
        
        if (result) {
            // Record the cost
            costGovernor.recordCost(input.rowId, input.tableId, provider.name, field, provider.costCents);
        }
        
        return result;
    } catch (error) {
        logger.error(`❌ Provider ${provider.name} failed`, {
            error: error instanceof Error ? error.message : "Unknown error",
            rowId: input.rowId,
            field,
        });
        return null;
    }
}

/**
 * Execute deterministic enrichment phase
 */
async function executeDeterministicPhase(
    input: NormalizedInput,
    fieldsToEnrich: EnrichmentFieldKey[],
    costGovernor: CostGovernor
): Promise<ProviderResult[]> {
    const results: ProviderResult[] = [];
    
    // Sort providers by tier (free first)
    const sortedProviders = costGovernor.sortByEfficiency([...PROVIDERS]);
    
    for (const field of fieldsToEnrich) {
        logger.info(`🔍 Enriching field: ${field}`, { rowId: input.rowId });
        
        // Try each provider for this field
        for (const provider of sortedProviders) {
            const result = await executeProvider(provider, input, field, costGovernor);
            
            if (result) {
                results.push(result);
                
                // For high-confidence results, we might skip remaining providers
                if (result.confidence >= 0.9) {
                    break;
                }
            }
        }
    }
    
    return results;
}

/**
 * Execute LLM synthesis phase
 */
async function executeSynthesisPhase(
    input: NormalizedInput,
    existingResults: ProviderResult[],
    fieldsToSynthesize: EnrichmentFieldKey[]
): Promise<ProviderResult[]> {
    const synthesized: ProviderResult[] = [];
    
    for (const field of fieldsToSynthesize) {
        if (field === 'shortBio') {
            const result = await bioSynthesizerProvider.enrich(input, field, existingResults);
            if (result) synthesized.push(result);
        } else if (field === 'companySummary') {
            const result = await companySummarizerProvider.enrich(input, field, existingResults);
            if (result) synthesized.push(result);
        }
    }
    
    return synthesized;
}

/**
 * Main agentic enrichment task
 */
export const agenticEnrichmentTask = task({
    id: "agentic-enrichment",
    maxDuration: 300, // 5 minutes
    retry: {
        maxAttempts: 2,
        minTimeoutInMs: 2000,
        maxTimeoutInMs: 10000,
        factor: 2,
    },
    queue: {
        name: "agentic-enrichment",
        concurrencyLimit: 10,
    },
    run: async (payload: AgenticEnrichmentPayload) => {
        const startTime = Date.now();
        const { tableId, rowId, fieldsToEnrich, budgetCents = 100, mode = 'normal' } = payload;
        
        logger.info("🚀 Agentic Enrichment: Starting", {
            rowId,
            tableId,
            fieldsToEnrich,
            budgetCents,
            mode,
        });
        
        // Initialize services
        const costGovernor = createCostGovernor({ totalCents: budgetCents });
        resetProvenanceStore();
        
        try {
            // ==========================================
            // PHASE 1: Load row and build input
            // ==========================================
            const row = await db.row.findUnique({
                where: { id: rowId },
                include: { table: true },
            });
            
            if (!row) {
                throw new Error(`Row not found: ${rowId}`);
            }
            
            const rawData = row.data as Record<string, unknown>;
            const input: NormalizedInput = {
                rowId,
                tableId,
                name: rawData.name as string | undefined,
                domain: rawData.domain as string | undefined,
                linkedinUrl: rawData.linkedinUrl as string | undefined,
                email: rawData.email as string | undefined,
                company: rawData.company as string | undefined,
                raw: rawData,
            };
            
            // ==========================================
            // PHASE 1: Identity Resolution
            // ==========================================
            logger.info("📍 Phase 1: Identity Resolution", { rowId });
            
            const identity = await resolveIdentity(input, fieldsToEnrich);
            
            if (!hasMinimumIdentity(identity)) {
                logger.warn("⚠️ Insufficient identity information", { rowId, identity });
                return {
                    status: 'failed' as const,
                    rowId,
                    canonical: {},
                    fieldsEnriched: [],
                    fieldsFailed: fieldsToEnrich,
                    costCents: 0,
                    durationMs: Date.now() - startTime,
                    summary: {
                        identity: { type: identity.entityType, confidence: identity.confidence },
                        providers: [],
                        conflicts: 0,
                        llmSynthesized: [],
                    },
                };
            }
            
            // Update input with resolved identity
            if (identity.canonicalName) input.name = identity.canonicalName;
            if (identity.canonicalCompany) input.company = identity.canonicalCompany;
            if (identity.domain) input.domain = identity.domain;
            if (identity.linkedinUrl) input.linkedinUrl = identity.linkedinUrl;
            
            // ==========================================
            // PHASE 2: Generate Plan
            // ==========================================
            logger.info("📍 Phase 2: Generating Plan", { rowId });
            
            const plan = await generatePlan(input, fieldsToEnrich, budgetCents);
            logger.info("📋 Plan generated", { rowId, steps: plan.plan.length, notes: plan.notes });
            
            // ==========================================
            // PHASE 3: Deterministic Enrichment
            // ==========================================
            logger.info("📍 Phase 3: Deterministic Enrichment", { rowId });
            
            const deterministicResults = await executeDeterministicPhase(input, fieldsToEnrich, costGovernor);
            logger.info("🔍 Deterministic phase complete", { 
                rowId, 
                results: deterministicResults.length,
            });
            
            // ==========================================
            // PHASE 4: Verification
            // ==========================================
            logger.info("📍 Phase 4: Verification", { rowId });
            
            const verification = await verifyResults(input, deterministicResults, { mode });
            const verificationSummary = getVerificationSummary(verification);
            
            logger.info("✅ Verification complete", {
                rowId,
                status: verification.status,
                accepted: verificationSummary.acceptedFields.length,
                escalated: verificationSummary.escalatedFields.length,
            });
            
            // ==========================================
            // PHASE 5: LLM Synthesis (if needed)
            // ==========================================
            const synthesisFields = fieldsToEnrich.filter(f => 
                f === 'shortBio' || f === 'companySummary'
            );
            
            let synthesizedResults: ProviderResult[] = [];
            const llmSynthesized: string[] = [];
            
            if (synthesisFields.length > 0 && deterministicResults.length >= 2) {
                logger.info("📍 Phase 5: LLM Synthesis", { rowId, fields: synthesisFields });
                
                synthesizedResults = await executeSynthesisPhase(input, deterministicResults, synthesisFields);
                
                for (const result of synthesizedResults) {
                    llmSynthesized.push(result.field);
                }
                
                logger.info("✨ Synthesis complete", { rowId, synthesized: llmSynthesized.length });
            }
            
            // ==========================================
            // PHASE 6: Aggregate and Finalize
            // ==========================================
            const allResults = [...deterministicResults, ...synthesizedResults];
            const aggregator = new ConfidenceAggregator();
            aggregator.addAll(allResults);
            const aggregated = aggregator.aggregate();
            
            // Build final canonical data
            const canonical: CanonicalData = {};
            const fieldsEnriched: EnrichmentFieldKey[] = [];
            const fieldsFailed: EnrichmentFieldKey[] = [];
            
            for (const [field, agg] of aggregated) {
                if (agg.canonicalValue !== null && agg.confidence >= 0.3) {
                    canonical[field] = {
                        value: agg.canonicalValue,
                        confidence: agg.confidence,
                        source: agg.sources.join(', '),
                        verified: agg.sources.some(s => s.includes('verified')),
                    };
                    fieldsEnriched.push(field);
                } else {
                    fieldsFailed.push(field);
                }
            }
            
            // Update row in database
            await db.row.update({
                where: { id: rowId },
                data: {
                    data: {
                        ...rawData,
                        ...Object.fromEntries(
                            Object.entries(canonical).map(([k, v]) => [k, v.value])
                        ),
                        _enrichment: {
                            canonical,
                            provenance: exportProvenanceRecords(),
                            timestamp: new Date().toISOString(),
                        },
                    },
                    status: fieldsFailed.length === 0 ? 'done' : 'ambiguous',
                    confidence: fieldsEnriched.length > 0
                        ? Object.values(canonical).reduce((sum, v) => sum + v.confidence, 0) / fieldsEnriched.length
                        : 0,
                    lastRunAt: new Date(),
                },
            });
            
            // Get final metrics
            const costStatus = costGovernor.getStatus();
            const provenanceSummary = getProvenanceSummary();
            
            const result: AgenticEnrichmentResult = {
                status: fieldsFailed.length === 0 ? 'success' : (fieldsEnriched.length > 0 ? 'partial' : 'failed'),
                rowId,
                canonical,
                fieldsEnriched,
                fieldsFailed,
                costCents: costStatus.usedCents,
                durationMs: Date.now() - startTime,
                summary: {
                    identity: { type: identity.entityType, confidence: identity.confidence },
                    providers: Object.keys(provenanceSummary.sourceBreakdown),
                    conflicts: verificationSummary.conflictFields.length,
                    llmSynthesized,
                },
            };
            
            logger.info("🎉 Agentic Enrichment: Complete", {
                rowId,
                status: result.status,
                fieldsEnriched: fieldsEnriched.length,
                fieldsFailed: fieldsFailed.length,
                costCents: result.costCents,
                durationMs: result.durationMs,
            });
            
            return result;
            
        } catch (error) {
            logger.error("❌ Agentic Enrichment: Failed", {
                rowId,
                error: error instanceof Error ? error.message : "Unknown error",
            });
            
            // Update row status to failed
            await db.row.update({
                where: { id: rowId },
                data: {
                    status: 'failed',
                    error: error instanceof Error ? error.message : "Unknown error",
                    lastRunAt: new Date(),
                },
            });
            
            throw error;
        }
    },
});

/**
 * Batch agentic enrichment task
 */
export const batchAgenticEnrichmentTask = task({
    id: "batch-agentic-enrichment",
    maxDuration: 1800, // 30 minutes
    retry: {
        maxAttempts: 1,
    },
    queue: {
        name: "batch-agentic-enrichment",
        concurrencyLimit: 2,
    },
    run: async (payload: {
        tableId: string;
        rowIds: string[];
        fieldsToEnrich: EnrichmentFieldKey[];
        budgetCentsPerRow?: number;
    }) => {
        const { tableId, rowIds, fieldsToEnrich, budgetCentsPerRow = 50 } = payload;
        
        logger.info("🚀 Batch Agentic Enrichment: Starting", {
            tableId,
            rowCount: rowIds.length,
            fieldsToEnrich,
        });
        
        const results: AgenticEnrichmentResult[] = [];
        
        for (const rowId of rowIds) {
            try {
                const result = await agenticEnrichmentTask.triggerAndWait({
                    tableId,
                    rowId,
                    fieldsToEnrich,
                    budgetCents: budgetCentsPerRow,
                });
                
                results.push(result.ok ? result.output : {
                    status: 'failed',
                    rowId,
                    canonical: {},
                    fieldsEnriched: [],
                    fieldsFailed: fieldsToEnrich,
                    costCents: 0,
                    durationMs: 0,
                    summary: {
                        identity: { type: 'unknown', confidence: 0 },
                        providers: [],
                        conflicts: 0,
                        llmSynthesized: [],
                    },
                });
            } catch (error) {
                logger.error("❌ Row enrichment failed", { rowId, error });
                results.push({
                    status: 'failed',
                    rowId,
                    canonical: {},
                    fieldsEnriched: [],
                    fieldsFailed: fieldsToEnrich,
                    costCents: 0,
                    durationMs: 0,
                    summary: {
                        identity: { type: 'unknown', confidence: 0 },
                        providers: [],
                        conflicts: 0,
                        llmSynthesized: [],
                    },
                });
            }
        }
        
        const successful = results.filter(r => r.status === 'success').length;
        const partial = results.filter(r => r.status === 'partial').length;
        const failed = results.filter(r => r.status === 'failed').length;
        const totalCost = results.reduce((sum, r) => sum + r.costCents, 0);
        
        logger.info("🎉 Batch Agentic Enrichment: Complete", {
            tableId,
            successful,
            partial,
            failed,
            totalCost,
        });
        
        return {
            tableId,
            totalRows: rowIds.length,
            successful,
            partial,
            failed,
            totalCostCents: totalCost,
            results,
        };
    },
});

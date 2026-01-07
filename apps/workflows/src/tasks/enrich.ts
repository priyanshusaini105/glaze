/**
 * Unified Enrichment Task
 * 
 * Single, clean entry point for all enrichment operations.
 * Replaces the multiple legacy enrichment tasks with a unified approach.
 */

import { task, logger } from "@trigger.dev/sdk";
import { orchestrator } from "@/core/orchestrator";
import type { EnrichmentFieldKey, NormalizedInput } from "@/types/enrichment";

// Import providers and plans to auto-register them
import '@/tools/providers/registry';
import '@/plans';

export interface UnifiedEnrichmentPayload {
  /** Normalized input data */
  input: NormalizedInput;
  /** Fields to enrich */
  fields: EnrichmentFieldKey[];
  /** Budget in cents */
  budgetCents?: number;
  /** Specific plan to use (optional) */
  planName?: string;
  /** Existing data to merge with */
  existingData?: Record<string, unknown>;
}

/**
 * Unified enrichment task
 * 
 * This task replaces:
 * - simple-enrichment-task
 * - agentic-enrichment
 * - multi-agent-enrichment
 */
export const enrichTask = task({
  id: "enrich",
  maxDuration: 300, // 5 minutes
  retry: {
    maxAttempts: 2,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 10000,
    factor: 2,
  },
  queue: {
    name: "enrichment",
    concurrencyLimit: 10,
  },
  run: async (payload: UnifiedEnrichmentPayload) => {
    const startTime = Date.now();
    
    logger.info("🚀 Starting unified enrichment", {
      fields: payload.fields,
      budgetCents: payload.budgetCents || 100,
      planName: payload.planName,
    });

    try {
      const result = await orchestrator.enrich(payload.input, {
        fields: payload.fields,
        budgetCents: payload.budgetCents || 100,
        existingData: payload.existingData,
        planName: payload.planName,
      });

      const durationMs = Date.now() - startTime;

      logger.info("✅ Enrichment completed successfully", {
        durationMs,
        fieldsEnriched: Object.keys(result.data).length,
        totalCost: result.costs.totalCents,
        planUsed: result.metadata.planUsed,
        toolsUsed: result.metadata.toolsUsed,
      });

      return result;
    } catch (error) {
      logger.error("❌ Enrichment failed", { error });
      throw error;
    }
  },
});

/**
 * Core Enrichment Orchestrator
 * 
 * Single, clean entry point for all enrichment operations.
 * Handles plan selection, tool execution, and result aggregation.
 */

import { logger } from '@trigger.dev/sdk';
import { getRegistry } from '@/core/registry';
import { getPlanRegistry } from '@/core/plan-registry';
import type { EnrichmentFieldKey, NormalizedInput } from '@/types/enrichment';

export interface EnrichmentOptions {
  /** Fields to enrich */
  fields: EnrichmentFieldKey[];
  /** Budget in cents */
  budgetCents: number;
  /** Existing data to merge with */
  existingData?: Record<string, unknown>;
  /** Specific plan to use (optional) */
  planName?: string;
  /** Abort signal for cancellation */
  signal?: AbortSignal;
}

export interface EnrichmentResult {
  /** Enriched data */
  data: Record<string, unknown>;
  /** Cost breakdown per source */
  costs: {
    totalCents: number;
    breakdown: Array<{ source: string; costCents: number }>;
  };
  /** Provenance tracking */
  provenance: Array<{
    field: string;
    source: string;
    confidence: number;
  }>;
  /** Execution metadata */
  metadata: {
    durationMs: number;
    toolsUsed: string[];
    planUsed: string;
  };
}

export class EnrichmentOrchestrator {
  /**
   * Execute enrichment
   */
  async enrich(
    input: NormalizedInput,
    options: EnrichmentOptions
  ): Promise<EnrichmentResult> {
    const startTime = Date.now();
    const planRegistry = getPlanRegistry();
    const toolRegistry = getRegistry();

    // Select plan
    const plan = options.planName
      ? planRegistry.get(options.planName)
      : planRegistry.getBest(input, options.fields);

    if (!plan) {
      throw new Error('No compatible plan found for the given input');
    }

    logger.info('Executing enrichment', {
      plan: plan.name,
      fields: options.fields,
      budget: options.budgetCents,
    });

    // Generate steps
    const steps = await plan.generateSteps(input, options.fields, options.budgetCents);
    
    // Execute steps
    const results: Record<string, unknown> = { ...options.existingData };
    const costs: Array<{ source: string; costCents: number }> = [];
    const provenance: Array<{ field: string; source: string; confidence: number }> = [];
    const toolsUsed = new Set<string>();
    let totalCost = 0;

    for (const step of steps) {
      // Check budget
      if (totalCost >= options.budgetCents) {
        logger.warn('Budget exceeded, stopping execution');
        break;
      }

      // Check cancellation
      if (options.signal?.aborted) {
        logger.warn('Enrichment cancelled');
        break;
      }

      // Get provider
      const provider = toolRegistry.get(step.tool);
      if (!provider) {
        logger.warn(`Provider not found: ${step.tool}`);
        continue;
      }

      try {
        logger.info(`Executing ${step.tool} for ${step.field}`);
        
        const result = await provider.execute(input, {
          budgetCents: options.budgetCents - totalCost,
          existingData: results as Record<string, unknown>,
          signal: options.signal,
        });

        // Merge results
        Object.assign(results, result);
        
        // Track costs (estimate: 1 cent per call * multiplier)
        const cost = Math.ceil(provider.costMultiplier * 1);
        totalCost += cost;
        costs.push({ source: step.tool, costCents: cost });
        
        // Track provenance
        for (const key of Object.keys(result)) {
          provenance.push({
            field: key,
            source: step.tool,
            confidence: 0.8, // TODO: Get from provider
          });
        }

        toolsUsed.add(step.tool);
      } catch (error) {
        logger.error(`Error executing ${step.tool}:`, error);
      }
    }

    const durationMs = Date.now() - startTime;

    return {
      data: results,
      costs: {
        totalCents: totalCost,
        breakdown: costs,
      },
      provenance,
      metadata: {
        durationMs,
        toolsUsed: Array.from(toolsUsed),
        planUsed: plan.name,
      },
    };
  }
}

// Export singleton instance
export const orchestrator = new EnrichmentOrchestrator();

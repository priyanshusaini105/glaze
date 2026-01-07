/**
 * Entity Enrichment Service
 * 
 * Handles the actual enrichment of entities using the waterfall strategy.
 * This is the production-optimized version that works with entities instead of cells.
 * 
 * Waterfall Strategy:
 * 1. Cache - Check if already enriched
 * 2. Free - Website scraping (0 cost)
 * 3. Cheap - Search/SERP APIs (low cost)
 * 4. Premium - LinkedIn API (high cost)
 */

import { logger } from "@trigger.dev/sdk";
import type { EntityTypeValue, EnrichedFieldValue } from "@repo/types";
import { EntityType } from "@repo/types";
import { enrichmentConfig } from "./enrichment-config";
import { mockProviders, getProvidersForTier, type EnrichmentData, type MockProvider } from "./mock-providers";

// ===== Types =====

export interface EntityEnrichmentInput {
  entityId: string;
  type: EntityTypeValue;
  identifier: string;
  normalizedIdentifier: string;
  requestedFields: string[];
  sourceData?: Record<string, unknown>;
  budgetCents: number;
  skipCache: boolean;
}

export interface EntityEnrichmentOutput {
  fields: Record<string, EnrichedFieldValue>;
  provenance: Array<{
    field: string;
    source: string;
    confidence: number;
  }>;
  costCents: number;
}

interface WaterfallContext {
  entity: EntityEnrichmentInput;
  fields: Record<string, EnrichedFieldValue>;
  provenance: Array<{ field: string; source: string; confidence: number }>;
  remainingFields: string[];
  costCents: number;
  notes: string[];
}

// ===== Simple In-Memory Cache =====

const entityCache = new Map<string, EntityEnrichmentOutput>();

function getCacheKey(entityId: string): string {
  return `entity:${entityId}`;
}

function getFromCache(entityId: string): EntityEnrichmentOutput | null {
  const key = getCacheKey(entityId);
  return entityCache.get(key) || null;
}

function setInCache(entityId: string, output: EntityEnrichmentOutput): void {
  const key = getCacheKey(entityId);
  entityCache.set(key, output);
}

// ===== Main Enrichment Function =====

/**
 * Enrich an entity using the waterfall strategy
 */
export async function enrichEntityWithProviders(
  input: EntityEnrichmentInput
): Promise<EntityEnrichmentOutput> {
  const startTime = Date.now();

  // Check cache first
  if (!input.skipCache) {
    const cached = getFromCache(input.entityId);
    if (cached) {
      logger.info("Cache hit for entity", { entityId: input.entityId });
      return cached;
    }
  }

  // Initialize context
  const ctx: WaterfallContext = {
    entity: input,
    fields: {},
    provenance: [],
    remainingFields: [...input.requestedFields],
    costCents: 0,
    notes: [],
  };

  // Run waterfall stages
  await runCacheStage(ctx);

  if (ctx.remainingFields.length > 0) {
    await runFreeStage(ctx);
  }

  if (ctx.remainingFields.length > 0) {
    await runCheapStage(ctx);
  }

  if (ctx.remainingFields.length > 0 && ctx.entity.budgetCents >= 10) {
    await runPremiumStage(ctx);
  }

  // Build output
  const output: EntityEnrichmentOutput = {
    fields: ctx.fields,
    provenance: ctx.provenance,
    costCents: ctx.costCents,
  };

  // Cache the result
  setInCache(input.entityId, output);

  const duration = Date.now() - startTime;
  logger.info("Entity enrichment completed", {
    entityId: input.entityId,
    fieldsEnriched: Object.keys(ctx.fields).length,
    costCents: ctx.costCents,
    durationMs: duration,
  });

  return output;
}

// ===== Waterfall Stages =====

/**
 * Stage 0: Check local cache for previously enriched data
 */
async function runCacheStage(ctx: WaterfallContext): Promise<void> {
  // Check if source data already has values for requested fields
  if (ctx.entity.sourceData) {
    for (const field of [...ctx.remainingFields]) {
      const existingValue = ctx.entity.sourceData[field];
      if (existingValue !== null && existingValue !== undefined && existingValue !== "") {
        ctx.fields[field] = {
          value: String(existingValue),
          confidence: 0.6, // Lower confidence for pre-existing data
          source: "existing",
          timestamp: new Date().toISOString(),
        };
        ctx.provenance.push({
          field,
          source: "existing",
          confidence: 0.6,
        });
        ctx.remainingFields = ctx.remainingFields.filter(f => f !== field);
      }
    }
  }
}

/**
 * Stage 1: Free enrichment (website scraping, public data)
 */
async function runFreeStage(ctx: WaterfallContext): Promise<void> {
  const providers = getProvidersForTier("free");

  for (const provider of providers) {
    if (ctx.remainingFields.length === 0) break;

    for (const field of [...ctx.remainingFields]) {
      if (!provider.canEnrich(field)) continue;

      try {
        const enriched = await provider.enrich({
          field,
          rowId: ctx.entity.entityId,
          existingData: ctx.entity.sourceData,
        });

        if (enriched[field] && enriched[field].value !== null) {
          const value = enriched[field];

          if (value.confidence >= enrichmentConfig.confidenceThreshold) {
            ctx.fields[field] = {
              value: value.value as string,
              confidence: value.confidence,
              source: value.source,
              timestamp: value.timestamp,
            };
            ctx.provenance.push({
              field,
              source: value.source,
              confidence: value.confidence,
            });
            ctx.remainingFields = ctx.remainingFields.filter(f => f !== field);
          }
        }
      } catch (error) {
        logger.warn("Free stage provider error", {
          provider: provider.name,
          field,
          error: error instanceof Error ? error.message : "Unknown",
        });
      }
    }
  }
}

/**
 * Stage 2: Cheap enrichment (search APIs, low-cost services)
 */
async function runCheapStage(ctx: WaterfallContext): Promise<void> {
  const providers = getProvidersForTier("cheap");

  for (const provider of providers) {
    if (ctx.remainingFields.length === 0) break;
    if (ctx.costCents + provider.costCents > ctx.entity.budgetCents) {
      ctx.notes.push(`Skipped ${provider.name}: budget exceeded`);
      continue;
    }

    for (const field of [...ctx.remainingFields]) {
      if (!provider.canEnrich(field)) continue;

      try {
        const enriched = await provider.enrich({
          field,
          rowId: ctx.entity.entityId,
          existingData: ctx.entity.sourceData,
        });

        if (enriched[field] && enriched[field].value !== null) {
          const value = enriched[field];
          ctx.costCents += provider.costCents;

          if (value.confidence >= enrichmentConfig.confidenceThreshold) {
            ctx.fields[field] = {
              value: value.value as string,
              confidence: value.confidence,
              source: value.source,
              timestamp: value.timestamp,
            };
            ctx.provenance.push({
              field,
              source: value.source,
              confidence: value.confidence,
            });
            ctx.remainingFields = ctx.remainingFields.filter(f => f !== field);
          }
        }
      } catch (error) {
        logger.warn("Cheap stage provider error", {
          provider: provider.name,
          field,
          error: error instanceof Error ? error.message : "Unknown",
        });
      }
    }
  }
}

/**
 * Stage 3: Premium enrichment (LinkedIn API, high-cost services)
 */
async function runPremiumStage(ctx: WaterfallContext): Promise<void> {
  const providers = getProvidersForTier("premium");

  for (const provider of providers) {
    if (ctx.remainingFields.length === 0) break;
    if (ctx.costCents + provider.costCents > ctx.entity.budgetCents) {
      ctx.notes.push(`Skipped ${provider.name}: budget exceeded`);
      continue;
    }

    // For premium, we enrich all remaining fields at once
    const fieldsToEnrich = ctx.remainingFields.filter(f => provider.canEnrich(f));

    if (fieldsToEnrich.length === 0) continue;

    try {
      // Premium providers typically return all fields at once
      for (const field of fieldsToEnrich) {
        const enriched = await provider.enrich({
          field,
          rowId: ctx.entity.entityId,
          existingData: ctx.entity.sourceData,
        });

        if (enriched[field] && enriched[field].value !== null) {
          const value = enriched[field];

          ctx.fields[field] = {
            value: value.value as string,
            confidence: value.confidence,
            source: value.source,
            timestamp: value.timestamp,
          };
          ctx.provenance.push({
            field,
            source: value.source,
            confidence: value.confidence,
          });
          ctx.remainingFields = ctx.remainingFields.filter(f => f !== field);
        }
      }

      // Charge once for premium provider
      ctx.costCents += provider.costCents;
    } catch (error) {
      logger.warn("Premium stage provider error", {
        provider: provider.name,
        error: error instanceof Error ? error.message : "Unknown",
      });
    }
  }
}

// ===== Batch Enrichment for Multiple Entities =====

/**
 * Enrich multiple entities in parallel
 * Used for optimal throughput when processing many entities
 */
export async function enrichEntitiesBatch(
  entities: EntityEnrichmentInput[],
  concurrency: number = 10
): Promise<Map<string, EntityEnrichmentOutput>> {
  const results = new Map<string, EntityEnrichmentOutput>();

  // Process in batches
  for (let i = 0; i < entities.length; i += concurrency) {
    const batch = entities.slice(i, i + concurrency);

    const batchResults = await Promise.allSettled(
      batch.map(entity => enrichEntityWithProviders(entity))
    );

    for (let j = 0; j < batchResults.length; j++) {
      const result = batchResults[j];
      const entity = batch[j];

      if (!entity) continue;

      if (result && result.status === "fulfilled") {
        results.set(entity.entityId, result.value);
      } else if (result && result.status === "rejected") {
        logger.error("Batch enrichment failed for entity", {
          entityId: entity.entityId,
          error: result.reason?.message || "Unknown error",
        });
      }
    }
  }

  return results;
}

/**
 * Clear the entity cache (for testing)
 */
export function clearEntityCache(): void {
  entityCache.clear();
}

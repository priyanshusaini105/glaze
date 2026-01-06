/**
 * Enrichment Service
 * 
 * Main entry point for cell enrichment using the waterfall strategy.
 * Orchestrates mock providers (or real providers when configured).
 * 
 * Waterfall Strategy:
 * 1. Cache - Check if already enriched
 * 2. Free - Website scraping (0 cost)
 * 3. Cheap - Search/SERP (low cost)
 * 4. Premium - LinkedIn API (high cost)
 */

import { logger } from '@trigger.dev/sdk';
import { enrichmentConfig } from './enrichment-config';
import {
    mockProviders,
    getProvidersForTier,
    type EnrichmentData,
    type EnrichedValue,
    type MockProvider,
} from './mock-providers';

// ============ Types ============

export interface CellEnrichmentResult {
    value: string | number | null;
    confidence: number;
    source: string;
    timestamp: string;
    metadata?: {
        cost?: number;
        providers?: string[];
        attempts?: number;
    };
}

export interface EnrichmentContext {
    columnKey: string;
    rowId: string;
    tableId: string;
    existingData?: Record<string, unknown>;
    budgetCents?: number;
}

interface WaterfallResult {
    data: EnrichmentData;
    cost: {
        totalCents: number;
        breakdown: Array<{ source: string; costCents: number }>;
    };
    provenance: Array<{ source: string; field: string; confidence: number }>;
    notes: string[];
}

// ============ Simple In-Memory Cache ============

const enrichmentCache = new Map<string, EnrichedValue>();

function getCacheKey(rowId: string, field: string): string {
    return `${rowId}:${field}`;
}

function getFromCache(rowId: string, field: string): EnrichedValue | null {
    const key = getCacheKey(rowId, field);
    return enrichmentCache.get(key) || null;
}

function setInCache(rowId: string, field: string, value: EnrichedValue): void {
    const key = getCacheKey(rowId, field);
    enrichmentCache.set(key, value);
}

// ============ Field Mapping ============

/**
 * Maps a column key to an enrichment field type
 */
function mapColumnKeyToField(columnKey: string): string {
    // For now, return the column key as-is
    // In the future, this could map UI column names to standardized field names
    return columnKey.toLowerCase().replace(/\s+/g, '_');
}

// ============ Waterfall Execution ============

/**
 * Run waterfall enrichment for a single field
 */
async function runWaterfallEnrichment(
    field: string,
    rowId: string,
    budgetCents: number
): Promise<WaterfallResult> {
    const result: WaterfallResult = {
        data: {},
        cost: { totalCents: 0, breakdown: [] },
        provenance: [],
        notes: [],
    };

    let remainingBudget = budgetCents;

    // Stage 1: Check cache
    const cached = getFromCache(rowId, field);
    if (cached) {
        result.data[field] = cached;
        result.provenance.push({
            source: 'cache',
            field,
            confidence: cached.confidence,
        });
        result.notes.push(`Cache hit for ${field}`);
        logger.info('Cache hit', { field, rowId });
        return result;
    }

    // Stage 2-4: Try providers in waterfall order
    const tiers = ['free', 'cheap', 'premium'] as const;

    for (const tier of tiers) {
        const providers = getProvidersForTier(tier);

        for (const provider of providers) {
            // Check if provider can enrich this field
            if (!provider.canEnrich(field)) {
                continue;
            }

            // Check budget for paid providers
            if (provider.costCents > remainingBudget) {
                result.notes.push(`Skipped ${provider.name}: insufficient budget (${remainingBudget}¢ < ${provider.costCents}¢)`);
                continue;
            }

            try {
                logger.info('Trying provider', {
                    provider: provider.name,
                    tier,
                    field,
                    cost: provider.costCents,
                });

                const enriched = await provider.enrich({ field, rowId });

                if (enriched[field] && enriched[field].value !== null) {
                    const enrichedValue = enriched[field];

                    // Check confidence threshold
                    if (enrichedValue.confidence >= enrichmentConfig.confidenceThreshold) {
                        result.data[field] = enrichedValue;
                        result.cost.totalCents += provider.costCents;
                        result.cost.breakdown.push({
                            source: provider.name,
                            costCents: provider.costCents,
                        });
                        result.provenance.push({
                            source: provider.name,
                            field,
                            confidence: enrichedValue.confidence,
                        });
                        result.notes.push(
                            `${provider.name}: enriched ${field} with confidence ${(enrichedValue.confidence * 100).toFixed(0)}%`
                        );

                        // Cache the result
                        setInCache(rowId, field, enrichedValue);

                        remainingBudget -= provider.costCents;

                        // Successfully enriched, return
                        return result;
                    } else {
                        result.notes.push(
                            `${provider.name}: confidence too low (${(enrichedValue.confidence * 100).toFixed(0)}% < ${(enrichmentConfig.confidenceThreshold * 100).toFixed(0)}%)`
                        );
                    }
                }
            } catch (error) {
                const errorMsg = error instanceof Error ? error.message : 'Unknown error';
                result.notes.push(`${provider.name} failed: ${errorMsg}`);
                logger.error('Provider failed', {
                    provider: provider.name,
                    field,
                    error: errorMsg,
                });
            }
        }
    }

    // If we got here, no provider succeeded with sufficient confidence
    // Return whatever we have (might be empty)
    if (Object.keys(result.data).length === 0) {
        result.notes.push(`No provider could enrich ${field} with sufficient confidence`);
    }

    return result;
}

// ============ Main Entry Point ============

/**
 * Enrich a cell using the waterfall provider strategy
 * 
 * This is the main function called by the Trigger.dev workflow.
 */
export async function enrichCellWithProviders(
    context: EnrichmentContext
): Promise<CellEnrichmentResult> {
    const { columnKey, rowId, tableId } = context;
    const budgetCents = context.budgetCents ?? enrichmentConfig.maxCostPerCellCents;

    logger.info('Starting cell enrichment', {
        columnKey,
        rowId,
        tableId,
        budget: budgetCents,
    });

    // Map column key to field name
    const field = mapColumnKeyToField(columnKey);

    // Run waterfall enrichment
    const waterfallResult = await runWaterfallEnrichment(field, rowId, budgetCents);

    // Build result
    const enrichedValue = waterfallResult.data[field];

    if (enrichedValue) {
        logger.info('Cell enrichment succeeded', {
            field,
            source: enrichedValue.source,
            confidence: enrichedValue.confidence,
            cost: waterfallResult.cost.totalCents,
        });

        return {
            value: enrichedValue.value,
            confidence: enrichedValue.confidence,
            source: enrichedValue.source,
            timestamp: enrichedValue.timestamp,
            metadata: {
                cost: waterfallResult.cost.totalCents,
                providers: waterfallResult.provenance.map((p) => p.source),
                attempts: waterfallResult.provenance.length,
            },
        };
    }

    // Fallback: Return a low-confidence result
    logger.warn('Cell enrichment failed, using fallback', {
        field,
        notes: waterfallResult.notes,
    });

    return {
        value: null,
        confidence: 0,
        source: 'none',
        timestamp: new Date().toISOString(),
        metadata: {
            cost: waterfallResult.cost.totalCents,
            providers: [],
            attempts: 0,
        },
    };
}

/**
 * Clear the enrichment cache
 * Useful for testing
 */
export function clearEnrichmentCache(): void {
    enrichmentCache.clear();
}

/**
 * Get cache stats
 */
export function getCacheStats(): { size: number } {
    return { size: enrichmentCache.size };
}

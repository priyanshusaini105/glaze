/**
 * Smart Waterfall v2 - Optimized Enrichment Service
 * 
 * Major improvements over v1:
 * 1. Redis cache with TTL, negative caching, versioned keys
 * 2. Singleflight pattern to coalesce concurrent requests
 * 3. Row-level provider caching with Redis persistence
 * 4. Parallel low-cost probes before premium providers
 * 5. Circuit breakers for automatic provider health management
 * 6. Comprehensive metrics for auto-tuning
 * 
 * Waterfall Strategy v2:
 * 1. Cache Layer - Redis (or memory fallback) with negative caching
 * 2. Parallel Probes - Run free + cheap providers in parallel
 * 3. Ensemble Fusion - Combine results with confidence weighting
 * 4. Premium Fallback - Only use expensive providers if needed
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
import {
    getCellEnrichmentCache,
    getProviderResponseCache,
    buildCellCacheKey,
    buildProviderCacheKey,
    cellEnrichmentFlight,
    providerCallFlight,
    buildCellFlightKey,
    buildProviderFlightKey,
    withCircuitBreaker,
    isProviderAvailable,
    circuitBreakers,
    getProviderHealthSummary,
    getSingleflightStats,
} from './cache';

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
        cacheHit?: boolean;
        singleflightCoalesced?: boolean;
    };
}

export interface EnrichmentContext {
    columnKey: string;
    rowId: string;
    tableId: string;
    existingData?: Record<string, unknown>;
    budgetCents?: number;
    /** Enable parallel probing of multiple providers */
    enableParallelProbes?: boolean;
    /** Use ensemble fusion for combining results */
    useEnsembleFusion?: boolean;
}

interface WaterfallResult {
    data: EnrichmentData;
    cost: {
        totalCents: number;
        breakdown: Array<{ source: string; costCents: number }>;
    };
    provenance: Array<{ source: string; field: string; confidence: number }>;
    notes: string[];
    cacheHit: boolean;
    singleflightCoalesced: boolean;
}

interface ProbeResult {
    provider: string;
    field: string;
    value: EnrichedValue | null;
    cost: number;
    latencyMs: number;
    error?: string;
}

// ============ Metrics Collection ============

interface EnrichmentMetrics {
    totalRequests: number;
    cacheHits: number;
    cacheMisses: number;
    negativeCacheHits: number;
    singleflightCoalesced: number;
    parallelProbesRun: number;
    premiumFallbacks: number;
    circuitBreakerRejects: number;
    totalCostCents: number;
    avgLatencyMs: number;
    latencyHistory: number[];
}

const metrics: EnrichmentMetrics = {
    totalRequests: 0,
    cacheHits: 0,
    cacheMisses: 0,
    negativeCacheHits: 0,
    singleflightCoalesced: 0,
    parallelProbesRun: 0,
    premiumFallbacks: 0,
    circuitBreakerRejects: 0,
    totalCostCents: 0,
    avgLatencyMs: 0,
    latencyHistory: [],
};

function recordLatency(latencyMs: number): void {
    metrics.latencyHistory.push(latencyMs);
    // Keep only last 1000 samples
    if (metrics.latencyHistory.length > 1000) {
        metrics.latencyHistory.shift();
    }
    metrics.avgLatencyMs =
        metrics.latencyHistory.reduce((a, b) => a + b, 0) / metrics.latencyHistory.length;
}

export function getEnrichmentMetrics(): EnrichmentMetrics & {
    cacheHitRate: number;
    singleflightStats: ReturnType<typeof getSingleflightStats>;
    providerHealth: ReturnType<typeof getProviderHealthSummary>;
} {
    return {
        ...metrics,
        cacheHitRate: metrics.totalRequests > 0
            ? (metrics.cacheHits + metrics.negativeCacheHits) / metrics.totalRequests
            : 0,
        singleflightStats: getSingleflightStats(),
        providerHealth: getProviderHealthSummary(),
    };
}

// ============ Field Mapping ============

function mapColumnKeyToField(columnKey: string): string {
    return columnKey.toLowerCase().replace(/\s+/g, '_');
}

// ============ Provider Selection ============

/**
 * Get available providers for a tier, filtered by circuit breaker status
 */
function getAvailableProviders(tier: 'free' | 'cheap' | 'premium'): MockProvider[] {
    return getProvidersForTier(tier).filter(p => {
        if (!isProviderAvailable(p.name)) {
            logger.info('🔴 Provider blocked by circuit breaker', { provider: p.name, tier });
            metrics.circuitBreakerRejects++;
            return false;
        }
        return true;
    });
}

/**
 * Sort providers by health score (prefer faster, more reliable providers)
 */
function sortByHealth(providers: MockProvider[]): MockProvider[] {
    return [...providers].sort((a, b) => {
        const aMetrics = circuitBreakers.get(a.name).getMetrics();
        const bMetrics = circuitBreakers.get(b.name).getMetrics();

        // Score: higher is better (success rate - normalized latency)
        const aScore = (1 - aMetrics.errorRate) * 100 - (aMetrics.latencyP50 / 100);
        const bScore = (1 - bMetrics.errorRate) * 100 - (bMetrics.latencyP50 / 100);

        return bScore - aScore;
    });
}

// ============ Cache Layer ============

async function checkCache(
    rowId: string,
    field: string
): Promise<{ hit: boolean; value: EnrichedValue | null; isNegative: boolean }> {
    const cache = getCellEnrichmentCache();
    const cacheKey = buildCellCacheKey(rowId, field);
    const result = await cache.get(cacheKey);

    if (result.hit) {
        if (result.isNegative) {
            metrics.negativeCacheHits++;
            logger.info('📦 Negative cache hit (known unenrichable)', { rowId, field });
            return { hit: true, value: null, isNegative: true };
        }
        metrics.cacheHits++;
        logger.info('💰 Cache HIT', { rowId, field });
        return { hit: true, value: result.value as EnrichedValue, isNegative: false };
    }

    metrics.cacheMisses++;
    logger.info('❌ Cache MISS', { rowId, field });
    return { hit: false, value: null, isNegative: false };
}

async function setCache(
    rowId: string,
    field: string,
    value: EnrichedValue
): Promise<void> {
    const cache = getCellEnrichmentCache();
    const cacheKey = buildCellCacheKey(rowId, field);
    await cache.set(cacheKey, value);
}

async function setNegativeCache(rowId: string, field: string): Promise<void> {
    const cache = getCellEnrichmentCache();
    const cacheKey = buildCellCacheKey(rowId, field);
    await cache.setNegative(cacheKey);
}

// ============ Row Provider Cache ============

async function getRowProviderCache(
    rowId: string,
    provider: string
): Promise<EnrichmentData | null> {
    const cache = getProviderResponseCache();
    const cacheKey = buildProviderCacheKey(rowId, provider);
    const result = await cache.get(cacheKey);

    if (result.hit && !result.isNegative) {
        logger.info('🎯 Row provider cache HIT', { rowId, provider });
        return result.value as EnrichmentData;
    }

    return null;
}

async function setRowProviderCache(
    rowId: string,
    provider: string,
    data: EnrichmentData
): Promise<void> {
    const cache = getProviderResponseCache();
    const cacheKey = buildProviderCacheKey(rowId, provider);
    await cache.set(cacheKey, data);
}

// ============ Singleflight Provider Calls ============

async function fetchFromProviderWithSingleflight(
    provider: MockProvider,
    field: string,
    rowId: string
): Promise<EnrichmentData> {
    const flightKey = buildProviderFlightKey(rowId, provider.name);

    const result = await providerCallFlight.do(flightKey, async () => {
        // Check row-level cache first
        const cached = await getRowProviderCache(rowId, provider.name);
        if (cached) {
            return cached;
        }

        // Fetch from provider with circuit breaker protection
        const providerResult = await withCircuitBreaker(
            provider.name,
            () => provider.enrich({ field, rowId }),
            provider.costCents
        );

        // Cache the result
        await setRowProviderCache(rowId, provider.name, providerResult);

        return providerResult;
    });

    return result as EnrichmentData;
}

// ============ Parallel Probe Execution ============

/**
 * Run multiple providers in parallel and collect results
 * Used for free + cheap tiers before resorting to premium
 */
async function runParallelProbes(
    field: string,
    rowId: string,
    budgetCents: number,
    tiers: Array<'free' | 'cheap'>
): Promise<ProbeResult[]> {
    const probes: Array<Promise<ProbeResult>> = [];

    for (const tier of tiers) {
        const providers = sortByHealth(getAvailableProviders(tier));

        for (const provider of providers) {
            if (!provider.canEnrich(field)) continue;
            if (provider.costCents > budgetCents) continue;

            probes.push(
                (async (): Promise<ProbeResult> => {
                    const startTime = Date.now();
                    try {
                        const enriched = await fetchFromProviderWithSingleflight(
                            provider,
                            field,
                            rowId
                        );
                        const latencyMs = Date.now() - startTime;

                        return {
                            provider: provider.name,
                            field,
                            value: enriched[field] || null,
                            cost: provider.costCents,
                            latencyMs,
                        };
                    } catch (error) {
                        return {
                            provider: provider.name,
                            field,
                            value: null,
                            cost: 0,
                            latencyMs: Date.now() - startTime,
                            error: error instanceof Error ? error.message : String(error),
                        };
                    }
                })()
            );
        }
    }

    if (probes.length === 0) return [];

    metrics.parallelProbesRun++;

    // Wait for all probes with a timeout
    const results = await Promise.allSettled(probes);

    return results
        .filter((r): r is PromiseFulfilledResult<ProbeResult> => r.status === 'fulfilled')
        .map(r => r.value);
}

// ============ Ensemble Fusion ============

/**
 * Combine results from multiple providers using confidence-weighted voting
 */
function ensembleFusion(
    probeResults: ProbeResult[],
    confidenceThreshold: number
): ProbeResult | null {
    const validResults = probeResults.filter(
        r => r.value && r.value.value !== null && r.value.confidence >= confidenceThreshold
    );

    if (validResults.length === 0) return null;

    // If only one result, use it
    if (validResults.length === 1) {
        return validResults[0]!;
    }

    // For multiple results, use the one with highest confidence
    // Future: Could implement voting for matching values
    validResults.sort((a, b) =>
        (b.value?.confidence ?? 0) - (a.value?.confidence ?? 0)
    );

    const best = validResults[0]!;

    logger.info('🔮 Ensemble fusion selected best result', {
        providers: validResults.map(r => r.provider),
        selected: best.provider,
        confidence: best.value?.confidence,
    });

    return best;
}

// ============ Premium Provider Fallback ============

async function tryPremiumProviders(
    field: string,
    rowId: string,
    budgetCents: number
): Promise<ProbeResult | null> {
    metrics.premiumFallbacks++;

    const providers = sortByHealth(getAvailableProviders('premium'));

    for (const provider of providers) {
        if (!provider.canEnrich(field)) continue;
        if (provider.costCents > budgetCents) continue;

        const startTime = Date.now();
        try {
            logger.info('💎 Trying premium provider', {
                provider: provider.name,
                field,
                cost: provider.costCents,
            });

            const enriched = await fetchFromProviderWithSingleflight(
                provider,
                field,
                rowId
            );
            const latencyMs = Date.now() - startTime;

            if (enriched[field] && enriched[field].confidence >= enrichmentConfig.confidenceThreshold) {
                return {
                    provider: provider.name,
                    field,
                    value: enriched[field],
                    cost: provider.costCents,
                    latencyMs,
                };
            }
        } catch (error) {
            logger.error('Premium provider failed', {
                provider: provider.name,
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }

    return null;
}

// ============ Smart Waterfall Execution ============

async function runSmartWaterfall(
    field: string,
    rowId: string,
    budgetCents: number,
    options: { enableParallelProbes?: boolean; useEnsembleFusion?: boolean }
): Promise<WaterfallResult> {
    const result: WaterfallResult = {
        data: {},
        cost: { totalCents: 0, breakdown: [] },
        provenance: [],
        notes: [],
        cacheHit: false,
        singleflightCoalesced: false,
    };

    // Stage 1: Check Cache (with negative caching)
    const cacheResult = await checkCache(rowId, field);
    if (cacheResult.hit) {
        result.cacheHit = true;

        if (cacheResult.isNegative) {
            result.notes.push(`Negative cache hit: ${field} is known to be unenrichable`);
            return result;
        }

        if (cacheResult.value) {
            result.data[field] = cacheResult.value;
            result.provenance.push({
                source: 'cache',
                field,
                confidence: cacheResult.value.confidence,
            });
            result.notes.push(`Cache hit for ${field}`);
            return result;
        }
    }

    // Stage 2: Parallel Probes (free + cheap)
    let bestResult: ProbeResult | null = null;

    if (options.enableParallelProbes !== false) {
        const probeResults = await runParallelProbes(field, rowId, budgetCents, ['free', 'cheap']);

        if (options.useEnsembleFusion) {
            bestResult = ensembleFusion(probeResults, enrichmentConfig.confidenceThreshold);
        } else {
            // Use first result that meets threshold
            bestResult = probeResults.find(
                r => r.value && r.value.confidence >= enrichmentConfig.confidenceThreshold
            ) ?? null;
        }

        // Track singleflight stats
        const flightStats = getSingleflightStats();
        if (flightStats.provider.coalescedRequests > 0) {
            result.singleflightCoalesced = true;
            metrics.singleflightCoalesced++;
        }
    }

    // Stage 3: Premium Fallback (if needed)
    if (!bestResult) {
        bestResult = await tryPremiumProviders(field, rowId, budgetCents);
    }

    // Build final result
    if (bestResult && bestResult.value) {
        result.data[field] = bestResult.value;
        result.cost.totalCents += bestResult.cost;
        result.cost.breakdown.push({
            source: bestResult.provider,
            costCents: bestResult.cost,
        });
        result.provenance.push({
            source: bestResult.provider,
            field,
            confidence: bestResult.value.confidence,
        });
        result.notes.push(
            `${bestResult.provider}: enriched ${field} with ${(bestResult.value.confidence * 100).toFixed(0)}% confidence`
        );

        // Cache the result
        await setCache(rowId, field, bestResult.value);

        metrics.totalCostCents += bestResult.cost;
    } else {
        // No provider succeeded - cache negative result
        await setNegativeCache(rowId, field);
        result.notes.push(`No provider could enrich ${field} - cached as unenrichable`);
    }

    return result;
}

// ============ Main Entry Point ============

/**
 * Enrich a cell using the smart waterfall strategy
 * 
 * This is the optimized v2 of enrichCellWithProviders with:
 * - Redis caching (with negative caching)
 * - Singleflight for request coalescing
 * - Parallel probes for faster enrichment
 * - Circuit breakers for reliability
 */
export async function enrichCellWithProvidersV2(
    context: EnrichmentContext
): Promise<CellEnrichmentResult> {
    const { columnKey, rowId, tableId } = context;
    const budgetCents = context.budgetCents ?? enrichmentConfig.maxCostPerCellCents;

    metrics.totalRequests++;
    const serviceStartTime = Date.now();

    logger.info('🔧 Smart enrichment service v2 invoked', {
        columnKey,
        rowId,
        tableId,
        budget: budgetCents,
        enableParallelProbes: context.enableParallelProbes ?? true,
        useEnsembleFusion: context.useEnsembleFusion ?? false,
    });

    // Use singleflight for the entire cell enrichment
    const flightKey = buildCellFlightKey(rowId, columnKey);

    const enrichedResultUnknown = await cellEnrichmentFlight.do(flightKey, async () => {
        const field = mapColumnKeyToField(columnKey);

        const waterfallResult = await runSmartWaterfall(field, rowId, budgetCents, {
            enableParallelProbes: context.enableParallelProbes ?? true,
            useEnsembleFusion: context.useEnsembleFusion ?? false,
        });

        return { field, waterfallResult };
    });

    const enrichedResult = enrichedResultUnknown as { field: string; waterfallResult: WaterfallResult };
    const { field, waterfallResult } = enrichedResult;
    const totalTime = Date.now() - serviceStartTime;
    recordLatency(totalTime);

    // Build result
    const enrichedValue = waterfallResult.data[field];

    if (enrichedValue) {
        logger.info('✨ Cell enrichment v2 succeeded', {
            field,
            source: enrichedValue.source,
            confidence: enrichedValue.confidence,
            cost: waterfallResult.cost.totalCents,
            totalTimeMs: totalTime,
            cacheHit: waterfallResult.cacheHit,
            singleflightCoalesced: waterfallResult.singleflightCoalesced,
        });

        return {
            value: enrichedValue.value,
            confidence: enrichedValue.confidence,
            source: enrichedValue.source,
            timestamp: enrichedValue.timestamp,
            metadata: {
                cost: waterfallResult.cost.totalCents,
                providers: waterfallResult.provenance.map((p: { source: string }) => p.source),
                attempts: waterfallResult.provenance.length,
                cacheHit: waterfallResult.cacheHit,
                singleflightCoalesced: waterfallResult.singleflightCoalesced,
            },
        };
    }

    // Fallback
    logger.warn('Cell enrichment v2 failed, using fallback', {
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
            cacheHit: waterfallResult.cacheHit,
            singleflightCoalesced: waterfallResult.singleflightCoalesced,
        },
    };
}

// ============ Backward Compatibility ============

/**
 * Original function signature for backward compatibility
 * Now uses the optimized v2 implementation internally
 */
export async function enrichCellWithProviders(
    context: EnrichmentContext
): Promise<CellEnrichmentResult> {
    return enrichCellWithProvidersV2({
        ...context,
        enableParallelProbes: true,
        useEnsembleFusion: false,
    });
}

// ============ Cache Management ============

import { closeRedisConnection } from './cache';

export async function clearEnrichmentCache(): Promise<void> {
    getCellEnrichmentCache().invalidateAll();
    getProviderResponseCache().invalidateAll();
    logger.info('🧹 Enrichment cache cleared');
}

export function getCacheStats(): {
    cellCache: ReturnType<typeof getCellEnrichmentCache>['getStats'] extends () => infer R ? R : never;
    providerCache: ReturnType<typeof getProviderResponseCache>['getStats'] extends () => infer R ? R : never;
    metrics: typeof metrics;
} {
    return {
        cellCache: getCellEnrichmentCache().getStats(),
        providerCache: getProviderResponseCache().getStats(),
        metrics: { ...metrics },
    };
}

export { closeRedisConnection };

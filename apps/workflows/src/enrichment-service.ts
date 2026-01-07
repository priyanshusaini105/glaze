/**
 * Enrichment Service
 * 
 * Main entry point for cell enrichment using the optimized waterfall strategy.
 * 
 * OPTIMIZATIONS (v2):
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

// Re-export everything from the v2 implementation
export {
    enrichCellWithProviders,
    enrichCellWithProvidersV2,
    clearEnrichmentCache,
    getCacheStats,
    getEnrichmentMetrics,
    closeRedisConnection,
    type CellEnrichmentResult,
    type EnrichmentContext,
} from './enrichment-service-v2';

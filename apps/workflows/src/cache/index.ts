/**
 * Cache Module Index
 * 
 * Exports all caching and reliability infrastructure:
 * - Redis cache with TTL, negative caching, versioned keys
 * - Singleflight for request coalescing
 * - Circuit breakers for provider reliability
 * - Cache utilities for key generation
 */

// Redis Cache
export {
    RedisCache,
    getCellEnrichmentCache,
    getProviderResponseCache,
    buildCellCacheKey,
    buildProviderCacheKey,
    closeRedisConnection,
    CACHE_TTL,
    type CacheEntry,
    type CacheConfig,
    type CacheStats,
} from './redis-cache';

// Cache Utilities
export {
    hashKey,
    hashParams,
    normalizeDomainForCache,
    normalizeLinkedInUrl,
    buildSerperCacheKey,
    buildLLMCacheKey,
    buildScrapeCacheKey,
    buildCompanyProfileCacheKey,
    buildCompanySocialsCacheKey,
    buildCompanySizeCacheKey,
    buildPersonLinkedInCacheKey,
    buildLinkedInSearchCacheKey,
    buildGenericSearchCacheKey,
    buildEmailVerificationCacheKey,
    buildPersonPublicProfileCacheKey,
    buildWorkEmailCacheKey,
} from './cache-utils';

// Singleflight
export {
    Singleflight,
    cellEnrichmentFlight,
    providerCallFlight,
    buildCellFlightKey,
    buildProviderFlightKey,
    getSingleflightStats,
} from './singleflight';

// Circuit Breaker
export {
    CircuitBreaker,
    circuitBreakers,
    withCircuitBreaker,
    isProviderAvailable,
    getProviderHealthSummary,
    type CircuitState,
    type CircuitBreakerConfig,
    type CircuitBreakerStatus,
    type ProviderMetrics,
} from './circuit-breaker';

// Cached Providers
export {
    cachedSerperSearch,
    cachedLLMExtraction,
    cachedPageScrape,
    withCache,
    getCachedProviderStats,
    type SerperSearchResult,
    type SerperResponse,
    type CacheStatsReport,
} from './cached-providers';

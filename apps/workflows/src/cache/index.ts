/**
 * Cache Module Index
 * 
 * Exports all caching and reliability infrastructure:
 * - Redis cache with TTL, negative caching, versioned keys
 * - Singleflight for request coalescing
 * - Circuit breakers for provider reliability
 */

// Redis Cache
export {
    RedisCache,
    getCellEnrichmentCache,
    getProviderResponseCache,
    buildCellCacheKey,
    buildProviderCacheKey,
    closeRedisConnection,
    type CacheEntry,
    type CacheConfig,
    type CacheStats,
} from './redis-cache';

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

/**
 * Enrichment Configuration
 * 
 * Controls enrichment behavior including mock mode, budgets, thresholds,
 * and v2 optimizations (cache, singleflight, parallel probes, circuit breakers).
 */

export const enrichmentConfig = {
    // ============ Provider Mode ============
    // Mock mode - set to false when ready for real providers
    useMockProviders: true,

    // ============ Budget Controls ============
    maxCostPerCellCents: 50,

    // ============ Provider Enablement ============
    // (for when we switch to real providers)
    enableWebsiteScraper: true,
    enableSearch: false,      // Will be true when API key is added
    enableLinkedIn: false,    // Will be true when API key is added
    enableAIAgent: false,     // Will be true when AI SDK + Groq is integrated

    // ============ Quality Thresholds ============
    confidenceThreshold: 0.7, // Minimum confidence to accept

    // ============ Waterfall Strategy ============
    waterfallStages: ['cache', 'free', 'cheap', 'premium'] as const,

    // ============ Retry Settings ============
    maxRetries: 3,
    retryDelayMs: 1000,

    // ============ Mock Provider Delays ============
    mockDelays: {
        websiteScrape: { min: 500, max: 1500 },
        search: { min: 300, max: 800 },
        linkedIn: { min: 800, max: 2000 },
        aiAgent: { min: 1000, max: 3000 },
    },

    // ============ V2 OPTIMIZATIONS ============

    // Redis Cache Settings
    cache: {
        /** Enable Redis caching (falls back to memory if unavailable) */
        enabled: true,
        /** Default TTL for cache entries (seconds) */
        defaultTtlSeconds: 3600,      // 1 hour
        /** TTL for negative cache entries - "not found" markers (seconds) */
        negativeTtlSeconds: 300,       // 5 minutes
        /** Cache key version - increment to invalidate all cached data */
        version: 1,
        /** Maximum entries in memory fallback cache */
        maxMemoryEntries: 10000,
    },

    // Singleflight Settings
    singleflight: {
        /** Enable singleflight to coalesce concurrent requests */
        enabled: true,
        /** Timeout for waiting on in-flight requests (ms) */
        timeoutMs: 30000,
    },

    // Parallel Probe Settings  
    parallelProbes: {
        /** Enable parallel probing of free + cheap providers */
        enabled: true,
        /** Maximum concurrent probes */
        maxConcurrent: 5,
        /** Timeout for each probe (ms) */
        probeTimeoutMs: 10000,
    },

    // Ensemble Fusion Settings
    ensembleFusion: {
        /** Enable ensemble fusion to combine results from multiple providers */
        enabled: false,
        /** Minimum agreement between providers to boost confidence */
        agreementThreshold: 0.8,
    },

    // Circuit Breaker Settings
    circuitBreaker: {
        /** Enable circuit breakers for provider health management */
        enabled: true,
        /** Number of failures before opening the circuit */
        failureThreshold: 5,
        /** Time before attempting recovery (ms) */
        resetTimeoutMs: 30000,
        /** Number of successes needed to close the circuit */
        successThreshold: 3,
        /** Rolling window for tracking failures (ms) */
        windowMs: 60000,
        /** Minimum requests before circuit can open */
        minimumRequests: 10,
    },

    // Metrics Settings
    metrics: {
        /** Enable detailed metrics collection */
        enabled: true,
        /** Maximum latency samples to keep */
        maxLatencySamples: 1000,
        /** Log metrics every N requests */
        logIntervalRequests: 100,
    },
};

export type WaterfallStage = typeof enrichmentConfig.waterfallStages[number];

// V2 config types for type-safe access
export type CacheConfig = typeof enrichmentConfig.cache;
export type SingleflightConfig = typeof enrichmentConfig.singleflight;
export type ParallelProbesConfig = typeof enrichmentConfig.parallelProbes;
export type CircuitBreakerConfig = typeof enrichmentConfig.circuitBreaker;


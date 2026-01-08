/**
 * Redis Cache Service
 * 
 * Production-ready Redis cache with:
 * - TTL-based expiration
 * - Negative caching (cache misses to avoid repeated lookups)
 * - Versioned keys (for cache invalidation)
 * - Batch operations via pipelining
 * 
 * Falls back gracefully to in-memory cache if Redis unavailable.
 */

import { logger } from '@trigger.dev/sdk';

// ============ Types ============

export interface CacheEntry<T> {
    value: T;
    timestamp: number;
    version: number;
    isNegative?: boolean; // True if this is a cached "not found"
}

export interface CacheConfig {
    /** Default TTL in seconds */
    defaultTtlSeconds: number;
    /** TTL for negative cache entries (shorter) */
    negativeTtlSeconds: number;
    /** Cache key prefix for namespacing */
    keyPrefix: string;
    /** Current cache version (increment to invalidate all) */
    version: number;
    /** Max entries for in-memory fallback */
    maxMemoryEntries: number;
}

export interface CacheStats {
    hits: number;
    misses: number;
    negativeHits: number;
    errors: number;
    redisConnected: boolean;
}

// ============ Configuration ============

/**
 * Tiered TTL constants for different data types.
 * Use these for consistent caching across all tools.
 * 20 days = 1728000 seconds
 */
export const CACHE_TTL = {
    // Stable data (rarely changes) - 20 days
    COMPANY_PROFILE: 1728000,     // 20 days
    COMPANY_SOCIALS: 1728000,     // 20 days
    COMPANY_SIZE: 1728000,        // 20 days
    PERSON_PROFILE: 1728000,      // 20 days
    LINKEDIN_PROFILE: 1728000,    // 20 days
    LINKEDIN_SEARCH: 1728000,     // 20 days

    // Semi-stable - 20 days (all aligned for maximum caching)
    SEARCH_RESULTS: 1728000,      // 20 days
    LLM_EXTRACTION: 1728000,      // 20 days
    PAGE_SCRAPE: 1728000,         // 20 days

    // Dynamic data - 7 days
    EMAIL_VERIFICATION: 604800,   // 7 days

    // Negative cache (not found) - 1 day
    NEGATIVE_SHORT: 86400,        // 24 hours
    NEGATIVE_LONG: 604800,        // 7 days

    // Default fallback - 20 days
    DEFAULT: 1728000,             // 20 days
} as const;

const DEFAULT_CONFIG: CacheConfig = {
    defaultTtlSeconds: 1728000,    // 20 days (maximum caching)
    negativeTtlSeconds: 86400,     // 24 hours
    keyPrefix: 'enrich:v3',        // Version bump
    version: 1,
    maxMemoryEntries: 10000,
};


// ============ Redis Client ============

let redisClient: any = null;
let redisAvailable = false;
let lastConnectionAttempt = 0;
const CONNECTION_RETRY_MS = 30000; // Retry connection every 30 seconds

async function getRedisClient(): Promise<any | null> {
    // If Redis is available, return the client
    if (redisAvailable && redisClient) {
        return redisClient;
    }

    // Rate limit connection attempts
    const now = Date.now();
    if (now - lastConnectionAttempt < CONNECTION_RETRY_MS) {
        return null;
    }
    lastConnectionAttempt = now;

    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
        return null;
    }

    try {
        // Dynamic import to avoid issues when Redis is not configured
        const { default: Redis } = await import('ioredis');

        redisClient = new Redis(redisUrl, {
            maxRetriesPerRequest: 2,
            enableReadyCheck: true,
            lazyConnect: true,
            connectTimeout: 5000,
            retryStrategy: (times: number) => {
                if (times > 3) return null; // Stop retrying
                return Math.min(times * 100, 3000);
            },
        });

        await redisClient.connect();

        redisClient.on('error', (err: Error) => {
            logger.error('Redis connection error', { error: err.message });
            redisAvailable = false;
        });

        redisClient.on('ready', () => {
            logger.info('Redis connection established');
            redisAvailable = true;
        });

        redisClient.on('close', () => {
            redisAvailable = false;
        });

        redisAvailable = true;
        logger.info('Redis cache initialized');
        return redisClient;
    } catch (error) {
        logger.warn('Redis not available, using in-memory fallback', {
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        redisAvailable = false;
        return null;
    }
}

// ============ In-Memory Fallback ============

class MemoryCache<T> {
    private cache = new Map<string, CacheEntry<T>>();
    private accessOrder: string[] = [];
    private maxSize: number;

    constructor(maxSize: number) {
        this.maxSize = maxSize;
    }

    get(key: string): CacheEntry<T> | null {
        const entry = this.cache.get(key);
        if (!entry) return null;

        // Check TTL
        const age = (Date.now() - entry.timestamp) / 1000;
        const ttl = entry.isNegative ? DEFAULT_CONFIG.negativeTtlSeconds : DEFAULT_CONFIG.defaultTtlSeconds;
        if (age > ttl) {
            this.cache.delete(key);
            return null;
        }

        // LRU update
        this.accessOrder = this.accessOrder.filter(k => k !== key);
        this.accessOrder.push(key);

        return entry;
    }

    set(key: string, entry: CacheEntry<T>): void {
        // Evict if at capacity
        while (this.cache.size >= this.maxSize && this.accessOrder.length > 0) {
            const oldest = this.accessOrder.shift();
            if (oldest) this.cache.delete(oldest);
        }

        this.cache.set(key, entry);
        this.accessOrder.push(key);
    }

    delete(key: string): void {
        this.cache.delete(key);
        this.accessOrder = this.accessOrder.filter(k => k !== key);
    }

    clear(): void {
        this.cache.clear();
        this.accessOrder = [];
    }

    size(): number {
        return this.cache.size;
    }
}

// ============ Main Cache Service ============

export class RedisCache<T = unknown> {
    private config: CacheConfig;
    private memoryFallback: MemoryCache<T>;
    private stats: CacheStats = {
        hits: 0,
        misses: 0,
        negativeHits: 0,
        errors: 0,
        redisConnected: false,
    };

    constructor(config: Partial<CacheConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.memoryFallback = new MemoryCache(this.config.maxMemoryEntries);
    }

    /**
     * Build a versioned cache key
     */
    private buildKey(baseKey: string): string {
        return `${this.config.keyPrefix}:v${this.config.version}:${baseKey}`;
    }

    /**
     * Get a value from cache
     * Returns null if not found, or the cached value (which could be a negative entry)
     */
    async get(key: string): Promise<{ value: T | null; isNegative: boolean; hit: boolean }> {
        const fullKey = this.buildKey(key);

        try {
            const redis = await getRedisClient();

            if (redis && redisAvailable) {
                this.stats.redisConnected = true;
                const data = await redis.get(fullKey);

                if (data) {
                    const entry: CacheEntry<T> = JSON.parse(data);

                    // Check version
                    if (entry.version !== this.config.version) {
                        await redis.del(fullKey);
                        this.stats.misses++;
                        return { value: null, isNegative: false, hit: false };
                    }

                    if (entry.isNegative) {
                        this.stats.negativeHits++;
                        return { value: null, isNegative: true, hit: true };
                    }

                    this.stats.hits++;
                    return { value: entry.value, isNegative: false, hit: true };
                }
            } else {
                // Use memory fallback
                this.stats.redisConnected = false;
                const entry = this.memoryFallback.get(fullKey);

                if (entry) {
                    if (entry.isNegative) {
                        this.stats.negativeHits++;
                        return { value: null, isNegative: true, hit: true };
                    }
                    this.stats.hits++;
                    return { value: entry.value, isNegative: false, hit: true };
                }
            }
        } catch (error) {
            this.stats.errors++;
            logger.error('Cache get error', {
                key,
                error: error instanceof Error ? error.message : 'Unknown error'
            });

            // Try memory fallback on error
            const entry = this.memoryFallback.get(fullKey);
            if (entry) {
                return {
                    value: entry.isNegative ? null : entry.value,
                    isNegative: entry.isNegative ?? false,
                    hit: true
                };
            }
        }

        this.stats.misses++;
        return { value: null, isNegative: false, hit: false };
    }

    /**
     * Set a value in cache
     */
    async set(key: string, value: T, ttlSeconds?: number): Promise<void> {
        const fullKey = this.buildKey(key);
        const ttl = ttlSeconds ?? this.config.defaultTtlSeconds;

        const entry: CacheEntry<T> = {
            value,
            timestamp: Date.now(),
            version: this.config.version,
            isNegative: false,
        };

        try {
            const redis = await getRedisClient();

            if (redis && redisAvailable) {
                await redis.setex(fullKey, ttl, JSON.stringify(entry));
            }

            // Always update memory fallback too
            this.memoryFallback.set(fullKey, entry);
        } catch (error) {
            this.stats.errors++;
            logger.error('Cache set error', {
                key,
                error: error instanceof Error ? error.message : 'Unknown error'
            });

            // Still use memory fallback
            this.memoryFallback.set(fullKey, entry);
        }
    }

    /**
     * Set a negative cache entry (value was not found)
     */
    async setNegative(key: string): Promise<void> {
        const fullKey = this.buildKey(key);

        const entry: CacheEntry<T> = {
            value: null as unknown as T,
            timestamp: Date.now(),
            version: this.config.version,
            isNegative: true,
        };

        try {
            const redis = await getRedisClient();

            if (redis && redisAvailable) {
                await redis.setex(
                    fullKey,
                    this.config.negativeTtlSeconds,
                    JSON.stringify(entry)
                );
            }

            this.memoryFallback.set(fullKey, entry);
        } catch (error) {
            this.stats.errors++;
            this.memoryFallback.set(fullKey, entry);
        }
    }

    /**
     * Batch get multiple keys
     */
    async getMultiple(keys: string[]): Promise<Map<string, { value: T | null; isNegative: boolean }>> {
        const results = new Map<string, { value: T | null; isNegative: boolean }>();
        const fullKeys = keys.map(k => this.buildKey(k));

        try {
            const redis = await getRedisClient();

            if (redis && redisAvailable) {
                const pipeline = redis.pipeline();
                fullKeys.forEach(key => pipeline.get(key));
                const responses = await pipeline.exec();

                if (responses) {
                    responses.forEach((response: [Error | null, string | null], index: number) => {
                        const [err, data] = response;
                        if (!err && data) {
                            const entry: CacheEntry<T> = JSON.parse(data);
                            if (entry.version === this.config.version) {
                                const originalKey = keys[index]!;
                                results.set(originalKey, {
                                    value: entry.isNegative ? null : entry.value,
                                    isNegative: entry.isNegative ?? false,
                                });
                                if (entry.isNegative) {
                                    this.stats.negativeHits++;
                                } else {
                                    this.stats.hits++;
                                }
                            }
                        }
                    });
                }
            } else {
                // Memory fallback
                for (let i = 0; i < fullKeys.length; i++) {
                    const entry = this.memoryFallback.get(fullKeys[i]!);
                    if (entry) {
                        results.set(keys[i]!, {
                            value: entry.isNegative ? null : entry.value,
                            isNegative: entry.isNegative ?? false,
                        });
                        if (entry.isNegative) {
                            this.stats.negativeHits++;
                        } else {
                            this.stats.hits++;
                        }
                    }
                }
            }
        } catch (error) {
            this.stats.errors++;
            logger.error('Cache getMultiple error', {
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }

        // Count misses
        for (const key of keys) {
            if (!results.has(key)) {
                this.stats.misses++;
            }
        }

        return results;
    }

    /**
     * Batch set multiple keys
     */
    async setMultiple(entries: Map<string, T>, ttlSeconds?: number): Promise<void> {
        const ttl = ttlSeconds ?? this.config.defaultTtlSeconds;

        try {
            const redis = await getRedisClient();

            if (redis && redisAvailable) {
                const pipeline = redis.pipeline();

                for (const [key, value] of entries) {
                    const fullKey = this.buildKey(key);
                    const entry: CacheEntry<T> = {
                        value,
                        timestamp: Date.now(),
                        version: this.config.version,
                        isNegative: false,
                    };
                    pipeline.setex(fullKey, ttl, JSON.stringify(entry));
                    this.memoryFallback.set(fullKey, entry);
                }

                await pipeline.exec();
            } else {
                // Memory fallback only
                for (const [key, value] of entries) {
                    const fullKey = this.buildKey(key);
                    this.memoryFallback.set(fullKey, {
                        value,
                        timestamp: Date.now(),
                        version: this.config.version,
                        isNegative: false,
                    });
                }
            }
        } catch (error) {
            this.stats.errors++;
            logger.error('Cache setMultiple error', {
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }

    /**
     * Delete a key from cache
     */
    async delete(key: string): Promise<void> {
        const fullKey = this.buildKey(key);

        try {
            const redis = await getRedisClient();
            if (redis && redisAvailable) {
                await redis.del(fullKey);
            }
            this.memoryFallback.delete(fullKey);
        } catch (error) {
            this.stats.errors++;
        }
    }

    /**
     * Invalidate all cache entries (by incrementing version)
     */
    invalidateAll(): void {
        this.config.version++;
        this.memoryFallback.clear();
        logger.info('Cache invalidated', { newVersion: this.config.version });
    }

    /**
     * Get cache statistics
     */
    getStats(): CacheStats {
        return { ...this.stats };
    }

    /**
     * Reset statistics
     */
    resetStats(): void {
        this.stats = {
            hits: 0,
            misses: 0,
            negativeHits: 0,
            errors: 0,
            redisConnected: redisAvailable,
        };
    }
}

// ============ Singleton Instances ============

// Cell-level enrichment cache
let cellEnrichmentCache: RedisCache | null = null;

export function getCellEnrichmentCache(): RedisCache {
    if (!cellEnrichmentCache) {
        cellEnrichmentCache = new RedisCache({
            keyPrefix: 'cell:enrich',
            defaultTtlSeconds: 3600,      // 1 hour
            negativeTtlSeconds: 300,       // 5 minutes
        });
    }
    return cellEnrichmentCache;
}

// Provider response cache (row-level)
let providerResponseCache: RedisCache | null = null;

export function getProviderResponseCache(): RedisCache {
    if (!providerResponseCache) {
        providerResponseCache = new RedisCache({
            keyPrefix: 'provider:response',
            defaultTtlSeconds: 7200,      // 2 hours
            negativeTtlSeconds: 600,       // 10 minutes
        });
    }
    return providerResponseCache;
}

// ============ Convenience Functions ============

/**
 * Build a cache key for a cell enrichment
 */
export function buildCellCacheKey(rowId: string, field: string): string {
    return `${rowId}:${field}`;
}

/**
 * Build a cache key for a provider response
 */
export function buildProviderCacheKey(rowId: string, provider: string): string {
    return `${rowId}:${provider}`;
}

/**
 * Close Redis connection (for cleanup)
 */
export async function closeRedisConnection(): Promise<void> {
    if (redisClient && redisAvailable) {
        await redisClient.quit();
        redisClient = null;
        redisAvailable = false;
    }
}

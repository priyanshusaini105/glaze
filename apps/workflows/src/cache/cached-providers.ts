/**
 * Cached Provider Wrappers
 * 
 * Provides caching wrappers for expensive external API calls:
 * - Serper search results
 * - LLM/Groq extractions
 * - Page scraping
 * 
 * These wrappers dramatically reduce API costs by caching results.
 */

import { logger } from '@trigger.dev/sdk';
import {
    RedisCache,
    CACHE_TTL
} from './redis-cache';
import {
    buildSerperCacheKey,
    buildLLMCacheKey,
    buildScrapeCacheKey,
    hashKey,
} from './cache-utils';

// ============ Singleton Cache Instances ============

let serperCache: RedisCache<unknown> | null = null;
let llmCache: RedisCache<unknown> | null = null;
let scrapeCache: RedisCache<string> | null = null;

function getSerperCache(): RedisCache<unknown> {
    if (!serperCache) {
        serperCache = new RedisCache({
            keyPrefix: 'serper',
            defaultTtlSeconds: CACHE_TTL.SEARCH_RESULTS,
            negativeTtlSeconds: CACHE_TTL.NEGATIVE_SHORT,
        });
    }
    return serperCache;
}

function getLLMCache(): RedisCache<unknown> {
    if (!llmCache) {
        llmCache = new RedisCache({
            keyPrefix: 'llm',
            defaultTtlSeconds: CACHE_TTL.LLM_EXTRACTION,
            negativeTtlSeconds: CACHE_TTL.NEGATIVE_SHORT,
        });
    }
    return llmCache;
}

function getScrapeCache(): RedisCache<string> {
    if (!scrapeCache) {
        scrapeCache = new RedisCache({
            keyPrefix: 'scrape',
            defaultTtlSeconds: CACHE_TTL.PAGE_SCRAPE,
            negativeTtlSeconds: CACHE_TTL.NEGATIVE_SHORT,
        });
    }
    return scrapeCache;
}

// ============ Cached Serper Search ============

export interface SerperSearchResult {
    title: string;
    link: string;
    snippet: string;
    position: number;
}

export interface SerperResponse {
    organic: SerperSearchResult[];
    knowledgeGraph?: {
        title?: string;
        type?: string;
        description?: string;
        attributes?: Record<string, string>;
    };
}

/**
 * Cached Serper search wrapper.
 * Caches search results for 24 hours to avoid repeated API calls.
 * 
 * @param query - Search query
 * @param searchFn - The actual search function to call on cache miss
 */
export async function cachedSerperSearch(
    query: string,
    searchFn: (q: string) => Promise<SerperResponse>
): Promise<SerperResponse> {
    const cache = getSerperCache();
    const cacheKey = buildSerperCacheKey(query);

    // Check cache
    const cached = await cache.get(cacheKey);
    if (cached.hit && !cached.isNegative) {
        logger.info('🎯 Serper cache HIT', { query: query.slice(0, 50) });
        return cached.value as SerperResponse;
    }

    if (cached.isNegative) {
        logger.info('⚫ Serper negative cache hit', { query: query.slice(0, 50) });
        return { organic: [] };
    }

    // Cache miss - perform search
    logger.info('❌ Serper cache MISS', { query: query.slice(0, 50) });

    try {
        const result = await searchFn(query);

        // Cache the result
        if (result.organic.length > 0 || result.knowledgeGraph) {
            await cache.set(cacheKey, result, CACHE_TTL.SEARCH_RESULTS);
        } else {
            // Cache negative result
            await cache.setNegative(cacheKey);
        }

        return result;
    } catch (error) {
        logger.error('❌ Serper search failed', {
            error: error instanceof Error ? error.message : 'Unknown'
        });
        throw error;
    }
}

// ============ Cached LLM Extraction ============

/**
 * Cached LLM extraction wrapper.
 * Caches LLM responses based on a hash of the prompt.
 * 
 * @param promptContent - The prompt content to hash for cache key
 * @param extractFn - The actual extraction function to call on cache miss
 * @param ttl - Optional TTL override
 */
export async function cachedLLMExtraction<T>(
    promptContent: string,
    extractFn: () => Promise<T>,
    ttl?: number
): Promise<T> {
    const cache = getLLMCache();
    const promptHash = hashKey(promptContent);
    const cacheKey = buildLLMCacheKey(promptHash);

    // Check cache
    const cached = await cache.get(cacheKey);
    if (cached.hit && !cached.isNegative) {
        logger.info('🎯 LLM cache HIT', { promptHash });
        return cached.value as T;
    }

    // Cache miss - perform extraction
    logger.info('❌ LLM cache MISS', { promptHash });

    const result = await extractFn();

    // Cache the result
    await cache.set(cacheKey, result, ttl ?? CACHE_TTL.LLM_EXTRACTION);

    return result;
}

// ============ Cached Page Scrape ============

/**
 * Cached page scrape wrapper.
 * Caches scraped page content for 24 hours.
 * 
 * @param url - URL to scrape
 * @param scrapeFn - The actual scrape function to call on cache miss
 */
export async function cachedPageScrape(
    url: string,
    scrapeFn: (u: string) => Promise<string | null>
): Promise<string | null> {
    const cache = getScrapeCache();
    const cacheKey = buildScrapeCacheKey(url);

    // Check cache
    const cached = await cache.get(cacheKey);
    if (cached.hit) {
        if (cached.isNegative) {
            logger.info('⚫ Scrape negative cache hit', { url });
            return null;
        }
        logger.info('🎯 Scrape cache HIT', { url });
        return cached.value;
    }

    // Cache miss - perform scrape
    logger.info('❌ Scrape cache MISS', { url });

    try {
        const content = await scrapeFn(url);

        if (content) {
            await cache.set(cacheKey, content, CACHE_TTL.PAGE_SCRAPE);
        } else {
            await cache.setNegative(cacheKey);
        }

        return content;
    } catch (error) {
        logger.error('❌ Page scrape failed', {
            url,
            error: error instanceof Error ? error.message : 'Unknown'
        });
        // Cache the failure
        await cache.setNegative(cacheKey);
        return null;
    }
}

// ============ Generic Cache Wrapper ============

/**
 * Generic cache wrapper for any async function.
 * Use for tool-level caching with custom keys.
 * 
 * @param cacheKey - Full cache key
 * @param fetchFn - The function to call on cache miss
 * @param options - Cache options
 */
export async function withCache<T>(
    cacheKey: string,
    fetchFn: () => Promise<T | null>,
    options: {
        ttl?: number;
        keyPrefix?: string;
        logLabel?: string;
    } = {}
): Promise<T | null> {
    const cache = new RedisCache<T>({
        keyPrefix: options.keyPrefix ?? 'generic',
        defaultTtlSeconds: options.ttl ?? CACHE_TTL.DEFAULT,
    });

    const label = options.logLabel ?? 'Cache';

    // Check cache
    const cached = await cache.get(cacheKey);
    if (cached.hit) {
        if (cached.isNegative) {
            logger.info(`⚫ ${label} negative cache hit`, { key: cacheKey });
            return null;
        }
        logger.info(`🎯 ${label} cache HIT`, { key: cacheKey });
        return cached.value;
    }

    // Cache miss
    logger.info(`❌ ${label} cache MISS`, { key: cacheKey });

    try {
        const result = await fetchFn();

        if (result !== null) {
            await cache.set(cacheKey, result, options.ttl ?? CACHE_TTL.DEFAULT);
        } else {
            await cache.setNegative(cacheKey);
        }

        return result;
    } catch (error) {
        logger.error(`❌ ${label} fetch failed`, {
            key: cacheKey,
            error: error instanceof Error ? error.message : 'Unknown'
        });
        throw error;
    }
}

// ============ Cache Statistics ============

export interface CacheStatsReport {
    serper: { hits: number; misses: number; hitRate: string };
    llm: { hits: number; misses: number; hitRate: string };
    scrape: { hits: number; misses: number; hitRate: string };
}

/**
 * Get cache statistics for all cached providers
 */
export function getCachedProviderStats(): CacheStatsReport {
    const formatStats = (cache: RedisCache<unknown> | null) => {
        if (!cache) return { hits: 0, misses: 0, hitRate: 'N/A' };
        const stats = cache.getStats();
        const total = stats.hits + stats.misses;
        const hitRate = total > 0 ? ((stats.hits / total) * 100).toFixed(1) + '%' : 'N/A';
        return { hits: stats.hits, misses: stats.misses, hitRate };
    };

    return {
        serper: formatStats(serperCache),
        llm: formatStats(llmCache),
        scrape: formatStats(scrapeCache),
    };
}

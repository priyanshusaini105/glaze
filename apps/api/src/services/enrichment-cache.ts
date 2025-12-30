import { getRedisConnection } from '../utils/redis';
import { 
  EnrichmentData, 
  EnrichmentField, 
  CachedEnrichment, 
  EnrichedValue 
} from '../types/enrichment';

const CACHE_PREFIX = 'enrich:';
const DEFAULT_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

/**
 * Generate cache key from normalized URL and fields
 */
export const getCacheKey = (normalizedUrl: string): string => {
  // Normalize the URL for caching
  const urlKey = normalizedUrl
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/$/, '');
  
  return `${CACHE_PREFIX}${urlKey}`;
};

/**
 * Get cached enrichment data for a URL
 */
export const getCachedEnrichment = async (
  normalizedUrl: string
): Promise<CachedEnrichment | null> => {
  try {
    const redis = getRedisConnection();
    const key = getCacheKey(normalizedUrl);
    
    const cached = await redis.get(key);
    if (!cached) return null;

    const parsed: CachedEnrichment = JSON.parse(cached);
    
    // Check if expired
    if (new Date(parsed.expiresAt) < new Date()) {
      await redis.del(key);
      return null;
    }

    return parsed;
  } catch (err) {
    console.error('[cache] Failed to get cached enrichment:', err);
    return null;
  }
};

/**
 * Get cached values for specific fields only
 */
export const getCachedFields = async (
  normalizedUrl: string,
  requiredFields: EnrichmentField[]
): Promise<Partial<EnrichmentData>> => {
  const cached = await getCachedEnrichment(normalizedUrl);
  if (!cached) return {};

  const result: Partial<EnrichmentData> = {};

  for (const field of requiredFields) {
    const value = cached.data[field];
    if (value && value.value !== null) {
      // Update source to 'cache' to indicate it came from cache
      result[field] = {
        ...value,
        source: 'cache'
      };
    }
  }

  return result;
};

/**
 * Cache enrichment data for a URL
 */
export const cacheEnrichment = async (
  normalizedUrl: string,
  data: EnrichmentData,
  ttlSeconds = DEFAULT_TTL_SECONDS
): Promise<boolean> => {
  try {
    const redis = getRedisConnection();
    const key = getCacheKey(normalizedUrl);
    
    const cached: CachedEnrichment = {
      url: normalizedUrl,
      data,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + ttlSeconds * 1000).toISOString()
    };

    await redis.setex(key, ttlSeconds, JSON.stringify(cached));
    return true;
  } catch (err) {
    console.error('[cache] Failed to cache enrichment:', err);
    return false;
  }
};

/**
 * Merge new data into existing cache (append-only, prefer higher confidence)
 */
export const updateCachedEnrichment = async (
  normalizedUrl: string,
  newData: Partial<EnrichmentData>,
  ttlSeconds = DEFAULT_TTL_SECONDS
): Promise<boolean> => {
  try {
    const existing = await getCachedEnrichment(normalizedUrl);
    const existingData = existing?.data || {};

    // Merge, preferring higher confidence values
    const merged: EnrichmentData = { ...existingData };

    for (const [field, newValue] of Object.entries(newData)) {
      if (!newValue || newValue.value === null) continue;

      const existingValue = merged[field as EnrichmentField];
      
      if (!existingValue || newValue.confidence > existingValue.confidence) {
        merged[field as EnrichmentField] = newValue;
      }
    }

    return await cacheEnrichment(normalizedUrl, merged, ttlSeconds);
  } catch (err) {
    console.error('[cache] Failed to update cached enrichment:', err);
    return false;
  }
};

/**
 * Invalidate cache for a URL
 */
export const invalidateCache = async (normalizedUrl: string): Promise<boolean> => {
  try {
    const redis = getRedisConnection();
    const key = getCacheKey(normalizedUrl);
    await redis.del(key);
    return true;
  } catch (err) {
    console.error('[cache] Failed to invalidate cache:', err);
    return false;
  }
};

/**
 * Get cache statistics for monitoring
 */
export const getCacheStats = async (): Promise<{
  totalKeys: number;
  memoryUsed: string;
}> => {
  try {
    const redis = getRedisConnection();
    
    // Count enrichment keys
    const keys = await redis.keys(`${CACHE_PREFIX}*`);
    
    // Get memory info
    const info = await redis.info('memory');
    const memoryMatch = info.match(/used_memory_human:(\S+)/);
    const memoryUsed = memoryMatch ? memoryMatch[1] : 'unknown';

    return {
      totalKeys: keys.length,
      memoryUsed
    };
  } catch (err) {
    console.error('[cache] Failed to get cache stats:', err);
    return {
      totalKeys: 0,
      memoryUsed: 'error'
    };
  }
};

/**
 * Check if cache hit can satisfy all required fields
 */
export const canSatisfyFromCache = async (
  normalizedUrl: string,
  requiredFields: EnrichmentField[]
): Promise<{ satisfied: boolean; cached: EnrichmentField[]; missing: EnrichmentField[] }> => {
  const cachedData = await getCachedFields(normalizedUrl, requiredFields);
  
  const cached: EnrichmentField[] = [];
  const missing: EnrichmentField[] = [];

  for (const field of requiredFields) {
    if (cachedData[field] && cachedData[field]!.value !== null) {
      cached.push(field);
    } else {
      missing.push(field);
    }
  }

  return {
    satisfied: missing.length === 0,
    cached,
    missing
  };
};

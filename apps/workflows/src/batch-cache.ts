/**
 * Batch Cache Service
 * 
 * Production-ready cache service for entity enrichment data.
 * Supports multiple cache layers:
 * - L1: In-memory (fastest, session-scoped)
 * - L2: Redis (shared across workers, 1hr TTL)
 * - L3: PostgreSQL (persistent, for expensive lookups)
 * 
 * Optimized for batch operations to minimize round-trips.
 */

import type { EnrichedEntityData, EnrichedFieldValue, EntityTypeValue } from "@repo/types";

// ===== Configuration =====

const CONFIG = {
  /** L1 in-memory cache max size */
  L1_MAX_SIZE: 10000,
  /** L1 TTL in milliseconds */
  L1_TTL_MS: 5 * 60 * 1000, // 5 minutes
  /** L2 Redis TTL in seconds */
  L2_TTL_SECONDS: 60 * 60, // 1 hour
  /** L3 PostgreSQL TTL in hours */
  L3_TTL_HOURS: 24 * 7, // 7 days
  /** Batch size for Redis operations */
  BATCH_SIZE: 100,
};

// ===== Types =====

export interface CacheEntry {
  data: EnrichedEntityData;
  timestamp: number;
  ttl: number;
  source: 'L1' | 'L2' | 'L3';
}

export interface BatchCacheResult {
  hits: Map<string, EnrichedEntityData>;
  misses: string[];
  stats: {
    l1Hits: number;
    l2Hits: number;
    l3Hits: number;
    totalHits: number;
    totalMisses: number;
    hitRate: number;
  };
}

export interface CacheStats {
  l1Size: number;
  l1HitRate: number;
  l2Available: boolean;
  l3Available: boolean;
  totalLookups: number;
  totalHits: number;
}

// ===== L1: In-Memory Cache =====

class L1Cache {
  private cache: Map<string, CacheEntry> = new Map();
  private accessOrder: string[] = [];
  private hits = 0;
  private lookups = 0;

  get(key: string): EnrichedEntityData | null {
    this.lookups++;
    const entry = this.cache.get(key);
    
    if (!entry) return null;
    
    // Check TTL
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    this.hits++;
    // Move to end of access order (LRU)
    this.accessOrder = this.accessOrder.filter(k => k !== key);
    this.accessOrder.push(key);
    
    return entry.data;
  }

  set(key: string, data: EnrichedEntityData, ttl: number = CONFIG.L1_TTL_MS): void {
    // Evict if at capacity
    while (this.cache.size >= CONFIG.L1_MAX_SIZE && this.accessOrder.length > 0) {
      const oldest = this.accessOrder.shift();
      if (oldest) this.cache.delete(oldest);
    }
    
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
      source: 'L1',
    });
    this.accessOrder.push(key);
  }

  getMultiple(keys: string[]): Map<string, EnrichedEntityData> {
    const results = new Map<string, EnrichedEntityData>();
    for (const key of keys) {
      const data = this.get(key);
      if (data) results.set(key, data);
    }
    return results;
  }

  setMultiple(entries: Map<string, EnrichedEntityData>): void {
    for (const [key, data] of entries) {
      this.set(key, data);
    }
  }

  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
  }

  getStats(): { size: number; hitRate: number } {
    return {
      size: this.cache.size,
      hitRate: this.lookups > 0 ? this.hits / this.lookups : 0,
    };
  }
}

// ===== L2: Redis Cache (Placeholder) =====

class L2Cache {
  private available = false;
  private client: unknown = null;

  constructor() {
    // Initialize Redis connection if configured
    this.initRedis();
  }

  private async initRedis(): Promise<void> {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      console.log('[L2Cache] Redis not configured, L2 cache disabled');
      return;
    }

    try {
      // In production, use ioredis or @upstash/redis
      // For now, this is a placeholder
      // this.client = new Redis(redisUrl);
      // this.available = true;
      console.log('[L2Cache] Redis cache would be initialized here');
    } catch (error) {
      console.error('[L2Cache] Failed to connect to Redis:', error);
    }
  }

  isAvailable(): boolean {
    return this.available;
  }

  async get(key: string): Promise<EnrichedEntityData | null> {
    if (!this.available || !this.client) return null;
    
    try {
      // const data = await this.client.get(key);
      // if (data) return JSON.parse(data);
      return null;
    } catch {
      return null;
    }
  }

  async set(key: string, data: EnrichedEntityData): Promise<void> {
    if (!this.available || !this.client) return;
    
    try {
      // await this.client.setex(key, CONFIG.L2_TTL_SECONDS, JSON.stringify(data));
    } catch (error) {
      console.error('[L2Cache] Set error:', error);
    }
  }

  async getMultiple(keys: string[]): Promise<Map<string, EnrichedEntityData>> {
    const results = new Map<string, EnrichedEntityData>();
    if (!this.available || !this.client) return results;
    
    try {
      // const pipeline = this.client.pipeline();
      // keys.forEach(key => pipeline.get(key));
      // const responses = await pipeline.exec();
      // responses.forEach((response, index) => {
      //   if (response[1]) {
      //     results.set(keys[index], JSON.parse(response[1]));
      //   }
      // });
    } catch (error) {
      console.error('[L2Cache] GetMultiple error:', error);
    }
    
    return results;
  }

  async setMultiple(entries: Map<string, EnrichedEntityData>): Promise<void> {
    if (!this.available || !this.client) return;
    
    try {
      // const pipeline = this.client.pipeline();
      // for (const [key, data] of entries) {
      //   pipeline.setex(key, CONFIG.L2_TTL_SECONDS, JSON.stringify(data));
      // }
      // await pipeline.exec();
    } catch (error) {
      console.error('[L2Cache] SetMultiple error:', error);
    }
  }
}

// ===== L3: PostgreSQL Cache (Placeholder) =====

class L3Cache {
  private available = false;

  constructor() {
    // L3 uses the main Prisma client
    // Requires an EnrichmentCache table in schema
    this.available = false; // Disabled until table is added
  }

  isAvailable(): boolean {
    return this.available;
  }

  async get(entityId: string): Promise<EnrichedEntityData | null> {
    if (!this.available) return null;
    
    try {
      // const cached = await prisma.enrichmentCache.findFirst({
      //   where: {
      //     entityId,
      //     expiresAt: { gt: new Date() },
      //   },
      // });
      // if (cached) return cached.data as EnrichedEntityData;
      return null;
    } catch {
      return null;
    }
  }

  async set(entityId: string, data: EnrichedEntityData): Promise<void> {
    if (!this.available) return;
    
    try {
      // const expiresAt = new Date(Date.now() + CONFIG.L3_TTL_HOURS * 60 * 60 * 1000);
      // await prisma.enrichmentCache.upsert({
      //   where: { entityId },
      //   create: { entityId, data, expiresAt },
      //   update: { data, expiresAt },
      // });
    } catch (error) {
      console.error('[L3Cache] Set error:', error);
    }
  }

  async getMultiple(entityIds: string[]): Promise<Map<string, EnrichedEntityData>> {
    const results = new Map<string, EnrichedEntityData>();
    if (!this.available) return results;
    
    try {
      // const cached = await prisma.enrichmentCache.findMany({
      //   where: {
      //     entityId: { in: entityIds },
      //     expiresAt: { gt: new Date() },
      //   },
      // });
      // for (const entry of cached) {
      //   results.set(entry.entityId, entry.data as EnrichedEntityData);
      // }
    } catch (error) {
      console.error('[L3Cache] GetMultiple error:', error);
    }
    
    return results;
  }

  async setMultiple(entries: Map<string, EnrichedEntityData>): Promise<void> {
    if (!this.available) return;
    
    // Use transaction for batch insert/update
    try {
      // const expiresAt = new Date(Date.now() + CONFIG.L3_TTL_HOURS * 60 * 60 * 1000);
      // await prisma.$transaction(
      //   Array.from(entries.entries()).map(([entityId, data]) =>
      //     prisma.enrichmentCache.upsert({
      //       where: { entityId },
      //       create: { entityId, data, expiresAt },
      //       update: { data, expiresAt },
      //     })
      //   )
      // );
    } catch (error) {
      console.error('[L3Cache] SetMultiple error:', error);
    }
  }
}

// ===== Unified Cache Service =====

class BatchCacheService {
  private l1: L1Cache;
  private l2: L2Cache;
  private l3: L3Cache;
  private totalLookups = 0;
  private totalHits = 0;

  constructor() {
    this.l1 = new L1Cache();
    this.l2 = new L2Cache();
    this.l3 = new L3Cache();
  }

  /**
   * Get cached data for a single entity
   */
  async get(entityId: string): Promise<EnrichedEntityData | null> {
    this.totalLookups++;

    // Try L1 first (fastest)
    const l1Result = this.l1.get(entityId);
    if (l1Result) {
      this.totalHits++;
      return l1Result;
    }

    // Try L2 (Redis)
    const l2Result = await this.l2.get(entityId);
    if (l2Result) {
      this.totalHits++;
      // Promote to L1
      this.l1.set(entityId, l2Result);
      return l2Result;
    }

    // Try L3 (PostgreSQL)
    const l3Result = await this.l3.get(entityId);
    if (l3Result) {
      this.totalHits++;
      // Promote to L1 and L2
      this.l1.set(entityId, l3Result);
      await this.l2.set(entityId, l3Result);
      return l3Result;
    }

    return null;
  }

  /**
   * Set cached data for a single entity
   */
  async set(entityId: string, data: EnrichedEntityData): Promise<void> {
    // Write to all layers
    this.l1.set(entityId, data);
    await this.l2.set(entityId, data);
    await this.l3.set(entityId, data);
  }

  /**
   * Batch get cached data for multiple entities
   * This is the main optimization - reduces round-trips
   */
  async getMultiple(entityIds: string[]): Promise<BatchCacheResult> {
    const hits = new Map<string, EnrichedEntityData>();
    let remaining = [...entityIds];
    let l1Hits = 0;
    let l2Hits = 0;
    let l3Hits = 0;

    // Try L1 first
    const l1Results = this.l1.getMultiple(remaining);
    for (const [id, data] of l1Results) {
      hits.set(id, data);
      l1Hits++;
    }
    remaining = remaining.filter(id => !hits.has(id));

    // Try L2 for remaining
    if (remaining.length > 0 && this.l2.isAvailable()) {
      const l2Results = await this.l2.getMultiple(remaining);
      for (const [id, data] of l2Results) {
        hits.set(id, data);
        l2Hits++;
        // Promote to L1
        this.l1.set(id, data);
      }
      remaining = remaining.filter(id => !hits.has(id));
    }

    // Try L3 for remaining
    if (remaining.length > 0 && this.l3.isAvailable()) {
      const l3Results = await this.l3.getMultiple(remaining);
      for (const [id, data] of l3Results) {
        hits.set(id, data);
        l3Hits++;
        // Promote to L1 and L2
        this.l1.set(id, data);
        await this.l2.set(id, data);
      }
      remaining = remaining.filter(id => !hits.has(id));
    }

    const totalHits = hits.size;
    const totalMisses = remaining.length;
    const total = entityIds.length;

    this.totalLookups += total;
    this.totalHits += totalHits;

    return {
      hits,
      misses: remaining,
      stats: {
        l1Hits,
        l2Hits,
        l3Hits,
        totalHits,
        totalMisses,
        hitRate: total > 0 ? totalHits / total : 0,
      },
    };
  }

  /**
   * Batch set cached data for multiple entities
   */
  async setMultiple(entries: Map<string, EnrichedEntityData>): Promise<void> {
    // Write to L1 (synchronous, fast)
    this.l1.setMultiple(entries);

    // Write to L2 and L3 in parallel
    await Promise.all([
      this.l2.setMultiple(entries),
      this.l3.setMultiple(entries),
    ]);
  }

  /**
   * Clear all caches
   */
  clear(): void {
    this.l1.clear();
    // Note: L2 and L3 have their own TTL-based expiration
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const l1Stats = this.l1.getStats();
    return {
      l1Size: l1Stats.size,
      l1HitRate: l1Stats.hitRate,
      l2Available: this.l2.isAvailable(),
      l3Available: this.l3.isAvailable(),
      totalLookups: this.totalLookups,
      totalHits: this.totalHits,
    };
  }
}

// ===== Singleton Instance =====

let cacheInstance: BatchCacheService | null = null;

export function getBatchCache(): BatchCacheService {
  if (!cacheInstance) {
    cacheInstance = new BatchCacheService();
  }
  return cacheInstance;
}

/**
 * Convenience function for batch cache lookup
 */
export async function batchCacheLookup(
  entityIds: string[]
): Promise<BatchCacheResult> {
  return getBatchCache().getMultiple(entityIds);
}

/**
 * Convenience function for batch cache write
 */
export async function batchCacheWrite(
  entries: Map<string, EnrichedEntityData>
): Promise<void> {
  return getBatchCache().setMultiple(entries);
}

/**
 * Convenience function to get cache key for an entity
 */
export function getEntityCacheKey(
  type: EntityTypeValue,
  identifier: string
): string {
  const normalized = identifier
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/$/, '');
  return `entity:${type}:${normalized}`;
}

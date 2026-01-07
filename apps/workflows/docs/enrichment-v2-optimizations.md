# Enrichment Service v2 - Optimization Guide

## Overview

The enrichment service has been completely rewritten with **6 major optimizations** to dramatically improve performance, reliability, and cost efficiency.

## Quick Start

```typescript
import { enrichCellWithProviders, getEnrichmentMetrics } from './enrichment-service';

// Use exactly like before - backward compatible!
const result = await enrichCellWithProviders({
  columnKey: 'company_name',
  rowId: 'row_123',
  tableId: 'table_456',
});

// Check cache hit, singleflight coalescing, etc.
console.log(result.metadata?.cacheHit); // true if served from cache
console.log(result.metadata?.singleflightCoalesced); // true if shared with concurrent request

// Get detailed metrics
const metrics = getEnrichmentMetrics();
console.log(metrics.cacheHitRate); // e.g., 0.85
console.log(metrics.singleflightStats);
console.log(metrics.providerHealth);
```

---

## Optimization 1: Redis Cache with TTL, Negative Caching, and Versioned Keys

### What it does
- **Redis as primary cache** with automatic fallback to in-memory
- **TTL-based expiration** prevents stale data (configurable, default 1 hour)
- **Negative caching** remembers "not found" results to avoid repeated lookups
- **Versioned keys** allow instant cache invalidation by incrementing version

### Configuration

```typescript
// enrichment-config.ts
cache: {
  enabled: true,
  defaultTtlSeconds: 3600,      // 1 hour
  negativeTtlSeconds: 300,       // 5 minutes for "not found"
  version: 1,                    // Increment to invalidate all
  maxMemoryEntries: 10000,       // Fallback cache size
}
```

### Key Benefits
- **Reduced API calls**: Cache hits avoid expensive provider calls
- **Negative caching**: If a field can't be enriched, we remember and skip retries
- **Version invalidation**: Change `version` to clear all caches instantly

### Files
- `src/cache/redis-cache.ts` - Redis cache implementation

---

## Optimization 2: Singleflight Pattern for Request Coalescing

### What it does
Coalesces concurrent requests for the same (row, field) into a **single provider call**.

### Example
If 10 concurrent tasks request `(row_123, company_name)`:
- **Before**: 10 provider API calls
- **After**: 1 provider API call, result shared with all 10

### Configuration

```typescript
singleflight: {
  enabled: true,
  timeoutMs: 30000,
}
```

### Key Benefits
- **N → 1 reduction** in API calls for concurrent requests
- **Critical for batch enrichment** where many cells in a row need same data
- **Automatic**: No code changes needed

### Files
- `src/cache/singleflight.ts` - Singleflight implementation

---

## Optimization 3: Per-Row Provider Caching and Batching

### What it does
Caches **full provider responses** at the row level, not just individual fields.

### Example
If LinkedIn API returns: `{company_name, industry, employees, website}`
- Single call enriches ALL 4 fields
- Cached in Redis for future row accesses

### Key Benefits
- **Multi-field enrichment in one call**
- **Cross-worker sharing** via Redis
- **7-day persistence** for expensive lookups

---

## Optimization 4: DB-Native JSONB Updates

### What it does
Replaces read-modify-write JSON merges with PostgreSQL-native `jsonb_set` operations.

### Before (Race Condition):
```typescript
// Worker 1: Read data → Modify → Write
// Worker 2: Read data → Modify → Write (overwrites Worker 1!)
const row = await prisma.row.findUnique({ where: { id } });
const newData = { ...row.data, [field]: value };
await prisma.row.update({ data: { data: newData } });
```

### After (Atomic):
```sql
UPDATE rows 
SET data = jsonb_set(data, '{field}', '"value"')
WHERE id = $1
```

### Configuration
Automatic when using the new enrichment service.

### Key Benefits
- **No lost updates** under concurrency
- **Faster**: Single query instead of read + write
- **Bulk operations**: Update 100 cells in one query

### Files
- `src/db-native.ts` - PostgreSQL-native operations

---

## Optimization 5: Smarter Waterfall with Parallel Probes

### What it does
- **Parallel execution** of free + cheap providers (instead of sequential)
- **Ensemble fusion** to combine results with confidence weighting
- **Premium fallback** only when cheaper providers fail

### Strategy Comparison

**v1 (Sequential)**:
```
Free Provider 1 → Free Provider 2 → Cheap Provider 1 → Premium Provider
```

**v2 (Parallel)**:
```
[Free 1, Free 2, Cheap 1] → (in parallel) → Pick best → Premium (if needed)
```

### Configuration

```typescript
parallelProbes: {
  enabled: true,
  maxConcurrent: 5,
  probeTimeoutMs: 10000,
},
ensembleFusion: {
  enabled: false,  // Enable for multi-provider voting
  agreementThreshold: 0.8,
}
```

### Key Benefits
- **Faster**: Parallel is faster than sequential
- **Smarter selection**: Best result wins, not first result
- **Cost conscious**: Premium only when needed

---

## Optimization 6: Metrics and Circuit Breakers

### What it does
- **Circuit breakers** automatically disable flaky providers
- **Metrics collection** for error rates, latency P50/P95/P99
- **Auto-recovery** when providers come back online

### Circuit Breaker States

| State | Behavior |
|-------|----------|
| **CLOSED** | Normal operation |
| **OPEN** | Requests rejected (provider is down) |
| **HALF_OPEN** | Testing if provider recovered |

### Configuration

```typescript
circuitBreaker: {
  enabled: true,
  failureThreshold: 5,      // Open after 5 failures
  resetTimeoutMs: 30000,    // Try half-open after 30s
  successThreshold: 3,      // Close after 3 successes
  windowMs: 60000,          // 1-minute rolling window
  minimumRequests: 10,      // Min requests before opening
}
```

### Metrics Available

```typescript
const metrics = getEnrichmentMetrics();

// Overall stats
metrics.totalRequests
metrics.cacheHits
metrics.cacheMisses
metrics.negativeCacheHits
metrics.cacheHitRate           // Computed

// Singleflight stats
metrics.singleflightStats.coalescedRequests
metrics.singleflightStats.avgWaitersPerRequest

// Provider health
metrics.providerHealth.linkedin_api.state    // 'closed' | 'open' | 'half_open'
metrics.providerHealth.linkedin_api.errorRate
metrics.providerHealth.linkedin_api.latencyP50
```

### Files
- `src/cache/circuit-breaker.ts` - Circuit breaker implementation

---

## Environment Variables

```bash
# Redis connection (optional - falls back to memory if not set)
REDIS_URL=redis://localhost:6379

# Database (required)
DATABASE_URL=postgresql://...
```

---

## Backward Compatibility

The v2 service maintains **100% backward compatibility**:

```typescript
// This still works exactly the same!
import { enrichCellWithProviders, clearEnrichmentCache, getCacheStats } 
  from './enrichment-service';
```

### Extended API

```typescript
// v2-specific imports
import { 
  enrichCellWithProvidersV2,  // New v2 function with extra options
  getEnrichmentMetrics,        // Detailed metrics
  closeRedisConnection,        // Cleanup
} from './enrichment-service';

// v2 options
const result = await enrichCellWithProvidersV2({
  columnKey: 'company_name',
  rowId: 'row_123',
  tableId: 'table_456',
  enableParallelProbes: true,   // Default: true
  useEnsembleFusion: false,     // Default: false
});
```

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    enrichCellWithProviders()                     │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                    ┌───────────▼──────────┐
                    │   Singleflight       │◄── Coalesces concurrent requests
                    │   (per cell key)     │
                    └───────────┬──────────┘
                                │
                    ┌───────────▼──────────┐
                    │   Redis Cache        │◄── TTL + Negative caching
                    │   (with fallback)    │
                    └───────────┬──────────┘
                                │ (cache miss)
                    ┌───────────▼──────────┐
                    │   Parallel Probes    │◄── Free + Cheap in parallel
                    │   [Free, Cheap]      │
                    └───────────┬──────────┘
                                │
                    ┌───────────▼──────────┐
                    │   Ensemble Fusion    │◄── Pick best result
                    │   (optional)         │
                    └───────────┬──────────┘
                                │ (if no good result)
                    ┌───────────▼──────────┐
                    │   Premium Fallback   │◄── Expensive providers
                    │   (with circuit      │
                    │    breaker)          │
                    └───────────┬──────────┘
                                │
                    ┌───────────▼──────────┐
                    │   Cache Write        │◄── Store result (or negative)
                    │   + DB Update        │
                    └──────────────────────┘
```

---

## File Structure

```
apps/workflows/src/
├── cache/
│   ├── index.ts              # Module exports
│   ├── redis-cache.ts        # Redis cache with TTL, negative caching
│   ├── singleflight.ts       # Request coalescing
│   └── circuit-breaker.ts    # Provider health management
├── db-native.ts              # PostgreSQL JSONB operations
├── enrichment-config.ts      # Configuration (with v2 settings)
├── enrichment-service.ts     # Entry point (re-exports v2)
├── enrichment-service-v2.ts  # Optimized implementation
└── mock-providers.ts         # Mock provider implementations
```

---

## Performance Expectations

| Metric | Before (v1) | After (v2) |
|--------|-------------|------------|
| Cache Hit Rate | 0% (memory only) | 70-90% (Redis) |
| Concurrent Request Reduction | 1x | 5-10x (singleflight) |
| Provider Call Latency | Sequential | Parallel (2-3x faster) |
| Lost Updates | Possible | Impossible (atomic) |
| Flaky Provider Impact | Full impact | Auto-disabled |

---

## Troubleshooting

### Redis Connection Issues

If Redis is unavailable, the service automatically falls back to in-memory caching:

```
[L2Cache] Redis not available, using in-memory fallback
```

This is safe - enrichment will work, just without cross-worker cache sharing.

### Circuit Breaker Opened

If you see:
```
Circuit breaker open for linkedin_api. Next retry at 2024-01-07T12:00:00Z
```

The provider is being skipped due to failures. It will auto-recover after `resetTimeoutMs`.

To force-reset a circuit breaker:
```typescript
import { circuitBreakers } from './cache';
circuitBreakers.get('linkedin_api').forceState('closed');
```

---

## Future Improvements

1. **Distributed singleflight** using Redis locks
2. **Provider cost optimization** based on historical metrics
3. **Machine learning** for provider selection
4. **Real-time metrics dashboard**

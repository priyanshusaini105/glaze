---
description: How to add Redis caching to new tools and providers
---

# Redis Caching Workflow

Add aggressive Redis caching to minimize API calls and improve response times.

## Cache TTL Tiers

Use the pre-defined TTL constants from `@/cache`:

```typescript
import { CACHE_TTL } from '@/cache';

// Available TTLs:
CACHE_TTL.COMPANY_PROFILE     // 7 days - stable company data
CACHE_TTL.COMPANY_SOCIALS     // 7 days - social links rarely change
CACHE_TTL.PERSON_PROFILE      // 3 days - person data
CACHE_TTL.LINKEDIN_PROFILE    // 3 days
CACHE_TTL.SEARCH_RESULTS      // 24 hours - web search results
CACHE_TTL.LLM_EXTRACTION      // 2 days - LLM outputs
CACHE_TTL.PAGE_SCRAPE         // 24 hours - scraped pages
CACHE_TTL.EMAIL_VERIFICATION  // 12 hours - dynamic data
CACHE_TTL.NEGATIVE_SHORT      // 4 hours - "not found" results
CACHE_TTL.NEGATIVE_LONG       // 24 hours
CACHE_TTL.DEFAULT             // 7 days
```

## Add Caching to a New Tool

### Step 1: Import Cache Utilities

```typescript
import { 
    withCache, 
    CACHE_TTL, 
    hashKey,
    normalizeDomainForCache 
} from '@/cache';
```

### Step 2: Wrap the Main Function

```typescript
// Internal implementation (uncached)
async function myToolInternal(input: string): Promise<Result> {
    // ... actual implementation
}

// Cached wrapper
export async function myTool(input: string): Promise<Result> {
    const cacheKey = `my_tool:${normalizeDomainForCache(input)}`;
    
    return withCache<Result>(
        cacheKey,
        async () => myToolInternal(input),
        {
            ttl: CACHE_TTL.COMPANY_PROFILE,  // Choose appropriate TTL
            keyPrefix: 'mytool',
            logLabel: 'MyTool',
        }
    ) ?? defaultResult;
}
```

## Add Caching to Serper Searches

```typescript
import { cachedSerperSearch } from '@/cache';

// Wrap your search function
async function mySearch(query: string) {
    return cachedSerperSearch(query, async (q) => {
        // Your raw search implementation
        return { organic: results };
    });
}
```

## Add Caching to LLM Extractions

```typescript
import { cachedLLMExtraction, hashKey } from '@/cache';

async function extractWithLLM(input: string) {
    const promptHash = hashKey(`${systemPrompt}|${userPrompt}`);
    
    return cachedLLMExtraction(
        promptHash,
        async () => {
            // Your LLM call
            return generateObject({ ... });
        }
    );
}
```

## Cache Key Best Practices

1. **Normalize inputs**: Use `normalizeDomainForCache()` for domains
2. **Hash complex queries**: Use `hashKey()` for long strings
3. **Include version**: Add version prefix if data format changes
4. **Use consistent prefixes**: `company:profile:`, `person:linkedin:`, etc.

## Checking Cache Stats

```typescript
import { getCachedProviderStats } from '@/cache';

const stats = getCachedProviderStats();
console.log('Hit rates:', stats);
// { serper: { hits: 45, misses: 5, hitRate: '90.0%' }, ... }
```

## Redis Connection

Ensure Redis is running:
```bash
docker compose up redis -d
```

Environment variable:
```
REDIS_URL=redis://localhost:6379
```

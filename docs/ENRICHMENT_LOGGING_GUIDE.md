# Enhanced Enrichment Logging Guide

## Overview

The enrichment service now includes comprehensive logging at every stage of the waterfall enrichment pipeline. This guide helps you understand and use these logs for debugging enrichment failures.

## Log Levels

- **`logger.info`** - Important steps in the flow (cache hits, provider attempts, final results)
- **`logger.debug`** - Detailed diagnostic info (budget checks, skipped providers, cache status)
- **`logger.warn`** - Issues but not failures (low confidence, provider timeouts, failures)
- **`logger.error`** - Errors that blocked execution (API errors, circuit breaker opened)

## Complete Enrichment Flow with Logs

### 1️⃣ **Service Initialization**

```
🔧 Smart enrichment service v2 invoked {
  columnKey: "website",
  rowId: "367c9eb5-763a-4be1-b84e-e104c3cdfcad",
  tableId: "table-123",
  budget: 50,
  enableParallelProbes: true,
  useEnsembleFusion: false,
  providerMode: "REAL"
}
```

**What to look for:**
- `providerMode` - Should be "REAL" (not "MOCK")
- `budget` - Sufficient for planned providers?
- `enableParallelProbes` - Should be true for faster enrichment

### 2️⃣ **Classification Phase**

```
🏷️ Classification result {
  rowId: "...",
  entityType: "company",
  signature: "company:stripe",
  strength: 0.95,
  ambiguity: 0.05,
  strategy: "DIRECT_COMPANY_SEARCH"
}
```

**What to look for:**
- `strength` > 0.7 - Good input data
- `ambiguity` < 0.3 - Clear what to search for
- `strategy` - Type of enrichment approach

### 3️⃣ **Workflow Planning**

```
📋 Workflow plan generated {
  rowId: "...",
  steps: 3,
  fallbackSteps: 1,
  maxCostCents: 20,
  expectedConfidence: 0.75,
  summary: "HYPOTHESIS_AND_SCORE: Resolve Company From Name (COMPANY)"
}
```

**What to look for:**
- `steps` > 0 - Has a plan
- `maxCostCents` - Budget estimate
- `expectedConfidence` - Projected success rate

### 4️⃣ **Cache Check Phase**

#### Cache Hit (Positive)
```
♻️ Positive cache HIT: website {
  rowId: "...",
  field: "website",
  value: "https://stripe.com",
  confidence: "85%",
  source: "smart_enrichment"
}
```
✅ **Result**: Returns immediately, no provider calls needed

#### Cache Miss
```
💾 Cache MISS for website {
  rowId: "...",
  field: "website",
  reason: "Not in cache, proceeding to enrichment providers"
}
```
→ Continues to parallel probes

#### Negative Cache Hit
```
♻️ Negative cache HIT: website is known to be unenrichable {
  rowId: "...",
  field: "website",
  reason: "Previous attempts failed, skipping to avoid wasted API calls"
}
```
⚠️ **Result**: Stops enrichment, returns null (no retry)

### 5️⃣ **Provider Discovery & Filtering**

```
🚀 Spawning probe: smart_enrichment (cheap/2¢) {
  rowId: "...",
  field: "website",
  provider: "smart_enrichment",
  tier: "cheap",
  cost: 2
}

⏭️ Provider wikipedia cannot enrich website {
  rowId: "...",
  provider: "wikipedia",
  tier: "free"
}

💰 Provider serper exceeds budget (1¢ > 0¢) {
  rowId: "...",
  provider: "serper",
  cost: 1,
  budget: 0
}
```

**What to look for:**
- Providers being spawned ✅
- Providers filtered out:
  - `cannot enrich` - Field not supported by provider
  - `exceeds budget` - Not enough budget remaining
  - `circuit breaker OPEN` - Provider is unhealthy

### 6️⃣ **Parallel Probes Execution**

```
🔄 Running 2 parallel probes {
  rowId: "...",
  field: "website",
  totalProbes: 2,
  availableProviders: ["smart_enrichment", "serper"]
}

⏳ Fetching from smart_enrichment... {
  rowId: "...",
  provider: "smart_enrichment",
  startTime: "2026-01-07T10:30:45.123Z"
}

📦 Row provider cache MISS for smart_enrichment {
  rowId: "...",
  provider: "smart_enrichment"
}

✅ Probe result: smart_enrichment {
  rowId: "...",
  provider: "smart_enrichment",
  hasValue: true,
  confidence: "80%",
  latencyMs: 245,
  source: "smart_enrichment"
}
```

**What to look for:**
- How many probes are running?
- Cache hits/misses for each provider?
- Confidence levels of results?
- Latency for each provider?

### 7️⃣ **Parallel Probes Summary**

```
📊 Parallel probes completed {
  rowId: "...",
  field: "website",
  successful: 1,
  failed: 0,
  totalProbes: 2,
  results: [
    {
      provider: "smart_enrichment",
      confidence: 80,
      cost: 2,
      latencyMs: 245
    }
  ]
}
```

**What to look for:**
- `successful` vs `totalProbes` - How many providers returned results?
- `confidence` - Do results meet threshold (70%)?
- `cost` - Total cost of probes?

### 8️⃣ **Result Selection**

If results from multiple providers:

```
🔮 Using ensemble fusion to combine 2 results {
  rowId: "...",
  field: "website"
}

🔮 Ensemble fusion selected best result {
  providers: ["smart_enrichment", "serper"],
  selected: "smart_enrichment",
  confidence: 0.82
}
```

Or if single result:

```
✅ Selected first result meeting threshold {
  rowId: "...",
  provider: "smart_enrichment",
  confidence: 80
}

⚠️ No results met confidence threshold (0.7) {
  rowId: "...",
  threshold: 0.7
}
```

### 9️⃣ **Premium Fallback (if needed)**

If parallel probes failed:

```
↗️ No result from parallel probes, attempting premium fallback {
  rowId: "...",
  field: "website"
}

💎 Premium fallback triggered, trying 1 providers {
  rowId: "...",
  field: "website",
  availableProviders: ["linkedin (5¢)"],
  budgetCents: 30
}

🔄 Trying premium provider: linkedin {
  rowId: "...",
  provider: "linkedin",
  cost: 5
}

✅ Premium provider succeeded: linkedin {
  rowId: "...",
  provider: "linkedin",
  confidence: "92%",
  latencyMs: 1240
}
```

### 🔟 **Final Result**

#### Success
```
✨ Enrichment succeeded with smart_enrichment {
  rowId: "...",
  field: "website",
  provider: "smart_enrichment",
  value: "https://stripe.com",
  confidence: "80%",
  source: "smart_enrichment",
  costCents: 2,
  latencyMs: 245
}

✨ Cell enrichment v2 succeeded {
  field: "website",
  source: "smart_enrichment",
  confidence: 0.8,
  cost: 2,
  totalTimeMs: 245,
  cacheHit: false,
  singleflightCoalesced: false
}
```

#### Failure
```
❌ Enrichment failed for website {
  rowId: "...",
  field: "website",
  reason: "No provider could enrich this field",
  notes: "Will retry on next attempt",
  parallelProbesAttempted: true
}

❌ Cell enrichment v2 failed, using fallback {
  field: "website",
  rowId: "...",
  totalTimeMs: 245,
  notes: ["No provider could enrich website - will retry on next attempt"],
  cost: 0,
  cacheHit: false,
  summary: "Failed to enrich website: No provider could enrich website - will retry on next attempt"
}
```

## Debugging Common Issues

### Issue: "No provider could enrich website"

Look for these patterns in logs:

#### 1. No providers available
```
⚠️ No providers available for parallel probes {
  reason: "No providers support this field or have sufficient budget"
}
```
**Solution:** Check if any provider supports the field

#### 2. All providers skipped
```
⏭️ Provider X cannot enrich website
⏭️ Provider Y cannot enrich website
💰 Provider Z exceeds budget
```
**Solution:** Reduce budget constraint or add more providers

#### 3. Providers ran but failed
```
📊 Parallel probes completed {
  successful: 0,
  failed: 1,
  results: []
}

❌ Probe failed: smart_enrichment {
  error: "SERPER_API_KEY not configured"
}
```
**Solution:** Check API keys in environment

#### 4. Confidence below threshold
```
⚠️ No results met confidence threshold (0.7) {
  results: [{confidence: 0.65}]
}
```
**Solution:** Lower threshold or verify data quality

### Issue: Slow Enrichment

Look for high latency values:

```
✅ Probe result: linkedin {
  latencyMs: 5000,  // ❌ Too slow!
  confidence: "92%"
}
```

**Actions:**
- Check network/API latency
- Check provider health
- Reduce budget to skip premium providers
- Enable caching to reduce repeat calls

### Issue: High Cost

Look for cost breakdown:

```
📊 Parallel probes completed {
  results: [
    {provider: "linkedin", cost: 5, latencyMs: 2000},
    {provider: "serper", cost: 1, latencyMs: 200}
  ]
}
```

**Actions:**
- Reduce budget constraint
- Prioritize cheaper providers
- Enable caching to reuse results
- Check cost per provider in configuration

## Key Metrics to Track

From logs, extract these metrics:

```typescript
{
  // Efficiency
  "cacheHitRate": 0.45,           // % cache hits
  "totalCostCents": 2,            // Cost per enrichment
  "totalTimeMs": 245,             // Time per enrichment
  
  // Quality
  "confidence": 0.80,             // Result confidence
  "successRate": 0.85,            // % successful enrichments
  
  // Provider Health
  "providerAttempts": 2,          // How many tried
  "providerSuccesses": 1,         // How many succeeded
  "singleflightCoalesced": false, // Request deduplication
  
  // Waterfall Progress
  "stages": ["cache", "free", "cheap", "premium"],
  "stageReachedAt": "cheap",      // Which stage succeeded
}
```

## Environment Setup for Better Logs

### Enable Debug Logging

```bash
# Show all logs including debug
LOG_LEVEL=debug npm run dev
```

### JSON Structured Logging

Logs are already in JSON format. Use a log aggregator:

```bash
# Pipe to jq for better formatting
npm run dev | jq 'select(.rowId == "367c9eb5-...")'
```

### Filter Specific Enrichment

```bash
# Find all logs for a specific row
npm run dev | jq 'select(.rowId == "367c9eb5-763a-4be1-b84e-e104c3cdfcad")'

# Find all failures
npm run dev | jq 'select(.level == "warn" or .level == "error")'

# Find slow enrichments (> 1 second)
npm run dev | jq 'select(.totalTimeMs > 1000)'
```

## Related Files

- [enrichment-service-v2.ts](../apps/workflows/src/enrichment-service-v2.ts) - Main logging source
- [smart-enrichment-provider.ts](../apps/workflows/src/tools/smart-enrichment/smart-enrichment-provider.ts) - Provider-level logging
- [WEBSITE_ENRICHMENT_TROUBLESHOOTING.md](./WEBSITE_ENRICHMENT_TROUBLESHOOTING.md) - Troubleshooting guide
- [WEBSITE_ENRICHMENT_ANALYSIS.md](./WEBSITE_ENRICHMENT_ANALYSIS.md) - Architecture analysis

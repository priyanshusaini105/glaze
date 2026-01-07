# Company Name Resolver - Implementation Summary

## What Was Built

A **DNS-like company name resolver** that uses Serper API to resolve company names to canonical company information with deterministic confidence scoring.

## Files Created/Modified

1. **`company-name-resolver.ts`** - Main implementation (731 lines)
   - Complete rewrite using Serper API
   - Deterministic confidence scoring
   - Conservative approach (never lies)

2. **`test-company-name-resolver.ts`** - Test script
   - Tests Stripe, Linear, ABC Technologies, etc.
   - Demonstrates confidence scoring in action

3. **`README.md`** - Comprehensive documentation
   - Explains how the tool works
   - Confidence scoring model
   - Example dry runs
   - Usage guidelines

4. **`company-name-resolver.test.ts`** - Unit test documentation
   - Test cases for each scenario
   - Signal weight verification
   - Philosophy documentation

## Key Features Implemented

### 1. Seven-Step Resolution Process

```
1. Normalize input name
2. Generate search queries (deterministic)
3. Candidate extraction (fan-out, not single result)
4. Candidate validation (kill junk)
5. Disambiguation logic
6. Confidence scoring (conservative)
7. Output decision
```

### 2. Signal-Based Confidence Scoring

**Signals (Add Points):**
- ✅ Official website match: +0.35
- ✅ Search intent alignment: +0.20
- ✅ Domain quality: +0.15
- ✅ External corroboration: +0.20
- ✅ Name uniqueness: +0.10
- **Total possible: 1.00**

**Penalties (Subtract Points):**
- ⚠️ Multiple strong candidates: -0.20
- ⚠️ Generic name: -0.15
- ⚠️ Weak homepage signals: -0.10

**Final confidence = signals - penalties** (clamped 0.0-1.0, capped at 0.95)

### 3. Confidence Buckets

| Numeric | Level | Action |
|---------|-------|--------|
| ≥ 0.85 | HIGH | Safe to enrich fully |
| 0.65-0.84 | MEDIUM | Public data only |
| 0.40-0.64 | LOW | Return cautiously |
| < 0.40 | FAIL | Do not enrich |

### 4. Expected Behavior (Test Cases)

**Stripe:**
```typescript
{
  canonicalCompanyName: "Stripe",
  websiteUrl: "https://stripe.com",
  domain: "stripe.com",
  confidence: 0.95,
  confidenceLevel: "HIGH"
}
```

**Linear (ambiguous):**
```typescript
{
  canonicalCompanyName: "Linear",
  websiteUrl: "https://linear.app",
  domain: "linear.app",
  confidence: 0.75,
  confidenceLevel: "MEDIUM"
}
```

**ABC Technologies (generic):**
```typescript
{
  canonicalCompanyName: null,
  websiteUrl: null,
  domain: null,
  confidence: 0.20,
  confidenceLevel: "FAIL",
  reason: "Low confidence due to generic name"
}
```

## What Makes This Different

### Old Implementation
- ❌ Guessed domains (stripe.com, stripe.io, etc.)
- ❌ Fetched each domain directly (slow, error-prone)
- ❌ Simple confidence: high/medium/low
- ❌ No explainability

### New Implementation
- ✅ Uses Serper search API (discovers domains)
- ✅ Collects multiple candidates
- ✅ Numeric confidence with signal breakdown
- ✅ Conservative and explainable
- ✅ Never lies

## Philosophy

> **"If this tool lies once, users stop trusting everything."**

- Conservative approach
- Says "not sure" when uncertain
- Deterministic (same input = same output)
- Explainable (can log why confidence is low)
- No hallucination (hard rules only)

## Technical Properties

✅ **Deterministic** - No randomness, no LLM decisions  
✅ **Explainable** - Can log: "Confidence dropped due to multiple strong candidates"  
✅ **Testable** - Unit tests for each signal  
✅ **No hallucination** - Hard rules only  
✅ **No ML infra** - Pure TypeScript  
✅ **Static-friendly** - Easy to cache and test  

## How to Use

```typescript
import { resolveCompanyFromName } from './company-name-resolver';

const result = await resolveCompanyFromName("Stripe");

if (result.confidenceLevel === "HIGH") {
  // Safe to enrich fully
  await fullEnrichment(result.domain);
} else if (result.confidenceLevel === "MEDIUM") {
  // Public data only
  await lightEnrichment(result.domain);
} else if (result.confidenceLevel === "LOW") {
  // Return cautiously, mark as estimated
  await markAsEstimated(result);
} else {
  // Don't enrich
  console.log("Insufficient confidence, skipping");
}
```

## Testing

```bash
# Set API key
export SERPER_API_KEY="your_key_here"

# Run test script
cd apps/workflows
npx tsx src/tools/company/test-company-name-resolver.ts
```

## Configuration

Requires `SERPER_API_KEY` environment variable.

Get a free key at [serper.dev](https://serper.dev):
- 2500 searches/month free
- ~1 cent per additional search

## Next Steps

1. **Integration**: Use this in enrichment workflows
2. **Caching**: Cache results by company name
3. **Monitoring**: Track confidence distribution
4. **Tuning**: Adjust signal weights based on real-world performance

## Core Principle

This is **core infrastructure**, not a feature.

Everything else is just decoration.

---

**Status**: ✅ Implementation complete  
**TypeScript compilation**: ✅ Passing  
**Documentation**: ✅ Complete  
**Tests**: ✅ Test script ready  

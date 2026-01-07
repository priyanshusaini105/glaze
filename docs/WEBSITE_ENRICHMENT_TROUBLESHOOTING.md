# Website Enrichment Troubleshooting Guide

## Issue: "No provider could enrich website - will retry on next attempt"

This error occurs when the website enrichment process fails to find a valid website URL for a company.

## Common Causes

### 1. **Missing or Incomplete Company Name**

The Smart Enrichment Provider requires a company name to search for the website. 

**Check:**
```typescript
// In your data, ensure you have:
{
  "company": "Company Name Inc",  // or
  "name": "Company Name Inc"
}
```

**Solution:** Enrich the `company` or `name` field first before attempting website enrichment.

### 2. **All Search Results Are Excluded Domains**

The provider filters out social media, directories, and aggregator sites:
- linkedin.com, facebook.com, twitter.com, instagram.com
- wikipedia.org, crunchbase.com, zoominfo.com
- bloomberg.com, forbes.com, yelp.com, glassdoor.com
- indeed.com, g2.com, capterra.com

**Diagnosis:** Check the Serper search results to see if only excluded domains are returned.

**Solution:** Manually verify the company website or adjust the excluded domains list.

### 3. **Serper API Quota Exhausted**

Serper.dev provides 2,500 free searches per month.

**Check:**
```bash
# Monitor your Serper usage at: https://serper.dev/dashboard
```

**Solution:** 
- Upgrade your Serper plan
- Use alternative search providers
- Enable caching to reduce API calls

### 4. **Serper Returns No Results**

The company name might be too generic, misspelled, or the company might not have a web presence.

**Example:**
```typescript
// This will likely fail:
{ "company": "ABC" }

// This has better chances:
{ "company": "ABC Corporation", "industry": "Software" }
```

**Solution:** Provide more context:
- Include the `industry` field
- Use the full company name (not abbreviations)
- Add location if available

### 5. **Provider Health Issues**

Circuit breakers might have disabled the provider due to repeated failures.

**Check:**
```bash
# In your logs, look for:
"⚡ Circuit breaker OPEN for provider: smart_enrichment"
```

**Solution:**
- Wait for the circuit breaker to reset (automatic after cooldown)
- Check provider health: The system tracks provider success rates
- Restart the workflow service to reset circuit breakers

## Debugging Steps

### 1. Check Input Data Quality

```typescript
// Log the input data
logger.info('Input data for website enrichment', {
  rowId,
  company: input.company,
  name: input.name,
  industry: input.industry,
  existingData: input.raw
});
```

### 2. Test Serper Directly

```bash
curl -X POST 'https://google.serper.dev/search' \
  -H 'X-API-KEY: YOUR_SERPER_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "q": "\"Your Company Name\" official website",
    "num": 5
  }'
```

### 3. Enable Verbose Logging

In [enrichment-service-v2.ts](../apps/workflows/src/enrichment-service-v2.ts), the system logs:
- Cache hits/misses
- Provider attempts
- Confidence scores
- Failure reasons

Look for logs like:
```
🔍 SmartEnrichment: Searching { query: "..." }
⚠️ SmartEnrichment: No website found
```

### 4. Check Provider Registration

Verify that `smartEnrichmentProvider` is registered:

```bash
cd /home/priyanshu/dev/personal/glaze/apps/workflows
grep -r "smartEnrichmentProvider" src/tools/providers/
```

### 5. Review Waterfall Flow

The enrichment follows this flow:

1. **Cache Check** - Check Redis/memory cache
2. **Parallel Probes** - Run free + cheap providers in parallel
   - Smart Enrichment Provider (cheap tier) should run here
3. **Premium Fallback** - If all probes fail, try LinkedIn/premium providers
4. **Fallback Result** - Return null with retry note

## Solutions

### Short-term Fixes

1. **Ensure Company Name is Present**
   ```typescript
   // Priority order for company name:
   const companyName = input.company || input.name;
   if (!companyName) {
     // Enrich company field first
     await enrichCell({ field: 'company', ... });
   }
   ```

2. **Add Industry Context**
   ```typescript
   // Improve search accuracy
   const query = industry
     ? `"${companyName}" ${industry} official website`
     : `"${companyName}" official website`;
   ```

3. **Reduce Excluded Domains (Carefully)**
   ```typescript
   // In smart-enrichment-provider.ts
   // Be selective about which domains to exclude
   const excluded = [
     'linkedin.com', 'facebook.com', // Keep social media
     // Remove some aggregators if they have valid links
   ];
   ```

### Long-term Improvements

1. **Add More Website Providers**
   - Use Clearbit Logo API (has domain data)
   - Add Google Custom Search API
   - Integrate with company databases (Crunchbase, etc.)

2. **Implement Multi-Source Verification**
   ```typescript
   // Verify website by checking:
   // - DNS records
   // - SSL certificate matches company name
   // - Homepage content mentions company name
   ```

3. **Use LLM for Disambiguation**
   ```typescript
   // When multiple candidates exist, use LLM to pick best match
   const bestMatch = await llm.chooseBestWebsite({
     companyName,
     candidates: searchResults,
     context: { industry, location }
   });
   ```

4. **Cache Negative Results Temporarily**
   ```typescript
   // Cache "no website found" for 1 hour to avoid repeated failures
   // But allow retries after cooldown period
   await setCacheWithTTL(rowId, field, null, 3600); // 1 hour
   ```

## Monitoring

### Key Metrics to Track

1. **Success Rate by Provider**
   ```typescript
   metrics.providerSuccessRate = {
     smart_enrichment: 0.75,
     serper: 0.82,
     linkedin: 0.45
   }
   ```

2. **Average Confidence Scores**
   ```typescript
   metrics.avgConfidence = {
     website: 0.68,  // Below threshold?
     domain: 0.85,
     company: 0.92
   }
   ```

3. **Cache Hit Rate**
   ```typescript
   metrics.cacheHitRate = {
     positive: 0.45,  // Found in cache
     negative: 0.12,  // Known failures
     miss: 0.43      // Not in cache
   }
   ```

### Alerts to Set Up

- ❌ Website enrichment success rate < 50%
- ⚠️ Serper API quota > 80% used
- 🔥 Circuit breaker opened for smart_enrichment
- 💰 Cost per enrichment > $0.05

## Example: Successful vs Failed Enrichment

### ✅ Successful Enrichment

**Input:**
```json
{
  "company": "Stripe Inc",
  "industry": "FinTech",
  "location": "San Francisco, CA"
}
```

**Search Query:** `"Stripe Inc" FinTech official website`

**Result:** `https://stripe.com` (confidence: 0.95)

### ❌ Failed Enrichment

**Input:**
```json
{
  "name": "John Smith"  // Person name, not company
}
```

**Search Query:** `"John Smith" official website`

**Result:** Multiple unrelated results, all LinkedIn/social media profiles

**Failure Reason:** No company name provided, search too generic

## Related Files

- [enrichment-service-v2.ts](../apps/workflows/src/enrichment-service-v2.ts) - Main enrichment orchestrator
- [smart-enrichment-provider.ts](../apps/workflows/src/tools/smart-enrichment/smart-enrichment-provider.ts) - Website enrichment logic
- [enrichment-config.ts](../apps/workflows/src/enrichment-config.ts) - Configuration settings
- [provider-adapter.ts](../apps/workflows/src/provider-adapter.ts) - Provider registration

## Support

If issues persist:
1. Check logs in `/home/priyanshu/dev/personal/glaze/apps/workflows/` 
2. Review [ENRICHMENT_QUICK_REF.md](../docs/ENRICHMENT_QUICK_REF.md)
3. Test with known working companies (Stripe, Airbnb, etc.)
4. Verify API keys are set in `.env`

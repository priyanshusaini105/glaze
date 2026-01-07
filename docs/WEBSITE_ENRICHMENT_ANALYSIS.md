# Website Enrichment Analysis & Recommendations

## Current State

### Issue
Cell enrichment for the `website` field is failing with the message:
```
"No provider could enrich website - will retry on next attempt"
```

### Root Cause
**Only ONE provider supports website enrichment**: `smartEnrichmentProvider`

When this provider fails (e.g., all Serper results are excluded domains), there is **no fallback** and enrichment fails.

## Provider Analysis

### Providers Supporting `website` Field

| Provider | Tier | Cost | Supported Fields |
|----------|------|------|------------------|
| `smartEnrichmentProvider` | cheap | 2¢ | domain, **website**, industry, companySummary, company |

### Providers That COULD Support `website`

| Provider | Tier | Cost | Current Fields | Potential |
|----------|------|------|----------------|-----------|
| `serperProvider` | free | 1¢ | name, title, company, socialLinks, location, shortBio | ✅ **Can search for company websites** |
| `companyScraperProvider` | free | 0¢ | company, industry, companySummary, socialLinks | ❌ Requires website URL as input |
| `linkedInProvider` | premium | 2-5¢ | Multiple fields | ✅ **LinkedIn company profiles have website** |
| `wikipediaProvider` | free | 0¢ | Many fields | ✅ **Wikipedia has official website** |

## Waterfall Flow Analysis

Current enrichment flow for `website` field:

```
1. Cache Check ❌ MISS
   └─> Redis cache has no entry for this rowId + field

2. Parallel Probes (free + cheap)
   ├─> Free tier providers: NONE support "website"
   │   ├─ githubProvider (supports: username, name, bio, etc.)
   │   ├─ wikipediaProvider (supports: company, industry, etc.) ⚠️ COULD support website
   │   ├─ openCorporatesProvider (supports: company, location, etc.)
   │   └─ companyScraperProvider (needs website as input)
   │
   └─> Cheap tier providers:
       ├─ smartEnrichmentProvider ✅ RUNS but FAILS
       │  └─ Reason: All Serper results are excluded domains
       ├─ serperProvider ⚠️ COULD support website but doesn't
       └─ prospeoProvider (email only)

3. Premium Fallback
   └─> linkedInProvider ⚠️ COULD provide website but doesn't support field

4. Result: FAIL ❌
   └─> No provider succeeded
```

## Why `smartEnrichmentProvider` Failed

Based on the enhanced logging we added:

### Possible Failure Scenarios

1. **Missing Company Name**
   ```typescript
   // If input doesn't have company or name field
   { field: "website", rowId: "...", existingData: {} }
   // Result: Provider returns null immediately
   ```

2. **All Results Excluded**
   ```typescript
   // Serper returns:
   [
     { link: "https://linkedin.com/company/xyz" },  // EXCLUDED
     { link: "https://crunchbase.com/org/xyz" },   // EXCLUDED
     { link: "https://wikipedia.org/wiki/XYZ" },   // EXCLUDED
   ]
   // Result: No valid domain found
   ```

3. **No Serper Results**
   ```typescript
   // Serper API returns empty organic results
   { organic: [] }
   // Possible reasons:
   // - Company name too generic
   // - Quota exceeded
   // - API error
   ```

4. **Invalid URLs**
   ```typescript
   // All URLs fail to parse
   [ { link: "invalid-url" }, { link: "another-bad-url" } ]
   // Result: All skipped due to URL parsing errors
   ```

## Recommended Solutions

### 🚀 Quick Wins (Immediate)

#### 1. **Add Website Support to Wikipedia Provider** ⭐ RECOMMENDED

Wikipedia articles for companies typically have an "official website" field.

```typescript
// In wikipedia-provider.ts
protected supportedFields: EnrichmentFieldKey[] = [
    "company",
    "industry",
    "companySummary",
    "foundedYear",
    "headquarters",
    "website",  // ✅ ADD THIS
];

// In enrich() method:
case "website":
    return await this.enrichWebsite(input, companyName);

// New method:
private async enrichWebsite(
    input: NormalizedInput,
    companyName: string
): Promise<ProviderResult | null> {
    const wikidataEntity = await this.fetchWikidataEntity(companyName);
    if (!wikidataEntity) return null;

    // Property P856 is "official website"
    const websiteUrl = wikidataEntity.claims?.P856?.[0]?.mainsnak?.datavalue?.value;
    
    if (!websiteUrl) return null;

    return {
        field: "website",
        value: websiteUrl,
        confidence: 0.95, // Wikipedia is highly reliable
        source: this.name,
        timestamp: new Date().toISOString(),
        costCents: 0,
    };
}
```

**Benefits:**
- ✅ Free (0¢)
- ✅ Highly reliable (Wikipedia is curated)
- ✅ No API key required
- ✅ Runs in "free" tier (before smart enrichment)

#### 2. **Add Website Support to Serper Provider**

```typescript
// In serper-provider.ts
protected supportedFields: EnrichmentFieldKey[] = [
    "name",
    "title",
    "company",
    "socialLinks",
    "location",
    "shortBio",
    "website",  // ✅ ADD THIS
];

// New enrichment logic:
case "website":
    if (input.company) {
        const query = `"${input.company}" official website`;
        const results = await performSerperSearch(query);
        
        // Extract first non-excluded domain (same logic as smartEnrichmentProvider)
        const website = extractOfficialWebsite(results);
        
        if (website) {
            return {
                field: "website",
                value: website,
                confidence: 0.75,
                source: this.name,
                timestamp: new Date().toISOString(),
                costCents: 1,
            };
        }
    }
    return null;
```

**Benefits:**
- ✅ Already has Serper integration
- ✅ Low cost (1¢)
- ✅ Runs in "free" tier
- ✅ Provides fallback if smartEnrichmentProvider fails

#### 3. **Reduce Excluded Domains Strategically**

Some excluded domains might actually have valid website links:

```typescript
// In smart-enrichment-provider.ts
const excluded = [
    'linkedin.com',    // Keep - always excluded
    'facebook.com',    // Keep - always excluded
    'twitter.com',     // Keep - always excluded
    'instagram.com',   // Keep - always excluded
    'youtube.com',     // Keep - always excluded
    
    // CONSIDER REMOVING these (they sometimes link to official sites):
    // 'wikipedia.org',   // Wikipedia has official website link!
    // 'crunchbase.com',  // Crunchbase has official website!
    
    // Keep directories/aggregators:
    'zoominfo.com',
    'bloomberg.com',
    'forbes.com',
    'yelp.com',
    'glassdoor.com',
    'indeed.com',
    'g2.com',
    'capterra.com',
];
```

**Alternative:** Extract website URLs FROM these pages:
```typescript
// If result is Wikipedia or Crunchbase, scrape the "official website" field
if (domain === 'wikipedia.org' || domain === 'crunchbase.com') {
    const officialWebsite = await scrapeOfficialWebsiteField(result.link);
    if (officialWebsite) {
        return { domain: extractDomain(officialWebsite), url: officialWebsite };
    }
}
```

### 🔧 Medium-term Improvements

#### 4. **Add Website Support to LinkedIn Provider**

LinkedIn company profiles have official website URLs.

```typescript
// In linkedin-provider.ts
protected supportedFields: EnrichmentFieldKey[] = [
    // ... existing fields ...
    "website",  // ✅ ADD THIS
];
```

**Benefits:**
- ✅ High quality data
- ❌ Premium tier (expensive)
- ⚠️ Should only be used as last resort

#### 5. **Multi-Source Verification**

When multiple providers return websites, verify they match:

```typescript
// In enrichment-service-v2.ts
if (field === "website" && probeResults.length > 1) {
    // Extract domains from all results
    const domains = probeResults.map(r => extractDomain(r.value));
    
    // If all agree, high confidence
    if (new Set(domains).size === 1) {
        bestResult.confidence = 0.95;
    }
    // If they disagree, use voting or pick most trusted
    else {
        bestResult = pickMostTrustedWebsite(probeResults);
    }
}
```

### 📊 Long-term Enhancements

#### 6. **Smart Fallback Chain**

Instead of failing, try alternative enrichment strategies:

```typescript
// If website enrichment fails, try:
1. Enrich "company" field first
2. Retry website with better company name
3. Enrich "domain" field (easier than full URL)
4. Convert domain to website (add https://)
5. Verify website is reachable
```

#### 7. **Domain-to-Website Conversion**

```typescript
// If we have domain but not website:
async function convertDomainToWebsite(domain: string): Promise<string | null> {
    // Try both http and https
    const candidates = [`https://${domain}`, `https://www.${domain}`];
    
    for (const url of candidates) {
        const isReachable = await checkUrlReachable(url);
        if (isReachable) {
            return url;
        }
    }
    
    return null;
}
```

## Implementation Priority

### Phase 1: Immediate (< 1 hour)
- [x] Add enhanced logging to smartEnrichmentProvider ✅ DONE
- [ ] Add website support to Wikipedia provider ⭐ HIGH IMPACT
- [ ] Add website support to Serper provider

### Phase 2: Short-term (< 1 day)
- [ ] Implement domain-to-website conversion
- [ ] Add multi-source verification
- [ ] Consider reducing excluded domains list

### Phase 3: Medium-term (< 1 week)
- [ ] Add website support to LinkedIn provider
- [ ] Implement smart fallback chain
- [ ] Add website scraping to extract from Wikipedia/Crunchbase

## Testing Plan

After implementing fixes, test with these scenarios:

### Test Case 1: Well-known Company
```json
{
  "company": "Stripe Inc",
  "industry": "FinTech"
}
```
**Expected:** `https://stripe.com` (high confidence)

### Test Case 2: Generic Name
```json
{
  "company": "ABC Corporation"
}
```
**Expected:** Should try Wikipedia → Serper → LinkedIn chain

### Test Case 3: Only Person Name
```json
{
  "name": "John Smith"
}
```
**Expected:** Should fail gracefully (person != company)

### Test Case 4: Excluded Domains Only
```json
{
  "company": "Small Local Business"
}
```
**Expected:** Should handle gracefully, possibly return null with clear reason

## Metrics to Monitor

After deployment:

```typescript
{
  "websiteEnrichment": {
    "totalAttempts": 1000,
    "successRate": 0.65,  // Target: > 70%
    "providerBreakdown": {
      "wikipedia": { "attempts": 800, "success": 520 },    // 65% success
      "smartEnrichment": { "attempts": 200, "success": 120 }, // 60% success
      "serper": { "attempts": 100, "success": 45 },        // 45% success
      "linkedin": { "attempts": 50, "success": 30 }        // 60% success (premium)
    },
    "avgConfidence": 0.82,
    "avgCostCents": 0.8,  // Should stay low with free providers first
    "cacheHitRate": 0.45
  }
}
```

## Next Steps

1. **Review this analysis** with the team
2. **Implement Phase 1 fixes** (Wikipedia + Serper website support)
3. **Test with real data** (use the test cases above)
4. **Monitor metrics** for 1 week
5. **Iterate** based on results

## Related Files

- [Website Enrichment Troubleshooting Guide](./WEBSITE_ENRICHMENT_TROUBLESHOOTING.md)
- [enrichment-service-v2.ts](../apps/workflows/src/enrichment-service-v2.ts)
- [smart-enrichment-provider.ts](../apps/workflows/src/tools/smart-enrichment/smart-enrichment-provider.ts)
- [wikipedia-provider.ts](../apps/workflows/src/tools/providers/wikipedia-provider.ts)
- [serper-provider.ts](../apps/workflows/src/tools/providers/serper-provider.ts)

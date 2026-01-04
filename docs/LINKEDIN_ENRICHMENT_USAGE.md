# LinkedIn Enrichment Integration - Usage Guide

## Overview

LinkedIn API is integrated as a **premium provider** in the enrichment waterfall pipeline, providing high-quality, authoritative data for profiles and companies.

## Pipeline Position

```
1. Cache Layer (Free, 0¢)           → Check existing data
2. Free Layer (Website, 0¢)         → Scrape target website
3. Cheap Layer (Search, ~1¢)        → Search API queries
4. Premium Layer (LinkedIn, ~10¢)   → LinkedIn API ← NEW!
5. AI Layer (Future, variable)       → AI inference
6. Finalize & Cache                 → Store results
```

## How It Works

### Automatic LinkedIn Detection

The enrichment pipeline automatically detects LinkedIn URLs from:

1. **Direct Input**: `https://www.linkedin.com/in/username`
2. **Scraped Data**: Found `person_linkedin` or `company_linkedin` fields
3. **Search Results**: Discovered LinkedIn URLs in search layer

### Smart Triggering

LinkedIn API is only called when:

✅ LinkedIn URL is detected  
✅ Relevant gaps exist after cheaper layers  
✅ Budget ≥ 10¢  
✅ LinkedIn enrichment is enabled  

## Configuration

### Environment Variables

Add to `apps/api/.env`:

```bash
# Required: Your RapidAPI key
RAPIDAPI_KEY=your_rapidapi_key

# Optional: LinkedIn enrichment settings
LINKEDIN_ENRICHMENT_ENABLED=true          # Enable/disable LinkedIn layer
LINKEDIN_MIN_BUDGET_CENTS=10              # Minimum budget to use LinkedIn
RAPIDAPI_LINKEDIN_HOST=linkedin-data-api.p.rapidapi.com
```

### Get API Key

1. Visit [RapidAPI](https://rapidapi.com)
2. Subscribe to [LinkedIn Data API](https://rapidapi.com/rockapis-rockapis-default/api/linkedin-data-api)
3. Copy your API key from [Dashboard](https://rapidapi.com/developer/dashboard)

## Usage Examples

### Example 1: Enrich LinkedIn Profile

**Request**:
```bash
POST /enrich/job
{
  "url": "https://www.linkedin.com/in/satyanadella",
  "requiredFields": [
    "person_name",
    "person_title",
    "person_location",
    "person_company"
  ],
  "budgetCents": 50
}
```

**Pipeline Flow**:
```
Input: linkedin_profile URL
Budget: 50¢

1. Cache → Miss
2. Free Layer (Website) → Skip (not a website)
3. Cheap Layer (Search) → Partial results
   ✅ company_name: "Microsoft" (confidence: 70)
   
4. Premium Layer (LinkedIn API) → Execute
   Gaps: person_name, person_title, person_location, person_company
   Decision: ✅ Use LinkedIn (can fill 4 gaps)
   
   API Call: getLinkedInProfile(url)
   Cost: 10¢
   
   Results:
   ✅ person_name: "Satya Nadella" (confidence: 95)
   ✅ person_title: "CEO at Microsoft" (confidence: 90)
   ✅ person_location: "Redmond, WA" (confidence: 95)
   ✅ person_company: "Microsoft" (confidence: 90)

5. Final Result:
   All fields filled! ✅
   Total cost: 11¢
   Remaining budget: 39¢
```

### Example 2: Enrich Company Website

**Request**:
```bash
POST /enrich/job
{
  "url": "https://microsoft.com",
  "requiredFields": [
    "company_name",
    "company_description",
    "company_employee_count",
    "company_industry",
    "company_linkedin"
  ],
  "budgetCents": 50
}
```

**Pipeline Flow**:
```
Input: company_website URL
Budget: 50¢

1. Cache → Miss

2. Free Layer (Website Scraping) → Execute
   ✅ company_name: "Microsoft" (confidence: 90)
   ✅ company_description: "..." (confidence: 85)
   
3. Cheap Layer (Search) → Execute
   ✅ company_linkedin: "linkedin.com/company/microsoft" (confidence: 75)
   
4. Premium Layer (LinkedIn API) → Execute
   LinkedIn URL found: "linkedin.com/company/microsoft"
   Gaps: company_employee_count, company_industry
   Decision: ✅ Use LinkedIn (can fill 2 gaps)
   
   API Call: getLinkedInCompany("linkedin.com/company/microsoft")
   Cost: 10¢
   
   Results:
   ✅ company_employee_count: "100,001+" (confidence: 90)
   ✅ company_industry: "Software Development" (confidence: 95)
   ✅ company_linkedin: "..." (confidence: 100) [updated]
   
5. Final Result:
   All fields filled! ✅
   Total cost: 11¢
   Remaining budget: 39¢
```

### Example 3: Budget Too Low

**Request**:
```bash
POST /enrich/job
{
  "url": "https://www.linkedin.com/in/johndoe",
  "requiredFields": ["person_name", "person_title"],
  "budgetCents": 5  // Only 5 cents
}
```

**Pipeline Flow**:
```
Input: linkedin_profile URL
Budget: 5¢

1. Cache → Miss
2. Free Layer → Skip
3. Cheap Layer → Skip (no budget)
4. Premium Layer (LinkedIn API) → Skip
   Decision: ❌ Skip
   Reason: "Insufficient budget (5¢ < 10¢)"

5. Final Result:
   Gaps: person_name, person_title
   Total cost: 0¢
   Status: Partially failed (budget exhausted)
```

## Field Mappings

### LinkedIn Profile → Enrichment Fields

| LinkedIn Field | Enrichment Field | Confidence |
|----------------|------------------|------------|
| `full_name` | `person_name` | 95 |
| `headline` | `person_title` | 90 |
| `location` | `person_location` | 95 |
| `profile_url` | `person_linkedin` | 100 |
| `experience[0].company` | `person_company` | 90 |
| `experience[0].company` | `company_name` | 85 |

### LinkedIn Company → Enrichment Fields

| LinkedIn Field | Enrichment Field | Confidence |
|----------------|------------------|------------|
| `company_name` | `company_name` | 100 |
| `about` | `company_description` | 95 |
| `website` | `company_website` | 100 |
| `location` | `company_hq_location` | 95 |
| `employee_count` | `company_employee_count` | 90 |
| `industry` | `company_industry` | 95 |
| `founded_year` | `company_founded_year` | 90 |
| `company_url` | `company_linkedin` | 100 |

## Cost Management

### Pricing

- Profile enrichment: **10¢** per lookup
- Company enrichment: **10¢** per lookup
- Search (not currently implemented): **10¢** per query

### Budget Allocation Strategy

**Recommended budgets**:
- Single profile/company: **10-20¢**
- With fallbacks: **30-50¢**
- Comprehensive enrichment: **100¢** ($1.00)

**Budget decision logic**:
```typescript
if (remainingBudget < 10¢) {
  skip LinkedIn layer
} else if (gaps.length > 0 && linkedInUrl exists) {
  use LinkedIn API
  deduct 10¢ from budget
}
```

## Caching

### Cache Behavior

LinkedIn data is cached with:
- **TTL**: 7 days for profiles, 14 days for companies
- **Source**: `linkedin_api` (confidence: 95)
- **Key**: Normalized LinkedIn URL

### Cache Hit Benefits

When cache hits:
- **Cost**: 0¢ (free from cache)
- **Speed**: Instant (<10ms)
- **Quality**: Same high confidence (95)

## Error Handling

### Common Errors

| Error | Cause | Handling |
|-------|-------|----------|
| 401 Unauthorized | Invalid API key | Skip layer, log error |
| 404 Not Found | Private/deleted profile | Skip, continue pipeline |
| 429 Rate Limited | Too many requests | Auto-retry with delay |
| 5xx Server Error | API outage | Retry with backoff |

### Graceful Degradation

If LinkedIn API fails:
- ❌ Don't fail entire enrichment
- ✅ Continue to next layer (AI inference)
- ✅ Return partial results
- ✅ Log error for monitoring

## Testing

### Run Examples

```bash
cd apps/api

# Run LinkedIn enrichment examples
bun run src/examples/linkedin-enrichment-examples.ts
```

### Manual Testing

```bash
# Test profile enrichment
curl -X POST http://localhost:3001/enrich/job \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.linkedin.com/in/satyanadella",
    "requiredFields": ["person_name", "person_title"],
    "budgetCents": 50
  }'

# Test company enrichment
curl -X POST http://localhost:3001/enrich/job \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.linkedin.com/company/microsoft",
    "requiredFields": ["company_name", "company_employee_count"],
    "budgetCents": 50
  }'
```

## Monitoring

### Key Metrics

Track these metrics:

```typescript
{
  "linkedin_api_calls": 1234,          // Total API calls
  "linkedin_success_rate": 95.2,       // % successful
  "linkedin_avg_cost": 10,              // Avg cost per call
  "linkedin_fields_filled": 5678,      // Total fields enriched
  "linkedin_cache_hit_rate": 72.3      // % cache hits
}
```

### Pipeline Notes

Check `notes` array in results:

```json
{
  "notes": [
    "Starting enrichment for linkedin_profile: ...",
    "Cache miss",
    "Free layer skipped: LinkedIn profile, not website",
    "LinkedIn layer: Can fill 4 gaps: person_name, person_title, ...",
    "LinkedIn profile: 4 fields, $0.10"
  ]
}
```

## Best Practices

### ✅ DO

- Set reasonable budgets (≥10¢ for LinkedIn)
- Cache aggressively (7-14 day TTL)
- Monitor success rates and costs
- Use budget limits to control spend
- Test with mock data first

### ❌ DON'T

- Set budget <10¢ if you want LinkedIn data
- Disable caching (wastes money)
- Ignore error logs
- Skip LinkedIn for high-value enrichment
- Call API directly without pipeline

## Optimization Tips

1. **Use Batch Processing**: Enqueue multiple jobs
2. **Cache Warm-up**: Pre-populate common profiles
3. **Budget Tuning**: Start low, increase as needed
4. **Field Prioritization**: Request only needed fields
5. **Monitoring**: Track ROI per provider

## Troubleshooting

### LinkedIn layer always skipped

**Possible causes**:
1. No LinkedIn URL detected
2. Budget < 10¢
3. `LINKEDIN_ENRICHMENT_ENABLED=false`
4. No relevant gaps

**Solution**: Check pipeline notes for skip reason

### LinkedIn API returns 401

**Cause**: Invalid `RAPIDAPI_KEY`

**Solution**:
```bash
# Verify your API key
echo $RAPIDAPI_KEY

# Update if needed
echo "RAPIDAPI_KEY=correct_key" >> .env
```

### High costs

**Cause**: Not using cache

**Solution**:
- Don't set `skipCache: true`
- Increase cache TTL
- Check cache hit rate metrics

## Support

- **Integration Issues**: [LINKEDIN_ENRICHMENT_STRATEGY.md](./LINKEDIN_ENRICHMENT_STRATEGY.md)
- **API Reference**: [LINKEDIN_README.md](./LINKEDIN_README.md)
- **General Enrichment**: [ENRICHMENT_MVP_GUIDE.md](../../ENRICHMENT_MVP_GUIDE.md)

---

**Last Updated**: January 2, 2026  
**Status**: Production Ready  
**Version**: 1.0

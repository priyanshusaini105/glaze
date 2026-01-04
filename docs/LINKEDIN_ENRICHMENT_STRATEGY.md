# LinkedIn API Integration Strategy - Enrichment Pipeline

## Overview

Integrate LinkedIn Data API as a **premium provider** in the enrichment waterfall pipeline, positioned between cheap and AI layers for high-quality, reliable LinkedIn data.

## Current Pipeline Architecture

```
Cache Layer (Free, 0¢)
  ↓
Free Layer (Website Scraping, 0¢)
  ↓
Cheap Layer (Search API, ~1¢)
  ↓
[NEW] Premium Layer (LinkedIn API, 10-50¢)  ← Insert here
  ↓
AI Layer (Future, variable cost)
  ↓
Finalize & Cache
```

## Integration Strategy

### 1. LinkedIn as a Premium Provider

**Position**: After search layer, before AI inference
**Why**: LinkedIn provides authoritative, high-quality data worth the premium cost

**Cost Structure**:
- Profile lookup: ~10¢ per request
- Company lookup: ~10¢ per request
- Search: ~10¢ per query

### 2. Smart Triggering Logic

Only use LinkedIn API when:

✅ **High-value fields remain unfilled** after cheaper layers
✅ **LinkedIn URL is detected** in input or data
✅ **Budget is sufficient** for LinkedIn API cost
✅ **Profile/Company fields** are in required fields
✅ **User opts-in** to premium enrichment

### 3. Field Mapping Strategy

#### From LinkedIn Profile → Enrichment Fields

| LinkedIn Field | Enrichment Field | Confidence |
|----------------|------------------|------------|
| `full_name` | `person_name` | 95 |
| `headline` | `person_title` | 90 |
| `location.city`, `location.country` | `person_location` | 95 |
| `profile_url` | `person_linkedin` | 100 |
| `experience[0].company` | `person_company` | 90 |

#### From LinkedIn Company → Enrichment Fields

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

### 4. Waterfall Logic

```typescript
// After cheap layer completes:

1. Analyze remaining gaps
2. Check if LinkedIn URL exists in:
   - Input URL
   - Scraped data (person_linkedin, company_linkedin)
   - Search results

3. If LinkedIn URL found + gaps exist + budget available:
   
   IF inputType === 'linkedin_profile':
     → Use LinkedIn Profile API
     → Extract person fields
     → Extract company fields from experience
   
   IF inputType === 'company_linkedin':
     → Use LinkedIn Company API
     → Extract company fields
   
   IF inputType === 'company_website' AND company_linkedin found:
     → Use LinkedIn Company API
     → Extract company fields

4. Merge results with existing data
5. Deduct cost from budget
6. Continue to next layer if gaps remain
```

### 5. Error Handling & Fallbacks

```typescript
LinkedIn API Call
  ↓
[Try 1] → Success? → Return data
  ↓ Fail
[Retry 2] → Success? → Return data
  ↓ Fail
[Retry 3] → Success? → Return data
  ↓ Fail
Rate Limited? → Wait & retry OR skip to next layer
  ↓
Other Error → Log & skip to next layer
```

**Error Types**:
- **401 Unauthorized**: API key invalid → Skip layer, log error
- **404 Not Found**: Profile private/doesn't exist → Skip, continue
- **429 Rate Limited**: Auto-retry with delay OR skip if budget tight
- **5xx Server Error**: Retry with backoff

### 6. Cost Management

**Budget Decision Tree**:

```
Remaining Budget ≥ 10¢?
  ├─ Yes → Can use LinkedIn API
  │    ├─ Profile needed? → Use getProfile (10¢)
  │    ├─ Company needed? → Use getCompany (10¢)
  │    └─ Both needed? → Use both (20¢) if budget allows
  └─ No → Skip LinkedIn layer
```

**Cost Tracking**:
- Track per-field cost attribution
- Log which provider filled which field
- Calculate ROI (fields filled vs cost)

### 7. Caching Strategy

**LinkedIn Data Caching**:
- Cache profile data for 7 days (LinkedIn changes slowly)
- Cache company data for 14 days (more stable)
- Key: `linkedin:{url}:{timestamp}`
- Include `linkedin_api` as high-confidence source

**Cache Priority**:
```
LinkedIn API (95) > Website Scrape (90) > Search (70) > AI (40)
```

### 8. Configuration

**Environment Variables**:
```bash
# LinkedIn API
RAPIDAPI_KEY=xxx                    # Required
RAPIDAPI_LINKEDIN_HOST=xxx          # Optional

# Enrichment thresholds
LINKEDIN_MIN_BUDGET_CENTS=10        # Don't use if <10¢ budget
LINKEDIN_ENABLE_PROFILE=true        # Enable profile enrichment
LINKEDIN_ENABLE_COMPANY=true        # Enable company enrichment
LINKEDIN_CACHE_TTL_DAYS=7           # Cache duration
```

### 9. Implementation Plan

**Phase 1: Core Integration** (Current)
- [ ] Create LinkedIn enrichment provider
- [ ] Add premium layer to pipeline
- [ ] Implement field mapping
- [ ] Add cost tracking

**Phase 2: Intelligence** (Next)
- [ ] Smart URL detection from previous stages
- [ ] Cost-benefit analysis per field
- [ ] Adaptive budget allocation

**Phase 3: Optimization** (Future)
- [ ] Batch processing for multiple profiles
- [ ] Predictive caching
- [ ] A/B testing different provider orders

### 10. Provider Implementation

```typescript
// LinkedIn as EnrichmentProvider
export const LinkedInProfileProvider: EnrichmentProvider = {
  name: 'LinkedInProfile',
  costCents: 10,
  lookup: (url: string) => 
    // Returns Effect with LinkedIn profile data
    // Mapped to enrichment fields
};

export const LinkedInCompanyProvider: EnrichmentProvider = {
  name: 'LinkedInCompany',
  costCents: 10,
  lookup: (url: string) =>
    // Returns Effect with LinkedIn company data
    // Mapped to enrichment fields
};
```

### 11. Success Metrics

**Track**:
- LinkedIn API success rate
- Average cost per enriched record
- Fields filled per dollar spent
- Cache hit rate for LinkedIn data
- Time saved vs manual enrichment

**Goals**:
- 90%+ success rate for LinkedIn API calls
- <$0.20 average cost per full enrichment
- 80%+ of profile fields filled when LinkedIn URL available
- 70%+ cache hit rate after initial run

### 12. Example Flow

**Scenario**: Enrich `https://www.linkedin.com/in/satyanadella`

```
Input: linkedin_profile URL
Required: person_name, person_title, person_company, company_name

1. Cache Check → Miss
2. Free Layer (Website) → Skip (LinkedIn profile, not website)
3. Cheap Layer (Search) → Partial (company_name from search)
   Result: ✅ company_name, ❌ person_name, ❌ person_title, ❌ person_company
   
4. Premium Layer (LinkedIn API):
   - Detect: inputType = 'linkedin_profile'
   - Budget check: 50¢ available, need 10¢ → ✅ Proceed
   - Call: getLinkedInProfile(url)
   - Response: {
       full_name: "Satya Nadella",
       headline: "CEO at Microsoft",
       experience: [{ company: "Microsoft", title: "CEO" }]
     }
   - Map fields:
     ✅ person_name ← full_name
     ✅ person_title ← headline
     ✅ person_company ← experience[0].company
   - Cost: 10¢
   - Remaining budget: 40¢
   
5. Gap analysis:
   All required fields filled! ✅
   
6. Cache results with 'linkedin_api' source (confidence: 95)
7. Return complete enrichment
```

## Benefits

✅ **High Data Quality**: LinkedIn is authoritative source  
✅ **Better Coverage**: Fills gaps after cheaper methods fail  
✅ **Cost Effective**: Only used when needed and budget allows  
✅ **Fast**: Direct API vs scraping  
✅ **Reliable**: Professional API with SLA  
✅ **Cached**: Subsequent lookups are free  

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| High API cost | Budget limits, smart triggering |
| Rate limits | Auto-retry, request throttling |
| API downtime | Fallback to next layer |
| Private profiles | Graceful handling, skip to next |
| Incorrect mapping | Field validation, confidence scores |

## Next Steps

1. ✅ Review this strategy
2. ⏭️ Implement LinkedIn provider adapters
3. ⏭️ Add premium layer to pipeline
4. ⏭️ Create field mapping utilities
5. ⏭️ Add configuration and testing
6. ⏭️ Monitor and optimize

---

**Status**: Draft  
**Last Updated**: January 2, 2026  
**Owner**: Backend Team

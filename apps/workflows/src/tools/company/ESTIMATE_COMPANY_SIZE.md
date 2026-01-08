# EstimateCompanySize Tool

## Overview

The **EstimateCompanySize** tool estimates company size and hiring status using a **LinkedIn-first strategy**. It uses Serper API to resolve LinkedIn company pages and LLM for text analysis.

## Why LinkedIn-First?

LinkedIn company pages give you, for free:
- ✅ Employee count range
- ✅ Hiring indicator
- ✅ Company name normalization
- ✅ Industry tags

That's 80% of what the tool needs in one reliable source.

## Input/Output

### Input
- `domain` (string): Company domain (e.g., "stripe.com")
- `companyName` (string, optional): Company name for better resolution

### Output
```typescript
{
  employeeCountRange: EmployeeCountRange;  // "1-10", "11-50", "51-200", etc.
  hiringStatus: HiringStatus;              // "actively_hiring", "occasionally_hiring", "not_hiring", "unknown"
  linkedinCompanyUrl: string | null;       // Resolved LinkedIn URL
  companyName: string | null;              // Company name from LinkedIn
  industry: string | null;                 // Industry from LinkedIn
  location: string | null;                 // HQ location from LinkedIn
  confidence: number;                      // 0.0 - 1.0
  source: "linkedin" | "inferred" | "unknown";
  reason?: string;                         // Explanation if low confidence
}
```

### Employee Count Ranges (LinkedIn Standard)
- `1-10`
- `11-50`
- `51-200`
- `201-500`
- `501-1000`
- `1001-5000`
- `5001-10000`
- `10001+`
- `unknown`

### Hiring Status
- `actively_hiring` - Jobs section + recent postings
- `occasionally_hiring` - Jobs section exists but sparse
- `not_hiring` - No jobs section
- `unknown` - Could not determine

## Pipeline

```
Domain Input
    ↓
Step 1: Resolve LinkedIn Company URL
    - Multiple query strategies via Serper
    - Validate URL format
    - Score confidence
    ↓
Step 2: Scrape LinkedIn Data
    - Get snippets from search results
    - Extract structured data via LLM
    ↓
Step 3: Normalize Employee Count
    - Map LinkedIn ranges to standard buckets
    - No interpolation, no guessing
    ↓
Step 4: Determine Hiring Status
    - Based on LinkedIn signals only
    ↓
Step 5: Score Confidence
    - Combined URL + data confidence
    ↓
Output: CompanySizeResult
```

## Step Details

### Step 1: Resolve LinkedIn Company URL

**Query patterns:**
```
site:linkedin.com/company "cal.com"
site:linkedin.com/company "Cal"
"cal.com" LinkedIn company
"Cal" LinkedIn company page
```

**URL Validation:**
- Must be `linkedin.com/company/{slug}`
- Reject: `/school/`, `/showcase/`, `/jobs/`, `/posts/`
- Slug must be reasonable (2-100 chars, not just numbers)

**Confidence threshold:** < 0.6 → abort

### Step 2: Scrape LinkedIn Data

Uses Serper to get snippets about the LinkedIn page, then LLM extracts:
- Company name
- Employee count text
- Industry
- Location
- Hiring indicators

### Step 3: Normalize Employee Count

Direct mapping from LinkedIn text:
```
"11–50 employees" → "11-50"
"51–200 employees" → "51-200"
"1,001-5,000 employees" → "1001-5000"
```

**No math. No interpolation. No creativity.**

### Step 4: Hiring Status Logic

| Signal | Status |
|--------|--------|
| Jobs section + active postings | `actively_hiring` |
| Jobs section exists | `occasionally_hiring` |
| No jobs section | `not_hiring` |
| No data | `unknown` |

### Step 5: Confidence Scoring

```
confidence = (URL_confidence * 0.5) + (data_confidence * 0.5)

If employeeCountRange === "unknown":
    confidence *= 0.7  // Penalty

Clamp to [0.1, 0.95]
```

## Usage

### Direct Usage
```typescript
import { estimateCompanySize } from '@/tools/company/estimate-company-size';

const result = await estimateCompanySize("stripe.com", "Stripe");

console.log(`Size: ${result.employeeCountRange}`);
console.log(`Hiring: ${result.hiringStatus}`);
console.log(`Confidence: ${result.confidence}`);
```

### Integration with Enrichment System
```typescript
import { estimateCompanySizeProvider } from '@/tools';

const result = await estimateCompanySizeProvider.enrich("vercel.com", "Vercel");
```

## Testing

```bash
cd /home/priyanshu/dev/personal/glaze/apps/workflows
tsx src/tools/company/test-estimate-company-size.ts
```

## Tool Characteristics

| Property | Value |
|----------|-------|
| **ID** | `estimate_company_size` |
| **Name** | Estimate Company Size |
| **Cost** | 2¢ (Serper + LLM) |
| **Tier** | cheap |
| **Strategies** | DIRECT_LOOKUP, SEARCH_AND_VALIDATE |
| **Entity Types** | COMPANY |
| **Required Inputs** | domain |
| **Outputs** | companySize, employeeCountRange, hiringStatus |

## Output Fields

This tool produces:
- `companySize` - Employee count range (alias for employeeCountRange)
- `employeeCountRange` - Employee count range
- `hiringStatus` - Hiring status indicator
- `linkedinCompanyUrl` - Resolved LinkedIn URL (bonus)
- `companyNameFromLinkedIn` - Normalized company name (bonus)
- `industryFromLinkedIn` - Industry from LinkedIn (bonus)
- `locationFromLinkedIn` - HQ location (bonus)

## Environment Variables

Required:
```bash
SERPER_API_KEY=your_key    # For LinkedIn resolution
GROQ_API_KEY=your_key      # For LLM extraction
```

## Error Handling

| Scenario | Result |
|----------|--------|
| LinkedIn URL not found | `source: "unknown"`, low confidence |
| URL found, low confidence | Aborts, returns reason |
| Data extraction fails | `source: "inferred"`, partial data |
| LLM error | Returns what we have, lower confidence |

## Why This Design?

**LinkedIn-first, not LinkedIn-only:**
- v1 focuses on the highest-signal source
- Later versions can add: GitHub corroboration, website fallback, source blending

**Honest confidence:**
- If we can't find it reliably, we say so
- No guessing employee counts
- No inferring from website design

**Minimal, safe output:**
- Only return what we can verify
- Use standardized ranges
- Clear "unknown" values

## Future Improvements

- [ ] GitHub org size corroboration
- [ ] Website "About" page fallback
- [ ] Crunchbase integration
- [ ] Source blending with weights
- [ ] Caching LinkedIn resolutions

## Files

```
apps/workflows/src/tools/company/
├── estimate-company-size.ts           # Main implementation
├── test-estimate-company-size.ts      # Test script
└── ESTIMATE_COMPANY_SIZE.md           # This documentation
```

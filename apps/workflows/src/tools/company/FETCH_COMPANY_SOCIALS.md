# FetchCompanySocials Tool

## Overview

The **FetchCompanySocials** tool is a deterministic extraction tool that finds verified official social links from a company's website. It uses pure extraction + validation logic with NO guessing.

## What This Tool Does

**Goal:** Given a websiteUrl, return verified official social links of the company.

**NOT Allowed:**
- ❌ Guess handles
- ❌ Search "company twitter" blindly
- ❌ Return founder personal accounts
- ❌ Return unofficial fan pages
- ❌ Return fiction

**If not found → return null, not fiction.**

## Input/Output

### Input
- `websiteUrl` (string): Company website URL (e.g., "linear.app", "https://stripe.com")
- `companyName` (string, optional): Company name for validation

### Output
```typescript
{
  socials: {
    twitter: SocialLink | null,
    linkedin: SocialLink | null,
    github: SocialLink | null,
    facebook: SocialLink | null,
    instagram: SocialLink | null,
  },
  pagesChecked: string[],      // Which paths were crawled
  linksFound: number,          // Raw links extracted
  linksValidated: number,      // Links that passed validation
}

interface SocialLink {
  url: string;          // "https://twitter.com/linear"
  handle?: string;      // "linear"
  confidence: number;   // 0.0 - 1.0
  source: string;       // "/about" (which page it was found on)
}
```

## How It Works

### Step 1: Crawl Trusted Pages Only

We don't crawl the whole site. That's slow and noisy.

**Fixed allowlist:**
```
/
/about
/about-us
/company
/contact
/contact-us
```

Also includes `<footer>` and `<header>` HTML specifically.

**Why?** Because companies put official socials there by convention.

### Step 2: Extract Outbound Links (Deterministic)

Parse all `<a href="">` links.

Filter immediately by known social domains:
```
twitter.com / x.com
linkedin.com
github.com
facebook.com
instagram.com
```

Ignore everything else.

### Step 3: Normalize Links (Remove Garbage)

**Twitter/X - Accept only:**
```
twitter.com/{handle}
x.com/{handle}
```
**Reject:** /intent, /share, /hashtag, /status

**LinkedIn - Accept only:**
```
linkedin.com/company/{slug}
```
**Reject:** /in/ (personal), /school/, /groups/, /jobs/

**GitHub - Accept only:**
```
github.com/{org}
```
**Reject:** /blob/, /tree/, /issues/, /pull/ (repo pages)

### Step 4: Ownership Validation (Critical)

This is where most tools fail. We validate each link:

**Validation rules per platform:**

| Platform | Validation |
|----------|------------|
| Twitter | Handle matches company name OR domain |
| LinkedIn | Must be /company/ (not /in/), slug matches company |
| GitHub | Org name matches company/domain |

**Bonus signals:**
- Found in footer (+0.1 confidence)
- Found on homepage (+0.05 confidence)

**If validation fails → drop it. No retries. No guessing.**

### Step 5: De-duplication and Conflict Resolution

Sometimes you find multiple candidates:
```
twitter.com/company
twitter.com/companyHQ
```

**Rules:**
- Prefer handle matching company name
- Prefer one linked from homepage footer
- If top two candidates are too close in confidence (< 0.1 difference) → **return none** (ambiguous)

### Step 6: Output Schema (Strict)

```json
{
  "twitter": {
    "url": "https://twitter.com/linear",
    "handle": "linear",
    "confidence": 0.92
  },
  "linkedin": {
    "url": "https://linkedin.com/company/linear",
    "confidence": 0.98
  },
  "github": {
    "url": "https://github.com/linear",
    "confidence": 0.90
  }
}
```

If not found: `twitter: null` — **not empty strings, not fake handles.**

## Why This Tool is Deterministic

**LLMs are bad at:**
- Distinguishing company vs founder
- Knowing official vs unofficial
- Saying "I don't know"

**This tool is pure extraction + validation.**

LLM involvement: **ZERO**

Only deterministic operations:
- HTML parsing
- Regex matching
- String similarity
- Confidence scoring

## Confidence Scoring

| Signal | Points |
|--------|--------|
| Base (found on official site) | 0.50 |
| Handle matches company exactly | +0.25-0.35 |
| Handle partially matches | +0.10-0.20 |
| Is company page (LinkedIn) | +0.20 |
| Found in footer | +0.10 |
| Found on homepage | +0.05 |

**Minimum required:** 0.60 confidence to return a link
**Maximum possible:** 0.98 (capped)

## Common Mistakes Avoided

| Mistake | Our Solution |
|---------|--------------|
| Returning founder Twitter as company | Only accept handles matching company name |
| Guessing GitHub org names | Only extract from actual website links |
| Scraping random blogs | Only crawl trusted paths |
| Trusting search results blindly | No search - pure extraction |

## Usage

### Direct Usage
```typescript
import { fetchCompanySocials } from '@/tools/company/fetch-company-socials';

const result = await fetchCompanySocials("linear.app", "Linear");

if (result.socials.twitter) {
  console.log(`Twitter: @${result.socials.twitter.handle}`);
  console.log(`Confidence: ${result.socials.twitter.confidence}`);
}
```

### Integration with Enrichment System
```typescript
import { fetchCompanySocialsProvider } from '@/tools';

const result = await fetchCompanySocialsProvider.enrich("stripe.com", "Stripe");
```

## Testing

Run the test script:
```bash
cd /home/priyanshu/dev/personal/glaze/apps/workflows
tsx src/tools/company/test-fetch-company-socials.ts
```

## Tool Characteristics

| Property | Value |
|----------|-------|
| Cost | Free (0¢) |
| Tier | free |
| Can Fail | Yes (gracefully returns nulls) |
| Cacheable | Yes ✓ |
| Safe to Run Early | Yes ✓ |
| Triggers Other Tools | No |
| External Retries | No |
| LLM Required | No |

## Output Fields

This tool produces:
- `socialLinks` - Array of all verified social URLs
- `twitter` - Twitter/X URL
- `linkedin` - LinkedIn company URL
- `github` - GitHub org URL
- `facebook` - Facebook page URL (if found)
- `instagram` - Instagram URL (if found)

## Integration in Workflow

This tool:
- ✅ Never triggers other tools
- ✅ Never retries externally
- ✅ Is cacheable
- ✅ Is safe to run early

It's a low-risk, high-signal enrichment step that should run early in any company enrichment workflow.

## Files

```
apps/workflows/src/tools/company/
├── fetch-company-socials.ts           # Main implementation
├── test-fetch-company-socials.ts      # Test script
└── FETCH_COMPANY_SOCIALS.md           # This documentation
```

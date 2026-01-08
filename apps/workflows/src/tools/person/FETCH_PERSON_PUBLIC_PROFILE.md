# FetchPersonPublicProfile Tool

## Overview

The **FetchPersonPublicProfile** tool fetches a short public bio and social links for a **verified person identity**. It uses snippet-first extraction and only falls back to page scraping when needed.

## Purpose (Very Clear)

This tool **never decides who the person is**. It only **decorates** an already resolved person with:
- Short professional bio
- Social links (Twitter, GitHub, personal website)

If identity confidence is low → skip this tool.

## Input/Output

### Input
- `name` (string): Person's verified name
- `company` (string): Person's verified company
- `linkedinUrl` (string, optional): LinkedIn anchor URL

### Output
```typescript
{
  bio: string | null;                    // Max 300 chars
  socialLinks: {
    twitter?: string;
    github?: string;
    personalWebsite?: string;
  };
  source: "snippets" | "snippets+scrape" | "not_found";
  scrapedUrl?: string;                   // If scraping was needed
}
```

## Pipeline

```
RULE 0: LinkedIn is NEVER scraped
    ↓
STEP 1: Google Discovery (always)
    - Multiple targeted searches
    - "name" "company"
    - "name" twitter
    - "name" github
    - Collect top 5-8 results per query
    ↓
STEP 2: Snippet-first Extraction (primary path)
    - Send only titles + snippets to LLM
    - Extract bio and social links
    - No scraping yet
    ↓
STEP 3: Check Usefulness
    - Bio found OR at least 1 social link?
    - YES → STOP, return result
    - NO → Continue to fallback
    ↓
STEP 4: Fallback Page Selection (rare)
    - Filter out: LinkedIn, aggregators, spam
    - Prefer: personal sites, team pages, GitHub
    - LLM selects ONE page
    ↓
STEP 5: Scrape Single Page
    - Fetch only that page
    - Visible text only
    - No crawling
    ↓
STEP 6: LLM Extraction
    - Extract bio and social links
    - Only explicitly stated info
    ↓
STEP 7: Output Cleanup
    - Bio ≤ 300 chars
    - Validate social URLs
    - Deduplicate
    ↓
Output: FetchPersonPublicProfileResult
```

## Why Snippet-First Works

Google snippets often contain exactly what we need:

```
Example snippet: "Pieter Levels (@levelsio) is the founder of 
Nomad List and Remote OK. Based in Portugal."

→ bio: "Founder of Nomad List and Remote OK. Based in Portugal."
→ twitter: "https://twitter.com/levelsio"
```

**This is free enrichment with no scraping needed.**

## What This Tool Can Get Wrong

- Bio wording slightly off
- Bio outdated
- Missing social links

## What It Must NEVER Do

- ❌ Attribute achievements not stated
- ❌ Link wrong social accounts
- ❌ Guess handles
- ❌ Override identity fields
- ❌ Scrape LinkedIn

## Usage

### Direct Usage
```typescript
import { fetchPersonPublicProfile } from '@/tools/person/fetch-person-public-profile';

// After identity resolution
const profile = await fetchPersonPublicProfile(
    "Pieter Levels",
    "Nomad List",
    "https://linkedin.com/in/pieterlevel"  // optional
);

console.log(profile.bio);
// "Founder of Nomad List and Remote OK. Based in Portugal."

console.log(profile.socialLinks.twitter);
// "https://twitter.com/levelsio"
```

### Integration with Pipeline
```typescript
// Step 1: Resolve identity
const identity = await resolvePersonFromNameCompany(name, company);

// Step 2: Only if identity is confident
if (identity.confidence >= 0.6 && identity.resolutionStatus === "anchored") {
    // Step 3: Fetch public profile
    const profile = await fetchPersonPublicProfile(
        identity.name,
        identity.company,
        identity.linkedinUrl
    );
}
```

## Tool Specification

| Property | Value |
|----------|-------|
| **ID** | `fetch_person_public_profile` |
| **Name** | Fetch Person Public Profile |
| **Cost** | 2¢ (Serper + LLM) |
| **Tier** | cheap |
| **Strategies** | DIRECT_LOOKUP, SEARCH_AND_VALIDATE |
| **Entity Types** | PERSON |
| **Required Inputs** | name, company |
| **Optional Inputs** | linkedinUrl |
| **Outputs** | bio, twitter, github, personalWebsite |

## Blocked Domains (Never Scraped)

- LinkedIn
- Facebook, Instagram, TikTok
- Profile aggregators (ZoomInfo, Apollo, RocketReach, etc.)
- Search engines

## Preferred Domains (For Fallback)

- github.com
- twitter.com / x.com
- medium.com
- substack.com
- dev.to
- indiehackers.com
- Company team pages (/team, /about, /people)

## Testing

```bash
cd /home/priyanshu/dev/personal/glaze/apps/workflows
tsx src/tools/person/test-fetch-person-public-profile.ts
```

## Environment Variables

```bash
SERPER_API_KEY=your_key    # Required for Google discovery
GROQ_API_KEY=your_key      # Required for LLM extraction
```

## Valid Output Examples

### Success (from snippets)
```typescript
{
  bio: "Founder and CEO at Lemlist, focused on email outreach and growth marketing.",
  socialLinks: {
    twitter: "https://twitter.com/guillaumem"
  },
  source: "snippets"
}
```

### Success (with fallback scrape)
```typescript
{
  bio: "Senior Engineer at Stripe, working on payment infrastructure.",
  socialLinks: {
    github: "https://github.com/johndoe",
    personalWebsite: "https://johndoe.dev"
  },
  source: "snippets+scrape",
  scrapedUrl: "https://johndoe.dev/about"
}
```

### Not Found
```typescript
{
  bio: null,
  socialLinks: {},
  source: "not_found"
}
```

## Files

```
apps/workflows/src/tools/person/
├── fetch-person-public-profile.ts           # Main implementation
├── test-fetch-person-public-profile.ts      # Test script
└── FETCH_PERSON_PUBLIC_PROFILE.md           # This documentation
```

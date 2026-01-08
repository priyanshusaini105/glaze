# ResolvePersonFromLinkedIn Tool (MVP v0)

## Overview

The **ResolvePersonFromLinkedIn** tool resolves person profiles using a **snippet-first strategy**. It uses Google search snippets as the primary data source and only falls back to page scraping when needed. **LinkedIn is never scraped directly.**

## Core Philosophy

```
"Use Google search results as the primary source of information. First extract name, 
title, company, and location directly from titles and snippets only. If fewer than 
three fields can be confidently extracted, select the best non-LinkedIn result that 
looks authoritative, scrape that single page, and extract only explicitly stated 
information to fill missing fields. Do not scrape LinkedIn, do not infer missing 
values, and return partial results with an honest confidence score."
```

## Why This Works

Google snippets are **pre-validated summaries**. They often contain exactly what we need:

```
Example snippet: "Guillaume Moubeche, Founder & CEO at Lemlist, Paris, France"
→ name: "Guillaume Moubeche"
→ title: "Founder & CEO"
→ company: "Lemlist"
→ location: "Paris, France"
```

That's **free enrichment** with no scraping needed.

## Input/Output

### Input
Either:
- `linkedinUrl` (string): LinkedIn profile URL
OR
- `name` (string): Person's full name
- `company` (string, optional): Current company

### Output
```typescript
{
  name: string | null;
  title: string | null;
  company: string | null;
  location: string | null;
  linkedinUrl: string | null;
  confidence: number;            // 0.0 - 1.0
  source: "snippets" | "snippets+scrape" | "failed";
  fieldsFromSnippets: string[];  // Which fields came from snippets
  fieldsFromScrape: string[];    // Which fields came from scraping
}
```

## Pipeline

```
Input (linkedinUrl OR name+company)
    ↓
STEP 1: Google Search (mandatory)
    - Build query based on inputs
    - Collect top 5-10 results
    ↓
STEP 2: Snippet-based Extraction FIRST
    - Send only titles + snippets to LLM
    - Extract: name, title, company, location
    ↓
STEP 3: Check Completeness Threshold
    - Count filled fields
    - ≥3 fields? → DONE, go to confidence scoring
    - <3 fields? → Continue to fallback
    ↓
STEP 4: Select Best Non-LinkedIn Page (fallback)
    - Filter out LinkedIn and aggregators
    - Prefer: personal sites, team pages, GitHub
    - LLM selects best option
    ↓
STEP 5: Scrape Single Page
    - Fetch visible text only
    - No crawling
    - Limit to 8k chars
    ↓
STEP 6: Extract from Page Content
    - LLM extraction
    - Fill only missing fields
    - Never overwrite snippet data
    ↓
STEP 7: Confidence Scoring
    - Based on filled fields
    - Capped based on source
    ↓
Output: PersonProfile
```

## Detailed Steps

### Step 1: Google Search

**Query patterns:**
- If `linkedinUrl`: `site:linkedin.com/in "<slug>"`
- If `name + company`: `"<name>" "<company>" LinkedIn`
- If just `name`: `"<name>" LinkedIn profile`

### Step 2: Snippet Extraction

The **key insight**: Google already summarizes LinkedIn bios in snippets.

LLM instruction:
```
Extract as much information as possible only from the titles and snippets.
Do not use outside knowledge.
If a field is not clearly stated, return null.
```

### Step 3: Completeness Threshold

```
filledFields = count(non-null fields)

If filledFields >= 3 → STOP, go to confidence scoring
If filledFields < 3  → fallback to scraping
```

This keeps it **fast** - most extractions complete here.

### Step 4: Page Selection

**Blocked domains:**
- linkedin.com (never scrape)
- Profile aggregators (zoominfo, apollo, rocketreach, etc.)
- SEO listicles (forbes, businessinsider)

**Preferred domains:**
- Personal websites
- Company team pages
- github.com
- indiehackers.com
- producthunt.com
- Medium/Substack

### Step 5: Scraping

Simple rules:
- Single page only
- No crawling
- Visible text only
- 8k char limit

### Step 6: Page Extraction

```
Extract only explicitly stated information from this page.
Do not infer or guess missing fields.
Return null if unclear.
```

**Important:** Only fill missing fields. Never overwrite snippet-derived data.

### Step 7: Confidence Scoring

| Field | Points |
|-------|--------|
| name | +0.30 |
| title | +0.25 |
| company | +0.25 |
| location | +0.20 |

**Caps:**
- Snippets only → max 0.75
- Snippets + scrape → max 0.80
- Never exceed 0.80 (no direct LinkedIn scraping)

## Usage

### Direct Usage
```typescript
import { resolvePersonFromLinkedIn } from '@/tools/person/resolve-person-from-linkedin';

// With LinkedIn URL
const result1 = await resolvePersonFromLinkedIn({
    linkedinUrl: "https://linkedin.com/in/guillaumemoubeche"
});

// With name + company
const result2 = await resolvePersonFromLinkedIn({
    name: "Karri Saarinen",
    company: "Linear"
});
```

### Integration with Enrichment System
```typescript
import { resolvePersonFromLinkedInProvider } from '@/tools';

const result = await resolvePersonFromLinkedInProvider.enrich({
    name: "Pieter Levels",
    company: "Nomad List"
});
```

## Testing

```bash
cd /home/priyanshu/dev/personal/glaze/apps/workflows
tsx src/tools/person/test-resolve-person-from-linkedin.ts
```

## Tool Characteristics

| Property | Value |
|----------|-------|
| **ID** | `resolve_person_from_linkedin` |
| **Name** | Resolve Person From LinkedIn |
| **Cost** | 2¢ (Serper + LLM) |
| **Tier** | cheap |
| **Strategies** | DIRECT_LOOKUP, SEARCH_AND_VALIDATE |
| **Entity Types** | PERSON |
| **Required Inputs** | (none - but needs linkedinUrl or name) |
| **Optional Inputs** | linkedinUrl, name, company |
| **Outputs** | name, title, company, location, linkedinUrl |

## Environment Variables

```bash
SERPER_API_KEY=your_key    # Required for Google search
GROQ_API_KEY=your_key      # Required for LLM extraction
```

## Why This Strategy is Good

| Aspect | Benefit |
|--------|---------|
| Google snippets | Pre-validated summaries |
| Speed | Faster than scraping |
| Success rate | Much higher |
| Scraping | Rare, controlled, useful |
| LinkedIn | Respected (never scraped) |
| LLM work | Lightweight extraction only |

**80% value with 20% effort.**

## Error Cases

| Scenario | Behavior |
|----------|----------|
| No search results | Return with confidence: 0.1 |
| Snippet extraction fails | Try scraping fallback |
| No suitable pages | Return partial with low confidence |
| Page scrape fails | Return snippet data only |
| All fails | Return input data with confidence: 0 |

## Quality Indicators

- `confidence < 0.35`: Low quality, use with caution
- `confidence >= 0.5`: Acceptable quality
- `confidence >= 0.7`: Good quality
- `source: "snippets"`: Fast path, snippets were sufficient
- `source: "snippets+scrape"`: Needed fallback

## Files

```
apps/workflows/src/tools/person/
├── resolve-person-from-linkedin.ts           # Main implementation
├── test-resolve-person-from-linkedin.ts      # Test script
└── RESOLVE_PERSON_FROM_LINKEDIN.md           # This documentation
```

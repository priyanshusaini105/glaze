# Person Resolution Pipeline

## Overview

The person resolution pipeline uses **LinkedIn as the primary identity anchor**. This is a clean two-phase approach:

1. **FindLinkedInProfile** - Pure identity resolution
2. **ResolvePersonFromLinkedIn** - Extract profile data using the anchor

## Mental Model

```
name + company → find LinkedIn → treat LinkedIn as identity anchor → enrichment
```

LinkedIn is the **PRIMARY IDENTITY RESOLVER**, not just another data source.

## Two-Phase Pipeline

### Phase 1: Find LinkedIn Profile

**Tool:** `FindLinkedInProfile`

**Input:**
- name (required)
- company (required)

**Output:**
- linkedinUrl | null
- confidence

This tool does NOT extract person info. It only answers:
> "Which LinkedIn profile, if any, matches this person?"

### Phase 2: Extract Profile Data

**Tool:** `ResolvePersonFromLinkedIn`

**Input:**
- linkedinUrl (from Phase 1)

**Output:**
- name, title, company, location
- confidence

Uses snippet-first strategy - never scrapes LinkedIn directly.

## Complete Pipeline

**Tool:** `ResolvePersonFromNameCompany`

This orchestrates both phases:

```
ResolvePersonFromNameCompany
  → FindLinkedInProfile
    → if linkedinUrl found:
         ResolvePersonFromLinkedIn
    → else:
         return ambiguous / partial
```

## FindLinkedInProfile Details

### Step 1: Google Search
```
"<name>" "<company>" site:linkedin.com/in
```

Collect top 5 results with title, snippet, and URL.

### Step 2: LLM Selection

Prompt:
```
From the following search results, choose the LinkedIn profile URL 
that most likely belongs to the person with the given name and company.
Do not guess.
If none look reliable, return null.
```

LLM is **excellent** at this task.

### Step 3: Confidence Scoring

| Signal | Points |
|--------|--------|
| Exact name match | +0.4 |
| Company in snippet | +0.3 |
| Title present | +0.2 |
| First position | +0.1 |

**Threshold:** confidence < 0.5 → treat as not found

## Ambiguity Handling

The pipeline simplifies ambiguity:

| Scenario | Result |
|----------|--------|
| One strong LinkedIn | Ambiguity collapses ✓ |
| Multiple weak LinkedIns | Low confidence |
| None found | Ambiguity stays high |

You don't need a separate ambiguity engine at v0.

## Usage

### Direct Usage

```typescript
// Step 1: Find LinkedIn (identity anchor)
import { findLinkedInProfile } from '@/tools/person/find-linkedin-profile';

const linkedin = await findLinkedInProfile("Karri Saarinen", "Linear");
// { linkedinUrl: "https://linkedin.com/in/karrisaarinen", confidence: 0.85 }

// Step 2: Extract profile (using anchor)
import { resolvePersonFromLinkedIn } from '@/tools/person/resolve-person-from-linkedin';

const profile = await resolvePersonFromLinkedIn({
    linkedinUrl: linkedin.linkedinUrl,
});
// { name: "Karri Saarinen", title: "CEO & Co-founder", company: "Linear", ... }
```

### Combined Pipeline

```typescript
import { resolvePersonFromNameCompany } from '@/tools/person/resolve-person-from-name-company';

const result = await resolvePersonFromNameCompany("Karri Saarinen", "Linear");
// {
//   name: "Karri Saarinen",
//   title: "CEO & Co-founder",
//   company: "Linear",
//   location: "San Francisco",
//   linkedinUrl: "https://linkedin.com/in/karrisaarinen",
//   confidence: 0.82,
//   linkedinAnchored: true,
//   resolutionStatus: "anchored"
// }
```

## Tool Specifications

### FindLinkedInProfile

| Property | Value |
|----------|-------|
| **ID** | `find_linkedin_profile` |
| **Cost** | 1¢ |
| **Tier** | cheap |
| **Required Inputs** | name, company |
| **Outputs** | linkedinUrl |
| **Priority** | 1 (run first) |

### ResolvePersonFromLinkedIn

| Property | Value |
|----------|-------|
| **ID** | `resolve_person_from_linkedin` |
| **Cost** | 2¢ |
| **Tier** | cheap |
| **Optional Inputs** | linkedinUrl, name, company |
| **Outputs** | name, title, company, location, linkedinUrl |
| **Priority** | 2 |

### ResolvePersonFromNameCompany

| Property | Value |
|----------|-------|
| **ID** | `resolve_person_from_name_company` |
| **Cost** | 3¢ (combined) |
| **Tier** | cheap |
| **Required Inputs** | name |
| **Optional Inputs** | company, domain |
| **Outputs** | name, title, company, location, linkedinUrl |
| **Priority** | 2 |

## Output Schema

### FindLinkedInProfile Result

```typescript
{
  linkedinUrl: string | null;
  confidence: number;            // 0.0 - 1.0
  candidatesFound: number;       // How many LinkedIn profiles were found
  matchReason: string | null;    // Why this profile was selected
}
```

### ResolvePersonFromNameCompany Result

```typescript
{
  name: string | null;
  title: string | null;
  company: string | null;
  location: string | null;
  linkedinUrl: string | null;
  confidence: number;
  source: "snippets" | "snippets+scrape" | "failed";
  fieldsFromSnippets: string[];
  fieldsFromScrape: string[];
  linkedinAnchored: boolean;           // Was LinkedIn used as anchor?
  linkedinResolutionConfidence: number; // FindLinkedInProfile confidence
  resolutionStatus: "anchored" | "ambiguous" | "not_found";
}
```

## Resolution Status

| Status | Meaning |
|--------|---------|
| `anchored` | LinkedIn found, used as identity anchor |
| `ambiguous` | LinkedIn candidates found but no strong match |
| `not_found` | No LinkedIn profiles found |

## Testing

```bash
cd /home/priyanshu/dev/personal/glaze/apps/workflows
tsx src/tools/person/test-person-pipeline.ts
```

## The Philosophy

```
"Given a person's name and company, first search Google to find the most 
likely LinkedIn profile for that person and select the best matching URL. 
Use this LinkedIn URL as the identity anchor. Then extract name, title, 
company, and location primarily from Google titles and snippets, and only 
if insufficient, scrape a single non-LinkedIn authoritative page to fill 
missing fields. Do not scrape LinkedIn directly, do not infer missing data, 
and return partial results with a confidence score."
```

## Files

```
apps/workflows/src/tools/person/
├── find-linkedin-profile.ts              # Identity resolution
├── resolve-person-from-linkedin.ts       # Profile extraction
├── resolve-person-from-name-company.ts   # Combined pipeline
├── test-person-pipeline.ts               # Test script
└── PERSON_PIPELINE.md                    # This documentation
```

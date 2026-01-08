# GenericWebSearch Tool (Ultimate Fallback)

## Overview

The **GenericWebSearch** tool is the **ultimate fallback** when no specialized tool is available for a task. It searches Google via Serper and uses LLM to extract the answer.

## When to Use

- Fields with no dedicated tool
- Unusual queries
- Last resort when all else fails
- Fallback when specialized tools return no results

## How It Works

```
Input: targetField + context
    ↓
1. Build search query from context
   - Uses field mapping for better queries
   - Combines name/domain/company
    ↓
2. Serper search (Google)
   - Get organic results + knowledge graph
    ↓
3. LLM extraction
   - Extracts target field value
   - Conservative confidence scoring
    ↓
4. Confidence threshold (0.5)
   - Below threshold → return null
   - Above threshold → return value
    ↓
Output: value + confidence + metadata
```

## Input/Output

### Input
- `targetField` (string): The field to find (e.g., "industry", "founded", "twitter")
- `context` (object): Known data about the entity
- `customQuery` (string, optional): Override auto-generated query

### Output
```typescript
{
  value: string | null;        // Extracted value, or null if not found/low confidence
  confidence: number;          // 0.0 - 1.0
  source: "web_search" | "not_found";
  searchQuery: string;         // The query that was used
  snippetsUsed: number;        // How many search results were analyzed
  reason?: string;             // Explanation
}
```

## Confidence Scoring

| Range | Meaning |
|-------|---------|
| 0.9-1.0 | Explicitly stated in multiple sources |
| 0.7-0.9 | Clearly stated in one reliable source |
| 0.5-0.7 | Mentioned but needs interpretation |
| 0.3-0.5 | Weak signal, uncertain (REJECTED) |
| 0.0-0.3 | Not found or unreliable (REJECTED) |

**Threshold:** Results with confidence < 0.5 return `null`

## Field Mapping

The tool automatically maps field names to better search queries:

| Field | Search Query |
|-------|--------------|
| `bio` | "biography about" |
| `twitter` | "twitter" |
| `github` | "github" |
| `founded` | "founded year" |
| `industry` | "industry" |
| `location` | "location headquarters" |
| `employeeCount` | "employee count" |
| `funding` | "funding raised" |

## Usage

### Direct Usage
```typescript
import { genericWebSearch } from '@/tools/generic/generic-web-search';

const result = await genericWebSearch("founded", {
    company: "Stripe",
    domain: "stripe.com"
});

console.log(result.value);      // "2010"
console.log(result.confidence); // 0.85
```

### As Fallback in Workflow
```typescript
// If no specialized tool exists for the field
const fallbackResult = await genericWebSearch(targetField, existingData);

if (fallbackResult.value && fallbackResult.confidence >= 0.5) {
    return fallbackResult.value;
}
```

## Tool Specification

| Property | Value |
|----------|-------|
| **ID** | `generic_web_search` |
| **Name** | Generic Web Search (Fallback) |
| **Cost** | 2¢ (Serper + LLM) |
| **Tier** | cheap |
| **Priority** | 999 (always last) |
| **Entity Types** | PERSON, COMPANY, UNKNOWN |
| **Required Inputs** | (none) |
| **Optional Inputs** | name, company, domain, linkedinUrl, email |

## RULES

1. **Only return results with confidence ≥ 0.5**
2. **Never hallucinate** - only extract from search results
3. **Be honest about uncertainty**
4. **Prefer returning null over guessing**
5. **Use knowledge graph when available**

## Environment Variables

```bash
SERPER_API_KEY=your_key    # Required for Google search
GROQ_API_KEY=your_key      # Required for LLM extraction
```

## Testing

```bash
cd /home/priyanshu/dev/personal/glaze/apps/workflows
tsx src/tools/generic/test-generic-web-search.ts
```

## Examples

### Company Funding
```typescript
const result = await genericWebSearch("funding", { company: "OpenAI" });
// { value: "$11.3 billion", confidence: 0.82, source: "web_search" }
```

### Person Location
```typescript
const result = await genericWebSearch("location", { 
    name: "Pieter Levels", 
    company: "Nomad List" 
});
// { value: "Portugal", confidence: 0.75, source: "web_search" }
```

### Low Confidence (Rejected)
```typescript
const result = await genericWebSearch("revenue", { company: "SmallStartup" });
// { value: null, confidence: 0.35, source: "not_found", 
//   reason: "Confidence too low: 35% < 50% threshold" }
```

## Files

```
apps/workflows/src/tools/generic/
├── generic-web-search.ts           # Main implementation
├── test-generic-web-search.ts      # Test script
└── GENERIC_WEB_SEARCH.md           # This documentation
```

# Enrichment System Implementation Guide

> **Last Updated:** January 7, 2026  
> **Status:** Implementation Complete - Ready for Testing

This document provides complete context for the Glaze enrichment system. Use this as a reference when continuing development or debugging issues.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Provider System](#provider-system)
4. [Test Cases](#test-cases)
5. [File Structure](#file-structure)
6. [Quick Start](#quick-start)
7. [API Keys Setup](#api-keys-setup)
8. [Running Tests](#running-tests)
9. [Troubleshooting](#troubleshooting)
10. [Next Steps](#next-steps)

---

## Overview

The enrichment system takes minimal input (LinkedIn URL, Name+Company, or Domain) and enriches it with additional data like email, title, location, company info, etc.

### Two Enrichment Systems

| System | File | Purpose | Complexity |
|--------|------|---------|------------|
| **Simple Enrichment** | `simple-enrichment.ts` | Testing with free/cheap APIs | Low |
| **Agentic Enrichment** | `agentic-enrichment.ts` | Production with AI planning | High |

**Current Focus:** Simple Enrichment for cost-effective testing.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Test Input                              │
│  { linkedinUrl?, name?, company?, domain?, email? }         │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                  Identity Resolver                          │
│  Normalizes input, extracts domain, resolves canonical name │
└─────────────────────────┬───────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
┌─────────────────┬───────────────┬───────────────────────────┐
│  FREE Providers │ CHEAP Providers│ PREMIUM Providers        │
│                 │                │ (if usePremium: true)    │
│  • GitHub       │ • Serper      │ • LinkedIn RapidAPI      │
│  • Wikipedia    │ • Prospeo     │                          │
│  • OpenCorporates│ • Email Infer│                          │
│  • CompanyScraper│              │                          │
└─────────────────┴───────────────┴───────────────────────────┘
          │               │               │
          └───────────────┼───────────────┘
                          ▼
┌─────────────────────────────────────────────────────────────┐
│               Confidence Aggregator                         │
│  Combines results from multiple sources, picks best value   │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                  Enrichment Result                          │
│  { results, costs, timing, errors }                         │
└─────────────────────────────────────────────────────────────┘
```

---

## Provider System

### Cost Tiers

| Rating | Description | Providers |
|--------|-------------|-----------|
| **0x** | Free/unlimited | GitHub (5000/hr), Wikipedia, OpenCorporates, CompanyScraper |
| **0.5x** | Generous free tier | Groq (LLM) |
| **1x** | Good free tier | Serper (2500/mo) |
| **1.5x** | Moderate free tier | Prospeo (75/mo) |
| **2x** | Limited free tier | Hunter (50/mo) |
| **3x** | Paid only | LinkedIn RapidAPI (~$0.02-0.05/call) |

### Provider Details

#### FREE Providers (0x)

| Provider | File | What It Enriches | Rate Limit |
|----------|------|------------------|------------|
| **GitHub** | `github-provider.ts` | name, email, location, socialLinks | 5000/hr (with token) |
| **Wikipedia** | `wikipedia-provider.ts` | name, company, shortBio, industry | Unlimited |
| **OpenCorporates** | `opencorporates-provider.ts` | company, location, foundedDate | Generous |
| **CompanyScraper** | `company-scraper.ts` | companySummary, techStack | Fetch-based |

#### CHEAP Providers (1x-1.5x)

| Provider | File | What It Enriches | Rate Limit |
|----------|------|------------------|------------|
| **Serper** | `serper-provider.ts` | Multiple via SERP | 2500/mo free |
| **Prospeo** | `prospeo-provider.ts` | email (verified) | 75/mo free |
| **EmailInference** | `email-pattern-inference.ts` | emailCandidates | Pattern-based |

#### PREMIUM Providers (3x)

| Provider | File | What It Enriches | Cost |
|----------|------|------------------|------|
| **LinkedIn** | `linkedin-provider.ts` | All person fields | ~$0.02-0.05/call |

---

## Test Cases

The system is designed to handle these test scenarios:

### LinkedIn URL Enrichment
```typescript
{ linkedinUrl: "https://www.linkedin.com/in/guillaumemoubeche/" }
→ Expected: name, email, title, company, location
```

### Name + Company Enrichment
```typescript
{ name: "Patrick Collison", company: "Stripe" }
→ Expected: email, title, location, socialLinks
```

### Domain Enrichment
```typescript
{ domain: "cal.com" }
→ Expected: company, industry, employeeCount, techStack, funding
```

### Edge Cases
```typescript
{ name: "John Smith", company: "Google" }
→ Should return low confidence or request more identifiers

{ domain: "notarealcompany12345.com" }
→ Should return empty or error gracefully
```

---

## File Structure

```
apps/workflows/src/
├── tasks/
│   ├── simple-enrichment-task.ts   # Trigger.dev tasks for simple enrichment
│   └── agentic-enrichment.ts       # Full agentic enrichment task
│
├── tools/
│   ├── simple-enrichment.ts        # Simple enrichment orchestrator
│   ├── identity-resolver.ts        # Resolves canonical identity
│   ├── confidence-aggregator.ts    # Aggregates multi-source results
│   ├── email-pattern-inference.ts  # Pattern-based email generation
│   │
│   └── providers/
│       ├── index.ts                # Provider registry
│       ├── interfaces.ts           # BaseProvider class
│       │
│       │ # FREE (0x)
│       ├── github-provider.ts
│       ├── wikipedia-provider.ts
│       ├── opencorporates-provider.ts
│       ├── company-scraper.ts
│       │
│       │ # CHEAP (1x-1.5x)
│       ├── serper-provider.ts
│       ├── prospeo-provider.ts
│       │
│       │ # PREMIUM (3x)
│       └── linkedin-provider.ts
│
├── scripts/
│   └── test-enrichment.ts          # CLI test script
│
└── types/
    └── enrichment.ts               # Type definitions
```

---

## Quick Start

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Configure Environment
```bash
cp .env.example .env.local
# Edit .env.local with your API keys
```

### 3. Run Tests
```bash
# CLI test script
npx tsx apps/workflows/src/scripts/test-enrichment.ts

# Or via Trigger.dev (requires deployment)
pnpm --filter workflows dev
# Then trigger "run-standard-tests" from dashboard
```

---

## API Keys Setup

### Minimum Required (for basic testing)
```bash
# No keys needed! GitHub, Wikipedia, OpenCorporates work without keys
```

### Recommended Setup
```bash
# Higher rate limits for GitHub
GITHUB_TOKEN=ghp_xxxxxxxxxxxxx

# Google Search for finding info
SERPER_API_KEY=xxxxxxxxxxxxx
```

### Full Setup
```bash
# LLM for synthesis
GROQ_API_KEY=gsk_xxxxxxxxxxxxx

# Email finding
PROSPEO_API_KEY=xxxxxxxxxxxxx

# Premium (optional - costs money)
RAPIDAPI_KEY=xxxxxxxxxxxxx
```

See `.env.example` for the complete list.

---

## Running Tests

### Option 1: CLI Script
```bash
npx tsx apps/workflows/src/scripts/test-enrichment.ts
```

Output:
```
🧪 Starting Enrichment Tests

Using FREE providers: GitHub, Wikipedia, OpenCorporates
Using CHEAP providers: Serper (if SERPER_API_KEY is set)
Premium providers: DISABLED (set usePremium: true to enable)

============================================================

📊 DETAILED RESULTS

✅ PASS Test 1
Input: {"linkedinUrl":"https://www.linkedin.com/in/guillaumemoubeche/"}
Expected: name, email, title, company, location
Found: name, title, company
Missing: email, location
Cost: 0¢
```

### Option 2: Trigger.dev Dashboard
1. Start the dev server: `pnpm --filter workflows dev`
2. Go to Trigger.dev dashboard
3. Find "run-standard-tests" task
4. Click "Run"

### Option 3: Programmatic
```typescript
import { runEnrichment } from "./tools/simple-enrichment";

const result = await runEnrichment(
    { name: "Elon Musk", company: "Tesla" },
    ["email", "title", "location"],
    { usePremium: false, maxCostCents: 10 }
);

console.log(result);
```

---

## Troubleshooting

### Common Issues

#### "No results returned"
- Check if the input is valid (real person/company)
- Try with a different input format
- Check for API rate limits

#### "GitHub rate limit exceeded"
- Set `GITHUB_TOKEN` for 5000 req/hr instead of 60 req/hr

#### "Cannot find module @repo/types"
- Run `pnpm install` at root
- Check that packages/types exists

#### TypeScript errors in providers
- Ensure `EnrichmentFieldKey` includes all fields
- Check [enrichment.ts](apps/workflows/src/types/enrichment.ts) for type definitions

#### Prisma JSON type errors
- Use `as any` for complex JSON data going to Prisma
- See [cell-enrichment.ts](apps/workflows/src/cell-enrichment.ts) for examples

### Debug Mode
```typescript
// Enable verbose logging
import { logger } from "@trigger.dev/sdk";

// Check provider results
for (const result of allResults) {
    console.log(`${result.source}:${result.field} = ${result.value} (${result.confidence})`);
}
```

---

## Next Steps

### Immediate Tasks
1. [ ] Run test script and verify providers work
2. [ ] Add `SERPER_API_KEY` for better search results
3. [ ] Test with real LinkedIn URLs (requires premium)

### Short-term Improvements
1. [ ] Add caching layer (Redis) to avoid duplicate API calls
2. [ ] Implement email verification (Prospeo verify endpoint)
3. [ ] Add more free data sources (Crunchbase scraping, etc.)

### Long-term Roadmap
1. [ ] Enable agentic enrichment with LLM planning
2. [ ] Add webhook callbacks for async enrichment
3. [ ] Build enrichment pipeline for bulk processing

---

## Key Types

```typescript
// Input format
interface TestInput {
    linkedinUrl?: string;
    name?: string;
    company?: string;
    domain?: string;
    email?: string;
}

// Field types
type EnrichmentFieldKey =
    | "name" | "company" | "email" | "emailCandidates"
    | "title" | "shortBio" | "socialLinks" | "companySize"
    | "location" | "companySummary" | "whois" | "techStack"
    | "funding" | "foundedDate" | "industry" | "linkedinUrl" | "domain";

// Provider result
interface ProviderResult {
    field: EnrichmentFieldKey;
    value: string | number | string[] | null;
    confidence: number; // 0-1
    source: string;
    costCents?: number;
    timestamp: string;
}

// Final result
interface EnrichmentResult {
    input: TestInput;
    results: Record<string, { value: unknown; confidence: number; source: string }>;
    costs: { totalCents: number; breakdown: Record<string, number> };
    timing: { durationMs: number };
    errors: string[];
}
```

---

## Related Documentation

- [ENV_AGENTIC_ENRICHMENT.md](./ENV_AGENTIC_ENRICHMENT.md) - Environment variables by cost tier
- [ARCHITECTURE.md](../ARCHITECTURE.md) - Overall system architecture
- [apps/workflows/README.md](../apps/workflows/README.md) - Workflows package details

---

## Changelog

### January 7, 2026
- Created simple enrichment system with free/cheap providers
- Added Wikipedia, OpenCorporates, Prospeo providers
- Created test script and Trigger.dev tasks
- Fixed TypeScript errors in agentic-enrichment.ts
- Created comprehensive documentation


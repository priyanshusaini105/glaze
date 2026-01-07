# Company Name Resolver

## What This Tool Does

**DNS-like resolution for company names.**

Given a company name string (e.g., "Stripe"), this tool answers exactly **one question**:

> "What real-world company entity does this most likely refer to?"

That's it. Nothing more.

## What This Tool Returns

```typescript
{
  canonicalCompanyName: "Stripe",
  websiteUrl: "https://stripe.com",
  domain: "stripe.com",
  confidence: 0.95,
  confidenceLevel: "HIGH"
}
```

### Output Fields

| Field | Purpose |
|-------|---------|
| `canonicalCompanyName` | Normalizes aliases (e.g., "Stripe Inc", "Stripe Payments" → "Stripe") |
| `websiteUrl` | Strongest public anchor. Everything else keys off this. |
| `domain` | Needed for email patterns, tech detection, company URL tools |
| `confidence` | Numeric score (0.0-1.0) telling downstream tools how brave they're allowed to be |
| `confidenceLevel` | Decision bucket: HIGH, MEDIUM, LOW, FAIL |

## What This Tool Does NOT Do

❌ No enrichment  
❌ No tech stack  
❌ No funding  
❌ No employees  
❌ No guessing  
❌ No LLM "deciding" identity  
❌ No returning something just to look helpful  

**If this tool lies once, users stop trusting everything.**

## How It Works (Step-by-Step)

### Step 1: Normalize Input Name

Clean the string before searching:

```
"Stripe, Inc." → "stripe"
"Linear LLC" → "linear"
"ABC Technologies Pvt. Ltd." → "abc technologies"
```

Removes:
- Legal suffixes (Inc, LLC, Ltd, Corp, etc.)
- Special characters
- Extra whitespace

### Step 2: Generate Search Queries

Very specific questions, not generic "who is X":

```typescript
[
  "Stripe official website",
  "Stripe company",
  "Stripe about us"
]
```

Looking for **company-owned pages**, not mentions.

### Step 3: Candidate Extraction (Fan-Out)

From search results, collect **multiple candidates**:

```typescript
{
  domain: "stripe.com",
  websiteUrl: "https://stripe.com",
  title: "Stripe | Payment Processing Platform",
  snippet: "Stripe is a financial infrastructure...",
  searchPosition: 1,
  querySource: "Stripe official website"
}
```

You may get multiple:
- stripe.com ✓
- stripepayments.co (junk)
- stripe-finance.net (junk)

**Do NOT choose yet.**

### Step 4: Candidate Validation

Each candidate is scored using **hard rules**, not vibes.

### Step 5: Disambiguation Logic

Some names collide (e.g., "Linear"):

Candidates:
- linear.app (issue tracking SaaS)
- linearfitness.com (gym equipment)
- linear.co (consulting)

Disambiguation signals:
- Search position
- Title match strength
- Snippet quality

### Step 6: Confidence Scoring

**This is where the magic happens.**

Confidence is NOT "probability of correctness."  
Confidence is: **"How safe downstream enrichment is."**

## Confidence Scoring Model

### Signals (Add Points)

| Signal | Weight | What It Checks |
|--------|--------|----------------|
| **A: Official Website Match** | +0.40 | Title/snippet contains company name |
| **B: Search Intent Alignment** | +0.25 | Found via "official" style query |
| **C: Domain Quality** | +0.15 | HTTPS, high search position |
| **D: External Corroboration** | +0.10 | Platform mentions in snippet (weak) |
| **E: Name Uniqueness** | +0.10 | Rare/specific company name |

**Note:** External corroboration is weighted low (0.10) because snippet mentions are not real corroboration—SEO blogs mention "LinkedIn" all the time. Real corroboration would require actual link verification (future improvement).

### Penalties (Subtract Points)

| Penalty | Weight | What It Checks |
|---------|--------|----------------|
| **P1: Multiple Strong Candidates** | -0.20 | ≥2 candidates within 10% of each other |
| **P2: Generic Name** | -0.15 | "Global Solutions", "Tech Services", etc. |
| **P3: Weak Homepage Signals** | -0.10 | Parked domain, thin content, "for sale" |

### Final Calculation

```
confidence = 
  signalA + signalB + signalC + signalD + signalE 
  - penaltyP1 - penaltyP2 - penaltyP3
```

Clamped between 0.0 and 1.0.  
**Never exceeds 0.95** (conservative cap).

### Confidence Buckets

| Numeric Range | Level | Downstream Action |
|---------------|-------|-------------------|
| ≥ 0.85 | **HIGH** | Safe to enrich fully |
| 0.65-0.84 | **MEDIUM** | Public data only |
| 0.40-0.64 | **LOW** | Return cautiously |
| < 0.40 | **FAIL** | Do not enrich |

## Example Dry Runs

### Example 1: "Stripe"

**Input:** `"Stripe"`

**Process:**
1. Normalize → `"stripe"`
2. Search → 3 queries
3. Candidates → `stripe.com`, `stripe-payments.co`, ...
4. Score `stripe.com`:
   - Official match: +0.40 ✓
   - Search intent: +0.25 ✓
   - Domain quality: +0.15 ✓
   - External: +0.10 ✓
   - Uniqueness: +0.10 ✓
   - **Subtotal: 1.00**
   - Penalties: 0
   - **Final: 0.95** (single candidate, no penalties)

**Output:**
```typescript
{
  canonicalCompanyName: "Stripe",
  websiteUrl: "https://stripe.com",
  domain: "stripe.com",
  confidence: 0.95,
  confidenceLevel: "HIGH"
}
```

### Example 2: "Linear"

**Input:** `"Linear"`

**Process:**
1. Normalize → `"linear"`
2. Search → 3 queries
3. Candidates → `linear.app`, `linearfitness.com`, ...
4. Score `linear.app`:
   - Official match: +0.40 ✓
   - Search intent: +0.25 ✓
   - Domain quality: +0.15 ✓
   - External: +0.10 ✓
   - Uniqueness: +0.05 (shorter word)
   - **Subtotal: 0.95**
   - Multiple candidates penalty: -0.20
   - **Final: 0.75**

**Output:**
```typescript
{
  canonicalCompanyName: "Linear",
  websiteUrl: "https://linear.app",
  domain: "linear.app",
  confidence: 0.75,
  confidenceLevel: "MEDIUM"
}
```

**Correctly cautious** due to ambiguity.

### Example 3: "ABC Technologies"

**Input:** `"ABC Technologies"`

**Process:**
1. Normalize → `"abc technologies"`
2. Search → 3 queries
3. Candidates → many junk results
4. Score best candidate:
   - Official match: +0.15 (weak)
   - Search intent: +0.10
   - Domain quality: +0.10
   - External: 0
   - Uniqueness: 0
   - **Subtotal: 0.35**
   - Generic name penalty: -0.15
   - **Final: 0.20**

**Output:**
```typescript
{
  canonicalCompanyName: null,
  websiteUrl: null,
  domain: null,
  confidence: 0.20,
  confidenceLevel: "FAIL",
  reason: "Low confidence due to generic name"
}
```

**Correct behavior. No lying.**

## Why This Works

✅ **Deterministic** - Same input = same output  
✅ **Explainable** - Can log: "Confidence dropped due to multiple strong candidates"  
✅ **Testable** - Unit tests for each signal  
✅ **No hallucination** - Hard rules only  
✅ **No ML infra** - Pure TypeScript  
✅ **Conservative** - Says "not sure" when uncertain  

## Usage

```typescript
import { resolveCompanyIdentityFromName } from './resolve-company-identity-from-name';

const result = await resolveCompanyIdentityFromName("Stripe");

if (result.confidenceLevel === "HIGH") {
  // Safe to proceed with enrichment
  await enrichCompany(result.domain);
} else if (result.confidenceLevel === "MEDIUM") {
  // Use public data only
  await lightEnrichment(result.domain);
} else {
  // Don't enrich
  console.log("Insufficient confidence");
}
```

## Testing

Run the test suite:

```bash
npx tsx src/tools/company/test-company-name-resolver.ts
```

## Configuration

Set your Serper API key:

```bash
export SERPER_API_KEY="your_key_here"
```

Get a free key at [serper.dev](https://serper.dev) (2500 searches/month free).

## Philosophy

> **Most enrichment tools fake confidence. Users feel it immediately.**
> 
> **A conservative system that says "not sure" wins long-term.**

If you do only ONE thing right in enrichment, do this tool right.

Everything else is just decoration.

---

This is **core infrastructure**, not a feature.

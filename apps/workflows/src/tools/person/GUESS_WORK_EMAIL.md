# GuessWorkEmail Tool

## Overview

The **GuessWorkEmail** tool finds professional email addresses using a **Hunter → Prospeo waterfall strategy**. It uses real API responses from reliable providers, never guesses or hallucinates emails.

## Providers

### Hunter.io (Primary)
- 50 free lookups/month
- Returns email + confidence score (0-100)
- Built-in verification status
- High accuracy

### Prospeo (Fallback)
- ~75 free credits/month
- Returns email + optional verification
- Good coverage

## Input/Output

### Input
- `name` (string): Person's full name (e.g., "John Doe")
- `companyDomain` (string): Company domain (e.g., "stripe.com")

### Output
```typescript
{
  email: string | null;
  confidence: number;            // 0.0 - 1.0 (normalized)
  source: "hunter" | "prospeo" | "pattern_inference" | "not_found";
  verificationStatus: "valid" | "invalid" | "catch_all" | "unknown";
  hunterScore?: number;          // Original Hunter score (0-100)
  firstName?: string;
  lastName?: string;
  sources?: string[];            // URLs where email was found
  reason?: string;               // Explanation if failed
}
```

## Waterfall Strategy

```
                    GuessWorkEmail
                         │
                         ▼
        ┌─────────────────────────────────┐
        │  STEP 1: Try Hunter.io          │
        │                                 │
        │  GET /v2/email-finder           │
        │  ?first_name=John               │
        │  &last_name=Doe                 │
        │  &domain=stripe.com             │
        └─────────────────────────────────┘
                         │
           ┌─────────────┴─────────────┐
           ▼                           ▼
    Score ≥ 60                    Score < 60
    ✅ Return                     or not found
                                       │
                                       ▼
        ┌─────────────────────────────────┐
        │  STEP 2: Try Prospeo            │
        │                                 │
        │  POST /email-finder             │
        │  { fullName, companyDomain }    │
        └─────────────────────────────────┘
                         │
           ┌─────────────┴─────────────┐
           ▼                           ▼
    Email found                   Not found
         │                             │
         ▼                             ▼
    STEP 3: Verify               Return null
    with Prospeo                  with reason
         │
         ▼
    ✅ Return
```

## Confidence Normalization

### Hunter.io
```typescript
// Base: score / 100
confidence = hunterScore / 100;

// Adjust for verification status
if (status === "valid") confidence += 0.1;
if (status === "accept_all") confidence = min(0.7, confidence);  // Catch-all
if (status === "invalid") confidence = 0.1;
```

### Prospeo
```typescript
// Base: 0.5 (boolean found)
confidence = 0.5;

// Boost from verification
if (verified === "valid") confidence += 0.35;
if (verified === "catch_all") confidence += 0.15;
if (verified === "invalid") confidence = 0.1;

// Penalties
if (disposable) confidence -= 0.3;
if (free_email) confidence -= 0.2;
```

## Usage

### Direct Usage
```typescript
import { guessWorkEmail } from '@/tools/person/guess-work-email';

const result = await guessWorkEmail("Patrick Collison", "stripe.com");

console.log(result.email);       // "patrick@stripe.com"
console.log(result.confidence);  // 0.85
console.log(result.source);      // "hunter"
```

### Integration with Enrichment System
```typescript
import { guessWorkEmailProvider } from '@/tools';

const result = await guessWorkEmailProvider.enrich("John Doe", "example.com");
```

## Tool Specification

| Property | Value |
|----------|-------|
| **ID** | `guess_work_email` |
| **Name** | Guess Work Email |
| **Cost** | 1¢ (API credits) |
| **Tier** | cheap |
| **Strategies** | DIRECT_LOOKUP, SEARCH_AND_VALIDATE |
| **Entity Types** | PERSON |
| **Required Inputs** | name, domain |
| **Optional Inputs** | company |
| **Outputs** | email |

## Environment Variables

```bash
# Required (at least one)
HUNTER_API_KEY=your_hunter_key      # From hunter.io
PROSPEO_API_KEY=your_prospeo_key    # From prospeo.io
```

## API Endpoints Used

### Hunter.io
```
GET https://api.hunter.io/v2/email-finder
  ?first_name=John
  &last_name=Doe
  &domain=stripe.com
  &api_key=YOUR_API_KEY
```

### Prospeo
```
POST https://api.prospeo.io/email-finder
Headers:
  Authorization: Bearer YOUR_API_KEY
Body:
  { "fullName": "John Doe", "companyDomain": "stripe.com" }
```

### Prospeo Verification
```
POST https://api.prospeo.io/email-verifier
Headers:
  Authorization: Bearer YOUR_API_KEY
Body:
  { "email": "john@stripe.com" }
```

## Testing

```bash
cd /home/priyanshu/dev/personal/glaze/apps/workflows
tsx src/tools/person/test-guess-work-email.ts
```

## Verification Status Meanings

| Status | Meaning |
|--------|---------|
| `valid` | Email exists and is deliverable |
| `invalid` | Email does not exist |
| `catch_all` | Domain accepts all emails (less reliable) |
| `unknown` | Could not verify |

## Rate Limits

- **Hunter.io**: 50 lookups/month (free tier), rate limits per minute
- **Prospeo**: ~75 credits/month (free tier)

## Best Practices

1. **Cache results** - Email discovery doesn't change daily
2. **Respect rate limits** - Add delays between requests
3. **Log failures** - For tuning later
4. **Use confidence thresholds** - Don't trust low-confidence results

## Future Improvements

- [ ] LinkedIn handle-based lookup (Hunter supports this)
- [ ] Domain search fallback (find any email at domain)
- [ ] Pattern inference fallback (first.last@domain.com)
- [ ] More providers (Snov.io, FindThatLead)
- [ ] Result caching

## Files

```
apps/workflows/src/tools/person/
├── guess-work-email.ts              # Main implementation
├── test-guess-work-email.ts         # Test script
└── GUESS_WORK_EMAIL.md              # This documentation
```

t t# Company Resolver Tool

## Overview

The `resolveCompanyFromDomain` tool resolves company information from a domain name. It provides canonical company data including the company name, canonical domain, and website URL.

## Function Signature

```typescript
async function resolveCompanyFromDomain(
    domain: string
): Promise<CompanyResolutionResult>
```

## Input

- **domain** (string): The domain to resolve. Can be in various formats:
  - Plain domain: `example.com`
  - With subdomain: `www.example.com`
  - Full URL: `https://example.com`
  - URL with path: `https://example.com/about`

## Output

Returns a `CompanyResolutionResult` object with the following properties:

```typescript
interface CompanyResolutionResult {
    companyName: string | null;      // Company name (scraped or generated)
    canonicalDomain: string | null;  // Normalized root domain
    websiteUrl: string | null;       // Full HTTPS URL
    status: "valid" | "not_found";   // Resolution status
}
```

### Status Values

- **valid**: Domain is valid and company information was resolved
- **not_found**: Domain is invalid, a free email domain, or unreachable

## Features

### 1. Domain Normalization
- Removes subdomains (www, mail, etc.)
- Extracts root domain
- Handles various input formats

### 2. Company Name Resolution
The tool attempts to find the company name in this order:

1. **Web Scraping**: Fetches the company website and extracts name from:
   - `og:site_name` meta tag
   - `application-name` meta tag
   - `twitter:site` meta tag
   - Page title

2. **Fallback Generation**: If scraping fails, generates a name from the domain:
   - `stripe.com` → "Stripe"
   - `my-company.com` → "My Company"

### 3. Free Email Domain Detection
Automatically rejects free email providers:
- gmail.com
- yahoo.com
- hotmail.com
- outlook.com
- etc.

## Usage Examples

### Basic Usage

```typescript
import { resolveCompanyFromDomain } from "./tools/company/company-resolver";

const result = await resolveCompanyFromDomain("stripe.com");
console.log(result);
// {
//   companyName: "Stripe",
//   canonicalDomain: "stripe.com",
//   websiteUrl: "https://stripe.com",
//   status: "valid"
// }
```

### With Various Input Formats

```typescript
// Plain domain
await resolveCompanyFromDomain("github.com");

// With subdomain
await resolveCompanyFromDomain("www.shopify.com");

// Full URL
await resolveCompanyFromDomain("https://vercel.com");

// URL with path
await resolveCompanyFromDomain("https://openai.com/about");
```

### Error Handling

```typescript
const result = await resolveCompanyFromDomain("invalid-domain");

if (result.status === "not_found") {
    console.log("Company not found");
} else {
    console.log(`Found: ${result.companyName}`);
}
```

### Free Email Detection

```typescript
const result = await resolveCompanyFromDomain("gmail.com");
// {
//   companyName: null,
//   canonicalDomain: null,
//   websiteUrl: null,
//   status: "not_found"
// }
```

## Integration with Workflows

### In Trigger.dev Tasks

```typescript
import { task } from "@trigger.dev/sdk/v3";
import { resolveCompanyFromDomain } from "./tools/company/company-resolver";

export const enrichCompanyTask = task({
    id: "enrich-company",
    run: async (payload: { domain: string }) => {
        const companyInfo = await resolveCompanyFromDomain(payload.domain);
        
        if (companyInfo.status === "valid") {
            // Store company information
            await db.company.upsert({
                where: { domain: companyInfo.canonicalDomain },
                update: {
                    name: companyInfo.companyName,
                    websiteUrl: companyInfo.websiteUrl,
                },
                create: {
                    domain: companyInfo.canonicalDomain,
                    name: companyInfo.companyName,
                    websiteUrl: companyInfo.websiteUrl,
                },
            });
        }
        
        return companyInfo;
    },
});
```

### Batch Processing

```typescript
import { resolveCompanyFromDomain } from "./tools/company/company-resolver";

async function batchResolveCompanies(domains: string[]) {
    const results = await Promise.all(
        domains.map(domain => resolveCompanyFromDomain(domain))
    );
    
    const valid = results.filter(r => r.status === "valid");
    const notFound = results.filter(r => r.status === "not_found");
    
    console.log(`Resolved: ${valid.length}/${domains.length}`);
    
    return { valid, notFound };
}

// Usage
const { valid, notFound } = await batchResolveCompanies([
    "stripe.com",
    "github.com",
    "gmail.com",
]);
```

## Testing

Run the test script:

```bash
cd apps/workflows
pnpm tsx src/scripts/test-company-resolver.ts
```

## Error Handling

The tool handles various error scenarios gracefully:

1. **Invalid domains**: Returns `not_found` status
2. **Network errors**: Returns `not_found` status
3. **Timeout**: 10-second timeout per domain
4. **Non-HTML content**: Skips scraping, generates name from domain
5. **Free email domains**: Returns `not_found` status

## Performance Considerations

- **Timeout**: Each domain resolution has a 10-second timeout
- **Caching**: Consider implementing caching for frequently queried domains
- **Rate Limiting**: Be mindful of rate limits when scraping websites
- **Parallel Processing**: Safe to run in parallel for batch operations

## Dependencies

- `@trigger.dev/sdk` - For logging
- `./domain-normalizer` - For domain normalization utilities

## Related Tools

- [domain-normalizer.ts](../src/tools/domain-normalizer.ts) - Domain normalization utilities
- [company-scraper.ts](../src/tools/providers/company-scraper.ts) - Advanced company data scraping
- [company-summarizer.ts](../src/tools/company/company-summarizer.ts) - LLM-based company summarization

## Future Enhancements

Potential improvements:

1. **Caching**: Add Redis/in-memory caching for resolved domains
2. **Enrichment APIs**: Integrate with Clearbit, FullContact, etc.
3. **Logo Extraction**: Extract company logos from websites
4. **Industry Detection**: Infer company industry from website content
5. **Social Links**: Extract social media profiles
6. **Confidence Scores**: Add confidence scores based on data sources

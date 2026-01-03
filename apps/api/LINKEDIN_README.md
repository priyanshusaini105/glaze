# LinkedIn API Integration - Effect TS

> LinkedIn data enrichment service using Effect TS and RapidAPI

## Overview

This integration provides LinkedIn profile and company data enrichment through RapidAPI's LinkedIn Data API. It's built with Effect TS for robust error handling, automatic retries, and composable effects.

## Features

✅ **LinkedIn Profile Data** - Get comprehensive profile information  
✅ **Company Data** - Retrieve company details and metrics  
✅ **People Search** - Search for profiles by keywords, location, company  
✅ **Job Search** - Find LinkedIn job postings  
✅ **Automatic Retries** - Built-in retry logic with exponential backoff  
✅ **Rate Limit Handling** - Automatic rate limit detection and retry  
✅ **Type Safety** - Full TypeScript types and Effect schemas  
✅ **REST API Endpoints** - Ready-to-use HTTP endpoints  

## Quick Start

### 1. Setup Environment Variables

Add to `apps/api/.env`:

```bash
RAPIDAPI_KEY=your_rapidapi_key_here
```

Get your API key from [RapidAPI Dashboard](https://rapidapi.com/developer/dashboard) after subscribing to [LinkedIn Data API](https://rapidapi.com/rockapis-rockapis-default/api/linkedin-data-api).

### 2. Test the Integration

```bash
cd apps/api
bun run src/examples/linkedin-api-examples.ts
```

### 3. Use via REST API

Start the server:

```bash
bun run dev
```

Access endpoints at `http://localhost:3001/linkedin/*`

## API Endpoints

### Get Profile Data

```bash
GET /linkedin/profile?url=https://www.linkedin.com/in/williamhgates
```

**Response**:
```json
{
  "success": true,
  "data": {
    "full_name": "Bill Gates",
    "headline": "Co-chair, Bill & Melinda Gates Foundation",
    "location": {
      "country": "United States",
      "city": "Seattle"
    },
    "experience": [...],
    "skills": [...],
    "education": [...]
  },
  "timestamp": "2026-01-01T00:00:00.000Z"
}
```

### Get Company Data

```bash
GET /linkedin/company?url=https://www.linkedin.com/company/microsoft
```

**Response**:
```json
{
  "success": true,
  "data": {
    "company_name": "Microsoft",
    "about": "...",
    "employee_count": "100,001+",
    "industry": "Software Development",
    "location": "Redmond, Washington",
    "website": "https://www.microsoft.com"
  },
  "timestamp": "2026-01-01T00:00:00.000Z"
}
```

### Search People

```bash
GET /linkedin/search/people?keywords=Software+Engineer&location=San+Francisco&limit=10
```

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "name": "John Doe",
      "headline": "Senior Software Engineer at Google",
      "location": "San Francisco, CA",
      "profile_url": "https://www.linkedin.com/in/johndoe"
    }
  ],
  "count": 10,
  "timestamp": "2026-01-01T00:00:00.000Z"
}
```

### Search Jobs

```bash
GET /linkedin/search/jobs?keywords=TypeScript+Developer&location=Remote&limit=10
```

### Batch Enrichment

```bash
POST /linkedin/enrich
Content-Type: application/json

{
  "type": "profile",
  "urls": [
    "https://www.linkedin.com/in/williamhgates",
    "https://www.linkedin.com/in/satyanadella"
  ],
  "fields": ["full_name", "headline", "location"]
}
```

## TypeScript Usage

### Basic Usage

```typescript
import { Effect } from 'effect';
import {
  LinkedInAPIServiceLive,
  getLinkedInProfile,
} from './services/effect-linkedin';

// Get a profile
const program = getLinkedInProfile('https://www.linkedin.com/in/williamhgates');

// Run the effect
const result = await Effect.runPromise(
  Effect.provide(program, LinkedInAPIServiceLive)
);

console.log(result);
```

### With Error Handling

```typescript
import { Effect } from 'effect';
import { getLinkedInProfile, LinkedInAPIServiceLive } from './services/effect-linkedin';

const program = Effect.gen(function* (_) {
  const profile = yield* _(
    getLinkedInProfile('https://www.linkedin.com/in/williamhgates'),
    Effect.catchAll((error) =>
      Effect.gen(function* (_) {
        console.error('Failed to fetch profile:', error);
        // Return fallback data
        return {
          full_name: 'Unknown',
          headline: 'Profile not found',
          location: { country: '', city: '' },
          experience: [],
          skills: [],
          education: [],
          profile_url: '',
        };
      })
    )
  );

  return profile;
});

const result = await Effect.runPromise(
  Effect.provide(program, LinkedInAPIServiceLive)
);
```

### Batch Processing

```typescript
import { Effect } from 'effect';
import { getLinkedInProfile, LinkedInAPIServiceLive } from './services/effect-linkedin';

const profileUrls = [
  'https://www.linkedin.com/in/williamhgates',
  'https://www.linkedin.com/in/satyanadella',
  'https://www.linkedin.com/in/jeffweiner08',
];

const program = Effect.forEach(
  profileUrls,
  (url) => getLinkedInProfile(url),
  { concurrency: 1 } // Sequential to respect rate limits
);

const profiles = await Effect.runPromise(
  Effect.provide(program, LinkedInAPIServiceLive)
);
```

### With Timeout

```typescript
import { Effect } from 'effect';
import { getLinkedInProfile, LinkedInAPIServiceLive } from './services/effect-linkedin';

const program = Effect.gen(function* (_) {
  const profile = yield* _(
    getLinkedInProfile('https://www.linkedin.com/in/williamhgates'),
    Effect.timeout('10 seconds')
  );

  return profile;
});

const result = await Effect.runPromise(
  Effect.provide(program, LinkedInAPIServiceLive)
);
```

## Service Interface

The `LinkedInAPIService` provides four main methods:

```typescript
interface LinkedInAPIService {
  getProfile(request: ProfileRequest): Effect<LinkedInProfile, LinkedInAPIError>;
  getCompany(request: CompanyRequest): Effect<LinkedInCompany, LinkedInAPIError>;
  searchPeople(request: SearchPeopleRequest): Effect<LinkedInSearchResult[], LinkedInAPIError>;
  searchJobs(request: SearchJobsRequest): Effect<LinkedInJobResult[], LinkedInAPIError>;
}
```

## Error Types

```typescript
// API request failed
class LinkedInAPIError {
  statusCode: number;
  message: string;
  endpoint: string;
  cause?: unknown;
}

// Configuration missing
class LinkedInConfigError {
  message: string;
}

// Rate limit exceeded
class LinkedInRateLimitError {
  retryAfter?: number; // seconds
}

// Invalid request
class LinkedInValidationError {
  message: string;
  errors: unknown;
}
```

## Retry Strategy

The service implements automatic retries with:

- **3 retry attempts** on failure
- **Exponential backoff** starting at 100ms
- **1 second minimum** between retries
- **Automatic rate limit handling** with dynamic delays

## Rate Limiting

- Requests are automatically retried when rate limited (429 status)
- Uses `Retry-After` header if provided by API
- Falls back to 60-second delay if header not present
- Batch operations use 1-second delays between requests

## Integration with Enrichment Pipeline

```typescript
import { Effect } from 'effect';
import { getLinkedInCompany, LinkedInAPIServiceLive } from './services/effect-linkedin';

export const enrichCompanyWithLinkedIn = (companyUrl: string) =>
  Effect.gen(function* (_) {
    // Get LinkedIn data
    const linkedinData = yield* _(getLinkedInCompany(companyUrl));

    // Transform to enrichment format
    return {
      company_name: linkedinData.company_name,
      company_description: linkedinData.about,
      company_website: linkedinData.website,
      company_employee_count: linkedinData.employee_count,
      company_industry: linkedinData.industry,
      company_hq_location: linkedinData.location,
      company_linkedin: linkedinData.company_url,
      source: 'linkedin_api' as const,
      confidence: 95,
      enriched_at: new Date().toISOString(),
    };
  });

// Use in enrichment pipeline
const enriched = await Effect.runPromise(
  Effect.provide(
    enrichCompanyWithLinkedIn('https://www.linkedin.com/company/microsoft'),
    LinkedInAPIServiceLive
  )
);
```

## Testing

### Unit Tests (Coming Soon)

```typescript
import { Layer, Effect } from 'effect';
import { LinkedInAPIService } from './services/effect-linkedin';

// Mock service for testing
const MockLinkedInService = Layer.succeed(LinkedInAPIService, {
  getProfile: () =>
    Effect.succeed({
      full_name: 'Mock User',
      headline: 'Software Engineer',
      location: { country: 'US', city: 'San Francisco' },
      experience: [],
      skills: [],
      education: [],
      profile_url: 'https://linkedin.com/in/mock',
    }),
  // ... other methods
});

// Use in tests
const testProgram = getLinkedInProfile('https://linkedin.com/in/test');
const result = await Effect.runPromise(
  Effect.provide(testProgram, MockLinkedInService)
);
```

## Files Structure

```
apps/api/src/
├── types/
│   └── linkedin.ts              # TypeScript types & Effect schemas
├── services/
│   └── effect-linkedin.ts       # Main service implementation
├── routes/
│   └── linkedin.ts              # REST API endpoints
├── examples/
│   └── linkedin-api-examples.ts # Usage examples
└── ENV_LINKEDIN.md              # Environment setup guide
```

## Related Documentation

- [LinkedIn Data API Docs](../../docs/LINKEDIN_DATA_API.md) - Complete API reference
- [ENV_LINKEDIN.md](./ENV_LINKEDIN.md) - Environment variables setup
- [Effect TS Documentation](https://effect.website/) - Effect TS guide

## Pricing & Quotas

Check current pricing at [LinkedIn Data API Pricing](https://rapidapi.com/rockapis-rockapis-default/api/linkedin-data-api/pricing)

**Recommended Plans**:
- **Basic**: $0.10/month (100 requests) - Testing & development
- **Pro**: $10/month (10,000 requests) - Small projects
- **Enterprise**: Custom pricing - Production apps

## Troubleshooting

### "RAPIDAPI_KEY environment variable is not set"

**Solution**: Add `RAPIDAPI_KEY=your_key` to `.env` file

### 401 Unauthorized

**Solutions**:
1. Verify API key is correct
2. Check subscription is active
3. Ensure subscribed to LinkedIn Data API

### 429 Rate Limited

**Solutions**:
1. Service automatically retries after delay
2. Upgrade plan for higher limits
3. Reduce concurrent requests

### Network Errors

**Solutions**:
1. Check internet connection
2. Verify RapidAPI service status
3. Check firewall/proxy settings

## API Playground

Test endpoints at: `http://localhost:3001/docs` (Swagger UI)

## Support

For issues with:
- **This integration**: Create issue in repository
- **RapidAPI service**: Contact RapidAPI support
- **Effect TS**: Visit [Effect Discord](https://discord.gg/effect-ts)

---

**Last Updated**: January 2026  
**Status**: Production Ready  
**Tested With**: Bun 1.3+, Effect TS 3.19+, Elysia 1.4+

# LinkedIn API - Quick Reference

## Setup (One-time)

```bash
# 1. Add API key to .env
echo "RAPIDAPI_KEY=your_key_here" >> apps/api/.env

# 2. Test the setup
cd apps/api
bun run src/examples/linkedin-api-examples.ts
```

## REST API Endpoints

Base URL: `http://localhost:3001/linkedin`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/profile` | GET | Get LinkedIn profile |
| `/company` | GET | Get company data |
| `/search/people` | GET | Search profiles |
| `/search/jobs` | GET | Search jobs |
| `/enrich` | POST | Batch enrich data |

## Quick Examples

### cURL

```bash
# Get profile
curl "http://localhost:3001/linkedin/profile?url=https://www.linkedin.com/in/williamhgates"

# Get company
curl "http://localhost:3001/linkedin/company?url=https://www.linkedin.com/company/microsoft"

# Search people
curl "http://localhost:3001/linkedin/search/people?keywords=Software+Engineer&location=San+Francisco&limit=10"

# Batch enrich
curl -X POST http://localhost:3001/linkedin/enrich \
  -H "Content-Type: application/json" \
  -d '{
    "type": "profile",
    "urls": ["https://www.linkedin.com/in/williamhgates"],
    "fields": ["full_name", "headline"]
  }'
```

### TypeScript (Effect TS)

```typescript
import { Effect } from 'effect';
import { 
  LinkedInAPIServiceLive, 
  getLinkedInProfile 
} from './services/effect-linkedin';

// Get profile
const profile = await Effect.runPromise(
  Effect.provide(
    getLinkedInProfile('https://www.linkedin.com/in/williamhgates'),
    LinkedInAPIServiceLive
  )
);
```

### JavaScript (Fetch)

```javascript
// Get profile
const response = await fetch(
  'http://localhost:3001/linkedin/profile?url=https://www.linkedin.com/in/williamhgates'
);
const data = await response.json();
console.log(data);
```

## Common Patterns

### With Error Handling

```typescript
const program = Effect.gen(function* (_) {
  const profile = yield* _(
    getLinkedInProfile(url),
    Effect.catchAll(() => Effect.succeed(null))
  );
  return profile;
});
```

### Batch Processing (Sequential)

```typescript
const profiles = await Effect.runPromise(
  Effect.provide(
    Effect.forEach(urls, getLinkedInProfile, { concurrency: 1 }),
    LinkedInAPIServiceLive
  )
);
```

### With Timeout

```typescript
const profile = await Effect.runPromise(
  Effect.provide(
    Effect.timeout(getLinkedInProfile(url), '10 seconds'),
    LinkedInAPIServiceLive
  )
);
```

## Response Structure

### Profile Response

```typescript
{
  full_name: string;
  headline: string;
  location: {
    country: string;
    city: string;
  };
  experience: Array<{
    title: string;
    company: string;
    duration: string;
  }>;
  skills: string[];
  education: Array<{
    school: string;
    degree?: string;
  }>;
  profile_url: string;
}
```

### Company Response

```typescript
{
  company_name: string;
  about?: string;
  employee_count?: string;
  industry?: string;
  location?: string;
  website?: string;
  founded_year?: number;
  company_url: string;
}
```

## Error Codes

| Code | Error | Solution |
|------|-------|----------|
| 400 | Bad Request | Check URL format |
| 401 | Unauthorized | Verify API key |
| 404 | Not Found | Profile is private or doesn't exist |
| 429 | Rate Limited | Auto-retries or upgrade plan |
| 500 | Server Error | Retry request |

## Environment Variables

```bash
# Required
RAPIDAPI_KEY=your_rapidapi_key

# Optional
RAPIDAPI_LINKEDIN_HOST=linkedin-data-api.p.rapidapi.com
```

## Files

```
apps/api/
├── src/
│   ├── types/linkedin.ts          # Types & schemas
│   ├── services/effect-linkedin.ts # Service implementation
│   ├── routes/linkedin.ts          # REST endpoints
│   └── examples/linkedin-api-examples.ts
├── LINKEDIN_README.md              # Full documentation
├── ENV_LINKEDIN.md                 # Environment setup
└── LINKEDIN_QUICK_REF.md          # This file
```

## Documentation

- **Full Guide**: [LINKEDIN_README.md](./LINKEDIN_README.md)
- **Setup**: [ENV_LINKEDIN.md](./ENV_LINKEDIN.md)
- **API Reference**: [docs/LINKEDIN_DATA_API.md](../../docs/LINKEDIN_DATA_API.md)
- **Swagger UI**: `http://localhost:3001/docs`

## Get API Key

1. Visit [RapidAPI](https://rapidapi.com)
2. Subscribe to [LinkedIn Data API](https://rapidapi.com/rockapis-rockapis-default/api/linkedin-data-api)
3. Copy key from [Dashboard](https://rapidapi.com/developer/dashboard)

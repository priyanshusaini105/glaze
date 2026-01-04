# Worker

Background process that executes the enrichment pipeline for data enrichment requests.

## Overview

The Worker is a long-running process that:

1. Listens to the enrichment job queue (Redis/BullMQ)
2. Executes the enrichment pipeline for each job
3. Orchestrates provider adapters (LinkedIn, website scraper, search)
4. Manages caching layer (Redis)
5. Handles LLM fallback for missing fields
6. Writes results to database and caches

## Architecture

```
┌─────────────────┐
│   API Server    │  Create enrichment jobs
└────────┬────────┘
         │
         ▼
   ┌──────────────┐
   │ Redis Queue  │  BullMQ job queue
   └──────┬───────┘
          │
          ▼
    ┌──────────────┐
    │ Worker Proc. │  Process enrichment
    └──────┬───────┘
           │
      ┌────┴──────┬───────┬─────────┐
      ▼           ▼       ▼         ▼
   LinkedIn   Website  Search     LLM
   Provider   Scraper  Service    Client
      │           │       │         │
      └───────────┴───────┴─────────┘
           │
           ▼
       ┌────────┐
       │ Redis  │  Cache results
       │ Cache  │
       └────┬───┘
            │
            ▼
       ┌──────────┐
       │PostgreSQL│  Store in DB
       └──────────┘
```

## Getting Started

### Prerequisites

```bash
# Redis must be running
redis-server

# PostgreSQL must be running
# Connection string in .env.local: DATABASE_URL

# Node.js 18+, Bun 1.0+
bun --version
```

### Local Development

```bash
# Install dependencies
cd apps/worker
pnpm install

# Start worker
./../../scripts/run-worker.sh

# Or directly
bun run --watch src/index.ts
```

### Environment Variables

```bash
# .env.local in project root

# Redis
REDIS_URL=redis://localhost:6379

# Queue configuration
QUEUE_NAME=enrichment
CONCURRENCY=10

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/glaze

# Provider API Keys
LINKEDIN_API_KEY=...
SEARCH_API_KEY=...

# LLM Configuration
LLM_PROVIDER=anthropic  # or openai
LLM_MODEL=claude-3-sonnet-20240229
LLM_API_KEY=...
```

## Project Structure

```
apps/worker/
├── src/
│   ├── index.ts          # Entry point
│   ├── service.ts        # Worker service (queue listener)
│   ├── pipeline.ts       # Enrichment pipeline executor
│   ├── providers/        # Provider adapters
│   │   ├── index.ts
│   │   ├── linkedin-provider.ts
│   │   ├── website-scraper.ts
│   │   ├── search-provider.ts
│   │   └── llm-provider.ts
│   └── ...
├── package.json
└── tsconfig.json
```

## Providers

### LinkedIn Provider

Fetches profile and company data from LinkedIn:

```typescript
import { createLinkedInProvider } from './providers/linkedin-provider';

const linkedin = createLinkedInProvider({
  apiKey: process.env.LINKEDIN_API_KEY,
  enableScraping: true
});

const profile = await linkedin.getProfile('https://linkedin.com/in/...');
```

### Website Scraper

Extracts company information from websites:

```typescript
import { createScraperProvider } from './providers/website-scraper';

const scraper = createScraperProvider({
  timeout: 30000,
  retries: 3
});

const data = await scraper.scrapeWebsite('https://example.com');
```

### Search Service

Queries external search APIs:

```typescript
import { createSearchProvider } from './providers/search-provider';

const search = createSearchProvider({
  apiKey: process.env.SEARCH_API_KEY
});

const results = await search.search('Apple Inc');
```

### LLM Provider

Uses LLM for data validation and field inference:

```typescript
import { createLLMProvider } from './providers/llm-provider';

const llm = createLLMProvider({
  provider: 'anthropic',
  model: 'claude-3-sonnet-20240229',
  apiKey: process.env.LLM_API_KEY
});

// Infer missing field
const inferred = await llm.inferField({
  field: 'company_industry',
  context: {
    company_name: 'Acme Corp',
    company_size: '100-500'
  }
});

// Validate data
const validated = await llm.validateData(
  'person_email',
  'john@example.com',
  { person_name: 'John Doe' }
);
```

## Pipeline Execution

The enrichment pipeline runs through multiple stages:

### 1. Cache Check

Returns cached results if available for the requested fields.

```typescript
// Cached in Redis with key: enrichment:${url}:${fields.join(',')}
```

### 2. Provider Stages

Runs each provider adapter:

- **LinkedIn** - Profile and company data (95% confidence)
- **Website Scraper** - Company info from website (80% confidence)
- **Search Service** - Third-party data (70% confidence)

### 3. Gap Analysis

Analyzes which fields are still missing after providers.

### 4. LLM Fallback

Uses LLM to infer remaining fields (60% confidence).

### 5. Merge & Validate

Combines results and validates data quality.

### 6. Database Write

Persists final results to PostgreSQL and caches in Redis.

## Job Processing

### Job Input

```typescript
interface EnrichmentJobInput {
  url: string;
  type: 'company_website' | 'linkedin_profile' | 'company_linkedin';
  requiredFields: string[];
  skipCache?: boolean;
  maxCostCents?: number;
}
```

### Job Result

```typescript
interface EnrichmentJobResult {
  status: 'success' | 'failed' | 'partial';
  data: EnrichmentData;
  costs: {
    provider: number;
    llm: number;
    total: number;
  };
  stages: StageResult[];
  timestamp: string;
}
```

### Processing Flow

```
1. Worker picks up job from queue
2. Check cache
   ├─ If hit → Return cached data
   └─ If miss → Continue
3. Run provider stages
4. Analyze gaps
5. LLM fallback
6. Merge results
7. Write to cache + database
8. Mark job complete
9. Report back to API
```

## Monitoring

### Job Monitoring

```bash
# View job queue length
redis-cli XLEN enrichment-jobs

# View active jobs
redis-cli HGETALL bull:${QUEUE_NAME}:active

# View failed jobs
redis-cli ZRANGE bull:${QUEUE_NAME}:failed 0 -1

# Clear queue
redis-cli DEL bull:${QUEUE_NAME}:*
```

### Logs

Worker logs are prefixed with `[worker]`:

```
[worker] Starting enrichment worker...
[worker] Processing enrichment job: job_12345
[worker] LinkedIn stage completed: 2 fields
[worker] Website scraper stage completed: 1 field
[worker] LLM fallback: 1 inference
[worker] Job completed: job_12345
```

### Metrics

Track in your monitoring system:

- **Jobs processed** per minute
- **Success rate** (%)
- **Average duration** per job
- **Provider hit rates** (cache efficiency)
- **LLM fallback rate** (% of jobs needing LLM)
- **Cost per job** (in cents)

## Scaling

### Concurrency

Adjust worker concurrency in environment:

```bash
# Process more jobs in parallel
export CONCURRENCY=20
./scripts/run-worker.sh
```

### Multiple Workers

Run multiple worker instances:

```bash
# Terminal 1
QUEUE_NAME=enrichment-1 ./scripts/run-worker.sh

# Terminal 2
QUEUE_NAME=enrichment-2 ./scripts/run-worker.sh
```

### Queue Distribution

Use separate queues for priority:

```bash
# High priority jobs
redis-cli XADD enrichment-priority * \
  url https://example.com \
  type company_website

# Low priority jobs
redis-cli XADD enrichment-batch * \
  url https://example.com \
  type company_website
```

## Troubleshooting

### Worker not starting?

```bash
# Check Redis connection
redis-cli PING  # Should return PONG

# Check environment variables
echo $REDIS_URL
echo $DATABASE_URL

# Check logs
bun run src/index.ts 2>&1 | head -20
```

### Jobs not processing?

```bash
# Check job queue
redis-cli XLEN enrichment-jobs

# Check for errors
redis-cli ZRANGE bull:enrichment:failed 0 -1 WITHSCORES

# Retry failed jobs
redis-cli ZREM bull:enrichment:failed job_id
```

### Memory leak?

```bash
# Monitor memory usage
watch -n 1 'ps aux | grep "run-worker"'

# Check for unclosed connections
# Review service.ts for promise cleanup
```

### Provider timeouts?

Adjust in `src/providers/*/`:

```typescript
const provider = createScraperProvider({
  timeout: 60000,  // Increase to 60s
  retries: 5       // Retry more times
});
```

## Performance Tips

1. **Cache Results** - Reduces provider API calls by 70%
2. **Batch Requests** - Group similar jobs together
3. **Provider Priority** - Try cheaper providers first (LinkedIn < website < search)
4. **LLM Sparingly** - Use only for critical gaps
5. **Database Indexing** - Index by URL and created_at for faster lookups

## Related Documentation

- [Enrichment Pipeline Guide](/docs/ENRICHMENT_UNIFIED_API.md)
- [API Documentation](/apps/api/README.md)
- [Contributors Guide](/CONTRIBUTORS.md)
- [Workflows Documentation](/apps/workflows/README.md)

## Contributing

See [CONTRIBUTORS.md](/CONTRIBUTORS.md#adding-a-new-provider-adapter) for guidelines on:

- Adding new provider adapters
- Modifying the enrichment pipeline
- Testing changes locally

---

**Status**: Active development
**Last Updated**: January 2026

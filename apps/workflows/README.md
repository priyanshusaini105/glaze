# Workflows

Trigger.dev workflow definitions for the enrichment pipeline. These workflows orchestrate data enrichment jobs across the system.

## Overview

Workflows are long-running tasks that can be scheduled, triggered manually, or invoked from the API. They integrate with the Worker process to execute enrichment pipelines.

## Getting Started

### Prerequisites

1. **Trigger.dev Account** - Sign up at [trigger.dev](https://trigger.dev)
2. **Project Created** - Create a project in your organization
3. **API Key** - Get your project API key from dashboard
4. **Trigger CLI** - `npm install -g @trigger.dev/cli`

### Local Development

```bash
# Install dependencies
cd apps/workflows
pnpm install

# Set up environment
TRIGGER_API_KEY=<your-api-key> pnpm run dev

# Or use provided script
./../../scripts/run-workflows.sh
```

### Deployment

```bash
# Deploy to Trigger.dev
cd apps/workflows
pnpm run deploy

# With specific environment
TRIGGER_ENV=production pnpm run deploy
```

## Project Structure

```
apps/workflows/
├── src/
│   ├── index.ts           # Entry point, exports all tasks
│   └── enrichment.ts      # Enrichment workflow definitions
├── package.json
├── tsconfig.json
└── README.md
```

## Available Workflows

### 1. Enrich Data Task

Single URL enrichment with priority queue support.

**Trigger ID**: `enrich-data`

**Input**:
```typescript
{
  url: string;                                           // Company/profile URL
  type: 'company_website' | 'linkedin_profile' | 'company_linkedin';
  requiredFields: string[];                              // Fields to enrich
  skipCache?: boolean;                                   // Bypass cache
}
```

**Output**:
```typescript
{
  status: 'success' | 'failed' | 'partial';
  data: EnrichmentData;                                  // Enriched fields
  costs: { provider: number; llm: number; total: number };
  stages: StageResult[];
  timestamp: string;
}
```

**Example**:
```typescript
import { enrichDataTask } from '@workflows/enrichment';

const result = await enrichDataTask.trigger({
  url: 'https://example.com',
  type: 'company_website',
  requiredFields: ['company_name', 'company_industry', 'company_size']
});
```

### 2. Batch Enrich Task

Process multiple URLs in parallel.

**Trigger ID**: `batch-enrich`

**Input**:
```typescript
{
  urls: Array<{
    url: string;
    type: 'company_website' | 'linkedin_profile' | 'company_linkedin';
  }>;
  requiredFields?: string[];
}
```

**Output**:
```typescript
{
  status: 'processing' | 'completed' | 'partial_failure';
  count: number;
  results: EnrichmentJobResult[];
  failedJobs: string[];
  timestamp: string;
}
```

**Example**:
```typescript
const result = await batchEnrichTask.trigger({
  urls: [
    { url: 'https://example.com', type: 'company_website' },
    { url: 'https://linkedin.com/in/john', type: 'linkedin_profile' },
  ],
  requiredFields: ['person_name', 'person_title', 'company_name']
});
```

## Usage Patterns

### From API

Trigger workflows from your API endpoints:

```typescript
// apps/api/src/routes/enrich.ts
import { enrichDataTask } from '@workflows/enrichment';

export const enrichRoute = new Elysia()
  .post('/enrich', async (body) => {
    const result = await enrichDataTask.trigger({
      url: body.url,
      type: body.type,
      requiredFields: body.fields
    });

    return { jobId: result.id };
  });
```

### Scheduled Workflows

Schedule recurring enrichment jobs:

```typescript
import { cron, task } from "@trigger.dev/sdk/v3";

export const dailyEnrichmentTask = task({
  id: "daily-enrich",
  trigger: cron.daily(),
  run: async () => {
    // Find pending enrichments from database
    // Batch trigger them
  }
});
```

### Error Handling

Workflows include automatic retry logic:

```typescript
export const enrichDataTask = task({
  id: "enrich-data",
  maxDuration: 600,
  run: async (payload, { ctx }) => {
    try {
      // Enrichment logic
    } catch (error) {
      logger.error("Enrichment failed", { error, payload });
      throw error; // Trigger.dev will retry
    }
  }
});
```

## Integration with Worker

Workflows trigger enrichment by:

1. **Creating a job** in Redis queue
2. **Worker picks it up** and processes
3. **Reports back** via webhook/polling

```
API → Workflow → Redis Queue → Worker → Database → Callback
```

## Environment Variables

```bash
# .env.local in project root

# Trigger.dev
TRIGGER_API_KEY=<your-api-key>
TRIGGER_API_URL=https://api.trigger.dev

# Worker connection
REDIS_URL=redis://localhost:6379
QUEUE_NAME=enrichment

# API callback
API_WEBHOOK_SECRET=<secret>
API_CALLBACK_URL=https://your-api.com/webhooks/enrichment
```

## Monitoring

### View Logs

```bash
# In local development
pnpm run dev

# View specific task logs
trigger.dev logs enrich-data

# Follow real-time logs
trigger.dev logs -f enrich-data
```

### View Runs

```bash
# List recent runs
trigger.dev runs list

# Get run details
trigger.dev runs get <run-id>

# Replay a run
trigger.dev runs replay <run-id>
```

### Dashboard

Access your Trigger.dev dashboard:

```
https://cloud.trigger.dev/projects/<project-id>/runs
```

## Development Workflow

### Add New Workflow

1. **Create task** in `src/`:

```typescript
// src/validate-data.ts
import { task } from "@trigger.dev/sdk/v3";

export const validateDataTask = task({
  id: "validate-data",
  run: async (payload: { data: string }) => {
    // Validation logic
    return { valid: true };
  }
});
```

2. **Export from index**:

```typescript
// src/index.ts
export * from "./validate-data";
```

3. **Test locally**:

```bash
pnpm run dev
# Call task from API
curl -X POST http://localhost:3000/enrich \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com",...}'
```

4. **Deploy**:

```bash
pnpm run deploy
```

### Modify Task

After changing a task:

```bash
# Redeploy to update
pnpm run deploy

# Old runs continue with old code
# New runs use new code
```

## Performance Tips

1. **Set reasonable maxDuration** - Prevent hanging tasks
2. **Use queue names** - Separate by priority
3. **Batch when possible** - Reduce API calls
4. **Implement caching** - Store recent results
5. **Monitor costs** - LLM calls are expensive

## Scaling

### Concurrent Runs

Limit concurrent task executions:

```typescript
export const enrichDataTask = task({
  id: "enrich-data",
  maxDuration: 600,
  queue: {
    name: "enrichment",
    concurrencyLimit: 50  // Max 50 parallel
  },
  run: async (payload) => {
    // ...
  }
});
```

### Multiple Queues

Use separate queues for different priorities:

```typescript
export const priorityEnrichTask = task({
  id: "priority-enrich",
  queue: { name: "enrichment-priority" },
  run: async (payload) => { /* ... */ }
});

export const batchEnrichTask = task({
  id: "batch-enrich",
  queue: { name: "enrichment-batch" },
  run: async (payload) => { /* ... */ }
});
```

## Troubleshooting

### Task not triggering?

```bash
# Check API key
echo $TRIGGER_API_KEY

# Verify connection
pnpm run dev

# Check logs
trigger.dev logs -f
```

### Worker not processing?

- Ensure Worker is running: `./scripts/run-worker.sh`
- Check Redis connection: `redis-cli PING`
- View queue size: `redis-cli XLEN enrichment-jobs`

### High latency?

- Check Worker concurrency
- Monitor Redis memory
- Check database connection pool
- Review provider timeouts

### High costs?

- Increase cache TTL
- Reduce LLM fallback threshold
- Batch similar requests
- Use cheaper providers first

## Cost Estimation

Per enrichment job (typical case):

| Provider | Cost | Confidence |
|----------|------|-----------|
| Cache hit | $0 | 95% |
| LinkedIn API | $0.01-0.05 | 95% |
| Website scraper | $0 | 70% |
| Search service | $0.02 | 80% |
| LLM fallback | $0.02-0.05 | 60% |

**Average total**: $0.03-0.10 per job

## Related Documentation

- [Worker README](/apps/worker/README.md)
- [API Documentation](/apps/api/README.md)
- [Contributors Guide](/CONTRIBUTORS.md)
- [Trigger.dev Docs](https://trigger.dev/docs)

## API Reference

### enrichDataTask.trigger(payload)

```typescript
const run = await enrichDataTask.trigger({
  url: 'https://example.com',
  type: 'company_website',
  requiredFields: ['company_name', 'company_industry'],
  skipCache: false
}, {
  delay: 5000,              // Delay 5 seconds
  idempotencyKey: 'unique', // Prevent duplicates
  tags: ['batch-001']       // Organize runs
});

console.log(run.id);  // run_xxx
```

### batchEnrichTask.trigger(payload)

```typescript
const run = await batchEnrichTask.trigger({
  urls: [
    { url: 'https://example.com', type: 'company_website' }
  ]
});

console.log(run.id);
```

## Contributing

See [CONTRIBUTORS.md](/CONTRIBUTORS.md) for guidelines on:

- Adding new workflow tasks
- Modifying existing tasks
- Testing changes

---

**Status**: Active development
**Last Updated**: January 2026
**Framework**: Trigger.dev v3

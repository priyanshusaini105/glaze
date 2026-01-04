# Contributing to Glaze

Welcome! This guide will help you navigate the Glaze codebase and get started with development.

## Project Structure

Glaze is organized as a monorepo using pnpm workspaces. Here's the layout:

```
glaze/
├── apps/
│   ├── api/              # HTTP API server (Elysia)
│   ├── web/              # Frontend (Next.js)
│   ├── worker/           # Background worker process
│   └── workflows/        # Trigger.dev workflow definitions
├── packages/
│   ├── types/            # Shared TypeScript types
│   ├── ui/               # Shared UI components
│   ├── trigger/          # Legacy - move to apps/workflows
│   └── typescript-config/
└── scripts/              # Local development helpers
```

## Architecture Overview

### Core Components

**API** (`apps/api/`) - HTTP server handling:
- Data table CRUD operations
- Enrichment request endpoints
- LinkedIn integration endpoints
- Health checks and documentation

**Worker** (`apps/worker/`) - Background process executing:
- Enrichment pipeline stages
- Provider adapter orchestration (LinkedIn, website scraping, search)
- Caching layer management
- LLM fallback for missing data

**Workflows** (`apps/workflows/`) - Trigger.dev task definitions:
- Single enrichment task
- Batch enrichment task
- Scheduled enrichment jobs

**Shared Types** (`packages/types/`) - TypeScript definitions:
- Enrichment job schemas
- LinkedIn data structures
- ICP profile types
- API response shapes

## Development Setup

### Prerequisites

- **Node.js**: 18+ (recommend 20+)
- **Bun**: 1.0+ (for API and worker)
- **pnpm**: 8+ (workspace package manager)
- **Redis**: Running on `localhost:6379`
- **PostgreSQL**: Running on `localhost:5432`
- **.env.local**: Copy `.env.example` and fill in your credentials

### Installation

```bash
# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your API keys, database URLs, etc.

# Set up database
cd apps/api
pnpm run prisma:migrate:dev
```

### Running Services Locally

#### Quick Start (All Services)

```bash
# Requires Redis and PostgreSQL running
./scripts/dev-all.sh

# Or with workflows enabled:
ENABLE_WORKFLOWS=true ./scripts/dev-all.sh
```

#### Individual Services

```bash
# API server (port 3001)
cd apps/api
bun run --watch src/index.ts

# Worker process
./scripts/run-worker.sh

# Trigger.dev workflows
./scripts/run-workflows.sh
```

## Key Concepts

### Enrichment Pipeline

The enrichment pipeline processes company/person data through multiple stages:

1. **Cache Check** - Return cached results if available
2. **LinkedIn Provider** - Fetch from LinkedIn API/scraper
3. **Website Scraper** - Extract data from company website
4. **Search Service** - Query external search APIs
5. **Gap Analysis** - Identify missing fields
6. **LLM Fallback** - Use LLM to infer remaining fields
7. **Merge & Validate** - Combine results and validate
8. **Write** - Cache results and save to database

### Job Queue

Jobs flow through Redis/BullMQ:

```
API Request → Enrich Queue → Worker Process → Database Write → Webhook/Polling
```

### Type System

All shared types live in `packages/types/`:

- `enrichment.ts` - Job input/output, enriched values
- `linkedin.ts` - LinkedIn API response shapes
- `icp.ts` - ICP profile and matching types
- `api.ts` - API response envelopes

Import types in API/Worker/Workflows:

```typescript
import type { EnrichmentJobInput, EnrichmentJobResult } from '@types/types';
```

## Development Workflow

### Making Changes to Shared Types

1. Update `packages/types/src/enrichment.ts` or related file
2. Run type check: `pnpm check-types`
3. Both API and Worker automatically pick up changes

### Adding a New Provider Adapter

Provider adapters live in `apps/worker/src/providers/`:

```typescript
// apps/worker/src/providers/my-provider.ts
export const createMyProvider = (config?: MyConfig) => {
  return {
    fetch: async (url: string) => {
      // Implementation
    }
  };
};
```

Import in pipeline: `apps/worker/src/pipeline.ts`

### Modifying the Enrichment Pipeline

1. Edit `apps/worker/src/pipeline.ts` - Core enrichment logic
2. Update `apps/worker/src/service.ts` - Worker configuration
3. Test with: `./scripts/run-worker.sh`

### Adding Trigger.dev Tasks

1. Create new file in `apps/workflows/src/`
2. Export tasks from `apps/workflows/src/index.ts`
3. Deploy: `cd apps/workflows && pnpm run deploy`

## Code Organization

### Barrel Exports

Use barrel exports (index.ts) for clean imports:

```typescript
// apps/worker/src/providers/index.ts
export * from "./linkedin-provider";
export * from "./llm-provider";

// Usage:
import { LinkedInProvider, LLMProvider } from '@worker/providers';
```

### Path Aliases

Configure in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "paths": {
      "@types/types": ["../../packages/types/src"],
      "@worker/*": ["../../apps/worker/src/*"]
    }
  }
}
```

## Testing

### Type Checking

```bash
# Check all workspace packages
pnpm check-types

# Check specific package
cd apps/api && pnpm check-types
```

### Running Tests

Tests are defined per-package. Example:

```bash
cd apps/api
pnpm test
```

## Database

### Migrations

```bash
cd apps/api

# Create migration after schema changes
pnpm run prisma:migrate:dev --name "description"

# Deploy migrations to production
pnpm run prisma:migrate:deploy

# View database
pnpm run prisma:studio
```

### Schema

Schema lives in `apps/api/prisma/schema.prisma`

## Debugging

### Worker Logs

```bash
# Check worker output
./scripts/run-worker.sh
# Look for [worker] prefixed logs
```

### API Logs

```bash
cd apps/api && bun run src/index.ts
# Look for [server] and route-specific prefixed logs
```

### Redis Inspection

```bash
# Connect to Redis
redis-cli

# View queue jobs
XRANGE enrichment-jobs - + COUNT 10

# View job details
HGETALL job:<id>
```

### Database Inspection

```bash
cd apps/api
pnpm run prisma:studio
# Opens browser UI at http://localhost:5555
```

## Common Tasks

### Update Dependencies

```bash
# Check for outdates
pnpm outdated

# Update all packages
pnpm update -r

# Update specific package
pnpm update zod -r
```

### Clean Build

```bash
# Remove node_modules and caches
pnpm clean

# Reinstall
pnpm install

# Rebuild types
pnpm check-types
```

### Format Code

```bash
# Format TypeScript files
pnpm prettier --write "apps/**/*.ts" "packages/**/*.ts"

# Lint
pnpm lint
```

## Performance Considerations

### Caching Layer

- Redis is used for enrichment caching
- Cache keys: `enrichment:${url}:${fields}`
- Default TTL: 7 days (configurable)

### Provider Optimization

- LinkedIn: Rate-limited, cache aggressively
- Website scraper: Timeout after 30s
- Search: Batch requests when possible

### LLM Fallback

- Only used for uncovered fields
- Cost: ~$0.01-0.05 per inference
- Confidence: 60% (lower than provider data)

## Troubleshooting

### Queue not processing jobs?

```bash
# Check Redis connection
redis-cli PING  # Should return PONG

# Check worker is running
ps aux | grep "run-worker"

# Check queue size
redis-cli XLEN enrichment-jobs
```

### Type errors after change?

```bash
# Clear type cache
rm -rf node_modules/.vite

# Rebuild
pnpm install && pnpm check-types
```

### Database connection error?

```bash
# Check PostgreSQL is running
psql -h localhost -U postgres -d glaze

# Check DATABASE_URL in .env.local
# Should be: postgresql://user:password@localhost:5432/glaze
```

## Getting Help

- Check existing issues: `github.com/priyanshusaini105/glaze/issues`
- Review test files for usage examples
- Check related documentation in `apps/api/LINKEDIN_README.md`

## Next Steps

1. **Set up development environment** - Follow "Development Setup"
2. **Run services locally** - Use `./scripts/dev-all.sh`
3. **Make a small change** - Try adding a console.log to understand flow
4. **Run tests** - Verify code quality
5. **Create a PR** - Share your improvements!

---

Happy coding! 🚀

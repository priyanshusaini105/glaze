# Glaze - High-Performance Data Enrichment Platform

A modern, scalable platform for enriching company and profile data with multiple data sources and AI-powered fallback.

## 🚀 Features

- **Multi-provider enrichment** - LinkedIn, website scraping, search APIs
- **Intelligent caching** - Redis-backed cache with 7-day TTL
- **LLM fallback** - Claude/GPT for inferring missing fields
- **Background workers** - Separate process for pipeline execution
- **Trigger.dev workflows** - Scheduled and on-demand enrichment jobs
- **Type-safe** - Full TypeScript with shared type definitions
- **Scalable** - Trigger.dev job queue, configurable concurrency

## 📁 Project Structure

This is a [pnpm workspaces](https://pnpm.io/workspaces) monorepo with the following structure:

### Apps

- **[apps/api](/apps/api)** - HTTP API server (Elysia)
  - REST endpoints for enrichment requests
  - Table CRUD operations
  - LinkedIn integration endpoints
  - Swagger documentation

- **[apps/worker](/apps/worker)** - ~~Background enrichment process~~ **DEPRECATED** (replaced by Trigger.dev)
  - Legacy BullMQ worker, no longer used
  - All enrichment now handled by `apps/workflows`

- **[apps/workflows](/apps/workflows)** - Trigger.dev task definitions
  - Single enrichment tasks
  - Batch processing workflows
  - Scheduled jobs

- **[apps/web](/apps/web)** - Next.js frontend
  - Data visualization and management
  - Enrichment request UI
  - Results dashboard

### Packages

- **[packages/types](/packages/types)** - Shared TypeScript types
  - Enrichment job schemas
  - LinkedIn data structures
  - API response types
  - ICP profile definitions

- **[packages/ui](/packages/ui)** - Shared React components

- **[packages/trigger](/packages/trigger)** - Legacy (being migrated to apps/workflows/)

## 🏗️ Architecture

```
┌─────────────┐
│   Web UI    │
└──────┬──────┘
       │
┌──────▼──────────────┐
│   API Server        │
│  (Elysia)           │
└──────┬──────────────┘
       │
       ├─ Trigger Task ┐
       │               ▼
       │        ┌──────────────────┐
       │        │  Trigger.dev     │
       │        │  (Task Queue)    │
       │        └──────┬───────────┘
       │               │
       └─ Poll────┐    │
           Status │    ▼
                  │ ┌──────────────────────┐
                  │ │ Workflow Process     │
                  │ │  (apps/workflows)    │
                  │ └──────┬───────────────┘
                  │        │
                  │        ├─ LinkedIn Provider
                  │        ├─ Website Scraper
                  │        ├─ Search Service
                  │        └─ LLM Provider
                  │
                  ▼
          ┌──────────────────┐
          │   PostgreSQL DB  │
          │  + Redis Cache   │
          └──────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Bun 1.0+ or pnpm 8+
- PostgreSQL 14+
- Redis 6+

### Development Setup

```bash
# Install dependencies
pnpm install

# Copy environment template
cp .env.example .env.local
# Edit .env.local with your credentials

# Set up database
cd apps/api && pnpm run prisma:migrate:dev

# Start all services
./scripts/dev-all.sh
```

This starts:
- **API**: http://localhost:3001 (Swagger docs: /docs)
- **Workflows**: Trigger.dev background task processing
- **Web**: http://localhost:3000 (if configured)

### Individual Services

```bash
# API only
cd apps/api && bun run dev

# Workflows only (requires Trigger.dev account)
cd apps/workflows && npx trigger.dev@latest dev
```

## 📚 Documentation

- **[CONTRIBUTORS.md](/CONTRIBUTORS.md)** - Development guide and architecture overview
- **[apps/api/README.md](/apps/api/README.md)** - API server documentation
- **[apps/worker/README.md](/apps/worker/README.md)** - Worker process documentation
- **[apps/workflows/README.md](/apps/workflows/README.md)** - Workflow definitions guide
- **[docs/](/docs)** - Architecture and integration guides

## 🔧 Common Commands

```bash
# Check types
pnpm check-types

# Lint code
pnpm lint

# Format code
pnpm prettier --write .

# Database operations
cd apps/api
pnpm run prisma:studio     # Open database UI
pnpm run prisma:migrate:dev  # Create migration

# Run tests
pnpm test
```

## 🗂️ Workspace Scripts

Located in `/scripts/`:

- `dev-all.sh` - Start all services locally
- `run-worker.sh` - Start enrichment worker
- `run-workflows.sh` - Start Trigger.dev workflows
- `docker-setup.sh` - Docker environment setup
- `init-db.sql` - Database initialization

## 🛠️ Tech Stack

### Core
- **Runtime**: Bun (API), Node.js (Worker/Workflows)
- **Language**: TypeScript
- **Package Manager**: pnpm

### Backend
- **API Framework**: [Elysia](https://elysiajs.com/) with Eden
- **Database**: PostgreSQL + Prisma ORM
- **Cache**: Redis + ioredis
- **Job Queue**: Trigger.dev v3

### Enrichment
- **Workflows**: [Trigger.dev v3](https://trigger.dev/)
- **LLM**: Anthropic Claude or OpenAI GPT
- **Web Scraping**: Cheerio

### Frontend
- **Framework**: Next.js
- **Components**: Shadcn/ui, Mantine UI, HeroUI

### Development
- **Build**: TypeScript, esbuild
- **Testing**: TBD
- **Linting**: ESLint
- **Formatting**: Prettier

## 📊 Pipeline Stages

Each enrichment request goes through:

1. **Cache Check** - Redis cache lookup
2. **LinkedIn Provider** - API/scraper data (95% confidence)
3. **Website Scraper** - Company website extraction (80% confidence)
4. **Search Service** - Third-party data APIs (70% confidence)
5. **Gap Analysis** - Identify missing fields
6. **LLM Fallback** - AI-powered inference (60% confidence)
7. **Merge & Validate** - Combine and verify results
8. **Write** - Store in DB and cache

## 🔐 Environment Variables

Create `.env.local` in project root:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/glaze

# Redis
REDIS_URL=redis://localhost:6379

# API
PORT=3001
API_URL=http://localhost:3001

# LinkedIn (if using API)
LINKEDIN_API_KEY=xxx

# LLM
LLM_PROVIDER=anthropic
LLM_MODEL=claude-3-sonnet-20240229
LLM_API_KEY=xxx

# Trigger.dev (optional)
TRIGGER_API_KEY=xxx
```

## 📈 Monitoring & Scaling

### Logging
All services use `[prefix]` log format:
- `[api]` - API server logs
- `[worker]` - Worker process logs
- `[enrichment]` - Pipeline execution logs

### Queue Monitoring
```bash
# Check queue size
redis-cli XLEN enrichment-jobs

# View job details
redis-cli HGETALL job:<job-id>

# List failed jobs
redis-cli ZRANGE bull:enrichment:failed 0 -1
```

### Scaling Worker
```bash
# Increase concurrency
export CONCURRENCY=20
./scripts/run-worker.sh

# Run multiple instances
QUEUE_NAME=enrichment-1 ./scripts/run-worker.sh &
QUEUE_NAME=enrichment-2 ./scripts/run-worker.sh &
```

## 🐛 Troubleshooting

**Worker not processing jobs?**
- Check Redis: `redis-cli PING`
- Verify env vars: `echo $REDIS_URL`
- Check logs: `./scripts/run-worker.sh` (watch terminal)

**Database connection error?**
- Verify PostgreSQL running: `psql -h localhost -U postgres`
- Check DATABASE_URL in .env.local
- Run migrations: `cd apps/api && pnpm run prisma:migrate:dev`

**Type errors?**
- Rebuild types: `pnpm check-types`
- Clear cache: `rm -rf node_modules/.vite`

See [CONTRIBUTORS.md](/CONTRIBUTORS.md#troubleshooting) for more help.

## 🤝 Contributing

We welcome contributions! Please read [CONTRIBUTORS.md](/CONTRIBUTORS.md) for:

- Development setup instructions
- Code organization guidelines
- Adding new provider adapters
- Testing procedures
- Deployment guide

## 📄 License

[Add your license here]

---

**Status**: Active Development  
**Last Updated**: January 2026  
**Maintainers**: [@priyanshusaini105](https://github.com/priyanshusaini105)

You can build a specific package by using a [filter](https://turborepo.com/docs/crafting-your-repository/running-tasks#using-filters):

```
# With [global `turbo`](https://turborepo.com/docs/getting-started/installation#global-installation) installed (recommended)
turbo build --filter=docs

# Without [global `turbo`](https://turborepo.com/docs/getting-started/installation#global-installation), use your package manager
npx turbo build --filter=docs
yarn exec turbo build --filter=docs
pnpm exec turbo build --filter=docs
```

### Develop

To develop all apps and packages, run the following command:

```
cd my-turborepo

# With [global `turbo`](https://turborepo.com/docs/getting-started/installation#global-installation) installed (recommended)
turbo dev

# Without [global `turbo`](https://turborepo.com/docs/getting-started/installation#global-installation), use your package manager
npx turbo dev
yarn exec turbo dev
pnpm exec turbo dev
```

You can develop a specific package by using a [filter](https://turborepo.com/docs/crafting-your-repository/running-tasks#using-filters):

```
# With [global `turbo`](https://turborepo.com/docs/getting-started/installation#global-installation) installed (recommended)
turbo dev --filter=web

# Without [global `turbo`](https://turborepo.com/docs/getting-started/installation#global-installation), use your package manager
npx turbo dev --filter=web
yarn exec turbo dev --filter=web
pnpm exec turbo dev --filter=web
```

### Remote Caching

> [!TIP]
> Vercel Remote Cache is free for all plans. Get started today at [vercel.com](https://vercel.com/signup?/signup?utm_source=remote-cache-sdk&utm_campaign=free_remote_cache).

Turborepo can use a technique known as [Remote Caching](https://turborepo.com/docs/core-concepts/remote-caching) to share cache artifacts across machines, enabling you to share build caches with your team and CI/CD pipelines.

By default, Turborepo will cache locally. To enable Remote Caching you will need an account with Vercel. If you don't have an account you can [create one](https://vercel.com/signup?utm_source=turborepo-examples), then enter the following commands:

```
cd my-turborepo

# With [global `turbo`](https://turborepo.com/docs/getting-started/installation#global-installation) installed (recommended)
turbo login

# Without [global `turbo`](https://turborepo.com/docs/getting-started/installation#global-installation), use your package manager
npx turbo login
yarn exec turbo login
pnpm exec turbo login
```

This will authenticate the Turborepo CLI with your [Vercel account](https://vercel.com/docs/concepts/personal-accounts/overview).

Next, you can link your Turborepo to your Remote Cache by running the following command from the root of your Turborepo:

```
# With [global `turbo`](https://turborepo.com/docs/getting-started/installation#global-installation) installed (recommended)
turbo link

# Without [global `turbo`](https://turborepo.com/docs/getting-started/installation#global-installation), use your package manager
npx turbo link
yarn exec turbo link
pnpm exec turbo link
```

## Useful Links

Learn more about the power of Turborepo:

- [Tasks](https://turborepo.com/docs/crafting-your-repository/running-tasks)
- [Caching](https://turborepo.com/docs/crafting-your-repository/caching)
- [Remote Caching](https://turborepo.com/docs/core-concepts/remote-caching)
- [Filtering](https://turborepo.com/docs/crafting-your-repository/running-tasks#using-filters)
- [Configuration Options](https://turborepo.com/docs/reference/configuration)
- [CLI Usage](https://turborepo.com/docs/reference/command-line-reference)

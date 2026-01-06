# Architecture Guide

Visual reference for understanding Glaze's architecture after restructuring.

## System Components

### High-Level Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                          CLIENT APPLICATIONS                         │
│  (Web UI, External APIs, Mobile Apps, etc.)                         │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                    HTTP/REST API
                           │
                           ▼
                ┌───────────────────┐
                │   API Server      │
                │   (apps/api/)     │
                │                   │
                │  ✓ REST Endpoints │
                │  ✓ WebSocket      │
                │  ✓ Swagger Docs   │
                │  ✓ Auth           │
                └─────────┬─────────┘
                          │
         ┌────────────────┼────────────────┐
         │                │                │
    Create Job       Poll Status      Return Results
         │                │                │
         ▼                ▼                ▼
      Redis             HTTP           Database
      Queue              ↑              (Cache)
         │                │
         └────────────────┴─────────────────┐
                          │                 │
                          ▼                 ▼
         ┌──────────────────────────────────────┐
         │   Worker Process (apps/workflows/)   │
         │   ~~(apps/worker/ - DEPRECATED)~~    │
         │                                      │
         │   ✓ Job Queue Listener (Trigger.dev) │
         │   ✓ Pipeline Executor               │
         │   ✓ Provider Orchestration          │
         │   ✓ Error Handling & Retries        │
         │                                      │
         │   ┌──────────────────────────────┐  │
         │   │   Provider Adapters          │  │
         │   │ ┌────────────────────────┐  │  │
         │   │ │ LinkedIn Provider      │  │  │
         │   │ ├────────────────────────┤  │  │
         │   │ │ Website Scraper        │  │  │
         │   │ ├────────────────────────┤  │  │
         │   │ │ Search Service         │  │  │
         │   │ ├────────────────────────┤  │  │
         │   │ │ LLM Provider (Claude)  │  │  │
         │   │ └────────────────────────┘  │  │
         │   └──────────────────────────────┘  │
         │                                      │
         └────────────┬─────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
        ▼                         ▼
    PostgreSQL             Redis Cache
    (Persistent)           (Fast Access)
```

## Data Flow

### Enrichment Request Flow

```
1. USER/API REQUEST
   ┌─────────────────────────────────────┐
   │ POST /enrich                        │
   │ {                                   │
   │   "url": "https://example.com",    │
   │   "type": "company_website",       │
   │   "fields": ["name", "industry"]   │
   │ }                                   │
   └────────────┬────────────────────────┘
                │
2. API PROCESSING
   ├─ Validate input
   ├─ Normalize URL
   ├─ Check Redis cache
   └─ Create Trigger.dev task
                │
                ▼
3. QUEUE CREATION
   ┌─────────────────────────────────────┐
   │ Job added to Redis queue:           │
   │ {                                   │
   │   id: "job_123456",                │
   │   url: "https://example.com",      │
   │   type: "company_website",         │
   │   requiredFields: ["name", "..."]  │
   │ }                                   │
   └────────────┬────────────────────────┘
                │
4. WORKER PICKUP
   ├─ Listen to queue
   ├─ Dequeue job
   └─ Start pipeline
                │
                ▼
5. ENRICHMENT PIPELINE
   ├─ Stage 1: Cache Check
   │  └─ Miss → Continue
   ├─ Stage 2: LinkedIn Provider
   │  └─ Found: person_name (95% conf)
   ├─ Stage 3: Website Scraper
   │  └─ Found: company_industry (80% conf)
   ├─ Stage 4: Search Service
   │  └─ Found: company_size (70% conf)
   ├─ Stage 5: Gap Analysis
   │  └─ Missing: company_revenue
   ├─ Stage 6: LLM Fallback
   │  └─ Inferred: company_revenue (60% conf)
   └─ Stage 7: Merge & Validate
      └─ Result: All fields enriched
                │
                ▼
6. RESULT STORAGE
   ├─ Write to PostgreSQL
   └─ Cache in Redis (7 day TTL)
                │
                ▼
7. API RETURNS RESULT
   ┌─────────────────────────────────────┐
   │ {                                   │
   │   "status": "success",             │
   │   "data": {                        │
   │     "person_name": {               │
   │       "value": "John Doe",        │
   │       "confidence": 95,           │
   │       "source": "linkedin"        │
   │     },                            │
   │     ...                           │
   │   },                              │
   │   "costs": { ... }                │
   │ }                                   │
   └─────────────────────────────────────┘
```

## Monorepo Structure

### Complete Directory Tree

```
glaze/
│
├── apps/                      ← Application packages
│   │
│   ├── api/                   ← HTTP Server (Elysia)
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── server.ts      ← Server setup
│   │   │   ├── db.ts          ← Prisma client
│   │   │   ├── routes/        ← REST endpoints
│   │   │   │   ├── enrich.ts
│   │   │   │   ├── linkedin.ts
│   │   │   │   └── tables.ts
│   │   │   ├── services/      ← Business logic (will move to worker)
│   │   │   │   ├── enrichment-pipeline.ts
│   │   │   │   ├── enrichment-cache.ts
│   │   │   │   ├── enrichment-queue.ts
│   │   │   │   └── ...
│   │   │   ├── types/         ← API-specific types (deprecated)
│   │   │   └── utils/
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   └── migrations/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── README.md
│   │
│   ├── worker/                ← Background Process (NEW)
│   │   ├── src/
│   │   │   ├── index.ts       ← Entry point
│   │   │   ├── service.ts     ← Job queue listener
│   │   │   ├── pipeline.ts    ← Pipeline executor
│   │   │   └── providers/     ← Adapters (NEW)
│   │   │       ├── index.ts
│   │   │       ├── linkedin-provider.ts
│   │   │       ├── website-scraper.ts
│   │   │       ├── search-provider.ts
│   │   │       └── llm-provider.ts    ← LLM Isolated
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── README.md           ← Worker Documentation
│   │
│   ├── workflows/             ← Trigger.dev Tasks (NEW)
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   └── enrichment.ts  ← Task definitions
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── README.md           ← Workflows Documentation
│   │
│   └── web/                   ← Frontend (Next.js)
│       ├── app/
│       ├── components/
│       ├── lib/
│       ├── package.json
│       └── ...
│
├── packages/                  ← Shared packages
│   │
│   ├── types/                 ← Shared TypeScript Types (ENHANCED)
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── enrichment.ts  ← Job schemas
│   │   │   ├── linkedin.ts    ← LinkedIn types
│   │   │   ├── icp.ts         ← ICP types
│   │   │   └── api.ts         ← API response types
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── ui/                    ← Shared React Components
│   │   ├── src/
│   │   ├── package.json
│   │   └── ...
│   │
│   ├── trigger/               ← Legacy (being migrated)
│   │   ├── example.ts
│   │   └── package.json
│   │
│   ├── eslint-config/
│   ├── typescript-config/
│   └── ...
│
├── scripts/                   ← Development Helpers (ENHANCED)
│   ├── run-worker.sh          ← Start worker (NEW)
│   ├── run-workflows.sh       ← Start workflows (NEW)
│   ├── dev-all.sh             ← Start all services (NEW)
│   ├── docker-setup.sh
│   └── init-db.sql
│
├── docs/                      ← Architecture Documentation
│   ├── ENRICHMENT_MIGRATION.md
│   ├── ENRICHMENT_UNIFIED_API.md
│   ├── LINKEDIN_DATA_API.md
│   └── ...
│
├── CONTRIBUTORS.md            ← Development Guide (NEW)
├── RESTRUCTURE_SUMMARY.md     ← This Restructuring (NEW)
├── ARCHITECTURE.md            ← Architecture Guide (NEW)
├── README.md                  ← Main README (Updated)
│
├── package.json               ← Workspace root
├── pnpm-workspace.yaml
├── turbo.json
├── trigger.config.ts
├── docker-compose.yml
└── .env.example
```

## Key Improvements

### Before Restructuring
```
API Server (Monolithic)
├── Routes
├── Services (business logic)
├── DB models
├── Queue (embedded)
└── Worker (background)

packages/trigger/ (isolated)
├── Example tasks
└── Config

No shared type definitions
No worker documentation
```

### After Restructuring
```
API Server (Focused)
├── Routes only
├── Delegates to worker
└── Type-safe communication

Worker Process (Independent)
├── Pipeline executor
├── Provider adapters
├── Orchestration
└── Scaling ready

Workflows (Orchestration)
├── Task definitions
├── Scheduling
└── Trigger.dev integration

Shared Types (Centralized)
├── Enrichment schemas
├── LinkedIn types
├── ICP types
└── API response types
```

## Service Communication

### API ↔ Worker

```
API                              Worker
 │                                │
 ├─ Create Job ──────────────────→│
 │  (Redis Queue)                │
 │                               │
 ├─ Poll Job Status◄─────────────┤
 │  (Database/Redis)             │
 │                               │
 └─ Get Result ◄─────────────────┤
    (Database)                   │
```

**Protocol**: 
- Job Creation: Redis XADD
- Status Check: DB Query or Redis HGETALL
- Result Retrieval: PostgreSQL SELECT

### Workflows ↔ Worker

```
Workflows                        Worker
 │                                │
 ├─ Task.trigger() ──────────────→│
 │  (Create Job)                 │
 │                               │
 └─ Wait for Result ◄─────────────┤
    (Polling or Webhook)         │
```

## Configuration

### Environment Variables

#### API (`apps/api/.env`)
```env
DATABASE_URL=postgresql://...
PORT=3001
REDIS_URL=redis://localhost:6379
```

#### Worker (`apps/worker/.env`)
```env
DATABASE_URL=postgresql://...
REDIS_URL=redis://localhost:6379
CONCURRENCY=10
LLM_API_KEY=xxx
```

#### Workflows (`apps/workflows/.env`)
```env
TRIGGER_API_KEY=xxx
REDIS_URL=redis://localhost:6379
```

## Performance Characteristics

### Enrichment Pipeline Stages

| Stage | Duration | Cost | Confidence |
|-------|----------|------|-----------|
| Cache Hit | <10ms | $0 | 95% |
| LinkedIn | 500ms-2s | $0.01-0.05 | 95% |
| Website | 2-5s | $0 | 70% |
| Search | 1-2s | $0.02 | 80% |
| LLM | 1-3s | $0.02-0.05 | 60% |
| **Total** | **2-10s** | **$0.05-0.15** | **90%** |

### Scalability

**Single Worker Instance**:
- Jobs/min: 600 (with 10s avg duration)
- Concurrency: 10 parallel
- Memory: ~200MB

**Multiple Workers**:
- Add workers linearly
- Share Redis queue
- Load balance via queue

**Bottlenecks**:
- Provider API rate limits (LinkedIn)
- Database connection pool
- Redis memory
- LLM API quota

## Deployment

### Local Development
```bash
./scripts/dev-all.sh
```

### Production

**Option 1: Containerized**
```bash
docker-compose up -d
```

**Option 2: Systemd Services**
```bash
[Unit]
Description=Glaze Enrichment Worker

[Service]
Type=simple
ExecStart=/path/to/apps/worker/start.sh
Restart=on-failure
```

**Option 3: Kubernetes**
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: glaze-worker
spec:
  containers:
  - name: worker
    image: glaze:latest
    command: ["bun", "run", "apps/worker/src/index.ts"]
```

## Monitoring

### Key Metrics

```
Queue Depth
├─ Pending: jobs waiting
├─ Active: jobs processing
└─ Failed: jobs that errored

Processing
├─ Duration: avg time per job
├─ Throughput: jobs/min
└─ Success Rate: % completed

Costs
├─ Provider: API calls
├─ LLM: AI inferences
└─ Total: average per job
```

### Logging

All services use structured logging:

```
[service] [timestamp] [level] message {...context}

Examples:
[api] 2026-01-04T10:30:00Z [info] POST /enrich {"url":"..."}
[worker] 2026-01-04T10:30:01Z [info] Processing job_123 {"stage":"linkedin"}
[worker] 2026-01-04T10:30:05Z [info] Job completed {"duration":"4.2s"}
```

---

**For detailed implementation guides, see:**
- [CONTRIBUTORS.md](/CONTRIBUTORS.md) - Development setup
- [apps/worker/README.md](/apps/worker/README.md) - Worker details
- [apps/workflows/README.md](/apps/workflows/README.md) - Workflows details

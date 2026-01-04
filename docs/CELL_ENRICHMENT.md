# Cell-Level Enrichment System

This document describes the **cell-level enrichment architecture** for Glaze.

## Overview

The enrichment system is designed around **cells** as the atomic unit of work. Every enrichment operation ultimately breaks down into individual cell tasks, which are executed by workers and orchestrated by Trigger.dev.

### Key Principles

1. **Cell-first design**: The smallest unit of enrichment is a single cell (row × column intersection)
2. **Async by default**: All enrichment is queued and processed in the background
3. **Fake enrichment for development**: Uses deterministic fake data generators for testing
4. **Clean separation**: API queues tasks → Trigger.dev orchestrates → Workers execute

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Client/UI     │────▶│     API         │────▶│   Trigger.dev   │
│                 │     │  /tables/:id/   │     │   Workflow      │
│                 │     │    enrich       │     │                 │
└─────────────────┘     └────────┬────────┘     └────────┬────────┘
                                 │                       │
                                 │                       │
                        ┌────────▼────────┐     ┌────────▼────────┐
                        │    Postgres     │◀────│   Cell Tasks    │
                        │                 │     │   (Workers)     │
                        │  - Tables       │     │                 │
                        │  - Rows         │     │  Fake enrichment│
                        │  - Columns      │     │  logic per key  │
                        │  - Jobs         │     │                 │
                        │  - CellTasks    │     │                 │
                        └─────────────────┘     └─────────────────┘
```

## Data Model

### Core Tables

```prisma
Table
├── id
├── name
├── description
└── columns[], rows[], jobs[]

Column
├── id
├── tableId
├── key (stable identifier, e.g., "email")
├── label (display name)
├── dataType
└── order

Row
├── id
├── tableId
├── data (JSON - keyed by column.key)
├── status (idle | queued | running | done | failed | ambiguous)
├── confidence (0.0 - 1.0)
├── error
└── lastRunAt
```

### Enrichment Tables

```prisma
EnrichmentJob
├── id
├── tableId
├── status (pending | running | completed | failed | cancelled)
├── totalTasks
├── doneTasks
├── failedTasks
├── startedAt
├── completedAt
└── error

CellEnrichmentTask
├── id
├── tableId, rowId, columnId, jobId (references)
├── status (queued | running | done | failed)
├── result (JSON with value, confidence, source, timestamp)
├── confidence (0.0 - 1.0)
├── error
├── attempts
├── startedAt
└── completedAt
```

## API Endpoints

### Trigger Enrichment

```
POST /tables/:tableId/enrich
```

**Grid Mode** - Enrich all combinations of columns × rows:
```json
{
  "columnIds": ["col_email", "col_company"],
  "rowIds": ["row_1", "row_2", "row_3"]
}
```
This creates 6 cell tasks (2 columns × 3 rows).

**Explicit Mode** - Enrich specific cells:
```json
{
  "cellIds": [
    { "rowId": "row_1", "columnId": "col_email" },
    { "rowId": "row_3", "columnId": "col_company" }
  ]
}
```

**Response:**
```json
{
  "jobId": "abc123",
  "tableId": "table_xyz",
  "status": "pending",
  "totalTasks": 6,
  "message": "Created 6 enrichment tasks"
}
```

### Get Job Status

```
GET /tables/:tableId/enrich/jobs/:jobId
```

**Response:**
```json
{
  "jobId": "abc123",
  "status": "running",
  "totalTasks": 6,
  "doneTasks": 4,
  "failedTasks": 0,
  "progress": 67,
  "createdAt": "2024-01-15T10:00:00Z",
  "startedAt": "2024-01-15T10:00:01Z",
  "completedAt": null
}
```

### List Jobs

```
GET /tables/:tableId/enrich/jobs?page=1&limit=20
```

### List Tasks for a Job

```
GET /tables/:tableId/enrich/jobs/:jobId/tasks?status=failed&page=1&limit=50
```

## Enrichment Flow

```
1. User triggers enrichment
   POST /tables/:tableId/enrich { columnIds, rowIds }
   
2. API creates records (in transaction)
   ├── EnrichmentJob (status: pending)
   ├── CellEnrichmentTask[] (status: queued)
   └── Rows (status: queued)
   
3. API triggers Trigger.dev workflow
   tasks.trigger("process-enrichment-job", { jobId, taskIds })
   
4. Workflow orchestrates
   ├── Updates job status to "running"
   ├── Triggers enrichCellTask for each task (concurrently)
   └── Waits for all tasks to complete
   
5. Each cell task executes
   ├── Loads task, row, column
   ├── Runs fake enrichment logic based on column key
   ├── Writes result to Row.data[column.key]
   ├── Updates task with result + confidence
   └── Recalculates row status
   
6. Workflow completes
   └── Updates job status to "completed" or "failed"
```

## Row Status Aggregation

Row status is derived from its cell tasks:

| Cell Task States | Row Status |
|-----------------|------------|
| All done | `done` |
| Some failed, some done | `ambiguous` |
| All failed | `failed` |
| Any running | `running` |
| Any queued (none running) | `queued` |
| None created | `idle` |

## Fake Enrichment Logic

For development, the system uses deterministic fake data generators:

| Column Key Contains | Generated Value |
|--------------------|-----------------|
| `email` | `fake_{rowId}@example.com` |
| `company` | Random from ["Fake Corp", "Demo Inc", ...] |
| `title` | Random from ["Fake CEO", "Demo Manager", ...] |
| `bio` | "This is a fake bio for row {rowId}..." |
| `phone` | `+1-555-XXXX` |
| `linkedin` | `https://linkedin.com/in/fake-user-{rowId}` |
| `location` | Random from ["San Francisco, CA", ...] |
| `industry` | Random from ["Technology", "Finance", ...] |
| `employee` | Random number 50-5000 |
| `revenue` | `$XM` (random amount) |
| (default) | `Enriched: {columnKey} ({rowId})` |

## Local Development

### Prerequisites

- Node.js 18+
- PostgreSQL
- Redis (for BullMQ queue)
- Trigger.dev account (for orchestration)

### Setup

1. Install dependencies:
```bash
pnpm install
```

2. Set up environment variables:
```bash
# apps/api/.env
DATABASE_URL="postgresql://..."
REDIS_URL="redis://localhost:6379"

# Root .env for Trigger.dev
TRIGGER_SECRET_KEY="tr_dev_..."
```

3. Run database migrations:
```bash
cd apps/api
bunx prisma migrate dev
```

4. Seed the database:
```bash
cd apps/api
bun run seed
```

5. Start the API server:
```bash
cd apps/api
bun run dev
```

6. Start Trigger.dev dev mode:
```bash
# From repo root
npx trigger.dev dev
```

### Testing the Flow

1. Seed creates a "Leads" table with 10 rows and 8 columns
2. Use the logged IDs to test enrichment:

```bash
# Grid mode - enrich email and company for 3 rows
curl -X POST http://localhost:3001/tables/{tableId}/enrich \
  -H "Content-Type: application/json" \
  -d '{
    "columnIds": ["{emailColumnId}", "{companyColumnId}"],
    "rowIds": ["{row1Id}", "{row2Id}", "{row3Id}"]
  }'

# Check job status
curl http://localhost:3001/tables/{tableId}/enrich/jobs/{jobId}
```

## Extending for Production

To add real enrichment providers:

1. **Replace fake logic in `cell-enrichment.ts`**:
   - Add provider adapters (LinkedIn, Hunter, etc.)
   - Implement caching layer
   - Add LLM fallback for synthesis

2. **Add cost tracking**:
   - Track API calls per provider
   - Implement budget limits per job

3. **Add provenance**:
   - Store source of each enriched value
   - Track confidence from each provider

4. **Add real-time updates**:
   - WebSocket/SSE for job progress
   - Push updates to connected clients

## File Structure

```
apps/
├── api/
│   ├── prisma/
│   │   ├── schema.prisma      # Data models
│   │   └── seed.ts            # Seed script
│   └── src/
│       └── routes/
│           └── cell-enrich.ts # Enrichment API
│
└── workflows/
    └── src/
        └── cell-enrichment.ts # Trigger.dev tasks

packages/
└── types/
    └── src/
        └── cell-enrichment.ts # Shared types
```

## Key Decisions

1. **Why cell-level?**
   - Maximum flexibility for partial enrichment
   - Better retry granularity (failed cells don't block others)
   - Clearer progress tracking

2. **Why Trigger.dev?**
   - Handles retries, concurrency, and observability
   - No need to manage worker infrastructure
   - Built-in queue and rate limiting

3. **Why fake enrichment?**
   - Allows testing the full flow without external APIs
   - Deterministic for debugging
   - Easy to swap for real providers later

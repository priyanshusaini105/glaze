# Glaze Backend – Implementation TODO

## Phase 0 – Analysis
- [x] Review existing repo structure
- [x] Review Prisma schema
- [x] Review existing API routes
- [x] Review existing Trigger.dev setup
- [x] Identify minimal required changes

### Analysis Summary
- Row already has lifecycle fields (status, confidence, error, lastRunAt) ✅
- Trigger.dev configured at root with `trigger.config.ts` ✅
- Worker infrastructure migrated from BullMQ to Trigger.dev ✅
- Workflows exist in `apps/workflows` ✅
- **Added**: CellEnrichmentTask model
- **Added**: EnrichmentJob model for batch tracking
- **Added**: Cell-level enrichment API endpoint

## Phase 1 – Data Model
- [x] Add Row lifecycle fields (status, confidence, error, lastRunAt) – ALREADY EXISTS
- [x] Add CellEnrichmentTask model
- [x] Add EnrichmentJob model for tracking batch jobs
- [x] Create Prisma migration file
- [x] Add shared types in @repo/types

## Phase 2 – API Layer
- [x] Implement POST /tables/:tableId/enrich
- [x] Support columnIds + rowIds payload (Grid Mode)
- [x] Support explicit cellIds payload (Explicit Mode)
- [x] Mark rows as queued
- [x] Create EnrichmentJob record
- [x] Trigger Trigger.dev workflow
- [x] Add GET /tables/:tableId/enrich/jobs for job listing
- [x] Add GET /tables/:tableId/enrich/jobs/:jobId for job status
- [x] Add GET /tables/:tableId/enrich/jobs/:jobId/tasks for task listing

## Phase 3 – Trigger.dev Orchestration
- [x] Create workflow entry file (cell-enrichment.ts)
- [x] Accept jobId as input
- [x] Load CellEnrichmentTask IDs
- [x] Enqueue tasks with concurrency control
- [x] Update job status on completion
- [x] Update trigger.config.ts to include workflows dir

## Phase 4 – Worker
- [x] Implement enrichCellTask in Trigger.dev
- [x] Fake enrichment logic per column key
- [x] Persist result + confidence to CellEnrichmentTask
- [x] Update Row.data with enriched values
- [x] Recalculate Row status from cell tasks
- [x] Aggregate confidence across cells

## Phase 5 – Seed & Fake Data
- [x] Create seed script with sample data
- [x] Add seed command to package.json
- [x] Configure prisma.config.ts for seeding

## Phase 6 – Documentation
- [x] README: architecture overview
- [x] README: enrichment flow
- [x] README: local dev instructions
- [x] README: API endpoint documentation

---

## Post-Implementation Steps (Manual)

To complete setup, run these commands:

```bash
# 1. Install dependencies
cd /home/priyanshu/dev/personal/glaze
pnpm install

# 2. Generate Prisma client and run migration
cd apps/api
bunx prisma generate
bunx prisma migrate dev

# 3. Seed the database
bun run seed

# 4. Start the API server
bun run dev

# 5. Start Trigger.dev (in another terminal, from repo root)
npx trigger.dev dev
```

---

## Files Created/Modified

### New Files
- `apps/api/src/routes/cell-enrich.ts` - Cell enrichment API routes
- `apps/api/prisma/seed.ts` - Seed script
- `apps/api/prisma/migrations/20260104_add_cell_enrichment/migration.sql` - Migration
- `apps/workflows/src/cell-enrichment.ts` - Trigger.dev workflow tasks
- `packages/types/src/cell-enrichment.ts` - Shared types
- `docs/CELL_ENRICHMENT.md` - Documentation

### Modified Files
- `apps/api/prisma/schema.prisma` - Added new models
- `apps/api/prisma.config.ts` - Added seed config
- `apps/api/package.json` - Added dependencies and scripts
- `apps/api/src/server.ts` - Registered new routes
- `apps/workflows/package.json` - Added dependencies
- `apps/workflows/src/index.ts` - Export new workflow
- `packages/types/src/index.ts` - Export new types
- `trigger.config.ts` - Added workflows dir

---

## Architecture Summary

```
User Request
    │
    ▼
POST /tables/:tableId/enrich
    │
    ├── Validate input (columnIds/rowIds or cellIds)
    ├── Create EnrichmentJob (status: pending)
    ├── Create CellEnrichmentTask[] (status: queued)
    ├── Update affected Rows (status: queued)
    └── Trigger workflow: process-enrichment-job
            │
            ▼
    Trigger.dev Workflow
            │
            ├── Update job status: running
            ├── For each taskId:
            │   └── enrichCellTask.triggerAndWait()
            │           │
            │           ├── Load task, row, column
            │           ├── Generate fake enrichment
            │           ├── Update Row.data[column.key]
            │           ├── Update CellEnrichmentTask (done/failed)
            │           └── Recalculate Row.status
            │
            └── Update job status: completed/failed
```

## Notes
- Using Trigger.dev for both orchestration AND worker execution
- BullMQ worker has been completely replaced by Trigger.dev workflows
- Fake enrichment uses deterministic hash for consistent test data
- Row status is automatically aggregated from its cell task statuses

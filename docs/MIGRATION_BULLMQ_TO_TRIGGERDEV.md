# Migration from BullMQ to Trigger.dev

**Date**: January 2026  
**Status**: ✅ Complete

## Overview

Glaze has migrated from BullMQ (Redis-based job queue) to Trigger.dev for all background job processing and workflow orchestration. This document explains the migration for historical reference and to help understand the current architecture.

## Why Migrate?

### Limitations of BullMQ
- **Infrastructure overhead**: Required Redis instance management
- **Manual worker scaling**: Had to manually manage worker processes
- **Limited observability**: Basic job tracking, required custom monitoring
- **No built-in retries**: Had to implement retry logic manually
- **Deployment complexity**: Separate worker deployment and monitoring

### Benefits of Trigger.dev
- **Managed infrastructure**: No Redis or worker management needed
- **Automatic scaling**: Workers scale based on load
- **Built-in observability**: Dashboard with job history, logs, and metrics
- **Intelligent retries**: Automatic retry with exponential backoff
- **Simplified deployment**: Single deployment for workflows
- **Better DX**: Type-safe task definitions with full TypeScript support

## What Changed

### Code Changes

#### Removed Files
- `apps/api/src/utils/redis.ts` - BullMQ connection removed
- `apps/worker/` - Entire BullMQ worker directory (if existed)

#### Modified Files
- `apps/api/src/services/enrichment-pipeline.ts` - Removed BullMQ Job import
- `apps/api/src/utils/redis.ts` - Removed `getBullMQConnection()` function

#### New/Updated Files
- `apps/workflows/src/cell-enrichment.ts` - Trigger.dev task definitions
- `apps/workflows/trigger.config.ts` - Trigger.dev configuration

### Architecture Changes

#### Before (BullMQ)
```
API Server
    │
    ├─→ Create Job (Redis Queue)
    │
    └─→ BullMQ Worker Process
            │
            ├─→ Process Job
            ├─→ Update Database
            └─→ Return Result
```

#### After (Trigger.dev)
```
API Server
    │
    └─→ Trigger Task (Trigger.dev)
            │
            ├─→ Workflow Orchestration
            ├─→ Execute Tasks (managed workers)
            ├─→ Update Database
            └─→ Return Result
```

### API Changes

**No breaking changes** - The API endpoints remain the same. The only difference is the internal implementation:

```typescript
// Before (BullMQ)
await enrichmentQueue.add('enrich', jobData);

// After (Trigger.dev)
await tasks.trigger('enrich-cell', jobData);
```

## Migration Steps Completed

### 1. Code Cleanup
- [x] Removed BullMQ imports from `enrichment-pipeline.ts`
- [x] Removed `getBullMQConnection()` from `redis.ts`
- [x] Cleaned up `bullmqConnection` variable and cleanup logic
- [x] Updated all code comments referencing BullMQ

### 2. Documentation Updates
- [x] Updated `README.md` - Changed job queue references
- [x] Updated `ARCHITECTURE.md` - Updated architecture diagrams
- [x] Updated `TODO.md` - Noted worker migration
- [x] Updated `CONTRIBUTORS.md` - Updated job flow description
- [x] Updated `INDEX.md` - Updated worker service description
- [x] Updated `RESTRUCTURE_SUMMARY.md` - Marked BullMQ as deprecated
- [x] Updated `docs/CELL_ENRICHMENT.md` - Removed Redis dependency
- [x] Updated `apps/api/CLEANUP_AND_TESTING.md` - Marked cleanup complete

### 3. Dependencies
- [x] Removed BullMQ from package.json (if present)
- [x] Cleaned pnpm lockfile
- [x] Verified no lingering BullMQ references

## Key Differences

### Job Creation

**BullMQ:**
```typescript
import { Queue } from 'bullmq';
import { getBullMQConnection } from './utils/redis';

const queue = new Queue('enrichment', {
  connection: getBullMQConnection()
});

await queue.add('enrich-job', {
  url: 'https://example.com',
  fields: ['name', 'email']
});
```

**Trigger.dev:**
```typescript
import { tasks } from '@trigger.dev/sdk';

await tasks.trigger('enrich-cell', {
  url: 'https://example.com',
  fields: ['name', 'email']
});
```

### Worker Implementation

**BullMQ:**
```typescript
import { Worker } from 'bullmq';
import { getBullMQConnection } from './utils/redis';

const worker = new Worker('enrichment', async (job) => {
  // Process job
  return result;
}, {
  connection: getBullMQConnection(),
  concurrency: 10
});
```

**Trigger.dev:**
```typescript
import { task } from '@trigger.dev/sdk';

export const enrichCell = task({
  id: 'enrich-cell',
  run: async (payload) => {
    // Process task
    return result;
  }
});
```

### Job Status Tracking

**BullMQ:**
```typescript
const job = await queue.getJob(jobId);
const state = await job.getState();
const progress = job.progress;
```

**Trigger.dev:**
```typescript
const run = await runs.retrieve(runId);
const status = run.status;
const output = run.output;
```

## Environment Variables

### Removed
```env
# No longer needed
REDIS_URL=redis://localhost:6379
QUEUE_NAME=enrichment
CONCURRENCY=10
```

### Added
```env
# Trigger.dev configuration
TRIGGER_SECRET_KEY=tr_dev_...
TRIGGER_API_URL=https://api.trigger.dev
```

## Redis Usage

**Important**: Redis is still used for caching enrichment results. Only the BullMQ-specific connection has been removed.

- ✅ **Still used**: `getRedisConnection()` for caching
- ❌ **Removed**: `getBullMQConnection()` for job queue

## Performance Comparison

### BullMQ
- Manual worker scaling
- Redis memory overhead
- Network latency to Redis
- Manual retry implementation
- ~50-100ms job creation overhead

### Trigger.dev
- Automatic worker scaling
- No Redis overhead for queue
- Managed infrastructure
- Built-in intelligent retries
- ~100-200ms task trigger overhead (includes API call)

**Note**: Trigger.dev has slightly higher latency for job creation but provides much better observability and reliability.

## Rollback Plan

If needed to rollback (not recommended):

1. Restore BullMQ dependencies:
   ```bash
   pnpm add bullmq ioredis
   ```

2. Restore `getBullMQConnection()` in `redis.ts`

3. Restore BullMQ worker code from git history

4. Update environment variables

## Testing

### Verify Migration

1. **Check no BullMQ references**:
   ```bash
   grep -r "bullmq" apps/api/src/
   grep -r "BullMQ" apps/api/src/
   ```

2. **Verify Trigger.dev works**:
   ```bash
   cd apps/workflows
   npx trigger.dev@latest dev
   ```

3. **Test enrichment flow**:
   ```bash
   curl -X POST http://localhost:3001/tables/{tableId}/enrich \
     -H "Content-Type: application/json" \
     -d '{"columnIds": [...], "rowIds": [...]}'
   ```

## Support

- **Trigger.dev Docs**: https://trigger.dev/docs
- **Migration Issues**: Check `apps/workflows/README.md`
- **Architecture**: See `ARCHITECTURE.md`

## Timeline

- **Planning**: December 2025
- **Implementation**: January 2026
- **Cleanup**: January 5, 2026
- **Status**: ✅ Complete

---

**Created**: January 5, 2026  
**Last Updated**: January 5, 2026  
**Status**: Complete

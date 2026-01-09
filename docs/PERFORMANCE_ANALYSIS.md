# Performance Analysis - Table Loading & Enrichment

## Executive Summary

Two major performance bottlenecks have been identified:

1. **Slow "Loading table data..." issue** - Multiple sequential API calls with N+1 query pattern
2. **Slow enrichment process** - Sequential task execution and missing database indexes

---

## 1. Table Loading Performance Issues

### Root Causes

#### Issue #1: Sequential API Calls (Waterfall Loading)
**Location**: `apps/web/app/(dashboard)/tables/[tableId]/page.tsx` lines 105-144

The `loadData` function makes **3 sequential API calls**:

```typescript
// 1. Load all tables for sidebar
const { data: allTables } = await typedApi.getTables();

// 2. Load current table details with columns  
const { data: tableDetails } = await typedApi.getTable(tableId);

// 3. Load rows
const { data: rowsData } = await typedApi.getRows(tableId);
```

**Impact**: If each call takes 200ms, total load time = **600ms minimum** (plus network overhead)

**Solution**: Make calls in parallel where possible:
```typescript
const [allTables, tableDetails, rowsData] = await Promise.all([
  typedApi.getTables(),
  typedApi.getTable(tableId),
  typedApi.getRows(tableId)
]);
```

#### Issue #2: Missing Database Indexes
**Location**: `apps/api/prisma/schema.prisma`

The `Row` model lacks critical indexes for common query patterns:

```prisma
model Row {
  id         String     @id @default(uuid())
  tableId    String      // ❌ NO INDEX!
  // ... other fields
}
```

**Impact**: 
- `GET /tables/:id/rows` query filters by `tableId` without an index
- On tables with 10,000+ rows, this becomes a **full table scan**
- Query time can degrade from <10ms to >500ms

**Solution**: Add index:
```prisma
@@index([tableId])
@@index([tableId, createdAt])  // For common orderBy pattern
```

#### Issue #3: Inefficient Row Loading
**Location**: `apps/api/src/routes/tables.ts` lines 174-195

The rows endpoint has default pagination but always fetches:
- Default limit: 50 rows
- Frontend doesn't specify limits
- No lazy loading or virtualization

**Impact**: Loading 1000+ rows causes:
- Large JSON payload download (100KB+)
- Slow JSON parsing
- Heavy memory usage in browser

**Solution**: 
- Reduce default limit to 100
- Implement virtual scrolling in the frontend
- Add row count caching

---

## 2. Enrichment Performance Issues

### Root Causes

#### Issue #1: Sequential Task Execution (CRITICAL)
**Location**: `apps/workflows/src/cell-enrichment.ts` lines 283-287

```typescript
const allRuns = await Promise.all(
  taskIds.map((taskId) =>
    enrichCellTask.triggerAndWait({ taskId })  // ❌ Each task waits synchronously!
  )
);
```

**Impact**:
- If each cell takes 2 seconds to enrich
- 50 cells × 2s = **100 seconds total**
- The `triggerAndWait` waits for each task despite Promise.all

**Expected Behavior**: 
- With concurrency limit of 10, should complete in ~10 seconds
- But `triggerAndWait` may be blocking the orchestration

**Solution**: Use `trigger` instead of `triggerAndWait` for fire-and-forget:
```typescript
// Option 1: Fire and forget
await Promise.all(
  taskIds.map((taskId) => enrichCellTask.trigger({ taskId }))
);

// Option 2: Use batch trigger API
await enrichCellTask.batchTrigger(
  taskIds.map((taskId) => ({ payload: { taskId } }))
);
```

#### Issue #2: N+1 Query in Row Status Recalculation
**Location**: `apps/workflows/src/cell-enrichment.ts` lines 203-231

```typescript
async function recalculateRowStatus(rowId: string): Promise<void> {
  const cellTasks = await getPrisma().cellEnrichmentTask.findMany({
    where: { rowId },  // ❌ Called after EVERY cell completes!
    select: { status: true, confidence: true },
  });
  // ... aggregate and update
}
```

**Impact**:
- Called after EVERY cell enrichment (line 145)
- For 50 cells on same row = **50 duplicate queries**
- Each query fetches ALL tasks for that row

**Solution**: 
- Debounce/batch row status updates
- Only recalculate once after all cells in a row complete
- Or move to a background job

#### Issue #3: Missing Indexes on CellEnrichmentTask
**Current indexes**:
```prisma
@@index([jobId])
@@index([status])
@@index([rowId])
@@index([columnId])
```

**Missing composite index** for common query:
```typescript
// This query is used heavily but not optimized:
await prisma.cellEnrichmentTask.findMany({
  where: { rowId, status: 'done' }  // ❌ No composite index!
});
```

**Solution**: Add composite index:
```prisma
@@index([rowId, status])
@@index([jobId, status])
```

#### Issue #4: Frontend Polling Overhead
**Location**: `apps/web/app/(dashboard)/tables/[tableId]/page.tsx` lines 360-393

```typescript
const pollInterval = 1000; // 1 second
const maxAttempts = 120;    // 2 minutes

const pollForCompletion = async (): Promise<boolean> => {
  const { data: jobStatus } = await typedApi.getEnrichmentJobStatus(tableId, enrichJob.jobId);
  // ... check status
  await new Promise(resolve => setTimeout(resolve, pollInterval));
  return pollForCompletion(); // ❌ Recursive polling
};
```

**Impact**:
- 120 API calls over 2 minutes
- Wastes bandwidth and server resources
- No exponential backoff

**Solution**: 
- Increase poll interval (2-5 seconds)
- Use exponential backoff: 1s → 2s → 4s → 5s (max)
- Implement WebSocket/SSE for real-time updates

---

## 3. Priority Fixes & Expected Impact

### Priority 1: Critical (Do First) ⚡

| Fix | Location | Expected Improvement | Effort |
|-----|----------|---------------------|---------|
| Add `Row.tableId` index | `schema.prisma` | **5-10x faster table loading** | 5 min |
| Parallelize table data loading | `page.tsx` | **40-60% faster page load** | 10 min |
| Fix enrichment task execution | `cell-enrichment.ts` | **50-90% faster enrichment** | 15 min |

### Priority 2: High (Do Next) 🔥

| Fix | Location | Expected Improvement | Effort |
|-----|----------|---------------------|---------|
| Reduce row loading limit | `tables.ts` | **30-50% faster rendering** | 5 min |
| Debounce row status updates | `cell-enrichment.ts` | **70-85% fewer DB queries** | 20 min |
| Add composite indexes | `schema.prisma` | **2-5x faster enrichment queries** | 5 min |

### Priority 3: Medium (Nice to Have) 📈

| Fix | Location | Expected Improvement | Effort |
|-----|----------|---------------------|---------|
| Implement virtual scrolling | `page.tsx` | Better UX for large tables | 2-3 hours |
| Optimize polling strategy | `page.tsx` | **50-70% fewer API calls** | 30 min |
| Add Redis caching | API layer | Faster repeated queries | 1-2 hours |

---

## 4. Recommended Implementation Order

### Step 1: Database Optimizations (15 minutes)

1. Add missing indexes to `schema.prisma`
2. Run `npx prisma migrate dev --name add_performance_indexes`
3. Restart API server

### Step 2: Frontend Loading Fix (15 minutes)

1. Update `loadData()` to use `Promise.all`
2. Test table loading speed
3. Verify no regressions

### Step 3: Enrichment Fix (30 minutes)

1. Change `triggerAndWait` to `trigger` or `batchTrigger`
2. Implement debounced row status updates
3. Test enrichment flow end-to-end

### Step 4: Fine-tuning (1 hour)

1. Reduce row loading limits
2. Implement better polling strategy
3. Add monitoring/logging for performance metrics

---

## 5. Detailed Code Changes

See the following sections for specific file changes...

---

## 6. Monitoring & Validation

After implementing fixes, measure:

1. **Table Load Time**: Should be < 500ms
2. **Row Query Time**: Should be < 100ms for tables with 10K rows
3. **Enrichment Time**: Should be ~(cells / concurrency) × avg_cell_time
4. **API Call Count**: Should reduce by 60-80%

Use browser DevTools Network tab and API server logs to validate improvements.

---

## 7. Additional Recommendations

### Caching Strategy
- Cache table schemas (columns) in Redis (TTL: 5 minutes)
- Use `stale-while-revalidate` for non-critical data
- Implement optimistic UI updates

### Database Connection Pooling
- Ensure Prisma connection pool is configured:
  ```
  DATABASE_URL="postgresql://...?connection_limit=10&pool_timeout=20"
  ```

### API Response Compression
- Enable gzip/brotli compression in Elysia
- Reduce JSON payload size by 60-80%

### Frontend Optimizations
- Use React Query for data fetching & caching
- Implement infinite scroll for rows
- Add loading skeletons instead of blank screens

---

## Conclusion

The main performance issues are:
1. ❌ Sequential API calls (easy fix)
2. ❌ Missing database indexes (easy fix)  
3. ❌ Inefficient enrichment orchestration (medium fix)

**Expected Total Improvement**: **5-10x faster** for common operations

Estimated fix time: **1-2 hours** for Priority 1 & 2 fixes

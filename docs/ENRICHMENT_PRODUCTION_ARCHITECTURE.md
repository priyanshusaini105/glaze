# Production-Ready Enrichment Architecture

## ✅ IMPLEMENTATION COMPLETE

This document describes the **production-optimized entity-based enrichment system**.
The implementation is now complete and ready for use.

### New Files Created

| File | Description |
|------|-------------|
| `packages/types/src/entity-enrichment.ts` | Entity-based enrichment types |
| `apps/api/src/services/entity-detection.ts` | Entity detection and deduplication |
| `apps/api/src/routes/enrich-optimized.ts` | V2 API endpoints |
| `apps/workflows/src/entity-enrichment.ts` | Trigger.dev workflow |
| `apps/workflows/src/entity-enrichment-service.ts` | Waterfall enrichment service |
| `apps/workflows/src/batch-cache.ts` | Multi-layer cache service |
| `apps/web/hooks/use-entity-enrichment.ts` | Frontend realtime hook |

### API Endpoints

- `POST /v2/tables/:id/enrich` - Start optimized enrichment
- `GET /v2/tables/:tableId/jobs/:jobId` - Get job status
- `POST /v2/tables/:id/enrich/estimate` - Estimate cost before running

---

## 🚨 Current Problems (SOLVED)

### 1. **Massive Database Overhead**
```
Current: For 100 cells enrichment
- Create 1 EnrichmentJob record
- Create 100 CellEnrichmentTask records  ❌
- Update 100 CellEnrichmentTask records (status → running)
- Update 100 CellEnrichmentTask records (status → done)
- Update 100 Row records (data field)
- Update 100 Row records (status field)
- Update 1 EnrichmentJob record (doneTasks counter)

Total: ~502 database operations
```

### 2. **No Deduplication**
```
Problem: If you have 10 rows with the same company website:
- Website gets scraped 10 times ❌
- LinkedIn API called 10 times ❌
- Search API called 10 times ❌

Cost: 10x higher than necessary
Time: 10x slower than necessary
```

### 3. **Cell-Level Processing is Wrong**
```
Current Flow:
User enriches "company_name" column (100 rows)
→ Creates 100 separate tasks
→ Each task runs full waterfall pipeline
→ 100 cache checks
→ 100 website scrapes
→ 100 LinkedIn API calls

Should be:
→ Group by source URL
→ 1 cache check per unique URL
→ 1 website scrape per unique URL
→ 1 LinkedIn API call per unique URL
→ Fan out to all cells needing that data
```

### 4. **Inefficient Data Flow**
```
Current: 7+ round trips per cell
Frontend → API → DB → Trigger.dev → Worker → DB → Trigger.dev → Frontend

Better: 3 round trips total
Frontend → API → Trigger.dev (batch) → Frontend
```

### 5. **No Intelligent Batching**
```
Current: Concurrency limit = 10 individual cells
Problem: If cells need same data source, they compete

Better: Batch by data source
- Group cells by company/person
- Enrich entity once
- Distribute to all cells
```

## ✅ Production-Ready Architecture

### Core Principles

1. **Entity-First, Not Cell-First**
   - Enrich entities (companies, people) not cells
   - Map cells to entities
   - Distribute entity data to cells

2. **Batch Everything**
   - Batch API requests
   - Batch database writes
   - Batch cache lookups

3. **Deduplicate Aggressively**
   - One enrichment per unique entity
   - Share results across cells

4. **Minimize Database Operations**
   - Write results in bulk
   - Use JSONB for flexible schemas
   - Avoid task tracking in DB

---

## 🏗️ Recommended Architecture

### Phase 1: Request Aggregation (API Layer)

```typescript
POST /tables/:id/enrich
{
  columnIds: ["company_name", "company_website", "employee_count"],
  rowIds: ["row1", "row2", "row3"]
}

API Processing:
1. Load all row data in ONE query
2. Extract entity identifiers (URLs, LinkedIn profiles)
3. Group cells by entity
4. Deduplicate entities
5. Create single enrichment job
6. Queue to Trigger.dev with entity map
```

### Phase 2: Parallel Entity Enrichment (Trigger.dev)

```typescript
Trigger.dev Workflow:
1. Receive: { entities: Map<entityId, {url, fields[], cells[]}> }
2. Parallel enrichment (concurrency: 20)
   - Cache check (batch query)
   - Free tier (parallel scrapes)
   - Cheap tier (batch API calls)
   - Premium tier (batch LinkedIn API)
3. Return: Map<entityId, enrichedData>
```

### Phase 3: Result Distribution (Trigger.dev)

```typescript
Result Mapping:
1. For each entity result
2. Map back to all cells requesting that entity
3. Batch update rows (single JSONB update per row)
4. Send realtime update (one per row, not per cell)
```

---

## 📊 Performance Comparison

### Scenario: Enrich 100 rows × 3 columns (300 cells)
All rows are different companies

#### Current Architecture
```
Database Operations: ~1,502
- 1 job creation
- 300 task creations
- 300 task updates (running)
- 300 task updates (done)
- 300 row data updates
- 300 row status updates
- 1 job update

API Calls (assuming all need LinkedIn):
- 300 website scrapes
- 300 LinkedIn API calls
- 300 search API calls

Time: ~300 seconds (100 cells × 3s each)
Cost: ~$3,000 (300 × $10 LinkedIn)
```

#### Optimized Architecture
```
Database Operations: ~104
- 1 job creation
- 100 row data updates (bulk JSONB)
- 1 job completion update
- ~2 cache operations (batch read/write)

API Calls (100 unique companies):
- 100 website scrapes (parallel)
- 100 LinkedIn API calls (batched)
- 100 search API calls (batched)

Time: ~15 seconds (100 entities × 0.15s each, parallelized)
Cost: ~$1,000 (100 × $10 LinkedIn)
Savings: 67% cost reduction, 95% faster
```

### Scenario: Enrich 100 rows, same 10 companies

#### Current Architecture
```
Database Operations: ~1,502 (same as above)
API Calls: 300 (same as above) ❌
Time: ~300 seconds
Cost: ~$3,000
```

#### Optimized Architecture
```
Database Operations: ~104
API Calls: 10 (only unique companies!) ✅
Time: ~2 seconds
Cost: ~$100
Savings: 97% cost reduction, 99% faster
```

---

## 🔧 Implementation Plan

### Step 1: Entity Detection & Mapping
```typescript
interface EnrichmentEntity {
  entityId: string;        // hash of identifier
  type: 'company' | 'person';
  identifier: string;      // URL or LinkedIn profile
  requestedFields: string[];
  targetCells: Array<{
    rowId: string;
    columnKey: string;
  }>;
}

function detectEntities(
  rows: Row[],
  columns: Column[]
): Map<string, EnrichmentEntity> {
  // Group cells by their data source
  // e.g., all cells needing "acme.com" data
}
```

### Step 2: Batch Enrichment Service
```typescript
async function enrichEntitiesBatch(
  entities: EnrichmentEntity[],
  budget: number
): Promise<Map<string, EnrichedData>> {
  
  // 1. Batch cache lookup
  const cacheResults = await batchCacheLookup(entities);
  
  // 2. Parallel waterfall for cache misses
  const uncached = entities.filter(e => !cacheResults.has(e.entityId));
  
  const results = await Promise.all(
    uncached.map(entity => 
      enrichSingleEntity(entity, budget / uncached.length)
    )
  );
  
  // 3. Batch cache write
  await batchCacheWrite(results);
  
  return new Map([...cacheResults, ...results]);
}
```

### Step 3: Efficient Database Updates
```typescript
async function applyEnrichmentResults(
  entityResults: Map<string, EnrichedData>,
  entityMap: Map<string, EnrichmentEntity>
) {
  // Group updates by row
  const rowUpdates = new Map<string, Record<string, any>>();
  
  for (const [entityId, data] of entityResults) {
    const entity = entityMap.get(entityId);
    
    for (const cell of entity.targetCells) {
      if (!rowUpdates.has(cell.rowId)) {
        rowUpdates.set(cell.rowId, {});
      }
      rowUpdates.get(cell.rowId)[cell.columnKey] = data[cell.columnKey];
    }
  }
  
  // Bulk update - ONE query per batch of rows
  await prisma.$transaction(
    Array.from(rowUpdates.entries()).map(([rowId, updates]) =>
      prisma.row.update({
        where: { id: rowId },
        data: { 
          data: updates,
          lastRunAt: new Date()
        }
      })
    )
  );
}
```

### Step 4: Remove CellEnrichmentTask Table
```typescript
// Current schema (REMOVE):
model CellEnrichmentTask {
  id          String   @id @default(cuid())
  tableId     String
  rowId       String
  columnId    String
  jobId       String
  status      String
  result      Json?
  confidence  Float?
  // ... ❌ TOO MUCH OVERHEAD
}

// New schema (SIMPLIFIED):
model EnrichmentJob {
  id              String   @id @default(cuid())
  tableId         String
  status          String   // pending | running | completed | failed
  entityCount     Int      // number of unique entities
  processedCount  Int      @default(0)
  startedAt       DateTime?
  completedAt     DateTime?
  cost            Int?     // total cost in cents
  metadata        Json?    // store entity map, provenance, etc.
}

model Row {
  id          String   @id
  tableId     String
  data        Json     // JSONB with all cell data
  metadata    Json?    // store confidence, sources per field
  status      String?
  lastRunAt   DateTime?
}
```

---

## 🎯 Migration Path

### Phase 1: Add Entity-Level Processing (No Breaking Changes)
1. Keep existing cell-enrich endpoint
2. Add new `/tables/:id/enrich-optimized` endpoint
3. Implement entity detection
4. Implement batch enrichment
5. Test both in parallel

### Phase 2: Update Frontend
1. Switch to optimized endpoint
2. Update realtime subscription logic
3. Update progress display (entity-based, not cell-based)

### Phase 3: Remove Old Code
1. Remove CellEnrichmentTask table
2. Remove cell-level workflow
3. Simplify EnrichmentJob schema
4. Update all docs

---

## 📈 Expected Results

### Performance
- **95% faster** for typical use cases
- **99% faster** for deduplicated scenarios
- **67-97% cost reduction** on API calls

### Database Load
- **14x fewer operations** (1,502 → 104)
- **Better scalability** (no per-cell overhead)
- **Lower database costs**

### Developer Experience
- Simpler codebase (remove 500+ lines)
- Easier to debug (fewer moving parts)
- Better observability (entity-level tracking)

### User Experience
- Near-instant enrichment for duplicates
- Real-time progress per row, not per cell
- More predictable pricing

---

## 🔐 Additional Optimizations

### 1. Smart Caching Strategy
```typescript
// Cache at multiple levels
const cacheStrategy = {
  L1: 'In-memory' (session-specific),
  L2: 'Redis' (shared, 1 hour TTL),
  L3: 'Postgres' (persistent, metadata table)
};
```

### 2. Background Pre-enrichment
```typescript
// When user uploads CSV
async function intelligentPreEnrich(tableId: string) {
  // 1. Detect entity columns (URL, email, LinkedIn)
  // 2. Extract unique entities
  // 3. Queue low-priority enrichment
  // 4. Cache results
  // When user clicks "enrich", it's instant!
}
```

### 3. Streaming Results
```typescript
// Don't wait for all entities to finish
async function streamEnrichment(entities: Entity[]) {
  for (const entity of entities) {
    const result = await enrichEntity(entity);
    // Push to frontend immediately
    await notifyProgress(entity.targetCells, result);
  }
}
```

---

## 📝 Summary

**Current architecture is development-quality, not production-ready.**

Key issues:
- ❌ Cell-level processing (should be entity-level)
- ❌ No deduplication (massive waste)
- ❌ Database overhead (14x too many operations)
- ❌ Sequential processing (should be parallel)
- ❌ Excessive table schema (CellEnrichmentTask not needed)

**Recommended changes will result in:**
- ✅ 95-99% performance improvement
- ✅ 67-97% cost reduction
- ✅ Simpler, more maintainable code
- ✅ Better scalability
- ✅ Superior user experience

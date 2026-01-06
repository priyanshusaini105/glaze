# Run Agent Flow - Detailed Walkthrough

This document provides a complete dry-run of what happens when you select cells by dragging over them and click the "Run Agent" button in the Glaze application.

## Demo Recording

The browser recording showing the actual interaction is available at:
`file:///home/priyanshu/.gemini/antigravity/brain/939bf1d1-f9b0-45d7-9f5b-d2232543c302/glaze_table_ui_1767592531658.webp`

## Overview

The "Run Agent" feature is a multi-step process that involves:
1. **Frontend UI** - Cell selection and triggering
2. **API Server** - Job creation and task queuing  
3. **Trigger.dev** - Workflow orchestration
4. **Enrichment Service** - Actual data enrichment with provider waterfall strategy
5. **Database** - State tracking and result storage

---

## Step-by-Step Flow

### 1. **User Interaction (Frontend)**

**Location**: `/apps/web/app/(dashboard)/tables/[tableId]/page.tsx`

#### 1.1 Cell Selection
When you drag your mouse over cells:

```typescript
// Lines 557-573
const handleCellMouseDown = (rowIndex: number, colIndex: number) => {
  setIsSelectingCells(true);
  setSelectionRange({
    start: { r: rowIndex, c: colIndex },
    end: { r: rowIndex, c: colIndex }
  });
  setEditingCell(null);
};

const handleCellMouseEnter = (rowIndex: number, colIndex: number) => {
  if (isSelectingCells && selectionRange) {
    setSelectionRange({
      ...selectionRange,
      end: { r: rowIndex, c: colIndex }
    });
  }
};
```

**What happens**:
- `handleCellMouseDown` is triggered when you press mouse button on a cell
- Sets `isSelectingCells = true` to indicate drag mode
- Creates initial `selectionRange` with start and end at the same cell
- As you drag, `handleCellMouseEnter` updates the `end` coordinates
- Selected cells get a blue border via `getCellSelectionState()` (lines 575-608)

#### 1.2 Floating Toolbar Appears
Once cells are selected, a floating toolbar appears at the bottom:

```typescript
// Lines 894-939
{selectionRange && (() => {
  const { start, end } = selectionRange;
  const minR = Math.min(start.r, end.r);
  const maxR = Math.max(start.r, end.r);
  const minC = Math.min(start.c, end.c);
  const maxC = Math.max(start.c, end.c);
  const selectedCellCount = (maxR - minR + 1) * (maxC - minC + 1);

  return selectedCellCount > 0 ? (
    <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50">
      <div className="backdrop-blur-md bg-white/95 border ...">
        <div>{selectedCellCount} {selectedCellCount === 1 ? 'cell' : 'cells'} selected</div>
        <Button onClick={handleRunEnrichment} disabled={isEnriching}>
          {isEnriching ? 'Enriching...' : 'Run Agent'}
        </Button>
      </div>
    </div>
  ) : null;
})()}
```

**What's shown**:
- Number of cells selected (e.g., "2 cells selected")
- **"Run Agent"** button with a sparkles icon ✨
- Close button (X) to cancel selection

---

### 2. **Run Agent Button Click**

When you click "Run Agent", the `handleRunEnrichment` function is called:

**Location**: `page.tsx` lines 310-413

```typescript
const handleRunEnrichment = useCallback(async () => {
  if (!selectionRange || !tableId) return;

  setIsEnriching(true);

  try {
    const { start, end } = selectionRange;
    const minR = Math.min(start.r, end.r);
    const maxR = Math.max(start.r, end.r);
    const minC = Math.min(start.c, end.c);
    const maxC = Math.max(start.c, end.c);

    // Collect unique column IDs and row IDs
    const columnIds = new Set<string>();
    const rowIds = new Set<string>();
    const enrichingCellKeys = new Set<string>();

    for (let r = minR; r <= maxR; r++) {
      const row = rowData[r];
      if (!row) continue;
      rowIds.add(row.id);

      for (let c = minC; c <= maxC; c++) {
        const col = columns[c];
        if (!col) continue;
        columnIds.add(col.id);
        enrichingCellKeys.add(`${row.id}:${col.key}`);
      }
    }

    // Mark cells as enriching (shows loading spinners)
    setEnrichingCells(enrichingCellKeys);

    // Call API to start enrichment job
    const { data: enrichJob, error: startError } = await typedApi.startCellEnrichment(tableId, {
      columnIds: Array.from(columnIds),
      rowIds: Array.from(rowIds),
    });

    if (startError || !enrichJob) {
      throw new Error(startError || 'Failed to start enrichment job');
    }

    console.log('Enrichment job started:', enrichJob);

    // Poll for job completion
    let attempts = 0;
    const maxAttempts = 120; // Max 2 minutes
    const pollInterval = 1000; // 1 second

    const pollForCompletion = async (): Promise<boolean> => {
      const { data: jobStatus, error: statusError } = await typedApi.getEnrichmentJobStatus(
        tableId,
        enrichJob.jobId
      );

      if (jobStatus?.status === 'done' || jobStatus?.status === 'failed') {
        return true;
      }

      attempts++;
      if (attempts >= maxAttempts) {
        console.warn('Job polling timeout');
        return true;
      }

      await new Promise(resolve => setTimeout(resolve, pollInterval));
      return pollForCompletion();
    };

    await pollForCompletion();

    // Refresh the data to get enriched values
    await loadData();

    // Clear enriching cells
    setEnrichingCells(new Set());

    // Clear selection
    setSelectionRange(null);

  } catch (error) {
    console.error('Enrichment error:', error);
    alert('Enrichment failed. Please try again.');
    setEnrichingCells(new Set());
  } finally {
    setIsEnriching(false);
  }
}, [selectionRange, rowData, columns, tableId, loadData]);
```

**What happens**:
1. **Calculate selection bounds**: Determine min/max row and column indices
2. **Collect IDs**: Build sets of unique `columnIds` and `rowIds` from the selection
3. **Mark cells as enriching**: Adds cell keys to `enrichingCells` state
   - This triggers loading spinners in those cells (line 848-852)
4. **Call API**: `typedApi.startCellEnrichment()` sends request to backend
5. **Poll for completion**: Repeatedly checks job status every 1 second (max 2 minutes)
6. **Refresh data**: Once complete, reloads table data from server
7. **Reset UI**: Clears loading states and selection

#### UI Feedback During Enrichment

While enriching, each selected cell shows a loading spinner:

```typescript
// Lines 848-852
{isCellEnriching && (
  <div className="absolute inset-0 flex items-center justify-center bg-amber-50/80 backdrop-blur-sm">
    <Loader2 className="w-4 h-4 text-amber-600 animate-spin" />
  </div>
)}
```

The toolbar button also changes:
- Text: "Run Agent" → "Enriching..."
- Icon: Sparkles → Spinning loader

---

### 3. **API Request (Frontend → Backend)**

**Location**: `/apps/web/lib/typed-api-client.ts` lines 120-134

```typescript
async startCellEnrichment(
  tableId: string,
  params: { columnIds: string[]; rowIds: string[] }
) {
  return this.request<{
    jobId: string;
    tableId: string;
    status: string;
    totalTasks: number;
    message: string;
  }>(`/tables/${tableId}/enrich`, {
    method: 'POST',
    body: JSON.stringify(params),
  });
}
```

**Request Details**:
- **Endpoint**: `POST /tables/:tableId/enrich`
- **Body**:
  ```json
  {
    "columnIds": ["col_123", "col_456"],
    "rowIds": ["row_abc", "row_def"]
  }
  ```

---

### 4. **API Server Handling**

**Location**: `/apps/api/src/routes/cell-enrich.ts` lines 104-253

#### 4.1 Validation
```typescript
// Validate table exists
const table = await prisma.table.findUnique({
  where: { id: tableId },
});

if (!table) {
  set.status = 404;
  return error(404, "Table not found");
}
```

#### 4.2 Expand Grid to Cell Selections
```typescript
// Grid mode: expand columnIds × rowIds to all combinations
await validateColumns(tableId, request.columnIds);
await validateRows(tableId, request.rowIds);

cellSelections = expandGridToCells(request.columnIds, request.rowIds);

// expandGridToCells creates: [
//   { rowId: "row_abc", columnId: "col_123" },
//   { rowId: "row_abc", columnId: "col_456" },
//   { rowId: "row_def", columnId: "col_123" },
//   { rowId: "row_def", columnId: "col_456" }
// ]
```

#### 4.3 Create Database Records (Transaction)
```typescript
const result = await prisma.$transaction(async (tx) => {
  // 1. Create the job
  const job = await tx.enrichmentJob.create({
    data: {
      tableId,
      status: "pending",
      totalTasks: cellSelections.length,
    },
  });

  // 2. Create cell tasks in batch
  const taskData = cellSelections.map((cell) => ({
    tableId,
    rowId: cell.rowId,
    columnId: cell.columnId,
    jobId: job.id,
    status: "queued" as const,
  }));

  await tx.cellEnrichmentTask.createMany({
    data: taskData,
  });

  // 3. Get created task IDs
  const tasks = await tx.cellEnrichmentTask.findMany({
    where: { jobId: job.id },
    select: { id: true },
  });

  // 4. Mark affected rows as queued
  const uniqueRowIds = [...new Set(cellSelections.map((c) => c.rowId))];
  await tx.row.updateMany({
    where: { id: { in: uniqueRowIds } },
    data: { status: "queued" },
  });

  return {
    job,
    taskIds: tasks.map((t) => t.id),
  };
});
```

**Database State After Transaction**:
- **EnrichmentJob**: 1 record with status "pending"
- **CellEnrichmentTask**: N records (one per cell) with status "queued"
- **Row**: Affected rows marked as status "queued"

#### 4.4 Trigger Trigger.dev Workflow
```typescript
try {
  await tasks.trigger("process-enrichment-job", {
    jobId: result.job.id,
    tableId,
    taskIds: result.taskIds,
  });
} catch (triggerError) {
  console.error("[cell-enrich] Failed to trigger workflow:", triggerError);
  await prisma.enrichmentJob.update({
    where: { id: result.job.id },
    data: {
      error: "Failed to trigger workflow. Tasks queued but not processing.",
    },
  });
}
```

**What happens**:
- Triggers the `process-enrichment-job` Trigger.dev task
- This is fire-and-forget - doesn't block the API response
- If trigger fails, job is updated with error but API still responds successfully

#### 4.5 API Response
```typescript
const response: EnrichTableResponse = {
  jobId: result.job.id,
  tableId,
  status: "pending",
  totalTasks: cellSelections.length,
  message: `Created ${cellSelections.length} enrichment tasks`,
};

set.status = 201;
return response;
```

**Response Example**:
```json
{
  "jobId": "job_xyz789",
  "tableId": "d0a66655-bcdf-4bfb-98d7-abf172425d5a",
  "status": "pending",
  "totalTasks": 4,
  "message": "Created 4 enrichment tasks"
}
```

---

### 5. **Trigger.dev Workflow Execution**

**Location**: `/apps/workflows/src/cell-enrichment.ts`

#### 5.1 Main Job Task: `process-enrichment-job`

```typescript
export const processEnrichmentJobTask = task({
  id: "process-enrichment-job",
  maxDuration: 3600, // 1 hour max per job
  queue: {
    name: "enrichment-jobs",
    concurrencyLimit: 5, // Max 5 jobs at once
  },
  run: async (payload: EnrichmentWorkflowPayload, { ctx }) => {
    const { jobId, tableId, taskIds } = payload;
    
    // 1. Mark job as running
    await getPrisma().enrichmentJob.update({
      where: { id: jobId },
      data: {
        status: "running",
        startedAt: new Date(),
      },
    });

    // 2. Trigger all cell tasks (they run concurrently)
    const allRuns = await Promise.all(
      taskIds.map((taskId) =>
        enrichCellTask.triggerAndWait({ taskId })
      )
    );

    // 3. Check results
    const successCount = allRuns.filter((r) => r.ok).length;
    const failCount = allRuns.filter((r) => !r.ok).length;

    // 4. Update job status
    const finalStatus = failCount === taskIds.length
      ? "failed"
      : "completed";

    await getPrisma().enrichmentJob.update({
      where: { id: jobId },
      data: {
        status: finalStatus,
        completedAt: new Date(),
        error: failCount > 0 ? `${failCount} tasks failed` : null,
      },
    });

    return {
      jobId,
      status: finalStatus,
      totalTasks: taskIds.length,
      successCount,
      failCount,
    };
  },
});
```

**What happens**:
1. Updates job status to "running"
2. Triggers ALL cell enrichment tasks concurrently (with queue limit of 10)
3. Waits for all to complete
4. Aggregates results
5. Updates job to "completed" or "failed"

#### 5.2 Individual Cell Task: `enrich-cell`

```typescript
export const enrichCellTask = task({
  id: "enrich-cell",
  maxDuration: 120, // 2 minutes max per cell
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 10000,
    factor: 2,
  },
  queue: {
    name: "cell-enrichment",
    concurrencyLimit: 10, // Process up to 10 cells concurrently
  },
  run: async (payload: EnrichCellPayload, { ctx }) => {
    const { taskId } = payload;

    // 1. Load the task with related data
    const cellTask = await getPrisma().cellEnrichmentTask.findUnique({
      where: { id: taskId },
      include: {
        row: true,
        column: true,
      },
    });

    // 2. Mark task as running
    await getPrisma().cellEnrichmentTask.update({
      where: { id: taskId },
      data: {
        status: "running",
        startedAt: new Date(),
        attempts: { increment: 1 },
      },
    });

    // 3. Run enrichment using the provider waterfall strategy
    const enrichmentResult = await enrichCellWithProviders({
      columnKey: cellTask.column.key,
      rowId: cellTask.rowId,
      tableId: cellTask.tableId,
      existingData: (cellTask.row.data as Record<string, unknown>) || {},
    });

    // 4. Update Row.data with enriched value
    const currentData = (cellTask.row.data as Record<string, unknown>) || {};
    const updatedData = {
      ...currentData,
      [cellTask.column.key]: enrichmentResult.value,
    };

    // 5. Transaction: Update task and row
    await getPrisma().$transaction(async (tx: any) => {
      // Update task with result
      await tx.cellEnrichmentTask.update({
        where: { id: taskId },
        data: {
          status: "done",
          result: enrichmentResult,
          confidence: enrichmentResult.confidence,
          completedAt: new Date(),
        },
      });

      // Update row data
      await tx.row.update({
        where: { id: cellTask.rowId },
        data: {
          data: updatedData,
          lastRunAt: new Date(),
        },
      });

      // Update job done count
      await tx.enrichmentJob.update({
        where: { id: cellTask.jobId },
        data: {
          doneTasks: { increment: 1 },
        },
      });
    });

    // 6. Recalculate row status
    await recalculateRowStatus(cellTask.rowId);

    return {
      taskId,
      status: "done",
      result: enrichmentResult,
      error: null,
    };
  },
});
```

**What happens for EACH cell**:
1. Loads task, row, and column data from database
2. Updates task status to "running"
3. Calls enrichment service with waterfall provider strategy
4. Updates Row's data JSON with the enriched value
5. Updates task as "done" with result
6. Increments job's `doneTasks` counter
7. Recalculates overall row status

---

### 6. **Enrichment Service (Waterfall Strategy)**

**Location**: `/apps/workflows/src/enrichment-service.ts`

The enrichment service tries multiple providers in order until one succeeds:

```typescript
async function enrichCellWithProviders(params: {
  columnKey: string;
  rowId: string;
  tableId: string;
  existingData: Record<string, unknown>;
}): Promise<EnrichmentResult> {
  
  // Try providers in order: cache → free → cheap → premium
  const providers = [
    { name: 'cache', provider: cacheProvider },
    { name: 'free', provider: freeProvider },
    { name: 'cheap', provider: cheapProvider },
    { name: 'premium', provider: premiumProvider },
  ];

  for (const { name, provider } of providers) {
    try {
      const result = await provider.enrich(params);
      if (result.value !== null) {
        return {
          value: result.value,
          confidence: result.confidence,
          source: name,
          timestamp: new Date().toISOString(),
          metadata: { cost: result.cost || 0 }
        };
      }
    } catch (error) {
      console.warn(`Provider ${name} failed`, error);
      // Continue to next provider
    }
  }

  // All providers failed
  throw new Error('All enrichment providers failed');
}
```

**Provider Waterfall**:
1. **Cache**: Check if we've enriched this before (free, instant)
2. **Free**: Try free public APIs (e.g., domain lookup, public search)
3. **Cheap**: Try affordable APIs (e.g., Clearbit, Hunter)
4. **Premium**: Last resort expensive APIs (e.g., LinkedIn, ZoomInfo)

**Current Implementation**: Uses mock enrichment based on column type

---

### 7. **Mock Enrichment (Current Implementation)**

**Location**: `/apps/api/src/routes/enrich.ts` lines 189-225

```typescript
function generateEnrichedValue(columnId: string): string {
  const lowerColumnId = columnId.toLowerCase();

  if (lowerColumnId.includes('email')) {
    return `contact+${Date.now()}@example.com`;
  }
  if (lowerColumnId.includes('phone')) {
    return `+1-555-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
  }
  if (lowerColumnId.includes('company')) {
    const companies = ['TechCorp', 'DataSync', 'CloudBase', 'FastFlow', 'PureScale'];
    return companies[Math.floor(Math.random() * companies.length)];
  }
  if (lowerColumnId.includes('title')) {
    const titles = ['CEO', 'CTO', 'VP Sales', 'Product Manager', 'Engineer'];
    return titles[Math.floor(Math.random() * titles.length)];
  }
  if (lowerColumnId.includes('linkedin')) {
    return `linkedin.com/in/user-${Math.random().toString(36).substr(2, 9)}`;
  }
  if (lowerColumnId.includes('website')) {
    return `https://example-${Math.random().toString(36).substr(2, 6)}.com`;
  }
  if (lowerColumnId.includes('industry')) {
    const industries = ['Technology', 'Finance', 'Healthcare', 'Retail', 'Manufacturing'];
    return industries[Math.floor(Math.random() * industries.length)];
  }
  if (lowerColumnId.includes('employee_count') || lowerColumnId.includes('employees')) {
    return String(Math.floor(Math.random() * 50000) + 10);
  }
  if (lowerColumnId.includes('revenue')) {
    return `$${Math.floor(Math.random() * 100000000)}M`;
  }

  // Default: generic enriched value
  return `Enriched ${columnId}`;
}
```

**What happens**:
- Analyzes column name to determine data type
- Generates realistic mock data based on type
- Adds random delay (300-800ms) to simulate API call

---

### 8. **Frontend Polling**

While the workflow runs in the background, the frontend polls for status:

**Location**: `page.tsx` lines 365-393

```typescript
const pollForCompletion = async (): Promise<boolean> => {
  const { data: jobStatus, error: statusError } = await typedApi.getEnrichmentJobStatus(
    tableId,
    enrichJob.jobId
  );

  if (statusError) {
    console.warn('Error polling job status:', statusError);
    attempts++;
    if (attempts >= maxAttempts) return true;
    await new Promise(resolve => setTimeout(resolve, pollInterval));
    return pollForCompletion();
  }

  console.log('Job status:', jobStatus);

  if (jobStatus?.status === 'done' || jobStatus?.status === 'failed') {
    return true;
  }

  attempts++;
  if (attempts >= maxAttempts) {
    console.warn('Job polling timeout');
    return true;
  }

  await new Promise(resolve => setTimeout(resolve, pollInterval));
  return pollForCompletion();
};
```

**Polling Details**:
- **Endpoint**: `GET /tables/:tableId/enrich/jobs/:jobId`
- **Interval**: Every 1 second
- **Max Duration**: 120 attempts (2 minutes)
- **Stop Conditions**: Job status is "done" or "failed", or timeout

**Status Response**:
```json
{
  "jobId": "job_xyz789",
  "status": "running",  // or "pending", "done", "failed"
  "totalTasks": 4,
  "doneTasks": 2,
  "failedTasks": 0,
  "progress": 50,
  "createdAt": "2026-01-05T05:50:00Z",
  "startedAt": "2026-01-05T05:50:01Z",
  "completedAt": null
}
```

---

### 9. **Data Refresh**

Once the job is complete, the frontend refreshes the table data:

```typescript
// Refresh the data to get enriched values
await loadData();

// Clear enriching cells
setEnrichingCells(new Set());

// Clear selection
setSelectionRange(null);
```

**loadData() function** (not shown, but it):
1. Calls `GET /tables/:tableId/rows` to fetch updated rows
2. Updates `rowData` state with enriched values
3. Cells now display the new enriched data instead of spinners

---

## Database Schema

### Key Tables

#### EnrichmentJob
```prisma
model EnrichmentJob {
  id            String   @id @default(cuid())
  tableId       String
  status        String   // "pending", "running", "completed", "failed"
  totalTasks    Int
  doneTasks     Int      @default(0)
  failedTasks   Int      @default(0)
  createdAt     DateTime @default(now())
  startedAt     DateTime?
  completedAt   DateTime?
  error         String?
  
  tasks         CellEnrichmentTask[]
  table         Table    @relation(fields: [tableId], references: [id])
}
```

#### CellEnrichmentTask
```prisma
model CellEnrichmentTask {
  id          String   @id @default(cuid())
  tableId     String
  rowId       String
  columnId    String
  jobId       String
  status      String   // "queued", "running", "done", "failed"
  result      Json?
  confidence  Float?
  error       String?
  attempts    Int      @default(0)
  createdAt   DateTime @default(now())
  startedAt   DateTime?
  completedAt DateTime?
  
  job         EnrichmentJob @relation(fields: [jobId], references: [id])
  row         Row           @relation(fields: [rowId], references: [id])
  column      Column        @relation(fields: [columnId], references: [id])
}
```

#### Row (enriched data stored here)
```prisma
model Row {
  id          String   @id @default(cuid())
  tableId     String
  data        Json     // ← Enriched values written here!
  status      String?  // "idle", "queued", "running", "done", "failed"
  confidence  Float?
  lastRunAt   DateTime?
  createdAt   DateTime @default(now())
  
  tasks       CellEnrichmentTask[]
  table       Table    @relation(fields: [tableId], references: [id])
}
```

---

## Timeline Example

For a 2×2 selection (2 rows × 2 columns = 4 cells):

| Time | Event | Database State | UI State |
|------|-------|----------------|----------|
| T+0ms | User clicks "Run Agent" | - | Button shows "Enriching..." |
| T+50ms | API creates job + 4 tasks | EnrichmentJob (pending)<br>4× CellEnrichmentTask (queued) | Cells show spinners |
| T+100ms | Trigger.dev starts workflow | EnrichmentJob (running) | Still spinning |
| T+150ms | Cell task 1 starts enriching | Task 1 (running) | Still spinning |
| T+400ms | Cell task 1 completes | Task 1 (done)<br>Row 1 data updated<br>Job doneTasks = 1 | Still spinning |
| T+450ms | Cell task 2 starts enriching | Task 2 (running) | Still spinning |
| T+700ms | Cell task 2 completes | Task 2 (done)<br>Row 1 data updated<br>Job doneTasks = 2 | Still spinning |
| T+750ms | Cell task 3 starts enriching | Task 3 (running) | Still spinning |
| T+1000ms | Cell task 3 completes | Task 3 (done)<br>Row 2 data updated<br>Job doneTasks = 3 | Still spinning |
| T+1050ms | Cell task 4 starts enriching | Task 4 (running) | Still spinning |
| T+1300ms | Cell task 4 completes | Task 4 (done)<br>Row 2 data updated<br>Job doneTasks = 4 | Still spinning |
| T+1350ms | Workflow marks job complete | EnrichmentJob (completed) | Still spinning |
| T+2000ms | Frontend poll detects completion | - | Calls loadData() |
| T+2100ms | Data refresh complete | - | Shows enriched values!<br>Clears spinners<br>Clears selection |

---

## Error Handling

### Frontend Errors
- **No cells selected**: Button is only shown when selectionRange exists
- **API error**: Shows alert with error message
- **Polling timeout**: After 2 minutes, stops polling and shows enriched values (partial completion)

### Backend Errors
- **Table not found**: Returns 404
- **Invalid columns/rows**: Returns 400 with validation error
- **Trigger.dev connection failed**: Job still created but marked with error

### Workflow Errors
- **Task fails**: 
  - Retries up to 3 times with exponential backoff
  - After 3 failures, marks task as "failed"
  - Increments job's `failedTasks` counter
  - Other tasks continue processing
- **Entire job fails**: Marks job as "failed" with error message

---

## Key Design Decisions

1. **Grid Mode**: Frontend sends `columnIds × rowIds`, backend expands to individual cells
   - Reduces payload size
   - Allows future optimization (e.g., column-level enrichment)

2. **Fire-and-Forget Trigger**: API doesn't wait for workflow to complete
   - Faster API response
   - Better UX (user sees pending state immediately)
   - Polling allows real-time progress

3. **Task-Level Granularity**: Each cell is a separate task
   - Enables per-cell retry logic
   - Allows partial completions
   - Facilitates debugging (can see which specific cells failed)

4. **Row Status Aggregation**: Row status is calculated from its cell tasks
   - "running" if any cell is running
   - "done" if all cells are done
   - "failed" if any cell failed
   - "queued" if all cells are queued

5. **Waterfall Provider Strategy**: Try cheap providers first
   - Minimizes costs
   - Maximizes success rate
   - Caching prevents redundant API calls

---

## Future Enhancements (TODOs in codebase)

1. **Real Provider Integration**: Replace mock enrichment with actual APIs
   - LinkedIn API
   - Clearbit
   - Hunter.io
   - ZoomInfo

2. **Streaming Updates**: Instead of polling, use WebSockets or Server-Sent Events
   - Real-time progress updates
   - Individual cell completion notifications

3. **Batch Optimization**: Group similar cells together
   - Bulk API calls where possible
   - Reduce API rate limiting

4. **Cost Tracking**: Return actual enrichment costs
   - Show cost before running
   - Track spending per table/job

5. **AI Agent Configuration**: Allow users to customize enrichment logic
   - Custom prompts
   - Provider selection
   - Confidence thresholds

---

## Summary

The "Run Agent" flow is a sophisticated multi-layer system:

1. **Frontend**: Manages UI state, triggers enrichment, polls for updates
2. **API**: Validates requests, creates jobs/tasks, triggers workflows
3. **Trigger.dev**: Orchestrates parallel task execution with retries
4. **Enrichment Service**: Implements waterfall provider strategy
5. **Database**: Tracks state transitions and stores enriched data

The entire process is:
- **Asynchronous**: Non-blocking at every layer
- **Resilient**: Retries, partial completions, error handling
- **Scalable**: Concurrent execution with queue limits
- **Observable**: Complete audit trail in database

All of this happens behind a simple, clean UI interaction! ✨

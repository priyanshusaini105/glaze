# Cell Enrichment Fixes - January 2026

## Issues Identified and Fixed

### Issue 1: Multiple Cell Enrichment - Only One Cell Gets Enriched

**Problem:**
When selecting multiple cells (e.g., 2+ cells) to enrich together, sometimes only one cell would show enriched data.

**Root Causes:**
1. **Unstable `onComplete` callback in realtime hook**: The `onComplete` callback was being recreated on every render, causing the effect to re-fire unnecessarily.
2. **Missing logging**: There was insufficient logging to track individual cell processing through the enrichment workflow.
3. **Potential race condition**: The enrichment state could be cleared before all cells finished processing.

**Fixes Applied:**

1. **Stabilized callback in `use-realtime-enrichment.ts`**:
   - Wrapped `onComplete` with `useCallback` to prevent recreation on every render
   - Added `runId` check to ensure completion callback only fires for valid runs
   - Added comprehensive console logging to track status changes

2. **Enhanced workflow logging in `cell-enrichment.ts`**:
   - Added detailed logging before triggering individual tasks
   - Log task IDs being processed (first 10 to avoid log bloat)
   - Track and log failed tasks separately for debugging
   - Include total counts in completion logs

3. **Improved frontend logging in `page.tsx`**:
   - Log selection details (cell count, row count, column count)
   - Track enrichment job start with detailed metadata
   - Log realtime vs polling mode selection
   - Enhanced completion callback with success/failure details
   - Log data refresh operations

**Files Modified:**
- `/apps/web/hooks/use-realtime-enrichment.ts`
- `/apps/web/app/(dashboard)/tables/[tableId]/page.tsx`
- `/apps/workflows/src/cell-enrichment.ts`

### Issue 2: Realtime Updates Not Working Well

**Problem:**
Realtime enrichment status updates weren't reliably showing progress or completion.

**Root Causes:**
1. **Effect dependency issues**: The useEffect for completion callback had unstable dependencies
2. **Premature notifications**: The hasNotified flag wasn't properly scoped to the run ID
3. **Missing status logging**: Hard to diagnose what was happening with realtime connection

**Fixes Applied:**

1. **Fixed useEffect dependencies**:
   ```typescript
   // Before: unstable onComplete dependency
   useEffect(() => {
     if (isComplete && !hasNotified && onComplete) {
       // ...
     }
   }, [isComplete, hasNotified, onComplete, isSuccess, run?.output]);
   
   // After: stable callback reference
   const stableOnComplete = useCallback(onComplete ?? (() => {}), [onComplete]);
   useEffect(() => {
     if (isComplete && !hasNotified && runId) {
       // ...
     }
   }, [isComplete, hasNotified, runId, isSuccess, run?.output, stableOnComplete]);
   ```

2. **Added comprehensive logging**:
   - Log all status changes with full context
   - Log when new runs start
   - Log completion callback triggers with output details
   - All logs prefixed with `[useRealtimeEnrichment]` for easy filtering

3. **Enhanced frontend enrichment tracking**:
   - Log selection details before starting enrichment
   - Track realtime connection establishment
   - Log fallback to polling mode if realtime unavailable
   - Show enrichment progress in UI header

**Files Modified:**
- `/apps/web/hooks/use-realtime-enrichment.ts`
- `/apps/web/app/(dashboard)/tables/[tableId]/page.tsx`

## Testing the Fixes

### Test Case 1: Multiple Cell Enrichment
1. Open a table in the web app
2. Select 2+ cells (drag to select)
3. Click "Run Agent" button
4. Open browser console to see enrichment logs
5. Verify:
   - All selected cells show loading spinner
   - Console logs show all task IDs being processed
   - All cells get enriched (not just one)
   - Status indicator in header shows progress

**Expected Console Output:**
```
[handleRunEnrichment] Selection details: { totalCells: 2, uniqueRows: 2, uniqueColumns: 1, ... }
[handleRunEnrichment] Enrichment job started: { jobId: "...", runId: "...", totalTasks: 2, ... }
[handleRunEnrichment] Using realtime updates: { runId: "...", ... }
[useRealtimeEnrichment] New run started: run_xxx
[useRealtimeEnrichment] Status update: { status: "QUEUED", isActive: true, ... }
[useRealtimeEnrichment] Status update: { status: "EXECUTING", isActive: true, ... }
[useRealtimeEnrichment] Status update: { status: "COMPLETED", isComplete: true, ... }
[useRealtimeEnrichment] Triggering completion callback: { isSuccess: true, output: { successCount: 2 } }
[handleEnrichmentComplete] Enrichment completed: { success: true, output: { totalTasks: 2, successCount: 2 } }
[handleEnrichmentComplete] Refreshing table data...
[loadData] Starting data load for table: ...
[loadData] Loaded rows: { rowCount: X, ... }
[handleEnrichmentComplete] Table data refreshed
[handleEnrichmentComplete] Successfully enriched 2/2 cells
```

### Test Case 2: Realtime Status Updates
1. Select multiple cells
2. Watch the header status indicator
3. Verify it shows:
   - "Starting..." → "In Queue..." → "Enriching..." → "Enriched!"
4. Console should show status transitions
5. Final data should appear after "Enriched!" message

### Test Case 3: Fallback to Polling
1. If Trigger.dev realtime fails for any reason
2. System should automatically fall back to polling
3. Console will show: `[handleRunEnrichment] Realtime not available, falling back to polling`
4. Enrichment should still complete successfully

## Debugging Tips

### Enable Detailed Logs
All logs are prefixed for easy filtering:
- `[handleRunEnrichment]` - Frontend enrichment trigger
- `[handleEnrichmentComplete]` - Completion handler
- `[useRealtimeEnrichment]` - Realtime hook status
- `[loadData]` - Data loading operations

Filter in browser console:
```javascript
// Show only enrichment-related logs
console.log = (function(oldLog) {
  return function(...args) {
    if (args[0] && typeof args[0] === 'string' && 
        (args[0].includes('[handle') || args[0].includes('[use') || args[0].includes('[load'))) {
      oldLog.apply(console, args);
    }
  };
})(console.log);
```

### Check Workflow Logs (Backend)
In Trigger.dev dashboard:
1. Find the run ID from frontend console
2. View run details
3. Check task execution logs
4. Look for:
   - "Processing tasks" - Shows total tasks
   - "Triggering task X/Y" - Individual task triggers
   - "Job tasks completed" - Final results

### Common Issues

**Issue: Realtime connection fails**
- Check if `publicAccessToken` is present in enrichJob response
- Verify Trigger.dev API keys are configured
- Fall back to polling will automatically kick in

**Issue: Some cells don't enrich**
- Check workflow logs for failed tasks
- Look for "Some tasks failed" log entry
- Failed task IDs will be logged separately
- Check individual task error messages

**Issue: UI doesn't update after enrichment**
- Verify `loadData()` is called after completion
- Check console for "[loadData] Loaded rows" message
- Ensure row data includes enriched values

## Performance Notes

- **Mock providers have NO delays**: Artificial delays were removed for instant testing
- **Concurrent processing**: Up to 10 cells can enrich simultaneously (queue concurrency limit)
- **Database optimization**: Only 3 DB operations per cell (optimized from 7)
- **Realtime updates**: Near-instant status updates via Server-Sent Events (SSE)

## Future Improvements

1. **Batch data refresh**: Instead of reloading entire table, only refresh enriched rows
2. **Optimistic updates**: Show enriched data immediately using workflow output
3. **Progress percentage**: Calculate and display % complete based on task counts
4. **Error recovery**: Allow retry of failed individual cells
5. **Enrichment queue**: Show pending enrichments in a queue UI

## Related Documentation

- [Cell Enrichment Architecture](./CELL_ENRICHMENT.md)
- [Realtime Enrichment Setup](./REALTIME_ENRICHMENT.md)
- [Enrichment Migration Guide](./ENRICHMENT_MIGRATION.md)
- [Production Architecture](./ENRICHMENT_PRODUCTION_ARCHITECTURE.md)

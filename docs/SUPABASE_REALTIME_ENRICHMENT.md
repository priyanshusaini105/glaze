# Supabase Realtime Cell Enrichment

## Architecture Overview

This implementation uses **Supabase Realtime** to broadcast cell enrichment status and data updates across all browser tabs in real-time.

### Why Supabase Realtime?

**✅ Chosen: Supabase Realtime**
- Already using Supabase for database
- Zero additional infrastructure
- Built-in Postgres CDC (Change Data Capture)
- Automatic reconnection handling
- Low latency (< 100ms)
- Perfect for cell-based data model

**❌ Not Trigger.dev Realtime**
- Only shows workflow/task progress, not cell-level updates
- Doesn't broadcast to multiple tabs
- Can't show individual cell loaders

**❌ Not Yjs**
- Massive overkill (CRDT for collaborative editing)
- Requires separate WebSocket server
- Complex conflict resolution not needed

---

## How It Works

### 1. Database Schema

Added `enrichingColumns` array to track which columns are currently being enriched:

```prisma
model Row {
  // ... existing fields
  enrichingColumns String[] @default([])  // Array of column keys currently enriching
}
```

### 2. Enrichment Start (API)

When enrichment starts via `POST /tables/:id/enrich`:

```typescript
// Group cells by row and track which columns are enriching
const rowEnrichingColumns = new Map<string, Set<string>>();

for (const cell of cellSelections) {
  if (!rowEnrichingColumns.has(cell.rowId)) {
    rowEnrichingColumns.set(cell.rowId, new Set());
  }
  rowEnrichingColumns.get(cell.rowId)!.add(columnKey);
}

// Update each row with enriching columns
await tx.row.update({
  where: { id: rowId },
  data: {
    enrichingColumns: Array.from(rowEnrichingColumns.get(rowId) || []),
  },
});
```

**Result**: Database row updated → Supabase broadcasts to all subscribed clients → All tabs show loader

### 3. Enrichment Complete (Workflow)

When a cell enrichment completes in the Trigger.dev workflow:

```typescript
// Remove column from enrichingColumns array
const newEnrichingColumns = (currentRow.enrichingColumns || []).filter(
  (col) => col !== cellTask.column.key
);

await tx.row.update({
  where: { id: cellTask.rowId },
  data: {
    data: updatedData,  // New enriched data
    enrichingColumns: newEnrichingColumns,  // Remove from loading
  },
});
```

**Result**: Database row updated → Supabase broadcasts to all clients → All tabs hide loader and show data

### 4. Frontend Subscription

React components subscribe to row changes using the `useTableRealtime` hook:

```typescript
const { updatedRows } = useTableRealtime({
  tableId: 'table-id',
  onRowUpdate: (row) => {
    console.log('Row updated:', row.id);
    console.log('Enriching columns:', row.enrichingColumns);
    console.log('Data:', row.data);
  },
});
```

---

## Implementation Files

### Backend

| File | Purpose |
|------|---------|
| [apps/api/prisma/schema.prisma](../apps/api/prisma/schema.prisma) | Added `enrichingColumns: String[]` to Row model |
| [apps/api/src/routes/cell-enrich.ts](../apps/api/src/routes/cell-enrich.ts) | Sets `enrichingColumns` when enrichment starts |
| [apps/workflows/src/cell-enrichment.ts](../apps/workflows/src/cell-enrichment.ts) | Removes column from `enrichingColumns` when done/failed |

### Frontend

| File | Purpose |
|------|---------|
| [apps/web/lib/supabase.ts](../apps/web/lib/supabase.ts) | Supabase client configuration |
| [apps/web/providers/supabase-realtime-provider.tsx](../apps/web/providers/supabase-realtime-provider.tsx) | React Context for managing realtime subscriptions |
| [apps/web/hooks/use-table-realtime.ts](../apps/web/hooks/use-table-realtime.ts) | Hook to subscribe to table row changes |
| [apps/web/app/layout.tsx](../apps/web/app/layout.tsx) | Added SupabaseRealtimeProvider to root layout |

---

## Usage Examples

### Basic Table Subscription

Subscribe to all row changes in a table:

```typescript
import { useTableRealtime } from '@/hooks/use-table-realtime';

function TableComponent({ tableId }: { tableId: string }) {
  const { isConnected, updatedRows } = useTableRealtime({
    tableId,
    onRowUpdate: (row) => {
      // Automatically called when any row in the table updates
      console.log('Row updated:', row);
    },
  });

  return (
    <div>
      {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
      {/* Your table UI */}
    </div>
  );
}
```

### Show Cell Loader

Check if a specific cell is enriching:

```typescript
import { useCellEnrichmentStatus } from '@/hooks/use-table-realtime';

function CellComponent({ 
  tableId, 
  rowId, 
  columnKey 
}: { 
  tableId: string;
  rowId: string;
  columnKey: string;
}) {
  const { isEnriching, cellData } = useCellEnrichmentStatus(
    tableId,
    rowId,
    columnKey
  );

  return (
    <div>
      {isEnriching ? (
        <Spinner />  // Show loader while enriching
      ) : (
        <span>{cellData}</span>  // Show data when done
      )}
    </div>
  );
}
```

### Advanced: Custom Row Update Logic

```typescript
const { updatedRows } = useTableRealtime({
  tableId: 'my-table-id',
  enabled: true,
  onRowUpdate: (row) => {
    // Check if this row has any enriching columns
    if (row.enrichingColumns.length > 0) {
      console.log('Enriching:', row.enrichingColumns);
      // Show loaders for these columns
    }
    
    // Update your local state/cache
    updateRowInState(row.id, row.data);
  },
  onRowInsert: (row) => {
    console.log('New row added:', row);
    addRowToState(row);
  },
  onRowDelete: (row) => {
    console.log('Row deleted:', row.id);
    removeRowFromState(row.id);
  },
});
```

---

## Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    USER TRIGGERS ENRICHMENT                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  API: POST /tables/:id/enrich                                │
│  1. Create EnrichmentJob                                     │
│  2. Create CellEnrichmentTasks                               │
│  3. Update Row.enrichingColumns = ['company_name', ...]      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  SUPABASE REALTIME: Broadcast to all subscribed clients      │
│  Event: UPDATE on rows table                                 │
│  Payload: { enrichingColumns: ['company_name'] }             │
└─────────────────────────────────────────────────────────────┘
                              │
                     ┌────────┴────────┐
                     ▼                 ▼
           ┌─────────────┐   ┌─────────────┐
           │   Tab 1     │   │   Tab 2     │
           │  🔄 Loader  │   │  🔄 Loader  │
           └─────────────┘   └─────────────┘
                              
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  TRIGGER.DEV WORKFLOW: Enrich cell                           │
│  1. Fetch data from providers                                │
│  2. Update Row.data = { company_name: "Acme Corp" }          │
│  3. Remove from Row.enrichingColumns = []                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  SUPABASE REALTIME: Broadcast to all subscribed clients      │
│  Event: UPDATE on rows table                                 │
│  Payload: { data: { company_name: "Acme" }, enriching: [] }  │
└─────────────────────────────────────────────────────────────┘
                              │
                     ┌────────┴────────┐
                     ▼                 ▼
           ┌─────────────┐   ┌─────────────┐
           │   Tab 1     │   │   Tab 2     │
           │  ✅ "Acme"  │   │  ✅ "Acme"  │
           └─────────────┘   └─────────────┘
```

---

## Setup Requirements

### 1. Environment Variables

Add to `apps/web/.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 2. Supabase Realtime Configuration

Ensure Realtime is enabled for the `rows` table in Supabase:

1. Go to Supabase Dashboard → Database → Replication
2. Enable replication for the `rows` table
3. Set allowed events: `INSERT`, `UPDATE`, `DELETE`

### 3. Row Level Security (Optional)

If using RLS, ensure anonymous users can read rows:

```sql
CREATE POLICY "Allow anonymous read access to rows" ON rows
  FOR SELECT USING (true);
```

---

## Performance Considerations

### Broadcast Efficiency

- ✅ Only broadcasts rows that changed (not entire table)
- ✅ Filters by `tableId` to reduce noise
- ✅ Uses Postgres CDC for minimal overhead
- ✅ Automatic batching of rapid updates

### Client Optimization

- ✅ Single subscription per table (not per cell)
- ✅ Automatic reconnection on disconnect
- ✅ Local state deduplication
- ✅ Unsubscribes when component unmounts

### Database Impact

- ✅ Minimal: 1 extra array field per row
- ✅ No additional queries (uses existing updates)
- ✅ No polling or webhooks needed

---

## Troubleshooting

### Realtime not working

1. Check Supabase connection:
   ```typescript
   console.log(supabase.realtime.channels);  // Should show active channels
   ```

2. Verify environment variables:
   ```bash
   echo $NEXT_PUBLIC_SUPABASE_URL
   echo $NEXT_PUBLIC_SUPABASE_ANON_KEY
   ```

3. Check Supabase Dashboard → Logs for realtime errors

### Loader not showing

1. Verify `enrichingColumns` is set in database:
   ```sql
   SELECT id, "enrichingColumns" FROM rows WHERE id = 'your-row-id';
   ```

2. Check row update is broadcasting:
   ```typescript
   const { updatedRows } = useTableRealtime({ tableId });
   console.log('Updated rows:', Array.from(updatedRows.keys()));
   ```

### Multiple tabs not syncing

1. Ensure provider is at root level (not per-component)
2. Check browser console for subscription errors
3. Verify Supabase Realtime is enabled for `rows` table

---

## Migration from Trigger.dev Realtime

If you were using Trigger.dev Realtime before:

### Old Approach (Job-level)
```typescript
// ❌ Old: Only shows overall job status
const { run } = useRealtimeRun(runId, { accessToken });
// Shows: "Job is running..." but not which cells are loading
```

### New Approach (Cell-level)
```typescript
// ✅ New: Shows individual cell loaders
const { updatedRows } = useTableRealtime({ tableId });
// Shows: Loader for each enriching cell, updates when done
```

**Benefits**:
- ✅ Granular cell-level updates
- ✅ Works across multiple browser tabs
- ✅ No need for public access tokens
- ✅ Real-time data synchronization

---

## Future Enhancements

- [ ] Add optimistic updates for instant feedback
- [ ] Implement cell-level conflict resolution
- [ ] Add presence indicators (show who's viewing)
- [ ] Support for collaborative editing with Yjs
- [ ] Offline support with local queue

---

## Related Documentation

- [Supabase Realtime Docs](https://supabase.com/docs/guides/realtime)
- [Enrichment Architecture](./ENRICHMENT_PRODUCTION_ARCHITECTURE.md)
- [Cell Enrichment Guide](./CELL_ENRICHMENT.md)

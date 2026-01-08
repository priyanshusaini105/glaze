# Supabase Realtime - Quick Reference

## TL;DR

Enrichment status and data now sync **in real-time across all browser tabs** using Supabase Realtime.

---

## How It Works (3 Steps)

### 1. Start Enrichment → Show Loaders Everywhere

```typescript
// API sets enrichingColumns when job starts
await prisma.row.update({
  where: { id: rowId },
  data: { enrichingColumns: ['company_name', 'website'] }
});
```
→ Supabase broadcasts → **All tabs show loaders** 🔄

### 2. Enrichment Completes → Update Data Everywhere

```typescript
// Workflow updates data and removes from enrichingColumns
await prisma.row.update({
  where: { id: rowId },
  data: {
    data: { company_name: "Acme Corp" },
    enrichingColumns: []  // Remove loader
  }
});
```
→ Supabase broadcasts → **All tabs show data** ✅

### 3. Frontend Auto-Updates

```typescript
const { updatedRows } = useTableRealtime({ tableId });
// Automatically re-renders when row.enrichingColumns changes
```

---

## Usage

### Show Table with Realtime Updates

```typescript
import { useTableRealtime } from '@/hooks/use-table-realtime';

function MyTable({ tableId }) {
  const { updatedRows } = useTableRealtime({ tableId });
  
  return (
    <table>
      {rows.map(row => {
        const updated = updatedRows.get(row.id) || row;
        return (
          <tr key={row.id}>
            {columns.map(col => (
              <td>
                {updated.enrichingColumns.includes(col.key) ? (
                  <Spinner />  // 🔄 Enriching
                ) : (
                  updated.data[col.key]  // ✅ Data
                )}
              </td>
            ))}
          </tr>
        );
      })}
    </table>
  );
}
```

### Per-Cell Helper Hook

```typescript
import { useCellEnrichmentStatus } from '@/hooks/use-table-realtime';

function Cell({ tableId, rowId, columnKey }) {
  const { isEnriching, cellData } = useCellEnrichmentStatus(
    tableId, rowId, columnKey
  );
  
  return isEnriching ? <Loader /> : <span>{cellData}</span>;
}
```

---

## Files You'll Use

| File | What It Does |
|------|--------------|
| `hooks/use-table-realtime.ts` | Subscribe to row updates |
| `providers/supabase-realtime-provider.tsx` | Realtime context (already in layout) |
| `lib/supabase.ts` | Supabase client |

---

## Environment Setup

Add to `apps/web/.env.local`:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

---

## Troubleshooting

**Not updating?**
1. Check connection: `const { isConnected } = useTableRealtime({ tableId });`
2. Verify env vars are set
3. Check Supabase Dashboard → Database → Replication is enabled for `rows` table

**Loader not showing?**
1. Verify `enrichingColumns` is set in DB:
   ```sql
   SELECT id, "enrichingColumns" FROM rows LIMIT 5;
   ```

---

## Example Component

See [components/examples/realtime-table-example.tsx](../apps/web/components/examples/realtime-table-example.tsx)

---

## Full Documentation

- [SUPABASE_REALTIME_ENRICHMENT.md](./SUPABASE_REALTIME_ENRICHMENT.md) - Complete guide
- [REALTIME_IMPLEMENTATION_SUMMARY.md](./REALTIME_IMPLEMENTATION_SUMMARY.md) - What changed

---

## Why Supabase Realtime?

- ✅ **Zero setup** - Already using Supabase
- ✅ **Multi-tab** - Works across all browser tabs
- ✅ **Cell-level** - Individual cell loaders
- ✅ **Fast** - < 100ms latency
- ✅ **Simple** - Just subscribe to table

vs Trigger.dev Realtime (job-level only) or Yjs (overkill for enrichment)

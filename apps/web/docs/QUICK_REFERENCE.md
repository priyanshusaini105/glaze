# React Query Hooks - Quick Reference

## 📋 Queries (Fetching Data)

### Tables
```tsx
import { useTables, useTable } from '@/hooks/use-query-api';

// All tables
const { data, isLoading, error, refetch } = useTables();

// Single table
const { data: table } = useTable(tableId);
```

### Rows
```tsx
import { useRows } from '@/hooks/use-query-api';

// Paginated rows
const { data } = useRows(tableId, { page: 1, limit: 20 });
const { rows, total, page, totalPages } = data || {};
```

### ICPs
```tsx
import { useIcps } from '@/hooks/use-query-api';

const { data: icps, isLoading } = useIcps();
```

## 🔄 Mutations (Creating/Updating/Deleting)

### Tables
```tsx
import { useCreateTable, useUpdateTable, useDeleteTable } from '@/hooks/use-query-api';

// Create
const { mutate: createTable, isPending } = useCreateTable();
createTable({ name: 'New Table', description: 'Optional' });

// Update (with optimistic updates!)
const { mutate: updateTable } = useUpdateTable();
updateTable({ id: tableId, data: { name: 'Updated' } });

// Delete
const { mutate: deleteTable } = useDeleteTable();
deleteTable(tableId);
```

### Columns
```tsx
import { useCreateColumn, useUpdateColumn, useDeleteColumn } from '@/hooks/use-query-api';

// Create single
const { mutate: createColumn } = useCreateColumn();
createColumn({
  tableId,
  data: { key: 'email', label: 'Email', dataType: 'email' }
});

// Create multiple
const { mutate: createColumns } = useCreateColumns();
createColumns({
  tableId,
  data: [
    { key: 'name', label: 'Name', dataType: 'text' },
    { key: 'age', label: 'Age', dataType: 'number' },
  ]
});

// Update
const { mutate: updateColumn } = useUpdateColumn();
updateColumn({ tableId, columnId, data: { label: 'New Label' } });

// Delete
const { mutate: deleteColumn } = useDeleteColumn();
deleteColumn({ tableId, columnId });
```

### Rows
```tsx
import { useCreateRow, useUpdateRow, useDeleteRow } from '@/hooks/use-query-api';

// Create
const { mutate: createRow } = useCreateRow();
createRow({
  tableId,
  data: { name: 'John', email: 'john@example.com' }
});

// Update (optimistic!)
const { mutate: updateRow } = useUpdateRow();
updateRow({
  tableId,
  rowId,
  data: { name: 'Jane' }
});

// Delete (optimistic!)
const { mutate: deleteRow } = useDeleteRow();
deleteRow({ tableId, rowId });
```

## 🎯 Mutation Callbacks

```tsx
const { mutate } = useCreateTable();

mutate(
  { name: 'New Table' },
  {
    onSuccess: (data) => {
      console.log('Created:', data);
      router.push(`/tables/${data.id}`);
    },
    onError: (error) => {
      console.error('Failed:', error);
      toast.error(error.message);
    },
    onSettled: () => {
      console.log('Done (success or error)');
    },
  }
);
```

## 🔧 Advanced Options

### Custom Refetch Interval
```tsx
const { data } = useTables({
  refetchInterval: 30000, // Every 30 seconds
});
```

### Refetch on Focus
```tsx
const { data } = useTables({
  refetchOnWindowFocus: true,
});
```

### Disable Auto-fetch
```tsx
const { data, refetch } = useTable(tableId, {
  enabled: false, // Won't fetch automatically
});

// Fetch manually when needed
refetch();
```

### Stale Time
```tsx
const { data } = useTables({
  staleTime: 5 * 60 * 1000, // 5 minutes
});
```

## 🏗️ SSR Patterns

### Pure Server Component
```tsx
import { serverApi } from '@/lib/server-api';

export default async function Page() {
  const tables = await serverApi.getTables();
  return <div>{/* render */}</div>;
}
```

### Hybrid (SSR + React Query)
```tsx
import { HydrationBoundary, QueryClient, dehydrate } from '@tanstack/react-query';
import { serverApi } from '@/lib/server-api';
import { queryKeys } from '@/lib/query-client';

export default async function Page() {
  const queryClient = new QueryClient();
  
  await queryClient.prefetchQuery({
    queryKey: queryKeys.tables.all,
    queryFn: () => serverApi.getTables(),
  });
  
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ClientComponent />
    </HydrationBoundary>
  );
}
```

## 🎨 Common Patterns

### Loading State
```tsx
const { data, isLoading, error } = useTables();

if (isLoading) return <Spinner />;
if (error) return <Error message={error.message} />;
return <div>{/* render data */}</div>;
```

### Pagination
```tsx
const [page, setPage] = useState(1);
const { data } = useRows(tableId, { page, limit: 20 });

return (
  <>
    {data?.rows.map(row => <Row key={row.id} {...row} />)}
    <Pagination
      page={page}
      totalPages={data?.totalPages || 1}
      onChange={setPage}
    />
  </>
);
```

### Manual Cache Invalidation
```tsx
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-client';

function MyComponent() {
  const queryClient = useQueryClient();
  
  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.tables.all });
  };
  
  const invalidateOne = (id: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.tables.detail(id) });
  };
}
```

### Prefetch on Hover
```tsx
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-client';
import { apiClient } from '@/lib/api-client';

function TableLink({ id }: { id: string }) {
  const queryClient = useQueryClient();
  
  const prefetch = () => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.tables.detail(id),
      queryFn: () => apiClient.getTable(id),
    });
  };
  
  return (
    <Link href={`/tables/${id}`} onMouseEnter={prefetch}>
      View Table
    </Link>
  );
}
```

## 🐛 Debugging

### Check Cache State
```tsx
import { useQueryClient } from '@tanstack/react-query';

function DebugComponent() {
  const queryClient = useQueryClient();
  
  // Get all queries
  const queries = queryClient.getQueriesData({ queryKey: queryKeys.tables.all });
  console.log('Cached queries:', queries);
  
  // Get specific query
  const table = queryClient.getQueryData(queryKeys.tables.detail('123'));
  console.log('Cached table:', table);
}
```

### React Query DevTools
- Available in dev mode
- Click floating icon in bottom-right
- Inspect queries, mutations, cache

## 📚 Type Safety

All hooks are fully typed:

```tsx
const { data } = useTables();
// data is Table[] | undefined

const { data: table } = useTable(id);
// table is Table | undefined

const { mutate } = useCreateTable();
// mutate accepts CreateTableRequest

const { data: rows } = useRows(tableId);
// rows is PaginatedRowsResponse | undefined
```

## 🚀 Performance Tips

1. **Use optimistic updates** - UI feels instant
2. **Leverage caching** - Don't refetch unnecessarily
3. **Prefetch data** - Load before needed
4. **Use SSR** - Fast initial loads
5. **Background refetch** - Keep data fresh

## ⚡ Quick Migration

```tsx
// Old
import { useTables } from '@/hooks/use-api';
const { data, loading, error } = useTables();

// New
import { useTables } from '@/hooks/use-query-api';
const { data, isLoading, error } = useTables();
```

Changes:
- `loading` → `isLoading`
- `mutate` returns `void`, use callbacks
- Automatic cache invalidation
- Optimistic updates built-in

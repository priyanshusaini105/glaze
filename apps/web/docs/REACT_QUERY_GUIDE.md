# Glaze API Integration with React Query & SSR

Complete integration guide for the Glaze API using **React Query (TanStack Query)** for optimal caching, SSR support, and optimistic updates.

## 🚀 Quick Start

### 1. Install Dependencies

```bash
pnpm install
# Dependencies already added:
# - @tanstack/react-query
# - @tanstack/react-query-devtools
```

### 2. Setup is Complete!

The `QueryProvider` is already configured in the root layout. You're ready to use React Query hooks!

## 📖 Three Approaches

### Approach 1: Server Components (Recommended for Static/Initial Data)

**Best for:** Tables list, static pages, SEO-critical pages

```tsx
// app/tables/page.tsx
import { serverApi } from '@/lib/server-api';

export default async function TablesPage() {
  // Fetch on server - no loading state, SEO-friendly
  const tables = await serverApi.getTables();

  return (
    <div>
      {tables.map(table => (
        <div key={table.id}>{table.name}</div>
      ))}
    </div>
  );
}
```

**Pros:**
- ✅ No loading spinners
- ✅ SEO-friendly (data in HTML)
- ✅ Fast initial render
- ✅ Simple code

**Cons:**
- ❌ No real-time updates
- ❌ No client-side caching
- ❌ Requires full page refresh for mutations

### Approach 2: Hybrid (SSR + React Query) - **RECOMMENDED**

**Best for:** Interactive pages with initial data

```tsx
// app/tables/page.tsx (Server Component)
import { HydrationBoundary, QueryClient, dehydrate } from '@tanstack/react-query';
import { serverApi } from '@/lib/server-api';
import { queryKeys } from '@/lib/query-client';
import { TablesClient } from './tables-client';

export default async function TablesPage() {
  const queryClient = new QueryClient();

  // Prefetch on server
  await queryClient.prefetchQuery({
    queryKey: queryKeys.tables.all,
    queryFn: () => serverApi.getTables(),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <TablesClient />
    </HydrationBoundary>
  );
}
```

```tsx
// tables-client.tsx (Client Component)
'use client';

import { useTables, useCreateTable } from '@/hooks/use-query-api';

export function TablesClient() {
  // Data already loaded on server!
  const { data: tables } = useTables();
  const { mutate: createTable } = useCreateTable();

  return (
    <div>
      {tables?.map(table => <div key={table.id}>{table.name}</div>)}
      <button onClick={() => createTable({ name: 'New' })}>
        Create
      </button>
    </div>
  );
}
```

**Pros:**
- ✅ Fast initial load (server-rendered)
- ✅ SEO-friendly
- ✅ Client-side interactivity
- ✅ Automatic refetching and caching
- ✅ Optimistic updates

**Cons:**
- ⚠️ Slightly more complex setup

### Approach 3: Client-Only (React Query)

**Best for:** Dynamic dashboards, admin panels, authenticated pages

```tsx
'use client';

import { useTables, useCreateTable } from '@/hooks/use-query-api';

export default function TablesPage() {
  const { data: tables, isLoading } = useTables();
  const { mutate: createTable } = useCreateTable();

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      {tables?.map(table => <div key={table.id}>{table.name}</div>)}
      <button onClick={() => createTable({ name: 'New' })}>
        Create
      </button>
    </div>
  );
}
```

**Pros:**
- ✅ Simple to use
- ✅ Automatic caching
- ✅ Background refetching
- ✅ Optimistic updates

**Cons:**
- ❌ Loading spinner on first visit
- ❌ Not SEO-friendly

## 🎣 React Query Hooks

All hooks use React Query under the hood for caching and state management.

### Tables

```tsx
import { 
  useTables, 
  useTable, 
  useCreateTable, 
  useUpdateTable, 
  useDeleteTable 
} from '@/hooks/use-query-api';

// Fetch all tables
const { data, isLoading, error, refetch } = useTables();

// Fetch single table
const { data: table } = useTable(tableId);

// Create table
const { mutate: createTable, isPending } = useCreateTable();
createTable({ name: 'New Table' });

// Update table (with optimistic updates!)
const { mutate: updateTable } = useUpdateTable();
updateTable({ 
  id: tableId, 
  data: { name: 'Updated' } 
});

// Delete table
const { mutate: deleteTable } = useDeleteTable();
deleteTable(tableId);
```

### Rows with Pagination

```tsx
import { useRows, useCreateRow, useUpdateRow, useDeleteRow } from '@/hooks/use-query-api';

// Fetch paginated rows
const { data } = useRows(tableId, { page: 1, limit: 20 });
const { rows, total, page, totalPages } = data || {};

// Create row
const { mutate: createRow } = useCreateRow();
createRow({ 
  tableId, 
  data: { name: 'John', email: 'john@example.com' } 
});

// Update row (optimistic!)
const { mutate: updateRow } = useUpdateRow();
updateRow({ 
  tableId, 
  rowId, 
  data: { name: 'Jane' } 
});

// Delete row (optimistic!)
const { mutate: deleteRow } = useDeleteRow();
deleteRow({ tableId, rowId });
```

### Columns

```tsx
import { 
  useCreateColumn, 
  useCreateColumns, 
  useUpdateColumn, 
  useDeleteColumn 
} from '@/hooks/use-query-api';

// Create single column
const { mutate: createColumn } = useCreateColumn();
createColumn({
  tableId,
  data: { key: 'email', label: 'Email', dataType: 'email' }
});

// Create multiple columns
const { mutate: createColumns } = useCreateColumns();
createColumns({
  tableId,
  data: [
    { key: 'name', label: 'Name', dataType: 'text' },
    { key: 'age', label: 'Age', dataType: 'number' },
  ]
});
```

## 🎯 Key Features

### 1. Automatic Caching

Data is cached automatically and reused across components:

```tsx
// Both components use the same cached data!
function ComponentA() {
  const { data } = useTables(); // Fetches
  // ...
}

function ComponentB() {
  const { data } = useTables(); // Uses cache!
  // ...
}
```

### 2. Optimistic Updates

UI updates immediately, rolls back on error:

```tsx
const { mutate: updateRow } = useUpdateRow();

// UI updates immediately, before server confirms!
updateRow({ 
  tableId, 
  rowId, 
  data: { status: 'completed' } 
});
```

### 3. Background Refetching

Data stays fresh automatically:

```tsx
const { data } = useTables({
  refetchInterval: 30000, // Refetch every 30s
  refetchOnWindowFocus: true, // Refetch when user returns to tab
});
```

### 4. Manual Cache Invalidation

```tsx
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-client';

function MyComponent() {
  const queryClient = useQueryClient();

  const handleAction = () => {
    // Invalidate all tables queries
    queryClient.invalidateQueries({ 
      queryKey: queryKeys.tables.all 
    });
  };
}
```

### 5. Prefetching

Load data before it's needed:

```tsx
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-client';
import { apiClient } from '@/lib/api-client';

function TableLink({ tableId }: { tableId: string }) {
  const queryClient = useQueryClient();

  const prefetchTable = () => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.tables.detail(tableId),
      queryFn: () => apiClient.getTable(tableId),
    });
  };

  return (
    <Link 
      href={`/tables/${tableId}`}
      onMouseEnter={prefetchTable} // Prefetch on hover!
    >
      View Table
    </Link>
  );
}
```

## 📊 Server-Side API

For Server Components or API routes:

```tsx
import { serverApi } from '@/lib/server-api';

// Server Component
export default async function Page() {
  const tables = await serverApi.getTables();
  const table = await serverApi.getTable('id');
  const rows = await serverApi.getRows('table-id', { page: 1, limit: 10 });
  const icps = await serverApi.getIcps();
  
  return <div>{/* render */}</div>;
}
```

## 🔧 Configuration

### Query Client Config

Located in `lib/query-client.ts`:

```typescript
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      gcTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
```

### Query Keys

Type-safe query keys in `lib/query-client.ts`:

```typescript
export const queryKeys = {
  tables: {
    all: ['tables'],
    detail: (id: string) => ['tables', id],
    rows: (tableId: string, page?: number) => 
      ['tables', tableId, 'rows', { page }],
  },
};
```

## 📁 File Structure

```
apps/web/
├── lib/
│   ├── api-types.ts          # TypeScript types
│   ├── api-client.ts         # HTTP client
│   ├── query-client.ts       # React Query config
│   └── server-api.ts         # Server-side utilities
├── hooks/
│   ├── use-api.ts            # Legacy hooks (deprecated)
│   └── use-query-api.ts      # React Query hooks ✨
├── providers/
│   └── query-provider.tsx    # Query provider wrapper
└── app/
    ├── layout.tsx            # Root layout with QueryProvider
    └── (dashboard)/
        └── tables/
            ├── page.tsx              # Client-side example
            ├── ssr-example/          # Server Component example
            └── hybrid-example/       # Hybrid SSR + RQ example
```

## 🎓 Best Practices

### 1. Use Hybrid Approach for Best Performance

```tsx
// ✅ Recommended: Hybrid SSR + React Query
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

### 2. Use Optimistic Updates for Better UX

```tsx
// ✅ Updates UI immediately
const { mutate } = useUpdateRow();
mutate({ tableId, rowId, data: { status: 'done' } });

// ❌ Don't manually manage loading states
const [loading, setLoading] = useState(false);
```

### 3. Leverage Automatic Refetching

```tsx
// ✅ Automatic background updates
const { data } = useTables({
  refetchInterval: 30000,
  refetchOnWindowFocus: true,
});

// ❌ Don't manually poll
useEffect(() => {
  const interval = setInterval(fetchData, 30000);
  return () => clearInterval(interval);
}, []);
```

### 4. Use Mutation Callbacks

```tsx
const { mutate } = useCreateTable();

mutate(
  { name: 'New Table' },
  {
    onSuccess: (table) => {
      router.push(`/tables/${table.id}`);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  }
);
```

## 🐛 Debugging

React Query DevTools are enabled in development:

- Open your app in development mode
- Look for the React Query icon in the bottom corner
- Click to inspect queries, mutations, and cache

## 📚 Examples

See working examples in:
- [SSR Example](../app/(dashboard)/tables/ssr-example/page.tsx) - Pure Server Component
- [Hybrid Example](../app/(dashboard)/tables/hybrid-example/page.tsx) - SSR + React Query
- [Client Example](../app/(dashboard)/tables/page.tsx) - Client-side only

## 🔄 Migration from Old Hooks

```tsx
// Old (use-api.ts)
import { useTables } from '@/hooks/use-api';
const { data, loading, error } = useTables();

// New (use-query-api.ts)
import { useTables } from '@/hooks/use-query-api';
const { data, isLoading, error } = useTables();

// Changes:
// - loading → isLoading
// - No need for refetch (automatic!)
// - Optimistic updates built-in
```

## 📖 Resources

- [React Query Docs](https://tanstack.com/query/latest/docs/react/overview)
- [Next.js 15 Docs](https://nextjs.org/docs)
- [Server Components](https://nextjs.org/docs/app/building-your-application/rendering/server-components)

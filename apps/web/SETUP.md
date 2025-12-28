# Glaze Frontend - Setup Instructions

## Prerequisites

- Node.js 18+ 
- pnpm (recommended) or npm

## Quick Start

### 1. Install Dependencies

```bash
# From the workspace root
pnpm install

# Or from apps/web
cd apps/web && pnpm install
```

### 2. Environment Variables

Create `apps/web/.env.local`:

```bash
# API Base URL
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### 3. Start Development Server

```bash
# From workspace root
pnpm --filter web dev

# Or from apps/web
pnpm dev
```

The app will be available at http://localhost:3000

## 🏗️ Architecture

### API Integration

The frontend uses **React Query (TanStack Query)** for data fetching with three approaches:

1. **Server Components** - Pure SSR, great for SEO
2. **Hybrid** (Recommended) - SSR + React Query for best of both worlds
3. **Client-Only** - React Query for dynamic data

### Tech Stack

- **Next.js 15** - App Router with Server Components
- **React 19** - Latest React features
- **React Query** - Data fetching and caching
- **TypeScript** - Full type safety
- **Tailwind CSS** - Styling
- **Radix UI** - Accessible components

## 📁 Project Structure

```
apps/web/
├── app/                      # Next.js App Router
│   ├── layout.tsx           # Root layout with QueryProvider
│   ├── page.tsx             # Home page
│   └── (dashboard)/         # Dashboard routes
│       └── tables/          # Tables management
│           ├── page.tsx               # Tables list (React Query)
│           ├── new/                   # Create table
│           ├── [tableId]/             # Table detail
│           ├── ssr-example/           # Pure SSR example
│           └── hybrid-example/        # Hybrid SSR+RQ example
├── components/              # React components
│   ├── ui/                 # Reusable UI components
│   ├── tables/             # Table-specific components
│   └── examples/           # Example/demo components
├── hooks/                   # Custom React hooks
│   ├── use-api.ts          # Legacy hooks (deprecated)
│   └── use-query-api.ts    # React Query hooks ✨
├── lib/                     # Utilities and helpers
│   ├── api-types.ts        # TypeScript types from OpenAPI
│   ├── api-client.ts       # HTTP client
│   ├── query-client.ts     # React Query configuration
│   ├── server-api.ts       # Server-side utilities
│   └── utils.ts            # General utilities
├── providers/               # React context providers
│   └── query-provider.tsx  # React Query provider
└── docs/                    # Documentation
    ├── REACT_QUERY_GUIDE.md              # Main usage guide ✨
    ├── REACT_QUERY_MIGRATION_SUMMARY.md  # Migration summary ✨
    ├── API_INTEGRATION.md                # API reference
    └── API_INTEGRATION_SUMMARY.md        # Original summary
```

## 🚀 Usage Examples

### Fetching Data (Client Component)

```tsx
'use client';

import { useTables } from '@/hooks/use-query-api';

export default function TablesPage() {
  const { data: tables, isLoading } = useTables();

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      {tables?.map(table => (
        <div key={table.id}>{table.name}</div>
      ))}
    </div>
  );
}
```

### Server Component (SSR)

```tsx
import { serverApi } from '@/lib/server-api';

export default async function TablesPage() {
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

### Hybrid Approach (Recommended)

```tsx
// page.tsx (Server Component)
import { HydrationBoundary, QueryClient, dehydrate } from '@tanstack/react-query';
import { serverApi } from '@/lib/server-api';
import { queryKeys } from '@/lib/query-client';
import { TablesClient } from './tables-client';

export default async function TablesPage() {
  const queryClient = new QueryClient();

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
  const { data: tables } = useTables(); // Already loaded!
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

### Creating Data

```tsx
'use client';

import { useCreateTable } from '@/hooks/use-query-api';

export function CreateTableButton() {
  const { mutate: createTable, isPending } = useCreateTable();

  const handleCreate = () => {
    createTable(
      { name: 'My Table', description: 'Optional' },
      {
        onSuccess: (table) => {
          console.log('Created:', table);
        },
        onError: (error) => {
          console.error('Failed:', error);
        },
      }
    );
  };

  return (
    <button onClick={handleCreate} disabled={isPending}>
      {isPending ? 'Creating...' : 'Create Table'}
    </button>
  );
}
```

## 🎣 Available Hooks

### Queries (Data Fetching)

```tsx
import {
  useTables,      // Fetch all tables
  useTable,       // Fetch single table
  useRows,        // Fetch paginated rows
  useIcps,        // Fetch ICPs
} from '@/hooks/use-query-api';
```

### Mutations (Create/Update/Delete)

```tsx
import {
  useCreateTable, useUpdateTable, useDeleteTable,
  useCreateColumn, useUpdateColumn, useDeleteColumn,
  useCreateRow, useUpdateRow, useDeleteRow,
  useCreateColumns,
  useResolveIcp,
} from '@/hooks/use-query-api';
```

## 🔧 Configuration

### React Query Settings

Located in `lib/query-client.ts`:

- Stale time: 1 minute
- Cache time: 5 minutes
- Auto-retry: 1 time
- Refetch on focus: Disabled

### API Base URL

Set in `.env.local`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## 🐛 Debugging

### React Query DevTools

Available in development mode:
- Open your app
- Look for the React Query icon (bottom-right)
- Click to inspect queries, mutations, and cache

### Common Commands

```bash
# Install dependencies
pnpm install

# Run dev server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Type checking
pnpm check-types

# Linting
pnpm lint
```

## 📚 Documentation

- **[React Query Guide](./docs/REACT_QUERY_GUIDE.md)** - Complete usage guide ⭐
- **[Migration Summary](./docs/REACT_QUERY_MIGRATION_SUMMARY.md)** - What changed
- **[API Integration](./docs/API_INTEGRATION.md)** - API reference
- **[API Summary](./docs/API_INTEGRATION_SUMMARY.md)** - Original summary

## 🎯 Best Practices

1. **Use the Hybrid approach** for production pages
2. **Enable optimistic updates** for better UX
3. **Leverage automatic caching** - don't refetch manually
4. **Use Server Components** when possible
5. **Check DevTools** during development

## 🚢 Deployment

```bash
# Build production bundle
pnpm build

# Start production server
pnpm start
```

### Environment Variables

Make sure to set in production:

```bash
NEXT_PUBLIC_API_URL=https://your-api-url.com
```

## 📖 Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [React Query Documentation](https://tanstack.com/query/latest)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [TypeScript](https://www.typescriptlang.org/docs)

## 🤝 Contributing

1. Follow the existing patterns
2. Use TypeScript for type safety
3. Write documentation for new features
4. Test with React Query DevTools

## 📄 License

See the main repository LICENSE file.

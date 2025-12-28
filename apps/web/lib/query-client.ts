/**
 * React Query (TanStack Query) Configuration
 * Provides caching, background refetching, and optimistic updates
 */

import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Stale time: how long data is considered fresh
      staleTime: 60 * 1000, // 1 minute
      // Cache time: how long inactive data stays in cache
      gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime)
      // Retry failed requests
      retry: 1,
      // Refetch on window focus
      refetchOnWindowFocus: false,
      // Refetch on reconnect
      refetchOnReconnect: true,
    },
    mutations: {
      // Retry failed mutations
      retry: 0,
    },
  },
});

// Query keys for type-safe query invalidation
export const queryKeys = {
  tables: {
    all: ['tables'] as const,
    detail: (id: string) => ['tables', id] as const,
    rows: (tableId: string, page?: number, limit?: number) =>
      ['tables', tableId, 'rows', { page, limit }] as const,
  },
  columns: {
    all: (tableId: string) => ['tables', tableId, 'columns'] as const,
    detail: (tableId: string, columnId: string) =>
      ['tables', tableId, 'columns', columnId] as const,
  },
  icps: {
    all: ['icps'] as const,
    detail: (id: string) => ['icps', id] as const,
  },
} as const;

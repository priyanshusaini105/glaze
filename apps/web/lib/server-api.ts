/**
 * Server-side utilities for data fetching
 * Use these in Server Components or getServerSideProps
 */

import { apiClient } from '@/lib/api-client';
import { QueryClient, dehydrate, type DehydratedState } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-client';
import type { GetRowsParams } from '@/lib/api-types';

/**
 * Prefetch tables data for SSR
 * Use in Server Components or getServerSideProps
 */
export async function prefetchTables(): Promise<DehydratedState> {
  const queryClient = new QueryClient();

  await queryClient.prefetchQuery({
    queryKey: queryKeys.tables.all,
    queryFn: () => apiClient.getTables(),
  });

  return dehydrate(queryClient);
}

/**
 * Prefetch single table data for SSR
 */
export async function prefetchTable(id: string): Promise<DehydratedState> {
  const queryClient = new QueryClient();

  await queryClient.prefetchQuery({
    queryKey: queryKeys.tables.detail(id),
    queryFn: () => apiClient.getTable(id),
  });

  return dehydrate(queryClient);
}

/**
 * Prefetch table with rows for SSR
 */
export async function prefetchTableWithRows(
  id: string,
  params?: GetRowsParams
): Promise<DehydratedState> {
  const queryClient = new QueryClient();

  // Prefetch table and rows in parallel
  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: queryKeys.tables.detail(id),
      queryFn: () => apiClient.getTable(id),
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.tables.rows(id, params?.page, params?.limit),
      queryFn: () => apiClient.getRows(id, params),
    }),
  ]);

  return dehydrate(queryClient);
}

/**
 * Prefetch ICPs for SSR
 */
export async function prefetchIcps(): Promise<DehydratedState> {
  const queryClient = new QueryClient();

  await queryClient.prefetchQuery({
    queryKey: queryKeys.icps.all,
    queryFn: () => apiClient.getIcps(),
  });

  return dehydrate(queryClient);
}

/**
 * Fetch data on server (for Server Components)
 * Returns data directly without React Query
 */
export const serverApi = {
  getTables: () => apiClient.getTables(),
  getTable: (id: string) => apiClient.getTable(id),
  getRows: (tableId: string, params?: GetRowsParams) => apiClient.getRows(tableId, params),
  getIcps: () => apiClient.getIcps(),
} as const;

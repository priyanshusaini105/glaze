/**
 * React Query hooks for Glaze API
 * Provides data fetching with caching, background updates, and optimistic mutations
 */

'use client';

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-client';
import type {
  Table,
  CreateTableRequest,
  UpdateTableRequest,
  Column,
  CreateColumnRequest,
  CreateColumnsRequest,
  UpdateColumnRequest,
  Row,
  CreateRowRequest,
  UpdateRowRequest,
  GetRowsParams,
  PaginatedRowsResponse,
  ICP,
  ResolveICPRequest,
  SeatStatus,
} from '@/lib/api-types';

// ============= Tables =============

export function useTables(options?: Omit<UseQueryOptions<Table[]>, 'queryKey' | 'queryFn'>) {
  return useQuery({
    queryKey: queryKeys.tables.all,
    queryFn: () => apiClient.getTables(),
    ...options,
  });
}

export function useTable(
  id: string | null,
  options?: Omit<UseQueryOptions<Table>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: id ? queryKeys.tables.detail(id) : ['tables', 'null'],
    queryFn: () => (id ? apiClient.getTable(id) : Promise.reject('No table ID')),
    enabled: !!id,
    ...options,
  });
}

export function useCreateTable(
  options?: UseMutationOptions<Table, Error, CreateTableRequest>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTableRequest) => apiClient.createTable(data),
    onSuccess: (data) => {
      // Invalidate and refetch tables list
      queryClient.invalidateQueries({ queryKey: queryKeys.tables.all });
      // Set the new table in cache
      queryClient.setQueryData(queryKeys.tables.detail(data.id), data);
    },
    ...options,
  });
}

export function useUpdateTable(
  options?: UseMutationOptions<Table, Error, { id: string; data: UpdateTableRequest }, { previousTable?: Table }>
) {
  const queryClient = useQueryClient();

  return useMutation<Table, Error, { id: string; data: UpdateTableRequest }, { previousTable?: Table }>({
    mutationFn: ({ id, data }: { id: string; data: UpdateTableRequest }) =>
      apiClient.updateTable(id, data),
    onMutate: async ({ id, data }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.tables.detail(id) });

      // Snapshot the previous value
      const previousTable = queryClient.getQueryData<Table>(queryKeys.tables.detail(id));

      // Optimistically update to the new value
      if (previousTable) {
        queryClient.setQueryData<Table>(queryKeys.tables.detail(id), {
          ...previousTable,
          ...data,
        });
      }

      return { previousTable };
    },
    onError: (err, { id }, context) => {
      // Rollback on error
      if (context?.previousTable) {
        queryClient.setQueryData(queryKeys.tables.detail(id), context.previousTable);
      }
    },
    onSuccess: (data, { id }) => {
      // Update cache with server data
      queryClient.setQueryData(queryKeys.tables.detail(id), data);
      // Invalidate tables list to update any aggregated data
      queryClient.invalidateQueries({ queryKey: queryKeys.tables.all });
    },
    ...options,
  });
}

export function useDeleteTable(options?: UseMutationOptions<void, Error, string>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiClient.deleteTable(id),
    onSuccess: (_, id) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: queryKeys.tables.detail(id) });
      // Invalidate tables list
      queryClient.invalidateQueries({ queryKey: queryKeys.tables.all });
    },
    ...options,
  });
}

// ============= Columns =============

export function useCreateColumn(
  options?: UseMutationOptions<Column, Error, { tableId: string; data: CreateColumnRequest }>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ tableId, data }: { tableId: string; data: CreateColumnRequest }) =>
      apiClient.createColumn(tableId, data),
    onSuccess: (_, { tableId }) => {
      // Invalidate table to refetch with new column
      queryClient.invalidateQueries({ queryKey: queryKeys.tables.detail(tableId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.columns.all(tableId) });
    },
    ...options,
  });
}

export function useCreateColumns(
  options?: UseMutationOptions<Column[], Error, { tableId: string; data: CreateColumnsRequest[] }>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ tableId, data }: { tableId: string; data: CreateColumnsRequest[] }) =>
      apiClient.createColumns(tableId, data),
    onSuccess: (_, { tableId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tables.detail(tableId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.columns.all(tableId) });
    },
    ...options,
  });
}

export function useUpdateColumn(
  options?: UseMutationOptions<
    Column,
    Error,
    { tableId: string; columnId: string; data: UpdateColumnRequest }
  >
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      tableId,
      columnId,
      data,
    }: {
      tableId: string;
      columnId: string;
      data: UpdateColumnRequest;
    }) => apiClient.updateColumn(tableId, columnId, data),
    onSuccess: (_, { tableId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tables.detail(tableId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.columns.all(tableId) });
    },
    ...options,
  });
}

export function useDeleteColumn(
  options?: UseMutationOptions<void, Error, { tableId: string; columnId: string }>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ tableId, columnId }: { tableId: string; columnId: string }) =>
      apiClient.deleteColumn(tableId, columnId),
    onSuccess: (_, { tableId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tables.detail(tableId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.columns.all(tableId) });
    },
    ...options,
  });
}

// ============= Rows =============

export function useRows(
  tableId: string | null,
  params?: GetRowsParams,
  options?: Omit<UseQueryOptions<PaginatedRowsResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: tableId
      ? queryKeys.tables.rows(tableId, params?.page, params?.limit)
      : ['rows', 'null'],
    queryFn: () =>
      tableId ? apiClient.getRows(tableId, params) : Promise.reject('No table ID'),
    enabled: !!tableId,
    ...options,
  });
}

export function useCreateRow(
  options?: UseMutationOptions<Row, Error, { tableId: string; data: CreateRowRequest }>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ tableId, data }: { tableId: string; data: CreateRowRequest }) =>
      apiClient.createRow(tableId, data),
    onSuccess: (_, { tableId }) => {
      // Invalidate all row queries for this table
      queryClient.invalidateQueries({
        queryKey: ['tables', tableId, 'rows'],
      });
    },
    ...options,
  });
}

export function useUpdateRow(
  options?: UseMutationOptions<
    Row,
    Error,
    { tableId: string; rowId: string; data: UpdateRowRequest },
    { previousData: [readonly unknown[], PaginatedRowsResponse | undefined][] }
  >
) {
  const queryClient = useQueryClient();

  return useMutation<
    Row,
    Error,
    { tableId: string; rowId: string; data: UpdateRowRequest },
    { previousData: [readonly unknown[], PaginatedRowsResponse | undefined][] }
  >({
    mutationFn: ({
      tableId,
      rowId,
      data,
    }: {
      tableId: string;
      rowId: string;
      data: UpdateRowRequest;
    }) => apiClient.updateRow(tableId, rowId, data),
    onMutate: async ({ tableId, rowId, data }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: ['tables', tableId, 'rows'],
      });

      // Snapshot previous value
      const previousData = queryClient.getQueriesData<PaginatedRowsResponse>({
        queryKey: ['tables', tableId, 'rows'],
      });

      // Optimistically update all matching queries
      queryClient.setQueriesData<PaginatedRowsResponse>(
        { queryKey: ['tables', tableId, 'rows'] },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data.map((row) =>
              row.id === rowId ? { ...row, data: { ...row.data, ...data.data } } : row
            ),
          };
        }
      );

      return { previousData };
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    onError: (_err, { tableId: _tableId }, context) => {
      // Rollback on error
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSettled: (_, __, { tableId }) => {
      // Always refetch after error or success
      queryClient.invalidateQueries({
        queryKey: ['tables', tableId, 'rows'],
      });
    },
    ...options,
  });
}

export function useDeleteRow(
  options?: UseMutationOptions<void, Error, { tableId: string; rowId: string }, { previousData: [readonly unknown[], PaginatedRowsResponse | undefined][] }>
) {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { tableId: string; rowId: string }, { previousData: [readonly unknown[], PaginatedRowsResponse | undefined][] }>({
    mutationFn: ({ tableId, rowId }: { tableId: string; rowId: string }) =>
      apiClient.deleteRow(tableId, rowId),
    onMutate: async ({ tableId, rowId }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: ['tables', tableId, 'rows'],
      });

      // Snapshot previous value
      const previousData = queryClient.getQueriesData<PaginatedRowsResponse>({
        queryKey: ['tables', tableId, 'rows'],
      });

      // Optimistically remove the row
      queryClient.setQueriesData<PaginatedRowsResponse>(
        { queryKey: ['tables', tableId, 'rows'] },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data.filter((row) => row.id !== rowId),
            meta: { ...old.meta, total: old.meta.total - 1 },
          };
        }
      );

      return { previousData };
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    onError: (_err, { tableId: _tableId }, context) => {
      // Rollback on error
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSettled: (_, __, { tableId }) => {
      queryClient.invalidateQueries({
        queryKey: ['tables', tableId, 'rows'],
      });
    },
    ...options,
  });
}

// ============= ICPs =============

export function useIcps(options?: Omit<UseQueryOptions<ICP[]>, 'queryKey' | 'queryFn'>) {
  return useQuery({
    queryKey: queryKeys.icps.all,
    queryFn: () => apiClient.getIcps(),
    ...options,
  });
}

export function useResolveIcp(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  options?: UseMutationOptions<any, Error, ResolveICPRequest>
) {
  return useMutation({
    mutationFn: (data: ResolveICPRequest) => apiClient.resolveIcp(data),
    ...options,
  });
}

// ============= Seat Status =============

export function useSeatStatus(
  options?: Omit<UseQueryOptions<SeatStatus>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['seats', 'status'],
    queryFn: () => apiClient.getSeatStatus(),
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    ...options,
  });
}

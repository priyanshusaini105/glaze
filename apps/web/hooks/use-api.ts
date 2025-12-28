/**
 * React hooks for Glaze API
 * Provides hooks for data fetching, mutations, and state management
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
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
} from '@/lib/api-types';

// ============= Generic Hook State =============
interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

interface UseMutationState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mutate: (...args: any[]) => Promise<T | undefined>;
  reset: () => void;
}

// ============= Tables Hooks =============
export function useTables() {
  const [state, setState] = useState<UseApiState<Table[]>>({
    data: null,
    loading: true,
    error: null,
  });

  const fetchTables = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const tables = await apiClient.getTables();
      setState({ data: tables, loading: false, error: null });
    } catch (error) {
      setState({
        data: null,
        loading: false,
        error: error instanceof Error ? error : new Error('Failed to fetch tables'),
      });
    }
  }, []);

  useEffect(() => {
    fetchTables();
  }, [fetchTables]);

  return { ...state, refetch: fetchTables };
}

export function useTable(id: string | null) {
  const [state, setState] = useState<UseApiState<Table>>({
    data: null,
    loading: true,
    error: null,
  });

  const fetchTable = useCallback(async () => {
    if (!id) {
      setState({ data: null, loading: false, error: null });
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const table = await apiClient.getTable(id);
      setState({ data: table, loading: false, error: null });
    } catch (error) {
      setState({
        data: null,
        loading: false,
        error: error instanceof Error ? error : new Error('Failed to fetch table'),
      });
    }
  }, [id]);

  useEffect(() => {
    fetchTable();
  }, [fetchTable]);

  return { ...state, refetch: fetchTable };
}

export function useCreateTable(): UseMutationState<Table> {
  const [state, setState] = useState<Omit<UseMutationState<Table>, 'mutate' | 'reset'>>({
    data: null,
    loading: false,
    error: null,
  });

  const mutate = useCallback(async (data: CreateTableRequest) => {
    setState({ data: null, loading: true, error: null });
    try {
      const table = await apiClient.createTable(data);
      setState({ data: table, loading: false, error: null });
      return table;
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to create table');
      setState({ data: null, loading: false, error: err });
      throw err;
    }
  }, []);

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  return { ...state, mutate, reset };
}

export function useUpdateTable(): UseMutationState<Table> {
  const [state, setState] = useState<Omit<UseMutationState<Table>, 'mutate' | 'reset'>>({
    data: null,
    loading: false,
    error: null,
  });

  const mutate = useCallback(async (id: string, data: UpdateTableRequest) => {
    setState({ data: null, loading: true, error: null });
    try {
      const table = await apiClient.updateTable(id, data);
      setState({ data: table, loading: false, error: null });
      return table;
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to update table');
      setState({ data: null, loading: false, error: err });
      throw err;
    }
  }, []);

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  return { ...state, mutate, reset };
}

export function useDeleteTable(): UseMutationState<void> {
  const [state, setState] = useState<Omit<UseMutationState<void>, 'mutate' | 'reset'>>({
    data: null,
    loading: false,
    error: null,
  });

  const mutate = useCallback(async (id: string) => {
    setState({ data: null, loading: true, error: null });
    try {
      await apiClient.deleteTable(id);
      setState({ data: null, loading: false, error: null });
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to delete table');
      setState({ data: null, loading: false, error: err });
      throw err;
    }
  }, []);

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  return { ...state, mutate, reset };
}

// ============= Columns Hooks =============
export function useCreateColumn(): UseMutationState<Column> {
  const [state, setState] = useState<Omit<UseMutationState<Column>, 'mutate' | 'reset'>>({
    data: null,
    loading: false,
    error: null,
  });

  const mutate = useCallback(async (tableId: string, data: CreateColumnRequest) => {
    setState({ data: null, loading: true, error: null });
    try {
      const column = await apiClient.createColumn(tableId, data);
      setState({ data: column, loading: false, error: null });
      return column;
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to create column');
      setState({ data: null, loading: false, error: err });
      throw err;
    }
  }, []);

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  return { ...state, mutate, reset };
}

export function useCreateColumns(): UseMutationState<Column[]> {
  const [state, setState] = useState<Omit<UseMutationState<Column[]>, 'mutate' | 'reset'>>({
    data: null,
    loading: false,
    error: null,
  });

  const mutate = useCallback(async (tableId: string, data: CreateColumnsRequest[]) => {
    setState({ data: null, loading: true, error: null });
    try {
      const columns = await apiClient.createColumns(tableId, data);
      setState({ data: columns, loading: false, error: null });
      return columns;
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to create columns');
      setState({ data: null, loading: false, error: err });
      throw err;
    }
  }, []);

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  return { ...state, mutate, reset };
}

export function useUpdateColumn(): UseMutationState<Column> {
  const [state, setState] = useState<Omit<UseMutationState<Column>, 'mutate' | 'reset'>>({
    data: null,
    loading: false,
    error: null,
  });

  const mutate = useCallback(async (tableId: string, columnId: string, data: UpdateColumnRequest) => {
    setState({ data: null, loading: true, error: null });
    try {
      const column = await apiClient.updateColumn(tableId, columnId, data);
      setState({ data: column, loading: false, error: null });
      return column;
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to update column');
      setState({ data: null, loading: false, error: err });
      throw err;
    }
  }, []);

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  return { ...state, mutate, reset };
}

export function useDeleteColumn(): UseMutationState<void> {
  const [state, setState] = useState<Omit<UseMutationState<void>, 'mutate' | 'reset'>>({
    data: null,
    loading: false,
    error: null,
  });

  const mutate = useCallback(async (tableId: string, columnId: string) => {
    setState({ data: null, loading: true, error: null });
    try {
      await apiClient.deleteColumn(tableId, columnId);
      setState({ data: null, loading: false, error: null });
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to delete column');
      setState({ data: null, loading: false, error: err });
      throw err;
    }
  }, []);

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  return { ...state, mutate, reset };
}

// ============= Rows Hooks =============
export function useRows(tableId: string | null, params?: GetRowsParams) {
  const [state, setState] = useState<UseApiState<PaginatedRowsResponse>>({
    data: null,
    loading: true,
    error: null,
  });

  const fetchRows = useCallback(async () => {
    if (!tableId) {
      setState({ data: null, loading: false, error: null });
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const rows = await apiClient.getRows(tableId, params);
      setState({ data: rows, loading: false, error: null });
    } catch (error) {
      setState({
        data: null,
        loading: false,
        error: error instanceof Error ? error : new Error('Failed to fetch rows'),
      });
    }
  }, [tableId, params]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  return { ...state, refetch: fetchRows };
}

export function useCreateRow(): UseMutationState<Row> {
  const [state, setState] = useState<Omit<UseMutationState<Row>, 'mutate' | 'reset'>>({
    data: null,
    loading: false,
    error: null,
  });

  const mutate = useCallback(async (tableId: string, data: CreateRowRequest) => {
    setState({ data: null, loading: true, error: null });
    try {
      const row = await apiClient.createRow(tableId, data);
      setState({ data: row, loading: false, error: null });
      return row;
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to create row');
      setState({ data: null, loading: false, error: err });
      throw err;
    }
  }, []);

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  return { ...state, mutate, reset };
}

export function useUpdateRow(): UseMutationState<Row> {
  const [state, setState] = useState<Omit<UseMutationState<Row>, 'mutate' | 'reset'>>({
    data: null,
    loading: false,
    error: null,
  });

  const mutate = useCallback(async (tableId: string, rowId: string, data: UpdateRowRequest) => {
    setState({ data: null, loading: true, error: null });
    try {
      const row = await apiClient.updateRow(tableId, rowId, data);
      setState({ data: row, loading: false, error: null });
      return row;
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to update row');
      setState({ data: null, loading: false, error: err });
      throw err;
    }
  }, []);

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  return { ...state, mutate, reset };
}

export function useDeleteRow(): UseMutationState<void> {
  const [state, setState] = useState<Omit<UseMutationState<void>, 'mutate' | 'reset'>>({
    data: null,
    loading: false,
    error: null,
  });

  const mutate = useCallback(async (tableId: string, rowId: string) => {
    setState({ data: null, loading: true, error: null });
    try {
      await apiClient.deleteRow(tableId, rowId);
      setState({ data: null, loading: false, error: null });
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to delete row');
      setState({ data: null, loading: false, error: err });
      throw err;
    }
  }, []);

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  return { ...state, mutate, reset };
}

// ============= ICPs Hooks =============
export function useIcps() {
  const [state, setState] = useState<UseApiState<ICP[]>>({
    data: null,
    loading: true,
    error: null,
  });

  const fetchIcps = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const icps = await apiClient.getIcps();
      setState({ data: icps, loading: false, error: null });
    } catch (error) {
      setState({
        data: null,
        loading: false,
        error: error instanceof Error ? error : new Error('Failed to fetch ICPs'),
      });
    }
  }, []);

  useEffect(() => {
    fetchIcps();
  }, [fetchIcps]);

  return { ...state, refetch: fetchIcps };
}

export function useResolveIcp(): UseMutationState<unknown> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [state, setState] = useState<Omit<UseMutationState<any>, 'mutate' | 'reset'>>({
    data: null,
    loading: false,
    error: null,
  });

  const mutate = useCallback(async (data: ResolveICPRequest) => {
    setState({ data: null, loading: true, error: null });
    try {
      const result = await apiClient.resolveIcp(data);
      setState({ data: result, loading: false, error: null });
      return result;
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to resolve ICP');
      setState({ data: null, loading: false, error: err });
      throw err;
    }
  }, []);

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  return { ...state, mutate, reset };
}

'use client';

import { useEffect, useCallback, useState, useRef } from 'react';
import { useSupabaseRealtime } from '@/providers/supabase-realtime-provider';

export interface TableRow {
  id: string;
  tableId: string;
  data: Record<string, any>;
  status: string;
  enrichingColumns: string[];
  updatedAt: string;
  [key: string]: any;
}

export interface UseTableRealtimeOptions {
  tableId: string;
  enabled?: boolean;
  onRowUpdate?: (row: TableRow) => void;
  onRowInsert?: (row: TableRow) => void;
  onRowDelete?: (row: { id: string }) => void;
}

export interface UseTableRealtimeReturn {
  isConnected: boolean;
  updatedRows: Map<string, TableRow>;
  clearUpdates: () => void;
}

/**
 * Hook to subscribe to real-time updates for a specific table's rows
 * Automatically shows loaders and broadcasts data changes across all browser tabs
 */
export function useTableRealtime({
  tableId,
  enabled = true,
  onRowUpdate,
  onRowInsert,
  onRowDelete,
}: UseTableRealtimeOptions): UseTableRealtimeReturn {
  const { isConnected, subscribe, unsubscribe } = useSupabaseRealtime();
  const [updatedRows, setUpdatedRows] = useState<Map<string, TableRow>>(new Map());

  // Refs for props to avoid stale closures
  const onRowUpdatePropRef = useRef(onRowUpdate);
  const onRowInsertPropRef = useRef(onRowInsert);
  const onRowDeletePropRef = useRef(onRowDelete);

  useEffect(() => {
    onRowUpdatePropRef.current = onRowUpdate;
    onRowInsertPropRef.current = onRowInsert;
    onRowDeletePropRef.current = onRowDelete;
  }, [onRowUpdate, onRowInsert, onRowDelete]);

  // Store callbacks in refs to avoid recreating them on every render
  // We use refs to keep the latest callbacks without causing re-renders
  const onRowUpdateCallback = useCallback((row: TableRow) => {
    console.log('[useTableRealtime] Row UPDATE event received:', {
      rowId: row.id,
      enrichingColumns: row.enrichingColumns,
      dataKeys: Object.keys(row.data || {}),
      timestamp: new Date().toISOString()
    });

    // Update local state
    setUpdatedRows((prev) => new Map(prev).set(row.id, row));

    // Call custom callback if provided
    if (onRowUpdatePropRef.current) {
      onRowUpdatePropRef.current(row);
    }
  }, []); // Empty deps - callback reference stays stable

  const onRowInsertCallback = useCallback((row: TableRow) => {
    // Update local state
    setUpdatedRows((prev) => new Map(prev).set(row.id, row));

    // Call custom callback if provided
    if (onRowInsertPropRef.current) {
      onRowInsertPropRef.current(row);
    }
  }, []); // Empty deps - callback reference stays stable

  const onRowDeleteCallback = useCallback((row: { id: string }) => {
    // Remove from local state
    setUpdatedRows((prev) => {
      const newMap = new Map(prev);
      newMap.delete(row.id);
      return newMap;
    });

    // Call custom callback if provided
    if (onRowDeletePropRef.current) {
      onRowDeletePropRef.current(row);
    }
  }, []); // Empty deps - callback reference stays stable

  useEffect(() => {
    if (!enabled || !tableId) {
      console.log('[useTableRealtime] Subscription disabled:', { enabled, tableId });
      return;
    }

    const channelName = `table_${tableId}_rows`;
    console.log('[useTableRealtime] Setting up subscription:', { channelName, tableId });

    // Subscribe to row changes for this specific table
    subscribe(channelName, {
      table: 'rows',
      schema: 'public',
      filter: `"tableId"=eq.${tableId}`,
      onUpdate: (payload: any) => onRowUpdateCallback(payload.new as TableRow),
      onInsert: (payload: any) => onRowInsertCallback(payload.new as TableRow),
      onDelete: (payload: any) => onRowDeleteCallback(payload.old as { id: string }),
    });

    return () => {
      console.log('[useTableRealtime] Cleaning up subscription:', channelName);
      unsubscribe(channelName);
    };
  }, [tableId, enabled, subscribe, unsubscribe, onRowUpdateCallback, onRowInsertCallback, onRowDeleteCallback]);

  const clearUpdates = useCallback(() => {
    setUpdatedRows(new Map());
  }, []);

  return {
    isConnected,
    updatedRows,
    clearUpdates,
  };
}

/**
 * Helper hook to track enrichment status for specific cells
 */
export function useCellEnrichmentStatus(
  tableId: string,
  rowId: string,
  columnKey: string
): {
  isEnriching: boolean;
  cellData: any;
} {
  const [isEnriching, setIsEnriching] = useState(false);
  const [cellData, setCellData] = useState<any>(null);

  const { updatedRows } = useTableRealtime({
    tableId,
    enabled: true,
    onRowUpdate: (row) => {
      if (row.id === rowId) {
        // Check if this column is being enriched
        setIsEnriching(row.enrichingColumns.includes(columnKey));

        // Update cell data if available
        if (row.data && row.data[columnKey]) {
          setCellData(row.data[columnKey]);
        }
      }
    },
  });

  return {
    isEnriching,
    cellData,
  };
}

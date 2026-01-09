'use client';

import { useEffect, useCallback, useState, useRef } from 'react';
import { useSupabaseRealtime, SubscriptionStatus } from '@/providers/supabase-realtime-provider';

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
  subscriptionStatus: SubscriptionStatus | undefined;
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
  const { isConnected, subscribe, unsubscribe, getChannelStatus } = useSupabaseRealtime();
  const [updatedRows, setUpdatedRows] = useState<Map<string, TableRow>>(new Map());
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | undefined>();

  // Track if component is mounted to prevent state updates after unmount
  const isMountedRef = useRef(true);

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
  const onRowUpdateCallback = useCallback((row: TableRow) => {
    if (!isMountedRef.current) return;

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
  }, []);

  const onRowInsertCallback = useCallback((row: TableRow) => {
    if (!isMountedRef.current) return;

    console.log('[useTableRealtime] Row INSERT event received:', {
      rowId: row.id,
      timestamp: new Date().toISOString()
    });

    // Update local state
    setUpdatedRows((prev) => new Map(prev).set(row.id, row));

    // Call custom callback if provided
    if (onRowInsertPropRef.current) {
      onRowInsertPropRef.current(row);
    }
  }, []);

  const onRowDeleteCallback = useCallback((row: { id: string }) => {
    if (!isMountedRef.current) return;

    console.log('[useTableRealtime] Row DELETE event received:', {
      rowId: row.id,
      timestamp: new Date().toISOString()
    });

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
  }, []);

  // Poll for subscription status
  useEffect(() => {
    if (!tableId || !enabled) return;

    const channelName = `table_${tableId}_rows`;

    const checkStatus = () => {
      const status = getChannelStatus(channelName);
      if (isMountedRef.current) {
        setSubscriptionStatus(status);
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 1000);

    return () => clearInterval(interval);
  }, [tableId, enabled, getChannelStatus]);

  useEffect(() => {
    isMountedRef.current = true;

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
      isMountedRef.current = false;
      console.log('[useTableRealtime] Cleaning up subscription:', channelName);
      // Use async unsubscribe - fire and forget on cleanup
      unsubscribe(channelName).catch((err) => {
        console.warn('[useTableRealtime] Cleanup error:', err);
      });
    };
  }, [tableId, enabled, subscribe, unsubscribe, onRowUpdateCallback, onRowInsertCallback, onRowDeleteCallback]);

  const clearUpdates = useCallback(() => {
    setUpdatedRows(new Map());
  }, []);

  return {
    isConnected,
    subscriptionStatus,
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

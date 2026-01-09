'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { typedApi } from '../../../../../lib/typed-api-client';
import type { Table, Column, Row } from '../../../../../lib/api-types';

export interface TableDataState {
    tableId: string;
    tables: Array<{ id: string; name: string; active: boolean }>;
    currentTable: Table | null;
    columns: Column[];
    rowData: Row[];
    loading: boolean;
}

export interface UseTableDataOptions {
    tableId: string;
    onRowUpdate?: (row: Row) => void;
    onRowInsert?: (row: Row) => void;
    onRowDelete?: (row: Row) => void;
}

export interface UseTableDataReturn extends TableDataState {
    loadData: (force?: boolean, silent?: boolean) => Promise<void>;
    setRowData: React.Dispatch<React.SetStateAction<Row[]>>;
    setColumns: React.Dispatch<React.SetStateAction<Column[]>>;
    setCurrentTable: React.Dispatch<React.SetStateAction<Table | null>>;
    loadDataRef: React.MutableRefObject<(force?: boolean, silent?: boolean) => Promise<void>>;
}

/**
 * Hook for managing table data loading and state
 * Handles fetching tables, columns, and rows from API
 */
export function useTableData({ tableId }: UseTableDataOptions): UseTableDataReturn {
    const [tables, setTables] = useState<Array<{ id: string; name: string; active: boolean }>>([]);
    const [currentTable, setCurrentTable] = useState<Table | null>(null);
    const [columns, setColumns] = useState<Column[]>([]);
    const [loading, setLoading] = useState(true);
    const [rowData, setRowData] = useState<Row[]>([]);

    const loadData = useCallback(async (force = false, silent = false) => {
        if (!tableId) {
            console.log('[useTableData] No tableId provided, skipping load');
            return;
        }

        console.log('[useTableData] Starting data load:', { tableId, force, silent });
        if (!silent) setLoading(true);

        try {
            // Load all tables for sidebar
            const { data: allTables, error: tablesError } = await typedApi.getTables();
            if (tablesError || !allTables) {
                console.error('[useTableData] Failed to load tables:', tablesError);
                throw new Error(tablesError || 'Failed to load tables');
            }

            const formattedTables = allTables.map((t) => ({
                id: t.id,
                name: t.name,
                active: t.id === tableId,
            }));
            setTables(formattedTables);

            // Load current table details with columns
            const { data: tableDetails, error: tableError } = await typedApi.getTable(tableId);
            if (tableError || !tableDetails) {
                console.error('[useTableData] Failed to load table details:', tableError);
                throw new Error(tableError || 'Failed to load table details');
            }
            setCurrentTable(tableDetails);

            // Extract columns from table details
            if ('columns' in tableDetails && Array.isArray(tableDetails.columns)) {
                console.log('[useTableData] Setting columns:', tableDetails.columns.length);
                setColumns(tableDetails.columns);
            } else {
                console.warn('[useTableData] No columns found in table details');
                setColumns([]);
            }

            // Load rows
            const { data: rowsData, error: rowsError } = await typedApi.getRows(tableId);
            if (rowsError || !rowsData) {
                console.error('[useTableData] Failed to load rows:', rowsError);
                throw new Error(rowsError || 'Failed to load rows');
            }

            console.log('[useTableData] Successfully loaded:', {
                rowCount: rowsData.data.length,
                columnCount: tableDetails.columns?.length || 0,
            });

            setRowData(rowsData.data);
        } catch (error) {
            console.error('[useTableData] Error loading data:', error);
            setRowData([]);
            setColumns([]);
        } finally {
            if (!silent) setLoading(false);
        }
    }, [tableId]);

    // Store loadData in ref to prevent dependency issues
    const loadDataRef = useRef(loadData);
    loadDataRef.current = loadData;

    // Load data when tableId changes
    useEffect(() => {
        if (tableId) {
            console.log('[useTableData] Table ID changed, loading:', tableId);
            loadData();
        }
    }, [tableId, loadData]);

    return {
        tableId,
        tables,
        currentTable,
        columns,
        rowData,
        loading,
        loadData,
        setRowData,
        setColumns,
        setCurrentTable,
        loadDataRef,
    };
}

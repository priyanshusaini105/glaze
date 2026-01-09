'use client';

import { useState, useCallback } from 'react';
import { typedApi } from '../../../../../lib/typed-api-client';
import type { Row } from '../../../../../lib/api-types';

export interface EditingCell {
    rowIndex: number;
    colId: string;
}

export interface UseCellEditingOptions {
    tableId: string;
    rowData: Row[];
    setRowData: React.Dispatch<React.SetStateAction<Row[]>>;
}

export interface UseCellEditingReturn {
    editingCell: EditingCell | null;
    setEditingCell: React.Dispatch<React.SetStateAction<EditingCell | null>>;
    updateRow: (rowId: string, columnKey: string, value: unknown) => Promise<void>;
    startEditing: (rowIndex: number, colId: string) => void;
    stopEditing: () => void;
}

/**
 * Hook for managing cell editing state and row updates
 */
export function useCellEditing({ tableId, rowData, setRowData }: UseCellEditingOptions): UseCellEditingReturn {
    const [editingCell, setEditingCell] = useState<EditingCell | null>(null);

    const updateRow = useCallback(async (rowId: string, columnKey: string, value: unknown) => {
        // Optimistic update
        setRowData(prev =>
            prev.map(row =>
                row.id === rowId
                    ? { ...row, data: { ...row.data, [columnKey]: value } }
                    : row
            )
        );

        try {
            const { error } = await typedApi.updateRow(tableId, rowId, {
                data: { [columnKey]: value },
            });

            if (error) {
                console.error('Failed to update row:', error);
                // Revert on error - could refetch here if needed
            }
        } catch (error) {
            console.error('Error updating row:', error);
        }
    }, [tableId, setRowData]);

    const startEditing = useCallback((rowIndex: number, colId: string) => {
        setEditingCell({ rowIndex, colId });
    }, []);

    const stopEditing = useCallback(() => {
        setEditingCell(null);
    }, []);

    return {
        editingCell,
        setEditingCell,
        updateRow,
        startEditing,
        stopEditing,
    };
}

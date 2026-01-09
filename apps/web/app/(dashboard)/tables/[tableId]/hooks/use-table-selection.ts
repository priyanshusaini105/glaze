'use client';

import { useState, useCallback, useRef } from 'react';
import type { Row, Column } from '../../../../../lib/api-types';

export interface CellPosition {
    r: number;
    c: number;
}

export interface SelectionRange {
    start: CellPosition;
    end: CellPosition;
}

export interface UseTableSelectionOptions {
    rowData: Row[];
    columns: Column[];
}

export interface UseTableSelectionReturn {
    // Row selection
    selectedRowIds: Set<string>;
    setSelectedRowIds: React.Dispatch<React.SetStateAction<Set<string>>>;
    allChecked: boolean;
    setAllChecked: React.Dispatch<React.SetStateAction<boolean>>;

    // Cell range selection
    selectionRange: SelectionRange | null;
    setSelectionRange: React.Dispatch<React.SetStateAction<SelectionRange | null>>;
    isSelectingCells: boolean;
    setIsSelectingCells: React.Dispatch<React.SetStateAction<boolean>>;

    // UI feedback
    isCopyFlash: boolean;
    setIsCopyFlash: React.Dispatch<React.SetStateAction<boolean>>;

    // Drag selection
    isDraggingRows: boolean;
    setIsDraggingRows: React.Dispatch<React.SetStateAction<boolean>>;
    rowSelectionStartRef: React.MutableRefObject<number | null>;
    gridContainerRef: React.RefObject<HTMLDivElement | null>;

    // Actions
    handleCopy: () => Promise<void>;
    handleSelectAll: () => void;
    clearSelection: () => void;
    toggleRowSelection: (rowId: string) => void;
    getSelectedCellCount: () => number;
}

/**
 * Hook for managing table row and cell selection
 */
export function useTableSelection({ rowData, columns }: UseTableSelectionOptions): UseTableSelectionReturn {
    // Row selection
    const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());
    const [allChecked, setAllChecked] = useState(false);

    // Cell range selection
    const [selectionRange, setSelectionRange] = useState<SelectionRange | null>(null);
    const [isSelectingCells, setIsSelectingCells] = useState(false);

    // UI feedback
    const [isCopyFlash, setIsCopyFlash] = useState(false);

    // Drag selection
    const [isDraggingRows, setIsDraggingRows] = useState(false);
    const rowSelectionStartRef = useRef<number | null>(null);
    const gridContainerRef = useRef<HTMLDivElement>(null);

    const handleCopy = useCallback(async () => {
        if (!selectionRange) return;

        const { start, end } = selectionRange;
        const minR = Math.min(start.r, end.r);
        const maxR = Math.max(start.r, end.r);
        const minC = Math.min(start.c, end.c);
        const maxC = Math.max(start.c, end.c);

        let clipboardText = '';

        for (let r = minR; r <= maxR; r++) {
            const row = rowData[r];
            if (!row) continue;
            const rowValues = [];
            for (let c = minC; c <= maxC; c++) {
                const colKey = columns[c]?.key;
                if (colKey) {
                    rowValues.push(String(row.data?.[colKey] || ''));
                }
            }
            clipboardText += rowValues.join('\t') + (r < maxR ? '\n' : '');
        }

        try {
            await navigator.clipboard.writeText(clipboardText);
            setIsCopyFlash(true);
            setTimeout(() => setIsCopyFlash(false), 300);
        } catch (err) {
            console.error('Failed to copy', err);
        }
    }, [selectionRange, rowData, columns]);

    const handleSelectAll = useCallback(() => {
        if (allChecked) {
            setSelectedRowIds(new Set());
            setAllChecked(false);
        } else {
            setSelectedRowIds(new Set(rowData.map(r => r.id)));
            setAllChecked(true);
        }
    }, [allChecked, rowData]);

    const clearSelection = useCallback(() => {
        setSelectedRowIds(new Set());
        setSelectionRange(null);
        setAllChecked(false);
    }, []);

    const toggleRowSelection = useCallback((rowId: string) => {
        setSelectedRowIds(prev => {
            const next = new Set(prev);
            if (next.has(rowId)) {
                next.delete(rowId);
            } else {
                next.add(rowId);
            }
            return next;
        });
    }, []);

    const getSelectedCellCount = useCallback(() => {
        if (!selectionRange) return 0;
        const { start, end } = selectionRange;
        const rows = Math.abs(end.r - start.r) + 1;
        const cols = Math.abs(end.c - start.c) + 1;
        return rows * cols;
    }, [selectionRange]);

    return {
        selectedRowIds,
        setSelectedRowIds,
        allChecked,
        setAllChecked,
        selectionRange,
        setSelectionRange,
        isSelectingCells,
        setIsSelectingCells,
        isCopyFlash,
        setIsCopyFlash,
        isDraggingRows,
        setIsDraggingRows,
        rowSelectionStartRef,
        gridContainerRef,
        handleCopy,
        handleSelectAll,
        clearSelection,
        toggleRowSelection,
        getSelectedCellCount,
    };
}

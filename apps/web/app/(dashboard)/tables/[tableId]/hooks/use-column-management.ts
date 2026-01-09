'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { typedApi } from '../../../../../lib/typed-api-client';
import type { Column, Row } from '../../../../../lib/api-types';

export interface UseColumnManagementOptions {
    tableId: string;
    columns: Column[];
    setColumns: React.Dispatch<React.SetStateAction<Column[]>>;
    setRowData: React.Dispatch<React.SetStateAction<Row[]>>;
    loadData: () => Promise<void>;
    currentTableName?: string;
}

export interface UseColumnManagementReturn {
    // UI state
    showColumnPopover: boolean;
    setShowColumnPopover: React.Dispatch<React.SetStateAction<boolean>>;
    showColumnSidebar: boolean;
    setShowColumnSidebar: React.Dispatch<React.SetStateAction<boolean>>;

    // Form state
    newColumnLabel: string;
    setNewColumnLabel: React.Dispatch<React.SetStateAction<string>>;
    newColumnDescription: string;
    setNewColumnDescription: React.Dispatch<React.SetStateAction<string>>;

    // Loading/error states
    isGeneratingTitle: boolean;
    columnSaving: boolean;
    columnDeletingId: string | null;
    columnError: string | null;
    setColumnError: React.Dispatch<React.SetStateAction<string | null>>;

    // Refs
    newColumnInputRef: React.RefObject<HTMLTextAreaElement | null>;
    newColumnLabelInputRef: React.RefObject<HTMLInputElement | null>;

    // Actions
    handleCreateColumn: (options?: { label?: string; description?: string; category?: string }) => Promise<void>;
    handleDeleteColumn: (columnId: string) => Promise<void>;
    generateTitleFromDescription: (description: string) => Promise<void>;
    generateColumnKey: (label: string) => string;
    resetColumnForm: () => void;
}

/**
 * Hook for managing column CRUD operations
 */
export function useColumnManagement({
    tableId,
    columns,
    setColumns,
    setRowData,
    loadData,
    currentTableName,
}: UseColumnManagementOptions): UseColumnManagementReturn {
    // UI state
    const [showColumnPopover, setShowColumnPopover] = useState(false);
    const [showColumnSidebar, setShowColumnSidebar] = useState(false);

    // Form state
    const [newColumnLabel, setNewColumnLabel] = useState('');
    const [newColumnDescription, setNewColumnDescription] = useState('');

    // Loading/error states
    const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);
    const [columnSaving, setColumnSaving] = useState(false);
    const [columnDeletingId, setColumnDeletingId] = useState<string | null>(null);
    const [columnError, setColumnError] = useState<string | null>(null);

    // Refs
    const newColumnInputRef = useRef<HTMLTextAreaElement>(null);
    const newColumnLabelInputRef = useRef<HTMLInputElement>(null);
    const descriptionDebounceRef = useRef<NodeJS.Timeout | null>(null);

    // Focus input when popover/sidebar opens
    useEffect(() => {
        if (showColumnPopover || showColumnSidebar) {
            setTimeout(() => newColumnInputRef.current?.focus(), 50);
        }
    }, [showColumnPopover, showColumnSidebar]);

    const generateColumnKey = useCallback((label: string): string => {
        return label
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_|_$/g, '');
    }, []);

    const generateTitleFromDescription = useCallback(async (description: string) => {
        if (!description.trim() || description.length < 5) return;

        setIsGeneratingTitle(true);
        try {
            const response = await fetch('http://localhost:3001/ai/columns/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    label: newColumnLabel || undefined,
                    description: description,
                    context: currentTableName ? `Table: ${currentTableName}` : undefined,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to analyze column');
            }

            const result = await response.json();
            if (result.success && result.analysis) {
                setNewColumnLabel(result.analysis.suggestedLabel);
                setColumnError(null);
            }
        } catch (error) {
            console.error('Error analyzing column:', error);
        } finally {
            setIsGeneratingTitle(false);
        }
    }, [newColumnLabel, currentTableName]);

    const handleCreateColumn = useCallback(async (options?: { label?: string; description?: string; category?: string }) => {
        const labelToUse = options?.label || newColumnLabel;
        const descriptionToUse = options?.description || newColumnDescription;

        if (!labelToUse.trim()) {
            setColumnError('Column name is required');
            return;
        }

        setColumnSaving(true);
        setColumnError(null);

        try {
            const key = generateColumnKey(labelToUse);

            // Check for duplicate key
            if (columns.some(c => c.key === key)) {
                throw new Error('A column with this name already exists');
            }

            const { data: newColumn, error } = await typedApi.createColumn(tableId, {
                key,
                label: labelToUse,
                dataType: 'text',
                category: options?.category,
                config: descriptionToUse ? { description: descriptionToUse } : undefined,
            });

            if (error || !newColumn) {
                throw new Error(error || 'Failed to create column');
            }

            setColumns(prev => [...prev, newColumn]);

            // Update rows with empty value for new column
            setRowData(prev =>
                prev.map(row => ({
                    ...row,
                    data: { ...row.data, [newColumn.key]: row.data?.[newColumn.key] ?? '' },
                }))
            );

            // Reset form
            setShowColumnSidebar(false);
            setShowColumnPopover(false);
            setNewColumnLabel('');
            setNewColumnDescription('');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unable to add column';
            setColumnError(errorMessage);
            console.error('Failed to create column:', error);
            throw error;
        } finally {
            setColumnSaving(false);
        }
    }, [generateColumnKey, tableId, columns, newColumnLabel, newColumnDescription, setColumns, setRowData]);

    const handleDeleteColumn = useCallback(async (columnId: string) => {
        const colToRemove = columns.find(c => c.id === columnId);
        if (!colToRemove) return;

        setColumnDeletingId(columnId);
        try {
            const { error } = await typedApi.deleteColumn(tableId, columnId);
            if (error) {
                throw new Error('Failed to delete column');
            }
            setColumns(prev => prev.filter(c => c.id !== columnId));
            setRowData(prev =>
                prev.map(row => {
                    const nextData = { ...row.data };
                    delete nextData[colToRemove.key];
                    return { ...row, data: nextData };
                })
            );
        } catch (error) {
            console.error('Failed to delete column:', error);
            await loadData();
        } finally {
            setColumnDeletingId(null);
        }
    }, [columns, loadData, tableId, setColumns, setRowData]);

    const resetColumnForm = useCallback(() => {
        setNewColumnLabel('');
        setNewColumnDescription('');
        setColumnError(null);
    }, []);

    return {
        showColumnPopover,
        setShowColumnPopover,
        showColumnSidebar,
        setShowColumnSidebar,
        newColumnLabel,
        setNewColumnLabel,
        newColumnDescription,
        setNewColumnDescription,
        isGeneratingTitle,
        columnSaving,
        columnDeletingId,
        columnError,
        setColumnError,
        newColumnInputRef,
        newColumnLabelInputRef,
        handleCreateColumn,
        handleDeleteColumn,
        generateTitleFromDescription,
        generateColumnKey,
        resetColumnForm,
    };
}

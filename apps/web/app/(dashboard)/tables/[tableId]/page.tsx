'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  Search,
  Plus,
  Sparkles,
  X,
  Check,
  ChevronDown,
  Users,
  Command,
  Link as LinkIcon,
  Building2,
  User,
  MoreHorizontal,
  Trash2,
  Loader2,
  Download,
} from 'lucide-react';
import { TableSidebar } from '../../../../components/tables/table-sidebar';
import { ColumnCreationSidebar } from '../../../../components/tables/column-creation-sidebar';
import { typedApi } from '../../../../lib/typed-api-client';
import { Table, Column, Row, DataType } from '../../../../lib/api-types';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '../../../../components/ui/popover';
import { generateCSV, downloadCSV } from '../../../../lib/csv-utils';
import { useRealtimeEnrichment } from '../../../../hooks/use-realtime-enrichment';


/* --- Helper Components --- */
const cn = (...classes: (string | boolean | undefined)[]) => classes.filter(Boolean).join(' ');

const Checkbox = ({ checked, onClick }: { checked: boolean; onClick?: () => void }) => (
  <div
    onClick={onClick}
    className={cn(
      'w-4 h-4 rounded border flex items-center justify-center cursor-pointer transition-colors',
      checked
        ? 'bg-purple-600 border-purple-600 shadow-sm'
        : 'bg-white border-slate-300 hover:border-slate-400'
    )}
  >
    {checked && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
  </div>
);

const Badge = ({ children }: { children: string }) => {
  const styles: Record<string, string> = {
    'Series B': 'bg-blue-50 text-blue-700 border-blue-200',
    'Series A': 'bg-green-50 text-green-700 border-green-200',
    'Series C': 'bg-purple-50 text-purple-700 border-purple-200',
    'Seed': 'bg-yellow-50 text-yellow-700 border-yellow-200',
    'Bootstrapped': 'bg-slate-100 text-slate-700 border-slate-200',
  };
  const style = styles[children] || 'bg-white text-slate-700 border-slate-200';

  return (
    <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium border shadow-sm inline-block whitespace-nowrap', style)}>
      {children}
    </span>
  );
};

export default function GlazeTablePage({ params }: { params: Promise<{ tableId: string }> }) {
  const [tableId, setTableId] = useState<string>('');
  const [tables, setTables] = useState<Array<{ id: string; name: string; active: boolean }>>([]);
  const [currentTable, setCurrentTable] = useState<Table | null>(null);
  const [columns, setColumns] = useState<Column[]>([]);
  const [loading, setLoading] = useState(true);
  const [rowData, setRowData] = useState<Row[]>([]);

  // Column management
  const [showColumnPopover, setShowColumnPopover] = useState(false);
  const [showColumnSidebar, setShowColumnSidebar] = useState(false);
  const [newColumnLabel, setNewColumnLabel] = useState('');
  const [newColumnDescription, setNewColumnDescription] = useState('');
  const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);
  const [columnSaving, setColumnSaving] = useState(false);
  const [columnDeletingId, setColumnDeletingId] = useState<string | null>(null);
  const [columnError, setColumnError] = useState<string | null>(null);
  const descriptionDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Selection states
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());
  const [allChecked, setAllChecked] = useState(false);
  const [selectionRange, setSelectionRange] = useState<{ start: { r: number; c: number }; end: { r: number; c: number } } | null>(null);
  const [isSelectingCells, setIsSelectingCells] = useState(false);
  const [isCopyFlash, setIsCopyFlash] = useState(false);
  const [editingCell, setEditingCell] = useState<{ rowIndex: number; colId: string } | null>(null);
  const [isDraggingRows, setIsDraggingRows] = useState(false);
  const rowSelectionStartRef = useRef<number | null>(null);
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const newColumnInputRef = useRef<HTMLInputElement>(null);

  // Modal states (currently used for enrichment actions)
  const [showEnrichModal, setShowEnrichModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Enrichment state
  const [isEnriching, setIsEnriching] = useState(false);
  const [enrichingCells, setEnrichingCells] = useState<Set<string>>(new Set()); // Track cells being enriched (format: "rowId:columnKey")

  // Delete rows state
  const [isDeletingRows, setIsDeletingRows] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Realtime enrichment subscription state
  const [activeRunId, setActiveRunId] = useState<string | undefined>();
  const [activeAccessToken, setActiveAccessToken] = useState<string | undefined>();

  useEffect(() => {
    params.then((p) => setTableId(p.tableId));
  }, [params]);

  const loadData = useCallback(async (force = false) => {
    if (!tableId) {
      console.log('[loadData] No tableId provided, skipping load');
      return;
    }

    console.log('[loadData] Starting data load for table:', { tableId, force });
    setLoading(true);
    
    try {
      // Load all tables for sidebar
      const { data: allTables, error: tablesError } = await typedApi.getTables();
      if (tablesError || !allTables) {
        console.error('[loadData] Failed to load tables:', tablesError);
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
        console.error('[loadData] Failed to load table details:', tableError);
        throw new Error(tableError || 'Failed to load table details');
      }
      setCurrentTable(tableDetails);

      // Extract columns from table details
      if ('columns' in tableDetails && Array.isArray(tableDetails.columns)) {
        console.log('[loadData] Setting columns:', tableDetails.columns.length);
        setColumns(tableDetails.columns);
      } else {
        console.warn('[loadData] No columns found in table details');
        setColumns([]);
      }

      // Load rows
      const { data: rowsData, error: rowsError } = await typedApi.getRows(tableId);
      if (rowsError || !rowsData) {
        console.error('[loadData] Failed to load rows:', rowsError);
        throw new Error(rowsError || 'Failed to load rows');
      }
      
      console.log('[loadData] Successfully loaded data:', {
        rowCount: rowsData.data.length,
        columnCount: tableDetails.columns?.length || 0,
        sampleRow: rowsData.data[0],
      });
      
      setRowData(rowsData.data);
    } catch (error) {
      console.error('[loadData] Critical error loading table data:', error);
      // Set empty states to prevent showing stale data
      setRowData([]);
      setColumns([]);
    } finally {
      console.log('[loadData] Load complete, clearing loading state');
      setLoading(false);
    }
  }, [tableId]);

  // Store loadData in ref to prevent dependency issues
  const loadDataRef = useRef(loadData);
  loadDataRef.current = loadData;

  useEffect(() => {
    if (tableId) {
      console.log('[useEffect] Table ID changed, loading data:', tableId);
      loadData();
    }
  }, [tableId, loadData]);

  useEffect(() => {
    if (showColumnPopover || showColumnSidebar) {
      setTimeout(() => newColumnInputRef.current?.focus(), 50);
    }
  }, [showColumnPopover, showColumnSidebar]);

  // AI title generation from description using real backend API
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
          context: currentTable?.name ? `Table: ${currentTable.name}` : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to analyze column');
      }

      const result = await response.json();
      if (result.success && result.analysis) {
        // Use the AI-suggested label directly
        setNewColumnLabel(result.analysis.suggestedLabel);
      }
    } catch (error) {
      console.error('Failed to generate title:', error);
      // Fallback to simple word extraction
      const words = description.trim().split(' ').slice(0, 3);
      const title = words.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      setNewColumnLabel(title);
    } finally {
      setIsGeneratingTitle(false);
    }
  }, [newColumnLabel, currentTable?.name]);

  const handleDescriptionChange = useCallback((value: string) => {
    setNewColumnDescription(value);
    
    // Debounce AI title generation
    if (descriptionDebounceRef.current) {
      clearTimeout(descriptionDebounceRef.current);
    }
    
    descriptionDebounceRef.current = setTimeout(() => {
      generateTitleFromDescription(value);
    }, 800);
  }, [generateTitleFromDescription]);

  const generateColumnKey = useCallback((label: string) => {
    const base = label
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'column';

    const existingKeys = new Set(columns.map((c) => c.key));
    if (!existingKeys.has(base)) return base;

    let suffix = 2;
    let candidate = `${base}_${suffix}`;
    while (existingKeys.has(candidate)) {
      suffix += 1;
      candidate = `${base}_${suffix}`;
    }
    return candidate;
  }, [columns]);

  const handleCreateColumn = useCallback(async (data: {
    label: string;
    dataType: DataType;
    category?: string;
    description?: string;
  }) => {
    setColumnSaving(true);

    try {
      const key = generateColumnKey(data.label);

      const { data: newColumn, error } = await typedApi.createColumn(tableId, {
        key,
        label: data.label,
        dataType: data.dataType,
        category: data.category,
      });

      if (error || !newColumn) {
        throw new Error(error || 'Failed to create column');
      }
      
      setColumns((prev) => [...prev, newColumn]);
      setRowData((prev) =>
        (prev || []).map((row) => ({
          ...row,
          data: { ...row.data, [newColumn.key]: row.data?.[newColumn.key] ?? '' },
        }))
      );
      
      setShowColumnSidebar(false);
    } catch (error) {
      console.error('Failed to create column:', error);
      throw error; // Re-throw to let sidebar handle the error display
    } finally {
      setColumnSaving(false);
    }
  }, [generateColumnKey, tableId]);

  // Simple wrapper for popover (quick column creation)
  const handleCreateColumnSimple = useCallback(async () => {
    if (!newColumnLabel.trim()) {
      setColumnError('Please enter a column name.');
      return;
    }
    setColumnError(null);

    try {
      await handleCreateColumn({
        label: newColumnLabel.trim(),
        dataType: 'text' as DataType,
        description: newColumnDescription.trim() || undefined,
      });
      
      // Reset form
      setNewColumnLabel('');
      setNewColumnDescription('');
      setShowColumnPopover(false);
    } catch (error) {
      setColumnError(error instanceof Error ? error.message : 'Unable to add column');
    }
  }, [newColumnLabel, newColumnDescription, handleCreateColumn]);

  const handleDeleteColumn = useCallback(async (columnId: string) => {
    const colToRemove = columns.find((c) => c.id === columnId);
    if (!colToRemove) return;

    setColumnDeletingId(columnId);
    try {
      const { error } = await typedApi.deleteColumn(tableId, columnId);
      if (error) {
        throw new Error('Failed to delete column');
      }
      setColumns((prev) => prev.filter((c) => c.id !== columnId));
      setRowData((prev) =>
        prev.map((row) => {
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
  }, [columns, loadData, tableId]);

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

  const handleExportCSV = useCallback(async () => {
    if (!currentTable || !columns.length || !rowData?.length) return;

    setIsExporting(true);
    try {
      // Extract headers from columns
      const headers = columns.map(col => col.label);

      // Map rows to CSV format
      const csvRows = rowData.map(row => {
        const csvRow: Record<string, unknown> = {};
        columns.forEach(col => {
          csvRow[col.label] = (row.data as Record<string, unknown>)?.[col.key] || '';
        });
        return csvRow;
      });

      // Generate CSV content
      const csvContent = generateCSV(headers, csvRows);

      // Download the file
      const filename = `${currentTable.name.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
      downloadCSV(filename, csvContent);
    } catch (err) {
      console.error('Failed to export CSV:', err);
      alert('Failed to export CSV. Please try again.');
    } finally {
      setIsExporting(false);
    }
  }, [currentTable, columns, rowData]);

  // Handle run enrichment - uses Trigger.dev workflow with realtime updates
  const handleRunEnrichment = useCallback(async () => {
    if (!selectionRange || !tableId) return;

    setIsEnriching(true);

    try {
      const { start, end } = selectionRange;
      const minR = Math.min(start.r, end.r);
      const maxR = Math.max(start.r, end.r);
      const minC = Math.min(start.c, end.c);
      const maxC = Math.max(start.c, end.c);

      // Collect unique column IDs and row IDs
      const columnIds = new Set<string>();
      const rowIds = new Set<string>();
      const enrichingCellKeys = new Set<string>();

      for (let r = minR; r <= maxR; r++) {
        const row = rowData[r];
        if (!row) continue;
        rowIds.add(row.id);

        for (let c = minC; c <= maxC; c++) {
          const col = columns[c];
          if (!col) continue;
          columnIds.add(col.id);
          enrichingCellKeys.add(`${row.id}:${col.key}`);
        }
      }

      console.log('[handleRunEnrichment] Selection details:', {
        totalCells: enrichingCellKeys.size,
        uniqueRows: rowIds.size,
        uniqueColumns: columnIds.size,
        cellKeys: Array.from(enrichingCellKeys),
      });

      if (columnIds.size === 0 || rowIds.size === 0) {
        alert('No cells selected for enrichment.');
        setIsEnriching(false);
        return;
      }

      // Mark cells as enriching
      setEnrichingCells(enrichingCellKeys);

      // Start enrichment job using Trigger.dev API
      const { data: enrichJob, error: startError } = await typedApi.startCellEnrichment(tableId, {
        columnIds: Array.from(columnIds),
        rowIds: Array.from(rowIds),
      });

      if (startError || !enrichJob) {
        console.error('[handleRunEnrichment] Failed to start job:', startError);
        throw new Error(startError || 'Failed to start enrichment job');
      }

      console.log('[handleRunEnrichment] Enrichment job started:', {
        jobId: enrichJob.jobId,
        runId: enrichJob.runId,
        totalTasks: enrichJob.totalTasks,
        hasRealtimeAccess: Boolean(enrichJob.runId && enrichJob.publicAccessToken),
      });

      // Check if realtime subscription is available
      if (enrichJob.runId && enrichJob.publicAccessToken) {
        // Use realtime updates via Trigger.dev SSE
        console.log('[handleRunEnrichment] Using realtime updates:', {
          runId: enrichJob.runId,
          jobId: enrichJob.jobId,
          totalTasks: enrichJob.totalTasks,
        });
        setActiveRunId(enrichJob.runId);
        setActiveAccessToken(enrichJob.publicAccessToken);
        // The useRealtimeEnrichment hook will handle the rest
      } else {
        // Fallback to polling if realtime not available
        console.log('[handleRunEnrichment] Realtime not available, falling back to polling');
        let attempts = 0;
        const maxAttempts = 120; // Max 2 minutes
        const pollInterval = 1000; // 1 second

        const pollForCompletion = async (): Promise<boolean> => {
          const { data: jobStatus, error: statusError } = await typedApi.getEnrichmentJobStatus(
            tableId,
            enrichJob.jobId
          );

          if (statusError) {
            console.warn('Error polling job status:', statusError);
            attempts++;
            if (attempts >= maxAttempts) return true;
            await new Promise(resolve => setTimeout(resolve, pollInterval));
            return pollForCompletion();
          }

          console.log('Job status:', jobStatus);

          if (jobStatus?.status === 'done' || jobStatus?.status === 'failed') {
            return true;
          }

          attempts++;
          if (attempts >= maxAttempts) {
            console.warn('Job polling timeout');
            return true;
          }

          await new Promise(resolve => setTimeout(resolve, pollInterval));
          return pollForCompletion();
        };

        await pollForCompletion();

        // Refresh the data to get enriched values
        await loadData();

        // Clear enriching cells
        setEnrichingCells(new Set());
        setIsEnriching(false);
      }

      // Clear selection
      setSelectionRange(null);

    } catch (error) {
      console.error('Enrichment error:', error);
      alert('Enrichment failed. Please try again.');
      setEnrichingCells(new Set());
      setIsEnriching(false);
      setActiveRunId(undefined);
      setActiveAccessToken(undefined);
    }
  }, [selectionRange, rowData, columns, tableId, loadData]);

  // Handle realtime enrichment completion - use ref to prevent callback recreation
  const handleEnrichmentComplete = useCallback(async (success: boolean, output?: any) => {
    console.log('[handleEnrichmentComplete] Enrichment completed:', {
      success,
      output,
      timestamp: new Date().toISOString(),
    });

    // Refresh the data to get enriched values - use ref to get latest loadData
    console.log('[handleEnrichmentComplete] Refreshing table data...');
    try {
      await loadDataRef.current(true); // Force reload
      console.log('[handleEnrichmentComplete] Table data refreshed successfully');
    } catch (error) {
      console.error('[handleEnrichmentComplete] Failed to refresh data:', error);
    }

    // Clear enrichment state
    console.log('[handleEnrichmentComplete] Clearing enrichment state');
    setEnrichingCells(new Set());
    setIsEnriching(false);
    setActiveRunId(undefined);
    setActiveAccessToken(undefined);

    // Show success/failure message
    if (success && output) {
      console.log(`[handleEnrichmentComplete] Successfully enriched ${output.successCount}/${output.totalTasks} cells`);
    } else if (!success) {
      console.warn('[handleEnrichmentComplete] Enrichment failed or incomplete');
    }
  }, []);

  // Subscribe to realtime enrichment updates
  const enrichmentProgress = useRealtimeEnrichment({
    runId: activeRunId,
    publicAccessToken: activeAccessToken,
    onComplete: handleEnrichmentComplete,
  });

  // Global event handlers
  useEffect(() => {
    const handleMouseUp = () => {
      setIsDraggingRows(false);
      setIsSelectingCells(false);
      rowSelectionStartRef.current = null;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        handleCopy();
      }
      if (e.key === 'Escape') {
        setSelectionRange(null);
        setEditingCell(null);
      }
      if (e.key === 'Enter' && selectionRange && !editingCell) {
        e.preventDefault();
        const colId = columns[selectionRange.start.c]?.id;
        if (colId) {
          setEditingCell({ rowIndex: selectionRange.start.r, colId });
        }
      }
    };

    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectionRange, editingCell, columns, handleCopy]);



  const updateRow = async (rowId: string, field: string, newValue: string) => {
    // Optimistic update
    setRowData(prevData =>
      prevData.map(row =>
        row.id === rowId ? { ...row, data: { ...row.data, [field]: newValue } } : row
      )
    );

    // Persist to API
    try {
      const rowToUpdate = rowData.find(r => r.id === rowId);
      if (rowToUpdate) {
        const { error } = await typedApi.updateRow(tableId, rowId, {
          data: { ...rowToUpdate.data, [field]: newValue }
        });
        if (error) {
          throw new Error('Failed to update row');
        }
      }
    } catch (error) {
      console.error('Failed to update row:', error);
      // Revert on error
      await loadData();
    }
  };

  const handleAddRow = async () => {
    try {
      // Create empty row with column keys
      const emptyData: Record<string, string> = {};
      columns.forEach(col => {
        emptyData[col.key] = '';
      });

      const { data: newRow, error } = await typedApi.createRow(tableId, { data: emptyData });
      if (error || !newRow) {
        throw new Error(error || 'Failed to create row');
      }
      setRowData([...(rowData || []), newRow]);

      setTimeout(() => {
        if (gridContainerRef.current) {
          gridContainerRef.current.scrollTop = gridContainerRef.current.scrollHeight;
        }
      }, 10);
    } catch (error) {
      console.error('Failed to add row:', error);
    }
  };

  const handleDeleteSelectedRows = async () => {
    if (selectedRowIds.size === 0) return;
    
    // Confirm deletion
    const count = selectedRowIds.size;
    if (!confirm(`Are you sure you want to delete ${count} row${count === 1 ? '' : 's'}? This action cannot be undone.`)) {
      return;
    }

    setIsDeletingRows(true);
    setDeleteError(null);

    try {
      // Delete all selected rows
      const deletePromises = Array.from(selectedRowIds).map(rowId => 
        typedApi.deleteRow(tableId, rowId)
      );
      
      const results = await Promise.all(deletePromises);
      
      // Check for errors in results
      const hasError = results.some(result => result.error);
      if (hasError) {
        throw new Error('Failed to delete one or more rows');
      }
      
      // Remove from local state
      setRowData(prevData => prevData.filter(row => !selectedRowIds.has(row.id)));
      setSelectedRowIds(new Set());
      setAllChecked(false);
    } catch (error) {
      console.error('Failed to delete rows:', error);
      setDeleteError(error instanceof Error ? error.message : 'Failed to delete rows');
      // Reload on error
      await loadData();
    } finally {
      setIsDeletingRows(false);
    }
  };

  const handleRowSelectionStart = (e: React.MouseEvent, index: number, id: string) => {
    e.preventDefault();
    setIsDraggingRows(true);
    rowSelectionStartRef.current = index;
    const newSet = new Set([id]);
    setSelectedRowIds(newSet);
    setAllChecked(newSet.size === (rowData?.length || 0));
  };

  const handleRowSelectionMove = (index: number) => {
    if (!isDraggingRows || rowSelectionStartRef.current === null) return;
    const start = rowSelectionStartRef.current;
    const end = index;
    const low = Math.min(start, end);
    const high = Math.max(start, end);
    const newSelectedIds = new Set<string>();
    for (let i = low; i <= high; i++) {
      const row = rowData[i];
      if (row) newSelectedIds.add(row.id);
    }
    setSelectedRowIds(newSelectedIds);
  };

  const toggleAllRows = () => {
    if (allChecked) {
      setSelectedRowIds(new Set());
      setAllChecked(false);
    } else {
      const allIds = new Set((rowData || []).map(r => r.id));
      setSelectedRowIds(allIds);
      setAllChecked(true);
    }
  };

  const handleCellMouseDown = (rowIndex: number, colIndex: number) => {
    setIsSelectingCells(true);
    setSelectionRange({
      start: { r: rowIndex, c: colIndex },
      end: { r: rowIndex, c: colIndex }
    });
    setEditingCell(null);
  };

  const handleCellMouseEnter = (rowIndex: number, colIndex: number) => {
    if (isSelectingCells && selectionRange) {
      setSelectionRange({
        ...selectionRange,
        end: { r: rowIndex, c: colIndex }
      });
    }
  };

  const getCellSelectionState = (rowIndex: number, colIndex: number) => {
    if (!selectionRange) return { isSelected: false, style: {} };

    const { start, end } = selectionRange;
    const minR = Math.min(start.r, end.r);
    const maxR = Math.max(start.r, end.r);
    const minC = Math.min(start.c, end.c);
    const maxC = Math.max(start.c, end.c);

    const isSelected = rowIndex >= minR && rowIndex <= maxR && colIndex >= minC && colIndex <= maxC;

    if (!isSelected) return { isSelected: false, style: {} };

    const borderColor = '#2badee';
    const backgroundColor = isCopyFlash ? 'rgba(34, 197, 94, 0.2)' : 'rgba(43, 173, 238, 0.08)';
    const borderStyle = 'solid';

    const isTop = rowIndex === minR;
    const isBottom = rowIndex === maxR;
    const isLeft = colIndex === minC;
    const isRight = colIndex === maxC;

    return {
      isSelected: true,
      style: {
        backgroundColor: backgroundColor,
        borderTop: isTop ? `2px ${borderStyle} ${borderColor}` : undefined,
        borderBottom: isBottom ? `2px ${borderStyle} ${borderColor}` : undefined,
        borderLeft: isLeft ? `2px ${borderStyle} ${borderColor}` : undefined,
        borderRight: isRight ? `2px ${borderStyle} ${borderColor}` : undefined,
        zIndex: 10,
      }
    };
  };

  const renderCellContent = (value: string | undefined, type?: string) => {
    if (!value) return <span className="truncate text-slate-400">—</span>;
    if (type === 'badge') return <Badge>{value}</Badge>;
    if (type === 'link' || type === 'url') return (
      <a href={value} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate block">
        {value?.replace(/^https?:\/\//, '').replace(/\/$/, '')}
      </a>
    );
    return <span className="truncate">{value}</span>;
  };

  if (loading) {
    return (
      <>
        <TableSidebar tables={tables} currentTableId={tableId} />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-slate-500">Loading table data...</p>
        </div>
      </>
    );
  }

  return (
    <>
      <TableSidebar tables={tables} currentTableId={tableId} />
      <div className="flex flex-col h-screen w-full bg-white text-sm font-sans text-slate-900">

        {/* Modern Header */}
        <div className="backdrop-blur-sm bg-white/80 border-b border-slate-200 px-5 py-3 flex items-center justify-between shrink-0 sticky top-0 z-20">
          {/* Left Section - Breadcrumbs & Title */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm">
              <Link href="/tables" className="text-slate-500 font-medium hover:text-slate-700 transition-colors">
                Tables
              </Link>
              <ChevronDown className="w-4 h-4 text-slate-400 -rotate-90" />
              <span className="text-slate-900 font-semibold tracking-tight">{currentTable?.name || 'Table'}</span>
            </div>
          </div>

          {/* Right Section - Stats & Actions */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-4 pr-4 border-r border-slate-200">
              <div className="flex items-center gap-2 bg-green-50 border border-green-200/50 px-2.5 py-1 rounded-full">
                <div className="relative">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                  <div className="absolute inset-0 w-1.5 h-1.5 bg-green-400 rounded-full opacity-75 animate-ping"></div>
                </div>
                <span className="text-xs font-medium text-green-800">Live</span>
              </div>

              {/* Realtime Enrichment Status Indicator */}
              {isEnriching && enrichmentProgress.isActive && (
                <div className="flex items-center gap-2 bg-purple-50 border border-purple-200/50 px-2.5 py-1 rounded-full animate-pulse">
                  <Loader2 className="w-3 h-3 text-purple-600 animate-spin" />
                  <span className="text-xs font-medium text-purple-800">
                    {enrichmentProgress.status === 'EXECUTING' ? 'Enriching...' :
                      enrichmentProgress.status === 'QUEUED' ? 'In Queue...' :
                        enrichmentProgress.status === 'PENDING' ? 'Starting...' : 'Processing...'}
                  </span>
                </div>
              )}

              {/* Show completion flash */}
              {!isEnriching && enrichmentProgress.isComplete && enrichmentProgress.isSuccess && (
                <div className="flex items-center gap-2 bg-green-50 border border-green-200/50 px-2.5 py-1 rounded-full">
                  <Check className="w-3 h-3 text-green-600" />
                  <span className="text-xs font-medium text-green-800">Enriched!</span>
                </div>
              )}

              <span className="text-xs text-slate-500">|</span>
              <span className="text-xs font-medium text-slate-600">{columns.length} Columns</span>
              <span className="text-xs font-medium text-slate-600">{rowData?.length || 0} Rows</span>
            </div>

            <div className="flex items-center gap-2">
              {selectedRowIds.size > 0 && (
                <div className="flex items-center gap-2 px-3 py-2 bg-linear-to-r from-red-500/10 to-red-600/10 border border-red-200/60 rounded-md shadow-sm">
                  <span className="text-xs font-semibold text-red-700 min-w-fit">
                    {selectedRowIds.size} row{selectedRowIds.size === 1 ? '' : 's'} selected
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 gap-1 text-xs font-semibold text-red-700 hover:bg-red-100/80 hover:text-red-800"
                    onClick={handleDeleteSelectedRows}
                    disabled={isDeletingRows}
                  >
                    {isDeletingRows ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                      </>
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-5 p-0 text-red-700 hover:bg-red-100/80"
                    onClick={() => {
                      setSelectedRowIds(new Set());
                      setAllChecked(false);
                    }}
                    title="Clear selection"
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-9 px-3 gap-2"
                onClick={handleExportCSV}
                disabled={isExporting || !rowData?.length}
              >
                {isExporting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                <span className="text-xs font-medium">Export CSV</span>
              </Button>
              <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
                <MoreHorizontal className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
                <Users className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
                <ChevronDown className="w-5 h-5" />
              </Button>
            </div>

            <Button
              size="sm"
              className="gap-2 bg-cyan-gradient hover:opacity-90 text-white shadow-sm shadow-cyan-500/20"
              onClick={() => {
                setShowColumnSidebar(true);
                setColumnError(null);
              }}
            >
              <Plus className="w-4.5 h-4.5" />
              Add Column
            </Button>
          </div>
        </div>



        {/* Table Container */}
        <div className="flex-1 overflow-auto relative select-none bg-white" ref={gridContainerRef}>
          <div className="min-w-300">

            {/* Header */}
            <div className="flex items-center h-11 bg-slate-50/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-30 shadow-sm">
              {/* Checkbox Column */}
              <div
                className="w-12 flex items-center justify-center shrink-0 sticky left-0 bg-slate-50/80 backdrop-blur-sm z-30 border-r border-transparent hover:border-slate-200 transition-colors cursor-pointer"
                onClick={toggleAllRows}
              >
                <Checkbox checked={allChecked} />
              </div>

              {/* Row Number Column */}
              <div className="w-14 flex items-center justify-center shrink-0 bg-slate-50/80 backdrop-blur-sm border-r border-transparent">
                <span className="text-xs font-semibold text-slate-400 uppercase">#</span>
              </div>

              {/* Columns */}
              {columns.map((col, idx) => {
                return (
                  <div
                    key={col.id}
                    className={cn(
                      'flex items-center gap-2 px-4 border-r border-slate-200 shrink-0 h-full transition-colors bg-white',
                      'w-64',
                      idx === 0 && 'sticky left-26 z-30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]'
                    )}
                  >
                    <MoreHorizontal className="w-4 h-4 text-slate-400" />
                    <span className="text-xs font-semibold text-slate-600 flex-1 truncate uppercase tracking-wide">{col.label}</span>
                    <button
                      aria-label="Delete column"
                      className="p-1 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteColumn(col.id);
                      }}
                      disabled={columnDeletingId === col.id}
                    >
                      {columnDeletingId === col.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                );
              })}

              {/* New Column Header */}
              <Popover open={showColumnPopover} onOpenChange={setShowColumnPopover}>
                <PopoverTrigger asChild>
                  <div
                    className="px-4 flex items-center cursor-pointer hover:bg-slate-50 transition-colors h-full text-slate-500 hover:text-slate-900 gap-2 shrink-0 min-w-37.5"
                    onClick={() => setColumnError(null)}
                  >
                    <Plus className="w-4 h-4" />
                    <span className="text-xs font-medium">New column</span>
                  </div>
                </PopoverTrigger>
                <PopoverContent className="w-96 p-0 border-slate-200 shadow-xl" align="start" sideOffset={8}>
                  <div className="bg-gradient-to-br from-white to-slate-50/50 rounded-lg">
                    {/* Header */}
                    <div className="px-6 py-4 border-b border-slate-200 bg-white/80 backdrop-blur-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-cyan-gradient flex items-center justify-center">
                          <Plus className="w-4 h-4 text-white" />
                        </div>
                        <h4 className="font-semibold text-slate-900">New Column</h4>
                      </div>
                    </div>
                    
                    {/* Content */}
                    <div className="px-6 py-5 space-y-4">
                      {/* Description First */}
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                          <Sparkles className="w-3.5 h-3.5 text-cyan-500" />
                          What should this column do?
                        </label>
                        <textarea
                          ref={newColumnInputRef}
                          value={newColumnDescription}
                          onChange={(e) => handleDescriptionChange(e.target.value)}
                          placeholder="e.g., Extract company names from website URLs"
                          rows={3}
                          className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-100 resize-none transition-all"
                        />
                        <p className="text-xs text-slate-500">
                          AI will suggest a column name based on your description
                        </p>
                      </div>

                      {/* Column Name (Auto-generated) */}
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                          Column Name
                          {isGeneratingTitle && (
                            <Loader2 className="w-3 h-3 animate-spin text-cyan-500" />
                          )}
                        </label>
                        <Input
                          value={newColumnLabel}
                          onChange={(e) => setNewColumnLabel(e.target.value)}
                          placeholder="Auto-generated or type your own"
                          className="bg-white border-slate-200 focus:border-cyan-400 focus:ring-cyan-100"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleCreateColumnSimple();
                            }
                          }}
                        />
                      </div>

                      {columnError && (
                        <div className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
                          {columnError}
                        </div>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-200 flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          setShowColumnPopover(false);
                          setNewColumnLabel('');
                          setNewColumnDescription('');
                          setColumnError(null);
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1 bg-cyan-gradient hover:opacity-90 text-white shadow-md shadow-cyan-500/20"
                        onClick={handleCreateColumn}
                        disabled={columnSaving || !newColumnLabel.trim()}
                      >
                        {columnSaving ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            Creating...
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5 mr-1.5" />
                            Create Column
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Rows */}
            <div className="divide-y divide-slate-100 relative">
              {rowData && rowData.map((row, rIndex) => {
                const isRowSelected = selectedRowIds.has(row.id);
                const rowBg = isRowSelected ? 'bg-cyan-50/60' : (rIndex % 2 === 1 ? 'bg-slate-50/30' : 'bg-white');

                return (
                  <div
                    key={row.id}
                    className={cn(
                      'flex items-center h-14 transition-colors group relative',
                      rowBg,
                      isRowSelected && 'border-l-2 border-cyan-500'
                    )}
                  >
                    {/* Left Gutter Checkbox */}
                    <div
                      className={cn(
                        'w-12 flex items-center justify-center shrink-0 sticky left-0 z-20 cursor-grab active:cursor-grabbing border-r border-slate-100',
                        isRowSelected ? 'bg-cyan-50/90' : 'bg-white'
                      )}
                      onMouseDown={(e) => handleRowSelectionStart(e, rIndex, row.id)}
                      onMouseEnter={() => handleRowSelectionMove(rIndex)}
                    >
                      <Checkbox checked={isRowSelected} />
                    </div>

                    {/* Row Number */}
                    <div className={cn(
                      'w-14 flex items-center justify-center shrink-0 border-r border-slate-100',
                      isRowSelected ? 'bg-cyan-50/90' : 'bg-white'
                    )}>
                      <span className={cn(
                        'font-mono text-xs',
                        isRowSelected ? 'text-cyan-600 font-bold' : 'text-slate-400'
                      )}>{rIndex + 1}</span>
                    </div>

                    {/* Data Cells */}
                    {columns.map((col, cIndex) => {
                      const { style } = getCellSelectionState(rIndex, cIndex);
                      const isEditing = editingCell?.rowIndex === rIndex && editingCell?.colId === col.id;
                      const value = row.data?.[col.key];
                      const cellKey = `${row.id}:${col.key}`;
                      const isCellEnriching = enrichingCells.has(cellKey);

                      return (
                        <div
                          key={col.id}
                          className={cn(
                            'h-full flex items-center px-4 shrink-0 border-r border-slate-100 relative outline-none',
                            'w-64',
                            cIndex === 0 && 'sticky left-26 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]',
                            cIndex === 0 && (isRowSelected ? 'bg-cyan-50/90' : 'bg-white'),
                            isCellEnriching && 'bg-amber-50/50',
                          )}
                          style={style}
                          onMouseDown={(e) => {
                            if (e.target instanceof HTMLElement && e.target.tagName !== 'INPUT' && e.target.tagName !== 'A') {
                              handleCellMouseDown(rIndex, cIndex);
                            }
                          }}
                          onMouseEnter={() => handleCellMouseEnter(rIndex, cIndex)}
                          onDoubleClick={() => setEditingCell({ rowIndex: rIndex, colId: col.id })}
                        >
                          {isCellEnriching && (
                            <div className="absolute inset-0 flex items-center justify-center bg-amber-50/80 backdrop-blur-sm">
                              <Loader2 className="w-4 h-4 text-amber-600 animate-spin" />
                            </div>
                          )}
                          {isEditing ? (
                            <Input
                              autoFocus
                              className="h-8 shadow-none border-cyan-500 ring-2 ring-cyan-100"
                              value={String(value || '')}
                              onChange={(e) => updateRow(row.id, col.key, e.target.value)}
                              onBlur={() => setEditingCell(null)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') setEditingCell(null);
                                if (e.key === 'Escape') setEditingCell(null);
                              }}
                            />
                          ) : (
                            <div className="w-full truncate text-slate-700 text-sm">
                              {renderCellContent(value as string, col.dataType)}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Empty Cell Spacer */}
                    <div className="min-w-37.5 shrink-0"></div>
                  </div>
                );
              })}
            </div>

            {/* Add Row Button */}
            <div
              className="sticky left-0 w-full pl-26 border-t border-slate-100 bg-slate-50/50 hover:bg-slate-100 transition-colors cursor-pointer group"
              onClick={handleAddRow}
            >
              <div className="flex items-center gap-2 py-3 px-4 text-slate-500 group-hover:text-slate-900 transition-colors">
                <Plus className="w-4 h-4" />
                <span className="text-sm font-medium">Add new row</span>
              </div>
            </div>
            <div className="h-20"></div>
          </div>

          {/* Floating Action Bar for Selected Cells */}
          {selectionRange && (() => {
            const { start, end } = selectionRange;
            const minR = Math.min(start.r, end.r);
            const maxR = Math.max(start.r, end.r);
            const minC = Math.min(start.c, end.c);
            const maxC = Math.max(start.c, end.c);
            const selectedCellCount = (maxR - minR + 1) * (maxC - minC + 1);

            return selectedCellCount > 0 ? (
              <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50">
                <div className="backdrop-blur-md bg-white/95 border border-slate-200 rounded-full shadow-xl shadow-slate-900/10 px-2 py-1.5 flex items-center gap-1">
                  <div className="px-4 py-1 border-r border-slate-200">
                    <span className="text-sm font-semibold text-slate-900">{selectedCellCount} {selectedCellCount === 1 ? 'cell' : 'cells'} selected</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-2 rounded-full px-5 hover:bg-purple-50 hover:text-purple-700"
                    onClick={handleRunEnrichment}
                    disabled={isEnriching}
                  >
                    {isEnriching ? (
                      <>
                        <Loader2 className="w-4.5 h-4.5 animate-spin" />
                        Enriching...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4.5 h-4.5" />
                        Run Agent
                      </>
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 w-9 p-0 rounded-full hover:bg-slate-100"
                    onClick={() => setSelectionRange(null)}
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            ) : null;
          })()}

          {/* Delete Error Toast */}
          {deleteError && (
            <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg shadow-lg max-w-md">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium">{deleteError}</span>
                <button
                  onClick={() => setDeleteError(null)}
                  className="text-red-700 hover:text-red-900"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Enrich Modal */}
          {showEnrichModal && (
            <>
              <div
                className="fixed inset-0 z-40 bg-transparent"
                onClick={() => setShowEnrichModal(false)}
              />
              <div
                className="absolute z-50 w-85 bg-white rounded-lg shadow-xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-100 top-20 right-20"
              >
                <div className="p-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <div className="flex items-center gap-2">
                    <Command className="w-4 h-4 text-slate-400" />
                    <span className="font-semibold text-slate-900 text-sm">Enrichment Sources</span>
                  </div>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setShowEnrichModal(false)}>
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
                <div className="p-2">
                  <div className="relative mb-2">
                    <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400" />
                    <Input
                      placeholder="Find a provider..."
                      className="pl-9 bg-slate-50 border-slate-200"
                    />
                  </div>

                  <div className="space-y-1">
                    {[
                      { icon: LinkIcon, color: 'text-blue-600 bg-blue-50', title: 'Get website text', sub: 'Extract copy from landing page' },
                      { icon: Building2, color: 'text-emerald-600 bg-emerald-50', title: 'Enrich Company', sub: 'Find employee count, location...' },
                      { icon: User, color: 'text-orange-600 bg-orange-50', title: 'Find LinkedIn Profile', sub: 'Search by name and company' },
                    ].map((item, i) => (
                      <div key={i} className="group flex items-center gap-3 p-2 hover:bg-slate-100 rounded-md cursor-pointer transition-colors">
                        <div className={cn('w-8 h-8 rounded-md flex items-center justify-center shrink-0 border border-black/5', item.color)}>
                          <item.icon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-slate-900">{item.title}</div>
                          <div className="text-xs text-slate-500">{item.sub}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="p-2 border-t border-slate-100 bg-slate-50 text-xs text-center text-slate-500 flex items-center justify-center gap-2">
                  Press <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-white px-1.5 font-mono text-[10px] font-medium text-slate-950 opacity-100">/</kbd> to search providers
                </div>
              </div>
            </>
          )}
        </div>

        {/* Right Sidebar for Add Column (from navbar) */}
        {showColumnSidebar && (
          <div className="fixed inset-y-0 right-0 w-96 bg-white border-l border-slate-200 shadow-2xl shadow-slate-900/10 z-50 flex flex-col animate-in slide-in-from-right duration-300">
            {/* Sidebar Header */}
            <div className="bg-gradient-to-r from-cyan-500 to-cyan-600 px-6 py-5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Plus className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-lg">New Column</h3>
                  <p className="text-cyan-100 text-xs">AI-powered column creation</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 rounded-md hover:bg-white/20 text-white"
                onClick={() => {
                  setShowColumnSidebar(false);
                  setNewColumnLabel('');
                  setNewColumnDescription('');
                  setColumnError(null);
                }}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Sidebar Content */}
            <div className="flex-1 overflow-auto px-6 py-6 space-y-6">
              {/* Description First */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <Sparkles className="w-4 h-4 text-cyan-500" />
                  What should this column do?
                </label>
                <div className="relative">
                  <textarea
                    ref={newColumnInputRef}
                    value={newColumnDescription}
                    onChange={(e) => handleDescriptionChange(e.target.value)}
                    placeholder="Describe what you want this column to contain...&#10;&#10;Examples:&#10;• Extract company names from URLs&#10;• Find the CEO of each company&#10;• Summarize the main product offering"
                    rows={6}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-100 resize-none transition-all"
                  />
                  {isGeneratingTitle && (
                    <div className="absolute right-3 top-3 flex items-center gap-2 text-xs text-cyan-600 bg-cyan-50 px-2 py-1 rounded-md">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Generating title...
                    </div>
                  )}
                </div>
                <div className="flex items-start gap-2 text-xs text-slate-500 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                  <Sparkles className="w-3.5 h-3.5 text-blue-500 mt-0.5 shrink-0" />
                  <p>AI will automatically suggest a column name based on your description. You can edit it below.</p>
                </div>
              </div>

              {/* Column Name (Auto-generated) */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  Column Name
                  {newColumnLabel && !isGeneratingTitle && (
                    <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Auto-generated</span>
                  )}
                </label>
                <Input
                  value={newColumnLabel}
                  onChange={(e) => setNewColumnLabel(e.target.value)}
                  placeholder="Enter column name or wait for AI suggestion"
                  className="bg-slate-50 border-slate-200 h-11 focus:border-cyan-400 focus:ring-cyan-100"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.metaKey) handleCreateColumn();
                  }}
                />
                <p className="text-xs text-slate-500">
                  Press <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 font-mono text-slate-700">⌘ + Enter</kbd> to create
                </p>
              </div>

              {columnError && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 px-4 py-3 rounded-lg flex items-start gap-2">
                  <X className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{columnError}</span>
                </div>
              )}

              {/* Help Section */}
              <div className="mt-8 p-4 bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 rounded-xl">
                <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-slate-400" />
                  Tips for better results
                </h4>
                <ul className="space-y-1.5 text-xs text-slate-600">
                  <li className="flex items-start gap-2">
                    <span className="text-cyan-500 mt-0.5">•</span>
                    <span>Be specific about what data you want to extract</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-cyan-500 mt-0.5">•</span>
                    <span>Mention the source column if you're referencing other data</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-cyan-500 mt-0.5">•</span>
                    <span>AI works best with clear, action-oriented descriptions</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Sidebar Footer */}
            <div className="backdrop-blur-sm bg-white border-t border-slate-200 px-6 py-5 shrink-0 space-y-3">
              <Button
                onClick={handleCreateColumn}
                disabled={columnSaving || !newColumnLabel.trim()}
                className="w-full h-12 bg-cyan-gradient hover:opacity-90 text-white shadow-lg shadow-cyan-500/20 gap-2 text-base font-medium"
              >
                {columnSaving ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Creating Column...
                  </>
                ) : (
                  <>
                    <Plus className="w-5 h-5" />
                    Create Column
                  </>
                )}
              </Button>
              <button
                onClick={() => {
                  setShowColumnSidebar(false);
                  setNewColumnLabel('');
                  setNewColumnDescription('');
                  setColumnError(null);
                }}
                className="w-full text-sm text-slate-600 hover:text-slate-900 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

      </div>
      
      {/* New Column Creation Sidebar */}
      <ColumnCreationSidebar
        isOpen={showColumnSidebar}
        onClose={() => setShowColumnSidebar(false)}
        onSave={handleCreateColumn}
        isSaving={columnSaving}
        tableName={currentTable?.name}
      />
    </>
  );
}

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
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
} from 'lucide-react';
import { TableSidebar } from '../../../../components/tables/table-sidebar';
import { apiClient } from '../../../../lib/api-client';
import { Table, Column, Row, DataType } from '../../../../lib/api-types';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';


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
  const [isCreatingColumn, setIsCreatingColumn] = useState(false);
  const [newColumnLabel, setNewColumnLabel] = useState('');
  const [newColumnType, setNewColumnType] = useState<DataType>('text');
  const [columnSaving, setColumnSaving] = useState(false);
  const [columnDeletingId, setColumnDeletingId] = useState<string | null>(null);
  const [columnError, setColumnError] = useState<string | null>(null);
  
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
  const [modalPosition, setModalPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    params.then((p) => setTableId(p.tableId));
  }, [params]);

  const loadData = useCallback(async () => {
    if (!tableId) return;
    
    setLoading(true);
    try {
      // Load all tables for sidebar
      const allTables = await apiClient.getTables();
      const formattedTables = allTables.map((t) => ({
        id: t.id,
        name: t.name,
        active: t.id === tableId,
      }));
      setTables(formattedTables);

      // Load current table details with columns
      const tableDetails = await apiClient.getTable(tableId);
      setCurrentTable(tableDetails);
      
      // Extract columns from table details
      if ('columns' in tableDetails && Array.isArray(tableDetails.columns)) {
        setColumns(tableDetails.columns);
      }
      
      // Load rows
      const rowsResponse = await apiClient.getRows(tableId);
      setRowData(rowsResponse.rows);
    } catch (error) {
      console.error('Failed to load table data:', error);
    } finally {
      setLoading(false);
    }
  }, [tableId]);

  useEffect(() => {
    if (tableId) {
      loadData();
    }
  }, [tableId, loadData]);

  useEffect(() => {
    if (isCreatingColumn) {
      newColumnInputRef.current?.focus();
    }
  }, [isCreatingColumn]);

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

  const handleCreateColumn = useCallback(async () => {
    if (!newColumnLabel.trim()) {
      setColumnError('Please enter a column name.');
      return;
    }
    setColumnError(null);
    setColumnSaving(true);

    try {
      const key = generateColumnKey(newColumnLabel);
      const newColumn = await apiClient.createColumn(tableId, {
        key,
        label: newColumnLabel.trim(),
        dataType: newColumnType,
      });

      setColumns((prev) => [...prev, newColumn]);
      setRowData((prev) =>
        (prev || []).map((row) => ({
          ...row,
          data: { ...row.data, [newColumn.key]: row.data?.[newColumn.key] ?? '' },
        }))
      );
      setNewColumnLabel('');
      setNewColumnType('text');
      setIsCreatingColumn(false);
    } catch (error) {
      console.error('Failed to create column:', error);
      setColumnError(error instanceof Error ? error.message : 'Unable to add column');
    } finally {
      setColumnSaving(false);
    }
  }, [generateColumnKey, newColumnLabel, newColumnType, tableId]);

  const handleDeleteColumn = useCallback(async (columnId: string) => {
    const colToRemove = columns.find((c) => c.id === columnId);
    if (!colToRemove) return;

    setColumnDeletingId(columnId);
    try {
      await apiClient.deleteColumn(tableId, columnId);
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
        await apiClient.updateRow(tableId, rowId, {
          data: { ...rowToUpdate.data, [field]: newValue }
        });
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
      
      const newRow = await apiClient.createRow(tableId, { data: emptyData });
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
    
    try {
      // Delete all selected rows
      await Promise.all(
        Array.from(selectedRowIds).map(rowId => 
          apiClient.deleteRow(tableId, rowId)
        )
      );
      
      // Remove from local state
      setRowData(prevData => prevData.filter(row => !selectedRowIds.has(row.id)));
      setSelectedRowIds(new Set());
      setAllChecked(false);
    } catch (error) {
      console.error('Failed to delete rows:', error);
      // Reload on error
      await loadData();
    }
  };

  const handleRowSelectionStart = (e: React.MouseEvent, index: number, id: string) => {
    e.preventDefault();
    setIsDraggingRows(true);
    rowSelectionStartRef.current = index;
    const newSet = new Set([id]);
    setSelectedRowIds(newSet);
    setAllChecked(newSet.size === rowData.length);
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
      const allIds = new Set(rowData.map(r => r.id));
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

    const borderColor = 'rgb(193, 0, 97)';
    const backgroundColor = isCopyFlash ? 'rgba(60, 188, 0, 0.3)' : 'rgba(255, 0, 128, 0.1)';
    const borderStyle = 'dashed';

    const isTop = rowIndex === minR;
    const isBottom = rowIndex === maxR;
    const isLeft = colIndex === minC;
    const isRight = colIndex === maxC;

    return {
      isSelected: true,
      style: {
        backgroundColor: backgroundColor,
        borderTop: isTop ? `1px ${borderStyle} ${borderColor}` : undefined,
        borderBottom: isBottom ? `1px ${borderStyle} ${borderColor}` : undefined,
        borderLeft: isLeft ? `1px ${borderStyle} ${borderColor}` : undefined,
        borderRight: isRight ? `1px ${borderStyle} ${borderColor}` : undefined,
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

  const handleNewColumnClick = () => {
    setColumnError(null);
    setIsCreatingColumn(true);
    setShowEnrichModal(false);
    setTimeout(() => newColumnInputRef.current?.focus(), 0);
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
        
        {/* Top Bar */}
        <div className="border-b border-slate-200 px-6 py-4 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-slate-900">
              <div className="w-8 h-8 bg-slate-900 rounded-md flex items-center justify-center text-white shadow-sm ring-1 ring-slate-900/5">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h1 className="font-semibold text-lg leading-none tracking-tight">{currentTable?.name || 'Table'}</h1>
                <p className="text-xs text-slate-500 mt-1">Managed by your team</p>
              </div>
            </div>
            <div className="h-6 w-px bg-slate-200 mx-2"></div>
            <span className="bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full text-xs font-medium border border-slate-200">
              {rowData?.length || 0} records
            </span>
          </div>
          <div className="flex items-center gap-3">
            {selectedRowIds.size > 0 && (
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-2 text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
                onClick={handleDeleteSelectedRows}
              >
                <X className="w-3.5 h-3.5" />
                Delete {selectedRowIds.size} row{selectedRowIds.size > 1 ? 's' : ''}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => {
                setIsCreatingColumn((open) => !open);
                setColumnError(null);
              }}
            >
              <Plus className="w-3.5 h-3.5" />
              {isCreatingColumn ? 'Close column form' : 'Add column'}
            </Button>
            <Button variant="outline" size="sm" className="gap-2">
              <Users className="w-3.5 h-3.5" />
              Share
            </Button>
            <Button size="sm" className="gap-2">
              <ChevronDown className="w-3.5 h-3.5" />
              Export CSV
            </Button>
          </div>
        </div>

        {isCreatingColumn && (
          <div className="border-b border-slate-200 bg-slate-50 px-6 py-3 flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-60">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Column name</label>
              <Input
                ref={newColumnInputRef}
                value={newColumnLabel}
                onChange={(e) => setNewColumnLabel(e.target.value)}
                placeholder="e.g. Company, Website"
              />
            </div>
            <div className="w-52 min-w-52">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Type</label>
              <select
                value={newColumnType}
                onChange={(e) => setNewColumnType(e.target.value as DataType)}
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-slate-400 focus:outline-none"
              >
                {['text', 'number', 'boolean', 'date', 'url', 'email'].map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                className="gap-2"
                disabled={columnSaving}
                onClick={handleCreateColumn}
              >
                {columnSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                Save column
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setIsCreatingColumn(false);
                  setColumnError(null);
                }}
              >
                Cancel
              </Button>
            </div>
            {columnError && <p className="w-full text-xs text-red-500">{columnError}</p>}
          </div>
        )}

        {/* Table Container */}
        <div className="flex-1 overflow-auto relative select-none" ref={gridContainerRef}>
          <div className="min-w-300">
            
            {/* Header */}
            <div className="flex items-center h-10 border-b border-slate-200 bg-white sticky top-0 z-30">
              {/* Checkbox Column */}
              <div 
                className="w-12 flex items-center justify-center shrink-0 sticky left-0 bg-white z-30 border-r border-transparent hover:border-slate-200 transition-colors cursor-pointer"
                onClick={toggleAllRows}
              >
                <Checkbox checked={allChecked} />
              </div>

              {/* Columns */}
              {columns.map((col, idx) => {
                return (
                  <div 
                    key={col.id} 
                    className={cn(
                      'flex items-center gap-2 px-4 border-r border-slate-100 hover:border-slate-300 shrink-0 h-full transition-colors bg-white',
                      'w-64',
                      idx === 0 && 'sticky left-12 z-30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]'
                    )}
                  >
                    <MoreHorizontal className="w-4 h-4 text-slate-400" />
                    <span className="text-[13px] font-medium text-slate-600 flex-1 truncate">{col.label}</span>
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
              <div 
                className="px-4 flex items-center cursor-pointer hover:bg-slate-50 transition-colors h-full text-slate-500 hover:text-slate-900 gap-2 shrink-0 min-w-37.5"
                onClick={handleNewColumnClick}
              >
                <Plus className="w-4 h-4" />
                <span className="text-[13px] font-medium">New column</span>
              </div>
            </div>

            {/* Rows */}
            <div className="divide-y divide-slate-100 relative">
              {rowData && rowData.map((row, rIndex) => {
                const isRowSelected = selectedRowIds.has(row.id);
                const rowBg = rIndex % 2 === 1 ? 'bg-slate-50/30' : 'bg-white';

                return (
                  <div 
                    key={row.id} 
                    className={cn(
                      'flex items-center h-12 transition-colors group relative',
                      rowBg,
                      isRowSelected && 'bg-blue-50/60'
                    )}
                  >
                    {/* Left Gutter Checkbox */}
                    <div 
                      className={cn(
                        'w-12 flex items-center justify-center shrink-0 sticky left-0 z-20 cursor-grab active:cursor-grabbing border-r border-slate-100',
                        isRowSelected ? 'bg-blue-50/90' : 'bg-white'
                      )}
                      onMouseDown={(e) => handleRowSelectionStart(e, rIndex, row.id)}
                      onMouseEnter={() => handleRowSelectionMove(rIndex)}
                    >
                      <Checkbox checked={isRowSelected} />
                    </div>

                    {/* Data Cells */}
                    {columns.map((col, cIndex) => {
                      const { style } = getCellSelectionState(rIndex, cIndex);
                      const isEditing = editingCell?.rowIndex === rIndex && editingCell?.colId === col.id;
                      const value = row.data?.[col.key];
                      
                      return (
                        <div 
                          key={col.id}
                          className={cn(
                            'h-full flex items-center px-4 shrink-0 border-r border-transparent relative outline-none',
                            'w-64',
                            cIndex === 0 && 'sticky left-12 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]',
                            cIndex === 0 && (isRowSelected ? 'bg-blue-50/90' : 'bg-white'),
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
                          {isEditing ? (
                            <Input 
                              autoFocus
                              className="h-8 shadow-none border-purple-500 ring-2 ring-purple-100"
                              value={String(value || '')}
                              onChange={(e) => updateRow(row.id, col.key, e.target.value)}
                              onBlur={() => setEditingCell(null)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') setEditingCell(null);
                                if (e.key === 'Escape') setEditingCell(null);
                              }}
                            />
                          ) : (
                            <div className="w-full truncate text-slate-700">
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
              className="sticky left-0 w-full pl-12 border-t border-slate-100 bg-slate-50/50 hover:bg-slate-100 transition-colors cursor-pointer group"
              onClick={handleAddRow}
            >
              <div className="flex items-center gap-2 py-3 px-4 text-slate-500 group-hover:text-slate-900 transition-colors">
                <Plus className="w-4 h-4" />
                <span className="text-sm font-medium">Add new row</span>
              </div>
            </div>
            <div className="h-20"></div>
          </div>

          {/* Enrich Modal */}
          {showEnrichModal && (
            <>
              <div 
                className="fixed inset-0 z-40 bg-transparent" 
                onClick={() => setShowEnrichModal(false)}
              />
              <div 
                className="absolute z-50 w-85 bg-white rounded-lg shadow-xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-100"
                style={{ top: modalPosition.y, left: modalPosition.x }}
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
      </div>
    </>
  );
}

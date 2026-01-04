'use client';

import { useCallback, useRef, useState, useEffect } from 'react';
import { Play, Plus, Trash2, Check } from 'lucide-react';

type ColumnType = 'text' | 'number' | 'url' | 'email' | 'date';

type TableColumn = {
  id: string;
  name: string;
  type: ColumnType;
};

type TableRow = {
  id: string;
  [key: string]: string;
};

type InteractiveTableProps = {
  initialColumns?: TableColumn[];
  initialRows?: TableRow[];
  title?: string;
};

type CellSelection = {
  start: { r: number; c: number };
  end: { r: number; c: number };
} | null;

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

function createId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.floor(Math.random() * 9999)}`;
}

export function InteractiveTable({
  initialColumns = [
    { id: 'col-1', name: 'Full name', type: 'text' },
    { id: 'col-2', name: 'Job title', type: 'text' },
    { id: 'col-3', name: 'Company name', type: 'text' },
    { id: 'col-4', name: 'Company website', type: 'url' },
  ],
  initialRows = [
    {
      id: 'row-1',
      'col-1': 'Priyanshu Saini',
      'col-2': 'Fullstack developer',
      'col-3': 'Rutics',
      'col-4': 'https://rutics.com/',
    },
  ],
  title = 'New table',
}: InteractiveTableProps) {
  const [columns, setColumns] = useState<TableColumn[]>(initialColumns);
  const [data, setData] = useState<TableRow[]>(initialRows);
  const [editingCell, setEditingCell] = useState<{ rowIndex: number; colId: string } | null>(null);
  const [editValue, setEditValue] = useState('');

  // Cell selection state
  const [selectionRange, setSelectionRange] = useState<CellSelection>(null);
  const [isSelectingCells, setIsSelectingCells] = useState(false);
  const [isCopyFlash, setIsCopyFlash] = useState(false);

  // Row selection state
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());
  const [isDraggingRows, setIsDraggingRows] = useState(false);
  const rowSelectionStartRef = useRef<number | null>(null);
  const [allChecked, setAllChecked] = useState(false);


  const containerRef = useRef<HTMLDivElement>(null);

  // Copy to clipboard
  const handleCopy = useCallback(async () => {
    if (!selectionRange) return;

    const { start, end } = selectionRange;
    const minR = Math.min(start.r, end.r);
    const maxR = Math.max(start.r, end.r);
    const minC = Math.min(start.c, end.c);
    const maxC = Math.max(start.c, end.c);

    let clipboardText = '';

    for (let r = minR; r <= maxR; r++) {
      const row = data[r];
      if (!row) continue;
      const rowValues = [];
      for (let c = minC; c <= maxC; c++) {
        const col = columns[c];
        if (col) {
          rowValues.push(row[col.id] || '');
        }
      }
      clipboardText += rowValues.join('\t') + (r < maxR ? '\n' : '');
    }

    try {
      await navigator.clipboard.writeText(clipboardText);
      setIsCopyFlash(true);
      setTimeout(() => setIsCopyFlash(false), 300);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [selectionRange, columns, data]);

  // Global mouse up handler
  useEffect(() => {
    const handleMouseUp = () => {
      setIsDraggingRows(false);
      setIsSelectingCells(false);
      rowSelectionStartRef.current = null;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Copy functionality
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        handleCopy();
      }
      // Cancel Selection on Escape
      if (e.key === 'Escape') {
        setSelectionRange(null);
        setEditingCell(null);
      }
      // Enter to edit start cell
      if (e.key === 'Enter' && selectionRange && !editingCell) {
        e.preventDefault();
        const col = columns[selectionRange.start.c];
        if (col) {
          setEditingCell({ rowIndex: selectionRange.start.r, colId: col.id });
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


  // Update row
  const updateRow = useCallback((id: string, field: string, newValue: string) => {
    setData((prevData) =>
      prevData.map((row) => (row.id === id ? { ...row, [field]: newValue } : row))
    );
  }, []);

  // Add column
  const addColumn = useCallback(() => {
    const newColId = createId('col');
    const newColumn: TableColumn = { id: newColId, name: 'New column', type: 'text' };
    setColumns((prev) => [...prev, newColumn]);
    setData((prev) => prev.map((row) => ({ ...row, [newColId]: '' })));
  }, []);

  // Delete column
  const deleteColumn = useCallback((colId: string) => {
    setColumns((prev) => prev.filter((c) => c.id !== colId));
    setData((prev) =>
      prev.map((row) => {
        const next = { ...row };
        delete next[colId];
        return next;
      })
    );
  }, []);

  // Rename column
  const renameColumn = useCallback((colId: string, newName: string) => {
    setColumns((prev) => prev.map((col) => (col.id === colId ? { ...col, name: newName } : col)));
  }, []);

  // Add row
  const addRow = useCallback(() => {
    const newRowId = createId('row');
    const base: TableRow = { id: newRowId };
    columns.forEach((col) => {
      base[col.id] = '';
    });
    setData((prev) => [...prev, base]);
  }, [columns]);

  // Row selection handlers
  const handleRowSelectionStart = (e: React.MouseEvent, index: number, id: string) => {
    e.preventDefault();
    setIsDraggingRows(true);
    rowSelectionStartRef.current = index;
    const newSet = new Set([id]);
    setSelectedRowIds(newSet);
    setAllChecked(newSet.size === data.length);
  };

  const handleRowSelectionMove = (index: number) => {
    if (!isDraggingRows || rowSelectionStartRef.current === null) return;
    const start = rowSelectionStartRef.current;
    const end = index;
    const low = Math.min(start, end);
    const high = Math.max(start, end);
    const newSelectedIds = new Set<string>();
    for (let i = low; i <= high; i++) {
      const row = data[i];
      if (row) newSelectedIds.add(row.id);
    }
    setSelectedRowIds(newSelectedIds);
  };

  const toggleAllRows = () => {
    if (allChecked) {
      setSelectedRowIds(new Set());
      setAllChecked(false);
    } else {
      const allIds = new Set(data.map((r) => r.id));
      setSelectedRowIds(allIds);
      setAllChecked(true);
    }
  };

  // Cell selection handlers
  const handleCellMouseDown = (rowIndex: number, colIndex: number, e: React.MouseEvent) => {
    if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'A') return;

    setIsSelectingCells(true);
    setSelectionRange({
      start: { r: rowIndex, c: colIndex },
      end: { r: rowIndex, c: colIndex },
    });
    setEditingCell(null);
  };

  const handleCellMouseEnter = (rowIndex: number, colIndex: number) => {
    if (isSelectingCells && selectionRange) {
      setSelectionRange({
        ...selectionRange,
        end: { r: rowIndex, c: colIndex },
      });
    }
  };

  // Get cell selection state
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
      },
    };
  };

  // Render cell content
  const renderCellContent = (value: string, type: ColumnType) => {
    if (type === 'url' && value && value.startsWith('http')) {
      return (
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline truncate block"
        >
          {value.replace(/^https?:\/\//, '').replace(/\/$/, '')}
        </a>
      );
    }
    return <span className="truncate">{value || <span className="text-gray-400 italic">Empty</span>}</span>;
  };

  const selectedCellCount = selectionRange
    ? (Math.abs(selectionRange.end.r - selectionRange.start.r) + 1) *
    (Math.abs(selectionRange.end.c - selectionRange.start.c) + 1)
    : 0;

  // Get selected cells for enrichment
  // Commented out for future use
  // const getSelectedCells = () => {
  //   if (!selectionRange) return [];
  //   
  //   const { start, end } = selectionRange;
  //   const minR = Math.min(start.r, end.r);
  //   const maxR = Math.max(start.r, end.r);
  //   const minC = Math.min(start.c, end.c);
  //   const maxC = Math.max(start.c, end.c);
  //
  //   const cells = [];
  //   for (let r = minR; r <= maxR; r++) {
  //     const row = data[r];
  //     if (!row) continue;
  //     for (let c = minC; c <= maxC; c++) {
  //       const col = columns[c];
  //       if (col) {
  //         cells.push({
  //           row: r,
  //           col: col.id,
  //           value: row[col.id] || ''
  //         });
  //       }
  //     }
  //   }
  //   return cells;
  // };

  // Handle enrichment complete
  // Commented out for future use
  // const handleEnrichmentComplete = (result: EnrichmentResponse) => {
  //   console.log('Enrichment complete:', result);
  //   // Here you would update the table data with enriched results
  //   // For now, just log it
  // };

  return (
    <div className="flex flex-col h-full rounded-xl border border-gray-200/60 bg-white shadow-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-gray-200/60 glass-panel px-6 py-4 flex-wrap">
        <h2 className="text-lg font-semibold text-gray-900 tracking-tight">{title}</h2>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={addColumn}
            className="group flex items-center gap-2 rounded-lg bg-linear-to-r from-blue-500 to-blue-600 px-4 py-2 text-sm font-medium text-white shadow-md hover:shadow-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 active:scale-95"
          >
            <Plus size={16} className="group-hover:rotate-90 transition-transform duration-200" />
            Add column
          </button>
          <button
            onClick={addRow}
            className="group flex items-center gap-2 rounded-lg bg-linear-to-r from-emerald-500 to-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-md hover:shadow-lg hover:from-emerald-600 hover:to-emerald-700 transition-all duration-200 active:scale-95"
          >
            <Plus size={16} className="group-hover:rotate-90 transition-transform duration-200" />
            Add row
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Table Container */}
        <div className="flex-1 overflow-auto relative select-none transition-all duration-300" ref={containerRef}>
          <div className="min-w-full">
            {/* Header Row */}
            <div className="flex items-center h-12 border-b-2 border-gray-200/80 bg-white sticky top-0 z-30">
              {/* Checkbox Column */}
              <div
                className="w-12 flex items-center justify-center shrink-0 sticky left-0 bg-white z-30 border-r border-gray-200/40 hover:bg-gray-50 transition-colors h-full"
                onClick={toggleAllRows}
              >
                <Checkbox checked={allChecked} />
              </div>

              {/* Column Headers */}
              {columns.map((col, idx) => (
                <div
                  key={col.id}
                  className={cn(
                    'flex flex-col gap-1.5 px-4 py-2 border-r border-gray-200/40 shrink-0 h-full justify-center transition-colors bg-linear-to-b from-gray-50/90 to-white/70 group',
                    idx === 0 && 'sticky left-12 z-30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]',
                    'min-w-50'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={col.name}
                      onChange={(e) => renameColumn(col.id, e.target.value)}
                      className="w-full bg-transparent text-xs font-semibold uppercase tracking-wider text-gray-700 outline-none hover:text-gray-900 transition-colors"
                      placeholder="Column name"
                    />
                    <button
                      aria-label="Delete column"
                      onClick={() => deleteColumn(col.id)}
                      className="text-red-500 opacity-0 group-hover:opacity-100 transition-all duration-200 p-1.5 rounded-md hover:bg-red-50 hover:shadow-sm shrink-0"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-medium uppercase tracking-wider text-gray-400">{col.id}</span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase bg-blue-100 text-blue-700 border border-blue-200">
                      {col.type}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Data Rows */}
            <div className="divide-y divide-slate-100 relative">
              {data.map((row, rIndex) => {
                const isRowSelected = selectedRowIds.has(row.id);
                const rowBg = rIndex % 2 === 1 ? 'bg-slate-50/30' : 'bg-white';

                return (
                  <div
                    key={row.id}
                    className={cn(
                      'flex items-center h-14 transition-colors group relative',
                      rowBg,
                      isRowSelected && 'bg-blue-50/60'
                    )}
                  >
                    {/* Row Checkbox */}
                    <div
                      className={cn(
                        'w-12 flex items-center justify-center shrink-0 sticky left-0 z-20 cursor-grab active:cursor-grabbing border-r border-slate-100 h-full',
                        isRowSelected ? 'bg-blue-50/90' : 'bg-white'
                      )}
                      onMouseDown={(e) => handleRowSelectionStart(e, rIndex, row.id)}
                      onMouseEnter={() => handleRowSelectionMove(rIndex)}
                    >
                      <Checkbox checked={isRowSelected} />
                    </div>

                    {/* Data Cells */}
                    {columns.map((col, cIndex) => {
                      const { isSelected, style } = getCellSelectionState(rIndex, cIndex);
                      const isEditing = editingCell?.rowIndex === rIndex && editingCell?.colId === col.id;

                      return (
                        <div
                          key={col.id}
                          className={cn(
                            'h-full flex items-center px-4 shrink-0 border-r border-transparent relative outline-none min-w-50',
                            cIndex === 0 && 'sticky left-12 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]',
                            cIndex === 0 && (isRowSelected ? 'bg-blue-50/90' : 'bg-white')
                          )}
                          style={isSelected ? style : undefined}
                          onMouseDown={(e) => handleCellMouseDown(rIndex, cIndex, e)}
                          onMouseEnter={() => handleCellMouseEnter(rIndex, cIndex)}
                          onDoubleClick={() => {
                            setEditingCell({ rowIndex: rIndex, colId: col.id });
                            setEditValue(row[col.id] || '');
                          }}
                        >
                          {isEditing ? (
                            <input
                              autoFocus
                              type="text"
                              className="w-full h-8 shadow-none border-2 border-purple-500 ring-2 ring-purple-100 rounded px-2 outline-none"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={() => {
                                updateRow(row.id, col.id, editValue);
                                setEditingCell(null);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  updateRow(row.id, col.id, editValue);
                                  setEditingCell(null);
                                }
                                if (e.key === 'Escape') {
                                  setEditingCell(null);
                                }
                              }}
                            />
                          ) : (
                            <div className="w-full text-slate-700 text-sm">
                              {renderCellContent(row[col.id] ?? '', col.type)}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-gray-200/60 glass-panel px-6 py-4 text-xs text-gray-600">
        <span className="font-medium">
          <span className="text-gray-900 font-semibold">{data.length}</span> row{data.length === 1 ? '' : 's'} •{' '}
          <span className="text-gray-900 font-semibold">{columns.length}</span> column{columns.length === 1 ? '' : 's'}
          {selectedRowIds.size > 0 && (
            <>
              {' '}• <span className="text-purple-600 font-semibold">{selectedRowIds.size}</span> row{selectedRowIds.size === 1 ? '' : 's'} selected
            </>
          )}
        </span>
        <button
          disabled={selectedCellCount === 0}
          className={`flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold shadow-md transition-all duration-200 ${selectedCellCount === 0
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed opacity-60'
              : 'bg-linear-to-r from-purple-600 to-purple-700 text-white hover:from-purple-700 hover:to-purple-800 hover:shadow-lg active:scale-95'
            }`}
        >
          <Play size={16} className={selectedCellCount > 0 ? 'animate-pulse' : ''} />
          Run selected cells ({selectedCellCount})
        </button>
      </div>
    </div>
  );
}

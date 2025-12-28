/* eslint-disable @typescript-eslint/no-unused-expressions */
'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { ColumnDef, flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Play, Plus, Trash2 } from 'lucide-react';

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

type SelectionState = {
  dragVector: DOMVector | null;
  isDragging: boolean;
  lastClickedCellId: string | null;
  initialSelection: Set<string>;
};

class DOMVector {
  constructor(
    public x: number,
    public y: number,
    public magnitudeX: number,
    public magnitudeY: number
  ) {}

  toRect(): DOMRect {
    return new DOMRect(
      this.magnitudeX < 0 ? this.x + this.magnitudeX : this.x,
      this.magnitudeY < 0 ? this.y + this.magnitudeY : this.y,
      Math.abs(this.magnitudeX),
      Math.abs(this.magnitudeY)
    );
  }
}

function clampRect(rect: DOMRect, maxWidth: number, maxHeight: number) {
  const x = Math.max(0, Math.min(rect.x, maxWidth));
  const y = Math.max(0, Math.min(rect.y, maxHeight));
  const width = Math.min(rect.width, maxWidth - x);
  const height = Math.min(rect.height, maxHeight - y);
  return new DOMRect(x, y, Math.max(0, width), Math.max(0, height));
}

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
  const [editingCell, setEditingCell] = useState<{ rowId: string; colId: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set());
  const [selectionState, setSelectionState] = useState<SelectionState>({
    dragVector: null,
    isDragging: false,
    lastClickedCellId: null,
    initialSelection: new Set(),
  });

  const scrollRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const cellId = (rowId: string, colId: string) => `${rowId}:${colId}`;

  const startEditing = useCallback((rowId: string, colId: string, value: string) => {
    setEditingCell({ rowId, colId });
    setEditValue(value ?? '');
  }, []);

  const saveEdit = useCallback(
    (rowId: string, colId: string) => {
      setData((prev) => prev.map((row) => (row.id === rowId ? { ...row, [colId]: editValue } : row)));
      setEditingCell(null);
      setEditValue('');
    },
    [editValue]
  );

  const handleCellKeyDown = useCallback(
    (e: React.KeyboardEvent, rowId: string, colId: string) => {
      if (e.key === 'Enter') {
        saveEdit(rowId, colId);
      }
      if (e.key === 'Escape') {
        setEditingCell(null);
        setEditValue('');
      }
    },
    [saveEdit]
  );

  const renameColumn = useCallback((colId: string, newName: string) => {
    setColumns((prev) => prev.map((col) => (col.id === colId ? { ...col, name: newName } : col)));
  }, []);

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

  const addColumn = useCallback(() => {
    const newColId = createId('col');
    const newColumn: TableColumn = { id: newColId, name: 'New column', type: 'text' };
    setColumns((prev) => [...prev, newColumn]);
    setData((prev) => prev.map((row) => ({ ...row, [newColId]: '' })));
  }, []);

  const addRow = useCallback(() => {
    const newRowId = createId('row');
    const base: TableRow = { id: newRowId };
    columns.forEach((col) => {
      base[col.id] = '';
    });
    setData((prev) => [...prev, base]);
  }, [columns]);

  const tableColumns = useMemo<ColumnDef<TableRow>[]>(
    () =>
      columns.map((col) => ({
        id: col.id,
        header: () => (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={col.name}
              onChange={(e) => renameColumn(col.id, e.target.value)}
              className="w-full bg-transparent text-[11px] font-semibold uppercase tracking-wide text-gray-700 outline-none"
            />
            <button
              aria-label="Delete column"
              onClick={() => deleteColumn(col.id)}
              className="text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-50"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ),
        cell: ({ row }) => {
          const isEditing = editingCell?.rowId === row.original.id && editingCell?.colId === col.id;
          const value = row.original[col.id] ?? '';

          if (isEditing) {
            return (
              <input
                autoFocus
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={() => saveEdit(row.original.id, col.id)}
                onKeyDown={(e) => handleCellKeyDown(e, row.original.id, col.id)}
                className="w-full rounded border border-blue-500 px-2 py-1 text-sm outline-none"
              />
            );
          }

          const rendered = value && col.type === 'url' && value.startsWith('http') ? (
            <a href={value} className="text-blue-600 hover:underline" target="_blank" rel="noreferrer">
              {value}
            </a>
          ) : (
            value
          );

          return (
            <div
              onDoubleClick={() => startEditing(row.original.id, col.id, value)}
              className="rounded px-1 py-0.5 text-sm text-gray-900 hover:bg-gray-50 cursor-text"
            >
              {rendered}
            </div>
          );
        },
      })),
    [columns, deleteColumn, editingCell, editValue, handleCellKeyDown, renameColumn, saveEdit, startEditing]
  );

  const table = useReactTable({
    data,
    columns: tableColumns,
    getRowId: (row) => row.id,
    getCoreRowModel: getCoreRowModel(),
  });

  const rowVirtualizer = useVirtualizer({
    getScrollElement: () => scrollRef.current,
    count: table.getRowModel().rows.length,
    estimateSize: () => 52,
    overscan: 8,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();
  const paddingTop = virtualRows.length > 0 ? virtualRows[0]?.start ?? 0 : 0;
  const paddingBottom = virtualRows.length > 0 ? totalSize - (virtualRows[virtualRows.length - 1]?.end ?? totalSize) : 0;

  const handleCellClick = useCallback(
    (cell: string, event: React.MouseEvent) => {
      const isCtrl = event.ctrlKey || event.metaKey;
      const next = new Set(selectedCells);

      if (isCtrl) {
        next.has(cell) ? next.delete(cell) : next.add(cell);
      } else {
        next.clear();
        next.add(cell);
      }

      setSelectedCells(next);
      setSelectionState((prev) => ({ ...prev, lastClickedCellId: cell }));
    },
    [selectedCells]
  );

  const checkIntersection = useCallback(
    (selectionRect: DOMRect): Set<string> => {
      const intersecting = new Set<string>();
      const container = containerRef.current;
      if (!container) return intersecting;

      const containerRect = container.getBoundingClientRect();
      const cells = container.querySelectorAll<HTMLElement>('[data-cell-id]');

      cells.forEach((cell) => {
        const rect = cell.getBoundingClientRect();
        const relativeRect = new DOMRect(
          rect.x - containerRect.x,
          rect.y - containerRect.y,
          rect.width,
          rect.height
        );

        const intersects = !(
          relativeRect.right < selectionRect.left ||
          relativeRect.left > selectionRect.right ||
          relativeRect.bottom < selectionRect.top ||
          relativeRect.top > selectionRect.bottom
        );

        if (intersects) {
          const id = cell.dataset.cellId;
          if (id) intersecting.add(id);
        }
      });

      return intersecting;
    },
    []
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;

      const target = e.target as HTMLElement;
      if (target.closest('input, textarea, button, a, [role="button"], [role="checkbox"]')) return;

      const container = containerRef.current?.getBoundingClientRect();
      if (!container) return;

      const isCtrl = e.ctrlKey || e.metaKey;
      const currentSelection = new Set(selectedCells);

      setSelectionState((prev) => ({
        ...prev,
        dragVector: new DOMVector(e.clientX - container.x, e.clientY - container.y, 0, 0),
        initialSelection: isCtrl ? currentSelection : new Set(),
      }));

      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [selectedCells]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!selectionState.dragVector) return;

      const container = containerRef.current?.getBoundingClientRect();
      if (!container) return;

      const newVector = new DOMVector(
        selectionState.dragVector.x,
        selectionState.dragVector.y,
        e.clientX - container.x - selectionState.dragVector.x,
        e.clientY - container.y - selectionState.dragVector.y
      );

      const distance = Math.sqrt(newVector.magnitudeX ** 2 + newVector.magnitudeY ** 2);

      if (distance > 6) {
        const rawRect = newVector.toRect();
        const clampedRect = clampRect(rawRect, container.width, container.height);
        setSelectionState((prev) => ({ ...prev, isDragging: true, dragVector: newVector }));

        const isCtrl = e.ctrlKey || e.metaKey;
        const intersecting = checkIntersection(clampedRect);
        const next = new Set(isCtrl ? selectionState.initialSelection : []);
        intersecting.forEach((id) => next.add(id));
        setSelectedCells(next);
      } else {
        setSelectionState((prev) => ({ ...prev, dragVector: newVector }));
      }
    },
    [checkIntersection, selectionState.dragVector, selectionState.initialSelection]
  );

  const handlePointerUp = useCallback(() => {
    setSelectionState((prev) => ({
      dragVector: null,
      isDragging: false,
      lastClickedCellId: prev.lastClickedCellId,
      initialSelection: new Set(),
    }));
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        const all = new Set<string>();
        data.forEach((row) => {
          columns.forEach((col) => {
            all.add(cellId(row.id, col.id));
          });
        });
        setSelectedCells(all);
      }

      if (e.key === 'Escape') {
        setSelectedCells(new Set());
      }
    },
    [columns, data]
  );

  const dragRect = selectionState.dragVector?.toRect();
  const overlayRect =
    selectionState.isDragging && dragRect && containerRef.current
      ? clampRect(dragRect, containerRef.current.clientWidth, containerRef.current.clientHeight)
      : null;

  return (
    <div className="flex h-full flex-col rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-2 border-b border-gray-200 bg-gray-50 px-4 py-3 flex-wrap">
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={addColumn}
            className="flex items-center gap-1 rounded-lg bg-blue-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-600"
          >
            <Plus size={14} />
            Add column
          </button>
          <button
            onClick={addRow}
            className="flex items-center gap-1 rounded-lg bg-green-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-600"
          >
            <Plus size={14} />
            Add row
          </button>
        </div>
      </div>

      <div
        ref={(node) => {
          scrollRef.current = node;
          containerRef.current = node;
        }}
        className="relative flex-1 overflow-auto"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onKeyDown={handleKeyDown}
        tabIndex={0}
      >
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-gray-50">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-gray-200">
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="group border-r border-gray-200 px-3 py-2 text-left align-middle"
                  >
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    <div className="text-[10px] font-medium uppercase tracking-wide text-gray-400">{(header.column.columnDef as ColumnDef<TableRow>).id}</div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>

          <tbody className="relative">
            {paddingTop > 0 && (
              <tr>
                <td style={{ height: paddingTop }} colSpan={columns.length} />
              </tr>
            )}

            {virtualRows.map((virtualRow) => {
              const row = table.getRowModel().rows[virtualRow.index];
              if (!row) return null;

              return (
                <tr
                  key={row.id}
                  data-row-id={row.id}
                  className="h-13 border-b border-gray-100 transition-colors hover:bg-blue-50/40"
                >
                  {row.getVisibleCells().map((cell) => {
                    const cId = cellId(row.original.id, cell.column.id);
                    const isSelected = selectedCells.has(cId);

                    return (
                      <td
                        key={cell.id}
                        data-cell-id={cId}
                        className={`border-r border-gray-100 px-3 align-middle ${
                          isSelected ? 'bg-blue-100/70 ring-1 ring-inset ring-blue-300' : ''
                        }`}
                        onClick={(e) => handleCellClick(cId, e)}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    );
                  })}
                </tr>
              );
            })}

            {paddingBottom > 0 && (
              <tr>
                <td style={{ height: paddingBottom }} colSpan={columns.length} />
              </tr>
            )}
          </tbody>
        </table>

        {overlayRect && (
          <div
            className="pointer-events-none absolute rounded border border-blue-400 bg-blue-500/10"
            style={{
              left: overlayRect.x,
              top: overlayRect.y,
              width: overlayRect.width,
              height: overlayRect.height,
            }}
          />
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 bg-white/95 px-4 py-3 text-xs text-gray-700">
        <span>
          {data.length} row{data.length === 1 ? '' : 's'} • {columns.length} column{columns.length === 1 ? '' : 's'}
        </span>
        <button
          disabled={selectedCells.size === 0}
          className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold shadow-sm ${
            selectedCells.size === 0
              ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
              : 'bg-purple-600 text-white hover:bg-purple-700'
          }`}
        >
          <Play size={16} />
          Run selected cells ({selectedCells.size})
        </button>
      </div>
    </div>
  );
}

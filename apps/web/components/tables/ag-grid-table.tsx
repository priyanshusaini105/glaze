'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import {
  ColDef,
  GridApi,
  GridReadyEvent,
  CellValueChangedEvent,
  RowClassRules,
} from 'ag-grid-community';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { apiClient } from '../../lib/api-client';
import { Column, Row } from '../../lib/api-types';
import { Plus, Trash2, RefreshCw } from 'lucide-react';

// Register AG Grid modules
ModuleRegistry.registerModules([AllCommunityModule]);

interface AgGridTableProps {
  tableId: string;
  columns: Column[];
  onRefresh?: () => void;
}

export function AgGridTable({ tableId, columns, onRefresh }: AgGridTableProps) {
  const gridRef = useRef<AgGridReact>(null);
  const [rowData, setRowData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [gridApi, setGridApi] = useState<GridApi | null>(null);

  // Convert Column[] to AG Grid ColDef[]
  const columnDefs = useMemo<ColDef[]>(() => {
    const cols: ColDef[] = [
      {
        headerName: '',
        field: '__actions',
        width: 60,
        pinned: 'left',
        cellRenderer: (params: any) => {
          const onClick = async () => {
            if (confirm('Delete this row?')) {
              try {
                await apiClient.deleteRow(tableId, params.data.id);
                loadRows();
              } catch (error) {
                console.error('Failed to delete row:', error);
                alert('Failed to delete row');
              }
            }
          };
          
          return (
            <button
              onClick={onClick}
              className="text-red-500 hover:text-red-700 p-1"
              title="Delete row"
            >
              <Trash2 size={14} />
            </button>
          );
        },
        editable: false,
        sortable: false,
        filter: false,
      },
    ];

    columns.forEach((column) => {
      const colDef: ColDef = {
        headerName: column.label,
        field: column.key,
        editable: true,
        sortable: true,
        filter: true,
        resizable: true,
        flex: 1,
        minWidth: 150,
      };

      // Customize based on dataType
      switch (column.dataType) {
        case 'number':
          colDef.filter = 'agNumberColumnFilter';
          colDef.valueParser = (params) => Number(params.newValue);
          break;
        case 'date':
          colDef.filter = 'agDateColumnFilter';
          break;
        case 'boolean':
          colDef.cellRenderer = (params: any) => {
            return params.value ? '✓' : '';
          };
          colDef.cellEditor = 'agCheckboxCellEditor';
          break;
        case 'url':
          colDef.cellRenderer = (params: any) => {
            if (!params.value) return '';
            return `<a href="${params.value}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline">${params.value}</a>`;
          };
          break;
        case 'email':
          colDef.cellRenderer = (params: any) => {
            if (!params.value) return '';
            return `<a href="mailto:${params.value}" class="text-blue-600 hover:underline">${params.value}</a>`;
          };
          break;
        default:
          colDef.filter = 'agTextColumnFilter';
      }

      cols.push(colDef);
    });

    return cols;
  }, [columns, tableId]);

  // Load rows from API
  const loadRows = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiClient.getRows(tableId, { page: 1, limit: 1000 });
      const transformedData = response.rows.map((row: Row) => ({
        id: row.id,
        ...row.data,
      }));
      setRowData(transformedData);
    } catch (error) {
      console.error('Failed to load rows:', error);
      alert('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [tableId]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  const onGridReady = useCallback((params: GridReadyEvent) => {
    setGridApi(params.api);
  }, []);

  // Handle cell value changes (UPDATE)
  const onCellValueChanged = useCallback(
    async (event: CellValueChangedEvent) => {
      const rowId = event.data.id;
      const field = event.colDef.field;
      
      if (!rowId || !field || field === '__actions') return;

      const updatedData: Record<string, any> = {};
      updatedData[field] = event.newValue;

      try {
        await apiClient.updateRow(tableId, rowId, { data: updatedData });
      } catch (error) {
        console.error('Failed to update cell:', error);
        alert('Failed to update cell');
        // Revert the change
        event.node.setDataValue(field, event.oldValue);
      }
    },
    [tableId]
  );

  // Add new row
  const addRow = useCallback(async () => {
    const newRowData: Record<string, any> = {};
    columns.forEach((col) => {
      newRowData[col.key] = '';
    });

    try {
      const createdRow = await apiClient.createRow(tableId, { data: newRowData });
      setRowData((prev) => [
        {
          id: createdRow.id,
          ...createdRow.data,
        },
        ...prev,
      ]);
    } catch (error) {
      console.error('Failed to create row:', error);
      alert('Failed to create row');
    }
  }, [tableId, columns]);

  const rowClassRules = useMemo<RowClassRules>(() => {
    return {
      'bg-gray-50': () => true,
    };
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-3">
        <button
          onClick={addRow}
          className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          <Plus size={16} />
          Add Row
        </button>
        <button
          onClick={() => {
            loadRows();
            onRefresh?.();
          }}
          className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
        {loading && <span className="text-sm text-gray-500">Loading...</span>}
      </div>

      {/* AG Grid */}
      <div className="ag-theme-alpine flex-1" style={{ width: '100%' }}>
        <AgGridReact
          ref={gridRef}
          rowData={rowData}
          columnDefs={columnDefs}
          defaultColDef={{
            sortable: true,
            filter: true,
            resizable: true,
            editable: false,
          }}
          onGridReady={onGridReady}
          onCellValueChanged={onCellValueChanged}
          rowSelection="multiple"
          animateRows={true}
          rowClassRules={rowClassRules}
          suppressCellFocus={false}
          enableCellTextSelection={true}
          ensureDomOrder={true}
          getRowId={(params) => params.data.id}
          theme="legacy"
          modules={[AllCommunityModule]}
        />
      </div>
    </div>
  );
}

/**
 * Example API Integration Component
 * Demonstrates how to use the Glaze API with React hooks
 */

'use client';

import { useState } from 'react';
import {
  useTables,
  useCreateTable,
  useUpdateTable,
  useDeleteTable,
  useRows,
  useCreateRow,
  useUpdateRow,
  useDeleteRow,
} from '@/hooks/use-api';
import { Loader2, Plus, Trash2, Edit2 } from 'lucide-react';

export function ApiIntegrationExample() {
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  
  // Fetch all tables
  const { data: tables, loading: tablesLoading, error: tablesError, refetch: refetchTables } = useTables();
  
  // Fetch rows for selected table
  const { data: rowsData, loading: rowsLoading, refetch: refetchRows } = useRows(
    selectedTableId,
    { page: 1, limit: 10 }
  );
  
  // Mutations
  const { mutate: createTable, loading: creatingTable } = useCreateTable();
  const { mutate: updateTable, loading: updatingTable } = useUpdateTable();
  const { mutate: deleteTable, loading: deletingTable } = useDeleteTable();
  const { mutate: createRow, loading: creatingRow } = useCreateRow();
  const { mutate: updateRow, loading: updatingRow } = useUpdateRow();
  const { mutate: deleteRow, loading: deletingRow } = useDeleteRow();

  // Handle create table
  const handleCreateTable = async () => {
    try {
      await createTable({
        name: `New Table ${Date.now()}`,
        description: 'Created via API',
      });
      refetchTables();
    } catch (error) {
      console.error('Failed to create table:', error);
    }
  };

  // Handle update table
  const handleUpdateTable = async (id: string) => {
    try {
      await updateTable(id, {
        name: `Updated Table ${Date.now()}`,
      });
      refetchTables();
    } catch (error) {
      console.error('Failed to update table:', error);
    }
  };

  // Handle delete table
  const handleDeleteTable = async (id: string) => {
    if (!confirm('Are you sure you want to delete this table?')) return;
    
    try {
      await deleteTable(id);
      if (selectedTableId === id) {
        setSelectedTableId(null);
      }
      refetchTables();
    } catch (error) {
      console.error('Failed to delete table:', error);
    }
  };

  // Handle create row
  const handleCreateRow = async () => {
    if (!selectedTableId) return;
    
    try {
      await createRow(selectedTableId, {
        data: {
          name: `Row ${Date.now()}`,
          value: Math.random().toString(36).substring(7),
        },
      });
      refetchRows();
    } catch (error) {
      console.error('Failed to create row:', error);
    }
  };

  // Handle update row
  const handleUpdateRow = async (rowId: string) => {
    if (!selectedTableId) return;
    
    try {
      await updateRow(selectedTableId, rowId, {
        data: {
          updated: new Date().toISOString(),
        },
      });
      refetchRows();
    } catch (error) {
      console.error('Failed to update row:', error);
    }
  };

  // Handle delete row
  const handleDeleteRow = async (rowId: string) => {
    if (!selectedTableId) return;
    
    try {
      await deleteRow(selectedTableId, rowId);
      refetchRows();
    } catch (error) {
      console.error('Failed to delete row:', error);
    }
  };

  return (
    <div className="space-y-8 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">API Integration Example</h1>
        <button
          onClick={handleCreateTable}
          disabled={creatingTable}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg disabled:opacity-50"
        >
          {creatingTable ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
          Create Table
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Tables Section */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Tables</h2>
          
          {tablesLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          )}

          {tablesError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-600 text-sm">{tablesError.message}</p>
            </div>
          )}

          {tables && tables.length === 0 && (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <p className="text-gray-600">No tables yet. Create one to get started!</p>
            </div>
          )}

          <div className="space-y-2">
            {tables?.map((table) => (
              <div
                key={table.id}
                className={`p-4 rounded-lg border ${
                  selectedTableId === table.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 bg-white hover:bg-gray-50'
                } cursor-pointer transition-colors`}
                onClick={() => setSelectedTableId(table.id)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">{table.name}</h3>
                    {table.description && (
                      <p className="text-sm text-gray-600 mt-1">{table.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUpdateTable(table.id);
                      }}
                      disabled={updatingTable}
                      className="p-2 hover:bg-gray-200 rounded"
                    >
                      <Edit2 className="w-4 h-4 text-gray-600" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteTable(table.id);
                      }}
                      disabled={deletingTable}
                      className="p-2 hover:bg-red-100 rounded"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Rows Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              Rows {selectedTableId ? `(${rowsData?.meta?.total || 0})` : ''}
            </h2>
            {selectedTableId && (
              <button
                onClick={handleCreateRow}
                disabled={creatingRow}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-sm disabled:opacity-50"
              >
                {creatingRow ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                Add Row
              </button>
            )}
          </div>

          {!selectedTableId && (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <p className="text-gray-600">Select a table to view its rows</p>
            </div>
          )}

          {selectedTableId && rowsLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          )}

          {selectedTableId && rowsData && rowsData.data.length === 0 && (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <p className="text-gray-600">No rows yet. Add some data!</p>
            </div>
          )}

          <div className="space-y-2">
            {rowsData?.data.map((row) => (
              <div
                key={row.id}
                className="p-4 rounded-lg border border-gray-200 bg-white"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <pre className="text-xs bg-gray-50 p-2 rounded overflow-auto">
                      {JSON.stringify(row.data, null, 2)}
                    </pre>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => handleUpdateRow(row.id)}
                      disabled={updatingRow}
                      className="p-2 hover:bg-gray-200 rounded"
                    >
                      <Edit2 className="w-4 h-4 text-gray-600" />
                    </button>
                    <button
                      onClick={() => handleDeleteRow(row.id)}
                      disabled={deletingRow}
                      className="p-2 hover:bg-red-100 rounded"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {rowsData && rowsData.meta.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <span className="text-sm text-gray-600">
                Page {rowsData.meta.page} of {rowsData.meta.totalPages}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

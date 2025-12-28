/**
 * Client component for hybrid SSR + React Query approach
 */

'use client';

import { useTables, useCreateTable, useDeleteTable } from '@/hooks/use-query-api';
import Link from 'next/link';
import { Plus, Loader2, Trash2 } from 'lucide-react';

export function TablesClientComponent() {
  // Data is already prefetched on server, so no loading state initially!
  const { data: tables, isLoading, error } = useTables();
  const { mutate: createTable, isPending: isCreating } = useCreateTable();
  const { mutate: deleteTable, isPending: isDeleting } = useDeleteTable();

  const handleCreate = () => {
    createTable({
      name: `New Table ${Date.now()}`,
      description: 'Created from hybrid example',
    });
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Delete table "${name}"?`)) {
      deleteTable(id);
    }
  };

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <p className="text-red-600">Error: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tables (Hybrid SSR + React Query)</h1>
          <p className="text-gray-600 mt-1">
            Data prefetched on server, interactive on client with React Query
          </p>
        </div>
        <button
          onClick={handleCreate}
          disabled={isCreating}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-3 rounded-lg font-medium transition-colors"
        >
          {isCreating ? (
            <Loader2 size={20} className="animate-spin" />
          ) : (
            <Plus size={20} />
          )}
          Create Table
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : tables && tables.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-gray-600 mb-4">No tables yet. Create your first table!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tables?.map((table) => (
            <div
              key={table.id}
              className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-all group"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <Link href={`/dashboard/tables/${table.id}`}>
                    <h3 className="font-semibold text-lg text-gray-900 group-hover:text-blue-600 transition-colors">
                      {table.name}
                    </h3>
                  </Link>
                  {table.description && (
                    <p className="text-sm text-gray-500 mt-2">{table.description}</p>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(table.id, table.name)}
                  disabled={isDeleting}
                  className="p-2 hover:bg-red-100 rounded transition-colors"
                  title="Delete table"
                >
                  <Trash2 className="w-4 h-4 text-red-600" />
                </button>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200">
                <Link
                  href={`/dashboard/tables/${table.id}`}
                  className="text-xs font-medium text-blue-600 group-hover:text-blue-700"
                >
                  Open Table →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

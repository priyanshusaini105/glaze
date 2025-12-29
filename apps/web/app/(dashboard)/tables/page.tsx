'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, ArrowLeft, Loader2, Trash2, Search, Filter, ArrowUpDown } from 'lucide-react';
import { useTables, useDeleteTable } from '@/hooks/use-query-api';

export default function TablesPage() {
  const { data: tables, isLoading, error } = useTables();
  const deleteTable = useDeleteTable();
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const handleDeleteTable = async (tableId: string) => {
    try {
      await deleteTable.mutateAsync(tableId);
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Failed to delete table:', error);
    }
  };

  const filteredTables = tables?.filter(table => 
    table.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    table.description?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <div className="space-y-8 p-2">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="p-2.5 hover:bg-gray-100 rounded-xl transition-all duration-200 hover:shadow-sm active:scale-95"
          >
            <ArrowLeft size={20} className="text-gray-600" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">All Tables</h1>
            <p className="text-gray-600 mt-1.5 text-sm">Manage and view all your data tables.</p>
          </div>
        </div>
        <Link
          href="/tables/new"
          className="group flex items-center gap-2.5 bg-linear-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl active:scale-95"
        >
          <Plus size={20} className="group-hover:rotate-90 transition-transform duration-200" />
          Create Table
        </Link>
      </div>

      {/* Search and Controls */}
      {!isLoading && !error && tables && tables.length > 0 && (
        <div className="glass-card rounded-xl p-4 border border-gray-200/60">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex-1 min-w-50 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search tables..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
              />
            </div>
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors font-medium text-sm">
              <Filter size={18} />
              Filter
            </button>
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors font-medium text-sm">
              <ArrowUpDown size={18} />
              Sort
            </button>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 font-medium">Auto-run</span>
              <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-blue-600 transition-colors hover:bg-blue-700">
                <span className="inline-block h-4 w-4 translate-x-6 transform rounded-full bg-white transition-transform" />
              </button>
            </div>
            <div className="text-sm text-gray-600 font-medium">
              {filteredTables.length}/{tables.length} tables
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <div className="relative">
            <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
            <div className="absolute inset-0 blur-xl bg-blue-500/30 animate-pulse" />
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="glass-card border-red-200 rounded-xl p-8 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mb-4">
            <span className="text-red-600 text-xl font-bold">!</span>
          </div>
          <p className="text-red-600 font-semibold text-lg">Failed to load tables</p>
          <p className="text-red-500 text-sm mt-2">{error.message}</p>
        </div>
      )}

      {/* Tables Grid */}
      {!isLoading && !error && tables && (
        <>
          {tables.length === 0 ? (
            <div className="text-center py-16 glass-card rounded-xl border border-gray-200/80">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-linear-to-br from-blue-100 to-purple-100 mb-4">
                <Plus size={32} className="text-blue-600" />
              </div>
              <p className="text-gray-600 mb-6 text-lg font-medium">No tables yet. Create your first table to get started!</p>
              <Link
                href="/tables/new"
                className="inline-flex items-center gap-2.5 bg-linear-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl active:scale-95"
              >
                <Plus size={20} />
                Create Table
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTables.map((table) => (
                <div
                  key={table.id}
                  className="glass-card rounded-xl p-6 hover:shadow-2xl hover:border-blue-300 transition-all duration-300 group transform hover:-translate-y-1 relative"
                >
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      setDeleteConfirm(table.id);
                    }}
                    className="absolute top-4 right-4 p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-red-50 text-red-500 hover:text-red-600 z-10"
                    aria-label="Delete table"
                  >
                    <Trash2 size={16} />
                  </button>
                  
                  <Link href={`/tables/${table.id}`} className="block">
                    <div className="flex items-start justify-between mb-3 pr-8">
                      <h3 className="font-semibold text-lg text-gray-900 group-hover:text-blue-600 transition-colors">
                        {table.name}
                      </h3>
                      <div className="w-8 h-8 rounded-lg bg-linear-to-br from-blue-100 to-purple-100 flex items-center justify-center group-hover:from-blue-200 group-hover:to-purple-200 transition-colors shrink-0">
                        <span className="text-blue-600 text-xs font-bold">T</span>
                      </div>
                    </div>
                    {table.description && (
                      <p className="text-sm text-gray-500 mb-4 line-clamp-2">{table.description}</p>
                    )}
                    <div className="mt-auto pt-4 border-t border-gray-200/60 flex items-center justify-between">
                      <span className="text-xs font-semibold text-blue-600 group-hover:text-blue-700 flex items-center gap-1">
                        Open Table
                        <span className="group-hover:translate-x-1 transition-transform">→</span>
                      </span>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="glass-card rounded-2xl p-6 max-w-md w-full border border-gray-200/60 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 className="text-red-600" size={24} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Delete Table</h3>
                <p className="text-sm text-gray-500">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-gray-700 mb-6">
              Are you sure you want to delete this table? All data will be permanently removed.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                disabled={deleteTable.isPending}
                className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors font-medium text-gray-700 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteTable(deleteConfirm)}
                disabled={deleteTable.isPending}
                className="flex-1 px-4 py-2.5 rounded-lg bg-linear-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deleteTable.isPending ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

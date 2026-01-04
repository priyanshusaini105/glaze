'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, Loader2, Trash2, Search, MoreVertical, FileSpreadsheet, Database, Webhook, Table as TableIcon, ChevronDown } from 'lucide-react';
import { useTables, useDeleteTable } from '@/hooks/use-query-api';
import { CreateTableModal } from '@/components/tables/create-table-modal';

export default function TablesPage() {
  const { data: tables, isLoading, error } = useTables();
  const deleteTable = useDeleteTable();
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

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

  const quickActions = [
    { icon: '🔶', label: 'HubSpot', color: 'from-orange-400 to-red-400' },
    { icon: '☁️', label: 'Salesforce', color: 'from-blue-400 to-cyan-400' },
    { icon: <FileSpreadsheet className="w-5 h-5" />, label: 'CSV', color: 'from-green-400 to-emerald-400' },
    { icon: <Webhook className="w-4 h-4" />, label: 'Webhooks', color: 'from-purple-400 to-pink-400' },
    { icon: <Database className="w-5 h-5" />, label: 'Scratch', color: 'from-slate-400 to-slate-600' },
  ];

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
            <TableIcon className="w-6 h-6" />
            Tables
          </h1>
        </div>

        {/* Quick Actions - New table from... */}
        <div className="bg-gradient-to-br from-purple-50 via-blue-50 to-cyan-50 rounded-2xl p-6 border border-purple-100">
          <h2 className="text-base font-semibold text-gray-700 mb-4">New table from...</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {quickActions.map((action, idx) => (
              <button
                key={idx}
                onClick={() => setIsCreateModalOpen(true)}
                className="bg-white rounded-xl p-4 hover:shadow-md transition-all duration-200 border border-gray-200 hover:border-gray-300 group"
              >
                <div className={`w-12 h-12 mx-auto mb-2 rounded-lg bg-gradient-to-br ${action.color} flex items-center justify-center text-white group-hover:scale-110 transition-transform`}>
                  {typeof action.icon === 'string' ? (
                    <span className="text-2xl">{action.icon}</span>
                  ) : (
                    action.icon
                  )}
                </div>
                <p className="text-sm font-medium text-gray-700 text-center">{action.label}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Search and New Table Button */}
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all bg-white"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors bg-white">
            <span className="text-sm font-medium text-gray-700">Active</span>
            <ChevronDown size={16} className="text-gray-500" />
          </button>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-lg font-medium transition-all shadow-sm hover:shadow-md"
          >
            <Plus size={18} />
            New table
          </button>
        </div>

        {/* Tables List */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Table Header */}
          <div className="hidden md:grid md:grid-cols-12 gap-4 px-6 py-3 bg-gray-50 border-b border-gray-200 text-sm font-medium text-gray-600">
            <div className="col-span-6 flex items-center gap-2">
              <input type="checkbox" className="rounded border-gray-300" />
              <span>Name</span>
            </div>
            <div className="col-span-3">Owner</div>
            <div className="col-span-3 flex items-center gap-1">
              Last modified
              <ChevronDown size={14} />
            </div>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="p-8 text-center">
              <p className="text-red-600 font-semibold">Failed to load tables</p>
              <p className="text-red-500 text-sm mt-2">{error.message}</p>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !error && tables && tables.length === 0 && (
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                <TableIcon size={32} className="text-gray-400" />
              </div>
              <p className="text-gray-600 mb-6 text-lg font-medium">No tables yet</p>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-semibold transition-all"
              >
                <Plus size={20} />
                Create Table
              </button>
            </div>
          )}

          {/* Table Rows */}
          {!isLoading && !error && filteredTables.length > 0 && (
            <div className="divide-y divide-gray-200">
              {filteredTables.map((table) => (
                <div
                  key={table.id}
                  className="p-4 md:p-6 hover:bg-gray-50 transition-colors group"
                >
                  {/* Mobile Layout */}
                  <div className="md:hidden space-y-3">
                    <div className="flex items-center gap-3">
                      <input type="checkbox" className="rounded border-gray-300" />
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center shrink-0">
                        <TableIcon size={16} className="text-green-700" />
                      </div>
                      <Link
                        href={`/tables/${table.id}`}
                        className="font-medium text-gray-900 hover:text-blue-600 transition-colors flex-1"
                      >
                        {table.name}
                      </Link>
                      <button
                        onClick={() => setDeleteConfirm(table.id)}
                        className="p-2 hover:bg-gray-200 rounded-lg transition-all"
                      >
                        <MoreVertical size={16} className="text-gray-500" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-xs font-semibold text-gray-600">
                          P
                        </div>
                        <span>Priyanshu</span>
                      </div>
                      <span>
                        {table.createdAt && new Date(table.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Desktop Layout */}
                  <div className="hidden md:grid md:grid-cols-12 gap-4">
                    <div className="col-span-6 flex items-center gap-3">
                      <input type="checkbox" className="rounded border-gray-300" />
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center shrink-0">
                        <TableIcon size={16} className="text-green-700" />
                      </div>
                      <Link
                        href={`/tables/${table.id}`}
                        className="font-medium text-gray-900 hover:text-blue-600 transition-colors"
                      >
                        {table.name}
                      </Link>
                    </div>
                    <div className="col-span-3 flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-xs font-semibold text-gray-600">
                        P
                      </div>
                      <span className="text-sm text-gray-600">Priyanshu</span>
                    </div>
                    <div className="col-span-3 flex items-center justify-between">
                      <span className="text-sm text-gray-600">
                        {table.createdAt ? new Date(table.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        }) : '-'}
                      </span>
                      <button
                        onClick={() => setDeleteConfirm(table.id)}
                        className="opacity-0 group-hover:opacity-100 p-2 hover:bg-gray-200 rounded-lg transition-all"
                      >
                        <MoreVertical size={16} className="text-gray-500" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Table Modal */}
      <CreateTableModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
      />

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

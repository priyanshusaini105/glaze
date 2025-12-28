'use client';

import Link from 'next/link';
import { Plus, ArrowLeft, Loader2 } from 'lucide-react';
import { useTables } from '@/hooks/use-query-api';

export default function TablesPage() {
  const { data: tables, isLoading, error } = useTables();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} className="text-gray-600" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">All Tables</h1>
            <p className="text-gray-600 mt-1">Manage and view all your data tables.</p>
          </div>
        </div>
        <Link
          href="/dashboard/tables/new"
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
        >
          <Plus size={20} />
          Create Table
        </Link>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-600 font-medium">Failed to load tables</p>
          <p className="text-red-500 text-sm mt-1">{error.message}</p>
        </div>
      )}

      {/* Tables Grid */}
      {!isLoading && !error && tables && (
        <>
          {tables.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-gray-600 mb-4">No tables yet. Create your first table to get started!</p>
              <Link
                href="/dashboard/tables/new"
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                <Plus size={20} />
                Create Table
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tables.map((table) => (
                <Link
                  key={table.id}
                  href={`/dashboard/tables/${table.id}`}
                  className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg hover:border-blue-300 transition-all group cursor-pointer"
                >
                  <h3 className="font-semibold text-lg text-gray-900 group-hover:text-blue-600 transition-colors">
                    {table.name}
                  </h3>
                  {table.description && (
                    <p className="text-sm text-gray-500 mt-2">{table.description}</p>
                  )}
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <span className="text-xs font-medium text-blue-600 group-hover:text-blue-700">
                      Open Table →
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

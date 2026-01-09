'use client';

import Link from 'next/link';
import { ArrowLeft, Loader2, FileText } from 'lucide-react';
import { useCreateTable } from '@/hooks/use-query-api';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CSVImport } from '@/components/tables/csv-import';
import { getAccessToken } from '@/lib/supabase-auth';

export default function NewTablePage() {
  const router = useRouter();
  const { mutate: createTable, isPending, error } = useCreateTable();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });
  const [showCSVImport, setShowCSVImport] = useState(false);
  const [csvImporting, setCSVImporting] = useState(false);
  const [csvError, setCSVError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      return;
    }

    createTable(
      {
        name: formData.name,
        description: formData.description || undefined,
      },
      {
        onSuccess: (table) => {
          router.push(`/tables/${table.id}`);
        },
      }
    );
  };

  const handleCSVImport = async (data: { headers: string[]; rows: Record<string, unknown>[] }) => {
    setCSVImporting(true);
    setCSVError(null);

    try {
      // Generate CSV content from parsed data
      const csvLines = [
        data.headers.join(','),
        ...data.rows.map(row => 
          data.headers.map(h => {
            const val = row[h];
            // Escape values with commas or quotes
            if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) {
              return `"${val.replace(/"/g, '""')}"`;
            }
            return val;
          }).join(',')
        )
      ];
      const csvContent = csvLines.join('\n');

      // Get auth token for the request
      const token = await getAccessToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Call the import API
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/tables/import-csv`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: formData.name || 'Imported Table',
          description: formData.description || `Imported from CSV with ${data.rows.length} rows`,
          csvContent
        })
      });

      if (response.ok) {
        const table = await response.json();
        router.push(`/tables/${table.id}`);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to import CSV');
      }
    } catch (err) {
      console.error('CSV import error:', err);
      setCSVError(err instanceof Error ? err.message : 'Failed to import CSV');
    } finally {
      setCSVImporting(false);
    }
  };
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/tables"
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft size={20} className="text-gray-600" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Create New Table</h1>
          <p className="text-gray-600 mt-1">Set up a new data table with your custom schema or import from CSV.</p>
        </div>
      </div>

      {/* Toggle between manual and CSV import */}
      <div className="max-w-2xl">
        <div className="flex gap-2 p-1 bg-gray-100 rounded-lg mb-6">
          <button
            onClick={() => setShowCSVImport(false)}
            className={`flex-1 px-4 py-2 rounded-md font-medium transition-colors ${
              !showCSVImport
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Create Manually
          </button>
          <button
            onClick={() => setShowCSVImport(true)}
            className={`flex-1 px-4 py-2 rounded-md font-medium transition-colors flex items-center justify-center gap-2 ${
              showCSVImport
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <FileText size={18} />
            Import from CSV
          </button>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-8">
          {showCSVImport ? (
            <>
              {csvError && (
                <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-600 text-sm">{csvError}</p>
                </div>
              )}
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Table Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Sales Pipeline, Customer Database"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description (optional)
                  </label>
                  <textarea
                    placeholder="Describe the purpose of this table..."
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Upload CSV File
                  </label>
                  {csvImporting ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                      <span className="ml-3 text-gray-600">Importing CSV...</span>
                    </div>
                  ) : (
                    <CSVImport
                      onImport={handleCSVImport}
                      onCancel={() => setShowCSVImport(false)}
                      isLoading={csvImporting}
                    />
                  )}
                </div>
              </div>
            </>
          ) : (
            <>
              {error && (
                <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-600 text-sm">{error.message}</p>
                </div>
              )}
              
              <form className="space-y-6" onSubmit={handleSubmit}>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Table Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Sales Pipeline, Customer Database"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    placeholder="Describe the purpose of this table..."
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                <div className="pt-6 flex gap-4 border-t border-gray-200">
                  <button
                    type="submit"
                    disabled={isPending || !formData.name.trim()}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                    {isPending ? 'Creating...' : 'Create Table'}
                  </button>
                  <Link
                    href="/tables"
                    className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </Link>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

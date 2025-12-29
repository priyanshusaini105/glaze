'use client';

import { useState } from 'react';
import { X, Database, Copy, Sparkles, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCreateTable } from '@/hooks/use-query-api';
import { CSVImport } from './csv-import';

interface CreateTableModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type CreateOption = 
  | 'start-from-scratch' 
  | 'import-from-csv' 
  | 'start-from-example'
  | null;

export function CreateTableModal({ isOpen, onClose }: CreateTableModalProps) {
  const router = useRouter();
  const { mutate: createTable, isPending } = useCreateTable();
  const [selectedOption, setSelectedOption] = useState<CreateOption>(null);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [csvError, setCSVError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCreateFromScratch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) return;

    createTable(
      {
        name: formData.name,
        description: formData.description || undefined,
      },
      {
        onSuccess: (table) => {
          router.push(`/tables/${table.id}`);
          onClose();
        },
      }
    );
  };

  const handleCreateFromModel = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) return;

    createTable(
      {
        name: formData.name,
        description: formData.description || undefined,
      },
      {
        onSuccess: (table) => {
          // TODO: redirect to CSV import flow
          router.push(`/tables/${table.id}`);
          onClose();
        },
      }
    );
  };

  const handleCreateFromExample = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) return;

    createTable(
      {
        name: formData.name,
        description: formData.description || undefined,
      },
      {
        onSuccess: (table) => {
          // TODO: redirect to example selection
          router.push(`/tables/${table.id}`);
          onClose();
        },
      }
    );
  };

  const handleCSVImport = async (data: { headers: string[]; rows: Record<string, unknown>[] }) => {
    setCSVError(null);

    try {
      const csvLines = [
        data.headers.join(','),
        ...data.rows.map(row => 
          data.headers.map(h => {
            const val = row[h];
            if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) {
              return `"${val.replace(/"/g, '""')}"`;
            }
            return val;
          }).join(',')
        )
      ];
      const csvContent = csvLines.join('\n');

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/tables/import-csv`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name || 'Imported Table',
          description: formData.description || `Imported from CSV with ${data.rows.length} rows`,
          csvContent
        }),
      });

      if (response.ok) {
        const table = await response.json();
        router.push(`/tables/${table.id}`);
        onClose();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to import CSV');
      }
    } catch (err) {
      console.error('CSV import error:', err);
      setCSVError(err instanceof Error ? err.message : 'Failed to import CSV');
    }
  };

  const mainCreateOptions = [
    {
      id: 'start-from-scratch' as const,
      icon: <Database className="w-6 h-6" />,
      title: 'Start from scratch',
      description: 'Create a blank table you can customize and build however you like',
      color: 'from-slate-500 to-slate-700',
    },
    {
      id: 'import-from-csv' as const,
      icon: <Copy className="w-6 h-6" />,
      title: 'Import from CSV',
      description: 'Upload a CSV file to quickly populate your table with data',
      color: 'from-green-500 to-emerald-500',
    },
    {
      id: 'start-from-example' as const,
      icon: <Sparkles className="w-6 h-6" />,
      title: 'Start from example',
      description: 'Use real-world examples and sample data to learn and build',
      color: 'from-purple-500 to-pink-500',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            {selectedOption && (
              <button
                onClick={() => {
                  setSelectedOption(null);
                  setFormData({ name: '', description: '' });
                  setCSVError(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft size={20} className="text-gray-600" />
              </button>
            )}
            <h2 className="text-xl font-semibold text-gray-900">
              {!selectedOption
                ? 'Create new table'
                : selectedOption === 'start-from-scratch'
                ? 'Start from scratch'
                : selectedOption === 'import-from-csv'
                ? 'Import from CSV'
                : 'Start from example'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(85vh-80px)]">
          {!selectedOption ? (
            <div className="space-y-3">
              {mainCreateOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => {
                    setSelectedOption(option.id);
                    setFormData({ name: '', description: '' });
                  }}
                  className="w-full flex items-start gap-4 p-4 rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all text-left group"
                >
                  <div className={`w-12 h-12 rounded-lg bg-linear-to-br ${option.color} flex items-center justify-center text-white shrink-0 group-hover:scale-110 transition-transform`}>
                    {option.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 group-hover:text-gray-700 mb-1">
                      {option.title}
                    </h3>
                    <p className="text-sm text-gray-600">{option.description}</p>
                  </div>
                </button>
              ))}
            </div>
          ) : selectedOption === 'start-from-scratch' ? (
            <form onSubmit={handleCreateFromScratch} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Table Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="My Table"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description (optional)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe what this table is for..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all resize-none"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedOption(null);
                    setFormData({ name: '', description: '' });
                  }}
                  className="flex-1 px-4 py-3 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors font-medium"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isPending || !formData.name.trim()}
                  className="flex-1 px-4 py-3 rounded-lg bg-linear-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPending ? 'Creating...' : 'Create Table'}
                </button>
              </div>
            </form>
          ) : selectedOption === 'import-from-csv' ? (
            <form onSubmit={handleCreateFromModel} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Table Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="My Table"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description (optional)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe what this table is for..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all resize-none"
                />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700 mb-3">Select CSV file to import:</p>
                <CSVImport onImport={handleCSVImport} />
                {csvError && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg mt-3">
                    <p className="text-sm text-red-600">{csvError}</p>
                  </div>
                )}
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedOption(null);
                    setFormData({ name: '', description: '' });
                    setCSVError(null);
                  }}
                  className="flex-1 px-4 py-3 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors font-medium"
                >
                  Back
                </button>
              </div>
            </form>
          ) : selectedOption === 'start-from-example' ? (
            <form onSubmit={handleCreateFromExample} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Table Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="My Table"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description (optional)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe what this table is for..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all resize-none"
                />
              </div>
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <p className="text-sm text-purple-700">
                  Example selection interface will be available after table creation.
                </p>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedOption(null);
                    setFormData({ name: '', description: '' });
                  }}
                  className="flex-1 px-4 py-3 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors font-medium"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isPending || !formData.name.trim()}
                  className="flex-1 px-4 py-3 rounded-lg bg-linear-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPending ? 'Creating...' : 'Create Table'}
                </button>
              </div>
            </form>
          ) : null}
        </div>
      </div>
    </div>
  );
}

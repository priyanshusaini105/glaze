'use client';

import { useState } from 'react';
import { X, FileSpreadsheet, Database, Webhook, Building2, Search as SearchIcon, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCreateTable } from '@/hooks/use-query-api';
import { CSVImport } from './csv-import';
import { apiClient } from '@/lib/api-client';

interface CreateTableModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type CreateOption = 
  | 'salesforce' 
  | 'hubspot' 
  | 'webhooks' 
  | 'scratch' 
  | 'csv' 
  | 'lookalikes' 
  | 'local-business'
  | null;

export function CreateTableModal({ isOpen, onClose }: CreateTableModalProps) {
  const router = useRouter();
  const { mutate: createTable, isPending } = useCreateTable();
  const [selectedOption, setSelectedOption] = useState<CreateOption>(null);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [csvImporting, setCSVImporting] = useState(false);
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

  const handleCSVImport = async (data: { headers: string[]; rows: Record<string, unknown>[] }) => {
    setCSVImporting(true);
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

      const response = await apiClient.post('/tables/import-csv', {
        name: formData.name || 'Imported Table',
        description: formData.description || `Imported from CSV with ${data.rows.length} rows`,
        csvContent
      });

      if (response.ok) {
        const table = await response.json();
        router.push(`/tables/${table.id}`);
        onClose();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to import CSV');
      }
    } catch (err: any) {
      console.error('CSV import error:', err);
      setCSVError(err.message || 'Failed to import CSV');
    } finally {
      setCSVImporting(false);
    }
  };

  const createOptions = [
    {
      id: 'salesforce' as const,
      icon: '☁️',
      title: 'Import from Salesforce',
      description: 'Import objects from Salesforce - one-time or with automatic syncing',
      badges: ['BETA', 'NEW'],
      color: 'from-blue-500 to-cyan-500',
    },
    {
      id: 'hubspot' as const,
      icon: '🔶',
      title: 'Import from HubSpot',
      description: 'Import objects from HubSpot - one-time or with automatic syncing',
      color: 'from-orange-500 to-red-500',
    },
    {
      id: 'webhooks' as const,
      icon: <Webhook className="w-5 h-5" />,
      title: 'Inbound webhooks',
      description: 'Receive data from external sources',
      color: 'from-purple-500 to-pink-500',
    },
    {
      id: 'scratch' as const,
      icon: <Database className="w-5 h-5" />,
      title: 'Start from scratch',
      description: 'Create a blank table you can customize and build however you like',
      color: 'from-slate-500 to-slate-700',
    },
    {
      id: 'csv' as const,
      icon: <FileSpreadsheet className="w-5 h-5" />,
      title: 'Upload a CSV file',
      description: 'Bring in your data from a spreadsheet',
      color: 'from-green-500 to-emerald-500',
    },
    {
      id: 'lookalikes' as const,
      icon: <Sparkles className="w-5 h-5" />,
      title: 'Find company lookalikes',
      description: 'Build a lead list by finding companies similar to ones you already work with',
      color: 'from-violet-500 to-purple-500',
    },
    {
      id: 'local-business' as const,
      icon: <SearchIcon className="w-5 h-5" />,
      title: 'Search local businesses',
      description: 'Use Google Maps to find and add businesses based on location and category',
      color: 'from-yellow-500 to-orange-500',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {selectedOption === 'scratch' ? 'Create from scratch' : 
             selectedOption === 'csv' ? 'Upload CSV file' : 
             'Create new table'}
          </h2>
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
              {createOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => setSelectedOption(option.id)}
                  className="w-full flex items-start gap-4 p-4 rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all text-left group"
                >
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${option.color} flex items-center justify-center text-white shrink-0 group-hover:scale-110 transition-transform`}>
                    {typeof option.icon === 'string' ? (
                      <span className="text-xl">{option.icon}</span>
                    ) : (
                      option.icon
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900 group-hover:text-gray-700">
                        {option.title}
                      </h3>
                      {option.badges && (
                        <div className="flex gap-1">
                          {option.badges.map((badge) => (
                            <span
                              key={badge}
                              className="px-2 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-700 rounded uppercase"
                            >
                              {badge}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{option.description}</p>
                  </div>
                </button>
              ))}
            </div>
          ) : selectedOption === 'scratch' ? (
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
                  onClick={() => setSelectedOption(null)}
                  className="flex-1 px-4 py-3 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors font-medium"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isPending || !formData.name.trim()}
                  className="flex-1 px-4 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPending ? 'Creating...' : 'Create Table'}
                </button>
              </div>
            </form>
          ) : selectedOption === 'csv' ? (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Table Name (optional)
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Imported Table"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                />
              </div>
              <CSVImport onImport={handleCSVImport} isImporting={csvImporting} />
              {csvError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{csvError}</p>
                </div>
              )}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setSelectedOption(null)}
                  disabled={csvImporting}
                  className="flex-1 px-4 py-3 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
                >
                  Back
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                <Building2 className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Coming Soon</h3>
              <p className="text-gray-600 mb-6">
                This feature is currently under development and will be available soon.
              </p>
              <button
                onClick={() => setSelectedOption(null)}
                className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors font-medium"
              >
                Go Back
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

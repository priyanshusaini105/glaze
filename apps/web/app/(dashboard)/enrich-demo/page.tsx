/**
 * Enrichment Demo Page
 * Showcases the enrichment functionality with interactive table
 */

'use client';

import { InteractiveTable } from '@/components/tables/interactive-table';

export default function EnrichmentDemoPage() {
  const sampleColumns = [
    { id: 'col-1', name: 'Full Name', type: 'text' as const },
    { id: 'col-2', name: 'Job Title', type: 'text' as const },
    { id: 'col-3', name: 'Company', type: 'text' as const },
    { id: 'col-4', name: 'Website', type: 'url' as const },
    { id: 'col-5', name: 'LinkedIn', type: 'url' as const },
  ];

  const sampleRows = [
    {
      id: 'row-1',
      'col-1': 'John Smith',
      'col-2': 'CEO',
      'col-3': 'Acme Corp',
      'col-4': 'https://acme.com',
      'col-5': '',
    },
    {
      id: 'row-2',
      'col-1': 'Sarah Johnson',
      'col-2': 'CTO',
      'col-3': 'TechStart Inc',
      'col-4': 'https://techstart.io',
      'col-5': '',
    },
    {
      id: 'row-3',
      'col-1': 'Michael Chen',
      'col-2': 'VP of Sales',
      'col-3': 'Global Solutions',
      'col-4': 'https://global-solutions.com',
      'col-5': '',
    },
    {
      id: 'row-4',
      'col-1': '',
      'col-2': '',
      'col-3': 'InnovateCo',
      'col-4': 'https://innovateco.ai',
      'col-5': '',
    },
  ];

  return (
    <div className="h-screen flex flex-col p-6 bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Enrichment Demo</h1>
        <p className="text-slate-600">
          Select cells, columns, or rows and click "Enrich Data" to simulate enrichment with realistic delays
        </p>
        <div className="mt-3 flex gap-3 text-sm text-slate-600">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
            <span>Select cells by clicking and dragging</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span>Click checkbox to select rows</span>
          </div>
        </div>
      </div>
      
      <div className="flex-1 min-h-0">
        <InteractiveTable
          initialColumns={sampleColumns}
          initialRows={sampleRows}
          title="Sales Contacts - Enrichment Demo"
        />
      </div>
    </div>
  );
}

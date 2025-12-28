'use client';

import { Search } from 'lucide-react';
import { InteractiveTable } from '../../../../components/tables/interactive-table';
import { TableSidebar } from '../../../../components/tables/table-sidebar';
import { SidebarTrigger } from '../../../../components/ui/sidebar';

const tables = [
  { id: '1', name: 'New table', active: true },
  { id: '2', name: 'Outreach list', active: false },
  { id: '3', name: 'Event attendees', active: false },
];

const initialColumns = [
  { id: 'col-1', name: 'Full name', type: 'text' as const },
  { id: 'col-2', name: 'Job title', type: 'text' as const },
  { id: 'col-3', name: 'Company name', type: 'text' as const },
  { id: 'col-4', name: 'Company website', type: 'url' as const },
  { id: 'col-5', name: 'Education and Biography', type: 'text' as const },
];

const initialRows = [
  {
    id: 'row-1',
    'col-1': 'Priyanshu Saini',
    'col-2': 'Fullstack developer',
    'col-3': 'Rutics',
    'col-4': 'https://rutics.com/',
    'col-5': 'No result',
  },
];

export default function GlazeTablePage() {
  return (
    <>
      <TableSidebar tables={tables} currentTableId="1" />
      <div className="flex-1 flex flex-col overflow-hidden p-3 md:p-4">
        <div className="bg-white rounded-xl border border-gray-200 shadow-[0_25px_50px_-12px_rgba(229,231,235,0.5)] flex flex-col h-full">
          <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-3">
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <SidebarTrigger className="md:hidden" />
              <span className="text-gray-600">Tables</span>
              <span className="text-gray-300">/</span>
              <span className="font-semibold text-gray-900">New table</span>
            </div>
            <div className="relative hidden md:block w-72">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                className="w-full rounded-lg border border-gray-200 bg-gray-50 pl-8 pr-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/10"
                placeholder="Search rows or values..."
              />
            </div>
          </div>

          <div className="flex-1 min-h-0 p-3 md:p-4 bg-gray-50">
            <InteractiveTable title="New table" initialColumns={initialColumns} initialRows={initialRows} />
          </div>
        </div>
      </div>
    </>
  );
}

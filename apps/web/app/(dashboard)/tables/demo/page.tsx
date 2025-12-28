'use client';

import { InteractiveTable } from '@/components/tables/interactive-table';

export default function TableDemoPage() {
  return (
    <div className="h-screen w-full bg-gray-100 p-4">
      <div className="h-full max-w-7xl mx-auto">
        <InteractiveTable
          title="Interactive Data Table"
          initialColumns={[
            { id: 'col-1', name: 'Full name', type: 'text' },
            { id: 'col-2', name: 'Job title', type: 'text' },
            { id: 'col-3', name: 'Company name', type: 'text' },
            { id: 'col-4', name: 'Email', type: 'email' },
          ]}
          initialRows={[
            {
              id: 'row-1',
              'col-1': 'Priyanshu Saini',
              'col-2': 'Fullstack developer',
              'col-3': 'Rutics',
              'col-4': 'priyanshu@rutics.com',
            },
            {
              id: 'row-2',
              'col-1': 'John Doe',
              'col-2': 'Product Manager',
              'col-3': 'Tech Corp',
              'col-4': 'john@techcorp.com',
            },
            {
              id: 'row-3',
              'col-1': 'Jane Smith',
              'col-2': 'Designer',
              'col-3': 'Design Studio',
              'col-4': 'jane@designstudio.com',
            },
          ]}
        />
      </div>
    </div>
  );
}

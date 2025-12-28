/**
 * Example: Server Component with SSR
 * Demonstrates data fetching in Next.js Server Components
 */

import { serverApi } from '@/lib/server-api';
import { TableCard } from '@/components/tables/table-card';
import Link from 'next/link';
import { Plus } from 'lucide-react';

export default async function TablesServerPage() {
  // Fetch data on server - no loading state needed!
  const tables = await serverApi.getTables();

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">All Tables (SSR)</h1>
          <p className="text-gray-600 mt-1">Server-side rendered with Next.js</p>
        </div>
        <Link
          href="/dashboard/tables/new"
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
        >
          <Plus size={20} />
          Create Table
        </Link>
      </div>

      {tables.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-gray-600 mb-4">No tables yet. Create your first table!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tables.map((table) => (
            <TableCard key={table.id} table={table} />
          ))}
        </div>
      )}
    </div>
  );
}

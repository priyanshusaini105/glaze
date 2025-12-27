import Link from 'next/link';
import { Plus, ArrowLeft } from 'lucide-react';

export default function TablesPage() {
  const tables = [
    { id: 1, name: 'Sales Pipeline', rows: 245, columns: 18 },
    { id: 2, name: 'Customer Database', rows: 1230, columns: 24 },
    { id: 3, name: 'Lead Scoring', rows: 89, columns: 12 },
    { id: 4, name: 'Product Inventory', rows: 456, columns: 15 },
    { id: 5, name: 'Support Tickets', rows: 234, columns: 20 },
  ];

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

      {/* Tables Grid */}
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
            <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
              <span>{table.rows} rows</span>
              <span>{table.columns} columns</span>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200">
              <span className="text-xs font-medium text-blue-600 group-hover:text-blue-700">
                Open Table →
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

/* eslint-disable react/no-unescaped-entities */
import Link from 'next/link';
import { Plus, Grid3X3, Clock, TrendingUp } from 'lucide-react';

export default function DashboardPage() {
  const recentTables = [
    { id: 1, name: 'Sales Pipeline', rows: 245, updated: '2 hours ago' },
    { id: 2, name: 'Customer Database', rows: 1230, updated: '1 day ago' },
    { id: 3, name: 'Lead Scoring', rows: 89, updated: '3 days ago' },
  ];

  const stats = [
    { label: 'Total Tables', value: '12', icon: Grid3X3 },
    { label: 'Total Rows', value: '2.4K', icon: TrendingUp },
    { label: 'Last Updated', value: '2h ago', icon: Clock },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome back! Here's your data overview.</p>
        </div>
        <Link
          href="/dashboard/tables/new"
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
        >
          <Plus size={20} />
          New Table
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">{label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{value}</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <Icon className="text-blue-600" size={24} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Tables */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Recent Tables</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {recentTables.map((table) => (
            <Link
              key={table.id}
              href={`/dashboard/tables/${table.id}`}
              className="p-6 hover:bg-gray-50 transition-colors block group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                    {table.name}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {table.rows} rows • Updated {table.updated}
                  </p>
                </div>
                <div className="text-right">
                  <span className="inline-block bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-medium">
                    View
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

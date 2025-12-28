import Link from 'next/link';

interface TableCardProps {
  table: {
    id: string;
    name: string;
    description?: string;
  };
}

export function TableCard({ table }: TableCardProps) {
  return (
    <Link
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
  );
}

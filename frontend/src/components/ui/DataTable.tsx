import { ReactNode } from 'react';

interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => ReactNode;
  className?: string;
  headerClassName?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (item: T) => void;
  selectable?: boolean;
  selectedRows?: Set<string>;
  onSelectRow?: (id: string) => void;
  onSelectAll?: (selected: boolean) => void;
  emptyMessage?: string;
  isLoading?: boolean;
  keyExtractor: (item: T) => string;
}

export function DataTable<T>({
  columns,
  data,
  onRowClick,
  selectable = false,
  selectedRows = new Set(),
  onSelectRow,
  onSelectAll,
  emptyMessage = 'No data available',
  isLoading = false,
  keyExtractor,
}: DataTableProps<T>) {
  const allSelected = data.length > 0 && data.every((item) => selectedRows.has(keyExtractor(item)));

  const handleSelectAll = () => {
    if (onSelectAll) {
      onSelectAll(!allSelected);
    }
  };

  return (
    <div className="bg-surface-container-lowest rounded-lg shadow-sm overflow-hidden">
      <div className="overflow-x-auto w-full">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-surface-container-low text-on-surface-variant text-xs uppercase tracking-wider">
            <tr>
              {selectable && (
                <th className="w-10 px-4 py-3 text-center">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded-sm accent-primary cursor-pointer"
                  />
                </th>
              )}
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-4 py-3 font-semibold ${column.headerClassName || ''}`}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-none text-on-surface">
            {isLoading ? (
              <tr>
                <td
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  className="px-4 py-12 text-center text-on-surface-variant"
                >
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                    <span>Loading...</span>
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  className="px-4 py-12 text-center text-on-surface-variant"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((item) => {
                const key = keyExtractor(item);
                const isSelected = selectedRows.has(key);
                return (
                  <tr
                    key={key}
                    onClick={() => onRowClick?.(item)}
                    className={`hover:bg-surface-container-low transition-colors ${
                      onRowClick ? 'cursor-pointer' : ''
                    }`}
                  >
                    {selectable && (
                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => onSelectRow?.(key)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-4 h-4 rounded-sm accent-primary cursor-pointer"
                        />
                      </td>
                    )}
                    {columns.map((column) => (
                      <td
                        key={`${key}-${column.key}`}
                        className={`px-4 py-3 ${column.className || ''}`}
                      >
                        {column.render
                          ? column.render(item)
                          : String((item as any)[column.key] || '-')}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

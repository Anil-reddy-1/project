import type { ReactNode } from 'react';

interface Column<T> {
  key: string;
  // Accept both 'header' (new) and 'label' (legacy)
  header?: string;
  label?: string;
  render?: (item: T) => ReactNode;
  className?: string;
  headerClassName?: string;
  width?: string;
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
  // Optional: falls back to index if not provided
  keyExtractor?: (item: T) => string;
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
  const getKey = (item: T, idx: number) =>
    keyExtractor ? keyExtractor(item) : String(idx);
  const allSelected = data.length > 0 && data.every((item, idx) => selectedRows.has(getKey(item, idx)));

  const handleSelectAll = () => {
    if (onSelectAll) {
      onSelectAll(!allSelected);
    }
  };

  return (
    <div className="w-full overflow-hidden">
      <div className="overflow-x-auto scrollbar-light w-full">
        <table className="w-full min-w-full text-left text-sm">
          <thead>
            <tr className="bg-slate-50 border-y border-slate-100">
              {selectable && (
                <th className="w-10 px-5 py-3.5 text-center">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded accent-blue-600 cursor-pointer"
                  />
                </th>
              )}
              {columns.map((column) => (
                <th
                  key={column.key}
                  style={column.width ? { width: column.width } : undefined}
                  className={`px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap ${column.headerClassName || ''}`}
                >
                  {column.header ?? column.label ?? ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {isLoading ? (
              <tr>
                <td
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  className="px-5 py-12 text-center text-slate-400"
                >
                  <div className="flex items-center justify-center gap-2.5">
                    <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm font-medium">Loading…</span>
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  className="px-5 py-12 text-center text-slate-400 text-sm"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((item, rowIdx) => {
                const key = getKey(item, rowIdx);
                const isSelected = selectedRows.has(key);
                return (
                  <tr
                    key={key}
                    onClick={() => onRowClick?.(item)}
                    className={`group transition-colors ${isSelected
                        ? 'bg-blue-50/70 border-l-2 border-l-blue-500'
                        : rowIdx % 2 === 0
                          ? 'bg-white hover:bg-slate-50/80'
                          : 'bg-slate-50/30 hover:bg-slate-50/80'
                      } ${onRowClick ? 'cursor-pointer' : ''}`}
                  >
                    {selectable && (
                      <td className="px-4 py-3 text-center w-10">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => onSelectRow?.(key)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-4 h-4 rounded accent-blue-600 cursor-pointer"
                        />
                      </td>
                    )}
                    {columns.map((column) => (
                      <td
                        key={`${key}-${column.key}`}
                        className={`px-4 py-3 text-slate-700 ${column.className || ''}`}
                      >
                        {column.render
                          ? column.render(item)
                          : String((item as any)[column.key] || '—')}
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

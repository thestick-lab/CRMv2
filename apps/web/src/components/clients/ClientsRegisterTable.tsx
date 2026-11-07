import * as React from 'react';
import {
  type ColumnDef,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import type { EnrichedClientRow } from './client-row-data';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronRight,
  Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function filterClientsRow(row: EnrichedClientRow, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    row.code.toLowerCase().includes(q) ||
    row.name.toLowerCase().includes(q) ||
    (row.groupName && row.groupName.toLowerCase().includes(q)) ||
    row.entityType.toLowerCase().includes(q) ||
    row.staffName.toLowerCase().includes(q)
  );
}

export const CLIENT_COLUMNS: ColumnDef<EnrichedClientRow>[] = [
  {
    id: 'code',
    accessorKey: 'code',
    header: ({ column }) => {
      const isSorted = column.getIsSorted();
      return (
        <button
          onClick={() => column.toggleSorting(isSorted === 'asc')}
          className="flex items-center gap-1 font-mono uppercase text-[10px] text-muted-foreground hover:text-foreground"
        >
          <span>Code</span>
          {isSorted === 'asc' ? (
            <ArrowUp className="h-3 w-3" />
          ) : isSorted === 'desc' ? (
            <ArrowDown className="h-3 w-3" />
          ) : (
            <ArrowUpDown className="h-3 w-3 opacity-60" />
          )}
        </button>
      );
    },
    cell: ({ row }) => (
      <span className="font-mono font-semibold text-[#c4161c] bg-[#c4161c]/10 dark:text-[#f87171] px-1.5 py-0.5 rounded text-xs">
        {row.original.code}
      </span>
    ),
  },
  {
    id: 'name',
    accessorKey: 'name',
    header: ({ column }) => {
      const isSorted = column.getIsSorted();
      return (
        <button
          onClick={() => column.toggleSorting(isSorted === 'asc')}
          className="flex items-center gap-1 font-mono uppercase text-[10px] text-muted-foreground hover:text-foreground"
        >
          <span>Client Legal Name</span>
          {isSorted === 'asc' ? (
            <ArrowUp className="h-3 w-3" />
          ) : isSorted === 'desc' ? (
            <ArrowDown className="h-3 w-3" />
          ) : (
            <ArrowUpDown className="h-3 w-3 opacity-60" />
          )}
        </button>
      );
    },
    cell: ({ row }) => (
      <div className="min-w-0">
        <div className="font-medium text-foreground text-xs truncate">
          {row.original.name}
        </div>
        {row.original.groupName && (
          <div className="text-[10px] font-mono text-muted-foreground truncate">
            Group: {row.original.groupName}
          </div>
        )}
      </div>
    ),
  },
  {
    id: 'entityType',
    accessorKey: 'entityType',
    header: 'Entity Type',
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground">
        {row.original.entityType}
      </span>
    ),
  },
  {
    id: 'staffName',
    accessorKey: 'staffName',
    header: 'Responsible',
    cell: ({ row }) => (
      <span className="text-xs text-foreground font-medium">
        {row.original.staffName}
      </span>
    ),
  },
  {
    id: 'yearEnd',
    accessorKey: 'yearEndLabel',
    header: 'Year End',
    cell: ({ row }) => (
      <div className="flex items-center gap-1 text-xs">
        <span className="font-mono text-foreground">{row.original.yearEndLabel}</span>
        {row.original.yearEndAssumed && (
          <span
            className="text-[10px] text-amber-500 font-mono"
            title="Year-end was assumed (pending CIPC confirmation)"
          >
            (Assumed)
          </span>
        )}
      </div>
    ),
  },
  {
    id: 'vat',
    accessorKey: 'vatLabel',
    header: 'VAT Category',
    cell: ({ row }) => (
      <div>
        {row.original.vatCategory ? (
          <Badge variant="outline" className="font-mono text-[10px] py-0 px-1.5">
            {row.original.vatLabel}
          </Badge>
        ) : (
          <span className="text-muted-foreground text-[11px] italic">Non-VAT</span>
        )}
      </div>
    ),
  },
  {
    id: 'payroll',
    accessorKey: 'payrollLabel',
    header: 'Payroll',
    cell: ({ row }) => (
      <span className="text-xs text-foreground font-mono">
        {row.original.payrollLabel}
      </span>
    ),
  },
  {
    id: 'services',
    accessorKey: 'services',
    header: 'Active Services',
    cell: ({ row }) => (
      <div className="flex items-center gap-1 flex-wrap max-w-xs">
        {row.original.services.slice(0, 4).map((svc) => (
          <span
            key={svc}
            className="font-mono text-[10px] px-1 py-0.2 rounded bg-muted text-muted-foreground border border-border/60"
          >
            {svc}
          </span>
        ))}
        {row.original.services.length > 4 && (
          <span className="font-mono text-[10px] text-muted-foreground">
            +{row.original.services.length - 4}
          </span>
        )}
      </div>
    ),
  },
  {
    id: 'nextDeadline',
    accessorKey: 'nextDeadline',
    header: ({ column }) => {
      const isSorted = column.getIsSorted();
      return (
        <button
          onClick={() => column.toggleSorting(isSorted === 'asc')}
          className="flex items-center gap-1 font-mono uppercase text-[10px] text-muted-foreground hover:text-foreground"
        >
          <span>Next Statutory Deadline</span>
          {isSorted === 'asc' ? (
            <ArrowUp className="h-3 w-3" />
          ) : isSorted === 'desc' ? (
            <ArrowDown className="h-3 w-3" />
          ) : (
            <ArrowUpDown className="h-3 w-3 opacity-60" />
          )}
        </button>
      );
    },
    sortingFn: (rowA, rowB) => {
      const dateA = rowA.original.nextDeadline?.due || '9999-99-99';
      const dateB = rowB.original.nextDeadline?.due || '9999-99-99';
      return dateA.localeCompare(dateB);
    },
    cell: ({ row }) => {
      const deadline = row.original.nextDeadline;
      if (!deadline) {
        return <span className="text-muted-foreground text-[11px] italic">No pending filing</span>;
      }
      return (
        <div className="flex items-center gap-1.5 font-mono text-xs">
          <Badge variant="outline" className="text-[10px] px-1 py-0 border-[#c4161c]/30 text-[#c4161c]">
            {deadline.service}
          </Badge>
          <span className="text-foreground">{deadline.due}</span>
        </div>
      );
    },
  },
];

export interface ClientsRegisterTableProps {
  data: EnrichedClientRow[];
  onRowClick: (code: string) => void;
}

export function ClientsRegisterTable({ data, onRowClick }: ClientsRegisterTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([{ id: 'code', desc: false }]);
  const [globalFilter, setGlobalFilter] = React.useState('');
  const [entityFilter, setEntityFilter] = React.useState<string>('all');

  const filteredData = React.useMemo(() => {
    let rows = data;
    if (entityFilter !== 'all') {
      rows = rows.filter((r) => r.entityType === entityFilter);
    }
    if (globalFilter.trim()) {
      rows = rows.filter((r) => filterClientsRow(r, globalFilter));
    }
    return rows;
  }, [data, entityFilter, globalFilter]);

  const table = useReactTable({
    data: filteredData,
    columns: CLIENT_COLUMNS,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <div className="space-y-3.5">
      {/* Controls Bar: Filter Chips & Search Input */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Entity Category Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setEntityFilter('all')}
            className={cn(
              'px-2.5 py-1 rounded-md text-xs font-medium transition-colors font-mono whitespace-nowrap',
              entityFilter === 'all'
                ? 'bg-[#c4161c] text-white shadow-xs'
                : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            All ({data.length})
          </button>
          <button
            onClick={() => setEntityFilter('Company')}
            className={cn(
              'px-2.5 py-1 rounded-md text-xs font-medium transition-colors font-mono whitespace-nowrap',
              entityFilter === 'Company'
                ? 'bg-[#c4161c] text-white shadow-xs'
                : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            Companies ({data.filter((r) => r.entityType === 'Company').length})
          </button>
          <button
            onClick={() => setEntityFilter('Close corporation')}
            className={cn(
              'px-2.5 py-1 rounded-md text-xs font-medium transition-colors font-mono whitespace-nowrap',
              entityFilter === 'Close corporation'
                ? 'bg-[#c4161c] text-white shadow-xs'
                : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            CC ({data.filter((r) => r.entityType === 'Close corporation').length})
          </button>
          <button
            onClick={() => setEntityFilter('Trust')}
            className={cn(
              'px-2.5 py-1 rounded-md text-xs font-medium transition-colors font-mono whitespace-nowrap',
              entityFilter === 'Trust'
                ? 'bg-[#c4161c] text-white shadow-xs'
                : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            Trusts ({data.filter((r) => r.entityType === 'Trust').length})
          </button>
          <button
            onClick={() => setEntityFilter('Individual')}
            className={cn(
              'px-2.5 py-1 rounded-md text-xs font-medium transition-colors font-mono whitespace-nowrap',
              entityFilter === 'Individual'
                ? 'bg-[#c4161c] text-white shadow-xs'
                : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            Individuals ({data.filter((r) => r.entityType === 'Individual').length})
          </button>
        </div>

        {/* Global Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Search code (ALC), name, or staff..."
            className="w-full h-8 pl-8 pr-3 text-xs rounded-md border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[#c4161c]"
          />
        </div>
      </div>

      {/* TanStack Table Grid */}
      <div className="border border-border/80 rounded-lg bg-card/60 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/40 text-muted-foreground uppercase tracking-wider text-[10px] border-b border-border select-none">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th key={header.id} className="py-2.5 px-3 font-medium">
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                  <th className="py-2.5 px-3 text-right font-medium font-mono">Action</th>
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-border/60 font-sans">
              {table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={CLIENT_COLUMNS.length + 1} className="py-12 text-center text-xs text-muted-foreground">
                    No clients match the current filter criteria.
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => onRowClick(row.original.code)}
                    className="hover:bg-muted/40 transition-colors cursor-pointer group"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="py-2.5 px-3">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                    <td className="py-2.5 px-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-[11px] gap-1 px-2 group-hover:text-[#c4161c]"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRowClick(row.original.code);
                        }}
                      >
                        Inspect <ChevronRight className="h-3 w-3" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Meta */}
        <div className="px-4 py-2 border-t border-border/60 bg-muted/20 text-[11px] font-mono text-muted-foreground flex items-center justify-between">
          <span>
            Displaying {table.getRowModel().rows.length} of {data.length} practice clients
          </span>
          <span>Click any row to open 4-tab statutory record</span>
        </div>
      </div>
    </div>
  );
}

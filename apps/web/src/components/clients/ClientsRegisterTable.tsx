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

export function filterClientsRow(row: EnrichedClientRow, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    row.code.toLowerCase().includes(q) ||
    row.name.toLowerCase().includes(q) ||
    Boolean(row.groupId?.toLowerCase().includes(q)) ||
    Boolean(row.groupName?.toLowerCase().includes(q)) ||
    row.entityType.toLowerCase().includes(q) ||
    row.staffName.toLowerCase().includes(q)
  );
}

function SortHeader({
  title,
  isSorted,
  onToggle,
}: {
  title: string;
  isSorted: false | 'asc' | 'desc';
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex items-center gap-1 font-mono uppercase text-[10px] text-muted-foreground hover:text-foreground outline-none focus-visible:ring-1 focus-visible:ring-[#c4161c] rounded px-0.5 cursor-pointer"
    >
      <span>{title}</span>
      {isSorted === 'asc' ? (
        <ArrowUp className="h-3 w-3 text-foreground" />
      ) : isSorted === 'desc' ? (
        <ArrowDown className="h-3 w-3 text-foreground" />
      ) : (
        <ArrowUpDown className="h-3 w-3 opacity-60" />
      )}
    </button>
  );
}

export const CLIENT_COLUMNS: ColumnDef<EnrichedClientRow, any>[] = [
  {
    id: 'code',
    accessorKey: 'code',
    header: ({ column }) => (
      <SortHeader
        title="Code"
        isSorted={column.getIsSorted()}
        onToggle={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      />
    ),
    cell: ({ row }) => (
      <span className="font-mono font-semibold text-[#c4161c] bg-[#c4161c]/10 dark:text-[#f87171] px-1.5 py-0.5 rounded text-xs whitespace-nowrap">
        {row.original.code}
      </span>
    ),
  },
  {
    id: 'name',
    accessorKey: 'name',
    header: ({ column }) => (
      <SortHeader
        title="Client Legal Name"
        isSorted={column.getIsSorted()}
        onToggle={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      />
    ),
    cell: ({ row }) => (
      <div className="min-w-0">
        <div className="font-medium text-foreground text-xs truncate">
          {row.original.name}
        </div>
        {row.original.groupName && (
          <div className="text-[10px] font-mono text-muted-foreground truncate">
            {row.original.groupName}
          </div>
        )}
      </div>
    ),
  },
  {
    id: 'entityType',
    accessorKey: 'entityType',
    header: ({ column }) => (
      <SortHeader
        title="Entity Type"
        isSorted={column.getIsSorted()}
        onToggle={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      />
    ),
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground">
        {row.original.entityType}
      </span>
    ),
  },
  {
    id: 'staffName',
    accessorKey: 'staffName',
    header: ({ column }) => (
      <SortHeader
        title="Responsible"
        isSorted={column.getIsSorted()}
        onToggle={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      />
    ),
    cell: ({ row }) => (
      <span className="text-xs text-foreground font-medium">
        {row.original.staffName}
      </span>
    ),
  },
  {
    id: 'yearEnd',
    accessorKey: 'yearEndMonth',
    header: ({ column }) => (
      <SortHeader
        title="Year End"
        isSorted={column.getIsSorted()}
        onToggle={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      />
    ),
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
    id: 'vatCategory',
    accessorKey: 'vatCategory',
    header: 'VAT Status',
    cell: ({ row }) => (
      <span className="text-xs font-sans">
        {row.original.vatCategory ? (
          <Badge variant="outline" className="font-mono text-[10px] py-0 px-1">
            Cat {row.original.vatCategory}
          </Badge>
        ) : (
          <span className="text-muted-foreground text-[11px] italic">Non-VAT</span>
        )}
      </span>
    ),
  },
  {
    id: 'payroll',
    accessorKey: 'payroll',
    header: 'Payroll',
    cell: ({ row }) => (
      <span className="text-xs font-sans text-muted-foreground">
        {row.original.payroll ? `Yes (${row.original.employeeCount || 0} staff)` : '—'}
      </span>
    ),
  },
  {
    id: 'services',
    accessorKey: 'activeServicesCount',
    header: 'Services',
    cell: ({ row }) => (
      <div className="flex items-center gap-1 flex-wrap">
        {row.original.services.slice(0, 3).map((s) => (
          <Badge key={s} variant="outline" className="text-[9px] px-1 py-0 font-mono">
            {s}
          </Badge>
        ))}
        {row.original.services.length > 3 && (
          <span className="text-[10px] text-muted-foreground font-mono">
            +{row.original.services.length - 3}
          </span>
        )}
      </div>
    ),
  },
  {
    id: 'nextDeadline',
    accessorKey: 'nextDeadline',
    header: 'Next Statutory Deadline',
    cell: ({ row }) => {
      const deadline = row.original.nextDeadline;
      if (!deadline) {
        return <span className="text-muted-foreground italic text-xs">No active tasks</span>;
      }
      return (
        <div className="flex items-center gap-1.5 font-mono text-xs">
          <Badge
            variant={deadline.urgency === 'overdue' ? 'destructive' : 'outline'}
            className="text-[10px] px-1 py-0 font-mono"
          >
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

  const filteredData = React.useMemo(() => {
    let rows = data;
    if (globalFilter.trim()) {
      rows = rows.filter((r) => filterClientsRow(r, globalFilter));
    }
    return rows;
  }, [data, globalFilter]);

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
      {/* Controls Bar: Search Input */}
      <div className="flex items-center justify-end">
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
                  <th className="py-2.5 px-3 text-right font-medium font-mono uppercase text-[10px]">Action</th>
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
                    tabIndex={0}
                    role="link"
                    aria-label={`Open ${row.original.name} (${row.original.code})`}
                    onClick={() => onRowClick(row.original.code)}
                    onKeyDown={(e) => {
                      if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault();
                        onRowClick(row.original.code);
                      }
                    }}
                    className="hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-[#c4161c] transition-colors cursor-pointer group"
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
                        className="h-6 text-[11px] gap-1 px-2 group-hover:text-[#c4161c] cursor-pointer"
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
          <span>Click row or press Enter to open statutory record</span>
        </div>
      </div>
    </div>
  );
}

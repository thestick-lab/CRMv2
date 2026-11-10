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
      className="flex items-center gap-1 font-mono uppercase text-[11px] text-muted-foreground hover:text-foreground outline-none focus-visible:ring-1 focus-visible:ring-[#c4161c] rounded px-0.5 cursor-pointer"
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

// Tooltip dictionary for junior trainees and trainees
const STATUTORY_DESCRIPTIONS: Record<string, string> = {
  VAT201: 'SARS Value-Added Tax (VAT) Return (Bi-monthly or Monthly)',
  EMP201: 'Monthly Employer Declaration (PAYE, UIF & SDL contributions)',
  EMP501: 'Employer Bi-annual Reconciliation & Tax Certificates',
  IRP6: 'SARS Provisional Tax Return (1st: 6-month, 2nd: Year-end)',
  ITR14: 'Annual Company Income Tax Return',
  ITR12: 'Annual Individual Income Tax Return',
  ITR12T: 'Annual Trust Income Tax Return',
  AFS: 'Annual Financial Statements per Companies Act §30(1)',
  CIPC_AR: 'CIPC Annual Return & Financial Accountability Supplement',
  BO: 'CIPC Beneficial Ownership Register filing',
};

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
          <div className="text-[11px] font-mono text-muted-foreground truncate">
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
      <div className="hidden lg:block">
        <SortHeader
          title="Entity Type"
          isSorted={column.getIsSorted()}
          onToggle={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        />
      </div>
    ),
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground hidden lg:inline-block">
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
      <div className="hidden sm:block">
        <SortHeader
          title="Year End"
          isSorted={column.getIsSorted()}
          onToggle={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        />
      </div>
    ),
    cell: ({ row }) => (
      <div className="hidden sm:flex items-center gap-1 text-xs">
        <span className="font-mono text-foreground">{row.original.yearEndLabel}</span>
        {row.original.yearEndAssumed && (
          <span
            className="text-[11px] text-amber-500 font-mono"
            title="Year-end was assumed (pending CIPC confirmation)"
          >
            *
          </span>
        )}
      </div>
    ),
  },
  {
    id: 'vatCategory',
    accessorKey: 'vatCategory',
    header: () => <span className="hidden md:inline-block">VAT Status</span>,
    cell: ({ row }) => (
      <span className="text-xs font-sans hidden md:inline-block">
        {row.original.vatCategory ? (
          <Badge variant="outline" className="font-mono text-[11px] py-0 px-1">
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
    header: () => <span className="hidden xl:inline-block">Payroll</span>,
    cell: ({ row }) => (
      <span className="text-xs font-sans text-muted-foreground hidden xl:inline-block">
        {row.original.payroll ? `Yes (${row.original.employeeCount || 0})` : '—'}
      </span>
    ),
  },
  {
    id: 'services',
    accessorKey: 'activeServicesCount',
    header: () => <span className="hidden sm:inline-block">Services</span>,
    cell: ({ row }) => (
      <div className="hidden sm:flex items-center gap-1 flex-wrap">
        {row.original.services.slice(0, 3).map((s) => (
          <Badge
            key={s}
            variant="outline"
            className="text-[11px] px-1 py-0 font-mono cursor-help"
            title={STATUTORY_DESCRIPTIONS[s] || s}
          >
            {s}
          </Badge>
        ))}
        {row.original.services.length > 3 && (
          <span className="text-[11px] text-muted-foreground font-mono">
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
            className="text-[11px] px-1 py-0 font-mono cursor-help"
            title={STATUTORY_DESCRIPTIONS[deadline.service] || deadline.service}
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
  const [selectedIndex, setSelectedIndex] = React.useState(0);

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

  const rowCount = table.getRowModel().rows.length;

  // J / K Keyboard Navigation for Power Users (Alex)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === 'j' || e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, rowCount - 1));
      } else if (e.key === 'k' || e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' || e.key === ' ') {
        const selectedRow = table.getRowModel().rows[selectedIndex];
        if (selectedRow) {
          e.preventDefault();
          onRowClick(selectedRow.original.code);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [rowCount, selectedIndex, table, onRowClick]);

  return (
    <div className="space-y-3">
      {/* Controls Bar: Search Input */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="text-[11px] font-mono text-muted-foreground hidden sm:block">
          Use <kbd className="px-1 py-0.5 rounded bg-muted border border-border">J</kbd> /{' '}
          <kbd className="px-1 py-0.5 rounded bg-muted border border-border">K</kbd> to navigate,{' '}
          <kbd className="px-1 py-0.5 rounded bg-muted border border-border">Enter</kbd> to inspect
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Search code (ALC), name, or staff..."
            className="h-8 w-full rounded-lg border border-border bg-card pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[#c4161c]"
          />
        </div>
      </div>

      {/* TanStack Table Grid */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="select-none border-b border-border bg-muted/40 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th key={header.id} className="px-3 py-2.5 font-medium">
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                  <th className="px-3 py-2.5 text-right font-mono text-[11px] font-medium uppercase">Action</th>
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-border/60 font-sans">
              {rowCount === 0 ? (
                <tr>
                  <td colSpan={CLIENT_COLUMNS.length + 1} className="py-12 text-center text-xs text-muted-foreground">
                    No clients match the current filter criteria.
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row, idx) => {
                  const isSelected = idx === selectedIndex;
                  return (
                    <tr
                      key={row.id}
                      tabIndex={0}
                      role="link"
                      aria-label={`Open ${row.original.name} (${row.original.code})`}
                      onClick={() => onRowClick(row.original.code)}
                      className={`group cursor-pointer transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-[#c4161c] ${
                        isSelected ? 'bg-muted/30 ring-1 ring-inset ring-[#c4161c]/30' : ''
                      }`}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-3 py-3">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                      <td className="px-3 py-3 text-right">
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
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Meta */}
        <div className="flex items-center justify-between border-t border-border bg-muted/20 px-4 py-2 font-mono text-[11px] text-muted-foreground">
          <span>
            Displaying {rowCount} of {data.length} practice clients
          </span>
          <span>Click row or press Enter to open statutory record</span>
        </div>
      </div>
    </div>
  );
}

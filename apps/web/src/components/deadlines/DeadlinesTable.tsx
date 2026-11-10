import * as React from 'react';
import type { PracticeTaskItem } from './practice-tasks';
import { usePracticeStore } from '@/context/PracticeStoreContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { normalizeWorkflowStatus, type WorkflowStatus } from '@/lib/workflow';
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronRight,
  UserCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DeadlinesTableProps {
  tasks: PracticeTaskItem[];
  onSelectClient: (code: string) => void;
}

const STATUS_VARIANT: Record<
  WorkflowStatus,
  { variant: 'outline' | 'secondary' | 'warning' | 'crimsonSubdued' | 'default'; className?: string }
> = {
  'Not Started': { variant: 'outline' },
  'In Progress': { variant: 'secondary' },
  'Awaiting Client': { variant: 'warning' },
  'Partner Review Gate': { variant: 'crimsonSubdued' },
  'Approved (Ready to Lodge)': {
    variant: 'outline',
    className: 'border-foreground/25 bg-muted/60 text-foreground',
  },
  Submitted: { variant: 'default' },
};

export function DeadlinesTable({ tasks, onSelectClient }: DeadlinesTableProps) {
  const { taskStatusOverrides } = usePracticeStore();
  const [sortField, setSortField] = React.useState<'due' | 'client' | 'service'>('due');
  const [sortAsc, setSortAsc] = React.useState<boolean>(true);

  const sortedTasks = React.useMemo(() => {
    return [...tasks].sort((a, b) => {
      let cmp = 0;
      if (sortField === 'due') {
        const dateA = a.due ?? '9999-99-99';
        const dateB = b.due ?? '9999-99-99';
        cmp = dateA.localeCompare(dateB);
      } else if (sortField === 'client') {
        cmp = a.clientCode.localeCompare(b.clientCode);
      } else if (sortField === 'service') {
        cmp = a.service.localeCompare(b.service);
      }
      return sortAsc ? cmp : -cmp;
    });
  }, [tasks, sortField, sortAsc]);

  const toggleSort = (field: 'due' | 'client' | 'service') => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const renderSortIcon = (field: 'due' | 'client' | 'service') => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 opacity-60" />;
    return sortAsc ? (
      <ArrowUp className="h-3 w-3 text-foreground" />
    ) : (
      <ArrowDown className="h-3 w-3 text-foreground" />
    );
  };

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="select-none border-b border-border bg-muted/40 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-3 py-2.5 font-medium">
                <button
                  type="button"
                  onClick={() => toggleSort('client')}
                  className="flex items-center gap-1 hover:text-foreground"
                >
                  <span>Client</span>
                  {renderSortIcon('client')}
                </button>
              </th>
              <th className="px-3 py-2.5 font-medium">
                <button
                  type="button"
                  onClick={() => toggleSort('service')}
                  className="flex items-center gap-1 hover:text-foreground"
                >
                  <span>Return</span>
                  {renderSortIcon('service')}
                </button>
              </th>
              <th className="px-3 py-2.5 font-medium">Period</th>
              <th className="px-3 py-2.5 font-medium">Status</th>
              <th className="px-3 py-2.5 font-medium">
                <button
                  type="button"
                  onClick={() => toggleSort('due')}
                  className="flex items-center gap-1 hover:text-foreground"
                >
                  <span>Due Date (Rollback)</span>
                  {renderSortIcon('due')}
                </button>
              </th>
              <th className="px-3 py-2.5 font-medium">Partner Gate</th>
              <th className="px-3 py-2.5 font-medium">Urgency</th>
              <th className="px-3 py-2.5 font-medium">Responsible</th>
              <th className="px-3 py-2.5 text-right font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60 font-mono">
            {sortedTasks.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center font-sans text-xs text-muted-foreground">
                  No statutory tasks match the selected criteria.
                </td>
              </tr>
            ) : (
              sortedTasks.map((task) => {
                const status = normalizeWorkflowStatus(
                  taskStatusOverrides[task.id]?.status ?? task.status
                );
                const blocked = !task.due;

                return (
                  <tr
                    key={task.id}
                    tabIndex={0}
                    role="link"
                    aria-label={`Open client record for ${task.clientName} (${task.clientCode})`}
                    onClick={() => onSelectClient(task.clientCode)}
                    onKeyDown={(e) => {
                      if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault();
                        onSelectClient(task.clientCode);
                      }
                    }}
                    className={cn(
                      'group cursor-pointer transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-[#c4161c]',
                      blocked && 'bg-destructive/[0.04]'
                    )}
                  >
                    {/* Client */}
                    <td className="px-3 py-2.5">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <span className="whitespace-nowrap font-semibold text-[#c4161c] dark:text-[#f87171]">
                          {task.clientCode}
                        </span>
                        <span className="max-w-[160px] truncate font-sans font-medium text-foreground">
                          {task.clientName}
                        </span>
                      </div>
                    </td>

                    {/* Return */}
                    <td className="px-3 py-2.5">
                      <Badge variant="outline" className="px-1.5 py-0 font-mono text-[11px]">
                        {task.service}
                      </Badge>
                    </td>

                    {/* Period */}
                    <td className="max-w-[140px] truncate px-3 py-2.5 font-sans text-muted-foreground">
                      {task.period}
                      {task.part ? ` (${task.part})` : ''}
                    </td>

                    {/* Status — includes Awaiting Client */}
                    <td className="px-3 py-2.5">
                      <Badge
                        variant={STATUS_VARIANT[status].variant}
                        className={cn(
                          'whitespace-nowrap px-1.5 py-0 font-mono text-[11px]',
                          STATUS_VARIANT[status].className
                        )}
                      >
                        {status}
                      </Badge>
                    </td>

                    {/* Due Date */}
                    <td className="px-3 py-2.5 text-foreground">
                      {task.due ? (
                        <div className="flex items-center gap-1">
                          <span>{task.due}</span>
                          {task.dueNote && (
                            <span
                              className="font-sans text-[11px] font-bold text-[#c4161c]"
                              title={task.dueNote}
                              aria-label={task.dueNote}
                            >
                              ↩
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="flex items-center gap-1 font-sans text-[11px] italic text-destructive">
                          <AlertCircle className="h-3 w-3" />
                          Blocked: missing master data
                        </span>
                      )}
                    </td>

                    {/* Partner Review Gate */}
                    <td className="px-3 py-2.5 font-sans">
                      {task.needsPartnerReview ? (
                        <Badge variant="crimsonSubdued" className="gap-1 px-1.5 py-0 font-mono text-[11px]">
                          <UserCheck className="h-3 w-3" /> Gate
                        </Badge>
                      ) : (
                        <span className="text-[11px] text-muted-foreground">Standard</span>
                      )}
                    </td>

                    {/* Urgency */}
                    <td className="px-3 py-2.5">
                      <Badge
                        variant={
                          task.urgency === 'overdue'
                            ? 'destructive'
                            : task.urgency === 'week'
                              ? 'crimsonSubdued'
                              : task.urgency === 'month'
                                ? 'warning'
                                : 'outline'
                        }
                        className="px-1.5 py-0 font-mono text-[11px] uppercase"
                      >
                        {task.urgency}
                      </Badge>
                    </td>

                    {/* Responsible */}
                    <td className="max-w-[130px] truncate px-3 py-2.5 font-sans text-foreground">
                      {task.staffName}
                    </td>

                    {/* Action */}
                    <td className="px-3 py-2.5 text-right font-sans">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 gap-1 px-2 text-[11px] group-hover:text-[#c4161c]"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectClient(task.clientCode);
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
    </div>
  );
}

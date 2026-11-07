import * as React from 'react';
import type { PracticeTaskItem } from './practice-tasks';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronRight,
  UserCheck,
} from 'lucide-react';

export interface DeadlinesTableProps {
  tasks: PracticeTaskItem[];
  onSelectClient: (code: string) => void;
}

export function DeadlinesTable({ tasks, onSelectClient }: DeadlinesTableProps) {
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
    return sortAsc ? <ArrowUp className="h-3 w-3 text-foreground" /> : <ArrowDown className="h-3 w-3 text-foreground" />;
  };

  return (
    <div className="border border-border/80 rounded-lg bg-card/60 overflow-hidden shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead className="bg-muted/40 text-muted-foreground uppercase tracking-wider text-[10px] border-b border-border font-mono select-none">
            <tr>
              <th className="py-2.5 px-3 font-medium">
                <button
                  type="button"
                  onClick={() => toggleSort('client')}
                  className="flex items-center gap-1 hover:text-foreground"
                >
                  <span>Client</span>
                  {renderSortIcon('client')}
                </button>
              </th>
              <th className="py-2.5 px-3 font-medium">
                <button
                  type="button"
                  onClick={() => toggleSort('service')}
                  className="flex items-center gap-1 hover:text-foreground"
                >
                  <span>Return</span>
                  {renderSortIcon('service')}
                </button>
              </th>
              <th className="py-2.5 px-3 font-medium">Period</th>
              <th className="py-2.5 px-3 font-medium">
                <button
                  type="button"
                  onClick={() => toggleSort('due')}
                  className="flex items-center gap-1 hover:text-foreground"
                >
                  <span>Due Date (Rollback)</span>
                  {renderSortIcon('due')}
                </button>
              </th>
              <th className="py-2.5 px-3 font-medium">Partner Gate</th>
              <th className="py-2.5 px-3 font-medium">Urgency</th>
              <th className="py-2.5 px-3 font-medium">Responsible</th>
              <th className="py-2.5 px-3 text-right font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60 font-mono">
            {sortedTasks.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-xs text-muted-foreground font-sans">
                  No statutory tasks match the selected criteria.
                </td>
              </tr>
            ) : (
              sortedTasks.map((task) => (
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
                  className="hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-[#c4161c] transition-colors cursor-pointer group"
                >
                  {/* Client */}
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-semibold text-[#c4161c] dark:text-[#f87171] whitespace-nowrap">
                        {task.clientCode}
                      </span>
                      <span className="font-sans font-medium text-foreground truncate max-w-[160px]">
                        {task.clientName}
                      </span>
                    </div>
                  </td>

                  {/* Return */}
                  <td className="py-2.5 px-3">
                    <Badge variant="outline" className="font-mono text-[10px] py-0 px-1.5">
                      {task.service}
                    </Badge>
                  </td>

                  {/* Period */}
                  <td className="py-2.5 px-3 font-sans text-muted-foreground truncate max-w-[140px]">
                    {task.period}
                    {task.part ? ` (${task.part})` : ''}
                  </td>

                  {/* Due Date */}
                  <td className="py-2.5 px-3 text-foreground">
                    {task.due ? (
                      <div className="flex items-center gap-1">
                        <span>{task.due}</span>
                        <span className="text-emerald-500 font-sans text-[11px]" title="South African holiday rollback applied">
                          ↩
                        </span>
                      </div>
                    ) : (
                      <span className="text-amber-500 font-sans text-[11px] italic">
                        Date Pending
                      </span>
                    )}
                  </td>

                  {/* Partner Review Gate */}
                  <td className="py-2.5 px-3 font-sans">
                    {task.needsPartnerReview ? (
                      <Badge variant="crimsonSubdued" className="text-[10px] py-0 px-1.5 gap-1 font-mono">
                        <UserCheck className="h-3 w-3" /> Gate
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-[11px]">Standard</span>
                    )}
                  </td>

                  {/* Urgency */}
                  <td className="py-2.5 px-3">
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
                      className="text-[10px] py-0 px-1.5 font-mono uppercase"
                    >
                      {task.urgency}
                    </Badge>
                  </td>

                  {/* Responsible */}
                  <td className="py-2.5 px-3 font-sans text-foreground truncate max-w-[130px]">
                    {task.staffName}
                  </td>

                  {/* Action */}
                  <td className="py-2.5 px-3 text-right font-sans">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-[11px] gap-1 px-2 group-hover:text-[#c4161c]"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectClient(task.clientCode);
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
    </div>
  );
}

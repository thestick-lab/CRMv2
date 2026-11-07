import type { PracticeTaskItem } from './practice-tasks';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Calendar, UserCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface KanbanBuckets {
  overdue: PracticeTaskItem[];
  due7Days: PracticeTaskItem[];
  due30Days: PracticeTaskItem[];
  missingDate: PracticeTaskItem[];
}

export function bucketKanbanTasks(tasks: PracticeTaskItem[], asOfDate: string): KanbanBuckets {
  const overdue: PracticeTaskItem[] = [];
  const due7Days: PracticeTaskItem[] = [];
  const due30Days: PracticeTaskItem[] = [];
  const missingDate: PracticeTaskItem[] = [];

  for (const t of tasks) {
    if (!t.due) {
      missingDate.push(t);
    } else if (t.due < asOfDate) {
      overdue.push(t);
    } else if (t.daysUntilDue !== undefined && t.daysUntilDue <= 7) {
      due7Days.push(t);
    } else {
      // Due in 30 days or general upcoming queue
      due30Days.push(t);
    }
  }

  return {
    overdue,
    due7Days,
    due30Days,
    missingDate,
  };
}

export interface DeadlinesKanbanProps {
  tasks: PracticeTaskItem[];
  asOfDate: string;
  onSelectClient: (code: string) => void;
  horizon?: '30' | '90' | '365';
}

export function DeadlinesKanban({ tasks, asOfDate, onSelectClient, horizon = '30' }: DeadlinesKanbanProps) {
  const buckets = bucketKanbanTasks(tasks, asOfDate);

  const columns = [
    {
      id: 'overdue',
      title: 'Overdue Filings',
      count: buckets.overdue.length,
      items: buckets.overdue,
      badgeVariant: 'destructive' as const,
      borderColor: 'border-destructive/40',
    },
    {
      id: 'due7',
      title: 'Due in 7 Days',
      count: buckets.due7Days.length,
      items: buckets.due7Days,
      badgeVariant: 'crimsonSubdued' as const,
      borderColor: 'border-[#c4161c]/40',
    },
    {
      id: 'due30',
      title: horizon === '30' ? 'Due in 8–30 Days' : horizon === '90' ? 'Upcoming (≤ 90 Days)' : 'Upcoming (≤ 365 Days)',
      count: buckets.due30Days.length,
      items: buckets.due30Days,
      badgeVariant: 'outline' as const,
      borderColor: 'border-border/80',
    },
    {
      id: 'missing',
      title: 'Missing a Date (Blockers)',
      count: buckets.missingDate.length,
      items: buckets.missingDate,
      badgeVariant: 'warning' as const,
      borderColor: 'border-amber-500/40',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start select-none">
      {columns.map((col) => (
        <div
          key={col.id}
          className={cn(
            'border rounded-lg bg-card/60 flex flex-col max-h-[calc(100vh-250px)] shadow-xs',
            col.borderColor
          )}
        >
          {/* Column Header */}
          <div className="p-3 border-b border-border/70 flex items-center justify-between bg-muted/20 shrink-0">
            <span className="text-xs font-semibold text-foreground tracking-tight">
              {col.title}
            </span>
            <Badge variant={col.badgeVariant} className="font-mono text-[10px] py-0 px-1.5 h-4">
              {col.count}
            </Badge>
          </div>

          {/* Card Stream */}
          <div className="p-2.5 space-y-2.5 overflow-y-auto">
            {col.items.length === 0 ? (
              <div className="py-8 text-center text-[11px] text-muted-foreground italic font-sans">
                No tasks in this lane
              </div>
            ) : (
              col.items.map((task) => (
                <div
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
                  className="border border-border/80 rounded-md p-3 bg-card hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#c4161c] transition-all cursor-pointer space-y-2 group shadow-2xs"
                >
                  {/* Card Header: Client Code + Name */}
                  <div className="flex items-center justify-between gap-1.5 min-w-0">
                    <span className="font-mono font-semibold text-[#c4161c] dark:text-[#f87171] text-xs">
                      {task.clientCode}
                    </span>
                    <span className="text-xs text-foreground font-medium truncate flex-1 text-right">
                      {task.clientName}
                    </span>
                  </div>

                  {/* Return + Filing Period */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Badge variant="outline" className="font-mono text-[10px] py-0 px-1">
                      {task.service}
                    </Badge>
                    <span className="text-[11px] text-muted-foreground truncate font-sans">
                      {task.period}
                      {task.part ? ` (${task.part})` : ''}
                    </span>
                  </div>

                  {/* Date & Review Gates */}
                  <div className="pt-2 border-t border-border/60 flex items-center justify-between text-[11px] font-mono">
                    <div className="flex items-center gap-1">
                      {task.due ? (
                        <>
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          <span className="text-foreground">{task.due}</span>
                          <span className="text-emerald-500 font-sans" title="Holiday rollback verified">
                            ↩
                          </span>
                        </>
                      ) : (
                        <span className="text-amber-500 font-sans text-[10px] italic flex items-center gap-0.5">
                          <AlertTriangle className="h-3 w-3" /> Date Needed
                        </span>
                      )}
                    </div>

                    {task.needsPartnerReview ? (
                      <Badge variant="crimsonSubdued" className="text-[9px] py-0 px-1 gap-0.5 font-mono">
                        <UserCheck className="h-2.5 w-2.5" /> Gate
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-[10px] font-sans truncate max-w-[80px]">
                        {task.staffName.split(' ')[0]}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

import type { PracticeTaskItem } from '@/components/deadlines/practice-tasks';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CardHeaderWithLink, DateChip } from '@/components/ui/list-primitives';
import { CheckCircle2 } from 'lucide-react';

const MONTHS_SHORT = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

export interface NextActionPanelProps {
  task?: PracticeTaskItem;
  onComplete: (task: PracticeTaskItem) => void;
  onViewAll?: () => void;
}

export function NextActionPanel({ task, onComplete, onViewAll }: NextActionPanelProps) {
  if (!task) {
    return (
      <section className="overflow-hidden rounded-xl border border-border bg-card">
        <CardHeaderWithLink title="Next action" />
        <div className="flex items-center gap-2 px-4 py-6 text-xs text-muted-foreground">
          <CheckCircle2 className="h-4 w-4 text-[#c4161c] dark:text-[#f87171]" />
          No open statutory tasks for this client.
        </div>
      </section>
    );
  }

  const [year, month, day] = task.due ? task.due.split('-') : [];
  const monthLabel = month ? MONTHS_SHORT[Number(month) - 1] : undefined;

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card">
      <CardHeaderWithLink title="Next action" linkLabel="Open tasks" onLink={onViewAll} />

      <div className="space-y-3 px-4 py-3">
        <div className="flex items-start gap-3">
          {task.due && monthLabel && day ? (
            <div className="relative">
              <DateChip month={monthLabel.toLowerCase()} day={day} />
              {year && (
                <span className="mt-1 block text-center font-mono text-[9px] text-muted-foreground">
                  {year}
                </span>
              )}
            </div>
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-dashed border-border font-mono text-[9px] text-muted-foreground">
              TBC
            </div>
          )}

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-mono text-xs font-semibold text-foreground">{task.service}</span>
              {task.part && (
                <span className="font-mono text-[10px] text-muted-foreground">({task.part})</span>
              )}
              <Badge
                variant={
                  task.urgency === 'overdue'
                    ? 'destructive'
                    : task.urgency === 'week'
                    ? 'crimsonSubdued'
                    : 'outline'
                }
                className="px-1.5 py-0 text-[9px] font-mono uppercase tracking-wide"
              >
                {task.urgency}
              </Badge>
            </div>
            <p className="mt-0.5 text-xs text-foreground">Filing period {task.period}</p>
            <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
              {task.due ? `Due ${task.due}` : task.dueNote || 'Due date pending'}
              {task.needsPartnerReview ? ' · partner review' : ''}
            </p>
          </div>
        </div>

        <Button size="sm" className="h-7 w-full text-[11px]" onClick={() => onComplete(task)}>
          Mark complete
        </Button>
      </div>
    </section>
  );
}

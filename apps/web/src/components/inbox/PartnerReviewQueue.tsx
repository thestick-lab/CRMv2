import * as React from 'react';
import type { PracticeTaskItem } from '@/components/deadlines/practice-tasks';
import { aggregatePracticeTasks } from '@/components/deadlines/practice-tasks';
import { todayInSouthAfrica } from 'fdoncall-practice/domain/dates';
import { usePracticeStore } from '@/context/PracticeStoreContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ShieldCheck,
  CheckCircle2,
  Calendar,
  UserCheck,
  RotateCcw,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function filterReviewQueueTasks(
  tasks: PracticeTaskItem[],
  overrides: Record<string, { status: string; partnerSignOff?: boolean }>
): PracticeTaskItem[] {
  return tasks.filter((t) => {
    const status = overrides[t.id]?.status || t.status;
    return status === 'Partner Review Gate' && t.needsPartnerReview;
  });
}

export interface PartnerReviewQueueProps {
  onNavigateClient?: (code: string) => void;
  className?: string;
}

export function PartnerReviewQueue({ onNavigateClient, className }: PartnerReviewQueueProps) {
  const { clients, staff, currentUser, taskStatusOverrides, updateTaskStatus } = usePracticeStore();
  const today = todayInSouthAfrica();

  const summary = React.useMemo(() => {
    return aggregatePracticeTasks(clients, today, staff);
  }, [clients, today, staff]);

  const queueTasks = React.useMemo(() => {
    return filterReviewQueueTasks(summary.tasks, taskStatusOverrides);
  }, [summary.tasks, taskStatusOverrides]);

  const isPartner = currentUser.role === 'Partner';

  const handleApprove = (taskId: string) => {
    updateTaskStatus(taskId, 'Approved (Ready to Lodge)', {
      partnerSignOff: true,
      submissionDate: today,
    });
  };

  const handleRequestRevision = (taskId: string) => {
    updateTaskStatus(taskId, 'In Progress', {
      partnerSignOff: false,
    });
  };

  return (
    <div className={cn('space-y-4 text-xs', className)}>
      {queueTasks.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border/80 rounded-xl bg-card/40 space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Zero Returns Awaiting Partner Review</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              All statutory filing gates across AFS, ITR14, and payable IRP6 are signed off.
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[750px]">
              <thead className="bg-muted/40 border-b border-border/80 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Client Entity</th>
                  <th className="px-4 py-3">Return Type</th>
                  <th className="px-4 py-3">Filing Period</th>
                  <th className="px-4 py-3">Statutory Due Date</th>
                  <th className="px-4 py-3">Assigned Preparer</th>
                  <th className="px-4 py-3 text-right">Partner Gate Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {queueTasks.map((task) => (
                  <tr key={task.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onNavigateClient?.(task.clientCode)}
                          className="font-mono font-bold text-primary hover:underline"
                        >
                          {task.clientCode}
                        </button>
                        <span className="truncate max-w-[180px]">{task.clientName}</span>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <Badge variant="outline" className="font-mono text-xs border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/5">
                        {task.service}
                      </Badge>
                    </td>

                    <td className="px-4 py-3 font-mono text-muted-foreground">
                      {task.period} {task.part && `(${task.part})`}
                    </td>

                    <td className="px-4 py-3 font-mono text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{task.due || 'Ad-hoc'}</span>
                        {task.dueNote && <span className="text-primary font-bold">↩</span>}
                      </div>
                    </td>

                    <td className="px-4 py-3 text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <UserCheck className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{task.staffName}</span>
                      </div>
                    </td>

                    <td className="px-4 py-3 text-right">
                      {isPartner ? (
                        <div className="inline-flex items-center gap-1.5">
                          <Button
                            size="sm"
                            onClick={() => handleRequestRevision(task.id)}
                            variant="outline"
                            className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                          >
                            <RotateCcw className="h-3 w-3 mr-1" />
                            <span>Revise</span>
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleApprove(task.id)}
                            className="h-7 px-2.5 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                          >
                            <ShieldCheck className="h-3 w-3 mr-1" />
                            <span>Sign Off as CA(SA)</span>
                          </Button>
                        </div>
                      ) : (
                        <Badge variant="outline" className="text-[10px] text-amber-500 border-amber-500/30">
                          Partner Signature Required
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

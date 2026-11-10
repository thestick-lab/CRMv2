import * as React from 'react';
import type { PracticeTaskItem } from '@/components/deadlines/practice-tasks';
import { aggregatePracticeTasks } from '@/components/deadlines/practice-tasks';
import { todayInSouthAfrica } from 'fdoncall-practice/domain/dates';
import { usePracticeStore } from '@/context/PracticeStoreContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyStateCard } from '@/components/ui/list-primitives';
import { CheckCircle2, Lock, RotateCcw, ShieldCheck, UserCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { can, canSignOff } from '@/lib/permissions';

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
  const { clients, staff, currentUser, taskStatusOverrides, updateTaskStatus, permissions } =
    usePracticeStore();
  const today = todayInSouthAfrica();

  const summary = React.useMemo(() => {
    return aggregatePracticeTasks(clients, today, staff);
  }, [clients, today, staff]);

  const queueTasks = React.useMemo(() => {
    return filterReviewQueueTasks(summary.tasks, taskStatusOverrides);
  }, [summary.tasks, taskStatusOverrides]);

  // Sign-off is the locked §6.9 row and the only gate action; requesting a
  // revision is an ordinary status update.
  const canSignOffQueue = canSignOff(currentUser.role);
  const canUpdateStatus = can(
    currentUser.role,
    'Deadlines',
    'update-status',
    permissions.matrix
  );

  const handleApprove = (task: PracticeTaskItem) => {
    // The override's own metadata is what the governance trail reads, so it has
    // to carry the filing identity — the task id alone leaves the subject as
    // raw id segments.
    updateTaskStatus(task.id, 'Approved (Ready to Lodge)', {
      partnerSignOff: true,
      approvedBy: currentUser.name,
      submissionDate: today,
      service: task.service,
      clientName: task.clientName,
      period: task.period,
    });
  };

  const handleRequestRevision = (taskId: string) => {
    updateTaskStatus(taskId, 'In Progress', {
      partnerSignOff: false,
    });
  };

  if (queueTasks.length === 0) {
    return (
      <div className={cn('text-xs', className)}>
        <EmptyStateCard
          icon={CheckCircle2}
          title="Zero Returns Awaiting Partner Review"
          subtitle="All statutory filing gates across AFS, ITR14, and payable IRP6 are signed off."
          dashed
        />
      </div>
    );
  }

  return (
    <div className={cn('text-xs', className)}>
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left">
            <thead className="border-b border-border bg-muted/40 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th scope="col" className="px-4 py-2.5 font-medium">
                  Client Entity
                </th>
                <th scope="col" className="px-4 py-2.5 font-medium">
                  Return Type
                </th>
                <th scope="col" className="px-4 py-2.5 font-medium">
                  Filing Period
                </th>
                <th scope="col" className="px-4 py-2.5 font-medium">
                  Statutory Due
                </th>
                <th scope="col" className="px-4 py-2.5 font-medium">
                  Preparer
                </th>
                <th scope="col" className="px-4 py-2.5 text-right font-medium">
                  Partner Gate Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {queueTasks.map((task) => {
                const overdue = Boolean(task.due && task.due < today);

                return (
                  <tr
                    key={task.id}
                    tabIndex={0}
                    role="link"
                    aria-label={`Open client record for ${task.clientName} (${task.clientCode})`}
                    onClick={() => onNavigateClient?.(task.clientCode)}
                    onKeyDown={(event) => {
                      if (event.target !== event.currentTarget) return;
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        onNavigateClient?.(task.clientCode);
                      }
                    }}
                    className="group cursor-pointer transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-[#c4161c]"
                  >
                    {/* Client */}
                    <td className="px-4 py-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            onNavigateClient?.(task.clientCode);
                          }}
                          className="shrink-0 rounded-sm font-mono text-[11px] font-semibold text-[#c4161c] outline-none hover:underline focus-visible:ring-1 focus-visible:ring-[#c4161c] dark:text-[#f87171]"
                        >
                          {task.clientCode}
                        </button>
                        <span className="max-w-[190px] truncate font-medium text-foreground">
                          {task.clientName}
                        </span>
                      </div>
                    </td>

                    {/* Return */}
                    <td className="px-4 py-3">
                      <Badge
                        variant="outline"
                        className="whitespace-nowrap px-1.5 py-0 font-mono text-[11px] font-medium text-foreground"
                      >
                        {task.service}
                      </Badge>
                    </td>

                    {/* Period */}
                    <td className="max-w-[150px] truncate px-4 py-3 font-mono text-[11px] text-muted-foreground">
                      {task.period}
                      {task.part ? ` (${task.part})` : ''}
                    </td>

                    {/* Due */}
                    <td className="px-4 py-3">
                      {task.due ? (
                        <span className="flex items-center gap-1 font-mono text-[11px]">
                          <span className={cn('text-foreground', overdue && 'font-semibold text-destructive')}>
                            {task.due}
                          </span>
                          {task.dueNote && (
                            <span
                              className="font-sans text-[11px] font-bold text-[#c4161c] dark:text-[#f87171]"
                              title={task.dueNote}
                              aria-label={task.dueNote}
                            >
                              ↩
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="font-sans text-[11px] italic text-muted-foreground">
                          No date
                        </span>
                      )}
                    </td>

                    {/* Preparer */}
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <UserCheck className="h-3 w-3 shrink-0" aria-hidden="true" />
                        <span className="truncate">{task.staffName}</span>
                      </span>
                    </td>

                    {/* Gate action */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        {canUpdateStatus && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleRequestRevision(task.id);
                            }}
                            aria-label={`Request revision on ${task.service} for ${task.clientCode}`}
                            className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                          >
                            <RotateCcw className="mr-1 h-3 w-3" aria-hidden="true" />
                            Request Revision
                          </Button>
                        )}
                        {canSignOffQueue ? (
                          <Button
                            size="sm"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleApprove(task);
                            }}
                            aria-label={`Sign off ${task.service} for ${task.clientCode} as CA(SA)`}
                            className="h-7 gap-1 bg-[#c4161c] px-2.5 text-[11px] font-medium text-white shadow-xs hover:bg-[#a01217] dark:hover:bg-[#d91b22]"
                          >
                            <ShieldCheck className="h-3 w-3" aria-hidden="true" />
                            Sign Off as CA(SA)
                          </Button>
                        ) : (
                          <Badge
                            variant="crimsonSubdued"
                            className="gap-1 px-1.5 py-0 font-mono text-[11px] font-medium"
                          >
                            <Lock className="h-3 w-3" aria-hidden="true" />
                            Partner Signature Required
                          </Badge>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

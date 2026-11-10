import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { CalendarDays, MessageSquare, Pause, Play, ShieldCheck, Square, Timer, UserCheck, X } from 'lucide-react';
import type { PracticeTaskItem } from './practice-tasks';
import { usePracticeStore } from '@/context/PracticeStoreContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { WORKFLOW_LANES, normalizeWorkflowStatus, type WorkflowStatus } from '@/lib/workflow';
import { cn } from '@/lib/utils';
import { can, isAssignedTo } from '@/lib/permissions';
import { StatutoryActionForm } from './StatutoryActionForm';
import { formatElapsed, useTimer } from '@/components/time/timer-context';
import { personInitials } from '@/lib/initials';

export interface TaskDetailPanelProps {
  task: PracticeTaskItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectClient?: (clientCode: string) => void;
  /** Lane the card was dropped on, preselected in the statutory form. */
  initialStatus?: WorkflowStatus;
}

const URGENCY_LABEL: Record<PracticeTaskItem['urgency'], string> = {
  overdue: 'Overdue',
  week: 'This week',
  month: 'This month',
  later: 'Later',
  done: 'Done',
  'no-date': 'No date',
};

function formatTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString().slice(0, 16).replace('T', ' ');
}

/**
 * Docked right-hand detail panel. The statutory controls are the shared
 * `StatutoryActionForm`, so gate validation stays authoritative; the rest of
 * the panel covers the reference board's meta rows, activity and comments.
 */
export function TaskDetailPanel({
  task,
  open,
  onOpenChange,
  onSelectClient,
  initialStatus,
}: TaskDetailPanelProps) {
  const { activity, taskStatusOverrides, currentUser, logActivity, permissions } = usePracticeStore();
  const { session, elapsedMs, startTimer, pauseTimer, resumeTimer, stopTimer } = useTimer();
  const taskAssigned = task ? isAssignedTo(currentUser.id, task) : false;
  const canUpdateStatus = can(
    currentUser.role,
    'Deadlines',
    'update-status',
    permissions.matrix,
    { assigned: taskAssigned }
  );
  const canLogTime = can(currentUser.role, 'Time', 'log-own', permissions.matrix, {
    assigned: taskAssigned,
  });
  const [comment, setComment] = React.useState('');

  React.useEffect(() => {
    if (open) setComment('');
  }, [open, task?.id]);

  if (!task) return null;

  const override = taskStatusOverrides[task.id];
  const status = normalizeWorkflowStatus(override?.status ?? task.status);
  const lane = WORKFLOW_LANES.find((entry) => entry.status === status);
  const clientActivity = activity
    .filter((event) => event.subline.includes(task.clientCode))
    .slice(0, 5);

  const submitComment = (event: React.FormEvent) => {
    event.preventDefault();
    const text = comment.trim();
    if (!text) return;
    logActivity({
      type: 'task',
      actorName: currentUser.name,
      actorInitials: personInitials(currentUser.name),
      tint: 'muted',
      text: `Commented: ${text}`,
      subline: `${task.clientCode} · ${task.service} ${task.period}`,
    });
    setComment('');
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[1px]" />
        <DialogPrimitive.Content
          className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-border bg-card shadow-2xl focus:outline-none"
          aria-describedby={undefined}
        >
          <div className="flex items-start justify-between gap-3 border-b border-border p-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="border-primary/30 bg-primary/5 font-mono text-[11px] text-primary"
                >
                  {task.service}
                </Badge>
                <DialogPrimitive.Title className="truncate text-sm font-semibold text-foreground">
                  {task.clientName}
                </DialogPrimitive.Title>
              </div>
              <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                {task.clientCode} · {task.period}
                {task.part ? ` · ${task.part}` : ''}
              </p>
            </div>
            <DialogPrimitive.Close asChild>
              <button
                type="button"
                aria-label="Close task panel"
                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </DialogPrimitive.Close>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            {/* Status + meta rows */}
            <div className="space-y-1.5 rounded-lg border border-border bg-muted/20 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  Lane
                </span>
                <span className="flex items-center gap-1.5 text-[11px] font-medium text-foreground">
                  <span
                    className={cn(
                      'h-1.5 w-1.5 rounded-full',
                      lane?.tone === 'done'
                        ? 'bg-foreground'
                        : lane?.tone === 'progress'
                          ? 'bg-[#c4161c]'
                          : lane?.tone === 'warning' || lane?.tone === 'waiting'
                            ? 'bg-amber-500'
                            : 'bg-muted-foreground/50'
                    )}
                    aria-hidden="true"
                  />
                  {status}
                </span>
              </div>
              <MetaRow icon={UserCheck} label="Owner" value={task.staffName} />
              <MetaRow
                icon={CalendarDays}
                label="Due"
                value={task.due ? `${task.due}${task.dueNote ? ` · ${task.dueNote}` : ''}` : 'Missing date'}
              />
              <div className="flex items-center justify-between gap-2 pt-0.5">
                <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  Labels
                </span>
                <span className="flex flex-wrap items-center justify-end gap-1.5">
                  <Badge variant="outline" className="font-mono text-[11px]">
                    {URGENCY_LABEL[task.urgency]}
                  </Badge>
                  {task.needsPartnerReview ? (
                    <Badge variant="crimsonSubdued" className="gap-1 font-mono text-[11px]">
                      <ShieldCheck className="h-3 w-3" /> Partner gate
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="font-mono text-[11px]">
                      Standard
                    </Badge>
                  )}
                </span>
              </div>
            </div>

            {/* Timer capture — this panel is modal, so the running clock for
                this task is actionable here as well as on the topbar chip. */}
            {session?.taskId === task.id ? (
              <div
                data-testid="task-timer"
                data-state={session.paused ? 'paused' : 'running'}
                className="flex items-center justify-between gap-2 rounded-lg border border-[#c4161c]/25 bg-[#c4161c]/5 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                    {session.paused ? 'Timer paused' : 'Timer running'}
                  </p>
                  <p
                    data-testid="task-timer-elapsed"
                    className="font-mono text-sm tabular-nums text-foreground"
                  >
                    {formatElapsed(elapsedMs)}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    data-testid="task-timer-toggle"
                    onClick={session.paused ? resumeTimer : pauseTimer}
                    className="gap-1"
                  >
                    {session.paused ? (
                      <Play className="h-3.5 w-3.5" />
                    ) : (
                      <Pause className="h-3.5 w-3.5" />
                    )}
                    {session.paused ? 'Resume' : 'Pause'}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    data-testid="task-timer-stop"
                    onClick={stopTimer}
                    className="gap-1"
                  >
                    <Square className="h-3 w-3" />
                    Stop
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  data-testid="task-start-timer"
                  disabled={session !== null || !canLogTime}
                  title={
                    !canLogTime
                      ? `${currentUser.role} cannot log time`
                      : session
                        ? 'A timer is already running — stop it before starting another.'
                        : 'Start a timer for this task'
                  }
                  onClick={() =>
                    canLogTime &&
                    startTimer({
                      clientCode: task.clientCode,
                      serviceCode: task.service,
                      taskId: task.id,
                      description: `${task.service} ${task.period}${task.part ? ` · ${task.part}` : ''}`,
                    })
                  }
                  className="w-full gap-1.5"
                >
                  <Timer className="h-3.5 w-3.5" />
                  {session ? 'Timer running' : 'Start timer'}
                </Button>
              </div>
            )}

            {/* Description */}
            <section>
              <h4 className="mb-1 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                Description
              </h4>
              <p className="text-xs leading-relaxed text-foreground">
                {task.service} return for {task.clientName} covering {task.period}
                {task.part ? ` (${task.part})` : ''}. Due {task.due ?? 'once the master data is complete'}
                {task.dueNote ? ` ${task.dueNote}.` : ''}
              </p>
            </section>

            {/* Statutory controls (authoritative gate handling) */}
            <section className="border-t border-border pt-3">
              <h4 className="mb-2 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                Statutory action
              </h4>
              {canUpdateStatus ? (
                <StatutoryActionForm
                  task={task}
                  compact
                  onClose={() => onOpenChange(false)}
                  onSelectClient={onSelectClient}
                  initialStatus={initialStatus}
                />
              ) : (
                <p className="rounded-lg border border-border bg-muted/20 p-3 text-[11px] leading-relaxed text-muted-foreground">
                  {currentUser.role} cannot update task status. Ask a Partner, the Compliance
                  Officer or an Accountant to move this return along.
                </p>
              )}
            </section>

            {/* Activity */}
            <section className="border-t border-border pt-3">
              <h4 className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                Activity
              </h4>
              <ul className="space-y-1.5">
                {override?.updatedAt && (
                  <li className="flex items-start gap-2 text-[11px] text-muted-foreground">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#c4161c]" aria-hidden="true" />
                    <span>
                      Status set to{' '}
                      <span className="font-medium text-foreground">{status}</span> ·{' '}
                      {formatTimestamp(override.updatedAt)}
                      {override.approvedBy ? ` · signed by ${override.approvedBy}` : ''}
                    </span>
                  </li>
                )}
                {clientActivity.map((event) => (
                  <li key={event.id} className="flex items-start gap-2 text-[11px] text-muted-foreground">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-border" aria-hidden="true" />
                    <span>
                      <span className="font-medium text-foreground">{event.actorName}</span>{' '}
                      {event.text} · {formatTimestamp(event.at)}
                    </span>
                  </li>
                ))}
                {!override?.updatedAt && clientActivity.length === 0 && (
                  <li className="text-[11px] italic text-muted-foreground">
                    No recorded activity for this client yet.
                  </li>
                )}
              </ul>
            </section>

            {/* Comment box */}
            <section className="border-t border-border pt-3">
              <h4 className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                <MessageSquare className="h-3 w-3" /> Comment
              </h4>
              <form onSubmit={submitComment} className="space-y-2">
                <textarea
                  rows={2}
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  placeholder="Add a note to the task activity trail"
                  aria-label="Task comment"
                  className="w-full resize-none rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground"
                />
                <div className="flex justify-end">
                  <Button type="submit" size="sm" variant="outline" disabled={!comment.trim()}>
                    Add comment
                  </Button>
                </div>
              </form>
            </section>

            {/* Keyboard shortcut hint */}
            <section className="rounded-lg border border-border bg-muted/20 p-3">
              <h4 className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                Board shortcuts
              </h4>
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
                <kbd className="rounded border border-border bg-card px-1 font-mono">←</kbd>
                <kbd className="rounded border border-border bg-card px-1 font-mono">→</kbd>
                move lane
                <kbd className="rounded border border-border bg-card px-1 font-mono">↑</kbd>
                <kbd className="rounded border border-border bg-card px-1 font-mono">↓</kbd>
                reorder
                <kbd className="rounded border border-border bg-card px-1 font-mono">1</kbd>–
                <kbd className="rounded border border-border bg-card px-1 font-mono">6</kbd>
                jump lane
                <kbd className="rounded border border-border bg-card px-1 font-mono">Enter</kbd>
                open
              </p>
            </section>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function MetaRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        <Icon className="h-3 w-3" />
        {label}
      </span>
      <span className="truncate text-[11px] text-foreground">{value}</span>
    </div>
  );
}

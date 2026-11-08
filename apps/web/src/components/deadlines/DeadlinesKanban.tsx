import * as React from 'react';
import type { PracticeTaskItem } from './practice-tasks';
import { Badge } from '@/components/ui/badge';
import { Calendar, UserCheck, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePracticeStore } from '@/context/PracticeStoreContext';
import {
  StatutoryActionModal,
  type WorkflowStatus,
} from './StatutoryActionModal';

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

export interface WorkflowBuckets {
  notStarted: PracticeTaskItem[];
  inProgress: PracticeTaskItem[];
  partnerReviewGate: PracticeTaskItem[];
  submitted: PracticeTaskItem[];
}

export function bucketWorkflowTasks(
  tasks: PracticeTaskItem[],
  overrides: Record<string, { status: string }>
): WorkflowBuckets {
  const notStarted: PracticeTaskItem[] = [];
  const inProgress: PracticeTaskItem[] = [];
  const partnerReviewGate: PracticeTaskItem[] = [];
  const submitted: PracticeTaskItem[] = [];

  for (const t of tasks) {
    const effectiveStatus = overrides[t.id]?.status || t.status || 'Not Started';
    if (effectiveStatus === 'Submitted') {
      submitted.push(t);
    } else if (effectiveStatus === 'Partner Review Gate') {
      partnerReviewGate.push(t);
    } else if (effectiveStatus === 'In Progress') {
      inProgress.push(t);
    } else {
      notStarted.push(t);
    }
  }

  return {
    notStarted,
    inProgress,
    partnerReviewGate,
    submitted,
  };
}

export interface DeadlinesKanbanProps {
  tasks: PracticeTaskItem[];
  asOfDate: string;
  onSelectClient: (code: string) => void;
  horizon?: '30' | '90' | '365';
  groupBy?: 'workflow' | 'urgency';
}

export function DeadlinesKanban({
  tasks,
  asOfDate,
  onSelectClient,
  horizon = '30',
  groupBy = 'workflow',
}: DeadlinesKanbanProps) {
  const { taskStatusOverrides, updateTaskStatus } = usePracticeStore();
  const [selectedTask, setSelectedTask] = React.useState<PracticeTaskItem | null>(null);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [draggedTaskId, setDraggedTaskId] = React.useState<string | null>(null);
  const [activeDropColumn, setActiveDropColumn] = React.useState<string | null>(null);
  const [pendingTargetStatus, setPendingTargetStatus] = React.useState<WorkflowStatus | undefined>(undefined);

  const urgencyBuckets = React.useMemo(
    () => bucketKanbanTasks(tasks, asOfDate),
    [tasks, asOfDate]
  );
  const workflowBuckets = React.useMemo(
    () => bucketWorkflowTasks(tasks, taskStatusOverrides),
    [tasks, taskStatusOverrides]
  );

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId);
    setDraggedTaskId(taskId);
  };

  const handleDragOver = (e: React.DragEvent, colId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (activeDropColumn !== colId) {
      setActiveDropColumn(colId);
    }
  };

  const handleDragLeave = () => {
    setActiveDropColumn(null);
  };

  const handleDrop = (e: React.DragEvent, targetStatusOrCol: string) => {
    e.preventDefault();
    setActiveDropColumn(null);
    const taskId = draggedTaskId || e.dataTransfer.getData('text/plain');
    setDraggedTaskId(null);

    if (!taskId) return;
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    if (groupBy === 'workflow') {
      const targetStatus = targetStatusOrCol as WorkflowStatus;
      if (targetStatus === 'Partner Review Gate' || targetStatus === 'Submitted') {
        setSelectedTask(task);
        setPendingTargetStatus(targetStatus);
        setModalOpen(true);
        updateTaskStatus(taskId, targetStatus);
      }
    }
  };

  const handleDoubleClickCard = (e: React.MouseEvent, task: PracticeTaskItem) => {
    e.stopPropagation();
    setSelectedTask(task);
    setPendingTargetStatus(undefined);
    setModalOpen(true);
  };

  const columns =
    groupBy === 'workflow'
      ? [
          {
            id: 'Not Started',
            title: 'Not Started',
            count: workflowBuckets.notStarted.length,
            items: workflowBuckets.notStarted,
            badgeVariant: 'outline' as const,
            borderColor: 'border-border/80',
          },
          {
            id: 'In Progress',
            title: 'In Progress',
            count: workflowBuckets.inProgress.length,
            items: workflowBuckets.inProgress,
            badgeVariant: 'secondary' as const,
            borderColor: 'border-blue-500/40',
          },
          {
            id: 'Partner Review Gate',
            title: 'Partner Review Gate',
            count: workflowBuckets.partnerReviewGate.length,
            items: workflowBuckets.partnerReviewGate,
            badgeVariant: 'warning' as const,
            borderColor: 'border-amber-500/40',
          },
          {
            id: 'Submitted',
            title: 'Submitted to SARS / CIPC',
            count: workflowBuckets.submitted.length,
            items: workflowBuckets.submitted,
            badgeVariant: 'default' as const,
            borderColor: 'border-emerald-500/40',
          },
        ]
      : [
          {
            id: 'overdue',
            title: 'Overdue Filings',
            count: urgencyBuckets.overdue.length,
            items: urgencyBuckets.overdue,
            badgeVariant: 'destructive' as const,
            borderColor: 'border-destructive/40',
          },
          {
            id: 'due7',
            title: 'Due in 7 Days',
            count: urgencyBuckets.due7Days.length,
            items: urgencyBuckets.due7Days,
            badgeVariant: 'crimsonSubdued' as const,
            borderColor: 'border-[#c4161c]/40',
          },
          {
            id: 'due30',
            title:
              horizon === '30'
                ? 'Due in 8–30 Days'
                : horizon === '90'
                ? 'Upcoming (≤ 90 Days)'
                : 'Upcoming (≤ 365 Days)',
            count: urgencyBuckets.due30Days.length,
            items: urgencyBuckets.due30Days,
            badgeVariant: 'outline' as const,
            borderColor: 'border-border/80',
          },
          {
            id: 'missing',
            title: 'Missing a Date (Blockers)',
            count: urgencyBuckets.missingDate.length,
            items: urgencyBuckets.missingDate,
            badgeVariant: 'warning' as const,
            borderColor: 'border-amber-500/40',
          },
        ];

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start select-none">
        {columns.map((col) => {
          const isDropActive = activeDropColumn === col.id;

          return (
            <div
              key={col.id}
              onDragOver={(e) => handleDragOver(e, col.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, col.id)}
              className={cn(
                'border rounded-lg bg-card/60 flex flex-col max-h-[calc(100vh-250px)] shadow-xs transition-colors',
                col.borderColor,
                isDropActive && 'ring-2 ring-primary bg-primary/5'
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
                  col.items.map((task) => {
                    const override = taskStatusOverrides[task.id];
                    const isSubmitted = override?.status === 'Submitted';

                    return (
                      <div
                        key={task.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, task.id)}
                        onDoubleClick={(e) => handleDoubleClickCard(e, task)}
                        onKeyDown={(e) => {
                          if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
                            e.preventDefault();
                            handleDoubleClickCard(e as unknown as React.MouseEvent, task);
                          }
                        }}
                        tabIndex={0}
                        role="button"
                        aria-label={`Open statutory action modal for ${task.clientName} (${task.clientCode})`}
                        className={cn(
                          'p-3 rounded-md border bg-card hover:bg-muted/40 transition-all text-left space-y-2 cursor-grab active:cursor-grabbing focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary',
                          isSubmitted
                            ? 'border-emerald-500/40 bg-emerald-500/5'
                            : 'border-border/80 hover:border-primary/50'
                        )}
                      >
                        {/* Header: Service + Client Code */}
                        <div className="flex items-center justify-between gap-1.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs font-bold text-foreground">
                              {task.service}
                            </span>
                            {task.part && (
                              <span className="text-[10px] font-mono text-muted-foreground">
                                ({task.part})
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectClient(task.clientCode);
                            }}
                            className="font-mono text-[11px] text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                            title="Open client record"
                          >
                            {task.clientCode}
                          </button>
                        </div>

                        {/* Client Name */}
                        <div className="text-xs font-medium text-foreground truncate">
                          {task.clientName}
                        </div>

                        {/* Due Date & Holiday Rollback */}
                        <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground pt-1 border-t border-border/60">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 shrink-0" />
                            <span className={cn(task.due && task.due < asOfDate && 'text-destructive font-semibold')}>
                              {task.due || 'Missing date'}
                            </span>
                            {task.dueNote && (
                              <span
                                className="text-[#c4161c] text-xs font-bold"
                                title={task.dueNote}
                              >
                                ↩
                              </span>
                            )}
                          </div>

                          {task.daysUntilDue !== undefined && (
                            <span
                              className={cn(
                                'text-[10px]',
                                task.daysUntilDue < 0
                                  ? 'text-destructive font-bold'
                                  : task.daysUntilDue <= 7
                                  ? 'text-[#c4161c] font-semibold'
                                  : 'text-muted-foreground'
                              )}
                            >
                              {task.daysUntilDue < 0
                                ? `${Math.abs(task.daysUntilDue)}d overdue`
                                : `${task.daysUntilDue}d left`}
                            </span>
                          )}
                        </div>

                        {/* Footer: Assignee & Partner Review / SARS Ref */}
                        <div className="flex items-center justify-between pt-1 text-[10px]">
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <UserCheck className="h-3 w-3" />
                            {task.staffName}
                          </span>

                          {override?.sarsReference ? (
                            <span className="font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              {override.sarsReference}
                            </span>
                          ) : task.needsPartnerReview ? (
                            <span className="text-amber-500 font-semibold flex items-center gap-0.5">
                              <ShieldCheck className="h-3 w-3" />
                              Partner Gate
                            </span>
                          ) : null}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Statutory Action Modal */}
      <StatutoryActionModal
        task={selectedTask}
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSelectClient={onSelectClient}
        initialStatus={pendingTargetStatus}
      />
    </>
  );
}

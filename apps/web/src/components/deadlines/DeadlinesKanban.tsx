import * as React from 'react';
import type { Client, StaffMember } from 'fdoncall-practice/domain/types';
import { diffDays } from 'fdoncall-practice/domain/dates';
import type { PracticeTaskItem } from './practice-tasks';
import { usePracticeStore, type AdHocTask } from '@/context/PracticeStoreContext';
import {
  KanbanBoard,
  type KanbanCardBase,
  type KanbanColumn,
  type KanbanTone,
} from '@/components/kanban/KanbanBoard';
import {
  WORKFLOW_LANES,
  canMoveStatus,
  normalizeWorkflowStatus,
  type WorkflowStatus,
} from '@/lib/workflow';
import { AvatarChip, PriorityPill, type PriorityLevel } from '@/components/ui/list-primitives';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Calendar, CheckCircle2, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TaskDetailPanel } from './TaskDetailPanel';
import { AdHocTaskModal } from './AdHocTaskModal';

/* ---------------------------------------------------------------------------
 * Urgency grouping (existing table/board KPI view, retained).
 * ------------------------------------------------------------------------- */

export interface KanbanBuckets {
  overdue: DeadlineCard[];
  due7Days: DeadlineCard[];
  due30Days: DeadlineCard[];
  missingDate: DeadlineCard[];
}

/** Urgency grouping across statutory and ad-hoc cards alike. */
export function bucketCardsByDue(cards: DeadlineCard[], asOfDate: string): KanbanBuckets {
  const overdue: DeadlineCard[] = [];
  const due7Days: DeadlineCard[] = [];
  const due30Days: DeadlineCard[] = [];
  const missingDate: DeadlineCard[] = [];

  for (const card of cards) {
    if (!card.due) {
      missingDate.push(card);
    } else if (card.due < asOfDate) {
      overdue.push(card);
    } else if (card.daysUntilDue !== undefined && card.daysUntilDue <= 7) {
      due7Days.push(card);
    } else {
      due30Days.push(card);
    }
  }

  return { overdue, due7Days, due30Days, missingDate };
}

/* ---------------------------------------------------------------------------
 * Workflow lanes.
 * ------------------------------------------------------------------------- */

export interface WorkflowBuckets {
  notStarted: PracticeTaskItem[];
  inProgress: PracticeTaskItem[];
  awaitingClient: PracticeTaskItem[];
  partnerReviewGate: PracticeTaskItem[];
  approvedReadyToLodge: PracticeTaskItem[];
  submitted: PracticeTaskItem[];
}

export function effectiveWorkflowStatus(
  task: { id: string; status: string },
  overrides: Record<string, { status: string }>
): WorkflowStatus {
  return normalizeWorkflowStatus(overrides[task.id]?.status ?? task.status);
}

export function bucketWorkflowTasks(
  tasks: PracticeTaskItem[],
  overrides: Record<string, { status: string }>
): WorkflowBuckets {
  const buckets: WorkflowBuckets = {
    notStarted: [],
    inProgress: [],
    awaitingClient: [],
    partnerReviewGate: [],
    approvedReadyToLodge: [],
    submitted: [],
  };

  for (const task of tasks) {
    const status = effectiveWorkflowStatus(task, overrides);
    switch (status) {
      case 'In Progress':
        buckets.inProgress.push(task);
        break;
      case 'Awaiting Client':
        buckets.awaitingClient.push(task);
        break;
      case 'Partner Review Gate':
        buckets.partnerReviewGate.push(task);
        break;
      case 'Approved (Ready to Lodge)':
        buckets.approvedReadyToLodge.push(task);
        break;
      case 'Submitted':
        buckets.submitted.push(task);
        break;
      default:
        buckets.notStarted.push(task);
    }
  }

  return buckets;
}

export type AdhocBuckets = Record<keyof WorkflowBuckets, AdHocTask[]>;

export function bucketAdhocTasks(tasks: AdHocTask[]): AdhocBuckets {
  const buckets: AdhocBuckets = {
    notStarted: [],
    inProgress: [],
    awaitingClient: [],
    partnerReviewGate: [],
    approvedReadyToLodge: [],
    submitted: [],
  };

  for (const task of tasks) {
    switch (normalizeWorkflowStatus(task.status)) {
      case 'In Progress':
        buckets.inProgress.push(task);
        break;
      case 'Awaiting Client':
        buckets.awaitingClient.push(task);
        break;
      case 'Partner Review Gate':
        buckets.partnerReviewGate.push(task);
        break;
      case 'Approved (Ready to Lodge)':
        buckets.approvedReadyToLodge.push(task);
        break;
      case 'Submitted':
        buckets.submitted.push(task);
        break;
      default:
        buckets.notStarted.push(task);
    }
  }

  return buckets;
}

/* ---------------------------------------------------------------------------
 * Unified card model (statutory + ad-hoc flow through the same lanes).
 * ------------------------------------------------------------------------- */

export interface DeadlineCard extends KanbanCardBase {
  id: string;
  kind: 'statutory' | 'adhoc';
  status: WorkflowStatus;
  clientCode: string;
  clientName: string;
  /** Service code for statutory tasks, `AD HOC` for manual tasks. */
  serviceLabel: string;
  period?: string;
  part?: string;
  due?: string;
  dueNote?: string;
  daysUntilDue?: number;
  staffId: string;
  staffName: string;
  needsPartnerReview: boolean;
  priority: PriorityLevel;
  sarsReference?: string;
  blockedReason?: string;
  description?: string;
  task?: PracticeTaskItem;
  adhoc?: AdHocTask;
}

const URGENCY_PRIORITY: Record<string, PriorityLevel> = {
  overdue: 'High',
  week: 'High',
  month: 'Medium',
  later: 'Low',
  'no-date': 'Low',
  done: 'Low',
};

function adhocPriority(due: string | undefined, asOfDate: string): PriorityLevel {
  if (!due) return 'Low';
  const days = diffDays(due, asOfDate);
  if (days < 0 || days <= 7) return 'High';
  if (days <= 30) return 'Medium';
  return 'Low';
}

export interface DeadlineColumnsParams {
  statutoryBuckets: WorkflowBuckets;
  adhocBuckets: AdhocBuckets;
  overrides: Record<string, { status: string; sarsReference?: string }>;
  staff: Pick<StaffMember, 'id' | 'name'>[];
  clients: Pick<Client, 'code' | 'name'>[];
  asOfDate: string;
}

/** Master-data gaps leave a statutory task without a due date: it is blocked. */
function statutoryCardFrom(
  task: PracticeTaskItem,
  status: WorkflowStatus,
  overrides: DeadlineColumnsParams['overrides']
): DeadlineCard {
  return {
    id: task.id,
    kind: 'statutory',
    status,
    clientCode: task.clientCode,
    clientName: task.clientName,
    serviceLabel: task.service,
    period: task.period,
    part: task.part,
    due: task.due,
    dueNote: task.dueNote,
    daysUntilDue: task.daysUntilDue,
    staffId: task.staffId,
    staffName: task.staffName,
    needsPartnerReview: task.needsPartnerReview,
    priority: URGENCY_PRIORITY[task.urgency] ?? 'Low',
    sarsReference: overrides[task.id]?.sarsReference,
    blockedReason: task.due
      ? undefined
      : 'Missing statutory due date — complete the client master data',
    task,
  };
}

function adhocCardFrom(
  task: AdHocTask,
  params: Pick<DeadlineColumnsParams, 'staff' | 'clients' | 'asOfDate'>
): DeadlineCard {
  const client = params.clients.find((entry) => entry.code === task.clientCode);
  const assignee = params.staff.find((entry) => entry.id === task.assigneeId);
  return {
    id: task.id,
    kind: 'adhoc',
    status: normalizeWorkflowStatus(task.status),
    clientCode: task.clientCode,
    clientName: client?.name ?? task.clientCode,
    serviceLabel: 'AD HOC',
    due: task.dueDate,
    daysUntilDue: task.dueDate ? diffDays(task.dueDate, params.asOfDate) : undefined,
    staffId: task.assigneeId,
    staffName: assignee?.name ?? 'Practice Pool',
    needsPartnerReview: false,
    priority: adhocPriority(task.dueDate, params.asOfDate),
    blockedReason: task.blockedReason,
    description: task.description,
    adhoc: task,
  };
}

const LANE_TONE: Record<WorkflowStatus, KanbanTone> = {
  'Not Started': 'neutral',
  'In Progress': 'progress',
  'Awaiting Client': 'waiting',
  'Partner Review Gate': 'warning',
  'Approved (Ready to Lodge)': 'ready',
  Submitted: 'done',
};

function sortCards(cards: DeadlineCard[]): DeadlineCard[] {
  return [...cards].sort((a, b) => {
    const dueA = a.due ?? '9999-99-99';
    const dueB = b.due ?? '9999-99-99';
    if (dueA !== dueB) return dueA.localeCompare(dueB);
    return a.clientCode.localeCompare(b.clientCode);
  });
}

export function buildDeadlineColumns(params: DeadlineColumnsParams): KanbanColumn<DeadlineCard>[] {
  const { statutoryBuckets, adhocBuckets, overrides } = params;

  const statutory = {
    notStarted: statutoryBuckets.notStarted.map((task) =>
      statutoryCardFrom(task, effectiveWorkflowStatus(task, overrides), overrides)
    ),
    inProgress: statutoryBuckets.inProgress.map((task) =>
      statutoryCardFrom(task, 'In Progress', overrides)
    ),
    awaitingClient: statutoryBuckets.awaitingClient.map((task) =>
      statutoryCardFrom(task, 'Awaiting Client', overrides)
    ),
    partnerReviewGate: statutoryBuckets.partnerReviewGate.map((task) =>
      statutoryCardFrom(task, 'Partner Review Gate', overrides)
    ),
    approvedReadyToLodge: statutoryBuckets.approvedReadyToLodge.map((task) =>
      statutoryCardFrom(task, 'Approved (Ready to Lodge)', overrides)
    ),
    submitted: statutoryBuckets.submitted.map((task) =>
      statutoryCardFrom(task, 'Submitted', overrides)
    ),
  };

  const adhoc = {
    notStarted: adhocBuckets.notStarted.map((task) => adhocCardFrom(task, params)),
    inProgress: adhocBuckets.inProgress.map((task) => adhocCardFrom(task, params)),
    awaitingClient: adhocBuckets.awaitingClient.map((task) => adhocCardFrom(task, params)),
    partnerReviewGate: adhocBuckets.partnerReviewGate.map((task) => adhocCardFrom(task, params)),
    approvedReadyToLodge: adhocBuckets.approvedReadyToLodge.map((task) =>
      adhocCardFrom(task, params)
    ),
    submitted: adhocBuckets.submitted.map((task) => adhocCardFrom(task, params)),
  };

  const bucketByLane: Record<WorkflowStatus, keyof WorkflowBuckets> = {
    'Not Started': 'notStarted',
    'In Progress': 'inProgress',
    'Awaiting Client': 'awaitingClient',
    'Partner Review Gate': 'partnerReviewGate',
    'Approved (Ready to Lodge)': 'approvedReadyToLodge',
    Submitted: 'submitted',
  };

  return WORKFLOW_LANES.map((lane) => {
    const key = bucketByLane[lane.status];
    const cards = sortCards([...statutory[key], ...adhoc[key]]);
    return {
      id: lane.status,
      title: lane.label,
      tone: LANE_TONE[lane.status],
      hint: lane.hint,
      cards,
    };
  });
}

/* ---------------------------------------------------------------------------
 * Board component.
 * ------------------------------------------------------------------------- */

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
  const {
    taskStatusOverrides,
    updateTaskStatus,
    adhocTasks,
    updateAdhocTask,
    staff,
    clients,
    currentUser,
    logActivity,
  } = usePracticeStore();

  const [selectedTask, setSelectedTask] = React.useState<PracticeTaskItem | null>(null);
  const [panelOpen, setPanelOpen] = React.useState(false);
  const [pendingTargetStatus, setPendingTargetStatus] = React.useState<
    WorkflowStatus | undefined
  >(undefined);
  const [adhocOpen, setAdhocOpen] = React.useState(false);
  const [adhocEditing, setAdhocEditing] = React.useState<AdHocTask | null>(null);
  const [adhocInitialStatus, setAdhocInitialStatus] = React.useState<WorkflowStatus>('Not Started');
  const [feedback, setFeedback] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => setFeedback(null), 5000);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  const workflowColumns = React.useMemo(
    () =>
      buildDeadlineColumns({
        statutoryBuckets: bucketWorkflowTasks(tasks, taskStatusOverrides),
        adhocBuckets: bucketAdhocTasks(adhocTasks),
        overrides: taskStatusOverrides,
        staff,
        clients,
        asOfDate,
      }),
    [tasks, taskStatusOverrides, adhocTasks, staff, clients, asOfDate]
  );

  const allCards = React.useMemo(
    () => workflowColumns.flatMap((column) => column.cards),
    [workflowColumns]
  );

  const urgencyColumns = React.useMemo<KanbanColumn<DeadlineCard>[]>(() => {
    const { overdue, due7Days, due30Days, missingDate } = bucketCardsByDue(allCards, asOfDate);

    return [
      {
        id: 'overdue',
        title: 'Overdue Filings',
        tone: 'danger' as const,
        hint: 'Past the statutory due date',
        cards: sortCards(overdue),
      },
      {
        id: 'due7',
        title: 'Due in 7 Days',
        tone: 'progress' as const,
        hint: 'Urgent SARS / CIPC obligations',
        cards: sortCards(due7Days),
      },
      {
        id: 'due30',
        title:
          horizon === '30'
            ? 'Due in 8–30 Days'
            : horizon === '90'
              ? 'Upcoming (≤ 90 Days)'
              : 'Upcoming (≤ 365 Days)',
        tone: 'neutral' as const,
        hint: 'Current operational horizon',
        cards: sortCards(due30Days),
      },
      {
        id: 'missing',
        title: 'Missing a Date (Blockers)',
        tone: 'warning' as const,
        hint: 'Waiting on CIPC / SARS master data',
        cards: sortCards(missingDate),
      },
    ];
  }, [allCards, asOfDate, horizon]);

  const openCard = (card: DeadlineCard) => {
    if (card.kind === 'adhoc' && card.adhoc) {
      setAdhocEditing(card.adhoc);
      setAdhocInitialStatus(card.status);
      setAdhocOpen(true);
      return;
    }
    if (card.task) {
      setSelectedTask(card.task);
      setPendingTargetStatus(undefined);
      setPanelOpen(true);
    }
  };

  const handleMove = (cardId: string, toColumnId: string) => {
    if (groupBy !== 'workflow') {
      setFeedback('Switch to Workflow status grouping to move cards between lanes.');
      return;
    }

    const card = allCards.find((entry) => entry.id === cardId);
    if (!card) return;

    const targetStatus = toColumnId as WorkflowStatus;
    if (card.status === targetStatus) return;

    const ctx = { needsPartnerReview: card.needsPartnerReview, actorRole: currentUser.role };
    if (!canMoveStatus(card.status, targetStatus, ctx)) {
      if (targetStatus === 'Partner Review Gate') {
        setFeedback(
          `${card.serviceLabel} does not require partner review — move it straight to Approved or Submitted.`
        );
      } else {
        setFeedback(
          `Partner sign-off is required before ${card.serviceLabel} can be approved or submitted.`
        );
      }
      return;
    }

    if (card.kind === 'adhoc' && card.adhoc) {
      updateAdhocTask(card.adhoc.id, { status: targetStatus });
      logActivity({
        type: 'task',
        actorName: currentUser.name,
        actorInitials: currentUser.name.slice(0, 2).toUpperCase(),
        tint: 'muted',
        text: `Moved ad-hoc task “${card.adhoc.description}” to ${targetStatus}`,
        subline: `${card.clientCode} · ${card.clientName}`,
      });
      return;
    }

    const taskId = card.id;
    // Approval and submission capture the partner signature and SARS reference
    // through the statutory form — never straight from a drag.
    if (targetStatus === 'Approved (Ready to Lodge)' || targetStatus === 'Submitted') {
      if (card.task) {
        setSelectedTask(card.task);
        setPendingTargetStatus(targetStatus);
        setPanelOpen(true);
      }
      return;
    }
    updateTaskStatus(taskId, targetStatus);
  };

  const columns = groupBy === 'workflow' ? workflowColumns : urgencyColumns;

  return (
    <>
      <KanbanBoard
        columns={columns}
        onMove={handleMove}
        onOpenCard={openCard}
        keyboardEnabled={groupBy === 'workflow'}
        allowAdd={
          groupBy === 'workflow'
            ? (columnId) => {
                if (columnId === 'Partner Review Gate') {
                  setFeedback(
                    'Ad-hoc tasks never enter the partner review gate — add the task to another lane.'
                  );
                  return;
                }
                setAdhocEditing(null);
                setAdhocInitialStatus(columnId as WorkflowStatus);
                setAdhocOpen(true);
              }
            : undefined
        }
        renderCard={(card) => <DeadlineBoardCard card={card} asOfDate={asOfDate} />}
      />

      {feedback && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 left-1/2 z-[60] -translate-x-1/2 rounded-lg border border-border bg-card px-3.5 py-2 text-xs text-foreground shadow-lg"
        >
          {feedback}
        </div>
      )}

      <TaskDetailPanel
        task={selectedTask}
        open={panelOpen}
        onOpenChange={(open) => {
          setPanelOpen(open);
          if (!open) setPendingTargetStatus(undefined);
        }}
        onSelectClient={onSelectClient}
        initialStatus={pendingTargetStatus}
      />

      <AdHocTaskModal
        open={adhocOpen}
        onOpenChange={(open) => {
          setAdhocOpen(open);
          if (!open) setAdhocEditing(null);
        }}
        task={adhocEditing}
        initialStatus={adhocInitialStatus}
      />

    </>
  );
}

/* ---------------------------------------------------------------------------
 * Card body.
 * ------------------------------------------------------------------------- */

const AVATAR_TINTS = ['crimson', 'amber', 'muted'] as const;

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function DeadlineBoardCard({ card, asOfDate }: { card: DeadlineCard; asOfDate: string }) {
  const blocked = Boolean(card.blockedReason);
  const overdue = Boolean(card.due && card.due < asOfDate);
  const tint = AVATAR_TINTS[card.clientCode.length % AVATAR_TINTS.length];

  return (
    <div className="space-y-1.5">
      <div className="flex items-start justify-between gap-2 pr-5">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="font-mono text-[11px] font-semibold text-foreground">
            {card.serviceLabel}
          </span>
          {card.part && (
            <span className="font-mono text-[9px] text-muted-foreground">({card.part})</span>
          )}
        </div>
        <PriorityPill level={card.priority} />
      </div>

      <p className="truncate text-xs font-medium text-foreground">{card.clientName}</p>

      <p className="font-mono text-[10px] text-muted-foreground">
        {card.kind === 'statutory' ? (
          <>
            {card.clientCode}
            {card.period ? ` · ${card.period}` : ''}
          </>
        ) : (
          <>
            {card.clientCode} · ad-hoc
          </>
        )}
      </p>

      {card.kind === 'adhoc' && card.description && (
        <p className="line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
          {card.description}
        </p>
      )}

      {blocked && (
        <div className="flex items-start gap-1 rounded-md border border-destructive/30 bg-destructive/5 px-1.5 py-1 text-[10px] leading-snug text-destructive">
          <AlertCircle className="mt-px h-3 w-3 shrink-0" />
          <span>Blocked: {card.blockedReason}</span>
        </div>
      )}

      <div className="flex items-center justify-between gap-2 border-t border-border/60 pt-1.5">
        <span className="flex items-center gap-1 font-mono text-[10px] text-muted-foreground">
          <Calendar className="h-3 w-3 shrink-0" />
          <span className={cn(overdue && 'font-semibold text-destructive')}>
            {card.due || 'No date'}
          </span>
          {card.dueNote && (
            <span className="font-bold text-[#c4161c]" title={`Holiday rollback: ${card.dueNote}`}>
              ↩
            </span>
          )}
        </span>

        <span className="flex items-center gap-1.5">
          {card.sarsReference ? (
            <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
          ) : card.needsPartnerReview ? (
            <ShieldCheck className="h-3 w-3 text-amber-500" />
          ) : null}
          <AvatarChip initials={initials(card.staffName)} tint={tint} />
        </span>
      </div>

      {card.needsPartnerReview && (
        <Badge variant="crimsonSubdued" className="gap-1 font-mono text-[9px]">
          <ShieldCheck className="h-2.5 w-2.5" /> Partner review
        </Badge>
      )}
    </div>
  );
}

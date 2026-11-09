import { diffDays } from 'fdoncall-practice/domain/dates';
import type { AdHocTask } from '@/context/PracticeStoreContext';
import type { DeadlineKpiFilter } from '@/types/navigation';

/** Fields a practice user supplies when creating a manual board task. */
export interface AdHocTaskDraft {
  clientCode: string;
  description: string;
  assigneeId: string;
  dueDate?: string;
}

/**
 * Ad-hoc tasks are practice-created work items. They carry no statutory due
 * logic and never receive a partner-review gate.
 */
export function createAdHocTask(draft: AdHocTaskDraft, now: Date = new Date()): AdHocTask {
  return {
    id: `adhoc-${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
    clientCode: draft.clientCode,
    description: draft.description.trim(),
    assigneeId: draft.assigneeId,
    dueDate: draft.dueDate || undefined,
    status: 'Not Started',
    createdAt: now.toISOString(),
  };
}

export function adHocTaskIsValid(draft: AdHocTaskDraft): boolean {
  return Boolean(draft.clientCode && draft.assigneeId && draft.description.trim());
}

export interface AdHocFilterOptions {
  /** Client deep-link / filter badge. */
  clientCode?: string;
  /** Assignee filter; `all` or absent means every assignee. */
  staffId?: string;
  /** Return-type filter; ad-hoc work has no return type. */
  serviceCode?: string;
  horizon: '30' | '90' | '365';
  kpiFilter: DeadlineKpiFilter;
  asOfDate: string;
}

const HORIZON_DAYS: Record<'30' | '90', number> = {
  '30': 30,
  '90': 90,
};

/**
 * Board filters applied to manual tasks, so the deadlines board never shows
 * another client's ad-hoc card under a client deep link.
 *
 * Rules:
 * - client and assignee filters match `clientCode` / `assigneeId`;
 * - a specific return-type filter hides ad-hoc work (it has no service code);
 * - an undated ad-hoc task belongs to no horizon bucket and to no KPI bucket
 *   except `missing`, so it stays visible in every horizon — the same triage
 *   treatment `filterPracticeTasks` gives undated statutory tasks;
 * - dated ad-hoc tasks follow the statutory horizon/KPI date ranges.
 */
export function filterAdhocTasks(
  tasks: AdHocTask[],
  options: AdHocFilterOptions
): AdHocTask[] {
  return tasks.filter((task) => {
    if (options.clientCode && task.clientCode !== options.clientCode) return false;

    if (options.staffId && options.staffId !== 'all' && task.assigneeId !== options.staffId) {
      return false;
    }

    if (options.serviceCode && options.serviceCode !== 'all') return false;

    const days = task.dueDate ? diffDays(task.dueDate, options.asOfDate) : undefined;

    if (options.kpiFilter === 'overdue') return days !== undefined && days < 0;
    if (options.kpiFilter === 'due7') return days !== undefined && days >= 0 && days <= 7;
    if (options.kpiFilter === 'due30') return days !== undefined && days >= 0 && days <= 30;
    if (options.kpiFilter === 'missing') return days === undefined;

    if (days === undefined) return true;
    if (days < 0) return true;
    // "Full year" is the unfiltered view: `filterPracticeTasks` has no cutoff
    // at 365 days either, so ad-hoc work stays consistent with statutory tasks.
    if (options.horizon === '365') return true;
    return days <= HORIZON_DAYS[options.horizon];
  });
}

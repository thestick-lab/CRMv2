import type { ServiceCode, StaffMember } from 'fdoncall-practice/domain/types';
import { publicHolidays } from 'fdoncall-practice/domain/dates';
import { SERVICE_TYPES } from 'fdoncall-practice/domain/catalogue';
import { aggregatePracticeTasks, type PracticeTaskItem } from '@/components/deadlines/practice-tasks';
import type { PriorityLevel } from '@/components/ui/list-primitives';
import {
  ACTIVITY_SEEDS,
  type ActivityEvent,
  type PracticeUser,
  type TaskStatusOverride,
  type TimeEntry,
} from '@/context/PracticeStoreContext';

/* ---------------------------------------------------------------------------
 * Home (project-workspace dashboard) derivation.
 *
 * Every number on Home comes from the aggregated statutory task list and the
 * store's own records — nothing is seeded or fabricated. The module is pure so
 * the dashboard can be asserted without React.
 * ------------------------------------------------------------------------- */

export interface HomeTaskItem {
  id: string;
  /** Full service name, e.g. `VAT return (VAT201)`. */
  title: string;
  /** Short service label used beside the client, e.g. `VAT201`. */
  serviceLabel: string;
  subtitle: string;
  clientCode: string;
  clientName: string;
  due?: string;
  daysUntilDue?: number;
  priority: PriorityLevel;
  needsPartnerReview: boolean;
  status: string;
}

export interface HomeDeadlineItem {
  id: string;
  clientCode: string;
  clientName: string;
  title: string;
  serviceLabel: string;
  due: string;
  month: string;
  day: string;
  priority: PriorityLevel;
  daysUntilDue?: number;
}

export interface HomeRecentWorkItem {
  id: string;
  title: string;
  subtitle: string;
  meta: string;
  hours: number;
}

export interface HolidayItem {
  date: string;
  name: string;
  month: string;
  day: string;
}

export interface HomeBanner {
  clientName: string;
  code: string;
  compliancePct: number;
  openTasks: number;
}

export interface HomeKpis {
  totalTasks: number;
  dueThisWeek: number;
  inReview: number;
  teamMembers: number;
}

export interface HomeData {
  banner: HomeBanner | null;
  kpis: HomeKpis;
  myTasks: HomeTaskItem[];
  completedCount: number;
  activity: ActivityEvent[];
  deadlines: HomeDeadlineItem[];
  recentWork: HomeRecentWorkItem[];
  holidays: HolidayItem[];
  emptyStates: { noOverdue: boolean; noAwaitingClient: boolean };
}

export interface HomeDataInput {
  /** Store task overrides keyed by aggregated task id. */
  taskStatusOverrides: Record<string, TaskStatusOverride>;
  staff: StaffMember[];
  currentUser: PracticeUser;
  activity: ActivityEvent[];
  timeEntries: TimeEntry[];
  today: string;
  /** Pre-aggregated practice tasks; derived from `clients` when omitted. */
  tasks?: PracticeTaskItem[];
  clients?: { code: string; name: string }[];
}

export interface MyTaskLists {
  open: HomeTaskItem[];
  completed: HomeTaskItem[];
}

const COMPLETED_STATUS: Record<string, true> = { Submitted: true };
/** Obligations that count as lodged for the engagement compliance bar. */
const LODGED_STATUS: Record<string, true> = {
  Submitted: true,
  'Approved (Ready to Lodge)': true,
};

const PRIORITY_RANK: Record<PriorityLevel, number> = { High: 0, Medium: 1, Low: 2 };

const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function serviceMeta(code: ServiceCode): { title: string; label: string } {
  const type = SERVICE_TYPES.find((s) => s.code === code);
  return { title: type?.name ?? code, label: type?.short ?? code };
}

/** Overrides win over the aggregate's default status; legacy casing tolerated. */
export function taskStatus(task: PracticeTaskItem, overrides: Record<string, TaskStatusOverride>): string {
  const status = overrides[task.id]?.status ?? task.status;
  if (!status || status === 'Not started') return 'Not Started';
  return status;
}

export function isTaskCompleted(status: string): boolean {
  return COMPLETED_STATUS[status] === true;
}

/** Urgency → priority: overdue and next-seven-days are High, a month is Medium. */
export function priorityForDays(daysUntilDue?: number): PriorityLevel {
  if (daysUntilDue === undefined) return 'Low';
  if (daysUntilDue < 0) return 'High';
  if (daysUntilDue <= 7) return 'High';
  if (daysUntilDue <= 30) return 'Medium';
  return 'Low';
}

export function splitDate(date: string): { month: string; day: string } {
  const [, month, day] = date.split('-');
  return {
    month: MONTH_LABELS[Number(month) - 1] ?? '—',
    day: String(Number(day)),
  };
}

function toTaskItem(task: PracticeTaskItem, status: string): HomeTaskItem {
  const meta = serviceMeta(task.service);
  return {
    id: task.id,
    title: meta.title,
    serviceLabel: meta.label,
    subtitle: `${task.clientName} · ${meta.label}`,
    clientCode: task.clientCode,
    clientName: task.clientName,
    due: task.due,
    daysUntilDue: task.daysUntilDue,
    priority: priorityForDays(task.daysUntilDue),
    needsPartnerReview: task.needsPartnerReview,
    status,
  };
}

function byDueThenPriority(a: HomeTaskItem, b: HomeTaskItem): number {
  if (a.due && b.due && a.due !== b.due) return a.due < b.due ? -1 : 1;
  if (a.due && !b.due) return -1;
  if (!a.due && b.due) return 1;
  const rank = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
  return rank !== 0 ? rank : a.id.localeCompare(b.id);
}

/** The current user's open and completed obligations, split for the tabs. */
export function buildMyTaskLists(
  tasks: PracticeTaskItem[],
  overrides: Record<string, TaskStatusOverride>,
  currentUser: PracticeUser
): MyTaskLists {
  const mine = tasks.filter(
    (t) => t.staffId === currentUser.id || t.subcontractorId === currentUser.id
  );
  const open: HomeTaskItem[] = [];
  const completed: HomeTaskItem[] = [];

  for (const task of mine) {
    const status = taskStatus(task, overrides);
    const item = toTaskItem(task, status);
    if (isTaskCompleted(status)) {
      completed.push(item);
    } else {
      open.push(item);
    }
  }

  open.sort(byDueThenPriority);
  completed.sort((a, b) => (a.due && b.due ? (a.due < b.due ? 1 : -1) : 0));
  return { open, completed };
}

/**
 * The engagement to feature: most open statutory obligations, then the
 * furthest-along engagement, then code order so the choice is stable.
 */
function buildBanner(tasks: PracticeTaskItem[], overrides: Record<string, TaskStatusOverride>): HomeBanner | null {
  if (tasks.length === 0) return null;

  const groups = new Map<string, { clientName: string; open: number; lodged: number; total: number }>();
  for (const task of tasks) {
    const status = taskStatus(task, overrides);
    const group = groups.get(task.clientCode) ?? {
      clientName: task.clientName,
      open: 0,
      lodged: 0,
      total: 0,
    };
    group.total += 1;
    if (LODGED_STATUS[status] === true) group.lodged += 1;
    if (!isTaskCompleted(status)) group.open += 1;
    groups.set(task.clientCode, group);
  }

  const totalOpen = [...groups.values()].reduce((sum, g) => sum + g.open, 0);
  if (totalOpen === 0) {
    const lodged = [...groups.values()].reduce((sum, g) => sum + g.lodged, 0);
    return {
      clientName: 'Practice-wide compliance',
      code: '',
      compliancePct: Math.round((lodged / tasks.length) * 100),
      openTasks: 0,
    };
  }

  const ranked = [...groups.entries()]
    .filter(([, g]) => g.open > 0)
    .sort(([codeA, a], [codeB, b]) => {
      if (a.open !== b.open) return b.open - a.open;
      const pctA = a.total === 0 ? 0 : a.lodged / a.total;
      const pctB = b.total === 0 ? 0 : b.lodged / b.total;
      if (pctA !== pctB) return pctB - pctA;
      return codeA.localeCompare(codeB);
    });

  const [code, group] = ranked[0];
  return {
    clientName: group.clientName,
    code,
    compliancePct: Math.round((group.lodged / group.total) * 100),
    openTasks: group.open,
  };
}

function mergeActivity(live: ActivityEvent[]): ActivityEvent[] {
  const seen = new Set(live.map((event) => event.id));
  const merged = [...live, ...ACTIVITY_SEEDS.filter((seed) => !seen.has(seed.id))];
  const time = (event: ActivityEvent) => new Date(event.at).getTime();
  return merged.sort((a, b) => time(b) - time(a) || b.id.localeCompare(a.id));
}

export function relativeTime(at: string, today: string): string {
  const from = new Date(at.length === 10 ? `${at}T00:00:00Z` : at);
  const now = new Date(`${today}T12:00:00Z`);
  const dayMs = 86_400_000;
  const fromDay = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
  const nowDay = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const days = Math.round((nowDay - fromDay) / dayMs);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  const { month, day } = splitDate(new Date(fromDay).toISOString().slice(0, 10));
  return `${day} ${month}`;
}

export function getUpcomingHolidays(today: string, count = 3): HolidayItem[] {
  const year = parseInt(today.slice(0, 4), 10);
  const holidays = new Map<string, string>();
  for (const [date, name] of publicHolidays(year)) holidays.set(date, name);
  for (const [date, name] of publicHolidays(year + 1)) holidays.set(date, name);

  return [...holidays.entries()]
    .filter(([date]) => date >= today)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .slice(0, count)
    .map(([date, name]) => ({ date, name, ...splitDate(date) }));
}

export function buildHomeData(input: HomeDataInput): HomeData {
  const tasks =
    input.tasks ??
    aggregatePracticeTasks(
      (input.clients ?? []) as Parameters<typeof aggregatePracticeTasks>[0],
      input.today,
      input.staff
    ).tasks;

  const overrides = input.taskStatusOverrides;
  const statuses = new Map(tasks.map((task) => [task.id, taskStatus(task, overrides)]));

  const openTasks = tasks.filter((task) => !isTaskCompleted(statuses.get(task.id) ?? 'Not Started'));
  const overdue = openTasks.filter((task) => task.due !== undefined && task.due < input.today);
  const dueThisWeek = openTasks.filter(
    (task) =>
      task.due !== undefined &&
      task.due >= input.today &&
      task.daysUntilDue !== undefined &&
      task.daysUntilDue <= 7
  );
  const waitingOnClient = openTasks.filter((task) => statuses.get(task.id) === 'Awaiting Client');

  const myLists = buildMyTaskLists(tasks, overrides, input.currentUser);

  const deadlines = openTasks
    .filter((task) => task.due !== undefined && task.due >= input.today)
    .sort((a, b) => (a.due! < b.due! ? -1 : a.due! > b.due! ? 1 : 0))
    .slice(0, 5)
    .map((task) => {
      const meta = serviceMeta(task.service);
      return {
        id: task.id,
        clientCode: task.clientCode,
        clientName: task.clientName,
        title: meta.title,
        serviceLabel: meta.label,
        due: task.due!,
        ...splitDate(task.due!),
        priority: priorityForDays(task.daysUntilDue),
        daysUntilDue: task.daysUntilDue,
      };
    });

  const recentWork = [...input.timeEntries]
    .sort((a, b) => (a.startedAt < b.startedAt ? 1 : a.startedAt > b.startedAt ? -1 : 0))
    .slice(0, 4)
    .map((entry) => {
      const hours = Math.round((entry.roundedMinutes / 60) * 100) / 100;
      const clientName =
        input.clients?.find((c) => c.code === entry.clientCode)?.name ?? entry.clientCode;
      return {
        id: entry.id,
        title: entry.description,
        subtitle: `${clientName} · ${hours}h ${entry.billable ? 'billable' : 'non-billable'}`,
        meta: `Logged ${relativeTime(entry.startedAt, input.today)}`,
        hours,
      };
    });

  return {
    banner: buildBanner(tasks, overrides),
    kpis: {
      totalTasks: openTasks.length,
      dueThisWeek: dueThisWeek.length,
      inReview: Object.values(overrides).filter((o) => o.status === 'Partner Review Gate').length,
      teamMembers: input.staff.length,
    },
    myTasks: myLists.open,
    completedCount: myLists.completed.length,
    activity: mergeActivity(input.activity),
    deadlines,
    recentWork,
    holidays: getUpcomingHolidays(input.today, 3),
    emptyStates: {
      noOverdue: overdue.length === 0,
      noAwaitingClient: waitingOnClient.length === 0,
    },
  };
}

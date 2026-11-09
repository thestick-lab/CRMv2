import { SERVICE_TYPES } from 'fdoncall-practice/domain/catalogue';
import { addDays, endOfMonth, parts, shiftMonth } from 'fdoncall-practice/domain/dates';
import type { TimeEntry } from '@/context/PracticeStoreContext';

/* ---------------------------------------------------------------------------
 * Time report derivation (time-tracking-report anatomy).
 *
 * Every figure is summed from the same `roundedMinutes` on the entries that
 * survive the range and filter tests, so the KPI strip, the client bars, the
 * billable split and every expandable group row reconcile exactly. Nothing is
 * independently rounded: quarter-hour values are integers of minutes until the
 * view formats them for display.
 *
 * A period with no matching entries returns `null` totals — never zeros — so
 * the report can show its named empty states instead of claiming 0h of work.
 * ------------------------------------------------------------------------- */

export interface TimeReportRange {
  start: string;
  end: string;
}

export interface TimeReportFilters {
  client?: string;
  staff?: string;
  service?: string;
}

export type TimeReportPreset = 'this-month' | 'last-month' | 'last-30' | 'this-year';

export const TIME_REPORT_PRESETS: ReadonlyArray<{ id: TimeReportPreset; label: string }> = [
  { id: 'this-month', label: 'This month' },
  { id: 'last-month', label: 'Last month' },
  { id: 'last-30', label: 'Last 30 days' },
  { id: 'this-year', label: 'This year' },
];

/** Minutes by which the four KPI cards and the split are stated. */
export interface TimeReportKpis {
  total: number | null;
  billable: number | null;
  nonBillable: number | null;
  billablePct: number | null;
}

export interface ClientTimeRow {
  clientCode: string;
  billable: number;
  nonBillable: number;
  total: number;
}

export interface PersonTaskRow {
  key: string;
  clientCode: string;
  staffUserId: string;
  /** Service short name, or `Deadline task` / `General` for unclassified work. */
  taskLabel: string;
  billable: number;
  nonBillable: number;
  total: number;
}

export interface TimeReport {
  kpis: TimeReportKpis;
  byClient: ClientTimeRow[];
  byPersonTask: PersonTaskRow[];
  billableSplit: { billable: number | null; nonBillable: number | null };
  /** Entries that survived range + filters; zero is the empty period. */
  entryCount: number;
}

const SERVICE_SHORT = new Map(SERVICE_TYPES.map((service) => [service.code, service.short]));

const SA_DAY = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Johannesburg' });

/**
 * The South African calendar day (`YYYY-MM-DD`) an ISO timestamp falls on.
 *
 * Entries are stored as UTC instants; a 00:30 Johannesburg entry is still the
 * previous day in UTC, so the report must bucket by SAST or the month boundary
 * would move. An unreadable timestamp sorts into no day at all.
 */
export function localDay(iso: string | undefined): string {
  if (!iso) return '';
  const time = Date.parse(iso);
  if (Number.isNaN(time)) return '';
  return SA_DAY.format(new Date(time));
}

/** Inclusive day-range tests; an entry belongs to the day it started. */
function inRange(entry: TimeEntry, range: TimeReportRange): boolean {
  const day = localDay(entry.startedAt);
  if (!day) return false;
  return day >= range.start && day <= range.end;
}

function matchesFilters(entry: TimeEntry, filters: TimeReportFilters): boolean {
  if (filters.client && entry.clientCode !== filters.client) return false;
  if (filters.staff && entry.staffUserId !== filters.staff) return false;
  if (filters.service && entry.serviceCode !== filters.service) return false;
  return true;
}

/** The task column groups a service, a linked deadline, or unclassified work. */
function groupKey(entry: TimeEntry): string {
  if (entry.serviceCode) return SERVICE_SHORT.get(entry.serviceCode) ?? entry.serviceCode;
  if (entry.taskId) return 'Deadline task';
  return 'General';
}

/** Resolve a preset against the practice's current SA date. */
export function resolvePresetRange(preset: TimeReportPreset, today: string): TimeReportRange {
  const [year, month] = parts(today);
  switch (preset) {
    case 'this-month':
      return { start: `${today.slice(0, 7)}-01`, end: today };
    case 'last-month': {
      const [previousYear, previousMonth] = shiftMonth(year, month, -1);
      return {
        start: `${previousYear}-${String(previousMonth).padStart(2, '0')}-01`,
        end: endOfMonth(previousYear, previousMonth),
      };
    }
    case 'last-30':
      return { start: addDays(today, -29), end: today };
    case 'this-year':
      return { start: `${today.slice(0, 4)}-01-01`, end: today };
  }
}

/**
 * Build the practice time report for a period and filter set.
 *
 * The `byClient` and `byPersonTask` collections are both summed from the same
 * surviving entries, so `Σ byClient.total === Σ byPersonTask.total ===
 * kpis.total` for any non-empty period. Filters apply before any aggregation.
 */
export function buildTimeReport(
  entries: TimeEntry[],
  range: TimeReportRange,
  filters: TimeReportFilters = {}
): TimeReport {
  const included = entries.filter(
    (entry) => inRange(entry, range) && matchesFilters(entry, filters)
  );

  if (included.length === 0) {
    return {
      kpis: { total: null, billable: null, nonBillable: null, billablePct: null },
      byClient: [],
      byPersonTask: [],
      billableSplit: { billable: null, nonBillable: null },
      entryCount: 0,
    };
  }

  const clients = new Map<string, ClientTimeRow>();
  const personTasks = new Map<string, PersonTaskRow>();
  let billable = 0;
  let nonBillable = 0;

  for (const entry of included) {
    const minutes = Number.isFinite(entry.roundedMinutes) ? entry.roundedMinutes : 0;
    const billableMinutes = entry.billable ? minutes : 0;
    const nonBillableMinutes = entry.billable ? 0 : minutes;
    billable += billableMinutes;
    nonBillable += nonBillableMinutes;

    const client = clients.get(entry.clientCode) ?? {
      clientCode: entry.clientCode,
      billable: 0,
      nonBillable: 0,
      total: 0,
    };
    client.billable += billableMinutes;
    client.nonBillable += nonBillableMinutes;
    client.total += minutes;
    clients.set(entry.clientCode, client);

    const task = groupKey(entry);
    const key = `${entry.clientCode}|${entry.staffUserId}|${task}`;
    const row = personTasks.get(key) ?? {
      key,
      clientCode: entry.clientCode,
      staffUserId: entry.staffUserId,
      taskLabel: task,
      billable: 0,
      nonBillable: 0,
      total: 0,
    };
    row.billable += billableMinutes;
    row.nonBillable += nonBillableMinutes;
    row.total += minutes;
    personTasks.set(key, row);
  }

  const total = billable + nonBillable;

  return {
    kpis: {
      total,
      billable,
      nonBillable,
      billablePct: total > 0 ? Math.round((billable / total) * 1000) / 10 : null,
    },
    byClient: [...clients.values()].sort(
      (a, b) => b.total - a.total || a.clientCode.localeCompare(b.clientCode)
    ),
    byPersonTask: [...personTasks.values()].sort(
      (a, b) =>
        b.total - a.total ||
        a.staffUserId.localeCompare(b.staffUserId) ||
        a.taskLabel.localeCompare(b.taskLabel)
    ),
    billableSplit: { billable, nonBillable },
    entryCount: included.length,
  };
}

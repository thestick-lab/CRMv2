import type { EstimateGroup } from 'fdoncall-practice/domain/estimate';
import { MONTHS, addDays } from 'fdoncall-practice/domain/dates';
import {
  ACTIVITY_SEEDS,
  type ActivityEvent,
  type Invoice,
  type Quote,
  type TaskStatusOverride,
  type TimeEntry,
} from '@/context/PracticeStoreContext';
import { southAfricaDay } from '@/lib/dates';
import { UNREGISTERED_CLIENT_CODE } from '@/components/invoice/invoice-logic';

/* ---------------------------------------------------------------------------
 * Analytics (analytics-overview) derivation.
 *
 * Every figure comes from the store's own records: invoices for revenue,
 * submitted task overrides for filings, time entries for hours, and the
 * activity trail for the feed. A metric with no source data in the period is
 * `null` so the view can show its named empty state instead of a fake zero.
 * Percentages compare against the immediately preceding window of equal
 * length; a zero denominator leaves the delta `null` (rendered `—`).
 * ------------------------------------------------------------------------- */

export interface DateRange {
  start: string;
  end: string;
}

export type AnalyticsWindow = '7D' | '30D' | '90D' | '1Y';

export const ANALYTICS_WINDOWS: ReadonlyArray<{
  id: AnalyticsWindow;
  label: string;
  days: number;
}> = [
  { id: '7D', label: '7D', days: 7 },
  { id: '30D', label: '30D', days: 30 },
  { id: '90D', label: '90D', days: 90 },
  { id: '1Y', label: '1Y', days: 365 },
];

/** A metric value plus its change against the previous period, in percent. */
export interface MetricComparison {
  value: number | null;
  /** `undefined` history renders as `—`; never NaN, never Infinity, never 0. */
  deltaPct: number | null;
}

export type RevenueGroup = EstimateGroup | 'Other';

export interface AnalyticsResult {
  revenue: MetricComparison;
  activeClients: MetricComparison;
  filingsSubmitted: MetricComparison;
  billableHours: MetricComparison;
  revenueByMonth: { label: string; value: number }[];
  revenueByGroup: { label: RevenueGroup; pct: number; zar: number }[];
  hoursByClient: { label: string; hours: number }[];
  activity: ActivityEvent[];
}

/** The store slice analytics reads; `PracticeState` satisfies it structurally. */
export interface AnalyticsInput {
  invoices: Invoice[];
  clients: { code: string; name: string }[];
  taskStatusOverrides: Record<string, TaskStatusOverride>;
  timeEntries: TimeEntry[];
  quotes: Quote[];
  activity: ActivityEvent[];
}

const REVENUE_STATUSES: Record<string, true> = { Sent: true, Paid: true };
/** A quote only represents client activity once it is a closed engagement. */
const KEPT_QUOTE_STAGES: Record<string, true> = { Signed: true, 'Active Client': true };
const ACTIVITY_LIMIT = 6;

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * Range boundaries are South African calendar days; timestamps are UTC
 * instants, so the comparison happens on the SA day key. A 00:30 SAST record
 * therefore belongs to its own day, not the previous UTC one.
 */
function inRange(date: string | undefined, range: DateRange): boolean {
  const day = southAfricaDay(date);
  if (!day) return false;
  return day >= range.start && day <= range.end;
}

function comparison(current: number | null, previous: number | null): MetricComparison {
  if (current === null) return { value: null, deltaPct: null };
  if (previous === null || previous === 0) return { value: current, deltaPct: null };
  return { value: current, deltaPct: round1(((current - previous) / previous) * 100) };
}

function issuedInvoices(input: AnalyticsInput, range: DateRange): Invoice[] {
  return input.invoices.filter(
    (invoice) => REVENUE_STATUSES[invoice.status] === true && inRange(invoice.issueDate, range)
  );
}

/** `null` when the period carries no issued invoice at all. */
function revenueOf(invoices: Invoice[]): number | null {
  if (invoices.length === 0) return null;
  return round2(invoices.reduce((sum, invoice) => sum + invoice.total, 0));
}

function activeClientsIn(input: AnalyticsInput, range: DateRange): number | null {
  const codes = new Set<string>();
  // A migrated prospect's placeholder code is not a client record; counting it
  // would inflate the register with a name the practice does not manage.
  const addClient = (code: string | undefined) => {
    if (!code || code === UNREGISTERED_CLIENT_CODE) return;
    codes.add(code);
  };
  for (const invoice of issuedInvoices(input, range)) addClient(invoice.clientCode);
  for (const entry of input.timeEntries) {
    if (inRange(entry.startedAt, range)) addClient(entry.clientCode);
  }
  for (const quote of input.quotes) {
    if (!quote.clientCode || KEPT_QUOTE_STAGES[quote.stage] !== true) continue;
    if (inRange(quote.updatedAt, range)) codes.add(quote.clientCode);
  }
  return codes.size === 0 ? null : codes.size;
}

function filingsSubmittedIn(input: AnalyticsInput, range: DateRange): number | null {
  let count = 0;
  for (const override of Object.values(input.taskStatusOverrides)) {
    if (override.status !== 'Submitted') continue;
    if (inRange(override.submissionDate ?? override.updatedAt, range)) count += 1;
  }
  return count === 0 ? null : count;
}

function billableHoursIn(input: AnalyticsInput, range: DateRange): number | null {
  const entries = input.timeEntries.filter((entry) => inRange(entry.startedAt, range));
  if (entries.length === 0) return null;
  const minutes = entries
    .filter((entry) => entry.billable)
    .reduce((sum, entry) => sum + entry.roundedMinutes, 0);
  return round2(minutes / 60);
}

/** One bucket per calendar month the range touches, so the line never skips. */
function revenueByMonthOf(invoices: Invoice[], range: DateRange): { label: string; value: number }[] {
  if (invoices.length === 0) return [];

  const totals = new Map<string, number>();
  for (const invoice of invoices) {
    const key = invoice.issueDate.slice(0, 7);
    totals.set(key, (totals.get(key) ?? 0) + invoice.total);
  }

  const [startYear, startMonth] = range.start.split('-').map(Number);
  const [endYear, endMonth] = range.end.split('-').map(Number);
  const startIndex = startYear * 12 + (startMonth - 1);
  const endIndex = endYear * 12 + (endMonth - 1);
  const multiYear = startYear !== endYear;

  const buckets: { label: string; value: number }[] = [];
  for (let index = startIndex; index <= endIndex; index += 1) {
    const year = Math.floor(index / 12);
    const month = (index % 12) + 1;
    const key = `${year}-${String(month).padStart(2, '0')}`;
    const label = multiYear ? `${MONTHS[month - 1]} ${String(year).slice(2)}` : MONTHS[month - 1];
    buckets.push({ label, value: round2(totals.get(key) ?? 0) });
  }
  return buckets;
}

/**
 * Groups invoice lines by the Xero account they were raised on, which the
 * domain catalogue's estimate groups own: 200 regular work, 210 compliance,
 * 220 annual work, 230 recharges, 240 once-off; anything else is `Other`.
 * VAT is allocated pro rata so the split reconciles to the invoice total.
 */
function groupOfAccountCode(accountCode?: string): RevenueGroup {
  if (!accountCode) return 'Other';
  if (/^200\b|accounting/i.test(accountCode)) return 'Regular work';
  if (/^210\b|tax|statutory/i.test(accountCode)) return 'Compliance';
  if (/^220\b|annual|financial statements/i.test(accountCode)) return 'Annual work';
  if (/^230\b|software|subscription/i.test(accountCode)) return 'Recharges';
  if (/^240\b|once-off|setup/i.test(accountCode)) return 'Once-off';
  return 'Other';
}

function revenueByGroupOf(invoices: Invoice[]): AnalyticsResult['revenueByGroup'] {
  const totals = new Map<RevenueGroup, number>();

  for (const invoice of invoices) {
    const lineTotal = invoice.lineItems.reduce((sum, item) => sum + item.lineAmount, 0);
    if (lineTotal <= 0) {
      totals.set('Other', (totals.get('Other') ?? 0) + invoice.total);
      continue;
    }
    for (const item of invoice.lineItems) {
      const group = groupOfAccountCode(item.accountCode);
      const share = (item.lineAmount / lineTotal) * invoice.total;
      totals.set(group, (totals.get(group) ?? 0) + share);
    }
  }

  const revenue = [...totals.values()].reduce((sum, value) => sum + value, 0);
  if (revenue <= 0) return [];

  return [...totals.entries()]
    .filter(([, zar]) => zar > 0)
    .sort(([labelA, zarA], [labelB, zarB]) => zarB - zarA || labelA.localeCompare(labelB))
    .map(([label, zar]) => ({ label, pct: round1((zar / revenue) * 100), zar: round2(zar) }));
}

function hoursByClientOf(input: AnalyticsInput, range: DateRange): { label: string; hours: number }[] {
  const minutes = new Map<string, number>();
  for (const entry of input.timeEntries) {
    if (!inRange(entry.startedAt, range)) continue;
    minutes.set(entry.clientCode, (minutes.get(entry.clientCode) ?? 0) + entry.roundedMinutes);
  }

  const names = new Map(input.clients.map((client) => [client.code, client.name]));
  return [...minutes.entries()]
    .filter(([, total]) => total > 0)
    .sort(([codeA, a], [codeB, b]) => b - a || codeA.localeCompare(codeB))
    .slice(0, 5)
    .map(([code, total]) => ({ label: names.get(code) ?? code, hours: round2(total / 60) }));
}

/** Live events first, then the seeded engagement history; newest at the top. */
function recentActivity(live: ActivityEvent[]): ActivityEvent[] {
  const seen = new Set(live.map((event) => event.id));
  const merged = [...live, ...ACTIVITY_SEEDS.filter((seed) => !seen.has(seed.id))];
  const time = (event: ActivityEvent) => new Date(event.at).getTime();
  return merged
    .sort((a, b) => time(b) - time(a) || b.id.localeCompare(a.id))
    .slice(0, ACTIVITY_LIMIT);
}

export function computeAnalytics(
  input: AnalyticsInput,
  range: DateRange,
  compare: DateRange
): AnalyticsResult {
  const currentInvoices = issuedInvoices(input, range);
  const previousInvoices = issuedInvoices(input, compare);

  return {
    revenue: comparison(revenueOf(currentInvoices), revenueOf(previousInvoices)),
    activeClients: comparison(
      activeClientsIn(input, range),
      activeClientsIn(input, compare)
    ),
    filingsSubmitted: comparison(
      filingsSubmittedIn(input, range),
      filingsSubmittedIn(input, compare)
    ),
    billableHours: comparison(
      billableHoursIn(input, range),
      billableHoursIn(input, compare)
    ),
    revenueByMonth: revenueByMonthOf(currentInvoices, range),
    revenueByGroup: revenueByGroupOf(currentInvoices),
    hoursByClient: hoursByClientOf(input, range),
    activity: recentActivity(input.activity),
  };
}

/** The selected window and the immediately preceding window of equal length. */
export function resolveRanges(
  today: string,
  window: AnalyticsWindow
): { range: DateRange; compare: DateRange } {
  const preset = ANALYTICS_WINDOWS.find((candidate) => candidate.id === window);
  const days = preset ? preset.days : 30;
  const range = { start: addDays(today, -(days - 1)), end: today };
  const compareEnd = addDays(range.start, -1);
  const compare = { start: addDays(compareEnd, -(days - 1)), end: compareEnd };
  return { range, compare };
}

function monthDay(date: string): { day: number; month: string; year: string } {
  const [year, month, day] = date.split('-');
  return { day: Number(day), month: MONTHS[Number(month) - 1] ?? '', year };
}

/** `1 Sep – 30 Nov 2026`, with the year on both ends only when they differ. */
export function formatRange(range: DateRange): string {
  const start = monthDay(range.start);
  const end = monthDay(range.end);
  if (start.year === end.year) {
    return `${start.day} ${start.month} – ${end.day} ${end.month} ${end.year}`;
  }
  return `${start.day} ${start.month} ${start.year} – ${end.day} ${end.month} ${end.year}`;
}

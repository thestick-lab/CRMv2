import { cents, formatMonthShort } from 'fdoncall-practice/domain/estimate';
import { endOfMonth, iso, type ISODate } from 'fdoncall-practice/domain/dates';
import type { Invoice, InvoiceLine, TimeEntry } from '@/context/PracticeStoreContext';

/**
 * Time-entry arithmetic for the practice.
 *
 * The practice bills in quarter-hour blocks: every entry is rounded to the
 * nearest 15 minutes (half-up) with a 15 minute floor, and a client's monthly
 * retainer covers billable minutes up to its allowance. Overage is priced at
 * the quote's ad-hoc hourly rate, cent-exact via the domain `cents` helper so
 * the invoice line, the Xero draft and the report agree.
 */

/** One quarter hour, the rounding step for every entry. */
export const QUARTER_MINUTES = 15;

/**
 * Nearest quarter hour, half-up, never below 15 minutes.
 *
 * `7 → 15`, `23 → 30`, `53 → 60`, and a 15 minute block for anything that
 * rounds down to zero (including a negative or unusable duration).
 */
export function roundToQuarterMinutes(minutes: number): number {
  if (!Number.isFinite(minutes)) return QUARTER_MINUTES;
  const quarters = Math.round(Math.max(0, minutes) / QUARTER_MINUTES);
  return Math.max(QUARTER_MINUTES, quarters * QUARTER_MINUTES);
}

/**
 * Worked minutes between two timestamps.
 *
 * Durations come from the timestamps, never from a same-day assumption, so an
 * entry that starts at 22:30 and ends at 01:15 the next morning reads 165
 * minutes. A running entry (no end) or a reversed pair reads zero.
 */
export function entryDurationMinutes(startedAt: string, endedAt?: string): number {
  if (!endedAt) return 0;
  const start = Date.parse(startedAt);
  const end = Date.parse(endedAt);
  if (Number.isNaN(start) || Number.isNaN(end)) return 0;
  return Math.max(0, Math.round((end - start) / 60_000));
}

/**
 * Worked minutes the capture sheet shows and saves.
 *
 * A stopped timer entry carries `durationMinutes` with its paused segments
 * already excluded, and that figure stays authoritative until the user edits
 * the start or end field. Only then is the timestamp span re-read. The `> 0`
 * guard keeps a sub-minute stop on the "under a minute" path instead of
 * falling back to a span that has lost its seconds.
 */
export function resolveWorkedMinutes(
  entry: { durationMinutes: number },
  timesEdited: boolean,
  startedAtIso: string | null,
  endedAtIso: string | null
): number {
  if (!timesEdited && entry.durationMinutes > 0) return entry.durationMinutes;
  return startedAtIso && endedAtIso ? entryDurationMinutes(startedAtIso, endedAtIso) : 0;
}

/**
 * The billable minutes a typed rounded field saves.
 *
 * Typing is never clamped mid-edit; the quarter-hour snap and the 15 minute
 * floor are applied once, at save time. An empty or unusable field falls back
 * to the worked duration's rounding.
 */
export function resolveRoundedMinutes(input: string, workedMinutes: number): number {
  const typed = Number(input);
  const usable = input.trim() !== '' && Number.isFinite(typed);
  return roundToQuarterMinutes(usable ? typed : workedMinutes);
}

export interface BillableMinutesEntry {
  billableMinutes: number;
}

export interface RetainerSplit {
  /** Billable minutes the monthly retainer already pays for. */
  coveredMinutes: number;
  /** Billable minutes beyond the allowance, billed at the ad-hoc rate. */
  overageMinutes: number;
  /** Overage priced at the ad-hoc rate, rounded half-up to the cent. */
  overageAmountZar: number;
}

/**
 * Split a month's billable minutes into retainer-covered and overage minutes.
 *
 * The allowance is consumed in full before anything is billable as overage:
 * `overage = max(0, Σ billable minutes − allowance minutes)`, priced at
 * `adHocRate` per hour with the amount rounded half-up to the cent.
 */
export function splitRetainerOverage(
  entries: BillableMinutesEntry[],
  allowanceHours: number,
  adHocRate: number
): RetainerSplit {
  const totalBillableMinutes = entries.reduce(
    (total, entry) => total + (Number.isFinite(entry.billableMinutes) ? entry.billableMinutes : 0),
    0
  );
  const allowanceMinutes = Math.max(
    0,
    Number.isFinite(allowanceHours) ? allowanceHours * 60 : 0
  );
  const coveredMinutes = Math.min(totalBillableMinutes, allowanceMinutes);
  const overageMinutes = Math.max(0, totalBillableMinutes - allowanceMinutes);
  const rate = Number.isFinite(adHocRate) ? adHocRate : 0;

  return {
    coveredMinutes,
    overageMinutes,
    overageAmountZar: cents((overageMinutes / 60) * rate),
  };
}

/**
 * Minutes as the practice's decimal-hour label: `0.25h`, `1.5h`, `2h`.
 * Whole hours drop the decimal so the timesheet and report read cleanly.
 */
export function formatHours(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return '0h';
  const hours = minutes / 60;
  return `${Number.isInteger(hours) ? hours : Number(hours.toFixed(2))}h`;
}

/* ---------------------------------------------------------------------------
 * Invoice time feed
 *
 * An invoice for a retainer client already carries that month's fee lines, so
 * the retainer's allowance is paid for: only the hours beyond it become a new
 * line. The split is the same `splitRetainerOverage` math the time report
 * shows, and the entries that produced the line are marked with the invoice id
 * on save so a second `Add unbilled time` pass can never double-bill them.
 * ------------------------------------------------------------------------- */

/** First and last day of one billing month, inclusive. */
export interface MonthRange {
  start: ISODate;
  end: ISODate;
}

/** The calendar month an entry belongs to, from its start timestamp. */
const SA_DAY = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Johannesburg' });

/** The South African calendar day an entry started on, `YYYY-MM-DD`. */
export function entryDay(iso: string): string {
  const time = Date.parse(iso);
  if (Number.isNaN(time)) return '';
  return SA_DAY.format(new Date(time));
}

/** `2026-11` → `{ start: '2026-11-01', end: '2026-11-30' }`. */
export function billingMonthRange(month: string): MonthRange {
  const [year, monthNumber] = month.split('-').map(Number);
  if (!Number.isFinite(year) || !Number.isFinite(monthNumber)) {
    return { start: `${month}-01`, end: `${month}-01` };
  }
  return { start: iso(year, monthNumber, 1), end: endOfMonth(year, monthNumber) };
}

/** The invoice line id one client-month's overage is billed on. */
export function timeLineId(clientCode: string, month: string): string {
  return `line-time-${clientCode}-${month}`;
}

export interface TimeInvoiceFeed {
  /** Unbilled billable entries in the month: what the invoice would bill. */
  entries: TimeEntry[];
  /** Rounded minutes across those entries. */
  billableMinutes: number;
  /** Billable minutes the retainer's allowance already covers. */
  coveredMinutes: number;
  /** Billable minutes beyond the allowance, priced at the ad-hoc rate. */
  overageMinutes: number;
  overageHours: number;
  /** The ex-VAT value of the line(s) this feed produces. */
  overageAmountZar: number;
  /** The overage line, or nothing while the month is inside the allowance. */
  lines: InvoiceLine[];
}

/**
 * The unbilled time an invoice can bill for one client and month.
 *
 * Only billable, not-yet-invoiced entries started inside the range count. The
 * covered portion produces no line — the retainer fee line already on the
 * invoice pays for it — and the overage becomes exactly one `OUTPUT2` line at
 * the quote's ad-hoc rate. The quantity is stated in decimal hours at
 * hundredth-hour granularity — every allowance quoted to two decimals and every
 * quarter-hour entry lands exactly there — and the line amount is derived from
 * it, so quantity × rate, the invoice's line sum and `splitRetainerOverage`'s
 * own amount agree.
 */
export function timeInvoiceFeed(
  clientCode: string,
  monthRange: MonthRange,
  entries: TimeEntry[],
  allowanceHours: number,
  adHocRate: number
): TimeInvoiceFeed {
  const unbilled = entries.filter((entry) => {
    if (entry.clientCode !== clientCode || !entry.billable || entry.invoiceId) return false;
    const day = entryDay(entry.startedAt);
    return day !== '' && day >= monthRange.start && day <= monthRange.end;
  });

  const billableMinutes = unbilled.reduce(
    (total, entry) =>
      total + (Number.isFinite(entry.roundedMinutes) ? entry.roundedMinutes : 0),
    0
  );
  const split = splitRetainerOverage(
    unbilled.map((entry) => ({ billableMinutes: entry.roundedMinutes })),
    allowanceHours,
    adHocRate
  );

  const overageHours = Math.round((split.overageMinutes / 60) * 10_000) / 10_000;
  const unitAmount = cents(adHocRate);
  const monthKey = monthRange.start.slice(0, 7);
  const lines: InvoiceLine[] =
    overageHours > 0
      ? [
          {
            id: timeLineId(clientCode, monthKey),
            description: `Time overage — ${formatMonthShort(monthKey)}`,
            quantity: overageHours,
            unitAmount,
            taxType: 'OUTPUT2',
            lineAmount: cents(overageHours * unitAmount),
          },
        ]
      : [];

  return {
    entries: unbilled,
    billableMinutes,
    coveredMinutes: split.coveredMinutes,
    overageMinutes: split.overageMinutes,
    overageHours,
    overageAmountZar: lines[0]?.lineAmount ?? 0,
    lines,
  };
}

/**
 * The invoice lines for a month's unbilled billable time: one overage line, or
 * none while the logged hours stay inside the retainer's allowance.
 */
export function buildTimeInvoiceLines(
  clientCode: string,
  monthRange: MonthRange,
  entries: TimeEntry[],
  allowanceHours: number,
  adHocRate: number
): InvoiceLine[] {
  return timeInvoiceFeed(clientCode, monthRange, entries, allowanceHours, adHocRate).lines;
}

/**
 * Entries a saved invoice billed whose overage line it no longer carries.
 *
 * Deleting the `Time overage` line from an invoice must release the entries it
 * billed: an entry whose `invoiceId` points at an invoice that no longer bills
 * it is excluded from every later feed, so the time would be unbillable for
 * good. The caller clears the returned entries' `invoiceId`. An entry whose
 * start is unreadable cannot be attributed to a month and is left untouched.
 */
export function releasedTimeEntries(
  invoice: Pick<Invoice, 'id' | 'lineItems'>,
  entries: TimeEntry[]
): TimeEntry[] {
  const lineIds = new Set(invoice.lineItems.map((line) => line.id));
  return entries.filter((entry) => {
    if (entry.invoiceId !== invoice.id) return false;
    const day = entryDay(entry.startedAt);
    if (day === '') return false;
    return !lineIds.has(timeLineId(entry.clientCode, day.slice(0, 7)));
  });
}

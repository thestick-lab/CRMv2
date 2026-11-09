import { cents } from 'fdoncall-practice/domain/estimate';

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

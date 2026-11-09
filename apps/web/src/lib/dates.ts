/* ---------------------------------------------------------------------------
 * Shared calendar-day helpers.
 *
 * Timestamps in the store are ISO instants (UTC). The practice works — and all
 * month/range filters are expressed — on South African calendar days
 * (`Africa/Johannesburg`, UTC+2), so every "which day is this" question goes
 * through one formatter instead of re-deriving it per module.
 * ------------------------------------------------------------------------- */

const SA_DAY = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Johannesburg' });

/**
 * The South African calendar day of an instant or date string, `YYYY-MM-DD`.
 * A date-only string keeps its day; an invalid or absent value returns `''`.
 */
export function southAfricaDay(value: string | undefined): string {
  if (!value) return '';
  const time = Date.parse(value);
  if (Number.isNaN(time)) return '';
  return SA_DAY.format(new Date(time));
}

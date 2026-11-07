import { endOfMonth } from '../domain/dates';

/** The latest financial year that has ended by a date, for a given year-end month. */
export function latestEndedYear(asOf: string, yearEndMonth: number): number {
  let y = Number(asOf.slice(0, 4));
  while (endOfMonth(y, yearEndMonth) > asOf) y--;
  return y;
}

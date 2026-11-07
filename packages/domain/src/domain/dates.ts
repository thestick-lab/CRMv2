// Date helpers on plain ISO dates (YYYY-MM-DD), so deadlines never shift with time zones.

export type ISODate = string;

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function iso(y: number, m: number, d: number): ISODate {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export function parts(date: ISODate): [number, number, number] {
  const [y, m, d] = date.split('-').map(Number);
  return [y, m, d];
}

export function yearOf(date: ISODate): number {
  return parts(date)[0];
}

export function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export function endOfMonth(y: number, m: number): ISODate {
  return iso(y, m, daysInMonth(y, m));
}

/** Shift a (year, month) pair by n months. */
export function shiftMonth(y: number, m: number, n: number): [number, number] {
  const idx = y * 12 + (m - 1) + n;
  return [Math.floor(idx / 12), (idx % 12) + 1];
}

function toUTC(date: ISODate): number {
  const [y, m, d] = parts(date);
  return Date.UTC(y, m - 1, d);
}

function fromUTC(t: number): ISODate {
  const dt = new Date(t);
  return iso(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}

export function addDays(date: ISODate, n: number): ISODate {
  return fromUTC(toUTC(date) + n * 86_400_000);
}

/** a minus b, in days. */
export function diffDays(a: ISODate, b: ISODate): number {
  return Math.round((toUTC(a) - toUTC(b)) / 86_400_000);
}

export function weekday(date: ISODate): number {
  return new Date(toUTC(date)).getUTCDay();
}

/** Same day n months later; a month-end date stays on the month end. */
export function addMonths(date: ISODate, n: number): ISODate {
  const [y, m, d] = parts(date);
  const [ty, tm] = shiftMonth(y, m, n);
  if (d === daysInMonth(y, m)) return endOfMonth(ty, tm);
  return iso(ty, tm, Math.min(d, daysInMonth(ty, tm)));
}

// ---- South African public holidays (Public Holidays Act 36 of 1994) ----

const FIXED_HOLIDAYS: [number, number, string][] = [
  [1, 1, "New Year's Day"],
  [3, 21, 'Human Rights Day'],
  [4, 27, 'Freedom Day'],
  [5, 1, "Workers' Day"],
  [6, 16, 'Youth Day'],
  [8, 9, "National Women's Day"],
  [9, 24, 'Heritage Day'],
  [12, 16, 'Day of Reconciliation'],
  [12, 25, 'Christmas Day'],
  [12, 26, 'Day of Goodwill'],
];

/** Gregorian Easter Sunday (anonymous algorithm). */
export function easterSunday(y: number): ISODate {
  const a = y % 19;
  const b = Math.floor(y / 100);
  const c = y % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return iso(y, month, day);
}

const holidayCache = new Map<number, Map<ISODate, string>>();

/** Public holidays for a year, including the Monday (or next free day) after one that falls on a Sunday. */
export function publicHolidays(y: number): Map<ISODate, string> {
  const cached = holidayCache.get(y);
  if (cached) return cached;
  const list = new Map<ISODate, string>();
  for (const [m, d, name] of FIXED_HOLIDAYS) list.set(iso(y, m, d), name);
  const easter = easterSunday(y);
  list.set(addDays(easter, -2), 'Good Friday');
  list.set(addDays(easter, 1), 'Family Day');
  const observed: [ISODate, string][] = [];
  for (const [date, name] of [...list.entries()].sort()) {
    if (weekday(date) === 0) {
      let next = addDays(date, 1);
      while (list.has(next) || observed.some(([o]) => o === next)) next = addDays(next, 1);
      observed.push([next, `${name} (observed)`]);
    }
  }
  for (const [date, name] of observed) list.set(date, name);
  const sorted = new Map([...list.entries()].sort(([a], [b]) => (a < b ? -1 : 1)));
  holidayCache.set(y, sorted);
  return sorted;
}

export function holidayName(date: ISODate): string | undefined {
  return publicHolidays(yearOf(date)).get(date);
}

export function isBusinessDay(date: ISODate): boolean {
  const wd = weekday(date);
  return wd !== 0 && wd !== 6 && !holidayName(date);
}

/** The date itself if it is a business day, otherwise the business day before it. */
export function businessDayOnOrBefore(date: ISODate): ISODate {
  let d = date;
  while (!isBusinessDay(d)) d = addDays(d, -1);
  return d;
}

export function lastBusinessDayOfMonth(y: number, m: number): ISODate {
  return businessDayOnOrBefore(endOfMonth(y, m));
}

/** The nth business day after a date. */
export function addBusinessDays(date: ISODate, n: number): ISODate {
  let d = date;
  let count = 0;
  while (count < n) {
    d = addDays(d, 1);
    if (isBusinessDay(d)) count++;
  }
  return d;
}

// ---- Formatting ----

export function formatDate(date: ISODate): string {
  const [y, m, d] = parts(date);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

export function formatDateWithDay(date: ISODate): string {
  return `${WEEKDAYS[weekday(date)]} ${formatDate(date)}`;
}

export function monthKey(date: ISODate): string {
  return date.slice(0, 7);
}

export function formatMonthKey(key: string): string {
  const [y, m] = key.split('-').map(Number);
  return `${MONTHS_LONG[m - 1]} ${y}`;
}

/** Today's date in South Africa, whatever the viewer's own time zone. */
export function todayInSouthAfrica(): ISODate {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Johannesburg' }).format(new Date());
}

// The client's copy of an estimate, laid out like the Estimation tab of the fee estimate workbook.
// Both the Excel and the PDF export are drawn from this one table, so they always agree.
import { MONTHS, MONTHS_LONG, parts } from '../domain/dates';
import { VAT_RATE, cents, type Estimate, type EstimateGroup } from '../domain/estimate';

export type VatMode = 'incl' | 'excl';

/**
 * Row types, as on the Estimation tab:
 * H heading, L service line, S group subtotal, B blank, T total estimated fees,
 * KA average per month, K annual figure, KT annual total including VAT.
 */
export type RowKind = 'H' | 'L' | 'S' | 'B' | 'T' | 'KA' | 'K' | 'KT';

export interface SheetRow {
  kind: RowKind;
  label: string;
  /** Twelve monthly amounts (L, S and T rows) */
  amounts?: number[];
  /** Amount in the Total column */
  total?: number;
}

export interface ClientSheet {
  mode: VatMode;
  title: string;
  preparedFor: string;
  dateLabel: string;
  periodLabel: string;
  amountsLabel: string;
  /** Month column headings, e.g. ["Nov", "2026"] */
  monthHeads: [string, string][];
  rows: SheetRow[];
  notes: string[];
  /** Suggested file name without the extension */
  fileName: string;
}

/** Client-facing headings for the estimate groups. */
const GROUPS: { group: EstimateGroup; heading: string }[] = [
  { group: 'Regular work', heading: 'Regular services' },
  { group: 'Compliance', heading: 'Tax and payroll returns' },
  { group: 'Annual work', heading: 'Annual and periodic services' },
  { group: 'Recharges', heading: 'Subscriptions and CIPC fees' },
  { group: 'Once-off', heading: 'Once-off setup' },
];

const monthName = (key: string, long = false) => {
  const [y, m] = key.split('-').map(Number);
  return `${(long ? MONTHS_LONG : MONTHS)[m - 1]} ${y}`;
};

const longDate = (d: string) => {
  const [y, m, day] = parts(d);
  return `${day} ${MONTHS_LONG[m - 1]} ${y}`;
};

/** A name that is safe in a file name on Windows, macOS and phones. */
const safe = (s: string) =>
  s
    .replace(/[\\/:*?"<>|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export function clientSheet(est: Estimate, opts: { clientName: string; asOf: string; mode: VatMode; vatCategory?: string; marchIncreasePct: number }): ClientSheet {
  const incl = opts.mode === 'incl';
  const rows: SheetRow[] = [];
  const pct = `${Math.round(VAT_RATE * 100)}%`;

  for (const { group, heading } of GROUPS) {
    const lines = est.lines.filter((l) => l.group === group);
    if (!lines.length) continue;
    rows.push({ kind: 'H', label: heading });
    const sub = est.months.map(() => 0);
    for (const l of lines) {
      const amounts = incl ? l.amountsInclVat : l.amounts;
      amounts.forEach((a, k) => (sub[k] += a));
      rows.push({ kind: 'L', label: l.note ? `${l.label}, ${l.note}` : l.label, amounts, total: incl ? l.totalInclVat : l.total });
    }
    const subtotal = sub.map(cents);
    rows.push({ kind: 'S', label: `Total ${heading.charAt(0).toLowerCase()}${heading.slice(1)}`, amounts: subtotal, total: cents(subtotal.reduce((a, b) => a + b, 0)) });
    rows.push({ kind: 'B', label: '' });
  }

  const totals = incl ? est.totalsInclVat : est.totals;
  const annual = incl ? est.annualInclVat : est.annual;
  rows.push({ kind: 'T', label: 'Total estimated fees', amounts: totals, total: annual });
  rows.push({ kind: 'B', label: '' });
  rows.push({ kind: 'KA', label: 'Average per month', total: cents(annual / 12) });
  rows.push({ kind: 'K', label: 'Annual total excluding VAT', total: est.annual });
  rows.push({ kind: 'K', label: `VAT at ${pct}`, total: est.vat });
  rows.push({ kind: 'KT', label: 'Annual total including VAT', total: est.annualInclVat });

  const has = (k: string) => est.lines.some((l) => l.key === k);
  const cipc = has('CIPC_FEE') || has('CIPC_NAME');
  const subs = has('XERO') || has('SIMPLEPAY');
  const cipcText = 'the CIPC fee, which is paid to CIPC on your behalf and recovered at cost';
  const notes: string[] = [];
  notes.push(
    (incl ? `Amounts include VAT at ${pct}${cipc ? `, except ${cipcText}` : ''}.` : `Amounts exclude VAT. VAT at ${pct} is added when invoiced${cipc ? `, except on ${cipcText}` : ''}.`) +
      (subs ? ' Software subscriptions are passed on at cost.' : ''),
  );
  notes.push(
    'This is an estimate, not a fixed fee or retainer. Fees are invoiced monthly for the work actually performed; the schedule shows when work is expected to be done and its estimated cost, so actual invoices may differ.',
  );
  const vatLine = est.lines.find((l) => l.key === 'VAT201');
  notes.push(
    (vatLine && opts.vatCategory ? `VAT201 fees follow VAT category ${opts.vatCategory} and fall in the month each return is due. ` : '') +
      'This estimate is based on the information provided; final fees may vary with actual transaction volumes and complexity.',
  );
  if (est.increaseApplied) {
    notes.push(`Professional fees from ${monthName(est.increaseFrom, true)} include the annual increase of ${opts.marchIncreasePct}%; subscriptions and CIPC fees do not.`);
  } else if (est.months.some((m) => m.endsWith('-03'))) {
    notes.push('Professional fees are reviewed annually in March; this estimate uses current prices.');
  }

  const first = est.months[0];
  const last = est.months[est.months.length - 1];
  const name = opts.clientName.trim();
  return {
    mode: opts.mode,
    title: 'ESTIMATED FEES',
    preparedFor: `Prepared for: ${name}`,
    dateLabel: `Date: ${longDate(opts.asOf)}`,
    periodLabel: `Estimate period: ${monthName(first, true)} – ${monthName(last, true)}`,
    amountsLabel: `Amounts in Rand, ${incl ? 'VAT inclusive' : 'VAT exclusive'}`,
    monthHeads: est.months.map((m) => {
      const [y, mm] = m.split('-').map(Number);
      return [MONTHS[mm - 1], String(y)];
    }),
    rows,
    notes: notes.map((n, k) => `${k + 1}. ${n}`),
    fileName: safe(`Fee estimate - ${name} - ${monthName(first)} (VAT ${incl ? 'incl' : 'excl'})`),
  };
}

/** 1,234.50 style, with a dash for nil, as the workbook's number format shows it. */
export function money(n: number): string {
  if (Math.abs(n) < 0.005) return '-';
  const s = Math.abs(n)
    .toFixed(2)
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return n < 0 ? `(${s})` : s;
}

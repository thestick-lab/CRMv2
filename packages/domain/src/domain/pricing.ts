// FD on Call pricing schedule ("Pricing.xlsx", sheet "Pricing (2)"), combined with the Xero items list of 27 October 2026.
// Where the two disagree on a fixed fee, the Xero item is used and the difference is listed in PRICE_DIFFERENCES.

export interface TurnoverBand {
  label: string;
  /** Turnover from (R), inclusive */
  from: number;
  accountingHours: number;
  afsHours: number;
  reviewHours: number;
  /** CIPC annual return fee, paid to CIPC on the client's behalf and recovered without VAT */
  cipcFee: number;
}

export const TURNOVER_BANDS: TurnoverBand[] = [
  { label: 'Up to R1m', from: 0, accountingHours: 2, afsHours: 12, reviewHours: 2, cipcFee: 100 },
  { label: 'R1m to R10m', from: 1_000_001, accountingHours: 4, afsHours: 16, reviewHours: 4, cipcFee: 450 },
  { label: 'R10m to R25m', from: 10_000_001, accountingHours: 6, afsHours: 24, reviewHours: 6, cipcFee: 2000 },
  { label: 'Over R25m', from: 25_000_001, accountingHours: 12, afsHours: 28, reviewHours: 12, cipcFee: 3000 },
];

export function turnoverBand(turnover: number | undefined): TurnoverBand | undefined {
  if (turnover === undefined || !Number.isFinite(turnover)) return undefined;
  let band = TURNOVER_BANDS[0];
  for (const b of TURNOVER_BANDS) if (turnover >= b.from) band = b;
  return band;
}

export interface PayrollBand {
  label: string;
  from: number;
  simplePayFee: number;
  payrollHours: number;
}

export const PAYROLL_BANDS: PayrollBand[] = [
  { label: '1–5 employees', from: 1, simplePayFee: 167.5, payrollHours: 0.5 },
  { label: '6–10 employees', from: 6, simplePayFee: 235.5, payrollHours: 0.75 },
  { label: '11–20 employees', from: 11, simplePayFee: 345.5, payrollHours: 1 },
  { label: '21–50 employees', from: 21, simplePayFee: 675.5, payrollHours: 1.25 },
];

/** The payroll band; more than 50 employees uses the top band and is flagged. */
export function payrollBand(employees: number | undefined): { band: PayrollBand; overLimit: boolean } {
  const n = employees && employees > 0 ? employees : 1;
  let band = PAYROLL_BANDS[0];
  for (const b of PAYROLL_BANDS) if (n >= b.from) band = b;
  return { band, overLimit: n > 50 };
}

export type XeroPlan = 'Starter' | 'Standard' | 'Premium';

/** Xero's list prices include VAT; the estimate works in amounts excluding VAT and adds VAT like any other line. */
const exVat = (incl: number) => Math.round((incl / 1.15) * 100) / 100;

export const XERO_PLANS: { plan: XeroPlan; fee: number; inclVat: number; when: string }[] = [
  { plan: 'Starter', fee: exVat(450), inclVat: 450, when: 'Up to 20 transactions a month' },
  { plan: 'Standard', fee: exVat(795), inclVat: 795, when: 'More than 20 transactions a month' },
  { plan: 'Premium', fee: exVat(1095), inclVat: 1095, when: 'Foreign-currency transactions' },
];

export const xeroPlanFee = (plan: XeroPlan) => XERO_PLANS.find((p) => p.plan === plan)!.fee;

/** When each fee falls, per the pricing schedule. */
export const TIMING = {
  /** AFS: months after the client's financial year end (Companies Act s30 deadline; the old schedule had 8) */
  afsMonthsAfterYearEnd: 6,
  /** ITR12 (individuals and directors) month */
  itr12Month: 10,
  /** Directors' IRP6 months */
  directorsIrp6Months: [8, 2],
  emp501AnnualMonth: 5,
  emp501InterimMonth: 10,
  coidaMonth: 5,
};

/** Fixed fees where the old pricing schedule and the current Xero items differ. */
export const PRICE_DIFFERENCES: { service: string; xero: string; schedule: string; used: string }[] = [
  { service: 'EMP201 monthly PAYE return', xero: 'R495', schedule: 'R545', used: 'R495' },
  { service: 'EMP501 reconciliation', xero: 'R1,900 / R2,500 / R3,250 by employees', schedule: 'R1,500', used: 'Xero tiers' },
  { service: 'ITR12 income tax return', xero: 'R1,050', schedule: 'R1,250 (directors)', used: 'R1,050' },
  { service: 'CIPC annual return, our fee', xero: 'R525 (CIPC-FAS)', schedule: 'R545', used: 'R525' },
  { service: 'COIDA return of earnings', xero: 'No item', schedule: 'R545 (placeholder)', used: 'R545' },
];

/** Rand amount in the firm's invoice style, e.g. R1,500 (cents shown only under R1,000 when there are any) */
export const rand = (n: number) => {
  const cents = Math.round(n * 100) % 100 !== 0 && Math.abs(n) < 1000;
  const str = cents ? n.toFixed(2) : String(Math.round(n));
  const [whole, frac] = str.split('.');
  return `R${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}${frac ? `.${frac}` : ''}`;
};

import { emp501Tier } from './catalogue';
import { MONTHS, type ISODate, iso, monthKey, parts, shiftMonth } from './dates';
import { TIMING, XERO_PLANS, payrollBand, rand, turnoverBand } from './pricing';
import { generateTasks } from './rules';
import type { Client, EntityType, ServiceCode, VatCategory } from './types';

/** Prices are the Xero items list of 27 October 2026; fees (not recharges) rise from the next March. */
export const PRICE_LIST_DATE: ISODate = '2026-10-27';
export const STANDARD_RATE = 625;
export const VAT_RATE = 0.15;

export const FIXED_FEES = {
  VAT201: 545,
  EMP201: 495,
  IRP6_NIL: 575,
  IRP6_PAYABLE: 650,
  ITR14: 1500,
  ITR12: 1050,
  ITR12T: 1500,
  /** Our fee for completing and filing the annual return and FAS (Xero CIPC-FAS) */
  CIPC_SUBMISSION: 525,
  BO: 2000,
  COIDA: 545,
  ITREG: 1050,
  CIPC_REG: 1950,
  CIPC_NAME: 210,
};

export type EstimateKey =
  | 'BOOKKEEPING'
  | 'PAYROLL'
  | 'MGMT'
  | 'VAT201'
  | 'EMP201'
  | 'EMP501'
  | 'IRP6'
  | 'COIDA'
  | 'AFS'
  | 'REVIEW'
  | 'ITR'
  | 'DIR_ITR12'
  | 'DIR_IRP6'
  | 'CIPC_AR'
  | 'BO'
  | 'XERO'
  | 'SIMPLEPAY'
  | 'CIPC_FEE'
  | 'ITREG'
  | 'CIPC_REG'
  | 'CIPC_NAME';

/** Regular hourly work that can run every month, with each VAT return, or in chosen months. */
export type RegularKey = 'BOOKKEEPING' | 'PAYROLL' | 'MGMT';
export type Frequency = 'monthly' | 'vat' | 'custom';
export interface Schedule {
  when: Frequency;
  /** Calendar months (1-12) when "custom" */
  months: number[];
}

export type EstimateGroup = 'Regular work' | 'Compliance' | 'Annual work' | 'Recharges' | 'Once-off';

export interface EstimateInput {
  /** First month of the estimate, YYYY-MM */
  startMonth: string;
  entityType: EntityType;
  yearEndMonth: number;
  vatCategory?: VatCategory;
  /** Annual turnover (R); sets the default hours and the CIPC fee */
  turnover?: number;
  payroll: boolean;
  employeeCount?: number;
  provisionalTaxpayer: boolean;
  incorporationDate?: ISODate;
  /** Companies: directors whose personal ITR12 and IRP6 we do */
  directors: number;
  rate: number;
  /** Percentage, e.g. 6 for 6% */
  marchIncreasePct: number;
  irp6Payable: boolean;
  selected: Partial<Record<EstimateKey, boolean>>;
  hours: { BOOKKEEPING: number; PAYROLL: number; MGMT: number; AFS: number; REVIEW: number };
  /** When the regular hourly work happens; every month unless set */
  schedule?: Partial<Record<RegularKey, Schedule>>;
  /** Calendar month (1-12) the annual work is done and billed */
  months: { AFS: number; REVIEW: number; ITR: number; CIPC_AR: number };
  recharges: { XERO: number; SIMPLEPAY: number };
}

export interface EstimateLine {
  key: EstimateKey;
  group: EstimateGroup;
  label: string;
  /** How the amount is worked out, for the firm */
  detail: string;
  /** Short qualifier for the client's copy, e.g. "category B" or "x2" */
  note?: string;
  amounts: number[];
  total: number;
  /** Only fees paid to CIPC on the client's behalf carry no VAT */
  vatable: boolean;
  /** Each month including VAT, rounded to the cent per month as on an invoice */
  amountsInclVat: number[];
  totalInclVat: number;
}

export interface Estimate {
  months: string[];
  lines: EstimateLine[];
  totals: number[];
  vatByMonth: number[];
  totalsInclVat: number[];
  annual: number;
  average: number;
  vat: number;
  annualInclVat: number;
  averageInclVat: number;
  increaseFrom: string;
  increaseApplied: boolean;
  warnings: string[];
}

/** Round to the cent, half up, without floating-point slips (391.30 x 1.15 = 449.995 gives 450.00). */
export const cents = (x: number) => Math.round(x * 100 + (x >= 0 ? 1e-6 : -1e-6)) / 100;

/** An amount including VAT, as it would appear on the invoice. */
export const withVat = (x: number, vatable = true) => (vatable ? cents(x * (1 + VAT_RATE)) : x);

const isCompany = (t: EntityType) => t === 'Company' || t === 'Close corporation';

/** Which estimate lines make sense for this kind of client. */
export function applicable(key: EstimateKey, i: Pick<EstimateInput, 'entityType' | 'vatCategory' | 'payroll' | 'provisionalTaxpayer'>): boolean {
  const company = isCompany(i.entityType);
  const trust = i.entityType === 'Trust';
  switch (key) {
    case 'VAT201':
      return !!i.vatCategory;
    case 'EMP201':
    case 'EMP501':
    case 'PAYROLL':
    case 'SIMPLEPAY':
    case 'COIDA':
      return i.payroll;
    case 'IRP6':
      return company || trust || i.provisionalTaxpayer;
    case 'AFS':
    case 'REVIEW':
      return company || trust;
    case 'CIPC_AR':
    case 'CIPC_FEE':
    case 'BO':
    case 'CIPC_REG':
    case 'CIPC_NAME':
    case 'DIR_ITR12':
    case 'DIR_IRP6':
      return company;
    default:
      return true;
  }
}

/** The ticks a new client starts with, from what we know about them. */
export function suggestedSelection(i: EstimateInput): Partial<Record<EstimateKey, boolean>> {
  const company = isCompany(i.entityType);
  return {
    BOOKKEEPING: i.entityType !== 'Individual',
    PAYROLL: i.payroll,
    MGMT: false,
    VAT201: !!i.vatCategory,
    EMP201: i.payroll,
    EMP501: i.payroll,
    COIDA: i.payroll,
    IRP6: company || i.entityType === 'Trust' || i.provisionalTaxpayer,
    AFS: i.entityType !== 'Individual',
    REVIEW: false,
    ITR: true,
    DIR_ITR12: false,
    DIR_IRP6: false,
    CIPC_AR: company,
    BO: false,
    XERO: i.entityType !== 'Individual',
    SIMPLEPAY: i.payroll,
    ITREG: false,
    CIPC_REG: false,
  };
}

/** Default hours from the turnover and payroll bands in the pricing schedule. */
export function bandHours(turnover: number | undefined, employees: number | undefined) {
  const t = turnoverBand(turnover) ?? turnoverBand(0)!;
  const p = payrollBand(employees);
  return { BOOKKEEPING: t.accountingHours, AFS: t.afsHours, REVIEW: t.reviewHours, PAYROLL: p.band.payrollHours };
}

/** Default months: AFS at the Companies Act deadline six months after year end, ITR14 the month after, ITR12 in October. */
export function suggestedMonths(i: Pick<EstimateInput, 'entityType' | 'yearEndMonth' | 'incorporationDate'>): EstimateInput['months'] {
  const ye = isCompany(i.entityType) ? i.yearEndMonth : 2;
  const after = (n: number) => ((ye - 1 + n) % 12) + 1;
  const afs = after(TIMING.afsMonthsAfterYearEnd);
  const itr = isCompany(i.entityType) ? (afs % 12) + 1 : TIMING.itr12Month;
  const ar = i.incorporationDate ? parts(i.incorporationDate)[1] : after(6);
  return { AFS: afs, REVIEW: afs, ITR: itr, CIPC_AR: ar };
}

export function itrLabel(t: EntityType): { name: string; fee: number } {
  if (t === 'Individual') return { name: 'Income tax return (ITR12)', fee: FIXED_FEES.ITR12 };
  if (t === 'Trust') return { name: 'Trust income tax return (ITR12T)', fee: FIXED_FEES.ITR12T };
  return { name: 'Company income tax return (ITR14)', fee: FIXED_FEES.ITR14 };
}

export function estimateMonths(startMonth: string): string[] {
  const [y, m] = startMonth.split('-').map(Number);
  return Array.from({ length: 12 }, (_, k) => {
    const [ty, tm] = shiftMonth(y, m, k);
    return iso(ty, tm, 1).slice(0, 7);
  });
}

export function formatMonthShort(key: string): string {
  const [y, m] = key.split('-').map(Number);
  return `${MONTHS[m - 1]} ${String(y).slice(2)}`;
}

export { rand };

/** The client's services in the compliance calendar, from the estimate ticks. */
export function servicesFromEstimate(i: EstimateInput): ServiceCode[] {
  const s = { ...suggestedSelection(i), ...i.selected };
  const on = (k: EstimateKey) => !!s[k] && applicable(k, i);
  const out: ServiceCode[] = [];
  if (on('AFS')) out.push('AFS');
  if (on('ITR')) out.push(i.entityType === 'Individual' ? 'ITR12' : i.entityType === 'Trust' ? 'ITR12T' : 'ITR14');
  if (on('IRP6')) out.push('IRP6');
  if (on('VAT201')) out.push('VAT201');
  if (on('EMP201')) out.push('EMP201');
  if (on('EMP501')) out.push('EMP501');
  if (on('CIPC_AR')) out.push('CIPC_AR');
  if (on('BO')) out.push('BO');
  return out;
}

/** The schedule in force for a regular service; "with each VAT return" falls back to monthly if the client is not VAT registered. */
export function effectiveSchedule(i: Pick<EstimateInput, 'schedule' | 'vatCategory'>, key: RegularKey): Schedule {
  const s = i.schedule?.[key] ?? { when: 'monthly', months: [] };
  if (s.when === 'vat' && !i.vatCategory) return { when: 'monthly', months: s.months };
  return s;
}

const VAT_FREQ: Record<VatCategory, string> = {
  A: 'every two months',
  B: 'every two months',
  C: 'monthly',
  D: 'every six months',
  E: 'once a year',
  F: 'every four months',
};

export function computeEstimate(i: EstimateInput): Estimate {
  const months = estimateMonths(i.startMonth);
  const index = new Map(months.map((m, k) => [m, k]));
  const sel = { ...suggestedSelection(i), ...i.selected };
  const on = (k: EstimateKey) => !!sel[k] && applicable(k, i);
  const warnings: string[] = [];

  const [py] = parts(PRICE_LIST_DATE);
  const increaseFrom = `${py + 1}-03`;
  const factor = (k: number) => (months[k] >= increaseFrom ? 1 + i.marchIncreasePct / 100 : 1);
  const increaseApplied = i.marchIncreasePct > 0 && months.some((m) => m >= increaseFrom);

  const lines: EstimateLine[] = [];
  /** Our fees rise in March; recharges are passed on at cost. Everything carries VAT except CIPC fees paid on the client's behalf. */
  type Kind = 'fee' | 'recharge' | 'cipc';
  const add = (key: EstimateKey, group: EstimateGroup, label: string, detail: string, raw: number[], kind: Kind = 'fee', note?: string) => {
    const amounts = raw.map((v, k) => cents(v * (kind === 'fee' ? factor(k) : 1)));
    const total = cents(amounts.reduce((a, b) => a + b, 0));
    const vatable = kind !== 'cipc';
    const amountsInclVat = amounts.map((a) => withVat(a, vatable));
    const totalInclVat = cents(amountsInclVat.reduce((a, b) => a + b, 0));
    if (total > 0) lines.push({ key, group, label, detail, note, amounts, total, vatable, amountsInclVat, totalInclVat });
  };
  const every = (v: number) => months.map(() => v);
  const inMonth = (calMonth: number, v: number) => months.map((m) => (Number(m.slice(5)) === calMonth ? v : 0));
  const first = (v: number) => months.map((_, k) => (k === 0 ? v : 0));
  const mon = (k: number) => MONTHS[k - 1];

  // When each return falls due, using the same rules as the deadline calendar.
  // Worked out for every return the client is liable for, so accounting can follow the VAT cycle even if we do not file the VAT.
  const liable: ServiceCode[] = [];
  if (i.vatCategory) liable.push('VAT201');
  if (i.payroll) liable.push('EMP201', 'EMP501');
  if (applicable('IRP6', i)) liable.push('IRP6');
  const counts = new Map<ServiceCode, number[]>();
  if (liable.length) {
    const tmp: Client = {
      code: 'NEW',
      name: 'New client',
      entityType: i.entityType,
      vatCategory: i.vatCategory,
      yearEndMonth: isCompany(i.entityType) ? i.yearEndMonth : 2,
      yearEndAssumed: false,
      efilingProfile: 'firm',
      staffId: '',
      payroll: i.payroll,
      employeeCount: i.employeeCount,
      provisionalTaxpayer: i.provisionalTaxpayer,
      lastAfsYear: null,
      lastIncomeTaxYear: null,
      lastAnnualReturnYear: null,
      beneficialOwnershipFiled: null,
      taxElsewhere: false,
      status: 'Active',
    };
    for (const t of generateTasks(tmp, liable, `${months[0]}-01`, 12)) {
      if (!t.due) continue;
      const k = index.get(monthKey(t.due));
      if (k === undefined) continue;
      const row = counts.get(t.service) ?? months.map(() => 0);
      row[k] += 1;
      counts.set(t.service, row);
    }
  }
  const n = (s: ServiceCode) => counts.get(s) ?? months.map(() => 0);

  // Regular hourly work: every month, with each VAT return, or in chosen months
  const regular = (key: RegularKey, label: string) => {
    const h = i.hours[key];
    if (!on(key) || h <= 0) return;
    const sched = effectiveSchedule(i, key);
    let pattern: number[];
    let when: string;
    if (sched.when === 'vat') {
      pattern = n('VAT201').map((c) => (c > 0 ? 1 : 0));
      const times = pattern.reduce((a, b) => a + b, 0);
      when = `with each VAT return (${times} in the year)`;
    } else if (sched.when === 'custom') {
      pattern = months.map((m) => (sched.months.includes(Number(m.slice(5))) ? 1 : 0));
      const names = [...sched.months].sort((a, b) => a - b).map((x) => MONTHS[x - 1]);
      when = names.length ? `in ${names.join(', ')}` : 'no months chosen';
    } else {
      pattern = every(1);
      when = 'a month';
    }
    add(key, 'Regular work', label, `${h} h ${when} × ${rand(i.rate)}`, pattern.map((x) => x * h * i.rate));
  };
  regular('BOOKKEEPING', 'Monthly accounting');
  regular('PAYROLL', 'Payroll processing');
  regular('MGMT', 'Management accounts and FD support');

  // Compliance returns, in the month they fall due
  if (on('VAT201') && i.vatCategory)
    add('VAT201', 'Compliance', 'VAT returns (VAT201)', `Category ${i.vatCategory}, ${VAT_FREQ[i.vatCategory]}, ${rand(FIXED_FEES.VAT201)} each`, n('VAT201').map((c) => c * FIXED_FEES.VAT201), 'fee', `category ${i.vatCategory}`);
  if (on('EMP201')) add('EMP201', 'Compliance', 'PAYE returns (EMP201)', `Monthly, ${rand(FIXED_FEES.EMP201)} each`, n('EMP201').map((c) => c * FIXED_FEES.EMP201));
  if (on('EMP501')) {
    const tier = emp501Tier(i.employeeCount ?? 1)!;
    const fee = Number(tier.fee.replace(/[^\d]/g, ''));
    add('EMP501', 'Compliance', 'Employer reconciliations (EMP501)', `Interim and annual, ${tier.label.toLowerCase()}, ${tier.fee} each`, n('EMP501').map((c) => c * fee));
  }
  if (on('IRP6')) {
    const fee = i.irp6Payable ? FIXED_FEES.IRP6_PAYABLE : FIXED_FEES.IRP6_NIL;
    add('IRP6', 'Compliance', 'Provisional tax (IRP6)', `Two payments a year, ${rand(fee)} each (${i.irp6Payable ? 'tax payable' : 'nil'})`, n('IRP6').map((c) => c * fee));
  }
  if (on('COIDA')) add('COIDA', 'Compliance', 'COIDA return of earnings', `${rand(FIXED_FEES.COIDA)}, in ${mon(TIMING.coidaMonth)}`, inMonth(TIMING.coidaMonth, FIXED_FEES.COIDA));

  // Annual work, in the month chosen
  if (on('AFS') && i.hours.AFS > 0)
    add('AFS', 'Annual work', 'Annual financial statements', `${i.hours.AFS} h × ${rand(i.rate)}, in ${mon(i.months.AFS)}`, inMonth(i.months.AFS, i.hours.AFS * i.rate));
  if (on('REVIEW') && i.hours.REVIEW > 0)
    add('REVIEW', 'Annual work', 'Independent review', `${i.hours.REVIEW} h × ${rand(i.rate)}, in ${mon(i.months.REVIEW)}`, inMonth(i.months.REVIEW, i.hours.REVIEW * i.rate));
  if (on('ITR')) {
    const itr = itrLabel(i.entityType);
    add('ITR', 'Annual work', itr.name, `${rand(itr.fee)}, in ${mon(i.months.ITR)}`, inMonth(i.months.ITR, itr.fee));
  }
  const d = Math.max(0, Math.floor(i.directors || 0));
  if (on('DIR_ITR12') && d > 0)
    add('DIR_ITR12', 'Annual work', "Directors' income tax returns (ITR12)", `${d} × ${rand(FIXED_FEES.ITR12)}, in ${mon(TIMING.itr12Month)}`, inMonth(TIMING.itr12Month, d * FIXED_FEES.ITR12), 'fee', d > 1 ? `${d} directors` : undefined);
  if (on('DIR_IRP6') && d > 0) {
    const fee = i.irp6Payable ? FIXED_FEES.IRP6_PAYABLE : FIXED_FEES.IRP6_NIL;
    const raw = months.map((m) => (TIMING.directorsIrp6Months.includes(Number(m.slice(5))) ? d * fee : 0));
    add('DIR_IRP6', 'Annual work', "Directors' provisional tax (IRP6)", `${d} × ${rand(fee)}, in ${TIMING.directorsIrp6Months.map(mon).join(' and ')}`, raw, 'fee', d > 1 ? `${d} directors` : undefined);
  }
  if (on('CIPC_AR'))
    add('CIPC_AR', 'Annual work', 'CIPC annual return and FAS', `Our fee ${rand(FIXED_FEES.CIPC_SUBMISSION)}, in ${mon(i.months.CIPC_AR)}`, inMonth(i.months.CIPC_AR, FIXED_FEES.CIPC_SUBMISSION));
  if (on('BO')) add('BO', 'Annual work', 'Beneficial ownership update', `${rand(FIXED_FEES.BO)}, with the annual return`, inMonth(i.months.CIPC_AR, FIXED_FEES.BO));

  // Recharges: passed on at cost, no March increase; the CIPC fee carries no VAT
  if (on('CIPC_AR')) {
    const band = turnoverBand(i.turnover);
    if (band)
      add('CIPC_FEE', 'Recharges', 'CIPC annual return fee', `Paid to CIPC, no VAT, turnover ${band.label}, in ${mon(i.months.CIPC_AR)}`, inMonth(i.months.CIPC_AR, band.cipcFee), 'cipc');
    else warnings.push('Add the turnover to include the CIPC annual return fee.');
  }
  if (on('XERO') && i.recharges.XERO > 0) {
    const plan = XERO_PLANS.find((p) => p.fee === i.recharges.XERO);
    const detail = plan ? `${plan.plan} plan, ${rand(plan.fee)} a month excl. VAT (Xero price ${rand(plan.inclVat)} incl. VAT)` : `${rand(i.recharges.XERO)} a month excl. VAT`;
    add('XERO', 'Recharges', 'Xero subscription', detail, every(i.recharges.XERO), 'recharge', plan ? `${plan.plan} plan` : undefined);
  }
  if (on('SIMPLEPAY') && i.recharges.SIMPLEPAY > 0)
    add('SIMPLEPAY', 'Recharges', 'SimplePay subscription', `${rand(i.recharges.SIMPLEPAY)} a month excl. VAT`, every(i.recharges.SIMPLEPAY), 'recharge');
  if (on('SIMPLEPAY') && i.payroll && payrollBand(i.employeeCount).overLimit)
    warnings.push('More than 50 employees: payroll uses the top band (21–50). Check the SimplePay fee and payroll hours.');

  // Once-off setup in the first month
  if (on('ITREG')) add('ITREG', 'Once-off', 'Income tax registration', `${rand(FIXED_FEES.ITREG)}, first month`, first(FIXED_FEES.ITREG));
  if (on('CIPC_REG')) {
    add('CIPC_REG', 'Once-off', 'Company registration', `${rand(FIXED_FEES.CIPC_REG)}, first month`, first(FIXED_FEES.CIPC_REG));
    add('CIPC_NAME', 'Recharges', 'CIPC name reservation fee', `Paid to CIPC, no VAT, first month`, first(FIXED_FEES.CIPC_NAME), 'cipc');
  }

  // VAT is worked out line by line and month by month, so the VAT-inclusive lines add up to the VAT-inclusive totals.
  const totals = months.map((_, k) => cents(lines.reduce((a, l) => a + l.amounts[k], 0)));
  const totalsInclVat = months.map((_, k) => cents(lines.reduce((a, l) => a + l.amountsInclVat[k], 0)));
  const vatByMonth = months.map((_, k) => cents(totalsInclVat[k] - totals[k]));
  const annual = cents(totals.reduce((a, b) => a + b, 0));
  const annualInclVat = cents(totalsInclVat.reduce((a, b) => a + b, 0));
  const vat = cents(annualInclVat - annual);
  return {
    months,
    lines,
    totals,
    vatByMonth,
    totalsInclVat,
    annual,
    average: annual / 12,
    vat,
    annualInclVat,
    averageInclVat: annualInclVat / 12,
    increaseFrom,
    increaseApplied,
    warnings,
  };
}

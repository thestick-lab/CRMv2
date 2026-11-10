import type { Client, EntityType, ServiceCode, VatCategory } from 'fdoncall-practice/domain/types';
import {
  applicable,
  bandHours,
  effectiveSchedule,
  suggestedMonths,
  suggestedSelection,
  type EstimateInput,
  type EstimateKey,
  type Frequency,
  type RegularKey,
} from 'fdoncall-practice/domain/estimate';
import { MONTHS_LONG, todayInSouthAfrica } from 'fdoncall-practice/domain/dates';
import { defaultServices } from 'fdoncall-practice/domain/rules';

/**
 * The estimator form, moved out of the retired EstimateCalculator and shared by
 * the quote builder's Scope and Fee schedule steps. Statutory pricing stays in
 * `fdoncall-practice/domain/estimate`; this module only arranges its inputs.
 */

export interface EstimateRates {
  standardHourlyRate: number;
  marchEscalationPct: number;
  serviceFees: Record<string, number>;
}

export interface EstimateGroupSpec {
  /** Group heading shown to the client, matching the prototype's five groups. */
  label: string;
  note: string;
  keys: EstimateKey[];
}

export const ESTIMATE_GROUPS: EstimateGroupSpec[] = [
  {
    label: 'Regular work',
    note: 'Recurring hourly work: every month, with each VAT return, or in chosen months.',
    keys: ['BOOKKEEPING', 'PAYROLL', 'MGMT'],
  },
  {
    label: 'Compliance',
    note: 'Returns filed through the year, billed in the month they fall due.',
    keys: ['VAT201', 'EMP201', 'EMP501', 'IRP6', 'COIDA'],
  },
  {
    label: 'Annual work',
    note: 'Year-end and annual returns, billed in the month chosen for each.',
    keys: ['AFS', 'REVIEW', 'ITR', 'DIR_ITR12', 'DIR_IRP6', 'CIPC_AR', 'BO'],
  },
  {
    label: 'Recharges',
    note: 'Software passed on at cost — no March increase, VAT as the supplier charges it.',
    keys: ['XERO', 'SIMPLEPAY'],
  },
  {
    label: 'Once-off setup',
    note: 'First-month onboarding work for a newly registered entity.',
    keys: ['ITREG', 'CIPC_REG'],
  },
];

export const SERVICE_LABELS: Record<EstimateKey, string> = {
  BOOKKEEPING: 'Monthly bookkeeping',
  PAYROLL: 'Payroll processing',
  MGMT: 'Management accounts & FD support',
  VAT201: 'VAT returns (VAT201)',
  EMP201: 'PAYE returns (EMP201)',
  EMP501: 'Employer reconciliations (EMP501)',
  IRP6: 'Provisional tax (IRP6)',
  COIDA: 'COIDA return of earnings',
  AFS: 'Annual financial statements',
  REVIEW: 'Independent review',
  ITR: 'Income tax return',
  DIR_ITR12: "Directors' income tax returns (ITR12)",
  DIR_IRP6: "Directors' provisional tax (IRP6)",
  CIPC_AR: 'CIPC annual return and FAS',
  BO: 'Beneficial ownership update',
  XERO: 'Xero subscription',
  SIMPLEPAY: 'SimplePay subscription',
  ITREG: 'Income tax registration',
  CIPC_REG: 'Company registration',
  CIPC_FEE: 'CIPC annual return fee',
  CIPC_NAME: 'CIPC name reservation fee',
};

export const REGULAR_KEYS: RegularKey[] = ['BOOKKEEPING', 'PAYROLL', 'MGMT'];

export const REGULAR_LABELS: Record<RegularKey, string> = {
  BOOKKEEPING: 'Monthly bookkeeping',
  PAYROLL: 'Payroll processing',
  MGMT: 'Management accounts & FD support',
};

export const ENTITY_TYPE_OPTIONS: Array<{ value: EntityType; label: string }> = [
  { value: 'Company', label: 'Private company (Pty) Ltd' },
  { value: 'Close corporation', label: 'Close corporation (CC)' },
  { value: 'Trust', label: 'Trust' },
  { value: 'Individual', label: 'Individual' },
];

export const VAT_CATEGORY_OPTIONS: Array<{ value: VatCategory | ''; label: string }> = [
  { value: '', label: 'Not VAT registered' },
  { value: 'A', label: 'Category A (odd months)' },
  { value: 'B', label: 'Category B (even months)' },
  { value: 'C', label: 'Category C (monthly)' },
  { value: 'D', label: 'Category D (February & August)' },
  { value: 'E', label: 'Category E (annual)' },
  { value: 'F', label: 'Category F (February, June & October)' },
];

export const FREQUENCY_OPTIONS: Array<{ value: Frequency; label: string }> = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'vat', label: 'With each VAT return' },
  { value: 'custom', label: 'Chosen months' },
];

export const FIELD_LABEL_CLASS = 'block text-[11px] font-medium text-foreground';
export const FIELD_INPUT_CLASS =
  'mt-1 w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-[#c4161c]/60 focus-visible:ring-1 focus-visible:ring-[#c4161c]/40 disabled:cursor-not-allowed disabled:opacity-60';

/** The VAT201 months a category files in — used to count the first month's regular work. */
const VAT_MONTHS: Record<VatCategory, (month: number) => boolean> = {
  A: (month) => month % 2 === 1,
  B: (month) => month % 2 === 0,
  C: () => true,
  D: (month) => month === 2 || month === 8,
  E: (month) => month === 2,
  F: (month) => month === 2 || month === 6 || month === 10,
};

const SERVICE_TO_KEY: Partial<Record<ServiceCode, EstimateKey>> = {
  AFS: 'AFS',
  ITR14: 'ITR',
  ITR12: 'ITR',
  ITR12T: 'ITR',
  IRP6: 'IRP6',
  VAT201: 'VAT201',
  EMP201: 'EMP201',
  EMP501: 'EMP501',
  CIPC_AR: 'CIPC_AR',
  BO: 'BO',
};

/** A client's recorded services, mapped onto the estimate ticks that produce them. */
export function selectionFromServices(
  services: ServiceCode[]
): Partial<Record<EstimateKey, boolean>> {
  const selection: Partial<Record<EstimateKey, boolean>> = {};
  for (const service of services) {
    const key = SERVICE_TO_KEY[service];
    if (key) selection[key] = true;
  }
  return selection;
}

export function formatZar(value: number, fractionDigits = 2): string {
  return `R ${value.toLocaleString('en-ZA', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })}`;
}

function baseInput(
  values: Pick<
    EstimateInput,
    'entityType' | 'yearEndMonth' | 'vatCategory' | 'turnover' | 'payroll' | 'employeeCount'
  >,
  rates: EstimateRates
): EstimateInput {
  const provisionalTaxpayer = values.entityType !== 'Individual';
  return {
    startMonth: todayInSouthAfrica().slice(0, 7),
    entityType: values.entityType,
    yearEndMonth: values.yearEndMonth,
    vatCategory: values.vatCategory,
    turnover: values.turnover,
    payroll: values.payroll,
    employeeCount: values.employeeCount,
    provisionalTaxpayer,
    directors: values.entityType === 'Company' || values.entityType === 'Close corporation' ? 1 : 0,
    rate: rates.standardHourlyRate,
    marchIncreasePct: rates.marchEscalationPct,
    irp6Payable: true,
    selected: {},
    hours: { ...bandHours(values.turnover, values.employeeCount), MGMT: 0, REVIEW: 0 },
    schedule: {},
    months: suggestedMonths({
      entityType: values.entityType,
      yearEndMonth: values.yearEndMonth,
    }),
    recharges: { XERO: 0, SIMPLEPAY: 0 },
    fixedFees: rates.serviceFees,
  };
}

/** A blank prospect quote: a VAT-registered company with payroll, at the pricing bands. */
export function defaultProspectInput(rates: EstimateRates): EstimateInput {
  const draft = baseInput(
    {
      entityType: 'Company',
      yearEndMonth: 2,
      vatCategory: 'B',
      turnover: 4_000_000,
      payroll: true,
      employeeCount: 8,
    },
    rates
  );
  return {
    ...draft,
    selected: {
      ...suggestedSelection(draft),
      BOOKKEEPING: true,
      XERO: true,
      SIMPLEPAY: true,
    },
    recharges: { XERO: 691.3, SIMPLEPAY: 235.5 },
  };
}

/**
 * Pre-fills an existing client's estimate from their record and services on
 * file. The saved estimate, when one exists, remains the client's baseline.
 */
export function defaultEstimateInputForClient(client: Client, rates: EstimateRates): EstimateInput {
  const turnover = client.turnover ?? 4_000_000;
  const employeeCount = client.employeeCount ?? (client.payroll ? 8 : 0);
  const draft = baseInput(
    {
      entityType: client.entityType,
      yearEndMonth: client.yearEndMonth,
      vatCategory: client.vatCategory,
      turnover,
      payroll: client.payroll,
      employeeCount,
    },
    rates
  );
  const services = selectionFromServices(defaultServices(client));
  return {
    ...draft,
    provisionalTaxpayer: client.provisionalTaxpayer ?? draft.provisionalTaxpayer,
    selected: {
      ...suggestedSelection(draft),
      ...services,
      BOOKKEEPING: client.entityType !== 'Individual',
      XERO: client.entityType !== 'Individual',
      SIMPLEPAY: client.payroll,
      VAT201: Boolean(client.vatCategory),
    },
    recharges: {
      XERO: client.entityType !== 'Individual' ? 691.3 : 0,
      SIMPLEPAY: client.payroll ? 235.5 : 0,
    },
  };
}

/** Whether the first month of the estimate contains a regular line's work. */
function firstMonthIncludes(input: EstimateInput, key: RegularKey): boolean {
  const schedule = effectiveSchedule(input, key);
  const month = Number(input.startMonth.slice(5));
  if (schedule.when === 'monthly') return true;
  if (schedule.when === 'custom') return schedule.months.includes(month);
  const vatCategory = input.vatCategory;
  return vatCategory ? VAT_MONTHS[vatCategory](month) : true;
}

/** The quote's monthly retainer allowance: the first month's regular-work hours. */
export function monthlyRetainerHoursFrom(input: EstimateInput): number {
  const selection = { ...suggestedSelection(input), ...input.selected };
  let hours = 0;
  for (const key of REGULAR_KEYS) {
    if (!selection[key] || !applicable(key, input) || input.hours[key] <= 0) continue;
    if (firstMonthIncludes(input, key)) hours += input.hours[key];
  }
  return Math.round(hours * 100) / 100;
}

/** Back to the published pricing bands: rate, March increase, banded hours and months. */
export function pricingBandReset(input: EstimateInput, rates: EstimateRates): EstimateInput {
  const hours = bandHours(input.turnover, input.employeeCount);
  return {
    ...input,
    rate: rates.standardHourlyRate,
    marchIncreasePct: rates.marchEscalationPct,
    fixedFees: rates.serviceFees,
    hours: {
      ...input.hours,
      BOOKKEEPING: hours.BOOKKEEPING,
      PAYROLL: hours.PAYROLL,
      AFS: hours.AFS,
    },
    months: { ...suggestedMonths(input), REVIEW: input.months.REVIEW },
  };
}

/** Why a service cannot be quoted for this client, or null when it can. */
export function inapplicableReason(key: EstimateKey, input: EstimateInput): string | null {
  if (applicable(key, input)) return null;
  switch (key) {
    case 'VAT201':
      return 'Record a VAT category before quoting VAT returns';
    case 'EMP201':
    case 'EMP501':
    case 'COIDA':
    case 'PAYROLL':
    case 'SIMPLEPAY':
      return 'Payroll is off for this client';
    case 'IRP6':
      return 'Not a provisional taxpayer';
    case 'AFS':
    case 'REVIEW':
      return 'Only companies, close corporations and trusts need this';
    default:
      return 'Only registered companies and close corporations need this';
  }
}

/** Month options for the start-month select: this month and the year after. */
export function startMonthOptions(from = todayInSouthAfrica()): Array<{ value: string; label: string }> {
  const [year, month] = from.slice(0, 7).split('-').map(Number);
  return Array.from({ length: 13 }, (_, index) => {
    const absolute = year * 12 + (month - 1) + index;
    const optionYear = Math.floor(absolute / 12);
    const optionMonth = (absolute % 12) + 1;
    return {
      value: `${optionYear}-${String(optionMonth).padStart(2, '0')}`,
      label: `${MONTHS_LONG[optionMonth - 1]} ${optionYear}`,
    };
  });
}

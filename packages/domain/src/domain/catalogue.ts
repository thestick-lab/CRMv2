import type { ServiceCode, ServiceType } from './types';

/** Services that generate compliance work, with fees from the Xero items list of 27 October 2026. */
export const SERVICE_TYPES: ServiceType[] = [
  {
    code: 'AFS',
    name: 'Annual financial statements',
    short: 'AFS',
    xeroItems: 'ACC (hourly)',
    feeLabel: 'Hourly, R625',
    review: 'always',
    appliesTo: ['Company', 'Close corporation', 'Trust'],
    recurrence: 'Once a year, from the financial year end',
    deadlineRule: 'Six months after the financial year end',
    basis: 'Companies Act s30(1) for companies; internal target for trusts',
    statutory: true,
  },
  {
    code: 'ITR14',
    name: 'Company income tax return (ITR14)',
    short: 'ITR14',
    xeroItems: 'ITR14',
    feeLabel: 'R1,500',
    review: 'always',
    appliesTo: ['Company', 'Close corporation'],
    recurrence: 'Once a year, after the AFS',
    deadlineRule: '12 months after the financial year end',
    basis: 'SARS',
    statutory: true,
  },
  {
    code: 'ITR12',
    name: 'Individual income tax return (ITR12)',
    short: 'ITR12',
    xeroItems: 'ITR12',
    feeLabel: 'R1,050',
    review: 'always',
    appliesTo: ['Individual'],
    recurrence: 'Once a year, per tax year ending February',
    deadlineRule: 'SARS filing season deadline: one date for provisional and one for non-provisional taxpayers',
    basis: 'SARS, announced each year',
    statutory: true,
  },
  {
    code: 'ITR12T',
    name: 'Trust income tax return (ITR12T)',
    short: 'ITR12T',
    xeroItems: 'IT12TR',
    feeLabel: 'R1,500',
    review: 'always',
    appliesTo: ['Trust'],
    recurrence: 'Once a year, per tax year ending February',
    deadlineRule: 'SARS filing season deadline for trusts',
    basis: 'SARS, announced each year',
    statutory: true,
  },
  {
    code: 'IRP6',
    name: 'Provisional tax (IRP6)',
    short: 'IRP6',
    xeroItems: 'IRP6N (nil) / IRP6P (payable)',
    feeLabel: 'R575 nil / R650 payable',
    review: 'when-payable',
    appliesTo: ['Company', 'Close corporation', 'Trust', 'Individual'],
    recurrence: 'Twice a year; the optional third top-up is added by hand',
    deadlineRule: '1st: end of month 6 of the financial year. 2nd: the financial year end',
    basis: 'SARS',
    statutory: true,
  },
  {
    code: 'VAT201',
    name: 'VAT return (VAT201)',
    short: 'VAT201',
    xeroItems: 'vat',
    feeLabel: 'R545',
    review: 'never',
    appliesTo: ['Company', 'Close corporation', 'Trust', 'Individual'],
    recurrence: 'A: two-monthly, periods ending Jan, Mar, May, Jul, Sep, Nov. B: two-monthly, ending Feb, Apr, Jun, Aug, Oct, Dec. C: monthly. D: six-monthly, Feb and Aug. E: annually at the year end. F: four-monthly, Feb, Jun, Oct',
    deadlineRule: 'Last business day of the month after the period (eFiling)',
    basis: 'SARS',
    statutory: true,
  },
  {
    code: 'EMP201',
    name: 'Monthly employer declaration (EMP201)',
    short: 'EMP201',
    xeroItems: 'EMP',
    feeLabel: 'R495',
    review: 'never',
    appliesTo: ['Company', 'Close corporation', 'Trust', 'Individual'],
    recurrence: 'Monthly, for clients with payroll',
    deadlineRule: '7th of the following month',
    basis: 'SARS',
    statutory: true,
  },
  {
    code: 'EMP501',
    name: 'Employer reconciliation (EMP501)',
    short: 'EMP501',
    xeroItems: 'EMP5 Small / EMP 501 Medium / EMP 501 Large',
    feeLabel: 'R1,900 (1–10 staff) / R2,500 (11–30) / R3,250 (31+)',
    review: 'always',
    appliesTo: ['Company', 'Close corporation', 'Trust', 'Individual'],
    recurrence: 'Twice a year: interim (March to August) and annual (March to February)',
    deadlineRule: 'Interim by 31 October; annual by 31 May',
    basis: 'SARS',
    statutory: true,
  },
  {
    code: 'CIPC_AR',
    name: 'CIPC annual return and FAS',
    short: 'Annual return',
    xeroItems: 'CIPC-FAS + CIPC-AR (CIPC fee)',
    feeLabel: 'R525 + CIPC fee by turnover (R100 to R3,000)',
    review: 'never',
    appliesTo: ['Company', 'Close corporation'],
    recurrence: 'Once a year, from the incorporation date',
    deadlineRule: 'Within 30 business days after the anniversary of incorporation',
    basis: 'Companies Act s33 and CIPC',
    statutory: true,
  },
  {
    code: 'BO',
    name: 'Beneficial ownership (CIPC)',
    short: 'Beneficial ownership',
    xeroItems: 'BOC',
    feeLabel: 'R2,000',
    review: 'never',
    appliesTo: ['Company', 'Close corporation'],
    recurrence: 'On any change, and confirmed with the annual return',
    deadlineRule: 'No recurring deadline; a task is added when ownership changes',
    basis: 'Companies Act and CIPC',
    statutory: true,
  },
];

export function serviceType(code: ServiceCode): ServiceType {
  const found = SERVICE_TYPES.find((s) => s.code === code);
  if (!found) throw new Error(`Unknown service ${code}`);
  return found;
}

/** EMP501 fee tier from the number of employees. */
export function emp501Tier(employees: number | undefined): { label: string; fee: string } | undefined {
  if (employees === undefined) return undefined;
  if (employees <= 10) return { label: 'Small (1–10 staff)', fee: 'R1,900' };
  if (employees <= 30) return { label: 'Medium (11–30 staff)', fee: 'R2,500' };
  return { label: 'Large (31+ staff)', fee: 'R3,250' };
}

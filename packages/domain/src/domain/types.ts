import type { ISODate } from './dates';

export type EntityType = 'Company' | 'Close corporation' | 'Trust' | 'Individual';

/** SARS VAT categories: A and B two-monthly, C monthly, D six-monthly (Feb and Aug), E annual, F four-monthly (Feb, Jun, Oct). */
export type VatCategory = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

export type TurnoverSource = 'Xero' | 'AFS' | 'Tax return' | 'Client' | 'Other';

export interface StaffMember {
  id: string;
  name: string;
  role: string;
  kind: 'employee' | 'subcontractor';
}

export interface Group {
  id: string;
  name: string;
}

export interface Client {
  code: string;
  name: string;
  entityType: EntityType;
  groupId?: string;
  /** Withheld in the prototype; held encrypted in the live system. */
  regOrIdNumber?: string;
  taxNumber?: string;
  /** undefined = not registered for VAT */
  vatCategory?: VatCategory;
  /** Date VAT registration took effect; no VAT returns are generated for periods ending before it */
  vatRegisteredOn?: ISODate;
  /** Month the financial year ends (1-12). Trusts and individuals follow the February tax year. */
  yearEndMonth: number;
  /** true when the year end was assumed rather than recorded */
  yearEndAssumed: boolean;
  efilingProfile: 'client' | 'firm';
  /** Date the client's tax types were moved onto FD on Call's eFiling profile */
  efilingTransferredOn?: ISODate;
  staffId: string;
  subcontractorId?: string;
  payroll: boolean;
  /** Date the client started running payroll with us; no EMP201/EMP501 for periods ending before it */
  payrollFrom?: ISODate;
  employeeCount?: number;
  /** Individuals only: decides the ITR12 deadline and whether IRP6 applies. */
  provisionalTaxpayer?: boolean;
  incorporationDate?: ISODate;
  /** Last known annual turnover (R), the financial year it relates to and where it came from */
  turnover?: number;
  turnoverYear?: number;
  turnoverSource?: TurnoverSource;
  /** Year of the last financial year done; null = not a service we provide. */
  lastAfsYear: number | null;
  lastIncomeTaxYear: number | null;
  lastAnnualReturnYear: number | null;
  beneficialOwnershipFiled: boolean | null;
  /** Income tax handled by another firm. */
  taxElsewhere: boolean;
  status: 'Active' | 'Dormant' | 'Resigned';
  notes?: string;
}

export type ServiceCode =
  | 'AFS'
  | 'ITR14'
  | 'ITR12'
  | 'ITR12T'
  | 'IRP6'
  | 'VAT201'
  | 'EMP201'
  | 'EMP501'
  | 'CIPC_AR'
  | 'BO';

export type ReviewRule = 'always' | 'never' | 'when-payable';

export interface ServiceType {
  code: ServiceCode;
  name: string;
  /** Short label for lists */
  short: string;
  xeroItems: string;
  feeLabel: string;
  review: ReviewRule;
  appliesTo: EntityType[];
  recurrence: string;
  deadlineRule: string;
  basis: string;
  statutory: boolean;
}

export type TaskStatus = 'Not started' | 'In progress' | 'Awaiting client' | 'In review' | 'Submitted' | 'Done';

export const TASK_STATUSES: TaskStatus[] = ['Not started', 'In progress', 'Awaiting client', 'In review', 'Submitted', 'Done'];

export type Irp6Outcome = 'unknown' | 'nil' | 'payable';

export interface Task {
  id: string;
  clientCode: string;
  service: ServiceCode;
  /** e.g. "Aug–Sep 2026", "FY Feb 2026", "2026 tax year" */
  period: string;
  /** e.g. "1st payment" or "Interim" */
  part?: string;
  due?: ISODate;
  /** Why there is no firm date yet */
  dueNote?: string;
  /** Date is an estimate (SARS has not announced it) */
  estimated?: boolean;
  /** Late even though no exact date is known (e.g. a missed annual return year) */
  likelyLate?: boolean;
  /** Extra facts the person doing the work needs, e.g. the turnover to declare */
  info?: string;
  /** A detail missing from the client's profile */
  missing?: string;
  statutory: boolean;
  review: ReviewRule;
  feeLabel: string;
  assigneeId: string;
}

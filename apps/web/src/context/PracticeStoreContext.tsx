import * as React from 'react';
import { CLIENTS, STAFF } from 'fdoncall-practice/data/seed';
import type {
  Client,
  EntityType,
  ServiceCode,
  StaffMember,
  VatCategory,
} from 'fdoncall-practice/domain/types';
import type { EstimateInput } from 'fdoncall-practice/domain/estimate';
import { todayInSouthAfrica, type ISODate } from 'fdoncall-practice/domain/dates';
import type { WorkflowStatus } from '@/lib/workflow';
import { signInWithCredentials } from '@/lib/auth-client';

/**
 * A prospect as persisted by the legacy onboarding pipeline. Leads are no
 * longer part of practice state: `MIGRATE_LEADS` converts them to quotes and
 * the field is dropped on load.
 */
export interface LegacyLead {
  id: string;
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  stage: 'Lead' | 'Discovery' | 'Estimate Sent' | 'KYC & Transfer' | 'Active Client';
  turnover: number;
  estimatedMonthlyFee: number;
  partnerId: string;
  notes?: string;
}

/** HR terms for a practice team member (Team register). Never fabricate a rate. */
export interface PracticeContract {
  startDate?: ISODate;
  contractType: 'employee' | 'subcontractor';
  hourlyRate?: number;
  phone?: string;
}

export interface PracticeUser {
  id: string;
  name: string;
  role: 'Partner' | 'Compliance Officer' | 'Accountant' | 'Team member' | 'Subcontractor';
  email: string;
  kind: 'employee' | 'subcontractor';
  contract?: PracticeContract;
}

export interface PracticeRates {
  standardHourlyRate: number;
  marchEscalationPct: number;
  serviceFees: Record<string, number>;
  updatedBy?: string;
  updatedAt?: string;
}

export interface AiApiKeys {
  anthropic?: string;
  openai?: string;
  gemini?: string;
}

/**
 * Credentials for the external integration services. Stored locally next to the
 * AI provider keys; the simulated adapters ignore them until the live Documenso
 * and Xero connections are switched on.
 */
export interface IntegrationConfig {
  documensoBaseUrl: string;
  documensoApiKey: string;
  xeroClientId: string;
  xeroClientSecret: string;
  xeroTenantId: string;
}

export interface TaskStatusMetadata {
  sarsReference?: string;
  partnerSignOff?: boolean;
  submissionDate?: string;
  approvedBy?: string;
  service?: string;
  clientName?: string;
  period?: string;
  /** IRP6 only: whether the provisional return carried a payment or was nil. */
  irp6Outcome?: 'nil' | 'payable';
}

export interface TaskStatusOverride extends TaskStatusMetadata {
  status: string;
  updatedAt?: string;
}

export type Division = 'fd-on-call' | 'accountant-on-call';

/* ---------------------------------------------------------------------------
 * Foundation types consumed by the quote→invoice flow, time tracking,
 * permissions matrix and the governance/activity trail. Later feature work
 * adds reducer actions over these shapes; they are declared once here.
 * ------------------------------------------------------------------------- */

export type QuoteStage =
  | 'Draft Quote'
  | 'Quote Sent'
  | 'Accepted'
  | 'Signed'
  | 'Active Client'
  | 'Closed Lost';

/** Unregistered prospect captured before the quote becomes a practice client. */
export interface QuoteProspect {
  name: string;
  contactPerson: string;
  entityType: EntityType;
  turnover?: number;
  payroll?: boolean;
  employeeCount?: number;
  vatCategory?: VatCategory;
  yearEndMonth?: number;
  incorporationDate?: ISODate;
  staffId?: string;
}

export interface Quote {
  id: string;
  /** Human number, `Q-<seq>`. */
  number: string;
  clientCode?: string;
  prospect?: QuoteProspect;
  /** Authoritative record; the fee schedule is recomputed from it. */
  estimateInput: EstimateInput;
  monthlyRetainerHours: number;
  adHocHourlyRate: number;
  vatInclusive: boolean;
  paymentTerms: string;
  expiryDate?: ISODate;
  stage: QuoteStage;
  ownerStaffId: string;
  nextStep?: string;
  documensoEnvelopeId?: string;
  signedBy?: string;
  signedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type InvoiceStatus = 'Draft' | 'Sent' | 'Paid';

export interface InvoiceLine {
  id: string;
  description: string;
  quantity: number;
  unitAmount: number;
  accountCode?: string;
  /** `NONE` only for disbursements paid to CIPC on the client's behalf. */
  taxType: 'OUTPUT2' | 'NONE';
  lineAmount: number;
}

export interface Invoice {
  id: string;
  /** Human number, `INV-<seq>`. */
  number: string;
  quoteId?: string;
  clientCode: string;
  lineItems: InvoiceLine[];
  taxRate: number;
  subtotal: number;
  vat: number;
  total: number;
  /** `Overdue` is derived at render time, never stored. */
  status: InvoiceStatus;
  issueDate: ISODate;
  dueDate: ISODate;
  xeroSync?: 'pending' | 'synced' | 'failed';
  createdAt: string;
}

export interface TimeEntry {
  id: string;
  clientCode: string;
  serviceCode?: ServiceCode;
  taskId?: string;
  staffUserId: string;
  startedAt: string;
  endedAt?: string;
  durationMinutes: number;
  /** Nearest 0.25h (half-up), minimum 0.25h. */
  roundedMinutes: number;
  billable: boolean;
  description: string;
  invoiceId?: string;
  createdAt: string;
}

/** Practice-created work item flowing through the deadlines board lanes. */
export interface AdHocTask {
  id: string;
  clientCode: string;
  description: string;
  assigneeId: string;
  dueDate?: ISODate;
  status: WorkflowStatus;
  blockedReason?: string;
  createdAt: string;
}

export type Role =
  | 'Partner'
  | 'Compliance Officer'
  | 'Accountant'
  | 'Team member'
  | 'Subcontractor'
  | 'Support Tech';

export type PermissionCell = 'Allowed' | 'Not allowed' | 'Limited' | 'Inherited' | 'Custom';

export interface PermissionState {
  /** Role → `<group>.<action>` → cell state. Empty means the default matrix applies. */
  matrix: Partial<Record<Role, Record<string, PermissionCell>>>;
  lastEditedBy?: string;
  lastEditedAt?: string;
}

export type ActivityType =
  | 'task'
  | 'submission'
  | 'quote'
  | 'invoice'
  | 'time'
  | 'file'
  | 'client'
  | 'permission';

export type ActivityTint = 'crimson' | 'amber' | 'muted';

export interface ActivityEvent {
  id: string;
  type: ActivityType;
  actorName: string;
  actorInitials: string;
  tint: ActivityTint;
  text: string;
  subline: string;
  at: string;
}

export interface PracticeSequences {
  quote: number;
  invoice: number;
}

export interface PracticeState {
  clients: Client[];
  staff: StaffMember[];
  currentUser: PracticeUser;
  rates: PracticeRates;
  aiKeys: AiApiKeys;
  integrationConfig: IntegrationConfig;
  division: Division;
  taskStatusOverrides: Record<string, TaskStatusOverride>;
  savedEstimates: Record<string, EstimateInput>;
  quotes: Quote[];
  invoices: Invoice[];
  timeEntries: TimeEntry[];
  permissions: PermissionState;
  activity: ActivityEvent[];
  adhocTasks: AdHocTask[];
  sequences: PracticeSequences;
  isAuthenticated: boolean;
}

const LEAD_STAGE_TO_QUOTE_STAGE: Record<LegacyLead['stage'], QuoteStage> = {
  Lead: 'Draft Quote',
  Discovery: 'Draft Quote',
  'Estimate Sent': 'Quote Sent',
  'KYC & Transfer': 'Accepted',
  'Active Client': 'Active Client',
};

const QUOTE_NEXT_STEP: Record<QuoteStage, string> = {
  'Draft Quote': 'Send proposal',
  'Quote Sent': 'Follow up on proposal',
  Accepted: 'Send for signature',
  Signed: 'Convert to active client',
  'Active Client': 'Onboarding complete',
  'Closed Lost': '',
};

/** Stable timestamp keeps seeded/migrated quotes deterministic across loads. */
const MIGRATED_QUOTE_TIMESTAMP = '2026-11-01T08:00:00.000Z';

interface QuoteSeedDefaults {
  rate: number;
  marchEscalationPct: number;
}

function sequenceFromNumber(number: string, fallback: number): number {
  const match = /(\d+)$/.exec(number);
  return match ? Math.max(fallback, Number(match[1])) : fallback;
}

/**
 * A legacy lead becomes a quote whose `estimatedMonthlyFee` seeds one
 * bookkeeping fee line at `fee ÷ adHocHourlyRate` hours — the same hours the
 * quote carries as its monthly retainer allowance. The estimate input stays
 * the authoritative record, so the quote is fully editable after migration.
 */
function quoteFromLead(lead: LegacyLead, sequence: number, defaults: QuoteSeedDefaults): Quote {
  const monthlyRetainerHours =
    Math.round((lead.estimatedMonthlyFee / defaults.rate) * 100) / 100;
  const stage = LEAD_STAGE_TO_QUOTE_STAGE[lead.stage];

  return {
    id: `quote-${lead.id}`,
    number: `Q-${sequence}`,
    prospect: {
      name: lead.companyName,
      contactPerson: lead.contactPerson,
      entityType: 'Company',
      turnover: lead.turnover,
      staffId: lead.partnerId,
    },
    estimateInput: {
      startMonth: todayInSouthAfrica().slice(0, 7),
      entityType: 'Company',
      yearEndMonth: 2,
      turnover: lead.turnover,
      payroll: false,
      provisionalTaxpayer: false,
      directors: 1,
      rate: defaults.rate,
      marchIncreasePct: defaults.marchEscalationPct,
      irp6Payable: false,
      // Only the retainer line is known from a legacy lead's monthly fee.
      selected: {
        BOOKKEEPING: true,
        AFS: false,
        REVIEW: false,
        ITR: false,
        IRP6: false,
        CIPC_AR: false,
        XERO: false,
        BO: false,
      },
      hours: { BOOKKEEPING: monthlyRetainerHours, PAYROLL: 0, MGMT: 0, AFS: 0, REVIEW: 0 },
      months: { AFS: 2, REVIEW: 2, ITR: 2, CIPC_AR: 2 },
      recharges: { XERO: 0, SIMPLEPAY: 0 },
    },
    monthlyRetainerHours,
    adHocHourlyRate: defaults.rate,
    vatInclusive: false,
    paymentTerms: '30 days',
    stage,
    ownerStaffId: lead.partnerId,
    nextStep: QUOTE_NEXT_STEP[stage] || undefined,
    createdAt: MIGRATED_QUOTE_TIMESTAMP,
    updatedAt: MIGRATED_QUOTE_TIMESTAMP,
  };
}

/**
 * Append quotes for legacy leads that do not already have one. Idempotent:
 * re-running the migration for the same leads changes nothing.
 */
function migrateLeadsIntoState(state: PracticeState, leads: LegacyLead[]): PracticeState {
  if (leads.length === 0) return state;

  const knownIds = new Set(state.quotes.map((quote) => quote.id));
  let sequence = state.quotes.reduce(
    (max, quote) => sequenceFromNumber(quote.number, max),
    state.sequences.quote
  );
  const defaults: QuoteSeedDefaults = {
    rate: state.rates.standardHourlyRate,
    marchEscalationPct: state.rates.marchEscalationPct,
  };

  const migrated: Quote[] = [];
  for (const lead of leads) {
    const id = `quote-${lead.id}`;
    if (knownIds.has(id)) continue;
    knownIds.add(id);
    sequence += 1;
    migrated.push(quoteFromLead(lead, sequence, defaults));
  }

  if (migrated.length === 0) return state;

  return {
    ...state,
    quotes: [...state.quotes, ...migrated],
    sequences: { ...state.sequences, quote: sequence },
  };
}

export const INITIAL_LEADS: LegacyLead[] = [
  {
    id: 'lead-1',
    companyName: 'Cape Agulhas Distillers (Pty) Ltd',
    contactPerson: 'Francois Marais',
    email: 'francois@capeagulhas.co.za',
    phone: '+27 21 887 4100',
    stage: 'Lead',
    turnover: 6500000,
    estimatedMonthlyFee: 6500,
    partnerId: 'erik',
    notes: 'Craft distillery expansion into retail Western Cape market',
  },
  {
    id: 'lead-2',
    companyName: 'Kouga Wind Farm Holdings',
    contactPerson: 'Lize van der Merwe',
    email: 'lize@kougawind.co.za',
    phone: '+27 42 291 3000',
    stage: 'Discovery',
    turnover: 24000000,
    estimatedMonthlyFee: 14200,
    partnerId: 'wouter',
    notes: 'Section 12B renewable energy tax review and CIPC beneficial ownership',
  },
  {
    id: 'lead-3',
    companyName: 'Stellenbosch BioTech Labs',
    contactPerson: 'Dr. Henk Pretorius',
    email: 'henk@stellenbiotech.com',
    phone: '+27 21 808 9111',
    stage: 'Estimate Sent',
    turnover: 12000000,
    estimatedMonthlyFee: 9800,
    partnerId: 'erik',
    notes: '12-month fee proposal sent with Section 11D R&D advisory',
  },
  {
    id: 'lead-4',
    companyName: 'Table Bay Logistics CC',
    contactPerson: 'Yusuf Patel',
    email: 'yusuf@tablebaylogistics.co.za',
    phone: '+27 21 448 2000',
    stage: 'KYC & Transfer',
    turnover: 8500000,
    estimatedMonthlyFee: 7200,
    partnerId: 'erik',
    notes: 'SARS eFiling profile transfer and Documenso SLA signing',
  },
];

export const INITIAL_USER: PracticeUser = {
  id: 'erik',
  name: 'Erik',
  role: 'Partner',
  email: 'erik@fdoncall.co.za',
  kind: 'employee',
  contract: { contractType: 'employee' },
};

export const INITIAL_RATES: PracticeRates = {
  standardHourlyRate: 625,
  marchEscalationPct: 6,
  updatedBy: 'Erik (Managing Partner)',
  updatedAt: '2026-11-08T08:00:00Z',
  serviceFees: {
    VAT201: 545,
    EMP201: 495,
    IRP6_NIL: 575,
    IRP6_PAYABLE: 650,
    ITR14: 1500,
    ITR12: 1050,
    ITR12T: 1500,
    CIPC_SUBMISSION: 525,
    BO: 2000,
    EMP501_SMALL: 1900,
    EMP501_MEDIUM: 2500,
    EMP501_LARGE: 3250,
    COIDA: 545,
  },
};

export const INITIAL_AI_KEYS: AiApiKeys = {
  anthropic: '',
  openai: '',
  gemini: '',
};

export const INITIAL_INTEGRATION_CONFIG: IntegrationConfig = {
  documensoBaseUrl: '',
  documensoApiKey: '',
  xeroClientId: '',
  xeroClientSecret: '',
  xeroTenantId: '',
};

/**
 * Historical team-activity feed seeded onto Home's Team Activity card.
 * The store itself starts with an empty `activity` array so persisted
 * practice state always wins; the Home view appends these seeds.
 */
export const ACTIVITY_SEEDS: ActivityEvent[] = [
  {
    id: 'activity-seed-vat201',
    type: 'submission',
    actorName: 'Erik',
    actorInitials: 'E',
    tint: 'crimson',
    text: 'Submitted VAT201 for Kheper SA t/a Silki',
    subline: 'KHE-615 · VAT category C',
    at: '2026-11-06T09:12:00+02:00',
  },
  {
    id: 'activity-seed-review',
    type: 'task',
    actorName: 'Lungani',
    actorInitials: 'L',
    tint: 'amber',
    text: 'Sent year-end workpapers to partner review',
    subline: 'MUS-875 · Muse 1399',
    at: '2026-11-05T15:40:00+02:00',
  },
  {
    id: 'activity-seed-quote',
    type: 'quote',
    actorName: 'Erik',
    actorInitials: 'E',
    tint: 'crimson',
    text: 'Sent fee proposal to Stellenbosch BioTech Labs',
    subline: 'Prospect · 12-month statutory engagement',
    at: '2026-11-04T11:05:00+02:00',
  },
  {
    id: 'activity-seed-time',
    type: 'time',
    actorName: 'Nikita',
    actorInitials: 'N',
    tint: 'muted',
    text: 'Logged 2.5h on EMP501 reconciliation',
    subline: 'KHE-615 · Kheper SA t/a Silki',
    at: '2026-11-04T08:30:00+02:00',
  },
  {
    id: 'activity-seed-file',
    type: 'file',
    actorName: 'Erik',
    actorInitials: 'E',
    tint: 'muted',
    text: 'Added signed engagement letter to the vault',
    subline: 'ALC-610 · A & L Contracting',
    at: '2026-11-03T16:22:00+02:00',
  },
];

export const STORAGE_KEY = 'crmv2_practice_state';

/** Testable seam: inject a storage to load a persisted state. */
export interface PracticeStateStorage {
  getItem(key: string): string | null;
}

function browserStorage(): PracticeStateStorage | null {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  return null;
}

export function getInitialPracticeState(): PracticeState {
  const seededQuotes = INITIAL_LEADS.map((lead, index) =>
    quoteFromLead(lead, index + 1, {
      rate: INITIAL_RATES.standardHourlyRate,
      marchEscalationPct: INITIAL_RATES.marchEscalationPct,
    })
  );

  return {
    clients: [...CLIENTS],
    staff: [...STAFF],
    currentUser: { ...INITIAL_USER },
    rates: { ...INITIAL_RATES },
    aiKeys: { ...INITIAL_AI_KEYS },
    integrationConfig: { ...INITIAL_INTEGRATION_CONFIG },
    division: 'fd-on-call',
    taskStatusOverrides: {},
    savedEstimates: {},
    quotes: seededQuotes,
    invoices: [],
    timeEntries: [],
    permissions: { matrix: {} },
    activity: [],
    adhocTasks: [],
    sequences: { quote: seededQuotes.length, invoice: 0 },
    isAuthenticated: true,
  };
}

export type PracticeAction =
  | { type: 'ADD_QUOTE'; payload: Quote }
  | {
      type: 'UPDATE_QUOTE';
      payload: { id: string; patch: Partial<Omit<Quote, 'id' | 'createdAt'>> };
    }
  | { type: 'ADD_INVOICE'; payload: Invoice }
  | {
      type: 'UPDATE_INVOICE';
      payload: { id: string; patch: Partial<Omit<Invoice, 'id' | 'createdAt'>> };
    }
  | { type: 'MIGRATE_LEADS'; payload: { leads?: LegacyLead[] } }
  | { type: 'ADD_CLIENT'; payload: Client }
  | { type: 'UPDATE_CLIENT'; payload: { clientCode: string; patch: Partial<Client> } }
  | { type: 'SAVE_ESTIMATE'; payload: { clientCode: string; input: EstimateInput } }
  | {
      type: 'UPDATE_TASK_STATUS';
      payload: {
        taskId: string;
        status: string;
        metadata?: TaskStatusMetadata;
      };
    }
  | { type: 'ADD_ADHOC_TASK'; payload: AdHocTask }
  | {
      type: 'UPDATE_ADHOC_TASK';
      payload: { id: string; patch: Partial<Omit<AdHocTask, 'id' | 'createdAt'>> };
    }
  | { type: 'DELETE_ADHOC_TASK'; payload: { id: string } }
  | { type: 'LOG_ACTIVITY'; payload: Omit<ActivityEvent, 'id' | 'at'> }
  | {
      type: 'INVITE_TEAM_MEMBER';
      payload: {
        name: string;
        email: string;
        role: 'Partner' | 'Compliance Officer' | 'Accountant' | 'Team member' | 'Subcontractor';
        kind?: 'employee' | 'subcontractor';
      };
    }
  | { type: 'UPDATE_STAFF_ROLE'; payload: { staffId: string; role: string } }
  | { type: 'UPDATE_RATES'; payload: Partial<PracticeRates> }
  | { type: 'UPDATE_SERVICE_FEE'; payload: { code: string; amount: number } }
  | { type: 'LOGIN'; payload: PracticeUser }
  | { type: 'LOGOUT' }
  | { type: 'SET_CURRENT_USER'; payload: PracticeUser | string }
  | { type: 'SET_DIVISION'; payload: Division }
  | { type: 'SET_AI_KEYS'; payload: Partial<AiApiKeys> }
  | { type: 'SET_INTEGRATION_CONFIG'; payload: Partial<IntegrationConfig> }
  | { type: 'RESET_DATA' }
  | { type: 'LOAD_STATE'; payload: PracticeState };

export function practiceReducer(state: PracticeState, action: PracticeAction): PracticeState {
  switch (action.type) {
    case 'ADD_QUOTE': {
      const quote = action.payload;
      if (state.quotes.some((q) => q.id === quote.id)) return state;
      return {
        ...state,
        quotes: [...state.quotes, quote],
        sequences: {
          ...state.sequences,
          quote: sequenceFromNumber(quote.number, state.sequences.quote),
        },
      };
    }

    case 'UPDATE_QUOTE': {
      const { id, patch } = action.payload;
      if (!state.quotes.some((q) => q.id === id)) return state;
      return {
        ...state,
        quotes: state.quotes.map((quote) =>
          quote.id === id ? { ...quote, ...patch, updatedAt: new Date().toISOString() } : quote
        ),
      };
    }

    case 'ADD_INVOICE': {
      const invoice = action.payload;
      if (state.invoices.some((i) => i.id === invoice.id)) return state;
      return {
        ...state,
        invoices: [...state.invoices, invoice],
        sequences: {
          ...state.sequences,
          invoice: sequenceFromNumber(invoice.number, state.sequences.invoice),
        },
      };
    }

    case 'UPDATE_INVOICE': {
      const { id, patch } = action.payload;
      if (!state.invoices.some((i) => i.id === id)) return state;
      return {
        ...state,
        invoices: state.invoices.map((invoice) =>
          invoice.id === id ? { ...invoice, ...patch } : invoice
        ),
      };
    }

    case 'MIGRATE_LEADS':
      return migrateLeadsIntoState(state, action.payload.leads ?? []);

    case 'SAVE_ESTIMATE': {
      return {
        ...state,
        savedEstimates: {
          ...state.savedEstimates,
          [action.payload.clientCode]: action.payload.input,
        },
      };
    }

    case 'UPDATE_CLIENT': {
      return {
        ...state,
        clients: state.clients.map((c) =>
          c.code === action.payload.clientCode ? { ...c, ...action.payload.patch } : c
        ),
      };
    }


    case 'ADD_CLIENT': {
      if (state.clients.some((c) => c.code === action.payload.code)) {
        return state;
      }
      return {
        ...state,
        clients: [...state.clients, action.payload],
      };
    }

    case 'UPDATE_TASK_STATUS': {
      const { taskId, status, metadata } = action.payload;
      const existing = state.taskStatusOverrides[taskId] || {};
      const updated: TaskStatusOverride = {
        ...existing,
        status,
        ...metadata,
        updatedAt: new Date().toISOString(),
      };

      return {
        ...state,
        taskStatusOverrides: {
          ...state.taskStatusOverrides,
          [taskId]: updated,
        },
      };
    }

    case 'ADD_ADHOC_TASK': {
      if (state.adhocTasks.some((t) => t.id === action.payload.id)) {
        return state;
      }
      return {
        ...state,
        adhocTasks: [...state.adhocTasks, action.payload],
      };
    }

    case 'UPDATE_ADHOC_TASK': {
      const { id, patch } = action.payload;
      if (!state.adhocTasks.some((t) => t.id === id)) return state;
      return {
        ...state,
        adhocTasks: state.adhocTasks.map((t) => (t.id === id ? { ...t, ...patch } : t)),
      };
    }

    case 'DELETE_ADHOC_TASK': {
      const { id } = action.payload;
      if (!state.adhocTasks.some((t) => t.id === id)) return state;
      return {
        ...state,
        adhocTasks: state.adhocTasks.filter((t) => t.id !== id),
      };
    }

    case 'LOG_ACTIVITY': {
      const event: ActivityEvent = {
        ...action.payload,
        id: `activity-${Date.now()}-${state.activity.length + 1}`,
        at: new Date().toISOString(),
      };
      return {
        ...state,
        activity: [event, ...state.activity],
      };
    }

    case 'INVITE_TEAM_MEMBER': {
      const id = action.payload.name.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 16);
      const newStaff: StaffMember = {
        id,
        name: action.payload.name,
        role: action.payload.role,
        kind: action.payload.kind || 'employee',
      };
      return {
        ...state,
        staff: [...state.staff, newStaff],
      };
    }

    case 'UPDATE_STAFF_ROLE': {
      return {
        ...state,
        staff: state.staff.map((s) =>
          s.id === action.payload.staffId ? { ...s, role: action.payload.role } : s
        ),
      };
    }

    case 'UPDATE_RATES': {
      return {
        ...state,
        rates: {
          ...state.rates,
          ...action.payload,
        },
      };
    }

    case 'UPDATE_SERVICE_FEE': {
      return {
        ...state,
        rates: {
          ...state.rates,
          serviceFees: {
            ...state.rates.serviceFees,
            [action.payload.code]: action.payload.amount,
          },
        },
      };
    }

    case 'LOGIN': {
      return {
        ...state,
        currentUser: action.payload,
        isAuthenticated: true,
      };
    }

    case 'LOGOUT': {
      return {
        ...state,
        isAuthenticated: false,
      };
    }

    case 'SET_CURRENT_USER': {
      if (typeof action.payload === 'string') {
        const found = state.staff.find((s) => s.id === action.payload);
        if (found) {
          return {
            ...state,
            currentUser: {
              id: found.id,
              name: found.name,
              role: (found.role as PracticeUser['role']) || 'Team member',
              email: `${found.id}@fdoncall.co.za`,
              kind: found.kind,
              contract: {
                contractType: found.kind === 'subcontractor' ? 'subcontractor' : 'employee',
              },
            },
          };
        }
        return state;
      }
      return {
        ...state,
        currentUser: action.payload,
      };
    }

    case 'SET_DIVISION': {
      return {
        ...state,
        division: action.payload,
      };
    }

    case 'SET_AI_KEYS': {
      return {
        ...state,
        aiKeys: {
          ...state.aiKeys,
          ...action.payload,
        },
      };
    }

    case 'SET_INTEGRATION_CONFIG': {
      return {
        ...state,
        integrationConfig: {
          ...state.integrationConfig,
          ...action.payload,
        },
      };
    }

    case 'RESET_DATA': {
      return getInitialPracticeState();
    }

    case 'LOAD_STATE': {
      return action.payload;
    }

    default:
      return state;
  }
}

/**
 * Merge a persisted state over the pristine defaults: fields added after the
 * state was persisted fall back to their defaults, persisted values are never
 * overwritten. Legacy pipeline leads are converted to quotes and dropped.
 */
export function mergePracticeState(
  persisted: Partial<Omit<PracticeState, 'integrationConfig'>> & {
    leads?: LegacyLead[];
    integrationConfig?: Partial<IntegrationConfig>;
  }
): PracticeState {
  const { leads: legacyLeads, ...persistedRest } = persisted;
  const initial = getInitialPracticeState();

  // One-time contact migration: records persisted before `Client.contacts`
  // existed adopt the seeded directors for their code. A client that already
  // carries a contacts array (even an empty one) keeps it as the source of truth.
  const seededContacts = new Map(CLIENTS.map((c) => [c.code, c.contacts]));
  const clients = (persisted.clients ?? initial.clients).map((client) => {
    if (client.contacts !== undefined) return client;
    const contacts = seededContacts.get(client.code);
    return contacts ? { ...client, contacts } : client;
  });

  // Legacy persisted users predate `contract`; default the employment terms
  // without overwriting any terms already on record.
  const currentUser: PracticeUser = persisted.currentUser
    ? {
        ...persisted.currentUser,
        contract: {
          contractType: persisted.currentUser.kind === 'subcontractor' ? 'subcontractor' : 'employee',
          ...persisted.currentUser.contract,
        },
      }
    : initial.currentUser;

  // A state persisted before quotes existed starts empty so its leads are the
  // only source of quote cards; pristine states keep the seeded quote prospects.
  const quotes =
    persisted.quotes ?? (legacyLeads && legacyLeads.length > 0 ? [] : initial.quotes);

  // Number migrated quotes after whatever the persisted store already issued.
  const baseQuoteSequence =
    persisted.quotes !== undefined
      ? persisted.sequences?.quote ?? 0
      : legacyLeads && legacyLeads.length > 0
        ? 0
        : initial.sequences.quote;

  const merged: PracticeState = {
    ...initial,
    ...persistedRest,
    clients,
    currentUser,
    quotes,
    rates: {
      ...initial.rates,
      ...(persisted.rates || {}),
      serviceFees: {
        ...initial.rates.serviceFees,
        ...(persisted.rates?.serviceFees || {}),
      },
    },
    sequences: {
      quote: quotes.reduce(
        (max, quote) => sequenceFromNumber(quote.number, max),
        baseQuoteSequence
      ),
      invoice: persisted.sequences?.invoice ?? initial.sequences.invoice,
    },
    permissions: { ...initial.permissions, ...(persisted.permissions || {}) },
    // Credentials saved before this field existed (or missing keys) default to empty.
    integrationConfig: {
      ...initial.integrationConfig,
      ...(persisted.integrationConfig || {}),
    },
    adhocTasks: persisted.adhocTasks ?? initial.adhocTasks,
    activity: persisted.activity ?? initial.activity,
  };

  return practiceReducer(merged, { type: 'MIGRATE_LEADS', payload: { leads: legacyLeads } });
}

/**
 * Read persisted practice state out of localStorage (or an injected storage
 * in tests) and merge it over the defaults.
 */
export function loadPracticeState(storage?: PracticeStateStorage | null): PracticeState {
  const store = storage === undefined ? browserStorage() : storage;
  if (store) {
    try {
      const saved = store.getItem(STORAGE_KEY);
      if (saved) {
        return mergePracticeState(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Failed to load practice state from localStorage', e);
    }
  }
  return getInitialPracticeState();
}

export function savePracticeState(state: PracticeState): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error('Failed to save practice state to localStorage', e);
    }
  }
}

export interface PracticeStoreContextValue extends PracticeState {
  addClient: (client: Client) => void;
  updateClient: (clientCode: string, patch: Partial<Client>) => void;
  saveEstimate: (clientCode: string, input: EstimateInput) => void;
  updateTaskStatus: (taskId: string, status: string, metadata?: TaskStatusMetadata) => void;
  addAdhocTask: (task: AdHocTask) => void;
  updateAdhocTask: (
    id: string,
    patch: Partial<Omit<AdHocTask, 'id' | 'createdAt'>>
  ) => void;
  deleteAdhocTask: (id: string) => void;
  logActivity: (event: Omit<ActivityEvent, 'id' | 'at'>) => void;
  inviteTeamMember: (member: {
    name: string;
    email: string;
    role: 'Partner' | 'Compliance Officer' | 'Accountant' | 'Team member' | 'Subcontractor';
    kind?: 'employee' | 'subcontractor';
  }) => void;
  updateStaffRole: (staffId: string, role: string) => void;
  updateRates: (rates: Partial<PracticeRates>) => void;
  updateServiceFee: (code: string, amount: number) => void;
  login: (email: string, pass: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
  setCurrentUser: (user: PracticeUser | string) => void;
  setDivision: (division: Division) => void;
  setAiKeys: (keys: Partial<AiApiKeys>) => void;
  setIntegrationConfig: (config: Partial<IntegrationConfig>) => void;
  addQuote: (quote: Quote) => void;
  updateQuote: (id: string, patch: Partial<Omit<Quote, 'id' | 'createdAt'>>) => void;
  addInvoice: (invoice: Invoice) => void;
  updateInvoice: (id: string, patch: Partial<Omit<Invoice, 'id' | 'createdAt'>>) => void;
  exportData: () => PracticeState;
  resetData: () => void;
}

const PracticeStoreContext = React.createContext<PracticeStoreContextValue | null>(null);

export function PracticeStoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = React.useReducer(practiceReducer, undefined, () => loadPracticeState());

  // Sync to localStorage on state changes
  React.useEffect(() => {
    savePracticeState(state);
  }, [state]);

  const addClient = React.useCallback((client: Client) => {
    dispatch({ type: 'ADD_CLIENT', payload: client });
  }, []);

  const updateTaskStatus = React.useCallback(
    (taskId: string, status: string, metadata?: TaskStatusMetadata) => {
      dispatch({ type: 'UPDATE_TASK_STATUS', payload: { taskId, status, metadata } });
    },
    []
  );

  const addAdhocTask = React.useCallback((task: AdHocTask) => {
    dispatch({ type: 'ADD_ADHOC_TASK', payload: task });
  }, []);

  const updateAdhocTask = React.useCallback(
    (id: string, patch: Partial<Omit<AdHocTask, 'id' | 'createdAt'>>) => {
      dispatch({ type: 'UPDATE_ADHOC_TASK', payload: { id, patch } });
    },
    []
  );

  const deleteAdhocTask = React.useCallback((id: string) => {
    dispatch({ type: 'DELETE_ADHOC_TASK', payload: { id } });
  }, []);

  const logActivity = React.useCallback((event: Omit<ActivityEvent, 'id' | 'at'>) => {
    dispatch({ type: 'LOG_ACTIVITY', payload: event });
  }, []);

  const inviteTeamMember = React.useCallback(
    (member: {
      name: string;
      email: string;
      role: 'Partner' | 'Compliance Officer' | 'Accountant' | 'Team member' | 'Subcontractor';
      kind?: 'employee' | 'subcontractor';
    }) => {
      dispatch({ type: 'INVITE_TEAM_MEMBER', payload: member });
    },
    []
  );

  const updateStaffRole = React.useCallback((staffId: string, role: string) => {
    dispatch({ type: 'UPDATE_STAFF_ROLE', payload: { staffId, role } });
  }, []);

  const updateRates = React.useCallback((rates: Partial<PracticeRates>) => {
    dispatch({ type: 'UPDATE_RATES', payload: rates });
  }, []);

  const updateServiceFee = React.useCallback((code: string, amount: number) => {
    dispatch({ type: 'UPDATE_SERVICE_FEE', payload: { code, amount } });
  }, []);

  const login = React.useCallback(async (email: string, pass: string) => {
    const res = await signInWithCredentials(email, pass);
    if (res.ok && res.user) {
      dispatch({ type: 'LOGIN', payload: res.user });
      return { ok: true };
    }
    return { ok: false, error: res.error || 'Authentication failed' };
  }, []);

  const logout = React.useCallback(() => {
    dispatch({ type: 'LOGOUT' });
  }, []);

  const setCurrentUser = React.useCallback((user: PracticeUser | string) => {
    dispatch({ type: 'SET_CURRENT_USER', payload: user });
  }, []);

  const setDivision = React.useCallback((division: Division) => {
    dispatch({ type: 'SET_DIVISION', payload: division });
  }, []);

  const setAiKeys = React.useCallback((keys: Partial<AiApiKeys>) => {
    dispatch({ type: 'SET_AI_KEYS', payload: keys });
  }, []);

  const setIntegrationConfig = React.useCallback((config: Partial<IntegrationConfig>) => {
    dispatch({ type: 'SET_INTEGRATION_CONFIG', payload: config });
  }, []);

  const addQuote = React.useCallback((quote: Quote) => {
    dispatch({ type: 'ADD_QUOTE', payload: quote });
  }, []);

  const updateQuote = React.useCallback(
    (id: string, patch: Partial<Omit<Quote, 'id' | 'createdAt'>>) => {
      dispatch({ type: 'UPDATE_QUOTE', payload: { id, patch } });
    },
    []
  );

  const addInvoice = React.useCallback((invoice: Invoice) => {
    dispatch({ type: 'ADD_INVOICE', payload: invoice });
  }, []);

  const updateInvoice = React.useCallback(
    (id: string, patch: Partial<Omit<Invoice, 'id' | 'createdAt'>>) => {
      dispatch({ type: 'UPDATE_INVOICE', payload: { id, patch } });
    },
    []
  );

  const exportData = React.useCallback(() => {
    return state;
  }, [state]);

  const resetData = React.useCallback(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    dispatch({ type: 'RESET_DATA' });
  }, []);
  const updateClient = React.useCallback((clientCode: string, patch: Partial<Client>) => {
    dispatch({ type: 'UPDATE_CLIENT', payload: { clientCode, patch } });
  }, []);
  const saveEstimate = React.useCallback((clientCode: string, input: EstimateInput) => {
    dispatch({ type: 'SAVE_ESTIMATE', payload: { clientCode, input } });
  }, []);



  const value = React.useMemo<PracticeStoreContextValue>(
    () => ({
      ...state,
      addClient,
      updateClient,
      addQuote,
      updateQuote,
      addInvoice,
      updateInvoice,
      updateTaskStatus,
      addAdhocTask,
      updateAdhocTask,
      deleteAdhocTask,
      logActivity,
      saveEstimate,
      inviteTeamMember,
      updateStaffRole,
      updateRates,
      updateServiceFee,
      login,
      logout,
      setCurrentUser,
      setDivision,
      setAiKeys,
      setIntegrationConfig,
      exportData,
      resetData,
    }),
    [
      state,
      addClient,
      updateClient,
      addQuote,
      updateQuote,
      addInvoice,
      updateInvoice,
      updateTaskStatus,
      addAdhocTask,
      updateAdhocTask,
      deleteAdhocTask,
      logActivity,
      inviteTeamMember,
      updateStaffRole,
      updateRates,
      updateServiceFee,
      login,
      logout,
      saveEstimate,
      setCurrentUser,
      setDivision,
      setAiKeys,
      setIntegrationConfig,
      exportData,
      resetData,
    ]
  );

  return <PracticeStoreContext.Provider value={value}>{children}</PracticeStoreContext.Provider>;
}

export function usePracticeStore(): PracticeStoreContextValue {
  const context = React.useContext(PracticeStoreContext);
  if (!context) {
    throw new Error('usePracticeStore must be used within a PracticeStoreProvider');
  }
  return context;
}

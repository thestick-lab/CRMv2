import { describe, expect, it, beforeEach } from 'vitest';
import {
  getInitialPracticeState,
  loadPracticeState,
  practiceReducer,
  type PracticeStateStorage,
  type Quote,
  type TimeEntry,
} from './PracticeStoreContext';

describe('PracticeStore state initialization and persistence', () => {
  beforeEach(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  it('hydrates with 13 clients, 9 staff, default pipeline leads, and default rates', () => {
    const state = getInitialPracticeState();
    expect(state.clients).toHaveLength(13);
    expect(state.staff).toHaveLength(9);
    expect(state.leads.length).toBeGreaterThanOrEqual(4);
    expect(state.currentUser.name).toBe('Erik');
    expect(state.currentUser.role).toBe('Partner');
    expect(state.rates.standardHourlyRate).toBe(625);
    expect(state.rates.marchEscalationPct).toBe(6);
    expect(state.division).toBe('fd-on-call');
  });

  it('converts a pipeline lead to an active practice client', () => {
    const state = getInitialPracticeState();
    const lead = state.leads[0];
    expect(lead).toBeDefined();

    const nextState = practiceReducer(state, {
      type: 'CONVERT_LEAD',
      payload: { leadId: lead.id },
    });

    // Client count should increase from 13 to 14
    expect(nextState.clients).toHaveLength(14);
    const convertedClient = nextState.clients.find((c) => c.name === lead.companyName);
    expect(convertedClient).toBeDefined();
    expect(convertedClient?.status).toBe('Active');
    expect(convertedClient?.code).toMatch(/^[A-Z]{3}-\d{3}$/);

    // Lead stage should be Active Client
    const updatedLead = nextState.leads.find((l) => l.id === lead.id);
    expect(updatedLead?.stage).toBe('Active Client');
  });

  it('updates task status with SARS reference and partner sign-off', () => {
    const state = getInitialPracticeState();
    const nextState = practiceReducer(state, {
      type: 'UPDATE_TASK_STATUS',
      payload: {
        taskId: 'ALC-610-IRP6-1',
        status: 'Submitted',
        metadata: {
          sarsReference: 'SARS-99887711',
          partnerSignOff: true,
          submissionDate: '2026-11-08',
        },
      },
    });

    const override = nextState.taskStatusOverrides['ALC-610-IRP6-1'];
    expect(override).toBeDefined();
    expect(override.status).toBe('Submitted');
    expect(override.sarsReference).toBe('SARS-99887711');
    expect(override.partnerSignOff).toBe(true);
  });

  it('invites a new team member with RBAC role', () => {
    const state = getInitialPracticeState();
    const nextState = practiceReducer(state, {
      type: 'INVITE_TEAM_MEMBER',
      payload: {
        name: 'Chrizelle Visser',
        email: 'chrizelle@fdoncall.co.za',
        role: 'Compliance Officer',
        kind: 'employee',
      },
    });

    expect(nextState.staff).toHaveLength(10);
    const invited = nextState.staff.find((s) => s.name === 'Chrizelle Visser');
    expect(invited).toBeDefined();
    expect(invited?.role).toBe('Compliance Officer');
  });

  it('updates practice rates in state', () => {
    const state = getInitialPracticeState();
    const nextState = practiceReducer(state, {
      type: 'UPDATE_RATES',
      payload: { standardHourlyRate: 750, marchEscalationPct: 7.5 },
    });

    expect(nextState.rates.standardHourlyRate).toBe(750);
    expect(nextState.rates.marchEscalationPct).toBe(7.5);
  });

  it('updates division between fd-on-call and accountant-on-call', () => {
    const state = getInitialPracticeState();
    const nextState = practiceReducer(state, {
      type: 'SET_DIVISION',
      payload: 'accountant-on-call',
    });

    expect(nextState.division).toBe('accountant-on-call');
  });

  it('updates AI provider keys', () => {
    const state = getInitialPracticeState();
    const nextState = practiceReducer(state, {
      type: 'SET_AI_KEYS',
      payload: { anthropic: 'sk-ant-test', openai: 'sk-test' },
    });

    expect(nextState.aiKeys.anthropic).toBe('sk-ant-test');
    expect(nextState.aiKeys.openai).toBe('sk-test');
  });

  it('resets practice state to initial pristine defaults', () => {
    const state = getInitialPracticeState();
    const modified = practiceReducer(state, {
      type: 'UPDATE_RATES',
      payload: { standardHourlyRate: 999 },
    });
    expect(modified.rates.standardHourlyRate).toBe(999);

    const resetState = practiceReducer(modified, { type: 'RESET_DATA' });
    expect(resetState.rates.standardHourlyRate).toBe(625);
    expect(resetState.clients).toHaveLength(13);
  });
});

function storageWith(value: unknown): PracticeStateStorage {
  return { getItem: () => JSON.stringify(value) };
}

const LEGACY_LEAD = {
  id: 'lead-legacy-1',
  companyName: 'Cape Agulhas Distillers (Pty) Ltd',
  contactPerson: 'Francois Marais',
  email: 'francois@capeagulhas.co.za',
  phone: '+27 21 887 4100',
  stage: 'Lead',
  turnover: 6500000,
  estimatedMonthlyFee: 6500,
  partnerId: 'erik',
};

const LEGACY_STATE = {
  leads: [LEGACY_LEAD],
  clients: [],
  staff: [],
  taskStatusOverrides: {},
};

const PERSISTED_QUOTE: Quote = {
  id: 'quote-1',
  number: 'Q-3',
  clientCode: 'ALC-610',
  estimateInput: {
    startMonth: '2026-11',
    entityType: 'Company',
    yearEndMonth: 2,
    payroll: false,
    provisionalTaxpayer: false,
    directors: 2,
    rate: 625,
    marchIncreasePct: 6,
    irp6Payable: false,
    selected: {},
    hours: { BOOKKEEPING: 0, PAYROLL: 0, MGMT: 0, AFS: 0, REVIEW: 0 },
    months: { AFS: 2, REVIEW: 2, ITR: 2, CIPC_AR: 2 },
    recharges: { XERO: 0, SIMPLEPAY: 0 },
  },
  monthlyRetainerHours: 12,
  adHocHourlyRate: 625,
  vatInclusive: false,
  paymentTerms: '30 days',
  stage: 'Quote Sent',
  ownerStaffId: 'erik',
  createdAt: '2026-11-01T08:00:00Z',
  updatedAt: '2026-11-02T08:00:00Z',
};

const PERSISTED_TIME_ENTRY: TimeEntry = {
  id: 'time-1',
  clientCode: 'ALC-610',
  staffUserId: 'erik',
  startedAt: '2026-11-03T08:00:00Z',
  endedAt: '2026-11-03T09:00:00Z',
  durationMinutes: 60,
  roundedMinutes: 60,
  billable: true,
  description: 'Year-end file review',
  createdAt: '2026-11-03T09:00:00Z',
};

describe('PracticeStore foundation fields and legacy-state load', () => {
  it('fills missing foundation fields with defaults when loading a legacy persisted state', () => {
    const state = loadPracticeState(storageWith(LEGACY_STATE));

    expect(state.quotes).toEqual([]);
    expect(state.invoices).toEqual([]);
    expect(state.timeEntries).toEqual([]);
    expect(state.permissions).toEqual(getInitialPracticeState().permissions);
    expect(state.activity).toEqual([]);
    expect(state.adhocTasks).toEqual([]);
    expect(state.sequences).toEqual({ quote: 0, invoice: 0 });

    // Legacy pipeline data is preserved until the quote migration lands.
    expect(state.leads).toEqual([LEGACY_LEAD]);
    expect(state.clients).toEqual([]);
  });

  it('never overwrites persisted foundation values', () => {
    const state = loadPracticeState(
      storageWith({
        ...LEGACY_STATE,
        quotes: [PERSISTED_QUOTE],
        timeEntries: [PERSISTED_TIME_ENTRY],
        sequences: { quote: 3, invoice: 2 },
        permissions: { matrix: { Partner: { 'Clients.view': 'Allowed' } }, lastEditedBy: 'Erik' },
      })
    );

    expect(state.quotes).toEqual([PERSISTED_QUOTE]);
    expect(state.timeEntries).toEqual([PERSISTED_TIME_ENTRY]);
    expect(state.sequences).toEqual({ quote: 3, invoice: 2 });
    expect(state.permissions.matrix.Partner?.['Clients.view']).toBe('Allowed');
    expect(state.permissions.lastEditedBy).toBe('Erik');
  });

  it('is idempotent across repeated loads of the same persisted state', () => {
    const storage = storageWith(LEGACY_STATE);
    expect(loadPracticeState(storage)).toEqual(loadPracticeState(storage));
  });

  it('ships empty foundation defaults on a pristine state', () => {
    const state = getInitialPracticeState();
    expect(state.quotes).toEqual([]);
    expect(state.invoices).toEqual([]);
    expect(state.timeEntries).toEqual([]);
    expect(state.activity).toEqual([]);
    expect(state.adhocTasks).toEqual([]);
    expect(state.sequences).toEqual({ quote: 0, invoice: 0 });
    expect(state.permissions).toEqual({ matrix: {} });
  });
});

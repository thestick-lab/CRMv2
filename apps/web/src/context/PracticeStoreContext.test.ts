import { describe, expect, it, beforeEach } from 'vitest';
import { CLIENTS, STAFF } from 'fdoncall-practice/data/seed';
import {
  ACTIVITY_SEEDS,
  INITIAL_LEADS,
  getInitialPracticeState,
  loadPracticeState,
  practiceReducer,
  type Invoice,
  type LegacyLead,
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

  it('hydrates with 13 clients, 9 staff, four quote prospects, and default rates', () => {
    const state = getInitialPracticeState();
    expect(state.clients).toHaveLength(13);
    expect(state.staff).toHaveLength(9);
    expect(state.quotes).toHaveLength(4);
    expect(state.quotes.map((q) => q.number)).toEqual(['Q-1', 'Q-2', 'Q-3', 'Q-4']);
    expect(state.quotes[0].prospect?.name).toBe('Cape Agulhas Distillers (Pty) Ltd');
    expect(state.sequences.quote).toBe(4);
    expect(state.currentUser.name).toBe('Erik');
    expect(state.currentUser.role).toBe('Partner');
    expect(state.rates.standardHourlyRate).toBe(625);
    expect(state.rates.marchEscalationPct).toBe(6);
    expect(state.division).toBe('fd-on-call');
  });

  it('adds a quote, advances its stage, and bumps the quote sequence', () => {
    const state = getInitialPracticeState();
    const draft: Quote = {
      ...PERSISTED_QUOTE,
      id: 'quote-new',
      number: 'Q-5',
      stage: 'Draft Quote',
    };

    const added = practiceReducer(state, { type: 'ADD_QUOTE', payload: draft });
    expect(added.quotes).toHaveLength(5);
    expect(added.quotes.at(-1)).toEqual(draft);
    expect(added.sequences.quote).toBe(5);

    const sent = practiceReducer(added, {
      type: 'UPDATE_QUOTE',
      payload: { id: 'quote-new', patch: { stage: 'Quote Sent', nextStep: 'Follow up' } },
    });
    expect(sent.quotes.at(-1)?.stage).toBe('Quote Sent');
    expect(sent.quotes.at(-1)?.nextStep).toBe('Follow up');
    expect(sent.quotes.at(-1)?.updatedAt).not.toBe(draft.updatedAt);

    // Unknown ids and duplicate adds leave state untouched.
    expect(practiceReducer(added, { type: 'ADD_QUOTE', payload: draft })).toBe(added);
    expect(
      practiceReducer(added, { type: 'UPDATE_QUOTE', payload: { id: 'missing', patch: {} } })
    ).toBe(added);
  });

  it('adds an invoice and updates its status through UPDATE_INVOICE', () => {
    const state = getInitialPracticeState();
    const invoice: Invoice = {
      id: 'invoice-new',
      number: 'INV-1',
      clientCode: 'ALC-610',
      lineItems: [
        {
          id: 'line-1',
          description: 'Monthly bookkeeping',
          quantity: 1,
          unitAmount: 3750,
          taxType: 'OUTPUT2',
          lineAmount: 3750,
        },
      ],
      taxRate: 0.15,
      subtotal: 3750,
      vat: 562.5,
      total: 4312.5,
      status: 'Draft',
      issueDate: '2026-11-09',
      dueDate: '2026-12-09',
      createdAt: '2026-11-09T08:00:00.000Z',
    };

    const added = practiceReducer(state, { type: 'ADD_INVOICE', payload: invoice });
    expect(added.invoices).toEqual([invoice]);
    expect(added.sequences.invoice).toBe(1);

    const paid = practiceReducer(added, {
      type: 'UPDATE_INVOICE',
      payload: { id: 'invoice-new', patch: { status: 'Paid' } },
    });
    expect(paid.invoices[0].status).toBe('Paid');

    expect(practiceReducer(added, { type: 'ADD_INVOICE', payload: invoice })).toBe(added);
    expect(
      practiceReducer(added, { type: 'UPDATE_INVOICE', payload: { id: 'missing', patch: {} } })
    ).toBe(added);
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
  it('migrates legacy leads into quotes and fills missing foundation fields with defaults', () => {
    const state = loadPracticeState(storageWith(LEGACY_STATE));

    expect(state.quotes).toHaveLength(1);
    const [migrated] = state.quotes;
    expect(migrated.id).toBe('quote-lead-legacy-1');
    expect(migrated.number).toBe('Q-1');
    expect(migrated.stage).toBe('Draft Quote');
    expect(migrated.prospect?.name).toBe('Cape Agulhas Distillers (Pty) Ltd');
    expect(migrated.prospect?.contactPerson).toBe('Francois Marais');
    expect(migrated.prospect?.turnover).toBe(6500000);
    expect(migrated.ownerStaffId).toBe('erik');
    // 6500 monthly fee ÷ R625 hourly rate seeds the retainer hours.
    expect(migrated.monthlyRetainerHours).toBeCloseTo(10.4);
    expect(migrated.adHocHourlyRate).toBe(625);
    expect(migrated.estimateInput.hours.BOOKKEEPING).toBeCloseTo(10.4);
    expect(migrated.estimateInput.selected.BOOKKEEPING).toBe(true);

    expect(state.invoices).toEqual([]);
    expect(state.timeEntries).toEqual([]);
    expect(state.permissions).toEqual(getInitialPracticeState().permissions);
    expect(state.activity).toEqual([]);
    expect(state.adhocTasks).toEqual([]);
    expect(state.sequences).toEqual({ quote: 1, invoice: 0 });

    // Clean cutover: the legacy `leads` field is dropped from practice state.
    expect('leads' in state).toBe(false);
    expect(state.clients).toEqual([]);
  });

  it('maps every legacy lead stage onto its quote stage through MIGRATE_LEADS', () => {
    const stages: LegacyLead['stage'][] = [
      'Lead',
      'Discovery',
      'Estimate Sent',
      'KYC & Transfer',
      'Active Client',
    ];
    const leads = stages.map((stage, index) => ({
      ...INITIAL_LEADS[0],
      id: `lead-stage-${index}`,
      stage,
    }));
    const base = { ...getInitialPracticeState(), quotes: [], sequences: { quote: 0, invoice: 0 } };

    const migrated = practiceReducer(base, { type: 'MIGRATE_LEADS', payload: { leads } });

    expect(migrated.quotes.map((q) => q.stage)).toEqual([
      'Draft Quote',
      'Draft Quote',
      'Quote Sent',
      'Accepted',
      'Active Client',
    ]);
    expect(migrated.quotes.map((q) => q.number)).toEqual(['Q-1', 'Q-2', 'Q-3', 'Q-4', 'Q-5']);
    expect(migrated.sequences.quote).toBe(5);

    // Re-running the migration for the same leads adds nothing.
    expect(practiceReducer(migrated, { type: 'MIGRATE_LEADS', payload: { leads } })).toBe(
      migrated
    );
  });

  it('never overwrites persisted foundation values', () => {
    const state = loadPracticeState(
      storageWith({
        ...LEGACY_STATE,
        leads: [],
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

  it('migrates seeded director contacts onto persisted clients that predate contacts', () => {
    const muse = CLIENTS.find((c) => c.code === 'MUS-875')!;
    const axe = CLIENTS.find((c) => c.code === 'AXE-460')!;
    const legacyMuse: Record<string, unknown> = { ...muse };
    delete legacyMuse.contacts;

    const state = loadPracticeState(
      storageWith({ clients: [legacyMuse, { ...axe, contacts: [] }] })
    );

    expect(state.clients[0].contacts?.[0].name).toBe('Marthinus De Villiers');
    // A client that already carries an explicit (empty) contact list keeps it.
    expect(state.clients[1].contacts).toEqual([]);
  });

  it('defaults PracticeUser.contract for legacy persisted users', () => {
    const state = loadPracticeState(
      storageWith({
        ...LEGACY_STATE,
        currentUser: {
          id: 'erik',
          name: 'Erik',
          role: 'Partner',
          email: 'erik@fdoncall.co.za',
          kind: 'employee',
        },
      })
    );

    expect(state.currentUser.contract).toEqual({ contractType: 'employee' });
  });

  it('preserves persisted contract terms over the default', () => {
    const contract = {
      contractType: 'subcontractor' as const,
      startDate: '2025-02-01',
      hourlyRate: 850,
      phone: '+27 21 975 1099',
    };
    const state = loadPracticeState(
      storageWith({
        ...LEGACY_STATE,
        currentUser: {
          id: 'hannes',
          name: 'Hannes',
          role: 'Subcontractor',
          email: 'hannes@fdoncall.co.za',
          kind: 'subcontractor',
          contract,
        },
      })
    );

    expect(state.currentUser.contract).toEqual(contract);
  });

  it('is idempotent across repeated loads of the same legacy state', () => {
    const legacy = {
      ...getInitialPracticeState(),
      leads: INITIAL_LEADS,
      quotes: [],
      sequences: { quote: 0, invoice: 0 },
    };
    const storage = storageWith(legacy);

    const first = loadPracticeState(storage);
    const second = loadPracticeState(storage);

    expect(second).toEqual(first);
    expect(first.quotes).toHaveLength(4);
    expect(first.quotes.map((q) => q.stage)).toEqual([
      'Draft Quote',
      'Draft Quote',
      'Quote Sent',
      'Accepted',
    ]);
    expect(first.sequences.quote).toBe(4);
    expect('leads' in first).toBe(false);
  });

  it('ships the four seeded quote prospects and empty foundation defaults on a pristine state', () => {
    const state = getInitialPracticeState();
    expect(state.quotes).toHaveLength(4);
    expect(state.quotes.map((q) => q.prospect?.name)).toEqual(
      INITIAL_LEADS.map((lead) => lead.companyName)
    );
    expect(state.invoices).toEqual([]);
    expect(state.timeEntries).toEqual([]);
    expect(state.activity).toEqual([]);
    expect(state.adhocTasks).toEqual([]);
    expect(state.sequences).toEqual({ quote: 4, invoice: 0 });
    expect(state.permissions).toEqual({ matrix: {} });
  });

  it('round-trips an ad-hoc task through add, update and delete and survives reload', () => {
    const state = getInitialPracticeState();
    const task = {
      id: 'adhoc-test-1',
      clientCode: 'ALC-610',
      description: 'Reconcile October bank feed',
      assigneeId: 'erik',
      dueDate: '2026-11-14',
      status: 'Not Started' as const,
      createdAt: '2026-11-09T08:00:00.000Z',
    };

    const added = practiceReducer(state, { type: 'ADD_ADHOC_TASK', payload: task });
    expect(added.adhocTasks).toHaveLength(1);
    expect(added.adhocTasks[0]).toEqual(task);

    const updated = practiceReducer(added, {
      type: 'UPDATE_ADHOC_TASK',
      payload: { id: task.id, patch: { status: 'In Progress', description: 'Bank feed reconciled' } },
    });
    expect(updated.adhocTasks[0].status).toBe('In Progress');
    expect(updated.adhocTasks[0].description).toBe('Bank feed reconciled');
    expect(updated.adhocTasks[0].createdAt).toBe(task.createdAt);

    // Persisted state reloads the ad-hoc task unchanged.
    const reloaded = loadPracticeState({
      getItem: () => JSON.stringify(updated),
    });
    expect(reloaded.adhocTasks).toEqual(updated.adhocTasks);

    const deleted = practiceReducer(updated, {
      type: 'DELETE_ADHOC_TASK',
      payload: { id: task.id },
    });
    expect(deleted.adhocTasks).toEqual([]);
    // Deleting an unknown task leaves state untouched.
    expect(
      practiceReducer(deleted, { type: 'DELETE_ADHOC_TASK', payload: { id: 'missing' } })
    ).toBe(deleted);
  });

  it('appends logged activity events with a generated id and timestamp', () => {
    const state = getInitialPracticeState();
    const next = practiceReducer(state, {
      type: 'LOG_ACTIVITY',
      payload: {
        type: 'task',
        actorName: 'Erik',
        actorInitials: 'E',
        tint: 'crimson',
        text: 'Commented on a task',
        subline: 'ALC-610 · AFS',
      },
    });
    expect(next.activity).toHaveLength(1);
    expect(next.activity[0].id).toBeTruthy();
    expect(next.activity[0].at).toBeTruthy();
    expect(next.activity[0].text).toBe('Commented on a task');
  });

  it('sources every activity seed from seeded clients and staff', () => {
    const clientCodes = CLIENTS.map((c) => c.code);
    const staffNames = [...STAFF.map((s) => s.name), getInitialPracticeState().currentUser.name];

    expect(ACTIVITY_SEEDS.length).toBeGreaterThan(0);
    for (const event of ACTIVITY_SEEDS) {
      expect(staffNames).toContain(event.actorName);
      for (const code of event.subline.match(/[A-Z]{3}-\d{3}/g) ?? []) {
        expect(clientCodes).toContain(code);
      }
      expect(event.subline).not.toMatch(/SARS-|env-/);
    }
  });
});

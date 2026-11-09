import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Client } from 'fdoncall-practice/domain/types';
import {
  computeEstimate,
  estimateMonths,
  type EstimateInput,
} from 'fdoncall-practice/domain/estimate';
import { defaultServices, generateTasks } from 'fdoncall-practice/domain/rules';
import {
  createClientRecord,
  getInitialPracticeState,
  mergePracticeState,
  practiceReducer,
  type Invoice,
  type InvoiceLine,
  type PracticeState,
  type Quote,
  STORAGE_KEY,
  loadPracticeState,
} from '@/context/PracticeStoreContext';
import {
  createInvoiceFromQuote,
  invoiceForMonth,
  invoiceIsEditable,
  invoiceMonth,
  nextUnbilledMonth,
  UNREGISTERED_CLIENT_CODE,
} from '@/components/invoice/invoice-logic';
import {
  buildXeroDraftInvoicePayload,
} from '@/lib/integrations/xero';
import { can } from '@/lib/permissions';
import {
  canManageInvoices,
  canPushInvoiceToXero,
  canViewInvoices,
  invoicesForRole,
  salesTabsFor,
} from '@/lib/invoice-access';
import { canTransitionQuote } from '@/lib/quote-lifecycle';
import { clearedApprovalMetadata, validateStatutorySubmission } from '@/lib/workflow';
import { canUseAssistant, scopeAssistantState } from '@/components/ai/assistant-engine';
import { permittedNewActions } from '@/components/layout/Topbar';
import { buildStaffUsers, staffRoleChangeBlock, staffRows } from '@/components/team/staff-data';
import { computeAnalytics } from '@/components/analytics/analytics-logic';
import { STAFF } from 'fdoncall-practice/data/seed';

/* ---------------------------------------------------------------------------
 * Final fix wave: one behavioural test per review finding. "Behavioural" here
 * means the exact reproduced sequence against the helper the visible path
 * calls — the repo's Vitest environment is node-only, so component behaviour
 * is pinned by driving the same pure gate and asserting the wiring at source.
 * ------------------------------------------------------------------------- */

const ESTIMATE_INPUT: EstimateInput = {
  startMonth: '2026-11',
  entityType: 'Company',
  yearEndMonth: 2,
  vatCategory: 'B',
  turnover: 4_000_000,
  payroll: false,
  employeeCount: 8,
  provisionalTaxpayer: false,
  directors: 1,
  rate: 625,
  marchIncreasePct: 6,
  irp6Payable: false,
  selected: { BOOKKEEPING: true },
  hours: { BOOKKEEPING: 10, PAYROLL: 0, MGMT: 0, AFS: 0, REVIEW: 0 },
  schedule: {},
  months: { AFS: 2, REVIEW: 2, ITR: 2, CIPC_AR: 2 },
  recharges: { XERO: 0, SIMPLEPAY: 0 },
};

const QUOTE: Quote = {
  id: 'quote-final',
  number: 'Q-9',
  clientCode: 'MUS-875',
  estimateInput: ESTIMATE_INPUT,
  monthlyRetainerHours: 10,
  adHocHourlyRate: 625,
  vatInclusive: false,
  paymentTerms: '30 days',
  stage: 'Accepted',
  ownerStaffId: 'erik',
  createdAt: '2026-11-01T08:00:00Z',
  updatedAt: '2026-11-01T08:00:00Z',
};

function invoiceRecord(partial: Partial<Invoice> = {}): Invoice {
  return {
    id: 'invoice-x',
    number: 'INV-1',
    clientCode: 'MUS-875',
    lineItems: [],
    taxRate: 0.15,
    subtotal: 0,
    vat: 0,
    total: 0,
    status: 'Draft',
    issueDate: '2026-11-01',
    dueDate: '2026-11-30',
    createdAt: '2026-11-01T08:00:00Z',
    ...partial,
  };
}

function line(partial: Partial<InvoiceLine> & Pick<InvoiceLine, 'unitAmount'>): InvoiceLine {
  return {
    id: partial.id ?? 'line-1',
    description: partial.description ?? 'Fee',
    quantity: partial.quantity ?? 1,
    unitAmount: partial.unitAmount,
    taxType: partial.taxType ?? 'OUTPUT2',
    lineAmount: partial.lineAmount ?? (partial.quantity ?? 1) * partial.unitAmount,
    accountCode: partial.accountCode,
  };
}



describe('C1 — invoice register and Xero push need the invoice grant', () => {
  it('a Team member sees no Invoices tab, no rows and cannot push', () => {
    // Team member: Quotes allowed, Invoices not.
    expect(can('Team member', 'Quotes', 'view-create-send')).toBe(true);
    expect(canViewInvoices('Team member')).toBe(false);
    expect(canManageInvoices('Team member')).toBe(false);

    expect(salesTabsFor('Team member')).toEqual(['pipeline', 'quotes']);
    expect(invoicesForRole('Team member', undefined, [invoiceRecord()])).toEqual([]);

    const push = canPushInvoiceToXero('Team member', undefined, {
      hasXeroClient: true,
      alreadySynced: false,
    });
    expect(push.allowed).toBe(false);
    expect(push.reason).toContain('cannot push invoices');

    // A Partner holds both grants and keeps the register and the push.
    expect(salesTabsFor('Partner')).toContain('invoices');
    expect(invoicesForRole('Partner', undefined, [invoiceRecord()])).toHaveLength(1);
    expect(
      canPushInvoiceToXero('Partner', undefined, { hasXeroClient: true, alreadySynced: false })
        .allowed
    ).toBe(true);
  });

  it('the pipeline and editor are wired to those gates', () => {
    const pipeline = fs.readFileSync('src/components/pipeline/SalesPipelineView.tsx', 'utf8');
    expect(pipeline).toContain('canViewInvoices(');
    expect(pipeline).toContain('invoicesForRole(');
    expect(pipeline).toContain("tab === 'invoices' && canReadInvoices");
    expect(pipeline).toContain("if (tab === 'invoices' && !canReadInvoices) setTab('pipeline')");

    const editor = fs.readFileSync('src/components/invoice/InvoiceEditor.tsx', 'utf8');
    expect(editor).toContain('canPushInvoiceToXero(currentUser.role, permissions.matrix');
    expect(editor).toContain('data-invoice-editor-denied');
  });
});

describe('C2 — a backward lane move invalidates the partner sign-off', () => {
  const taskId = 'CLE-100|AFS|2026';

  function signedOff(): PracticeState {
    return practiceReducer(getInitialPracticeState(), {
      type: 'UPDATE_TASK_STATUS',
      payload: {
        taskId,
        status: 'Approved (Ready to Lodge)',
        metadata: { partnerSignOff: true, approvedBy: 'Erik', submissionDate: '2026-11-01' },
      },
    });
  }

  it('drag back to In Progress clears signOff/approvedBy and blocks submission', () => {
    const signed = signedOff();
    expect(signed.taskStatusOverrides[taskId].partnerSignOff).toBe(true);

    const moved = practiceReducer(signed, {
      type: 'UPDATE_TASK_STATUS',
      payload: {
        taskId,
        status: 'In Progress',
        metadata: clearedApprovalMetadata('In Progress'),
      },
    });
    const override = moved.taskStatusOverrides[taskId];
    expect(override.status).toBe('In Progress');
    expect(override.partnerSignOff).toBeUndefined();
    expect(override.approvedBy).toBeUndefined();

    // A non-partner re-submitting the gated return is now refused.
    expect(
      validateStatutorySubmission({
        status: 'Submitted',
        sarsReference: 'SARS-123',
        partnerSignOff: override.partnerSignOff,
        needsPartnerReview: true,
      })
    ).toEqual({ valid: false, error: 'PARTNER_REVIEW_REQUIRED' });
  });

  it('the board passes the cleared metadata on every backward move', () => {
    expect(clearedApprovalMetadata('In Progress')).toEqual({
      partnerSignOff: false,
      approvedBy: undefined,
    });
    expect(clearedApprovalMetadata('Submitted')).toEqual({});
    const kanban = fs.readFileSync('src/components/deadlines/DeadlinesKanban.tsx', 'utf8');
    expect(kanban).toContain('clearedApprovalMetadata(targetStatus)');
  });
});

describe('I1 — Signed needs a recorded envelope', () => {
  it('refuses Accepted → Signed without a signature', () => {
    expect(
      canTransitionQuote('Accepted', 'Signed', { hasClient: true, hasFeeLines: true })
    ).toBe(false);
    expect(
      canTransitionQuote('Accepted', 'Signed', {
        hasClient: true,
        hasFeeLines: true,
        hasSignature: true,
      })
    ).toBe(true);
  });

  it('the pipeline passes the quote’s envelope state', () => {
    const pipeline = fs.readFileSync('src/components/pipeline/SalesPipelineView.tsx', 'utf8');
    expect(pipeline).toContain('hasSignature: Boolean(quote.documensoEnvelopeId)');
    expect(pipeline).toContain('the board cannot sign a quote without a recorded Documenso envelope');
  });
});

describe('I2 — client records are read-only without create/edit', () => {
  it('Team member and Subcontractor hold no client edit grant', () => {
    expect(can('Team member', 'Clients', 'create-edit')).toBe(false);
    expect(can('Subcontractor', 'Clients', 'create-edit')).toBe(false);
    expect(can('Compliance Officer', 'Clients', 'create-edit')).toBe(true);
  });

  it('the record computes canEditClient and passes read-only to every panel', () => {
    const view = fs.readFileSync('src/components/client-show/ClientShowView.tsx', 'utf8');
    expect(view).toContain('canEditClient');
    expect(view).toContain("'create-edit'");
    expect(view).toContain('Clients');
    expect(view).toContain('readOnly={!canEditClient}');
    const tab = fs.readFileSync(
      'src/components/client-show/tabs/StatutoryProfileTab.tsx',
      'utf8'
    );
    expect(tab).toContain('if (readOnly) return;');
    expect(tab).toContain('disabled={readOnly}');
    const org = fs.readFileSync('src/components/client-show/panels/OrganizationPanel.tsx', 'utf8');
    expect(org).toContain('if (readOnly) return;');
  });
});

describe('I3 — billing month is persisted, defaults forward and cannot double-bill', () => {
  const december = createInvoiceFromQuote(QUOTE, '2026-12', 0, { issueDate: '2027-01-05' });

  it('stores the billing month independently of the issue date', () => {
    expect(december.billingMonth).toBe('2026-12');
    expect(december.issueDate).toBe('2027-01-05');
    expect(invoiceMonth(december)).toBe('2026-12');
    // A record saved before the field existed falls back to its issue month.
    expect(invoiceMonth(invoiceRecord({ issueDate: '2026-12-31' }))).toBe('2026-12');
  });

  it('after the December invoice the next default is January', () => {
    const yearsMonths = estimateMonths(QUOTE.estimateInput.startMonth);
    expect(yearsMonths).toContain('2026-12');
    expect(nextUnbilledMonth(QUOTE, [december], '2027-01-05')).toBe('2027-01');
  });

  it('refuses a second invoice for the same quote and month', () => {
    expect(invoiceForMonth([december], QUOTE.id, '2026-12')?.number).toBe('INV-1');
    expect(invoiceForMonth([december], QUOTE.id, '2027-01')).toBeUndefined();
    const state = practiceReducer(getInitialPracticeState(), {
      type: 'ADD_INVOICE',
      payload: december,
    });
    const again = practiceReducer(state, {
      type: 'ADD_INVOICE',
      payload: { ...december, id: 'invoice-duplicate', number: 'INV-9' },
    });
    expect(again.invoices).toHaveLength(1);
  });

  it('backfills billingMonth on load for legacy invoices', () => {
    const merged = mergePracticeState({
      invoices: [invoiceRecord({ issueDate: '2026-12-03', billingMonth: undefined })],
    });
    expect(merged.invoices[0].billingMonth).toBe('2026-12');
  });
});

describe('I4 — invoice lines carry their revenue account code', () => {
  const multiGroup: EstimateInput = {
    ...ESTIMATE_INPUT,
    selected: { BOOKKEEPING: true, AFS: true },
    hours: { BOOKKEEPING: 10, PAYROLL: 0, MGMT: 0, AFS: 20, REVIEW: 0 },
  };
  const quote: Quote = { ...QUOTE, estimateInput: multiGroup };
  const estimate = computeEstimate(multiGroup);
  // Annual work bills in the financial-year-end month (February here).
  const annualMonth = estimate.months.find((month) => month.endsWith('-02'))!;

  it('maps each estimate group to its chart-of-accounts code', () => {
    const regular = createInvoiceFromQuote(quote, estimate.months[0], 0);
    expect(regular.lineItems.some((item) => item.accountCode === '200')).toBe(true);
    // The VAT201 line is compliance work, not regular work.
    expect(regular.lineItems.some((item) => item.accountCode === '210')).toBe(true);

    const annual = createInvoiceFromQuote(quote, annualMonth, 0);
    expect(annual.lineItems.some((item) => item.accountCode === '220')).toBe(true);
  });

  it('the Xero payload and analytics split on those codes', () => {
    const invoice = createInvoiceFromQuote(quote, annualMonth, 0);
    expect(invoice.lineItems.some((item) => item.accountCode === '200')).toBe(true);
    expect(invoice.lineItems.some((item) => item.accountCode === '220')).toBe(true);

    const client = { name: 'Muse 1399' } as Client;
    const payload = buildXeroDraftInvoicePayload(invoice, client);
    const codes = payload.Invoices[0].LineItems.map((item) => item.AccountCode);
    expect(new Set(codes).size).toBeGreaterThan(1);

    const analytics = computeAnalytics(
      {
        invoices: [
          invoiceRecord({
            status: 'Sent',
            total: 1150,
            lineItems: [line({ unitAmount: 1000, accountCode: '200' })],
          }),
          invoiceRecord({
            id: 'invoice-y',
            status: 'Sent',
            total: 2300,
            lineItems: [line({ id: 'line-2', unitAmount: 2000, accountCode: '220' })],
          }),
        ],
        clients: [],
        taskStatusOverrides: {},
        timeEntries: [],
        quotes: [],
        activity: [],
      },
      { start: '2026-11-01', end: '2026-11-30' },
      { start: '2026-10-01', end: '2026-10-31' }
    );
    expect(analytics.revenueByGroup.map((group) => group.label).sort()).toEqual([
      'Annual work',
      'Regular work',
    ]);
  });
});

describe('I5 — legacy override statuses are normalised on load', () => {
  const legacy = {
    taskStatusOverrides: {
      'CLE-100|AFS|2026': { status: 'In review' },
      'CLE-100|VAT201|2026-10': { status: 'Done' },
      'CLE-100|EMP201|2026-10': { status: 'In progress' },
    },
  };

  it('maps the historical strings onto the six lanes', () => {
    const merged = mergePracticeState(legacy as Partial<PracticeState>);
    expect(merged.taskStatusOverrides['CLE-100|AFS|2026'].status).toBe('Partner Review Gate');
    expect(merged.taskStatusOverrides['CLE-100|VAT201|2026-10'].status).toBe('Submitted');
    expect(merged.taskStatusOverrides['CLE-100|EMP201|2026-10'].status).toBe('In Progress');
  });

  it('is idempotent across repeated loads', () => {
    const first = mergePracticeState(legacy as Partial<PracticeState>);
    const second = mergePracticeState(first);
    expect(second.taskStatusOverrides).toEqual(first.taskStatusOverrides);
  });

  it('loads the normalised status through the storage seam', () => {
    const storage = {
      getItem: (key: string) =>
        key === STORAGE_KEY
          ? JSON.stringify({
              taskStatusOverrides: { 'CLE-100|AFS|2026': { status: 'In review' } },
            })
          : null,
    };
    const loaded = loadPracticeState(storage);
    expect(loaded.taskStatusOverrides['CLE-100|AFS|2026'].status).toBe('Partner Review Gate');
    // The Inbox queue reads Partner Review Gate directly; the legacy string
    // used to vanish from it entirely.
    expect(
      Object.values(loaded.taskStatusOverrides).filter(
        (override) => override.status === 'Partner Review Gate'
      )
    ).toHaveLength(1);
  });
});

describe('I6 — role changes need Settings manage and never self-elevate', () => {
  it('blocks a Compliance Officer and self-changes', () => {
    const complianceCanManage = can('Compliance Officer', 'Settings', 'manage');
    expect(complianceCanManage).toBe(false);
    expect(staffRoleChangeBlock('partner-1', 'mia', complianceCanManage)).toContain(
      'Settings — manage permissions'
    );
    expect(staffRoleChangeBlock('mia', 'mia', true)).toContain('your own role');
    expect(staffRoleChangeBlock('erik', 'mia', true)).toBeNull();
  });

  it('logs the change in the activity trail', () => {
    const next = practiceReducer(getInitialPracticeState(), {
      type: 'UPDATE_STAFF_ROLE',
      payload: { staffId: 'mia', role: 'Partner' },
    });
    expect(next.staff.find((member) => member.id === 'mia')?.role).toBe('Partner');
    expect(next.activity[0]?.text).toContain('Changed role');
    expect(next.activity[0]?.text).toContain('Partner');
  });

  it('the pane gates the select on manage and confirms the change', () => {
    const pane = fs.readFileSync('src/components/settings/panes/TeamRbacPane.tsx', 'utf8');
    expect(pane).toContain("can(currentUser.role, 'Settings', 'manage'");
    expect(pane).toContain('staffRoleChangeBlock(');
    expect(pane).toContain('data-role-confirm');
  });
});

describe('I7 — the AI assistant is gated and scoped', () => {
  it('Support Tech has no assistant trigger', () => {
    expect(canUseAssistant('Support Tech')).toBe(false);
    expect(canUseAssistant('Accountant')).toBe(true);
    const layout = fs.readFileSync('src/components/layout/Layout.tsx', 'utf8');
    expect(layout).toContain('canUseAssistant(');
    expect(layout).toContain('assistantAllowed ? () => setAiDrawerOpen(true) : undefined');
    expect(layout).toContain('scopeAssistantState(');
  });

  it('a deadlines-only grant gets an empty client/pipeline slice', () => {
    const matrix = { 'Support Tech': { 'Deadlines.view': 'Allowed' as const } };
    expect(canUseAssistant('Support Tech', matrix)).toBe(true);
    const state = getInitialPracticeState();
    const scoped = scopeAssistantState(state, 'Support Tech', matrix);
    expect(scoped.clients).toEqual([]);
    expect(scoped.quotes).toEqual([]);
    expect(scoped.staff).toEqual([]);
    expect(scoped.rates.standardHourlyRate).toBe(0);
  });
});

describe('I8 — New client registers a real client', () => {
  it('creates a client whose scope generates statutory tasks', () => {
    const client = createClientRecord(
      {
        name: 'Table Bay Logistics (Pty) Ltd',
        entityType: 'Company',
        yearEndMonth: 2,
        vatCategory: 'B',
        payroll: true,
        employeeCount: 14,
        staffId: 'erik',
      },
      []
    );
    expect(client.code).toBe('TBL-100');
    const services = defaultServices(client);
    expect(services).toEqual(expect.arrayContaining(['VAT201', 'EMP201', 'ITR14', 'CIPC_AR']));
    const tasks = generateTasks(client, services, '2026-11-09');
    expect(tasks.length).toBeGreaterThan(0);

    // The new record lands in a store and the register reads it.
    const next = practiceReducer(getInitialPracticeState(), {
      type: 'ADD_CLIENT',
      payload: client,
    });
    expect(next.clients.some((entry) => entry.code === client.code)).toBe(true);
  });

  it('the + New menu and the register both open the dialog', () => {
    const topbar = fs.readFileSync('src/components/layout/Topbar.tsx', 'utf8');
    expect(topbar).toContain('newClient: true');
    const view = fs.readFileSync('src/components/views/ClientsView.tsx', 'utf8');
    expect(view).toContain('<NewClientDialog');
    expect(view).toContain('createClientRecord(');
  });
});

describe('I9 — issued invoices are read-only', () => {
  it('only a draft stays editable', () => {
    expect(invoiceIsEditable('Draft')).toBe(true);
    expect(invoiceIsEditable('Sent')).toBe(false);
    expect(invoiceIsEditable('Paid')).toBe(false);
  });

  it('the editor locks lines and add actions once issued', () => {
    const editor = fs.readFileSync('src/components/invoice/InvoiceEditor.tsx', 'utf8');
    expect(editor).toContain('const linesReadOnly = !invoiceIsEditable(status);');
    expect(editor).toContain('data-invoice-read-only');
    expect(editor).toContain('disabled={linesReadOnly}');
    // Send and Mark Paid stay available behind their own confirms.
    expect(editor).toContain('disabled={status !== \'Draft\' || !canEditInvoices}');
  });
});

describe('M1/M2/M3/M4/M8/M10/M11', () => {
  it('M1 cards are groups and focus survives a child control', () => {
    const board = fs.readFileSync('src/components/kanban/KanbanBoard.tsx', 'utf8');
    expect(board).toContain('role="group"');
    expect(board).not.toContain('role="button"');
    expect(board).toContain('if (event.currentTarget.contains(event.relatedTarget as Node)) return;');
  });

  it('M2 no-access shortcuts use the sidebar’s assigned scope', () => {
    const noAccess = fs.readFileSync('src/components/layout/NoAccessView.tsx', 'utf8');
    expect(noAccess).toContain('assigned: item.assignedAccess === true');
  });

  it('M3 + New is permission-filtered', () => {
    const teamMember = permittedNewActions('Team member', {}).map((action) => action.label);
    expect(teamMember).toContain('New quote');
    expect(teamMember).not.toContain('New client');
    expect(permittedNewActions('Support Tech', {})).toEqual([]);
    const topbar = fs.readFileSync('src/components/layout/Topbar.tsx', 'utf8');
    expect(topbar).toContain('data-new-menu-blocked="log-time"');
  });

  it('M4 the Log badge counts visible entries', () => {
    const view = fs.readFileSync('src/components/time/TimeView.tsx', 'utf8');
    expect(view).toContain('visibleEntries.length');
    expect(view).not.toContain('{timeEntries.length}');
  });

  it('M8 Add Action → New Quote carries the client code', () => {
    const view = fs.readFileSync('src/components/client-show/ClientShowView.tsx', 'utf8');
    expect(view).toContain("{ quoteClientCode: client.code }");
    const pipeline = fs.readFileSync('src/components/pipeline/SalesPipelineView.tsx', 'utf8');
    expect(pipeline).toContain('initialClientCode={editor.clientCode}');
  });

  it('M10 an unknown month never silently bills the first month', () => {
    expect(() => createInvoiceFromQuote(QUOTE, '2029-01', 0)).toThrow(RangeError);
  });

  it('M11 the unregistered placeholder is not an active client', () => {
    const analytics = computeAnalytics(
      {
        invoices: [
          invoiceRecord({ status: 'Sent', clientCode: UNREGISTERED_CLIENT_CODE, total: 100 }),
        ],
        clients: [],
        taskStatusOverrides: {},
        timeEntries: [],
        quotes: [],
        activity: [],
      },
      { start: '2026-11-01', end: '2026-11-30' },
      { start: '2026-10-01', end: '2026-10-31' }
    );
    expect(analytics.activeClients.value).toBeNull();
  });
});

describe('I10 — staff contract terms and notes persist', () => {
  it('round-trips through the store and the register', () => {
    const saved = practiceReducer(getInitialPracticeState(), {
      type: 'UPDATE_STAFF_PROFILE',
      payload: {
        staffId: 'hannes',
        patch: { contractType: 'subcontractor', hourlyRate: 780, notes: 'Cape metro audits.' },
      },
    });
    expect(saved.staffProfiles.hannes.hourlyRate).toBe(780);
    expect(saved.activity[0]?.text).toContain('Updated staff record');

    const rows = staffRows(STAFF, buildStaffUsers(STAFF, saved.currentUser, saved.staffProfiles));
    const hannes = rows.find((row) => row.id === 'hannes');
    expect(hannes?.hourlyRate).toBe(780);
    expect(hannes?.notes).toBe('Cape metro audits.');
  });
});

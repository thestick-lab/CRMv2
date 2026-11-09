import { describe, expect, it } from 'vitest';
import type {
  ActivityEvent,
  Invoice,
  InvoiceLine,
  Quote,
  TaskStatusOverride,
  TimeEntry,
} from '@/context/PracticeStoreContext';
import type { EstimateInput } from 'fdoncall-practice/domain/estimate';
import {
  ANALYTICS_WINDOWS,
  computeAnalytics,
  formatRange,
  resolveRanges,
  type AnalyticsInput,
} from './analytics-logic';

const RANGE = { start: '2026-09-01', end: '2026-11-30' };
const COMPARE = { start: '2026-06-01', end: '2026-08-31' };

function line(amount: number, accountCode?: string, taxType: InvoiceLine['taxType'] = 'OUTPUT2'): InvoiceLine {
  return { id: `line-${amount}-${accountCode ?? 'none'}`, description: 'Fee', quantity: 1, unitAmount: amount, accountCode, taxType, lineAmount: amount };
}

function invoice(overrides: Partial<Invoice> = {}): Invoice {
  const lineItems = overrides.lineItems ?? [line(4000, '200 - Accounting Fees')];
  const subtotal = overrides.subtotal ?? lineItems.reduce((sum, item) => sum + item.lineAmount, 0);
  const vat = overrides.vat ?? Math.round(subtotal * 15) / 100;
  return {
    id: 'inv-1',
    number: 'INV-1',
    clientCode: 'KHE-615',
    lineItems,
    taxRate: 0.15,
    subtotal,
    vat,
    total: overrides.total ?? Math.round((subtotal + vat) * 100) / 100,
    status: 'Sent',
    issueDate: '2026-10-05',
    dueDate: '2026-11-04',
    createdAt: '2026-10-05T08:00:00+02:00',
    ...overrides,
  };
}

function entry(overrides: Partial<TimeEntry> = {}): TimeEntry {
  return {
    id: 'time-1',
    clientCode: 'KHE-615',
    staffUserId: 'erik',
    startedAt: '2026-10-06T09:00:00+02:00',
    endedAt: '2026-10-06T10:30:00+02:00',
    durationMinutes: 90,
    roundedMinutes: 90,
    billable: true,
    description: 'VAT201 work',
    createdAt: '2026-10-06T10:30:00+02:00',
    ...overrides,
  };
}

const ESTIMATE_INPUT: EstimateInput = {
  startMonth: '2026-03',
  entityType: 'Company',
  yearEndMonth: 2,
  payroll: false,
  provisionalTaxpayer: true,
  directors: 1,
  rate: 625,
  marchIncreasePct: 6,
  irp6Payable: true,
  selected: {},
  hours: { BOOKKEEPING: 0, PAYROLL: 0, MGMT: 0, AFS: 0, REVIEW: 0 },
  months: { AFS: 2, REVIEW: 2, ITR: 2, CIPC_AR: 2 },
  recharges: { XERO: 0, SIMPLEPAY: 0 },
};

function quote(overrides: Partial<Quote> = {}): Quote {
  return {
    id: 'quote-1',
    number: 'Q-1',
    clientCode: 'BIO-123',
    estimateInput: ESTIMATE_INPUT,
    monthlyRetainerHours: 5,
    adHocHourlyRate: 625,
    vatInclusive: false,
    paymentTerms: '30 days',
    stage: 'Signed',
    ownerStaffId: 'erik',
    createdAt: '2026-10-01T08:00:00+02:00',
    updatedAt: '2026-10-10T08:00:00+02:00',
    ...overrides,
  };
}

function store(overrides: Partial<AnalyticsInput> = {}): AnalyticsInput {
  return {
    invoices: [],
    clients: [],
    taskStatusOverrides: {},
    timeEntries: [],
    quotes: [],
    activity: [],
    ...overrides,
  };
}

describe('computeAnalytics', () => {
  it('returns null for every metric when the store holds no records', () => {
    const result = computeAnalytics(store(), RANGE, COMPARE);

    expect(result.revenue).toEqual({ value: null, deltaPct: null });
    expect(result.activeClients).toEqual({ value: null, deltaPct: null });
    expect(result.filingsSubmitted).toEqual({ value: null, deltaPct: null });
    expect(result.billableHours).toEqual({ value: null, deltaPct: null });
    expect(result.revenueByMonth).toEqual([]);
    expect(result.revenueByGroup).toEqual([]);
    expect(result.hoursByClient).toEqual([]);
  });

  it('sums Sent and Paid invoice totals inside the period and leaves the delta undefined without history', () => {
    const result = computeAnalytics(
      store({
        invoices: [
          invoice({ id: 'sent', status: 'Sent', issueDate: '2026-10-05', total: 4125 }),
          invoice({ id: 'paid', status: 'Paid', issueDate: '2026-11-01', total: 2300 }),
        ],
      }),
      RANGE,
      COMPARE
    );

    expect(result.revenue.value).toBe(6425);
    expect(result.revenue.deltaPct).toBeNull();
  });

  it('excludes drafts and invoices issued outside the period', () => {
    const result = computeAnalytics(
      store({
        invoices: [
          invoice({ id: 'in', issueDate: '2026-10-05', total: 4125 }),
          invoice({ id: 'draft', status: 'Draft', issueDate: '2026-10-06', total: 9999 }),
          invoice({ id: 'before', issueDate: '2026-08-15', total: 1000 }),
          invoice({ id: 'after', issueDate: '2026-12-01', total: 1000 }),
        ],
      }),
      RANGE,
      COMPARE
    );

    expect(result.revenue.value).toBe(4125);
  });

  it('computes the percentage change against the immediately preceding period', () => {
    const result = computeAnalytics(
      store({
        invoices: [
          invoice({ id: 'current', issueDate: '2026-10-05', total: 1500 }),
          invoice({ id: 'previous', issueDate: '2026-07-05', total: 1000 }),
        ],
      }),
      RANGE,
      COMPARE
    );

    expect(result.revenue.value).toBe(1500);
    expect(result.revenue.deltaPct).toBe(50);
  });

  it('splits revenue across service groups using the line account code', () => {
    const result = computeAnalytics(
      store({
        invoices: [
          invoice({
            id: 'split',
            lineItems: [line(4000, '200 - Accounting Fees'), line(1000, '210 - Tax & Statutory')],
            subtotal: 5000,
            vat: 750,
            total: 5750,
          }),
        ],
      }),
      RANGE,
      COMPARE
    );

    const groups = result.revenueByGroup;
    expect(groups.map((group) => group.label)).toEqual(['Regular work', 'Compliance']);
    expect(groups.find((group) => group.label === 'Regular work')?.zar).toBe(4600);
    expect(groups.find((group) => group.label === 'Compliance')?.zar).toBe(1150);
    expect(groups.find((group) => group.label === 'Regular work')?.pct).toBe(80);
    expect(groups.reduce((sum, group) => sum + group.zar, 0)).toBe(result.revenue.value);
  });

  it('sends unmapped line account codes to Other', () => {
    const result = computeAnalytics(
      store({
        invoices: [invoice({ lineItems: [line(1000)] })],
      }),
      RANGE,
      COMPARE
    );

    expect(result.revenueByGroup).toEqual([
      { label: 'Other', pct: 100, zar: 1150 },
    ]);
  });

  it('buckets revenue by calendar month inside the period', () => {
    const result = computeAnalytics(
      store({
        invoices: [
          invoice({ id: 'sep', issueDate: '2026-09-10', total: 1000 }),
          invoice({ id: 'nov', issueDate: '2026-11-10', total: 2000 }),
        ],
      }),
      RANGE,
      COMPARE
    );

    expect(result.revenueByMonth.map((bucket) => bucket.label)).toEqual(['Sep', 'Oct', 'Nov']);
    expect(result.revenueByMonth.map((bucket) => bucket.value)).toEqual([1000, 0, 2000]);
    expect(result.revenueByMonth.reduce((sum, bucket) => sum + bucket.value, 0)).toBe(
      result.revenue.value
    );
  });

  it('counts distinct clients with invoice, time or signed-quote activity', () => {
    const result = computeAnalytics(
      store({
        invoices: [
          invoice({ id: 'a', clientCode: 'KHE-615', total: 1000 }),
          invoice({ id: 'b', clientCode: 'MUS-875', total: 1000 }),
        ],
        timeEntries: [entry({ id: 'c', clientCode: 'ALC-610', roundedMinutes: 60 })],
      }),
      RANGE,
      COMPARE
    );

    expect(result.activeClients.value).toBe(3);
    expect(result.activeClients.deltaPct).toBeNull();
  });

  it('counts clients from signed quotes but not open ones', () => {
    const result = computeAnalytics(
      store({
        quotes: [
          quote({ id: 'signed', stage: 'Signed' }),
          quote({ id: 'draft', clientCode: 'NEW-000', stage: 'Draft Quote' }),
          quote({ id: 'prospect', clientCode: undefined, stage: 'Active Client' }),
        ],
      }),
      RANGE,
      COMPARE
    );

    expect(result.activeClients.value).toBe(1);
  });

  it('counts submitted returns from the task overrides and skips unsigned work', () => {
    const overrides: Record<string, TaskStatusOverride> = {
      a: { status: 'Submitted', submissionDate: '2026-10-20' },
      b: { status: 'Submitted', updatedAt: '2026-11-02T09:00:00+02:00' },
      c: { status: 'Partner Review Gate', updatedAt: '2026-11-03T09:00:00+02:00' },
      d: { status: 'Submitted', submissionDate: '2026-07-01' },
    };

    const result = computeAnalytics(store({ taskStatusOverrides: overrides }), RANGE, COMPARE);

    expect(result.filingsSubmitted.value).toBe(2);
    // The comparison window holds one submission (2026-07-01): 2 vs 1 = +100%.
    expect(result.filingsSubmitted.deltaPct).toBe(100);
  });

  it('sums billable hours only and leaves non-billable entries out', () => {
    const result = computeAnalytics(
      store({
        timeEntries: [
          entry({ id: 'billable', roundedMinutes: 90, billable: true }),
          entry({ id: 'non-billable', roundedMinutes: 120, billable: false }),
        ],
      }),
      RANGE,
      COMPARE
    );

    expect(result.billableHours.value).toBe(1.5);
    expect(result.billableHours.deltaPct).toBeNull();
  });

  it('lists hours by client, largest first, named from the client register', () => {
    const result = computeAnalytics(
      store({
        clients: [
          { code: 'KHE-615', name: 'Kheper SA t/a Silki' },
          { code: 'MUS-875', name: 'Muse 1399' },
        ],
        timeEntries: [
          entry({ id: 'k1', clientCode: 'KHE-615', roundedMinutes: 60 }),
          entry({ id: 'k2', clientCode: 'KHE-615', roundedMinutes: 30 }),
          entry({ id: 'm1', clientCode: 'MUS-875', roundedMinutes: 240 }),
          entry({ id: 'x1', clientCode: 'ZZZ-000', roundedMinutes: 15 }),
        ],
      }),
      RANGE,
      COMPARE
    );

    expect(result.hoursByClient).toEqual([
      { label: 'Muse 1399', hours: 4 },
      { label: 'Kheper SA t/a Silki', hours: 1.5 },
      { label: 'ZZZ-000', hours: 0.25 },
    ]);
  });

  it('caps the hours-by-client bar list at the top five', () => {
    const entries = Array.from({ length: 7 }, (_, index) =>
      entry({ id: `e${index}`, clientCode: `C${index}`, roundedMinutes: (index + 1) * 60 })
    );

    const result = computeAnalytics(store({ timeEntries: entries }), RANGE, COMPARE);

    expect(result.hoursByClient).toHaveLength(5);
    expect(result.hoursByClient[0]).toEqual({ label: 'C6', hours: 7 });
  });

  it('sorts the merged activity feed newest first', () => {
    const live: ActivityEvent[] = [
      {
        id: 'live',
        type: 'invoice',
        actorName: 'Erik',
        actorInitials: 'E',
        tint: 'crimson',
        text: 'Sent invoice INV-1',
        subline: 'KHE-615 · R 4 600,00',
        at: '2026-11-09T10:00:00+02:00',
      },
    ];

    const result = computeAnalytics(store({ activity: live }), RANGE, COMPARE);

    expect(result.activity[0]?.id).toBe('live');
  });

  it('does not mutate the store it is given', () => {
    const input = store({
      invoices: [invoice({ total: 4125 })],
      timeEntries: [entry()],
    });
    const snapshot = JSON.stringify(input);

    computeAnalytics(input, RANGE, COMPARE);

    expect(JSON.stringify(input)).toBe(snapshot);
  });
});

describe('resolveRanges', () => {
  it('derives the window and the immediately preceding window from today', () => {
    const { range, compare } = resolveRanges('2026-11-09', '7D');

    expect(range).toEqual({ start: '2026-11-03', end: '2026-11-09' });
    expect(compare).toEqual({ start: '2026-10-27', end: '2026-11-02' });
  });

  it('keeps the comparison window the same length for every preset', () => {
    for (const preset of ANALYTICS_WINDOWS) {
      const { range, compare } = resolveRanges('2026-11-09', preset.id);
      const days = (value: { start: string; end: string }) =>
        Math.round(
          (Date.parse(`${value.end}T00:00:00Z`) - Date.parse(`${value.start}T00:00:00Z`)) /
            86_400_000
        ) + 1;
      expect(days(range)).toBe(preset.days);
      expect(days(compare)).toBe(preset.days);
      expect(compare.end < range.start).toBe(true);
    }
  });
});

describe('formatRange', () => {
  it('labels the range with a shared year', () => {
    expect(formatRange({ start: '2026-09-01', end: '2026-11-30' })).toBe('1 Sep – 30 Nov 2026');
    expect(formatRange({ start: '2025-11-10', end: '2026-11-09' })).toBe(
      '10 Nov 2025 – 9 Nov 2026'
    );
  });
});

import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { CLIENTS } from 'fdoncall-practice/data/seed';
import {
  getInitialPracticeState,
  mergePracticeState,
  type Invoice,
  type Quote,
} from '@/context/PracticeStoreContext';
import {
  buildXeroDraftInvoicePayload,
  simulateXeroSync,
  summariseXeroDraft,
} from '@/lib/integrations/xero';
import { createDocumensoEnvelope, withRecipientEmail } from '@/lib/integrations/documenso';

const muse = CLIENTS.find((c) => c.code === 'MUS-875')!;

const invoice: Invoice = {
  id: 'inv-test-1',
  number: 'INV-7',
  clientCode: 'MUS-875',
  taxRate: 0.15,
  lineItems: [
    {
      id: 'line-retainer',
      description: 'Monthly retainer — Bookkeeping',
      quantity: 1,
      unitAmount: 2400,
      accountCode: '200',
      taxType: 'OUTPUT2',
      lineAmount: 2400,
    },
    {
      id: 'line-cipc',
      description: 'CIPC annual return (paid on the client’s behalf)',
      quantity: 1,
      unitAmount: 850,
      taxType: 'NONE',
      lineAmount: 850,
    },
  ],
  subtotal: 3250,
  vat: 360,
  total: 3610,
  status: 'Draft',
  issueDate: '2026-11-01',
  dueDate: '2026-11-30',
  createdAt: '2026-11-01T08:00:00Z',
};

const prospectQuote: Quote = {
  id: 'quote-test-1',
  number: 'Q-7',
  prospect: {
    name: 'Stellenbosch BioTech Labs',
    contactPerson: 'Dr Anja Visser',
    entityType: 'Company',
    turnover: 18_400_000,
    payroll: true,
    employeeCount: 14,
    vatCategory: 'B',
    yearEndMonth: 2,
    staffId: 'erik',
  },
  estimateInput: {
    startMonth: '2026-12',
    entityType: 'Company',
    yearEndMonth: 2,
    vatCategory: 'B',
    turnover: 18_400_000,
    payroll: true,
    employeeCount: 14,
    provisionalTaxpayer: true,
    directors: 2,
    rate: 625,
    marchIncreasePct: 6,
    irp6Payable: false,
    selected: {},
    hours: { BOOKKEEPING: 4, PAYROLL: 2, MGMT: 2, AFS: 12, REVIEW: 3 },
    months: { AFS: 4, REVIEW: 5, ITR: 6, CIPC_AR: 6 },
    recharges: { XERO: 450, SIMPLEPAY: 0 },
  },
  monthlyRetainerHours: 8,
  adHocHourlyRate: 625,
  vatInclusive: false,
  paymentTerms: '30 days from invoice date',
  stage: 'Accepted',
  ownerStaffId: 'erik',
  createdAt: '2026-11-01T08:00:00Z',
  updatedAt: '2026-11-02T08:00:00Z',
};

describe('Xero draft invoice payload', () => {
  it('maps an invoice to an ACCREC draft with exclusive OUTPUT2/NONE line tax', () => {
    const payload = buildXeroDraftInvoicePayload(invoice, muse);

    expect(Array.isArray(payload.Invoices)).toBe(true);
    const draft = payload.Invoices[0];
    expect(draft.Type).toBe('ACCREC');
    expect(draft.Status).toBe('DRAFT');
    expect(draft.LineAmountTypes).toBe('Exclusive');
    expect(draft.Contact).toEqual({ Name: muse.name });
    expect(draft.Reference).toBe('INV-7');
    expect(draft.Date).toBe('2026-11-01');
    expect(draft.DueDate).toBe('2026-11-30');
    expect(draft.LineItems).toHaveLength(2);

    expect(draft.LineItems[0]).toMatchObject({
      Description: 'Monthly retainer — Bookkeeping',
      Quantity: 1,
      UnitAmount: 2400,
      AccountCode: '200',
      TaxType: 'OUTPUT2',
    });
    expect(draft.LineItems[1].TaxType).toBe('NONE');
  });

  it('keeps amounts exclusive of VAT and reconciles VAT onto the invoice total', () => {
    const draft = buildXeroDraftInvoicePayload(invoice, muse).Invoices[0];
    const exclusiveSum = draft.LineItems.reduce(
      (sum, line) => sum + line.Quantity * line.UnitAmount,
      0
    );
    expect(exclusiveSum).toBeCloseTo(invoice.subtotal, 2);

    const taxable = draft.LineItems.filter((line) => line.TaxType === 'OUTPUT2').reduce(
      (sum, line) => sum + line.Quantity * line.UnitAmount,
      0
    );
    const computedTotal = Math.round((exclusiveSum + taxable * 0.15) * 100) / 100;
    expect(computedTotal).toBeCloseTo(invoice.total, 2);
  });

  it('simulates a sync without claiming a real Xero invoice id', () => {
    const result = simulateXeroSync(invoice);
    expect(result.status).toBe('synced');
    expect(result.xeroInvoiceId).toMatch(/^xero-sim-[a-z0-9-]+$/i);
    expect(result.xeroInvoiceId).not.toBe(invoice.number);
    expect(Number.isNaN(Date.parse(result.at))).toBe(false);
  });

  it('rounds VAT per taxable line so fractional quantities reconcile cent-exact', () => {
    const fractional: Invoice = {
      ...invoice,
      lineItems: [
        {
          id: 'line-overage-a',
          description: 'Time overage — Oct (bookkeeping)',
          quantity: 2.5,
          unitAmount: 625,
          accountCode: '200',
          taxType: 'OUTPUT2',
          lineAmount: 1562.5,
        },
        {
          id: 'line-overage-b',
          description: 'Time overage — Oct (payroll)',
          quantity: 1.5,
          unitAmount: 625,
          accountCode: '200',
          taxType: 'OUTPUT2',
          lineAmount: 937.5,
        },
      ],
      subtotal: 2500,
      vat: 375.01,
      total: 2875.01,
    };

    const totals = summariseXeroDraft(buildXeroDraftInvoicePayload(fractional, muse).Invoices[0]);
    // 234.375 -> 234.38 and 140.625 -> 140.63 per line (Xero/document rule).
    expect(totals.vat).toBe(375.01);
    expect(totals.exclusiveSubtotal).toBe(2500);
    expect(totals.total).toBe(2875.01);
    // Aggregate rounding would have produced 375.00 — a cent of drift.
    expect(Math.round(2500 * 0.15 * 100) / 100).toBe(375);
  });

  it('drives the dialog totals from the per-line summary', () => {
    const source = fs.readFileSync('src/components/integrations/XeroSyncDialog.tsx', 'utf8');
    expect(source).toContain('summariseXeroDraft');
  });
});

describe('Documenso envelope creation', () => {
  it('returns a synthetic envelope with a dual client/countersigner order', () => {
    const envelope = createDocumensoEnvelope(prospectQuote);

    expect(envelope.envelopeId).toMatch(/^env-[a-z0-9]+$/i);
    expect(envelope.recipients).toHaveLength(2);
    expect(envelope.recipients.map((r) => r.signingOrder)).toEqual([1, 2]);
    expect(envelope.recipients.every((r) => r.role === 'SIGNER')).toBe(true);

    expect(envelope.recipients[0].name).toBe('Dr Anja Visser');
    expect(envelope.recipients[1].name).toBe('Erik');
    expect(Number.isNaN(Date.parse(envelope.sentAt))).toBe(false);
  });

  it('uses the recorded client contact email when the client is registered', () => {
    const registered: Quote = { ...prospectQuote, clientCode: 'MUS-875', prospect: undefined };
    const envelope = createDocumensoEnvelope(registered, { client: muse });
    const contact = muse.contacts?.find((c) => c.email) ?? muse.contacts?.[0];
    expect(envelope.recipients[0].name).toBe(contact?.name ?? muse.name);
    if (contact?.email) expect(envelope.recipients[0].email).toBe(contact.email);
  });

  it('never reuses an envelope id', () => {
    const first = createDocumensoEnvelope(prospectQuote);
    const second = createDocumensoEnvelope(prospectQuote);
    expect(first.envelopeId).not.toBe(second.envelopeId);
  });

  it('carries the corrected signatory email into the dispatched envelope', () => {
    const envelope = createDocumensoEnvelope(prospectQuote);
    const corrected = withRecipientEmail(envelope, 'anja.visser@biotech.example');

    expect(corrected.envelopeId).toBe(envelope.envelopeId);
    expect(corrected.recipients[0]).toEqual({
      ...envelope.recipients[0],
      email: 'anja.visser@biotech.example',
    });
    expect(corrected.recipients[0]).toMatchObject({ role: 'SIGNER', signingOrder: 1 });
    expect(corrected.recipients[1]).toEqual(envelope.recipients[1]);
    // The memoized preview remains untouched; only the dispatched copy changes.
    expect(envelope.recipients[0].email).not.toBe('anja.visser@biotech.example');
  });

  it('dispatches the edited email rather than the pre-edit envelope', () => {
    const source = fs.readFileSync(
      'src/components/integrations/DocumensoDispatchDialog.tsx',
      'utf8'
    );
    expect(source).toContain('withRecipientEmail(envelope, clientEmail)');
    expect(source).toContain('onDispatched?.(outgoing)');
  });
});

describe('integrationConfig persistence', () => {
  it('ships empty credential defaults', () => {
    expect(getInitialPracticeState().integrationConfig).toEqual({
      documensoBaseUrl: '',
      documensoApiKey: '',
      xeroClientId: '',
      xeroClientSecret: '',
      xeroTenantId: '',
    });
  });

  it('keeps persisted credentials and defaults the fields that are missing', () => {
    const merged = mergePracticeState({
      integrationConfig: { documensoApiKey: 'dcm_test_key', xeroTenantId: 'tenant-42' },
    });
    expect(merged.integrationConfig.documensoApiKey).toBe('dcm_test_key');
    expect(merged.integrationConfig.xeroTenantId).toBe('tenant-42');
    expect(merged.integrationConfig.xeroClientId).toBe('');
  });
});

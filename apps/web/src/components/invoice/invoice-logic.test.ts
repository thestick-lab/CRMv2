import { describe, expect, it } from 'vitest';
import type { Client } from 'fdoncall-practice/domain/types';
import type { EstimateInput } from 'fdoncall-practice/domain/estimate';
import { computeEstimate } from 'fdoncall-practice/domain/estimate';
import type { Invoice, InvoiceLine, Quote } from '@/context/PracticeStoreContext';
import {
  buildXeroDraftInvoicePayload,
  summariseXeroDraft,
} from '@/lib/integrations/xero';
import {
  INVOICE_TAX_RATE,
  computeInvoiceStatus,
  createInvoiceFromQuote,
  invoicePaymentDetails,
  nextUnbilledMonth,
  reconcileInvoice,
} from './invoice-logic';

function line(partial: Partial<InvoiceLine> & Pick<InvoiceLine, 'unitAmount'>): InvoiceLine {
  const quantity = partial.quantity ?? 1;
  return {
    id: partial.id ?? `line-${partial.unitAmount}`,
    description: partial.description ?? 'Fee',
    quantity,
    unitAmount: partial.unitAmount,
    taxType: partial.taxType ?? 'OUTPUT2',
    lineAmount: partial.lineAmount ?? quantity * partial.unitAmount,
    accountCode: partial.accountCode,
  };
}

function invoice(partial: Partial<Invoice>): Invoice {
  return {
    id: 'invoice-1',
    number: 'INV-1',
    clientCode: 'MUS-875',
    lineItems: [],
    taxRate: INVOICE_TAX_RATE,
    subtotal: 0,
    vat: 0,
    total: 0,
    status: 'Sent',
    issueDate: '2026-11-01',
    dueDate: '2026-11-30',
    createdAt: '2026-11-01T08:00:00Z',
    ...partial,
  };
}

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
  id: 'quote-4',
  number: 'Q-4',
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

describe('reconcileInvoice', () => {
  it('adds the reference layout lines and applies the layout tax rate', () => {
    // The reference example's 375 VAT on R3 750 is a 10% rule (the layout's
    // fiction). The practice bills at 15%, covered by the next assertion.
    const totals = reconcileInvoice(
      [line({ unitAmount: 2400 }), line({ unitAmount: 850 }), line({ unitAmount: 500 })],
      0.1
    );

    expect(totals).toEqual({ subtotal: 3750, vat: 375, total: 4125 });
  });

  it('charges 15% VAT per taxable line on the same fees', () => {
    const totals = reconcileInvoice(
      [line({ unitAmount: 2400 }), line({ unitAmount: 850 }), line({ unitAmount: 500 })],
      INVOICE_TAX_RATE
    );

    expect(totals).toEqual({ subtotal: 3750, vat: 562.5, total: 4312.5 });
  });

  it('recomputes the document totals when a quantity changes', () => {
    const totals = reconcileInvoice(
      [
        line({ unitAmount: 2400, quantity: 2 }),
        line({ unitAmount: 850 }),
        line({ unitAmount: 500 }),
      ],
      INVOICE_TAX_RATE
    );

    expect(totals).toEqual({ subtotal: 6150, vat: 922.5, total: 7072.5 });
  });

  it('includes a negative discount line and reduces VAT accordingly', () => {
    const totals = reconcileInvoice(
      [
        line({ unitAmount: 2400 }),
        line({ unitAmount: 850 }),
        line({ unitAmount: 500 }),
        line({ id: 'discount', description: 'Prompt-payment discount', unitAmount: -250 }),
      ],
      INVOICE_TAX_RATE
    );

    expect(totals).toEqual({ subtotal: 3500, vat: 525, total: 4025 });
  });

  it('matches the Xero summary on a sub-cent unit price', () => {
    // Raw quantity x unit would charge 0.034 x 15% = 0.01 VAT, while the
    // payload rounds the unit to 0.03 first and charges no VAT on that line.
    const lines = [
      line({ id: 'time', unitAmount: 0.015, quantity: 2.5 }),
      line({ id: 'rounding', unitAmount: 0.034, quantity: 1 }),
      line({ id: 'fee', unitAmount: 100 }),
    ];
    const documentTotals = reconcileInvoice(lines, INVOICE_TAX_RATE);
    const xeroTotals = summariseXeroDraft(
      buildXeroDraftInvoicePayload(
        invoice({ lineItems: lines, ...documentTotals }),
        { name: 'Table Bay Logistics CC' } as Client
      ).Invoices[0]
    );

    expect(documentTotals).toEqual({
      subtotal: xeroTotals.exclusiveSubtotal,
      vat: xeroTotals.vat,
      total: xeroTotals.total,
    });
    expect(documentTotals.vat).toBe(xeroTotals.vat);
  });

  it('leaves CIPC disbursements out of VAT', () => {
    const totals = reconcileInvoice(
      [line({ unitAmount: 1000 }), line({ unitAmount: 200, taxType: 'NONE' })],
      INVOICE_TAX_RATE
    );

    expect(totals).toEqual({ subtotal: 1200, vat: 150, total: 1350 });
  });
});

describe('invoicePaymentDetails', () => {
  it('restores saved terms and methods ahead of the quote defaults', () => {
    expect(
      invoicePaymentDetails(
        { paymentTerms: '14 days', paymentMethods: ['EFT', 'Debit order'] },
        '30 days'
      )
    ).toEqual({ terms: '14 days', methods: ['EFT', 'Debit order'] });
  });

  it('falls back to the quote terms and EFT for invoices saved before the fields', () => {
    expect(invoicePaymentDetails({}, '14 days')).toEqual({
      terms: '14 days',
      methods: ['EFT'],
    });
    expect(invoicePaymentDetails(undefined, undefined)).toEqual({
      terms: '30 days',
      methods: ['EFT'],
    });
  });
});

describe('computeInvoiceStatus', () => {
  it('derives Overdue from the due date without touching a draft', () => {
    expect(computeInvoiceStatus(invoice({ status: 'Draft', dueDate: '2026-10-01' }), '2026-11-09')).toBe(
      'Draft'
    );
  });

  it('flags a sent invoice past its due date as Overdue', () => {
    expect(computeInvoiceStatus(invoice({ status: 'Sent', dueDate: '2026-11-08' }), '2026-11-09')).toBe(
      'Overdue'
    );
  });

  it('keeps a sent invoice that is due today as Sent', () => {
    expect(computeInvoiceStatus(invoice({ status: 'Sent', dueDate: '2026-11-09' }), '2026-11-09')).toBe(
      'Sent'
    );
  });

  it('never overrides a paid invoice', () => {
    expect(computeInvoiceStatus(invoice({ status: 'Paid', dueDate: '2026-09-01' }), '2026-11-09')).toBe(
      'Paid'
    );
  });
});

describe('createInvoiceFromQuote', () => {
  it('builds a draft invoice from the requested month of the fee schedule', () => {
    const estimate = computeEstimate(QUOTE.estimateInput);
    const created = createInvoiceFromQuote(QUOTE, estimate.months[0], 2, {
      issueDate: '2026-11-09',
    });

    expect(created.number).toBe('INV-3');
    expect(created.quoteId).toBe('quote-4');
    expect(created.clientCode).toBe('MUS-875');
    expect(created.status).toBe('Draft');
    expect(created.taxRate).toBe(INVOICE_TAX_RATE);
    expect(created.lineItems.length).toBeGreaterThan(0);
    expect(created.lineItems[0].unitAmount).toBe(estimate.lines[0].amounts[0]);
    expect(created.dueDate).toBe('2026-12-09');

    const totals = reconcileInvoice(created.lineItems, created.taxRate);
    expect({ subtotal: created.subtotal, vat: created.vat, total: created.total }).toEqual(totals);
  });

  it('picks the month after the last invoiced one', () => {
    const estimate = computeEstimate(QUOTE.estimateInput);
    const alreadyInvoiced = invoice({
      quoteId: QUOTE.id,
      issueDate: '2026-11-05',
      dueDate: '2026-12-05',
    });

    const month = nextUnbilledMonth(QUOTE, [alreadyInvoiced], '2026-11-09');
    expect(month).toBe(estimate.months[1]);

    const created = createInvoiceFromQuote(QUOTE, month, 1);
    expect(created.lineItems[0].unitAmount).toBe(estimate.lines[0].amounts[1]);
  });

  it('skips months that are already billed when the default month advances', () => {
    const estimate = computeEstimate(QUOTE.estimateInput);
    const invoices = [0, 1].map((index) =>
      invoice({
        id: `invoice-${index}`,
        quoteId: QUOTE.id,
        issueDate: `${estimate.months[index]}-05`,
        dueDate: `${estimate.months[index]}-28`,
      })
    );

    expect(nextUnbilledMonth(QUOTE, invoices, '2026-11-09')).toBe(estimate.months[2]);
  });
});

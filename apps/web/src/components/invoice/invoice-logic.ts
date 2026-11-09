import {
  cents,
  computeEstimate,
  estimateMonths,
  formatMonthShort,
  type EstimateLine,
} from 'fdoncall-practice/domain/estimate';
import { addDays, todayInSouthAfrica, type ISODate } from 'fdoncall-practice/domain/dates';
import type {
  Invoice,
  InvoiceLine,
  InvoiceStatus,
  Quote,
} from '@/context/PracticeStoreContext';

/**
 * Invoice arithmetic and lifecycle helpers.
 *
 * Money follows the same rule as the Xero preview (`summariseXeroDraft`): the
 * subtotal is the sum of the line amounts and VAT is rounded to the cent on
 * each taxable line. That per-line basis is what keeps the invoice document
 * and the Xero draft payload reconciling to the cent, even for fractional
 * (time-based) quantities.
 */

/** South African standard VAT rate, fixed for the practice's invoices. */
export const INVOICE_TAX_RATE = 0.15;

/** Placeholder client code for a migrated prospect quote with no client record. */
export const UNREGISTERED_CLIENT_CODE = 'UNREGISTERED';

export interface InvoiceTotals {
  subtotal: number;
  vat: number;
  total: number;
}

/**
 * Cent-exact totals for a set of invoice lines.
 *
 * `subtotal` is the sum of `lineAmount` (what the user sees charged); VAT is
 * computed per taxable line from quantity × unit amount so it matches Xero's
 * `Quantity × UnitAmount × 15%` rounding. The editor keeps `lineAmount` in
 * step with quantity × unit amount on every edit, so both bases agree.
 */
export function reconcileInvoice(
  lines: InvoiceLine[],
  taxRate: number = INVOICE_TAX_RATE
): InvoiceTotals {
  let subtotal = 0;
  let vat = 0;

  for (const line of lines) {
    subtotal = cents(subtotal + cents(line.lineAmount));
    if (line.taxType === 'OUTPUT2') {
      vat = cents(vat + cents(cents(line.quantity * line.unitAmount) * taxRate));
    }
  }

  return {
    subtotal: cents(subtotal),
    vat: cents(vat),
    total: cents(subtotal + vat),
  };
}

/**
 * Display status for an invoice. `Overdue` is derived at render time and is
 * never written to the store: a draft is unaffected by its due date, a paid
 * invoice is always paid, and only a sent invoice past its due date reads
 * overdue.
 */
export function computeInvoiceStatus(
  invoice: Pick<Invoice, 'status' | 'dueDate'>,
  today: ISODate
): InvoiceStatus | 'Overdue' {
  if (invoice.status === 'Draft') return 'Draft';
  if (invoice.status === 'Paid') return 'Paid';
  return invoice.dueDate < today ? 'Overdue' : 'Sent';
}

/** Days from issue to due for the quote's payment terms (`On presentation` = same day). */
export function paymentTermsDays(terms: string | undefined): number {
  if (!terms) return 30;
  const match = terms.match(/(\d+)\s*day/i);
  if (match) return Number(match[1]);
  if (/presentation|immediate|on receipt/i.test(terms)) return 0;
  return 30;
}

export interface CreateInvoiceOptions {
  /** Defaults to today in South Africa; injectable so documents stay testable. */
  issueDate?: ISODate;
  id?: string;
}

/**
 * The invoice for one month of a quote's fee schedule.
 *
 * Lines are that month's fee lines only (annual work lands in the month the
 * estimate bills it). The quote's payment terms set the due date, and the
 * invoice starts as a `Draft` for the user to review before sending.
 */
export function createInvoiceFromQuote(
  quote: Quote,
  month: string,
  sequence: number,
  options: CreateInvoiceOptions = {}
): Invoice {
  const estimate = computeEstimate(quote.estimateInput);
  const monthIndex = Math.max(0, estimate.months.indexOf(month));
  const issueDate = options.issueDate ?? todayInSouthAfrica();
  const dueDate = addDays(issueDate, paymentTermsDays(quote.paymentTerms));

  const lineItems: InvoiceLine[] = estimate.lines
    .filter((line: EstimateLine) => line.amounts[monthIndex] > 0)
    .map((line) => ({
      id: `line-${line.key}-${estimate.months[monthIndex]}`,
      description: `${line.label}${line.note ? ` (${line.note})` : ''} — ${formatMonthShort(
        estimate.months[monthIndex]
      )}`,
      quantity: 1,
      unitAmount: line.amounts[monthIndex],
      taxType: line.vatable ? 'OUTPUT2' : 'NONE',
      lineAmount: line.amounts[monthIndex],
    }));

  const totals = reconcileInvoice(lineItems, INVOICE_TAX_RATE);

  return {
    id: options.id ?? `invoice-${quote.id}-${month}-${sequence + 1}`,
    number: `INV-${sequence + 1}`,
    quoteId: quote.id,
    clientCode: quote.clientCode ?? UNREGISTERED_CLIENT_CODE,
    lineItems,
    taxRate: INVOICE_TAX_RATE,
    ...totals,
    status: 'Draft',
    issueDate,
    dueDate,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Default month for a new invoice on a quote: the month after the last one
 * already invoiced, else the first unbilled month from today, else the last
 * month of the schedule.
 *
 * The invoice record carries no explicit billing month, so the month it was
 * issued in (`issueDate.slice(0, 7)`) is the record of what has been billed.
 */
export function nextUnbilledMonth(
  quote: Quote,
  invoices: Pick<Invoice, 'quoteId' | 'issueDate'>[],
  today: ISODate = todayInSouthAfrica()
): string {
  const months = estimateMonths(quote.estimateInput.startMonth);
  const billed = new Set(
    invoices
      .filter((invoice) => invoice.quoteId === quote.id)
      .map((invoice) => invoice.issueDate.slice(0, 7))
  );

  const billedMonths = [...billed].filter((month) => months.includes(month)).sort();
  const lastBilled = billedMonths[billedMonths.length - 1];
  if (lastBilled) {
    const afterLast = months[months.indexOf(lastBilled) + 1];
    if (afterLast) return afterLast;
  }

  const currentMonth = today.slice(0, 7);
  return (
    months.find((month) => month >= currentMonth && !billed.has(month)) ??
    months.find((month) => !billed.has(month)) ??
    months[months.length - 1]
  );
}

/** The month an existing invoice bills, for the editor's month label. */
export function invoiceMonth(invoice: Pick<Invoice, 'issueDate'>): string {
  return invoice.issueDate.slice(0, 7);
}

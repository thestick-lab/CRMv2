import type { Client } from 'fdoncall-practice/domain/types';
import type { Estimate, EstimateGroup } from 'fdoncall-practice/domain/estimate';
import { cents } from 'fdoncall-practice/domain/estimate';
import { addDays, todayInSouthAfrica, type ISODate } from 'fdoncall-practice/domain/dates';
import type { Invoice } from '@/context/PracticeStoreContext';

/**
 * Xero accounting service seam.
 *
 * The practice bills through Xero's Accounting API: invoices are ACCREC drafts
 * with `LineAmountTypes: 'Exclusive'` (Xero adds the 15% VAT itself from the
 * per-line `TaxType`) and `OUTPUT2` on revenue lines. `NONE` is reserved for
 * disbursements paid to CIPC on the client's behalf, which carry no VAT.
 *
 * Building the payload is pure and side-effect free. Only `simulateXeroSync`
 * stands in for the network call: it returns a clearly synthetic id so a
 * simulated sync can never be mistaken for a real Xero invoice.
 */

export type XeroTaxType = 'OUTPUT2' | 'NONE';

export interface XeroLineItem {
  Description: string;
  Quantity: number;
  UnitAmount: number;
  AccountCode: string;
  TaxType: XeroTaxType;
}

export interface XeroDraftInvoice {
  Type: 'ACCREC';
  Status: 'DRAFT';
  LineAmountTypes: 'Exclusive';
  Contact: { Name: string };
  LineItems: XeroLineItem[];
  Date: ISODate;
  DueDate: ISODate;
  Reference: string;
}

export interface XeroDraftInvoicePayload {
  Invoices: XeroDraftInvoice[];
}

/** Chart-of-accounts codes the practice bills under. */
export const XERO_ACCOUNT_CODES = {
  revenue: '200',
  compliance: '210',
  annual: '220',
  recharges: '230',
  disbursement: '310',
} as const;

const GROUP_ACCOUNT_CODES: Record<EstimateGroup, string> = {
  'Regular work': XERO_ACCOUNT_CODES.revenue,
  Compliance: XERO_ACCOUNT_CODES.compliance,
  'Annual work': XERO_ACCOUNT_CODES.annual,
  Recharges: XERO_ACCOUNT_CODES.recharges,
  'Once-off': XERO_ACCOUNT_CODES.revenue,
};

function syntheticToken(): string {
  const cryptoApi = typeof globalThis.crypto !== 'undefined' ? globalThis.crypto : undefined;
  if (cryptoApi && typeof cryptoApi.randomUUID === 'function') {
    return cryptoApi.randomUUID().replace(/-/g, '').slice(0, 12);
  }
  return Math.random().toString(36).slice(2, 12);
}

function accountCodeFor(line: { accountCode?: string; taxType: XeroTaxType }): string {
  if (line.accountCode) return line.accountCode;
  return line.taxType === 'NONE' ? XERO_ACCOUNT_CODES.disbursement : XERO_ACCOUNT_CODES.revenue;
}

/** The exact request body `POST https://api.xero.com/api.xro/2.0/Invoices` takes. */
export function buildXeroDraftInvoicePayload(invoice: Invoice, client: Client): XeroDraftInvoicePayload {
  return {
    Invoices: [
      {
        Type: 'ACCREC',
        Status: 'DRAFT',
        LineAmountTypes: 'Exclusive',
        Contact: { Name: client.name },
        LineItems: invoice.lineItems.map((line) => ({
          Description: line.description,
          Quantity: line.quantity,
          UnitAmount: cents(line.unitAmount),
          AccountCode: accountCodeFor(line),
          TaxType: line.taxType,
        })),
        Date: invoice.issueDate,
        DueDate: invoice.dueDate,
        Reference: invoice.number,
      },
    ],
  };
}

export interface XeroDraftTotals {
  exclusiveSubtotal: number;
  vat: number;
  total: number;
}

/**
 * Totals exactly as Xero computes them: VAT is rounded to the cent on each
 * taxable line (`Quantity × UnitAmount × 15%`), not on the aggregate. That is
 * also the rule the invoice document and `reconcileInvoice` use, so the preview
 * reconciles cent-exact even with fractional (time-based) quantities.
 */
export function summariseXeroDraft(draft: XeroDraftInvoice): XeroDraftTotals {
  let exclusiveSubtotal = 0;
  let vat = 0;
  for (const line of draft.LineItems) {
    const lineAmount = cents(line.Quantity * line.UnitAmount);
    exclusiveSubtotal = cents(exclusiveSubtotal + lineAmount);
    if (line.TaxType === 'OUTPUT2') {
      vat = cents(vat + cents(line.Quantity * line.UnitAmount * 0.15));
    }
  }
  return {
    exclusiveSubtotal: cents(exclusiveSubtotal),
    vat: cents(vat),
    total: cents(exclusiveSubtotal + vat),
  };
}

export interface XeroSyncResult {
  /** Synthetic until the live connection lands — never a real Xero id. */
  xeroInvoiceId: string;
  status: 'synced';
  at: ISODate;
}

/**
 * Stand-in for `POST /Invoices`. Accepts any invoice-like record so the
 * estimate preview can share the same simulated outcome.
 */
export function simulateXeroSync(invoice: Pick<Invoice, 'id' | 'number'>): XeroSyncResult {
  const reference = invoice.number.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return {
    xeroInvoiceId: `xero-sim-${reference}-${syntheticToken()}`,
    status: 'synced',
    at: new Date().toISOString(),
  };
}

export interface XeroEstimateDraftOptions {
  issueDate?: ISODate;
  dueDate?: ISODate;
}

/**
 * Monthly-retainer draft built from a 12-month estimate, used by the client
 * Estimate tab while no invoice exists yet. The line mapping (pro-rata monthly
 * share, group account codes, VAT treatment and cent reconciliation) matches
 * the invoice payload so the preview shows the same Xero shape either way.
 */
export function buildXeroEstimateDraftPayload(
  client: Client,
  estimate: Estimate,
  options: XeroEstimateDraftOptions = {}
): XeroDraftInvoicePayload {
  const activeLines = estimate.lines.filter((line) => line.total > 0);

  const lineItems: XeroLineItem[] = activeLines.map((line) => ({
    Description: `Monthly retainer: ${line.label}`,
    Quantity: 1,
    UnitAmount: cents(line.total / 12),
    AccountCode: GROUP_ACCOUNT_CODES[line.group],
    TaxType: line.vatable ? 'OUTPUT2' : 'NONE',
  }));

  // Reconcile rounding pennies to the smoothed monthly retainer.
  const lineSum = lineItems.reduce((sum, line) => sum + line.Quantity * line.UnitAmount, 0);
  const diff = cents(estimate.average - lineSum);
  if (diff !== 0 && lineItems.length > 0) {
    lineItems[0].UnitAmount = cents(lineItems[0].UnitAmount + diff);
  }

  const issueDate = options.issueDate ?? todayInSouthAfrica();
  const dueDate = options.dueDate ?? addDays(issueDate, 30);

  return {
    Invoices: [
      {
        Type: 'ACCREC',
        Status: 'DRAFT',
        LineAmountTypes: 'Exclusive',
        Contact: { Name: client.name },
        LineItems: lineItems,
        Date: issueDate,
        DueDate: dueDate,
        Reference: `Monthly retainer — ${client.code}`,
      },
    ],
  };
}

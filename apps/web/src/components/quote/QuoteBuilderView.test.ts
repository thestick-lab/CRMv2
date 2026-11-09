import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { EstimateInput } from 'fdoncall-practice/domain/estimate';
import { monthlyRetainerHoursFrom, selectionFromServices } from './estimate-form';

const read = (path: string) => fs.readFileSync(path, 'utf8');

describe('Quote builder (design §6.4)', () => {
  it('moves the estimator form into the quote module', () => {
    expect(fs.existsSync('src/components/estimator/EstimateCalculator.tsx')).toBe(false);
    expect(fs.existsSync('src/components/quote/estimate-form.tsx')).toBe(true);
  });

  it('renders the five scope groups from the client prototype', () => {
    const scope = [
      'src/components/quote/estimate-form.tsx',
      'src/components/quote/QuoteScopeStep.tsx',
    ]
      .map(read)
      .join('\n');

    for (const label of [
      'Regular work',
      'Compliance',
      'Annual work',
      'Recharges',
      'Once-off setup',
    ]) {
      expect(scope).toContain(label);
    }
  });

  it('restores the dropped estimator controls on the fee schedule step', () => {
    const schedule = [
      'src/components/quote/QuoteFeeScheduleStep.tsx',
      'src/components/quote/estimate-form.tsx',
    ]
      .map(read)
      .join('\n');

    // Frequency per regular-work line: monthly / with each VAT return / chosen months
    expect(schedule).toContain('Monthly');
    expect(schedule).toContain('With each VAT return');
    expect(schedule).toContain('Chosen months');

    expect(schedule).toContain('Directors');
    expect(schedule).toContain('Provisional taxpayer');
    expect(schedule).toContain('Start month');
    expect(schedule).toContain('IRP6 outcome');
    expect(schedule).toContain('Hourly rate');
    expect(schedule).toContain('March increase');
    expect(schedule).toContain('Reset to pricing bands');
  });

  it('offers both client modes, including the Close corporation entity option', () => {
    const clientStep = [
      'src/components/quote/QuoteClientSelect.tsx',
      'src/components/quote/QuoteBuilderView.tsx',
      'src/components/quote/estimate-form.tsx',
    ]
      .map(read)
      .join('\n');

    expect(clientStep).toContain('Close corporation');
    expect(clientStep).toContain('New prospect');
    expect(clientStep).toContain('savedEstimates');
    expect(clientStep).toContain('defaultServices');
  });

  it('wires every stage action through canTransitionQuote and logs activity', () => {
    const builder = read('src/components/quote/QuoteBuilderView.tsx');

    expect(builder).toContain('canTransitionQuote');
    expect(builder).toContain('logActivity');

    for (const label of [
      'Save Draft',
      'Send Quote',
      'Mark Accepted',
      'Send for Signature',
      'Create Invoice',
      'Download PDF',
      'Download Excel',
    ]) {
      expect(builder).toContain(label);
    }

    expect(builder).toContain('DocumensoDispatchDialog');
    expect(builder).toContain('documensoEnvelopeId');
    expect(builder).toContain('signedBy');
    expect(builder).toContain('signedAt');
  });

  it('renders a live branded document preview with reconciled totals', () => {
    const preview = read('src/components/quote/QuoteDocumentPreview.tsx');

    expect(preview).toContain('Prepared for');
    expect(preview).toContain('Subtotal');
    expect(preview).toContain('VAT 15%');
    expect(preview).toContain('Total');
    expect(preview).toContain('Signature');
    expect(preview).toContain('fd-on-call-logo.png');
    expect(preview).toContain('paymentTerms');
    expect(preview).toContain('estimate, not a fixed fee');
  });

  it('counts the first month of regular work for the retainer allowance', () => {
    const input = {
      startMonth: '2026-12',
      entityType: 'Company',
      yearEndMonth: 2,
      vatCategory: 'B',
      turnover: 4_000_000,
      payroll: true,
      employeeCount: 8,
      provisionalTaxpayer: true,
      directors: 1,
      rate: 625,
      marchIncreasePct: 6,
      irp6Payable: true,
      selected: { BOOKKEEPING: true, PAYROLL: true, MGMT: true },
      hours: { BOOKKEEPING: 4, PAYROLL: 1, MGMT: 2, AFS: 16, REVIEW: 0 },
      schedule: {
        BOOKKEEPING: { when: 'monthly', months: [] },
        PAYROLL: { when: 'custom', months: [12] },
        MGMT: { when: 'custom', months: [1] },
      },
      months: { AFS: 8, REVIEW: 10, ITR: 9, CIPC_AR: 8 },
      recharges: { XERO: 0, SIMPLEPAY: 0 },
    } as unknown as EstimateInput;

    expect(monthlyRetainerHoursFrom(input)).toBe(5);
  });

  it('follows the VAT cycle when regular work runs with each VAT return', () => {
    const input = {
      startMonth: '2027-01',
      entityType: 'Company',
      yearEndMonth: 2,
      vatCategory: 'A',
      payroll: false,
      provisionalTaxpayer: false,
      directors: 0,
      rate: 625,
      marchIncreasePct: 6,
      irp6Payable: false,
      selected: { BOOKKEEPING: true },
      hours: { BOOKKEEPING: 4, PAYROLL: 0, MGMT: 0, AFS: 0, REVIEW: 0 },
      schedule: { BOOKKEEPING: { when: 'vat', months: [] } },
      months: { AFS: 8, REVIEW: 10, ITR: 9, CIPC_AR: 8 },
      recharges: { XERO: 0, SIMPLEPAY: 0 },
    } as unknown as EstimateInput;

    expect(monthlyRetainerHoursFrom(input)).toBe(4);
  });

  it('maps client services back onto estimate ticks for a pre-filled scope', () => {
    expect(
      selectionFromServices(['AFS', 'ITR14', 'VAT201', 'EMP201', 'EMP501', 'CIPC_AR'])
    ).toEqual({
      AFS: true,
      ITR: true,
      VAT201: true,
      EMP201: true,
      EMP501: true,
      CIPC_AR: true,
    });
  });
});

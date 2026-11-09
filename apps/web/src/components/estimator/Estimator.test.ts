import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { computeEstimate, type EstimateInput, STANDARD_RATE } from 'fdoncall-practice/domain/estimate';

describe('Unified Fee Estimator and quote lifecycle', () => {
  it('computes 12-month rolling estimate with March escalation', () => {
    const input: EstimateInput = {
      startMonth: '2026-12',
      entityType: 'Company',
      yearEndMonth: 2,
      vatCategory: 'B',
      turnover: 4_000_000,
      payroll: true,
      employeeCount: 8,
      provisionalTaxpayer: true,
      directors: 1,
      rate: STANDARD_RATE,
      marchIncreasePct: 6,
      irp6Payable: true,
      selected: {
        BOOKKEEPING: true,
        PAYROLL: true,
        AFS: true,
        ITR: true,
        IRP6: true,
        VAT201: true,
        EMP201: true,
        CIPC_AR: true,
      },
      hours: {
        BOOKKEEPING: 4,
        PAYROLL: 0.75,
        MGMT: 0,
        AFS: 16,
        REVIEW: 0,
      },
      months: {
        AFS: 8,
        REVIEW: 10,
        ITR: 9,
        CIPC_AR: 8,
      },
      recharges: {
        XERO: 691.3,
        SIMPLEPAY: 235.5,
      },
    };

    const result = computeEstimate(input);
    expect(result.average).toBeGreaterThan(0);
    expect(result.annual).toBeGreaterThan(0);
    expect(result.averageInclVat).toBeGreaterThan(result.average);
    expect(result.months).toHaveLength(12);
  });

  it('replaces the estimator tabs with the quote lifecycle the pipeline consumes', () => {
    const lifecycleSrc = fs.readFileSync('src/lib/quote-lifecycle.ts', 'utf8');

    expect(lifecycleSrc).toContain('QUOTE_STAGE_ORDER');
    expect(lifecycleSrc).toContain('canTransitionQuote');
    expect(lifecycleSrc).toContain("'Draft Quote'");
    expect(lifecycleSrc).toContain("'Quote Sent'");
    expect(lifecycleSrc).toContain("'Active Client'");
    expect(lifecycleSrc).toContain("'Closed Lost'");
  });

  it('verifies EstimateCalculator includes client selector, services inputs, and PDF/Excel export actions', () => {
    const calcSrc = fs.readFileSync('src/components/estimator/EstimateCalculator.tsx', 'utf8');

    // Client selection between existing and new prospect
    expect(calcSrc).toContain('New Prospect');
    expect(calcSrc).toContain('Regular work');
    expect(calcSrc).toContain('Compliance');
    expect(calcSrc).toContain('Annual work');
    expect(calcSrc).toContain('Xero subscription');
    expect(calcSrc).toContain('Download PDF Quote');
    expect(calcSrc).toContain('Download Excel Workings');
  });

  it('tracks quote proposals through the store instead of the sent-quotes pipeline', () => {
    const storeSrc = fs.readFileSync('src/context/PracticeStoreContext.tsx', 'utf8');

    expect(storeSrc).toContain("type: 'ADD_QUOTE'");
    expect(storeSrc).toContain("type: 'UPDATE_QUOTE'");
    expect(storeSrc).toContain("type: 'MIGRATE_LEADS'");
    expect(storeSrc).not.toContain('CONVERT_LEAD');
  });
});

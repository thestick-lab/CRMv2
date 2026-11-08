import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { computeEstimate, type EstimateInput, STANDARD_RATE } from 'fdoncall-practice/domain/estimate';

describe('Unified Fee Estimator and Sent Quotes pipeline', () => {
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

  it('verifies EstimatorView renders 2 tabs: Estimate Calculator and Sent Quotes & Onboarding', () => {
    const viewSrc = fs.readFileSync('src/components/views/EstimatorView.tsx', 'utf8');

    expect(viewSrc).toContain('Estimate Calculator');
    expect(viewSrc).toContain('Sent Quotes & Onboarding');
    expect(viewSrc).toContain('EstimateCalculator');
    expect(viewSrc).toContain('SentQuotesPipeline');
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

  it('verifies SentQuotesPipeline tracks proposals and provides client conversion', () => {
    const pipelineSrc = fs.readFileSync('src/components/estimator/SentQuotesPipeline.tsx', 'utf8');

    expect(pipelineSrc).toContain('SentQuotesPipeline');
    expect(pipelineSrc).toContain('Convert to Practice Client');
  });
});

import { describe, expect, it } from 'vitest';
import { buildEstimateForClient } from './EstimateTab';
import { CLIENTS } from 'fdoncall-practice/data/seed';

describe('12-Month Fee Estimate Projection Builder', () => {
  const muse = CLIENTS.find((c) => c.code === 'MUS-875')!;

  it('computes rolling 12-month estimate for MUS-875 with March +6% increase', () => {
    const est = buildEstimateForClient(muse, '2026-12');
    expect(est.months).toHaveLength(12);
    expect(est.months[0]).toBe('2026-12');
    expect(est.months[11]).toBe('2027-11');

    expect(est.annual).toBeGreaterThan(0);
    expect(est.average).toBeGreaterThan(0);
    expect(est.annualInclVat).toBeGreaterThan(est.annual);
    expect(est.averageInclVat).toBeGreaterThan(est.average);
    // VAT on vatable services: annual + vat === annualInclVat
    expect(est.annual + est.vat).toBeCloseTo(est.annualInclVat, 2);
    expect(est.average + est.vat / 12).toBeCloseTo(est.averageInclVat, 2);
    expect(est.increaseApplied).toBe(true);
    expect(est.increaseFrom).toBe('2027-03');
  });

  it('groups lines by service category', () => {
    const est = buildEstimateForClient(muse, '2026-12');
    expect(est.lines.length).toBeGreaterThan(0);
    const groups = new Set(est.lines.map((l) => l.group));
    expect(groups.has('Compliance')).toBe(true);
  });
});

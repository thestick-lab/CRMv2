import { describe, expect, test } from 'vitest';
import { cents, computeEstimate, suggestedMonths, type EstimateInput } from '../src/domain/estimate';
import { xeroPlanFee } from '../src/domain/pricing';
import { estimatePdf } from '../src/export/pdf';
import { clientSheet, money } from '../src/export/sheet';
import { estimateXlsx } from '../src/export/xlsx';

const input: EstimateInput = {
  startMonth: '2026-11',
  entityType: 'Company',
  yearEndMonth: 2,
  vatCategory: 'B',
  turnover: 4_000_000,
  payroll: true,
  employeeCount: 8,
  provisionalTaxpayer: false,
  directors: 2,
  rate: 625,
  marchIncreasePct: 0,
  irp6Payable: true,
  selected: { DIR_ITR12: true },
  hours: { BOOKKEEPING: 4, PAYROLL: 0.75, MGMT: 0, AFS: 16, REVIEW: 0 },
  months: suggestedMonths({ entityType: 'Company', yearEndMonth: 2 }),
  recharges: { XERO: xeroPlanFee('Starter'), SIMPLEPAY: 235.5 },
};
const est = computeEstimate(input);
const opts = { clientName: 'Nova / Engineering (Pty) Ltd', asOf: '2026-10-29', vatCategory: 'B', marchIncreasePct: 0 };

describe('client copy of the estimate (Estimation layout)', () => {
  for (const mode of ['incl', 'excl'] as const) {
    test(`subtotals and the total agree, VAT ${mode}`, () => {
      const sheet = clientSheet(est, { ...opts, mode });
      const lines = sheet.rows.filter((r) => r.kind === 'L');
      const subs = sheet.rows.filter((r) => r.kind === 'S');
      const total = sheet.rows.find((r) => r.kind === 'T')!;
      for (let k = 0; k < 12; k++) {
        expect(cents(lines.reduce((a, r) => a + r.amounts![k], 0))).toBe(total.amounts![k]);
        expect(cents(subs.reduce((a, r) => a + r.amounts![k], 0))).toBe(total.amounts![k]);
      }
      expect(total.total).toBe(mode === 'incl' ? est.annualInclVat : est.annual);
      const annual = sheet.rows.filter((r) => r.kind === 'K' || r.kind === 'KT').map((r) => r.total);
      expect(annual).toEqual([est.annual, est.vat, est.annualInclVat]);
      expect(sheet.amountsLabel).toBe(`Amounts in Rand, VAT ${mode === 'incl' ? 'inclusive' : 'exclusive'}`);
    });
  }
  test('labels, notes and a safe file name', () => {
    const sheet = clientSheet(est, { ...opts, mode: 'incl' });
    expect(sheet.periodLabel).toBe('Estimate period: November 2026 – October 2027');
    expect(sheet.dateLabel).toBe('Date: 29 October 2026');
    expect(sheet.rows.some((r) => r.label === 'Xero subscription, Starter plan')).toBe(true);
    expect(sheet.rows.some((r) => r.label === "Directors' income tax returns (ITR12), 2 directors")).toBe(true);
    expect(sheet.notes[0]).toContain('except the CIPC fee');
    expect(sheet.fileName).toBe('Fee estimate - Nova Engineering (Pty) Ltd - Nov 2026 (VAT incl)');
    expect(money(0)).toBe('-');
    expect(money(12190)).toBe('12,190.00');
  });
  test('Excel and PDF files are produced', async () => {
    const sheet = clientSheet(est, { ...opts, mode: 'excl' });
    const xlsx = estimateXlsx(sheet);
    expect(String.fromCharCode(xlsx[0], xlsx[1])).toBe('PK');
    const pdf = await estimatePdf(sheet);
    expect(new TextDecoder().decode(pdf.slice(0, 5))).toBe('%PDF-');
  });
});

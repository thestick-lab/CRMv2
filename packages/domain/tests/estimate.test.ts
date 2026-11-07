import { describe, expect, test } from 'vitest';
import { bandHours, cents, computeEstimate, servicesFromEstimate, suggestedMonths, withVat, type EstimateInput } from '../src/domain/estimate';
import { XERO_PLANS, payrollBand, turnoverBand, xeroPlanFee } from '../src/domain/pricing';
import { generateTasks } from '../src/domain/rules';
import { CLIENTS } from '../src/data/seed';

const base: EstimateInput = {
  startMonth: '2026-11',
  entityType: 'Company',
  yearEndMonth: 2,
  vatCategory: 'B',
  turnover: 4_000_000,
  payroll: true,
  employeeCount: 12,
  provisionalTaxpayer: false,
  directors: 0,
  rate: 625,
  marchIncreasePct: 0,
  irp6Payable: true,
  selected: {},
  hours: { BOOKKEEPING: 4, PAYROLL: 1, MGMT: 0, AFS: 16, REVIEW: 0 },
  months: { AFS: 5, REVIEW: 6, ITR: 6, CIPC_AR: 8 },
  recharges: { XERO: 0, SIMPLEPAY: 0 },
};
type E = ReturnType<typeof computeEstimate>;
const line = (e: E, key: string) => e.lines.find((l) => l.key === key)!;

describe('pricing schedule bands', () => {
  test('turnover bands', () => {
    expect(turnoverBand(1_000_000)?.cipcFee).toBe(100);
    expect(turnoverBand(1_000_001)?.cipcFee).toBe(450);
    expect(turnoverBand(18_000_000)?.cipcFee).toBe(2000);
    expect(turnoverBand(40_000_000)?.cipcFee).toBe(3000);
    expect(turnoverBand(undefined)).toBeUndefined();
  });
  test('payroll bands, with more than 50 employees flagged', () => {
    expect(payrollBand(5).band.simplePayFee).toBe(167.5);
    expect(payrollBand(6).band.payrollHours).toBe(0.75);
    expect(payrollBand(60).overLimit).toBe(true);
  });
  test('default hours follow the bands', () => {
    expect(bandHours(4_000_000, 12)).toEqual({ BOOKKEEPING: 4, AFS: 16, REVIEW: 4, PAYROLL: 1 });
    expect(bandHours(30_000_000, 3)).toEqual({ BOOKKEEPING: 12, AFS: 28, REVIEW: 12, PAYROLL: 0.5 });
  });
  test('default months: AFS at the Companies Act deadline, six months after year end; ITR14 the month after', () => {
    expect(suggestedMonths({ entityType: 'Company', yearEndMonth: 2 })).toEqual({ AFS: 8, REVIEW: 8, ITR: 9, CIPC_AR: 8 });
    expect(suggestedMonths({ entityType: 'Company', yearEndMonth: 5 }).AFS).toBe(11);
    expect(suggestedMonths({ entityType: 'Individual', yearEndMonth: 2 }).ITR).toBe(10);
    expect(suggestedMonths({ entityType: 'Company', yearEndMonth: 12, incorporationDate: '2019-04-15' }).CIPC_AR).toBe(4);
  });
});

describe('fee estimate', () => {
  const e = computeEstimate(base);
  test('twelve months from the start month', () => {
    expect(e.months[0]).toBe('2026-11');
    expect(e.months[11]).toBe('2027-10');
  });
  test('VAT category B: six returns, in the months they are due', () => {
    const vat = line(e, 'VAT201');
    expect(vat.amounts[0]).toBe(545);
    expect(vat.amounts[1]).toBe(0);
    expect(vat.total).toBe(6 * 545);
  });
  test('EMP201 monthly; EMP501 medium tier in May and October; COIDA in May', () => {
    expect(line(e, 'EMP201').total).toBe(12 * 495);
    const emp501 = line(e, 'EMP501');
    expect(emp501.amounts[6]).toBe(2500);
    expect(emp501.amounts[11]).toBe(2500);
    expect(line(e, 'COIDA').amounts[6]).toBe(545);
  });
  test('IRP6 in February and August for a February year end', () => {
    const irp6 = line(e, 'IRP6');
    expect(irp6.amounts[3]).toBe(650);
    expect(irp6.amounts[9]).toBe(650);
  });
  test('annual return: our fee plus the CIPC fee for the turnover band, no VAT on the CIPC fee', () => {
    expect(line(e, 'CIPC_AR').amounts[9]).toBe(525);
    const fee = line(e, 'CIPC_FEE');
    expect(fee.amounts[9]).toBe(450);
    expect(fee.vatable).toBe(false);
  });
  test('VAT on everything except the CIPC fee, including subscriptions', () => {
    const withSubs = computeEstimate({ ...base, recharges: { XERO: 450, SIMPLEPAY: 345.5 } });
    expect(line(withSubs, 'XERO').vatable).toBe(true);
    expect(line(withSubs, 'SIMPLEPAY').vatable).toBe(true);
    expect(line(withSubs, 'CIPC_FEE').vatable).toBe(false);
    const cipc = line(withSubs, 'CIPC_FEE').total;
    expect(withSubs.vat).toBeCloseTo((withSubs.annual - cipc) * 0.15, 0); // VAT rounded per month
  });
  test('Xero list prices include VAT: the estimate uses the amount excluding VAT', () => {
    expect(XERO_PLANS.map((p) => p.fee)).toEqual([391.3, 691.3, 952.17]);
    for (const p of XERO_PLANS) expect(withVat(p.fee)).toBe(p.inclVat);
    const x = computeEstimate({ ...base, recharges: { XERO: xeroPlanFee('Starter'), SIMPLEPAY: 0 } });
    expect(line(x, 'XERO').amounts[0]).toBe(391.3);
    expect(line(x, 'XERO').amountsInclVat[0]).toBe(450);
    expect(line(x, 'XERO').note).toBe('Starter plan');
  });
  test('VAT-inclusive lines add up to the VAT-inclusive totals, to the cent', () => {
    const x = computeEstimate({ ...base, directors: 2, selected: { DIR_ITR12: true }, recharges: { XERO: xeroPlanFee('Standard'), SIMPLEPAY: 345.5 } });
    for (let k = 0; k < 12; k++) {
      expect(cents(x.lines.reduce((a, l) => a + l.amountsInclVat[k], 0))).toBe(x.totalsInclVat[k]);
      expect(cents(x.totals[k] + x.vatByMonth[k])).toBe(x.totalsInclVat[k]);
    }
    expect(cents(x.annual + x.vat)).toBe(x.annualInclVat);
    expect(line(x, 'CIPC_FEE').amountsInclVat[9]).toBe(450); // no VAT on the CIPC fee
  });
  test('no turnover: warn and leave out the CIPC fee', () => {
    const nt = computeEstimate({ ...base, turnover: undefined });
    expect(nt.lines.find((l) => l.key === 'CIPC_FEE')).toBeUndefined();
    expect(nt.warnings[0]).toContain('turnover');
  });
  test("directors' ITR12 in October and IRP6 in February and August", () => {
    const d = computeEstimate({ ...base, directors: 2, selected: { DIR_ITR12: true, DIR_IRP6: true } });
    expect(line(d, 'DIR_ITR12').amounts[11]).toBe(2 * 1050);
    expect(line(d, 'DIR_IRP6').amounts[3]).toBe(2 * 650);
    expect(line(d, 'DIR_IRP6').amounts[9]).toBe(2 * 650);
  });
  test('March increase applies to fees from March 2027, not to recharges', () => {
    const up = computeEstimate({ ...base, marchIncreasePct: 10, recharges: { XERO: 450, SIMPLEPAY: 0 } });
    expect(line(up, 'BOOKKEEPING').amounts[0]).toBe(2500);
    expect(line(up, 'BOOKKEEPING').amounts[4]).toBe(2750);
    expect(line(up, 'XERO').amounts[4]).toBe(450);
    expect(line(up, 'CIPC_FEE').amounts[9]).toBe(450);
  });
  test('accounting linked to the VAT return: only in the VAT months', () => {
    const own = computeEstimate({ ...base, schedule: { BOOKKEEPING: { when: 'vat', months: [] } } });
    const bk = line(own, 'BOOKKEEPING');
    expect(bk.amounts.map((a) => a > 0)).toEqual(line(own, 'VAT201').amounts.map((a) => a > 0));
    expect(bk.total).toBe(6 * 4 * 625);
  });
  test('VAT-linked accounting still follows the VAT cycle when we do not file the VAT', () => {
    const own = computeEstimate({ ...base, selected: { VAT201: false }, schedule: { BOOKKEEPING: { when: 'vat', months: [] } } });
    expect(own.lines.find((l) => l.key === 'VAT201')).toBeUndefined();
    expect(line(own, 'BOOKKEEPING').amounts.filter((a) => a > 0).length).toBe(6);
  });
  test('work in chosen months', () => {
    const q = computeEstimate({ ...base, schedule: { MGMT: { when: 'custom', months: [3, 6, 9, 12] } }, hours: { ...base.hours, MGMT: 5 }, selected: { MGMT: true } });
    expect(line(q, 'MGMT').amounts.filter((a) => a > 0).length).toBe(4);
    expect(line(q, 'MGMT').amounts[1]).toBe(5 * 625);
  });
  test('services handed to the compliance calendar', () => {
    expect(servicesFromEstimate(base)).toEqual(['AFS', 'ITR14', 'IRP6', 'VAT201', 'EMP201', 'EMP501', 'CIPC_AR']);
  });
});

describe('VAT categories D, E and F', () => {
  const c = { ...CLIENTS.find((x) => x.code === 'MUS-875')! };
  const vat = (cat: 'D' | 'E' | 'F', ye = 2) =>
    generateTasks({ ...c, vatCategory: cat, yearEndMonth: ye }, ['VAT201'], '2026-10-28').map((t) => `${t.period} ${t.due}`);
  test('D: six-monthly, periods ending February and August', () => {
    expect(vat('D')).toEqual(['Sep 2026–Feb 2027 2027-03-31', 'Mar–Aug 2027 2027-09-30']);
  });
  test('F: four-monthly, ending February, June and October', () => {
    expect(vat('F')[0]).toBe('Jul–Oct 2026 2026-11-30');
  });
  test('E: annual, at the financial year end', () => {
    expect(vat('E', 6)).toEqual(['Jul 2026–Jun 2027 2027-07-30']);
  });
});

describe('annual return uses the turnover on the profile', () => {
  test('fee and turnover shown on the task', () => {
    const c = { ...CLIENTS.find((x) => x.code === 'ALC-610')!, turnover: 2_400_000, turnoverYear: 2026, turnoverSource: 'AFS' as const };
    const t = generateTasks(c, ['CIPC_AR'], '2026-10-28')[0];
    expect(t.feeLabel).toBe('R525 + R450 CIPC fee');
    expect(t.info).toBe('Turnover R2,400,000, FY 2026, from AFS');
  });
  test('missing turnover is flagged', () => {
    const t = generateTasks(CLIENTS.find((x) => x.code === 'ALC-610')!, ['CIPC_AR'], '2026-10-28')[0];
    expect(t.missing).toBe('Turnover not recorded');
  });
});

import { describe, expect, test } from 'vitest';
import { addBusinessDays, businessDayOnOrBefore, easterSunday, lastBusinessDayOfMonth, publicHolidays } from '../src/domain/dates';
import { defaultServices, generateTasks, urgency } from '../src/domain/rules';
import { CLIENTS, STAFF } from '../src/data/seed';
import type { Client } from '../src/domain/types';

const AS_OF = '2026-10-28';
const client = (code: string): Client => {
  const c = CLIENTS.find((x) => x.code === code);
  if (!c) throw new Error(code);
  return c;
};
const tasksFor = (c: Client) => generateTasks(c, defaultServices(c), AS_OF);
const find = (c: Client, service: string, period: string, part?: string) =>
  tasksFor(c).find((t) => t.service === service && t.period === period && (part === undefined || t.part === part));

describe('South African business days', () => {
  test('Easter-based holidays', () => {
    expect(easterSunday(2026)).toBe('2026-04-05');
    expect(easterSunday(2027)).toBe('2027-03-28');
    const h = publicHolidays(2026);
    expect(h.get('2026-04-03')).toBe('Good Friday');
    expect(h.get('2026-04-06')).toBe('Family Day');
  });
  test('Sunday holidays move to Monday', () => {
    // Youth Day 16 June 2024 was a Sunday
    expect(publicHolidays(2024).get('2024-06-17')).toBe('Youth Day (observed)');
    // Christmas 2022 on Sunday: Monday is already Day of Goodwill, so Tuesday 27th
    expect(publicHolidays(2022).get('2022-12-27')).toBe('Christmas Day (observed)');
  });
  test('deadlines on weekends move to the business day before', () => {
    expect(businessDayOnOrBefore('2026-10-31')).toBe('2026-10-30');
    expect(lastBusinessDayOfMonth(2027, 2)).toBe('2027-02-26');
    // Day of Reconciliation is a Wednesday in 2026
    expect(businessDayOnOrBefore('2026-12-16')).toBe('2026-12-15');
  });
  test('business days skip weekends and holidays', () => {
    expect(addBusinessDays('2026-12-24', 1)).toBe('2026-12-28');
  });
});

describe('deadline rules for the dummy clients (as at 28 Oct 2026)', () => {
  test('VAT category A: Aug–Sep period due on the last business day of October', () => {
    const t = find(client('ALL-362'), 'VAT201', 'Aug–Sep 2026');
    expect(t?.due).toBe('2026-10-30');
  });
  test('VAT category B: Sep–Oct period due 30 November', () => {
    expect(find(client('MUS-875'), 'VAT201', 'Sep–Oct 2026')?.due).toBe('2026-11-30');
  });
  test('VAT category C: monthly', () => {
    expect(find(client('AXE-460'), 'VAT201', 'Oct 2026')?.due).toBe('2026-11-30');
    expect(find(client('AXE-460'), 'VAT201', 'Sep 2026')?.due).toBe('2026-10-30');
  });
  test('EMP201 due on the 7th, or the business day before', () => {
    expect(find(client('AXE-460'), 'EMP201', 'Oct 2026')?.due).toBe('2026-11-06');
    expect(find(client('AXE-460'), 'EMP201', 'Nov 2026')?.due).toBe('2026-12-07');
  });
  test('EMP501 interim due 30 October 2026 (31st is a Saturday)', () => {
    expect(find(client('TOP-435'), 'EMP501', '2027 tax year (Mar–Aug 2026)', 'Interim')?.due).toBe('2026-10-30');
    expect(find(client('TOP-435'), 'EMP501', '2027 tax year (Mar 2026–Feb 2027)', 'Annual')?.due).toBe('2027-05-31');
  });
  test('IRP6 for a February year end company', () => {
    expect(find(client('ALC-610'), 'IRP6', 'FY Feb 2027', '2nd payment')?.due).toBe('2027-02-26');
    expect(find(client('ALC-610'), 'IRP6', 'FY Feb 2028', '1st payment')?.due).toBe('2027-08-31');
  });
  test('IRP6 for a May year end: 1st payment end November', () => {
    expect(find(client('BLA-465'), 'IRP6', 'FY May 2027', '1st payment')?.due).toBe('2026-11-30');
  });
  test('Companies Act AFS deadline six months after year end', () => {
    const t = find(client('KHE-615'), 'AFS', 'FY Feb 2026');
    expect(t?.due).toBe('2026-08-31');
    expect(urgency(t!, 'Not started', AS_OF)).toBe('overdue');
    expect(find(client('BLA-465'), 'AFS', 'FY May 2026')?.due).toBe('2026-11-30');
    expect(find(client('TOP-435'), 'AFS', 'FY Dec 2026')?.due).toBe('2027-06-30');
  });
  test('ITR14 due 12 months after year end', () => {
    expect(find(client('LES-841'), 'ITR14', 'FY Feb 2026')?.due).toBe('2027-02-26');
    expect(find(client('BLA-465'), 'ITR14', 'FY May 2026')?.due).toBe('2027-05-31');
  });
  test('Tax done elsewhere: no ITR14 or IRP6, AFS still ours and two years behind', () => {
    const c = client('CLU-614');
    const services = defaultServices(c);
    expect(services).not.toContain('ITR14');
    expect(services).not.toContain('IRP6');
    const afs = tasksFor(c).filter((t) => t.service === 'AFS').map((t) => t.period);
    expect(afs).toEqual(['FY Feb 2025', 'FY Feb 2026', 'FY Feb 2027']);
  });
  test('ITR12: non-provisional 2026 return overdue since 23 October; provisional due 22 January', () => {
    const c = client('BEN-585');
    const t = find(c, 'ITR12', '2026 tax year');
    expect(t?.due).toBe('2026-10-23');
    expect(urgency(t!, 'Not started', AS_OF)).toBe('overdue');
    const prov = { ...c, provisionalTaxpayer: true };
    expect(generateTasks(prov, defaultServices(prov), AS_OF).find((x) => x.service === 'ITR12' && x.period === '2026 tax year')?.due).toBe('2027-01-22');
  });
  test('ITR12T for a trust behind on 2026', () => {
    expect(find(client('THE-153'), 'ITR12T', '2026 tax year')?.due).toBe('2027-01-22');
  });
  test('Annual return without incorporation date asks for it; a missed year is flagged late', () => {
    const tasks = tasksFor(client('BLA-465')).filter((t) => t.service === 'CIPC_AR');
    expect(tasks.map((t) => t.period)).toEqual(['2025 annual return', '2026 annual return']);
    expect(tasks[0].likelyLate).toBe(true);
    expect(tasks[1].due).toBeUndefined();
  });
  test('Annual return with an incorporation date: 30 business days after the anniversary', () => {
    const c = { ...client('ALC-610'), incorporationDate: '2015-03-10' };
    const t = generateTasks(c, ['CIPC_AR'], AS_OF).find((x) => x.period === '2026 annual return');
    // 10 Mar 2026 + 30 business days, skipping Good Friday and Family Day
    expect(t?.due).toBe('2026-04-23');
  });
  test('VAT switched on from a registration date: no returns for periods ending before it', () => {
    const c = { ...client('ALC-610'), vatCategory: 'B' as const, vatRegisteredOn: '2026-12-01' };
    const periods = generateTasks(c, ['VAT201'], AS_OF).map((t) => t.period);
    expect(periods[0]).toBe('Nov–Dec 2026');
    expect(periods).not.toContain('Sep–Oct 2026');
  });
  test('Payroll switched on from a start date: EMP201 from that month, interim EMP501 skipped if it started after August', () => {
    const c = { ...client('ALC-610'), payroll: true, payrollFrom: '2026-11-15' };
    const tasks = generateTasks(c, ['EMP201', 'EMP501'], AS_OF);
    expect(tasks.find((t) => t.service === 'EMP201')?.period).toBe('Nov 2026');
    const emp501 = tasks.filter((t) => t.service === 'EMP501').map((t) => t.part);
    expect(emp501).toEqual(['Annual']);
  });
  test('Subcontractor clients assign the work to the subcontractor', () => {
    expect(tasksFor(client('KHE-615')).every((t) => t.assigneeId === 'hannes')).toBe(true);
    expect(tasksFor(client('TOP-435')).every((t) => t.assigneeId === 'caroline')).toBe(true);
  });
  test('The team: seven staff and two subcontractors', () => {
    expect(STAFF.filter((s) => s.kind === 'employee').map((s) => s.name)).toEqual(['André', 'Erik', 'Lungani', 'Mia', 'Nikita', 'Willem', 'Wouter']);
    expect(STAFF.filter((s) => s.kind === 'subcontractor').map((s) => s.name)).toEqual(['Hannes', 'Caroline']);
    expect(CLIENTS.every((c) => STAFF.find((s) => s.id === c.staffId)?.kind === 'employee')).toBe(true);
  });
});

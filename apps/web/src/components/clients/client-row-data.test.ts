import { describe, expect, it } from 'vitest';
import { enrichClientRows } from './client-row-data';
import { CLIENTS } from 'fdoncall-practice/data/seed';

describe('client-row-data enrichment', () => {
  const asOf = '2026-11-07';
  const rows = enrichClientRows(CLIENTS, asOf);

  it('enriches all 13 seeded practice clients', () => {
    expect(rows).toHaveLength(13);
  });

  it('correctly maps ALC-610 statutory fields', () => {
    const alc = rows.find((r) => r.code === 'ALC-610');
    expect(alc).toBeDefined();
    expect(alc?.name).toBe('A & L Contracting');
    expect(alc?.entityType).toBe('Company');
    expect(alc?.staffName).toBe('Erik');
    expect(alc?.yearEndLabel).toBe('Feb*');
    expect(alc?.vatLabel).toBe('—');
    expect(alc?.services).toContain('ITR14');
    expect(alc?.services).toContain('IRP6');
  });

  it('correctly flags assumed year-ends with an asterisk', () => {
    const assumed = rows.filter((r) => r.yearEndAssumed);
    expect(assumed.length).toBeGreaterThan(0);
    for (const client of assumed) {
      expect(client.yearEndLabel).toMatch(/\*$/);
    }
  });

  it('computes next statutory filing deadline for active clients', () => {
    const axe = rows.find((r) => r.code === 'AXE-460');
    expect(axe?.nextDeadline).toBeDefined();
    expect(axe?.nextDeadline?.due).toBeDefined();
    expect(axe?.nextDeadline?.service).toBeDefined();
  });

  it('includes subcontractor name in responsible staff when assigned', () => {
    const les = rows.find((r) => r.code === 'LES-841');
    expect(les?.staffName).toBe('Erik with Caroline');

    const khe = rows.find((r) => r.code === 'KHE-615');
    expect(khe?.staffName).toBe('Erik with Hannes');
  });

  it('renders "Yes" for payroll when employeeCount is not recorded', () => {
    const axe = rows.find((r) => r.code === 'AXE-460');
    expect(axe?.payrollLabel).toBe('Yes');
  });

  it('includes urgency on the next statutory deadline', () => {
    const axe = rows.find((r) => r.code === 'AXE-460');
    expect(axe?.nextDeadline?.urgency).toBeDefined();
  });
});

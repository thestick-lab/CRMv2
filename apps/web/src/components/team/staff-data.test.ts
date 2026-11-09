import { describe, expect, it } from 'vitest';
import { STAFF } from 'fdoncall-practice/data/seed';
import type { PracticeUser } from '@/context/PracticeStoreContext';
import { buildStaffUsers, filterStaffRows, staffRows } from './staff-data';

const PARTNER: PracticeUser = {
  id: 'erik',
  name: 'Erik',
  role: 'Partner',
  email: 'erik@fdoncall.co.za',
  kind: 'employee',
};

const USERS = buildStaffUsers(STAFF, PARTNER, 625);

describe('staffRows', () => {
  it('lists only practice staff — never client directors', () => {
    const rows = staffRows(STAFF, USERS);

    expect(rows).toHaveLength(STAFF.length);
    expect(rows.map((r) => r.id).sort()).toEqual(STAFF.map((s) => s.id).sort());
    for (const director of [
      'Marthinus De Villiers',
      'Albert Coetzee',
      'Herman Bester',
      'Willem Grobbelaar',
    ]) {
      expect(rows.some((r) => r.name === director)).toBe(false);
    }
  });

  it('shows a subcontractor hourly rate and leaves employees rate-less', () => {
    const rows = staffRows(STAFF, USERS);
    const hannes = rows.find((r) => r.id === 'hannes');
    const mia = rows.find((r) => r.id === 'mia');

    expect(hannes?.contractType).toBe('subcontractor');
    expect(hannes?.hourlyRate).toBe(625);
    expect(mia?.contractType).toBe('employee');
    expect(mia?.hourlyRate).toBeUndefined();
  });

  it('joins contact details and contract terms from the staff user records', () => {
    const users: PracticeUser[] = [
      {
        ...PARTNER,
        id: 'mia',
        name: 'Mia',
        email: 'mia@fdoncall.co.za',
        contract: {
          contractType: 'employee',
          startDate: '2024-03-01',
          phone: '+27 21 975 1004',
        },
      },
    ];
    const rows = staffRows(
      STAFF.filter((s) => s.id === 'mia'),
      users
    );

    expect(rows[0]).toMatchObject({
      id: 'mia',
      name: 'Mia',
      email: 'mia@fdoncall.co.za',
      phone: '+27 21 975 1004',
      startDate: '2024-03-01',
      contractType: 'employee',
      kind: 'employee',
    });
    expect(rows[0].hourlyRate).toBeUndefined();
  });

  it('derives the contract type from employment kind when a user has no contract', () => {
    const rows = staffRows(
      STAFF.filter((s) => s.id === 'caroline'),
      [{ ...PARTNER, id: 'caroline', name: 'Caroline', kind: 'subcontractor' }]
    );

    expect(rows[0].contractType).toBe('subcontractor');
  });
});

describe('filterStaffRows', () => {
  it('matches on name, role and email', () => {
    const rows = staffRows(STAFF, USERS);

    expect(filterStaffRows(rows, 'hannes').map((r) => r.id)).toEqual(['hannes']);
    expect(filterStaffRows(rows, 'partner').map((r) => r.role)).toEqual(['Partner', 'Partner']);
    expect(filterStaffRows(rows, 'mia@fdoncall').map((r) => r.id)).toEqual(['mia']);
    expect(filterStaffRows(rows, '   ')).toHaveLength(rows.length);
  });
});

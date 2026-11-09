import { describe, expect, it } from 'vitest';
import { STAFF } from 'fdoncall-practice/data/seed';
import {
  getInitialPracticeState,
  loadPracticeState,
  practiceReducer,
  type PracticeUser,
} from '@/context/PracticeStoreContext';
import {
  buildStaffUsers,
  filterStaffRows,
  staffProfileOf,
  staffRows,
} from './staff-data';

const PARTNER: PracticeUser = {
  id: 'erik',
  name: 'Erik',
  role: 'Partner',
  email: 'erik@fdoncall.co.za',
  kind: 'employee',
};

const USERS = buildStaffUsers(STAFF, PARTNER);

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

  it('never invents a subcontractor rate — it shows only when recorded', () => {
    const rows = staffRows(STAFF, buildStaffUsers(STAFF, PARTNER));
    const hannes = rows.find((r) => r.id === 'hannes');
    const mia = rows.find((r) => r.id === 'mia');

    expect(hannes?.contractType).toBe('subcontractor');
    expect(hannes?.hourlyRate).toBeUndefined();
    expect(mia?.contractType).toBe('employee');
    expect(mia?.hourlyRate).toBeUndefined();

    const withRate = staffRows(
      STAFF,
      buildStaffUsers(STAFF, PARTNER, { hannes: { contractType: 'subcontractor', hourlyRate: 780 } })
    ).find((r) => r.id === 'hannes');
    expect(withRate?.hourlyRate).toBe(780);
  });

  it('carries recorded internal notes onto the row', () => {
    const rows = staffRows(
      STAFF,
      buildStaffUsers(STAFF, PARTNER, {
        mia: { contractType: 'employee', notes: 'Handles the Durbanville portfolio.' },
      })
    );
    expect(rows.find((r) => r.id === 'mia')?.notes).toBe('Handles the Durbanville portfolio.');
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

describe('contract type is the record', () => {
  it('prefers the saved contract type over the derived employment kind', () => {
    const users = buildStaffUsers(STAFF, PARTNER, { hannes: { contractType: 'employee' } });
    const hannesUser = users.find((user) => user.id === 'hannes')!;
    expect(hannesUser.contract?.contractType).toBe('employee');
    expect(hannesUser.kind).toBe('employee');

    const row = staffRows(STAFF, users).find((entry) => entry.id === 'hannes')!;
    expect(row.contractType).toBe('employee');
    expect(row.kind).toBe('employee');

    const profile = staffProfileOf('hannes', 'subcontractor', {
      hannes: { contractType: 'employee' },
    });
    expect(profile.contractType).toBe('employee');
  });

  it('agrees between the register and the profile dialog', () => {
    const profiles = { mia: { contractType: 'subcontractor' as const, hourlyRate: 900 } };
    const users = buildStaffUsers(STAFF, PARTNER, profiles);
    const row = staffRows(STAFF, users).find((entry) => entry.id === 'mia')!;
    const dialog = staffProfileOf('mia', 'employee', profiles);

    expect(row.contractType).toBe(dialog.contractType);
    expect(row.kind).toBe(dialog.contractType);
    expect(row.hourlyRate).toBe(900);
  });

  it('survives a save → reload round-trip', () => {
    const saved = practiceReducer(getInitialPracticeState(), {
      type: 'UPDATE_STAFF_PROFILE',
      payload: {
        staffId: 'mia',
        patch: { contractType: 'subcontractor', hourlyRate: 900 },
      },
    });

    const reloaded = loadPracticeState({ getItem: () => JSON.stringify(saved) });
    const row = staffRows(
      reloaded.staff,
      buildStaffUsers(reloaded.staff, reloaded.currentUser, reloaded.staffProfiles)
    ).find((entry) => entry.id === 'mia')!;
    const dialog = staffProfileOf(
      'mia',
      reloaded.staff.find((member) => member.id === 'mia')!.kind,
      reloaded.staffProfiles
    );

    expect(row.contractType).toBe('subcontractor');
    expect(row.kind).toBe('subcontractor');
    expect(row.hourlyRate).toBe(900);
    expect(dialog.contractType).toBe('subcontractor');
  });
});

import { describe, expect, it } from 'vitest';
import { CLIENTS, STAFF } from 'fdoncall-practice/data/seed';
import {
  buildPeopleProfiles,
  filterPeople,
} from './people-data';

describe('People & Directors relational directory data engine', () => {
  it('builds 18 normalized profiles with 9 practice staff and 9 client directors', () => {
    const people = buildPeopleProfiles(STAFF, CLIENTS);
    expect(people).toHaveLength(18);

    const staffMembers = people.filter((p) => p.isPracticeStaff);
    expect(staffMembers).toHaveLength(9);

    const directors = people.filter((p) => !p.isPracticeStaff);
    expect(directors).toHaveLength(9);
  });

  it('links directors to practice client companies', () => {
    const people = buildPeopleProfiles(STAFF, CLIENTS);
    const marthinus = people.find((p) => p.name === 'Marthinus De Villiers');

    expect(marthinus).toBeDefined();
    expect(marthinus?.companyLinks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          clientCode: 'MUS-875',
          clientName: 'Muse 1399',
          title: 'Director',
        }),
      ])
    );
  });

  it('links staff members to their assigned practice clients', () => {
    const people = buildPeopleProfiles(STAFF, CLIENTS);
    const erik = people.find((p) => p.name === 'Erik');

    expect(erik).toBeDefined();
    expect(erik?.isPracticeStaff).toBe(true);
    expect(erik?.practiceRole).toBe('Partner');
    expect(erik?.companyLinks.length).toBeGreaterThan(0);
    expect(erik?.companyLinks.some((l) => l.clientCode === 'ALC-610')).toBe(true);
  });

  it('filters people by category tab (all, staff, directors)', () => {
    const people = buildPeopleProfiles(STAFF, CLIENTS);

    const all = filterPeople(people, 'all', '');
    expect(all).toHaveLength(18);

    const staffOnly = filterPeople(people, 'staff', '');
    expect(staffOnly).toHaveLength(9);
    expect(staffOnly.every((p) => p.isPracticeStaff)).toBe(true);

    const directorsOnly = filterPeople(people, 'directors', '');
    expect(directorsOnly).toHaveLength(9);
    expect(directorsOnly.every((p) => !p.isPracticeStaff)).toBe(true);
  });

  it('filters people by search term across name, role, email, phone, and company code', () => {
    const people = buildPeopleProfiles(STAFF, CLIENTS);

    // Search by name
    const byName = filterPeople(people, 'all', 'Marthinus');
    expect(byName).toHaveLength(1);
    expect(byName[0].name).toBe('Marthinus De Villiers');

    // Search by client code
    const byCode = filterPeople(people, 'all', 'MUS-875');
    expect(byCode.length).toBeGreaterThanOrEqual(1);
    expect(byCode.some((p) => p.name === 'Marthinus De Villiers')).toBe(true);

    // Search by email domain
    const byEmail = filterPeople(people, 'all', '@fdoncall.co.za');
    expect(byEmail.length).toBe(9);
  });
});

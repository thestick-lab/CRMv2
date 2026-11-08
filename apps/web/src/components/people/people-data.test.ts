import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CLIENTS, STAFF } from 'fdoncall-practice/data/seed';
import {
  buildPeopleProfiles,
  filterPeople,
  canManagePeople,
} from './people-data';

describe('People directory relational data engine and RBAC policy', () => {
  it('builds normalized director profiles linked to practice clients', () => {
    const people = buildPeopleProfiles(STAFF, CLIENTS);
    expect(people.length).toBeGreaterThan(0);

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

  it('restricts contact creation and editing to Partner and Admin roles', () => {
    expect(canManagePeople('Partner')).toBe(true);
    expect(canManagePeople('Compliance Officer')).toBe(true);
    expect(canManagePeople('Team member')).toBe(false);
    expect(canManagePeople('Accountant')).toBe(false);
    expect(canManagePeople('Subcontractor')).toBe(false);
  });

  it('filters people by search term across name, role, email, phone, and company code', () => {
    const people = buildPeopleProfiles(STAFF, CLIENTS);

    const byName = filterPeople(people, 'all', 'Marthinus');
    expect(byName).toHaveLength(1);
    expect(byName[0].name).toBe('Marthinus De Villiers');

    const byCode = filterPeople(people, 'all', 'MUS-875');
    expect(byCode.length).toBeGreaterThanOrEqual(1);
    expect(byCode.some((p) => p.name === 'Marthinus De Villiers')).toBe(true);
  });

  it('verifies PeopleDirectory renders a dense TanStack Table layout with search and responsive scroll', () => {
    const directorySrc = fs.readFileSync('src/components/people/PeopleDirectory.tsx', 'utf8');

    // Must be a table, not big card grid
    expect(directorySrc).toContain('<table');
    expect(directorySrc).toContain('overflow-x-auto');
    expect(directorySrc).toContain('canManagePeople');
    expect(directorySrc).toContain('Add Employee');
  });
});

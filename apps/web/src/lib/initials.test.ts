import { describe, expect, it } from 'vitest';
import { entityInitials, personInitials } from './initials';

describe('personInitials', () => {
  it('shortens a single-word name to its first two letters', () => {
    // Every seeded staff member is single-word, and `ER` is what the topbar,
    // deadline cards and team register have always shown for Erik.
    expect(personInitials('Erik')).toBe('ER');
    expect(personInitials('Lungani')).toBe('LU');
  });

  it('takes the first letter of up to two words for a full name', () => {
    expect(personInitials('Erik van Wyk')).toBe('EV');
    expect(personInitials('Anele Mahlangu')).toBe('AM');
  });

  it('falls back to the em dash for a name with no letters at all', () => {
    expect(personInitials('   ')).toBe('—');
  });
});

describe('entityInitials', () => {
  it('takes one letter from a company whose second word carries digits', () => {
    expect(entityInitials('Muse 1399')).toBe('M');
  });

  it('takes the first letter of up to two name-bearing words', () => {
    expect(entityInitials('A & L Contracting')).toBe('AL');
    expect(entityInitials('Kheper SA t/a Silki')).toBe('KS');
  });
});

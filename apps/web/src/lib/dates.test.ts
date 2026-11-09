import { describe, expect, it } from 'vitest';
import { southAfricaDay } from './dates';

describe('southAfricaDay', () => {
  it('passes a date-only string straight through', () => {
    // `Date.parse` reads it as UTC midnight, which is 02:00 in Johannesburg:
    // still the same calendar day, so invoice and override dates never shift.
    expect(southAfricaDay('2026-10-05')).toBe('2026-10-05');
  });

  it('formats an instant on its South African day, not its UTC day', () => {
    expect(southAfricaDay('2026-08-31T22:30:00.000Z')).toBe('2026-09-01');
  });

  it('returns an empty string for a missing or unreadable value', () => {
    expect(southAfricaDay(undefined)).toBe('');
    expect(southAfricaDay('not-a-date')).toBe('');
  });
});

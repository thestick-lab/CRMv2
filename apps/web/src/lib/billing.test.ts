import { describe, expect, it } from 'vitest';
import {
  entryDurationMinutes,
  formatHours,
  roundToQuarterMinutes,
  splitRetainerOverage,
} from './billing';

describe('roundToQuarterMinutes', () => {
  it.each([
    [7, 15],
    [23, 30],
    [30, 30],
    [0, 15],
    [53, 60],
    [15, 15],
    [45, 45],
    [60, 60],
    [90, 90],
  ])('rounds %i minutes to %i', (minutes, expected) => {
    expect(roundToQuarterMinutes(minutes)).toBe(expected);
  });

  it('rounds half up at the 7.5 and 22.5 minute boundaries', () => {
    expect(roundToQuarterMinutes(7.5)).toBe(15);
    expect(roundToQuarterMinutes(7.49)).toBe(15);
    expect(roundToQuarterMinutes(22.4)).toBe(15);
    expect(roundToQuarterMinutes(22.5)).toBe(30);
  });

  it('clamps every entry to the 15 minute minimum', () => {
    expect(roundToQuarterMinutes(0)).toBe(15);
    expect(roundToQuarterMinutes(1)).toBe(15);
    expect(roundToQuarterMinutes(-20)).toBe(15);
    expect(roundToQuarterMinutes(Number.NaN)).toBe(15);
  });
});

describe('entryDurationMinutes', () => {
  it('measures same-day work from the timestamps', () => {
    expect(
      entryDurationMinutes('2026-11-05T09:00:00+02:00', '2026-11-05T10:30:00+02:00')
    ).toBe(90);
  });

  it('measures an entry that spans midnight from the timestamps', () => {
    // 22:30 on the 5th to 01:15 on the 6th is 165 minutes, not a same-day diff.
    expect(
      entryDurationMinutes('2026-11-05T22:30:00+02:00', '2026-11-06T01:15:00+02:00')
    ).toBe(165);
  });

  it('reads a running entry, or a reversed pair, as zero worked minutes', () => {
    expect(entryDurationMinutes('2026-11-05T09:00:00+02:00', undefined)).toBe(0);
    expect(
      entryDurationMinutes('2026-11-05T10:00:00+02:00', '2026-11-05T09:00:00+02:00')
    ).toBe(0);
  });
});

describe('splitRetainerOverage', () => {
  it('bills only the hours beyond the retainer allowance at the ad-hoc rate', () => {
    const split = splitRetainerOverage([{ billableMinutes: 18 * 60 }], 15, 625);

    expect(split).toEqual({
      coveredMinutes: 15 * 60,
      overageMinutes: 3 * 60,
      overageAmountZar: 1875,
    });
  });

  it('sums entries before splitting so several sittings deplete one allowance', () => {
    const split = splitRetainerOverage(
      [{ billableMinutes: 8 * 60 }, { billableMinutes: 6 * 60 }, { billableMinutes: 4 * 60 }],
      15,
      625
    );

    expect(split.coveredMinutes).toBe(15 * 60);
    expect(split.overageMinutes).toBe(3 * 60);
    expect(split.overageAmountZar).toBe(1875);
  });

  it('charges nothing while the logged hours stay inside the allowance', () => {
    expect(splitRetainerOverage([{ billableMinutes: 12 * 60 }], 15, 625)).toEqual({
      coveredMinutes: 12 * 60,
      overageMinutes: 0,
      overageAmountZar: 0,
    });
    expect(splitRetainerOverage([{ billableMinutes: 15 * 60 }], 15, 625).overageAmountZar).toBe(0);
  });

  it('has no overage for an empty entry list', () => {
    expect(splitRetainerOverage([], 15, 625)).toEqual({
      coveredMinutes: 0,
      overageMinutes: 0,
      overageAmountZar: 0,
    });
  });

  it('rounds the overage amount half-up to the cent', () => {
    // 16 minutes over 15h: 16/60 × R625 = R166.666… → R166.67
    const split = splitRetainerOverage([{ billableMinutes: 15 * 60 + 16 }], 15, 625);
    expect(split.overageMinutes).toBe(16);
    expect(split.overageAmountZar).toBe(166.67);
  });

  it('treats a missing allowance as no retainer cover', () => {
    expect(splitRetainerOverage([{ billableMinutes: 90 }], 0, 625).overageMinutes).toBe(90);
  });
});

describe('formatHours', () => {
  it.each([
    [0, '0h'],
    [15, '0.25h'],
    [90, '1.5h'],
    [120, '2h'],
  ])('formats %i minutes as %s', (minutes, expected) => {
    expect(formatHours(minutes)).toBe(expected);
  });
});

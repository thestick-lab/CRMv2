import { describe, expect, it } from 'vitest';
import type { TimeEntry } from '@/context/PracticeStoreContext';
import {
  billingMonthRange,
  buildTimeInvoiceLines,
  entryDurationMinutes,
  formatHours,
  releasedTimeEntries,
  resolveRoundedMinutes,
  resolveWorkedMinutes,
  roundToQuarterMinutes,
  splitRetainerOverage,
  timeInvoiceFeed,
  timeLineId,
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

describe('resolveWorkedMinutes', () => {
  // 5 minutes of work, 40 minutes paused: the wall clock spans 45 minutes but
  // the stopped timer only counts the worked segments.
  const pausedStop = { durationMinutes: 5 };
  const start = '2026-11-09T09:00:00+02:00';
  const end = '2026-11-09T09:45:00+02:00';

  it('shows the pause-excluded duration the stopped timer stored', () => {
    expect(resolveWorkedMinutes(pausedStop, false, start, end)).toBe(5);
  });

  it('re-reads the timestamp span once either time field was edited', () => {
    expect(resolveWorkedMinutes(pausedStop, true, start, end)).toBe(45);
  });

  it('keeps a sub-minute stop on the under-a-minute path', () => {
    expect(resolveWorkedMinutes({ durationMinutes: 0 }, false, start, start)).toBe(0);
  });

  it('reads zero when the timestamps are unusable', () => {
    expect(resolveWorkedMinutes({ durationMinutes: 0 }, true, null, null)).toBe(0);
  });
});

describe('resolveRoundedMinutes', () => {
  it('keeps a typed quarter-hour value exactly as entered', () => {
    expect(resolveRoundedMinutes('45', 7)).toBe(45);
    expect(resolveRoundedMinutes('30', 60)).toBe(30);
  });

  it('snaps a typed non-quarter value to the nearest quarter hour', () => {
    expect(resolveRoundedMinutes('155', 7)).toBe(150);
    expect(resolveRoundedMinutes('20', 7)).toBe(15);
  });

  it('enforces the 15 minute minimum at save time', () => {
    expect(resolveRoundedMinutes('-20', 60)).toBe(15);
  });

  it('falls back to the worked duration when the field is empty or unusable', () => {
    expect(resolveRoundedMinutes('', 7)).toBe(15);
    expect(resolveRoundedMinutes('abc', 80)).toBe(75);
  });
});

describe('timeInvoiceFeed / buildTimeInvoiceLines', () => {
  const NOVEMBER = billingMonthRange('2026-11');
  const MUS = 'MUS-875';

  function entry(overrides: Partial<TimeEntry> = {}): TimeEntry {
    return {
      id: 'entry-1',
      clientCode: MUS,
      staffUserId: 'staff-1',
      startedAt: '2026-11-05T09:00:00+02:00',
      endedAt: '2026-11-05T15:00:00+02:00',
      durationMinutes: 360,
      roundedMinutes: 360,
      billable: true,
      description: 'Bookkeeping',
      createdAt: '2026-11-05T15:00:00+02:00',
      ...overrides,
    };
  }

  /** Three six-hour sittings: 18h logged against a 15h retainer. */
  const eighteenHours = [
    entry({ id: 'entry-a' }),
    entry({ id: 'entry-b', startedAt: '2026-11-12T09:00:00+02:00' }),
    entry({ id: 'entry-c', startedAt: '2026-11-19T09:00:00+02:00' }),
  ];

  it('builds one overage line for the hours beyond the retainer allowance', () => {
    const lines = buildTimeInvoiceLines(MUS, NOVEMBER, eighteenHours, 15, 625);

    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({
      description: 'Time overage — Nov 26',
      quantity: 3,
      unitAmount: 625,
      taxType: 'OUTPUT2',
      lineAmount: 1875,
    });
  });

  it('bills nothing while the month stays inside the allowance', () => {
    const twelveHours = [
      entry({ id: 'entry-a', roundedMinutes: 360 }),
      entry({ id: 'entry-b', roundedMinutes: 360 }),
    ];

    expect(buildTimeInvoiceLines(MUS, NOVEMBER, twelveHours, 15, 625)).toEqual([]);
    expect(timeInvoiceFeed(MUS, NOVEMBER, twelveHours, 15, 625)).toMatchObject({
      coveredMinutes: 720,
      overageMinutes: 0,
      overageHours: 0,
      overageAmountZar: 0,
    });
  });

  it('reports the retainer split for the confirm step', () => {
    const feed = timeInvoiceFeed(MUS, NOVEMBER, eighteenHours, 15, 625);

    expect(feed.billableMinutes).toBe(18 * 60);
    expect(feed.coveredMinutes).toBe(15 * 60);
    expect(feed.overageMinutes).toBe(3 * 60);
    expect(feed.overageAmountZar).toBe(1875);
    expect(feed.entries.map((item) => item.id)).toEqual(['entry-a', 'entry-b', 'entry-c']);
  });

  it('ignores non-billable time entirely', () => {
    const mixed = [
      entry({ id: 'entry-billable', roundedMinutes: 12 * 60 }),
      entry({ id: 'entry-admin', roundedMinutes: 8 * 60, billable: false }),
    ];

    expect(buildTimeInvoiceLines(MUS, NOVEMBER, mixed, 15, 625)).toEqual([]);
  });

  it('never bills an entry twice', () => {
    const partiallyBilled = eighteenHours.map((item) =>
      item.id === 'entry-a' ? { ...item, invoiceId: 'invoice-1' } : item
    );

    // 12h remain unbilled, all inside the 15h retainer.
    expect(buildTimeInvoiceLines(MUS, NOVEMBER, partiallyBilled, 15, 625)).toEqual([]);
    expect(
      timeInvoiceFeed(MUS, NOVEMBER, partiallyBilled, 15, 625).entries.map((item) => item.id)
    ).toEqual(['entry-b', 'entry-c']);
  });

  it('only feeds the invoice client, and only entries started in the month', () => {
    const mixed = [
      entry({ id: 'entry-november' }),
      entry({ id: 'entry-october', startedAt: '2026-10-31T09:00:00+02:00' }),
      entry({ id: 'entry-december', startedAt: '2026-12-01T09:00:00+02:00' }),
      entry({ id: 'entry-other-client', clientCode: 'STE-220' }),
    ];

    expect(
      timeInvoiceFeed(MUS, NOVEMBER, mixed, 0, 625).entries.map((item) => item.id)
    ).toEqual(['entry-november']);
  });

  it('reads the month from South African calendar days, not UTC', () => {
    // 00:30 on 1 November in Johannesburg is 22:30 on 31 October in UTC.
    const midnightEntry = entry({ id: 'entry-midnight', startedAt: '2026-10-31T22:30:00Z' });

    expect(timeInvoiceFeed(MUS, NOVEMBER, [midnightEntry], 0, 625).entries).toHaveLength(1);
  });

  it('bills the rounded entry minutes, never the raw duration', () => {
    const unrounded = [entry({ id: 'entry-one', durationMinutes: 100, roundedMinutes: 105 })];

    expect(timeInvoiceFeed(MUS, NOVEMBER, unrounded, 0, 625).billableMinutes).toBe(105);
  });

  it('prices a fractional overage to the cent with a two-decimal quantity', () => {
    // 15.1h allowance against 18h logged: 174 minutes of overage = 2.9h.
    const lines = buildTimeInvoiceLines(MUS, NOVEMBER, eighteenHours, 15.1, 625);

    expect(lines[0].quantity).toBe(2.9);
    expect(lines[0].lineAmount).toBe(1812.5);
  });

  it('spans a month key to inclusive first and last days', () => {
    expect(billingMonthRange('2026-02')).toEqual({ start: '2026-02-01', end: '2026-02-28' });
    expect(billingMonthRange('2028-02')).toEqual({ start: '2028-02-01', end: '2028-02-29' });
  });
});

describe('releasedTimeEntries', () => {
  const NOVEMBER = billingMonthRange('2026-11');
  const MUS = 'MUS-875';

  function entry(id: string, overrides: Partial<TimeEntry> = {}): TimeEntry {
    return {
      id,
      clientCode: MUS,
      staffUserId: 'staff-1',
      startedAt: '2026-11-05T09:00:00+02:00',
      endedAt: '2026-11-05T15:00:00+02:00',
      durationMinutes: 360,
      roundedMinutes: 360,
      billable: true,
      description: 'Bookkeeping',
      createdAt: '2026-11-05T15:00:00+02:00',
      ...overrides,
    };
  }

  const logged = [entry('entry-a'), entry('entry-b'), entry('entry-c')];

  /** A saved invoice carrying the month's overage line and the entries it billed. */
  function billed() {
    const feed = timeInvoiceFeed(MUS, NOVEMBER, logged, 15, 625);
    return {
      invoice: {
        id: 'invoice-1',
        lineItems: [
          {
            id: 'line-fee-nov',
            description: 'Monthly accounting — Nov 26',
            quantity: 1,
            unitAmount: 7200,
            taxType: 'OUTPUT2' as const,
            lineAmount: 7200,
          },
          ...feed.lines,
        ],
      },
      entries: logged.map((item) => ({ ...item, invoiceId: 'invoice-1' })),
    };
  }

  it('releases nothing while the invoice still carries the month’s time line', () => {
    const { invoice, entries } = billed();

    expect(invoice.lineItems.some((line) => line.id === timeLineId(MUS, '2026-11'))).toBe(true);
    expect(releasedTimeEntries(invoice, entries)).toEqual([]);
  });

  it('releases the billed entries once the time line is deleted', () => {
    const { invoice, entries } = billed();
    const trimmed = { ...invoice, lineItems: invoice.lineItems.slice(0, 1) };

    expect(releasedTimeEntries(trimmed, entries).map((item) => item.id)).toEqual([
      'entry-a',
      'entry-b',
      'entry-c',
    ]);
  });

  it('makes released time billable again — no silent loss, no double charge', () => {
    const { invoice, entries } = billed();
    const trimmed = { ...invoice, lineItems: invoice.lineItems.slice(0, 1) };

    // While billed, the feed is empty for the month.
    expect(timeInvoiceFeed(MUS, NOVEMBER, entries, 15, 625).lines).toEqual([]);

    const released = releasedTimeEntries(trimmed, entries).map((item) => ({
      ...item,
      invoiceId: undefined,
    }));
    const feed = timeInvoiceFeed(MUS, NOVEMBER, released, 15, 625);

    expect(feed.entries.map((item) => item.id)).toEqual(['entry-a', 'entry-b', 'entry-c']);
    expect(feed.lines).toHaveLength(1);
    expect(feed.lines[0].lineAmount).toBe(1875);
  });

  it('leaves entries billed by another invoice alone', () => {
    const { invoice, entries } = billed();
    const trimmed = { ...invoice, lineItems: invoice.lineItems.slice(0, 1) };

    expect(releasedTimeEntries(trimmed, entries.map((item) => ({ ...item, invoiceId: 'invoice-2' })))).toEqual([]);
  });

  it('leaves an entry with an unreadable start untouched', () => {
    const { invoice, entries } = billed();
    const trimmed = { ...invoice, lineItems: invoice.lineItems.slice(0, 1) };

    expect(
      releasedTimeEntries(trimmed, [{ ...entries[0], startedAt: 'not-a-date' }])
    ).toEqual([]);
  });
});

describe('timeInvoiceFeed pricing parity', () => {
  it('prices the line exactly as splitRetainerOverage prices the minutes', () => {
    const NOVEMBER = billingMonthRange('2026-11');
    const entries = [360, 360, 360].map((minutes, index) => ({
      id: `entry-${index}`,
      clientCode: 'MUS-875',
      staffUserId: 'staff-1',
      startedAt: `2026-11-0${index + 3}T09:00:00+02:00`,
      durationMinutes: minutes,
      roundedMinutes: minutes,
      billable: true,
      description: 'Bookkeeping',
      createdAt: '2026-11-05T15:00:00+02:00',
    }));

    // 15.13h allowance against 18h: 172.2 minutes of overage = 2.87h.
    const feed = timeInvoiceFeed('MUS-875', NOVEMBER, entries, 15.13, 625);
    const split = splitRetainerOverage(
      entries.map((entry) => ({ billableMinutes: entry.roundedMinutes })),
      15.13,
      625
    );

    expect(feed.overageHours).toBe(2.87);
    expect(feed.lines[0].quantity).toBe(2.87);
    expect(feed.lines[0].lineAmount).toBe(split.overageAmountZar);
    expect(feed.lines[0].lineAmount).toBe(1793.75);
  });
});

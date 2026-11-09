import { describe, expect, it } from 'vitest';
import type { TimeEntry } from '@/context/PracticeStoreContext';
import {
  buildTimeReport,
  localDay,
  resolvePresetRange,
  TIME_REPORT_PRESETS,
  type TimeReportRange,
} from './time-report-logic';

/* ---------------------------------------------------------------------------
 * The report is a reconciliation, not an estimate: every KPI, client bar and
 * group row is summed from the same rounded minutes on the underlying entries,
 * so the columns always add up. An empty period yields `null` totals so the
 * view can say "nothing logged" instead of painting a fake zero.
 * ------------------------------------------------------------------------- */

const RANGE: TimeReportRange = { start: '2026-10-01', end: '2026-10-31' };

function entry(overrides: Partial<TimeEntry> = {}): TimeEntry {
  return {
    id: 'time-1',
    clientCode: 'KHE-615',
    staffUserId: 'erik',
    startedAt: '2026-10-06T09:00:00+02:00',
    endedAt: '2026-10-06T10:30:00+02:00',
    durationMinutes: 90,
    roundedMinutes: 90,
    billable: true,
    description: 'VAT201 work',
    createdAt: '2026-10-06T10:30:00+02:00',
    ...overrides,
  };
}

const ENTRIES: TimeEntry[] = [
  entry({ id: 'time-1', clientCode: 'KHE-615', serviceCode: 'VAT201', staffUserId: 'erik', roundedMinutes: 90, billable: true }),
  entry({
    id: 'time-2',
    clientCode: 'KHE-615',
    serviceCode: 'AFS',
    staffUserId: 'mia',
    startedAt: '2026-10-07T09:00:00+02:00',
    roundedMinutes: 60,
    billable: false,
  }),
  entry({
    id: 'time-3',
    clientCode: 'ALC-610',
    staffUserId: 'erik',
    startedAt: '2026-10-08T09:00:00+02:00',
    roundedMinutes: 30,
    billable: true,
  }),
];

describe('buildTimeReport', () => {
  it('sums the KPI totals from the entries, keeping billable and non-billable apart', () => {
    const report = buildTimeReport(ENTRIES, RANGE);

    expect(report.kpis.total).toBe(180);
    expect(report.kpis.billable).toBe(120);
    expect(report.kpis.nonBillable).toBe(60);
    expect(report.kpis.billablePct).toBe(66.7);
    expect(report.entryCount).toBe(3);
    expect(report.billableSplit).toEqual({ billable: 120, nonBillable: 60 });
  });

  it('reconciles every client row and person/task row back to the entry sums', () => {
    const report = buildTimeReport(ENTRIES, RANGE);

    const clientTotal = report.byClient.reduce((sum, row) => sum + row.total, 0);
    expect(clientTotal).toBe(report.kpis.total);

    for (const row of report.byClient) {
      expect(row.billable + row.nonBillable).toBe(row.total);
    }

    const personTaskTotal = report.byPersonTask.reduce((sum, row) => sum + row.total, 0);
    expect(personTaskTotal).toBe(report.kpis.total);

    const khe = report.byClient.find((row) => row.clientCode === 'KHE-615');
    expect(khe).toEqual({ clientCode: 'KHE-615', billable: 90, nonBillable: 60, total: 150 });

    const alc = report.byClient.find((row) => row.clientCode === 'ALC-610');
    expect(alc).toEqual({ clientCode: 'ALC-610', billable: 30, nonBillable: 0, total: 30 });

    // Person + task rows group the same minutes by client, person and service.
    expect(report.byPersonTask).toHaveLength(3);
    expect(
      report.byPersonTask.filter((row) => row.clientCode === 'KHE-615')
        .reduce((sum, row) => sum + row.total, 0)
    ).toBe(150);
  });

  it('excludes entries outside the range', () => {
    const outOfRange = entry({
      id: 'time-4',
      clientCode: 'ALC-610',
      startedAt: '2026-11-05T09:00:00+02:00',
      roundedMinutes: 120,
    });

    const report = buildTimeReport([...ENTRIES, outOfRange], RANGE);
    expect(report.kpis.total).toBe(180);
    expect(report.entryCount).toBe(3);
  });

  it('filters by client, person and service', () => {
    expect(buildTimeReport(ENTRIES, RANGE, { client: 'ALC-610' }).kpis.total).toBe(30);
    expect(buildTimeReport(ENTRIES, RANGE, { staff: 'mia' }).kpis.total).toBe(60);
    expect(buildTimeReport(ENTRIES, RANGE, { staff: 'mia' }).kpis.billable).toBe(0);
    expect(buildTimeReport(ENTRIES, RANGE, { service: 'VAT201' }).kpis.total).toBe(90);
  });

  it('returns null totals and empty groups for an empty range, never zeros', () => {
    const report = buildTimeReport(ENTRIES, { start: '2026-01-01', end: '2026-01-31' });

    expect(report.kpis).toEqual({
      total: null,
      billable: null,
      nonBillable: null,
      billablePct: null,
    });
    expect(report.byClient).toEqual([]);
    expect(report.byPersonTask).toEqual([]);
    expect(report.billableSplit).toEqual({ billable: null, nonBillable: null });
    expect(report.entryCount).toBe(0);
  });

  it('buckets an entry by its South African calendar day, not its UTC day', () => {
    // 00:30 on 1 October in Johannesburg is 22:30 on 30 September in UTC.
    const boundary = entry({
      id: 'time-boundary',
      startedAt: '2026-10-01T00:30:00+02:00',
      roundedMinutes: 45,
    });
    expect(localDay(boundary.startedAt)).toBe('2026-10-01');

    const report = buildTimeReport([boundary], RANGE);
    expect(report.kpis.total).toBe(45);
  });

  it('counts a midnight-spanning entry against the day it started', () => {
    const spanning = entry({
      id: 'time-spanning',
      startedAt: '2026-10-31T22:30:00+02:00',
      endedAt: '2026-11-01T01:15:00+02:00',
      durationMinutes: 165,
      roundedMinutes: 165,
    });
    expect(buildTimeReport([spanning], RANGE).kpis.total).toBe(165);
  });
});

describe('report presets', () => {
  it('resolves this month, last month, last 30 days and this year against today', () => {
    const today = '2026-11-09';
    const ids = TIME_REPORT_PRESETS.map((preset) => preset.id);
    expect(ids).toEqual(['this-month', 'last-month', 'last-30', 'this-year']);

    expect(resolvePresetRange('this-month', today)).toEqual({ start: '2026-11-01', end: today });
    expect(resolvePresetRange('last-month', today)).toEqual({ start: '2026-10-01', end: '2026-10-31' });
    expect(resolvePresetRange('last-30', today)).toEqual({ start: '2026-10-11', end: today });
    expect(resolvePresetRange('this-year', today)).toEqual({ start: '2026-01-01', end: today });
  });
});

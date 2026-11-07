import { describe, expect, it } from 'vitest';
import { CLIENT_SHOW_TABS, formatClientSummary } from './ClientSummaryBar';
import { CLIENTS } from 'fdoncall-practice/data/seed';

describe('ClientShowView header and tab definitions', () => {
  const muse = CLIENTS.find((c) => c.code === 'MUS-875')!;

  it('defines the 4 required statutory tabs', () => {
    expect(CLIENT_SHOW_TABS).toHaveLength(4);
    expect(CLIENT_SHOW_TABS.map((t) => t.id)).toEqual([
      'profile',
      'deadlines',
      'estimate',
      'vault',
    ]);
  });

  it('formats client summary meta for MUS-875', () => {
    const summary = formatClientSummary(muse);
    expect(summary.name).toBe('Muse 1399');
    expect(summary.code).toBe('MUS-875');
    expect(summary.entityType).toBe('Company');
    expect(summary.partnerLabel).toBe('Erik (Partner)');
  });
});

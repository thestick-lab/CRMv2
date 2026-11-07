import { describe, expect, it } from 'vitest';
import { buildProfileDetails } from './StatutoryProfileTab';
import { buildClientDeadlines } from './DeadlinesTab';
import { CLIENTS } from 'fdoncall-practice/data/seed';

describe('StatutoryProfileTab and DeadlinesTab data builders', () => {
  const muse = CLIENTS.find((c) => c.code === 'MUS-875')!;

  it('builds statutory profile details with CIPC and SARS profile for MUS-875', () => {
    const details = buildProfileDetails(muse);
    expect(details.entityType).toBe('Company');
    expect(details.yearEndLabel).toBe('Feb* (Assumed)');
    expect(details.vatLabel).toBe('Category B (Even Months)');
    expect(details.efilingProfileLabel).toBe('Client Profile (SARS Managed)');
  });

  it('builds filing tasks and identifies partner review gates for AFS and ITR14', () => {
    const asOf = '2026-11-07';
    const tasks = buildClientDeadlines(muse, asOf);
    expect(tasks.length).toBeGreaterThan(0);

    const afsTask = tasks.find((t) => t.service === 'AFS');
    expect(afsTask?.needsPartnerReview).toBe(true);

    const itr14Task = tasks.find((t) => t.service === 'ITR14');
    expect(itr14Task?.needsPartnerReview).toBe(true);
  });
});

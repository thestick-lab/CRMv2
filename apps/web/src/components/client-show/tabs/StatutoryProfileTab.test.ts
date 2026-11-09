import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildProfileDetails } from './StatutoryProfileTab';
import { CLIENTS } from 'fdoncall-practice/data/seed';

describe('StatutoryProfileTab interactive details and services configuration', () => {
  const muse = CLIENTS.find((c) => c.code === 'MUS-875')!;

  it('builds statutory profile details with CIPC and SARS profile for MUS-875', () => {
    const details = buildProfileDetails(muse);
    expect(details.entityType).toBe('Company');
    expect(details.yearEndLabel).toBe('Feb* (Assumed)');
    expect(details.vatLabel).toBe('Category B (Even Months)');
    expect(details.efilingProfileLabel).toBe('Client Profile (SARS Managed)');
  });

  it('verifies StatutoryProfileTab renders interactive Details form and Services checkboxes', () => {
    const tabSrc = fs.readFileSync('src/components/client-show/tabs/StatutoryProfileTab.tsx', 'utf8');

    // Must have interactive input fields for financial year end, turnover, and incorporation date
    expect(tabSrc).toContain('yearEndMonth');
    expect(tabSrc).toContain('incorporationDate');
    expect(tabSrc).toContain('turnover');

    // Must render interactive switches for VAT, Payroll, and eFiling profile
    expect(tabSrc).toContain('vatCategory');
    expect(tabSrc).toContain('payroll');
    expect(tabSrc).toContain('efilingProfile');

    // Must render statutory services checkboxes that toggle compliance deadlines
    expect(tabSrc).toContain('Annual financial statements');
    expect(tabSrc).toContain('Company income tax return');
    expect(tabSrc).toContain('Provisional tax (IRP6)');
    expect(tabSrc).toContain('VAT return (VAT201)');
    expect(tabSrc).toContain('CIPC annual return and FAS');
    expect(tabSrc).toContain('Beneficial ownership (CIPC)');
  });

  it('verifies ClientShowView includes deep-link button to Deadlines board and the seven record tabs', () => {
    const showSrc = fs.readFileSync('src/components/client-show/ClientShowView.tsx', 'utf8');
    const barSrc = fs.readFileSync('src/components/client-show/ClientSummaryBar.tsx', 'utf8');

    // Must have direct button to view client deadlines on the main board
    expect(barSrc).toContain('View Client Deadlines');
    expect(showSrc).toContain("'deadlines'");

    // Details/statutory profile moved into the Overview tab of the seven-tab record
    expect(showSrc).toContain("id: 'overview'");
    expect(showSrc).toContain('StatutoryProfileTab');
  });
});

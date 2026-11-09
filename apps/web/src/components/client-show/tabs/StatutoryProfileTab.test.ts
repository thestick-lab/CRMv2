import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildProfileDetails, serviceTogglePatch, setServices } from './StatutoryProfileTab';
import { CLIENTS } from 'fdoncall-practice/data/seed';
import type { ServiceCode, VatCategory } from 'fdoncall-practice/domain/types';

describe('explicit service scope', () => {
  it('adds and removes services without reordering the recorded scope', () => {
    expect(setServices(['AFS'], ['VAT201'], true)).toEqual(['AFS', 'VAT201']);
    expect(setServices(['AFS', 'VAT201'], ['VAT201'], false)).toEqual(['AFS']);
    expect(setServices(['EMP201'], ['EMP201', 'EMP501'], true)).toEqual(['EMP201', 'EMP501']);
    expect(setServices(['EMP201', 'EMP501'], ['EMP201', 'EMP501'], false)).toEqual([]);
    expect(setServices(['AFS', 'VAT201'], ['VAT201'], true)).toEqual(['AFS', 'VAT201']);
  });
});

describe('service checkbox patches', () => {
  const base: {
    services: ServiceCode[];
    vatCategory?: VatCategory;
    payroll: boolean;
    employeeCount?: number;
  } = { services: ['AFS', 'ITR14'], payroll: false };

  it('tick then untick VAT201 leaves no phantom registration behind', () => {
    const ticked = serviceTogglePatch(base, 'VAT201', true);
    expect(ticked.vatCategory).toBe('B');
    expect(ticked.services).toEqual(['AFS', 'ITR14', 'VAT201']);

    const unticked = serviceTogglePatch({ ...base, ...ticked }, 'VAT201', false);
    expect(unticked.vatCategory).toBeUndefined();
    expect(unticked.services).toEqual(['AFS', 'ITR14']);
  });

  it('keeps an existing VAT category when VAT201 is ticked', () => {
    expect(serviceTogglePatch({ ...base, vatCategory: 'A' }, 'VAT201', true).vatCategory).toBe('A');
  });

  it('tick then untick EMP201 returns the payroll switch and headcount', () => {
    const ticked = serviceTogglePatch(base, 'EMP201', true);
    expect(ticked.payroll).toBe(true);
    expect(ticked.employeeCount).toBe(8);
    expect(ticked.services).toEqual(['AFS', 'ITR14', 'EMP201', 'EMP501']);

    const unticked = serviceTogglePatch({ ...base, ...ticked }, 'EMP201', false);
    expect(unticked.payroll).toBe(false);
    expect(unticked.employeeCount).toBe(0);
    expect(unticked.services).toEqual(['AFS', 'ITR14']);
  });

  it('leaves the registration switches alone for a plain service', () => {
    expect(serviceTogglePatch(base, 'CIPC_AR', true)).toEqual({
      services: ['AFS', 'ITR14', 'CIPC_AR'],
    });
  });
});

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

    // Checkboxes write the explicit service scope that drives the deadlines board.
    expect(tabSrc).toContain('defaultServices');
    expect(tabSrc).toContain('handleServiceToggle');
    expect(tabSrc).toContain('serviceTogglePatch');
  });

  it('reads the BO status from the recorded scope, not only the legacy flag', () => {
    // BO in scope and filed on the record.
    expect(buildProfileDetails(muse).boStatusLabel).toBe('Filed with CIPC');
    // BO in scope, not filed yet.
    expect(
      buildProfileDetails({ ...muse, services: ['AFS', 'BO'], beneficialOwnershipFiled: false })
        .boStatusLabel
    ).toBe('Filing required');
    // BO out of scope: an explicit scope without BO, or a null filing flag.
    expect(
      buildProfileDetails({ ...muse, services: ['AFS', 'ITR14'] }).boStatusLabel
    ).toBe('Not applicable');
    expect(
      buildProfileDetails({ ...muse, beneficialOwnershipFiled: null }).boStatusLabel
    ).toBe('Not applicable');
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

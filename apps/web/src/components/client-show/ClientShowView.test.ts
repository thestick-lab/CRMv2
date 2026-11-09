import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CLIENT_SHOW_TABS, clientRecordTabs, formatClientSummary } from './ClientShowView';
import { CLIENTS } from 'fdoncall-practice/data/seed';

describe('ClientShowView header and tab definitions', () => {
  const muse = CLIENTS.find((c) => c.code === 'MUS-875')!;

  it('defines the seven client record tabs in record order', () => {
    expect(CLIENT_SHOW_TABS.map((t) => t.id)).toEqual([
      'overview',
      'organization',
      'history',
      'tasks',
      'estimate',
      'vault',
      'notes',
    ]);
    expect(CLIENT_SHOW_TABS.map((t) => t.label)).toEqual([
      'Overview',
      'Organization',
      'History',
      'Tasks',
      'Estimate',
      'Vault',
      'Notes',
    ]);
  });

  it('hides the Estimate tab and quote exports without `Clients — view billing`', () => {
    expect(clientRecordTabs(true).map((tab) => tab.id)).toEqual([
      'overview',
      'organization',
      'history',
      'tasks',
      'estimate',
      'vault',
      'notes',
    ]);
    expect(clientRecordTabs(false).map((tab) => tab.id)).toEqual([
      'overview',
      'organization',
      'history',
      'tasks',
      'vault',
      'notes',
    ]);

    const showSrc = fs.readFileSync('src/components/client-show/ClientShowView.tsx', 'utf8');
    expect(showSrc).toContain("'Clients',");
    expect(showSrc).toContain("'view-billing'");
    expect(showSrc).toContain('clientRecordTabs(canViewBilling)');
    expect(showSrc).toContain('canViewBilling ? handlePdf : undefined');
    expect(showSrc).toContain('canViewBilling ? handleExcel : undefined');
    // The statutory / deadlines tabs remain available.
    expect(showSrc).toContain("activeTab === 'tasks'");
    expect(showSrc).toContain("activeTab === 'vault'");
  });

  it('wires the previously unwired estimate, vault and deadlines tabs into the record', () => {
    const showSrc = fs.readFileSync('src/components/client-show/ClientShowView.tsx', 'utf8');

    expect(showSrc).toContain('EstimateTab');
    expect(showSrc).toContain('VaultTab');
    expect(showSrc).toContain('DeadlinesTab');
    expect(showSrc).toContain('ContactProfileLayout');
    expect(showSrc).toContain('StatutoryProfileTab');
  });

  it('uses the shared contact profile layout with identity, meta and actions', () => {
    const showSrc = fs.readFileSync('src/components/client-show/ClientShowView.tsx', 'utf8');

    expect(showSrc).toContain('identity=');
    expect(showSrc).toContain('meta=');
    expect(showSrc).toContain('onTab=');
    expect(showSrc).toContain('CLIENT_SHOW_TABS');
  });

  it('keeps the deadlines deep link and quote exports reachable from the summary bar', () => {
    const barSrc = fs.readFileSync('src/components/client-show/ClientSummaryBar.tsx', 'utf8');
    expect(barSrc).toContain('Export PDF Quote');
    expect(barSrc).toContain('View Client Deadlines');

    const showSrc = fs.readFileSync('src/components/client-show/ClientShowView.tsx', 'utf8');
    expect(showSrc).toContain("'deadlines'");
    expect(showSrc).toContain('downloadPdfQuote');
    expect(showSrc).toContain('downloadExcelQuote');
  });

  it('adds optional client contact channels and contact records to the domain type', () => {
    const typesSrc = fs.readFileSync('../../packages/domain/src/domain/types.ts', 'utf8');

    expect(typesSrc).toContain('email?: string');
    expect(typesSrc).toContain('phone?: string');
    expect(typesSrc).toContain('location?: string');
    expect(typesSrc).toContain('timezone?: string');
    expect(typesSrc).toContain('contacts?: ClientContact[]');
    expect(typesSrc).toContain('export interface ClientContact');
  });

  it('migrates the seeded director onto its client record', () => {
    const marthinus = muse.contacts?.find((c) => c.name === 'Marthinus De Villiers');
    expect(marthinus).toBeDefined();
    expect(marthinus?.role).toBe('Director');
    expect(marthinus?.email).toBe('marthinus@muse1399.co.za');
  });

  it('formats client summary meta for MUS-875', () => {
    const summary = formatClientSummary(muse);
    expect(summary.name).toBe('Muse 1399');
    expect(summary.code).toBe('MUS-875');
    expect(summary.entityType).toBe('Company');
    expect(summary.partnerLabel).toBe('Erik (Partner)');
  });
});

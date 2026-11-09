import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { todayInSouthAfrica, easterSunday } from 'fdoncall-practice/domain/dates';
import { CLIENTS } from 'fdoncall-practice/data/seed';

describe('App domain workspace link', () => {
  it('resolves date functions from domain engine', () => {
    const today = todayInSouthAfrica();
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(easterSunday(2026)).toBe('2026-04-05');
  });

  it('resolves seeded practice clients from domain engine', () => {
    expect(CLIENTS.length).toBe(13);
    const alc = CLIENTS.find((c) => c.code === 'ALC-610');
    expect(alc).toBeDefined();
    expect(alc?.name).toBe('A & L Contracting');
  });
});

describe('Workspace scripts and theme configuration', () => {
  it('has root dev script and web typecheck script', () => {
    const rootPkg = JSON.parse(fs.readFileSync('../../package.json', 'utf8'));
    const webPkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    expect(rootPkg.scripts?.dev).toBe('npm run dev --workspace=@crmv2/web');
    expect(webPkg.scripts?.typecheck).toBe('tsc -b');
  });

  it('configures Tailwind v4 class-based dark variant and inline theme', () => {
    const css = fs.readFileSync('src/index.css', 'utf8');
    expect(css).toContain('@custom-variant dark');
    expect(css).toContain('@theme inline');
  });
});

describe('App shell and view integration', () => {
  it('mounts Layout and connects DashboardView, ClientsView, and DeadlinesView', () => {
    const appSource = fs.readFileSync('src/App.tsx', 'utf8');
    expect(appSource).toContain('<Layout');
    expect(appSource).toContain('DashboardView');
    expect(appSource).toContain('ClientsView');
    expect(appSource).toContain('DeadlinesView');
  });

  it('integrates ClientsRegisterTable inside ClientsView', () => {
    const clientsViewSource = fs.readFileSync('src/components/views/ClientsView.tsx', 'utf8');
    expect(clientsViewSource).toContain('ClientsRegisterTable');
    expect(clientsViewSource).toContain('enrichClientRows');
  });

  it('integrates ClientShowView when navigating to a client record', () => {
    const appSource = fs.readFileSync('src/App.tsx', 'utf8');
    expect(appSource).toContain('ClientShowView');
    expect(appSource).toContain('<ClientShowView');
  });

  it('integrates DeadlinesDashboard with Kanban and Table views inside DeadlinesView', () => {
    const deadlinesViewSource = fs.readFileSync('src/components/views/DeadlinesView.tsx', 'utf8');
    expect(deadlinesViewSource).toContain('DeadlinesDashboard');
  });

  it('connects PDF and Excel quote export streaming actions', () => {
    const showSource = fs.readFileSync('src/components/client-show/ClientShowView.tsx', 'utf8');
    expect(showSource).toContain('downloadPdfQuote');
    expect(showSource).toContain('downloadExcelQuote');
  });

  it('connects Documenso SLA and Xero repeating invoice sync dialogs', () => {
    const vaultSource = fs.readFileSync('src/components/client-show/tabs/VaultTab.tsx', 'utf8');
    const estimateSource = fs.readFileSync('src/components/client-show/tabs/EstimateTab.tsx', 'utf8');
    expect(vaultSource).toContain('DocumensoDispatchDialog');
    expect(estimateSource).toContain('XeroSyncDialog');
  });

  it('mounts PracticeStoreProvider and routes every ViewKey to its view', () => {
    const appSource = fs.readFileSync('src/App.tsx', 'utf8');
    expect(appSource).toContain('PracticeStoreProvider');
    expect(appSource).toContain('InboxView');
    expect(appSource).toContain('AnalyticsView');
    expect(appSource).toContain('TeamView');
    expect(appSource).toContain('TimeView');
    expect(appSource).toContain('SalesPipelineView');
    expect(appSource).toContain('GovernanceLogView');
    expect(appSource).toContain('SettingsView');

    for (const view of [
      'dashboard',
      'analytics',
      'inbox',
      'clients',
      'team',
      'deadlines',
      'sales-pipeline',
      'time',
      'settings',
      'govlog',
      'client',
    ]) {
      expect(appSource).toContain(`case '${view}':`);
    }

    // Legacy views are gone from the router (clean cutover)
    expect(appSource).not.toContain('PeopleView');
    expect(appSource).not.toContain('EstimatorView');
    expect(appSource).not.toContain("case 'people':");
    expect(appSource).not.toContain("case 'estimator':");
  });

  it('renders a shared PageHeader and empty state on every new foundation view', () => {
    const views = [
      'src/components/analytics/AnalyticsView.tsx',
      'src/components/time/TimeView.tsx',
      'src/components/pipeline/SalesPipelineView.tsx',
      'src/components/team/TeamView.tsx',
      'src/components/govlog/GovernanceLogView.tsx',
    ];
    for (const path of views) {
      const source = fs.readFileSync(path, 'utf8');
      expect(source).toContain("from '@/components/ui/page-header'");
      expect(source).toContain('PageHeader');
      expect(source).toContain('EmptyStateCard');
    }
  });
});

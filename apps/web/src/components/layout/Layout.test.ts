import { describe, expect, it } from 'vitest';
import { buildBreadcrumbs, NAV_ITEMS } from './navigation-helpers';

describe('Layout navigation helpers and breadcrumbs', () => {
  it('defines the 10 grouped navigation items in Practice / Work / Admin order', () => {
    expect(NAV_ITEMS).toHaveLength(10);
    expect(NAV_ITEMS.map((item) => item.id)).toEqual([
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
    ]);

    expect(NAV_ITEMS.filter((item) => item.section === 'Practice').map((item) => item.id)).toEqual([
      'dashboard',
      'analytics',
      'inbox',
    ]);
    expect(NAV_ITEMS.filter((item) => item.section === 'Work').map((item) => item.id)).toEqual([
      'clients',
      'team',
      'deadlines',
      'sales-pipeline',
      'time',
    ]);
    expect(NAV_ITEMS.filter((item) => item.section === 'Admin').map((item) => item.id)).toEqual([
      'settings',
      'govlog',
    ]);
  });

  it('generates a breadcrumb trail for every view key', () => {
    expect(buildBreadcrumbs('dashboard')).toEqual([{ label: 'Home' }]);
    expect(buildBreadcrumbs('analytics')).toEqual([
      { label: 'Practice' },
      { label: 'Analytics', view: 'analytics' },
    ]);
    expect(buildBreadcrumbs('inbox')).toEqual([
      { label: 'Home', view: 'dashboard' },
      { label: 'Inbox' },
    ]);
    expect(buildBreadcrumbs('clients')).toEqual([
      { label: 'Work' },
      { label: 'Clients', view: 'clients' },
    ]);
    expect(buildBreadcrumbs('client', 'ALC-610', 'A & L Contracting')).toEqual([
      { label: 'Work' },
      { label: 'Clients', view: 'clients' },
      { label: 'A & L Contracting [ALC-610]', clientCode: 'ALC-610' },
    ]);
    expect(buildBreadcrumbs('team')).toEqual([{ label: 'Work' }, { label: 'Team', view: 'team' }]);
    expect(buildBreadcrumbs('deadlines')).toEqual([
      { label: 'Work' },
      { label: 'Deadlines', view: 'deadlines' },
    ]);
    expect(buildBreadcrumbs('sales-pipeline')).toEqual([
      { label: 'Work' },
      { label: 'Sales Pipeline', view: 'sales-pipeline' },
    ]);
    expect(buildBreadcrumbs('time')).toEqual([{ label: 'Work' }, { label: 'Time', view: 'time' }]);
    expect(buildBreadcrumbs('settings')).toEqual([
      { label: 'Admin' },
      { label: 'Settings', view: 'settings' },
    ]);
    expect(buildBreadcrumbs('govlog')).toEqual([
      { label: 'Admin' },
      { label: 'Governance Log', view: 'govlog' },
    ]);
  });
});

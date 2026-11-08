import { describe, expect, it } from 'vitest';
import { buildBreadcrumbs, NAV_ITEMS } from './navigation-helpers';

describe('Layout navigation helpers and breadcrumbs', () => {
  it('defines the 4 primary navigation items with correct sections and badges', () => {
    expect(NAV_ITEMS).toHaveLength(4);

    const clientsItem = NAV_ITEMS.find((item) => item.id === 'clients');
    expect(clientsItem).toBeDefined();
    expect(clientsItem?.section).toBe('PRACTICE REGISTERS');

    const peopleItem = NAV_ITEMS.find((item) => item.id === 'people');
    expect(peopleItem).toBeDefined();
    expect(peopleItem?.section).toBe('PRACTICE REGISTERS');

    const deadlinesItem = NAV_ITEMS.find((item) => item.id === 'deadlines');
    expect(deadlinesItem).toBeDefined();
    expect(deadlinesItem?.section).toBe('OPERATIONS & GROWTH');
    expect(deadlinesItem?.badge).toBe(4);

    const estimatorItem = NAV_ITEMS.find((item) => item.id === 'estimator');
    expect(estimatorItem).toBeDefined();
    expect(estimatorItem?.section).toBe('OPERATIONS & GROWTH');
  });

  it('generates expected breadcrumb trails for each view', () => {
    expect(buildBreadcrumbs('dashboard')).toEqual([{ label: 'Home' }]);
    expect(buildBreadcrumbs('inbox')).toEqual([
      { label: 'Home', view: 'dashboard' },
      { label: 'Inbox (Review Queue)' },
    ]);
    expect(buildBreadcrumbs('settings')).toEqual([
      { label: 'Home', view: 'dashboard' },
      { label: 'Settings' },
    ]);
    expect(buildBreadcrumbs('clients')).toEqual([
      { label: 'Practice Registers' },
      { label: 'Clients', view: 'clients' },
    ]);
    expect(buildBreadcrumbs('client', 'ALC-610', 'A & L Contracting')).toEqual([
      { label: 'Practice Registers' },
      { label: 'Clients', view: 'clients' },
      { label: 'A & L Contracting [ALC-610]', clientCode: 'ALC-610' },
    ]);
    expect(buildBreadcrumbs('people')).toEqual([
      { label: 'Practice Registers' },
      { label: 'People' },
    ]);
    expect(buildBreadcrumbs('deadlines')).toEqual([
      { label: 'Operations & Growth' },
      { label: 'Deadlines', view: 'deadlines' },
    ]);
    expect(buildBreadcrumbs('estimator')).toEqual([
      { label: 'Operations & Growth' },
      { label: 'Estimator' },
    ]);
  });
});

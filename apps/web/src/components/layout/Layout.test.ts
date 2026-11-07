import { describe, expect, it } from 'vitest';
import { buildBreadcrumbs, NAV_ITEMS } from './navigation-helpers';

describe('Layout navigation helpers and breadcrumbs', () => {
  it('defines the 8 core navigation items with correct sections and badges', () => {
    const clientsItem = NAV_ITEMS.find((item) => item.id === 'clients');
    expect(clientsItem).toBeDefined();
    expect(clientsItem?.section).toBe('PRACTICE DATA');
    expect(clientsItem?.badge).toBe(13);

    const deadlinesItem = NAV_ITEMS.find((item) => item.id === 'deadlines');
    expect(deadlinesItem).toBeDefined();
    expect(deadlinesItem?.section).toBe('STATUTORY OPS');
    expect(deadlinesItem?.badge).toBe(4);

    const pipelineItem = NAV_ITEMS.find((item) => item.id === 'pipeline');
    expect(pipelineItem?.badge).toBe(5);
  });

  it('generates expected breadcrumb trails for each view', () => {
    expect(buildBreadcrumbs('dashboard')).toEqual([{ label: 'Home' }]);
    expect(buildBreadcrumbs('clients')).toEqual([
      { label: 'Practice Data' },
      { label: 'Clients', view: 'clients' },
    ]);
    expect(buildBreadcrumbs('client', 'ALC-610', 'A & L Contracting')).toEqual([
      { label: 'Practice Data' },
      { label: 'Clients', view: 'clients' },
      { label: 'A & L Contracting [ALC-610]', clientCode: 'ALC-610' },
    ]);
    expect(buildBreadcrumbs('deadlines')).toEqual([
      { label: 'Statutory Ops' },
      { label: 'Deadlines & Tasks', view: 'deadlines' },
    ]);
  });
});

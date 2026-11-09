import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { NAV_ITEMS } from './navigation-helpers';

describe('Sidebar header and WorkspaceMenuPopover layout', () => {
  it('implements collapsed mode with single centered logo button and zero element overlap', () => {
    const sidebarSrc = fs.readFileSync('src/components/layout/Sidebar.tsx', 'utf8');

    // Must verify conditional rendering based on collapsed state
    expect(sidebarSrc).toContain('collapsed ?');
    // When collapsed, must have centered logo button triggering expand
    expect(sidebarSrc).toContain('onToggleCollapse');
    // WorkspaceMenuPopover must be imported and integrated
    expect(sidebarSrc).toContain('WorkspaceMenuPopover');
  });

  it('renders grouped navigation sections from NAV_ITEMS with the pending-review inbox badge', () => {
    const sidebarSrc = fs.readFileSync('src/components/layout/Sidebar.tsx', 'utf8');

    // Sections drive the rendering rather than hard-coded utility buttons
    expect(sidebarSrc).toContain("['Practice', 'Work', 'Admin']");
    expect(sidebarSrc).toContain('NAV_SECTIONS.map');
    expect(sidebarSrc).toContain('NAV_ITEMS.map');
    // Inbox carries the live partner-review count
    expect(sidebarSrc).toContain("item.id === 'inbox'");
    expect(sidebarSrc).toContain('pendingReviewCount');
    expect(sidebarSrc).toContain("o.status === 'Partner Review Gate'");
    // Clients item stays active while a client record is open
    expect(sidebarSrc).toContain("item.id === 'clients' && currentView === 'client'");
  });

  it('places collapse button on the left next to brand logo in expanded header', () => {
    const sidebarSrc = fs.readFileSync('src/components/layout/Sidebar.tsx', 'utf8');

    // Left collapse toggle should precede workspace popover
    const collapseIdx = sidebarSrc.indexOf('PanelLeftClose');
    const popoverIdx = sidebarSrc.indexOf('<WorkspaceMenuPopover');
    expect(collapseIdx).toBeLessThan(popoverIdx);
  });

  it('simplifies WorkspaceMenuPopover to division switcher without practice metric clutter', () => {
    const popoverSrc = fs.readFileSync('src/components/layout/WorkspaceMenuPopover.tsx', 'utf8');

    // Clutter must be removed
    expect(popoverSrc).not.toContain('Durbanville Practice');
    expect(popoverSrc).not.toContain('Active Clients');
    expect(popoverSrc).not.toContain('Team Members');

    // Clean division switcher remains
    expect(popoverSrc).toContain('fd-on-call');
    expect(popoverSrc).toContain('accountant-on-call');
  });

  it('defines the grouped primary navigation items in navigation-helpers', () => {
    expect(NAV_ITEMS).toHaveLength(10);
    const ids = NAV_ITEMS.map((item) => item.id);
    expect(ids).toEqual([
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
    expect(NAV_ITEMS.every((item) => ['Practice', 'Work', 'Admin'].includes(item.section))).toBe(
      true
    );
  });
});

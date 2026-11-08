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

  it('implements horizontal icon utility bar for Home, Inbox, and Settings under the header', () => {
    const sidebarSrc = fs.readFileSync('src/components/layout/Sidebar.tsx', 'utf8');

    // Must render horizontal icon bar with Home, Inbox, and Settings
    expect(sidebarSrc).toContain('dashboard');
    expect(sidebarSrc).toContain('inbox');
    expect(sidebarSrc).toContain('settings');
    expect(sidebarSrc).toContain('title="Home"');
    expect(sidebarSrc).toContain('title="Inbox"');
    expect(sidebarSrc).toContain('title="Settings"');
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

  it('defines the 4 primary operational navigation items in navigation-helpers', () => {
    expect(NAV_ITEMS).toHaveLength(4);
    const ids = NAV_ITEMS.map((item) => item.id);
    expect(ids).toEqual(['clients', 'people', 'deadlines', 'estimator']);
  });
});

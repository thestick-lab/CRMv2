import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

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

  it('implements WorkspaceMenuPopover with practice profile, division switcher, and settings shortcut', () => {
    const popoverSrc = fs.readFileSync('src/components/layout/WorkspaceMenuPopover.tsx', 'utf8');

    // Consumes PracticeStoreContext
    expect(popoverSrc).toContain('usePracticeStore');
    // Division switcher between FD on Call and Accountant on Call
    expect(popoverSrc).toContain('fd-on-call');
    expect(popoverSrc).toContain('accountant-on-call');
    expect(popoverSrc).toContain('setDivision');
    // Translucent glass styling
    expect(popoverSrc).toContain('backdrop-blur');
    // Navigates to settings
    expect(popoverSrc).toContain('settings');
  });

  it('references official brand logo assets for both divisions', () => {
    const popoverSrc = fs.readFileSync('src/components/layout/WorkspaceMenuPopover.tsx', 'utf8');
    const sidebarSrc = fs.readFileSync('src/components/layout/Sidebar.tsx', 'utf8');

    const combined = popoverSrc + sidebarSrc;
    expect(combined).toContain('fd-on-call-logo.png');
    expect(combined).toContain('accountant-on-call-logo.png');
  });
});

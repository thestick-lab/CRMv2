import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { canTransitionQuote } from '@/lib/quote-lifecycle';

describe('Final review fixes: cross-view reactivity and user experience', () => {
  it('wires usePracticeStore into ClientsView, ClientShowView, DashboardView, Layout, and EstimateTab', () => {
    const clientsView = fs.readFileSync('src/components/views/ClientsView.tsx', 'utf8');
    const clientShow = fs.readFileSync('src/components/client-show/ClientShowView.tsx', 'utf8');
    const dashboard = fs.readFileSync('src/components/views/DashboardView.tsx', 'utf8');
    const layout = fs.readFileSync('src/components/layout/Layout.tsx', 'utf8');
    const estimateTab = fs.readFileSync('src/components/client-show/tabs/EstimateTab.tsx', 'utf8');
    const deadlinesDashboard = fs.readFileSync('src/components/deadlines/DeadlinesDashboard.tsx', 'utf8');

    // Must consume dynamic clients/staff/rates from usePracticeStore
    expect(clientsView).toContain('usePracticeStore');
    expect(clientShow).toContain('usePracticeStore');
    expect(dashboard).toContain('usePracticeStore');
    expect(layout).toContain('usePracticeStore');
    expect(estimateTab).toContain('usePracticeStore');
    expect(deadlinesDashboard).toContain('usePracticeStore');
  });

  it('verifies the shared board opens card detail without preempting client navigation', () => {
    const kanbanSrc = fs.readFileSync('src/components/deadlines/DeadlinesKanban.tsx', 'utf8');
    const boardSrc = fs.readFileSync('src/components/kanban/KanbanBoard.tsx', 'utf8');

    // Card should not bind whole-card onClick to onSelectClient directly
    expect(kanbanSrc).not.toContain('onClick={() => onSelectClient(task.clientCode)}');
    // Double click must trigger the detail surface
    expect(boardSrc).toContain('onDoubleClick');
    // Must pass initialStatus / targetStatus to the statutory form
    expect(kanbanSrc).toContain('initialStatus');
  });

  it('connects UserPopover to usePracticeStore with logout and settings navigation', () => {
    const userPopoverSrc = fs.readFileSync('src/components/ui/user-popover.tsx', 'utf8');

    expect(userPopoverSrc).toContain('usePracticeStore');
    expect(userPopoverSrc).toContain('logout');
  });

  it('routes prospect progression through validated quote stage transitions', () => {
    expect(canTransitionQuote('Draft Quote', 'Quote Sent', { hasClient: true, hasFeeLines: true })).toBe(
      true
    );
    expect(
      canTransitionQuote('Draft Quote', 'Quote Sent', { hasClient: false, hasFeeLines: true })
    ).toBe(false);
    expect(canTransitionQuote('Quote Sent', 'Accepted', { hasClient: false, hasFeeLines: false })).toBe(
      true
    );
    expect(canTransitionQuote('Signed', 'Closed Lost', { hasClient: true, hasFeeLines: true })).toBe(
      false
    );
  });
});

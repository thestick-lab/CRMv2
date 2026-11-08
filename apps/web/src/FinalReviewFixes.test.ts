import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

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

  it('verifies DeadlinesKanban card navigation does not preempt double-click action modal', () => {
    const kanbanSrc = fs.readFileSync('src/components/deadlines/DeadlinesKanban.tsx', 'utf8');

    // Card should not bind whole-card onClick to onSelectClient directly
    expect(kanbanSrc).not.toContain('onClick={() => onSelectClient(task.clientCode)}');
    // Double click must trigger action modal
    expect(kanbanSrc).toContain('onDoubleClick');
    // Must pass initialStatus / targetStatus to StatutoryActionModal
    expect(kanbanSrc).toContain('initialStatus');
  });

  it('connects UserPopover to usePracticeStore with logout and settings navigation', () => {
    const userPopoverSrc = fs.readFileSync('src/components/ui/user-popover.tsx', 'utf8');

    expect(userPopoverSrc).toContain('usePracticeStore');
    expect(userPopoverSrc).toContain('logout');
  });

  it('ensures OnboardingPipeline dragStart invokes dataTransfer.setData', () => {
    const pipelineSrc = fs.readFileSync('src/components/pipeline/OnboardingPipeline.tsx', 'utf8');

    expect(pipelineSrc).toContain('dataTransfer.setData');
  });
});

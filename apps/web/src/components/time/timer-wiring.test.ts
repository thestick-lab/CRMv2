import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

/**
 * The timer touches four surfaces that must stay wired together: the provider
 * above the shell, the topbar chip, the task detail panel and the client
 * record's `+ Add Action`. Source assertions pin those seams the way the rest
 * of the app's wiring tests do — the behaviour itself is covered by
 * `billing.test.ts` and the store's time-entry reducer tests.
 */
describe('timer wiring', () => {
  it('mounts the timer provider above the shell and the chip inside the topbar', () => {
    const appSource = fs.readFileSync('src/App.tsx', 'utf8');
    expect(appSource).toContain('TimerProvider');
    expect(appSource.indexOf('<TimerProvider>')).toBeLessThan(appSource.indexOf('<Layout'));

    const topbarSource = fs.readFileSync('src/components/layout/Topbar.tsx', 'utf8');
    expect(topbarSource).toContain('TimerBar');
    expect(topbarSource).toContain('<TimerBar />');
  });

  it('routes `+ New → Log time` to the entry sheet instead of a dead view', () => {
    const layoutSource = fs.readFileSync('src/components/layout/Layout.tsx', 'utf8');
    expect(layoutSource).toContain("import { useTimer } from '@/components/time/timer-context'");
    expect(layoutSource).toContain('onLogTime={openEntrySheet}');
  });

  it('starts the timer from the task detail panel and the client record', () => {
    const panelSource = fs.readFileSync('src/components/deadlines/TaskDetailPanel.tsx', 'utf8');
    expect(panelSource).toContain('startTimer({');
    expect(panelSource).toContain('serviceCode: task.service');
    expect(panelSource).toContain('taskId: task.id');
    expect(panelSource).toContain('data-testid="task-start-timer"');
    expect(panelSource).toContain('data-testid="task-timer-stop"');

    const clientSource = fs.readFileSync('src/components/client-show/ClientShowView.tsx', 'utf8');
    expect(clientSource).toContain('startTimer({ clientCode: client.code })');
  });

  it('exposes running and paused chip states with pause and stop controls', () => {
    const barSource = fs.readFileSync('src/components/time/TimerBar.tsx', 'utf8');
    expect(barSource).toContain('data-testid="timer-chip"');
    expect(barSource).toContain("data-state={session.paused ? 'paused' : 'running'}");
    expect(barSource).toContain('aria-label={session.paused ? \'Resume timer\' : \'Pause timer\'}');
    expect(barSource).toContain('aria-label="Stop timer"');
  });
});

import { Pause, Play, Square } from 'lucide-react';
import { usePracticeStore } from '@/context/PracticeStoreContext';
import { cn } from '@/lib/utils';
import { formatElapsed, useTimer } from './timer-context';
import { TimeEntrySheet } from './TimeEntrySheet';

/* ---------------------------------------------------------------------------
 * Topbar running-timer chip. It only exists while a session is running, so the
 * practice always sees the client and elapsed time of work in progress; pause
 * freezes the clock, stop hands the rounded entry to the review sheet.
 * ------------------------------------------------------------------------- */

export function TimerBar() {
  const { clients } = usePracticeStore();
  const {
    session,
    elapsedMs,
    pauseTimer,
    resumeTimer,
    stopTimer,
    sheet,
    closeEntrySheet,
    saveEntry,
    deleteEntry,
  } = useTimer();

  const client = session ? clients.find((candidate) => candidate.code === session.clientCode) : undefined;
  const clientName = client?.name ?? session?.clientCode;

  return (
    <>
      {session && (
        <div
          data-testid="timer-chip"
          data-state={session.paused ? 'paused' : 'running'}
          role="group"
          aria-label={`Running timer for ${clientName}`}
          className={cn(
            'flex h-7 max-w-[15rem] items-center gap-1.5 rounded-md border px-1.5 text-[11px]',
            session.paused
              ? 'border-border bg-muted/40'
              : 'border-[#c4161c]/30 bg-[#c4161c]/5'
          )}
        >
          <span
            aria-hidden="true"
            className={cn(
              'h-1.5 w-1.5 shrink-0 rounded-full',
              session.paused
                ? 'bg-muted-foreground/60'
                : 'bg-[#c4161c] motion-safe:animate-pulse'
            )}
          />
          <span className="min-w-0 truncate font-medium text-foreground" title={clientName}>
            {clientName}
          </span>
          <span
            data-testid="timer-elapsed"
            className="shrink-0 font-mono tabular-nums text-foreground"
            title="Elapsed time on this entry"
          >
            {formatElapsed(elapsedMs)}
          </span>
          {session.paused && (
            <span className="shrink-0 font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
              Paused
            </span>
          )}
          <span className="ml-0.5 flex shrink-0 items-center gap-0.5 border-l border-border pl-1">
            <button
              type="button"
              onClick={session.paused ? resumeTimer : pauseTimer}
              aria-label={session.paused ? 'Resume timer' : 'Pause timer'}
              title={session.paused ? 'Resume timer' : 'Pause timer'}
              className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {session.paused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
            </button>
            <button
              type="button"
              onClick={stopTimer}
              aria-label="Stop timer"
              title="Stop timer and review the entry"
              className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-[#c4161c]"
            >
              <Square className="h-3 w-3" />
            </button>
          </span>
        </div>
      )}

      {sheet && (
        <TimeEntrySheet
          mode={sheet.mode}
          entry={sheet.entry}
          onClose={closeEntrySheet}
          onSave={saveEntry}
          onDelete={deleteEntry}
        />
      )}
    </>
  );
}

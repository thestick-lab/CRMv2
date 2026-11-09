import * as React from 'react';
import type { ServiceCode } from 'fdoncall-practice/domain/types';
import { usePracticeStore, type TimeEntry } from '@/context/PracticeStoreContext';
import { roundToQuarterMinutes } from '@/lib/billing';

/* ---------------------------------------------------------------------------
 * Running timer + entry-capture sheet.
 *
 * The running timer is deliberately not a persisted `TimeEntry`: a live
 * session carries pause bookkeeping the entry model does not, and a browser
 * reload must never resurrect a half-finished timesheet row. Stopping the
 * timer builds the draft entry (rounded to 0.25h, minimum 15 minutes), opens
 * the review sheet, and only "Save entry" writes it through the store actions.
 * ------------------------------------------------------------------------- */

export interface TimerTarget {
  clientCode: string;
  serviceCode?: ServiceCode;
  taskId?: string;
  /** Prefilled description; left empty when the call site cannot name the work. */
  description?: string;
}

interface TimerSession {
  target: TimerTarget;
  staffUserId: string;
  /** ISO timestamp of the first segment start. */
  startedAt: string;
  /** Milliseconds of completed (unpaused) segments. */
  accumulatedMs: number;
  /** Segment start while running; `null` while paused. */
  segmentStartedAt: string | null;
}

export interface ActiveTimer {
  clientCode: string;
  serviceCode?: ServiceCode;
  taskId?: string;
  startedAt: string;
  paused: boolean;
}

export interface EntrySheetState {
  /** `new` saves through ADD_TIME_ENTRY, `existing` through UPDATE_TIME_ENTRY. */
  mode: 'new' | 'existing';
  entry: TimeEntry;
}

export interface TimerContextValue {
  session: ActiveTimer | null;
  /** Worked milliseconds of the running session, when unpaused it ticks. */
  elapsedMs: number;
  startTimer: (target: TimerTarget) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  stopTimer: () => void;
  /** Open a blank manual entry, defaulting to the last hour. */
  openEntrySheet: () => void;
  editEntry: (entry: TimeEntry) => void;
  closeEntrySheet: () => void;
  sheet: EntrySheetState | null;
  saveEntry: (entry: TimeEntry) => void;
  deleteEntry: (id: string) => void;
}

/** `H:MM:SS` elapsed label shared by the topbar chip and the task panel. */
export function formatElapsed(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

const TimerContext = React.createContext<TimerContextValue | null>(null);

function defaultEntry(staffUserId: string): TimeEntry {
  const endedAt = new Date();
  const startedAt = new Date(endedAt.getTime() - 60 * 60_000);
  return {
    id: `time-${Date.now()}`,
    clientCode: '',
    staffUserId,
    startedAt: startedAt.toISOString(),
    endedAt: endedAt.toISOString(),
    durationMinutes: 60,
    roundedMinutes: 60,
    billable: true,
    description: '',
    createdAt: endedAt.toISOString(),
  };
}

export function TimerProvider({ children }: { children: React.ReactNode }) {
  const { currentUser, addTimeEntry, updateTimeEntry, deleteTimeEntry } = usePracticeStore();
  const [session, setSession] = React.useState<TimerSession | null>(null);
  const [elapsedMs, setElapsedMs] = React.useState(0);
  const [sheet, setSheet] = React.useState<EntrySheetState | null>(null);
  const entrySequence = React.useRef(0);

  // Tick the elapsed clock once a second while a segment is running.
  React.useEffect(() => {
    if (!session) {
      setElapsedMs(0);
      return;
    }

    const compute = () => {
      const runningMs = session.segmentStartedAt
        ? Math.max(0, Date.now() - Date.parse(session.segmentStartedAt))
        : 0;
      setElapsedMs(session.accumulatedMs + runningMs);
    };

    compute();
    if (!session.segmentStartedAt) return;
    const ticker = window.setInterval(compute, 1000);
    return () => window.clearInterval(ticker);
  }, [session]);

  const startTimer = React.useCallback(
    (target: TimerTarget) => {
      setSession((current) => {
        // One timer at a time: an accidental second start never discards the
        // running session's elapsed time.
        if (current) return current;
        const startedAt = new Date().toISOString();
        return {
          target,
          staffUserId: currentUser.id,
          startedAt,
          accumulatedMs: 0,
          segmentStartedAt: startedAt,
        };
      });
    },
    [currentUser.id]
  );

  const pauseTimer = React.useCallback(() => {
    setSession((current) => {
      if (!current || !current.segmentStartedAt) return current;
      const runningMs = Math.max(0, Date.now() - Date.parse(current.segmentStartedAt));
      return {
        ...current,
        accumulatedMs: current.accumulatedMs + runningMs,
        segmentStartedAt: null,
      };
    });
  }, []);

  const resumeTimer = React.useCallback(() => {
    setSession((current) => {
      if (!current || current.segmentStartedAt) return current;
      return { ...current, segmentStartedAt: new Date().toISOString() };
    });
  }, []);

  const stopTimer = React.useCallback(() => {
    if (!session) return;

    const stoppedAt = new Date();
    const runningMs = session.segmentStartedAt
      ? Math.max(0, stoppedAt.getTime() - Date.parse(session.segmentStartedAt))
      : 0;
    const workedMs = session.accumulatedMs + runningMs;
    // Wall-clock worked time, pauses excluded; the rounding rule is applied
    // here so the review sheet opens on the billable figure.
    const durationMinutes = Math.max(0, Math.round(workedMs / 60_000));
    entrySequence.current += 1;

    setSheet({
      mode: 'new',
      entry: {
        id: `time-${stoppedAt.getTime()}-${entrySequence.current}`,
        clientCode: session.target.clientCode,
        serviceCode: session.target.serviceCode,
        taskId: session.target.taskId,
        staffUserId: session.staffUserId,
        startedAt: session.startedAt,
        endedAt: stoppedAt.toISOString(),
        durationMinutes,
        roundedMinutes: roundToQuarterMinutes(durationMinutes),
        billable: true,
        description: session.target.description ?? '',
        createdAt: stoppedAt.toISOString(),
      },
    });
    setSession(null);
  }, [session]);

  const openEntrySheet = React.useCallback(() => {
    setSheet({ mode: 'new', entry: defaultEntry(currentUser.id) });
  }, [currentUser.id]);

  const editEntry = React.useCallback((entry: TimeEntry) => {
    setSheet({ mode: 'existing', entry });
  }, []);

  const closeEntrySheet = React.useCallback(() => {
    setSheet(null);
  }, []);

  const saveEntry = React.useCallback(
    (entry: TimeEntry) => {
      if (sheet?.mode === 'existing') {
        updateTimeEntry(entry.id, {
          clientCode: entry.clientCode,
          serviceCode: entry.serviceCode,
          taskId: entry.taskId,
          startedAt: entry.startedAt,
          endedAt: entry.endedAt,
          durationMinutes: entry.durationMinutes,
          roundedMinutes: entry.roundedMinutes,
          billable: entry.billable,
          description: entry.description,
        });
      } else {
        addTimeEntry(entry);
      }
      setSheet(null);
    },
    [sheet?.mode, updateTimeEntry, addTimeEntry]
  );

  const deleteEntry = React.useCallback(
    (id: string) => {
      deleteTimeEntry(id);
      setSheet(null);
    },
    [deleteTimeEntry]
  );

  const activeSession = React.useMemo<ActiveTimer | null>(
    () =>
      session
        ? {
            clientCode: session.target.clientCode,
            serviceCode: session.target.serviceCode,
            taskId: session.target.taskId,
            startedAt: session.startedAt,
            paused: session.segmentStartedAt === null,
          }
        : null,
    [session]
  );

  const value = React.useMemo<TimerContextValue>(
    () => ({
      session: activeSession,
      elapsedMs,
      startTimer,
      pauseTimer,
      resumeTimer,
      stopTimer,
      openEntrySheet,
      editEntry,
      closeEntrySheet,
      sheet,
      saveEntry,
      deleteEntry,
    }),
    [
      activeSession,
      elapsedMs,
      startTimer,
      pauseTimer,
      resumeTimer,
      stopTimer,
      openEntrySheet,
      editEntry,
      closeEntrySheet,
      sheet,
      saveEntry,
      deleteEntry,
    ]
  );

  return <TimerContext.Provider value={value}>{children}</TimerContext.Provider>;
}

export function useTimer(): TimerContextValue {
  const context = React.useContext(TimerContext);
  if (!context) {
    throw new Error('useTimer must be used within a TimerProvider');
  }
  return context;
}

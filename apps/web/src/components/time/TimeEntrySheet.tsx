import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import type { ServiceCode } from 'fdoncall-practice/domain/types';
import { SERVICE_TYPES } from 'fdoncall-practice/domain/catalogue';
import { defaultServices } from 'fdoncall-practice/domain/rules';
import { usePracticeStore, type TimeEntry } from '@/context/PracticeStoreContext';
import { entryDurationMinutes, formatHours, roundToQuarterMinutes } from '@/lib/billing';
import { Button } from '@/components/ui/button';
import { Clock, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

/* ---------------------------------------------------------------------------
 * Entry capture sheet: the review step after a timer stops, the manual entry
 * form behind `+ New → Log time`, and the edit form for a stored entry.
 *
 * Rounding is applied when the timer stops and stays editable here: the
 * rounded duration field is the billable figure that will reach the timesheet,
 * the report and (via the retainer split) the invoice.
 * ------------------------------------------------------------------------- */

export interface TimeEntrySheetProps {
  mode: 'new' | 'existing';
  entry: TimeEntry;
  onClose: () => void;
  onSave: (entry: TimeEntry) => void;
  onDelete?: (id: string) => void;
}

const FIELD_CLASS =
  'h-9 w-full rounded-lg border border-border bg-card px-3 font-mono text-[11px] text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus-visible:border-[#c4161c]/60 focus-visible:ring-1 focus-visible:ring-[#c4161c]/40';

const LABEL_CLASS =
  'text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground';

function localInputValue(iso?: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function localInputToIso(value: string): string | null {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? null : new Date(time).toISOString();
}

const SERVICE_SHORT = new Map(SERVICE_TYPES.map((service) => [service.code, service.short]));
const SERVICE_FULL = new Map(SERVICE_TYPES.map((service) => [service.code, service.name]));

export function TimeEntrySheet({ mode, entry, onClose, onSave, onDelete }: TimeEntrySheetProps) {
  const { clients } = usePracticeStore();

  const [clientCode, setClientCode] = React.useState(entry.clientCode);
  const [serviceCode, setServiceCode] = React.useState<ServiceCode | ''>(entry.serviceCode ?? '');
  const [startedAt, setStartedAt] = React.useState(localInputValue(entry.startedAt));
  const [endedAt, setEndedAt] = React.useState(
    localInputValue(entry.endedAt ?? entry.startedAt)
  );
  const [roundedMinutes, setRoundedMinutes] = React.useState(entry.roundedMinutes);
  const [billable, setBillable] = React.useState(entry.billable);
  const [description, setDescription] = React.useState(entry.description);
  const [timesEdited, setTimesEdited] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  const linkedToTask = Boolean(entry.taskId);
  const client = clients.find((candidate) => candidate.code === clientCode);
  const startedIso = localInputToIso(startedAt);
  const endedIso = localInputToIso(endedAt);
  const workedMinutes =
    startedIso && endedIso ? entryDurationMinutes(startedIso, endedIso) : 0;
  // A timer stopped inside its first minute still yields a valid entry: the
  // quarter-hour floor bills it as 0.25h. Only a reversed pair is invalid.
  const endBeforeStart =
    startedIso && endedIso ? Date.parse(endedIso) < Date.parse(startedIso) : false;

  const serviceOptions = React.useMemo(() => {
    if (!client) return [] as ServiceCode[];
    const inScope = defaultServices(client);
    return serviceCode && !inScope.includes(serviceCode)
      ? [serviceCode, ...inScope]
      : inScope;
  }, [client, serviceCode]);

  const changeTimestamp = (which: 'start' | 'end', value: string) => {
    setTimesEdited(true);
    const nextStart = which === 'start' ? value : startedAt;
    const nextEnd = which === 'end' ? value : endedAt;
    if (which === 'start') setStartedAt(value);
    else setEndedAt(value);

    const startIso = localInputToIso(nextStart);
    const endIso = localInputToIso(nextEnd);
    if (startIso && endIso) {
      // The timestamps are the source of truth; rounding follows them until
      // the user edits the rounded field itself.
      setRoundedMinutes(roundToQuarterMinutes(entryDurationMinutes(startIso, endIso)));
    }
  };

  const changeClient = (code: string) => {
    setClientCode(code);
    const nextClient = clients.find((candidate) => candidate.code === code);
    if (serviceCode && nextClient && !defaultServices(nextClient).includes(serviceCode)) {
      setServiceCode('');
    }
  };

  const problems: string[] = [];
  if (!clientCode) problems.push('Select the client this work was for.');
  if (problems.length === 0 && (!startedIso || !endedIso)) {
    problems.push('Enter a start and end time.');
  } else if (problems.length === 0 && endBeforeStart) {
    problems.push('The end time must be after the start time.');
  }
  if (!description.trim()) problems.push('Describe the work so the entry is self-explanatory.');
  const canSave = problems.length === 0;

  const handleSave = (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSave || !startedIso || !endedIso) return;
    // The datetime-local field shows minutes; a timer stopped a few seconds in
    // keeps its exact timestamps unless the user actually edited them.
    const savedStart = timesEdited ? startedIso : entry.startedAt;
    const savedEnd = timesEdited ? endedIso : (entry.endedAt ?? endedIso);
    const savedDuration = timesEdited ? workedMinutes : entry.durationMinutes;
    onSave({
      ...entry,
      clientCode,
      serviceCode: serviceCode || undefined,
      startedAt: savedStart,
      endedAt: savedEnd,
      durationMinutes: savedDuration,
      // The sheet owns its own validation, and the billable figure always
      // lands on a quarter hour even if a non-quarter value was typed.
      roundedMinutes: roundToQuarterMinutes(
        Number.isFinite(roundedMinutes) ? roundedMinutes : savedDuration
      ),
      billable,
      description: description.trim(),
    });
  };

  return (
    <DialogPrimitive.Root open onOpenChange={(open) => !open && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-xs" />
        <DialogPrimitive.Content
          data-testid="time-entry-sheet"
          data-mode={mode}
          className="fixed left-1/2 top-1/2 z-[60] max-h-[90vh] w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-border bg-card shadow-2xl outline-none"
        >
          <header className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#c4161c]/20 bg-[#c4161c]/10 text-[#c4161c]">
                <Clock className="h-4 w-4" />
              </span>
              <div className="space-y-0.5">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  Time entry
                </p>
                <DialogPrimitive.Title className="font-serif text-lg leading-tight text-foreground">
                  {mode === 'existing' ? 'Edit time entry' : 'Review time entry'}
                </DialogPrimitive.Title>
                <DialogPrimitive.Description className="max-w-xs text-xs leading-relaxed text-muted-foreground">
                  Rounded to the nearest 0.25h, minimum 15 minutes. Check the duration and
                  description before saving.
                </DialogPrimitive.Description>
              </div>
            </div>
            <DialogPrimitive.Close asChild>
              <button
                type="button"
                aria-label="Close time entry sheet"
                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </DialogPrimitive.Close>
          </header>

          <form onSubmit={handleSave} noValidate className="space-y-4 px-5 py-4">
            <div className="grid grid-cols-2 gap-3">
              <label className="col-span-2 space-y-1 sm:col-span-1">
                <span className={LABEL_CLASS}>Client</span>
                <select
                  data-testid="entry-client"
                  value={clientCode}
                  onChange={(event) => changeClient(event.target.value)}
                  disabled={linkedToTask}
                  className={cn(FIELD_CLASS, 'appearance-none')}
                >
                  <option value="">Select client</option>
                  {clients.map((candidate) => (
                    <option key={candidate.code} value={candidate.code}>
                      {candidate.name} · {candidate.code}
                    </option>
                  ))}
                </select>
              </label>

              <label className="col-span-2 space-y-1 sm:col-span-1">
                <span className={LABEL_CLASS}>Service</span>
                <select
                  data-testid="entry-service"
                  value={serviceCode}
                  onChange={(event) => setServiceCode(event.target.value as ServiceCode | '')}
                  disabled={!client}
                  className={cn(FIELD_CLASS, 'appearance-none')}
                >
                  <option value="">No service</option>
                  {serviceOptions.map((code) => (
                    <option key={code} value={code} title={SERVICE_FULL.get(code)}>
                      {SERVICE_SHORT.get(code) ?? code}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1">
                <span className={LABEL_CLASS}>Started</span>
                <input
                  data-testid="entry-start"
                  type="datetime-local"
                  step={1}
                  value={startedAt}
                  onChange={(event) => changeTimestamp('start', event.target.value)}
                  className={FIELD_CLASS}
                />
              </label>

              <label className="space-y-1">
                <span className={LABEL_CLASS}>Ended</span>
                <input
                  data-testid="entry-end"
                  type="datetime-local"
                  step={1}
                  value={endedAt}
                  onChange={(event) => changeTimestamp('end', event.target.value)}
                  className={FIELD_CLASS}
                />
              </label>
            </div>

            {linkedToTask && (
              <p className="text-[11px] text-muted-foreground">
                Linked to a deadline task — the client stays fixed. Change the task or log a
                separate entry for another client.
              </p>
            )}

            <div className="flex flex-wrap items-end justify-between gap-3 rounded-lg border border-border bg-muted/20 px-3 py-2.5">
              <div className="space-y-0.5">
                <p className={LABEL_CLASS}>Worked</p>
                <p data-testid="entry-worked" className="font-mono text-xs tabular-nums text-foreground">
                  {workedMinutes < 1 ? 'Under 1' : workedMinutes} min
                  <span className="ml-2 text-muted-foreground">
                    · bills as {formatHours(roundedMinutes)}
                  </span>
                </p>
              </div>
              <label className="flex items-center gap-1.5">
                <span className={LABEL_CLASS}>Rounded</span>
                <input
                  data-testid="entry-rounded"
                  type="number"
                  min={15}
                  value={roundedMinutes}
                  onFocus={(event) => event.currentTarget.select()}
                  onChange={(event) => {
                    const next = Number(event.target.value);
                    setRoundedMinutes(Number.isFinite(next) ? Math.max(15, next) : 15);
                  }}
                  className={cn(FIELD_CLASS, 'w-20 text-right tabular-nums')}
                />
                <span className="text-[10px] text-muted-foreground">min</span>
              </label>
            </div>

            <label className="flex items-center gap-2 text-xs text-foreground">
              <input
                data-testid="entry-billable"
                type="checkbox"
                checked={billable}
                onChange={(event) => setBillable(event.target.checked)}
                className="h-3.5 w-3.5 accent-[#c4161c]"
              />
              Billable time
            </label>

            <label className="block space-y-1">
              <span className={LABEL_CLASS}>Description</span>
              <textarea
                data-testid="entry-description"
                rows={2}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="e.g. VAT201 2026-09 — reconciliation and submission"
                className={cn(FIELD_CLASS, 'h-auto resize-none py-2 leading-relaxed')}
              />
            </label>

            {problems.length > 0 && (
              <ul className="space-y-0.5 text-[11px] text-[#c4161c] dark:text-[#f87171]">
                {problems.map((problem) => (
                  <li key={problem}>{problem}</li>
                ))}
              </ul>
            )}

            <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
              {mode === 'existing' && onDelete ? (
                confirmDelete ? (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-muted-foreground">Delete this entry?</span>
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      data-testid="entry-delete-confirm"
                      onClick={() => onDelete(entry.id)}
                    >
                      Delete
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setConfirmDelete(false)}
                    >
                      Keep
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    data-testid="entry-delete"
                    onClick={() => setConfirmDelete(true)}
                    className="gap-1.5 text-muted-foreground hover:text-[#c4161c]"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </Button>
                )
              ) : (
                <span className="text-[10px] text-muted-foreground">
                  {formatHours(roundedMinutes)} billable
                </span>
              )}

              <div className="flex items-center gap-2">
                <Button type="button" size="sm" variant="outline" onClick={onClose}>
                  {mode === 'existing' ? 'Cancel' : 'Discard'}
                </Button>
                <Button type="submit" size="sm" data-testid="entry-save" disabled={!canSave}>
                  Save entry
                </Button>
              </div>
            </footer>
          </form>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

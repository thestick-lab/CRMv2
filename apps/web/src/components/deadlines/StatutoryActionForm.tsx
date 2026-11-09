import * as React from 'react';
import { AlertTriangle, Calendar, ExternalLink, ShieldCheck } from 'lucide-react';
import type { PracticeTaskItem } from './practice-tasks';
import { usePracticeStore } from '@/context/PracticeStoreContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  WORKFLOW_STATUSES,
  canSignOffPartnerGate,
  normalizeWorkflowStatus,
  validateStatutorySubmission,
  type WorkflowStatus,
} from '@/lib/workflow';
import { cn } from '@/lib/utils';

export interface StatutoryActionFormProps {
  task: PracticeTaskItem;
  initialStatus?: WorkflowStatus;
  onClose?: () => void;
  onSelectClient?: (clientCode: string) => void;
  /** Tighter spacing for the docked detail panel. */
  compact?: boolean;
}

/**
 * The statutory action controls shared by the modal dialog and the docked
 * task detail panel. Validation and partner-gate rules live in
 * `@/lib/workflow` and remain the single authority for submissions.
 */
export function StatutoryActionForm({
  task,
  initialStatus,
  onClose,
  onSelectClient,
  compact,
}: StatutoryActionFormProps) {
  const { currentUser, taskStatusOverrides, updateTaskStatus } = usePracticeStore();
  const override = taskStatusOverrides[task.id];

  const [status, setStatus] = React.useState<WorkflowStatus>('Not Started');
  const [partnerSignOff, setPartnerSignOff] = React.useState(false);
  const [sarsReference, setSarsReference] = React.useState('');
  const [submissionDate, setSubmissionDate] = React.useState('');
  const [ita34Notice, setIta34Notice] = React.useState(false);
  const [irp6Outcome, setIrp6Outcome] = React.useState<'nil' | 'payable'>('nil');
  const [validationError, setValidationError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const rawStatus = initialStatus ?? override?.status ?? task.status;
    setStatus(
      !rawStatus || (rawStatus as string) === 'Not started'
        ? 'Not Started'
        : normalizeWorkflowStatus(rawStatus as string)
    );
    setPartnerSignOff(override?.partnerSignOff || false);
    setSarsReference(override?.sarsReference || '');
    setSubmissionDate(override?.submissionDate || new Date().toISOString().split('T')[0]);
    setIta34Notice(false);
    setIrp6Outcome(override?.irp6Outcome ?? 'nil');
    setValidationError(null);
  }, [task, override, initialStatus]);

  const isPartner = canSignOffPartnerGate(currentUser.role);
  const requiresPartnerGate =
    task.needsPartnerReview ||
    task.service === 'AFS' ||
    task.service === 'ITR14' ||
    task.service === 'IRP6';

  const handleSave = (event: React.FormEvent) => {
    event.preventDefault();

    const validation = validateStatutorySubmission({
      status,
      sarsReference,
      partnerSignOff,
      needsPartnerReview: requiresPartnerGate,
    });

    if (!validation.valid) {
      if (validation.error === 'PARTNER_REVIEW_REQUIRED') {
        setValidationError(
          'PARTNER_REVIEW_REQUIRED: Partner signature (Erik / Wouter) is required before final SARS submission.'
        );
      } else if (validation.error === 'SARS_REFERENCE_REQUIRED') {
        setValidationError(
          'SARS_REFERENCE_REQUIRED: Please enter the SARS eFiling confirmation number.'
        );
      }
      return;
    }

    updateTaskStatus(task.id, status, {
      sarsReference: sarsReference.trim() || undefined,
      partnerSignOff,
      approvedBy: partnerSignOff ? override?.approvedBy || currentUser.name : undefined,
      submissionDate,
      service: task.service,
      clientName: task.clientName,
      period: task.period,
      irp6Outcome: task.service === 'IRP6' ? irp6Outcome : undefined,
    });

    onClose?.();
  };

  return (
    <form onSubmit={handleSave} className={cn('text-xs', compact ? 'space-y-3.5' : 'space-y-4')}>
      {/* Due date / responsible summary */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/40 p-3 font-mono text-[11px]">
        <div className="flex items-center gap-2">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-muted-foreground">Statutory due</span>
          <span className="font-semibold text-foreground">{task.due || 'Ad-hoc'}</span>
          {task.dueNote && (
            <span className="text-[10px] font-normal text-amber-600 dark:text-amber-400">
              ({task.dueNote})
            </span>
          )}
        </div>
        <Badge variant="secondary" className="text-[10px]">
          {task.staffName}
        </Badge>
      </div>

      {validationError && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-2.5 text-[11px] text-red-600 dark:text-red-400"
        >
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span className="leading-relaxed">{validationError}</span>
        </div>
      )}

      <div>
        <p className="mb-1.5 block font-medium text-foreground">Workflow status</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {WORKFLOW_STATUSES.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => {
                setStatus(option);
                setValidationError(null);
              }}
              aria-pressed={status === option}
              className={cn(
                'rounded-lg border p-2 text-center text-[11px] font-medium leading-tight transition-colors',
                status === option
                  ? 'border-[#c4161c] bg-[#c4161c]/10 font-semibold text-[#c4161c] dark:text-[#f87171]'
                  : 'border-border bg-background text-muted-foreground hover:text-foreground'
              )}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      {task.service === 'IRP6' && (
        <div>
          <p className="mb-1.5 block font-medium text-foreground">IRP6 outcome</p>
          <div className="flex items-center gap-2">
            {(['nil', 'payable'] as const).map((outcome) => (
              <button
                key={outcome}
                type="button"
                onClick={() => setIrp6Outcome(outcome)}
                aria-pressed={irp6Outcome === outcome}
                className={cn(
                  'flex-1 rounded-lg border px-3 py-1.5 text-[11px] font-medium capitalize transition-colors',
                  irp6Outcome === outcome
                    ? 'border-[#c4161c] bg-[#c4161c]/10 text-[#c4161c] dark:text-[#f87171]'
                    : 'border-border bg-background text-muted-foreground hover:text-foreground'
                )}
              >
                {outcome === 'nil' ? 'Nil return' : 'Payment due'}
              </button>
            ))}
          </div>
          <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
            A payable provisional return needs partner review before it can be approved.
          </p>
        </div>
      )}

      {requiresPartnerGate && (
        <div className="space-y-2.5 rounded-lg border border-border bg-card/60 p-3.5">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <ShieldCheck className="h-4 w-4 text-amber-500" />
              Partner review gate
            </span>
            <Badge variant="outline" className="font-mono text-[10px]">
              CA(SA) required
            </Badge>
          </div>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Governance gate mandated by SAICA &amp; SARS eFiling practice standards prior to
            submission.
          </p>
          <div className="flex items-center gap-2 pt-0.5">
            <input
              type="checkbox"
              id={`partner-signoff-${task.id}`}
              checked={partnerSignOff}
              disabled={!isPartner}
              onChange={(event) => {
                setPartnerSignOff(event.target.checked);
                setValidationError(null);
              }}
              className="h-4 w-4 cursor-pointer rounded border-border text-[#c4161c] focus:ring-[#c4161c] disabled:cursor-not-allowed"
            />
            <label
              htmlFor={`partner-signoff-${task.id}`}
              className={cn(
                'cursor-pointer select-none text-[11px]',
                !isPartner && 'cursor-not-allowed text-muted-foreground'
              )}
            >
              {isPartner ? (
                <span className="font-medium text-foreground">
                  Sign off as {currentUser.name} (Partner)
                </span>
              ) : (
                <span>
                  <span className="font-medium text-amber-600 dark:text-amber-400">Locked:</span>{' '}
                  only a Partner can sign off (signed in as {currentUser.name},{' '}
                  {currentUser.role})
                </span>
              )}
            </label>
          </div>
        </div>
      )}

      <div className="space-y-3">
        <div>
          <label
            htmlFor={`sars-reference-${task.id}`}
            className="mb-1 block font-medium text-foreground"
          >
            SARS eFiling confirmation / reference
          </label>
          <input
            id={`sars-reference-${task.id}`}
            type="text"
            placeholder="e.g. SARS-2026-991204"
            value={sarsReference}
            onChange={(event) => {
              setSarsReference(event.target.value);
              setValidationError(null);
            }}
            className="w-full rounded-lg border border-border bg-background px-3 py-1.5 font-mono text-foreground"
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label
              htmlFor={`submission-date-${task.id}`}
              className="mb-1 block font-medium text-foreground"
            >
              Submission date
            </label>
            <input
              id={`submission-date-${task.id}`}
              type="date"
              value={submissionDate}
              onChange={(event) => setSubmissionDate(event.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-1.5 font-mono text-foreground"
            />
          </div>

          <div className="flex items-center gap-2 sm:pt-6">
            <input
              type="checkbox"
              id={`ita34-notice-${task.id}`}
              checked={ita34Notice}
              onChange={(event) => setIta34Notice(event.target.checked)}
              className="h-4 w-4 cursor-pointer rounded border-border text-[#c4161c] focus:ring-[#c4161c]"
            />
            <label
              htmlFor={`ita34-notice-${task.id}`}
              className="cursor-pointer select-none text-[11px] text-foreground"
            >
              ITA34 notice of assessment issued
            </label>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
        {onSelectClient ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              onClose?.();
              onSelectClient(task.clientCode);
            }}
            className="flex items-center gap-1.5 text-xs"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Open client record
          </Button>
        ) : (
          <span />
        )}

        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => onClose?.()}>
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            className="bg-[#c4161c] text-white hover:bg-[#a51217]"
          >
            Save &amp; update status
          </Button>
        </div>
      </div>
    </form>
  );
}

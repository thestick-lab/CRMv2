import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import {
  AlertTriangle,
  Calendar,
  ExternalLink,
  ShieldCheck,
  X,
} from 'lucide-react';
import type { PracticeTaskItem } from './practice-tasks';
import { usePracticeStore } from '@/context/PracticeStoreContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export const WORKFLOW_STATUSES = [
  'Not Started',
  'In Progress',
  'Partner Review Gate',
  'Submitted',
] as const;

export type WorkflowStatus = (typeof WORKFLOW_STATUSES)[number];

export function canSignOffPartnerGate(userRole: string): boolean {
  return userRole === 'Partner';
}

export interface StatutoryValidationParams {
  status: string;
  sarsReference?: string;
  partnerSignOff?: boolean;
  needsPartnerReview?: boolean;
}

export function validateStatutorySubmission({
  status,
  sarsReference,
  partnerSignOff,
  needsPartnerReview,
}: StatutoryValidationParams): { valid: boolean; error?: string } {
  if (status === 'Submitted') {
    if (needsPartnerReview && !partnerSignOff) {
      return { valid: false, error: 'PARTNER_REVIEW_REQUIRED' };
    }
    if (!sarsReference || !sarsReference.trim()) {
      return { valid: false, error: 'SARS_REFERENCE_REQUIRED' };
    }
  }
  return { valid: true };
}

export interface StatutoryActionModalProps {
  task: PracticeTaskItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectClient?: (clientCode: string) => void;
}

export function StatutoryActionModal({
  task,
  open,
  onOpenChange,
  onSelectClient,
}: StatutoryActionModalProps) {
  const { currentUser, taskStatusOverrides, updateTaskStatus } = usePracticeStore();

  const override = task ? taskStatusOverrides[task.id] : undefined;

  const [status, setStatus] = React.useState<WorkflowStatus>('Not Started');
  const [partnerSignOff, setPartnerSignOff] = React.useState(false);
  const [sarsReference, setSarsReference] = React.useState('');
  const [submissionDate, setSubmissionDate] = React.useState('');
  const [ita34Notice, setIta34Notice] = React.useState(false);
  const [validationError, setValidationError] = React.useState<string | null>(null);

  // Sync state when task changes
  React.useEffect(() => {
    if (task) {
      const currentStatus = (override?.status as WorkflowStatus) || (task.status as WorkflowStatus) || 'Not Started';
      setStatus(currentStatus);
      setPartnerSignOff(override?.partnerSignOff || false);
      setSarsReference(override?.sarsReference || '');
      setSubmissionDate(override?.submissionDate || new Date().toISOString().split('T')[0]);
      setIta34Notice(false);
      setValidationError(null);
    }
  }, [task, override]);

  if (!task) return null;

  const isPartner = canSignOffPartnerGate(currentUser.role);
  const requiresPartnerGate = task.needsPartnerReview || task.service === 'AFS' || task.service === 'ITR14' || task.service === 'IRP6';

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

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
        setValidationError('SARS_REFERENCE_REQUIRED: Please enter the SARS eFiling confirmation number.');
      }
      return;
    }

    updateTaskStatus(task.id, status, {
      sarsReference: sarsReference.trim() || undefined,
      partnerSignOff,
      submissionDate,
    });

    onOpenChange(false);
  };

  const handleOpenClient = () => {
    onOpenChange(false);
    onSelectClient?.(task.clientCode);
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs animate-in fade-in-0" />
        <DialogPrimitive.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-card p-6 shadow-2xl animate-in fade-in-0 zoom-in-95 space-y-5">
          {/* Header */}
          <div className="flex items-start justify-between pb-3 border-b border-border">
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono text-xs text-primary border-primary/30 bg-primary/5">
                  {task.service}
                </Badge>
                <DialogPrimitive.Title className="text-base font-semibold text-foreground">
                  Statutory Filing Action
                </DialogPrimitive.Title>
              </div>
              <DialogPrimitive.Description className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                <span className="font-mono font-medium text-foreground">{task.clientCode}</span>
                <span>·</span>
                <span>{task.clientName}</span>
                <span>·</span>
                <span>Period {task.period}</span>
              </DialogPrimitive.Description>
            </div>

            <DialogPrimitive.Close asChild>
              <button className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </DialogPrimitive.Close>
          </div>

          <form onSubmit={handleSave} className="space-y-4 text-xs">
            {/* Task Info Pill */}
            <div className="p-3 rounded-lg bg-muted/40 border border-border/60 flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>Statutory Due Date:</span>
                <span className="font-semibold text-foreground">{task.due || 'Ad-hoc'}</span>
                {task.dueNote && (
                  <span className="text-[11px] text-amber-500 font-normal">({task.dueNote})</span>
                )}
              </div>
              <Badge variant="secondary" className="text-[10px]">
                {task.staffName}
              </Badge>
            </div>

            {/* Validation Error Banner */}
            {validationError && (
              <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span className="leading-relaxed">{validationError}</span>
              </div>
            )}

            {/* Status Selector */}
            <div>
              <label className="font-medium text-foreground block mb-1.5">
                Compliance Workflow Status
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {WORKFLOW_STATUSES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      setStatus(s);
                      setValidationError(null);
                    }}
                    className={cn(
                      'p-2 rounded-lg border text-xs font-medium text-center transition-colors',
                      status === s
                        ? 'border-primary bg-primary/10 text-primary font-semibold'
                        : 'border-border bg-background text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Partner Review Gate Section */}
            {requiresPartnerGate && (
              <div className="p-3.5 rounded-lg border border-border bg-card/60 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground flex items-center gap-1.5 text-xs">
                    <ShieldCheck className="h-4 w-4 text-amber-500" />
                    Partner Review Gate Sign-off
                  </span>
                  <Badge variant="outline" className="text-[10px] font-mono">
                    CA(SA) Required
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Governance gate mandated by SAICA &amp; SARS eFiling practice standards prior to submission.
                </p>

                <div className="pt-1 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="partner-signoff"
                    checked={partnerSignOff}
                    disabled={!isPartner}
                    onChange={(e) => {
                      setPartnerSignOff(e.target.checked);
                      setValidationError(null);
                    }}
                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer disabled:cursor-not-allowed"
                  />
                  <label
                    htmlFor="partner-signoff"
                    className={cn(
                      'text-xs cursor-pointer select-none',
                      !isPartner && 'text-muted-foreground cursor-not-allowed'
                    )}
                  >
                    {isPartner ? (
                      <span className="font-medium text-foreground">
                        Sign off as {currentUser.name} (Partner)
                      </span>
                    ) : (
                      <span>
                        <span className="text-amber-500 font-medium">Locked:</span> Only Partner role can sign off (logged in as {currentUser.name}, {currentUser.role})
                      </span>
                    )}
                  </label>
                </div>
              </div>
            )}

            {/* SARS Submission Details */}
            <div className="space-y-3 pt-1">
              <div>
                <label className="font-medium text-foreground block mb-1">
                  SARS eFiling Confirmation / Reference Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. SARS-2026-991204"
                  value={sarsReference}
                  onChange={(e) => {
                    setSarsReference(e.target.value);
                    setValidationError(null);
                  }}
                  className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-foreground font-mono"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-medium text-foreground block mb-1">Submission Date</label>
                  <input
                    type="date"
                    value={submissionDate}
                    onChange={(e) => setSubmissionDate(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-foreground font-mono"
                  />
                </div>

                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="ita34-notice"
                    checked={ita34Notice}
                    onChange={(e) => setIta34Notice(e.target.checked)}
                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
                  />
                  <label htmlFor="ita34-notice" className="text-xs text-foreground cursor-pointer select-none">
                    ITA34 Notice of Assessment Issued
                  </label>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-4 border-t border-border flex items-center justify-between gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleOpenClient}
                className="flex items-center gap-1.5 text-xs"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>Open Full Client Record</span>
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="bg-[#c4161c] hover:bg-[#a51217] text-white"
                >
                  Save &amp; Update Status
                </Button>
              </div>
            </div>
          </form>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

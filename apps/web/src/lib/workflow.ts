/**
 * Statutory workflow lanes shared by the deadlines board, the detail panel,
 * the statutory action modal and the store. Keeping the lane vocabulary here
 * (rather than inside a component) lets the store and pure logic import it
 * without reaching into the UI tree.
 */

export const WORKFLOW_STATUSES = [
  'Not Started',
  'In Progress',
  'Awaiting Client',
  'Partner Review Gate',
  'Approved (Ready to Lodge)',
  'Submitted',
] as const;

export type WorkflowStatus = (typeof WORKFLOW_STATUSES)[number];

export type WorkflowTone = 'neutral' | 'progress' | 'waiting' | 'warning' | 'ready' | 'done';

export interface WorkflowLane {
  status: WorkflowStatus;
  /** Header label, kept identical to the status so drag/keyboard targets read true. */
  label: string;
  tone: WorkflowTone;
  hint: string;
}

export const WORKFLOW_LANES: readonly WorkflowLane[] = [
  { status: 'Not Started', label: 'Not Started', tone: 'neutral', hint: 'Not yet picked up' },
  { status: 'In Progress', label: 'In Progress', tone: 'progress', hint: 'Being prepared' },
  {
    status: 'Awaiting Client',
    label: 'Awaiting Client',
    tone: 'waiting',
    hint: 'Waiting on the client for documents or answers',
  },
  {
    status: 'Partner Review Gate',
    label: 'Partner Review Gate',
    tone: 'warning',
    hint: 'Prepared and queued for CA(SA) review',
  },
  {
    status: 'Approved (Ready to Lodge)',
    label: 'Approved (Ready to Lodge)',
    tone: 'ready',
    hint: 'Partner signed off, ready for SARS / CIPC',
  },
  { status: 'Submitted', label: 'Submitted', tone: 'done', hint: 'Filed with SARS / CIPC' },
];

export function laneIndex(status: WorkflowStatus): number {
  return WORKFLOW_STATUSES.indexOf(status);
}

/**
 * Lanes a task may be set to. Only review-gated work can enter the
 * partner review gate, matching `canMoveStatus` for board moves.
 */
export function availableStatusOptions(needsPartnerReview: boolean): WorkflowStatus[] {
  return WORKFLOW_STATUSES.filter(
    (status) => status !== 'Partner Review Gate' || needsPartnerReview
  );
}

/** The partner review gate is practice rule, not matrix-controlled. */
export function canSignOffPartnerGate(userRole: string): boolean {
  return userRole === 'Partner';
}

/** Legacy/domain `TaskStatus` values normalised onto the six workflow lanes. */
export function normalizeWorkflowStatus(raw: string | undefined | null): WorkflowStatus {
  if (!raw) return 'Not Started';
  if (raw === 'Not started') return 'Not Started';
  if (raw === 'In progress') return 'In Progress';
  if (raw === 'Awaiting client' || raw === 'Awaiting Client') return 'Awaiting Client';
  if (raw === 'In review') return 'Partner Review Gate';
  if (raw === 'Done') return 'Submitted';
  if ((WORKFLOW_STATUSES as readonly string[]).includes(raw)) {
    return raw as WorkflowStatus;
  }
  return 'Not Started';
}

export interface WorkflowMoveContext {
  /** Whether this task requires partner review before approval/submission. */
  needsPartnerReview: boolean;
  /** Role of the person making the move — gates are partner-only. */
  actorRole: string;
}

/**
 * Legality shared by drag, hover-menu and keyboard moves on both boards.
 * Forward and backward moves between lanes are allowed, except:
 * - only review-gated work may enter the `Partner Review Gate` lane;
 * - leaving it for `Approved (Ready to Lodge)` or `Submitted` needs a Partner;
 * - a lane is never a move target of itself.
 */
export function canMoveStatus(
  from: WorkflowStatus,
  to: WorkflowStatus,
  ctx: WorkflowMoveContext
): boolean {
  if (from === to) return false;
  if (to === 'Partner Review Gate' && !ctx.needsPartnerReview) return false;

  const signOffLane = to === 'Approved (Ready to Lodge)' || to === 'Submitted';
  if (signOffLane && ctx.needsPartnerReview && !canSignOffPartnerGate(ctx.actorRole)) {
    return false;
  }
  return true;
}

/**
 * Metadata a lane move must write when it leaves the approval lanes.
 *
 * A partner signature authorises one approval only. Dragging a signed-off
 * return back into preparation invalidates it, so the move explicitly clears
 * the sign-off (the store enforces the same rule for every other writer).
 */
export function clearedApprovalMetadata(
  status: WorkflowStatus
): { partnerSignOff?: boolean; approvedBy?: string } {
  if (status === 'Approved (Ready to Lodge)' || status === 'Submitted') return {};
  return { partnerSignOff: false, approvedBy: undefined };
}

export interface StatutoryValidationParams {
  status: string;
  sarsReference?: string;
  partnerSignOff?: boolean;
  needsPartnerReview?: boolean;
}

/**
 * Authoritative submission validation. Semantics unchanged from the original
 * statutory action modal: partner sign-off precedes approval and submission,
 * and a SARS reference is mandatory on submission. Every other lane (including
 * `Awaiting Client`) passes through untouched.
 */
export function validateStatutorySubmission({
  status,
  sarsReference,
  partnerSignOff,
  needsPartnerReview,
}: StatutoryValidationParams): { valid: boolean; error?: string } {
  if (status === 'Approved (Ready to Lodge)') {
    if (needsPartnerReview && !partnerSignOff) {
      return { valid: false, error: 'PARTNER_REVIEW_REQUIRED' };
    }
  }
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

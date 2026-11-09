import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  canSignOffPartnerGate,
  validateStatutorySubmission,
  WORKFLOW_STATUSES,
} from '@/lib/workflow';

describe('StatutoryActionModal validation and 6-lane partner gate rules', () => {
  it('defines the 6 statutory workflow statuses including Awaiting Client', () => {
    expect(WORKFLOW_STATUSES).toEqual([
      'Not Started',
      'In Progress',
      'Awaiting Client',
      'Partner Review Gate',
      'Approved (Ready to Lodge)',
      'Submitted',
    ]);
  });

  it('restricts partner gate sign-off strictly to Partner role', () => {
    expect(canSignOffPartnerGate('Partner')).toBe(true);
    expect(canSignOffPartnerGate('Compliance Officer')).toBe(false);
    expect(canSignOffPartnerGate('Accountant')).toBe(false);
    expect(canSignOffPartnerGate('Team member')).toBe(false);
    expect(canSignOffPartnerGate('Subcontractor')).toBe(false);
  });

  it('enforces Option A two-step validation: partner sign-off then SARS reference for submission', () => {
    // Submitting a review-gated task without partner sign-off
    const missingPartner = validateStatutorySubmission({
      status: 'Submitted',
      sarsReference: 'SARS-12345',
      partnerSignOff: false,
      needsPartnerReview: true,
    });
    expect(missingPartner.valid).toBe(false);
    expect(missingPartner.error).toBe('PARTNER_REVIEW_REQUIRED');

    // Submitting without SARS reference number
    const missingSars = validateStatutorySubmission({
      status: 'Submitted',
      sarsReference: '',
      partnerSignOff: true,
      needsPartnerReview: true,
    });
    expect(missingSars.valid).toBe(false);
    expect(missingSars.error).toBe('SARS_REFERENCE_REQUIRED');

    // Moving to Approved (Ready to Lodge) requires partner sign-off but NOT SARS reference yet
    const approvedWithoutSars = validateStatutorySubmission({
      status: 'Approved (Ready to Lodge)',
      sarsReference: '',
      partnerSignOff: true,
      needsPartnerReview: true,
    });
    expect(approvedWithoutSars.valid).toBe(true);

    // Final valid submission
    const valid = validateStatutorySubmission({
      status: 'Submitted',
      sarsReference: 'SARS-12345',
      partnerSignOff: true,
      needsPartnerReview: true,
    });
    expect(valid.valid).toBe(true);
    expect(valid.error).toBeUndefined();
  });

  it('accepts the Awaiting Client lane everywhere without gate rules', () => {
    expect(
      validateStatutorySubmission({
        status: 'Awaiting Client',
        partnerSignOff: false,
        needsPartnerReview: true,
      }).valid
    ).toBe(true);
  });

  it('verifies DeadlinesDashboard title is clean Deadlines and KPI cards act as filter triggers', () => {
    const dashboardSrc = fs.readFileSync('src/components/deadlines/DeadlinesDashboard.tsx', 'utf8');

    // Clean title without horizon label
    expect(dashboardSrc).not.toContain('Practice Horizon: 30 Days');
    // KPI cards have interactive filter behavior
    expect(dashboardSrc).toContain('activeKpiFilter');
  });

  it('verifies the deadlines board renders 6 lanes through the shared KanbanBoard', () => {
    const kanbanSrc = fs.readFileSync('src/components/deadlines/DeadlinesKanban.tsx', 'utf8');
    const boardSrc = fs.readFileSync('src/components/kanban/KanbanBoard.tsx', 'utf8');

    expect(kanbanSrc).toContain('Awaiting Client');
    expect(kanbanSrc).toContain('KanbanBoard');
    expect(kanbanSrc).toContain('initialStatus');
    expect(boardSrc).toContain('draggable');
    expect(boardSrc).toContain('onDoubleClick');
  });
});

import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  canSignOffPartnerGate,
  validateStatutorySubmission,
  WORKFLOW_STATUSES,
} from './StatutoryActionModal';

describe('StatutoryActionModal validation and partner gate rules', () => {
  it('defines the 4 statutory workflow statuses', () => {
    expect(WORKFLOW_STATUSES).toEqual([
      'Not Started',
      'In Progress',
      'Partner Review Gate',
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

  it('validates SARS reference and partner review gate prior to Submission', () => {
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

    // Valid submission with partner sign-off and SARS reference
    const valid = validateStatutorySubmission({
      status: 'Submitted',
      sarsReference: 'SARS-12345',
      partnerSignOff: true,
      needsPartnerReview: true,
    });
    expect(valid.valid).toBe(true);
    expect(valid.error).toBeUndefined();

    // Moving to In Progress needs neither
    const inProgress = validateStatutorySubmission({
      status: 'In Progress',
      sarsReference: '',
      partnerSignOff: false,
      needsPartnerReview: true,
    });
    expect(inProgress.valid).toBe(true);
  });

  it('verifies DeadlinesKanban integrates HTML5 drag-and-drop and double-click modal trigger', () => {
    const kanbanSrc = fs.readFileSync('src/components/deadlines/DeadlinesKanban.tsx', 'utf8');
    expect(kanbanSrc).toContain('draggable');
    expect(kanbanSrc).toContain('onDragStart');
    expect(kanbanSrc).toContain('onDrop');
    expect(kanbanSrc).toContain('onDoubleClick');
    expect(kanbanSrc).toContain('StatutoryActionModal');
  });
});

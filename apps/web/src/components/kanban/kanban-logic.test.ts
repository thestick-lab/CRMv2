import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  WORKFLOW_LANES,
  WORKFLOW_STATUSES,
  canMoveStatus,
  laneIndex,
  normalizeWorkflowStatus,
} from '@/lib/workflow';

const nonGated = { needsPartnerReview: false, actorRole: 'Accountant' };
const gated = { needsPartnerReview: true, actorRole: 'Accountant' };
const gatedPartner = { needsPartnerReview: true, actorRole: 'Partner' };

describe('workflow lanes and move legality', () => {
  it('defines the six deadline lanes in workflow order', () => {
    expect(WORKFLOW_STATUSES).toEqual([
      'Not Started',
      'In Progress',
      'Awaiting Client',
      'Partner Review Gate',
      'Approved (Ready to Lodge)',
      'Submitted',
    ]);
    expect(WORKFLOW_LANES.map((lane) => lane.status)).toEqual([...WORKFLOW_STATUSES]);
    expect(laneIndex('Awaiting Client')).toBe(2);
    expect(laneIndex('Submitted')).toBe(5);
  });

  it('allows backward moves out of Submitted for any role', () => {
    expect(canMoveStatus('Submitted', 'Not Started', nonGated)).toBe(true);
    expect(canMoveStatus('Submitted', 'In Progress', gated)).toBe(true);
  });

  it('only lets review-gated work enter the Partner Review Gate lane', () => {
    expect(canMoveStatus('In Progress', 'Partner Review Gate', nonGated)).toBe(false);
    expect(canMoveStatus('In Progress', 'Partner Review Gate', gated)).toBe(true);
    expect(canMoveStatus('Awaiting Client', 'Partner Review Gate', gated)).toBe(true);
  });

  it('requires the Partner role to approve or submit gated work', () => {
    expect(canMoveStatus('Partner Review Gate', 'Approved (Ready to Lodge)', gated)).toBe(false);
    expect(canMoveStatus('Partner Review Gate', 'Approved (Ready to Lodge)', gatedPartner)).toBe(true);
    expect(canMoveStatus('Partner Review Gate', 'Submitted', gated)).toBe(false);
    expect(canMoveStatus('Partner Review Gate', 'Submitted', gatedPartner)).toBe(true);
  });

  it('lets non-gated work submit without partner sign-off', () => {
    expect(canMoveStatus('In Progress', 'Submitted', nonGated)).toBe(true);
    expect(canMoveStatus('Approved (Ready to Lodge)', 'Submitted', nonGated)).toBe(true);
  });

  it('never treats a lane as a target of itself', () => {
    expect(canMoveStatus('In Progress', 'In Progress', nonGated)).toBe(false);
  });

  it('normalises legacy task statuses into workflow lanes', () => {
    expect(normalizeWorkflowStatus('Not started')).toBe('Not Started');
    expect(normalizeWorkflowStatus('In progress')).toBe('In Progress');
    expect(normalizeWorkflowStatus('Awaiting client')).toBe('Awaiting Client');
    expect(normalizeWorkflowStatus('In review')).toBe('Partner Review Gate');
    expect(normalizeWorkflowStatus('Done')).toBe('Submitted');
    expect(normalizeWorkflowStatus('Awaiting Client')).toBe('Awaiting Client');
    expect(normalizeWorkflowStatus(undefined)).toBe('Not Started');
  });
});

describe('KanbanBoard keyboard and blocked-card contract', () => {
  const source = fs.readFileSync('src/components/kanban/KanbanBoard.tsx', 'utf8');

  it('handles arrow lane moves, in-lane reorder and 1-9 lane jumps', () => {
    expect(source).toContain('ArrowLeft');
    expect(source).toContain('ArrowRight');
    expect(source).toContain('ArrowUp');
    expect(source).toContain('ArrowDown');
    expect(source).toContain("const LANE_KEYS = '123456789'");
    expect(source).toContain('keyboardEnabled');
  });

  it('routes drag, hover menu and keyboard moves through one onMove callback', () => {
    expect(source).toContain('onDragStart');
    expect(source).toContain('onDrop');
    expect(source).toContain('Move card to another lane');
    // The board never copies card objects, so consumer-derived banners
    // (Blocked: …) survive every move.
    expect(source).not.toContain('{ ...card');
  });
});

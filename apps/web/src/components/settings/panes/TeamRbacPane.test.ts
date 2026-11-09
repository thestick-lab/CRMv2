import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  assignableInviteRoles,
  canInviteWithRole,
  DEFAULT_PERMISSION_MATRIX,
  inviteRoleBlock,
  INVITE_ROLE_NOTE,
} from '@/lib/permissions';
import {
  getInitialPracticeState,
  practiceReducer,
  type PracticeUser,
} from '@/context/PracticeStoreContext';

const COMPLIANCE_OFFICER: PracticeUser = {
  id: 'nikita',
  name: 'Nikita',
  role: 'Compliance Officer',
  email: 'nikita@fdoncall.co.za',
  kind: 'employee',
};

const INVITE = {
  name: 'Eve Naidoo',
  email: 'eve@fdoncall.co.za',
  kind: 'employee' as const,
};

/**
 * I8/M9: inviting with a Partner or Compliance Officer role mints an account
 * into the role-change gate's protected set, so it needs `Settings — manage` —
 * the pane's `Settings — view` / `People — view-invite` is not enough. One
 * policy (`assignableInviteRoles` / `canInviteWithRole`) serves both invite
 * surfaces and the store reducer.
 */
describe('invite role gate', () => {
  it('lets a Partner invite at every role', () => {
    for (const target of ['Partner', 'Compliance Officer', 'Accountant', 'Support Tech']) {
      expect(canInviteWithRole('Partner', target, DEFAULT_PERMISSION_MATRIX)).toBe(true);
      expect(inviteRoleBlock('Partner', target, DEFAULT_PERMISSION_MATRIX)).toBeNull();
    }
    expect(assignableInviteRoles('Partner', DEFAULT_PERMISSION_MATRIX)).toEqual([
      'Partner',
      'Compliance Officer',
      'Accountant',
      'Team member',
      'Subcontractor',
      'Support Tech',
    ]);
  });

  it('refuses a Compliance Officer a Partner or Compliance Officer invite', () => {
    expect(canInviteWithRole('Compliance Officer', 'Partner', DEFAULT_PERMISSION_MATRIX)).toBe(
      false
    );
    expect(
      canInviteWithRole('Compliance Officer', 'Compliance Officer', DEFAULT_PERMISSION_MATRIX)
    ).toBe(false);
    expect(inviteRoleBlock('Compliance Officer', 'Partner', DEFAULT_PERMISSION_MATRIX)).toBe(
      INVITE_ROLE_NOTE
    );
  });

  it('refuses a Compliance Officer a Support Tech invite — its manage cell could mint them a Partner', () => {
    expect(DEFAULT_PERMISSION_MATRIX['Support Tech']['Settings.manage']).toBe('Allowed');
    expect(
      canInviteWithRole('Compliance Officer', 'Support Tech', DEFAULT_PERMISSION_MATRIX)
    ).toBe(false);
    expect(inviteRoleBlock('Compliance Officer', 'Support Tech', DEFAULT_PERMISSION_MATRIX)).toBe(
      INVITE_ROLE_NOTE
    );
    // A Partner holds the grant, so the same target is allowed there.
    expect(canInviteWithRole('Partner', 'Support Tech', DEFAULT_PERMISSION_MATRIX)).toBe(true);
    expect(inviteRoleBlock('Partner', 'Support Tech', DEFAULT_PERMISSION_MATRIX)).toBeNull();
  });

  it('leaves a Compliance Officer every role below the gate — the Team register list', () => {
    expect(assignableInviteRoles('Compliance Officer', DEFAULT_PERMISSION_MATRIX)).toEqual([
      'Accountant',
      'Team member',
      'Subcontractor',
    ]);
  });

  it('lets a Support Tech (who holds Settings — manage) invite a Partner', () => {
    expect(DEFAULT_PERMISSION_MATRIX['Support Tech']['Settings.manage']).toBe('Allowed');
    expect(canInviteWithRole('Support Tech', 'Partner', DEFAULT_PERMISSION_MATRIX)).toBe(true);
  });
});

describe('INVITE_TEAM_MEMBER reducer refuses a role the actor cannot assign', () => {
  function asComplianceOfficer() {
    return practiceReducer(getInitialPracticeState(), {
      type: 'SET_CURRENT_USER',
      payload: COMPLIANCE_OFFICER,
    });
  }

  it('returns the identical state for a forced Partner dispatch', () => {
    const state = asComplianceOfficer();
    const next = practiceReducer(state, {
      type: 'INVITE_TEAM_MEMBER',
      payload: { ...INVITE, role: 'Partner' },
    });

    expect(next).toBe(state);
    expect(next.staff.some((member) => member.name === INVITE.name)).toBe(false);
  });

  it('still accepts a below-gate invite from a Compliance Officer', () => {
    const state = asComplianceOfficer();
    const next = practiceReducer(state, {
      type: 'INVITE_TEAM_MEMBER',
      payload: { ...INVITE, role: 'Accountant' },
    });

    expect(next).not.toBe(state);
    expect(next.staff.find((member) => member.name === INVITE.name)?.role).toBe('Accountant');
  });

  it('accepts a Partner invite from a Partner', () => {
    const state = getInitialPracticeState();
    const next = practiceReducer(state, {
      type: 'INVITE_TEAM_MEMBER',
      payload: { ...INVITE, role: 'Partner' },
    });

    expect(next.staff.find((member) => member.name === INVITE.name)?.role).toBe('Partner');
  });
});

describe('both invite surfaces share the one policy', () => {
  it('the settings pane and the Team register dialog consume the shared helper', () => {
    const pane = fs.readFileSync('src/components/settings/panes/TeamRbacPane.tsx', 'utf8');
    const dialog = fs.readFileSync('src/components/team/StaffDirectory.tsx', 'utf8');
    const teamView = fs.readFileSync('src/components/team/TeamView.tsx', 'utf8');

    expect(pane).toContain('assignableInviteRoles(');
    expect(pane).toContain('inviteRoleBlock(');
    expect(pane).toContain('INVITE_ROLE_NOTE');
    expect(dialog).toContain('assignableRoles');
    expect(dialog).toContain('!assignableRoles.includes(role)');
    expect(teamView).toContain('assignableInviteRoles(');
    expect(teamView).toContain('canInviteWithRole(');
    expect(pane).not.toContain('MANAGE_REQUIRED_INVITE_ROLES');
    expect(dialog).not.toContain("'Partner',");
  });

  it('the reducer resolves the same policy', () => {
    const store = fs.readFileSync('src/context/PracticeStoreContext.tsx', 'utf8');
    expect(store).toContain('canInviteWithRole(');
    expect(store).toContain('return state;');
  });
});

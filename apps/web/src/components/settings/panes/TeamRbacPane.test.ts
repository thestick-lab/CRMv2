import { describe, expect, it } from 'vitest';
import { canInviteWithRole, inviteRoleBlock } from './TeamRbacPane';
import { DEFAULT_PERMISSION_MATRIX } from '@/lib/permissions';

/**
 * I8/M9: inviting with a Partner or Compliance Officer role mints an account
 * into the role-change gate's protected set, so it needs `Settings — manage` —
 * the pane's `Settings — view` is not enough.
 */
describe('invite role gate', () => {
  it('lets a Partner invite at every role', () => {
    for (const target of ['Partner', 'Compliance Officer', 'Accountant', 'Support Tech']) {
      expect(canInviteWithRole('Partner', target, DEFAULT_PERMISSION_MATRIX)).toBe(true);
      expect(inviteRoleBlock('Partner', target, DEFAULT_PERMISSION_MATRIX)).toBeNull();
    }
  });

  it('refuses a Compliance Officer a Partner or Compliance Officer invite', () => {
    expect(canInviteWithRole('Compliance Officer', 'Partner', DEFAULT_PERMISSION_MATRIX)).toBe(
      false
    );
    expect(
      canInviteWithRole('Compliance Officer', 'Compliance Officer', DEFAULT_PERMISSION_MATRIX)
    ).toBe(false);
    expect(
      inviteRoleBlock('Compliance Officer', 'Partner', DEFAULT_PERMISSION_MATRIX)
    ).toContain('Settings — manage');
  });

  it('still lets a Compliance Officer invite roles below the gate', () => {
    expect(
      canInviteWithRole('Compliance Officer', 'Accountant', DEFAULT_PERMISSION_MATRIX)
    ).toBe(true);
    expect(
      canInviteWithRole('Compliance Officer', 'Team member', DEFAULT_PERMISSION_MATRIX)
    ).toBe(true);
  });

  it('lets a Support Tech (who holds Settings — manage) invite a Partner', () => {
    expect(DEFAULT_PERMISSION_MATRIX['Support Tech']['Settings.manage']).toBe('Allowed');
    expect(canInviteWithRole('Support Tech', 'Partner', DEFAULT_PERMISSION_MATRIX)).toBe(true);
  });
});

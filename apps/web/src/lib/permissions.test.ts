import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PERMISSION_MATRIX,
  PERMISSION_ROWS,
  ROLES,
  SIGN_OFF_LOCKED,
  can,
  canForAssignedRecord,
  canSignOff,
  scopeToAssigned,
  validatePermissionChange,
  type PermissionState,
  type Role,
} from './permissions';
import { getInitialPracticeState, practiceReducer } from '@/context/PracticeStoreContext';
import { canSignOffPartnerGate, validateStatutorySubmission } from './workflow';
import { canAccessView, visibleNavItems } from '@/components/layout/navigation-helpers';

const emptyOverrides: PermissionState['matrix'] = {};

describe('permission matrix defaults (§6.9 verbatim)', () => {
  it('gives Support Tech settings, people and governance-log access only', () => {
    expect(can('Support Tech', 'Settings', 'manage')).toBe(true);
    expect(can('Support Tech', 'Settings', 'view')).toBe(true);
    expect(can('Support Tech', 'Settings', 'edit')).toBe(true);
    expect(can('Support Tech', 'People', 'view-invite')).toBe(true);
    expect(can('Support Tech', 'Governance log', 'view')).toBe(true);

    expect(can('Support Tech', 'Clients', 'view')).toBe(false);
    expect(can('Support Tech', 'Invoices', 'view')).toBe(false);
    expect(can('Support Tech', 'Deadlines', 'view')).toBe(false);
    expect(can('Support Tech', 'Deadlines & Tasks', 'update-status')).toBe(false);
    expect(can('Support Tech', 'Quotes', 'view-create-send')).toBe(false);
    expect(can('Support Tech', 'Time', 'log-own')).toBe(false);
    expect(can('Support Tech', 'Clients', 'view-billing')).toBe(false);
  });

  it('keeps an Accountant out of Settings and people while allowing quote send', () => {
    expect(can('Accountant', 'Settings', 'view')).toBe(false);
    expect(can('Accountant', 'Settings', 'manage')).toBe(false);
    expect(can('Accountant', 'People', 'view-invite')).toBe(false);
    expect(can('Accountant', 'Governance log', 'view')).toBe(false);

    expect(can('Accountant', 'Quotes & Invoices', 'send')).toBe(true);
    expect(can('Accountant', 'Clients', 'view')).toBe(true);
    expect(can('Accountant', 'Clients', 'view-billing')).toBe(true);
    expect(can('Accountant', 'Invoices', 'view')).toBe(true);
    expect(can('Accountant', 'Invoices', 'create-send')).toBe(false);
    expect(can('Accountant', 'Quotes', 'accept-sign')).toBe(false);
    expect(can('Accountant', 'Deadlines & Tasks', 'submit-returns')).toBe(true);
  });

  it('expresses the Limited (assigned) column as a limited scope, not a flat allow', () => {
    expect(can('Subcontractor', 'Clients', 'view')).toBe(false);
    expect(can('Subcontractor', 'Clients', 'view', undefined, { assigned: true })).toBe(true);
    expect(can('Subcontractor', 'Deadlines', 'view')).toBe(false);
    expect(can('Subcontractor', 'Deadlines & Tasks', 'update-status', undefined, { assigned: true })).toBe(true);
    // Time logged on assigned work is the one practice surface a subcontractor
    // keeps — and it is scoped, not a flat allow.
    expect(can('Subcontractor', 'Time', 'log-own')).toBe(false);
    expect(can('Subcontractor', 'Time', 'log-own', undefined, { assigned: true })).toBe(true);
    expect(can('Subcontractor', 'Time', 'view-all')).toBe(false);
    // Billing is a separate §6.9 row: assignment to a client never grants it.
    expect(can('Subcontractor', 'Clients', 'view-billing')).toBe(false);
    expect(can('Team member', 'Clients', 'view-billing')).toBe(false);
    expect(can('Partner', 'Clients', 'view-billing')).toBe(true);
  });

  it('publishes every role column and row with a complete default matrix', () => {
    expect(ROLES).toHaveLength(6);
    expect(PERMISSION_ROWS.length).toBe(18);
    for (const role of ROLES) {
      for (const row of PERMISSION_ROWS) {
        expect(DEFAULT_PERMISSION_MATRIX[role][row.id]).toBeDefined();
      }
    }
    // Every row belongs to one of the six settings groups.
    const groups = [
      'Clients',
      'Deadlines & Tasks',
      'Quotes & Invoices',
      'Time',
      'People',
      'Settings',
    ];
    expect(PERMISSION_ROWS.every((row) => groups.includes(row.group))).toBe(true);
    expect(groups.every((group) => PERMISSION_ROWS.some((row) => row.group === group))).toBe(true);
  });

  it('locks the partner sign-off row for every role but Partner', () => {
    expect(SIGN_OFF_LOCKED).toBe(true);
    const signOffRow = PERMISSION_ROWS.find((row) => row.id === 'Deadlines.partner-sign-off');
    expect(signOffRow?.locked).toBe(true);

    for (const role of ROLES) {
      expect(can(role, 'Deadlines', 'partner-sign-off')).toBe(role === 'Partner');
      expect(canSignOff(role)).toBe(role === 'Partner');
      // The statutory gate keeps its own partner-only enforcement.
      expect(canSignOffPartnerGate(role)).toBe(canSignOff(role));
    }
  });

  it('honours persisted overrides over the defaults', () => {
    const overrides: PermissionState['matrix'] = {
      Accountant: { 'Settings.view': 'Allowed' },
      'Team member': { 'Clients.view': 'Not allowed' },
    };

    expect(can('Accountant', 'Settings', 'view', overrides)).toBe(true);
    expect(can('Accountant', 'Settings', 'view', emptyOverrides)).toBe(false);
    expect(can('Team member', 'Clients', 'view', overrides)).toBe(false);
    expect(can('Partner', 'Clients', 'view', overrides)).toBe(true);
  });

  it('resolves an Inherited override to the role default cell', () => {
    // Subcontractor's default for Clients.view is Limited, so inheriting keeps
    // the assigned scope rather than silently granting or refusing.
    const inherited: PermissionState['matrix'] = {
      Subcontractor: { 'Clients.view': 'Inherited' },
    };
    expect(can('Subcontractor', 'Clients', 'view', inherited)).toBe(false);
    expect(can('Subcontractor', 'Clients', 'view', inherited, { assigned: true })).toBe(true);

    // Accountant's default for Clients.view is Allowed.
    expect(can('Accountant', 'Clients', 'view', { Accountant: { 'Clients.view': 'Inherited' } })).toBe(
      true
    );
  });
});

describe('SET_PERMISSION validation', () => {
  it('rejects changes to the locked sign-off row', () => {
    const result = validatePermissionChange({
      role: 'Accountant',
      group: 'Deadlines',
      action: 'partner-sign-off',
      cell: 'Allowed',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('LOCKED_PERMISSION_ROW');
  });

  it('refuses to downgrade the Partner below Allowed on manage permissions', () => {
    const result = validatePermissionChange({
      role: 'Partner',
      group: 'Settings',
      action: 'manage',
      cell: 'Not allowed',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('PARTNER_MANAGE_REQUIRED');
  });

  it('reduces every change to the §6.9 row id and logs it as an activity event', () => {
    const state = getInitialPracticeState();

    const next = practiceReducer(state, {
      type: 'SET_PERMISSION',
      payload: { role: 'Accountant', group: 'Settings', action: 'view', cell: 'Allowed' },
    });

    expect(next.permissions.matrix.Accountant?.['Settings.view']).toBe('Allowed');
    expect(next.permissions.lastEditedBy).toBe('Erik');
    expect(next.permissions.lastEditedAt).toBeTruthy();
    expect(can('Accountant', 'Settings', 'view', next.permissions.matrix)).toBe(true);

    expect(next.activity).toHaveLength(1);
    expect(next.activity[0].type).toBe('permission');
    expect(next.activity[0].actorName).toBe('Erik');
    expect(next.activity[0].text).toContain('View settings');
    expect(next.activity[0].text).toContain('Allowed');
    expect(next.activity[0].subline).toContain('Accountant');
  });

  it('refuses to store Inherited or Custom: only real grants persist', () => {
    const inherited = validatePermissionChange({
      role: 'Accountant',
      group: 'Settings',
      action: 'view',
      cell: 'Inherited',
    });
    expect(inherited).toEqual({ ok: false, reason: 'NOT_STORABLE_CELL' });

    const custom = validatePermissionChange({
      role: 'Accountant',
      group: 'Settings',
      action: 'view',
      cell: 'Custom',
    });
    expect(custom).toEqual({ ok: false, reason: 'NOT_STORABLE_CELL' });

    // `Custom` is display-derived: the matrix UI stores Allowed.
    const allowed = validatePermissionChange({
      role: 'Accountant',
      group: 'Settings',
      action: 'view',
      cell: 'Allowed',
    });
    expect(allowed.ok).toBe(true);
  });

  it('leaves state untouched for a rejected change', () => {
    const state = getInitialPracticeState();
    const next = practiceReducer(state, {
      type: 'SET_PERMISSION',
      payload: { role: 'Partner', group: 'Settings', action: 'manage', cell: 'Not allowed' },
    });

    expect(next).toBe(state);
    expect(next.activity).toEqual([]);
  });

  it('clears overrides back to the default matrix on RESET_PERMISSIONS', () => {
    const state = practiceReducer(getInitialPracticeState(), {
      type: 'SET_PERMISSION',
      payload: { role: 'Accountant', group: 'Settings', action: 'view', cell: 'Allowed' },
    });
    const reset = practiceReducer(state, { type: 'RESET_PERMISSIONS' });

    expect(reset.permissions.matrix).toEqual({});
    expect(can('Accountant', 'Settings', 'view', reset.permissions.matrix)).toBe(false);
    expect(reset.activity[0].text).toContain('Reset permissions');
  });
});

describe('navigation follows the matrix', () => {
  it('shows Support Tech only Team, Settings and the Governance Log', () => {
    expect(visibleNavItems('Support Tech').map((item) => item.id)).toEqual([
      'team',
      'settings',
      'govlog',
    ]);
  });

  it('hides Settings from an Accountant and keeps the practice views', () => {
    expect(visibleNavItems('Accountant').map((item) => item.id)).toEqual([
      'dashboard',
      'analytics',
      'inbox',
      'clients',
      'deadlines',
      'sales-pipeline',
      'time',
    ]);
    expect(canAccessView('settings', 'Accountant')).toBe(false);
    expect(canAccessView('clients', 'Accountant')).toBe(true);
  });

  it('hides revenue surfaces from a Team member and scopes a Subcontractor to assigned work', () => {
    expect(visibleNavItems('Team member').map((item) => item.id)).toEqual([
      'dashboard',
      'inbox',
      'clients',
      'deadlines',
      'sales-pipeline',
      'time',
    ]);
    // Limited (assigned) rows earn the views that scope their own data.
    expect(visibleNavItems('Subcontractor').map((item) => item.id)).toEqual([
      'clients',
      'deadlines',
      'time',
    ]);
    expect(canAccessView('clients', 'Subcontractor')).toBe(false);
    expect(canAccessView('clients', 'Subcontractor', {}, { assigned: true })).toBe(true);
    expect(canAccessView('deadlines', 'Subcontractor', {}, { assigned: true })).toBe(true);
    expect(canAccessView('time', 'Subcontractor', {}, { assigned: true })).toBe(true);
    // Aggregate views never widen with the assigned scope.
    expect(canAccessView('dashboard', 'Subcontractor', {}, { assigned: true })).toBe(false);
    expect(canAccessView('sales-pipeline', 'Subcontractor', {}, { assigned: true })).toBe(false);
  });

  it('keeps every view for a Partner', () => {
    expect(visibleNavItems('Partner')).toHaveLength(10);
    // A client record is part of the clients register.
    expect(canAccessView('client', 'Partner')).toBe(true);
    expect(canAccessView('client', 'Support Tech')).toBe(false);
  });
});

describe('assigned scope on Limited rows', () => {
  const clients = [
    { code: 'AAA-111', staffId: 'erik', subcontractorId: 'hannes' },
    { code: 'BBB-222', staffId: 'wouter', subcontractorId: 'caroline' },
    { code: 'CCC-333', staffId: 'hannes' },
  ];
  const tasks = [
    { id: 'task-assigned', staffId: 'erik', subcontractorId: 'hannes' },
    { id: 'task-other', staffId: 'wouter', subcontractorId: 'caroline' },
  ];

  it('filters the clients register to the subcontractor’s own records', () => {
    const visible = scopeToAssigned(clients, 'hannes').map((client) => client.code);
    expect(visible).toEqual(['AAA-111', 'CCC-333']);
    expect(visible).not.toContain('BBB-222');

    expect(
      canForAssignedRecord('Subcontractor', 'Clients', 'view', emptyOverrides, 'hannes', clients[0])
    ).toBe(true);
    expect(
      canForAssignedRecord('Subcontractor', 'Clients', 'view', emptyOverrides, 'hannes', clients[1])
    ).toBe(false);
  });

  it('lets a subcontractor move their assigned task and refuse another’s', () => {
    expect(
      canForAssignedRecord(
        'Subcontractor',
        'Deadlines',
        'update-status',
        emptyOverrides,
        'hannes',
        tasks[0]
      )
    ).toBe(true);
    expect(
      canForAssignedRecord(
        'Subcontractor',
        'Deadlines',
        'update-status',
        emptyOverrides,
        'hannes',
        tasks[1]
      )
    ).toBe(false);
    expect(
      scopeToAssigned(tasks, 'hannes').map((task) => task.id)
    ).toEqual(['task-assigned']);
  });

  it('scopes time logging to assigned clients', () => {
    expect(
      canForAssignedRecord('Subcontractor', 'Time', 'log-own', emptyOverrides, 'hannes', clients[0])
    ).toBe(true);
    expect(
      canForAssignedRecord('Subcontractor', 'Time', 'log-own', emptyOverrides, 'hannes', clients[1])
    ).toBe(false);
  });

  it('refuses the Home quick-complete for a role that cannot submit returns', () => {
    // Home's checkbox dispatches `Submitted`; the matrix row decides.
    const teamMemberCanSubmit = canForAssignedRecord(
      'Team member',
      'Deadlines',
      'submit-returns',
      emptyOverrides,
      'andre',
      tasks[0]
    );
    expect(teamMemberCanSubmit).toBe(false);
    expect(
      canForAssignedRecord('Partner', 'Deadlines', 'submit-returns', emptyOverrides, 'erik', tasks[0])
    ).toBe(true);
    expect(
      canForAssignedRecord(
        'Subcontractor',
        'Deadlines',
        'submit-returns',
        emptyOverrides,
        'hannes',
        tasks[0]
      )
    ).toBe(false);
  });
});

describe('partner review gate regression', () => {
  it('still requires partner sign-off for gated returns', () => {
    expect(
      validateStatutorySubmission({
        status: 'Approved (Ready to Lodge)',
        needsPartnerReview: true,
        partnerSignOff: false,
      })
    ).toEqual({ valid: false, error: 'PARTNER_REVIEW_REQUIRED' });

    const nonPartner: Role = 'Compliance Officer';
    expect(can(nonPartner, 'Deadlines', 'partner-sign-off')).toBe(false);
    expect(canSignOff(nonPartner)).toBe(false);
  });
});

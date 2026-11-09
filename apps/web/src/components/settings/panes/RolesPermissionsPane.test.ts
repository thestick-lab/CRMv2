import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  DISPLAY_GROUPS,
  MATRIX_LEGEND,
  buildChangeSummary,
  cellDisplay,
  nextStorableCell,
  permissionSummary,
  reasonText,
} from './RolesPermissionsPane';
import { PERMISSION_ROWS, ROLES, type PermissionState } from '@/lib/permissions';

const emptyOverrides: PermissionState['matrix'] = {};

function row(id: string) {
  const found = PERMISSION_ROWS.find((entry) => entry.id === id);
  if (!found) throw new Error(`missing row ${id}`);
  return found;
}

describe('Roles & Permissions matrix model', () => {
  it('renders the five legend states and the six permission groups', () => {
    expect(MATRIX_LEGEND.map((entry) => entry.label)).toEqual([
      'Allowed',
      'Not allowed',
      'Limited',
      'Inherited',
      'Custom',
    ]);
    expect(DISPLAY_GROUPS).toEqual([
      'Clients',
      'Deadlines & Tasks',
      'Quotes & Invoices',
      'Time',
      'People',
      'Settings',
    ]);
    expect(ROLES).toHaveLength(6);
    expect(ROLES).toContain('Support Tech');
  });

  it('derives Inherited for untouched cells and Custom only for a differing stored value', () => {
    const viewClients = row('Clients.view');

    const untouched = cellDisplay('Accountant', viewClients, emptyOverrides);
    expect(untouched.effective).toBe('Allowed');
    expect(untouched.inherited).toBe(true);
    expect(untouched.custom).toBe(false);

    // Storing the §6.9 value is not a custom override.
    const sameAsDefault = cellDisplay('Accountant', viewClients, {
      Accountant: { 'Clients.view': 'Allowed' },
    });
    expect(sameAsDefault.inherited).toBe(true);
    expect(sameAsDefault.custom).toBe(false);

    const overridden = cellDisplay('Accountant', viewClients, {
      Accountant: { 'Clients.view': 'Not allowed' },
    });
    expect(overridden.effective).toBe('Not allowed');
    expect(overridden.inherited).toBe(false);
    expect(overridden.custom).toBe(true);

    // `Inherited` is never stored, but a legacy value reads as the default.
    const legacyInherited = cellDisplay('Accountant', viewClients, {
      Accountant: { 'Clients.view': 'Inherited' },
    });
    expect(legacyInherited.inherited).toBe(true);
    expect(legacyInherited.effective).toBe('Allowed');
  });

  it('cycles only through storable cells', () => {
    expect(nextStorableCell('Allowed')).toBe('Not allowed');
    expect(nextStorableCell('Not allowed')).toBe('Limited');
    expect(nextStorableCell('Limited')).toBe('Allowed');
    expect(nextStorableCell('Inherited')).toBe('Not allowed');
    expect(nextStorableCell('Custom')).toBe('Not allowed');
  });

  it('summarises a role with counts and its custom overrides', () => {
    const summary = permissionSummary('Support Tech', emptyOverrides);
    expect(summary.total).toBe(PERMISSION_ROWS.length);
    expect(summary.allowed).toBe(5);
    expect(summary.notAllowed).toBe(PERMISSION_ROWS.length - 5);
    expect(summary.limited).toBe(0);
    expect(summary.overrides).toEqual([]);

    const withOverride = permissionSummary('Support Tech', {
      'Support Tech': { 'Clients.view': 'Allowed' },
    });
    expect(withOverride.overrides.map((override) => override.row.id)).toEqual(['Clients.view']);
    expect(withOverride.allowed).toBe(summary.allowed + 1);
  });

  it('names both the role and the permission in the confirmation copy', () => {
    const copy = buildChangeSummary(
      'Support Tech',
      'View clients',
      'Not allowed',
      'Allowed'
    );
    expect(copy).toContain('Support Tech');
    expect(copy).toContain('View clients');
    expect(copy).toContain('Not allowed');
    expect(copy).toContain('Allowed');

    expect(reasonText('LOCKED_PERMISSION_ROW')).toContain('locked');
    expect(reasonText('PARTNER_MANAGE_REQUIRED')).toContain('Manage permissions');
    expect(reasonText('PARTNER_MANAGE_REQUIRED')).toContain('Partner');
  });

  it('wires the matrix to SET_PERMISSION behind validation and a confirmation dialog', () => {
    const source = fs.readFileSync(
      'src/components/settings/panes/RolesPermissionsPane.tsx',
      'utf8'
    );

    expect(source).toContain('setPermission(');
    expect(source).toContain('validatePermissionChange');
    expect(source).toContain('buildChangeSummary');
    expect(source).toContain('Create Role');
    expect(source).toContain('disabled');
    expect(source).toContain('locked');
    expect(source).toContain('DialogPrimitive');
    expect(source).toContain(
      'Custom permissions override the inherited role settings for this role only'
    );
    // The stored value always comes from the storable cycle, never a derived label.
    expect(source).toContain('cell: pending.to');
    expect(source).toContain('nextStorableCell');
  });
});

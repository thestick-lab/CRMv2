import { describe, expect, it } from 'vitest';
import { CLIENT_COLUMNS, filterClientsRow } from './ClientsRegisterTable';
import { enrichClientRows } from './client-row-data';
import { CLIENTS } from 'fdoncall-practice/data/seed';

describe('ClientsRegisterTable TanStack Table configuration', () => {
  const rows = enrichClientRows(CLIENTS, '2026-11-07');

  it('defines exactly the 9 required statutory columns', () => {
    const colIds = CLIENT_COLUMNS.map((col) => col.id || ('accessorKey' in col ? col.accessorKey : ''));
    expect(colIds).toEqual([
      'code',
      'name',
      'entityType',
      'staffName',
      'yearEnd',
      'vat',
      'payroll',
      'services',
      'nextDeadline',
    ]);
  });

  it('filters rows by code, name, and group tag', () => {
    const alcRow = rows.find((r) => r.code === 'ALC-610')!;
    expect(filterClientsRow(alcRow, 'ALC')).toBe(true);
    expect(filterClientsRow(alcRow, 'contracting')).toBe(true);
    expect(filterClientsRow(alcRow, '610')).toBe(true);
    expect(filterClientsRow(alcRow, 'non-existent-xyz')).toBe(false);

    const axeRow = rows.find((r) => r.code === 'AXE-460')!;
    expect(filterClientsRow(axeRow, 'Axe Group')).toBe(true);
  });

  it('filters rows by groupId and subcontractor name', () => {
    const creRow = rows.find((r) => r.code === 'CRE-007')!;
    expect(filterClientsRow(creRow, 'signal-gun')).toBe(true);

    const lesRow = rows.find((r) => r.code === 'LES-841')!;
    expect(filterClientsRow(lesRow, 'Caroline')).toBe(true);
  });

  it('configures yearEnd column with chronological month sorting', () => {
    const yearEndCol = CLIENT_COLUMNS.find((col) => col.id === 'yearEnd') as { accessorKey?: string } | undefined;
    expect(yearEndCol).toBeDefined();
    expect(yearEndCol?.accessorKey).toBe('yearEndMonth');
  });
});

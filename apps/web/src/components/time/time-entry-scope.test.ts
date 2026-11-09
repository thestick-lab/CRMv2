import { describe, expect, it } from 'vitest';
import { entryClientInScope, entryPickerClients } from './time-entry-scope';

const ALL = [
  { code: 'KHE-615', name: 'Kheper SA t/a Silki' },
  { code: 'MUS-875', name: 'Muse 1399' },
  { code: 'TOP-435', name: 'Top Media and Communications' },
];
const ASSIGNED = ALL.filter((client) => client.code === 'KHE-615');

describe('entry sheet client scope', () => {
  it('offers only assigned clients for a fresh entry', () => {
    expect(entryPickerClients(ALL, ASSIGNED, '').map((client) => client.code)).toEqual([
      'KHE-615',
    ]);
  });

  it('keeps a historical entry’s own client selectable and savable', () => {
    // The client fell out of scope after capture; the record stays editable.
    const options = entryPickerClients(ALL, ASSIGNED, 'MUS-875');
    expect(options.map((client) => client.code)).toEqual(['KHE-615', 'MUS-875']);
    expect(entryClientInScope('MUS-875', ASSIGNED, 'MUS-875')).toBe(true);
  });

  it('refuses an unassigned client that is not the entry’s own', () => {
    expect(entryClientInScope('TOP-435', ASSIGNED, 'MUS-875')).toBe(false);
    expect(entryClientInScope('KHE-615', ASSIGNED, 'MUS-875')).toBe(true);
    expect(entryClientInScope('', ASSIGNED, 'MUS-875')).toBe(false);
  });
});

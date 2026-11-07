import { describe, expect, it } from 'vitest';
import { filterCommandItems, type CommandItem } from './command-dialog';

describe('Command dialog search filter', () => {
  const items: CommandItem[] = [
    { id: 'dashboard', label: 'Home (Dashboard)', section: 'General' },
    { id: 'clients', label: 'Clients Register', section: 'Practice Data' },
    { id: 'deadlines', label: 'Deadlines & Tasks', section: 'Statutory Ops' },
    { id: 'quote', label: 'New Quote Calculator', section: 'Statutory Ops' },
    { id: 'settings', label: 'Settings', section: 'General' },
    { id: 'client-alc', label: 'A & L Contracting (ALC-610)', section: 'Clients', clientCode: 'ALC-610' },
  ];

  it('returns all items when query is empty', () => {
    expect(filterCommandItems(items, '')).toHaveLength(items.length);
    expect(filterCommandItems(items, '   ')).toHaveLength(items.length);
  });

  it('filters items by label or section or code case-insensitively', () => {
    const clientsMatch = filterCommandItems(items, 'client');
    expect(clientsMatch.map((i) => i.id)).toEqual(['clients', 'client-alc']);

    const deadlineMatch = filterCommandItems(items, 'DEAD');
    expect(deadlineMatch.map((i) => i.id)).toEqual(['deadlines']);

    const codeMatch = filterCommandItems(items, '610');
    expect(codeMatch.map((i) => i.id)).toEqual(['client-alc']);
  });
});

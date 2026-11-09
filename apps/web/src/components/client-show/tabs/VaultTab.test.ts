import { describe, expect, it } from 'vitest';
import { buildVaultFolders, type VaultFolder } from './VaultTab';
import { CLIENTS } from 'fdoncall-practice/data/seed';
import type { Client } from 'fdoncall-practice/domain/types';

/** The single BO filing document in the CIPC folder. */
function boDocument(client: Client) {
  const folders: VaultFolder[] = buildVaultFolders(client);
  const cipc = folders.find((folder) => folder.name === 'Statutory Secretarial (CIPC)');
  if (!cipc) throw new Error('CIPC folder missing');
  return cipc.files[0];
}

describe('BO vault document status follows the recorded scope', () => {
  const muse = CLIENTS.find((client) => client.code === 'MUS-875')!;

  it('is signed when BO is in scope and filed', () => {
    expect(boDocument(muse).status).toBe('Signed & Executed');
  });

  it('is pending when BO is in scope but not filed', () => {
    expect(boDocument({ ...muse, beneficialOwnershipFiled: false }).status).toBe('Pending Signature');
  });

  it('is out of scope when BO is not recorded as a service', () => {
    expect(boDocument({ ...muse, services: ['AFS', 'ITR14'] }).status).toBe('Not in scope');
    expect(boDocument({ ...muse, beneficialOwnershipFiled: null }).status).toBe('Not in scope');
  });
});

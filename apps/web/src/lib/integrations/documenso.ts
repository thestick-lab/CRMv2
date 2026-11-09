import type { Client } from 'fdoncall-practice/domain/types';
import { STAFF } from 'fdoncall-practice/data/seed';
import type { ISODate } from 'fdoncall-practice/domain/dates';
import type { Quote } from '@/context/PracticeStoreContext';

/**
 * Documenso e-signature service seam.
 *
 * The live adapter will POST a document to `{baseUrl}/api/documents`, add two
 * recipients (`role: 'SIGNER'`, signing order 1 = client, 2 = the practice
 * counter-signer) and send it. The simulated adapter below produces the same
 * shape — a clearly synthetic `env-…` id and a timestamp — so the quote flow,
 * the store record and the dialogs do not change when the network lands.
 */

export interface DocumensoRecipient {
  name: string;
  email: string;
  role: 'SIGNER';
  signingOrder: number;
}

export interface DocumensoEnvelope {
  envelopeId: string;
  recipients: DocumensoRecipient[];
  sentAt: ISODate;
}

export interface DocumensoParty {
  name: string;
  email: string;
}

export interface DocumensoEnvelopeContext {
  /** Registered client record, when the quote belongs to an existing client. */
  client?: Client;
  /** Practice counter-signer; defaults to the staff member who owns the record. */
  countersigner?: DocumensoParty;
}

/** The document a dispatch describes — rendered in the dialog, never emailed. */
export interface DocumensoDocument {
  title: string;
  documentName: string;
}

function syntheticToken(): string {
  const cryptoApi = typeof globalThis.crypto !== 'undefined' ? globalThis.crypto : undefined;
  if (cryptoApi && typeof cryptoApi.randomUUID === 'function') {
    return cryptoApi.randomUUID().replace(/-/g, '').slice(0, 12);
  }
  return Math.random().toString(36).slice(2, 12);
}

const slug = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '');

const fileToken = (value: string) => value.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '');

function clientParty(client?: Client, contactName?: string): DocumensoParty {
  const contact = client?.contacts?.find((entry) => entry.email) ?? client?.contacts?.[0];
  const name = contactName || contact?.name || client?.name || 'Client signatory';
  const email =
    contact?.email ??
    client?.email ??
    `signatory@${slug(client?.name || name) || 'client'}.co.za`;
  return { name, email };
}

function practiceParty(staffId?: string, provided?: DocumensoParty): DocumensoParty {
  if (provided) return provided;
  const staff = STAFF.find((member) => member.id === staffId);
  const name = staff?.name ?? 'Practice Partner';
  return { name, email: `${slug(name)}@fdoncall.co.za` };
}

function envelopeWith(clientSigner: DocumensoParty, countersigner: DocumensoParty): DocumensoEnvelope {
  return {
    envelopeId: `env-${syntheticToken()}`,
    recipients: [
      { name: clientSigner.name, email: clientSigner.email, role: 'SIGNER', signingOrder: 1 },
      { name: countersigner.name, email: countersigner.email, role: 'SIGNER', signingOrder: 2 },
    ],
    sentAt: new Date().toISOString(),
  };
}

export function documensoDocumentForQuote(quote: Quote, client?: Client): DocumensoDocument {
  const subject = quote.prospect?.name ?? client?.name ?? quote.clientCode ?? 'Prospect';
  return {
    title: `Fee quote ${quote.number} — ${subject}`,
    documentName: `FD_on_Call_Fee_Quote_${fileToken(quote.number)}_${fileToken(subject)}.pdf`,
  };
}

export function documensoDocumentForSla(client: Client): DocumensoDocument {
  return {
    title: `Master services agreement — ${client.name} (${client.code})`,
    documentName: `FD_on_Call_Master_Services_Agreement_${fileToken(client.code)}_SLA.pdf`,
  };
}

/**
 * Simulated dual-signature envelope for a fee quote: the client signatory signs
 * first, the practice countersigns second.
 */
export function createDocumensoEnvelope(
  quote: Quote,
  context: DocumensoEnvelopeContext = {}
): DocumensoEnvelope {
  const clientSigner = clientParty(context.client, quote.prospect?.contactPerson);
  const countersigner = practiceParty(quote.ownerStaffId, context.countersigner);
  return envelopeWith(clientSigner, countersigner);
}

/**
 * The engagement-letter path: a client's master services agreement, signed by
 * the client signatory and the practice partner responsible for the client.
 */
export function createDocumensoSlaEnvelope(
  client: Client,
  context: Omit<DocumensoEnvelopeContext, 'client'> = {}
): DocumensoEnvelope {
  const clientSigner = clientParty(client);
  const countersigner = practiceParty(client.staffId, context.countersigner);
  return envelopeWith(clientSigner, countersigner);
}

import { describe, expect, it } from 'vitest';
import { buildDocumensoEnvelope } from './DocumensoDispatchDialog';
import { buildXeroInvoiceDraft } from './XeroSyncDialog';
import { buildEstimateForClient } from '@/components/client-show/tabs/EstimateTab';
import { CLIENTS } from 'fdoncall-practice/data/seed';

describe('Documenso SLA and Xero invoice integrations', () => {
  const muse = CLIENTS.find((c) => c.code === 'MUS-875')!;
  const est = buildEstimateForClient(muse, '2026-12');

  it('builds a dual-signature Documenso envelope for MUS-875', () => {
    const envelope = buildDocumensoEnvelope(muse);
    expect(envelope.envelopeId).toContain('MUS-875');
    expect(envelope.title).toContain('Muse 1399');
    expect(envelope.signers).toHaveLength(2);

    const partnerSigner = envelope.signers.find((s) => s.role === 'Managing Partner');
    expect(partnerSigner).toBeDefined();
    expect(partnerSigner?.email).toBe('erikw@fdoncall.co.za');

    const clientSigner = envelope.signers.find((s) => s.role === 'Client Representative');
    expect(clientSigner).toBeDefined();
  });

  it('builds Xero monthly repeating draft invoice with 15% South African VAT', () => {
    const draft = buildXeroInvoiceDraft(muse, est);
    expect(draft.contactName).toBe('Muse 1399');
    expect(draft.lines.length).toBeGreaterThan(0);

    // Sum of lines matches smoothed monthly retainer
    const subtotal = draft.lines.reduce((sum, l) => sum + l.amount, 0);
    expect(Math.abs(subtotal - est.average)).toBeLessThan(0.05);

    // Vatable lines have 15% VAT TaxType
    const vatableLines = draft.lines.filter((l) => l.taxType === '15% VAT on Income');
    expect(vatableLines.length).toBeGreaterThan(0);
  });
});

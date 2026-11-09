import { describe, expect, it } from 'vitest';
import {
  QUOTE_STAGE_ORDER,
  canTransitionQuote,
  nextInvoiceNumber,
  nextQuoteNumber,
} from './quote-lifecycle';
import type { QuoteStage } from '@/context/PracticeStoreContext';

const FULL_CONTEXT = { hasClient: true, hasFeeLines: true };

/** Every forward step plus the three legal loss paths — nothing else may be reachable. */
const LEGAL_TRANSITIONS: Record<string, true> = {
  'Draft Quote>Quote Sent': true,
  'Quote Sent>Accepted': true,
  'Accepted>Signed': true,
  'Signed>Active Client': true,
  'Draft Quote>Closed Lost': true,
  'Quote Sent>Closed Lost': true,
  'Accepted>Closed Lost': true,
};

describe('Quote lifecycle stage order', () => {
  it('lists the six sales pipeline stages in board order', () => {
    expect(QUOTE_STAGE_ORDER).toEqual([
      'Draft Quote',
      'Quote Sent',
      'Accepted',
      'Signed',
      'Active Client',
      'Closed Lost',
    ]);
  });
});

describe('canTransitionQuote stage matrix', () => {
  it('allows only the pinned forward steps and loss paths', () => {
    for (const from of QUOTE_STAGE_ORDER) {
      for (const to of QUOTE_STAGE_ORDER) {
        const expected = LEGAL_TRANSITIONS[`${from}>${to}`] === true;
        expect(
          canTransitionQuote(from as QuoteStage, to as QuoteStage, FULL_CONTEXT),
          `${from} → ${to}`
        ).toBe(expected);
      }
    }
  });

  it('never treats a move into the same stage as a transition', () => {
    for (const stage of QUOTE_STAGE_ORDER) {
      expect(canTransitionQuote(stage as QuoteStage, stage as QuoteStage, FULL_CONTEXT)).toBe(
        false
      );
    }
  });

  it('requires a client and at least one fee line before a quote can be sent', () => {
    const draft: QuoteStage = 'Draft Quote';
    expect(canTransitionQuote(draft, 'Quote Sent', { hasClient: false, hasFeeLines: true })).toBe(
      false
    );
    expect(canTransitionQuote(draft, 'Quote Sent', { hasClient: true, hasFeeLines: false })).toBe(
      false
    );
    expect(canTransitionQuote(draft, 'Quote Sent', { hasClient: false, hasFeeLines: false })).toBe(
      false
    );
    expect(canTransitionQuote(draft, 'Quote Sent', FULL_CONTEXT)).toBe(true);
  });

  it('does not gate acceptance, signature or activation on the send prerequisites', () => {
    const withoutContext = { hasClient: false, hasFeeLines: false };
    expect(canTransitionQuote('Quote Sent', 'Accepted', withoutContext)).toBe(true);
    expect(canTransitionQuote('Accepted', 'Signed', withoutContext)).toBe(true);
    expect(canTransitionQuote('Signed', 'Active Client', withoutContext)).toBe(true);
  });

  it('refuses to lose a quote once it is signed or active', () => {
    expect(canTransitionQuote('Signed', 'Closed Lost', FULL_CONTEXT)).toBe(false);
    expect(canTransitionQuote('Active Client', 'Closed Lost', FULL_CONTEXT)).toBe(false);
    expect(canTransitionQuote('Closed Lost', 'Draft Quote', FULL_CONTEXT)).toBe(false);
    expect(canTransitionQuote('Closed Lost', 'Quote Sent', FULL_CONTEXT)).toBe(false);
  });

  it('never skips stages forward and never walks backwards', () => {
    expect(canTransitionQuote('Draft Quote', 'Accepted', FULL_CONTEXT)).toBe(false);
    expect(canTransitionQuote('Draft Quote', 'Signed', FULL_CONTEXT)).toBe(false);
    expect(canTransitionQuote('Quote Sent', 'Signed', FULL_CONTEXT)).toBe(false);
    expect(canTransitionQuote('Quote Sent', 'Draft Quote', FULL_CONTEXT)).toBe(false);
    expect(canTransitionQuote('Signed', 'Accepted', FULL_CONTEXT)).toBe(false);
    expect(canTransitionQuote('Active Client', 'Signed', FULL_CONTEXT)).toBe(false);
  });
});

describe('Quote and invoice numbering', () => {
  it('numbers the first quote and invoice from a zero sequence', () => {
    expect(nextQuoteNumber(0)).toBe('Q-1');
    expect(nextInvoiceNumber(0)).toBe('INV-1');
  });

  it('increments an existing sequence', () => {
    expect(nextQuoteNumber(4)).toBe('Q-5');
    expect(nextInvoiceNumber(17)).toBe('INV-18');
  });
});

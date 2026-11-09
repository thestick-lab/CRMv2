import type { QuoteStage } from '@/context/PracticeStoreContext';

/**
 * Sales pipeline board order: the five forward stages of a fee quote followed
 * by the terminal `Closed Lost` lane.
 */
export const QUOTE_STAGE_ORDER: QuoteStage[] = [
  'Draft Quote',
  'Quote Sent',
  'Accepted',
  'Signed',
  'Active Client',
  'Closed Lost',
];

/** What the quote needs on record before the requested transition. */
export interface QuoteTransitionContext {
  hasClient: boolean;
  hasFeeLines: boolean;
  /**
   * Whether a Documenso envelope is recorded on the quote. Only the builder's
   * dispatch flow records one, so a board/menu/keyboard move can never mark a
   * quote `Signed` without the signature on file.
   */
  hasSignature?: boolean;
}

/**
 * Whether a quote may move between two stages.
 *
 * Send needs a client and at least one fee line; Accept needs Sent; Sign needs
 * Accepted; Active Client needs Signed; Closed Lost is only reachable from
 * Draft, Sent or Accepted. Every other move — backwards, skipped stages, or a
 * move onto the current stage — is refused.
 */
export function canTransitionQuote(
  from: QuoteStage,
  to: QuoteStage,
  ctx: QuoteTransitionContext
): boolean {
  if (from === to) return false;

  switch (to) {
    case 'Quote Sent':
      return from === 'Draft Quote' && ctx.hasClient && ctx.hasFeeLines;
    case 'Accepted':
      return from === 'Quote Sent';
    case 'Signed':
      return from === 'Accepted' && ctx.hasSignature === true;
    case 'Active Client':
      return from === 'Signed';
    case 'Closed Lost':
      return from === 'Draft Quote' || from === 'Quote Sent' || from === 'Accepted';
    case 'Draft Quote':
    default:
      return false;
  }
}

/** `Q-1` for a fresh sequence, `Q-<seq+1>` once quotes exist. */
export function nextQuoteNumber(sequence: number): string {
  return `Q-${sequence + 1}`;
}

/** `INV-1` for a fresh sequence, `INV-<seq+1>` once invoices exist. */
export function nextInvoiceNumber(sequence: number): string {
  return `INV-${sequence + 1}`;
}

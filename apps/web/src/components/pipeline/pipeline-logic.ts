import type { Invoice, Quote, QuoteStage } from '@/context/PracticeStoreContext';
import { cents, computeEstimate } from 'fdoncall-practice/domain/estimate';
import { diffDays, todayInSouthAfrica, type ISODate } from 'fdoncall-practice/domain/dates';
import { QUOTE_STAGE_ORDER } from '@/lib/quote-lifecycle';

/* ---------------------------------------------------------------------------
 * Sales pipeline figures (design §6.7).
 *
 * The estimate input on a quote is the authoritative record, so both the card
 * figure and the pipeline totals are derived from `computeEstimate` — nothing
 * is mirrored on the quote and left to drift.
 * ------------------------------------------------------------------------- */

export interface QuoteValue {
  /** Average month on the fee schedule, including VAT. */
  monthly: number;
  /** Twelve-month fee schedule total, including VAT. */
  annual: number;
}

export function quoteValue(quote: Quote): QuoteValue {
  const estimate = computeEstimate(quote.estimateInput);
  return { monthly: estimate.averageInclVat, annual: estimate.annualInclVat };
}

/** Stages that still hold value; `Closed Lost` is terminal and excluded. */
export const LIVE_STAGES: QuoteStage[] = QUOTE_STAGE_ORDER.filter(
  (stage) => stage !== 'Closed Lost'
);

export const AGING_BUCKETS = ['0–7 days', '8–14 days', '15–30 days', '31+ days'] as const;
export type AgingBucket = (typeof AGING_BUCKETS)[number];

/** From fifteen days a quote has gone quiet in its stage: amber, not red. */
export const AGING_AMBER_FROM_DAYS = 15;

/**
 * Days the quote has sat in its current stage. A stage move stamps
 * `updatedAt`, so that is the age basis; a future timestamp clamps to zero
 * rather than showing a negative age.
 */
export function ageDays(quote: Quote, asOf: ISODate = todayInSouthAfrica()): number {
  return Math.max(0, diffDays(asOf, quote.updatedAt.slice(0, 10)));
}

export function agingBucket(days: number): AgingBucket {
  if (days <= 7) return '0–7 days';
  if (days <= 14) return '8–14 days';
  if (days <= 30) return '15–30 days';
  return '31+ days';
}

export interface PipelineStageStat {
  stage: QuoteStage;
  value: number;
  /** Share of the live pipeline, one decimal. Zero when there is no value. */
  pct: number;
}

export interface PipelineAgingStat {
  bucket: AgingBucket;
  count: number;
}

export interface PipelineStats {
  /** Active clients: the quote became a signed retainer. */
  booked: number;
  /** Everything live that is not yet an active client. */
  openValue: number;
  byStage: PipelineStageStat[];
  aging: PipelineAgingStat[];
}

export function pipelineStats(
  quotes: Quote[],
  _invoices: Invoice[],
  asOf: ISODate = todayInSouthAfrica()
): PipelineStats {
  const live = quotes.filter((quote) => quote.stage !== 'Closed Lost');

  // Per-stage values first, so booked + open always reconcile to the donut.
  const byStage: PipelineStageStat[] = LIVE_STAGES.map((stage) => ({
    stage,
    value: cents(
      live
        .filter((quote) => quote.stage === stage)
        .reduce((sum, quote) => sum + quoteValue(quote).annual, 0)
    ),
    pct: 0,
  }));
  const total = cents(byStage.reduce((sum, entry) => sum + entry.value, 0));
  for (const entry of byStage) {
    entry.pct = total > 0 ? Math.round((entry.value / total) * 1000) / 10 : 0;
  }

  const booked = byStage.find((entry) => entry.stage === 'Active Client')?.value ?? 0;

  return {
    booked,
    openValue: cents(total - booked),
    byStage,
    aging: AGING_BUCKETS.map((bucket) => ({
      bucket,
      count: live.filter((quote) => agingBucket(ageDays(quote, asOf)) === bucket).length,
    })),
  };
}

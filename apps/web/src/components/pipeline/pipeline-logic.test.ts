import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { computeEstimate } from 'fdoncall-practice/domain/estimate';
import { addDays } from 'fdoncall-practice/domain/dates';
import { getInitialPracticeState, type Quote } from '@/context/PracticeStoreContext';
import { AGING_BUCKETS, ageDays, pipelineStats, quoteValue } from './pipeline-logic';

const AS_OF = '2026-11-20';

function seededQuotes(): Quote[] {
  return getInitialPracticeState().quotes;
}

const annualValue = (quote: Quote) => computeEstimate(quote.estimateInput).annualInclVat;

describe('Sales pipeline stats (design §6.7)', () => {
  it('separates booked (active clients) from the open pipeline', () => {
    const quotes = seededQuotes();
    const stats = pipelineStats(quotes, [], AS_OF);

    // The migrated seeds are all live opportunities — no active clients yet.
    expect(stats.booked).toBe(0);
    expect(stats.openValue).toBeCloseTo(quotes.reduce((sum, q) => sum + annualValue(q), 0), 2);

    // Stage shares reconcile to the same live total, never past 100%.
    expect(stats.byStage.map((entry) => entry.stage)).not.toContain('Closed Lost');
    expect(stats.byStage.reduce((sum, entry) => sum + entry.value, 0)).toBeCloseTo(
      stats.booked + stats.openValue,
      2
    );
    expect(stats.byStage.reduce((sum, entry) => sum + entry.pct, 0)).toBeCloseTo(100, 0);
  });

  it('counts an active client as booked, not open', () => {
    const quotes = seededQuotes();
    const active = { ...quotes[0], stage: 'Active Client' as const };
    const stats = pipelineStats([active, ...quotes.slice(1)], [], AS_OF);

    expect(stats.booked).toBeCloseTo(annualValue(active), 2);
    expect(stats.openValue).toBeCloseTo(
      quotes.slice(1).reduce((sum, q) => sum + annualValue(q), 0),
      2
    );
    expect(stats.byStage.find((entry) => entry.stage === 'Active Client')?.value).toBeCloseTo(
      annualValue(active),
      2
    );
  });

  it('excludes a closed-lost quote from the open pipeline', () => {
    const quotes = seededQuotes();
    const lost = { ...quotes[0], stage: 'Closed Lost' as const };
    const stats = pipelineStats([lost, ...quotes.slice(1)], [], AS_OF);

    expect(stats.booked).toBe(0);
    expect(stats.openValue).toBeCloseTo(
      quotes.slice(1).reduce((sum, q) => sum + annualValue(q), 0),
      2
    );
    expect(stats.byStage.map((entry) => entry.stage)).not.toContain('Closed Lost');
  });

  it('buckets a quote 20 days into Quote Sent in the 15–30 day ageing band', () => {
    const quotes = seededQuotes();
    const aged = {
      ...quotes[1],
      stage: 'Quote Sent' as const,
      updatedAt: `${addDays(AS_OF, -20)}T08:00:00.000Z`,
    };
    const fresh = {
      ...quotes[2],
      stage: 'Quote Sent' as const,
      updatedAt: `${addDays(AS_OF, -3)}T08:00:00.000Z`,
    };

    const stats = pipelineStats([aged, fresh], [], AS_OF);
    const bucket = (name: string) => stats.aging.find((entry) => entry.bucket === name)?.count;

    expect(ageDays(aged, AS_OF)).toBe(20);
    expect(bucket('15–30 days')).toBe(1);
    expect(bucket('0–7 days')).toBe(1);
    expect(stats.aging.map((entry) => entry.bucket)).toEqual([...AGING_BUCKETS]);
  });

  it('reports zeroes and no NaN shares for an empty pipeline', () => {
    const stats = pipelineStats([], [], AS_OF);

    expect(stats.booked).toBe(0);
    expect(stats.openValue).toBe(0);
    expect(stats.byStage.every((entry) => entry.value === 0 && entry.pct === 0)).toBe(true);
    expect(stats.aging.every((entry) => entry.count === 0)).toBe(true);
  });

  it('derives the monthly fee and annual value from the quote estimate', () => {
    const quote = seededQuotes()[0];
    const estimate = computeEstimate(quote.estimateInput);

    expect(quoteValue(quote).annual).toBeCloseTo(estimate.annualInclVat, 2);
    expect(quoteValue(quote).monthly).toBeCloseTo(estimate.averageInclVat, 2);
  });
});

describe('Sales pipeline view wiring (design §6.7)', () => {
  const view = fs.readFileSync('src/components/pipeline/SalesPipelineView.tsx', 'utf8');

  it('gates every board move through canTransitionQuote', () => {
    expect(view).toContain('canTransitionQuote(');
    expect(view).toContain('onMove={handleMove}');
    expect(view).toContain('keyboardEnabled');
  });

  it('renders the three tabs, the labelled KPI pair and the hosted quote builder', () => {
    for (const label of ['Pipeline', 'Quotes', 'Invoices']) {
      expect(view).toContain(`label: '${label}'`);
    }
    expect(view).toContain('Booked');
    expect(view).toContain('Open pipeline value');
    expect(view).toContain('<QuoteBuilderView');
    expect(view).toContain('initialQuoteId={editor.quoteId}');
  });

  it('keeps the invoice-editor seam on the register rows', () => {
    const invoices = fs.readFileSync('src/components/pipeline/InvoicesList.tsx', 'utf8');
    expect(invoices).toContain('onOpenInvoice');
    expect(invoices).toContain('onOpenInvoice(invoice.id)');
  });
});

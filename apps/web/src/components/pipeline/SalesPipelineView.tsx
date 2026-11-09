import * as React from 'react';
import { Plus, TrendingUp, Trophy } from 'lucide-react';
import { addDays, todayInSouthAfrica } from 'fdoncall-practice/domain/dates';
import { computeEstimate } from 'fdoncall-practice/domain/estimate';
import {
  usePracticeStore,
  type Quote,
  type QuoteStage,
} from '@/context/PracticeStoreContext';
import { canTransitionQuote, QUOTE_STAGE_ORDER } from '@/lib/quote-lifecycle';
import { PageHeader } from '@/components/ui/page-header';
import { CardHeaderWithLink, EmptyStateCard } from '@/components/ui/list-primitives';
import { Button } from '@/components/ui/button';
import { KanbanBoard, type KanbanColumn, type KanbanTone } from '@/components/kanban/KanbanBoard';
import { DonutChart } from '@/components/analytics/analytics-charts';
import { QuoteBuilderView } from '@/components/quote/QuoteBuilderView';
import { personInitials } from '@/lib/initials';
import { formatZar } from '@/components/quote/estimate-form';
import { can } from '@/lib/permissions';
import { canViewInvoices, invoicesForRole } from '@/lib/invoice-access';
import { cn } from '@/lib/utils';
import { QuoteCard, type PipelineCard } from './QuoteCard';
import { QuotesList } from './QuotesList';
import { InvoicesList } from './InvoicesList';
import { ageDays, pipelineStats, quoteValue } from './pipeline-logic';

export interface SalesPipelineViewProps {
  /**
   * Invoice editor seam for the billing screen. While it is absent the invoice
   * register renders read-only rows.
   */
  onOpenInvoice?: (invoiceId: string) => void;
  /** Quote builder → invoice editor seam: the next unbilled month of a quote. */
  onCreateInvoice?: (quote: Quote) => void;
  /** Client record → New Quote: pre-selects the client in the builder. */
  initialClientCode?: string;
  /** Called once the initial client has opened the builder, so it opens once. */
  onInitialClientConsumed?: () => void;
}

const STAGE_TONE: Record<QuoteStage, KanbanTone> = {
  'Draft Quote': 'neutral',
  'Quote Sent': 'progress',
  Accepted: 'ready',
  Signed: 'ready',
  'Active Client': 'done',
  'Closed Lost': 'danger',
};

const NEXT_STEP: Record<QuoteStage, string | undefined> = {
  'Draft Quote': 'Send proposal',
  'Quote Sent': 'Follow up on proposal',
  Accepted: 'Send for signature',
  Signed: 'Convert to active client',
  'Active Client': 'Onboarding complete',
  'Closed Lost': undefined,
};

const OWNER_TINTS = ['crimson', 'amber', 'muted'] as const;

export interface InitialClientIntent {
  /** The request still in flight; `undefined` once the parent clears it. */
  consumed: string | undefined;
  /** The client code to open the builder with on this pass, if any. */
  open: string | undefined;
}

/**
 * Fold one pass of the `initialClientCode` prop into the consumed request.
 *
 * The parent clears the prop (`onInitialClientConsumed`) the moment the builder
 * opens, so clearing resets the latch: the *same* client's next `New Quote`
 * must open the builder again. A repeated request only no-ops while the prop
 * still carries the code that was already consumed in this pass.
 */
export function consumeInitialClientCode(
  consumed: string | undefined,
  initialClientCode: string | undefined
): InitialClientIntent {
  if (!initialClientCode) return { consumed: undefined, open: undefined };
  if (consumed === initialClientCode) return { consumed, open: undefined };
  return { consumed: initialClientCode, open: initialClientCode };
}

type Period = 'all' | '90d' | '30d';

const PERIODS: { id: Period; label: string; days?: number }[] = [
  { id: 'all', label: 'All time' },
  { id: '90d', label: 'Last 90 days', days: 90 },
  { id: '30d', label: 'Last 30 days', days: 30 },
];

const TABS = [
  { id: 'pipeline', label: 'Pipeline' },
  { id: 'quotes', label: 'Quotes' },
  { id: 'invoices', label: 'Invoices' },
] as const;

type TabId = (typeof TABS)[number]['id'];

/** Compact money for tight slots (donut centre); full rand figures elsewhere. */
function compactZar(value: number): string {
  if (value >= 1_000_000) return `R ${(value / 1_000_000).toFixed(1)}m`;
  if (value >= 1_000) return `R ${Math.round(value / 1_000)}k`;
  return `R ${Math.round(value)}`;
}

/** Why a stage move was refused, in the words the user needs on the card. */
function transitionBlockReason(
  to: QuoteStage,
  ctx: { hasClient: boolean; hasFeeLines: boolean; hasSignature?: boolean }
): string {
  if (to === 'Quote Sent') {
    if (!ctx.hasClient) return 'Add a client or prospect before sending this quote.';
    if (!ctx.hasFeeLines) return 'Add at least one fee line before sending this quote.';
    return 'This quote cannot be sent from its current stage.';
  }
  switch (to) {
    case 'Accepted':
      return 'Only a sent quote can be accepted.';
    case 'Signed':
      if (!ctx.hasSignature) {
        return 'Open the quote builder and send it for signature — the board cannot sign a quote without a recorded Documenso envelope.';
      }
      return 'Only an accepted quote can go for signature.';
    case 'Active Client':
      return 'Only a signed quote can become an active client.';
    case 'Closed Lost':
      return 'A signed or active quote cannot be closed lost.';
    case 'Draft Quote':
      return 'A quote cannot move back to draft.';
    default:
      return 'That stage change is not allowed.';
  }
}

export function SalesPipelineView({
  onOpenInvoice,
  onCreateInvoice,
  initialClientCode,
  onInitialClientConsumed,
}: SalesPipelineViewProps) {
  const {
    quotes,
    invoices,
    clients,
    staff,
    currentUser,
    updateQuote,
    convertQuoteToClient,
    logActivity,
    permissions,
  } = usePracticeStore();

  // `Quotes — view/create/send` opens this board; the invoice register behind
  // it is a separate §6.9 grant, so both the tab and its rows are gated.
  const canReadInvoices = canViewInvoices(currentUser.role, permissions.matrix);
  const tabs = React.useMemo(
    () => TABS.filter((entry) => entry.id !== 'invoices' || canReadInvoices),
    [canReadInvoices]
  );
  const [tab, setTab] = React.useState<TabId>('pipeline');
  const [period, setPeriod] = React.useState<Period>('all');
  const [editor, setEditor] = React.useState<{
    quoteId?: string;
    clientCode?: string;
  } | null>(null);
  const [feedback, setFeedback] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (tab === 'invoices' && !canReadInvoices) setTab('pipeline');
  }, [tab, canReadInvoices]);

  // A client record's `New Quote` opens the builder once per request. The
  // parent clears `initialClientCode` after consuming it, which also clears the
  // latch so the same client can request the builder again.
  const consumedInitialClient = React.useRef<string | undefined>(undefined);
  React.useEffect(() => {
    const intent = consumeInitialClientCode(
      consumedInitialClient.current,
      initialClientCode
    );
    consumedInitialClient.current = intent.consumed;
    if (!intent.open) return;
    setEditor({ clientCode: intent.open });
    onInitialClientConsumed?.();
  }, [initialClientCode, onInitialClientConsumed]);

  const today = todayInSouthAfrica();

  React.useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => setFeedback(null), 5000);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  const visibleQuotes = React.useMemo(() => {
    const days = PERIODS.find((entry) => entry.id === period)?.days;
    if (!days) return quotes;
    const cutoff = `${addDays(today, -days)}T00:00:00.000Z`;
    return quotes.filter((quote) => quote.createdAt >= cutoff);
  }, [quotes, period, today]);

  const stats = React.useMemo(
    () => pipelineStats(visibleQuotes, invoices, today),
    [visibleQuotes, invoices, today]
  );

  const cards = React.useMemo(
    () =>
      visibleQuotes.map((quote): PipelineCard => {
        const client = quote.clientCode
          ? clients.find((entry) => entry.code === quote.clientCode)
          : undefined;
        const ownerIndex = staff.findIndex((member) => member.id === quote.ownerStaffId);
        const ownerName = ownerIndex >= 0 ? staff[ownerIndex].name : currentUser.name;
        const value = quoteValue(quote);

        return {
          id: quote.id,
          quoteId: quote.id,
          name: client?.name ?? quote.prospect?.name ?? quote.number,
          number: quote.number,
          clientCode: quote.clientCode,
          stage: quote.stage,
          monthlyFee: value.monthly,
          annualValue: value.annual,
          ownerName,
          ownerInitials: personInitials(ownerName),
          ownerTint: OWNER_TINTS[Math.max(ownerIndex, 0) % OWNER_TINTS.length],
          ageDays: ageDays(quote, today),
          nextStep: quote.nextStep,
        };
      }),
    [visibleQuotes, clients, staff, currentUser.name, today]
  );

  const columns = React.useMemo<KanbanColumn<PipelineCard>[]>(
    () =>
      QUOTE_STAGE_ORDER.map((stage) => {
        const stageCards = cards.filter((card) => card.stage === stage);
        const value = stats.byStage.find((entry) => entry.stage === stage)?.value ?? 0;
        return {
          id: stage,
          title: stage,
          tone: STAGE_TONE[stage],
          hint: `${formatZar(value, 0)} · ${stageCards.length} ${
            stageCards.length === 1 ? 'opp' : 'opps'
          }`,
          cards: stageCards,
        };
      }),
    [cards, stats.byStage]
  );

  const openQuote = (quoteId: string) => setEditor({ quoteId });

  const nameOf = (quote: Quote) =>
    (quote.clientCode ? clients.find((entry) => entry.code === quote.clientCode)?.name : undefined) ??
    quote.prospect?.name ??
    quote.number;

  const handleMove = (cardId: string, toColumn: string) => {
    const quote = quotes.find((entry) => entry.id === cardId);
    if (!quote) return;
    const to = toColumn as QuoteStage;
    const name = nameOf(quote);

    const signsQuote = to === 'Accepted' || to === 'Signed' || to === 'Active Client';
    if (signsQuote && !can(currentUser.role, 'Quotes', 'accept-sign', permissions.matrix)) {
      setFeedback(`${currentUser.role} cannot accept or sign quotes.`);
      return;
    }
    if (
      !signsQuote &&
      !can(currentUser.role, 'Quotes', 'view-create-send', permissions.matrix)
    ) {
      setFeedback(`${currentUser.role} cannot move quotes on this board.`);
      return;
    }

    if (quote.stage === to) {
      setFeedback(`${name} is already in ${to}.`);
      return;
    }

    const estimate = computeEstimate(quote.estimateInput);
    const ctx = {
      hasClient: Boolean(quote.clientCode) || Boolean(quote.prospect?.name.trim()),
      hasFeeLines: estimate.lines.length > 0,
      hasSignature: Boolean(quote.documensoEnvelopeId),
    };

    if (!canTransitionQuote(quote.stage, to, ctx)) {
      setFeedback(transitionBlockReason(to, ctx));
      return;
    }

    // Active Client is the conversion: it creates (or refreshes) the client
    // record, saves the estimate and materialises the quoted scope's work.
    if (to === 'Active Client') {
      convertQuoteToClient(quote.id);
      setFeedback(
        quote.clientCode
          ? `Updated ${name}'s services from ${quote.number}.`
          : `${name} is now an active client.`
      );
      return;
    }

    updateQuote(quote.id, {
      stage: to,
      nextStep: NEXT_STEP[to],
      updatedAt: new Date().toISOString(),
    });
    logActivity({
      type: 'quote',
      quoteId: quote.id,
      actorName: currentUser.name,
      actorInitials: personInitials(currentUser.name),
      tint: 'muted',
      text: `Quote ${quote.number} moved to ${to}`,
      subline: `${name} · ${formatZar(quoteValue(quote).annual, 0)} incl. 15% VAT`,
    });
    setFeedback(`Moved ${name} to ${to}.`);
  };

  const bookedCount = cards.filter((card) => card.stage === 'Active Client').length;
  const openCount = cards.filter(
    (card) => card.stage !== 'Active Client' && card.stage !== 'Closed Lost'
  ).length;
  const liveTotal = stats.booked + stats.openValue;

  const momentum = React.useMemo(
    () =>
      [...cards]
        .filter((card) => card.stage !== 'Active Client' && card.stage !== 'Closed Lost')
        .sort((a, b) => b.ageDays - a.ageDays)
        .slice(0, 3),
    [cards]
  );
  const maxAging = Math.max(...stats.aging.map((entry) => entry.count), 1);

  return (
    <div className="mx-auto max-w-[1500px] space-y-5 p-6">
      <PageHeader
        eyebrow="Sales Pipeline"
        title="Quotes and invoices"
        subtitle="Fee quotes moving from draft to active retainer, and the invoices raised against them."
        actions={
          <>
            <label className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2 py-1 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
              <span className="sr-only">Period</span>
              <select
                value={period}
                onChange={(event) => setPeriod(event.target.value as Period)}
                aria-label="Period"
                className="bg-transparent font-mono text-[11px] uppercase tracking-wide text-foreground outline-none"
              >
                {PERIODS.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.label}
                  </option>
                ))}
              </select>
            </label>
            <Button
              type="button"
              onClick={() => setEditor({})}
              className="gap-1.5"
              size="sm"
              disabled={
                !can(currentUser.role, 'Quotes', 'view-create-send', permissions.matrix)
              }
              title={
                can(currentUser.role, 'Quotes', 'view-create-send', permissions.matrix)
                  ? undefined
                  : `${currentUser.role} cannot create quotes`
              }
            >
              <Plus className="h-3.5 w-3.5" />
              New Quote
            </Button>
          </>
        }
      />

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,320px)]">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Booked
            </p>
            <Trophy className="h-3.5 w-3.5 text-[#c4161c]" aria-hidden="true" />
          </div>
          <p className="mt-2 font-mono text-2xl font-semibold leading-none tabular-nums text-foreground">
            {formatZar(stats.booked, 0)}
          </p>
          <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
            Active clients · {bookedCount} {bookedCount === 1 ? 'retainer' : 'retainers'} · annual
            fees incl. VAT
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Open pipeline value
            </p>
            <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
          </div>
          <p className="mt-2 font-mono text-2xl font-semibold leading-none tabular-nums text-foreground">
            {formatZar(stats.openValue, 0)}
          </p>
          <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
            Draft to signed · {openCount} {openCount === 1 ? 'quote' : 'quotes'} not yet active ·
            annual fees incl. VAT
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card">
          <CardHeaderWithLink title="Pipeline snapshot" />
          <div className="p-4">
            {liveTotal > 0 ? (
              <DonutChart
                slices={stats.byStage
                  .filter((entry) => entry.value > 0)
                  .map((entry) => ({
                    label: entry.stage,
                    pct: entry.pct,
                    detail: compactZar(entry.value),
                  }))}
                centerValue={compactZar(liveTotal)}
                centerLabel="pipeline"
              />
            ) : (
              <p className="py-6 text-center text-[11px] leading-relaxed text-muted-foreground">
                No quoted value in this period.
              </p>
            )}
          </div>
        </div>
      </section>

      <p className="px-1 text-[10px] leading-relaxed text-muted-foreground">
        Booked and open pipeline value are separate figures — an active client is never counted in
        the open pipeline.
      </p>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-3">
          <div role="tablist" aria-label="Sales pipeline tabs" className="flex items-center gap-1 border-b border-border">
            {tabs.map((entry) => (
              <button
                key={entry.id}
                type="button"
                role="tab"
                aria-selected={tab === entry.id}
                aria-controls="sales-panel"
                id={`sales-tab-${entry.id}`}
                onClick={() => setTab(entry.id)}
                className={cn(
                  '-mb-px border-b-2 px-3 py-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#c4161c]',
                  tab === entry.id
                    ? 'border-[#c4161c] text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
              >
                {entry.label}
              </button>
            ))}
          </div>

          <div
            role="tabpanel"
            id="sales-panel"
            aria-labelledby={`sales-tab-${tab}`}
            className="pt-1"
          >
            {tab === 'pipeline' &&
              (columns.every((column) => column.cards.length === 0) ? (
                <EmptyStateCard
                  icon={TrendingUp}
                  title={quotes.length === 0 ? 'No quotes yet' : 'No quotes in this period'}
                  subtitle={
                    quotes.length === 0
                      ? 'Create a fee quote to track a prospect from draft through to an active client.'
                      : 'Widen the period filter to see the rest of the pipeline.'
                  }
                />
              ) : (
                <div className="space-y-2">
                  <KanbanBoard
                    columns={columns}
                    onMove={handleMove}
                    onOpenCard={(card) => openQuote(card.quoteId)}
                    renderCard={(card) => <QuoteCard card={card} />}
                    keyboardEnabled
                  />
                  <p className="px-1 text-[10px] leading-relaxed text-muted-foreground">
                    Stage rules are enforced for drag, the move menu and the keyboard: a quote is
                    sent only with a client and a fee line, accepted after it is sent, signed after
                    it is accepted, and an active client only after signature.
                  </p>
                </div>
              ))}

            {tab === 'quotes' &&
              (cards.length === 0 ? (
                <EmptyStateCard
                  icon={TrendingUp}
                  title="No quotes to show"
                  subtitle="Quotes appear in the register as soon as they are drafted."
                />
              ) : (
                <QuotesList rows={cards} onOpenQuote={openQuote} />
              ))}

            {tab === 'invoices' && canReadInvoices && (
              <InvoicesList
                invoices={invoicesForRole(currentUser.role, permissions.matrix, invoices)}
                clients={clients}
                quotes={quotes}
                onOpenInvoice={onOpenInvoice}
                today={today}
              />
            )}
          </div>
        </div>

        <aside className="space-y-4">
          <section className="rounded-xl border border-border bg-card">
            <CardHeaderWithLink title="Ageing" />
            <div className="space-y-2.5 p-4">
              {stats.aging.map((entry) => {
                const amber = entry.bucket === '15–30 days' || entry.bucket === '31+ days';
                return (
                  <div key={entry.bucket} className="space-y-1">
                    <div className="flex items-center justify-between gap-2 text-[11px]">
                      <span className="text-muted-foreground">{entry.bucket}</span>
                      <span className="font-mono tabular-nums text-foreground">{entry.count}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn('h-full rounded-full', amber ? 'bg-amber-500' : 'bg-[#c4161c]/70')}
                        style={{ width: `${(entry.count / maxAging) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              <p className="pt-1 text-[10px] leading-relaxed text-muted-foreground">
                Days in stage. Amber from 15 days — the quote has gone quiet.
              </p>
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card">
            <CardHeaderWithLink title="Keep momentum" />
            <div className="divide-y divide-border/60">
              {momentum.length === 0 ? (
                <p className="px-4 py-5 text-[11px] leading-relaxed text-muted-foreground">
                  No live quote needs a nudge right now.
                </p>
              ) : (
                momentum.map((card) => (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => openQuote(card.quoteId)}
                    className="flex w-full items-start justify-between gap-2 px-4 py-2.5 text-left outline-none transition-colors hover:bg-muted/40 focus-visible:bg-muted/40"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[11px] font-medium text-foreground">
                        {card.name}
                      </span>
                      <span className="block truncate text-[10px] text-muted-foreground">
                        {card.nextStep || card.stage}
                      </span>
                    </span>
                    <span className="mt-0.5 shrink-0 font-mono text-[10px] tabular-nums text-muted-foreground">
                      {card.ageDays}d
                    </span>
                  </button>
                ))
              )}
            </div>
          </section>
        </aside>
      </div>

      {feedback && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 left-1/2 z-[60] -translate-x-1/2 rounded-lg border border-border bg-card px-3.5 py-2 text-xs text-foreground shadow-lg"
        >
          {feedback}
        </div>
      )}

      {editor && (
        <QuoteBuilderView
          initialQuoteId={editor.quoteId}
          initialClientCode={editor.clientCode}
          onClose={() => setEditor(null)}
          onCreateInvoice={onCreateInvoice}
        />
      )}
    </div>
  );
}

import * as React from 'react';
import type { Client } from 'fdoncall-practice/domain/types';
import {
  computeEstimate,
  type Estimate,
  type EstimateInput,
} from 'fdoncall-practice/domain/estimate';
import { addDays, todayInSouthAfrica } from 'fdoncall-practice/domain/dates';
import type {
  Quote,
  QuoteProspect,
  QuoteStage,
} from '@/context/PracticeStoreContext';
import { usePracticeStore } from '@/context/PracticeStoreContext';
import {
  canTransitionQuote,
  nextQuoteNumber,
  QUOTE_STAGE_ORDER,
} from '@/lib/quote-lifecycle';
import { downloadExcelQuote, downloadPdfQuote } from '@/lib/export-actions';
import { personInitials } from '@/lib/initials';
import {
  DocumensoDispatchDialog,
} from '@/components/integrations/DocumensoDispatchDialog';
import type { DocumensoEnvelope } from '@/lib/integrations/documenso';
import { Button } from '@/components/ui/button';
import { can } from '@/lib/permissions';
import { cn } from '@/lib/utils';
import {
  ArrowLeft,
  ArrowRight,
  CircleAlert,
  CircleCheck,
  Download,
  FileSpreadsheet,
  FileSignature,
  Receipt,
  Save,
  Send,
  X,
} from 'lucide-react';
import {
  defaultEstimateInputForClient,
  defaultProspectInput,
  formatZar,
  monthlyRetainerHoursFrom,
  pricingBandReset,
} from './estimate-form';
import { QuoteClientSelect } from './QuoteClientSelect';
import { QuoteScopeStep } from './QuoteScopeStep';
import { QuoteFeeScheduleStep } from './QuoteFeeScheduleStep';
import { QuoteDocumentPreview } from './QuoteDocumentPreview';

export interface QuoteBuilderViewProps {
  /** Existing quote to edit; omit for a new quote. */
  initialQuoteId?: string;
  /** Pre-selects an existing client for a new quote (client record → New Quote). */
  initialClientCode?: string;
  onClose: () => void;
  /** Invoice creation seam consumed by the invoice editor (Task 14). */
  onCreateInvoice?: (quote: Quote) => void;
}

interface QuoteFormState {
  mode: 'client' | 'prospect';
  clientCode?: string;
  prospect: QuoteProspect;
  input: EstimateInput;
  retainerHours: number;
  adHocRate: number;
  vatInclusive: boolean;
  paymentTerms: string;
  expiryDate: string;
  ownerStaffId: string;
}

const PAYMENT_TERMS = ['On presentation', '14 days', '30 days', '60 days'];

const QUOTE_NEXT_STEP: Record<QuoteStage, string> = {
  'Draft Quote': 'Send proposal',
  'Quote Sent': 'Follow up on proposal',
  Accepted: 'Send for signature',
  Signed: 'Convert to active client',
  'Active Client': 'Onboarding complete',
  'Closed Lost': '',
};

const CURRENT_STAGES = QUOTE_STAGE_ORDER.filter((stage) => stage !== 'Closed Lost');

function blankProspect(staffId: string): QuoteProspect {
  return {
    name: '',
    contactPerson: '',
    entityType: 'Company',
    turnover: 4_000_000,
    payroll: true,
    employeeCount: 8,
    vatCategory: 'B',
    yearEndMonth: 2,
    staffId,
  };
}

function prospectFromClient(client: Client): QuoteProspect {
  return {
    name: client.name,
    contactPerson: client.contacts?.[0]?.name ?? '',
    entityType: client.entityType,
    turnover: client.turnover,
    payroll: client.payroll,
    employeeCount: client.employeeCount,
    vatCategory: client.vatCategory,
    yearEndMonth: client.yearEndMonth,
    incorporationDate: client.incorporationDate,
    staffId: client.staffId,
  };
}

/**
 * Why a stage action is blocked. The reducer does not validate quote stages, so
 * every action in this builder asks `canTransitionQuote` first and disables
 * itself with this reason when the transition is illegal.
 */
function stageBlockReason(
  from: QuoteStage,
  to: QuoteStage,
  ctx: { hasClient: boolean; hasFeeLines: boolean }
): string | null {
  if (from === to) return `Already at ${to}`;
  if (canTransitionQuote(from, to, ctx)) return null;

  if (to === 'Quote Sent') {
    if (!ctx.hasClient) return 'Choose or name a client before sending';
    if (!ctx.hasFeeLines) return 'Add at least one fee line before sending';
    return 'Only a draft quote can be sent';
  }
  if (to === 'Accepted') {
    return from === 'Draft Quote'
      ? 'Send the quote before recording the client’s acceptance'
      : 'Acceptance is recorded from a sent quote';
  }
  if (to === 'Signed') {
    return from === 'Accepted'
      ? 'Signature needs an accepted quote'
      : 'Signature is captured after the client accepts';
  }
  if (to === 'Active Client') {
    return 'Only a signed quote can become an active client';
  }
  if (to === 'Closed Lost') {
    return 'Lost is recorded from draft, sent or accepted quotes only';
  }
  return `Cannot move from ${from} to ${to}`;
}

function quotePatch(quote: Quote): Partial<Omit<Quote, 'id' | 'createdAt'>> {
  return {
    number: quote.number,
    clientCode: quote.clientCode,
    prospect: quote.prospect,
    estimateInput: quote.estimateInput,
    monthlyRetainerHours: quote.monthlyRetainerHours,
    adHocHourlyRate: quote.adHocHourlyRate,
    vatInclusive: quote.vatInclusive,
    paymentTerms: quote.paymentTerms,
    expiryDate: quote.expiryDate,
    stage: quote.stage,
    ownerStaffId: quote.ownerStaffId,
    nextStep: quote.nextStep,
    documensoEnvelopeId: quote.documensoEnvelopeId,
    signedBy: quote.signedBy,
    signedAt: quote.signedAt,
    updatedAt: quote.updatedAt,
    stageChangedAt: quote.stageChangedAt,
  };
}

function initialFormState(
  quote: Quote | undefined,
  client: Client | undefined,
  savedEstimates: Record<string, EstimateInput>,
  rates: { standardHourlyRate: number; marchEscalationPct: number; serviceFees: Record<string, number> },
  currentUserId: string
): QuoteFormState {
  if (quote) {
    const mode = quote.clientCode ? 'client' : 'prospect';
    const prospect = quote.prospect ?? (client ? prospectFromClient(client) : blankProspect(currentUserId));
    return {
      mode,
      clientCode: quote.clientCode,
      prospect,
      input: quote.estimateInput,
      retainerHours: quote.monthlyRetainerHours,
      adHocRate: quote.adHocHourlyRate,
      vatInclusive: quote.vatInclusive,
      paymentTerms: quote.paymentTerms,
      expiryDate: quote.expiryDate ?? addDays(todayInSouthAfrica(), 30),
      ownerStaffId: quote.ownerStaffId,
    };
  }

  if (client) {
    const input = savedEstimates[client.code] ?? defaultEstimateInputForClient(client, rates);
    return {
      mode: 'client',
      clientCode: client.code,
      prospect: prospectFromClient(client),
      input,
      retainerHours: monthlyRetainerHoursFrom(input),
      adHocRate: rates.standardHourlyRate,
      vatInclusive: false,
      paymentTerms: '30 days',
      expiryDate: addDays(todayInSouthAfrica(), 30),
      ownerStaffId: client.staffId,
    };
  }

  const input = defaultProspectInput(rates);
  return {
    mode: 'prospect',
    prospect: blankProspect(currentUserId),
    input,
    retainerHours: monthlyRetainerHoursFrom(input),
    adHocRate: rates.standardHourlyRate,
    vatInclusive: false,
    paymentTerms: '30 days',
    expiryDate: addDays(todayInSouthAfrica(), 30),
    ownerStaffId: currentUserId,
  };
}

/**
 * The quote builder: three left-pane steps (client, scope, fee schedule) and a
 * live document preview on the right. Hosted by the Sales Pipeline view as an
 * overlay route; `onClose` returns to the host.
 */
export function QuoteBuilderView({
  initialQuoteId,
  initialClientCode,
  onClose,
  onCreateInvoice,
}: QuoteBuilderViewProps) {
  const {
    quotes,
    clients,
    staff,
    savedEstimates,
    rates,
    sequences,
    currentUser,
    addQuote,
    updateQuote,
    logActivity,
    permissions,
  } = usePracticeStore();

  const editingQuote = initialQuoteId ? quotes.find((quote) => quote.id === initialQuoteId) : undefined;
  const initialClient = initialClientCode
    ? clients.find((client) => client.code === initialClientCode)
    : editingQuote?.clientCode
      ? clients.find((client) => client.code === editingQuote.clientCode)
      : undefined;

  const [form, setForm] = React.useState<QuoteFormState>(() =>
    initialFormState(editingQuote, initialClient, savedEstimates, rates, currentUser.id)
  );
  const [step, setStep] = React.useState(0);
  const [savedId, setSavedId] = React.useState<string | undefined>(editingQuote?.id);
  const [number, setNumber] = React.useState(editingQuote?.number ?? nextQuoteNumber(sequences.quote));
  const [stage, setStage] = React.useState<QuoteStage>(editingQuote?.stage ?? 'Draft Quote');
  const [signature, setSignature] = React.useState({
    signedBy: editingQuote?.signedBy,
    signedAt: editingQuote?.signedAt,
    envelopeId: editingQuote?.documensoEnvelopeId,
  });
  const [documensoOpen, setDocumensoOpen] = React.useState(false);
  const [feedback, setFeedback] = React.useState<{ tone: 'success' | 'error'; text: string } | null>(
    null
  );

  const savedQuote = savedId ? quotes.find((quote) => quote.id === savedId) : undefined;
  const client = form.clientCode
    ? clients.find((entry) => entry.code === form.clientCode)
    : undefined;

  const estimate = React.useMemo<Estimate>(
    () => computeEstimate({ ...form.input, fixedFees: rates.serviceFees }),
    [form.input, rates.serviceFees]
  );

  const displayName = client?.name ?? form.prospect.name.trim();
  const preparedFor = client?.contacts?.[0]?.name ?? form.prospect.contactPerson;
  const ownerStaffId =
    form.mode === 'client'
      ? client?.staffId ?? form.ownerStaffId
      : form.prospect.staffId ?? form.ownerStaffId;
  const partnerName = staff.find((member) => member.id === ownerStaffId)?.name ?? currentUser.name;

  const transitionContext = {
    hasClient: form.mode === 'client' ? Boolean(form.clientCode) : form.prospect.name.trim().length > 0,
    hasFeeLines: estimate.lines.length > 0,
    // This builder is the only place that records a signature: its `Sign`
    // action opens Documenso and persists the envelope id on dispatch.
    hasSignature: true,
  };

  const exportClient: Client =
    client ?? {
      code: 'PROSPECT',
      name: displayName || 'New prospect',
      entityType: form.prospect.entityType,
      yearEndMonth: form.prospect.yearEndMonth ?? 2,
      yearEndAssumed: true,
      turnover: form.prospect.turnover,
      vatCategory: form.prospect.vatCategory,
      payroll: Boolean(form.prospect.payroll),
      employeeCount: form.prospect.employeeCount,
      staffId: form.prospect.staffId ?? form.ownerStaffId,
      status: 'Active',
      efilingProfile: 'client',
      lastAfsYear: null,
      lastIncomeTaxYear: null,
      lastAnnualReturnYear: null,
      beneficialOwnershipFiled: null,
      taxElsewhere: false,
    };

  const buildQuote = (targetStage: QuoteStage, overrides: Partial<Quote> = {}): Quote => {
    const now = new Date().toISOString();
    return {
      id: savedId ?? `quote-${now.replace(/[^0-9]/g, '')}`,
      number,
      clientCode: form.mode === 'client' ? form.clientCode : undefined,
      prospect: form.mode === 'prospect' ? form.prospect : undefined,
      estimateInput: { ...form.input, fixedFees: rates.serviceFees },
      monthlyRetainerHours: form.retainerHours,
      adHocHourlyRate: form.adHocRate,
      vatInclusive: form.vatInclusive,
      paymentTerms: form.paymentTerms,
      expiryDate: form.expiryDate,
      stage: targetStage,
      ownerStaffId,
      nextStep: QUOTE_NEXT_STEP[targetStage] || undefined,
      documensoEnvelopeId: signature.envelopeId,
      signedBy: signature.signedBy,
      signedAt: signature.signedAt,
      createdAt: savedQuote?.createdAt ?? now,
      updatedAt: now,
      // Editing a quote never restarts its stage clock; the reducer stamps a new
      // one only when the stage itself changes.
      stageChangedAt: savedQuote?.stageChangedAt ?? now,
      ...overrides,
    };
  };

  const persist = (targetStage: QuoteStage, overrides: Partial<Quote> = {}): Quote => {
    const quote = buildQuote(targetStage, overrides);
    if (savedId) {
      updateQuote(savedId, quotePatch(quote));
    } else {
      addQuote(quote);
      setSavedId(quote.id);
      setNumber(quote.number);
    }
    return quote;
  };

  const logStage = (text: string, subline: string, quoteId: string) => {
    logActivity({
      type: 'quote',
      quoteId,
      actorName: currentUser.name,
      actorInitials: personInitials(currentUser.name),
      tint: 'crimson',
      text,
      subline,
    });
  };

  const handleSave = () => {
    if (!canManageQuotes) {
      setFeedback({ tone: 'error', text: `${currentUser.role} cannot create or edit quotes` });
      return;
    }
    persist(stage);
    setFeedback({
      tone: 'success',
      text: stage === 'Draft Quote' ? `Draft ${number} saved` : `Changes to ${number} saved`,
    });
  };

  const handleStageChange = (target: QuoteStage) => {
    const signsQuote = target === 'Accepted' || target === 'Signed' || target === 'Active Client';
    if (signsQuote && !canAcceptSign) {
      setFeedback({ tone: 'error', text: `${currentUser.role} cannot accept or sign quotes` });
      return;
    }
    if (
      !canManageQuotes &&
      (target === 'Quote Sent' || target === 'Closed Lost' || target === 'Draft Quote')
    ) {
      setFeedback({ tone: 'error', text: `${currentUser.role} cannot send or close quotes` });
      return;
    }
    const reason = stageBlockReason(stage, target, transitionContext);
    if (reason) {
      setFeedback({ tone: 'error', text: reason });
      return;
    }
    if (target === 'Signed') {
      setDocumensoOpen(true);
      return;
    }
    const saved = persist(target);
    setStage(target);
    setFeedback({
      tone: 'success',
      text:
        target === 'Quote Sent'
          ? `Quote ${number} sent to ${displayName || 'the client'}`
          : target === 'Accepted'
            ? `Quote ${number} accepted`
            : target === 'Closed Lost'
              ? `Quote ${number} marked closed lost`
              : `Quote ${number} moved to ${target}`,
    });
    logStage(
      target === 'Quote Sent'
        ? `Quote ${number} sent to ${displayName || 'the client'}`
        : `Quote ${number} moved to ${target}`,
      `${formatZar(estimate.annualInclVat)} incl. 15% VAT · ${displayName || 'New prospect'}`,
      saved.id
    );
  };

  const handleDispatched = (envelope: DocumensoEnvelope) => {
    const signatory = envelope.recipients[0]?.name ?? preparedFor ?? displayName;
    const signed = persist('Signed', {
      documensoEnvelopeId: envelope.envelopeId,
      signedBy: signatory,
      signedAt: envelope.sentAt,
    });
    setSignature({ signedBy: signatory, signedAt: envelope.sentAt, envelopeId: envelope.envelopeId });
    setStage('Signed');
    setDocumensoOpen(false);
    setFeedback({ tone: 'success', text: `Quote ${number} signed by ${signatory}` });
    logStage(
      `Quote ${number} signed by ${signatory}`,
      `Documenso ${envelope.envelopeId} · countersigned by ${partnerName}`,
      signed.id
    );
  };

  const handleCreateInvoice = () => {
    if (!canCreateInvoice) {
      setFeedback({ tone: 'error', text: `${currentUser.role} cannot create invoices` });
      return;
    }
    const quote = persist(stage);
    onCreateInvoice?.(quote);
  };

  const handleModeChange = (mode: 'client' | 'prospect') => {
    if (mode === form.mode) return;
    if (mode === 'prospect') {
      const input = defaultProspectInput(rates);
      setForm((previous) => ({
        ...previous,
        mode,
        clientCode: undefined,
        prospect: blankProspect(currentUser.id),
        input,
        retainerHours: monthlyRetainerHoursFrom(input),
      }));
      return;
    }
    setForm((previous) => ({
      ...previous,
      mode,
      clientCode: undefined,
      prospect: blankProspect(currentUser.id),
    }));
  };

  const handleClientSelected = (selected: Client) => {
    const input = savedEstimates[selected.code] ?? defaultEstimateInputForClient(selected, rates);
    setForm((previous) => ({
      ...previous,
      mode: 'client',
      clientCode: selected.code,
      prospect: prospectFromClient(selected),
      input,
      retainerHours: monthlyRetainerHoursFrom(input),
      ownerStaffId: selected.staffId,
    }));
    setStep(1);
  };

  const handleProspectChange = (patch: Partial<QuoteProspect>) => {
    setForm((previous) => {
      const prospect = { ...previous.prospect, ...patch };
      const input: EstimateInput = {
        ...previous.input,
        entityType: prospect.entityType,
        yearEndMonth: prospect.yearEndMonth ?? previous.input.yearEndMonth,
        vatCategory: prospect.vatCategory,
        turnover: prospect.turnover,
        payroll: Boolean(prospect.payroll),
        employeeCount: prospect.employeeCount,
        incorporationDate: prospect.incorporationDate,
      };
      return { ...previous, prospect, input, retainerHours: monthlyRetainerHoursFrom(input) };
    });
  };

  const handleInputChange = (next: EstimateInput) => {
    setForm((previous) => ({
      ...previous,
      input: next,
      retainerHours: monthlyRetainerHoursFrom(next),
    }));
  };

  const handleResetToBands = () => {
    setForm((previous) => {
      const input = pricingBandReset(previous.input, rates);
      return { ...previous, input, retainerHours: monthlyRetainerHoursFrom(input) };
    });
  };

  const canManageQuotes = can(
    currentUser.role,
    'Quotes',
    'view-create-send',
    permissions.matrix
  );
  const canAcceptSign = can(currentUser.role, 'Quotes', 'accept-sign', permissions.matrix);
  const canCreateInvoice = can(
    currentUser.role,
    'Invoices',
    'create-send',
    permissions.matrix
  );

  const sendReason = canManageQuotes
    ? stageBlockReason(stage, 'Quote Sent', transitionContext)
    : `${currentUser.role} cannot send quotes`;
  const acceptReason = canAcceptSign
    ? stageBlockReason(stage, 'Accepted', transitionContext)
    : `${currentUser.role} cannot accept quotes`;
  const signReason = canAcceptSign
    ? stageBlockReason(stage, 'Signed', transitionContext)
    : `${currentUser.role} cannot accept or sign quotes`;
  const lostReason = canManageQuotes
    ? stageBlockReason(stage, 'Closed Lost', transitionContext)
    : `${currentUser.role} cannot close quotes`;
  const invoiceOpen = stage === 'Accepted' || stage === 'Signed' || stage === 'Active Client';
  const invoiceReason = !canCreateInvoice
    ? `${currentUser.role} cannot create invoices`
    : !invoiceOpen
      ? 'An invoice can be raised from an accepted quote onward'
      : !onCreateInvoice
        ? 'The invoice editor opens from the invoices list'
        : null;

  const steps = [
    { title: 'Client', description: 'Who the quote is for' },
    { title: 'Scope', description: 'What the engagement covers' },
    { title: 'Fee schedule', description: 'Hours, timing and fees' },
  ];

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-background">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card/95 px-4 py-3 backdrop-blur">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close quote builder"
            className="rounded-md p-1.5 text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-1 focus-visible:ring-[#c4161c]"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Quote builder
            </p>
            <h1 className="truncate font-serif text-lg leading-tight text-foreground">
              {displayName || 'New prospect quote'}
            </h1>
          </div>
          <span className="rounded-full border border-border bg-muted/60 px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
            {number}
          </span>
          <span
            className={cn(
              'rounded-full border px-2 py-0.5 font-mono text-[11px]',
              stage === 'Closed Lost'
                ? 'border-border bg-muted text-muted-foreground'
                : 'border-[#c4161c]/25 bg-[#c4161c]/10 text-[#c4161c]'
            )}
          >
            {stage}
          </span>
        </div>

        <ol className="flex items-center gap-1 font-mono text-[11px] text-muted-foreground">
          {CURRENT_STAGES.map((entry, index) => (
            <React.Fragment key={entry}>
              {index > 0 && <li aria-hidden="true">→</li>}
              <li
                className={cn(
                  'rounded px-1.5 py-0.5',
                  entry === stage && 'bg-foreground text-background',
                  stage !== entry && 'text-muted-foreground'
                )}
              >
                {entry.replace(' Quote', '')}
              </li>
            </React.Fragment>
          ))}
        </ol>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,600px)]">
        <main className="min-h-0 overflow-y-auto">
          <div className="mx-auto max-w-3xl space-y-5 p-6">
            <nav aria-label="Quote steps" className="grid grid-cols-3 gap-2">
              {steps.map((entry, index) => (
                <button
                  key={entry.title}
                  type="button"
                  onClick={() => setStep(index)}
                  className={cn(
                    'rounded-lg border px-3 py-2 text-left outline-none transition-colors focus-visible:ring-1 focus-visible:ring-[#c4161c]',
                    index === step
                      ? 'border-[#c4161c]/40 bg-[#c4161c]/8'
                      : 'border-border bg-card hover:bg-muted/40'
                  )}
                  aria-current={index === step ? 'step' : undefined}
                >
                  <span className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
                    <span
                      className={cn(
                        'inline-flex h-4 w-4 items-center justify-center rounded-full border text-[11px]',
                        index === step
                          ? 'border-[#c4161c] bg-[#c4161c] text-white'
                          : 'border-border'
                      )}
                    >
                      {index + 1}
                    </span>
                    Step {index + 1}
                  </span>
                  <span className="mt-1 block text-xs font-semibold text-foreground">
                    {entry.title}
                  </span>
                  <span className="block text-[11px] leading-snug text-muted-foreground">
                    {entry.description}
                  </span>
                </button>
              ))}
            </nav>

            {step === 0 && (
              <div className="space-y-4">
                <QuoteClientSelect
                  mode={form.mode}
                  clientCode={form.clientCode}
                  prospect={form.prospect}
                  onModeChange={handleModeChange}
                  onClientSelected={handleClientSelected}
                  onProspectChange={handleProspectChange}
                />

                <section className="rounded-xl border border-border bg-card shadow-xs">
                  <header className="border-b border-border px-4 py-3">
                    <h3 className="text-sm font-semibold text-foreground">Quote terms</h3>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      Printed on the quote document and carried onto the invoice.
                    </p>
                  </header>
                  <div className="grid grid-cols-1 gap-4 px-4 py-4 sm:grid-cols-2">
                    <label className="block text-[11px] font-medium text-foreground">
                      Payment terms
                      <select
                        value={form.paymentTerms}
                        onChange={(event) =>
                          setForm((previous) => ({
                            ...previous,
                            paymentTerms: event.target.value,
                          }))
                        }
                        className="mt-1 w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none transition-colors focus-visible:border-[#c4161c]/60 focus-visible:ring-1 focus-visible:ring-[#c4161c]/40"
                      >
                        {PAYMENT_TERMS.map((terms) => (
                          <option key={terms} value={terms}>
                            {terms}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block text-[11px] font-medium text-foreground">
                      Valid until
                      <input
                        type="date"
                        value={form.expiryDate}
                        onChange={(event) =>
                          setForm((previous) => ({
                            ...previous,
                            expiryDate: event.target.value,
                          }))
                        }
                        className="mt-1 w-full rounded-lg border border-border bg-background px-2.5 py-1.5 font-mono text-xs text-foreground outline-none transition-colors focus-visible:border-[#c4161c]/60 focus-visible:ring-1 focus-visible:ring-[#c4161c]/40"
                      />
                    </label>
                  </div>
                </section>
              </div>
            )}

            {step === 1 && <QuoteScopeStep input={form.input} onChange={handleInputChange} />}

            {step === 2 && (
              <QuoteFeeScheduleStep
                input={form.input}
                estimate={estimate}
                onChange={handleInputChange}
                retainerHours={form.retainerHours}
                onRetainerHours={(hours) =>
                  setForm((previous) => ({ ...previous, retainerHours: hours }))
                }
                adHocRate={form.adHocRate}
                onAdHocRate={(rate) => setForm((previous) => ({ ...previous, adHocRate: rate }))}
                vatInclusive={form.vatInclusive}
                onVatInclusive={(vatInclusive) =>
                  setForm((previous) => ({ ...previous, vatInclusive }))
                }
                onResetToBands={handleResetToBands}
                serviceFees={rates.serviceFees}
              />
            )}

            <div className="flex items-center justify-between border-t border-border pt-4">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setStep((current) => Math.max(0, current - 1))}
                disabled={step === 0}
                className="gap-1.5 text-xs"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setStep((current) => Math.min(2, current + 1))}
                  disabled={step === 2}
                  className="gap-1.5 text-xs"
                >
                  Continue
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </main>

        <aside className="min-h-0 overflow-y-auto border-t border-border bg-muted/20 p-6 lg:border-l lg:border-t-0">
          <div className="mx-auto max-w-[560px]">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                Document preview
              </p>
              <span className="inline-flex items-center gap-1 font-mono text-[11px] text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-[#c4161c]" />
                Live
              </span>
            </div>
            <QuoteDocumentPreview
              number={number}
              stage={stage}
              clientName={displayName || 'New prospect'}
              clientCode={form.mode === 'client' ? form.clientCode : undefined}
              preparedFor={preparedFor}
              issueDate={todayInSouthAfrica()}
              expiryDate={form.expiryDate}
              estimate={estimate}
              vatInclusive={form.vatInclusive}
              paymentTerms={form.paymentTerms}
              partnerName={partnerName}
              signedBy={signature.signedBy}
              signedAt={signature.signedAt}
            />
          </div>
        </aside>
      </div>

      <footer className="border-t border-border bg-card px-4 py-3">
        {feedback && (
          <p
            role="status"
            className={cn(
              'mb-2 flex items-center gap-1.5 text-[11px]',
              feedback.tone === 'error'
                ? 'text-[#c4161c] dark:text-[#f87171]'
                : 'text-foreground'
            )}
          >
            {feedback.tone === 'error' ? (
              <CircleAlert className="h-3.5 w-3.5" />
            ) : (
              <CircleCheck className="h-3.5 w-3.5" />
            )}
            {feedback.text}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSave}
            disabled={!canManageQuotes}
            title={canManageQuotes ? undefined : `${currentUser.role} cannot create or edit quotes`}
            className="gap-1.5 text-xs"
          >
            <Save className="h-3.5 w-3.5" />
            {stage === 'Draft Quote' ? 'Save Draft' : 'Save changes'}
          </Button>

          <GatedAction reason={sendReason}>
            <Button
              type="button"
              size="sm"
              onClick={() => handleStageChange('Quote Sent')}
              disabled={Boolean(sendReason)}
              className="gap-1.5 text-xs"
            >
              <Send className="h-3.5 w-3.5" />
              Send Quote
            </Button>
          </GatedAction>

          <GatedAction reason={acceptReason}>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleStageChange('Accepted')}
              disabled={Boolean(acceptReason)}
              className="gap-1.5 text-xs"
            >
              <CircleCheck className="h-3.5 w-3.5" />
              Mark Accepted
            </Button>
          </GatedAction>

          <GatedAction reason={signReason}>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleStageChange('Signed')}
              disabled={Boolean(signReason)}
              className="gap-1.5 text-xs"
            >
              <FileSignature className="h-3.5 w-3.5" />
              Send for Signature
            </Button>
          </GatedAction>

          <GatedAction reason={invoiceReason}>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCreateInvoice}
              disabled={Boolean(invoiceReason)}
              className="gap-1.5 text-xs"
            >
              <Receipt className="h-3.5 w-3.5" />
              Create Invoice
            </Button>
          </GatedAction>

          <GatedAction reason={lostReason}>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleStageChange('Closed Lost')}
              disabled={Boolean(lostReason)}
              className="gap-1.5 text-xs text-muted-foreground"
            >
              <X className="h-3.5 w-3.5" />
              Mark Closed Lost
            </Button>
          </GatedAction>

          <span className="mx-1 hidden h-5 w-px bg-border sm:block" />

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void downloadPdfQuote(exportClient, estimate, todayInSouthAfrica())}
            className="gap-1.5 text-xs"
          >
            <Download className="h-3.5 w-3.5" />
            Download PDF
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void downloadExcelQuote(exportClient, estimate, todayInSouthAfrica())}
            className="gap-1.5 text-xs"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            Download Excel
          </Button>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Stage rules are enforced: send needs a client and a fee line; accept needs sent; signature
          needs accepted. A signed quote converts to an active client from the Sales Pipeline board.
        </p>
      </footer>

      <DocumensoDispatchDialog
        open={documensoOpen}
        onOpenChange={setDocumensoOpen}
        target={{ kind: 'quote', quote: buildQuote(stage), client }}
        onDispatched={handleDispatched}
      />
    </div>
  );
}

function GatedAction({ reason, children }: { reason: string | null; children: React.ReactNode }) {
  return (
    <span title={reason ?? undefined} data-blocked-reason={reason ?? undefined} className="inline-flex">
      {children}
    </span>
  );
}

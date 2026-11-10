import type { Estimate, EstimateGroup } from 'fdoncall-practice/domain/estimate';
import { formatDate } from 'fdoncall-practice/domain/dates';
import type { QuoteStage } from '@/context/PracticeStoreContext';
import { cn } from '@/lib/utils';
import { formatZar } from './estimate-form';

export interface QuoteDocumentPreviewProps {
  number: string;
  stage: QuoteStage;
  clientName: string;
  clientCode?: string;
  preparedFor: string;
  issueDate: string;
  expiryDate?: string;
  estimate: Estimate;
  vatInclusive: boolean;
  paymentTerms: string;
  partnerName: string;
  signedBy?: string;
  signedAt?: string;
}

const GROUP_ORDER: EstimateGroup[] = [
  'Regular work',
  'Compliance',
  'Annual work',
  'Recharges',
  'Once-off',
];

/**
 * The live A4-style quote document. It reads the same `Estimate` the fee
 * schedule step previews, so subtotal, VAT and total always reconcile with the
 * domain engine's line-by-line amounts.
 */
export function QuoteDocumentPreview({
  number,
  stage,
  clientName,
  clientCode,
  preparedFor,
  issueDate,
  expiryDate,
  estimate,
  vatInclusive,
  paymentTerms,
  partnerName,
  signedBy,
  signedAt,
}: QuoteDocumentPreviewProps) {
  const groups = GROUP_ORDER.map((group) => ({
    group,
    lines: estimate.lines.filter((line) => line.group === group),
    total: estimate.lines
      .filter((line) => line.group === group)
      .reduce((sum, line) => sum + (vatInclusive ? line.totalInclVat : line.total), 0),
  })).filter((entry) => entry.lines.length > 0);

  const signed = stage === 'Signed' || stage === 'Active Client';

  return (
    <article
      data-quote-document
      className="mx-auto w-full max-w-[560px] rounded-xl border border-border bg-card p-6 text-[11px] shadow-sm"
    >
      <header className="flex items-start justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-2.5">
          <img
            src="/fd-on-call-logo.png"
            alt="FD on Call"
            className="h-9 w-9 rounded-md object-contain"
          />
          <div>
            <p className="font-serif text-base leading-tight text-foreground">FD on Call</p>
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              Chartered Accountants (SA)
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            Fee quote
          </p>
          <p className="font-mono text-sm font-semibold text-[#c4161c]">{number}</p>
          <span
            className={cn(
              'mt-1 inline-flex rounded-full border px-1.5 py-0.5 font-mono text-[11px]',
              stage === 'Closed Lost'
                ? 'border-border bg-muted text-muted-foreground'
                : 'border-[#c4161c]/25 bg-[#c4161c]/10 text-[#c4161c]'
            )}
          >
            {stage}
          </span>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-4 border-b border-border py-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
            Prepared for
          </p>
          <p className="mt-1 text-xs font-semibold text-foreground">{clientName || 'New prospect'}</p>
          {clientCode && (
            <p className="font-mono text-[11px] text-muted-foreground">{clientCode}</p>
          )}
          {preparedFor && preparedFor !== clientName && (
            <p className="mt-0.5 text-[11px] text-muted-foreground">Attn: {preparedFor}</p>
          )}
        </div>
        <dl className="space-y-1 text-right font-mono text-[11px] text-muted-foreground">
          <div className="flex items-center justify-between gap-3">
            <dt>Issue date</dt>
            <dd className="text-foreground">{formatDate(issueDate)}</dd>
          </div>
          {expiryDate && (
            <div className="flex items-center justify-between gap-3">
              <dt>Valid until</dt>
              <dd className="text-foreground">{formatDate(expiryDate)}</dd>
            </div>
          )}
          <div className="flex items-center justify-between gap-3">
            <dt>Basis</dt>
            <dd className="text-foreground">{vatInclusive ? 'Incl. VAT' : 'Excl. VAT'}</dd>
          </div>
        </dl>
      </div>

      <p className="py-3 leading-relaxed text-muted-foreground">
        Thank you for the opportunity to quote. The fee schedule below covers the engagement from{' '}
        <span className="font-mono text-foreground">{estimate.months[0]}</span> to{' '}
        <span className="font-mono text-foreground">{estimate.months[11]}</span>, billed monthly
        with annual work in the month it falls due.
      </p>

      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-y border-border bg-muted/40 font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
            <th className="px-2 py-1.5">Service</th>
            <th className="px-2 py-1.5 text-right">12-month amount</th>
          </tr>
        </thead>
        <tbody>
          {groups.length === 0 && (
            <tr>
              <td colSpan={2} className="px-2 py-6 text-center text-muted-foreground">
                No fee lines yet — choose services in the scope step.
              </td>
            </tr>
          )}
          {groups.map(({ group, lines, total }) => (
            <FragmentGroup key={group} group={group} lines={lines} total={total} vatInclusive={vatInclusive} />
          ))}
        </tbody>
      </table>

      <div className="mt-4 space-y-1 border-t-2 border-foreground/80 pt-3 font-mono text-[11px]">
        <div className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground">Subtotal (excl. VAT)</span>
          <span className="tabular-nums text-foreground">{formatZar(estimate.annual)}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground">VAT 15%</span>
          <span className="tabular-nums text-foreground">{formatZar(estimate.vat)}</span>
        </div>
        <div className="flex items-center justify-between gap-4 rounded-md bg-[#c4161c]/8 px-2 py-1.5 text-xs font-semibold">
          <span className="text-foreground">Total (incl. VAT)</span>
          <span className="tabular-nums text-[#c4161c]">{formatZar(estimate.annualInclVat)}</span>
        </div>
        <p className="pt-1 text-[11px] leading-snug text-muted-foreground">
          CIPC fees paid on your behalf carry no VAT. Software recharges are passed on at cost.
          Line amounts {vatInclusive ? 'include' : 'exclude'} 15% VAT.
        </p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 border-t border-border py-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
            Payment terms
          </p>
          <p className="mt-0.5 text-foreground">{paymentTerms}</p>
        </div>
        <div>
          <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
            Monthly retainer
          </p>
          <p className="mt-0.5 font-mono text-foreground">{formatZar(estimate.average)}</p>
        </div>
      </div>

      <p className="border-t border-border py-3 text-[11px] leading-relaxed text-muted-foreground">
        This is an estimate, not a fixed fee. Fees assume the scope selected above; work outside
        that scope is billed at the agreed hourly rate. Government fees are recharged at cost and
        may change without notice. Accepting the quote confirms the engagement terms.
      </p>

      <div className="grid grid-cols-2 gap-6 border-t border-border pt-4">
        <SignatureBlock
          heading="Signature — client"
          name={signed && signedBy ? signedBy : preparedFor}
          detail={signed && signedAt ? `Signed ${formatDate(signedAt.slice(0, 10))}` : 'Date'}
        />
        <SignatureBlock
          heading="Signature — FD on Call"
          name={partnerName}
          detail={signed && signedAt ? `Countersigned ${formatDate(signedAt.slice(0, 10))}` : 'Date'}
        />
      </div>

      <footer className="mt-5 border-t border-border pt-3 text-center font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
        FD on Call · Chartered Accountants (SA) · fdoncall.co.za
      </footer>
    </article>
  );
}

function SignatureBlock({
  heading,
  name,
  detail,
}: {
  heading: string;
  name: string;
  detail: string;
}) {
  return (
    <div>
      <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">{heading}</p>
      <p className="mt-4 border-b border-foreground/50 pb-1 text-xs text-foreground">
        {name || '—'}
      </p>
      <p className="mt-1 font-mono text-[11px] text-muted-foreground">{detail}</p>
    </div>
  );
}

function FragmentGroup({
  group,
  lines,
  total,
  vatInclusive,
}: {
  group: string;
  lines: Estimate['lines'];
  total: number;
  vatInclusive: boolean;
}) {
  return (
    <>
      <tr>
        <td
          colSpan={2}
          className="border-b border-border bg-muted/20 px-2 py-1 font-mono text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
        >
          {group}
        </td>
      </tr>
      {lines.map((line) => (
        <tr key={line.key} className="border-b border-border/60 align-top">
          <td className="px-2 py-1.5">
            <span className="block text-foreground">{line.label}</span>
            {line.detail && (
              <span className="mt-0.5 block font-mono text-[11px] leading-snug text-muted-foreground">
                {line.detail}
              </span>
            )}
          </td>
          <td className="whitespace-nowrap px-2 py-1.5 text-right font-mono tabular-nums text-foreground">
            {formatZar(vatInclusive ? line.totalInclVat : line.total)}
          </td>
        </tr>
      ))}
      <tr className="border-b border-border/60 bg-muted/10">
        <td className="px-2 py-1 text-right font-mono text-[11px] uppercase text-muted-foreground">
          {group} subtotal {vatInclusive ? '(incl. VAT)' : '(excl. VAT)'}
        </td>
        <td className="px-2 py-1 text-right font-mono text-[11px] font-medium tabular-nums text-foreground">
          {formatZar(total)}
        </td>
      </tr>
    </>
  );
}

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import type { Client } from 'fdoncall-practice/domain/types';
import type { Quote } from '@/context/PracticeStoreContext';
import { usePracticeStore } from '@/context/PracticeStoreContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  CircleCheck,
  FileSignature,
  FileText,
  Info,
  Mail,
  Send,
  ShieldCheck,
  UserRound,
  X,
} from 'lucide-react';
import {
  createDocumensoEnvelope,
  createDocumensoSlaEnvelope,
  documensoDocumentForQuote,
  documensoDocumentForSla,
  type DocumensoEnvelope,
} from '@/lib/integrations/documenso';

/**
 * What is being sent for signature: a fee quote (the quote builder path) or a
 * client's master services agreement (the vault path).
 */
export type DocumensoDispatchTarget =
  | { kind: 'quote'; quote: Quote; client?: Client }
  | { kind: 'sla'; client: Client };

export interface DocumensoDispatchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: DocumensoDispatchTarget;
  onDispatched?: (envelope: DocumensoEnvelope) => void;
}

const FIELD_CLASS =
  'h-9 w-full rounded-lg border border-border bg-card px-3 font-mono text-[11px] text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus-visible:border-[#c4161c]/60 focus-visible:ring-1 focus-visible:ring-[#c4161c]/40';

export function DocumensoDispatchDialog({
  open,
  onOpenChange,
  target,
  onDispatched,
}: DocumensoDispatchDialogProps) {
  const { currentUser } = usePracticeStore();
  const [isSent, setIsSent] = React.useState(false);

  const quote = target.kind === 'quote' ? target.quote : undefined;
  const quoteClient = target.kind === 'quote' ? target.client : undefined;
  const slaClient = target.kind === 'sla' ? target.client : undefined;

  const envelope = React.useMemo<DocumensoEnvelope>(() => {
    const countersigner = { name: currentUser.name, email: currentUser.email };
    if (quote) {
      return createDocumensoEnvelope(quote, { client: quoteClient, countersigner });
    }
    if (slaClient) {
      return createDocumensoSlaEnvelope(slaClient, { countersigner });
    }
    throw new Error('Documenso dispatch needs a quote or a client');
    // `target` is rebuilt by callers on every render; these records are stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quote, quoteClient, slaClient, currentUser.name, currentUser.email]);

  const documentInfo = React.useMemo(() => {
    if (quote) return documensoDocumentForQuote(quote, quoteClient);
    if (slaClient) return documensoDocumentForSla(slaClient);
    throw new Error('Documenso dispatch needs a quote or a client');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quote, quoteClient, slaClient]);

  const [clientEmail, setClientEmail] = React.useState(envelope.recipients[0].email);

  React.useEffect(() => {
    setClientEmail(envelope.recipients[0].email);
    setIsSent(false);
  }, [envelope]);

  React.useEffect(() => {
    if (!open) setIsSent(false);
  }, [open]);

  const handleSend = () => {
    setIsSent(true);
    onDispatched?.(envelope);
  };

  const close = () => onOpenChange(false);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100vw-2rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-border bg-card shadow-2xl outline-none">
          <header className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#c4161c]/20 bg-[#c4161c]/10 text-[#c4161c]">
                <FileSignature className="h-4 w-4" />
              </span>
              <div className="space-y-0.5">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  Documenso · e-signature
                </p>
                <DialogPrimitive.Title className="font-serif text-lg leading-tight text-foreground">
                  Send for signature
                </DialogPrimitive.Title>
                <DialogPrimitive.Description className="max-w-sm text-xs leading-relaxed text-muted-foreground">
                  Two signatures in order: the client signatory first, the practice counter-signer
                  second.
                </DialogPrimitive.Description>
              </div>
            </div>
            <button
              type="button"
              onClick={close}
              aria-label="Close"
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-1 focus-visible:ring-[#c4161c]"
            >
              <X className="h-4 w-4" />
            </button>
          </header>

          {isSent ? (
            <div className="space-y-4 px-5 py-8 text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#c4161c]/10 text-[#c4161c]">
                <CircleCheck className="h-6 w-6" />
              </span>
              <div className="space-y-1.5">
                <h3 className="text-sm font-semibold text-foreground">Envelope recorded</h3>
                <p className="mx-auto max-w-sm text-xs leading-relaxed text-muted-foreground">
                  Signature requests would go to {clientEmail} and{' '}
                  {envelope.recipients[1].email}. This is a simulated dispatch — no email leaves
                  the browser and the envelope id is synthetic.
                </p>
              </div>
              <div className="mx-auto flex max-w-sm items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2 font-mono text-[11px]">
                <span className="text-muted-foreground">Envelope</span>
                <span className="text-foreground">{envelope.envelopeId}</span>
              </div>
              <Button size="sm" onClick={close}>
                Close
              </Button>
            </div>
          ) : (
            <div className="space-y-4 px-5 py-4 text-xs">
              <div className="flex items-start gap-2.5 rounded-lg border border-border/80 bg-muted/20 px-3 py-2.5">
                <FileText className="mt-0.5 h-4 w-4 shrink-0 text-[#c4161c]" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-foreground" title={documentInfo.documentName}>
                    {documentInfo.documentName}
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">{documentInfo.title}</p>
                </div>
                <Badge variant="outline" className="shrink-0 font-mono text-[10px]">
                  PDF
                </Badge>
              </div>

              <div className="space-y-2">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  Signing order
                </p>

                <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#c4161c]/25 bg-[#c4161c]/10 font-mono text-[10px] text-[#c4161c]">
                    1
                  </span>
                  <UserRound className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-foreground">
                      {envelope.recipients[0].name}
                    </p>
                    <p className="truncate font-mono text-[11px] text-muted-foreground">
                      {clientEmail}
                    </p>
                  </div>
                  <Badge variant="crimsonSubdued" className="shrink-0 font-mono text-[10px]">
                    Client signatory
                  </Badge>
                </div>

                <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border bg-muted/50 font-mono text-[10px] text-muted-foreground">
                    2
                  </span>
                  <ShieldCheck className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-foreground">
                      {envelope.recipients[1].name}
                    </p>
                    <p className="truncate font-mono text-[11px] text-muted-foreground">
                      {envelope.recipients[1].email}
                    </p>
                  </div>
                  <Badge variant="outline" className="shrink-0 font-mono text-[10px]">
                    Counter-signer
                  </Badge>
                </div>
              </div>

              <div className="space-y-1">
                <label htmlFor="documenso-client-email" className="flex items-center gap-1.5 font-medium text-foreground">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                  Client signatory email
                </label>
                <input
                  id="documenso-client-email"
                  type="email"
                  value={clientEmail}
                  onChange={(event) => setClientEmail(event.target.value)}
                  className={FIELD_CLASS}
                  placeholder="director@client.co.za"
                />
                <p className="text-[11px] text-muted-foreground">
                  Corrected on the record only — nothing is sent in the simulated mode.
                </p>
              </div>

              <div className="flex items-start gap-2.5 rounded-lg border border-border/80 bg-muted/20 px-3 py-2.5">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <p className="leading-relaxed text-muted-foreground">
                  Simulated Documenso envelope: the id, timestamp and recipients are recorded
                  against the record, with no network call. The live adapter posts the same payload
                  to your workspace once the credentials in Settings → Integrations are enabled.
                </p>
              </div>

              <footer className="flex items-center justify-between gap-2 border-t border-border pt-3">
                <span className="font-mono text-[10px] text-muted-foreground">
                  {envelope.envelopeId}
                </span>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={close}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleSend} className="gap-1.5">
                    <Send className="h-3 w-3" />
                    Dispatch envelope
                  </Button>
                </div>
              </footer>
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

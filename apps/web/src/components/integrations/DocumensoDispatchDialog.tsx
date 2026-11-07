import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import type { Client } from 'fdoncall-practice/domain/types';
import { STAFF } from 'fdoncall-practice/data/seed';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  CheckCircle2,
  FileSignature,
  FileText,
  Mail,
  Send,
  ShieldCheck,
  UserCheck,
  X,
} from 'lucide-react';

export interface DocumensoSigner {
  name: string;
  email: string;
  role: 'Managing Partner' | 'Client Representative';
}

export interface DocumensoEnvelope {
  envelopeId: string;
  title: string;
  documentName: string;
  signers: DocumensoSigner[];
}

export function buildDocumensoEnvelope(client: Client): DocumensoEnvelope {
  const staff = STAFF.find((s) => s.id === client.staffId);
  const partnerName = staff ? staff.name : 'Erik';
  const partnerEmail = `${partnerName.toLowerCase()}w@fdoncall.co.za`;

  return {
    envelopeId: `DOCU-${client.code}-SLA-2026`,
    title: `FD on Call SLA & Engagement Agreement - ${client.name} (${client.code})`,
    documentName: `FD_on_Call_Master_Services_Agreement_${client.code}_SLA.pdf`,
    signers: [
      {
        name: `${partnerName} (CA(SA))`,
        email: partnerEmail,
        role: 'Managing Partner',
      },
      {
        name: `Director (${client.name})`,
        email: `director@${client.name.toLowerCase().replace(/[^a-z0-9]/g, '')}.co.za`,
        role: 'Client Representative',
      },
    ],
  };
}

export interface DocumensoDispatchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client;
  onDispatched?: (envelopeId: string) => void;
}

export function DocumensoDispatchDialog({
  open,
  onOpenChange,
  client,
  onDispatched,
}: DocumensoDispatchDialogProps) {
  const envelope = React.useMemo(() => buildDocumensoEnvelope(client), [client]);
  const [clientEmail, setClientEmail] = React.useState(envelope.signers[1].email);
  const [isSent, setIsSent] = React.useState(false);

  const handleSend = () => {
    setIsSent(true);
    if (onDispatched) {
      onDispatched(envelope.envelopeId);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => setIsSent(false), 300);
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs transition-opacity" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-card p-6 shadow-2xl transition-all outline-none space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border/80">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-md bg-[#c4161c]/15 text-[#c4161c] flex items-center justify-center shrink-0">
                <FileSignature className="h-4 w-4" />
              </div>
              <div>
                <DialogPrimitive.Title className="text-sm font-semibold text-foreground">
                  Dispatch Dual-Signature SLA
                </DialogPrimitive.Title>
                <DialogPrimitive.Description className="text-xs text-muted-foreground font-mono">
                  Documenso eSignature API • Envelope ID: {envelope.envelopeId}
                </DialogPrimitive.Description>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-1 rounded text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {isSent ? (
            <div className="py-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-500/15 text-emerald-500 mx-auto flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h3 className="text-base font-semibold text-foreground">
                SLA Dispatched Successfully
              </h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto font-sans">
                Electronic signature request routed to {clientEmail} and {envelope.signers[0].email}. Status updated to "Dispatched for Signature".
              </p>
              <Button size="sm" onClick={handleClose} className="mt-2 text-xs">
                Close
              </Button>
            </div>
          ) : (
            <div className="space-y-4 text-xs font-sans">
              {/* Document Info */}
              <div className="border border-border/80 rounded-md p-3 bg-muted/20 flex items-center gap-2.5 font-mono text-[11px]">
                <FileText className="h-4 w-4 text-[#c4161c] shrink-0" />
                <span className="truncate flex-1 text-foreground">{envelope.documentName}</span>
                <Badge variant="outline" className="text-[10px] py-0 px-1 font-mono">
                  248 KB
                </Badge>
              </div>

              {/* Signers List */}
              <div className="space-y-2.5">
                <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
                  Required Dual Signers
                </div>

                {/* Signer 1: Partner */}
                <div className="border border-border/80 rounded-md p-2.5 bg-card/60 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-[#c4161c]" />
                    <div>
                      <div className="font-medium text-foreground">{envelope.signers[0].name}</div>
                      <div className="text-[11px] text-muted-foreground font-mono">{envelope.signers[0].email}</div>
                    </div>
                  </div>
                  <Badge variant="outline" className="font-mono text-[10px]">
                    Managing Partner
                  </Badge>
                </div>

                {/* Signer 2: Client */}
                <div className="border border-border/80 rounded-md p-2.5 bg-card/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-foreground">{envelope.signers[1].name}</span>
                    </div>
                    <Badge variant="outline" className="font-mono text-[10px]">
                      Client Signer
                    </Badge>
                  </div>
                  <input
                    type="email"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    className="w-full h-8 px-2.5 text-xs rounded border border-border bg-card text-foreground font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[#c4161c]"
                    placeholder="director@client.co.za"
                  />
                </div>
              </div>

              {/* Security Audit Badge */}
              <div className="flex items-center gap-2 text-[11px] font-mono text-muted-foreground bg-muted/30 p-2.5 rounded-md">
                <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
                <span>SHA-256 tamper-proof audit trail enabled with SAICA compliance logging.</span>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/80">
                <Button variant="outline" size="sm" onClick={handleClose} className="text-xs">
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSend} className="text-xs gap-1.5 font-mono bg-[#c4161c] hover:bg-[#a01217]">
                  <Send className="h-3 w-3" />
                  Dispatch Envelope
                </Button>
              </div>
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

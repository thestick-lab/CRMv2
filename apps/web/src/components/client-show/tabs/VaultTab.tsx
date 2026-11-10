import * as React from 'react';
import type { Client } from 'fdoncall-practice/domain/types';
import { boFilingState } from '../client-record-data';
import { DocumensoDispatchDialog } from '@/components/integrations/DocumensoDispatchDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Clock, FileText, Folder, FolderLock } from 'lucide-react';

export type VaultFileStatus = 'Expected' | 'Recorded' | 'Pending' | 'Not in scope';

export interface VaultFile {
  /** The document type this engagement holds, named for the client record. */
  name: string;
  status: VaultFileStatus;
}

export interface VaultFolder {
  name: string;
  path: string;
  files: VaultFile[];
}

/**
 * The folder taxonomy an engagement is expected to hold. This build stores no
 * files: nothing here is a stored document, and the only real state is the CIPC
 * beneficial-ownership position derived from the client record.
 */
export function buildVaultFolders(client: Client): VaultFolder[] {
  const boState = boFilingState(client);
  return [
    {
      name: 'Contracts & SLAs (Documenso)',
      path: `/Clients/${client.code}/Contracts/`,
      files: [
        { name: `Master services agreement — ${client.code}`, status: 'Expected' },
        { name: 'Standard terms and conditions (SAICA annexure)', status: 'Expected' },
      ],
    },
    {
      name: 'Tax Returns & Filing Packs (SARS)',
      path: `/Clients/${client.code}/Tax_Returns/`,
      files: [
        { name: 'IRP6 provisional tax filing pack', status: 'Expected' },
        { name: 'ITR14 assessment notice (ITA34)', status: 'Expected' },
      ],
    },
    {
      name: 'Statutory Secretarial (CIPC)',
      path: `/Clients/${client.code}/CIPC_Statutory/`,
      files: [
        {
          name: 'Beneficial ownership register filing',
          status:
            boState === 'filed'
              ? 'Recorded'
              : boState === 'required'
                ? 'Pending'
                : 'Not in scope',
        },
      ],
    },
  ];
}

export function VaultTab({ client }: { client: Client }) {
  const [documensoOpen, setDocumensoOpen] = React.useState(false);
  const folders = buildVaultFolders(client);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <FolderLock className="h-4 w-4 text-[#c4161c]" aria-hidden="true" />
            Client vault — document structure
          </h2>
          <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
            /Practice_Vault/Clients/{client.code}/
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDocumensoOpen(true)}
            className="h-7 gap-1.5 border-[#c4161c]/30 font-mono text-xs text-[#c4161c] hover:bg-[#c4161c]/10 hover:text-[#c4161c]"
          >
            Dispatch Documenso SLA
          </Button>
        </div>
      </div>

      <div
        role="note"
        className="rounded-lg border border-border bg-muted/30 px-3.5 py-2.5 text-[11px] leading-relaxed text-muted-foreground"
      >
        <span className="font-semibold text-foreground">Document structure only.</span> This build
        stores no files — Documenso signatures and the SharePoint sync are simulated, so nothing here
        has been signed, uploaded or accepted by SARS. The CIPC row reflects the client record.
      </div>

      <div className="space-y-4">
        {folders.map((folder) => (
          <div key={folder.path} className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border/60 bg-muted/20 px-4 py-2.5">
              <div className="flex items-center gap-2 font-mono text-xs font-semibold text-foreground">
                <Folder className="h-4 w-4 text-[#c4161c]" aria-hidden="true" />
                <span>{folder.name}</span>
              </div>
              <span className="font-mono text-[11px] text-muted-foreground">
                {folder.files.length} document types
              </span>
            </div>

            <div className="divide-y divide-border/60">
              {folder.files.map((file) => (
                <div
                  key={file.name}
                  className="flex flex-col justify-between gap-2 px-4 py-3 transition-colors hover:bg-muted/30 sm:flex-row sm:items-center"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <FileText
                      className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <div className="min-w-0">
                      <div className="truncate font-mono text-xs font-medium text-foreground">
                        {file.name}
                      </div>
                      <div className="mt-0.5 text-[11px] text-muted-foreground">
                        {file.status === 'Recorded'
                          ? 'Filing recorded against the client record'
                          : file.status === 'Pending'
                            ? 'In scope — not yet filed'
                            : file.status === 'Not in scope'
                              ? 'Not part of this engagement'
                              : 'No document stored'}
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2 self-end sm:self-center">
                    <Badge
                      variant={
                        file.status === 'Recorded'
                          ? 'crimsonSubdued'
                          : file.status === 'Pending'
                            ? 'warning'
                            : 'outline'
                      }
                      className="gap-1 px-1.5 py-0 font-mono text-[11px]"
                    >
                      {file.status === 'Recorded' ? (
                        <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                      ) : file.status === 'Pending' ? (
                        <Clock className="h-3 w-3" aria-hidden="true" />
                      ) : (
                        <FileText className="h-3 w-3" aria-hidden="true" />
                      )}
                      {file.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <DocumensoDispatchDialog
        open={documensoOpen}
        onOpenChange={setDocumensoOpen}
        target={{ kind: 'sla', client }}
      />
    </div>
  );
}

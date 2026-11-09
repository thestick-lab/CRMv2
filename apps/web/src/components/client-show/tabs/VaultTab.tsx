import * as React from 'react';
import type { Client } from 'fdoncall-practice/domain/types';
import { boFilingState } from '../client-record-data';
import { DocumensoDispatchDialog } from '@/components/integrations/DocumensoDispatchDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  Folder,
  FolderLock,
  Upload,
} from 'lucide-react';

export interface VaultFile {
  name: string;
  size: string;
  date: string;
  status: 'Signed & Executed' | 'SARS Accepted' | 'Archived' | 'Pending Signature' | 'Not in scope';
  signer?: string;
  reference?: string;
}

export interface VaultFolder {
  name: string;
  path: string;
  files: VaultFile[];
}

export function buildVaultFolders(client: Client): VaultFolder[] {
  const boState = boFilingState(client);
  return [
    {
      name: 'Contracts & SLAs (Documenso)',
      path: `/Clients/${client.code}/Contracts/`,
      files: [
        {
          name: `FD_on_Call_Master_Services_Agreement_${client.code}_SLA.pdf`,
          size: '248 KB',
          date: '2026-10-28',
          status: 'Signed & Executed',
          signer: 'Dual-Signed: Erik (Partner) & Client Director',
          reference: 'DOCU-89410-ZA',
        },
        {
          name: `Standard_Terms_and_Conditions_SAICA_Annexure.pdf`,
          size: '184 KB',
          date: '2026-10-28',
          status: 'Signed & Executed',
          signer: 'Client Authorized Representative',
        },
      ],
    },
    {
      name: 'Tax Returns & Filing Packs (SARS)',
      path: `/Clients/${client.code}/Tax_Returns/`,
      files: [
        {
          name: `2026_IRP6_Provisional_Tax_Filing_Pack.pdf`,
          size: '512 KB',
          date: '2026-08-31',
          status: 'SARS Accepted',
          reference: 'eFiling Ref: 98402194',
        },
        {
          name: `2025_ITR14_Corporate_Assessment_Notice_ITA34.pdf`,
          size: '430 KB',
          date: '2026-02-28',
          status: 'SARS Accepted',
          reference: 'eFiling Ref: 91402851',
        },
      ],
    },
    {
      name: 'Statutory Secretarial (CIPC)',
      path: `/Clients/${client.code}/CIPC_Statutory/`,
      files: [
        {
          name: `CIPC_Beneficial_Ownership_Register_Filing.pdf`,
          size: '310 KB',
          date: '2026-05-15',
          status:
            boState === 'filed'
              ? 'Signed & Executed'
              : boState === 'required'
                ? 'Pending Signature'
                : 'Not in scope',
          reference: 'CIPC Disclosure Key #718402',
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
      {/* Vault Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <FolderLock className="h-4 w-4 text-[#c4161c]" />
            SharePoint Client Vault &amp; Digital SLAs
          </h2>
          <p className="text-xs font-mono text-muted-foreground mt-0.5">
            Path: /Practice_Vault/Clients/{client.code}/ (Encrypted at rest AES-256)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDocumensoOpen(true)}
            className="h-7 text-xs gap-1.5 font-mono text-[#c4161c] hover:text-[#c4161c] border-[#c4161c]/30 hover:bg-[#c4161c]/10"
          >
            Dispatch Documenso SLA
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5 font-mono">
            <ExternalLink className="h-3 w-3" />
            SharePoint
          </Button>
          <Button size="sm" className="h-7 text-xs gap-1.5 font-mono">
            <Upload className="h-3 w-3" />
            Upload
          </Button>
        </div>
      </div>

      {/* Folders and Files */}
      <div className="space-y-4">
        {folders.map((folder) => (
          <div
            key={folder.path}
            className="border border-border/80 rounded-lg bg-card/60 overflow-hidden shadow-xs"
          >
            <div className="px-4 py-2.5 border-b border-border/60 bg-muted/20 flex items-center justify-between">
              <div className="flex items-center gap-2 font-mono text-xs font-semibold text-foreground">
                <Folder className="h-4 w-4 text-[#c4161c]" />
                <span>{folder.name}</span>
              </div>
              <span className="font-mono text-[11px] text-muted-foreground">
                {folder.files.length} documents
              </span>
            </div>

            <div className="divide-y divide-border/60">
              {folder.files.map((file) => (
                <div
                  key={file.name}
                  className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-foreground truncate font-mono">
                        {file.name}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5 flex-wrap">
                        <span className="font-mono">{file.size}</span>
                        <span>•</span>
                        <span className="font-mono">Uploaded: {file.date}</span>
                        {file.signer && (
                          <>
                            <span>•</span>
                            <span className="text-[#c4161c]">{file.signer}</span>
                          </>
                        )}
                        {file.reference && (
                          <>
                            <span>•</span>
                            <span className="font-mono">{file.reference}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <Badge
                      variant={file.status === 'Signed & Executed' ? 'success' : file.status === 'Pending Signature' ? 'warning' : 'outline'}
                      className="text-[10px] py-0 px-1.5 gap-1 font-mono"
                    >
                      {file.status === 'Pending Signature' ? (
                        <Clock className="h-3 w-3" />
                      ) : file.status === 'Signed & Executed' ? (
                        <CheckCircle2 className="h-3 w-3" />
                      ) : (
                        <FileText className="h-3 w-3" />
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

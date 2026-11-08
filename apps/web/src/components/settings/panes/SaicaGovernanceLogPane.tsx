import * as React from 'react';
import { usePracticeStore } from '@/context/PracticeStoreContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ShieldCheck,
  Download,
  FileCheck2,
  Lock,
  Calendar,
  Building2,
  Check,
} from 'lucide-react';

export interface SaicaLogEntry {
  id: string;
  timestamp: string;
  partnerName: string;
  clientCode: string;
  clientName: string;
  returnType: string;
  period: string;
  sarsReference: string;
  auditHash: string;
}

export const SEED_SAICA_LOG: SaicaLogEntry[] = [
  {
    id: 'saica-01',
    timestamp: '2026-11-05 14:22 SAST',
    partnerName: 'Erik (CA(SA))',
    clientCode: 'ALC-610',
    clientName: 'A & L Contracting',
    returnType: 'ITR14',
    period: 'FY 2026',
    sarsReference: 'SARS-2026-8812904',
    auditHash: '9f24a87b12c6d4...3a91',
  },
  {
    id: 'saica-02',
    timestamp: '2026-10-28 11:05 SAST',
    partnerName: 'Wouter (CA(SA))',
    clientCode: 'AXE-460',
    clientName: 'Axe Struct (Pty) Ltd',
    returnType: 'AFS',
    period: 'FY 2026',
    sarsReference: 'CIPC-AFS-2026-119',
    auditHash: '4bf7e95a1200df...81a0',
  },
  {
    id: 'saica-03',
    timestamp: '2026-10-15 16:40 SAST',
    partnerName: 'Erik (CA(SA))',
    clientCode: 'MUS-875',
    clientName: 'Muse 1399',
    returnType: 'IRP6',
    period: '2026/02 (2nd)',
    sarsReference: 'SARS-2026-9931082',
    auditHash: '30968ee71490bd...44fe',
  },
];

export function SaicaGovernanceLogPane() {
  const { clients, taskStatusOverrides } = usePracticeStore();
  const [downloadSuccess, setDownloadSuccess] = React.useState(false);

  // Derive dynamic entries from submitted tasks in taskStatusOverrides
  const dynamicEntries = React.useMemo<SaicaLogEntry[]>(() => {
    const list: SaicaLogEntry[] = [];
    for (const [taskId, override] of Object.entries(taskStatusOverrides)) {
      if (override.partnerSignOff && override.sarsReference) {
        const parts = taskId.split('-');
        const code = `${parts[0]}-${parts[1]}`;
        const client = clients.find((c) => c.code === code);
        list.push({
          id: `saica-live-${taskId}`,
          timestamp: `${override.submissionDate || '2026-11-08'} 09:00 SAST`,
          partnerName: 'Erik (CA(SA))',
          clientCode: code,
          clientName: client?.name || code,
          returnType: parts[2] || 'Statutory Return',
          period: '2026/2027',
          sarsReference: override.sarsReference,
          auditHash: `sha256-${taskId.slice(0, 8)}...${override.sarsReference.slice(-4)}`,
        });
      }
    }
    return list;
  }, [taskStatusOverrides, clients]);

  const allEntries = React.useMemo(
    () => [...dynamicEntries, ...SEED_SAICA_LOG],
    [dynamicEntries]
  );

  const handleExportCsv = () => {
    const headers = ['Timestamp', 'Partner', 'ClientCode', 'ClientName', 'Return', 'Period', 'SARS_Reference', 'AuditHash'];
    const rows = allEntries.map((e) => [
      `"${e.timestamp}"`,
      `"${e.partnerName}"`,
      `"${e.clientCode}"`,
      `"${e.clientName}"`,
      `"${e.returnType}"`,
      `"${e.period}"`,
      `"${e.sarsReference}"`,
      `"${e.auditHash}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `saica-governance-audit-log-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 2500);
  };

  return (
    <div className="space-y-6 max-w-5xl text-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-border/70">
        <div>
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-amber-500" />
            SAICA Governance Audit Log
          </h2>
          <p className="text-muted-foreground mt-0.5">
            Immutable, timestamped audit trail of all CA(SA) Partner sign-offs and SARS eFiling lodgments mandated by SAICA &amp; SARS practice rules.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={handleExportCsv}
            className="bg-[#c4161c] hover:bg-[#a51217] text-white flex items-center gap-1.5 h-7 text-xs"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export Audit Report (CSV)</span>
          </Button>

          {downloadSuccess && (
            <span className="text-emerald-600 dark:text-emerald-400 font-mono text-[11px] flex items-center gap-1">
              <Check className="h-3 w-3" /> Exported!
            </span>
          )}
        </div>
      </div>

      <div className="p-3.5 rounded-xl border border-border/80 bg-muted/30 flex items-start gap-3">
        <Lock className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <p className="text-muted-foreground leading-relaxed">
          Entries are permanently sealed upon final SARS lodgment and cannot be edited or deleted. Each record binds the engagement Partner's digital certificate to the SARS eFiling confirmation number.
        </p>
      </div>

      {/* Audit Log Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[800px]">
            <thead className="bg-muted/40 border-b border-border/80 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Timestamp (SAST)</th>
                <th className="px-4 py-3">CA(SA) Partner</th>
                <th className="px-4 py-3">Client Entity</th>
                <th className="px-4 py-3">Statutory Return</th>
                <th className="px-4 py-3">SARS eFiling Confirmation #</th>
                <th className="px-4 py-3 text-right">Audit Hash</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 font-mono">
              {allEntries.map((entry) => (
                <tr key={entry.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 text-muted-foreground text-[11px]">
                    {entry.timestamp}
                  </td>

                  <td className="px-4 py-3 font-sans font-semibold text-foreground">
                    {entry.partnerName}
                  </td>

                  <td className="px-4 py-3 font-sans">
                    <span className="font-mono font-bold text-primary mr-1.5">{entry.clientCode}</span>
                    <span className="text-muted-foreground">{entry.clientName}</span>
                  </td>

                  <td className="px-4 py-3">
                    <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">
                      {entry.returnType} {entry.period && `(${entry.period})`}
                    </Badge>
                  </td>

                  <td className="px-4 py-3 text-emerald-600 dark:text-emerald-400 font-semibold">
                    {entry.sarsReference}
                  </td>

                  <td className="px-4 py-3 text-right text-muted-foreground text-[10px]">
                    {entry.auditHash}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

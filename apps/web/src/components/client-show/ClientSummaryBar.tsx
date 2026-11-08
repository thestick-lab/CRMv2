import type { Client } from 'fdoncall-practice/domain/types';
import { STAFF, GROUPS } from 'fdoncall-practice/data/seed';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Building2,
  Download,
  FileSpreadsheet,
  UserCheck,
} from 'lucide-react';

export interface TabConfig {
  id: 'details' | 'profile' | 'deadlines' | 'estimate';
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const CLIENT_SHOW_TABS: TabConfig[] = [
  { id: 'details', label: 'Details & Statutory Services', icon: Building2 },
];

export interface ClientSummary {
  name: string;
  code: string;
  entityType: string;
  partnerLabel: string;
  turnoverLabel: string;
  vatLabel: string;
  groupName?: string;
}

export function formatClientSummary(client: Client): ClientSummary {
  const staff = STAFF.find((s) => s.id === client.staffId);
  const partnerLabel = staff ? `${staff.name} (${staff.role})` : 'Practice Pool';

  let turnoverLabel = 'Turnover Pending';
  if (client.turnover) {
    const mil = client.turnover / 1_000_000;
    turnoverLabel = Number.isInteger(mil) ? `R${mil}M Turnover` : `R${mil.toFixed(1)}M Turnover`;
  }

  const vatLabel = client.vatCategory ? `VAT Cat ${client.vatCategory}` : 'Non-VAT';

  const group = GROUPS.find((g) => g.id === client.groupId);

  return {
    name: client.name,
    code: client.code,
    entityType: client.entityType,
    partnerLabel,
    turnoverLabel,
    vatLabel,
    groupName: group?.name,
  };
}

export interface ClientSummaryBarProps {
  client: Client;
  onBack: () => void;
  onDownloadPdf?: () => void;
  onDownloadExcel?: () => void;
}

export function ClientSummaryBar({
  client,
  onBack,
  onDownloadPdf,
  onDownloadExcel,
}: ClientSummaryBarProps) {
  const summary = formatClientSummary(client);

  return (
    <div className="border border-border/80 rounded-lg p-5 bg-card/60 backdrop-blur space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Back Arrow + Avatar + Legal Name & Code */}
        <div className="flex items-start gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onBack}
            className="h-8 w-8 p-0 shrink-0 text-muted-foreground hover:text-foreground"
            title="Return to Clients Register"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>

          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-foreground tracking-tight">
                {summary.name}
              </h1>
              <span className="font-mono font-semibold text-[#c4161c] bg-[#c4161c]/10 dark:text-[#f87171] px-2 py-0.5 rounded text-xs">
                {summary.code}
              </span>
              <Badge variant="outline" className="text-xs">
                {summary.entityType}
              </Badge>
              {summary.groupName && (
                <span className="text-[11px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                  Group: {summary.groupName}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1">
                <UserCheck className="h-3.5 w-3.5 text-[#c4161c]" />
                {summary.partnerLabel}
              </span>
              <span>•</span>
              <span className="font-mono">{summary.turnoverLabel}</span>
              <span>•</span>
              <span className="font-mono">{summary.vatLabel}</span>
            </div>
          </div>
        </div>

        {/* Right: Quick Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {onDownloadExcel && (
            <Button
              variant="outline"
              size="sm"
              onClick={onDownloadExcel}
              className="text-xs h-8 gap-1.5 font-mono"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-500" />
              Excel Export
            </Button>
          )}
          {onDownloadPdf && (
            <Button
              size="sm"
              onClick={onDownloadPdf}
              className="text-xs h-8 gap-1.5 font-mono"
            >
              <Download className="h-3.5 w-3.5" />
              PDF Quote
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

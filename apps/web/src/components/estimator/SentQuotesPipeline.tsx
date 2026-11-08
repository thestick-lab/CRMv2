import * as React from 'react';
import { usePracticeStore, type PipelineLead } from '@/context/PracticeStoreContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Building2,
  CheckCircle2,
  Sparkles,
  FileCheck2,
  Mail,
  User,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SentQuotesPipelineProps {
  onConvertClient?: (clientCode: string) => void;
  className?: string;
}

export const QUOTE_STAGES = [
  'Drafting',
  'Proposal Sent',
  'Documenso Signed',
  'KYC & Transfer',
  'Active Client',
] as const;

export function SentQuotesPipeline({ onConvertClient, className }: SentQuotesPipelineProps) {
  const { leads, clients, convertLead, updateLeadStage } = usePracticeStore();

  const handleConvert = (leadId: string) => {
    const created = convertLead(leadId);
    if (created && onConvertClient) {
      onConvertClient(created.code);
    }
  };

  return (
    <div className={cn('space-y-4 text-xs', className)}>
      <div className="flex items-center justify-between pb-2 border-b border-border/70">
        <div>
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <FileCheck2 className="h-4 w-4 text-primary" />
            Sent Proposals &amp; Onboarding Pipeline
          </h3>
          <p className="text-muted-foreground mt-0.5">
            Monitor commercial proposals dispatched via Documenso until signed and converted into active clients.
          </p>
        </div>
        <Badge variant="outline" className="font-mono text-xs">
          {leads.length} Proposals in Flight
        </Badge>
      </div>

      {/* Proposals Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[750px]">
            <thead className="bg-muted/40 border-b border-border/80 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Prospect Company</th>
                <th className="px-4 py-3">Contact Person</th>
                <th className="px-4 py-3">Monthly Retainer</th>
                <th className="px-4 py-3">Proposal Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {leads.map((lead) => {
                const converted = clients.find((c) => c.name === lead.companyName);

                return (
                  <tr key={lead.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="font-semibold">{lead.companyName}</span>
                      </div>
                      <div className="text-[11px] font-mono text-muted-foreground ml-5">
                        TO: R {(lead.turnover / 1_000_000).toFixed(1)}M
                      </div>
                    </td>

                    <td className="px-4 py-3 text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <User className="h-3 w-3 shrink-0" />
                        <span>{lead.contactPerson}</span>
                      </div>
                      <div className="text-[10px] font-mono text-muted-foreground/80 ml-4">
                        {lead.email}
                      </div>
                    </td>

                    <td className="px-4 py-3 font-mono font-tnum">
                      <div className="font-semibold text-foreground">
                        R {lead.estimatedMonthlyFee.toLocaleString('en-ZA')} / mo
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        R {(lead.estimatedMonthlyFee * 12).toLocaleString('en-ZA')} / yr
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[10px] font-mono',
                          lead.stage === 'Active Client'
                            ? 'border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5'
                            : lead.stage === 'KYC & Transfer'
                            ? 'border-blue-500/40 text-blue-600 dark:text-blue-400 bg-blue-500/5'
                            : 'border-border text-muted-foreground'
                        )}
                      >
                        {lead.stage}
                      </Badge>
                    </td>

                    <td className="px-4 py-3 text-right">
                      {converted ? (
                        <button
                          type="button"
                          onClick={() => onConvertClient?.(converted.code)}
                          className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>{converted.code} (Active)</span>
                        </button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleConvert(lead.id)}
                          className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                        >
                          <Sparkles className="h-3.5 w-3.5 mr-1" />
                          <span>Convert to Practice Client</span>
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

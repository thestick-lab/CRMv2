import { Button } from '@/components/ui/button';
import { ArrowLeft, CalendarClock, Download, FileSpreadsheet } from 'lucide-react';

export interface ClientSummaryBarProps {
  onBack: () => void;
  onDownloadPdf?: () => void;
  onDownloadExcel?: () => void;
  onViewDeadlines?: () => void;
}

/**
 * Record toolbar: back to the register on the left, the quote and deadlines
 * quick actions on the right. The identity itself lives in the profile header.
 */
export function ClientSummaryBar({
  onBack,
  onDownloadPdf,
  onDownloadExcel,
  onViewDeadlines,
}: ClientSummaryBarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={onBack}
        className="h-8 gap-1.5 px-2 font-mono text-[11px] text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Clients
      </Button>

      <div className="flex flex-wrap items-center gap-2">
        {onViewDeadlines && (
          <Button
            variant="outline"
            size="sm"
            onClick={onViewDeadlines}
            className="h-8 gap-1.5 border-[#c4161c]/30 bg-[#c4161c]/5 text-[11px] font-medium text-[#c4161c] hover:bg-[#c4161c]/10 hover:text-[#c4161c] dark:text-[#f87171]"
          >
            <CalendarClock className="h-3.5 w-3.5" />
            View Client Deadlines
          </Button>
        )}
        {onDownloadExcel && (
          <Button
            variant="outline"
            size="sm"
            onClick={onDownloadExcel}
            className="h-8 gap-1.5 font-mono text-[11px]"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-muted-foreground" />
            Export Excel
          </Button>
        )}
        {onDownloadPdf && (
          <Button size="sm" onClick={onDownloadPdf} className="h-8 gap-1.5 font-mono text-[11px]">
            <Download className="h-3.5 w-3.5" />
            Export PDF Quote
          </Button>
        )}
      </div>
    </div>
  );
}

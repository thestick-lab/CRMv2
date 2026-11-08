import type { ViewKey } from '@/types/navigation';
import { PartnerReviewQueue } from '@/components/inbox/PartnerReviewQueue';
import { Badge } from '@/components/ui/badge';
import { Inbox } from 'lucide-react';
import { usePracticeStore } from '@/context/PracticeStoreContext';

export interface InboxViewProps {
  onNavigate: (view: ViewKey, clientCode?: string) => void;
}

export function InboxView({ onNavigate }: InboxViewProps) {
  const { taskStatusOverrides } = usePracticeStore();
  const pendingCount = Object.values(taskStatusOverrides).filter(
    (o) => o.status === 'Partner Review Gate'
  ).length;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-semibold text-foreground tracking-tight flex items-center gap-2">
              <Inbox className="h-5 w-5 text-[#c4161c]" />
              Partner Review Queue
            </h1>
            <Badge variant="crimsonSubdued" className="font-mono text-xs py-0 px-1.5 h-5">
              {pendingCount} Pending Approvals
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Statutory compliance review gates mandated by SAICA &amp; SARS Tax Administration Act prior to final submission.
          </p>
        </div>
      </div>

      {/* Review Queue Component */}
      <PartnerReviewQueue onNavigateClient={(code) => onNavigate('client', code)} />
    </div>
  );
}

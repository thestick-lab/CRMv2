import type { ViewKey } from '@/types/navigation';
import { PartnerReviewQueue } from '@/components/inbox/PartnerReviewQueue';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/page-header';
import { usePracticeStore } from '@/context/PracticeStoreContext';
import { NoAccessView } from '@/components/layout/NoAccessView';
import { canAccessView } from '@/components/layout/navigation-helpers';

export interface InboxViewProps {
  onNavigate: (view: ViewKey, clientCode?: string) => void;
}

export function InboxView({ onNavigate }: InboxViewProps) {
  const { taskStatusOverrides, currentUser, permissions } = usePracticeStore();
  const pendingCount = Object.values(taskStatusOverrides).filter(
    (o) => o.status === 'Partner Review Gate'
  ).length;

  if (!canAccessView('inbox', currentUser.role, permissions.matrix, { assigned: true })) {
    return <NoAccessView view="inbox" onNavigate={(view) => onNavigate(view)} />;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <PageHeader
        eyebrow="Inbox"
        title="Partner Review Queue"
        subtitle="Statutory compliance review gates mandated by SAICA & SARS Tax Administration Act prior to final submission."
        actions={
          <Badge
            variant="crimsonSubdued"
            className="h-6 px-2 font-mono text-[10px] font-medium uppercase tracking-wide"
          >
            {pendingCount} Pending Approvals
          </Badge>
        }
      />

      <PartnerReviewQueue onNavigateClient={(code) => onNavigate('client', code)} />
    </div>
  );
}

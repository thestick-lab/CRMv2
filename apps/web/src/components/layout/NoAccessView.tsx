import type { ViewKey } from '@/types/navigation';
import { Lock } from 'lucide-react';
import { NAV_ITEMS, canAccessView } from '@/components/layout/navigation-helpers';
import { usePracticeStore } from '@/context/PracticeStoreContext';
import { cn } from '@/lib/utils';

export interface NoAccessViewProps {
  view: ViewKey;
  /** Omitted when the view has no router handle (rendered inside the page). */
  onNavigate?: (view: ViewKey) => void;
  /** Short pane label for the copy ("Settings", "Governance Log"). */
  label?: string;
}

/**
 * Shown when a role reaches a view the permission matrix does not grant it.
 * The sidebar already hides those items; this closes every other route (deep
 * links, history, the command palette) with a real explanation and the places
 * the role *can* work.
 */
export function NoAccessView({ view, onNavigate, label }: NoAccessViewProps) {
  const { currentUser, permissions } = usePracticeStore();
  const permitted = NAV_ITEMS.filter((item) =>
    canAccessView(item.id, currentUser.role, permissions.matrix)
  );
  const denied = label ?? NAV_ITEMS.find((item) => item.id === view)?.label ?? 'This area';

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 px-6 py-20 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-muted text-muted-foreground">
        <Lock className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="space-y-1.5">
        <h1 className="font-serif text-xl tracking-tight text-foreground">
          {denied} is not available to your role
        </h1>
        <p className="text-xs leading-relaxed text-muted-foreground">
          The practice permission matrix does not grant <span className="font-medium text-foreground">{currentUser.role}</span>{' '}
          access to this area. A Partner or the support technician can change the matrix in Settings.
        </p>
      </div>
      {onNavigate && permitted.length > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
          {permitted.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors',
                  'hover:border-[#c4161c]/40 hover:text-[#c4161c] dark:hover:text-[#f87171]',
                  'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#c4161c]'
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

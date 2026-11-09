import type { NavSection, ViewKey } from '@/types/navigation';
import { NAV_ITEMS, canAccessView, type NavItemDef } from './navigation-helpers';
import { UserPopover } from '@/components/ui/user-popover';
import { PanelLeftClose } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WorkspaceMenuPopover } from './WorkspaceMenuPopover';
import { usePracticeStore } from '@/context/PracticeStoreContext';

export interface SidebarProps {
  currentView: ViewKey;
  onViewChange: (view: ViewKey) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

const NAV_SECTIONS: NavSection[] = ['Practice', 'Work', 'Admin'];

export function Sidebar({
  currentView,
  onViewChange,
  collapsed,
  onToggleCollapse,
}: SidebarProps) {
  const { division, taskStatusOverrides, currentUser, permissions } = usePracticeStore();
  const isFd = division === 'fd-on-call';
  const activeLogo = isFd ? '/fd-on-call-logo.png' : '/accountant-on-call-logo.png';

  const pendingReviewCount = Object.values(taskStatusOverrides).filter(
    (o) => o.status === 'Partner Review Gate'
  ).length;

  const navItems: NavItemDef[] = NAV_ITEMS.filter((item) =>
    canAccessView(item.id, currentUser.role, permissions.matrix)
  ).map((item) =>
    item.id === 'inbox' && pendingReviewCount > 0
      ? { ...item, badge: pendingReviewCount }
      : item
  );

  const renderItem = (item: NavItemDef) => {
    const isActive =
      currentView === item.id || (item.id === 'clients' && currentView === 'client');
    const Icon = item.icon;

    return (
      <button
        key={item.id}
        onClick={() => onViewChange(item.id)}
        aria-current={isActive ? 'page' : undefined}
        title={collapsed ? `${item.label}${item.badge !== undefined ? ` (${item.badge})` : ''}` : undefined}
        className={cn(
          'w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors text-left group outline-none focus-visible:ring-1 focus-visible:ring-[#c4161c]',
          collapsed ? 'justify-center px-1.5' : 'justify-between',
          isActive
            ? 'bg-[#c4161c]/10 text-[#c4161c] dark:text-[#f87171]'
            : 'text-foreground/80 hover:bg-muted hover:text-foreground'
        )}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <Icon
            className={cn(
              'h-4 w-4 shrink-0 transition-colors',
              isActive ? 'text-[#c4161c] dark:text-[#f87171]' : 'text-muted-foreground group-hover:text-foreground'
            )}
          />
          {!collapsed && <span className="truncate">{item.label}</span>}
        </div>

        {!collapsed && item.badge !== undefined && (
          <span
            className={cn(
              'font-mono text-[10px] px-1.5 py-0.2 rounded-full shrink-0 font-normal',
              isActive
                ? 'bg-[#c4161c]/20 text-[#c4161c] dark:text-[#f87171]'
                : 'bg-muted text-muted-foreground'
            )}
          >
            {item.badge}
          </span>
        )}
      </button>
    );
  };

  return (
    <aside
      className={cn(
        'h-screen shrink-0 border-r border-border bg-card/90 backdrop-blur flex flex-col justify-between transition-all duration-200 select-none z-30',
        collapsed ? 'w-14' : 'w-60'
      )}
    >
      <div>
        {/* Brand Header */}
        {collapsed ? (
          <div className="h-12 border-b border-border/70 flex items-center justify-center">
            <button
              onClick={onToggleCollapse}
              aria-label="Expand sidebar"
              title="Click to expand sidebar"
              className="w-8 h-8 rounded-md p-1 hover:bg-muted/70 transition-colors flex items-center justify-center border border-border/50 group"
            >
              <img
                src={activeLogo}
                alt="Expand sidebar"
                className="w-full h-full object-contain group-hover:scale-105 transition-transform"
              />
            </button>
          </div>
        ) : (
          <div className="h-12 border-b border-border/70 flex items-center gap-2 px-2.5">
            <button
              onClick={onToggleCollapse}
              aria-label="Collapse sidebar"
              title="Collapse sidebar"
              className="p-1 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shrink-0"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
            <WorkspaceMenuPopover onViewChange={onViewChange} />
          </div>
        )}

        {/* Grouped primary navigation */}
        <nav aria-label="Primary" className="p-2 space-y-4 overflow-y-auto max-h-[calc(100vh-120px)]">
          {NAV_SECTIONS.map((section) => {
            const items = navItems.filter((item) => item.section === section);
            return (
              <div key={section} className="space-y-1">
                {!collapsed && (
                  <div className="px-2.5 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground/80">
                    {section}
                  </div>
                )}
                <div className="space-y-0.5">{items.map(renderItem)}</div>
              </div>
            );
          })}
        </nav>
      </div>

      {/* Footer User Popover */}
      <div className="p-2 border-t border-border/70">
        <UserPopover collapsed={collapsed} onNavigateSettings={() => onViewChange('settings')} />
      </div>
    </aside>
  );
}

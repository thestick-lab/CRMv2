import * as React from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import type { NavigateOptions, ViewKey } from '@/types/navigation';
import type { BreadcrumbCrumb } from './navigation-helpers';
import { usePracticeStore } from '@/context/PracticeStoreContext';
import { can, type PermissionGroupInput } from '@/lib/permissions';
import {
  Building2,
  ChevronRight,
  FilePlus2,
  Moon,
  Plus,
  Search,
  Sparkles,
  Sun,
  Timer,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TimerBar } from '@/components/time/TimerBar';

export interface TopbarProps {
  breadcrumbs: BreadcrumbCrumb[];
  onNavigate: (view: ViewKey, clientCode?: string, options?: NavigateOptions) => void;
  onOpenSearch: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
  onOpenAiAssistant?: () => void;
  /** Opens the entry-capture sheet; falls back to the Time view without it. */
  onLogTime?: () => void;
}

interface NewAction {
  label: string;
  hint: string;
  icon: LucideIcon;
  view: ViewKey;
  permission: { group: PermissionGroupInput; action: string; assigned?: boolean };
  options?: NavigateOptions;
}

const NEW_ACTIONS: NewAction[] = [
  {
    label: 'New quote',
    hint: 'Draft a fee proposal on the sales board',
    icon: FilePlus2,
    view: 'sales-pipeline',
    permission: { group: 'Quotes', action: 'view-create-send' },
  },
  {
    label: 'New client',
    hint: 'Register a company or individual',
    icon: Building2,
    view: 'clients',
    permission: { group: 'Clients', action: 'create-edit' },
    options: { newClient: true },
  },
  {
    label: 'Log time',
    hint: 'Record billable work against a client',
    icon: Timer,
    view: 'time',
    permission: { group: 'Time', action: 'log-own', assigned: true },
  },
];

/** Actions `role` may take from `+ New`; everything else never renders. */
export function permittedNewActions(
  role: Parameters<typeof can>[0],
  matrix: Parameters<typeof can>[3]
): NewAction[] {
  return NEW_ACTIONS.filter((action) =>
    can(role, action.permission.group, action.permission.action, matrix, {
      assigned: action.permission.assigned === true,
    })
  );
}

function NewMenu({
  onNavigate,
  onLogTime,
}: {
  onNavigate: TopbarProps['onNavigate'];
  onLogTime?: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  const { currentUser, permissions } = usePracticeStore();
  const actions = permittedNewActions(currentUser.role, permissions.matrix);
  const canLogTime = can(currentUser.role, 'Time', 'log-own', permissions.matrix, {
    assigned: true,
  });

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild>
        <button
          type="button"
          className="inline-flex h-7 items-center gap-1 rounded-md bg-[#c4161c] px-2.5 text-xs font-medium text-white outline-none transition-colors hover:bg-[#a01217] focus-visible:ring-2 focus-visible:ring-[#c4161c] focus-visible:ring-offset-2 focus-visible:ring-offset-background dark:hover:bg-[#d91b22]"
        >
          <Plus className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">New</span>
        </button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="end"
          sideOffset={6}
          className="z-50 w-60 rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-md outline-none"
        >
          {actions.map(({ label, hint, icon: Icon, view, options }) => (
            <PopoverPrimitive.Close asChild key={label}>
              <button
                type="button"
                onClick={() =>
                  view === 'time' && onLogTime ? onLogTime() : onNavigate(view, undefined, options)
                }
                className="flex w-full items-start gap-2.5 rounded-md px-2 py-2 text-left outline-none transition-colors hover:bg-muted focus-visible:ring-1 focus-visible:ring-[#c4161c]"
              >
                <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="min-w-0">
                  <span className="block text-xs font-medium text-foreground">{label}</span>
                  <span className="block text-[11px] leading-snug text-muted-foreground">{hint}</span>
                </span>
              </button>
            </PopoverPrimitive.Close>
          ))}
          {!canLogTime && (
            <div
              data-new-menu-blocked="log-time"
              className="flex items-start gap-2.5 rounded-md px-2 py-2 opacity-60"
            >
              <Timer className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="min-w-0">
                <span className="block text-xs font-medium text-foreground">Log time</span>
                <span className="block text-[11px] leading-snug text-muted-foreground">
                  {currentUser.role} cannot log time — the permission matrix keeps this to
                  assigned work.
                </span>
              </span>
            </div>
          )}
          {actions.length === 0 && (
            <p className="px-2 py-2 text-[11px] leading-snug text-muted-foreground">
              {currentUser.role} has no quick-create actions. Open Settings → Roles &amp;
              Permissions to review.
            </p>
          )}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

export function Topbar({
  breadcrumbs,
  onNavigate,
  onOpenSearch,
  isDark,
  onToggleTheme,
  onOpenAiAssistant,
  onLogTime,
}: TopbarProps) {
  const isMac = typeof window !== 'undefined' && navigator.platform.toUpperCase().includes('MAC');

  return (
    <header className="h-12 border-b border-border bg-card/80 backdrop-blur px-4 flex items-center justify-between shrink-0 select-none z-20">
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumbs" className="flex items-center gap-1.5 text-xs min-w-0">
        {breadcrumbs.map((crumb, idx) => {
          const isLast = idx === breadcrumbs.length - 1;
          return (
            <React.Fragment key={crumb.label + idx}>
              {idx > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground/60 shrink-0" />}
              {crumb.view && !isLast ? (
                <button
                  onClick={() => onNavigate(crumb.view!, crumb.clientCode)}
                  className="text-muted-foreground hover:text-foreground transition-colors truncate font-normal"
                >
                  {crumb.label}
                </button>
              ) : (
                <span
                  className={cn(
                    'truncate',
                    isLast ? 'text-foreground font-medium' : 'text-muted-foreground'
                  )}
                >
                  {crumb.label}
                </span>
              )}
            </React.Fragment>
          );
        })}
      </nav>

      {/* Right Controls */}
      <div className="flex items-center gap-2 shrink-0">
        <TimerBar />
        <NewMenu onNavigate={onNavigate} onLogTime={onLogTime} />

        {/* Search Cmd+K Trigger */}
        <button
          onClick={onOpenSearch}
          className="flex items-center gap-2 h-7 px-2.5 rounded-md border border-border bg-muted/40 hover:bg-muted text-xs text-muted-foreground hover:text-foreground transition-colors group"
        >
          <Search className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
          <span className="hidden sm:inline">Search practice...</span>
          <kbd className="font-mono text-[10px] bg-background/80 px-1 py-0.2 rounded border border-border/80 text-muted-foreground">
            {isMac ? '⌘K' : 'Ctrl+K'}
          </kbd>
        </button>

        {onOpenAiAssistant && (
          <button
            onClick={onOpenAiAssistant}
            aria-label="Open AI practice assistant"
            title="Open AI practice assistant"
            className="p-1.5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
          >
            <Sparkles className="h-4 w-4 text-[#c4161c]" />
          </button>
        )}

        {/* Theme Toggle */}
        <button
          onClick={onToggleTheme}
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          className="p-1.5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </div>
    </header>
  );
}

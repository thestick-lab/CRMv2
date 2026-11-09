import * as React from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import type { ViewKey } from '@/types/navigation';
import type { BreadcrumbCrumb } from './navigation-helpers';
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

export interface TopbarProps {
  breadcrumbs: BreadcrumbCrumb[];
  onNavigate: (view: ViewKey, clientCode?: string) => void;
  onOpenSearch: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
  onOpenAiAssistant?: () => void;
}

interface NewAction {
  label: string;
  hint: string;
  icon: LucideIcon;
  view: ViewKey;
}

const NEW_ACTIONS: NewAction[] = [
  {
    label: 'New quote',
    hint: 'Draft a fee proposal on the sales board',
    icon: FilePlus2,
    view: 'sales-pipeline',
  },
  {
    label: 'New client',
    hint: 'Register a company or individual',
    icon: Building2,
    view: 'clients',
  },
  {
    label: 'Log time',
    hint: 'Record billable work against a client',
    icon: Timer,
    view: 'time',
  },
];

function NewMenu({ onNavigate }: { onNavigate: TopbarProps['onNavigate'] }) {
  const [open, setOpen] = React.useState(false);

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
          {NEW_ACTIONS.map(({ label, hint, icon: Icon, view }) => (
            <PopoverPrimitive.Close asChild key={label}>
              <button
                type="button"
                onClick={() => onNavigate(view)}
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
        <NewMenu onNavigate={onNavigate} />

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

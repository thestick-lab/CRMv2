import * as React from 'react';
import type { ViewKey } from '@/types/navigation';
import type { BreadcrumbCrumb } from './navigation-helpers';
import { ChevronRight, Moon, Search, Sun, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TopbarProps {
  breadcrumbs: BreadcrumbCrumb[];
  onNavigate: (view: ViewKey, clientCode?: string) => void;
  onOpenSearch: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
  onOpenAiAssistant?: () => void;
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
        {/* AI Copilot Trigger */}
        <button
          onClick={onOpenAiAssistant}
          aria-label="Open AI Practice Copilot"
          title="Open AI Practice Copilot"
          className="p-1.5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors relative"
        >
          <Sparkles className="h-4 w-4 text-[#c4161c]" />
        </button>

        {/* Theme Toggle */}
        <button
          onClick={onToggleTheme}
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          className="p-1.5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </div>
    </header>
  );
}

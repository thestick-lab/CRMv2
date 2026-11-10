import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ViewKey } from '@/types/navigation';

export interface CommandItem {
  id: string;
  label: string;
  section: string;
  clientCode?: string;
  badge?: string;
  /** View the item opens; defaults to the item id for navigation entries. */
  view?: ViewKey;
  icon?: React.ComponentType<{ className?: string }>;
}

export function filterCommandItems(items: CommandItem[], query: string): CommandItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter((item) => {
    return (
      item.label.toLowerCase().includes(q) ||
      item.section.toLowerCase().includes(q) ||
      (item.badge && item.badge.toLowerCase().includes(q)) ||
      (item.clientCode && item.clientCode.toLowerCase().includes(q))
    );
  });
}

export interface CommandDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: CommandItem[];
  onSelect: (item: CommandItem) => void;
}

export function CommandDialog({ open, onOpenChange, items, onSelect }: CommandDialogProps) {
  const [query, setQuery] = React.useState('');
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const filtered = React.useMemo(() => filterCommandItems(items, query), [items, query]);

  React.useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  React.useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (filtered.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % filtered.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % filtered.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selected = filtered[selectedIndex];
      if (selected) {
        onSelect(selected);
        onOpenChange(false);
      }
    }
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs transition-opacity" />
        <DialogPrimitive.Content
          onKeyDown={handleKeyDown}
          className="fixed left-1/2 top-[20%] z-50 w-full max-w-xl -translate-x-1/2 rounded-lg border border-border bg-card p-0 shadow-2xl transition-all outline-none"
        >
          {/* Accessible title and description for Radix Dialog */}
          <DialogPrimitive.Title className="sr-only">Command Menu</DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            Search practice views, clients, quotes, and time entries
          </DialogPrimitive.Description>

          <div className="flex items-center border-b border-border px-3 py-2.5">
            <Search className="h-4 w-4 text-muted-foreground mr-2 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search views, clients (ALC-610), quotes, or time entries..."
              className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
            <button
              onClick={() => onOpenChange(false)}
              className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="max-h-80 overflow-y-auto p-2 space-y-1">
            {filtered.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted-foreground">
                No matching view, client, quote, or time entry found for "{query}".
              </div>
            ) : (
              filtered.map((item, idx) => {
                const isSelected = idx === selectedIndex;
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onSelect(item);
                      onOpenChange(false);
                    }}
                    className={cn(
                      'w-full flex items-center justify-between px-3 py-2 rounded-md text-xs transition-colors text-left',
                      isSelected
                        ? 'bg-[#c4161c]/15 text-[#c4161c] dark:text-[#f87171] font-medium'
                        : 'text-foreground hover:bg-muted'
                    )}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      {Icon ? (
                        <Icon className={cn('h-4 w-4 shrink-0', isSelected ? 'text-[#c4161c]' : 'text-muted-foreground')} />
                      ) : null}
                      <span className="truncate">{item.label}</span>
                      {item.clientCode ? (
                        <span className="font-mono text-[11px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                          {item.clientCode}
                        </span>
                      ) : null}
                    </div>
                    <span className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider shrink-0 ml-2">
                      {item.section}
                    </span>
                  </button>
                );
              })
            )}
          </div>

          <div className="flex items-center justify-between border-t border-border px-3 py-1.5 text-[11px] text-muted-foreground font-mono bg-muted/30">
            <span>↑↓ to navigate</span>
            <span>↵ to select</span>
            <span>ESC to close</span>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

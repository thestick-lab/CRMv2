import * as React from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { Check, ChevronsUpDown, Settings } from 'lucide-react';
import { usePracticeStore, type Division } from '@/context/PracticeStoreContext';
import type { ViewKey } from '@/types/navigation';
import { cn } from '@/lib/utils';

export interface WorkspaceMenuPopoverProps {
  onViewChange?: (view: ViewKey) => void;
  className?: string;
}

export function WorkspaceMenuPopover({ onViewChange, className }: WorkspaceMenuPopoverProps) {
  const [open, setOpen] = React.useState(false);
  const { division, setDivision } = usePracticeStore();

  const isFd = division === 'fd-on-call';
  const activeLogo = isFd ? '/fd-on-call-logo.png' : '/accountant-on-call-logo.png';
  const activeTitle = isFd ? 'FD on Call' : 'Accountant on Call';

  const handleSelectDivision = (newDiv: Division) => {
    setDivision(newDiv);
    setOpen(false);
  };

  const handleOpenSettings = () => {
    setOpen(false);
    onViewChange?.('settings');
  };

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild>
        <button
          className={cn(
            'flex items-center gap-2 px-1.5 py-1 rounded-md hover:bg-muted/70 transition-colors text-left group outline-none min-w-0 max-w-[170px]',
            className
          )}
          title={`${activeTitle} — Switch division or practice settings`}
        >
          <div className="w-5 h-5 rounded overflow-hidden shrink-0 bg-white/10 flex items-center justify-center p-0.5 border border-border/50">
            <img src={activeLogo} alt={activeTitle} className="w-full h-full object-contain" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="font-semibold text-xs text-foreground tracking-tight block truncate">
              {activeTitle}
            </span>
          </div>
          <ChevronsUpDown className="h-3 w-3 text-muted-foreground group-hover:text-foreground shrink-0 transition-colors" />
        </button>
      </PopoverPrimitive.Trigger>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          side="bottom"
          sideOffset={8}
          className="z-50 w-64 rounded-lg border border-border bg-card/95 backdrop-blur-md p-2.5 shadow-2xl text-xs space-y-3 animate-in fade-in-0 zoom-in-95"
        >

          {/* Division Switcher */}
          <div className="space-y-1">
            <div className="px-1.5 text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
              Practice Division
            </div>

            <button
              onClick={() => handleSelectDivision('fd-on-call')}
              className={cn(
                'w-full flex items-center justify-between p-1.5 rounded-md text-left transition-colors',
                isFd ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted text-foreground'
              )}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-5 h-5 rounded bg-white/10 shrink-0 p-0.5 border border-border/50 flex items-center justify-center">
                  <img src="/fd-on-call-logo.png" alt="FD on Call" className="w-full h-full object-contain" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs truncate font-medium">FD on Call</div>
                  <div className="text-[11px] text-muted-foreground truncate">Virtual FD & Advisory</div>
                </div>
              </div>
              {isFd && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
            </button>

            <button
              onClick={() => handleSelectDivision('accountant-on-call')}
              className={cn(
                'w-full flex items-center justify-between p-1.5 rounded-md text-left transition-colors',
                !isFd ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted text-foreground'
              )}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-5 h-5 rounded bg-white/10 shrink-0 p-0.5 border border-border/50 flex items-center justify-center">
                  <img src="/accountant-on-call-logo.png" alt="Accountant on Call" className="w-full h-full object-contain" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs truncate font-medium">Accountant on Call</div>
                  <div className="text-[11px] text-muted-foreground truncate">Statutory & Bookkeeping</div>
                </div>
              </div>
              {!isFd && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
            </button>
          </div>

          <div className="h-px bg-border/70" />

          {/* Settings Shortcut */}
          <div>
            <button
              onClick={handleOpenSettings}
              className="w-full flex items-center gap-2 p-1.5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors text-left"
            >
              <Settings className="h-3.5 w-3.5" />
              <span>Practice Settings & RBAC</span>
            </button>
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

import * as React from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { ChevronRight, LogOut, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePracticeStore } from '@/context/PracticeStoreContext';
import { can } from '@/lib/permissions';

export interface UserPopoverProps {
  collapsed?: boolean;
  onNavigateSettings?: () => void;
  defaultOpen?: boolean;
}

export function UserPopover({ collapsed = false, onNavigateSettings, defaultOpen = false }: UserPopoverProps) {
  const [open, setOpen] = React.useState(defaultOpen);
  const { currentUser, logout, permissions } = usePracticeStore();

  const initials = currentUser.name.slice(0, 2).toUpperCase();

  const handleOpenProfile = () => {
    setOpen(false);
    onNavigateSettings?.();
  };

  const handleLogout = () => {
    setOpen(false);
    logout();
  };

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild>
        <button
          className={cn(
            'w-full flex items-center gap-2.5 p-2 rounded-md hover:bg-muted/70 transition-colors text-left group outline-none focus-visible:ring-1 focus-visible:ring-[#c4161c]',
            collapsed ? 'justify-center p-1.5' : 'justify-between'
          )}
          title={`${currentUser.name} (${currentUser.role})`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-md bg-[#c4161c] text-white font-mono font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
              {initials}
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <span className="font-semibold text-xs text-foreground block truncate">
                  {currentUser.name}
                </span>
                <span className="text-[10px] text-muted-foreground block truncate font-mono">
                  {currentUser.email}
                </span>
              </div>
            )}
          </div>
          {!collapsed && (
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground shrink-0 transition-transform" />
          )}
        </button>
      </PopoverPrimitive.Trigger>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          side={collapsed ? 'right' : 'top'}
          align="start"
          sideOffset={8}
          className="z-50 w-64 rounded-lg border border-border bg-card p-2.5 shadow-xl outline-none text-xs space-y-2.5"
        >
          {/* Header */}
          <div className="flex items-start gap-2.5 pb-2.5 border-b border-border/70">
            <div className="w-8 h-8 rounded-md bg-[#c4161c] text-white font-mono font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-foreground">
                <span>{currentUser.name}</span>
              </div>
              <div className="text-[11px] text-muted-foreground truncate">{currentUser.email}</div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="space-y-0.5">
            {can(currentUser.role, 'Settings', 'view', permissions.matrix) && (
              <button
                onClick={handleOpenProfile}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted text-foreground transition-colors cursor-pointer"
              >
                <User className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Settings</span>
              </button>
            )}
          </div>

          {/* Logout */}
          <div className="pt-1.5 border-t border-border/70">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-destructive/10 text-destructive text-xs font-medium transition-colors cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Close Session</span>
            </button>
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

import * as React from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { ChevronRight, LogOut, ShieldCheck, User, Check, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePracticeStore } from '@/context/PracticeStoreContext';

export interface UserPopoverProps {
  collapsed?: boolean;
  onNavigateSettings?: () => void;
}

export function UserPopover({ collapsed = false, onNavigateSettings }: UserPopoverProps) {
  const [open, setOpen] = React.useState(false);
  const { currentUser, setCurrentUser } = usePracticeStore();

  const initials = currentUser.name.slice(0, 2).toUpperCase();

  const demoUsers = [
    { id: 'erik', name: 'Erik', role: 'Partner (CA(SA))' },
    { id: 'chrizelle', name: 'Chrizelle', role: 'Compliance Officer' },
    { id: 'andre', name: 'André', role: 'Accountant' },
  ];

  const handleSwitchUser = (id: string) => {
    setCurrentUser(id);
    setOpen(false);
  };

  const handleOpenProfile = () => {
    setOpen(false);
    onNavigateSettings?.();
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
                  {currentUser.role}
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
              <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <span>{currentUser.name}</span>
                <span className="text-[10px] font-mono text-[#c4161c] bg-[#c4161c]/10 px-1 py-0.2 rounded">
                  {currentUser.role.split(' ')[0]}
                </span>
              </div>
              <div className="text-[11px] text-muted-foreground truncate">{currentUser.email}</div>
              <div className="text-[10px] text-muted-foreground/80 font-mono mt-0.5">
                Durbanville, Cape Town
              </div>
            </div>
          </div>

          {/* Session Switcher (RBAC) */}
          <div className="space-y-1">
            <div className="px-1.5 text-[10px] font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Users className="h-3 w-3" />
              <span>Switch Active Session</span>
            </div>

            {demoUsers.map((u) => {
              const isActive = currentUser.id === u.id;
              return (
                <button
                  key={u.id}
                  onClick={() => handleSwitchUser(u.id)}
                  className={cn(
                    'w-full flex items-center justify-between p-1.5 rounded text-left transition-colors text-xs',
                    isActive ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted text-foreground'
                  )}
                >
                  <div className="min-w-0">
                    <div className="font-medium truncate">{u.name}</div>
                    <div className="text-[10px] text-muted-foreground truncate">{u.role}</div>
                  </div>
                  {isActive && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                </button>
              );
            })}
          </div>

          <div className="h-px bg-border/70" />

          {/* Menu Items */}
          <div className="space-y-0.5">
            <button
              onClick={handleOpenProfile}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted text-foreground transition-colors"
            >
              <User className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Practice Settings</span>
            </button>
            <div className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
              <span>SAICA Registered Practice</span>
            </div>
          </div>

          {/* Logout */}
          <div className="pt-1.5 border-t border-border/70">
            <button
              onClick={() => setOpen(false)}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-destructive/10 text-destructive text-xs font-medium transition-colors"
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

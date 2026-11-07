import * as React from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { ChevronRight, KeyRound, LogOut, Settings, ShieldCheck, User } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface UserProfile {
  name: string;
  initials: string;
  role: string;
  email: string;
  office: string;
}

export interface UserPopoverProps {
  user?: UserProfile;
  collapsed?: boolean;
}

const defaultUser: UserProfile = {
  name: 'Erik',
  initials: 'EW',
  role: 'Partner (CA(SA))',
  email: 'erikw@fdoncall.co.za',
  office: 'Durbanville, Cape Town',
};

export function UserPopover({ user = defaultUser, collapsed = false }: UserPopoverProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild>
        <button
          className={cn(
            'w-full flex items-center gap-2.5 p-2 rounded-md hover:bg-muted/70 transition-colors text-left group outline-none focus-visible:ring-1 focus-visible:ring-[#c4161c]',
            collapsed ? 'justify-center p-1.5' : 'justify-between'
          )}
          title={`${user.name} (${user.role})`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-md bg-[#c4161c]/20 border border-[#c4161c]/30 text-[#c4161c] dark:text-[#f87171] font-mono font-semibold text-xs flex items-center justify-center shrink-0">
              {user.initials}
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium text-foreground truncate">{user.name}</div>
                <div className="text-[10px] text-muted-foreground truncate">{user.role}</div>
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
          className="z-50 w-64 rounded-lg border border-border bg-card p-2.5 shadow-xl outline-none"
        >
          {/* Header */}
          <div className="flex items-start gap-2.5 pb-2.5 border-b border-border/70">
            <div className="w-8 h-8 rounded-md bg-[#c4161c] text-white font-mono font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
              {user.initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <span>{user.name}</span>
                <span className="text-[10px] font-mono text-[#c4161c] bg-[#c4161c]/10 px-1 py-0.2 rounded">
                  Partner
                </span>
              </div>
              <div className="text-[11px] text-muted-foreground truncate">{user.email}</div>
              <div className="text-[10px] text-muted-foreground/80 font-mono mt-0.5">{user.office}</div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="py-1.5 space-y-0.5 text-xs">
            <button
              onClick={() => setOpen(false)}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted text-foreground transition-colors"
            >
              <User className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Profile Settings</span>
            </button>
            <button
              onClick={() => setOpen(false)}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted text-foreground transition-colors"
            >
              <KeyRound className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Change Password</span>
            </button>
            <button
              onClick={() => setOpen(false)}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted text-foreground transition-colors"
            >
              <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" />
              <span>SAICA Governance Log</span>
            </button>
          </div>

          {/* Logout */}
          <div className="pt-1.5 border-t border-border/70">
            <button
              onClick={() => setOpen(false)}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-destructive/10 text-destructive text-xs font-medium transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Log out</span>
            </button>
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

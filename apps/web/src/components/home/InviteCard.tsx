import { UserPlus } from 'lucide-react';

export interface InviteCardProps {
  onInvite: () => void;
}

/** Tinted prompt into the settings team pane. */
export function InviteCard({ onInvite }: InviteCardProps) {
  return (
    <section className="rounded-xl border border-[#c4161c]/20 bg-[#c4161c]/[0.04] p-4">
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#c4161c]/10 text-[#c4161c] dark:text-[#f87171]">
        <UserPlus className="h-3.5 w-3.5" />
      </span>
      <h2 className="mt-2.5 text-sm font-semibold text-foreground">Invite your team</h2>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        Bring a colleague or subcontractor onto the practice so filing queues and time are assigned
        to the right person.
      </p>
      <button
        type="button"
        onClick={onInvite}
        className="mt-3 inline-flex h-8 w-full items-center justify-center rounded-md bg-[#c4161c] px-3 text-xs font-medium text-white outline-none transition-colors hover:bg-[#a01217] focus-visible:ring-2 focus-visible:ring-[#c4161c] focus-visible:ring-offset-2 focus-visible:ring-offset-card dark:hover:bg-[#d91b22]"
      >
        Invite team member
      </button>
    </section>
  );
}

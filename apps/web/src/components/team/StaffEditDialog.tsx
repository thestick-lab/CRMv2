import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import type { StaffProfile } from '@/context/PracticeStoreContext';
import { Button } from '@/components/ui/button';
import { Pencil, X } from 'lucide-react';

export interface StaffEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staffName: string;
  profile: StaffProfile;
  onSave: (patch: Partial<StaffProfile>) => void;
}

/**
 * Contract terms and internal notes for one staff member. Only what the user
 * types is saved — a blank rate stays blank (`—` on the register) instead of
 * borrowing the practice standard rate.
 */
export function StaffEditDialog({
  open,
  onOpenChange,
  staffName,
  profile,
  onSave,
}: StaffEditDialogProps) {
  const [contractType, setContractType] = React.useState<'employee' | 'subcontractor'>(
    profile.contractType
  );
  const [startDate, setStartDate] = React.useState(profile.startDate ?? '');
  const [hourlyRate, setHourlyRate] = React.useState(
    profile.hourlyRate === undefined ? '' : String(profile.hourlyRate)
  );
  const [phone, setPhone] = React.useState(profile.phone ?? '');
  const [notes, setNotes] = React.useState(profile.notes ?? '');

  React.useEffect(() => {
    if (!open) return;
    setContractType(profile.contractType);
    setStartDate(profile.startDate ?? '');
    setHourlyRate(profile.hourlyRate === undefined ? '' : String(profile.hourlyRate));
    setPhone(profile.phone ?? '');
    setNotes(profile.notes ?? '');
  }, [open, profile]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const rate = Number(hourlyRate);
    onSave({
      contractType,
      startDate: startDate || undefined,
      hourlyRate: hourlyRate.trim() === '' || !Number.isFinite(rate) ? undefined : rate,
      phone: phone.trim() || undefined,
      notes: notes.trim() || undefined,
    });
    onOpenChange(false);
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs" />
        <DialogPrimitive.Content
          data-staff-edit-dialog
          className="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-border bg-card shadow-2xl outline-none"
        >
          <header className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg border border-[#c4161c]/20 bg-[#c4161c]/10 text-[#c4161c]">
                <Pencil className="h-4 w-4" />
              </span>
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                  Team
                </p>
                <DialogPrimitive.Title className="font-serif text-lg leading-tight text-foreground">
                  {staffName}
                </DialogPrimitive.Title>
                <DialogPrimitive.Description className="text-xs leading-relaxed text-muted-foreground">
                  Contract terms and internal notes. Leave a field blank to leave it unrecorded.
                </DialogPrimitive.Description>
              </div>
            </div>
            <DialogPrimitive.Close asChild>
              <button
                type="button"
                aria-label="Close staff editor"
                className="rounded-md p-1 text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-1 focus-visible:ring-[#c4161c]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </DialogPrimitive.Close>
          </header>

          <form onSubmit={submit} className="space-y-3 px-5 py-4 text-xs">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block font-medium text-foreground">Contract type</span>
                <select
                  value={contractType}
                  aria-label="Contract type"
                  onChange={(event) =>
                    setContractType(event.target.value as 'employee' | 'subcontractor')
                  }
                  className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-foreground outline-none focus-visible:ring-1 focus-visible:ring-[#c4161c]"
                >
                  <option value="employee">Employee</option>
                  <option value="subcontractor">Subcontractor</option>
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block font-medium text-foreground">Start date</span>
                <input
                  type="date"
                  value={startDate}
                  aria-label="Start date"
                  onChange={(event) => setStartDate(event.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-2 py-1.5 font-mono text-foreground outline-none focus-visible:ring-1 focus-visible:ring-[#c4161c]"
                />
              </label>

              <label className="block">
                <span className="mb-1 block font-medium text-foreground">
                  Hourly rate{' '}
                  <span className="font-normal text-muted-foreground">(subcontractors)</span>
                </span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={hourlyRate}
                  aria-label="Hourly rate"
                  onChange={(event) => setHourlyRate(event.target.value)}
                  placeholder="Not on record"
                  className="w-full rounded-lg border border-border bg-background px-2 py-1.5 font-mono text-foreground outline-none focus-visible:ring-1 focus-visible:ring-[#c4161c]"
                />
              </label>

              <label className="block">
                <span className="mb-1 block font-medium text-foreground">Phone</span>
                <input
                  type="tel"
                  value={phone}
                  aria-label="Phone"
                  onChange={(event) => setPhone(event.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-2 py-1.5 font-mono text-foreground outline-none focus-visible:ring-1 focus-visible:ring-[#c4161c]"
                />
              </label>
            </div>

            <label className="block">
              <span className="mb-1 block font-medium text-foreground">Internal notes</span>
              <textarea
                value={notes}
                aria-label="Internal notes"
                rows={4}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Never shared with clients."
                className="w-full resize-y rounded-lg border border-border bg-background px-2.5 py-2 leading-relaxed text-foreground outline-none focus-visible:ring-1 focus-visible:ring-[#c4161c]"
              />
            </label>

            <footer className="flex items-center justify-end gap-2 border-t border-border pt-3">
              <DialogPrimitive.Close asChild>
                <Button type="button" variant="outline" size="sm">
                  Cancel
                </Button>
              </DialogPrimitive.Close>
              <Button type="submit" size="sm" data-staff-edit-save>
                Save changes
              </Button>
            </footer>
          </form>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

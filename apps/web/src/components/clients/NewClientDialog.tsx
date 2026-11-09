import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import type { EntityType, VatCategory } from 'fdoncall-practice/domain/types';
import { MONTHS_LONG } from 'fdoncall-practice/domain/dates';
import type { StaffMember } from 'fdoncall-practice/domain/types';
import type { NewClientInput } from '@/context/PracticeStoreContext';
import { Button } from '@/components/ui/button';
import { Building2, X } from 'lucide-react';

const ENTITY_TYPES: EntityType[] = ['Company', 'Close corporation', 'Trust', 'Individual'];
const VAT_CATEGORIES: Array<{ value: VatCategory | ''; label: string }> = [
  { value: '', label: 'Not VAT registered' },
  { value: 'A', label: 'Category A (odd months)' },
  { value: 'B', label: 'Category B (even months)' },
  { value: 'C', label: 'Category C (monthly)' },
  { value: 'E', label: 'Category E (six-monthly)' },
];

export interface NewClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staff: StaffMember[];
  defaultStaffId: string;
  onCreate: (input: NewClientInput) => void;
}

/**
 * The minimal, honest create-client flow: only the facts the deadline engine
 * needs to materialise the statutory calendar. Everything else (contacts,
 * turnover, incorporation date) is recorded on the client record afterwards.
 */
export function NewClientDialog({
  open,
  onOpenChange,
  staff,
  defaultStaffId,
  onCreate,
}: NewClientDialogProps) {
  const [name, setName] = React.useState('');
  const [entityType, setEntityType] = React.useState<EntityType>('Company');
  const [yearEndMonth, setYearEndMonth] = React.useState(2);
  const [vatCategory, setVatCategory] = React.useState<VatCategory | ''>('');
  const [payroll, setPayroll] = React.useState(false);
  const [employeeCount, setEmployeeCount] = React.useState(8);
  const [staffId, setStaffId] = React.useState(defaultStaffId);

  React.useEffect(() => {
    if (!open) return;
    setName('');
    setEntityType('Company');
    setYearEndMonth(2);
    setVatCategory('');
    setPayroll(false);
    setEmployeeCount(8);
    setStaffId(defaultStaffId);
  }, [open, defaultStaffId]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    onCreate({
      name: name.trim(),
      entityType,
      yearEndMonth,
      vatCategory: vatCategory === '' ? undefined : vatCategory,
      payroll,
      employeeCount: payroll ? employeeCount : undefined,
      staffId,
    });
    onOpenChange(false);
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs" />
        <DialogPrimitive.Content
          data-new-client-dialog
          className="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-border bg-card shadow-2xl outline-none"
        >
          <header className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg border border-[#c4161c]/20 bg-[#c4161c]/10 text-[#c4161c]">
                <Building2 className="h-4 w-4" />
              </span>
              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
                  Clients
                </p>
                <DialogPrimitive.Title className="font-serif text-lg leading-tight text-foreground">
                  Register a client
                </DialogPrimitive.Title>
                <DialogPrimitive.Description className="max-w-xs text-xs leading-relaxed text-muted-foreground">
                  The statutory calendar is generated from the entity, year end, VAT and payroll
                  facts recorded here.
                </DialogPrimitive.Description>
              </div>
            </div>
            <DialogPrimitive.Close asChild>
              <button
                type="button"
                aria-label="Close new client"
                className="rounded-md p-1 text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-1 focus-visible:ring-[#c4161c]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </DialogPrimitive.Close>
          </header>

          <form onSubmit={submit} className="space-y-3 px-5 py-4 text-xs">
            <label className="block">
              <span className="mb-1 block font-medium text-foreground">Registered name</span>
              <input
                autoFocus
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Table Bay Logistics (Pty) Ltd"
                aria-label="Client name"
                className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-foreground outline-none focus-visible:ring-1 focus-visible:ring-[#c4161c]"
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block font-medium text-foreground">Entity type</span>
                <select
                  value={entityType}
                  aria-label="Entity type"
                  onChange={(event) => setEntityType(event.target.value as EntityType)}
                  className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-foreground outline-none focus-visible:ring-1 focus-visible:ring-[#c4161c]"
                >
                  {ENTITY_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block font-medium text-foreground">Financial year end</span>
                <select
                  value={yearEndMonth}
                  aria-label="Financial year end"
                  onChange={(event) => setYearEndMonth(Number(event.target.value))}
                  className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-foreground outline-none focus-visible:ring-1 focus-visible:ring-[#c4161c]"
                >
                  {MONTHS_LONG.map((month, index) => (
                    <option key={month} value={index + 1}>
                      {month}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block font-medium text-foreground">VAT category</span>
                <select
                  value={vatCategory}
                  aria-label="VAT category"
                  onChange={(event) =>
                    setVatCategory(event.target.value as VatCategory | '')
                  }
                  className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-foreground outline-none focus-visible:ring-1 focus-visible:ring-[#c4161c]"
                >
                  {VAT_CATEGORIES.map((option) => (
                    <option key={option.label} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block font-medium text-foreground">Responsible staff</span>
                <select
                  value={staffId}
                  aria-label="Responsible staff"
                  onChange={(event) => setStaffId(event.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-foreground outline-none focus-visible:ring-1 focus-visible:ring-[#c4161c]"
                >
                  {staff.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
              <label className="inline-flex items-center gap-1.5 text-foreground">
                <input
                  type="checkbox"
                  checked={payroll}
                  aria-label="Runs payroll"
                  onChange={(event) => setPayroll(event.target.checked)}
                  className="h-3.5 w-3.5 accent-[#c4161c]"
                />
                Runs payroll
              </label>
              {payroll && (
                <label className="inline-flex items-center gap-1.5 text-foreground">
                  <span className="text-muted-foreground">Employees</span>
                  <input
                    type="number"
                    min={1}
                    value={employeeCount}
                    aria-label="Employee count"
                    onChange={(event) => setEmployeeCount(Number(event.target.value))}
                    className="w-16 rounded border border-border bg-background px-1.5 py-1 font-mono text-foreground outline-none focus-visible:ring-1 focus-visible:ring-[#c4161c]"
                  />
                </label>
              )}
            </div>

            <footer className="flex items-center justify-end gap-2 border-t border-border pt-3">
              <DialogPrimitive.Close asChild>
                <Button type="button" variant="outline" size="sm">
                  Cancel
                </Button>
              </DialogPrimitive.Close>
              <Button type="submit" size="sm" data-new-client-submit disabled={!name.trim()}>
                Create client
              </Button>
            </footer>
          </form>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

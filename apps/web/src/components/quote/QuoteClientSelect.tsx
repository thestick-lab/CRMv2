import * as React from 'react';
import type { Client, EntityType, VatCategory } from 'fdoncall-practice/domain/types';
import type { QuoteProspect } from '@/context/PracticeStoreContext';
import { usePracticeStore } from '@/context/PracticeStoreContext';
import { MONTHS_LONG } from 'fdoncall-practice/domain/dates';
import { Search, UserPlus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  ENTITY_TYPE_OPTIONS,
  FIELD_INPUT_CLASS,
  FIELD_LABEL_CLASS,
  VAT_CATEGORY_OPTIONS,
} from './estimate-form';

export interface QuoteClientSelectProps {
  mode: 'client' | 'prospect';
  clientCode?: string;
  prospect: QuoteProspect;
  onModeChange: (mode: 'client' | 'prospect') => void;
  onClientSelected: (client: Client) => void;
  onProspectChange: (patch: Partial<QuoteProspect>) => void;
}

/**
 * Step 1 of the quote builder. Existing clients are searched and pre-fill the
 * statutory record, services and saved estimate; a prospect is captured in full
 * (including the Close corporation entity type) and stays unregistered until
 * the quote converts.
 */
export function QuoteClientSelect({
  mode,
  clientCode,
  prospect,
  onModeChange,
  onClientSelected,
  onProspectChange,
}: QuoteClientSelectProps) {
  const { clients, staff } = usePracticeStore();
  const [search, setSearch] = React.useState('');
  const [open, setOpen] = React.useState(false);

  const selectedClient = clientCode ? clients.find((client) => client.code === clientCode) : undefined;

  const filtered = React.useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return clients;
    return clients.filter(
      (client) =>
        client.code.toLowerCase().includes(query) || client.name.toLowerCase().includes(query)
    );
  }, [clients, search]);

  const pick = (client: Client) => {
    setSearch('');
    setOpen(false);
    onClientSelected(client);
  };

  return (
    <div className="space-y-4">
      <div className="flex rounded-lg border border-border bg-muted/30 p-0.5">
        {(
          [
            { value: 'client', label: 'Existing client' },
            { value: 'prospect', label: 'New prospect' },
          ] as const
        ).map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onModeChange(option.value)}
            className={cn(
              'flex-1 rounded-md px-3 py-1.5 text-xs font-medium outline-none transition-colors focus-visible:ring-1 focus-visible:ring-[#c4161c]',
              mode === option.value
                ? 'bg-card text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            )}
            aria-pressed={mode === option.value}
          >
            {option.label}
          </button>
        ))}
      </div>

      {mode === 'client' ? (
        <section className="rounded-xl border border-border bg-card shadow-xs">
          <header className="border-b border-border px-4 py-3">
            <h3 className="text-sm font-semibold text-foreground">Which client is this quote for?</h3>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              The record&apos;s statutory fields, services on file and last estimate pre-fill the
              quote. Search by code or name.
            </p>
          </header>

          <div className="space-y-3 px-4 py-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setOpen(true);
                }}
                onFocus={() => setOpen(true)}
                placeholder="Search existing clients…"
                className={cn(FIELD_INPUT_CLASS, 'mt-0 pl-8 pr-8')}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    setOpen(false);
                  }}
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}

              {open && (
                <div className="absolute inset-x-0 top-full z-20 mt-1 max-h-64 overflow-y-auto rounded-lg border border-border bg-card p-1 shadow-lg">
                  {filtered.length === 0 ? (
                    <p className="px-3 py-2 text-[11px] text-muted-foreground">
                      No client matches “{search}”. Use New prospect instead.
                    </p>
                  ) : (
                    filtered.map((client) => (
                      <button
                        key={client.code}
                        type="button"
                        onClick={() => pick(client)}
                        className="flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-left outline-none transition-colors hover:bg-muted focus-visible:bg-muted"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-xs text-foreground">{client.name}</span>
                          <span className="block font-mono text-[11px] text-muted-foreground">
                            {client.code} · {client.entityType}
                          </span>
                        </span>
                        <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                          {client.vatCategory ? `VAT ${client.vatCategory}` : 'Non-VAT'}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {selectedClient ? (
              <div className="rounded-lg border border-border bg-muted/20 px-3 py-2.5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-foreground">{selectedClient.name}</p>
                    <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                      {selectedClient.code} · {selectedClient.entityType} · year end{' '}
                      {MONTHS_LONG[selectedClient.yearEndMonth - 1]}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onModeChange('prospect');
                    }}
                    className="shrink-0 text-[11px] font-medium text-[#c4161c] outline-none hover:underline focus-visible:ring-1 focus-visible:ring-[#c4161c]"
                  >
                    New prospect instead
                  </button>
                </div>
              </div>
            ) : (
              <p className="rounded-lg border border-dashed border-border px-3 py-2 text-[11px] text-muted-foreground">
                No client selected yet. Send needs a client before the quote can leave draft.
              </p>
            )}
          </div>
        </section>
      ) : (
        <section className="rounded-xl border border-border bg-card shadow-xs">
          <header className="flex items-center gap-2 border-b border-border px-4 py-3">
            <UserPlus className="h-4 w-4 text-[#c4161c]" />
            <div>
              <h3 className="text-sm font-semibold text-foreground">Prospect details</h3>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Stays unregistered until the quote is converted to an active client.
              </p>
            </div>
          </header>

          <div className="grid grid-cols-1 gap-4 px-4 py-4 sm:grid-cols-2">
            <label className={cn(FIELD_LABEL_CLASS, 'sm:col-span-2')}>
              Legal name
              <input
                type="text"
                value={prospect.name}
                onChange={(event) => onProspectChange({ name: event.target.value })}
                placeholder="e.g. Cape Agulhas Distillers (Pty) Ltd"
                className={FIELD_INPUT_CLASS}
              />
            </label>

            <label className={FIELD_LABEL_CLASS}>
              Contact person
              <input
                type="text"
                value={prospect.contactPerson}
                onChange={(event) => onProspectChange({ contactPerson: event.target.value })}
                placeholder="Who signs the engagement"
                className={FIELD_INPUT_CLASS}
              />
            </label>

            <label className={FIELD_LABEL_CLASS}>
              Entity type
              <select
                value={prospect.entityType}
                onChange={(event) =>
                  onProspectChange({ entityType: event.target.value as EntityType })
                }
                className={FIELD_INPUT_CLASS}
              >
                {ENTITY_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className={FIELD_LABEL_CLASS}>
              Annual turnover (ZAR)
              <input
                type="number"
                min={0}
                step={100_000}
                value={prospect.turnover ?? 0}
                onChange={(event) => onProspectChange({ turnover: Number(event.target.value) })}
                className={cn(FIELD_INPUT_CLASS, 'font-mono')}
              />
            </label>

            <label className={FIELD_LABEL_CLASS}>
              VAT category
              <select
                value={prospect.vatCategory ?? ''}
                onChange={(event) =>
                  onProspectChange({
                    vatCategory: (event.target.value || undefined) as VatCategory | undefined,
                  })
                }
                className={FIELD_INPUT_CLASS}
              >
                {VAT_CATEGORY_OPTIONS.map((option) => (
                  <option key={option.label} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className={FIELD_LABEL_CLASS}>
              Financial year end
              <select
                value={prospect.yearEndMonth ?? 2}
                onChange={(event) => onProspectChange({ yearEndMonth: Number(event.target.value) })}
                className={FIELD_INPUT_CLASS}
              >
                {MONTHS_LONG.map((month, index) => (
                  <option key={month} value={index + 1}>
                    {month}
                  </option>
                ))}
              </select>
            </label>

            <label className={FIELD_LABEL_CLASS}>
              Incorporation date
              <input
                type="date"
                value={prospect.incorporationDate ?? ''}
                onChange={(event) =>
                  onProspectChange({
                    incorporationDate: event.target.value
                      ? (event.target.value as QuoteProspect['incorporationDate'])
                      : undefined,
                  })
                }
                className={cn(FIELD_INPUT_CLASS, 'font-mono')}
              />
            </label>

            <label
              className={cn(
                FIELD_LABEL_CLASS,
                'flex items-start gap-2 rounded-lg border border-border bg-muted/20 px-3 py-2'
              )}
            >
              <input
                type="checkbox"
                checked={Boolean(prospect.payroll)}
                onChange={(event) => onProspectChange({ payroll: event.target.checked })}
                className="mt-0.5 h-3.5 w-3.5 rounded border-border accent-[#c4161c] focus-visible:ring-1 focus-visible:ring-[#c4161c]"
              />
              <span>
                Runs payroll
                <span className="mt-0.5 block font-normal text-[11px] text-muted-foreground">
                  PAYE, UIF and employer reconciliation
                </span>
              </span>
            </label>

            <label className={FIELD_LABEL_CLASS}>
              Employees
              <input
                type="number"
                min={0}
                step={1}
                value={prospect.employeeCount ?? 0}
                disabled={!prospect.payroll}
                onChange={(event) =>
                  onProspectChange({ employeeCount: Number(event.target.value) })
                }
                className={cn(FIELD_INPUT_CLASS, 'font-mono')}
              />
            </label>

            <label className={FIELD_LABEL_CLASS}>
              Responsible staff member
              <select
                value={prospect.staffId ?? ''}
                onChange={(event) =>
                  onProspectChange({ staffId: event.target.value || undefined })
                }
                className={FIELD_INPUT_CLASS}
              >
                <option value="">Practice pool</option>
                {staff.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name} · {member.role}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>
      )}
    </div>
  );
}

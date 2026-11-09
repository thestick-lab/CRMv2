import * as React from 'react';
import { Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CardHeaderWithLink } from '@/components/ui/list-primitives';
import { cn } from '@/lib/utils';

export type ContactChannel = 'email' | 'phone' | 'location' | 'timezone';

export interface ContactChannelValues {
  email?: string;
  phone?: string;
  location?: string;
  timezone?: string;
}

export interface ContactDetailsPanelProps {
  channels: ContactChannelValues;
  editing: ContactChannel | null;
  onEditingChange: (channel: ContactChannel | null) => void;
  onSave: (channel: ContactChannel, value: string) => void;
  /** Statutory context shown below the channels. */
  details: {
    partnerLabel: string;
    yearEndLabel: string;
    vatLabel: string;
    turnoverLabel: string;
  };
}

const CHANNEL_ROWS: Array<{ id: ContactChannel; label: string; placeholder: string }> = [
  { id: 'email', label: 'Email', placeholder: 'accounts@client.co.za' },
  { id: 'phone', label: 'Phone', placeholder: '+27 21 000 0000' },
  { id: 'location', label: 'Location', placeholder: 'Cape Town, Western Cape' },
  { id: 'timezone', label: 'Timezone', placeholder: 'SAST (UTC+2)' },
];

export function ContactDetailsPanel({
  channels,
  editing,
  onEditingChange,
  onSave,
  details,
}: ContactDetailsPanelProps) {
  const [draft, setDraft] = React.useState('');

  React.useEffect(() => {
    if (editing) {
      setDraft(channels[editing] ?? '');
    }
  }, [editing, channels]);

  const commit = (channel: ContactChannel) => {
    onSave(channel, draft.trim());
    onEditingChange(null);
  };

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card">
      <CardHeaderWithLink title="Contact details" />

      <dl className="divide-y divide-border/60 text-xs">
        {CHANNEL_ROWS.map((row) => {
          const value = channels[row.id];
          const isEditing = editing === row.id;

          return (
            <div key={row.id} className="px-4 py-2.5">
              <div className="flex items-center justify-between gap-3">
                <dt className="shrink-0 text-muted-foreground">{row.label}</dt>
                {isEditing ? (
                  <div className="flex w-full max-w-[220px] items-center gap-1">
                    <input
                      autoFocus
                      type="text"
                      value={draft}
                      placeholder={row.placeholder}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commit(row.id);
                        if (e.key === 'Escape') onEditingChange(null);
                      }}
                      aria-label={`Add ${row.label}`}
                      className="h-7 min-w-0 flex-1 rounded-md border border-border bg-background px-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[#c4161c]"
                    />
                    <Button size="sm" className="h-7 px-2 text-[11px]" onClick={() => commit(row.id)}>
                      Save
                    </Button>
                  </div>
                ) : (
                  <dd className="flex items-center gap-2 truncate text-right">
                    <span
                      className={cn(
                        'truncate',
                        value ? 'text-foreground' : 'font-mono text-muted-foreground'
                      )}
                      title={value || undefined}
                    >
                      {value || '—'}
                    </span>
                    <button
                      type="button"
                      onClick={() => onEditingChange(row.id)}
                      aria-label={`${value ? 'Edit' : 'Add'} ${row.label}`}
                      className="shrink-0 rounded p-0.5 text-muted-foreground outline-none transition-colors hover:text-[#c4161c] focus-visible:ring-1 focus-visible:ring-[#c4161c]"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                  </dd>
                )}
              </div>
            </div>
          );
        })}

        <div className="px-4 py-2.5">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted-foreground">Responsible partner</dt>
            <dd className="truncate text-right text-foreground">{details.partnerLabel}</dd>
          </div>
        </div>
        <div className="px-4 py-2.5">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted-foreground">Financial year end</dt>
            <dd className="text-right font-mono text-foreground">{details.yearEndLabel}</dd>
          </div>
        </div>
        <div className="px-4 py-2.5">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted-foreground">VAT registration</dt>
            <dd className="truncate text-right text-foreground">{details.vatLabel}</dd>
          </div>
        </div>
        <div className="px-4 py-2.5">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted-foreground">Annual turnover</dt>
            <dd className="truncate text-right font-mono text-foreground">{details.turnoverLabel}</dd>
          </div>
        </div>
      </dl>
    </section>
  );
}

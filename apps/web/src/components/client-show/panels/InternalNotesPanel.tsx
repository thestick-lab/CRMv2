import * as React from 'react';
import { Button } from '@/components/ui/button';
import { CardHeaderWithLink } from '@/components/ui/list-primitives';
import { Lock } from 'lucide-react';

export interface InternalNotesPanelProps {
  notes?: string;
  onSave: (notes: string | undefined) => void;
  /** The Notes tab opens straight into the editor. */
  defaultEditing?: boolean;
  /** `Clients — create/edit` not granted: notes render without an editor. */
  readOnly?: boolean;
}

export function InternalNotesPanel({
  notes,
  onSave,
  defaultEditing = false,
  readOnly = false,
}: InternalNotesPanelProps) {
  const [editing, setEditing] = React.useState(defaultEditing);
  const [draft, setDraft] = React.useState(notes ?? '');

  React.useEffect(() => {
    setDraft(notes ?? '');
  }, [notes]);

  const commit = () => {
    if (readOnly) return;
    const value = draft.trim();
    onSave(value ? value : undefined);
    setEditing(false);
  };

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card">
      <CardHeaderWithLink
        title="Internal notes"
        linkLabel={!readOnly && !editing ? (notes ? 'Edit' : 'Add note') : undefined}
        onLink={() => setEditing(true)}
      />

      <div className="px-4 py-3">
        {editing && !readOnly ? (
          <div className="space-y-2">
            <textarea
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={4}
              placeholder="Notes for the practice team — never shared with the client."
              className="w-full resize-y rounded-lg border border-border bg-background px-2.5 py-2 text-xs leading-relaxed text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[#c4161c]"
            />
            <div className="flex items-center gap-1.5">
              <Button size="sm" className="h-7 px-2 text-[11px]" onClick={commit}>
                Save note
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-[11px]"
                onClick={() => {
                  setDraft(notes ?? '');
                  setEditing(false);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : notes ? (
          <div className="rounded-lg border border-amber-500/25 bg-amber-500/[0.07] px-3 py-2.5">
            <p className="mb-1 flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.14em] text-amber-700 dark:text-amber-400">
              <Lock className="h-2.5 w-2.5" aria-hidden="true" /> Internal
            </p>
            <p className="whitespace-pre-line text-xs leading-relaxed text-foreground">{notes}</p>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">— No internal notes yet.</p>
        )}
      </div>
    </section>
  );
}

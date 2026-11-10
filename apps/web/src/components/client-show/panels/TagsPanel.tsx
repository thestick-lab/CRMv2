import { CardHeaderWithLink } from '@/components/ui/list-primitives';

export interface TagsPanelProps {
  tags: string[];
  onManage?: () => void;
}

export function TagsPanel({ tags, onManage }: TagsPanelProps) {
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card">
      <CardHeaderWithLink
        title="Tags"
        linkLabel={onManage ? 'Manage' : undefined}
        onLink={onManage}
      />

      <div className="flex flex-wrap items-center gap-1.5 px-4 py-3">
        {tags.length === 0 ? (
          <span className="text-xs text-muted-foreground">— No tags</span>
        ) : (
          tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-border bg-muted/50 px-2 py-0.5 font-mono text-[11px] leading-none text-muted-foreground"
            >
              {tag}
            </span>
          ))
        )}
      </div>
    </section>
  );
}

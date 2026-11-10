import * as React from 'react';
import { ArrowLeftRight, MoreHorizontal, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

/* ---------------------------------------------------------------------------
 * Shared kanban board (Sales Pipeline + Deadlines).
 *
 * Drag, the hover `…` menu and the keyboard all funnel through the same
 * `onMove(cardId, toColumn)` callback, so the consuming board applies its
 * transition rules in exactly one place. Cards are never copied: whatever the
 * consumer derives from a card (e.g. a `Blocked:` banner) travels with it into
 * every lane.
 * ------------------------------------------------------------------------- */

export type KanbanTone = 'neutral' | 'progress' | 'waiting' | 'warning' | 'ready' | 'done' | 'danger';

const TONE_DOT: Record<KanbanTone, string> = {
  neutral: 'bg-muted-foreground/40',
  progress: 'bg-[#c4161c]',
  waiting: 'bg-amber-500',
  warning: 'bg-amber-500',
  ready: 'bg-foreground/60',
  done: 'bg-foreground',
  danger: 'bg-destructive',
};

export interface KanbanCardBase {
  id: string;
}

export interface KanbanColumn<T extends KanbanCardBase> {
  id: string;
  title: string;
  cards: T[];
  tone?: KanbanTone;
  /** Short line under the header, e.g. a lane hint or total. */
  hint?: string;
}

export interface KanbanBoardProps<T extends KanbanCardBase> {
  columns: KanbanColumn<T>[];
  onMove: (cardId: string, toColumn: string) => void;
  onOpenCard: (card: T) => void;
  renderCard: (card: T, state: { columnId: string }) => React.ReactNode;
  keyboardEnabled: boolean;
  allowAdd?: (columnId: string) => void;
}

const LANE_KEYS = '123456789';

export function KanbanBoard<T extends KanbanCardBase>({
  columns,
  onMove,
  onOpenCard,
  renderCard,
  keyboardEnabled,
  allowAdd,
}: KanbanBoardProps<T>) {
  const boardRef = React.useRef<HTMLDivElement>(null);
  const [focusedCardId, setFocusedCardId] = React.useState<string | null>(null);
  const [pendingFocusId, setPendingFocusId] = React.useState<string | null>(null);
  const [draggingCardId, setDraggingCardId] = React.useState<string | null>(null);
  const [dropColumnId, setDropColumnId] = React.useState<string | null>(null);
  const [menuCardId, setMenuCardId] = React.useState<string | null>(null);
  const [orderOverrides, setOrderOverrides] = React.useState<Record<string, string[]>>({});

  const orderedCards = React.useCallback(
    (column: KanbanColumn<T>): T[] => {
      const override = orderOverrides[column.id];
      if (!override) return column.cards;
      const byId = new Map(column.cards.map((card) => [card.id, card]));
      const ordered: T[] = [];
      for (const id of override) {
        const card = byId.get(id);
        if (card) {
          ordered.push(card);
          byId.delete(id);
        }
      }
      for (const card of column.cards) {
        if (byId.has(card.id)) ordered.push(card);
      }
      return ordered;
    },
    [orderOverrides]
  );

  const findCard = React.useCallback(
    (cardId: string): { card: T; column: KanbanColumn<T> } | null => {
      for (const column of columns) {
        const card = column.cards.find((c) => c.id === cardId);
        if (card) return { card, column };
      }
      return null;
    },
    [columns]
  );

  // Focus follows the card across lanes so repeated keys keep working.
  React.useEffect(() => {
    if (!pendingFocusId || !boardRef.current) return;
    const element = boardRef.current.querySelector<HTMLElement>(
      `[data-kanban-card="${pendingFocusId}"]`
    );
    element?.focus();
    setPendingFocusId(null);
  }, [pendingFocusId, columns]);

  const moveCard = React.useCallback(
    (cardId: string, toColumn: string) => {
      setMenuCardId(null);
      setOrderOverrides((prev) => {
        const next: Record<string, string[]> = {};
        for (const [columnId, ids] of Object.entries(prev)) {
          next[columnId] = ids.filter((id) => id !== cardId);
        }
        return next;
      });
      setPendingFocusId(cardId);
      onMove(cardId, toColumn);
    },
    [onMove]
  );

  const reorderCard = React.useCallback(
    (column: KanbanColumn<T>, cardId: string, delta: number) => {
      const ids = orderedCards(column).map((card) => card.id);
      const from = ids.indexOf(cardId);
      const to = from + delta;
      if (from === -1 || to < 0 || to >= ids.length) return;
      [ids[from], ids[to]] = [ids[to], ids[from]];
      setOrderOverrides((prev) => ({ ...prev, [column.id]: ids }));
      setPendingFocusId(cardId);
    },
    [orderedCards]
  );

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest('input, textarea, select, [contenteditable="true"]')) return;
    if (!focusedCardId) return;

    const located = findCard(focusedCardId);
    if (!located) return;
    const { card, column } = located;
    const columnIndex = columns.findIndex((c) => c.id === column.id);

    if (event.key === 'Escape') {
      setMenuCardId(null);
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onOpenCard(card);
      return;
    }

    const key = event.key;
    const isMoveKey =
      key === 'ArrowLeft' ||
      key === 'ArrowRight' ||
      key === 'ArrowUp' ||
      key === 'ArrowDown' ||
      (key.length === 1 && LANE_KEYS.includes(key));

    if (!isMoveKey || !keyboardEnabled) return;
    event.preventDefault();

    if (key === 'ArrowLeft' || key === 'ArrowRight') {
      const nextIndex = columnIndex + (key === 'ArrowRight' ? 1 : -1);
      if (nextIndex < 0 || nextIndex >= columns.length) return;
      moveCard(card.id, columns[nextIndex].id);
      return;
    }

    if (key === 'ArrowUp' || key === 'ArrowDown') {
      reorderCard(column, card.id, key === 'ArrowDown' ? 1 : -1);
      return;
    }

    const jumpIndex = LANE_KEYS.indexOf(key);
    if (jumpIndex >= 0 && jumpIndex < columns.length) {
      moveCard(card.id, columns[jumpIndex].id);
    }
  };

  return (
    <div className="space-y-2.5">
      <div
        ref={boardRef}
        role="group"
        aria-label="Task board. Arrow keys move the focused card between and within lanes; number keys jump lanes."
        onKeyDown={handleKeyDown}
        className="flex items-start gap-3 overflow-x-auto pb-2"
      >
        {columns.map((column) => {
          const tone = column.tone ?? 'neutral';
          const cards = orderedCards(column);
          const isDropTarget = dropColumnId === column.id;

          return (
            <section
              key={column.id}
              aria-label={`${column.title} (${cards.length})`}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = 'move';
                if (dropColumnId !== column.id) setDropColumnId(column.id);
              }}
              onDragLeave={(event) => {
                if (event.currentTarget.contains(event.relatedTarget as Node)) return;
                setDropColumnId(null);
              }}
              onDrop={(event) => {
                event.preventDefault();
                setDropColumnId(null);
                const cardId =
                  draggingCardId || event.dataTransfer.getData('text/plain');
                setDraggingCardId(null);
                if (cardId) moveCard(cardId, column.id);
              }}
              className={cn(
                'flex w-[248px] min-w-[228px] flex-1 shrink-0 flex-col rounded-xl border border-border bg-muted/20 transition-colors',
                isDropTarget && 'border-[#c4161c]/50 bg-[#c4161c]/5'
              )}
            >
              <header className="flex items-center gap-2 border-b border-border px-3 py-2.5">
                <span className={cn('h-2 w-2 shrink-0 rounded-full', TONE_DOT[tone])} aria-hidden="true" />
                <h3 className="min-w-0 flex-1 truncate text-xs font-semibold tracking-tight text-foreground">
                  {column.title}
                </h3>
                <span className="rounded-md border border-border bg-card px-1.5 py-0.5 font-mono text-[11px] leading-none text-muted-foreground">
                  {cards.length}
                </span>
                {allowAdd && (
                  <button
                    type="button"
                    onClick={() => allowAdd(column.id)}
                    className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-card hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#c4161c]"
                    aria-label={`Add a task to ${column.title}`}
                  >
                    <Plus className="h-3 w-3" />
                    Add
                  </button>
                )}
              </header>

              {column.hint && (
                <p className="border-b border-border/60 px-3 py-1.5 text-[11px] leading-relaxed text-muted-foreground">
                  {column.hint}
                </p>
              )}

              <div className="flex max-h-[calc(100vh-260px)] min-h-[96px] flex-col gap-2 overflow-y-auto p-2.5">
                {cards.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-[11px] leading-relaxed text-muted-foreground">
                    No cards in this lane
                  </p>
                ) : (
                  cards.map((card) => (
                    <div
                      key={card.id}
                      data-kanban-card={card.id}
                      draggable
                      tabIndex={0}
                      // A group, not a button: the card contains the move-menu
                      // button, and interactive elements must never nest.
                      role="group"
                      onDragStart={(event) => {
                        event.dataTransfer.setData('text/plain', card.id);
                        event.dataTransfer.effectAllowed = 'move';
                        setDraggingCardId(card.id);
                      }}
                      onDragEnd={() => {
                        setDraggingCardId(null);
                        setDropColumnId(null);
                      }}
                      onFocus={() => setFocusedCardId(card.id)}
                      onBlur={(event) => {
                        // Focus moving to the card's own move-menu button is
                        // still this card's turn: clearing it here would kill
                        // the arrow-key moves mid-gesture.
                        if (event.currentTarget.contains(event.relatedTarget as Node)) return;
                        setFocusedCardId((current) => (current === card.id ? null : current));
                        setMenuCardId(null);
                      }}
                      onClick={() => onOpenCard(card)}
                      onDoubleClick={() => onOpenCard(card)}
                      className={cn(
                        'group relative rounded-lg border border-border bg-card p-2.5 text-left transition-colors',
                        'cursor-grab hover:border-[#c4161c]/40 active:cursor-grabbing',
                        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#c4161c]',
                        draggingCardId === card.id && 'opacity-60'
                      )}
                      aria-label="Card. Press Enter to open details."
                    >
                      {renderCard(card, { columnId: column.id })}

                      <button
                        type="button"
                        aria-label="Move card to another lane"
                        aria-haspopup="menu"
                        aria-expanded={menuCardId === card.id}
                        onClick={(event) => {
                          event.stopPropagation();
                          setMenuCardId(menuCardId === card.id ? null : card.id);
                        }}
                        className={cn(
                          'absolute right-1.5 top-1.5 rounded-md p-1 text-muted-foreground opacity-0 transition-opacity',
                          'hover:bg-muted hover:text-foreground focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#c4161c]',
                          'group-hover:opacity-100 group-focus-within:opacity-100'
                        )}
                      >
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </button>

                      {menuCardId === card.id && (
                        <div
                          role="menu"
                          aria-label="Move card to"
                          onClick={(event) => event.stopPropagation()}
                          className="absolute right-1.5 top-7 z-20 w-52 overflow-hidden rounded-lg border border-border bg-card p-1 shadow-lg"
                        >
                          <p className="px-2 py-1 font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                            Move to
                          </p>
                          {columns
                            .filter((target) => target.id !== column.id)
                            .map((target) => (
                              <button
                                key={target.id}
                                type="button"
                                role="menuitem"
                                onClick={() => moveCard(card.id, target.id)}
                                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[11px] text-foreground transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
                              >
                                <span
                                  className={cn(
                                    'h-1.5 w-1.5 shrink-0 rounded-full',
                                    TONE_DOT[target.tone ?? 'neutral']
                                  )}
                                  aria-hidden="true"
                                />
                                {target.title}
                              </button>
                            ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </section>
          );
        })}
      </div>

      <p className="flex items-center gap-1.5 px-1 text-[11px] text-muted-foreground">
        <ArrowLeftRight className="h-3 w-3" aria-hidden="true" />
        <span>
          Focus a card, then <kbd className="rounded border border-border px-1 font-mono">←</kbd>{' '}
          <kbd className="rounded border border-border px-1 font-mono">→</kbd> to move lanes,{' '}
          <kbd className="rounded border border-border px-1 font-mono">↑</kbd>{' '}
          <kbd className="rounded border border-border px-1 font-mono">↓</kbd> to reorder,{' '}
          <kbd className="rounded border border-border px-1 font-mono">1</kbd>–
          <kbd className="rounded border border-border px-1 font-mono">{columns.length}</kbd> to
          jump, <kbd className="rounded border border-border px-1 font-mono">Enter</kbd> to open.
        </span>
      </p>
    </div>
  );
}

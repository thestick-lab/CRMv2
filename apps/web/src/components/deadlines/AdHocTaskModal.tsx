import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { ListPlus, X } from 'lucide-react';
import { usePracticeStore, type AdHocTask } from '@/context/PracticeStoreContext';
import { WORKFLOW_STATUSES, type WorkflowStatus } from '@/lib/workflow';
import { Button } from '@/components/ui/button';
import { can, scopeToAssigned } from '@/lib/permissions';
import { personInitials } from '@/lib/initials';
import { adHocTaskIsValid, createAdHocTask, type AdHocTaskDraft } from './ad-hoc';

export interface AdHocTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When provided the modal edits that task; otherwise it creates a new one. */
  task?: AdHocTask | null;
  /** Lane the `+ Add` action was pressed in. */
  initialStatus?: WorkflowStatus;
}

export function AdHocTaskModal({ open, onOpenChange, task, initialStatus }: AdHocTaskModalProps) {
  const { clients, staff, currentUser, permissions, addAdhocTask, updateAdhocTask, deleteAdhocTask, logActivity } =
    usePracticeStore();

  // A Limited (assigned) role that somehow opens the modal sees only its own
  // clients and itself as assignee — never the practice registers.
  const canManageAllWork = can(
    currentUser.role,
    'Deadlines',
    'update-status',
    permissions.matrix
  );
  const clientOptions = React.useMemo(
    () => (canManageAllWork ? clients : scopeToAssigned(clients, currentUser.id)),
    [clients, canManageAllWork, currentUser.id]
  );
  const assigneeOptions = React.useMemo(
    () =>
      canManageAllWork ? staff : staff.filter((member) => member.id === currentUser.id),
    [staff, canManageAllWork, currentUser.id]
  );

  const [draft, setDraft] = React.useState<AdHocTaskDraft & { status: WorkflowStatus }>({
    clientCode: '',
    description: '',
    assigneeId: '',
    dueDate: '',
    status: initialStatus ?? 'Not Started',
  });
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setConfirmDelete(false);
    if (task) {
      setDraft({
        clientCode: task.clientCode,
        description: task.description,
        assigneeId: task.assigneeId,
        dueDate: task.dueDate ?? '',
        status: task.status,
      });
    } else {
      setDraft({
        clientCode: '',
        description: '',
        assigneeId: assigneeOptions[0]?.id ?? currentUser.id,
        dueDate: '',
        // Ad-hoc work never enters the statutory partner gate.
        status:
          initialStatus && initialStatus !== 'Partner Review Gate'
            ? initialStatus
            : 'Not Started',
      });
    }
  }, [open, task, initialStatus, assigneeOptions, currentUser.id]);

  const valid = adHocTaskIsValid(draft);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!valid) return;
    // Defensive: the picker is scoped, so an out-of-scope code can only arrive
    // through tampering — refuse it instead of writing the task.
    if (!clientOptions.some((candidate) => candidate.code === draft.clientCode)) return;

    const client = clients.find((c) => c.code === draft.clientCode);
    const subline = client ? `${client.code} · ${client.name}` : draft.clientCode;

    if (task) {
      updateAdhocTask(task.id, {
        clientCode: draft.clientCode,
        description: draft.description.trim(),
        assigneeId: draft.assigneeId,
        dueDate: draft.dueDate || undefined,
        status: draft.status,
      });
      logActivity({
        type: 'task',
        actorName: currentUser.name,
        actorInitials: personInitials(currentUser.name),
        tint: 'muted',
        text: `Updated ad-hoc task “${draft.description.trim()}”`,
        subline,
      });
    } else {
      const created = createAdHocTask(draft);
      addAdhocTask({ ...created, status: draft.status });
      logActivity({
        type: 'task',
        actorName: currentUser.name,
        actorInitials: personInitials(currentUser.name),
        tint: 'crimson',
        text: `Added ad-hoc task “${created.description}”`,
        subline,
      });
    }
    onOpenChange(false);
  };

  const handleDelete = () => {
    if (!task) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    const client = clients.find((c) => c.code === task.clientCode);
    deleteAdhocTask(task.id);
    logActivity({
      type: 'task',
      actorName: currentUser.name,
      actorInitials: personInitials(currentUser.name),
      tint: 'muted',
      text: `Deleted ad-hoc task “${task.description}”`,
      subline: client ? `${client.code} · ${client.name}` : task.clientCode,
    });
    onOpenChange(false);
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 animate-in fade-in-0 bg-black/60 backdrop-blur-xs" />
        <DialogPrimitive.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 animate-in fade-in-0 zoom-in-95 space-y-4 rounded-xl border border-border bg-card p-5 shadow-2xl">
          <div className="flex items-start justify-between border-b border-border pb-3">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                Manual task
              </p>
              <DialogPrimitive.Title className="mt-0.5 flex items-center gap-2 text-base font-semibold text-foreground">
                <ListPlus className="h-4 w-4 text-[#c4161c]" />
                {task ? 'Edit ad-hoc task' : 'New ad-hoc task'}
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Practice work that is not a statutory filing. It moves through the same lanes,
                without a partner-review gate.
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close asChild>
              <button
                type="button"
                aria-label="Close"
                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </DialogPrimitive.Close>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3 text-xs">
            <div>
              <label htmlFor="adhoc-client" className="mb-1 block font-medium text-foreground">
                Client
              </label>
              <select
                id="adhoc-client"
                value={draft.clientCode}
                onChange={(event) => setDraft({ ...draft, clientCode: event.target.value })}
                className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-foreground"
              >
                <option value="">Select a client…</option>
                {clientOptions.map((client) => (
                  <option key={client.code} value={client.code}>
                    {client.code} — {client.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="adhoc-description" className="mb-1 block font-medium text-foreground">
                Description
              </label>
              <textarea
                id="adhoc-description"
                rows={2}
                value={draft.description}
                onChange={(event) => setDraft({ ...draft, description: event.target.value })}
                placeholder="e.g. Reconcile the October bank feed"
                className="w-full resize-none rounded-lg border border-border bg-background px-3 py-1.5 text-foreground"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="adhoc-assignee" className="mb-1 block font-medium text-foreground">
                  Assignee
                </label>
                <select
                  id="adhoc-assignee"
                  value={draft.assigneeId}
                  onChange={(event) => setDraft({ ...draft, assigneeId: event.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-foreground"
                >
                  {assigneeOptions.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="adhoc-due" className="mb-1 block font-medium text-foreground">
                  Due date
                </label>
                <input
                  id="adhoc-due"
                  type="date"
                  value={draft.dueDate ?? ''}
                  onChange={(event) => setDraft({ ...draft, dueDate: event.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-1.5 font-mono text-foreground"
                />
              </div>
            </div>

            <div>
              <label htmlFor="adhoc-status" className="mb-1 block font-medium text-foreground">
                Lane
              </label>
              <select
                id="adhoc-status"
                value={draft.status}
                onChange={(event) =>
                  setDraft({ ...draft, status: event.target.value as WorkflowStatus })
                }
                className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-foreground"
              >
                {WORKFLOW_STATUSES.filter((status) => status !== 'Partner Review Gate').map(
                  (status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  )
                )}
              </select>
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
              {task ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDelete}
                  className="text-xs text-destructive hover:text-destructive"
                >
                  {confirmDelete ? 'Confirm delete' : 'Delete task'}
                </Button>
              ) : (
                <span />
              )}
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={!valid}
                  className="bg-[#c4161c] text-white hover:bg-[#a51217] disabled:opacity-50"
                >
                  {task ? 'Save task' : 'Add task'}
                </Button>
              </div>
            </div>
          </form>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

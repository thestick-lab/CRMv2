import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { PracticeTaskItem } from './practice-tasks';
import { Badge } from '@/components/ui/badge';
import type { WorkflowStatus } from '@/lib/workflow';
import { StatutoryActionForm } from './StatutoryActionForm';

export interface StatutoryActionModalProps {
  task: PracticeTaskItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectClient?: (clientCode: string) => void;
  initialStatus?: WorkflowStatus;
}

/**
 * Dialog shell around the statutory action form, retained for entry points
 * that have no docked panel (e.g. the client record's Next Action card).
 */
export function StatutoryActionModal({
  task,
  open,
  onOpenChange,
  onSelectClient,
  initialStatus,
}: StatutoryActionModalProps) {
  if (!task) return null;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 animate-in fade-in-0 bg-black/60 backdrop-blur-xs" />
        <DialogPrimitive.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 animate-in fade-in-0 zoom-in-95 space-y-4 rounded-xl border border-border bg-card p-6 shadow-2xl">
          <div className="flex items-start justify-between border-b border-border pb-3">
            <div>
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="border-primary/30 bg-primary/5 font-mono text-xs text-primary"
                >
                  {task.service}
                </Badge>
                <DialogPrimitive.Title className="text-base font-semibold text-foreground">
                  Statutory filing action
                </DialogPrimitive.Title>
              </div>
              <DialogPrimitive.Description className="mt-1 flex flex-wrap items-center gap-2 font-mono text-[11px] text-muted-foreground">
                <span className="font-medium text-foreground">{task.clientCode}</span>
                <span>·</span>
                <span>{task.clientName}</span>
                <span>·</span>
                <span>Period {task.period}</span>
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

          <StatutoryActionForm
            task={task}
            initialStatus={initialStatus}
            onClose={() => onOpenChange(false)}
            onSelectClient={onSelectClient}
          />
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

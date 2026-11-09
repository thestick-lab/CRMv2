import type { AdHocTask } from '@/context/PracticeStoreContext';

/** Fields a practice user supplies when creating a manual board task. */
export interface AdHocTaskDraft {
  clientCode: string;
  description: string;
  assigneeId: string;
  dueDate?: string;
}

/**
 * Ad-hoc tasks are practice-created work items. They carry no statutory due
 * logic and never receive a partner-review gate.
 */
export function createAdHocTask(draft: AdHocTaskDraft, now: Date = new Date()): AdHocTask {
  return {
    id: `adhoc-${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
    clientCode: draft.clientCode,
    description: draft.description.trim(),
    assigneeId: draft.assigneeId,
    dueDate: draft.dueDate || undefined,
    status: 'Not Started',
    createdAt: now.toISOString(),
  };
}

export function adHocTaskIsValid(draft: AdHocTaskDraft): boolean {
  return Boolean(draft.clientCode && draft.assigneeId && draft.description.trim());
}

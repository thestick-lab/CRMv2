import type { ActivityEvent } from '@/context/PracticeStoreContext';
import type { PracticeTaskItem } from '@/components/deadlines/practice-tasks';
import { personInitials } from './initials';

type SubmissionTask = Pick<
  PracticeTaskItem,
  'id' | 'service' | 'period' | 'clientCode' | 'clientName'
>;

/**
 * The one shape a statutory submission takes in the activity feed.
 *
 * Every statutory submit site (the action form, the Home quick checkbox) uses
 * this so the governance trail derives the same subject, client and task id —
 * and dedupe can fold the event into a signed override.
 */
export function submissionActivity(
  task: SubmissionTask,
  actorName: string
): Omit<ActivityEvent, 'id' | 'at'> {
  return {
    type: 'submission',
    actorName,
    actorInitials: personInitials(actorName),
    tint: 'crimson',
    text: `Submitted ${task.service} · ${task.period}`,
    subline: `${task.clientCode} · ${task.clientName}`,
    taskId: task.id,
  };
}

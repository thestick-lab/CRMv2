import * as React from 'react';
import { Bell, Mail } from 'lucide-react';
import { usePracticeStore } from '@/context/PracticeStoreContext';
import { cn } from '@/lib/utils';

interface NotificationTopic {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
}

const DEFAULT_TOPICS: NotificationTopic[] = [
  {
    id: 'partner-review',
    label: 'Partner review requested',
    description: 'A return has entered the partner review gate and needs a CA(SA) sign-off.',
    enabled: true,
  },
  {
    id: 'deadline-approach',
    label: 'Statutory deadline approaching',
    description: 'Seven days before a filing due date, including rolled-back public-holiday dates.',
    enabled: true,
  },
  {
    id: 'client-information',
    label: 'Client information outstanding',
    description: 'A task has moved to Awaiting Client and the practice is waiting on documents.',
    enabled: true,
  },
  {
    id: 'weekly-summary',
    label: 'Weekly practice summary',
    description: 'Monday digest of open tasks, submissions lodged and quotes awaiting a decision.',
    enabled: false,
  },
];

export function NotificationsPane() {
  const { currentUser } = usePracticeStore();
  const [topics, setTopics] = React.useState(DEFAULT_TOPICS);

  const toggle = (id: string) => {
    setTopics((current) =>
      current.map((topic) => (topic.id === id ? { ...topic, enabled: !topic.enabled } : topic))
    );
  };

  return (
    <div className="space-y-6 max-w-3xl text-xs">
      <div>
        <h2 className="text-base font-semibold text-foreground">Notifications</h2>
        <p className="text-muted-foreground mt-0.5">
          Choose which practice events are worth interrupting you for.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-3">
          <div className="flex items-center gap-2">
            <Mail className="h-3.5 w-3.5 text-[#c4161c]" />
            <span className="font-medium text-foreground">Delivery address</span>
          </div>
          <span className="font-mono text-[11px] text-muted-foreground">{currentUser.email}</span>
        </div>

        <ul className="divide-y divide-border/60">
          {topics.map((topic) => (
            <li key={topic.id} className="flex items-start justify-between gap-4 px-4 py-3">
              <div className="min-w-0">
                <p className="font-medium text-foreground">{topic.label}</p>
                <p className="mt-0.5 leading-relaxed text-muted-foreground">{topic.description}</p>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={topic.enabled}
                aria-label={topic.label}
                onClick={() => toggle(topic.id)}
                className={cn(
                  'mt-0.5 flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  topic.enabled
                    ? 'border-primary bg-primary'
                    : 'border-border bg-muted'
                )}
              >
                <span
                  className={cn(
                    'h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform',
                    topic.enabled ? 'translate-x-[18px]' : 'translate-x-[2px]'
                  )}
                />
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex items-start gap-2.5 rounded-xl border border-border bg-muted/20 p-3.5">
        <Bell className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <p className="leading-relaxed text-muted-foreground">
          Email delivery is not connected in this build, so these choices apply to this browser
          session only and are not written to practice storage yet.
        </p>
      </div>
    </div>
  );
}

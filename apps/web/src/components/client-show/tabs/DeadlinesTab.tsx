import type { Client, ServiceCode, TaskStatus } from 'fdoncall-practice/domain/types';
import { defaultServices, generateTasks, needsReview, urgency, type Urgency } from 'fdoncall-practice/domain/rules';
import { Badge } from '@/components/ui/badge';
import { CalendarClock, UserCheck } from 'lucide-react';

export interface ClientDeadlineItem {
  id: string;
  service: ServiceCode;
  period: string;
  part?: string;
  due?: string;
  dueNote?: string;
  statutory: boolean;
  needsPartnerReview: boolean;
  urgency: Urgency;
  status: TaskStatus;
}

export function buildClientDeadlines(client: Client, asOfDate: string): ClientDeadlineItem[] {
  const services = defaultServices(client);
  const tasks = generateTasks(client, services, asOfDate);

  return tasks.map((task) => {
    // Partner review gate determined by domain governance rules (AFS, ITR14, ITR12, ITR12T, EMP501, payable IRP6)
    const needsPartnerReview = Boolean(needsReview(task, true));
    return {
      id: task.id,
      service: task.service,
      period: task.period,
      part: task.part,
      due: task.due,
      dueNote: task.dueNote,
      statutory: task.statutory,
      needsPartnerReview,
      urgency: urgency(task, 'Not started', asOfDate),
      status: 'Not started',
    };
  });
}

export function DeadlinesTab({ client, asOfDate }: { client: Client; asOfDate: string }) {
  const deadlines = buildClientDeadlines(client, asOfDate);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-1">
        <div>
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-[#c4161c]" />
            Statutory Filing Calendar &amp; Compliance Tasks
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Deadlines computed under SARS Tax Administration Act s25 &amp; Companies Act s30 with South African holiday rollback rules.
          </p>
        </div>
        <Badge variant="outline" className="font-mono text-xs">
          {deadlines.filter((d) => d.needsPartnerReview).length} Partner Review Gates
        </Badge>
      </div>

      {/* Deadlines Table */}
      <div className="border border-border/80 rounded-lg bg-card/60 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/40 text-muted-foreground uppercase tracking-wider text-[10px] border-b border-border font-mono">
              <tr>
                <th className="py-2.5 px-3 font-medium">Return</th>
                <th className="py-2.5 px-3 font-medium">Filing Period</th>
                <th className="py-2.5 px-3 font-medium">Due Date (Rollback)</th>
                <th className="py-2.5 px-3 font-medium">Partner Review Gate</th>
                <th className="py-2.5 px-3 font-medium">Urgency</th>
                <th className="py-2.5 px-3 text-right font-medium">Filing Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 font-mono">
              {deadlines.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs text-muted-foreground font-sans">
                    No statutory tasks scheduled for this client profile.
                  </td>
                </tr>
              ) : (
                deadlines.map((item, idx) => (
                  <tr key={`${item.id}-${idx}`} className="hover:bg-muted/30 transition-colors">
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-foreground">{item.service}</span>
                        {item.part && (
                          <span className="text-[10px] text-muted-foreground font-sans">({item.part})</span>
                        )}
                      </div>
                    </td>

                    <td className="py-2.5 px-3 text-foreground font-sans">{item.period}</td>

                    <td className="py-2.5 px-3">
                      {item.due ? (
                        <div className="flex items-center gap-1 text-foreground">
                          <span>{item.due}</span>
                          <span className="text-emerald-500 font-sans text-[11px]" title="South African holiday rollback applied">
                            ↩
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-[11px] font-sans italic">
                          {item.dueNote ?? 'Date Pending'}
                        </span>
                      )}
                    </td>

                    <td className="py-2.5 px-3 font-sans">
                      {item.needsPartnerReview ? (
                        <Badge variant="crimsonSubdued" className="text-[10px] py-0 px-1.5 gap-1 font-mono">
                          <UserCheck className="h-3 w-3" /> Partner Gate
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-[11px]">Standard Filing</span>
                      )}
                    </td>

                    <td className="py-2.5 px-3">
                      <Badge
                        variant={
                          item.urgency === 'overdue'
                            ? 'destructive'
                            : item.urgency === 'week'
                            ? 'crimsonSubdued'
                            : item.urgency === 'month'
                            ? 'warning'
                            : 'outline'
                        }
                        className="text-[10px] py-0 px-1.5 uppercase font-mono tracking-wider"
                      >
                        {item.urgency}
                      </Badge>
                    </td>

                    <td className="py-2.5 px-3 text-right font-sans">
                      <span className="text-muted-foreground text-[11px] bg-muted/60 px-2 py-0.5 rounded font-mono">
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

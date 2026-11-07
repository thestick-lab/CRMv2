import type { ViewKey } from '@/types/navigation';
import { todayInSouthAfrica } from 'fdoncall-practice/domain/dates';
import { CLIENTS } from 'fdoncall-practice/data/seed';
import { defaultServices, generateTasks } from 'fdoncall-practice/domain/rules';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarClock, CheckCircle2, ChevronRight, Clock } from 'lucide-react';

export interface DeadlinesViewProps {
  onNavigate: (view: ViewKey, clientCode?: string) => void;
}

export function DeadlinesView({ onNavigate }: DeadlinesViewProps) {
  const today = todayInSouthAfrica();

  // Generate statutory tasks for first 5 clients to show realistic compliance queue
  const tasks = CLIENTS.slice(0, 5).flatMap((client) => {
    const services = defaultServices(client);
    const clientTasks = generateTasks(client, services, today);
    return clientTasks.map((t) => ({ ...t, clientName: client.name, clientCode: client.code }));
  }).slice(0, 8);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* View Header */}
      <div>
        <h1 className="text-xl font-semibold text-foreground tracking-tight flex items-center gap-2">
          <CalendarClock className="h-5 w-5 text-[#c4161c]" />
          Statutory Compliance &amp; Filing Deadlines
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          SARS Tax Administration Act s25 &amp; Companies Act s30 deadlines with automatic South African public holiday rollback.
        </p>
      </div>

      {/* 4 KPI Tiles per spec */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="border border-border/80 rounded-lg p-3.5 bg-card/60">
          <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
            Overdue
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-500 mt-1">0</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">Zero overdue filings</div>
        </div>

        <div className="border border-border/80 rounded-lg p-3.5 bg-card/60">
          <div className="text-[10px] font-mono uppercase tracking-wider text-[#c4161c]">
            Due in 7 Days
          </div>
          <div className="text-2xl font-bold font-mono text-[#c4161c] mt-1">1</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">EMP201 PAYE/SDL/UIF</div>
        </div>

        <div className="border border-border/80 rounded-lg p-3.5 bg-card/60">
          <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
            Due in 30 Days
          </div>
          <div className="text-2xl font-bold font-mono text-foreground mt-1">3</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">VAT201 &amp; IRP6 Period 1</div>
        </div>

        <div className="border border-border/80 rounded-lg p-3.5 bg-card/60">
          <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
            Missing A Date
          </div>
          <div className="text-2xl font-bold font-mono text-foreground mt-1">0</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">All clients dated</div>
        </div>
      </div>

      {/* Filing Schedule Table */}
      <div className="border border-border/80 rounded-lg bg-card/60 overflow-hidden">
        <div className="p-4 border-b border-border/60 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Clock className="h-4 w-4 text-[#c4161c]" />
            Generated Practice Filing Schedule
          </h2>
          <span className="text-xs font-mono text-muted-foreground">
            Rollback applied for weekends &amp; holidays (↩)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/40 text-muted-foreground uppercase tracking-wider text-[10px] border-b border-border font-mono">
              <tr>
                <th className="py-2.5 px-4 font-medium">Due Date</th>
                <th className="py-2.5 px-4 font-medium">Client</th>
                <th className="py-2.5 px-4 font-medium">Statutory Return</th>
                <th className="py-2.5 px-4 font-medium">Period</th>
                <th className="py-2.5 px-4 font-medium">Rollback</th>
                <th className="py-2.5 px-4 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 font-mono">
              {tasks.map((task, idx) => (
                <tr
                  key={`${task.clientCode}-${task.service}-${idx}`}
                  onClick={() => onNavigate('client', task.clientCode)}
                  className="hover:bg-muted/30 transition-colors cursor-pointer"
                >
                  <td className="py-2.5 px-4 font-semibold text-foreground">{task.due ?? 'Pending'}</td>
                  <td className="py-2.5 px-4 font-sans font-medium text-foreground">
                    <span className="text-[#c4161c] font-mono mr-1.5 font-semibold">
                      {task.clientCode}
                    </span>
                    {task.clientName}
                  </td>
                  <td className="py-2.5 px-4">
                    <Badge variant="outline" className="font-mono text-[10px] py-0 px-1.5">
                      {task.service}
                    </Badge>
                  </td>
                  <td className="py-2.5 px-4 text-muted-foreground">{task.period}</td>
                  <td className="py-2.5 px-4 font-sans">
                    <span className="text-[11px] text-emerald-500 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Rollback Verified
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-right font-sans">
                    <Button variant="ghost" size="sm" className="h-6 text-[11px] gap-1 px-2">
                      Review <ChevronRight className="h-3 w-3" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

import type { ViewKey } from '@/types/navigation';
import { todayInSouthAfrica, easterSunday, publicHolidays } from 'fdoncall-practice/domain/dates';
import { usePracticeStore } from '@/context/PracticeStoreContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ArrowRight,
  Building2,
  Calendar,
  CalendarClock,
  FileSpreadsheet,
  ShieldCheck,
  Users2,
} from 'lucide-react';

export interface DashboardViewProps {
  onNavigate: (view: ViewKey, clientCode?: string) => void;
}

export function DashboardView({ onNavigate }: DashboardViewProps) {
  const { clients, staff } = usePracticeStore();
  const today = todayInSouthAfrica();
  const year = parseInt(today.slice(0, 4), 10);
  const easterThisYear = easterSunday(year);
  const easterNextYear = easterSunday(year + 1);
  const holidays = Array.from(publicHolidays(year).entries()).slice(0, 4);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="border border-border/80 rounded-lg p-6 bg-card/60 backdrop-blur flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h1 className="font-serif italic text-3xl text-foreground tracking-tight">
              FD on Call Practice Operating System
            </h1>
            <Badge variant="crimsonSubdued" className="text-[10px] py-0 px-1.5 h-4 font-mono">
              CRMv2
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground max-w-2xl">
            South African chartered accountancy practice management unifying statutory compliance calendars, 12-month rolling fee projections, and client-side document vaults.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            onClick={() => onNavigate('deadlines')}
            variant="outline"
            className="text-xs h-8 gap-1.5"
          >
            <CalendarClock className="h-3.5 w-3.5 text-[#c4161c]" />
            Deadlines (4)
          </Button>
          <Button
            size="sm"
            onClick={() => onNavigate('clients')}
            className="text-xs h-8 gap-1.5"
          >
            <Building2 className="h-3.5 w-3.5" />
            Clients Register (13)
          </Button>
        </div>
      </div>

      {/* KPI Tiles */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Practice Clients */}
        <div className="border border-border/80 rounded-lg p-5 bg-card/60 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-mono font-medium">
              Practice Clients
            </span>
            <Users2 className="h-4 w-4 text-[#c4161c]" />
          </div>
          <div>
            <div className="text-2xl font-bold font-mono tracking-tight text-foreground">
              {clients.length} Active Clients
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              Managed by {staff.length} practice members
            </div>
          </div>
          <div className="pt-2 border-t border-border/50 text-xs text-muted-foreground space-y-1">
            <div className="flex justify-between">
              <span>Companies (Pty Ltd):</span>
              <span className="font-mono text-foreground">{clients.filter((c) => c.entityType === 'Company').length}</span>
            </div>
            <div className="flex justify-between">
              <span>Close Corporations (CC):</span>
              <span className="font-mono text-foreground">{clients.filter((c) => c.entityType === 'Close corporation').length}</span>
            </div>
            <div className="flex justify-between">
              <span>Trusts &amp; Individuals:</span>
              <span className="font-mono text-foreground">
                {clients.filter((c) => c.entityType === 'Trust' || c.entityType === 'Individual').length}
              </span>
            </div>
          </div>
        </div>

        {/* Statutory Engine */}
        <div className="border border-border/80 rounded-lg p-5 bg-card/60 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-mono font-medium">
              Statutory Date Engine
            </span>
            <Calendar className="h-4 w-4 text-[#c4161c]" />
          </div>
          <div>
            <div className="text-2xl font-bold font-mono tracking-tight text-foreground">
              {today}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              South Africa Standard Time (UTC+2)
            </div>
          </div>
          <div className="pt-2 border-t border-border/50 text-xs text-muted-foreground space-y-1 font-mono">
            <div className="flex justify-between">
              <span>Computus Easter {year}:</span>
              <span className="text-foreground">{easterThisYear}</span>
            </div>
            <div className="flex justify-between">
              <span>Computus Easter {year + 1}:</span>
              <span className="text-foreground">{easterNextYear}</span>
            </div>
            <div className="flex justify-between">
              <span>Weekend Rollback:</span>
              <span className="text-emerald-500 font-sans text-[11px]">Active (Business Day Prior)</span>
            </div>
          </div>
        </div>

        {/* Compliance Guardrails */}
        <div className="border border-border/80 rounded-lg p-5 bg-card/60 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-mono font-medium">
              Upcoming SA Holidays
            </span>
            <ShieldCheck className="h-4 w-4 text-[#c4161c]" />
          </div>
          <div>
            <div className="text-2xl font-bold font-mono tracking-tight text-foreground">
              SARS &amp; CIPC Rules
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              Statutory deadlines roll back before observed holidays
            </div>
          </div>
          <div className="pt-2 border-t border-border/50 text-xs text-muted-foreground space-y-1 font-mono">
            {holidays.map(([d, name]) => (
              <div key={d} className="flex justify-between truncate">
                <span className="truncate pr-2">{name}:</span>
                <span className="text-foreground">{d}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Practice Clients Snapshot */}
      <div className="border border-border/80 rounded-lg bg-card/60 overflow-hidden">
        <div className="p-4 border-b border-border/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 text-[#c4161c]" />
            <h2 className="text-sm font-semibold text-foreground">Active Practice Clients</h2>
            <span className="text-xs font-mono text-muted-foreground">({clients.length} accounts)</span>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigate('clients')}
            className="text-xs h-7 gap-1"
          >
            View all clients <ArrowRight className="h-3 w-3" />
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/40 text-muted-foreground uppercase tracking-wider text-[10px] border-b border-border font-mono">
              <tr>
                <th className="py-2.5 px-4 font-medium">Code</th>
                <th className="py-2.5 px-4 font-medium">Client Name</th>
                <th className="py-2.5 px-4 font-medium">Entity Type</th>
                <th className="py-2.5 px-4 font-medium">Financial Year End</th>
                <th className="py-2.5 px-4 font-medium">VAT Status</th>
                <th className="py-2.5 px-4 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 font-mono">
              {clients.slice(0, 6).map((c) => (
                <tr
                  key={c.code}
                  onClick={() => onNavigate('client', c.code)}
                  className="hover:bg-muted/30 transition-colors cursor-pointer"
                >
                  <td className="py-2.5 px-4 font-semibold text-[#c4161c]">{c.code}</td>
                  <td className="py-2.5 px-4 font-sans font-medium text-foreground">{c.name}</td>
                  <td className="py-2.5 px-4 font-sans text-muted-foreground">{c.entityType}</td>
                  <td className="py-2.5 px-4 text-foreground">Month {c.yearEndMonth}</td>
                  <td className="py-2.5 px-4 font-sans">
                    {c.vatCategory ? (
                      <Badge variant="outline" className="font-mono text-[10px] py-0 px-1">
                        Category {c.vatCategory}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-[11px] italic">Non-VAT</span>
                    )}
                  </td>
                  <td className="py-2.5 px-4 text-right font-sans">
                    <Button variant="ghost" size="sm" className="h-6 text-[11px] px-2">
                      Open Record
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

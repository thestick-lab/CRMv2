import { useState } from 'react';
import { todayInSouthAfrica, easterSunday, publicHolidays } from 'fdoncall-practice/domain/dates';
import { CLIENTS, STAFF } from 'fdoncall-practice/data/seed';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  CheckCircle2,
  ChevronRight,
  FileSpreadsheet,
  Moon,
  ShieldAlert,
  Sun,
  Users,
} from 'lucide-react';

export default function App() {
  const [isDark, setIsDark] = useState(true);
  const today = todayInSouthAfrica();
  const year = parseInt(today.slice(0, 4), 10);
  const easterThisYear = easterSunday(year);
  const easterNextYear = easterSunday(year + 1);
  const holidays = Array.from(publicHolidays(year).entries()).slice(0, 3);

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle('dark', !isDark);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top Bar Header */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-card/80 backdrop-blur px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded bg-[#c4161c] text-white font-bold text-sm tracking-tight shadow-sm">
            FD
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm tracking-tight">FD on Call</span>
              <span className="text-muted-foreground text-xs">/</span>
              <span className="text-muted-foreground text-xs font-mono">CRM v2</span>
              <Badge variant="crimsonSubdued" className="text-[10px] py-0 px-1.5 h-4">
                Phase 1 Verified
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground">Chartered Accountants &amp; Tax Advisory • Western Cape, SA</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleTheme}
            className="h-8 gap-1.5 text-xs border-border"
          >
            {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            {isDark ? 'Light Mode' : 'Dark Mode'}
          </Button>
          <Button size="sm" className="h-8 text-xs">
            Launch Workspace
          </Button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {/* Hero Section */}
        <div className="border border-border/80 rounded-lg p-6 bg-card/60 backdrop-blur">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-serif italic text-3xl text-foreground">FD on Call Practice Operating System</span>
                <Badge variant="success" className="gap-1 text-xs">
                  <CheckCircle2 className="h-3 w-3" /> React 19 + Vite 7 + Tailwind v4
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground max-w-2xl">
                Standalone high-velocity practice management engine integrating South African statutory compliance rules (SARS Tax Administration Act s25 &amp; Companies Act s30), 12-month rolling fee projections, and client-side PDF/XLSX generation.
              </p>
            </div>
          </div>
        </div>

        {/* Status KPI Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Domain Engine */}
          <div className="border border-border/80 rounded-lg p-5 bg-card/60 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Domain Engine</span>
              <Calendar className="h-4 w-4 text-[#c4161c]" />
            </div>
            <div>
              <div className="text-xl font-bold font-mono tracking-tight text-foreground">{today}</div>
              <div className="text-xs text-muted-foreground">South Africa Standard Time (UTC+2)</div>
            </div>
            <div className="pt-2 border-t border-border/50 space-y-1.5 text-xs text-muted-foreground font-mono">
              <div className="flex justify-between">
                <span>Easter {year}:</span>
                <span className="text-foreground">{easterThisYear}</span>
              </div>
              <div className="flex justify-between">
                <span>Easter {year + 1}:</span>
                <span className="text-foreground">{easterNextYear}</span>
              </div>
            </div>
          </div>

          {/* Card 2: Seed Practice Clients */}
          <div className="border border-border/80 rounded-lg p-5 bg-card/60 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Practice Data</span>
              <Users className="h-4 w-4 text-[#c4161c]" />
            </div>
            <div>
              <div className="text-xl font-bold font-mono tracking-tight text-foreground">{CLIENTS.length} Active Clients</div>
              <div className="text-xs text-muted-foreground">{STAFF.length} Practice Team Members</div>
            </div>
            <div className="pt-2 border-t border-border/50 space-y-1.5 text-xs text-muted-foreground">
              <div className="flex justify-between">
                <span>Companies:</span>
                <span className="font-mono text-foreground">{CLIENTS.filter(c => c.entityType === 'Company').length}</span>
              </div>
              <div className="flex justify-between">
                <span>Close Corporations:</span>
                <span className="font-mono text-foreground">{CLIENTS.filter(c => c.entityType === 'Close corporation').length}</span>
              </div>
            </div>
          </div>

          {/* Card 3: Statutory Rules */}
          <div className="border border-border/80 rounded-lg p-5 bg-card/60 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Statutory Compliance</span>
              <ShieldAlert className="h-4 w-4 text-[#c4161c]" />
            </div>
            <div>
              <div className="text-xl font-bold font-mono tracking-tight text-foreground">SARS &amp; CIPC Rules</div>
              <div className="text-xs text-muted-foreground">Public holiday rollback logic verified</div>
            </div>
            <div className="pt-2 border-t border-border/50 space-y-1.5 text-xs text-muted-foreground font-mono">
              {holidays.map(([d, name]) => (
                <div key={d} className="flex justify-between truncate">
                  <span className="truncate pr-2">{name}:</span>
                  <span className="text-foreground">{d}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Client Register Preview */}
        <div className="border border-border/80 rounded-lg bg-card/60 overflow-hidden">
          <div className="p-4 border-b border-border/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4 text-[#c4161c]" />
              <h2 className="text-sm font-semibold">Seeded Practice Client Register Preview</h2>
              <span className="text-xs text-muted-foreground">({CLIENTS.length} accounts)</span>
            </div>
            <span className="text-xs font-mono text-muted-foreground">Zero runtime drift</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/40 text-muted-foreground uppercase tracking-wider text-[10px] border-b border-border">
                <tr>
                  <th className="py-2.5 px-4 font-medium">Code</th>
                  <th className="py-2.5 px-4 font-medium">Client Name</th>
                  <th className="py-2.5 px-4 font-medium">Entity Type</th>
                  <th className="py-2.5 px-4 font-medium">Year End</th>
                  <th className="py-2.5 px-4 font-medium">VAT Category</th>
                  <th className="py-2.5 px-4 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 font-mono">
                {CLIENTS.slice(0, 5).map((c) => (
                  <tr key={c.code} className="hover:bg-muted/30 transition-colors">
                    <td className="py-2.5 px-4 font-semibold text-[#c4161c]">{c.code}</td>
                    <td className="py-2.5 px-4 font-sans font-medium text-foreground">{c.name}</td>
                    <td className="py-2.5 px-4 font-sans text-muted-foreground">{c.entityType}</td>
                    <td className="py-2.5 px-4 text-foreground">Month {c.yearEndMonth}</td>
                    <td className="py-2.5 px-4">
                      {c.vatCategory ? (
                        <Badge variant="outline" className="font-mono text-[10px] py-0 px-1">
                          Category {c.vatCategory}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground font-sans italic text-[11px]">Non-VAT</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-right font-sans">
                      <Button variant="ghost" size="sm" className="h-6 text-[11px] gap-1 px-2">
                        Inspect <ChevronRight className="h-3 w-3" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

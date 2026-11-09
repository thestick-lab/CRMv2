import * as React from 'react';
import { Download, RotateCcw, ShieldCheck, MapPin, AlertTriangle } from 'lucide-react';
import { usePracticeStore } from '@/context/PracticeStoreContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export function ProfilePane() {
  const { currentUser, clients, staff, quotes, exportData, resetData } = usePracticeStore();
  const [resetConfirm, setResetConfirm] = React.useState(false);
  const [downloadSuccess, setDownloadSuccess] = React.useState(false);

  const handleDownload = () => {
    const data = exportData();
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fdoncall-practice-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 3000);
  };

  const handleReset = () => {
    resetData();
    setResetConfirm(false);
  };

  return (
    <div className="space-y-6 max-w-2xl text-xs">
      <div>
        <h2 className="text-base font-semibold text-foreground">My Profile &amp; Account</h2>
        <p className="text-muted-foreground mt-0.5">
          Manage your authenticated practice identity, session role, and data export.
        </p>
      </div>

      {/* Profile Card */}
      <div className="p-4 rounded-xl border border-border bg-card space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-mono font-bold text-base">
            {currentUser.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="text-sm font-semibold text-foreground flex items-center gap-2">
              {currentUser.name}
              <Badge variant="outline" className="text-[10px] font-mono border-primary/30 text-primary bg-primary/5">
                {currentUser.role}
              </Badge>
            </div>
            <div className="text-muted-foreground font-mono mt-0.5">{currentUser.email}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-border/60">
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span>Durbanville, Cape Town Practice</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <ShieldCheck className="h-4 w-4 shrink-0 text-primary" />
            <span>SAICA Chartered Accountant Access</span>
          </div>
        </div>
      </div>

      {/* Practice Data Export */}
      <div className="p-4 rounded-xl border border-border bg-card space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Download className="h-4 w-4 text-primary" />
              Export My Practice Data
            </div>
            <p className="text-muted-foreground mt-1 leading-relaxed">
              Download a complete JSON snapshot of all {clients.length} practice clients, {staff.length} team members, {quotes.length} fee quotes, and statutory compliance status overrides.
            </p>
          </div>
        </div>

        <div className="pt-2 flex items-center gap-3">
          <Button
            size="sm"
            onClick={handleDownload}
            className="bg-[#c4161c] hover:bg-[#a51217] text-white flex items-center gap-1.5"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Download Practice Data JSON</span>
          </Button>

          {downloadSuccess && (
            <span className="text-primary font-mono text-[11px]">
              Snapshot downloaded successfully!
            </span>
          )}
        </div>
      </div>

      {/* Reset Practice State */}
      <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/5 space-y-3">
        <div className="text-sm font-semibold text-red-600 dark:text-red-400 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          Reset Practice State
        </div>
        <p className="text-muted-foreground leading-relaxed">
          Reset local storage back to pristine seed defaults (13 clients, 9 staff, the seeded fee quotes). This will clear all local task status overrides and newly added prospects.
        </p>

        {resetConfirm ? (
          <div className="pt-2 flex items-center gap-2">
            <Button
              size="sm"
              variant="destructive"
              onClick={handleReset}
            >
              Confirm Full Practice Reset
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setResetConfirm(false)}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setResetConfirm(true)}
            className="text-red-600 border-red-500/30 hover:bg-red-500/10"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
            Reset to Seed Data
          </Button>
        )}
      </div>
    </div>
  );
}

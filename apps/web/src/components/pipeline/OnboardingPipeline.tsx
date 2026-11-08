import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import {
  Plus,
  CheckCircle2,
  Building2,
  User,
  Mail,
  Sparkles,
  X,
} from 'lucide-react';
import {
  PIPELINE_STAGES,
  computePipelineTotals,
  groupLeadsByStage,
  formatZar,
  formatTurnover,
  type PipelineStage,
} from './pipeline-data';
import { usePracticeStore } from '@/context/PracticeStoreContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface OnboardingPipelineProps {
  onConvertClient?: (clientCode: string) => void;
  className?: string;
}

export function OnboardingPipeline({ onConvertClient, className }: OnboardingPipelineProps) {
  const { leads, staff, clients, updateLeadStage, convertLead, addLead } = usePracticeStore();
  const [draggedLeadId, setDraggedLeadId] = React.useState<string | null>(null);
  const [activeDropStage, setActiveDropStage] = React.useState<PipelineStage | null>(null);
  const [modalOpen, setModalOpen] = React.useState(false);

  // New Lead Form State
  const [companyName, setCompanyName] = React.useState('');
  const [contactPerson, setContactPerson] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [phone, setPhone] = React.useState('+27 ');
  const [turnover, setTurnover] = React.useState('5000000');
  const [monthlyFee, setMonthlyFee] = React.useState('5500');
  const [partnerId, setPartnerId] = React.useState('erik');
  const [notes, setNotes] = React.useState('');

  const metrics = React.useMemo(() => computePipelineTotals(leads), [leads]);
  const grouped = React.useMemo(() => groupLeadsByStage(leads), [leads]);

  const handleDragStart = (leadId: string) => {
    setDraggedLeadId(leadId);
  };

  const handleDragOver = (e: React.DragEvent, stage: PipelineStage) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (activeDropStage !== stage) {
      setActiveDropStage(stage);
    }
  };

  const handleDragLeave = () => {
    setActiveDropStage(null);
  };

  const handleDrop = (e: React.DragEvent, targetStage: PipelineStage) => {
    e.preventDefault();
    setActiveDropStage(null);
    const leadId = draggedLeadId || e.dataTransfer.getData('text/plain');
    if (leadId) {
      updateLeadStage(leadId, targetStage);
      setDraggedLeadId(null);
    }
  };

  const handleConvert = (leadId: string) => {
    const createdClient = convertLead(leadId);
    if (createdClient && onConvertClient) {
      onConvertClient(createdClient.code);
    }
  };

  const handleCreateLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) return;

    addLead({
      companyName: companyName.trim(),
      contactPerson: contactPerson.trim() || 'Director',
      email: email.trim() || 'info@practice-lead.co.za',
      phone: phone.trim() || '+27 21 000 0000',
      turnover: Number(turnover) || 5000000,
      estimatedMonthlyFee: Number(monthlyFee) || 5500,
      partnerId,
      stage: 'Lead',
      notes: notes.trim() || undefined,
    });

    // Reset Form
    setCompanyName('');
    setContactPerson('');
    setEmail('');
    setPhone('+27 ');
    setNotes('');
    setModalOpen(false);
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Metric Tiles Header */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-border bg-card shadow-xs">
          <div className="text-xs text-muted-foreground font-mono uppercase tracking-wider">
            Total Pipeline Value
          </div>
          <div className="text-2xl font-bold font-mono font-tnum text-foreground mt-1">
            {formatZar(metrics.totalMonthlyValue)}
            <span className="text-xs font-normal text-muted-foreground ml-1">/ mo</span>
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            Across {metrics.totalLeads} active pipeline opportunities
          </div>
        </div>

        <div className="p-4 rounded-xl border border-border bg-card shadow-xs">
          <div className="text-xs text-muted-foreground font-mono uppercase tracking-wider">
            Annual Retainer Run-Rate
          </div>
          <div className="text-2xl font-bold font-mono font-tnum text-primary mt-1">
            {formatZar(metrics.totalMonthlyValue * 12)}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            Projected 12-month revenue under advisory
          </div>
        </div>

        <div className="p-4 rounded-xl border border-border bg-card shadow-xs">
          <div className="text-xs text-muted-foreground font-mono uppercase tracking-wider">
            Turnover Under Advisory
          </div>
          <div className="text-2xl font-bold font-mono font-tnum text-foreground mt-1">
            {formatTurnover(metrics.totalTurnover)}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            Combined annual turnover of prospects
          </div>
        </div>

        <div className="p-4 rounded-xl border border-border bg-card shadow-xs flex flex-col justify-between">
          <div>
            <div className="text-xs text-muted-foreground font-mono uppercase tracking-wider">
              Quick Action
            </div>
            <div className="text-sm font-semibold text-foreground mt-1">
              Add Practice Prospect
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => setModalOpen(true)}
            className="w-full mt-2 bg-[#c4161c] hover:bg-[#a51217] text-white flex items-center justify-center gap-1.5 shadow-xs"
          >
            <Plus className="h-4 w-4" />
            <span>New Prospect</span>
          </Button>
        </div>
      </div>

      {/* 5-Column Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3.5 items-start">
        {PIPELINE_STAGES.map((stage) => {
          const stageLeads = grouped[stage.id] || [];
          const stageMetric = metrics.byStage[stage.id];
          const isDropActive = activeDropStage === stage.id;

          return (
            <div
              key={stage.id}
              onDragOver={(e) => handleDragOver(e, stage.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, stage.id)}
              className={cn(
                'rounded-xl border bg-muted/30 p-3 flex flex-col min-h-[500px] transition-colors',
                isDropActive
                  ? 'border-primary bg-primary/5 ring-1 ring-primary'
                  : 'border-border/80'
              )}
            >
              {/* Column Header */}
              <div className="pb-3 border-b border-border/60">
                <div className="flex items-center justify-between gap-1">
                  <span className="font-semibold text-xs text-foreground tracking-tight truncate">
                    {stage.label}
                  </span>
                  <Badge variant="outline" className="font-mono text-[10px] px-1.5 py-0 h-4">
                    {stageLeads.length}
                  </Badge>
                </div>
                <div className="text-[10px] font-mono text-muted-foreground mt-1 font-tnum truncate">
                  {formatZar(stageMetric.monthlyValue)} / mo
                </div>
              </div>

              {/* Cards Container */}
              <div className="space-y-3 pt-3 flex-1">
                {stageLeads.length === 0 ? (
                  <div className="h-32 border border-dashed border-border/50 rounded-lg flex items-center justify-center text-[11px] text-muted-foreground/60 select-none">
                    Drop prospects here
                  </div>
                ) : (
                  stageLeads.map((lead) => {
                    const partner = staff.find((s) => s.id === lead.partnerId);
                    const partnerName = partner ? partner.name : 'Erik';
                    const convertedClient = clients.find((c) => c.name === lead.companyName);

                    return (
                      <div
                        key={lead.id}
                        draggable
                        onDragStart={() => handleDragStart(lead.id)}
                        className="p-3 rounded-lg border border-border/80 bg-card hover:border-primary/50 transition-all shadow-xs cursor-grab active:cursor-grabbing space-y-2.5 group"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="text-xs font-semibold text-foreground leading-snug">
                            {lead.companyName}
                          </div>
                          <Badge variant="secondary" className="text-[10px] font-mono px-1 py-0 h-4 shrink-0">
                            {partnerName}
                          </Badge>
                        </div>

                        <div className="text-[11px] text-muted-foreground space-y-0.5">
                          <div className="flex items-center gap-1.5 truncate">
                            <User className="h-3 w-3 text-muted-foreground shrink-0" />
                            <span className="truncate">{lead.contactPerson}</span>
                          </div>
                          <div className="flex items-center gap-1.5 truncate">
                            <Mail className="h-3 w-3 text-muted-foreground shrink-0" />
                            <span className="truncate font-mono">{lead.email}</span>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-border/50 flex items-center justify-between text-xs font-mono font-tnum">
                          <span className="text-[10px] text-muted-foreground">
                            TO: {formatTurnover(lead.turnover)}
                          </span>
                          <span className="font-semibold text-foreground">
                            {formatZar(lead.estimatedMonthlyFee)}
                            <span className="text-[9px] text-muted-foreground font-normal">/mo</span>
                          </span>
                        </div>

                        {lead.notes && (
                          <div className="text-[10px] text-muted-foreground bg-muted/50 p-1.5 rounded line-clamp-2 leading-relaxed">
                            {lead.notes}
                          </div>
                        )}

                        {/* Conversion Action */}
                        {lead.stage === 'Active Client' || stage.id === 'Active Client' ? (
                          convertedClient ? (
                            <button
                              onClick={() => onConvertClient?.(convertedClient.code)}
                              className="w-full mt-2 py-1 px-2 rounded bg-primary/10 hover:bg-primary/20 text-primary text-[11px] font-medium transition-colors flex items-center justify-center gap-1.5 border border-primary/20"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span className="font-mono font-semibold">{convertedClient.code}</span>
                              <span className="text-[10px] text-muted-foreground">(View Record)</span>
                            </button>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => handleConvert(lead.id)}
                              className="w-full mt-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-1.5"
                            >
                              <Sparkles className="h-3.5 w-3.5" />
                              <span>Convert to Practice Client</span>
                            </Button>
                          )
                        ) : null}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* New Prospect Dialog */}
      <DialogPrimitive.Root open={modalOpen} onOpenChange={setModalOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs animate-in fade-in-0" />
          <DialogPrimitive.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-card p-6 shadow-2xl animate-in fade-in-0 zoom-in-95 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div>
                <DialogPrimitive.Title className="text-base font-semibold text-foreground flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" />
                  Add New Practice Prospect
                </DialogPrimitive.Title>
                <DialogPrimitive.Description className="text-xs text-muted-foreground mt-0.5">
                  Enter new business advisory lead into the 5-stage onboarding pipeline.
                </DialogPrimitive.Description>
              </div>
              <DialogPrimitive.Close asChild>
                <button className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              </DialogPrimitive.Close>
            </div>

            <form onSubmit={handleCreateLead} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="font-medium text-foreground block mb-1">Company / Entity Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Helderberg Marine Supplies"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-foreground"
                  />
                </div>

                <div>
                  <label className="font-medium text-foreground block mb-1">Contact Person</label>
                  <input
                    type="text"
                    placeholder="e.g. Johan Venter"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-foreground"
                  />
                </div>

                <div>
                  <label className="font-medium text-foreground block mb-1">Email Address</label>
                  <input
                    type="email"
                    placeholder="johan@helderbergmarine.co.za"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-foreground"
                  />
                </div>

                <div>
                  <label className="font-medium text-foreground block mb-1">Phone Number</label>
                  <input
                    type="text"
                    placeholder="+27 21 850 1200"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-foreground font-mono"
                  />
                </div>

                <div>
                  <label className="font-medium text-foreground block mb-1">Estimated Annual Turnover (ZAR)</label>
                  <input
                    type="number"
                    step="500000"
                    value={turnover}
                    onChange={(e) => setTurnover(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-foreground font-mono"
                  />
                </div>

                <div>
                  <label className="font-medium text-foreground block mb-1">Estimated Monthly Retainer (ZAR)</label>
                  <input
                    type="number"
                    step="500"
                    value={monthlyFee}
                    onChange={(e) => setMonthlyFee(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-foreground font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-medium text-foreground block mb-1">Assignee Partner</label>
                <select
                  value={partnerId}
                  onChange={(e) => setPartnerId(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-foreground"
                >
                  {staff
                    .filter((s) => s.role === 'Partner' || s.role === 'Compliance Officer')
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.role})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="font-medium text-foreground block mb-1">Advisory Notes / Scope Summary</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Section 12B renewable energy tax review, CIPC annual return backlog..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-foreground"
                />
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="bg-[#c4161c] hover:bg-[#a51217] text-white"
                >
                  Add to Pipeline
                </Button>
              </div>
            </form>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </div>
  );
}

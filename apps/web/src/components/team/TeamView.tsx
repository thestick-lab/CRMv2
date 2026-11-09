import * as React from 'react';
import { ArrowLeft, BadgeCheck, Pencil, Tags, UserPlus, Users2 } from 'lucide-react';
import { usePracticeStore } from '@/context/PracticeStoreContext';
import {
  assignableInviteRoles,
  can,
  canInviteWithRole,
  inviteRoleBlock,
} from '@/lib/permissions';
import { PageHeader } from '@/components/ui/page-header';
import { CardHeaderWithLink, EmptyStateCard } from '@/components/ui/list-primitives';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ContactProfileLayout,
  type TabConfig,
} from '@/components/client-show/ContactProfileLayout';
import {
  InviteMemberDialog,
  StaffDirectory,
  type InviteTeamMemberInput,
} from './StaffDirectory';
import { StaffEditDialog } from './StaffEditDialog';
import type { StaffProfile as StaffProfileRecord } from '@/context/PracticeStoreContext';
import {
  buildStaffUsers,
  formatHourlyRate,
  formatStartDate,
  staffProfileOf,
  staffRows,
  type StaffRow,
} from './staff-data';

const STAFF_TABS: TabConfig[] = [{ id: 'overview', label: 'Overview', icon: BadgeCheck }];

export function TeamView() {
  const {
    staff,
    staffProfiles,
    currentUser,
    inviteTeamMember,
    updateStaffProfile,
    permissions,
  } = usePracticeStore();
  const canEditStaff = can(currentUser.role, 'People', 'view-invite', permissions.matrix);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = React.useState(false);

  const rows = React.useMemo(
    () => staffRows(staff, buildStaffUsers(staff, currentUser, staffProfiles)),
    [staff, currentUser, staffProfiles]
  );

  const selected = rows.find((row) => row.id === selectedId) ?? null;

  const assignableRoles = React.useMemo(
    () => assignableInviteRoles(currentUser.role, permissions.matrix),
    [currentUser.role, permissions.matrix]
  );

  const handleInvite = (member: InviteTeamMemberInput) => {
    if (!canEditStaff) return;
    // The shared rule owns which roles this user may hand out; the reducer
    // refuses the same roles if a stale UI ever dispatches one.
    if (!canInviteWithRole(currentUser.role, member.role, permissions.matrix)) return;
    inviteTeamMember(member);
  };

  if (selected) {
    const selectedKind = staff.find((member) => member.id === selected.id)?.kind ?? 'employee';
    const profile = staffProfileOf(
      selected.id,
      selectedKind,
      staffProfiles,
      currentUser.id === selected.id ? currentUser : undefined
    );
    return (
      <StaffProfile
        row={selected}
        profile={profile}
        canEdit={canEditStaff}
        onBack={() => setSelectedId(null)}
        onSave={(patch) => updateStaffProfile(selected.id, patch)}
      />
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <PageHeader
        eyebrow="TEAM"
        title="Team"
        subtitle="The internal staff register — role, employment kind, contact details and contract terms. Client directors live on each client's Organization tab."
        actions={
          <Button
            size="sm"
            onClick={() => setInviteOpen(true)}
            disabled={!canEditStaff}
            title={canEditStaff ? undefined : `${currentUser.role} cannot invite team members`}
          >
            <UserPlus className="h-3.5 w-3.5" />
            Invite member
          </Button>
        }
      />

      {rows.length === 0 ? (
        <EmptyStateCard
          icon={Users2}
          title="No staff records yet"
          subtitle="Invite a team member to add the first staff record to the register."
          dashed
        />
      ) : (
        <StaffDirectory rows={rows} onOpen={setSelectedId} />
      )}

      <InviteMemberDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        onInvite={handleInvite}
        assignableRoles={assignableRoles}
        roleNote={inviteRoleBlock(currentUser.role, 'Partner', permissions.matrix) ?? undefined}
      />
    </div>
  );
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 px-4 py-2.5">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 truncate text-right text-foreground">{children}</dd>
    </div>
  );
}

function StaffProfile({
  row,
  profile,
  canEdit,
  onBack,
  onSave,
}: {
  row: StaffRow;
  profile: StaffProfileRecord;
  canEdit: boolean;
  onBack: () => void;
  onSave: (patch: Partial<StaffProfileRecord>) => void;
}) {
  const [activeTab, setActiveTab] = React.useState('overview');
  const [editOpen, setEditOpen] = React.useState(false);

  const kindLabel = row.contractType === 'subcontractor' ? 'Subcontractor' : 'Employee';
  const tags = Array.from(new Set([row.role, kindLabel]));
  const signOff = row.role === 'Partner';

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <ContactProfileLayout
        identity={{
          name: row.name,
          subtitle: `${row.role} · ${kindLabel}`,
          description: row.email ? `Practice sign-in account · ${row.email}` : undefined,
          tags,
        }}
        meta={{ email: row.email, phone: row.phone }}
        actions={
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              data-staff-edit-open
              onClick={() => setEditOpen(true)}
              disabled={!canEdit}
              title={canEdit ? undefined : 'Your role cannot edit the staff record'}
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit record
            </Button>
            <Button variant="outline" size="sm" onClick={onBack}>
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to team
            </Button>
          </div>
        }
        tabs={STAFF_TABS}
        tabsLabel="Staff record sections"
        avatar="person"
        activeTab={activeTab}
        onTab={setActiveTab}
      >
        {activeTab === 'overview' && (
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              <section className="overflow-hidden rounded-xl border border-border bg-card">
                <CardHeaderWithLink title="Contact details" />
                <dl className="divide-y divide-border/60 text-xs">
                  <DetailRow label="Email">{row.email || '—'}</DetailRow>
                  <DetailRow label="Phone">
                    <span className="font-mono text-[11px]">{row.phone || '—'}</span>
                  </DetailRow>
                  <DetailRow label="Sign-in account">
                    <span className="font-mono text-[11px]">{row.email || '—'}</span>
                  </DetailRow>
                </dl>
              </section>

              <section className="overflow-hidden rounded-xl border border-border bg-card">
                <CardHeaderWithLink title="Contract" />
                <dl className="divide-y divide-border/60 text-xs">
                  <DetailRow label="Contract type">
                    <Badge
                      variant={row.contractType === 'subcontractor' ? 'crimsonSubdued' : 'outline'}
                      className="font-mono text-[10px] capitalize"
                    >
                      {row.contractType}
                    </Badge>
                  </DetailRow>
                  <DetailRow label="Employment kind">
                    <span className="capitalize">{row.kind}</span>
                  </DetailRow>
                  <DetailRow label="Start date">
                    <span className="font-mono text-[11px] tabular-nums">
                      {formatStartDate(row.startDate)}
                    </span>
                  </DetailRow>
                  <DetailRow label="Hourly rate">
                    <span className="font-mono text-[11px] tabular-nums">
                      {row.contractType === 'subcontractor' ? formatHourlyRate(row.hourlyRate) : '—'}
                    </span>
                  </DetailRow>
                  <DetailRow label="Statutory sign-off">
                    {signOff ? 'CA(SA) partner sign-off' : 'Not a sign-off role'}
                  </DetailRow>
                </dl>
              </section>
            </div>

            <div className="space-y-4">
              <section className="overflow-hidden rounded-xl border border-border bg-card">
                <CardHeaderWithLink title="Tags" />
                <div className="flex flex-wrap gap-1.5 px-4 py-3">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/50 px-2 py-0.5 font-mono text-[10px] leading-none text-muted-foreground"
                    >
                      <Tags aria-hidden="true" className="h-2.5 w-2.5" />
                      {tag}
                    </span>
                  ))}
                </div>
              </section>

              <section className="overflow-hidden rounded-xl border border-border bg-card">
                <CardHeaderWithLink title="Internal notes" />
                {row.notes ? (
                  <p className="whitespace-pre-line bg-amber-500/[0.07] px-4 py-3 text-xs leading-relaxed text-foreground">
                    {row.notes}
                  </p>
                ) : (
                  <p className="bg-muted/20 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
                    — No internal notes recorded.
                  </p>
                )}
              </section>
            </div>
          </div>
        )}
      </ContactProfileLayout>

      <StaffEditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        staffName={row.name}
        profile={profile}
        onSave={onSave}
      />
    </div>
  );
}

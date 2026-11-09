# CRMv2 Redesign & Feature Expansion — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle every CRMv2 screen to the 8 reference layouts with the FD on Call brand, and add the quote→signature→invoice flow, sales pipeline + 6-lane deadlines boards, time tracking, a 6-role permissions matrix, and a governance audit log — all on the existing React/Tailwind/localStorage architecture.

**Architecture:** In-memory `ViewKey` routing in `apps/web/src/App.tsx`; all state in `PracticeStoreContext` (localStorage `crmv2_practice_state`); statutory/pricing math stays in `packages/domain`; new app logic as pure, testable modules (`apps/web/src/lib/permissions.ts`, `apps/web/src/lib/billing.ts`, `apps/web/src/lib/quote-lifecycle.ts`, `apps/web/src/lib/integrations/*`). Four phases, tests green after each.

**Tech Stack:** React 19, Vite 7, Tailwind v4, shadcn-style primitives (Radix), `@tanstack/react-table`, lucide-react, Vitest (node env, existing source-assertion + pure-function style). No router lib, no new chart lib, no backend changes.

**Spec:** `local://2026-11-09-crm-redesign-design.md` (commit to `docs/superpowers/specs/2026-11-09-crm-redesign-design.md` in Task 22). This plan argues from that spec; executors read both.

## Global Constraints

- Never import statutory/pricing logic into UI; import from `fdoncall-practice/domain/*` (`packages/domain/src/domain/`).
- Both themes mandatory: use existing tokens in `apps/web/src/index.css` (`bg-card`, `border-border`, `text-foreground`, `text-muted-foreground`, `bg-muted`, `text-primary`; crimson `#c4161c` inline as today). Reference accent colors (blue/green/mint) never enter the app.
- Reference fictional content never enters the app (no "NimbleBuild", "Riverside Hub", "Jordan Lee", "$", "USD" fixtures — always ZAR `R` formatting, FD on Call seed data).
- `npm test`, `npm run typecheck`, `npm run build` from repo root must pass at the end of every task.
- Follow `impeccable` + `frontend-design` skills for every screen; polish is part of done.
- UI verification = manual: `npm run dev` (port 3000), walk the affected screens in dark AND light (toggle in topbar); behavior evidence from store state + console errors absent.
- Clean cutover: no dead views, no compatibility shims, no aliases; migrate persisted state via idempotent load-time migration.
- Existing behavior preserved: partner review gate, PDF/XLSX exports, Cmd+K, division switcher, AI assistant drawer, IRP6 outcomes, holiday rollback tags.

## Review Focus

1. **Analytics zero-data:** no invoices/time in a period must render explicit empty states; Δ% with zero denominator renders `—`, never NaN/∞/0. → Task 3 test.
2. **Time rounding + invoice money:** entries round to nearest 0.25h (half-up), min 0.25h; invoice lines reconcile cent-exact (line sums + 15% VAT); edited quantities/discounts keep Subtotal/VAT/Total correct. → Tasks 14, 16, 18 tests.
3. **Persisted-state migration:** old `crmv2_practice_state` (with `leads`, `taskStatusOverrides`, old role strings) loads and migrates without loss; double-load is idempotent; missing new fields fall back to defaults. → Tasks 1, 10 tests.
4. **Stage transition legality:** quote transitions enforced (`Send` needs client + ≥1 fee line; `Accept` needs Sent; `Sign` needs Accepted; `Active Client` needs Signed; `Closed Lost` only from Draft/Sent/Accepted); invoice `Overdue` derived, never stored; partner gate `PARTNER_REVIEW_REQUIRED` still blocks non-partners. → Tasks 10, 11, 12, 15 tests.
5. **Board blocked-state + keyboard:** blocked cards stay visibly blocked after any move; keyboard moves respect the same transition rules as drag/menu; illegal moves no-op with feedback. → Tasks 6, 13 tests.

---

## Phase 1 — Foundation, navigation & screen restyles

### Task 1: Store shape extension, activity seeds, page primitives, navigation

**Files:**
- Modify: `apps/web/src/context/PracticeStoreContext.tsx`
- Modify: `apps/web/src/types/navigation.ts`
- Modify: `apps/web/src/components/layout/navigation-helpers.ts`
- Modify: `apps/web/src/App.tsx`
- Modify: `apps/web/src/components/layout/Topbar.tsx`
- Create: `apps/web/src/components/ui/page-header.tsx`
- Create: `apps/web/src/components/ui/list-primitives.tsx`
- Test: `apps/web/src/context/PracticeStoreContext.test.ts` (extend)

**Interfaces:**
- Produces: `PracticeState` gains `quotes: Quote[]`, `invoices: Invoice[]`, `timeEntries: TimeEntry[]`, `permissions: PermissionState`, `activity: ActivityEvent[]`, `adhocTasks: AdHocTask[]`, `sequences: { quote: number; invoice: number }` — all defaulted (empty/default) so later tasks can add reducer actions without re-touching the shape. Types live here (see §Store types below) and are re-exported for all later tasks.
- Produces: `ViewKey` = `'dashboard' | 'inbox' | 'settings' | 'clients' | 'client' | 'team' | 'deadlines' | 'sales-pipeline' | 'time' | 'analytics' | 'govlog'` (legacy `people | estimator | quote | pipeline` keys removed from the type; their views stay mapped internally until Task 10 removes them — App.tsx keeps the old switch cases for `estimator`/`pipeline` behind the scenes only if reachable code requires it; since keys are gone from the type, remove the cases now and route nothing to EstimatorView/PipelineView; those components are deleted in Task 10).
- Produces: `PageHeader` (`{ eyebrow?, title, subtitle?, actions?: ReactNode }`), and list primitives `CardHeaderWithLink { title, linkLabel?, onLink? }`, `PriorityPill { level: 'High'|'Medium'|'Low' }`, `DateChip { month: string; day: string }`, `AvatarChip { initials, tint }`, `EmptyStateCard { icon, title, subtitle, dashed?: boolean }`.
- Produces: `NAV_ITEMS` grouped with `section: 'Practice' | 'Work' | 'Admin'` (Home, Analytics, Inbox | Clients, Team, Deadlines, Sales Pipeline, Time | Settings, Governance Log); `Sidebar` sections render per group.

**Steps:**
- [ ] **Step 1: Write the failing test** — extend `PracticeStoreContext.test.ts`: load a legacy state object `{ leads: [...old lead], clients, staff, taskStatusOverrides }` through `loadPracticeState`; assert result has `quotes: []`, `invoices: []`, `timeEntries: []`, `permissions` default, `activity: []`, `adhocTasks: []`, `sequences: {quote: 0, invoice: 0}`, and the legacy fields are preserved (leads still present until Task 10's migration).
- [ ] **Step 2: Run test → FAIL** (missing fields).
- [ ] **Step 3: Implement** — add the state fields + defaults to `PracticeState`, `getInitialPracticeState`, and the `loadPracticeState` merge (missing new fields → defaults; never overwrite existing persisted values).
- [ ] **Step 4: Run test → PASS.**
- [ ] **Step 5: Implement types + primitives** — `ViewKey` change, `NAV_ITEMS` regroup, `App.tsx` switch updates (map `analytics`→`AnalyticsView`, `time`→`TimeView`, `sales-pipeline`→`SalesPipelineView`, `team`→`TeamView`, `govlog`→`GovernanceLogView`; delete `estimator|quote|pipeline|people` cases), `PageHeader` + list primitives (exact prop names above; follow reference anatomy: hairline borders, rounded-xl cards, generous padding).
- [ ] **Step 6: Create the five new view files as real-but-minimal implementations** (`AnalyticsView`, `TimeView`, `SalesPipelineView`, `TeamView`, `GovernanceLogView`) rendering `PageHeader` + an empty state, so routing/typecheck pass; their full content lands in Tasks 3, 5, 9, 13, 17. Update `Sidebar.tsx` to render grouped `NAV_ITEMS` and remove the hard-coded People item.
- [ ] **Step 7: Verify** — `npm run typecheck && npm run build && npm test`; `npm run dev`, click every sidebar item, confirm no console errors, both themes.

### Task 2: Home restyle (design §6.2)

**Files:**
- Modify: `apps/web/src/components/views/DashboardView.tsx` (rewrite as the new Home)
- Modify: `apps/web/src/components/layout/Topbar.tsx` (`+ New` menu: New Quote / New Client / Log Time — navigation placeholders that route to the views; quote/client actions fully wired in Tasks 10–12, time in Task 16; each item navigates, never silently dead)
- Create: `apps/web/src/components/home/` — `EngagementBanner.tsx`, `KpiStrip.tsx`, `MyTasksCard.tsx`, `TeamActivityCard.tsx`, `UpcomingDeadlinesCard.tsx`, `RecentWorkCard.tsx`, `HolidaysCard.tsx`, `InviteCard.tsx`
- Test: `apps/web/src/components/home/HomeLogic.test.ts`

**Interfaces:**
- Consumes: store (`clients`, `staff`, `taskStatusOverrides`, `activity`, `timeEntries`), `aggregatePracticeTasks` (from `apps/web/src/components/deadlines/practice-tasks.ts`), `getUpcomingHolidays` (existing), `todayInSouthAfrica`.
- Produces: pure helpers `buildHomeData(store-ish args)` in `HomeLogic`-adjacent module: `{ banner: { clientName, code, compliancePct, openTasks } | null, kpis: { totalTasks, dueThisWeek, inReview, teamMembers }, myTasks: HomeTaskItem[], completedCount, activity: ActivityEvent[], deadlines: HomeDeadlineItem[], recentWork: HomeRecentWorkItem[], holidays: HolidayItem[], emptyStates: { noOverdue, noAwaitingClient } }`. `myTasks` = tasks assigned to current user (staffId match), urgency→priority mapping (overdue→High, ≤7d→High, ≤30d→Medium, else Low).

**Steps:**
- [ ] **Step 1: Failing test** — `buildHomeData` with a store snapshot: assert KPI counts (total open tasks, due-this-week, in-review = `Partner Review Gate` overrides count, team = staff length), `emptyStates.noOverdue` true when no overdue, priority mapping for a due-tomorrow task = High, activity sorted newest-first.
- [ ] **Step 2: Run → FAIL. Step 3: Implement helper → PASS.**
- [ ] **Step 4: Implement components** — per §6.2 anatomy: greeting + search + `+ New` + avatar; banner (busiest client by open tasks; progress = submitted/approved ÷ total for that client; fallback practice-wide; `Open Client →` routes with `onNavigate('client', code)`); KPI strip (each tile navigates to filtered deadlines); My Tasks card (tabs, checkbox rows; checkbox on gate-free task → `UPDATE_TASK_STATUS(…, 'Submitted')` if `!needsPartnerReview`, else opens `StatutoryActionModal`; `View all →` = deadlines filtered to current user); Team Activity (from `activity`, seeded historical entries appended); empty-state pair; right rail (Upcoming Deadlines top 5, Recent Work from `timeEntries` + vault files seed, SA Public Holidays, Invite card → settings team pane).
- [ ] **Step 5: Verify** — typecheck/build/tests; manual: home renders in both themes, all tiles/links navigate, checkbox completes a VAT201 task but opens the modal for an AFS task.

### Task 3: Analytics view (design §6.6)

**Files:**
- Create: `apps/web/src/components/analytics/AnalyticsView.tsx` (replace the Task 1 minimal file)
- Create: `apps/web/src/components/analytics/analytics-logic.ts`
- Create: `apps/web/src/components/analytics/analytics-charts.tsx` (hand-rolled SVG: `LineAreaChart`, `DonutChart`, `BarList` — no new deps)
- Test: `apps/web/src/components/analytics/analytics-logic.test.ts`

**Interfaces:**
- Consumes: store (`invoices`, `clients`, `taskStatusOverrides`, `timeEntries`, `quotes`).
- Produces: `computeAnalytics(state, range: {start: ISODate, end: ISODate}, compare: {start, end})` → `{ revenue: {value, deltaPct|null}, activeClients: {value, deltaPct|null}, filingsSubmitted: {value, deltaPct|null}, billableHours: {value, deltaPct|null}, revenueByMonth: {label, value}[], revenueByGroup: {label, pct, zar}[], hoursByClient: {label, hours}[], activity: ActivityEvent[] }`. Revenue = sum of `Sent`+`Paid` invoices in range. Δ% = `(cur−prev)/prev`; `prev === 0` → `deltaPct: null`. Any aggregate with no source data → `null` (renders empty state).

**Steps:**
- [ ] **Step 1: Failing test** — empty store → all metrics `null`; store with 2 invoices in period + 0 previous → revenue value correct, `deltaPct === null`; invoices outside range excluded; group split sums to revenue.
- [ ] **Step 2: Run → FAIL. Step 3: Implement → PASS.**
- [ ] **Step 4: Implement view** — §6.6 anatomy: eyebrow `ANALYTICS`, H1 `Overview`, date-range + compare pills, `7D/30D/90D/1Y` segmented (sets range relative to `todayInSouthAfrica`), hero revenue card with `LineAreaChart` + endpoint callout + Δ badge, 3 KPI cards, `DonutChart` revenue-by-service-group, `BarList` hours-by-client top 5, recent activity. Every null metric renders its named empty state ("No revenue recorded this period") — never zero.
- [ ] **Step 5: Verify** — typecheck/build/tests; manual both themes; switch ranges; confirm empty states with fresh localStorage (`localStorage.clear()`).

### Task 4: Clients register + client record restyle (design §6.3)

**Files:**
- Modify: `apps/web/src/components/views/ClientsView.tsx`, `apps/web/src/components/clients/ClientsRegisterTable.tsx`
- Modify: `apps/web/src/components/client-show/ClientShowView.tsx`, `ClientSummaryBar.tsx`
- Create: `apps/web/src/components/client-show/ContactProfileLayout.tsx` (shared company/person profile layout: identity header, meta column, tag pills, tabs, 3-col grid)
- Create: `apps/web/src/components/client-show/panels/` — `ContactDetailsPanel.tsx`, `MissingInformationPanel.tsx`, `OrganizationPanel.tsx`, `RelationshipHistoryPanel.tsx`, `NextActionPanel.tsx`, `InternalNotesPanel.tsx`, `TagsPanel.tsx`
- Modify: `packages/domain/src/domain/types.ts` (`Client` gains `email?, phone?, location?, timezone?, contacts?: ClientContact[]` where `ClientContact = { id: string; name: string; role: string; email?: string; phone?: string; notes?: string }`)
- Modify: `apps/web/src/components/client-show/tabs/StatutoryProfileTab.tsx` (reflow into the 3-col grid Overview), `ClientShowView.tsx` (wire `EstimateTab`, `VaultTab`, `DeadlinesTab`)

**Interfaces:**
- Produces: `ContactProfileLayout` props: `{ identity: {name, code?, subtitle, description?, tags[]}, meta: {email?, phone?, location?, timezone?}, actions?: ReactNode, tabs: TabConfig[], activeTab, onTab, children }`.
- Consumes: existing `buildEstimateForClient`, `buildClientDeadlines`, `downloadPdfQuote`/`downloadExcelQuote`, `StatutoryActionModal`.

**Steps:**
- [ ] **Step 1: Failing test** — source-assertion test per repo convention: `ClientShowView.tsx` source contains tab labels `Overview`, `Organization`, `History`, `Tasks`, `Estimate`, `Vault`, `Notes` and imports `EstimateTab`, `VaultTab`, `DeadlinesTab` (pins the 7-tab wiring); `types.ts` `Client` interface contains `contacts?: ClientContact[]`.
- [ ] **Step 2: Run → FAIL. Step 3: Implement domain type + tabs → PASS.**
- [ ] **Step 4: Implement layout** — header per §6.3 (avatar tile, name + mono code badge, subtitle entity·group, description = first line of notes, tag pills from services/entity, meta column with `—` for absent fields, `+ Add Action` menu: Log Time (Task 16) / New Quote (Task 12) / Add Note → notes edit); Overview = 3-col grid with `StatutoryProfileTab` content reflowed (left: Contact Details + Missing Information; middle: Organization + Relationship History top 4; right: Next Action + Internal Notes + Tags). Other tabs render the existing wired components restyled. Seeded directors/contacts migrate into `client.contacts` (people-data.ts rehomed per Task 5).
- [ ] **Step 5: Verify** — typecheck/build/tests; manual: open MUS-875 in both themes; toggle a service checkbox → deadlines board reflects it (existing behavior intact); Missing Information lists empty contact fields with `Add` links.

### Task 5: Team view (People → staff only, design §6.3 + user clarification)

**Files:**
- Delete: `apps/web/src/components/views/PeopleView.tsx` → replaced by `apps/web/src/components/team/TeamView.tsx`
- Create: `apps/web/src/components/team/StaffDirectory.tsx`, `apps/web/src/components/team/staff-data.ts`
- Modify: `apps/web/src/context/PracticeStoreContext.tsx` (`PracticeUser` gains `contract?: { startDate?: ISODate; contractType: 'employee' | 'subcontractor'; hourlyRate?: number; phone?: string }`)
- Modify: `apps/web/src/components/people/people-data.ts` (director/contact seeds move to `client.contacts` — update CLIENTS seed in `packages/domain/src/data/seed.ts` if directors are seeded there)

**Interfaces:**
- Produces: `staffRows(staff: StaffMember[], users: PracticeUser[])` → dense table rows: Name, Role, Kind (employee/subcontractor badge), Contact (email/phone), Start date, Contract (type + hourly rate for subcontractors). Person profile reuses `ContactProfileLayout` (no statutory tabs).

**Steps:**
- [ ] **Step 1: Failing test** — `staffRows` returns only staff (no client directors); a subcontractor row includes hourly rate; `PracticeUser.contract` defaults to `{contractType: 'employee'}` on legacy-state merge.
- [ ] **Step 2: Run → FAIL. Step 3: Implement → PASS.**
- [ ] **Step 4: Implement view + directory** — Team page = `PageHeader` + staff table + invite action (existing `INVITE_TEAM_MEMBER`); row click → person profile (identity header, contact details, notes, tags — no statutory sections). Remove People from all navigation; verify no `people` ViewKey references remain (grep).
- [ ] **Step 5: Verify** — typecheck/build/tests; manual: Team lists 9 staff; MUS-875's Organization tab shows its directors from `contacts`.

### Task 6: Deadlines board restyle — 6 lanes, detail panel, keyboard, ad-hoc tasks

**Files:**
- Modify: `apps/web/src/components/deadlines/StatutoryActionModal.tsx` (`WORKFLOW_STATUSES` → 6: `'Not Started' | 'In Progress' | 'Awaiting Client' | 'Partner Review Gate' | 'Approved (Ready to Lodge)' | 'Submitted'`; `validateStatutorySubmission` unchanged semantics + new status accepted anywhere except gate rules)
- Modify: `apps/web/src/components/deadlines/DeadlinesKanban.tsx` (kanban-project-board anatomy)
- Create: `apps/web/src/components/deadlines/TaskDetailPanel.tsx` (status select, IRP6 outcome, assignee/due/labels rows, description, activity, comment box, keyboard-shortcut box; partner gate section)
- Create: `apps/web/src/components/kanban/KanbanBoard.tsx` (shared board: props `{ columns: KanbanColumn[], onMove(cardId, toColumn), onOpenCard, renderCard, keyboardEnabled, allowAdd? }`; keyboard: ←/→ move column, ↑/↓ reorder, 1–9 jump; blocked cards keep `Blocked:` banner after moves)
- Create: `apps/web/src/components/deadlines/ad-hoc.ts` + `AdHocTaskModal.tsx`
- Modify: `apps/web/src/context/PracticeStoreContext.tsx` (`adhocTasks`, actions `ADD_ADHOC_TASK`, `UPDATE_ADHOC_TASK`, `DELETE_ADHOC_TASK`, `LOG_ACTIVITY`)
- Test: `apps/web/src/components/deadlines/DeadlinesKanban.test.ts` (extend), `apps/web/src/components/kanban/kanban-logic.test.ts`

**Interfaces:**
- Produces: `KanbanBoard` above; `bucketWorkflowTasks` gains `awaitingClient` bucket (status `'Awaiting Client'`); `AdHocTask = { id, clientCode, description, assigneeId, dueDate?, status: WorkflowStatus, blockedReason?, createdAt }`; `moveAdhoc`/`moveStatutory` share `canMoveStatus(from: WorkflowStatus, to: WorkflowStatus): boolean` (forward/backward all allowed except: into `Partner Review Gate` only via `needsPartnerReview`, `Submitted` from gated lanes requires partner per existing validation; `Approved (Ready to Lodge)` requires partner sign-off for gated).

**Steps:**
- [ ] **Step 1: Failing tests** — (a) `WORKFLOW_STATUSES` equals the 6-lane array; (b) `canMoveStatus('Submitted','Not Started')` true but `canMoveStatus('In Progress','Partner Review Gate')` false for a non-gated task, true for an AFS task; (c) `KanbanBoard` source contains keyboard handler for `1`–`6` and `ArrowLeft/Right`; (d) ad-hoc task add/update/delete reducer round-trip persists.
- [ ] **Step 2: Run → FAIL. Steps 3–4: Implement store + logic + components → PASS.**
- [ ] **Step 5: Implement board UI** — 6 columns with dot+name+count+`+ Add` (add = `AdHocTaskModal` on deadlines board only); cards: client code, service, due + rollback tag, assignee avatar, urgency pill, partner-review badge, blocked (missing-data) cards red-tinted `ⓘ Blocked: {reason}`; click card → `TaskDetailPanel` (docked right); drag + menu + keyboard all call `canMoveStatus` first, illegal moves no-op with a toast-line feedback. Table view (`DeadlinesTable`) gains the `Awaiting Client` status + blocked styling.
- [ ] **Step 6: Verify** — typecheck/build/tests; manual: drag a VAT201 card to Submitted (allowed), AFS card to Approved → partner sign-off required; keyboard 1–6 works; blocked card moved between columns stays visibly blocked; both themes.

### Task 7: Inbox restyle (partner review queue)

**Files:**
- Modify: `apps/web/src/components/inbox/PartnerReviewQueue.tsx`, `apps/web/src/components/views/InboxView.tsx`

**Interfaces:** Consumes existing `filterReviewQueueTasks`, `updateTaskStatus`. No new symbols.

**Steps:**
- [ ] **Step 1: Restyle** — reference list anatomy (hairline rows, client/service/due columns, `Sign Off as CA(SA)` primary + `Request Revision` ghost per row; header keeps `N Pending Approvals` badge; empty state "Zero Returns Awaiting Partner Review" retained).
- [ ] **Step 2: Verify** — typecheck/build/tests; manual both themes; approve → task moves to `Approved (Ready to Lodge)` (existing behavior).

### Task 8: Settings restyle (normal settings UX, design §6.8)

**Files:**
- Modify: `apps/web/src/components/settings/SettingsView.tsx`
- Create: `apps/web/src/components/settings/panes/AppearancePane.tsx`, `NotificationsPane.tsx`, `IntegrationsPane.tsx` (wraps existing AiIntegrationsPane + Documenso/Xero credential placeholders from Task 11)
- Modify: `apps/web/src/components/settings/panes/TeamRbacPane.tsx` (staff + contract details fields)

**Steps:**
- [ ] **Step 1: Restructure** — grouped left nav: `Profile` | `Appearance` | `Team & Staff` | `Roles & Permissions` (pane arrives Task 20; render disabled-with-note until then — no, render the pane slot as "Available after roles update" is a stub; instead: leave the item out of nav in this task, add in Task 20) | `Practice Rules` (Service & Pricing Matrix, SA Public Holidays) | `Integrations` (Documenso/Xero/AI) | `Notifications`. Wire `PublicHolidaysPane` + `AiIntegrationsPane` (existing, unwired). Appearance = theme select (light/dark/system) driving the existing `isDark`/`document.documentElement.classList`.
- [ ] **Step 2: Verify** — typecheck/build/tests; manual: every settings pane reachable in both themes; theme select toggles canvas immediately; holiday pane edits persist.

### Task 9: Governance Log view (design §6.12, part 1)

**Files:**
- Create: `apps/web/src/components/govlog/GovernanceLogView.tsx` (replace Task 1 minimal file), `govlog/audit-log.ts`
- Modify: `apps/web/src/components/settings/panes/SaicaGovernanceLogPane.tsx` (deprecated → content moves; pane removed from Settings)
- Test: `apps/web/src/components/govlog/audit-log.test.ts`

**Interfaces:**
- Produces: `buildAuditEntries(state)` → `AuditEntry[]` `{ id, at, actorName, actorRole, action, subject, clientCode?, detail? }` derived from `taskStatusOverrides` (partner sign-offs, submissions), `activity`, and later quote/invoice/permission sources (extended Tasks 15, 21). Export: `exportAuditCsv(entries)` (no new deps) + PDF via existing pdf-lib.

**Steps:**
- [ ] **Step 1: Failing test** — overrides containing a `Submitted` task with `partnerSignOff` produce an entry with `actorName === approvedBy`, action `Submitted`, client code extracted; entries sorted desc by `at`; CSV export string contains the header row.
- [ ] **Step 2: Run → FAIL. Step 3: Implement → PASS.**
- [ ] **Step 4: Implement view** — read-only table (timestamp, actor, action, subject, client), filters (client, actor, action type), `Export CSV` / `Export PDF` buttons; auto-appends as actions fire (derived, not stored).
- [ ] **Step 5: Verify** — typecheck/build/tests; manual: sign off a task in Inbox → Governance Log shows the row; export CSV opens.

---

## Phase 2 — Quote → Invoice flow

### Task 10: Quote/Invoice entities, actions, leads migration (clean cutover)

**Files:**
- Modify: `apps/web/src/context/PracticeStoreContext.tsx`
- Create: `apps/web/src/lib/quote-lifecycle.ts`
- Modify: `apps/web/src/components/ai/assistant-engine.ts` (lead counts → open-quote counts)
- Delete: `apps/web/src/components/views/EstimatorView.tsx`, `apps/web/src/components/views/PipelineView.tsx`, `apps/web/src/components/pipeline/` (OnboardingPipeline, pipeline-data), `apps/web/src/components/estimator/SentQuotesPipeline.tsx` (keep `EstimateCalculator.tsx` — its form logic is rehomed into the quote builder in Task 12; move it to `components/quote/estimate-form.tsx` then)
- Test: `apps/web/src/lib/quote-lifecycle.test.ts`, `apps/web/src/context/PracticeStoreContext.test.ts` (extend)

**Interfaces:**
- Produces store types: `QuoteStage = 'Draft Quote' | 'Quote Sent' | 'Accepted' | 'Signed' | 'Active Client' | 'Closed Lost'`; `Quote = { id, number: 'Q-<seq>', clientCode?, prospect?: {name, contactPerson, entityType, turnover?, payroll?, employeeCount?, vatCategory?, yearEndMonth?, incorporationDate?, staffId?}, estimateInput: EstimateInput, monthlyRetainerHours, adHocHourlyRate, vatInclusive, paymentTerms, expiryDate?, stage, ownerStaffId, nextStep?, documensoEnvelopeId?, signedBy?, signedAt?, createdAt, updatedAt }`; `InvoiceStatus = 'Draft' | 'Sent' | 'Paid'`; `Invoice = { id, number: 'INV-<seq>', quoteId?, clientCode, lineItems: InvoiceLine[], taxRate: 0.15, subtotal, vat, total, status: InvoiceStatus, issueDate, dueDate, xeroSync?: 'pending'|'synced'|'failed', createdAt }`; `InvoiceLine = { id, description, quantity, unitAmount, accountCode?, taxType: 'OUTPUT2'|'NONE', lineAmount }`.
- Produces actions: `ADD_QUOTE`, `UPDATE_QUOTE` (fields incl. stage via `transitionQuote`), `ADD_INVOICE`, `UPDATE_INVOICE`, `MIGRATE_LEADS`, `LOG_ACTIVITY`.
- Produces `quote-lifecycle.ts`: `canTransitionQuote(from: QuoteStage, to: QuoteStage, ctx: {hasClient: boolean; hasFeeLines: boolean}): boolean` (rules from Review Focus 4); `nextQuoteNumber(seq) => 'Q-<seq+1>'`, `nextInvoiceNumber(seq) => 'INV-<seq+1>'`; `QUOTE_STAGE_ORDER`.
- Migration: on `LOAD_STATE`, if `state.leads` non-empty → map each to a Quote (stage map per design §6.4: `Lead|Discovery`→`Draft Quote`, `Estimate Sent`→`Quote Sent`, `KYC & Transfer`→`Accepted`, `Active Client`→`Active Client`; `estimatedMonthlyFee` → seed a single-line fee schedule + `monthlyRetainerHours` from fee / `adHocHourlyRate`; owner = partnerId), then set `leads: []`. Idempotent (second load: no leads → no-op).

**Steps:**
- [ ] **Step 1: Failing tests** — (a) `canTransitionQuote` full matrix incl. all illegal moves; (b) reducer: `MIGRATE_LEADS` converts the 4 legacy leads with correct stages and clears `leads`; loading the same legacy state twice yields the same 4 quotes (idempotent); (c) `nextQuoteNumber(0) === 'Q-1'`, `nextInvoiceNumber(0) === 'INV-1'`.
- [ ] **Step 2: Run → FAIL. Step 3: Implement store + lifecycle + migration + assistant-engine swap → PASS.**
- [ ] **Step 4: Delete legacy views/components; grep the tree for `PipelineView|EstimatorView|SentQuotesPipeline|OnboardingPipeline|ADD_LEAD|UPDATE_LEAD_STAGE|CONVERT_LEAD|leads` and remove every remaining reference (navigation, tests `FinalReviewFixes.test.ts`/`Estimator.test.ts` assertions rewritten to the new symbols, not kept as dead assertions). Extend the `Cmd+K` CommandDialog item list (built in `Layout.tsx`) to include quotes (by prospect/client name) and time entries (by client) alongside nav + clients.**
- [ ] **Step 5: Verify** — typecheck/build/tests green; manual: app loads with pre-existing localStorage from before → 4 quote cards appear in Sales Pipeline, no errors.

### Task 11: Integration layer + restyled dialogs (simulated, wire-ready)

**Files:**
- Create: `apps/web/src/lib/integrations/documenso.ts`, `apps/web/src/lib/integrations/xero.ts`
- Modify: `apps/web/src/components/integrations/DocumensoDispatchDialog.tsx`, `apps/web/src/components/integrations/XeroSyncDialog.tsx`
- Modify: `apps/web/src/components/settings/panes/IntegrationsPane.tsx` (credential placeholders: Documenso base URL + API key, Xero client id/secret + tenant — stored in `aiKeys`-style store field `integrationConfig`)

**Interfaces:**
- Produces: `documenso.ts`: `createDocumensoEnvelope(quote: Quote): { envelopeId: string; recipients: [{name,email,role:'SIGNER',signingOrder}]; sentAt: ISODate }` — simulated: returns `env-<random>` + timestamps, dual signer (client signatory from `prospect.contactPerson`/client + current user as countersigner), no network. `xero.ts`: `buildXeroDraftInvoicePayload(invoice: Invoice, client: Client): object` — exact `{Invoices:[{Type:'ACCREC', Status:'DRAFT', LineAmountTypes:'Exclusive', Contact:{Name}, LineItems:[{Description, Quantity, UnitAmount, AccountCode, TaxType:'OUTPUT2'|'NONE'}], Date, DueDate, Reference: invoice.number}]}` (reuses existing `buildXeroInvoiceDraft` logic); `simulateXeroSync(invoice): { xeroInvoiceId: string; status: 'synced'; at: ISODate }`.
- Consumes: `practiceRates`, `client` data. Restyled dialogs keep existing entry points (Documenso from quote builder Task 12; Xero from invoice Task 14).

**Steps:**
- [ ] **Step 1: Failing tests** — (a) `buildXeroDraftInvoicePayload` on an invoice with 2 lines: `Status: 'DRAFT'`, every taxable line `TaxType: 'OUTPUT2'`, CIPC line `'NONE'`, amounts exclusive and VAT added to `Total`; (b) `createDocumensoEnvelope` returns 2 recipients with `signingOrder` 1 and 2, roles `SIGNER`.
- [ ] **Step 2: Run → FAIL. Step 3: Implement → PASS.**
- [ ] **Step 4: Restyle dialogs to reference aesthetics (both themes); wire IntegrationsPane fields to `integrationConfig`.**
- [ ] **Step 5: Verify** — typecheck/build/tests; manual: open both dialogs, confirm payload preview renders in the Xero dialog.

### Task 12: Quote builder (design §6.4)

**Files:**
- Create: `apps/web/src/components/quote/QuoteBuilderView.tsx`, `quote/QuoteClientSelect.tsx`, `quote/QuoteScopeStep.tsx`, `quote/QuoteFeeScheduleStep.tsx`, `quote/QuoteDocumentPreview.tsx`
- Move + Modify: `apps/web/src/components/estimator/EstimateCalculator.tsx` → `apps/web/src/components/quote/estimate-form.tsx` (restore the dropped controls: schedule frequency per regular-work line (`monthly | with-each-vat | chosen-months`), directors count, provisional-taxpayer switch, start-month select, IRP6 outcome selector, hourly rate + March increase, `Reset to pricing bands` — all already supported by `EstimateInput`)
- Modify: `apps/web/src/App.tsx` (quote builder opened via store-level flag or a `quote-editor` pseudo-view state; simplest: `sales-pipeline` view hosts the builder as an overlay route — pick: builder renders inside `SalesPipelineView` when `editingQuoteId !== undefined`)

**Interfaces:**
- Consumes: `computeEstimate`, `EstimateInput`, `servicesFromEstimate`, `suggestedSelection` (domain); `ADD_QUOTE`/`UPDATE_QUOTE` + `transitionQuote` (Task 10); `createDocumensoEnvelope` (Task 11); `downloadPdfQuote`/`downloadExcelQuote` (existing exporters).
- Produces: quote editor with 3 left-pane steps (Client → Scope → Fee schedule) + right live `QuoteDocumentPreview` (logo, `Quote` + number, issue/expiry, Prepared for, grouped fee table, Subtotal/VAT 15%/Total, payment terms, notes, signature blocks). Buttons: `Save Draft` (ADD_QUOTE stage Draft), `Send Quote` (stage Quote Sent), `Mark Accepted` (Accepted), `Send for Signature` (Documenso dialog → stores `documensoEnvelopeId` + `signedBy`/`signedAt` → stage Signed), `Create Invoice` (Task 14, stage-gated to Accepted+), `Download PDF`/`Download Excel`. Existing-client mode: search-select populates fields + `estimateInput` from `savedEstimates[code]` + `defaultServices(client)` scope; prospect mode: blank + new-prospect fields (incl. `Close corporation` type option).

**Steps:**
- [ ] **Step 1: Failing test** — source-assertion: builder renders `QuoteScopeStep` with all 5 group labels (`Regular work`, `Compliance`, `Annual work`, `Recharges`, `Once-off setup`) and the restored controls (schedule frequency, directors, provisional, start month, IRP6 outcome) — pins the client-prototype requirements.
- [ ] **Step 2: Run → FAIL. Step 3: Implement editor + preview → PASS.**
- [ ] **Step 4: Wire stage transitions through `canTransitionQuote`; disabled states + reason tooltips on illegal buttons; `LOG_ACTIVITY` on every stage change.**
- [ ] **Step 5: Verify** — typecheck/build/tests; manual: create a prospect quote (Close corporation, VAT cat B, 14 staff, turnover R18.4M) → fee schedule matches `computeEstimate` output shown in dev console one-off; Save → Send → Accept → Sign; every button correctly gated; preview live-updates on edits; both themes.

### Task 13: Sales Pipeline view (design §6.7)

**Files:**
- Create: `apps/web/src/components/pipeline/SalesPipelineView.tsx` (replace Task 1 minimal), `pipeline/pipeline-logic.ts`, `pipeline/QuoteCard.tsx`, `pipeline/QuotesList.tsx`, `pipeline/InvoicesList.tsx`

**Interfaces:**
- Consumes: `KanbanBoard` (Task 6), `quotes`, `invoices`, `canTransitionQuote`.
- Produces: `pipelineStats(quotes, invoices)` → `{ booked: number; openValue: number; byStage: {stage, value, pct}[]; aging: {bucket, count}[] }` (booked = `Active Client` quotes' total; open = all non-lost, non-active; aging buckets 0–7/8–14/15–30/31+ days in stage, amber styling ≥15 via `ageDays(quote)`).

**Steps:**
- [ ] **Step 1: Failing tests** — `pipelineStats` on the 4 migrated quotes: booked/open separation correct; a `Closed Lost` quote excluded from open; aging bucket for a quote 20 days in `Quote Sent` lands in 15–30.
- [ ] **Step 2: Run → FAIL. Step 3: Implement → PASS.**
- [ ] **Step 4: Implement view** — eyebrow `SALES PIPELINE`, H1, `All time` filter + `+ New Quote` (opens builder); KPI pair (Booked / Open value, explicitly labeled); snapshot donut by stage; `KanbanBoard` with 6 quote-stage columns (header: name + `R total · n opps`), cards per §6.7 (company, monthly fee, owner avatar, next step, aging chip amber ≥15d, `Won` trophy chip on Active Client, `Lost` styling on Closed Lost); tabs `Pipeline | Quotes | Invoices`; Quotes = table register; Invoices = `InvoicesList` (number, client, total, status pill, age; row → invoice editor Task 14).
- [ ] **Step 5: Verify** — typecheck/build/tests; manual: drag card between legal stages; illegal drop rejected; keyboard moves work; both themes.

### Task 14: Invoice builder + statuses + Xero pane

**Files:**
- Create: `apps/web/src/components/invoice/InvoiceEditor.tsx`, `invoice/InvoiceDocumentPreview.tsx`, `invoice/invoice-logic.ts`
- Modify: `apps/web/src/components/pipeline/InvoicesList.tsx` (row click → editor)

**Interfaces:**
- Produces: `invoice-logic.ts`: `reconcileInvoice(lines, taxRate): {subtotal, vat, total}` cent-exact (sum lineAmount; VAT per taxable line; total = subtotal + vat; rounding half-up to cent, epsilon per domain `cents` helper); `computeInvoiceStatus(invoice, today): InvoiceStatus | 'Overdue'` (derived: Draft < today unaffected; Sent + due < today + not Paid → `'Overdue'` — display-only). `createInvoiceFromQuote(quote, month: string, seq)` → `Invoice` for the next unbilled month (lines = that month's fee lines; `INV-<seq+1>`; dueDate = payment terms from quote).

**Steps:**
- [ ] **Step 1: Failing tests** — `reconcileInvoice` on the reference example (2400+850+500 = 3750, VAT 375, total 4125); quantity change recomputes; discount line (negative `lineAmount`) included; `computeInvoiceStatus` derived Overdue case; `createInvoiceFromQuote` picks the month after the last invoiced one.
- [ ] **Step 2: Run → FAIL. Step 3: Implement → PASS.**
- [ ] **Step 4: Implement editor** — invoice-builder pattern: left form (client block read-only from quote/client; line items table Item/Description/Qty/Unit price/Amount + delete + `+ Add line`; tax rule fixed 15% w/ per-line `NONE` for CIPC; payment details: terms + method checkboxes; `Save`/`Send`/`Mark Paid`), right live `InvoiceDocumentPreview` (branded: logo, `Invoice` + number, issue/due, Bill to, line table, Subtotal/Tax/Total band, thank-you footer), draft vs sent visual distinction, `Push to Xero (draft)` pane → `buildXeroDraftInvoicePayload` preview + `simulateXeroSync` result. Status changes through `UPDATE_INVOICE` + `LOG_ACTIVITY`.
- [ ] **Step 5: Verify** — typecheck/build/tests; manual: accept→sign a quote, Create Invoice → editor opens with correct month lines; edit qty → totals reconcile; Send → Paid; Overdue pill appears when due date past; Xero pane shows the OUTPUT2 payload.

### Task 15: Quote→client conversion + domain services override

**Files:**
- Modify: `packages/domain/src/domain/types.ts` (`Client.services?: ServiceCode[]`), `packages/domain/src/domain/rules.ts` (`defaultServices(c)` → `c.services ?? derive`)
- Modify: `apps/web/src/context/PracticeStoreContext.tsx` (conversion action `CONVERT_QUOTE_TO_CLIENT` replacing old `CONVERT_LEAD` logic)
- Modify: `apps/web/src/components/client-show/tabs/StatutoryProfileTab.tsx` (service checkboxes write `client.services`)
- Modify: `apps/web/src/components/govlog/audit-log.ts` (append quote/invoice events)

**Interfaces:**
- Produces: `convertQuoteToClient(quote, existingClients, seqRules)` → creates Client (code via existing 3-letter+hash scheme, entity fields from prospect/`estimateInput`, `services: servicesFromEstimate(estimateInput)`, note "Added from a fee quote…"), sets `savedEstimates[code] = estimateInput`, stage → `Active Client`, `LOG_ACTIVITY`.

**Steps:**
- [ ] **Step 1: Failing tests** — (a) `defaultServices` returns the explicit list when `client.services` is set and the derived list otherwise (existing derivation unchanged for seeds); (b) conversion produces a client whose `services` equal `servicesFromEstimate(input)` and whose deadline generation (`generateTasks`) matches the toggled scope; (c) audit log gains a `Client created from quote` entry.
- [ ] **Step 2: Run → FAIL. Step 3: Implement → PASS.**
- [ ] **Step 4: Verify** — full `npm test` (domain tests must stay green — derivation fallback), typecheck/build; manual: convert a Signed prospect → client appears in register with the toggled services; deadlines board materializes only those tasks.

---

## Phase 3 — Time tracking

### Task 16: Time entries, timer, rounding

**Files:**
- Modify: `apps/web/src/context/PracticeStoreContext.tsx` (actions `ADD_TIME_ENTRY`, `UPDATE_TIME_ENTRY`, `DELETE_TIME_ENTRY`)
- Create: `apps/web/src/lib/billing.ts`
- Create: `apps/web/src/components/time/TimerBar.tsx` (topbar running-timer chip: client + elapsed, pause/stop)
- Modify: `apps/web/src/components/layout/Topbar.tsx` (mount TimerBar), `apps/web/src/components/deadlines/TaskDetailPanel.tsx` (Start timer), client `+ Add Action` (Log Time)
- Test: `apps/web/src/lib/billing.test.ts`

**Interfaces:**
- Produces: `billing.ts`: `roundToQuarterMinutes(minutes: number): number` (nearest 0.25h, half-up; min 15); `splitRetainerOverage(entries: {billableMinutes: number}[], allowanceHours: number, adHocRate: number): { coveredMinutes, overageMinutes, overageAmountZar }` (overage = max(0, Σbillable − allowance); amount = overageHours × rate, cents half-up); `TimeEntry` store type per design §6.10.

**Steps:**
- [ ] **Step 1: Failing tests** — `roundToQuarterMinutes(7) === 15`, `(23) === 30` (nearest), `(30) === 30`, `(0) === 15` (min clamp), `(53) === 60`; midnight-spanning entry durations computed from start/end timestamps; `splitRetainerOverage` with allowance 15h and 18h logged → 3h overage at R625 = R1875.00, with 12h logged → 0 overage.
- [ ] **Step 2: Run → FAIL. Step 3: Implement → PASS.**
- [ ] **Step 4: Implement timer UI** — TimerBar start/stop creates/edits an entry (rounding applied on stop; editable before save); topbar chip visible whenever an entry is running.
- [ ] **Step 5: Verify** — typecheck/build/tests; manual: start timer from a task panel, stop after ~7 min → entry shows 0.25h; entry editable; both themes.

### Task 17: Time view — Log + Report tabs (design §6.5)

**Files:**
- Create: `apps/web/src/components/time/TimeView.tsx` (replace Task 1 minimal), `time/Timesheet.tsx`, `time/TimeReport.tsx`, `time/time-report-logic.ts`
- Test: `apps/web/src/components/time/time-report-logic.test.ts`

**Interfaces:**
- Produces: `buildTimeReport(entries, range, filters: {client?, staff?, service?})` → `{ kpis: {total, billable, nonBillable, billablePct}, byClient: {clientCode, billable, nonBillable, total}[], byPersonTask: grouped rows, billableSplit: {billable, nonBillable} }` — all sums reconciled from underlying entries (never independently rounded); empty range → explicit empty state.

**Steps:**
- [ ] **Step 1: Failing tests** — report over 3 seeded-style entries: KPI totals equal entry sums (billable vs non-billable distinct); grouped rows reconcile to project totals; date filter excludes out-of-range entries; empty range → `null` totals, not zeros.
- [ ] **Step 2: Run → FAIL. Step 3: Implement → PASS.**
- [ ] **Step 4: Implement views** — Log tab: date filter, add/edit/delete entry rows (client select, service/task, duration or start/end, billable toggle, description); Report tab per reference anatomy (filters + Apply/Clear, 4 KPI cards, grouped expandable table, Time-by-Client bars, billable donut, Rounding Rules card `Round entries to 0.25h / Minimum entry 0.25h / Apply rounding Per entry`).
- [ ] **Step 5: Verify** — typecheck/build/tests; manual both themes; edit an entry → report reconciles.

### Task 18: Invoice time feed (retainer split → lines)

**Files:**
- Modify: `apps/web/src/components/invoice/InvoiceEditor.tsx` (`Add unbilled time` action + lines)
- Modify: `apps/web/src/lib/billing.ts` (`buildTimeInvoiceLines(clientCode, monthRange, entries, allowanceHours, adHocRate)`)

**Interfaces:**
- Produces: `buildTimeInvoiceLines(...)` → `InvoiceLine[]`: covered portion = no line (retainer fee line already on invoice); overage → one line `Description: 'Time overage — <month>'`, `Quantity: overageHours`, `UnitAmount: adHocRate`, `TaxType: 'OUTPUT2'`; entries marked `invoiceId` on save.

**Steps:**
- [ ] **Step 1: Failing test** — entries 18h vs 15h allowance → one overage line of 3h × R625; 12h → zero lines; after adding, entries carry the invoice id (billed flag).
- [ ] **Step 2: Run → FAIL. Step 3: Implement → PASS.**
- [ ] **Step 4: Wire into editor** — action lists the client's unbilled billable entries in the invoice month; confirm step shows the split; lines append + reconcile.
- [ ] **Step 5: Verify** — typecheck/build/tests; manual end-to-end: log 18h against an accepted client, create invoice, add unbilled time → 3h overage line appears with correct VAT; report still shows the entries.

---

## Phase 4 — Permissions & roles

### Task 19: Permission model + enforcement (design §6.8–6.9)

**Files:**
- Create: `apps/web/src/lib/permissions.ts`
- Modify: `apps/web/src/context/PracticeStoreContext.tsx` (`permissions`, actions `SET_PERMISSION`, `RESET_PERMISSIONS`; `PracticeUser.role` gains `'Support Tech'`)
- Modify enforcement call sites: `SettingsView`, `Sidebar`, `InboxView`, `DeadlinesKanban`/`TaskDetailPanel`, `TeamView`, `QuoteBuilderView`, `SalesPipelineView`, `InvoiceEditor`, `TimeView`, `GovernanceLogView` — replace `isPartnerOrAdmin` with `can(role, action)`
- Test: `apps/web/src/lib/permissions.test.ts`

**Interfaces:**
- Produces: `Role = 'Partner'|'Compliance Officer'|'Accountant'|'Team member'|'Subcontractor'|'Support Tech'`; `PermissionGroup = 'Clients'|'Deadlines & Tasks'|'Quotes & Invoices'|'Time'|'People'|'Settings'`; `PermissionCell = 'Allowed'|'Not allowed'|'Limited'|'Inherited'|'Custom'`; `DEFAULT_PERMISSION_MATRIX` = the §6.9 table verbatim (Support Tech column: People view/invite + Settings view/edit/manage + Governance log = Allowed; everything else `Not allowed`); `can(role, group, action, matrix = DEFAULT_PERMISSION_MATRIX): boolean` (`Limited` → false unless an `assigned`-scope check passes at the call site, which the call site supplies); `SIGN_OFF_LOCKED = true` and `canSignOff(role) = role === 'Partner'` (unchanged enforcement; matrix row for sign-off renders locked).
- `SET_PERMISSION({role, group, action, cell})` validates: role Partner cannot be downgraded below Allowed on Settings — manage permissions; locked rows reject; `LOG_ACTIVITY` on every change.

**Steps:**
- [ ] **Step 1: Failing tests** — (a) `can('Support Tech','Settings','manage') === true` and `can('Support Tech','Clients','view') === false` and `can('Support Tech','Invoices','view') === false`; (b) `can('Accountant','Settings','view') === false`; (c) `can('Accountant','Quotes & Invoices','send') === true`; (d) `SET_PERMISSION` on the locked sign-off row is rejected; (e) Partner downgrade attempt rejected.
- [ ] **Step 2: Run → FAIL. Step 3: Implement → PASS.**
- [ ] **Step 4: Replace enforcement** — every call site above uses `can()`; `PARTNER_REVIEW_REQUIRED` behavior verified unchanged; non-permitted sidebar items hidden (Support Tech sees only Settings + Governance Log + Team).
- [ ] **Step 5: Verify** — typecheck/build/tests; manual: switch current user (store user switcher) between roles; each role sees only its permitted nav and views; Support Tech opens the matrix (Task 20), an Accountant cannot open Settings.

### Task 20: Support Tech role + Roles & Permissions matrix UI

**Files:**
- Create: `apps/web/src/components/settings/panes/RolesPermissionsPane.tsx` (matrix per reference: legend, grouped rows, role columns, role-details panel, confirmation dialog)
- Modify: `apps/web/src/components/settings/SettingsView.tsx` (add `Roles & Permissions` nav item)
- Modify: `apps/web/functions/api/[[route]].ts` (`SEEDED_STAFF_ACCOUNTS` + one `support.tech@fdoncall.co.za` Support Tech account)
- Modify: `apps/web/src/components/settings/panes/TeamRbacPane.tsx` (`RBAC_ROLES` + Support Tech)

**Steps:**
- [ ] **Step 1: Failing test** — source-assertion: pane renders legend labels `Allowed`, `Not allowed`, `Limited`, `Inherited`, `Custom`; a toggle on a non-locked cell dispatches `SET_PERMISSION`; high-impact changes open the confirmation dialog whose body names the role + action (asserts the dialog text template contains both).
- [ ] **Step 2: Run → FAIL. Step 3: Implement pane + nav + seeds → PASS.**
- [ ] **Step 4: Implement matrix UX** — grouped rows (Clients / Deadlines & Tasks / Quotes & Invoices / Time / People / Settings), role columns with `Create Role` disabled (roles fixed); cell icons per legend; role-details panel (permission summary counts, custom toggles, info callout "Custom permissions override the inherited role settings for this role only"); confirmation dialog for high-impact changes with Cancel/Confirm; locked sign-off row shows lock marker.
- [ ] **Step 5: Verify** — typecheck/build/tests; manual both themes: log in as support.tech account (or switch user) → matrix editable; change a cell → confirmation names the change → saved; refresh persists.

### Task 21: Governance Log extension + client History trail

**Files:**
- Modify: `apps/web/src/components/govlog/audit-log.ts` (permission-change, quote, invoice, time sources)
- Modify: `apps/web/src/components/client-show/panels/RelationshipHistoryPanel.tsx` + `ClientShowView` History tab (trail filtered to client)

**Steps:**
- [ ] **Step 1: Failing test** — audit entries include a permission change (`actor`, `action: 'Changed permission'`, detail names role + permission) and a quote stage change; client-filtered trail returns only that client's events.
- [ ] **Step 2: Run → FAIL. Step 3: Implement → PASS.**
- [ ] **Step 4: Verify** — typecheck/build/tests; manual: change a permission → Governance Log row appears; MUS-875 History tab shows its filings/sign-offs/quotes only.

### Task 22: Final integration pass, polish, docs

**Files:**
- Modify: Home `RecentWorkCard`/`TeamActivityCard` wiring to live store data; final both-theme sweep of every screen (impeccable craft floor: focus rings, selection tint, scrollbars, hairlines, tabular numerals)
- Modify: `apps/web/src/components/views/DashboardView.tsx` remove now-dead code paths flagged during earlier tasks
- Create: `docs/superpowers/specs/2026-11-09-crm-redesign-design.md` (copy of `local://2026-11-09-crm-redesign-design.md`) and `docs/superpowers/plans/2026-11-09-crm-redesign.md` (this plan)
- Modify: `README.md` or `HANDOFF.md` — one-line feature additions (quotes/invoices, time tracking, permissions, governance log)

**Steps:**
- [ ] **Step 1:** grep for any remaining references to removed symbols (`leads`, `EstimatorView`, `people`, `isPartnerOrAdmin`) → clean up.
- [ ] **Step 2:** Run full verification suite (§Verification) once, dark + light walk of all 11 views.
- [ ] **Step 3:** Commit design doc + plan into `docs/superpowers/`.

## Store types (referenced across tasks; defined once in Task 1/10/16/19)

`QuoteStage`, `Quote`, `Invoice`, `InvoiceLine`, `InvoiceStatus`, `TimeEntry`, `AdHocTask`, `PermissionState`, `Role`, `ActivityEvent { id, type, actorName, actorInitials, tint, text, subline, at }` — exact shapes as pinned in Tasks 10, 16, 19 above.

## Verification (end-to-end)

All commands from repo root `/home/hein/Projects/CRMv2`. Prerequisites: `npm install` done; `npm run dev` (port 3000, Vite).

1. **Per task:** `npm test`, `npm run typecheck`, `npm run build` green; manual walk listed in each task's last step.
2. **Phase 1 complete:** `localStorage.clear()` → reload → all 9 sidebar views render in dark + light with no console errors; legacy localStorage (with old leads) still loads.
3. **Phase 2 complete:** quote journey: New Quote → scope (all 5 groups) → fee schedule (VAT/cent reconciliation matches `computeEstimate` output) → Save Draft → Send → Accept → Sign (Documenso record) → Create Invoice → `INV-001` correct totals → Send → Mark Paid; `Closed Lost` from Draft allowed, from Signed rejected; Xero pane shows `ACCREC`/`DRAFT`/`OUTPUT2` payload; Sales Pipeline KPIs Booked vs Open correct.
4. **Phase 3 complete:** timer start/stop → 7 min → 0.25h; report totals reconcile; 18h vs 15h retainer → 3h overage line at R625 with 15% VAT on an invoice; midnight-spanning entry correct.
5. **Phase 4 complete:** Support Tech account opens matrix, changes a cell with named confirmation; Accountant cannot open Settings; locked sign-off row uneditable; `PARTNER_REVIEW_REQUIRED` regression passes; Governance Log rows for sign-off + permission change; CSV export.
6. **Regression:** PDF/Excel quote exports download; Cmd+K navigates; division switcher works; AI assistant drawer opens; SA holiday rollback tags render on deadlines.

## Assumptions & contingencies

- **localStorage merge:** persisted states from before this plan must merge cleanly (defaults for new fields, migrations for `leads`). If a field shape differs from what's pinned here, follow the migration-in-load pattern (Task 1/10) rather than breaking old state.
- **`EstimateInput` supports all restored controls** (verified by builder check): if any control is found missing during Task 12, add it as an optional field to `EstimateInput` in `packages/domain/src/domain/estimate.ts` with `computeEstimate` defaulting to today's behavior — never fork the engine.
- **Client contact/contract data:** seeds lack email/phone; the design handles absence via Missing Information. If the user supplies real contact data mid-build, it keys into the optional fields defined in Task 4.
- **Support Tech scope:** §6.9 matrix is the source of truth; if the user later wants Support Tech to see practice data, it's a matrix edit (Task 20), not a code change.
- **Sign-off authority (PRD Q2.5):** stays Partner-only (locked row) until the partners answer; lifting the lock is a follow-up touching only `permissions.ts` + the matrix UI.
- **Real Documenso/Xero wiring:** out of scope here; the integration layer (Task 11) is the drop-in seam. If credentials arrive mid-build, swap the simulated implementations — no UI changes.

---

## Appendix — Known limitations & open product decisions (post-implementation, 2026-11-09)

Recorded during the Task 22 integration pass. Each item works as described; each needs a
product decision before it changes. None is a defect to "fix" silently.

1. **Quote visibility vs. billing permission.** The §6.9 matrix grants *Team member* →
   `Quotes & Invoices — view/create/send = Allowed` while `Clients — view billing = Not allowed`.
   A Team member therefore sees fees in Sales Pipeline cards and KPIs and can run the quote
   PDF/Excel exports even though the client record's billing detail stays hidden. Aligning the
   two rows is a matrix edit (Roles & Permissions) plus a partner decision on whether fee
   visibility is client record detail or quote working data.
2. **`Mark Paid` is reachable from `Draft`.** Invoices carry no pinned transition rule
   (`Draft → Sent → Paid` is a UI affordance, not a guard), so a partner can record payment on a
   draft. Intentional: the practice sometimes receives payment before the invoice is posted to
   Xero. Pin the rule if audit wants a strict sequence.
3. **Audit dedupe collapses genuine re-submissions.** Governance Log entries are derived, and
   submissions key on `submission:<taskId>`, so a second, genuinely distinct re-submission of the
   same statutory task replaces rather than adds to the first milestone. Consistently,
   re-completing an already-`Submitted` Home task is a silent no-op. No legacy backfill exists
   for submissions recorded before the log.
4. **Partner sign-off milestone disappears at `Submitted`.** `PartnerReviewQueue` writes no
   activity event; the sign-off row in the Governance Log is derived from the task's override
   (`partnerSignOff`), so once the task reaches `Submitted` the sign-off milestone is no longer
   distinguishable from the submission. Adding a dedicated sign-off activity event (and audit
   source) fixes it; that is a data-model decision, not a restyle.
5. **Invoice billing month is inferred.** `Invoice` has no month field: the month, and therefore
   the retainer period a credit or overage belongs to, is derived from `issueDate`. The month
   select is inert on a saved invoice. A real billing-period field is needed before invoices can
   be raised for a month that differs from their issue date.
6. **The running timer is session-only.** Elapsed time survives pause/resume inside the session
   but is not persisted; a reload discards an unfinished timer (completed entries are persisted).
   Persisting it means a timestamped open-segment record — decide whether abandoned segments
   should be auto-discarded or offered for editing on return.
7. **Sign-off authority stays Partner-only** (locked matrix row, PRD Q2.5 unanswered). Lifting it
   touches only `lib/permissions.ts` and the matrix UI.
8. **Documenso and Xero are simulated seams.** `lib/integrations/{documenso,xero}.ts` produce the
   real payload shapes (`ACCREC`/`DRAFT`/`OUTPUT2`, dual-signer envelopes) with no network calls;
   swapping in live credentials requires no UI change.

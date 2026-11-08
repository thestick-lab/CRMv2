# Unified Practice Operations, Governance & Linear Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the Unified Operations Command Center for FD on Call CRM: streamlined sidebar with left collapse toggle and horizontal icon utility bar (`Home`, `Inbox`, `Settings`), interactive Client Record configuration (`Details` & `Services`), dense `People` directory table, Linear-style `Deadlines` board with live KPI filtering, dedicated Partner Review Queue (`/inbox`), 2-tab Unified `Fee Estimator & Quotes` (`/estimator`), and Twenty-CRM-style Admin Settings with editable pricing matrix and immutable SAICA Governance Log.

**Architecture:** Lightweight React context (`PracticeStoreContext`) managing cross-view reactivity, pure mathematical domain rules from `packages/domain`, native HTML5 drag-and-drop, standard Radix UI primitives with Tailwind CSS v4, and TanStack Table for dense operational registers.

**Tech Stack:** React 19, Vite 7, Tailwind CSS v4, shadcn/ui (Radix primitives), TanStack Table, Lucide React, TypeScript 5.8+, `packages/domain`.

**Spec:** `docs/superpowers/specs/2026-11-08-unified-operations-and-governance-design.md`, `PRODUCT.md`, `DESIGN.md`.

## Global Constraints

- Follow Ponytail principles: minimal code, standard React state and Radix primitives; zero unnecessary state libraries.
- Respect Impeccable Craft Floor: no kickers/eyebrows, hairline borders (`border border-border/80`), tabular monospace numerals (`font-mono font-tnum`) for currency, dates, and client codes (`ALC-610`).
- Sidebar collapse must align to 56px with zero element overlap.
- People directory must maintain relational integrity with client codes (`companyLinks`).
- Only CA(SA) Partners (`Erik` / `Wouter`) can sign off Partner Review Gates (`needsPartnerReview: true`).
- SAICA Governance Log must be an immutable audit log recording partner sign-offs and SARS eFiling confirmation numbers.

## Review Focus

1. **Option A Two-Step Partner Sign-off Lifecycle:** Tasks in `Partner Review Gate` can be signed off in `/inbox` by Partners to advance to `Approved (Ready to Lodge)`, followed by accountant SARS lodgment entering the confirmation number to write the SAICA Governance Log.
2. **Estimator Deep State Synchronization:** Estimator inputs (hours, recharges, frequency, start month) persist to `savedEstimates[code]` and update client monthly retainers across views.
3. **Responsive Client & People Tables:** No horizontal text clipping on smaller viewports; tables scroll horizontally with sticky headers.
4. **Live Interactive KPI Filter Chips:** Clicking KPI cards on the Deadlines board immediately filters the Kanban and Table views.
5. **Role-Gated Admin Settings:** Technicians and Founders have access to the Admin Panel (`Service & Pricing Matrix`, `SAICA Governance Log`, and `Staff Management`), while standard accountants see User Settings.

---

### Task 1: Streamlined Sidebar, Header Collapse Toggle & Horizontal Icon Utility Bar

**Files:**
- Modify: `apps/web/src/components/layout/Sidebar.tsx`
- Modify: `apps/web/src/components/layout/WorkspaceMenuPopover.tsx`
- Modify: `apps/web/src/components/ui/user-popover.tsx`
- Modify: `apps/web/src/components/layout/navigation-helpers.ts`
- Test: `apps/web/src/components/layout/Sidebar.test.ts`

**Interfaces:**
- Consumes: `usePracticeStore()` (`currentUser`, `division`, `taskStatusOverrides`)
- Produces: Sidebar with left collapse button, horizontal icon bar (`Home`, `Inbox`, `Settings`) with hover tooltips and unread badge, and 4 primary navigation items (`Clients`, `People`, `Deadlines`, `Fee Estimator & Quotes`).

- [ ] **Step 1: Write test for new sidebar layout and horizontal icon bar**

Test that Sidebar renders `PanelLeftClose` on the left, horizontal icon bar for `Home`, `Inbox` (with unread badge), and `Settings`, simplified workspace menu without clutter, and the 4 primary register items.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test --workspace=@crmv2/web`
Expected: FAIL.

- [ ] **Step 3: Update `Sidebar.tsx`, `WorkspaceMenuPopover.tsx`, `UserPopover.tsx`, and `navigation-helpers.ts`**

Implement left collapse toggle, horizontal icon utility bar, clean workspace popover (division switcher only), clean footer user popover with SAICA Governance Log trigger, and 4 primary sidebar links.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test --workspace=@crmv2/web`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web
git commit -m "feat(web): streamline sidebar header, horizontal icon bar, and clean user popover"
```

---

### Task 2: Interactive Client Record (`/clients/:code`) — Details & Services Config

**Files:**
- Modify: `apps/web/src/components/client-show/ClientShowView.tsx`
- Modify: `apps/web/src/components/client-show/tabs/StatutoryProfileTab.tsx`
- Test: `apps/web/src/components/client-show/tabs/StatutoryProfileTab.test.ts`

**Interfaces:**
- Consumes: `usePracticeStore()` (`clients`, `updateClientDetails`, `updateClientServices`)
- Produces: Interactive Client Record with editable `Details` card (FYE, Inc Date, Turnover + Year + Source, VAT, Payroll, eFiling profile) and `Services` checkboxes (7 statutory returns) that live-toggle compliance deadlines, plus `[View Client Deadlines ➔]` deep link.

- [ ] **Step 1: Write test for interactive Details and Services switches**

Verify changing FYE, turnover, VAT switch, and statutory services checkboxes updates the client record and triggers deadline recalculation.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test --workspace=@crmv2/web`
Expected: FAIL.

- [ ] **Step 3: Implement interactive `Details` and `Services` cards in `StatutoryProfileTab.tsx` and `ClientShowView.tsx`**

Port form inputs and switches from domain prototype, wire state mutations to `usePracticeStore()`, and add deep-link button to Deadlines board.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test --workspace=@crmv2/web`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web
git commit -m "feat(web): implement interactive client details, statutory service switches, and deadline deep link"
```

---

### Task 3: People Register Table (`/people`) with RBAC Edit Restrictions

**Files:**
- Modify: `apps/web/src/components/people/PeopleDirectory.tsx`
- Modify: `apps/web/src/components/people/people-data.ts`
- Test: `apps/web/src/components/people/people-data.test.ts`

**Interfaces:**
- Consumes: `usePracticeStore()` (`currentUser`, `clients`)
- Produces: Clean TanStack Table of Client Directors and Key Contacts with search, company code pills (`ALC-610`), and role-gated `[+ Add Director]` modal for Partners/Admin.

- [ ] **Step 1: Write test for People TanStack Table rendering and RBAC gate**

Verify People view renders tabular layout with Name, ID/Passport, Email, Phone, Role/Title, and Linked Company code, and restricts add/edit actions to Partners.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test --workspace=@crmv2/web`
Expected: FAIL.

- [ ] **Step 3: Update `PeopleDirectory.tsx` and `people-data.ts`**

Replace card grid with responsive TanStack Table, add search filter bar, and implement role-gated `[+ Add Contact]` modal.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test --workspace=@crmv2/web`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web
git commit -m "feat(web): convert people directory to dense tanstack table with rbac edit restrictions"
```

---

### Task 4: Linear-Style Deadlines Board & 2-Step Statutory Action Modal

**Files:**
- Modify: `apps/web/src/components/deadlines/DeadlinesKanban.tsx`
- Modify: `apps/web/src/components/deadlines/DeadlinesDashboard.tsx`
- Modify: `apps/web/src/components/deadlines/StatutoryActionModal.tsx`
- Test: `apps/web/src/components/deadlines/StatutoryActionModal.test.ts`

**Interfaces:**
- Consumes: `usePracticeStore()` (`taskStatusOverrides`, `updateTaskStatus`, `currentUser`)
- Produces: 5-lane Kanban board (`Not Started` ➔ `In Progress` ➔ `Partner Review Gate` ➔ `Approved (Ready to Lodge)` ➔ `Submitted`), interactive live KPI filter buttons, Linear-style assignee reassignment, and Action Modal supporting Option A two-step partner sign-off.

- [ ] **Step 1: Write test for 5-lane workflow, KPI card filtering, and Option A sign-off sequence**

Verify tasks move from `Partner Review Gate` to `Approved (Ready to Lodge)` on Partner approval, and to `Submitted` when the SARS reference is entered.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test --workspace=@crmv2/web`
Expected: FAIL.

- [ ] **Step 3: Update `DeadlinesKanban.tsx`, `DeadlinesDashboard.tsx`, and `StatutoryActionModal.tsx`**

Add the `Approved (Ready to Lodge)` workflow lane, wire KPI cards as live click-to-filter triggers, add assignee avatar picker, and implement Option A sign-off logic in the modal.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test --workspace=@crmv2/web`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web
git commit -m "feat(web): implement linear-style deadlines kanban, live kpi filters, and 2-step partner sign-off"
```

---

### Task 5: Partner Review Queue (`/inbox`)

**Files:**
- Create: `apps/web/src/components/views/InboxView.tsx`
- Create: `apps/web/src/components/inbox/PartnerReviewQueue.tsx`
- Test: `apps/web/src/components/inbox/PartnerReviewQueue.test.ts`

**Interfaces:**
- Consumes: `usePracticeStore()` (`tasks`, `taskStatusOverrides`, `currentUser`, `updateTaskStatus`)
- Produces: `<InboxView onNavigate={...} />` providing centralized review queue for Partners with 1-click `[Sign Off as CA(SA)]` and `[Request Changes]`.

- [ ] **Step 1: Write test for Partner Review Queue data filtering and sign-off actions**

Test that `/inbox` filters practice tasks to only returns in `Partner Review Gate` (`AFS`, `ITR14`, payable `IRP6`), and clicking approve stamps partner signature and advances task to `Approved (Ready to Lodge)`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test --workspace=@crmv2/web`
Expected: FAIL.

- [ ] **Step 3: Implement `PartnerReviewQueue.tsx` and `InboxView.tsx`**

Build table and card view of pending review items with client context, draft calculations, review gate sign-off button, and rejection notes.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test --workspace=@crmv2/web`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web
git commit -m "feat(web): implement partner review queue inbox with statutory sign-off actions"
```

---

### Task 6: Unified Fee Estimator & Sent Quotes Pipeline (`/estimator`)

**Files:**
- Create: `apps/web/src/components/views/EstimatorView.tsx`
- Create: `apps/web/src/components/estimator/EstimateCalculator.tsx`
- Create: `apps/web/src/components/estimator/SentQuotesPipeline.tsx`
- Modify: `apps/web/src/context/PracticeStoreContext.tsx`
- Test: `apps/web/src/components/estimator/Estimator.test.ts`

**Interfaces:**
- Consumes: `usePracticeStore()`, `packages/domain/src/domain/estimate.ts`
- Produces: `<EstimatorView />` with Tab 1 (`Estimate Calculator` supporting Existing Clients & New Prospects with PDF/Excel/SLA export) and Tab 2 (`Sent Quotes & Onboarding` tracking proposals to active client conversion).

- [ ] **Step 1: Write test for unified estimator calculator and sent quotes pipeline**

Test calculation for existing client vs prospect, PDF/Excel generation triggers, Documenso SLA dispatch, and lead-to-client conversion syncing all quoted parameters.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test --workspace=@crmv2/web`
Expected: FAIL.

- [ ] **Step 3: Implement `EstimateCalculator.tsx`, `SentQuotesPipeline.tsx`, and `EstimatorView.tsx`**

Build the 2-tab view with all form controls from domain prototype, 12-month schedule chart, export dialogs, and quote lifecycle pipeline.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test --workspace=@crmv2/web`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web
git commit -m "feat(web): implement unified fee estimator calculator and sent quotes onboarding pipeline"
```

---

### Task 7: Twenty-CRM Style Settings, Pricing Matrix & SAICA Governance Log

**Files:**
- Modify: `apps/web/src/components/settings/SettingsView.tsx`
- Create: `apps/web/src/components/settings/panes/ServicePricingMatrixPane.tsx`
- Create: `apps/web/src/components/settings/panes/SaicaGovernanceLogPane.tsx`
- Modify: `apps/web/src/components/settings/panes/TeamRbacPane.tsx`
- Test: `apps/web/src/components/settings/Settings.test.ts`

**Interfaces:**
- Consumes: `usePracticeStore()` (`rates`, `staff`, `saicaGovernanceLog`, `updateRates`)
- Produces: Twenty-CRM settings hierarchy with User profile (password change), Workspace AI, and Admin Panel (Staff DB, Service Catalogue & Pricing Matrix with SARS season sync, and immutable SAICA Governance Log with PDF/CSV export).

- [ ] **Step 1: Write test for Admin Pricing Matrix, SARS sync, and SAICA Governance Log generation**

Verify Admin settings pane visibility, fee matrix edits, SARS season sync from domain, and immutable log recording on task lodgment.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test --workspace=@crmv2/web`
Expected: FAIL.

- [ ] **Step 3: Implement `ServicePricingMatrixPane.tsx`, `SaicaGovernanceLogPane.tsx`, and update `SettingsView.tsx`**

Build the 3-section settings layout (`User`, `Workspace`, `Admin`), editable pricing matrix, SARS filing season sync, and immutable SAICA audit table.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test --workspace=@crmv2/web`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web
git commit -m "feat(web): implement twenty-style settings, service pricing matrix, and saica governance log"
```

---

### Task 8: End-to-End View Integration, Full Suite Verification & Impeccable Check

**Files:**
- Modify: `apps/web/src/App.tsx`
- Modify: `apps/web/src/components/layout/navigation-helpers.ts`
- Modify: `apps/web/src/App.test.ts`

**Interfaces:**
- Consumes: All views and `PracticeStoreProvider`
- Produces: Complete working, clickable application with zero blank screens or placeholder fallbacks.

- [ ] **Step 1: Update `App.tsx` and `navigation-helpers.ts` to wire all routes**

Wire `/inbox` (`InboxView`), `/estimator` (`EstimatorView`), `/clients`, `/people`, `/deadlines`, and `/settings`.

- [ ] **Step 2: Run full test suite, typecheck, and build**

Run: `npm test && npm run typecheck && npm run build`
Expected: PASS with 0 errors.

- [ ] **Step 3: Run Impeccable craft detector on all modified UI files**

Run: `.agents/skills/impeccable/scripts/impeccable detect --json apps/web/src/**/*.tsx`
Expected: Clean check (zero violations).

- [ ] **Step 4: Verify in live browser via screenshot**

Capture live browser screenshots of `/inbox`, `/estimator`, `/clients`, `/people`, `/deadlines`, and `/settings`.

- [ ] **Step 5: Update `HANDOFF.md` checklist and commit**

```bash
git add .
git commit -m "feat: complete unified practice operations, governance, and linear workflow"
```

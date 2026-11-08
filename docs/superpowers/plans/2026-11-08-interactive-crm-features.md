# Interactive CRM Features, Settings, RBAC & AI Copilot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the centralized reactive `PracticeStore`, fix the collapsed sidebar header layout bug, add the translucent glass workspace menu, build the relational People & Directors directory (`/people`), 5-Stage Drag-and-Drop Onboarding Pipeline (`/pipeline`), interactive Deadlines Kanban with Statutory Action Modal (`/deadlines`), and comprehensive two-pane Settings with Team RBAC, SA Public Holidays Gazette, and AI Practice Assistant (Vercel AI SDK).

**Architecture:** A lightweight React context `PracticeStoreContext` in `apps/web/src/context/` providing cross-view reactivity and `localStorage` persistence. Views and components leverage Ponytail minimalism with native HTML5 drag-and-drop, standard Radix dialog/popover primitives, and pure TypeScript statutory rules from `packages/domain`.

**Tech Stack:** React 19, Vite 7, Tailwind CSS v4, Lucide React, Radix UI primitives, Vercel AI SDK (`ai`), `packages/domain`.

**Spec:** `docs/superpowers/specs/2026-11-08-interactive-crm-features-design.md`, `PRODUCT.md`, and `DESIGN.md`.

## Global Constraints

- Follow Ponytail principles: minimal code, zero redundant state management or custom table wrappers; use standard React context and native HTML5 drag-and-drop.
- Respect Impeccable Craft Floor: no kickers/eyebrows, single-declaration hairline elevation, tabular monospace numerals (`font-mono font-tnum`) for dates and client codes.
- Collapsed sidebar (56px) must have zero element overlap.
- People & Directors must remain normalized: `people` stores individuals, `companyLinks` links them to client codes (`ALC-610`, `MUS-875`).
- Onboarding pipeline must support dragging leads across the 5 stages (`Lead`, `Discovery`, `Estimate Sent`, `KYC & Transfer`, `Active Client`) and converting to a practice client.
- Deadlines board must support dragging tasks and double-clicking to open the Statutory Action Modal.
- Settings must provide two-pane layout with Profile (data export/deletion), Team RBAC invites, SA Public Holidays 2026/2027 Gazette, and AI provider key configuration + Vercel AI SDK practice assistant.

## Review Focus

1. **State Persistence & Cross-View Reactivity:** Actions in `/pipeline` (converting a prospect) or `/settings` (updating rates/team) immediately reflect across `/clients`, `/people`, and `/deadlines`.
2. **Sidebar Header Bug Resolution:** The collapsed 56px sidebar header displays the centered logo without overlapping the collapse toggle.
3. **Drag & Drop Status Transitions:** Cards can be dragged between Kanban columns smoothly without layout glitches.
4. **Double-Click Action Modal & Review Gate Sign-off:** Double-clicking cards opens the action modal; only `Partner` role can sign off partner review gates.
5. **AI Assistant & Provider Integration:** Copilot drawer opens via topbar icon and answers queries using practice data or user API keys.

---

### Task 1: Centralized Practice Store & LocalStorage Persistence

**Files:**
- Create: `apps/web/src/context/PracticeStoreContext.tsx`
- Test: `apps/web/src/context/PracticeStoreContext.test.ts`

**Interfaces:**
- Consumes: `CLIENTS`, `STAFF`, `packages/domain`
- Produces: `usePracticeStore()` hook providing `clients`, `staff`, `leads`, `currentUser`, `rates`, `aiKeys`, `addClient`, `convertLead`, `updateTaskStatus`, `updateRates`, `inviteTeamMember`, `exportData`, `resetData`.

- [ ] **Step 1: Write test for PracticeStore state initialization and actions**

Test that store hydrates with 13 clients, 9 staff, default pipeline leads, and that `convertLead` creates a new client record.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test --workspace=@crmv2/web`
Expected: FAIL.

- [ ] **Step 3: Implement `PracticeStoreContext.tsx`**

Implement store with `localStorage` persistence, initial seed data, and reducer/handlers for all practice mutations.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test --workspace=@crmv2/web`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web
git commit -m "feat(web): implement centralized practice store with localstorage persistence"
```

---

### Task 2: Sidebar Collapsed Bug Fix, Brand Logo & Translucent Workspace Popover

**Files:**
- Modify: `apps/web/src/components/layout/Sidebar.tsx`
- Create: `apps/web/src/components/layout/WorkspaceMenuPopover.tsx`
- Test: `apps/web/src/components/layout/Sidebar.test.ts`

**Interfaces:**
- Consumes: `PracticeStoreContext`, `fd-on-call-logo.png`, `accountant-on-call-logo.png`
- Produces: Overlap-free collapsed sidebar (56px) and translucent glass workspace dropdown menu.

- [ ] **Step 1: Write test for collapsed sidebar header rendering and workspace popover**

Verify header renders centered logo mark in collapsed mode and triggers expand on click with zero overlap.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test --workspace=@crmv2/web`
Expected: FAIL.

- [ ] **Step 3: Implement `WorkspaceMenuPopover.tsx` and update `Sidebar.tsx`**

Replace square text mark with brand image asset, fix collapsed header layout, and attach translucent glass workspace menu.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test --workspace=@crmv2/web`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web
git commit -m "fix(web): resolve collapsed sidebar header overlap and add workspace glass menu"
```

---

### Task 3: People & Directors Relational Directory (`/people`)

**Files:**
- Create: `apps/web/src/components/people/people-data.ts`
- Create: `apps/web/src/components/people/PeopleDirectory.tsx`
- Create: `apps/web/src/components/views/PeopleView.tsx`
- Test: `apps/web/src/components/people/people-data.test.ts`

**Interfaces:**
- Consumes: `PracticeStoreContext`
- Produces: `<PeopleView onNavigateClient={(code) => ...} />`.

- [ ] **Step 1: Write test for people relational mapping**

Verify 18 profiles (9 staff, 9 directors) are built with linked companies (`ALC-610`, `MUS-875`, etc.).

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test --workspace=@crmv2/web`
Expected: FAIL.

- [ ] **Step 3: Implement `people-data.ts`, `PeopleDirectory.tsx`, and `PeopleView.tsx`**

Build directory with `All`, `Practice Staff`, and `Client Directors` filter tabs, search input, and company click-through links.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test --workspace=@crmv2/web`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web
git commit -m "feat(web): implement people and directors relational directory"
```

---

### Task 4: 5-Stage Onboarding Pipeline with Drag & Drop (`/pipeline`)

**Files:**
- Create: `apps/web/src/components/pipeline/pipeline-data.ts`
- Create: `apps/web/src/components/pipeline/OnboardingPipeline.tsx`
- Create: `apps/web/src/components/views/PipelineView.tsx`
- Test: `apps/web/src/components/pipeline/pipeline.test.ts`

**Interfaces:**
- Consumes: `PracticeStoreContext`
- Produces: `<PipelineView onConvertClient={(code) => ...} />`.

- [ ] **Step 1: Write test for pipeline stages and prospect stage transitions**

Test that leads can transition between stages and `convertLead` triggers client creation.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test --workspace=@crmv2/web`
Expected: FAIL.

- [ ] **Step 3: Implement `OnboardingPipeline.tsx` with HTML5 Drag & Drop and New Lead Modal**

Build 5-column Kanban board with deal values, card dragging, and convert actions.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test --workspace=@crmv2/web`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web
git commit -m "feat(web): implement 5-stage onboarding pipeline with drag and drop"
```

---

### Task 5: Interactive Deadlines Kanban & Statutory Action Modal (`/deadlines`)

**Files:**
- Create: `apps/web/src/components/deadlines/StatutoryActionModal.tsx`
- Modify: `apps/web/src/components/deadlines/DeadlinesKanban.tsx`
- Modify: `apps/web/src/components/deadlines/DeadlinesDashboard.tsx`
- Test: `apps/web/src/components/deadlines/StatutoryActionModal.test.ts`

**Interfaces:**
- Consumes: `PracticeStoreContext`, `PracticeTaskItem`
- Produces: Interactive Kanban with card drag-and-drop across status lanes and double-click action modal.

- [ ] **Step 1: Write test for StatutoryActionModal and task status progression**

Verify modal accepts SARS confirmation numbers and handles partner sign-off gate overrides.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test --workspace=@crmv2/web`
Expected: FAIL.

- [ ] **Step 3: Implement `StatutoryActionModal.tsx` and wire drag-and-drop into `DeadlinesKanban.tsx`**

Add HTML5 card dragging across status lanes and double-click action modal trigger.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test --workspace=@crmv2/web`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web
git commit -m "feat(web): add interactive card drag and drop and statutory action modal"
```

---

### Task 6: Two-Pane Settings (Profile, Team RBAC, SA Holidays Gazette, AI Copilot)

**Files:**
- Create: `apps/web/src/components/settings/SettingsView.tsx`
- Create: `apps/web/src/components/settings/panes/ProfilePane.tsx`
- Create: `apps/web/src/components/settings/panes/TeamRbacPane.tsx`
- Create: `apps/web/src/components/settings/panes/PublicHolidaysPane.tsx`
- Create: `apps/web/src/components/settings/panes/AiIntegrationsPane.tsx`
- Create: `apps/web/src/components/ai/AiPracticeAssistantDrawer.tsx`
- Test: `apps/web/src/components/settings/Settings.test.ts`

**Interfaces:**
- Consumes: `PracticeStoreContext`, `Vercel AI SDK`
- Produces: Two-pane Settings view and topbar AI Copilot drawer.

- [ ] **Step 1: Write test for Settings panes and AI key storage**

Verify Profile data export/reset, Team member invite with RBAC, and SA Public Holidays gazette calculation.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test --workspace=@crmv2/web`
Expected: FAIL.

- [ ] **Step 3: Implement Settings panes and `AiPracticeAssistantDrawer`**

Build 2-pane settings layout and topbar copilot assistant drawer powered by Vercel AI SDK.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test --workspace=@crmv2/web`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web
git commit -m "feat(web): implement two-pane settings, team rbac, sa holiday gazette, and ai copilot"
```

---

### Task 7: End-to-End View Integration, Full Suite Verification & Impeccable Check

**Files:**
- Modify: `apps/web/src/App.tsx`
- Modify: `apps/web/src/components/layout/Topbar.tsx`
- Modify: `apps/web/src/App.test.ts`

**Interfaces:**
- Consumes: All views and `PracticeStoreProvider`
- Produces: Complete working, clickable application with zero blank screens.

- [ ] **Step 1: Update `App.tsx` to mount `PracticeStoreProvider` and wire all views**

Wire `/people`, `/pipeline`, `/settings`, and the topbar AI Assistant trigger.

- [ ] **Step 2: Run full test suite, typecheck, and build**

Run: `npm test && npm run typecheck && npm run build`
Expected: PASS with 0 errors.

- [ ] **Step 3: Run Impeccable craft detector on all modified UI files**

Run: `.agents/skills/impeccable/scripts/impeccable detect --json apps/web/src/**/*.tsx`
Expected: Clean check (zero violations).

- [ ] **Step 4: Verify in live browser via screenshot**

Capture live browser screenshots of `/people`, `/pipeline`, `/settings`, and the fixed collapsed sidebar.

- [ ] **Step 5: Update `HANDOFF.md` checklist and commit**

```bash
git add .
git commit -m "feat: complete interactive crm features, settings, rbac, and ai copilot"
```

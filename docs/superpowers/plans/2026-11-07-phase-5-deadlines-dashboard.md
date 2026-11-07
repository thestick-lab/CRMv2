# Phase 5: Statutory Deadlines Dashboard (`/deadlines`) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the practice-wide Statutory Deadlines Dashboard (`/deadlines`) with 4 KPI tiles (`Overdue`, `Due in 7d`, `Due in 30d`, `Missing a Date`), multi-horizon filters (30d, 90d, 365d), staff/service filters, and dual Kanban & Table view modes with South African public holiday rollback indicators (`↩`).

**Architecture:** A comprehensive view component in `apps/web/src/components/deadlines/` (`DeadlinesDashboard.tsx`) with a dedicated task aggregator `practice-tasks.ts` generating practice-wide compliance filings across all 13 clients using `generateTasks` from `packages/domain/src/domain/rules.ts`. Kanban board (`DeadlinesKanban.tsx`) and Table register (`DeadlinesTable.tsx`) render the filtered tasks.

**Tech Stack:** React 19, Tailwind CSS v4, Lucide React, `packages/domain` (rules, dates, seed).

**Spec:** `docs/05-UI-INFORMATION-ARCHITECTURE-AND-SCREEN-FLOWS.md` (Screen 4: Statutory Deadlines Dashboard) and `HANDOFF.md` (Section 6, Phase 5).

## Global Constraints

- Follow Ponytail principles: minimal code, no external drag-and-drop or heavyweight board libraries; use semantic CSS Grid / Flexbox for the 4-column Kanban board.
- Respect Impeccable Craft Floor: no kickers/eyebrows, single-declaration hairline elevation, tabular monospace numerals (`font-mono font-tnum`) for dates and client codes.
- 4 KPI Tiles:
  1. `Overdue`: Red/destructive highlight.
  2. `Due in 7 Days`: Urgent crimson count.
  3. `Due in 30 Days`: Standard muted count.
  4. `Missing a Date`: Warning amber count for unverified/missing deadlines.
- Dual View Switcher:
  - **Kanban View**: Columns (`Overdue`, `Due in 7 Days`, `Due in 30 Days`, `Missing a Date`), cards with client code, return name, due date + rollback `↩`, partner gate badge, assignee.
  - **Table View**: Dense compliance grid sortable by due date, client, and return.
- Filters:
  - Horizon: `30 Days`, `90 Days`, `365 Days` (All)
  - Staff: All or individual assignee
  - Service: All or specific statutory return type

## Review Focus

1. **Practice-Wide Task Aggregation & Rollback Tags:** Correctly derives compliance tasks across all 13 clients and marks holiday rollbacks (`↩`).
2. **Dual View Toggle State:** Switching between Kanban and Table modes retains active filter criteria without reloading or layout flashing.
3. **Horizon & Staff Filtering:** Changing horizon (30d, 90d, 365d) or staff filters immediately updates both KPI tiles and visible cards/rows.
4. **Card Click-Through Navigation:** Clicking a card or row in either mode navigates directly to the client's record (`/clients/:code`).
5. **Responsive Column Density:** Kanban columns stack gracefully on smaller viewports with clean horizontal overflow.

---

### Task 1: Practice-Wide Task Aggregation & KPI Computation

**Files:**
- Create: `apps/web/src/components/deadlines/practice-tasks.ts`
- Test: `apps/web/src/components/deadlines/practice-tasks.test.ts`

**Interfaces:**
- Consumes: `CLIENTS`, `generateTasks`, `defaultServices`, `needsReview`, `diffDays`
- Produces: `aggregatePracticeTasks(clients: Client[], asOfDate: string): PracticeTaskSummary`.

- [ ] **Step 1: Write test for practice task aggregation and KPI counts**

Test that `aggregatePracticeTasks` computes:
- `tasks`: list of practice tasks across all clients with clientName, code, due date, partner review flag
- `kpi`: `{ overdue: number, due7Days: number, due30Days: number, missingDate: number }`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test --workspace=@crmv2/web`
Expected: FAIL.

- [ ] **Step 3: Implement `practice-tasks.ts`**

Implement task generation, horizon filtering, and KPI categorization using domain rules.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test --workspace=@crmv2/web`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web
git commit -m "feat(web): add practice-wide task aggregation and statutory kpi calculator"
```

---

### Task 2: Build Kanban Board & Compliance Table Components

**Files:**
- Create: `apps/web/src/components/deadlines/DeadlinesKanban.tsx`
- Create: `apps/web/src/components/deadlines/DeadlinesTable.tsx`
- Test: `apps/web/src/components/deadlines/DeadlinesViews.test.ts`

**Interfaces:**
- Consumes: `PracticeTaskItem`
- Produces: `<DeadlinesKanban tasks={tasks} onSelectClient={onSelect} />` and `<DeadlinesTable tasks={tasks} onSelectClient={onSelect} />`.

- [ ] **Step 1: Write test for Kanban column bucket distribution**

Verify tasks are sorted into the 4 Kanban columns (`overdue`, `due7Days`, `due30Days`, `missingDate`).

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test --workspace=@crmv2/web`
Expected: FAIL.

- [ ] **Step 3: Implement `DeadlinesKanban.tsx` and `DeadlinesTable.tsx`**

Build 4-column responsive Kanban cards and sortable compliance table with rollback indicators.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test --workspace=@crmv2/web`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web
git commit -m "feat(web): implement dual kanban and table compliance views"
```

---

### Task 3: Integrate DeadlinesDashboard into `App.tsx` & Whole-Branch Review

**Files:**
- Create: `apps/web/src/components/deadlines/DeadlinesDashboard.tsx`
- Modify: `apps/web/src/components/views/DeadlinesView.tsx`
- Modify: `apps/web/src/App.test.ts`

**Interfaces:**
- Consumes: `DeadlinesDashboard`
- Produces: Connected Deadlines view with live KPI tiles, horizon toggle, view mode switch, and client navigation.

- [ ] **Step 1: Update App test for DeadlinesDashboard integration**

Verify `DeadlinesView` connects `DeadlinesDashboard`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test --workspace=@crmv2/web`
Expected: FAIL.

- [ ] **Step 3: Implement `DeadlinesDashboard.tsx` and wire into `DeadlinesView.tsx`**

Integrate topbar controls (KPIs, 30d/90d/365d horizon, Kanban/Table switch) and connect to `App.tsx`.

- [ ] **Step 4: Run full workspace test suite, typecheck, and build**

Run: `npm test && npm run typecheck && npm run build`
Expected: PASS.

- [ ] **Step 5: Run Impeccable craft detector on updated UI**

Run: `.agents/skills/impeccable/scripts/impeccable detect --json apps/web/src/components/deadlines/**/*.tsx apps/web/src/components/views/DeadlinesView.tsx`
Expected: Clean check.

- [ ] **Step 6: Update `HANDOFF.md` checklist and commit**

Mark Phase 5 done in `HANDOFF.md` and commit.

```bash
git add .
git commit -m "feat: complete Phase 5 statutory deadlines dashboard with dual kanban and table modes"
```

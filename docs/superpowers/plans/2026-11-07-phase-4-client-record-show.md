# Phase 4: Client Record Show (`/clients/:code`) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete 4-tab Client Record Show view (`/clients/:code`) with back navigation, summary bar, and all 4 functional tabs: Statutory Profile (CIPC/SARS), Deadlines & Tasks (holiday rollback and partner review gates), 12-Month Fee Estimate (rolling projection matrix with March escalation), and SharePoint Vault & SLAs.

**Architecture:** A main container `apps/web/src/components/client-show/ClientShowView.tsx` with dedicated tab sub-components in `apps/web/src/components/client-show/tabs/` (`StatutoryProfileTab.tsx`, `DeadlinesTab.tsx`, `EstimateTab.tsx`, `VaultTab.tsx`). Calculations for the 12-month fee projection and statutory tasks reuse pure domain modules from `packages/domain/src/domain/` (`estimate.ts`, `rules.ts`, `pricing.ts`, `sars.ts`).

**Tech Stack:** React 19, `@radix-ui/react-tabs`, Lucide React, Tailwind CSS v4, `packages/domain`.

**Spec:** `HANDOFF.md` (Section 4 & Section 6, Phase 4), `docs/05-UI-INFORMATION-ARCHITECTURE-AND-SCREEN-FLOWS.md` (Screen 3: Client Record Show), `PRODUCT.md`, and `DESIGN.md`.

## Global Constraints

- Follow Ponytail principles: minimal code, clean tab components, zero duplicate business logic; delegate all tax math and fee calculations to `packages/domain`.
- Respect Impeccable Craft Floor: no kickers/eyebrows, single-declaration hairline elevation, tabular monospace numbers (`font-mono font-tnum`) for rand amounts, SARS dates, and client codes.
- 4 Tabs:
  1. `Statutory Profile`: Financial year-end (with assumed flag if unverified), CIPC incorporation date, Turnover band, VAT registration, SARS eFiling profile (`firm` vs `client`).
  2. `Deadlines & Tasks`: Filing tasks for client with SA holiday rollback indicators (`↩`), partner review badges for AFS, ITR14, and payable IRP6.
  3. `12-Month Fee Estimate`: Rolling 12-month fee matrix with March +6% escalation, smoothed monthly retainer (excl. VAT and incl. 15% VAT), and actions.
  4. `SharePoint Vault & SLAs`: Document tree with contracts (`Documenso Dual-Signed SLA`) and tax return filing packs.

## Review Focus

1. **Tab Navigation & URL/State Sync:** Switching tabs updates the view without layout shifts; back arrow routes back to `/clients`.
2. **Statutory Review Gates:** Tasks for AFS, ITR14, and payable IRP6 show Partner Review Gate badges per SAICA rules.
3. **12-Month Rolling Matrix Math:** Accurate 12-month projections matching `computeEstimate` from `packages/domain/src/domain/estimate.ts` with March price increases.
4. **SharePoint Vault Tree & SLA Mock:** Clean folder hierarchy showing contracts and tax filing packs with status badges.
5. **Responsive Tab Density:** Tabs wrap or scroll horizontally on narrow viewports without clipping content.

---

### Task 1: Client Show Shell, Breadcrumbs & Tab Primitives

**Files:**
- Create: `apps/web/src/components/client-show/ClientShowView.tsx`
- Create: `apps/web/src/components/client-show/ClientSummaryBar.tsx`
- Test: `apps/web/src/components/client-show/ClientShowView.test.ts`

**Interfaces:**
- Consumes: `Client`, `CLIENTS`, `Layout`
- Produces: `<ClientShowView clientCode={code} onBack={() => ...} />`.

- [ ] **Step 1: Write test for ClientShowView shell and summary header**

Verify header renders client legal name, code badge, entity type, and tab triggers.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test --workspace=@crmv2/web`
Expected: FAIL.

- [ ] **Step 3: Implement `ClientShowView` and `ClientSummaryBar`**

Build container with Radix tabs (`profile`, `deadlines`, `estimate`, `vault`), client header with back button, and quick action bar.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test --workspace=@crmv2/web`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web
git commit -m "feat(web): build client show view shell with 4 tabs navigation"
```

---

### Task 2: Tab 1 (Statutory Profile) & Tab 2 (Deadlines & Partner Review Gates)

**Files:**
- Create: `apps/web/src/components/client-show/tabs/StatutoryProfileTab.tsx`
- Create: `apps/web/src/components/client-show/tabs/DeadlinesTab.tsx`
- Test: `apps/web/src/components/client-show/tabs/StatutoryProfileTab.test.ts`

**Interfaces:**
- Consumes: `Client`, `generateTasks(client, services, asOfDate)`, `STAFF`
- Produces: Functional Statutory Profile and Deadlines tabs.

- [ ] **Step 1: Write test for StatutoryProfileTab and DeadlinesTab**

Verify CIPC fields, year-end warning, and partner review gate tags for AFS/ITR14.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test --workspace=@crmv2/web`
Expected: FAIL.

- [ ] **Step 3: Implement `StatutoryProfileTab` and `DeadlinesTab`**

Build clean detail cards for CIPC/SARS profile and interactive filing schedule with partner review tags.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test --workspace=@crmv2/web`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web
git commit -m "feat(web): implement statutory profile and deadlines tabs with partner review gates"
```

---

### Task 3: Tab 3 (12-Month Fee Estimate Matrix) & Tab 4 (SharePoint Vault & SLAs)

**Files:**
- Create: `apps/web/src/components/client-show/tabs/EstimateTab.tsx`
- Create: `apps/web/src/components/client-show/tabs/VaultTab.tsx`
- Test: `apps/web/src/components/client-show/tabs/EstimateTab.test.ts`

**Interfaces:**
- Consumes: `computeEstimate` from `fdoncall-practice/domain/estimate`
- Produces: 12-month rolling fee matrix with monthly retainer and SharePoint vault browser.

- [ ] **Step 1: Write test for fee estimate projection and retainer calculation**

Test that `computeEstimate` generates 12 months with March escalation and smoothed retainer.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test --workspace=@crmv2/web`
Expected: FAIL.

- [ ] **Step 3: Implement `EstimateTab` and `VaultTab`**

Build horizontal scrollable 12-month table with totals, smoothed monthly retainers (excl./incl. VAT), and document vault tree with Documenso SLA links.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test --workspace=@crmv2/web`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web
git commit -m "feat(web): implement 12-month fee estimate matrix and sharepoint vault tabs"
```

---

### Task 4: Connect ClientShowView in `App.tsx` & Whole-Branch Review

**Files:**
- Modify: `apps/web/src/App.tsx`
- Modify: `apps/web/src/App.test.ts`

**Interfaces:**
- Consumes: `ClientShowView`
- Produces: End-to-end view switching between Clients register and `/clients/:code`.

- [ ] **Step 1: Update App test for ClientShowView integration**

Verify `App` mounts `ClientShowView` when `view === 'client'`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test --workspace=@crmv2/web`
Expected: FAIL.

- [ ] **Step 3: Wire `ClientShowView` into `App.tsx`**

Mount `<ClientShowView>` for `client` view.

- [ ] **Step 4: Run full workspace test suite and build**

Run: `npm test && npm run typecheck && npm run build`
Expected: PASS.

- [ ] **Step 5: Run Impeccable craft detector on updated UI**

Run: `.agents/skills/impeccable/scripts/impeccable detect --json apps/web/src/components/client-show/**/*.tsx`
Expected: Clean check.

- [ ] **Step 6: Update `HANDOFF.md` checklist and commit**

Mark Phase 4 done in `HANDOFF.md` and commit.

```bash
git add .
git commit -m "feat: complete Phase 4 client record show with 4 statutory tabs"
```

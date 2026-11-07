# Phase 3: Clients Register (`/clients`) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the full-featured, Twenty CRM-styled Clients Directory Register (`/clients`) using `@tanstack/react-table`, with column sorting, text search, entity/VAT filters, and all 9 statutory columns derived from `packages/domain`.

**Architecture:** A dedicated component `apps/web/src/components/clients/ClientsRegisterTable.tsx` leveraging `@tanstack/react-table` for sorting and filtering. A data enrichment helper `apps/web/src/components/clients/client-row-data.ts` maps raw `Client` seed records into display models with computed next filing deadlines, active services, staff names, and year-end warnings.

**Tech Stack:** React 19, `@tanstack/react-table`, Tailwind CSS v4, Lucide React, `packages/domain` (seed data, dates, rules).

**Spec:** `docs/05-UI-INFORMATION-ARCHITECTURE-AND-SCREEN-FLOWS.md` (Screen 2: Clients Directory Register) and `HANDOFF.md` (Section 6, Phase 3).

## Global Constraints

- Follow Ponytail principles: minimal code, zero redundant state management or custom table wrappers; use standard `@tanstack/react-table` primitives.
- Respect Impeccable Craft Floor: no kickers/eyebrows, no gradient text, 1px subtle borders (`border-border/80`), tabular numerals (`font-mono font-tnum`) for codes and dates, WCAG AA contrast.
- Exact 9 columns from spec:
  1. `Code`: Monospace crimson badge (e.g. `ALC-610`, `MUS-875`)
  2. `Client Legal Name`: Primary name with group tag if applicable
  3. `Entity Type`: Company, Close corporation, Trust, or Individual
  4. `Responsible Staff`: Assignee name (e.g. `Erik (Partner)`, `André with Caroline`)
  5. `Year End`: Month name (e.g. `Feb`) + `* (Assumed)` indicator if `yearEndAssumed`
  6. `VAT Category`: `Cat A`, `Cat B`, `Cat C`, or `—`
  7. `Payroll`: `Yes (N staff)` or `—`
  8. `Active Services`: Compact badge chips (`AFS`, `ITR14`, `IRP6`, `VAT201`, `EMP201`)
  9. `Next Statutory Deadline`: Service code + due date + urgency badge (e.g., `[IRP6] 2027-02-26`)
- Row click interaction: Clicking any client row triggers `onNavigate('client', client.code)`.

## Review Focus

1. **Table Column Sorting:** Sorting works properly across text (Name, Type), dates (Next Deadline, Year End), and codes.
2. **Global & Column Search/Filter:** Filter input searches across client code, legal name, group tag, and entity type.
3. **Statutory Deadline Calculation:** Derives the earliest upcoming statutory filing for each client from `packages/domain/src/domain/rules.ts` without runtime drift.
4. **Row Click Accessibility:** Entire row is clickable and accessible via keyboard navigation, routing to `/clients/:code`.
5. **Responsive Density & Empty States:** Clean horizontal scroll on smaller viewports; informative empty state when search matches zero clients.

---

### Task 1: Client Data Enrichment & Statutory Helper

**Files:**
- Create: `apps/web/src/components/clients/client-row-data.ts`
- Test: `apps/web/src/components/clients/client-row-data.test.ts`

**Interfaces:**
- Consumes: `packages/domain/src/data/seed`, `packages/domain/src/domain/rules`, `packages/domain/src/domain/dates`
- Produces: `enrichClientRows(clients: Client[], asOfDate: string): EnrichedClientRow[]`.

- [ ] **Step 1: Write test for client row enrichment**

Test that `enrichClientRows` produces 13 rows with:
- `staffName`: e.g. "Erik" for ALC-610
- `services`: array of active service codes (e.g., `['AFS', 'ITR14', 'IRP6', 'VAT201']`)
- `nextDeadline`: earliest statutory task due on or after `asOfDate`
- `yearEndLabel`: e.g. "Feb" or "Feb*"
- `vatLabel`: e.g. "Cat B" or "—"
- `payrollLabel`: e.g. "Yes (12 staff)" or "—"

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test --workspace=@crmv2/web`
Expected: FAIL (module not defined).

- [ ] **Step 3: Implement `client-row-data.ts`**

Implement `enrichClientRows` mapping `Client` seed records with `STAFF`, `GROUPS`, `defaultServices(client)`, and `generateTasks(client, services, asOfDate)`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test --workspace=@crmv2/web`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web
git commit -m "feat(web): add client row data enrichment and deadline calculator"
```

---

### Task 2: Build Clients Register Table Component with TanStack Table

**Files:**
- Create: `apps/web/src/components/clients/ClientsRegisterTable.tsx`
- Test: `apps/web/src/components/clients/ClientsRegisterTable.test.ts`

**Interfaces:**
- Consumes: `EnrichedClientRow`, `@tanstack/react-table`
- Produces: `<ClientsRegisterTable data={rows} onRowClick={(code) => ...} />`.

- [ ] **Step 1: Write test for table column definitions and sorting configuration**

Test that table columns match the 9 required fields and sort functions sort codes and dates correctly.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test --workspace=@crmv2/web`
Expected: FAIL.

- [ ] **Step 3: Implement `ClientsRegisterTable.tsx`**

Implement TanStack Table with 9 columns, sort icons (`ArrowUpDown`, `ArrowUp`, `ArrowDown`), search input, entity type filter chips, and row click handler.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test --workspace=@crmv2/web`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web
git commit -m "feat(web): implement tanstack table clients register with 9 statutory columns"
```

---

### Task 3: Integrate Clients Register into Application View

**Files:**
- Modify: `apps/web/src/components/views/ClientsView.tsx`
- Modify: `apps/web/src/App.test.ts`

**Interfaces:**
- Consumes: `ClientsRegisterTable`, `enrichClientRows`
- Produces: Connected Clients Register view with live TanStack table, client counter, search/filter controls, and row navigation to client show view.

- [ ] **Step 1: Update test for ClientsView table integration**

Verify `ClientsView` mounts `ClientsRegisterTable` and displays all 13 enriched practice clients.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test --workspace=@crmv2/web`
Expected: FAIL.

- [ ] **Step 3: Update `ClientsView.tsx` to use `ClientsRegisterTable`**

Replace the basic HTML table with `<ClientsRegisterTable />` wired to `onNavigate('client', code)`.

- [ ] **Step 4: Run workspace tests and typecheck**

Run: `npm test && npm run typecheck && npm run build`
Expected: All tests pass, typecheck clean, build succeeds.

- [ ] **Step 5: Run Impeccable craft detector on updated UI**

Run: `.agents/skills/impeccable/scripts/impeccable detect --json apps/web/src/components/clients/ClientsRegisterTable.tsx apps/web/src/components/views/ClientsView.tsx`
Expected: Clean check (zero violations).

- [ ] **Step 6: Update `HANDOFF.md` checklist and commit**

Check off `- [x] Phase 3: Clients Register (/clients)` in `HANDOFF.md` and commit.

```bash
git add .
git commit -m "feat: complete Phase 3 clients register with tanstack table"
```

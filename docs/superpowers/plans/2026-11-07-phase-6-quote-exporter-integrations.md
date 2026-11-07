# Phase 6: Quote Exporter & Integrations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement client-side PDF quote streaming (`pdf-lib`) and formula Excel generation (`.xlsx`), and build the Documenso digital SLA dispatch and Xero 15% VAT invoice draft synchronization modals.

**Architecture:** A dedicated export service in `apps/web/src/lib/export-actions.ts` wiring `clientSheet`, `estimatePdf`, `estimateXlsx`, and `offerDownload` to live buttons across the application (ClientSummaryBar, EstimateTab). Two modal dialogs: `DocumensoDispatchDialog.tsx` (dispatching SLA for dual-signature with audit trail) and `XeroSyncDialog.tsx` (generating Xero draft repeating invoices with 15% VAT breakdown).

**Tech Stack:** React 19, `pdf-lib`, `pako`, Lucide React, `@radix-ui/react-dialog`, `packages/domain` (export engine).

**Spec:** `HANDOFF.md` (Section 6, Phase 6), `docs/03-ARCHITECTURE-AND-DATABASE-SPEC.md`, `PRODUCT.md`, and `DESIGN.md`.

## Global Constraints

- Follow Ponytail principles: minimal code, zero external heavyweight PDF service dependencies; all PDF and Excel generation happens client-side using `packages/domain/src/export/` (`pdf.ts`, `xlsx.ts`, `sheet.ts`).
- Respect Impeccable Craft Floor: no kickers/eyebrows, single-declaration hairline elevation, clean accessible modals, tabular monospace currency (`Geist Mono`).
- PDF and Excel exports must produce valid binary files matching the client's legal name, code (`ALC-610`, `MUS-875`), and 12-month projection matrix.
- Documenso dispatch modal simulates real electronic signature envelope dispatch (Documenso envelope ID, dual-signer roles: Partner & Director).
- Xero sync modal displays repeating monthly invoice draft lines (Fee Retainer, 15% VAT line, total ZAR) and sync confirmation.

## Review Focus

1. **Client-Side PDF & Excel Generation:** `downloadPdfQuote` and `downloadExcelQuote` generate valid non-empty byte arrays matching `sheet.fileName`.
2. **Download Action Wiring:** Clicking `[PDF Quote]` or `[Excel (.xlsx)]` in `ClientSummaryBar` and `EstimateTab` triggers the file download.
3. **Documenso SLA Dispatch State:** Dialog handles recipient fields, displays preview of the SLA envelope, and marks status as `Dispatched`.
4. **Xero 15% VAT Repeating Invoice Line Breakdown:** Correctly calculates 15% VAT on vatable services and displays Xero line items.
5. **Keyboard & Modal Accessibility:** Both integration dialogs open via triggers and dismiss on `Escape` or backdrop click without trapping focus.

---

### Task 1: Client-Side PDF & Excel Export Actions

**Files:**
- Create: `apps/web/src/lib/export-actions.ts`
- Test: `apps/web/src/lib/export-actions.test.ts`
- Modify: `apps/web/src/components/client-show/ClientSummaryBar.tsx`
- Modify: `apps/web/src/components/client-show/tabs/EstimateTab.tsx`

**Interfaces:**
- Consumes: `clientSheet`, `estimatePdf`, `estimateXlsx`, `offerDownload`
- Produces: `generatePdfQuoteBytes(client, est, asOf): Promise<Uint8Array>` and `generateExcelQuoteBytes(client, est, asOf): Uint8Array`.

- [ ] **Step 1: Write test for export action byte generation**

Test that PDF and Excel byte generators produce valid non-empty byte arrays for `MUS-875`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test --workspace=@crmv2/web`
Expected: FAIL.

- [ ] **Step 3: Implement `export-actions.ts` and wire download buttons**

Connect `downloadPdfQuote` and `downloadExcelQuote` to `ClientSummaryBar` and `EstimateTab`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test --workspace=@crmv2/web`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web
git commit -m "feat(web): wire client-side pdf quote streaming and excel assembly"
```

---

### Task 2: Documenso SLA Dispatch & Xero 15% VAT Sync Dialogs

**Files:**
- Create: `apps/web/src/components/integrations/DocumensoDispatchDialog.tsx`
- Create: `apps/web/src/components/integrations/XeroSyncDialog.tsx`
- Modify: `apps/web/src/components/client-show/tabs/VaultTab.tsx`
- Test: `apps/web/src/components/integrations/Integrations.test.ts`

**Interfaces:**
- Consumes: `Client`, `Estimate`, `@radix-ui/react-dialog`
- Produces: `<DocumensoDispatchDialog />` and `<XeroSyncDialog />`.

- [ ] **Step 1: Write test for Documenso envelope and Xero line builder**

Verify Documenso envelope creation and Xero 15% VAT draft line generation.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test --workspace=@crmv2/web`
Expected: FAIL.

- [ ] **Step 3: Implement `DocumensoDispatchDialog` and `XeroSyncDialog`**

Build accessible Radix dialogs for Documenso SLA electronic signature and Xero draft sync.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test --workspace=@crmv2/web`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web
git commit -m "feat(web): add documenso sla dispatch and xero 15% vat sync dialogs"
```

---

### Task 3: Whole-Branch Verification & End-to-End Test

**Files:**
- Modify: `apps/web/src/components/client-show/ClientShowView.tsx`
- Modify: `apps/web/src/App.test.ts`

**Interfaces:**
- Consumes: All Phase 1–6 features
- Produces: Verified complete FD on Call CRM practice operating system.

- [ ] **Step 1: Update App test for Phase 6 export and integration checks**

Verify exports and dialog integration.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test --workspace=@crmv2/web`
Expected: FAIL.

- [ ] **Step 3: Connect export actions and integration dialogs in `ClientShowView.tsx`**

Pass export handlers and dialog triggers down to tabs.

- [ ] **Step 4: Run full workspace test suite, typecheck, and build**

Run: `npm test && npm run typecheck && npm run build`
Expected: PASS.

- [ ] **Step 5: Run Impeccable craft detector on all modified UI files**

Run: `.agents/skills/impeccable/scripts/impeccable detect --json apps/web/src/components/integrations/**/*.tsx apps/web/src/lib/export-actions.ts`
Expected: Clean check.

- [ ] **Step 6: Update `HANDOFF.md` checklist and commit**

Mark Phase 6 done in `HANDOFF.md` and commit.

```bash
git add .
git commit -m "feat: complete Phase 6 quote exporter and integrations"
```

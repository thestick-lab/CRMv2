# FD on Call CRM — Reverse Engineering & "Kepa" Gap Analysis

**Document Reference:** `docs/01-REVERSE-ENGINEERING-AND-GAP-ANALYSIS.md`  
**System Version Analyzed:** `FD on Call Practice System` v0.9.2 (`Client_CRM/`), `Twenty CRM` (`twenty/`), and `Jacques Workflow Specs` (`SPEC-04`, `SPEC-05`, `SPEC-06`)  
**Target Architecture:** Native Twenty CRM Monorepo with South African Statutory Compliance Engine, Documenso Dual-Signing, SharePoint Vault & Xero Sync — **superseded (2026-11-10):** shipped as a standalone React app (`apps/web` + `packages/domain`); see the status section below.  
**REA Analysis Evidence ID:** `ev_f9f780c7914574f84d2d55c43cb3662b846552ead0b5c7c2cd436a4e3b3c354a`

---

## Status as of 2026-11-10

> **Reading note.** Sections 1–6 below are the pre-build research and gap analysis written against prototype v0.9.2 and the Twenty CRM monorepo. Where a conclusion no longer describes the shipped system it is marked **Superseded (2026-11-10)** inline. The statutory research (Companies Act, Tax Administration Act, VAT Act, Income Tax Act), the v1 failure analysis and the fee-model rationale remain valid and are kept as the record of why the system looks the way it does.

**What shipped.** A standalone React 19 + Vite 7 + Tailwind v4 application in `apps/web` — not the Twenty CRM monorepo proposed in §2. Navigation is an in-memory `ViewKey` (`apps/web/src/App.tsx`), not URL hash routes; there is no router library. Practice data lives in one `PracticeStoreContext` persisted to `localStorage` under `crmv2_practice_state`, with an idempotent load-time merge. No PostgreSQL is deployed and there is no `apps/api`; the only server-side piece is the Cloudflare Pages Function serving better-auth over the D1 database `crmv2-auth`. The statutory engine is the pure package `packages/domain`: 7 domain modules (`src/domain/{catalogue,dates,estimate,pricing,rules,sars,types}.ts`) and 6 export modules (`src/export/{logo,pdf,sheet,xlsx,zip,audit-pdf}.ts`), imported as `fdoncall-practice/domain/*`, covered by 52 unit tests. The web app adds 464 tests across 48 files; `npm test`, `npm run typecheck` and `npm run build` run from the repo root.

**Gaps closed by the 2026-11-09 redesign.**
- **Quote → signature → invoice flow.** Quote builder (client → scope → fee schedule, live document preview, PDF/XLSX) with the lifecycle `Draft Quote → Quote Sent → Accepted → Signed → Active Client`, plus `Closed Lost`, enforced by transition rules; `Accepted → Signed` also requires a recorded Documenso envelope id. Invoices are generated from an accepted quote with a `billingMonth`, cent-exact 15% VAT per line, a derived `Overdue` state and read-only lines once issued.
- **Sales pipeline.** A board split Booked vs Open over 6 stages, with Pipeline / Quotes / Invoices tabs.
- **Time tracking + retainer overage billing.** Quarter-hour rounding with a 15-minute floor, a session-only topbar timer, Log and Report tabs, a retainer-overage feed into invoicing, and entries released when a billed time line is deleted.
- **Granular permissions.** 6 roles (Partner, Compliance Officer, Accountant, Team member, Subcontractor, Support Tech) over 6 groups and 18 rows; `Allowed | Not allowed | Limited` is stored, `Inherited` / `Custom` is derived; `Limited (assigned)` is scoped by the client's staff/subcontractor; the partner sign-off row is locked; invites and role changes require `Settings — manage`.
- **Governance audit log.** Read-only and derived, with CSV/PDF export and a per-client trail on the client History tab.
- **Client contact/organization data.** `Client.contacts`, the Organization tab and per-client directors/trustees replace the mixed People directory.
- **Nav/view gating.** Sidebar entries and ⌘K results are filtered by `can()` against the permission matrix.

**Gaps that remain open.**
- **Live Documenso wiring** — the envelope id is recorded and gates `Accepted → Signed`, but no Documenso REST call or `DOCUMENT_COMPLETED` webhook exists.
- **Live Xero wiring** — the draft push is simulated and never leaves the browser.
- **Backend persistence** — practice data is `localStorage` only: no server enforcement of the permission matrix, no cross-device state, no PostgreSQL.
- **Client portal** — clients have no login; there is no external-facing surface.
- **Sign-off authority beyond Partner** — PRD Q2.5 is still unanswered; the partner sign-off permission row is Partner-only and locked.
- **SharePoint/Graph document vault** — the client Vault tab stores document metadata in the practice store; no Graph daemon, no SharePoint directories.
- **Account provisioning beyond seeded accounts** — 10 seeded accounts (demo password `FDonCall2026!`) plus in-app invites; self-service sign-up is refused and no admin-only account endpoint exists.

**Deferred / accepted as-is — do not read these as delivered.**
- Fee visibility for a Team member vs the `view-billing` permission.
- `Mark Paid` is allowed from `Draft`.
- Audit dedupe collapses genuine resubmissions of one task.
- The sign-off milestone is folded into the submission row.
- Document dates derive from `issueDate` while billing uses `billingMonth`.
- The running timer is session-only.
- `Add Action → New Quote` is offered where the role cannot use it.
- A newly created client assumes prior filing history.
- Documenso and Xero are simulated, not connected.

---

## Executive Summary

FD on Call is a specialized South African accounting, advisory, tax, and secretarial practice based in the Western Cape. The practice services 13 active client entities (companies, close corporations, trusts, and individuals) structured into 4 client groups (`axe`, `energy`, `signal-gun`, `knead`) across 9 staff members (Partners Erik and Wouter, Compliance Officer Nikita, Senior Accountants André and Lungani, Accountants Mia and Willem, Subcontractors Hannes and Caroline).

Historically, the practice operated through manual spreadsheets (`"Client info - Dummy.xlsx"` and `"Pricing.xlsx"`), leading to high operational risk: missed SARS and CIPC deadlines, unbilled out-of-scope work, unmonitored partner sign-off gates, and disconnected engagement contracts.

To solve this, the practice developed `Client_CRM` (v0.9.2), an in-memory React/TypeScript prototype featuring South African statutory deadline calculation rules (Companies Act s30(1), Tax Administration Act s25, VAT Act s28(1), Income Tax Act s89bis/4th Schedule), an Easter Computus holiday engine, and a 12-month rolling fee estimator matrix (Columns C–P) with client-side PDF and Excel generation. However, `Client_CRM` lacks multi-user database persistence, audit logging, role-based access control, document storage, and digital proposal signing.

Through automated **Reverse-Engineering Analysis (REA)** of the official local **Twenty CRM** monorepo (`packages/twenty-server`, `packages/twenty-front`, `packages/twenty-ui`, `packages/twenty-shared`) and synthesis with the commercial onboarding and financial specifications (`SPEC-04`, `SPEC-05`, `SPEC-06`), this document establishes the unified technical foundation. Twenty CRM serves as the sole application base, extended with FD on Call's pure domain rules, integrated with self-hosted **Documenso** for dual-signature engagement contracts, backed by **SharePoint (Microsoft Graph API)** for client vault storage, and synchronized with **Xero** for 15% South African VAT invoicing.

**Superseded (2026-11-10).** Twenty CRM was not adopted as the application base, and neither Documenso, SharePoint nor Xero is connected. The shipped application keeps the parts of this analysis that were proven correct — the pure domain engine, the statutory rules, the fee model, the Twenty-inspired visual language and command-menu UX — inside `apps/web` + `packages/domain`, with one React practice store persisted locally and a single auth function on Cloudflare Pages. The 2026-11-10 status section above is the authoritative statement of what exists; the sections below are the research trail that led there.

---

## 1. Technical Baseline Analysis: Client_CRM (v0.9.2)

### 1.1 Source & Build Engine
- **Source Artifacts:** 19 pure TypeScript source modules stored in `Client_CRM/source.json` (530 KB bundle).
- **Core Domain Modules:**
  - `src/domain/dates.ts`: South African calendar logic, business day addition (`addBusinessDays`), weekend/holiday rollback (`businessDayOnOrBefore`), Easter Sunday computus algorithm (Good Friday and Family Day calculation), and Public Holidays Act §2(1) Sunday rollover.
  - `src/domain/sars.ts`: SARS statutory deadlines for provisional tax (`IRP6`), corporate income tax (`ITR14`), personal income tax (`ITR12`), trust income tax (`ITR12T`), and payroll taxes (`EMP201`, `EMP501`).
  - `src/domain/rules.ts`: Entity applicability rules mapping 10 compliance obligations across `Company`, `Close corporation`, `Trust`, and `Individual` entities.
  - `src/domain/pricing.ts` & `src/domain/catalogue.ts`: 21 service line items across 5 categories, turnover band lookups, payroll staff tier pricing, and March annual price escalation.
  - `src/domain/estimate.ts`: Rolling 12-month projection matrix (Columns C–P), followed vs touched row states, and average monthly debit order retainer math.
  - `src/export/sheet.ts`, `pdf.ts`, `xlsx.ts`, `zip.ts`: Pure client-side A4 Landscape PDF quote generation (`pdf-lib`) and formula-driven Excel assembly (`pako` deflate with live `SUM`, `ROUND`, and `IF` formulas).

### 1.2 Hash Routes & Functional Views
- `#deadlines`: Statutory Compliance Dashboard with 4 KPI metric tiles (`Overdue`, `Due in 7 days`, `Due in 30 days`, `Missing a date`), filters (Person, Service, Horizon, Toggle Submitted/Done), and monthly grouping.
- `#clients`: Client Directory displaying Client Code, Legal Name, Entity Type, Year-End Month, Staff Assignee, Turnover Band, eFiling status, and active service badges.
- `#client-<code>`: Client Profile drawer with inline editing of statutory metadata (`yearEndMonth`, `incorporationDate`, `turnover`, `vatCategory`, `payroll`, `employeeCount`, `efilingProfile`) and blocker signal calculation.
- `#estimate` & `#estimate-<code>`: Interactive 12-month fee calculation matrix with March escalation and PDF/XLSX export.
- `#rules` (Prototype Inspection Artifact): In the prototype, this was rendered as a static reference card for statutory rules, fee tables, and practice assumptions. In the production Twenty CRM architecture, this is **re-classified from a UI page into a 3-layer declarative rules engine**: pure domain calculation in `@fdoncall/domain`, backend mutation triggers & review gates in `twenty-server`, and editable practice tables inside Twenty's Admin Settings panel (`/settings/practice-rules`).

**Current implementation (2026-11-10).** The hash routes above are history. The shipped app routes on an in-memory `ViewKey` across **11 views**: Home, Analytics, Inbox, Clients, Client record, Team, Deadlines, Sales Pipeline, Time, Settings and Governance Log. The sidebar groups them as Practice (Home, Analytics, Inbox) / Work (Clients, Team, Deadlines, Sales Pipeline, Time) / Admin (Settings, Governance Log). There is no standalone Estimator view: its 12-month calculator is the fee-schedule step of the quote builder, reached from Sales Pipeline → New Quote or from a client record → Estimate (billing-gated). The `#rules` content is no longer a reference page at all — statutory applicability lives in `packages/domain/src/rules.ts`, and rates and service fees are edited in Settings → Practice Rules (`Service & Pricing Matrix`, `SA Public Holidays`). The client record is a 7-tab show view: Overview, Organization, History, Tasks, Estimate (billing-gated), Vault, Notes. Only the Cloudflare Pages auth function is server-side; everything else runs in the browser.

---

## 2. Technical Baseline Analysis: Twenty CRM Monorepo (`/twenty`)

### 2.1 Monorepo Topology & Technology Stack
- **Architecture:** Nx + Yarn 4.18.1 monorepo running on Node `v26.13.0`.
- **Backend (`packages/twenty-server`):** NestJS, TypeORM, PostgreSQL 16 (port `:5432`), Redis 7 / BullMQ (port `:6379`), GraphQL Yoga with Apollo Federation, MikroORM metadata engine.
- **Frontend (`packages/twenty-front`):** React 19, Jotai atomic state management, Linaria / WYW CSS-in-JS, Vite 8, Apollo Client, Lingui i18n, Framer Motion.
- **Design System (`packages/twenty-ui`):** Reusable component library with customizable theme tokens, icons, and layout primitives.
- **Shared (`packages/twenty-shared`):** Universal types, validation schemas, and constants.

### 2.2 Native Standard Objects & Extension Mechanism
Twenty provides native, battle-tested standard objects backed by dynamic metadata entities (`ObjectMetadataEntity`, `FieldMetadataEntity`):
1. **`Company` (`core.company`):** Native properties (`id`, `name`, `domainName`, `employees`, `annualRecurringRevenue`, `address`, `createdAt`, `updatedAt`). Easily extended with South African statutory columns via metadata mutations without modifying core migrations.
2. **`Person` (`core.person`):** Native properties (`id`, `name`, `emails`, `phones`, `jobTitle`, `city`, `avatarUrl`, `companyId`). Maps directly to Directors, Trustees, and Primary Contacts.
3. **`Opportunity` (`core.opportunity`):** Native Kanban pipeline with customizable stages. Maps directly to the 5-stage Lead Onboarding Pipeline. **Superseded (2026-11-10):** the `leads` entity and onboarding pipeline were removed in the redesign; the shipped Sales Pipeline board tracks quotes across 6 stages, split Booked vs Open, with Pipeline / Quotes / Invoices tabs.
4. **`Task` (`core.task`):** Native task scheduler (`dueAt`, `status`, `assigneeId`, `targetCompanyId`). Extended with statutory metadata (`serviceCode`, `reviewRule`, `irp6Outcome`, `reviewedByPartnerId`).
5. **`Note` & `Attachment` (`core.note`, `core.attachment`):** Native file attachment and rich-text note threads linked to any entity.

### 2.3 Surface Pruning Strategy for Accounting Practice
Twenty's generic B2B sales surfaces will be pruned via **Navigation Drawer Configuration and Role Permissions**, keeping the core engine intact:
- **RETAINED & PROMINENT:**
  - `Clients` (Companies) with 3-pane record show view and statutory blocker signals.
  - `Contacts & Directors` (People) with relationship links.
  - `Onboarding Pipeline` (Opportunities) Kanban board. *(Superseded — the shipped board is the 6-stage Sales Pipeline over quotes; see the note below.)*
  - `Statutory Compliance Calendar` (Tasks) with Deadlines dashboard.
  - `Dashboards & Widgets` with practice compliance KPI tiles.
  - `AI Chat & AI Agents` for natural language practice queries.
  - `Command Menu (Cmd+K)` for rapid client and tax number search.
- **PRUNED / HIDDEN:**
  - Generic sales pipelines (`Deals`, `Product Catalog`, `Price Books`).
  - SaaS subscription ARR/MRR metrics and Stripe customer billing redirection.
  - Multi-workspace switching and developer API documentation for operational accountants.

**Superseded (2026-11-10).** Twenty's surfaces were never pruned because Twenty was never mounted; the shipped shell is a purpose-built React sidebar and topbar. The retained/pruned split above survives only as intent: the 11 shipped views cover Clients, Team, Deadlines, Sales Pipeline, Time, Analytics, Inbox, Settings and the Governance Log, and ⌘K searches clients, quotes and time entries filtered by the permission matrix. The mixed People directory is gone — staff live in Team, client directors inside `Client.contacts`.

---

## 3. Commercial Extensions Baseline (`SPEC-04`, `SPEC-05`, `SPEC-06`)

### 3.1 SPEC-04: Leads CRM & Open-Source e-Signatures (`crm-onboarding-esign`)
- **E-Signature Engine:** Self-hosted **Documenso** (AGPL-3.0, TypeScript/PostgreSQL).
- **Dual-Signature Workflow:**
  1. Client Signatory signs fee estimate proposal on mobile browser.
  2. Managing Partner (Erik/Wouter) countersigns to execute engagement contract.
- **Webhook Bridge (`POST /api/webhooks/documenso`):**
  - Ingests `DOCUMENT_COMPLETED` webhook with cryptographic audit trail.
  - Automatically converts `Opportunity` stage from `'Estimate Sent'` to `'Active Client'`.
  - Automatically triggers `materializeComplianceSchedule()` in Twenty for the upcoming 12 months.
  - Dispatches WhatsApp signing links and welcome packets.

### 3.2 SPEC-05: SharePoint Client Vault & Document Storage (`doc-storage-sharepoint`)
- **Perimeter Security:** Outside clients NEVER receive direct SharePoint/Entra ID credentials.
- **Headless Daemon Auth:** MSAL Node daemon using Entra ID Client Credentials Grant with Microsoft Graph API over TLS.
- **Automated Directory Provisioning:**
  - `/Clients/{clientCode}/Contracts/` (Signed Documenso engagement agreements).
  - `/Clients/{clientCode}/Tax_Returns/` (Signed AFS, ITR14, ITR12, IRP6 receipts).
  - `/Clients/{clientCode}/Statutory_KYC/` (CIPC COR14.3 certificates, FICA IDs, Beneficial Ownership).
  - `/Clients/{clientCode}/Accounting_Invoices/` (Monthly Xero billing copies).
- **Interchangeable Storage Provider:** Implements `IStorageProvider` supporting Nextcloud WebDAV as self-hosted fallback.

### 3.3 SPEC-06: Timekeeping, Billable Work & South African Accounting (`time-billing-accounting`)
- **Retainer Depletion Engine:** Depletes monthly agreed SLA retainer hours (e.g. 15.0 hrs) against logged technician/accountant minutes; flags billable overages.
- **Out-of-Scope Capture:** Explicit tracking for unbundled ad-hoc advisory work, AA travel rates (e.g. R4.85/km), and disbursement costs.
- **Two-Way Xero API Connector:**
  - South African 15% Standard VAT compliance (`OUTPUT2` tax type).
  - Pushes draft invoices directly to Xero (`POST /api.xro/2.0/Invoices`) with registered CIPC number and 10-digit SARS VAT number on invoice headers.
  - Embeds instant payment links powered by **Paystack** (supporting Ozow, Capitec Pay, Visa, Mastercard) into WhatsApp notifications.
  - Export compatibility with **Sage Business Cloud Accounting South Africa**.

**Implementation status (2026-11-10).**
- **SPEC-04 — partially realised.** The quote lifecycle enforces `Accepted → Signed` only when a Documenso envelope id is recorded, and conversion to an active client writes the quoted scope into `Client.services`. There is no Documenso REST call and no `DOCUMENT_COMPLETED` webhook; the envelope id is typed/recorded in-app.
- **SPEC-05 — not implemented.** The client Vault tab stores document metadata in the local practice store. No SharePoint directories, no Microsoft Graph daemon, no `IStorageProvider`.
- **SPEC-06 — realised in-app, integrations simulated.** Retainer depletion and out-of-scope overage feed the invoice builder (quarter-hour rounding, 15-minute floor), and invoices are cent-exact at 15% VAT per line. The Xero push produces a simulated draft with no network call, and there is no Paystack link, WhatsApp dispatch or Sage export.

---

## 4. Reconciled "Kepa" Decision Matrix (Keep / Enhance / Drop / Adapt)

| System Area | Capability | Source | Kepa Action | Architectural Rationale & Implementation Details |
|---|---|---|---|---|
| **Core App** | Monorepo Application Stack | `twenty` | **KEEP** | Official Twenty CRM (`packages/twenty-server`, `twenty-front`, `twenty-ui`, `twenty-shared`) running on NestJS, PostgreSQL 16, Redis 7, React 19. |
| **Domain** | SA Statutory Deadline Rules | `Client_CRM` | **KEEP** | 10 statutory obligations (`AFS`, `ITR14`, `ITR12`, `ITR12T`, `IRP6`, `VAT201`, `EMP201`, `EMP501`, `CIPC_AR`, `BO`), Easter Computus, and Sunday rollover. |
| **Domain** | 12-Month Fee Projection Engine | `Client_CRM` | **KEEP** | Columns C–P, 21 lines, followed vs touched state, March escalation, 15% VAT toggle, and client-side PDF/XLSX downloads. |
| **E-Sign** | Digital Proposal Acceptance | `SPEC-04` | **ADAPT** | Integrate self-hosted open-source **Documenso** with dual-signature flow (Client + Partner) and auto-conversion webhook. |
| **Storage** | Client Document Vault | `SPEC-05` | **ENHANCE** | Automated provisioning of `/Clients/{clientCode}/` directories in SharePoint via Microsoft Graph API daemon (app-only credentials). |
| **Finance** | Time Tracking & Xero Billing | `SPEC-06` | **ENHANCE** | Retainer hours depletion, out-of-scope work capture, Xero 15% VAT (`OUTPUT2`) draft invoices, and Paystack payment links. |
| **UI/UX** | Navigation & Command Menu | `twenty` | **ADAPT** | Collapsible navigation drawer + `Cmd+K` global search palette across clients, directors, tasks, and tax numbers. |
| **UI/UX** | Dual Table + Kanban Views | `twenty` | **ADAPT** | Kanban board for 5-stage Onboarding Pipeline and Compliance Task review workflow. |
| **UI/UX** | 3-Pane Record Detail Page | `twenty` | **ADAPT** | Left pane: statutory signals & attributes; Center canvas: Timeline, Notes, Tasks, Documents; Right inspector: metadata. |
| **Security** | Partner Review Gate | `Client_CRM` | **ENHANCE** | Hard API enforcement preventing task status transition to `'Submitted'` without verified Partner sign-off for `always` and payable `IRP6`. |
| **Rules Engine** | Practice Rules & Statutory Tables | `Client_CRM` / New | **ADAPT** | Re-classify `#rules` from a static UI view into a 3-layer rules engine: pure `@fdoncall/domain` calculations, server review gate enforcement, and an editable Admin Settings panel (`/settings/practice-rules`). |
| **Calendar** | SA Public Holidays Overlay | `Client_CRM` / New | **ENHANCE** | Display official gazetted public holidays on the Tasks calendar with rollback badges; dynamic updates via `core.sa_public_holidays`. |
| **Workspace** | Single Workspace [FD on Call] | `twenty` | **ADAPT** | Hardcode single workspace (`IS_MULTIWORKSPACE_ENABLED=false`), remove multi-workspace switcher and generic admin panel tabs. |
| **Docs / Help**| twenty.com External Links | `twenty` | **DROP** | Remove external twenty.com/docs, discord, and marketing links; point help menu to internal practice handbook (`docs/spec-handbook.html`). |
| **Surfaces** | Generic B2B Sales Tools | `twenty` | **DROP** | Prune deals pipeline, customer success ARR metrics, and Stripe billing redirect via configuration and role permissions. |
| **Prototype** | Root Standalone Prototype | `_archive` | **DROP** | Completely archived in `_archive/legacy-standalone-prototype/`; no runtime usage. |

### 4.1 Shipped outcome against the Kepa matrix (2026-11-10)

The Kepa actions above were decided before the build. What actually happened, row by row:

| Matrix area | Shipped outcome | Verdict |
|---|---|---|
| **Core App** | Twenty CRM was not used. The app is `apps/web` (React 19 + Vite 7 + Tailwind v4); `packages/domain` holds the rules; there is no NestJS, PostgreSQL, Redis or GraphQL layer. | **KEPT the idea, DROPPED the monorepo** |
| **Domain** | Kept verbatim in `packages/domain` (10 statutory obligations, Easter Computus, Sunday rollover, business-day rollback), plus 6 export modules and 52 tests. | **KEPT** |
| **Domain — fee projection** | Kept as the quote builder's fee-schedule step; the standalone Estimator view was removed. PDF/XLSX are client-side. | **KEPT, RELOCATED** |
| **E-Sign** | The quote lifecycle and envelope-id gate exist; Documenso itself is simulated (no API call, no webhook). | **ADAPTED — partial** |
| **Storage** | No SharePoint or Graph daemon; the Vault tab records metadata only. | **DEFERRED** |
| **Finance** | Time tracking, retainer depletion and overage invoicing shipped; the Xero draft push is simulated; no Paystack links. | **ENHANCED in-app, integration deferred** |
| **UI/UX — navigation** | Purpose-built sidebar (Practice / Work / Admin), ⌘K command palette, AI assistant drawer, division switcher, light/dark. | **ADAPTED** |
| **UI/UX — Kanban** | Deadlines board with 6 lanes: Not Started, In Progress, Awaiting Client, Partner Review Gate, Approved (Ready to Lodge), Submitted. Sales Pipeline board over quotes. | **ADAPTED** |
| **UI/UX — record page** | Client record with 7 tabs (Overview, Organization, History, Tasks, Estimate, Vault, Notes) and a detail panel on the boards. | **ADAPTED** |
| **Security — partner gate** | Enforced as a locked `Partner sign-off` permission row plus the `Partner Review Gate` lane; there is no API to reject a transition (`PARTNER_REVIEW_REQUIRED` does not exist). | **ENHANCED in UI, server enforcement deferred** |
| **Rules engine** | Statutory rules are code in `packages/domain/src/rules.ts`; rates and service fees are editable in Settings → Practice Rules. No `/settings/practice-rules` URL (no router). | **ADAPTED** |
| **Calendar** | SA public holidays and rollback tags render on deadlines cards; the holiday table is editable in Settings → SA Public Holidays. | **ENHANCED** |
| **Workspace** | Single practice by construction — there is no workspace switcher to disable. | **SATISFIED** |
| **Docs / Help** | No Twenty marketing links exist; the practice handbook is `docs/spec-handbook.html`. | **SATISFIED** |
| **Surfaces** | No generic sales tools exist; the only pipeline is the quote pipeline. | **SATISFIED** |
| **Prototype** | The legacy prototype is not shipped and not imported. | **DROPPED** |

---

## 5. MoSCoW Prioritization Matrix

**Superseded (2026-11-10):** this was the v1 scope decision. The shipped system keeps the statutory engine, fee model, holiday-aware calendar and partner-review semantics, but not the Twenty local stack, PostgreSQL persistence, Documenso webhook, SharePoint provisioning or Xero/Paystack sync — see §4.1 for the delivered outcome per row.

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                       MoSCoW PRIORITIZATION MATRIX                                     │
├────────────────────────────────────────────────────┬───────────────────────────────────────────────────┤
│ MUST HAVE (Core Operational Foundation)            │ SHOULD HAVE (Automation & Practice Efficiency)   │
├────────────────────────────────────────────────────┼───────────────────────────────────────────────────┤
│ • Official Twenty CRM local stack (:3000, :3001)   │ • Documenso self-hosted e-signature integration   │
│ • PostgreSQL persistence for clients & tasks       │ • Dual-signature workflow (Client + Partner)      │
│ • Extended Company object with SA statutory fields │ • Inbound webhook for auto-conversion to active   │
│ • Extended Task object with review gates & periods │ • SharePoint automated vault provisioning (Graph) │
│ • 10 statutory deadline calculation algorithms     │ • Xero API draft invoice synchronization (15% VAT)│
│ • Blocker signal computation (missing dates, FYE)  │ • Paystack instant payment link generation        │
│ • Hard Partner Review Gate enforcement (always/when)│ • Activity timeline audit logging on all actions  │
│ • 12-Month Fee Estimator matrix with PDF/XLSX      │ • Re-theming Twenty UI with FD on Call Brand Kit  │
│ • 5-stage Onboarding Kanban board                  │ • Hourly time logging against retainer allowance  │
├────────────────────────────────────────────────────┼───────────────────────────────────────────────────┤
│ COULD HAVE (Advanced Intelligence & Convenience)   │ WON'T HAVE (Out of Scope for Practice CRM)        │
├────────────────────────────────────────────────────┼───────────────────────────────────────────────────┤
│ • WhatsApp direct signing link dispatch            │ • Proprietary SaaS e-signature tools (DocuSign)   │
│ • WhatsApp customer invoice notifications          │ • Direct external client login accounts to M365   │
│ • Nextcloud WebDAV alternative storage provider    │ • Generic B2B sales pipelines and price books     │
│ • AI natural language queries on compliance dates  │ • SaaS subscription ARR/MRR metrics & Stripe gate │
│ • Automated SARS Budget Speech bracket updater UI  │ • Re-building custom CRM shells from scratch      │
└────────────────────────────────────────────────────┴───────────────────────────────────────────────────┘
```

---

## 6. Comprehensive CRUD Specification Matrix

| Entity | Create (C) | Read (R) | Update (U) | Delete (D) |
|---|---|---|---|---|
| **Client (`Company`)** | Manual via UI modal, CSV import, or automated conversion from won `Opportunity`. | Directory table with filters, search by name/code/reg, 3-pane detail page with timeline. | Edit profile fields (FYE, VAT cat, turnover, payroll, eFiling status); recalculates blocker signals. | Soft-delete / Archive (`status = 'Resigned'` / `'Dormant'`); hard-delete restricted to Partners. |
| **Director / Contact (`Person`)** | Created via UI modal or Documenso signatory extraction; linked to `Company`. | Listed on Client Show page (Contacts tab) and global People directory. | Edit contact details (email, mobile, job title, provisional taxpayer flag, ID number). | Unlink from company or delete if no associated compliance tasks exist. |
| **Compliance Task (`Task`)** | Auto-materialized for 12 months upon client activation; manual ad-hoc task creation. | Practice `#deadlines` calendar, Kanban board, and client profile Tasks tab. Filterable by staff/horizon. | Update status (`Not started` → `In progress` → `In review` → `Submitted` → `Done`), assignee, SARS ref, IRP6 outcome. Enforces Review Gate. | Only manual tasks can be deleted; statutory obligations cannot be deleted (only marked done). |
| **Fee Estimate / Proposal** | Created in 12-Month Fee Estimator module; prefilled from client turnover & payroll. | Interactive 12-month matrix view (Columns C–P), downloadable PDF quote, and formula XLSX. | Adjust line item hours, override monthly fees (`touched` state), toggle 15% VAT, set March escalation. | Discard draft quote or archive historical quote version. |
| **Contract (`SPEC-04`)** | Generated from approved Fee Estimate; uploaded to Documenso with signing coordinates. | Viewed in Client Contracts tab with live signature status pills and Documenso audit certificate. | Status updated via webhook (`sent` → `client_signed` → `completed`). | Canceled in Documenso if proposal is rejected or renegotiated. |
| **Vault Attachment (`SPEC-05`)** | Uploaded via UI drag-and-drop or filed automatically by Documenso/Graph daemons. | Previewed in Client Documents tab; stream-downloaded via secure Graph API signed URLs. | Rename file, change document category (`Contract`, `Tax_Return`, `Statutory_KYC`, `Invoice`). | Deleted from SharePoint and database index; logged in Twenty Activity Timeline. |
| **Time Entry (`SPEC-06`)** | Logged by accountant/technician with duration (minutes), description, and billable flag. | Client Billing tab, monthly timesheet review, and unbilled work queues. | Edit logged minutes or adjust billable retainer classification before monthly billing close. | Deleted before invoice finalization; prohibited once associated with a finalized Xero invoice. |

**Note (2026-11-10).** This matrix is the pre-build entity design, written for Twenty's `Company` / `Person` / `Opportunity` / `Task` objects; it is not a description of the shipped data model. The implementation uses `Client` (statutory attributes, `services`, `contacts`), `Quote` (optionally carrying a prospect), `Invoice` + `InvoiceLine`, `TimeEntry`, statutory task status overrides plus `AdHocTask`, `PracticeUser` / `StaffProfile`, the permission matrix, `ActivityEvent`, and persisted `rates` / `integrations` config. Read the C/R/U/D rows as intent: no CSV import exists, there is no archive/soft-delete, and no server-side authorization restricts hard deletes because there is no server. Quote creation lives in the quote builder, not in a 12-month estimator view; invoice issuing is one-way (lines become read-only), and time entries are released back to billable when their billed line is removed.

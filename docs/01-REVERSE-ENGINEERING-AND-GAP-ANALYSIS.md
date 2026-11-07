# FD on Call CRM — Reverse Engineering & "Kepa" Gap Analysis

**Document Reference:** `docs/01-REVERSE-ENGINEERING-AND-GAP-ANALYSIS.md`  
**System Version Analyzed:** `FD on Call Practice System` v0.9.2 (`Client_CRM/`), `Twenty CRM` (`twenty/`), and `Jacques Workflow Specs` (`SPEC-04`, `SPEC-05`, `SPEC-06`)  
**Target Architecture:** Native Twenty CRM Monorepo with South African Statutory Compliance Engine, Documenso Dual-Signing, SharePoint Vault & Xero Sync  
**REA Analysis Evidence ID:** `ev_f9f780c7914574f84d2d55c43cb3662b846552ead0b5c7c2cd436a4e3b3c354a`

---

## Executive Summary

FD on Call is a specialized South African accounting, advisory, tax, and secretarial practice based in the Western Cape. The practice services 13 active client entities (companies, close corporations, trusts, and individuals) structured into 4 client groups (`axe`, `energy`, `signal-gun`, `knead`) across 9 staff members (Partners Erik and Wouter, Compliance Officer Nikita, Senior Accountants André and Lungani, Accountants Mia and Willem, Subcontractors Hannes and Caroline).

Historically, the practice operated through manual spreadsheets (`"Client info - Dummy.xlsx"` and `"Pricing.xlsx"`), leading to high operational risk: missed SARS and CIPC deadlines, unbilled out-of-scope work, unmonitored partner sign-off gates, and disconnected engagement contracts.

To solve this, the practice developed `Client_CRM` (v0.9.2), an in-memory React/TypeScript prototype featuring South African statutory deadline calculation rules (Companies Act s30(1), Tax Administration Act s25, VAT Act s28(1), Income Tax Act s89bis/4th Schedule), an Easter Computus holiday engine, and a 12-month rolling fee estimator matrix (Columns C–P) with client-side PDF and Excel generation. However, `Client_CRM` lacks multi-user database persistence, audit logging, role-based access control, document storage, and digital proposal signing.

Through automated **Reverse-Engineering Analysis (REA)** of the official local **Twenty CRM** monorepo (`packages/twenty-server`, `packages/twenty-front`, `packages/twenty-ui`, `packages/twenty-shared`) and synthesis with the commercial onboarding and financial specifications (`SPEC-04`, `SPEC-05`, `SPEC-06`), this document establishes the unified technical foundation. Twenty CRM serves as the sole application base, extended with FD on Call's pure domain rules, integrated with self-hosted **Documenso** for dual-signature engagement contracts, backed by **SharePoint (Microsoft Graph API)** for client vault storage, and synchronized with **Xero** for 15% South African VAT invoicing.

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
3. **`Opportunity` (`core.opportunity`):** Native Kanban pipeline with customizable stages. Maps directly to the 5-stage Lead Onboarding Pipeline.
4. **`Task` (`core.task`):** Native task scheduler (`dueAt`, `status`, `assigneeId`, `targetCompanyId`). Extended with statutory metadata (`serviceCode`, `reviewRule`, `irp6Outcome`, `reviewedByPartnerId`).
5. **`Note` & `Attachment` (`core.note`, `core.attachment`):** Native file attachment and rich-text note threads linked to any entity.

### 2.3 Surface Pruning Strategy for Accounting Practice
Twenty's generic B2B sales surfaces will be pruned via **Navigation Drawer Configuration and Role Permissions**, keeping the core engine intact:
- **RETAINED & PROMINENT:**
  - `Clients` (Companies) with 3-pane record show view and statutory blocker signals.
  - `Contacts & Directors` (People) with relationship links.
  - `Onboarding Pipeline` (Opportunities) Kanban board.
  - `Statutory Compliance Calendar` (Tasks) with Deadlines dashboard.
  - `Dashboards & Widgets` with practice compliance KPI tiles.
  - `AI Chat & AI Agents` for natural language practice queries.
  - `Command Menu (Cmd+K)` for rapid client and tax number search.
- **PRUNED / HIDDEN:**
  - Generic sales pipelines (`Deals`, `Product Catalog`, `Price Books`).
  - SaaS subscription ARR/MRR metrics and Stripe customer billing redirection.
  - Multi-workspace switching and developer API documentation for operational accountants.

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

---

## 5. MoSCoW Prioritization Matrix

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

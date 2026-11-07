# FD on Call CRM — UI Information Architecture & Screen Flow Specification

**Document Reference:** `docs/05-UI-INFORMATION-ARCHITECTURE-AND-SCREEN-FLOWS.md`  
**Diagram Reference:** `docs/diagrams/09-ui-information-architecture-and-screen-flows.html`  
**Target Application:** Standalone Modern CRM (`/home/hein/Projects/CRMv2`)  
**Design System Base:** Twenty CRM Dark/Light Component Geometry with FD on Call Brand Identity  
**Status:** Approved Architectural Blueprint & Developer Handoff Spec  

---

## 1. Executive Summary: The "Missing Link" Between Specs & UI

Historically, the project struggled with an impedance mismatch between business specifications and UI layout:
1. **Requirements Documents (`docs/01`–`docs/04`):** Specified South African statutory rules (Companies Act s30(1), Tax Administration Act s25, VAT Act s28), 12-month rolling fee formulas, and partner review gates, but did not define **screen layout, navigation breadcrumbs, or user click paths**.
2. **Client Prototype (`Client_CRM` v0.9.2):** A quick in-memory React/TypeScript prototype that crammed the 12-month estimate onto an isolated hash route (`#estimate-MUS-875`), leaving no intuitive back navigation and isolating the client code.
3. **Twenty CRM Core Monorepo (`/twenty`):** An enterprise-scale metadata engine that imposed multi-minute builds and complex TypeORM/MikroORM layers when all that was needed was Twenty's clean visual shell.

This document serves as the **BABOK-grade Information Architecture (IA) and Screen Blueprint**. It translates every business requirement into concrete UI screens, navigation tabs, and user click flows.

---

## 2. Global Information Architecture & Layer Hierarchy

The application layout follows a strict 4-layer information architecture modeled on Twenty CRM's collapsible workspace shell:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 LAYER 1: PERSISTENT SHELL                              │
│  [FD Logo] FD on Call (Static)       Search ⌘K       Breadcrumbs       + Create Button │
├──────────────────────┬─────────────────────────────────────────────────────────────────┤
│ SIDEBAR NAVIGATION   │  LAYER 2: MASTER WORKSPACE REGISTERS & LISTS                    │
│                      │  • /dashboard          ➔ Practice KPI Tiles & Urgent Review Queue │
│ [Home] [Inbox] [⚙️]   │  • /clients            ➔ Clients Directory (Code, Name, FYE, Svc)│
│                      │  • /deadlines          ➔ Statutory Deadlines (Kanban & Table)     │
│ OVERVIEW             │  • /quotes/new         ➔ New Client Proposal & Quote Calculator  │
│ 📊 Dashboard         ├─────────────────────────────────────────────────────────────────┤
│ 📈 Reports           │  LAYER 3: CLIENT RECORD SHOW VIEW (/clients/:code)              │
│                      │  • Tab 1: Overview & Statutory Profile (CIPC, Year-End, VAT)    │
│ PRACTICE DATA        │  • Tab 2: Deadlines & Tasks (Client Filing Tasks & Review Gates)│
│ 🏢 Clients           │  • Tab 3: 12-Month Fee Estimate (Quote Matrix & March +6%)      │
│ 👥 People            │  • Tab 4: SharePoint Vault & SLAs (Contracts, KYC Folders)      │
│                      ├─────────────────────────────────────────────────────────────────┤
│ STATUTORY OPS        │  LAYER 4: OUTPUTS & INTEGRATIONS                                │
│ 📅 Deadlines         │  • Streaming A4 PDF Quote & Formula Excel (.xlsx) Exporters     │
│ 🧮 New Quote Calc    │  • Documenso Dual-Signature REST API Envelope Dispatch          │
│                      │  • Xero 15% South African VAT Invoicing Sync (ACCREC Drafts)    │
│ USER / AUTH (Footer) │  • Microsoft Graph SharePoint Client Vault Provisioning Daemon  │
│ [EW] Erik (Partner) ➔│                                                                 │
└──────────────────────┴─────────────────────────────────────────────────────────────────┘
```

---

## 3. Screen-by-Screen Functional Blueprint

### Screen 1: Persistent Shell & Navigation (`Layout.tsx`)
* **Top Header Bar (44px height):**
  * **Left:** Static brand mark `[FD] FD on Call` (no dropdown chevron; single-tenant practice).
  * **Search Control:** `🔍 Search clients or tax numbers... ⌘K` opening a Radix Command Menu modal.
  * **Dynamic Breadcrumbs:** `Clients / Muse 1399` with client code badge `[MUS-875]` and click-to-return navigation.
  * **Right Actions:** Crimson `+ Create` button, Notification tray, and Settings quick-access.
* **Left Sidebar (236px width):**
  * **Top Cluster:** `[🏠 Home]` (Dashboard), `[📥 Inbox]` (Partner Review Queue with unread badge), `[⚙️ Settings]` (Two-pane practice settings).
  * **Overview Group:** `Dashboard` (`/dashboard`), `Reports` (`/reports`).
  * **Practice Data Group:** `Clients` (`/clients` with total count `13`), `People & Directors` (`/people` with count `18`).
  * **Statutory Operations Group:** `Statutory Deadlines` (`/deadlines` with overdue badge count `4`), `New Quote Calculator` (`/quotes/new`).
  * **Footer User Menu:** `[EW] Erik (Partner)` clickable avatar displaying popover with `Profile Settings`, `Change Password`, and `Log out` (powered by Better-Auth).

---

### Screen 2: Clients Directory Register (`/clients`)
* **Purpose:** Primary practice operational register for managing active companies, close corporations, trusts, and individuals.
* **Format:** Twenty-style dense data grid with column sorting, search filter, and row click-through.
* **Columns:**
  1. **Code:** Dedicated monospace badge (e.g., `ALC-610`, `MUS-875`, `SGW-204`).
  2. **Client Legal Name:** Primary text with company group tag (e.g., `Signal Gun Wines (Pty) Ltd · signal-gun`).
  3. **Entity Type:** `Company`, `Close corporation`, `Trust`, or `Individual`.
  4. **Responsible Staff:** Assignee name with subcontractor note (e.g., `Erik (Partner)`, `André with Caroline`).
  5. **Year End:** Financial year-end month with warning indicator for unverified CIPC data (e.g., `Feb`, `Feb* (Assumed)`).
  6. **VAT Category:** `Cat A` (Odd), `Cat B` (Even), `Cat C` (Monthly), or `—` (Not registered).
  7. **Payroll:** `Yes (14 staff)` or `—`.
  8. **Active Services:** Compact badge chips (`AFS`, `ITR14`, `IRP6`, `VAT201`, `EMP201`).
  9. **Next Statutory Deadline:** Service code + due date + urgency badge (e.g., `[IRP6] 26 Feb 2027`, `[AFS] 68 days late`).
* **Interaction:** Clicking any row routes to `/clients/:code` (Client Record Show).

---

### Screen 3: Client Record Show Page (`/clients/:code`)
* **Header & Summary Bar:**
  * Client Avatar + Legal Name (`Muse 1399`) + Monospace Code Badge (`MUS-875`).
  * Sub-meta: Entity Type, Taxpayer Classification, Turnover Band (`R4M`), Managing Partner (`Erik`).
  * Urgent Blocker Banner: Rendered if deadlines are overdue or master data is missing (e.g., `⚠️ 1 item overdue: AFS FY26 is 68 days late`).
  * Quick Actions: `[+ Export PDF Quote]`, `[+ Log Return Submission]`.
* **The 4 Master Tabs:**

#### Tab 1: Overview & Statutory Profile
* **Two-column layout:**
  * **Left Column (Statutory Metadata):**
    * Financial Year-End selector (1–12) with `Assumed` flag toggle.
    * CIPC Incorporation Date picker (triggers CIPC Annual Return due date).
    * Annual Turnover field (ZAR input, year, source) driving CIPC fee band calculation.
    * VAT Registration toggle (enables VAT category dropdown & registration date).
    * Payroll toggle (enables employee count input & SimplePay tier badge).
    * SARS eFiling profile switch (`FD on Call profile` vs `Client own profile`).
  * **Right Column (Active Retainers & Services):**
    * Checkbox list of 21 standard service catalog items.
    * Toggling a service automatically provisions or prunes that service's compliance tasks.

#### Tab 2: Deadlines & Tasks
* **Statutory Compliance Calendar for this Client:**
  * Filterable list of all generated obligations grouped by service (`AFS`, `VAT201`, `ITR14`, `IRP6`, `CIPC_AR`).
  * Each task displays: Statutory Due Date, Calculated Holiday Rollback tag (e.g., `↩ Rolled back from Sun 30 Apr to Fri 28 Apr (Freedom Day)`), Assigned Staff, and Status dropdown.
  * **Partner Review Gate:** If task is `AFS`, `ITR14`, `ITR12T`, or payable `IRP6`, changing status from `'In review'` to `'Submitted'` requires Partner credentials (Erik/Wouter).

#### Tab 3: 12-Month Fee Estimate (Quote)
* **Embedded Quote Builder for Existing Client:**
  * Displays fee parameters: Turnover band, Standard rate (`R625/h`), March price escalation (`6.0%`).
  * **Interactive 12-Month Matrix (Columns C to P):**
    * Columns for each rolling month (e.g., Dec 2026 to Nov 2027) with March escalation highlighted.
    * Service line items broken into groups: *Regular Work*, *Compliance*, *Annual Work*, *Recharges*, *Once-Off Setup*.
    * Calculated Summary: Smoothed Monthly Retainer (Excl. VAT and Incl. 15% SA VAT) and Year Total.
  * **Export Action Bar:**
    * `[Download PDF Quote]`: Streams client-ready A4 Landscape PDF with signature blocks.
    * `[Download Excel]`: Generates `.xlsx` workbook with live `SUM`, `ROUND`, and `IF` formulas.
    * `[Save Quote to Client]`: Updates the client's billing agreement and syncs services.

#### Tab 4: SharePoint Vault & SLAs
* **Microsoft Graph API Directory Mirror:**
  * Shows automated folder hierarchy:
    * `📁 /Clients/{code}/Contracts/` (Signed SLA engagement letters).
    * `📁 /Clients/{code}/Tax_Returns/` (Filed ITR14, IRP6 receipts, VAT201 eFiling confirmations).
    * `📁 /Clients/{code}/Statutory_KYC/` (CIPC registration certificates, Beneficial Ownership filings).
    * `📁 /Clients/{code}/Accounting_Invoices/` (Monthly Xero billing copies).

---

### Screen 4: Statutory Deadlines Dashboard (`/deadlines`)
* **Top Metric Tiles:**
  1. `Overdue Filings` (Red alert tone, count + breakdown).
  2. `Due in 7 Days` (Orange warning tone, EMP201/VAT201 windows).
  3. `Due in 30 Days` (Blue standard tone).
  4. `Missing a Date (Blockers)` (Yellow warning tone, lists clients needing incorporation dates or CIPC disclosure certs).
* **View Modes:**
  * **Kanban Mode:** 4 columns: `Overdue`, `Due in 7 Days`, `In Partner Review`, `Missing a Date`. Cards display client code, return name, partner review badges, and assignee avatars.
  * **Table Mode:** Full practice-wide compliance register with multi-column sorting and filtering by Staff Member, Service Type, and Horizon (30, 90, 365 days).

---

### Screen 5: New Quote Calculator (`/quotes/new`)
* **Purpose:** Quoting prospective clients before they exist in the practice register.
* **Workflow:**
  1. Partner enters Prospect Name, Entity Type, estimated Turnover, and Payroll size.
  2. System auto-populates default hours from turnover and payroll bands.
  3. Partner adjusts service checkboxes and custom hours.
  4. Matrix calculates smoothed monthly debit order retainer.
  5. Partner clicks **`[Send Proposal via Documenso]`** (initiates dual-signature SLA flow) or **`[Accept & Create Active Client]`** (provisions client code, directories, and 12 months of tasks).

---

### Screen 6: Two-Pane Practice Settings (`/settings`)
* **Left Sub-Navigation (Master):**
  * *User Settings:* Profile, Experience (Dark/Light Mode), Accounts.
  * *Practice Rules:* Statutory & SARS Rules, SA Public Holidays, Service Catalogue (21 items), Staff & Review Permissions.
  * *Integrations:* Documenso E-Sign, SharePoint MS Graph, Xero 15% VAT Sync, AI Providers (`Coming Soon`).
* **Right Content Pane (Detail):**
  * Configuration forms for practice parameters (e.g., annual March fee escalation percentage, holiday gazette dates, partner sign-off rules).

---

## 4. Primary User Click Flows

### Flow 1: Reviewing and Exporting a Client Fee Quote
```
[Sidebar: 🏢 Clients]
       │
       ▼ (Click row: MUS-875 Muse 1399)
[/clients/MUS-875 (Client Record Show)]
       │
       ▼ (Click Tab: 🧮 12-Month Fee Estimate)
[Review 12-Month Matrix: R3,840/mo excl. VAT]
       │
       ├─────────────────────────┬─────────────────────────┐
       ▼                         ▼                         ▼
[Download PDF Quote]     [Download Excel]          [Save to Client]
(Streams A4 landscape    (Streams formula-driven   (Updates services
 signed proposal)         .xlsx workbook)           & recalculates tasks)
```

### Flow 2: Partner Sign-Off Gate on Tax Return
```
[Top Cluster: 📥 Inbox (2)] or [Sidebar: 📅 Statutory Deadlines]
       │
       ▼ (Filter: "Partner Review Queue")
[Task Card: Axe Engineering · IRP6 (1st) · Payable]
       │
       ▼ (Click Task Drawer / Action)
[Partner Verification Modal: Review Tax Computation]
       │
       ├── If Authenticated as Partner (Erik/Wouter) ──➔ Status updated to 'Submitted'
       │                                                 SARS Reference recorded
       │
       └── If Authenticated as Staff (André/Mia) ─────➔ Action blocked:
                                                         "PARTNER_REVIEW_REQUIRED"
```

---

## 5. Technical Handoff Guide for `/home/hein/Projects/CRMv2`

When creating the new project in `/home/hein/Projects/CRMv2`, follow this architecture:

### 5.1 Tech Stack Architecture
* **Frontend:** React 19 + Vite + Tailwind CSS + **shadcn/ui** (Lucide icons, Radix UI primitives, `@tanstack/react-table`).
* **Authentication & RBAC:** **Better-Auth** (email/password, session cookies, roles: `partner`, `compliance_officer`, `senior_accountant`, `accountant`, `subcontractor`).
* **Backend & API:** **Node.js with Hono** (lightweight, zero cold-start, type-safe RPC, Zod validation).
* **Database & ORM:** **PostgreSQL 16 + Drizzle ORM**. Type-safe schema migrations:
  * `clients` (statutory profile, codes, turnover, year-ends).
  * `people` (contacts, directors, staff members).
  * `compliance_tasks` (due dates, holiday rollbacks, review gates, sars reference).
  * `fee_estimates` (saved inputs, monthly matrix, smoothed retainers).
  * `time_entries` (hours logged against monthly retainer allowances).

### 5.2 Direct Code Transfer from `Client_CRM/`
The 19 pure TypeScript modules from `/home/hein/Projects/CRM/Client_CRM/source.json` transfer directly into `CRMv2/packages/domain` without modification:
* `src/domain/dates.ts`: Computus Easter calculation, South African public holiday rollovers, `businessDayOnOrBefore()`.
* `src/domain/sars.ts`: SARS statutory filing season rules (`IRP6`, `ITR14`, `ITR12`, `VAT201`, `EMP201`, `EMP501`).
* `src/domain/pricing.ts` & `catalogue.ts`: 21 service line items, turnover bands, payroll tiers, Xero subscription rates.
* `src/domain/estimate.ts`: 12-month rolling projection math, March escalation, smoothed retainer formulas.
* `src/export/pdf.ts`, `sheet.ts`, `xlsx.ts`: Pure client-side A4 PDF and formula-driven Excel quote generators.

### 5.3 Twenty CRM Visual Shell Extraction
The exact styling tokens and layouts are captured in `docs/diagrams/09-ui-information-architecture-and-screen-flows.html` and the Brainstorming Visual Companion:
* Canvas background: `#141414` (dark) / `#f6f5f3` (light).
* Sidebar & Header: `#171717` (dark) / `#ffffff` (light).
* Hairline borders: `#262626` (dark) / `#d6d3cf` (light).
* Brand Crimson accent: `#c4161c` (active items, create buttons, overdue alerts).

---

## 6. Document Approvals & Next Steps

1. **Information Architecture Verified:** `docs/diagrams/09-ui-information-architecture-and-screen-flows.html` passed automated geometric and accessibility verification (`self_check.py: OK`).
2. **Next Step:** Ready to proceed with scaffolding `/home/hein/Projects/CRMv2` using the verified stack and importing the client domain logic.

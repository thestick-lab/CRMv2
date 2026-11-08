# FD on Call CRM (CRMv2) — Master Handoff & Implementation Blueprint

**Project Target Directory:** `/home/hein/Projects/CRMv2`  
**Client / Brand:** FD on Call (and subsidiary *Accountant on Call*), Durbanville, Western Cape, South Africa  
**Industry:** South African Chartered Accountancy (SAICA), Tax Advisory, Statutory Secretarial & Virtual Financial Direction  
**Core Purpose:** High-velocity practice operating system unifying South African statutory compliance dates, 12-month rolling fee projections, dual-signature digital SLAs, SharePoint vaults, and Xero 15% VAT invoicing within Twenty CRM's exact modern aesthetic.

---

## 1. Why CRMv2 Exists (The Architectural Retrospective)

### The Problem in CRM v1:
* In the previous iteration, we attempted to customize Twenty CRM by hacking directly into its 500,000-line Nx monorepo (`packages/twenty-front`, `packages/twenty-server`).
* **Why it failed:** Twenty CRM is not a UI template; it is a Salesforce-class dynamic metadata platform. Adding one custom field (e.g. `cipcNumber` or `yearEndMonth`) required navigating MikroORM migrations, GraphQL codegen, Linaria compilation, Jotai atoms, and Lingui i18n churn, turning simple 10-line features into multi-day hurdles.

### The CRMv2 Solution:
* **The Look & Feel:** Twenty CRM's exact aesthetic (collapsible dark/light sidebar, top-bar breadcrumbs, `Cmd+K` search, clean table grids, and Lucide icons).
* **The Architecture:** A clean, lightning-fast modern stack (React 19 + Vite + Tailwind CSS + shadcn/ui + Better-Auth + Drizzle ORM + PostgreSQL 16) with **0.05-second HMR** and **100% control**.
* **The Domain Logic:** Direct, zero-drift import of the 19 mathematically verified TypeScript modules from `packages/domain/` (Easter Computus holiday rollbacks, SARS IRP6/ITR14 rules, 12-month fee matrix, and client-side PDF/XLSX generation).

---

## 2. The 4-Layer Specification Blueprint (Why, What, Where, How)

Every requirement in this repository is structured according to the 4-layer specification framework:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        THE 4-LAYER SPECIFICATION FRAMEWORK                             │
├─────────┬───────────────────────────────┬──────────────────────────────────────────────┤
│ Layer   │ Core Question                 │ Specification File Reference                 │
├─────────┼───────────────────────────────┼──────────────────────────────────────────────┤
│ 1. WHY  │ Business Value & South        │ docs/01-REVERSE-ENGINEERING-AND-GAP-         │
│         │ African Statutory Risks       │ ANALYSIS.md & docs/design.md                 │
├─────────┼───────────────────────────────┼──────────────────────────────────────────────┤
│ 2. WHAT │ Functional Capabilities,      │ docs/02-PRD-AND-OPEN-QUESTIONS.md &          │
│         │ Epics 1–7, & Database Schemas │ docs/03-ARCHITECTURE-AND-DATABASE-SPEC.md    │
├─────────┼───────────────────────────────┼──────────────────────────────────────────────┤
│ 3. WHERE│ Information Architecture,     │ docs/05-UI-INFORMATION-ARCHITECTURE-AND-     │
│         │ 4-Tab Record Show, & Wireflow │ SCREEN-FLOWS.md & Diagram 09 (HTML/SVG)      │
├─────────┼───────────────────────────────┼──────────────────────────────────────────────┤
│ 4. HOW  │ Tech Stack, Better-Auth RBAC, │ packages/domain/ (33 pure TypeScript source  │
│         │ Drizzle DDL, & Components     │ modules) & HANDOFF.md                        │
└─────────┴───────────────────────────────┴──────────────────────────────────────────────┘
```

---

## 3. Directory Layout in CRMv2

```
/home/hein/Projects/CRMv2/
├── docs/                                 # Complete Technical & Functional Specs
│   ├── 01-REVERSE-ENGINEERING-AND-GAP-ANALYSIS.md
│   ├── 02-PRD-AND-OPEN-QUESTIONS.md      # Epics 1–7 with Screen Cross-References
│   ├── 03-ARCHITECTURE-AND-DATABASE-SPEC.md # PostgreSQL DDL & Cloud Architecture
│   ├── 04-BASELINE-CHANGELOG-AND-WORKFLOW-AUDIT.md
│   ├── 05-UI-INFORMATION-ARCHITECTURE-AND-SCREEN-FLOWS.md # The Master UI Spec
│   ├── design.md                         # Color Tokens, Typography, WCAG AA/AAA
│   ├── spec-handbook.html                # Interactive Handbook & Live Test Suite
│   └── diagrams/                         # 9 Publication-Grade Editorial HTML+SVG Diagrams
│       ├── 01-architecture-delta-twenty-to-fdoncall.html
│       ├── 02-practice-data-flow.html
│       ├── 03-compliance-rule-flowchart.html
│       ├── 04-client-onboarding-and-compliance-journey.html
│       ├── 05-task-and-lead-state-machines.html
│       ├── 06-database-schema-and-cloud-architecture.html
│       ├── 07-as-is-vs-to-be-workflow.html
│       ├── 08-api-plugin-integrations.html
│       └── 09-ui-information-architecture-and-screen-flows.html # Master IA Flow
├── assets/                               # Official FD on Call Logos & Badges
│   ├── fd-on-call-logo.png
│   ├── fd-on-call-footer-logo.png
│   ├── accountant-on-call-logo.png
│   ├── xero-certified-advisor.png
│   └── favicon-32.jpg
├── research/                             # SARS, CIPC, Xero & REA Research Files
│   ├── rea-twenty-front-analysis.json
│   ├── rea-client-crm-analysis.json
│   ├── SARS FILING SEASON & IRP6.md
│   ├── CIPC AR & BENEFICIAL OWNERSHIP.md
│   └── XERO SA & SIMPLEPAY PRICING.md
├── packages/
│   └── domain/                           # 33 Pure TypeScript Domain Modules
│       ├── src/domain/                   # SARS rules, dates, pricing, estimate
│       │   ├── dates.ts                  # Computus Easter & SA public holiday rollback
│       │   ├── sars.ts                   # Filing seasons (IRP6, ITR14, VAT201, EMP201)
│       │   ├── pricing.ts & catalogue.ts # 21 services, turnover & payroll bands
│       │   ├── estimate.ts               # 12-month rolling projection math
│       │   └── rules.ts & types.ts       # Governance review rules & entity types
│       ├── src/export/                   # PDF, Excel (.xlsx), and ZIP exporters
│       │   ├── pdf.ts                    # Streaming A4 Landscape PDF quote generator
│       │   ├── xlsx.ts & sheet.ts        # Live formula Excel assembly (SUM, ROUND)
│       │   └── logo.ts
│       ├── src/data/seed.ts              # 13 seeded practice clients & 9 staff members
│       └── tests/                        # Vitest suites for dates, math, and exports
└── HANDOFF.md                            # This Master Document
```

---

## 4. The 4-Tab Information Architecture (Where Everything Lives)

```
[PERSISTENT TOPBAR: Brand Mark "FD on Call" (Static) | 🔍 Search Cmd+K | Breadcrumbs]
───────────────────────────────────────────────────────────────────────────────────
[SIDEBAR]                 [CLIENT RECORD SHOW VIEW (/clients/:code)]
🏠 Home (Dashboard)        Header: [← Clients]  Muse 1399  [MUS-875]  Company  Partner: Erik
📥 Inbox (Review Queue)   ─────────────────────────────────────────────────────────────────
⚙️ Settings               [📋 Statutory Profile] [📅 Deadlines] [🧮 12-Mo Estimate] [📁 Vault]
                          ┌───────────────────────────────────────────────────────────────┐
PRACTICE DATA             │ TAB 1: OVERVIEW & STATUTORY PROFILE                           │
🏢 Clients (13)           │ • Financial Year-End (Feb*) & CIPC Incorporation Date         │
👥 People & Directors (18)│ • Turnover (R4M) & VAT Registration (Category B)              │
                          │ • SARS eFiling Profile (Firm Profile vs Client Profile)       │
STATUTORY OPS             ├───────────────────────────────────────────────────────────────┤
📅 Deadlines (4)          │ TAB 2: DEADLINES & TASKS                                      │
🧮 New Quote Calculator   │ • Generated filing calendar with SA Holiday Rollback tags     │
🎯 Onboarding Pipeline (5)│ • Partner Review Gate on AFS, ITR14, and Payable IRP6         │
                          ├───────────────────────────────────────────────────────────────┤
FOOTER USER               │ TAB 3: 12-MONTH FEE ESTIMATE & QUOTE                          │
[EW] Erik (Partner) ➔     │ • Dynamic Columns (Dec 2026 – Nov 2027) with March +6%        │
• Profile Settings        │ • Smoothed Monthly Retainer: R 3,840 excl. VAT (R 4,416 incl) │
• Change Password         │ • Actions: [Download PDF Quote] [Download Excel] [Save]       │
• Log out                 ├───────────────────────────────────────────────────────────────┤
                          │ TAB 4: SHAREPOINT VAULT & SLAS                                │
                          │ • /Clients/MUS-875/Contracts/ (Dual-Signed Documenso SLA)     │
                          │ • /Clients/MUS-875/Tax_Returns/ (IRP6 & ITR14 Filing Packs)   │
                          └───────────────────────────────────────────────────────────────┘
```

---

## 5. Technical Stack & Implementation Guide

### 5.1 Recommended Application Stack
1. **Frontend App (`apps/web`):**
   * **Framework:** React 19 + Vite 8.
   * **Styling & Components:** Tailwind CSS v4 + **shadcn/ui** (Sidebar, Table, Tabs, Dialog, DropdownMenu, Command Palette `Cmd+K`, Badge, Card).
   * **Icons:** `lucide-react` or `@tabler/icons-react` (matching Twenty CRM 1:1).
   * **Tables & Forms:** `@tanstack/react-table` + `react-hook-form` + `zod`.
2. **Backend & API (`apps/api`):**
   * **Framework:** Node.js with **Hono** (ultralight, Web Standards, type-safe RPC client).
   * **Authentication:** **Better-Auth** (email/password, sessions, role middleware: `partner`, `compliance_officer`, `accountant`).
3. **Database & ORM (`packages/db`):**
   * **Engine:** PostgreSQL 16 (local Docker or Neon/Supabase).
   * **ORM:** **Drizzle ORM** (type-safe SQL schema with simple migrations).
4. **Domain Engine (`packages/domain`):**
   * Directly import from `/home/hein/Projects/CRMv2/packages/domain/src/domain/`.

### 5.2 Brand Identity Tokens (from `docs/design.md`)
* **Backgrounds:** Canvas `#141414` (dark) / `#f6f5f3` (light) | Surface `#181818` (dark) / `#ffffff` (light).
* **Borders:** Hairline rule `#262626` (dark) / `rgba(27,24,23,0.12)` (light).
* **Text:** Primary `#ebebeb` (dark) / `#1b1817` (light) | Muted `#888888` / `#5c5652`.
* **Primary Accent:** Brand Crimson `#c4161c` (hover `#d91b22`, dark badge bg `rgba(196,22,28,0.10)`).
* **Typography:**
  * Display / Headers: `Instrument Serif` (Google Fonts).
  * Body / UI Sans: `Inter` or `Geist` (400, 500, 600).
  * Monospace / Data: `Geist Mono` (ZAR currency figures, codes `MUS-875`, tax deadlines).

---

## 6. Phase-by-Phase Execution Checklist

- [x] **Phase 1: Project Scaffolding**
  - Configured npm multi-package workspace (`apps/*`, `packages/*`).
  - Scaffolded `apps/web` with React 19, TypeScript, and Vite 7.
  - Configured Tailwind CSS v4 with exact FD on Call design tokens and shadcn UI primitives.
  - Linked `packages/domain` into `apps/web/package.json` with instant HMR and verified Vitest suite.
- [x] **Phase 2: Shell & Navigation (`Layout.tsx`)**
  - Recreated Twenty CRM's exact collapsible sidebar (240px / 56px) and persistent topbar (48px).
  - Implemented static brand header `[FD] FD on Call` and user footer popover for `[EW]` Erik (Partner).
  - Implemented `Cmd+K` command search modal with view switching and instant client searching.
  - Verified zero-issue Impeccable craft floor detector check and synchronized dark/light mode.
- [x] **Phase 3: Clients Register (`/clients`)**
  - Implemented TanStack Table with all 9 statutory columns: `Code`, `Client`, `Type`, `Responsible`, `Year End`, `VAT`, `Payroll`, `Services`, `Next Filing`.
  - Added multi-column sorting (Code, Legal Name, Next Deadline), global search, and entity category filter chips (Companies, CC, Trusts, Individuals).
  - Wired row click to `/clients/:code` with click-through navigation.
- [x] **Phase 4: Client Record Show (`/clients/:code`)**
  - Implemented top breadcrumb `Clients / Name [Code]` with back arrow button.
  - Built the 4 tabs: `Statutory Profile` (CIPC, Year End, VAT, SARS Profile), `Deadlines & Tasks` (holiday rollback & partner review gates), `12-Month Fee Estimate` (rolling matrix with March +6%), and `SharePoint Vault & SLAs` (Documenso contracts & tax filing packs).
- [x] **Phase 5: Statutory Deadlines Dashboard (`/deadlines`)**
  - Implemented 4 KPI tiles: `Overdue Filings`, `Due in 7 Days`, `Due in 30 Days`, `Missing a Date (Blockers)`.
  - Implemented dual Kanban (4 lane columns) and Table view modes with SA holiday rollback tags (`↩`).
  - Added multi-horizon filter controls (30d, 90d, 365d), staff assignee filter, and statutory return type filter.
- [x] **Phase 6: Quote Exporter & Integrations**
  - Connected client-side streaming A4 landscape PDF quote generation (`pdf-lib`) and live formula Excel generation (`.xlsx`).
  - Implemented Documenso REST API electronic signature dispatch modal with dual-signers (Managing Partner & Director) and SHA-256 audit log.
  - Implemented Xero API v2 repeating monthly draft invoice synchronization modal with chart of accounts mapping and 15% South African VAT.

- [x] **Phase 7: Interactive CRM Features, Settings, RBAC & AI Copilot**
  - Implemented centralized reactive `PracticeStoreContext` with `localStorage` persistence and seed hydration.
  - Resolved collapsed sidebar header overlap at 56px with centered brand mark and added translucent glass workspace dropdown.
  - Built People & Directors relational directory (`/people`) with 18 profiles (9 staff, 9 directors) and linked company navigation.
  - Implemented 5-Stage Onboarding Pipeline (`/pipeline`) with native HTML5 drag-and-drop, pipeline metrics, and client conversion.
  - Implemented interactive Deadlines Kanban with card drag-and-drop, dual workflow/urgency grouping, and double-click `StatutoryActionModal` with partner sign-off gates.
  - Built Two-Pane Settings (`/settings`) covering Profile (export/reset), Team RBAC invites, SA Public Holidays 2026/2027 Gazette, and AI provider key configuration.
  - Built topbar AI Practice Assistant drawer powered by Vercel AI SDK with zero-token local practice responder fallback.
- [x] **Phase 8: Unified Practice Operations, Governance & Linear Workflow**
  - Streamlined sidebar header with left-aligned collapse button (`PanelLeftClose`), horizontal icon utility bar (`Home`, `Inbox`, `Settings`) with hover tooltips and unread badge.
  - Interactive Client Record configuration (`/clients/:code`) with editable `Details` card and `Services` checkboxes live-toggling compliance deadlines, plus deep-link to Deadlines board.
  - Converted People directory (`/people`) into a dense TanStack Table of client directors and contacts with search and role-gated contact creation.
  - Transformed Deadlines board (`/deadlines`) into a Linear-style Kanban with 5 workflow lanes (`Not Started` ➔ `In Progress` ➔ `Partner Review Gate` ➔ `Approved (Ready to Lodge)` ➔ `Submitted`) and live clickable KPI filter buttons.
  - Built dedicated Partner Review Queue (`/inbox`) for Erik & Wouter with 1-click statutory approval (`Approved (Ready to Lodge)`) and revision requests.
  - Built 2-tab Unified Fee Estimator (`/estimator`) combining prospective/client 12-month retainer calculator (PDF/Excel exports + Documenso SLA dispatch) and Sent Quotes onboarding pipeline.
  - Built Twenty-CRM-style Settings (`/settings`) with User Profile/Security, Workspace AI, and Admin Panel (`Team & Staff Database`, `Service Catalogue & Pricing Matrix` with live SARS filing season sync, and immutable `SAICA Governance Log`).
---

*Verified & approved for immediate development in `/home/hein/Projects/CRMv2`.*

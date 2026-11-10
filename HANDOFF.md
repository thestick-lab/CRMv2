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
* **The Architecture:** A clean, lightning-fast modern stack (React 19 + Vite + Tailwind CSS + shadcn-style primitives + Better-Auth + Drizzle ORM) with **0.05-second HMR** and **100% control**. As built, practice data is client-side in one persisted store and the only server component is the auth function on Cloudflare D1 — see §5.1; the original plan's PostgreSQL service is not deployed.
* **The Domain Logic:** Direct, zero-drift import of the domain modules from `packages/domain/` — 7 domain modules and 6 export modules (Easter Computus holiday rollbacks, SARS IRP6/ITR14 rules, 12-month fee matrix, and client-side PDF/XLSX generation).

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
│         │ 11 views, 7-tab record show   │ SCREEN-FLOWS.md & Diagram 09 (HTML/SVG)      │
├─────────┼───────────────────────────────┼──────────────────────────────────────────────┤
│ 4. HOW  │ Tech Stack, permission matrix,│ packages/domain/ (7 domain + 6 export        │
│         │ auth guard, & components      │ modules) & HANDOFF.md                        │
└─────────┴───────────────────────────────┴──────────────────────────────────────────────┘
```

---

## 3. Directory Layout in CRMv2

```
/home/hein/Projects/CRMv2/
├── docs/                                 # Complete Technical & Functional Specs
│   ├── 01-REVERSE-ENGINEERING-AND-GAP-ANALYSIS.md
│   ├── 02-PRD-AND-OPEN-QUESTIONS.md      # Epics 1–11 with status and open questions
│   ├── 03-ARCHITECTURE-AND-DATABASE-SPEC.md # Current architecture + planned production schema
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
│   └── domain/                           # 7 domain modules + 6 export modules, 52 unit tests
│       ├── src/domain/                   # SARS rules, dates, pricing, estimate
│       │   ├── dates.ts                  # Computus Easter & SA public holiday rollback
│       │   ├── sars.ts                   # Filing seasons (IRP6, ITR14, VAT201, EMP201)
│       │   ├── pricing.ts & catalogue.ts # 10 services, turnover & payroll bands
│       │   ├── estimate.ts               # 12-month rolling projection math
│       │   └── rules.ts & types.ts       # Governance review rules & entity types
│       ├── src/export/                   # PDF, Excel (.xlsx), ZIP and audit-PDF exporters
│       │   ├── pdf.ts                    # Streaming A4 Landscape PDF quote generator
│       │   ├── xlsx.ts & sheet.ts        # Live formula Excel assembly (SUM, ROUND)
│       │   └── logo.ts
│       ├── src/data/seed.ts              # 13 seeded practice clients & 9 staff members
│       └── tests/                        # Vitest suites for dates, math, and exports
└── HANDOFF.md                            # This Master Document
```

---

## 4. Shell, Navigation & Client Record (Where Everything Lives)

```
[TOPBAR 48px: Breadcrumbs | ⌘K search | + New (quote / client / time) | theme toggle | avatar]
───────────────────────────────────────────────────────────────────────────────────────────
[SIDEBAR 240px / 56px]      [CLIENT RECORD (/clients/:code)]
PRACTICE                    ‹ Clients   Muse 1399  [MUS-875]   Company · Group
  🏠 Home                   Tag pills   [ + Add Action ▾ ]   [ Export PDF ] [ Export Excel ]
  📊 Analytics              ─────────────────────────────────────────────────────────────────
  📥 Inbox (badge)          Overview │ Organization │ History │ Tasks │ Estimate │ Vault │ Notes
WORK                        ┌───────────────────────┬──────────────────────┬───────────────┐
  🏢 Clients (13)           │ Contact Details       │ Organization         │ Next Action   │
  👥 Team (9 staff)         │ Missing Information   │ Relationship History │ Internal Notes│
  📅 Deadlines (badge)      │                       │                      │ Tags          │
  🎯 Sales Pipeline         └───────────────────────┴──────────────────────┴───────────────┘
  ⏱ Time
ADMIN                       • Estimate tab hidden without `Clients — view billing`
  ⚙️ Settings               • Tasks = the client's statutory deadlines; Vault = SharePoint/Documenso panes
  🛡 Governance Log         • History = the governance trail filtered to this client
FOOTER USER
  [ER] Erik (Partner) ▾
```

**Groups:** Practice = Home, Analytics, Inbox · Work = Clients, Team, Deadlines, Sales Pipeline, Time · Admin = Settings, Governance Log. Every item, ⌘K result and deep link is filtered by the permission matrix; a blocked route renders a `NoAccess` card.

**Boards:** Deadlines has six lanes (`Not Started`, `In Progress`, `Awaiting Client`, `Partner Review Gate`, `Approved (Ready to Lodge)`, `Submitted`); Sales Pipeline has six quote stages (`Draft Quote`, `Quote Sent`, `Accepted`, `Signed`, `Active Client`, `Closed Lost`). Both render through the shared `KanbanBoard` with drag, hover menu and keyboard (←/→ column, ↑/↓ reorder, 1–9 jump), refusing illegal moves with feedback.

---

## 5. Technical Stack & Implementation Guide (as implemented)

### 5.1 Application Stack
1. **Frontend App (`apps/web`):**
   * **Framework:** React 19 + Vite 7, TypeScript 5.8+.
   * **Styling & Components:** Tailwind CSS v4 with `@theme inline` tokens; shadcn-style primitives on Radix (`Dialog`, `Popover`, `Tabs`, `Slot`), `@tanstack/react-table`, `lucide-react`.
   * **Routing:** none — an in-memory `ViewKey` union in `apps/web/src/App.tsx`, with `NavigateOptions` carrying filters/pane targets.
   * **State:** one `PracticeStoreContext` (`useReducer` + `localStorage` key `crmv2_practice_state`). `loadPracticeState` merges persisted state over defaults: missing fields default, persisted values win, legacy `leads` migrate to quotes, legacy workflow statuses normalise, `Client.contacts` and `Invoice.billingMonth` backfill.
2. **Auth & Server (`apps/web/functions/api/[[route]].ts`):**
   * **Framework:** Hono on Cloudflare Pages Functions.
   * **Auth:** better-auth (email/password) with Drizzle over D1, database `crmv2-auth` (binding `DB`).
   * **Accounts:** ten seeded staff (`SEEDED_STAFF_ACCOUNTS`) created server-side by `ensureSeeded()`.
   * **Guard:** `functions/api/auth-guard.ts` refuses HTTP self-service sign-up with `403` and strips `role`/`staffId`/`kind` from other auth POST bodies, so a client cannot self-assign `Partner`.
3. **Practice data:** client-side only. No PostgreSQL / `packages/db` is deployed; `docs/03` documents the planned production schema as future work.
4. **Domain Engine (`packages/domain`):** 7 domain modules + 6 export modules, imported as `fdoncall-practice/domain/*`; 52 unit tests.
5. **Integrations:** simulated Documenso and Xero seams in `apps/web/src/lib/integrations/` — real payload shapes, no network calls, credentials in the local `integrationConfig` field.

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

## 6. Phase History (what was built, in order)

> Phases 1–8 describe earlier iterations. Items they mention that no longer exist — the `People & Directors` directory, the standalone `Estimator`, the `Onboarding Pipeline`, the 4-lane and 5-lane boards — were replaced in Phase 9; see §7 for the current state.

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
- [x] **Phase 9: Full Redesign & Feature Expansion (2026-11-09, 22 planned tasks, 44 commits)**
  - Foundation: extended store shape with `quotes` / `invoices` / `timeEntries` / `permissions` / `activity` / `adhocTasks` / `sequences`, an idempotent load-time migration, grouped navigation (`Practice` / `Work` / `Admin`) with the 11 shipped views, and shared `PageHeader` + list primitives.
  - Screens: Home workspace dashboard, Analytics (range + compare, explicit empty states, `—` for a zero-denominator Δ%), client contact record (7 tabs, 3-column Overview, Missing Information), staff-only Team, 6-lane Deadlines board with docked detail panel + ad-hoc tasks, restyled Inbox, grouped Settings, and the Governance Log as its own read-only view.
  - Quotes → signature → invoice: `Quote` with authoritative `estimateInput`, `canTransitionQuote` gating, simulated Documenso/Xero seams, three-step builder with live preview, Sales Pipeline board (Booked vs Open), invoice builder with stored `billingMonth`, cent-exact per-line 15% VAT, derived `Overdue`, read-only issued invoices, and quote→client conversion writing `Client.services`.
  - Time tracking: `TimeEntry` with quarter-hour rounding (15-minute floor), session-only timer, timesheet + reconciling report, retainer-overage invoice feed with release-on-delete.
  - Permissions & governance: six roles over six groups and 18 rows (`Allowed`/`Not allowed`/`Limited` stored, `Inherited`/`Custom` derived), assigned-scope for Subcontractors, locked partner sign-off, `Settings — manage` for invites and role changes, nav/⌘K/deep-link enforcement, matrix UI, and an audit trail extended to quotes, invoices, time and permission changes with a per-client history.
  - Cutovers: `leads` → quotes (idempotent migration), Estimator calculator → quote builder fee step, People directory → Team + `Client.contacts`, `isPartnerOrAdmin` → `can()`, SAICA settings pane → Governance Log view.
- [x] **Phase 10: Auth hardening (2026-11-10, `fe075f1`)**
  - Added `apps/web/functions/api/auth-guard.ts`: HTTP self-service sign-up now returns `403`, and `role` / `staffId` / `kind` are stripped from every other `POST /api/auth/*` body, because better-auth `additionalFields` previously let a caller sign up as `Partner` and inherit the permission matrix. Seeded accounts (created server-side via `auth.api.signUpEmail`) are unaffected.

---

## 7. Current State & Verification (2026-11-10)

**Views (11):** Home, Analytics, Inbox, Clients, Client record, Team, Deadlines, Sales Pipeline, Time, Settings, Governance Log.

**Data:** `localStorage` (`crmv2_practice_state`) via `PracticeStoreContext`; 13 seeded clients, 9 staff, 4 quotes migrated from the old leads. No application database.

**Capabilities:** quote → signature → invoice with lifecycle gating and simulated Documenso/Xero; six-stage sales pipeline; six-lane deadlines board with detail panel, keyboard moves and ad-hoc tasks; retainer time tracking and overage billing; six-role permission matrix; derived governance log with CSV/PDF export.

**Commands (from the repo root):**

```bash
npm test          # 464 web tests (48 files) + 52 domain tests
npm run typecheck
npm run build
npm run dev       # Vite on :3000 — IPv6 bind, use `localhost`, not 127.0.0.1
```

**Verified at merge:** full suite, typecheck and build green; all 11 views walked on a cleared store and on a persisted legacy store; quote → accept → invoice produced `INV-1` at R7 200 + R1 080 VAT = R8 280 with a stored billing month; client creation from `+ New`; PDF export download; ⌘K; AI assistant drawer; division switcher; holiday rollback tags (`↩`); and `POST /api/auth/sign-up/email` with `role: "Partner"` returning `403`.

## 8. Known Limitations & Open Product Decisions

Recorded so nobody re-discovers them as bugs:

1. **Fee visibility** — *Team member* holds `Quotes — view/create/send = Allowed` while `Clients — view billing = Not allowed`, so fees are visible in pipeline cards/KPIs and the quote builder's PDF/Excel. Aligning the rows is a matrix + product decision.
2. **`Mark Paid` from `Draft`** — allowed; no invoice transition rule was pinned.
3. **Audit dedupe** — submissions key on `submission:<taskId>`, so a genuine re-submission replaces the earlier milestone; the sign-off milestone folds into the submission row.
4. **Billing month vs issue date** — `billingMonth` is stored and drives billing, while document dates still come from `issueDate`.
5. **Running timer is session-only** — completed entries persist.
6. **Sign-off authority is Partner-only** — PRD Q2.5 (senior tax specialist) is still unanswered; lifting it touches `lib/permissions.ts` + the matrix UI.
7. **Documenso and Xero are simulated** — no network calls; credentials are local placeholders.
8. **Account creation is seed-only** — open sign-up is now closed; an admin-only create endpoint does not exist yet, and the privilege fields should also be marked non-inputtable at the schema level.
9. **`Add Action → New Quote`** is offered even where the role cannot use it (lands on the access-denied card).
10. **New clients assume prior filing history** (mirrors the seed convention), so a brand-new client may start without catch-up cards for prior years.

---

*Achieved and verified in `/home/hein/Projects/CRMv2`.*

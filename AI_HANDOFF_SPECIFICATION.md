# FD on Call CRM (CRMv2) — AI-to-AI Master Hand-Off Specification

> **Target Audience:** Target LLM / AI Engineering Assistant taking over repository `/home/hein/Projects/CRMv2`.  
> **Client / Brand:** **FD on Call** (and subsidiary *Accountant on Call*), Durbanville, Western Cape, South Africa.  
> **Industry:** South African Chartered Accountancy (SAICA), Tax Advisory, Statutory Secretarial & Virtual Financial Direction.

---

## 1. Executive Summary & End Goal

The end goal is a high-velocity, production-grade practice operating system (**CRMv2**) for **FD on Call** in Durbanville, South Africa. 
Unlike generic global CRMs (Salesforce, HubSpot, upstream Twenty CRM) that lack South African statutory tax logic, CRMv2 embeds verified South African statutory compliance rules (Companies Act s30(1), SARS Tax Administration Act s25, Easter Computus holiday rollback), 12-month rolling fee projections, a quote → signature → invoice pipeline, retainer-based time tracking, a six-role permission matrix, a derived governance audit log, dual-signature digital SLAs (Documenso), Xero 15% VAT draft invoice synchronization, and SharePoint document vaults inside Twenty CRM's modern aesthetic (`#141414` dark canvas / `#f6f5f3` light canvas, `Instrument Serif`, `Geist`, and `Geist Mono`).

**Status as of 2026-11-10 (44-commit redesign merged to `main`):** eleven views ship (Home, Analytics, Inbox, Clients, Client record, Team, Deadlines, Sales Pipeline, Time, Settings, Governance Log); practice data is client-side in one persisted store; Documenso and Xero are simulated seams, not live connections. The authoritative current-state description lives in [`docs/03-ARCHITECTURE-AND-DATABASE-SPEC.md`](docs/03-ARCHITECTURE-AND-DATABASE-SPEC.md) and [`docs/05-UI-INFORMATION-ARCHITECTURE-AND-SCREEN-FLOWS.md`](docs/05-UI-INFORMATION-ARCHITECTURE-AND-SCREEN-FLOWS.md); this document is the orientation map.

---

## 2. Technical Stack & Workspace Structure

```
/home/hein/Projects/CRMv2/
├── apps/web/                               # React 19 + Vite + Tailwind v4 + shadcn/ui
├── packages/domain/                        # 7 domain modules + 6 export modules (52 unit tests)
├── docs/                                   # Complete Technical & Functional Specifications
│   ├── 01-REVERSE-ENGINEERING-AND-GAP-ANALYSIS.md
│   ├── 02-PRD-AND-OPEN-QUESTIONS.md
│   ├── 03-ARCHITECTURE-AND-DATABASE-SPEC.md
│   ├── 04-BASELINE-CHANGELOG-AND-WORKFLOW-AUDIT.md
│   └── 05-UI-INFORMATION-ARCHITECTURE-AND-SCREEN-FLOWS.md
├── research/                               # SARS, CIPC, Xero & REA research files
└── assets/                                 # Official FD on Call logos and badges
```

### Stack Specifications (as implemented):
- **Frontend:** React 19, Vite 7, Tailwind CSS v4, shadcn-style primitives on Radix, Lucide React, TypeScript 5.8+. **No router library** — in-memory `ViewKey` routing in `apps/web/src/App.tsx`.
- **State:** a single `PracticeStoreContext` persisted to `localStorage` under `crmv2_practice_state`, with an idempotent load-time migration (missing fields default, persisted values win, legacy `leads` migrate to quotes, workflow statuses normalize, `Client.contacts` / `Invoice.billingMonth` backfill). **No PostgreSQL is deployed**; the planned production schema is documented in `docs/03`.
- **Auth / server:** a Cloudflare Pages Function, `apps/web/functions/api/[[route]].ts` (Hono + better-auth + Drizzle), backed by D1 (`crmv2-auth`, bound as `DB` in `apps/web/wrangler.toml`). Ten seeded staff accounts; the login screen matches seeded credentials locally in `src/lib/auth-client.ts`.
- **Domain Engine:** zero-dependency TypeScript modules in `packages/domain/` — 7 domain modules (`catalogue`, `dates`, `estimate`, `pricing`, `rules`, `sars`, `types`) plus 6 export modules (`pdf`, `sheet`, `xlsx`, `zip`, `logo`, `audit-pdf`) — handling calendar computations, SARS filing seasons, pricing matrices, and PDF/XLSX streaming exports. Imported as `fdoncall-practice/domain/*`; 52 unit tests.
- **Integrations:** `apps/web/src/lib/integrations/{documenso,xero}.ts` are simulated seams — synthetic `env-…` envelopes with two `SIGNER` recipients, and the real Xero `ACCREC` / `DRAFT` / `LineAmountTypes: Exclusive` / per-line `OUTPUT2|NONE` payload — with **no network calls**. Credentials live in the local `integrationConfig` store field.

---

## 3. Brand Identity & Design Tokens

- **Brand Names:** Primary: **"FD on Call"** | Subsidiary: **"Accountant on Call"**.
- **Brand Crimson:** `#c4161c` (hover `#a01217` / `#d91b22`, dark badge background `rgba(196,22,28,0.10)`).
- **Canvas Backgrounds:** Dark mode `#141414` | Light mode `#f6f5f3`.
- **Card Surfaces:** Dark mode `#181818` | Light mode `#ffffff`.
- **Borders:** Hairline rule `#262626` (dark) / `rgba(27,24,23,0.12)` (light).
- **Typography:**
  - Display / Headers: `Instrument Serif` (Google Fonts).
  - UI Sans / Body: `Inter` / `Geist` (weights 400, 500, 600).
  - Monospace / Data: `Geist Mono` (ZAR currency figures, codes like `MUS-875`, tax dates).

---

## 4. Shell, Navigation & Client Record (`/clients/:code`)

```
PERSISTENT TOPBAR: Breadcrumbs | ⌘K search | + New (quote / client / time) | theme | avatar
──────────────────────────────────────────────────────────────────────────────────────────
[SIDEBAR]                        [CLIENT RECORD]
PRACTICE                         Header: ‹ Clients   Muse 1399  [MUS-875]
  Home                           Subtitle: Company · Group · Partner
  Analytics                      Tag pills (services)   + Add Action ▾
  Inbox (pending approvals)      ─────────────────────────────────────────────────────────
WORK                             Overview | Organization | History | Tasks | Estimate | Vault | Notes
  Clients                        ┌────────────────────────┬───────────────────────┬──────────────┐
  Team                           │ Contact Details        │ Organization          │ Next Action  │
  Deadlines (overdue badge)       │ Missing Information    │ Relationship History  │ Internal Notes│
  Sales Pipeline                 │                        │                       │ Tags         │
  Time                           └────────────────────────┴───────────────────────┴──────────────┘
ADMIN
  Settings                       Notes:
  Governance Log                 • Overview = 3-column grid (contact + gaps | org + history | next action + notes + tags)
FOOTER USER                      • Estimate tab is hidden when the role lacks `Clients — view billing`
  [ER] Erik (Partner) ▾          • Tasks / Vault / Notes reuse the existing statutory and vault panes
```

**Sidebar groups:** Practice = Home, Analytics, Inbox · Work = Clients, Team, Deadlines, Sales Pipeline, Time · Admin = Settings, Governance Log. Items are filtered by the permission matrix, and a blocked deep link renders a `NoAccess` card rather than the view.

**Views (11):** Home, Analytics, Inbox, Clients, Client record, Team, Deadlines, Sales Pipeline, Time, Settings, Governance Log.

**Interactive contracts:** boards share one `KanbanBoard` (drag, hover menu, keyboard ←/→ column, ↑/↓ reorder, 1–9 jump; illegal moves refused with feedback); quote and invoice buttons disable themselves with a visible reason when a transition is illegal; the permissions matrix stores only `Allowed | Not allowed | Limited` and derives the `Inherited`/`Custom` legend states for display.

---

## 5. Epics & Functional Requirements (status as of 2026-11-10)

1. **Epic 1: Project Scaffolding & Design System — delivered.** Workspace, Tailwind v4 tokens, shadcn-style primitives, dark/light parity.
2. **Epic 2: Shell, Collapsible Navigation & Command Palette — delivered.** Collapsible sidebar with grouped nav (Practice / Work / Admin), 48px topbar with breadcrumbs, ⌘K searching views + clients + quotes + time entries, `+ New` menu, user popover. The `People` directory and the standalone `Estimator` entry are gone (see Epics 8–9).
3. **Epic 3: Clients Register & Filtering — delivered.** TanStack table with the statutory columns, sorting, global search, entity filters, and a **New client** dialog that creates a client and materialises its statutory calendar.
4. **Epic 4: Client Record — delivered, restructured.** Seven tabs (Overview, Organization, History, Tasks, Estimate, Vault, Notes) with a 3-column Overview panel grid; the Estimate tab is gated by `Clients — view billing`.
5. **Epic 5: Statutory Deadlines — delivered.** Four KPI tiles + horizon/staff/return filters, board and table views, SA holiday rollback tags (`↩`), a **six-lane** workflow (Not Started → In Progress → Awaiting Client → Partner Review Gate → Approved (Ready to Lodge) → Submitted), a docked detail panel built on the authoritative statutory form, keyboard moves, and ad-hoc tasks (`+ Add`).
6. **Epic 6: Billable Retainers & Xero Invoicing — delivered with simulated Xero.** Retainer hours and an ad-hoc hourly rate are stored on the quote; hours inside the allowance produce no line, overage becomes one priced `Time overage — <month>` line with 15% VAT; deleting that line releases the entries. The Xero draft payload is real in shape, the sync is simulated.
7. **Epic 7: Practice Workspace & Admin Settings — delivered.** Grouped settings panes (Profile, Appearance, Team & Staff, Practice Rules, Integrations, Notifications, Roles & Permissions), service/pricing matrix, SA public holidays, AI keys, integration credentials, and the governance trail moved to its own view.
8. **Epic 8: Quote → Signature → Invoice — delivered.** Three-step builder (client → scope → fee schedule) with a live branded document preview, PDF/XLSX export, enforced lifecycle (`Draft Quote → Quote Sent → Accepted → Signed → Active Client`, plus `Closed Lost`), signing requiring a recorded Documenso envelope, invoice creation from an accepted quote with a stored billing month, cent-exact per-line VAT, derived `Overdue`, read-only issued invoices, and quote→client conversion that writes the quoted service scope.
9. **Epic 9: Sales Pipeline — delivered.** Six quote stages with `Booked` and `Open pipeline value` kept separate, stage-value donut, ageing chips (amber from 15 days), card detail via the builder, and Pipeline / Quotes / Invoices tabs.
10. **Epic 10: Time Tracking — delivered.** Quarter-hour rounding (15-minute floor), session-only topbar timer, timesheet Log tab, and a Report tab whose KPIs, bars and grouped rows reconcile to the entries.
11. **Epic 11: Permissions & Governance — delivered.** Six roles over six groups and 18 rows (`Allowed`/`Not allowed`/`Limited` stored; `Inherited`/`Custom` derived), assigned-scope for Subcontractors, locked partner sign-off, `Settings — manage` for invites and role changes, nav/⌘K/deep-link enforcement, and a read-only derived audit trail with CSV/PDF export and a per-client history.

---

## 6. Service Catalogue & Statutory Compliance Matrix (10 Core Services)

| Service Code | Statutory Description | Governing Legislation | Review Gate | Practice Fee Structure | Statutory Due Date Rule |
|---|---|---|---|---|---|
| **`AFS`** | Annual Financial Statements compilation | Companies Act 71 of 2008 s30(1) | **`always`** (Partner sign-off) | Hourly @ R625/hr (12h–28h by turnover band) | Exactly 6 months after FYE (business day on or before). |
| **`ITR14`** | Company Income Tax Return | Income Tax Act 58 of 1962 s66 | **`always`** (Partner sign-off) | Fixed: **R1,500** | Exactly 12 months after FYE (business day on or before). |
| **`ITR12`** | Individual Income Tax Return | Tax Administration Act 28 of 2011 s25 | **`always`** (Partner sign-off) | Fixed: **R1,050** | Per annual SARS Filing Season (Non-provisional: late Oct; Provisional: late Jan). |
| **`ITR12T`** | Trust Income Tax Return | Income Tax Act 58 of 1962 s66 | **`always`** (Partner sign-off) | Fixed: **R1,500** | Per annual SARS Trust Filing Season (late Jan). |
| **`IRP6`** | Provisional Tax Return (1st & 2nd payments) | Income Tax Act 4th Schedule s19 | **`when-payable`** (Nil bypasses; Payable reviewed) | Fixed: **R575** (Nil) / **R650** (Payable) | 1st period = end Month 6 of FY; 2nd = FYE (business day on or before). |
| **`VAT201`** | Value Added Tax Declaration | Value-Added Tax Act 89 of 1991 s28(1) | **`never`** (Direct submission) | Fixed: **R545** per return | Last business day of following month per VAT Category. |
| **`EMP201`** | Monthly PAYE, UIF & SDL Declaration | Income Tax Act 4th Schedule s14 | **`never`** (Direct submission) | Fixed: **R495** per month | On or before 7th of following month (business day on or before). |
| **`EMP501`** | Employer Bi-Annual Reconciliation | Income Tax Act 4th Schedule s14(3) | **`always`** (Partner sign-off) | Tiered: **R1,900** (1–10) / **R2,500** (11–30) / **R3,250** (31+) | Interim due 31 Oct; Annual due 31 May. |
| **`CIPC_AR`** | CIPC Annual Return & FAS | Companies Act 71 of 2008 s33 | **`never`** (Direct submission) | Practice Fee: **R525** + CIPC Fee (VAT exempt) | Anniversary of incorporation date + 30 business days (`addBusinessDays`). |
| **`BO`** | Beneficial Ownership Register | General Laws (Anti-Money Laundering) Act 22 of 2022 | **`never`** (Direct submission) | Fixed: **R2,000** | Annual filing or within 10 business days of governance change. |

---

## 7. Instructions for the Receiving LLM

1. **Verify Domain Imports:** Always import statutory date calculation functions (Easter Computus, SA public holiday rollback) directly from `packages/domain/src/domain/dates.ts`, and fee maths from `estimate.ts`. Never hardcode statutory deadlines, tax rules or pricing in UI components.
2. **Respect the store contract:** practice data lives in `PracticeStoreContext` and persists to `localStorage`. New state must be **additive and defaulted**, and any rename or shape change needs a rule in `loadPracticeState`'s merge (the merge already migrates `leads` → quotes, normalises legacy workflow statuses, and backfills `Client.contacts` and `Invoice.billingMonth`). Never break an existing persisted state.
3. **Check permissions, not roles:** call `can(role, group, action, matrix)` from `lib/permissions.ts`; the coarse `isPartnerOrAdmin` gate no longer exists. Partner sign-off is locked (`canSignOff`), and anything that grants authority (invites, staff role changes) requires `Settings — manage`.
4. **Never write auth privilege fields from a client:** `role`, `staffId` and `kind` are better-auth `additionalFields`; `functions/api/auth-guard.ts` refuses HTTP sign-up and strips those fields, and that guard must stay in front of `auth.handler`.
5. **Adhere to the FD on Call aesthetic:** hairline borders, compact rows, Lucide icons, existing CSS tokens only (crimson `#c4161c`, amber for warnings, no blue/green/mint), and both themes working.
6. **Run the suites:** `npm test` (464 web + 52 domain), `npm run typecheck`, `npm run build` from the repository root before declaring anything done. Money paths also have cent-exactness tests — keep the shared `cents()` basis.

---

## 8. Security Posture (2026-11-10)

* **Self-service sign-up is closed.** `apps/web/functions/api/auth-guard.ts` returns `403` for `POST /api/auth/sign-up/email`, and strips `role`, `staffId` and `kind` from every other `POST /api/auth/*` body before `auth.handler` sees it. Reason: those are better-auth `additionalFields`, so without the guard a caller could sign up as `Partner` and inherit the whole permission matrix. Seeded accounts are created server-side by `ensureSeeded()` via `auth.api.signUpEmail()` and never pass through the HTTP route, so provisioning is unaffected.
* **Account creation is seed-only today.** There is no admin endpoint yet; until one exists, new accounts come from `SEEDED_STAFF_ACCOUNTS`. Open hardening: mark the privilege fields non-inputtable at the schema level, and/or expose an admin-only create endpoint that assigns roles server-side.
* **Demo credentials.** All seeded accounts share `DEMO_PASSWORD` for the local demo; a production instance must replace this and move sessions to server-side storage.
* **Integration secrets are placeholders.** `integrationConfig` / `aiKeys` hold non-functional credentials in localStorage for the simulated Documenso/Xero seams; wiring live instances requires server-side secret storage.
* **Audit trail is derived, not append-only.** The governance log is computed from current overrides plus the activity feed, so revoking a sign-off removes its row. If an append-only record is required for external review, add a dedicated event model.

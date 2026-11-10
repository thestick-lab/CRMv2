# FD on Call CRM — UI Information Architecture & Screen Flow Specification

**Document Reference:** `docs/05-UI-INFORMATION-ARCHITECTURE-AND-SCREEN-FLOWS.md`  
**Diagram Reference:** `docs/diagrams/09-ui-information-architecture-and-screen-flows.html` (regenerated 2026-11-10 to the shipped 11-view shell)  
**Target Application:** Standalone Modern CRM (`/home/hein/Projects/CRMv2`)  
**Design System Base:** Twenty CRM Dark/Light Component Geometry with FD on Call Brand Identity  
**Status:** Screen specification reconciled to the shipped application, 2026-11-10. Superseded blueprint material is retained and labelled, not deleted.  

---

## 1. Executive Summary: The "Missing Link" Between Specs & UI

Historically, the project struggled with an impedance mismatch between business specifications and UI layout:
1. **Requirements Documents (`docs/01`–`docs/04`):** Specified South African statutory rules (Companies Act s30(1), Tax Administration Act s25, VAT Act s28), 12-month rolling fee formulas, and partner review gates, but did not define **screen layout, navigation breadcrumbs, or user click paths**.
2. **Client Prototype (`Client_CRM` v0.9.2):** A quick in-memory React/TypeScript prototype that crammed the 12-month estimate onto an isolated hash route (`#estimate-MUS-875`), leaving no intuitive back navigation and isolating the client code.
3. **Twenty CRM Core Monorepo (`/twenty`):** An enterprise-scale metadata engine that imposed multi-minute builds and complex TypeORM/MikroORM layers when all that was needed was Twenty's clean visual shell.

This document serves as the **BABOK-grade Information Architecture (IA) and Screen Blueprint**. It translates every business requirement into concrete UI screens, navigation tabs, and user click flows.

**What shipped (2026-11-10).** The implementation is a single-page React app. Navigation is state, not URLs: `ViewKey` lives in `apps/web/src/App.tsx` and there is no router. Practice data comes from one `PracticeStoreContext` persisted to `localStorage`; there is no PostgreSQL and no practice API. This document now describes the **11 shipped views**, the client record's **7 tabs**, and the interaction contracts the code enforces. Where an earlier blueprint described a screen or route that no longer exists, that material is marked **Superseded** rather than removed.

---

## 2. Global Information Architecture & Layer Hierarchy

### 2.1 Superseded: original workspace map (pre-implementation)

> **Status: superseded by §2.2.** This map was drawn before implementation and does not match the shipped navigation. It is retained to show the intended geometry: persistent 44px topbar, ~236px sidebar, Twenty-style dense registers, and a four-layer shell. The `/dashboard`, `/reports`, `/people`, `/quotes/new` routes and the "New Quote Calculator" sidebar item no longer exist; navigation is in-memory and quoting happens in the Sales Pipeline quote builder. `docs/diagrams/09-ui-information-architecture-and-screen-flows.html` has been regenerated (2026-11-10) against §2.2, not against this map.

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

### 2.2 Shipped navigation model

The sidebar renders three sections in order, and a section with no permitted item disappears entirely (a heading never advertises an area the role cannot reach):

| Group | View (`ViewKey`) | Nav label | Permission gate | Scoped to assigned records |
|---|---|---|---|---|
| **Practice** | `dashboard` | Home | `Clients — view` | no |
| | `analytics` | Analytics | `Invoices — view` | no |
| | `inbox` | Inbox | `Deadlines — view` | no (badge counts pending gates) |
| **Work** | `clients` | Clients | `Clients — view` | yes |
| | `team` | Team | `People — view/invite` | no |
| | `deadlines` | Deadlines | `Deadlines — view` | yes |
| | `sales-pipeline` | Sales Pipeline | `Quotes — view/create/send` | no |
| | `time` | Time | `Time — log own` | yes |
| **Admin** | `settings` | Settings | `Settings — view` | no |
| | `govlog` | Governance Log | `Governance log — view` | no |

The client record (`client`) is not a sidebar item; it is a `Clients — view` destination reached from the register, Home, Deadlines, the pipeline and ⌘K.

* **Group visibility.** `visibleNavItems(role, matrix)` filters the declared order; the first permitted item is the role's landing view (`firstPermittedView`). A role with only assigned-client access therefore lands on Clients, not Home.
* **Badges.** Inbox carries the count of overrides in `Partner Review Gate`; the count is recomputed on every store change.
* **Sidebar collapse.** A dedicated control in the sidebar header collapses/expands it; collapsed mode keeps the icons (with tooltips) and hides the labels.
* **Shell.** A persistent topbar holds breadcrumbs, ⌘K search, the running timer, `+ New`, theme toggle and the AI assistant. The sidebar header holds the workspace menu; the footer holds the signed-in user popover.

A section-entry format per view:

```
Topbar (breadcrumbs · ⌘K · timer · + New · theme · AI)
 Sidebar (Practice / Work / Admin)
  └─ Page header (eyebrow · title · subtitle · actions)
      └─ View body
```

---

## 3. Screen-by-Screen Functional Blueprint

### Screen 1: Persistent Shell & Navigation (`Layout.tsx`, `Topbar.tsx`, `Sidebar.tsx`)

**Top header bar (44px):**
* **Left:** breadcrumbs (`buildBreadcrumbs`), e.g. `Clients / Muse 1399`, with the client code; clicking a crumb navigates back.
* **Search:** `Search … ⌘K` (Ctrl+K off macOS) opens the command menu over clients, quotes and time entries; results route to the destination view and are permission-filtered.
* **Timer:** while a timer runs, `TimerBar` shows client, elapsed time, pause/resume and stop (stop opens the entry sheet). The timer is session-only and survives navigation but not reload.
* **`+ New`:** a permission-filtered menu of **New quote** (→ Sales Pipeline builder), **New client** (→ Clients with the create dialog open) and **Log time** (→ capture sheet). An action the role cannot perform never renders.
* **Right:** theme toggle and the AI practice assistant drawer.

**Left sidebar (`w-60`):** header with the collapse control and the workspace menu (brand logo/name); the three groups in §2.2 with Lucide icons and an active-item accent; Inbox badge; footer user popover (profile settings, log out). The workspace menu also holds the division switch between FD on Call and Accountant on Call.

**Auth gate:** an unauthenticated session renders `LoginView` only. The login screen accepts a seeded staff email plus the demo password and seeds `currentUser`; there is no self-service registration.

---

### Screen 2: Home (`dashboard`, `DashboardView`)

The daily read of the practice, built from the derived task board.

* **Page header:** time-aware greeting (`Good morning/afternoon/evening, <name>`), then `role · division practice · date`.
* **Header actions:** `Partner Meeting Export` (partner roles only), an overdue-filings pill (count, or "No overdue filings"), and — when any gate is pending — a crimson `N awaiting partner sign-off` button that opens Inbox.
* **Engagement banner:** a contextual strip for the practice's current engagement state, linking to the client it concerns.
* **KPI strip (4 tiles):** `Total tasks` (open obligations), `Due this week` (next seven days), `In review` (partner sign-off), `Team members`. Each tile links onward; the task tiles open Deadlines with the matching KPI filter.
* **Main column (8/12):**
  * **My Tasks** — the signed-in user's open tasks, with a `My tasks` / `Completed` tab pair and counts; completing a task updates the workflow status; `View all` opens Deadlines filtered to that assignee.
  * **Empty-state pair** — two dashed cards, `No overdue tasks` and `No tasks awaiting client`, each rendered only when true; both can appear side by side.
  * **Team Activity** — the six most recent `activity` events, newest first, with actor initials, tint (crimson / amber / muted), subline and relative time.
* **Right rail (4/12):** `Upcoming deadlines` (→ calendar), `Recent work` (→ Time), `SA public holidays`, and an `Invite` card (→ Settings · Team & Staff).
* **Task action modal:** completing or submitting from Home opens `StatutoryActionModal`, which validates the statutory submission (SARS reference etc.) and routes to the client record.

---

### Screen 3: Analytics (`analytics`, `AnalyticsView`)

* **Header:** eyebrow `Analytics`, title `Overview`, subtitle stating that each figure is measured against the previous period of equal length.
* **Controls:** the applied date range plus a static `vs <comparison period>` chip, and a period pill group `7D / 30D / 90D / 1Y` (default `30D`). Changing the window recomputes every figure below — including the comparison period, which is always the equal-length window immediately before it.
* **Hero metric:** `Billed revenue` — total for the window with its delta, a chip naming the latest month's value, and the inline monthly line/area chart. Caption: `ZAR · invoices sent or paid, issued in the period`.
* **KPI cards:** `Active clients`, `Filings submitted`, `Billable hours` (plus the revenue figure), each with its comparison delta.
* **Revenue by group:** donut of invoice revenue split by estimate group / chart-of-accounts code.
* **Hours by client:** horizontal bar list of the top five clients by rounded billable hours.
* **Recent activity:** the same feed as Home, trimmed to the selected window.
* **Empty states:** an explicit state per panel — `No revenue recorded this period`, `No revenue to split this period`, `No time logged this period` — each naming what fills it. There are no zero-filled charts.
* **Gate:** the view requires `Invoices — view`; a role without it has no nav item and a deep-link attempt lands on `NoAccessView`.

---

### Screen 4: Inbox (`inbox`, `InboxView` → `PartnerReviewQueue`)

* **Header:** eyebrow `Inbox`, title `Partner Review Queue`, subtitle citing the SAICA/SARS Tax Administration Act gate, and a `N pending approvals` badge.
* **Body:** one table of statutory tasks currently in `Partner Review Gate`, showing client, service, period/part and due date (with holiday-rollback note where applicable).
* **Per-row actions:**
  * **Request Revision** — moves the task to `In Progress` and clears `partnerSignOff`; available to a role with `Deadlines — update status`.
  * **Sign Off as CA(SA)** — the locked partner action (rendered only for a role that can sign off; everyone else sees `Partner Signature Required`). It records `Approved (Ready to Lodge)` together with `partnerSignOff: true`, `approvedBy`, `submissionDate`, service, client and period so the governance trail has the filing identity.
* **Empty state:** `Zero Returns Awaiting Partner Review`.
* **Gate:** `Deadlines — view`; both buttons are absent or disabled with a reason when the role lacks the row. Sign-off itself is never delegated by the matrix.

---

### Screen 5: Clients Register (`clients`, `ClientsView`)

* **Header:** `N statutory engagements` plus a one-line description of what the register holds; primary action `New client`.
* **Search/filter:** free text over code, legal name, entity type, client group and responsible staff name; results update the grid.
* **Columns:** `Code` (monospace badge), `Client Legal Name`, `Entity Type`, `Year End` (an assumed year end carries a marker), `VAT Status` (category or `Non-VAT`), `Services` (count), `Next Statutory Deadline` (service + date + urgency), and a row `Action`.
* **Row click:** opens the client record; the row action repeats the destination for keyboard users.
* **New client dialog:** Registered name (required), Entity type, Financial year end, VAT category, Responsible staff (defaults to the signed-in user), Payroll toggle and employee count. Saving creates the client with a `<ABC>-<nnn>` code and seeds its statutory profile; the dialog submits only when a name is present.
* **Empty/limited states:** a role with `Clients — view` limited to assigned records sees only its own clients; the register never shows practice-wide counts to a limited user.

---

### Screen 6: Client Record (`client`, `ClientShowView`)

**Header band:** avatar + legal name, monospace code, entity type, turnover band (`Turnover Pending` when unknown), VAT status, responsible partner, group tag. Quick actions: `Log Time`, `New Quote`, `Add Note`, plus export actions where relevant. A missing-information or overdue banner renders when the record has blockers.

**The 7 tabs** (`ContactProfileLayout` owns the tab strip, keyboard navigation and the shared profile geometry):

| # | Tab | Anatomy |
|---|---|---|
| 1 | **Overview** | 3-column grid. Left: contact channels (email, phone, location, timezone) with inline edit, the `Missing information` checklist, and the statutory profile (year end + assumed flag, incorporation date, turnover + year + source, VAT registration, payroll, eFiling profile). Middle: organization (group, employees, directors/contacts) with inline contact editing, the last four relationship-history entries, the statutory-service checkboxes (switching a service updates the deadlines board) and the last AFS/income-tax/annual-return years. Right: next action with a route into the task, internal notes and tags. |
| 2 | **Organization** | Two columns: the expanded organization panel (entity type, client group and sibling records, employee count when payroll runs, directors/contacts with roles, email and phone) beside the relationship-history panel. Contact add/edit requires `Clients — create/edit`; contacts are the Documenso signatory source. |
| 3 | **History** | The client-scoped slice of the governance trail: submissions, sign-offs, quote stage changes, invoices, time and permission events, newest first, with the same dedupe as the Governance Log. |
| 4 | **Tasks** | This client's derived statutory tasks plus ad-hoc work, with due dates, rollback notes and status; the partner gate applies to gated returns. |
| 5 | **Estimate** | The 12-month rolling fee matrix for the client: rates card (standard hourly rate, March escalation), export bar `Excel` / `PDF` / `Xero` (draft preview), the month-by-month matrix (regular, compliance, annual, recharges, once-off), and the invoice totals. The quote builder opens from here pre-selected to the client. **Gated by `Clients — view billing`** — without it the tab is not offered. |
| 6 | **Vault** | The document vault for the record, organised by folder path (`/Clients/{code}/Contracts/`, `Tax_Returns/`, `Statutory_KYC/`, `Accounting_Invoices/`) with file name, size, date, status (`Signed & Executed`, `SARS Accepted`, `Pending Signature`, …) and reference. Master-services agreements can be dispatched to the simulated Documenso flow from here. Files are locally represented; no SharePoint/Graph call is made. |
| 7 | **Notes** | Internal notes, never client-visible; author and timestamp on each entry. |

**Gating note:** the `Estimate` tab is a per-tab permission, not a view permission. A role may open the client record and still not see billing; the tab strip drops `Estimate`, and a deep link to it falls back to Overview.

---

### Screen 7: Team (`team`, `TeamView`)

* **Header:** title `Team`, subtitle framing it as the internal staff register (client directors live on each client's Organization tab). Primary action `Invite` is enabled only for roles holding `People — invite/manage`.
* **Register:** staff-only rows — name, role, employment kind (employee/subcontractor), contact and contract summary; subcontractor hourly rate shown where recorded, `—` otherwise (never fabricated).
* **Person profile:** opens in the same `ContactProfileLayout` used by the client record. Header with name, role, kind and `Back to team`; cards for `Contact details`, `Contract` (contract type, start date, hourly rate), `Tags`, and `Internal notes`. Edits require the people-management grant; otherwise the fields are read-only with a reason.
* **Empty state:** `No staff records yet`, inviting the first record.
* **Data:** `staff` (domain `StaffMember`) plus `staffProfiles` (contract + notes keyed by staff id); the signed-in user's own contract lives on `currentUser.contract`.

---

### Screen 8: Deadlines (`deadlines`, `DeadlinesDashboard`)

* **Header:** `Deadlines`, with a subtitle stating the count in view and the six-lane model.
* **KPI tiles (4):** `Overdue filings`, `Due in 7 days`, `Due in 30 days`, `Missing a date` — each a shortcut filter; the active filter is shown as a removable chip.
* **Filters:** responsible staff member, return/service type, and a client filter carried in from a client record.
* **Kanban / Table toggle.** Kanban is the default; Table is the dense practice-wide register with sortable columns and the same filter set.
* **6 workflow lanes** (shared `WORKFLOW_LANES`): `Not Started`, `In Progress`, `Awaiting Client`, `Partner Review Gate`, `Approved (Ready to Lodge)`, `Submitted`. Statutory tasks and ad-hoc tasks flow through the same lanes; ad-hoc cards are visually distinguished.
* **Card:** client code/name, service and period, due date (or due note, with holiday-rollback marker), assignee, partner-review badge and overdue emphasis.
* **Detail panel (`TaskDetailPanel`):** a right-hand drawer with owner, due date, statutory metadata, timer start/pause/stop (gated by `Time — log own` and assignment), status actions (validated per lane), partner sign-off where gated, and task comments.
* **`+ Add ad-hoc task` (`AdHocTaskModal`):** client, description, assignee, due date and initial status; a practice task is created in the chosen lane. Creating work on a client the user does not own is refused.
* **Illegal moves:** the board refuses an illegal transition and shows inline feedback rather than mutating state; leaving an approval lane clears the recorded partner sign-off metadata.

---

### Screen 9: Sales Pipeline (`sales-pipeline`, `SalesPipelineView`)

* **Header:** eyebrow `Sales Pipeline`, title `Quotes and invoices`. Actions: a period selector (`All time` / `Last 90 days` / `Last 30 days`) and `New Quote`.
* **KPI band (3 cards):** **Booked** — annual fees incl. VAT for `Active Client` retainers, with the retainer count; **Open pipeline value** — draft-to-signed quotes not yet active; **Pipeline snapshot** — stage ageing. The subtitle states that booked and open value are separate figures.
* **Tabs:** `Pipeline`, `Quotes`, `Invoices`. The `Invoices` tab exists only for a role holding `Invoices — view`; if that grant disappears while the tab is open, the view falls back to `Pipeline`.
* **Pipeline board:** 6 columns — `Draft Quote`, `Quote Sent`, `Accepted`, `Signed`, `Active Client`, `Closed Lost`. Cards show prospect/client, value, owner and days in stage (from `stageChangedAt`, never reset by an ordinary edit).
* **Quote builder (`QuoteBuilderView`, hosted as an overlay from this view and from the client Estimate tab):** three steps down the left pane — `Client`, `Scope`, `Fee schedule` — with a live document preview on the right. `Draft Quote` can be saved at any point; stage actions are gated (§4.2). Signing opens the Documenso dispatch dialog and, on dispatch, records the envelope id, signatory and timestamp; converting to `Active Client` creates the client record, its code, `services` from the estimate and `savedEstimates[code]`.
* **Quotes tab:** the quote register (number, client/prospect, stage, value, owner, age) with row open.
* **Invoices tab (`InvoicesList` + `InvoiceEditor`):** the invoice register (number, client, billing month, status incl. derived `Overdue`, total) and the editor: line items with per-line `OUTPUT2`/`NONE`, live document preview, Xero draft preview and `Push to Xero (draft)`, `Send`, `Mark Paid`. A second invoice for the same quote + billing month is refused; once `Sent` or `Paid`, lines and add-actions are read-only while `Send`/`Mark Paid` remain.
* **Empty states:** no quotes (`No quotes yet` style), no invoices, and no pipeline cards all render explicit empty cards.

---

### Screen 10: Time (`time`, `TimeView`)

Two tabs over one trail of entries.

* **Log tab (`Timesheet`):** the working timesheet — entries newest first with client, service, description, staff, rounded hours and billable flag; `New entry` opens `TimeEntrySheet` (timer-derived or manual); `Edit` reopens the sheet, where the entry can be saved or deleted (with confirmation), and the billable flag also toggles inline. The topbar timer is a session-only capture tool and its running state is not persisted.
* **Report tab (`TimeReport`):** range presets `This month` / `Last month` / `Last 30 days` / `This year` plus explicit start/end dates, and filters for client, staff and billable state. Content: KPI strip (total, billable, non-billable, billable %), per-client bars, per-service breakdown, and a reconciliation note. Every figure is recomputed from the entries in range, so the report and the log always agree.
* **Empty period:** KPIs render `null` (dash) with named empty states for the client bars and service breakdown — never zeros that look like real measurements.
* **Gates:** `Log` requires `Time — log own` (assignment-scoped); `Report` requires the practice-wide time grant. A user with only the limited grant lands on `Log`.

---

### Screen 11: Settings (`settings`, `SettingsView`)

Two-pane layout: left navigation from `SETTINGS_NAV`, right pane from the selected `SettingsPaneKey`. Deep links (`settingsPane`) resolve to the same map.

| Group | Pane | Content |
|---|---|---|
| — | **Profile** | `My Profile & Account`: identity card (initials avatar, name, role badge, email, location) and the account/access card. |
| — | **Appearance** | Dark/light theme. |
| — | **Team & Staff** (admin only) | Invite staff, change role/kind; a role change requires `Settings — manage` and cannot self-elevate. |
| — | **Roles & Permissions** (`manageOnly`) | The 6×18 permission matrix, grouped into 6 sections; legend and override semantics in §4.3. |
| **Practice Rules** (admin only) | Service & Pricing Matrix | Standard hourly rate, March escalation, per-service fees. |
| | SA Public Holidays | Gazette calendar and holiday-rollback schedule. |
| **Integrations** (admin only) | Documenso | Base URL and API key placeholders (local only; no live call). |
| | Xero | Client id/secret/tenant placeholders (local only; draft payloads are simulated). |
| | AI Assistant | Provider keys (Anthropic/OpenAI/Gemini), stored locally. |
| — | **Notifications** | Notification preferences. |

Panes a role may not administer are absent from the left nav, not merely disabled; `isAdminPane`/`isManagePane` also refuse a direct pane request.

---

### Screen 12: Governance Log (`govlog`, `GovernanceLogView`)

* **Header:** `Governance Log`, subtitle describing it as the read-only SAICA/IRBA engagement-quality record of partner sign-offs, submissions, quote decisions, invoices, time and permission changes.
* **Body:** a single newest-first trail derived on render by `audit-log.ts` from `taskStatusOverrides` plus the `activity` feed, deduped so one real-world action is one row. Each row: timestamp, actor (initials chip), action, subject and detail.
* **Filters:** client, actor and action, each with an `All …` option plus `Clear`; an empty result offers widening the filters.
* **Exports:** `Export PDF` and `Export CSV` over the filtered set, with success/failure feedback.
* **Empty states:** `No audit entries yet` (nothing has happened) versus `No entries match these filters` (filters too narrow).
* **Gate:** `Governance log — view`; the log is read-only — no row is editable from here.

---

## 4. Shared Interaction Contracts

### 4.1 Kanban keyboard map (`components/kanban/KanbanBoard.tsx`)

The Deadlines board and the Sales Pipeline board share one component; the same keys apply.

| Key | Effect |
|---|---|
| `Tab` / `Shift+Tab` | Move focus between cards (cards are focusable, with an accessible name). |
| `Enter` / `Space` | Open the focused card (detail panel / quote builder). |
| `←` / `→` | Move the focused card one column left/right; illegal moves are refused with feedback. |
| `↑` / `↓` | Reorder the card within its column. |
| `1`–`9` | Jump the focused card to the numbered column. |
| `Escape` | Close an open card/menu and return focus. |
| `More` button | Hover/focus menu offering the legal moves plus open/edit. |

Every move passes the same legality function the menu uses, so the keyboard can never bypass a gate. Quotes with no recorded Documenso envelope cannot reach `Signed`; statutory cards cannot skip the partner gate.

### 4.2 Stage gating surfaced as disabled buttons with reasons

Stage legality is centralised (`lib/quote-lifecycle.ts`, `lib/workflow.ts`) and the UI never hides the action, it disables it and states why:

* **Quote:** `Send proposal` requires a client and ≥1 fee line (`Add a fee line before sending`); `Accept` requires `Quote Sent`; `Sign` requires `Accepted` **and** a recorded envelope (`Record the Documenso signature first`); `Active Client` requires `Signed`; `Closed Lost` only from `Draft`, `Sent` or `Accepted`.
* **Invoice:** creating a second invoice for the same quote + `billingMonth` is refused; once an invoice is `Sent` or `Paid` the lines and add-actions are read-only while `Send` and `Mark Paid` remain available; a correcting invoice is the only route to a changed amount. (`Mark Paid` being allowed from `Draft` is a known gap, listed in §7.)
* **Statutory task:** `Partner Review Gate` is reachable only when the service's review rule requires it; leaving the approval lanes for `Approved (Ready to Lodge)` or `Submitted` needs a Partner where the gate applies. From the board, either move opens the statutory form rather than writing straight from the drop; `validateStatutorySubmission` then requires the partner sign-off and, for `Submitted`, a non-blank SARS reference.
* **Permission reasons win.** If the role lacks the row, the reason names the role (`Accountant cannot sign off returns`), whether or not the stage rule would also block it. The button carries the reason in `title` and in the accessible description.

### 4.3 Permission matrix: `Inherited`, `Custom`, `Limited`

The matrix has **6 roles** (Partner, Compliance Officer, Accountant, Team member, Subcontractor, Support Tech), **6 groups** (Clients, Deadlines & Tasks, Quotes & Invoices, Time, People, Settings) and **18 rows**. Storable cells are `Allowed`, `Not allowed` and `Limited`; the other two are display states:

* **Inherited** — no override is stored for this role/row; the role's default applies. Clicking an inherited cell proposes the next storable state; `Inherited` is never written.
* **Custom** — a stored value differs from the role's default. It is derived for display and never written; the pane labels it `Custom overrides` and explains that overrides apply to that role only.
* **Limited (assigned)** — the grant applies only to records the person owns (`Client.staffId` / `subcontractorId`). Views that scope their own data (Clients, Client record, Deadlines, Time) accept a limited cell; aggregate views (Home, Analytics, Inbox, Pipeline, Governance Log) require the unconditional grant.
* **Locked row** — the partner sign-off row is not matrix-editable; it is Partner-only by practice rule.
* **Legacy values** — a persisted `Custom` from an older store reads as the grant it was written from, then normalises to a storable cell on the next edit.

### 4.4 How permissions hide navigation and block deep links

One declaration (`NAV_ITEMS` + `VIEW_PERMISSIONS`) drives the sidebar, ⌘K, `+ New`, and route entry:

1. **Sidebar:** `visibleNavItems` filters by `can()`; empty sections disappear.
2. **Landing view:** `firstPermittedView` picks the first visible item, so a restricted role never sees a blank Home.
3. **Command palette:** results for a forbidden view are omitted.
4. **Deep links / programmatic navigation:** `canAccessView` is checked at render; a refusal shows `NoAccessView` naming the view rather than redirecting silently.
5. **In-view actions:** every mutating control repeats the same `can()` check, with `assigned` passed for limited rows; `title` carries the refusal reason.
6. **Client record tabs:** the `Estimate` tab additionally checks `Clients — view billing`; a role without it can still read the record but not its billing.

---

## 5. Primary User Click Flows

### Flow 1: Quote from prospect to active client

```
[Sidebar: Sales Pipeline]  or  [Topbar: + New → New quote]
       │
       ▼
[Quote builder — Step 1 Client: pick an existing client or enter a prospect]
       │
       ▼ (Step 2 Scope: services, entity, turnover, payroll)
[Step 3 Fee schedule: hours + rates; estimateInput is authoritative]
       │
       ├── [Save] ────────────────➔ Q-<n> stored as Draft Quote
       │
       ▼ [Send proposal]  (needs a client and ≥1 fee line)
[Quote Sent] ──➔ [Accept] ──➔ [Sign] ──➔ Documenso dispatch dialog ──➔ envelope recorded
       │
       ▼
[Convert to Active Client] ──➔ Client record created (code `<ABC>-<nnn>`, numbering from 100),
                              services from the estimate, savedEstimates[code]
```

Illegal shortcuts (e.g. `Draft` → `Signed`) are refused on the board, the menu and the keyboard with the reason from §4.2.

### Flow 2: Partner sign-off gate on a statutory return

```
[Home: "N awaiting partner sign-off"]  or  [Inbox]  or  [Deadlines lane: Partner Review Gate]
       │
       ▼
[Task card: client · service · period]
       │
       ├── [Request Revision] ──➔ In Progress, partnerSignOff cleared
       │
       └── [Sign Off as CA(SA)]
                 │
                 ▼
        Approved (Ready to Lodge) + partnerSignOff/approvedBy/submissionDate/service/client/period
                 │
                 ▼
        [Record submission] ──➔ Submitted (SARS reference validated)
                 │
                 ▼
        Governance Log + client History tab (one deduped row per action)
```

A non-partner sees the sign-off action disabled with the role named; the underlying row is locked so no matrix edit can grant it.

### Flow 3: Time to invoice

```
[Topbar timer or Time → Log → New entry]
       │
       ▼
[TimeEntry: roundedMinutes = nearest 0.25h, 15-minute floor]
       │
       ▼ (month closes; retainer allowance applied)
[Sales Pipeline → Invoices → New invoice from quote]
       │
       ├── hours inside monthlyRetainerHours ──➔ no invoice line
       └── hours beyond it ──➔ one "Time overage — <month>" line
       │
       ▼
[Draft] ──[Push to Xero (draft)]──➔ simulated ACCREC draft
       │
       ├── [Send] ──➔ Sent (document read-only)
       └── [Mark Paid] ──➔ Paid
```

Deleting a billed time line releases those entries back to the unbilled feed.

### Superseded flow material

* The former `[Download PDF Quote] / [Download Excel] / [Save Quote to Client]` bar now lives on the client **Estimate** tab (`Excel` / `PDF` / `Xero`), and "Save to Client" is superseded by the quote builder's `Send proposal` → `Sign` → `Convert` path.
* The former `[Send Proposal via Documenso]` / `[Accept & Create Active Client]` buttons on `/quotes/new` are superseded by the quote builder stages in Flow 1.
* The former `/clients/:code` route notation is superseded by in-memory `ViewKey` navigation; breadcrumbs and deep links are state, not URLs.

---

## 6. Technical Handoff Guide for `/home/hein/Projects/CRMv2`

### 6.1 Tech stack (as shipped)

* **Frontend:** React 19 + Vite 7 + Tailwind CSS v4, Radix primitives and Lucide icons; a shared Twenty-derived shell (`Layout`, `Topbar`, `Sidebar`) rather than a router. TanStack Table drives the dense registers.
* **State:** one `PracticeStoreContext` (reducer + `localStorage` key `crmv2_practice_state`) with an idempotent load-time merge; no application database and no practice API.
* **Domain:** `packages/domain` (`fdoncall-practice`) — 7 rule modules (`catalogue`, `dates`, `estimate`, `pricing`, `rules`, `sars`, `types`) and 6 export modules (`logo`, `pdf`, `sheet`, `xlsx`, `zip`, `audit-pdf`), importing as `fdoncall-practice/domain/*`.
* **Authentication:** better-auth + Drizzle on a Cloudflare Pages Function bound to D1 (`crmv2-auth`); 10 seeded staff accounts; HTTP self-service sign-up refused and privilege fields stripped by `auth-guard.ts`.
* **Integrations:** `lib/integrations/{documenso,xero}.ts` are simulated seams — real request shapes, no network calls; credentials in `integrationConfig` are local placeholders.
* **Quality gate:** 464 web tests across 48 files plus 52 domain tests; `npm test`, `npm run typecheck`, `npm run build` from the repo root.

The earlier claim that practice data lives in **PostgreSQL 16 + Drizzle** is superseded: that is the planned production schema (`docs/03`), not the shipped system.

### 6.2 Direct code transfer from `Client_CRM/`

This transfer is **done**, not pending: the pure TypeScript modules now live in `packages/domain` and are imported directly.

* `domain/dates.ts`: Computus Easter calculation, South African public holiday rollovers, `businessDayOnOrBefore()`.
* `domain/sars.ts`: SARS statutory filing season rules (`IRP6`, `ITR14`, `ITR12`, `VAT201`, `EMP201`, `EMP501`).
* `domain/pricing.ts` & `domain/catalogue.ts`: 21 service line items, turnover bands, payroll tiers, Xero subscription rates.
* `domain/estimate.ts`: 12-month rolling projection math, March escalation, smoothed retainer formulas.
* `export/pdf.ts`, `sheet.ts`, `xlsx.ts`: client-side A4 PDF and formula-driven Excel quote generators; `export/zip.ts` and `export/audit-pdf.ts` add the audit exports.

### 6.3 Twenty CRM visual shell extraction

The styling tokens and layout are captured in `docs/diagrams/09-ui-information-architecture-and-screen-flows.html` (regenerated 2026-11-10) and the Brainstorming Visual Companion. The tokens below remain current:
* Canvas background: `#141414` (dark) / `#f6f5f3` (light).
* Sidebar & Header: `#171717` (dark) / `#ffffff` (light).
* Hairline borders: `#262626` (dark) / `#d6d3cf` (light).
* Brand Crimson accent: `#c4161c` (active items, create buttons, overdue alerts).

---

## 7. Document Approvals & Next Steps

1. **Information Architecture re-verified against the code (2026-11-10):** the 11-view navigation, 7 client tabs, 6×18 permission matrix and the kanban/stage contracts above match `apps/web` at `fe075f1`.
2. **Superseded:** the old workspace map in §2.1, the People / Estimator / Onboarding Pipeline sidebar entries, the `/quotes/new` screen, the 4-tab client record and the `/clients/:code` route notation. The old entries are retained here and visibly labelled; they are not current behaviour.
3. **Diagrams regenerated (2026-11-10):** all nine files in `docs/diagrams/` were redrawn to the shipped system in the FD on Call diagram skin — `01` architecture delta (Twenty → CRMv2), `02` practice data flow, `03` statutory rule flow, `04` engagement journey, `05` deadline task state machine, `06` shipped data model (ER, replacing the never-deployed PostgreSQL schema), `07` quote-to-cash lifecycle, `08` integration/auth boundary, `09` this view map. Screenshots showing the old sidebar, the 4-tab record or the New Quote Calculator should still be retaken.
4. **Open product items affecting these screens** (do not present as delivered): fee visibility for Team member vs `view-billing`; `Mark Paid` permitted from `Draft`; audit dedupe collapsing genuine re-submissions; sign-off milestone folded into the submission row; document dates from `issueDate` while billing uses `billingMonth`; running timer not persisted; partner-only sign-off (PRD Q2.5 unanswered); Documenso/Xero not wired to live instances; `Add Action → New Quote` offered where the role cannot use it; a new client assumes prior filing history.

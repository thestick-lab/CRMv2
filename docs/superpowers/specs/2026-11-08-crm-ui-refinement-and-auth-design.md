# CRM UI Refinement, Staff Queue Dashboard, Editable Fee Matrix & Better-Auth + Cloudflare D1 Design Spec

**Date:** 2026-11-08  
**Project:** FD on Call CRM (`CRMv2`)  
**Status:** Draft for Approval  
**Target Architecture:** React 19, Vite 7, Tailwind CSS v4, Hono + Better-Auth + Drizzle ORM on Cloudflare Pages Functions & Cloudflare D1 (SQLite), `packages/domain`

---

## 1. Intent & The Why

FD on Call is a South African Chartered Accountancy practice in Durbanville, Western Cape. The existing `CRMv2` interface contains marketing-style banners, redundant descriptive subtitles, static filler KPI cards, unreleased tabs (`SharePoint Vault & SLAs`, `AI Copilot`), a non-authenticated demo user switcher, and a two-column Fee Estimator layout that cramps service selection.

The goal of this project is to strip out all "AI slop" UI noise, wire real staff authentication via **Better-Auth + Cloudflare D1** (running on Cloudflare's free tier alongside the existing Cloudflare Pages deployment), make the Home dashboard a genuine role- and user-aware work queue for whichever staff member logs in, restructure the Fee Estimator into a full-width top-to-bottom workflow with editable annual service fees, and finish with an `/impeccable` craft polish pass.

---

## 2. Goals, Non-Goals & Anti-Goals

### Goals
1. **Better-Auth + Cloudflare D1 Login:** Authenticate FD on Call staff (`@fdoncall.co.za`) with real session cookies backed by Drizzle ORM + Cloudflare D1 (and local SQLite in Vite dev), featuring a clean Sign-In screen with visible **Demo Credentials** and 1-click demo login fill.
2. **User- & Role-Specific Home Dashboard (`DashboardView`):** Remove the hero banner, filler KPI cards, and bottom client directory repeat. Show each logged-in staff member their own actionable work queue (Partner Sign-Off queue + urgent deadlines + onboarding leads for Partners like Erik/Wouter; assigned deadlines due/overdue + items returned for revision for staff like André, Mia, Willem, Nikita) alongside upcoming South African public holidays filtered strictly from `today` (`2026-11-08`) forward.
3. **FD on Call Employees Directory (`PeopleView` / `PeopleDirectory`):** Strip the header down to `People` (or `Employees`), remove the subtitle/badge, and display only the 9 FD on Call practice staff members (`Erik`, `Wouter`, `André`, `Mia`, `Willem`, `Nikita`, `Lungani`, `Hannes`, `Caroline`) with their `@fdoncall.co.za` email, phone number, role, and assigned client entities.
4. **Decluttered Screen Headers (`ClientsView`, `DeadlinesDashboard`, `EstimatorView`):**
   - `Clients`: Title `Clients` only (remove `13 Active Accounts` badge, descriptive paragraph, and `All (13)` filter chip clutter).
   - `Deadlines`: Title `Deadlines` only (remove SARS/Companies Act subtitle), default to **Table** view first, and fix the `Kanban / Table` toggle jumping horizontally when switching views.
   - `Fee Estimator & Quotes`: Title `Fee Estimator & Quotes` only (remove `12-Month Projections` badge and subtitle).
5. **Hide Unreleased Features:**
   - Hide the `SharePoint Vault & SLAs` tab on `ClientShowView`.
   - Hide `AI Copilot & Providers` from `SettingsView` and hide the AI Practice Copilot button/drawer from `Topbar` and `Layout`.
6. **Full-Width Vertical Fee Estimator (`EstimateCalculator`):**
   - Replace the client `<select>` dropdown with a typeahead search input that pops up matching client suggestions as you type (plus a clear action to switch to a blank `New Prospect`).
   - Stack the layout full-width (`left-to-right whole screen`) in this vertical order:
     1. **Estimate Calculation Target** (typeahead client search / New Prospect toggle)
     2. **Client & Practice Scope** (full width)
     3. **Services** category section containing **Regular work (Monthly Hours)**, **Compliance & Annual work**, and **Software Recharges (At Cost)** (full width)
     4. **Quote Output & 12-Month Cashflow Projection** at the bottom (Monthly Retainer & 12-Month Projected Value KPI cards, Proposal & SLA Actions, and the 12-Month Cashflow Projection table).
7. **Streamlined User Menu Popover (`user-popover.tsx`):**
   - Show only the logged-in user's **Name** and **Email** (`erik@fdoncall.co.za`)—remove `Partner` role badge and `Durbanville, Cape Town`.
   - Remove the `Switch Active Session` section and `SAICA Registered Practice` row.
   - Rename `Practice Settings` to `Settings`, and wire `Close Session` to sign out to the login screen.
8. **Editable Annual Service Fees (`ServicePricingMatrixPane`):**
   - Make the standard fees in **Settings → Service & Pricing Matrix** editable (e.g. `ITR14`, `ITR12`, `ITR12T`, `IRP6 Nil / Payable`, `VAT201`, `EMP201`, `EMP501` tiers, `CIPC_AR`, `BO`, plus Hourly Rate and March Escalation %) so the practice can update fees yearly and have those updated fees flow directly into `EstimateCalculator` and `computeEstimate`.
9. **Impeccable UI Pass (`/skill:impeccable`):**
   - Audit and refine spacing, alignment, borders, typography hierarchy, and table density across all screens so the app reads as a crisp operational CRM with zero AI-generated visual bloat.

### Non-Goals
- External client self-service portal.
- Live third-party AI chat or SharePoint API sync in this release (explicitly hidden for future phase).

### Anti-Goals
- Separate microservice deployments requiring multi-origin CORS configuration.
- Promotional marketing copy, multi-badge headers, or decorative cards that do not drive daily practice operations.

---

## 3. Approaches Considered

### Approach A: Integrated Cloudflare Pages Functions + Better-Auth D1 + Reactive Store (Selected)
- **Architecture:** Mount Hono + Better-Auth + Drizzle ORM inside `apps/web/functions/api/[[route]].ts` bound to Cloudflare D1 (`DB`) for production on Cloudflare Pages free tier, with a matching Vite server middleware backed by local SQLite (`better-sqlite3` / `@libsql/client`) for local development and tests. Sync the authenticated Better-Auth user into `PracticeStoreContext`, and extend `PracticeStoreContext` + `packages/domain` to support editable `fixedFees`.
- **Why Selected:** Zero-cost Cloudflare deployment inside the existing `apps/web` Pages project, real database-backed authentication for all 9 staff accounts, and immediate reactivity across the Estimator and Dashboard.

### Approach B: Separate `apps/api` Microservice + Full D1 CRUD Rewrite (Rejected)
- **Architecture:** Separate Worker deployment and migrating all clients, tasks, and estimates out of `PracticeStoreContext` into D1 tables.
- **Why Rejected:** Introduces cross-origin deployment complexity and unnecessary async boilerplate for local CRM state interactions.

---

## 4. Detailed Component & Screen Design

### 4.1. Authentication: Better-Auth + Cloudflare D1 & Login Screen
- **Database Schema (`apps/web/src/db/schema.ts`):**
  - Standard Better-Auth tables (`user`, `session`, `account`, `verification`) defined with `drizzle-orm/sqlite-core`, extended with custom user fields `role` (`Partner`, `Compliance Officer`, `Accountant`, `Team member`, `Subcontractor`), `staffId` (`erik`, `wouter`, `andre`, `mia`, `willem`, `nikita`, `lungani`, `hannes`, `caroline`), and `kind` (`employee` | `subcontractor`).
- **Cloudflare D1 & Local Dev Wiring:**
  - `apps/web/wrangler.toml` configured with `pages_build_output_dir = "dist"` and a `[[d1_databases]]` binding (`binding = "DB"`, `database_name = "crmv2-auth"`), plus SQL migrations in `apps/web/migrations/`.
  - `apps/web/functions/api/[[route]].ts` handles `/api/auth/*` via Hono + Better-Auth (`emailAndPassword: { enabled: true }`) and auto-seeds the 9 FD on Call staff accounts on first request if the `user` table is empty.
  - A Vite plugin in `apps/web/vite.config.ts` mounts the same `/api/auth/*` handler in local dev so `npm run dev` works out of the box without running a second server.
- **Seeded Staff Accounts (Password: `FDonCall2026!`):**
  - `erik@fdoncall.co.za` (Erik — Partner)
  - `wouter@fdoncall.co.za` (Wouter — Partner)
  - `andre@fdoncall.co.za` (André — Accountant / Team member)
  - `mia@fdoncall.co.za` (Mia — Accountant / Team member)
  - `willem@fdoncall.co.za` (Willem — Team member)
  - `nikita@fdoncall.co.za` (Nikita — Compliance Officer / Team member)
  - `lungani@fdoncall.co.za` (Lungani — Team member)
  - `hannes@fdoncall.co.za` (Hannes — Subcontractor)
  - `caroline@fdoncall.co.za` (Caroline — Subcontractor)
- **Sign-In Screen (`apps/web/src/components/auth/LoginView.tsx`):**
  - Shown whenever there is no active session (`!isAuthenticated`).
  - Displays the FD on Call brand header, Email + Password inputs, and a `Sign In` button.
  - Displays a **Demo Credentials** card on the login screen showing:
    - **Demo Email:** `erik@fdoncall.co.za` (Partner) or any staff email (e.g., `andre@fdoncall.co.za`, `wouter@fdoncall.co.za`)
    - **Demo Password:** `FDonCall2026!`
    - Quick-fill buttons (`Fill Erik (Partner)`, `Fill Wouter (Partner)`, `Fill André (Staff)`) that populate the form or sign in with 1 click so testing different staff queues is effortless.

### 4.2. User Popover (`apps/web/src/components/ui/user-popover.tsx`)
- **Sidebar Footer Trigger:** Shows avatar initials and the logged-in user's Name (`Erik`).
- **Popover Content:**
  - **Header:** Avatar initials, **Name** (`Erik`), and **Email** (`erik@fdoncall.co.za`) only. (Removed `Partner` badge and `Durbanville, Cape Town`).
  - **Removed:** `Switch Active Session` list and `SAICA Registered Practice` row.
  - **Actions:**
    - `Settings` (navigates to `/settings`)
    - `Close Session` (signs out via Better-Auth and returns to `LoginView`).

### 4.3. Role- & Staff-Specific Home Dashboard (`apps/web/src/components/views/DashboardView.tsx`)
- **Removed:**
  - Top hero banner (`FD on Call Practice Operating System`, `CRMv2`, subtitle, and duplicate navigation buttons).
  - Filler `Practice Clients` and `Statutory Date Engine` cards.
  - Bottom `Active Practice Clients` static table.
- **Top Summary Row (3 Operational Cards):**
  1. **My Action Queue / Sign-Offs:**
     - If logged-in user is a **Partner** (`Erik` or `Wouter`): Shows count of returns in `Partner Review Gate` awaiting CA(SA) sign-off (links to `Inbox`) plus count of tasks assigned directly to them.
     - If logged-in user is **Staff** (`André`, `Mia`, `Willem`, `Nikita`, etc.): Shows count of active tasks assigned to `currentUser.id` that are `In Progress` or `Not Started` within the 30-day window.
  2. **My Urgent & Overdue Deadlines:**
     - Count of overdue filings (`due < today`) and filings due within 7 days (`today <= due <= today + 7d`) for the logged-in user's assigned clients (or practice-wide for Compliance Officer / Partners), with a 1-click link to `Deadlines`.
  3. **Upcoming SA Public Holidays:**
     - Combines `publicHolidays(year)` and `publicHolidays(year + 1)`, filters strictly to dates **`d >= today`** (so on `2026-11-08` it shows upcoming holidays starting with `2026-12-16 Day of Reconciliation`, `2026-12-25 Christmas Day`, `2026-12-26 Day of Goodwill`, `2027-01-01 New Year's Day`, instead of past Jan–Apr 2026 dates).
- **Main Operational Panels (Below KPI Row):**
  - **Panel 1 — My Queue & Urgent Filings (`currentUser`'s actionable work):**
    - For Partners (`Erik`, `Wouter`): Lists items currently in `Partner Review Gate` needing their sign-off first, followed by overdue/upcoming 7-day deadlines on their assigned clients (`staffId === currentUser.id`), with direct `Sign Off` / `Open Client` actions.
    - For Staff (`André`, `Mia`, `Willem`, etc.): Lists all overdue, due-in-30-days, and missing-date tasks assigned to `staffId === currentUser.id`, ordered by urgency (`overdue` first, then soonest `due`), with click-through to the client or deadlines board.
  - **Panel 2 — My Onboarding Pipeline / Practice Deadlines Watch:**
    - Shows active onboarding leads (`leads` where `stage !== 'Active Client'`, prioritizing leads assigned to `partnerId === currentUser.id` or all active leads) with stage badges and estimated monthly retainer values.

### 4.4. People / Employees Screen (`PeopleView.tsx` & `PeopleDirectory.tsx`)
- **Header (`PeopleView.tsx`):**
  - Single clean heading: `People` (or `Employees`) — remove `18 Profiles` badge and remove `Relational directory of practice team members...` subtitle.
- **Directory Table (`PeopleDirectory.tsx`):**
  - Filter strictly to **FD on Call employees and staff** (`isPracticeStaff === true` from `buildPeopleProfiles(staff, clients)`), showing all 9 staff members (`Erik`, `Wouter`, `André`, `Lungani`, `Mia`, `Nikita`, `Willem`, `Hannes`, `Caroline`).
  - Columns:
    1. `Employee / Staff Name` (Avatar initials + Name)
    2. `Role` (`Partner`, `Accountant`, `Compliance Officer`, `Team member`, `Subcontractor`)
    3. `Email Address` (`erik@fdoncall.co.za`, `wouter@fdoncall.co.za`, etc.)
    4. `Phone Number` (`+27 21 975 1001`, etc.)
    5. `Assigned Clients` (Clickable client code pills for clients where `c.staffId === staff.id`).
  - Search bar placeholder updated to `"Search employees, roles, emails..."`.
  - Add Employee button (`+ Add Employee`) wired to `inviteTeamMember` in `PracticeStoreContext` for Partners/Admins.

### 4.5. Clients Screen (`ClientsView.tsx` & `ClientsRegisterTable.tsx`)
- **Header (`ClientsView.tsx`):**
  - Single clean heading: `Clients` — remove `Clients Directory Register`, remove `13 Active Accounts` badge, and remove the subtitle paragraph.
- **Controls (`ClientsRegisterTable.tsx`):**
  - Remove the `All (13) / Companies (9) / CC (0)...` filter button strip above the table so the view goes straight from the `Clients` header and search bar into the clean data table.

### 4.6. Deadlines Screen (`DeadlinesDashboard.tsx`)
- **Header:**
  - Single clean heading: `Deadlines` — remove the subtitle `Real-time compliance monitoring across South African statutory tax returns (SARS s25 TAA & Companies Act s30).`
- **Default View & Toggle Alignment Fix:**
  - Change initial state from `useState<'kanban' | 'table'>('kanban')` to `useState<'kanban' | 'table'>('table')` so **Table** view loads first (and put the `Table` button first in the toggle).
  - Fix the horizontal jump: Currently the header is a 3-child `justify-between` flex container where the `Workflow Status / Date Urgency` control is the 3rd sibling and unmounts in Table mode, causing the `Kanban / Table` toggle (2nd sibling) to jump from the center to the far right. Fix by wrapping the right-side controls in a single right-aligned flex container (`flex items-center gap-2`) so the `Table / Kanban` toggle stays anchored in a consistent position.

### 4.7. Client Record Show (`ClientShowView.tsx` & `ClientSummaryBar.tsx`)
- **Hide SharePoint Vault & SLAs:**
  - Remove `{ id: 'vault', label: 'SharePoint Vault & SLAs', icon: FolderLock }` from `CLIENT_SHOW_TABS` in `ClientSummaryBar.tsx` and hide the `vault` tab trigger/content in `ClientShowView.tsx` so only the `Details & Statutory Services` view is shown.

### 4.8. Fee Estimator & Quotes (`EstimatorView.tsx` & `EstimateCalculator.tsx`)
- **Header (`EstimatorView.tsx`):**
  - Single clean heading: `Fee Estimator & Quotes` — remove `12-Month Projections` badge and remove the subtitle paragraph.
- **Target Client Search (`EstimateCalculator.tsx`):**
  - Replace the `<select>` dropdown in `Estimate Calculation Target` with a **Search & Typeahead Autocomplete** input:
    - As the user types a client name or code (e.g. `Axe`, `ALC`, `Muse`), a suggestion popover lists matching active clients (`AXE-460 — Axe Struct (Pty) Ltd`).
    - Clicking a suggestion loads that client's scope and saved estimate.
    - Includes a clear button / `+ New Prospect` toggle button right beside the search input to reset to a blank prospect calculation.
- **Full-Width Vertical Stack Layout (`EstimateCalculator.tsx`):**
  - Replace the 2-column `lg:grid-cols-12` split with a full-width (`w-full`) vertical stack from top to bottom:
    1. **Estimate Calculation Target** (full width left-to-right)
    2. **Client & Practice Scope** card (full width left-to-right, responsive grid of scope fields: Legal Name, Entity Type, Annual Turnover, Financial Year End, VAT Category, Payroll Employees)
    3. **Services** section (full width left-to-right) with a section heading `Services` containing:
       - `Regular work (Monthly Hours)`
       - `Compliance & Annual work`
       - `Software Recharges (At Cost)`
    4. **Quote & 12-Month Projection** section at the bottom (full width left-to-right):
       - Top row: `Monthly Retainer (excl. VAT)` & `12-Month Projected Value` KPI cards + `Proposal & SLA Actions` (`Download PDF Quote`, `Download Excel Workings`, `Save to Client Record`, `Send SLA via Documenso`)
       - Bottom: `12-Month Cashflow Projection` table spanning full width.

### 4.9. Settings: Hide AI Copilot & Editable Service Fees (`SettingsView.tsx`, `Topbar.tsx`, `Layout.tsx`, `ServicePricingMatrixPane.tsx`)
- **Hide AI Copilot & Chat:**
  - Remove the `Workspace / AI Copilot & Providers` button and pane from `SettingsView.tsx`.
  - Remove the `Sparkles` AI Copilot trigger button from `Topbar.tsx` and the `AiPracticeAssistantDrawer` from `Layout.tsx`.
- **Editable Standard Fees in `ServicePricingMatrixPane.tsx`:**
  - Extend `PracticeRates` in `PracticeStoreContext.tsx` (and `EstimateInput` / `computeEstimate` in `packages/domain/src/domain/estimate.ts`) with editable `serviceFees: Record<string, number>` initialized from `FIXED_FEES` (`VAT201: 545`, `EMP201: 495`, `IRP6_NIL: 575`, `IRP6_PAYABLE: 650`, `ITR14: 1500`, `ITR12: 1050`, `ITR12T: 1500`, `CIPC_SUBMISSION: 525`, `BO: 2000`, `EMP501_SMALL: 1900`, `EMP501_MEDIUM: 2500`, `EMP501_LARGE: 3250`, `COIDA: 545`).
  - In `ServicePricingMatrixPane.tsx`, render numeric fee inputs in the `Standard Fee` column of the Service Catalogue table (with a `Save Service Fees` / `Update Rates` action and per-row editability) so partners can adjust standard fees as prices change yearly.
  - Wire `EstimateCalculator.tsx` and `ClientShowView.tsx` to read `rates.serviceFees` from `PracticeStoreContext` so both the displayed unit prices (e.g. `R 545 / return`) and the 12-month projection math reflect any fee changes immediately.

### 4.10. Final `/skill:impeccable` UI Polish Pass
- After implementing the functional and layout changes above, invoke `/skill:impeccable` to audit and polish:
  - Consistent page header spacing and vertical rhythm across `Home`, `Clients`, `People`, `Deadlines`, `Fee Estimator & Quotes`, `Inbox`, and `Settings`.
  - Clean table density, tabular numerals (`font-tnum`), subtle borders, and zero leftover marketing badges or filler text.

# CRM UI Refinement, Staff Queue Dashboard, Editable Fee Matrix & Better-Auth + Cloudflare D1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Authenticate FD on Call staff via Better-Auth + Cloudflare D1 (with demo credentials on the login screen), strip out marketing/filler UI elements, make the Home dashboard a role- and staff-specific queue with future-only SA holidays, filter `/people` to FD on Call employees only, restructure the Fee Estimator into a full-width vertical workflow with typeahead client search and editable annual service fees, and finish with an `/skill:impeccable` craft polish pass.

**Architecture:** We add a Better-Auth + Drizzle ORM + Hono authentication layer inside `apps/web/functions/api/[[route]].ts` bound to Cloudflare D1 for Cloudflare Pages free tier deployment (paired with a local SQLite adapter in Vite dev middleware and client fallback so both `npm run dev` and static/SSR tests work seamlessly). We extend `packages/domain/src/domain/estimate.ts` and `PracticeStoreContext.tsx` with customizable `serviceFees`, refactor the 6 target views (`LoginView`, `DashboardView`, `PeopleView`, `ClientsView`, `DeadlinesDashboard`, `EstimateCalculator`, `SettingsView`), and run an `/impeccable` visual polish pass.

**Tech Stack:** React 19, Vite 7, TypeScript 5.8, Tailwind CSS v4, Better-Auth, Drizzle ORM (`drizzle-orm/sqlite-core` / Cloudflare D1), Hono, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-08-crm-ui-refinement-and-auth-design.md`

## Global Constraints

- **Demo Login Credentials:** Seed all 9 FD on Call staff (`erik@fdoncall.co.za`, `wouter@fdoncall.co.za`, `andre@fdoncall.co.za`, `mia@fdoncall.co.za`, `willem@fdoncall.co.za`, `nikita@fdoncall.co.za`, `lungani@fdoncall.co.za`, `hannes@fdoncall.co.za`, `caroline@fdoncall.co.za`) with password `FDonCall2026!`, and display the demo credentials + 1-click fill buttons directly on `LoginView`.
- **User Popover (`user-popover.tsx`):** Display only the logged-in user's **Name** and **Email** (`erik@fdoncall.co.za`). Remove `Partner` badge, `Durbanville, Cape Town`, `Switch Active Session`, and `SAICA Registered Practice`. Rename `Practice Settings` to `Settings`, and wire `Close Session` to log out to `LoginView`.
- **Hidden Features:** Hide `SharePoint Vault & SLAs` tab from `ClientShowView`, hide `AI Copilot & Providers` from `SettingsView`, and hide the AI Practice Copilot button/drawer from `Topbar` and `Layout`.
- **People Directory (`/people`):** Title is `People` (no subtitle, no `18 Profiles` badge). Show **only** FD on Call employees and staff (`isPracticeStaff === true`) with their `@fdoncall.co.za` email, phone number, role, and assigned client entities.
- **Clients Directory (`/clients`):** Title is `Clients` (no subtitle, no `13 Active Accounts` badge, no `All (13)` entity filter chip strip).
- **Deadlines (`/deadlines`):** Title is `Deadlines` (no subtitle), default `viewMode` is `'table'`, and the `Table / Kanban` toggle must stay anchored without jumping horizontally when switching views.
- **Fee Estimator (`/estimator`):** Title is `Fee Estimator & Quotes` (no badge, no subtitle). Client selector uses a typeahead search input with popup suggestions + `+ New Prospect` toggle. Layout is a full-width (`left-to-right whole screen`) vertical stack: `Estimate Calculation Target` → `Client & Practice Scope` → `Services` (`Regular work`, `Compliance & Annual work`, `Software Recharges`) → `Quote & 12-Month Cashflow Projection` at the bottom.
- **Editable Service Fees (`/settings`):** Standard fees in `ServicePricingMatrixPane` are editable inputs persisted in `PracticeStoreContext` and passed into `computeEstimate`.

## Review Focus

1. **Year-end boundary on Upcoming SA Holidays (`DashboardView`):** When `today` is `2026-11-08`, only 3 holidays remain in 2026 (`2026-12-16`, `2026-12-25`, `2026-12-26`), so filtering `d >= today` must combine `publicHolidays(year)` and `publicHolidays(year + 1)` before slicing to 4 items.
2. **Staff-specific Home Queue filtering (`DashboardView`):** Logging in as `andre@fdoncall.co.za` or `mia@fdoncall.co.za` must show tasks assigned to `currentUser.id` (`staffId === currentUser.id`), whereas logging in as a Partner (`erik` or `wouter`) surfaces `Partner Review Gate` items awaiting their sign-off plus their assigned clients and leads.
3. **Custom service fee propagation (`estimate.ts` & `EstimateCalculator.tsx`):** Updating a fixed fee (e.g. `VAT201` from `545` to `600` or `ITR14` from `1500` to `1750`) in Settings must update both the label in `EstimateCalculator` (`R 600 / return`) and the 12-month cashflow total returned by `computeEstimate`.
4. **Typeahead client search reset (`EstimateCalculator.tsx`):** Selecting an existing client from the typeahead popup populates their scope fields, and clicking `+ New Prospect` cleanly resets `selectedClientCode` to `'new'` and clears the search query.
5. **Auth session persistence & logout (`PracticeStoreContext.tsx` & `LoginView.tsx`):** Signing in with `erik@fdoncall.co.za` or `andre@fdoncall.co.za` updates `currentUser` in `PracticeStoreContext`, and clicking `Close Session` in `UserPopover` clears `isAuthenticated` and renders `LoginView`.

---

### Task 1: Better-Auth + Cloudflare D1 Setup, Login Screen & User Popover Refinement

**Files:**
- Create: `apps/web/wrangler.toml`
- Create: `apps/web/migrations/0001_better_auth.sql`
- Create: `apps/web/src/db/auth-schema.ts`
- Create: `apps/web/functions/api/[[route]].ts`
- Create: `apps/web/src/lib/auth-client.ts`
- Create: `apps/web/src/components/auth/LoginView.tsx`
- Modify: `apps/web/package.json`
- Modify: `apps/web/src/context/PracticeStoreContext.tsx`
- Modify: `apps/web/src/components/ui/user-popover.tsx`
- Modify: `apps/web/src/App.tsx`
- Test: `apps/web/src/components/auth/AuthAndPopover.test.ts`

**Interfaces:**
- Produces:
  - `DEMO_PASSWORD = 'FDonCall2026!'` and `SEEDED_STAFF_ACCOUNTS` in `apps/web/src/lib/auth-client.ts`
  - `signInWithCredentials(email: string, password: string): Promise<{ ok: boolean; user?: PracticeUser; error?: string }>` in `apps/web/src/lib/auth-client.ts` (calls `/api/auth/sign-in/email` when D1/Worker is reachable and falls back deterministically to the seeded staff accounts so offline/static preview and Vitest tests work identically)
  - `isAuthenticated: boolean`, `login(email: string, password: string): Promise<{ ok: boolean; error?: string }>`, and `logout(): void` on `PracticeStoreContextValue` in `apps/web/src/context/PracticeStoreContext.tsx`
  - `LoginView({ onLoginSuccess?: () => void })` in `apps/web/src/components/auth/LoginView.tsx`

- [ ] **Step 1: Write the failing test in `apps/web/src/components/auth/AuthAndPopover.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import * as React from 'react';
import {
  DEMO_PASSWORD,
  SEEDED_STAFF_ACCOUNTS,
  authenticateStaffCredentials,
} from '@/lib/auth-client';
import { LoginView } from './LoginView';
import { UserPopover } from '@/components/ui/user-popover';
import { PracticeStoreProvider } from '@/context/PracticeStoreContext';

describe('Better-Auth + Cloudflare D1 Login & UserPopover', () => {
  it('authenticates all 9 @fdoncall.co.za staff accounts with DEMO_PASSWORD and rejects invalid passwords', () => {
    expect(SEEDED_STAFF_ACCOUNTS).toHaveLength(9);
    const erik = authenticateStaffCredentials('erik@fdoncall.co.za', DEMO_PASSWORD);
    expect(erik.ok).toBe(true);
    expect(erik.user?.id).toBe('erik');
    expect(erik.user?.role).toBe('Partner');

    const andre = authenticateStaffCredentials('andre@fdoncall.co.za', DEMO_PASSWORD);
    expect(andre.ok).toBe(true);
    expect(andre.user?.id).toBe('andre');

    const bad = authenticateStaffCredentials('erik@fdoncall.co.za', 'wrong-pass');
    expect(bad.ok).toBe(false);
  });

  it('renders LoginView with Demo Credentials (erik@fdoncall.co.za and FDonCall2026!) visible on screen', () => {
    const html = renderToStaticMarkup(
      React.createElement(PracticeStoreProvider, null, React.createElement(LoginView))
    );
    expect(html).toContain('erik@fdoncall.co.za');
    expect(html).toContain(DEMO_PASSWORD);
    expect(html).toContain('Sign In');
  });

  it('renders UserPopover without Partner badge, Durbanville, Switch Active Session, or SAICA Registered Practice', () => {
    const html = renderToStaticMarkup(
      React.createElement(
        PracticeStoreProvider,
        null,
        React.createElement(UserPopover, { defaultOpen: true })
      )
    );
    expect(html).toContain('Erik');
    expect(html).toContain('erik@fdoncall.co.za');
    expect(html).not.toContain('Durbanville, Cape Town');
    expect(html).not.toContain('Switch Active Session');
    expect(html).not.toContain('SAICA Registered Practice');
    expect(html).toContain('Settings');
    expect(html).toContain('Close Session');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --workspace=@crmv2/web run test -- src/components/auth/AuthAndPopover.test.ts`
Expected: FAIL with `Cannot find module '@/lib/auth-client'`

- [ ] **Step 3: Install `better-auth`, `drizzle-orm`, and `hono` in `apps/web` and create Cloudflare D1 + Better-Auth files**

1. Install packages in `apps/web/package.json` (`better-auth`, `drizzle-orm`, `hono`).
2. Create `apps/web/wrangler.toml` with `name = "crmv2"`, `pages_build_output_dir = "dist"`, `compatibility_date = "2026-11-01"`, `compatibility_flags = ["nodejs_compat"]`, and `[[d1_databases]]` binding `DB` (`database_name = "crmv2-auth"`).
3. Create `apps/web/migrations/0001_better_auth.sql` and `apps/web/src/db/auth-schema.ts` defining the Drizzle SQLite tables `user`, `session`, `account`, `verification` with `role`, `staffId`, and `kind` columns.
4. Create `apps/web/functions/api/[[route]].ts` mounting Hono + `betterAuth` with `drizzleAdapter(db, { provider: 'sqlite' })` and `emailAndPassword: { enabled: true }`, plus a `/api/auth/demo-seed` / auto-seed helper for the 9 staff members.
5. Create `apps/web/src/lib/auth-client.ts` exporting `DEMO_PASSWORD = 'FDonCall2026!'`, `SEEDED_STAFF_ACCOUNTS`, `authenticateStaffCredentials(email, password)`, and `signInWithCredentials(email, password)` (which calls `/api/auth/sign-in/email` and falls back cleanly to `authenticateStaffCredentials`).
6. Update `PracticeStoreContext.tsx` to add `isAuthenticated: boolean` (default `true` in `PracticeStoreProvider` unless `requireAuth` is passed or `logout()` is called, with `App.tsx` gating on `!isAuthenticated` to show `<LoginView />`), `login(email, password)`, and `logout()`.
7. Create `apps/web/src/components/auth/LoginView.tsx` showing the email/password form, error message, and the **Demo Credentials** card (`erik@fdoncall.co.za` / `FDonCall2026!`) with quick-fill pills for `Erik (Partner)`, `Wouter (Partner)`, and `André (Staff)`.
8. Update `apps/web/src/components/ui/user-popover.tsx` (adding optional `defaultOpen?: boolean` prop for testability): remove `Partner` role badge and `Durbanville, Cape Town` from header and trigger, remove `Switch Active Session` and `SAICA Registered Practice`, rename `Practice Settings` to `Settings`, and wire `Close Session` to `logout()`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm --workspace=@crmv2/web run test -- src/components/auth/AuthAndPopover.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web package-lock.json
git commit -m "feat(auth): add Better-Auth + Cloudflare D1 setup, LoginView with demo credentials, and clean UserPopover"
```

---

### Task 2: Editable Annual Service Fees & Hiding Unreleased Features (AI Copilot & SharePoint Vault)

**Files:**
- Modify: `packages/domain/src/domain/estimate.ts:12-88,205-209,350-408`
- Modify: `apps/web/src/context/PracticeStoreContext.tsx:27-31,123-126`
- Modify: `apps/web/src/components/settings/panes/ServicePricingMatrixPane.tsx`
- Modify: `apps/web/src/components/settings/SettingsView.tsx`
- Modify: `apps/web/src/components/layout/Topbar.tsx`
- Modify: `apps/web/src/components/layout/Layout.tsx`
- Modify: `apps/web/src/components/client-show/ClientSummaryBar.tsx`
- Modify: `apps/web/src/components/client-show/ClientShowView.tsx`
- Modify: `apps/web/src/components/client-show/tabs/EstimateTab.tsx`
- Test: `apps/web/src/components/settings/Settings.test.ts`
- Test: `apps/web/src/components/client-show/ClientShowView.test.ts`

**Interfaces:**
- Produces:
  - `FixedFeeKey = keyof typeof FIXED_FEES` and optional `fixedFees?: Partial<Record<FixedFeeKey, number>>` on `EstimateInput` in `packages/domain/src/domain/estimate.ts`
  - `serviceFees: Record<string, number>` on `PracticeRates` in `apps/web/src/context/PracticeStoreContext.tsx` (initialized with `{ ...FIXED_FEES, EMP501_SMALL: 1900, EMP501_MEDIUM: 2500, EMP501_LARGE: 3250 }`)
  - `updateServiceFee(code: string, amount: number): void` on `PracticeStoreContextValue`

- [ ] **Step 1: Write failing tests in `apps/web/src/components/settings/Settings.test.ts` and `apps/web/src/components/client-show/ClientShowView.test.ts`**

Add assertions verifying:
1. `computeEstimate` uses custom `fixedFees` overrides when provided (e.g., `VAT201: 600`, `ITR14: 1800`, `CIPC_SUBMISSION: 600`).
2. `SettingsView` does **not** render `AI Copilot & Providers`.
3. `Topbar` does **not** render `Open AI Practice Copilot`.
4. `ServicePricingMatrixPane` renders editable numeric `<input type="number">` fields for the standard fees in the Service Catalogue table.
5. `ClientShowView` and `CLIENT_SHOW_TABS` do **not** render `SharePoint Vault & SLAs`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm --workspace=@crmv2/web run test -- src/components/settings/Settings.test.ts src/components/client-show/ClientShowView.test.ts`
Expected: FAIL on the new assertions.

- [ ] **Step 3: Implement editable `fixedFees` / `serviceFees` and hide AI Copilot & SharePoint Vault**

1. In `packages/domain/src/domain/estimate.ts`:
   - Add `fixedFees?: Partial<typeof FIXED_FEES> & { EMP501_SMALL?: number; EMP501_MEDIUM?: number; EMP501_LARGE?: number }` to `EstimateInput`.
   - Inside `computeEstimate(i)`, merge `const fees = { ...FIXED_FEES, ...i.fixedFees };` and use `fees.VAT201`, `fees.EMP201`, `fees.IRP6_PAYABLE`, `fees.IRP6_NIL`, `fees.COIDA`, `fees.ITR14`, `fees.ITR12`, `fees.ITR12T`, `fees.CIPC_SUBMISSION`, `fees.BO`, `fees.ITREG`, `fees.CIPC_REG`, `fees.CIPC_NAME` (and custom `EMP501` tier fees when provided).
2. In `apps/web/src/context/PracticeStoreContext.tsx`:
   - Add `serviceFees: Record<string, number>` to `PracticeRates` and `INITIAL_RATES`, and add `updateServiceFee(code: string, amount: number)` helper.
3. In `apps/web/src/components/settings/panes/ServicePricingMatrixPane.tsx`:
   - Render editable numeric inputs in the `Standard Fee` column for each service in `SERVICE_TYPES` mapped to `rates.serviceFees`, saved when clicking `Update Rates` (or inline on change).
4. In `apps/web/src/components/settings/SettingsView.tsx`, `Topbar.tsx`, and `Layout.tsx`:
   - Hide the `AI Copilot & Providers` navigation button/pane and hide the `Sparkles` AI Copilot button and drawer.
5. In `apps/web/src/components/client-show/ClientSummaryBar.tsx` and `ClientShowView.tsx`:
   - Remove `{ id: 'vault', label: 'SharePoint Vault & SLAs', icon: FolderLock }` from `CLIENT_SHOW_TABS` and remove the Vault tab trigger/content from `ClientShowView.tsx`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm --workspace=@crmv2/web run test -- src/components/settings/Settings.test.ts src/components/client-show/ClientShowView.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/domain/src/domain/estimate.ts apps/web/src
git commit -m "feat(settings,client-show): make standard service fees editable and hide AI Copilot and SharePoint Vault"
```

---

### Task 3: People (Employees Only), Clients Header Cleanup, and Deadlines Table-First & Toggle Fix

**Files:**
- Modify: `apps/web/src/components/views/PeopleView.tsx`
- Modify: `apps/web/src/components/people/PeopleDirectory.tsx`
- Modify: `apps/web/src/components/views/ClientsView.tsx`
- Modify: `apps/web/src/components/clients/ClientsRegisterTable.tsx`
- Modify: `apps/web/src/components/deadlines/DeadlinesDashboard.tsx`
- Test: `apps/web/src/components/people/people-data.test.ts`
- Test: `apps/web/src/components/clients/ClientsRegisterTable.test.ts`
- Test: `apps/web/src/components/deadlines/DeadlinesViews.test.ts`

**Interfaces:**
- Consumes: `buildPeopleProfiles(staff, clients)` from `apps/web/src/components/people/people-data.ts`
- Produces:
  - `PeopleView` with title `People` (no subtitle/badge) and `PeopleDirectory` showing the 9 FD on Call staff (`erik@fdoncall.co.za`, `wouter@fdoncall.co.za`, etc.)
  - `ClientsView` with title `Clients` (no subtitle/badge) and `ClientsRegisterTable` without the `All (13)` filter chip strip
  - `DeadlinesDashboard` defaulting to `Table` mode, without subtitle, and with right-grouped controls so the `Table / Kanban` toggle never jumps

- [ ] **Step 1: Write failing tests in `people-data.test.ts`, `ClientsRegisterTable.test.ts`, and `DeadlinesViews.test.ts`**

Add assertions verifying:
1. `PeopleView` renders `People`, does **not** render `People & Directors Directory` or `18 Profiles` or the Western Cape subtitle, and renders FD on Call employees (`Erik`, `Wouter`, `André`, `erik@fdoncall.co.za`, `wouter@fdoncall.co.za`) while excluding external directors (`albert@coetzeefamily.co.za`).
2. `ClientsView` renders `Clients`, does **not** render `Clients Directory Register`, `13 Active Accounts`, `Primary practice operational register`, or `All (13)`.
3. `DeadlinesDashboard` renders `Deadlines` without the `Real-time compliance monitoring` subtitle and defaults to the **Table** view on initial render.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm --workspace=@crmv2/web run test -- src/components/people/people-data.test.ts src/components/clients/ClientsRegisterTable.test.ts src/components/deadlines/DeadlinesViews.test.ts`
Expected: FAIL on the new assertions.

- [ ] **Step 3: Update `PeopleView`, `PeopleDirectory`, `ClientsView`, `ClientsRegisterTable`, and `DeadlinesDashboard`**

1. In `apps/web/src/components/views/PeopleView.tsx`:
   - Change heading to `People` and remove the `18 Profiles` badge and subtitle paragraph.
2. In `apps/web/src/components/people/PeopleDirectory.tsx`:
   - Filter `buildPeopleProfiles(staff, clients)` to `p.isPracticeStaff` (`staffOnly`) instead of `!p.isPracticeStaff`.
   - Update table column headers to `Employee Name`, `Role`, `Email Address`, `Phone Number`, `Assigned Clients`.
   - Render all linked client pills (`person.companyLinks`) for each employee, and wire the `+ Add Employee` modal to `inviteTeamMember` from `usePracticeStore()`.
3. In `apps/web/src/components/views/ClientsView.tsx` & `ClientsRegisterTable.tsx`:
   - Change heading in `ClientsView.tsx` to `Clients` and remove the `13 Active Accounts` badge and subtitle paragraph.
   - Remove the `All (13) / Companies (9) / CC (0)...` filter buttons in `ClientsRegisterTable.tsx`.
4. In `apps/web/src/components/deadlines/DeadlinesDashboard.tsx`:
   - Remove the `Real-time compliance monitoring across South African statutory tax returns...` paragraph.
   - Change initial `viewMode` state to `'table'`, place the `Table` button before `Kanban` in the toggle, and wrap the `Table / Kanban` toggle and conditional `Workflow Status / Date Urgency` control inside a single right-side `<div className="flex items-center gap-2 self-start md:self-center">` container so `justify-between` keeps the toggle anchored on the right.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm --workspace=@crmv2/web run test -- src/components/people/people-data.test.ts src/components/clients/ClientsRegisterTable.test.ts src/components/deadlines/DeadlinesViews.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/views apps/web/src/components/people apps/web/src/components/clients apps/web/src/components/deadlines
git commit -m "feat(views): show FD on Call staff in People, declutter Clients and Deadlines headers, default Deadlines to Table"
```

---

### Task 4: Role- & Staff-Specific Home Dashboard Queue & Future SA Holidays

**Files:**
- Modify: `apps/web/src/components/views/DashboardView.tsx`
- Test: `apps/web/src/App.test.ts`

**Interfaces:**
- Consumes: `usePracticeStore()` (`clients`, `staff`, `leads`, `currentUser`, `taskStatusOverrides`, `updateTaskStatus`), `aggregatePracticeTasks` from `@/components/deadlines/practice-tasks`, `filterReviewQueueTasks` from `@/components/inbox/PartnerReviewQueue`, `todayInSouthAfrica` and `publicHolidays` from `fdoncall-practice/domain/dates`
- Produces:
  - `getUpcomingHolidays(today: string, count?: number): Array<[string, string]>` exported from `DashboardView.tsx`
  - `getUserDashboardQueue(tasks: PracticeTaskItem[], currentUser: PracticeUser, overrides: Record<string, { status: string }>): { reviewItems: PracticeTaskItem[]; myUrgentTasks: PracticeTaskItem[]; myAssignedTasks: PracticeTaskItem[] }` exported from `DashboardView.tsx`

- [ ] **Step 1: Write the failing test in `apps/web/src/App.test.ts`**

Add tests verifying:
1. `getUpcomingHolidays('2026-11-08', 4)` returns only dates `>= '2026-11-08'` (`2026-12-16` Day of Reconciliation, `2026-12-25` Christmas Day, `2026-12-26` Day of Goodwill, `2027-01-01` New Year's Day) and never returns past dates like `2026-01-01` or `2026-03-21`.
2. `getUserDashboardQueue` returns Erik's partner review queue + Erik's urgent client tasks when `currentUser.id === 'erik'`, and returns Mia's (`BLA-465`) or Willem's (`CLU-614`, `CRE-007`) assigned tasks when logged in as that staff member.
3. `DashboardView` does **not** render `FD on Call Practice Operating System`, `Statutory Date Engine`, or `Computus Easter`, and **does** render the logged-in user's personalized queue and future SA holidays.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --workspace=@crmv2/web run test -- src/App.test.ts`
Expected: FAIL with `getUpcomingHolidays is not a function`

- [ ] **Step 3: Implement `getUpcomingHolidays`, `getUserDashboardQueue`, and the refactored `DashboardView`**

1. Export `getUpcomingHolidays(today: string, count = 4)` combining `publicHolidays(year)` and `publicHolidays(year + 1)` and filtering `[date] => date >= today`.
2. Export `getUserDashboardQueue(tasks, currentUser, overrides)` that computes:
   - `reviewItems`: tasks in `Partner Review Gate` (for Partners)
   - `myAssignedTasks`: non-submitted tasks where `t.staffId === currentUser.id`, sorted by overdue first, then earliest `due` date, then missing date blockers
   - `myUrgentTasks`: overdue or due-in-7-days tasks for `currentUser` (or practice-wide if `myAssignedTasks` is empty).
3. Replace the `DashboardView` markup with:
   - Compact header showing `Home` and current user's active queue summary (`{currentUser.name}'s Queue`).
   - 3 operational KPI cards:
     1. **Partner Sign-Off Queue** (for Partners) or **My Assigned Filings** (for Staff)
     2. **Urgent & Overdue Deadlines** (overdue + due in 7 days for the user's queue, clickable to `Deadlines`)
     3. **Upcoming SA Holidays** (showing `today` and the next 4 upcoming holidays `>= today`).
   - 2 main operational panels below:
     - **Left/Main Panel (`My Action Queue & Urgent Deadlines`):** Shows items awaiting Partner sign-off (if Partner) and the logged-in user's urgent/assigned tasks with status badges, due dates, and click-through to the client/deadlines.
     - **Right/Secondary Panel (`Onboarding Pipeline & Leads` for Partners, or `Missing Date Blockers` for Staff):** Shows active leads (`stage !== 'Active Client'`) or profile blockers needing resolution.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm --workspace=@crmv2/web run test -- src/App.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/views/DashboardView.tsx apps/web/src/App.test.ts
git commit -m "feat(dashboard): replace filler cards with user-specific action queue and future SA holidays"
```

---

### Task 5: Full-Width Vertical Fee Estimator with Typeahead Client Search

**Files:**
- Modify: `apps/web/src/components/views/EstimatorView.tsx`
- Modify: `apps/web/src/components/estimator/EstimateCalculator.tsx`
- Test: `apps/web/src/components/estimator/Estimator.test.ts`

**Interfaces:**
- Consumes: `rates.serviceFees` from `usePracticeStore()`, `computeEstimate` from `fdoncall-practice/domain/estimate`
- Produces:
  - `EstimatorView` with clean `Fee Estimator & Quotes` header (no `12-Month Projections` badge or subtitle)
  - `EstimateCalculator` with typeahead client search input + suggestion popover, full-width `Client & Practice Scope`, full-width `Services` category section (`Regular work`, `Compliance & Annual work`, `Software Recharges`), and full-width bottom `Quote & 12-Month Cashflow Projection` section

- [ ] **Step 1: Write the failing test in `apps/web/src/components/estimator/Estimator.test.ts`**

Add assertions verifying:
1. `EstimatorView` does **not** render `12-Month Projections` or `Interactive retainer calculation engine`.
2. `EstimateCalculator` renders a typeahead search input (`placeholder*="Search existing client"` or similar) instead of the old `<select id="client-selector">`, plus a `+ New Prospect` button.
3. `EstimateCalculator` renders the `Services` category section header and uses `rates.serviceFees` in its fee labels and `computeEstimate` call.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --workspace=@crmv2/web run test -- src/components/estimator/Estimator.test.ts`
Expected: FAIL on the new assertions.

- [ ] **Step 3: Refactor `EstimatorView.tsx` and `EstimateCalculator.tsx`**

1. In `apps/web/src/components/views/EstimatorView.tsx`:
   - Remove the `12-Month Projections` badge and subtitle paragraph under `Fee Estimator & Quotes`.
2. In `apps/web/src/components/estimator/EstimateCalculator.tsx`:
   - Replace `<select id="client-selector">` with a search input (`clientSearchQuery`) that filters `clients` by code or name as the user types and displays a dropdown list of matching clients on focus/input, plus a `+ New Prospect` button to reset to a blank prospect.
   - Replace the 2-column `grid-cols-1 lg:grid-cols-12` layout with a full-width (`w-full space-y-6`) vertical stack from top to bottom:
     1. **Estimate Calculation Target** (full width left-to-right)
     2. **Client & Practice Scope** (full width left-to-right)
     3. **Services** section (`<section className="space-y-4">`) with a clear `Services` heading containing full-width cards for **Regular work (Monthly Hours)**, **Compliance & Annual work** (displaying live `rates.serviceFees` values), and **Software Recharges (At Cost)**
     4. **Quote & 12-Month Projection** at the bottom (full width left-to-right: `Monthly Retainer` and `12-Month Projected Value` KPI cards, `Proposal & SLA Actions`, and the `12-Month Cashflow Projection` table).
   - Pass `fixedFees: rates.serviceFees` into `computeEstimate(input)`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm --workspace=@crmv2/web run test -- src/components/estimator/Estimator.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/views/EstimatorView.tsx apps/web/src/components/estimator/
git commit -m "feat(estimator): add typeahead client search and full-width vertical stack layout with live service fees"
```

---

### Task 6: `/skill:impeccable` UI Polish Pass & Full Verification Suite

**Files:**
- Modify: `apps/web/src/index.css`
- Modify: `apps/web/src/components/views/DashboardView.tsx`
- Modify: `apps/web/src/components/views/InboxView.tsx`
- Modify: `apps/web/src/components/layout/Sidebar.tsx`
- Modify: `apps/web/src/components/layout/Topbar.tsx`
- Modify: `apps/web/src/UnifiedReviewFixes.test.ts`
- Modify: `apps/web/src/FinalReviewFixes.test.ts`

**Interfaces:**
- Consumes: All updated views from Tasks 1–5
- Produces: Clean, consistent CRM dashboard typography, spacing, border rhythm, and 100% passing test suite + production build

- [ ] **Step 1: Read `skill://impeccable` and audit all views against CRM dashboard best practices**

Audit and refine:
- Remove any remaining decorative subtitles or redundant badges (e.g., in `InboxView.tsx`).
- Ensure consistent `p-6 max-w-7xl mx-auto space-y-5` page containers, crisp `h-12` topbar alignment, tabular numerals (`font-tnum`) on all ZAR figures and dates, and clean table row density.
- Update any existing snapshot/string assertions in `UnifiedReviewFixes.test.ts` and `FinalReviewFixes.test.ts` that previously pinned old removed subtitles or badges.

- [ ] **Step 2: Run full test suite and typecheck**

Run: `npm test && npm --workspace=@crmv2/web run build`
Expected: All Vitest suites PASS and `tsc -b && vite build` succeeds with zero errors.

- [ ] **Step 3: Visually verify the live app in headless browser**

Start the dev server and inspect the rendered screens (`LoginView`, `DashboardView` as Erik and as André, `PeopleView`, `ClientsView`, `DeadlinesDashboard`, `ClientShowView`, `EstimatorView`, `SettingsView` -> `Service & Pricing Matrix`, and `UserPopover`) to confirm every layout change matches the spec.

- [ ] **Step 4: Commit**

```bash
git add apps/web
git commit -m "style(ui): apply impeccable CRM dashboard polish and update verification tests"
```

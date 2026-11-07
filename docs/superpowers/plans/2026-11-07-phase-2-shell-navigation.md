# Phase 2: Shell & Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Twenty CRM's exact collapsible dark/light application shell (`Layout.tsx`), persistent topbar with `Cmd+K` search palette and breadcrumbs, and user popover footer according to the FD on Call brand design specification.

**Architecture:** A lightweight React layout component in `apps/web/src/components/layout/` providing collapsible sidebar navigation (expanded 240px / collapsed 56px with icon tooltips), topbar with breadcrumb trail and `Cmd+K` dialog, and user popover. Navigation states and view switching are driven by a simple route state or view switcher with zero unnecessary routing abstractions (Ponytail).

**Tech Stack:** React 19, Tailwind CSS v4, Lucide React, Radix UI dialog & popover primitives, `packages/domain`.

**Spec:** `HANDOFF.md` (Section 4 & Section 6, Phase 2), `PRODUCT.md`, `DESIGN.md`, and `impeccable/reference/craft-floor.md`.

## Global Constraints

- Follow Ponytail principles: minimal code, no unnecessary state libraries or routing bloat.
- Respect Craft Floor bans: no kicker/eyebrow headings, no gradient text, single-declaration hairline elevation (`border border-border/80`).
- Exact brand tokens: Canvas `#141414` (dark) / `#f6f5f3` (light), Surface `#181818` / `#ffffff`, Hairline `#262626` / `rgba(27,24,23,0.12)`, Brand Crimson `#c4161c` (hover `#a01217` / `#d91b22`).
- Navigation items:
  - Top items: Home (`/` or `dashboard`), Inbox (`review-queue`), Settings (`settings`)
  - PRACTICE DATA: Clients (`clients` with badge 13), People & Directors (`people` with badge 18)
  - STATUTORY OPS: Deadlines (`deadlines` with badge 4), New Quote Calculator (`quote`), Onboarding Pipeline (`pipeline` with badge 5)
  - Footer user: `[EW]` Erik (Partner) with popover (Profile Settings, Change Password, Log out)
- `Cmd+K` opens a fast search modal for navigating views and searching clients (`ALC-610`, `MUS-875`, etc.).

## Review Focus

1. **Collapsible Sidebar Layout Integrity:** Collapsing sidebar smoothly transitions between 240px and 56px without clipping text or horizontal layout jumps.
2. **`Cmd+K` Keyboard Accessibility:** Pressing `Cmd+K` (or `Ctrl+K`) or clicking the search trigger opens the command palette; Escape closes it.
3. **User Profile Popover Focus & Dismissal:** Clicking the user footer toggles the popover cleanly without layout shifting.
4. **Theme Switch Synchronization:** Dark and light mode toggle across both sidebar and content canvas without variable mismatch.
5. **Zero Monorepo / Dependency Bloat:** Built with standard React state and Radix/Tailwind primitives, keeping bundle lean and fast.

---

### Task 1: Create Command Palette & User Popover Primitives

**Files:**
- Create: `apps/web/src/components/ui/command-dialog.tsx`
- Create: `apps/web/src/components/ui/user-popover.tsx`
- Test: `apps/web/src/components/ui/command-dialog.test.ts`

**Interfaces:**
- Consumes: `@radix-ui/react-dialog`, `@radix-ui/react-popover`, `lucide-react`
- Produces: `<CommandDialog open={open} onOpenChange={setOpen} onSelectView={setView} />` and `<UserPopover user={user} />`.

- [ ] **Step 1: Write test for command dialog navigation and search matching**

Test that view list filters correctly by query string (e.g., "clients", "deadlines", "quote").

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test --workspace=@crmv2/web`
Expected: FAIL (module not defined).

- [ ] **Step 3: Implement `CommandDialog` and `UserPopover` primitives**

Implement lightweight modal with keyboard listeners for `Cmd+K` / `Ctrl+K` and clean search list using Lucide icons.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test --workspace=@crmv2/web`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web
git commit -m "feat(web): add command dialog and user popover primitives"
```

---

### Task 2: Build Collapsible Twenty CRM Sidebar & Persistent Topbar

**Files:**
- Create: `apps/web/src/components/layout/Sidebar.tsx`
- Create: `apps/web/src/components/layout/Topbar.tsx`
- Create: `apps/web/src/components/layout/Layout.tsx`
- Create: `apps/web/src/types/navigation.ts`
- Test: `apps/web/src/components/layout/Layout.test.ts`

**Interfaces:**
- Consumes: Navigation items from `HANDOFF.md`, `CommandDialog`, `UserPopover`, `CLIENTS`
- Produces: `<Layout currentView={view} onViewChange={setView}>{children}</Layout>`.

- [ ] **Step 1: Write test for Layout navigation state and sidebar toggle**

Test that sidebar collapse toggle flips state and navigation items call `onViewChange`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test --workspace=@crmv2/web`
Expected: FAIL.

- [ ] **Step 3: Implement `Sidebar`, `Topbar`, and `Layout` components**

- Implement collapsible sidebar (expanded 240px / collapsed 56px) with static brand mark `[FD] FD on Call`, exact sections (`PRACTICE DATA`, `STATUTORY OPS`), badges (13 clients, 4 deadlines, 5 pipeline), and user footer `[EW] Erik (Partner)`.
- Implement persistent topbar (48px) with breadcrumbs, `Cmd+K` trigger button, and dark/light mode toggle.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test --workspace=@crmv2/web`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web
git commit -m "feat(web): implement twenty crm collapsible layout and persistent topbar"
```

---

### Task 3: Wire Application Views & Verify Layout Integration

**Files:**
- Modify: `apps/web/src/App.tsx`
- Create: `apps/web/src/components/views/DashboardView.tsx`
- Create: `apps/web/src/components/views/ClientsView.tsx`
- Create: `apps/web/src/components/views/DeadlinesView.tsx`
- Modify: `apps/web/src/App.test.ts`

**Interfaces:**
- Consumes: `Layout`, `packages/domain` (dates, seed, rules)
- Produces: Complete working shell with view switching between Dashboard, Clients register, and Deadlines.

- [ ] **Step 1: Write test for view switching in App**

Verify that selecting a view updates the active breadcrumb and renders the matching view.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test --workspace=@crmv2/web`
Expected: FAIL.

- [ ] **Step 3: Wire Layout into `App.tsx` and create placeholder views**

Mount `<Layout>` in `App.tsx`, wire `view` state, provide view components with live data from `packages/domain`.

- [ ] **Step 4: Run full workspace test suite and build**

Run: `npm test && npm run build`
Expected: All tests pass, build completes with 0 errors.

- [ ] **Step 5: Run Impeccable detector check on changed UI**

Run: `.agents/skills/impeccable/scripts/impeccable detect --json apps/web/src/App.tsx`
Expected: Clean check or address findings.

- [ ] **Step 6: Update `HANDOFF.md` checklist and commit**

Mark Phase 2 done in `HANDOFF.md` and commit.

```bash
git add .
git commit -m "feat: complete Phase 2 twenty crm shell and navigation"
```

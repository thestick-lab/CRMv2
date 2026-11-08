# Unified Practice Operations, Governance & Linear Workflow Design Spec

**Date:** 2026-11-08  
**Project:** FD on Call CRM (CRMv2)  
**Status:** Draft for Review  
**Target Architecture:** React 19, Vite 7, Tailwind CSS v4, shadcn/ui (Radix primitives), TanStack Table, Lucide React, `packages/domain`

---

## 1. Intent & The Why

FD on Call is a South African Chartered Accountancy practice managing SMEs, trusts, and high-net-worth individuals across the Western Cape. Operating under SAICA quality controls and SARS Tax Administration Act regulations, the firm requires airtight compliance tracking without sacrificing the speed, elegance, and density of a modern developer-grade CRM (like Twenty and Linear).

### The Problem
1. **Fragmented Workflows:** Quoting prospective clients and estimating 12-month client retainers were previously split between a nested client tab and a standalone menu.
2. **Missing Operational Inbox:** Statutory returns requiring Partner review gates (AFS, ITR14, payable IRP6) were stranded on the Deadlines board without a dedicated queue for the Partners (Erik & Wouter).
3. **Card/Visual Clutter:** Over-embellished cards, duplicate screen titles (`Practice Settings & Configuration` + `Two-Pane Settings`), and non-responsive tables cluttered operational focus.
4. **Dead Links & Unclear Governance:** Menu items like `SAICA Governance Log` and `Change Password` had no functional destination or audit trail backing.

---

## 2. Goals, Non-Goals & Anti-Goals

### Goals
- **Unified Navigation:** Lean, uncluttered sidebar with top icon-only utility bar (`Home`, `Inbox`, `Settings`) and 4 primary operational registers: `Clients`, `People`, `Deadlines`, and `Fee Estimator & Quotes`.
- **Linear-Style Task Execution:** Interactive Deadlines Kanban and Table with 1-click status progression, assignee avatars, and interactive live KPI filters.
- **Partner Review Inbox (`/inbox`):** Dedicated sign-off queue for CA(SA) Partners to review and approve returns before SARS/CIPC lodgment.
- **Unified Fee Estimator (`/estimator`):** Full 21-service calculator supporting both existing client annual reviews and new prospect quotes, with live PDF/Excel generation and Documenso SLA dispatch.
- **Clean Client Record Show (`/clients/:code`):** Interactive `Details` and `Services` switches with direct deadline recalculation; deadlines moved out to the main board with deep-link filtering.
- **Normalized People Register (`/people`):** Clean TanStack table of client directors and key contacts with view access for all staff and edit restrictions for Admin/Partners.
- **Admin Settings Panel:** Role-gated settings (Founders/Technicians) housing Staff RBAC, Service Catalogue & Pricing Matrix, live SARS Filing Season dates, and the SAICA Governance Log.

### Non-Goals
- Building an external client-facing web portal (client interaction is handled via Documenso PDF SLAs and email).
- Integrating custom full-blown email clients into the app.

### Anti-Goals
- Monolithic micro-frontends or heavy Linaria/GraphQL Nx monorepos (preserving CRMv2's sub-second HMR React 19 stack).
- Flat, un-normalized contact tables where client directors and practice staff are mixed together without relational boundaries.

---

## 3. Approaches Considered & Tradeoffs

### Option A: Unified Operations Command Center (Selected)
- **Structure:**
  - Sidebar Top Header: Left collapse toggle + horizontal icon-only button bar (`Home`, `Inbox [badge]`, `Settings`) with hover tooltips.
  - Sidebar Main: `Clients`, `People`, `Deadlines`, `Fee Estimator & Quotes`.
  - Nested Tabs: Estimator combines calculation (`Estimate Calculator`) + proposal tracking (`Sent Quotes & Leads`). Client record keeps master data (`Details` & `Services`) and links to the Deadlines board.
- **Tradeoffs:** High scanability, minimal sidebar height, zero duplicate concepts, and clear role boundaries.

### Option B: Monolithic Multi-Tab Dashboard (Rejected)
- **Structure:** Merging Home, Deadlines, and Onboarding into one giant multi-tab dashboard screen (`/dashboard`).
- **Why Rejected:** Forces accountants and partners to switch tabs every time they jump between client record configuration and compliance task execution, adding unnecessary clicks to daily operations.

---

## 4. UI Architecture & Functional Specifications

### 4.1. Shell Navigation & Top Utility Bar
- **Sidebar Header:**
  - Left button: `PanelLeftClose` collapse toggle.
  - Middle: High-resolution FD on Call brand mark + workspace dropdown (clean division switcher without clutter).
- **Horizontal Utility Bar (Directly below header):**
  - Three icon-only buttons with subtle hover backgrounds and Radix Tooltips:
    1. `Home` (`Home` icon): Navigates to executive dashboard.
    2. `Inbox` (`Inbox` icon): Displays unread badge count of returns awaiting Partner sign-off.
    3. `Settings` (`Settings` icon): Navigates to practice settings.
- **Primary Registers:**
  1. `🏢 Clients` (`/clients`): Master client accounts list.
  2. `👥 People` (`/people`): Client company directors and contact register.
  3. `📅 Deadlines` (`/deadlines`): Practice compliance board (Kanban & Table).
  4. `🧮 Fee Estimator & Quotes` (`/estimator`): Pricing calculator & sent quotes.
- **Footer User Popover (`UserPopover`):**
  - Displays avatar initials, Name (`André`), Role (`Accountant`), and Email (`andre@fdoncall.co.za`).
  - Active session switcher (Erik Partner, Chrizelle Compliance Officer, André Accountant).
  - Links: `Practice Settings` (`/settings`) and `SAICA Governance Log` modal.

---

### 4.2. Clients Master Register & Detail Configuration (`/clients`)
- **Clients Directory Table:**
  - Header: Clean title `Clients` (removed duplicate subtitle and `13 Active Accounts` badge).
  - Responsive layout: `overflow-x-auto` table container preventing horizontal clipping on mobile/laptops.
  - Columns: `Code`, `Client Name`, `Entity Type`, `Responsible Partner`, `Year End`, `VAT Status`, `Payroll`, `Services`, `Action`.
- **Client Record Show View (`/clients/:code`):**
  - **Details Card:**
    - Financial Year End dropdown (January – December).
    - Incorporation Date picker (calculates CIPC annual return deadline).
    - Turnover input with Year and Source dropdowns (determines CIPC filing fees and turnover bands).
    - Interactive switches: `VAT Registered` (Category A–F), `Payroll` (headcount + SimplePay), and `eFiling Profile` (Client profile vs. FD on Call firm profile).
  - **Services Card:**
    - Checkbox list of the 7 statutory return types:
      - `Annual Financial Statements (AFS)`
      - `Company Income Tax Return (ITR14)` (or `ITR12` / `ITR12T`)
      - `Provisional Tax (IRP6)`
      - `VAT Return (VAT201)`
      - `Monthly Employer Declaration (EMP201)`
      - `Employer Reconciliation (EMP501)`
      - `CIPC Annual Return & Beneficial Ownership (BO)`
    - Toggling any service immediately updates the practice store and regenerates compliance deadlines.
  - **Deadlines Affordance:**
    - Button: `[View Client Deadlines ➔]`, which navigates to `/deadlines?client=ALC-610` pre-filtered.

---

### 4.3. Client Contacts & Directors Directory (`/people`)
- **Data Model:** Normalized client directors, trustees, and authorized financial officers.
- **UI Surface:** Dense TanStack Table with instant search:
  - Columns: `Full Name`, `Legal ID / Passport`, `Email Address`, `Direct Phone`, `Designation / Title` (Director, Trustee, CEO), `Linked Client Company` (with clickable code pill `ALC-610`).
  - Action: `[+ Add Contact]` modal.
- **RBAC Policy:**
  - View: Accessible to all authenticated practice members.
  - Create / Edit / Delete: Restricted to `Partner` and `Admin/Technician` roles to protect legal statutory identities.

---

### 4.4. Linear-Style Deadlines Board & Statutory Action Modal (`/deadlines`)
- **Header:** Simple title `Deadlines` (removed `Practice Horizon: 30 Days` label).
- **Interactive Live KPI Cards:**
  - `Overdue Filings`, `Due in 7 Days`, `Due in 30 Days`, `Missing a Date`.
  - Clicking any KPI tile instantly filters the board/table to that exact slice.
- **Workflow Lanes:**
  - `Not Started` ➔ `In Progress` ➔ `Partner Review Gate` ➔ `Submitted`.
  - Linear-style card interactions:
    - Drag card across columns.
    - Click status badge or assignee avatar to advance status or reassign directly without opening modal.
    - Double-click card to open `StatutoryActionModal`.
- **Statutory Action Modal:**
  - Compact Linear-style dialog showing:
    - Service Badge (`IRP6`, `ITR14`, `AFS`, `VAT201`), Client Name & Code, Due Date with holiday rollback icon (`↩`).
    - Status selection buttons.
    - Partner Review Gate sign-off section:
      - When logged in as Erik/Wouter (Partner): Checkbox `[X] Sign off as Erik (Partner)` is enabled.
      - When logged in as Accountant: Displays `PARTNER_REVIEW_REQUIRED` with disabled checkbox and warning banner.
    - SARS eFiling Reference Number input and ITA34 Notice checkbox.
    - Button: `Save & Update Status` and `Open Client Record`.

---

### 4.5. Partner Review Queue (`/inbox`)
- **Purpose:** Centralized sign-off inbox for Managing Partners (Erik & Wouter).
- **View Content:**
  - Table and card view of all practice tasks currently sitting in `Partner Review Gate`.
  - Shows: Client Name, Return Type, Period, Assigned Accountant, Draft Filing Date, and Statutory Due Date.
  - Actions:
    - `[Sign Off & Approve as Partner]`: Stamps partner signature, logs to SAICA Governance Log, advances task to `Submitted` readiness.
    - `[Request Changes]`: Reverts task to `In Progress` with an accountant note.

---

### 4.6. Unified Fee Estimator & Quotes (`/estimator`)
Combines proposal generation and quote pipeline into two tabs:
- **Tab 1: `Estimate Calculator`:**
  - Top Selector: Choose an existing practice client (pre-fills their turnover, year-end, and active services) OR choose `+ New Prospect` (blank form).
  - Left Input Panel:
    - Legal Name, Entity Type, Financial Year End, Estimated Turnover, Payroll Headcount, Responsible Partner, Lead Accountant, and Estimate Start Month.
    - Regular Work: Monthly accounting hours, Payroll hours, Management accounts hours.
    - Compliance: Checkboxes for VAT201, EMP201, EMP501, IRP6, COIDA.
    - Annual Work: AFS hours + month, ITR14 month, Directors' tax returns, CIPC AR.
    - Recharges: Xero Plan dropdown (`Starter` R391.30, `Standard` R691.30, `Premium` R952.17 excl. VAT) and SimplePay monthly fee.
  - Right Output Panel:
    - Monthly Retainer excl. VAT and incl. 15% VAT.
    - 12-Month Bar Chart and Schedule Matrix with automatic March +6% price escalation.
    - Actions: `[Download PDF Quote]`, `[Download Excel]`, `[Save & Update Client Services]` (for existing client), and `[Send Engagement Letter SLA]` (via Documenso).
- **Tab 2: `Sent Quotes & Onboarding`:**
  - Tracks sent proposals across stages: `Drafting` ➔ `Proposal Sent` ➔ `Documenso Signed` ➔ `KYC & Transfer Complete`.
  - When Documenso SLA is signed, clicking `Convert to Client` moves the prospect into `Clients` and initializes their statutory filing schedule.

---

### 4.7. Admin Settings & Governance Panel (`/settings`)
Refactored into a clear Twenty-CRM-style settings hierarchy:
1. **User Settings (All Staff):**
   - **`My Profile & Account`:** Name, Email, Role badge, and `Change Password` form.
   - **`Data Backup & Export`:** Download practice JSON snapshot.
2. **Workspace Settings (Partners & Admin):**
   - **`AI Copilot Configuration`:** Manage Anthropic, OpenAI, and Gemini API keys for the topbar assistant drawer.
3. **Admin Settings Panel (Founders & Technicians Only):**
   - **`Team & Staff Database`:** Editable table of all practice staff with Name, Email, Role (`Partner`, `Compliance Officer`, `Accountant`), Kind (`Employee`, `Subcontractor`), and billable rates.
   - **`Service Catalogue & Pricing Matrix` (from `[Video #6]`):**
     - Editable table of the 21 service items and fixed fees.
     - Turnover bands table (turnover thresholds, accounting hours, AFS hours, CIPC fees).
     - Payroll bands and Xero subscription price list.
   - **`SARS Filing Seasons`:** Tabular view of SARS filing seasons (`nonProvisional`, `provisional`, `trusts`) with a `[Sync from sars.gov.za]` refresh trigger.
   - **`SAICA Governance Log`:**
     - Immutable audit table logging every partner sign-off.
     - Columns: Timestamp (UTC+2), Partner Name (CA(SA)), Client Code & Legal Name, Statutory Return (`AFS`, `ITR14`, `IRP6`), SARS eFiling Confirmation Number, and Audit Hash.
     - Action: `[Export SAICA Audit Report (PDF/CSV)]`.

---

## 5. Implementation Sequence & Next Steps

1. **Step 1: Layout & Header Refinement (`Sidebar.tsx`, `Topbar.tsx`, `Layout.tsx`):**
   - Move collapse button left next to brand logo.
   - Add icon-only horizontal bar (`Home`, `Inbox`, `Settings`) with hover tooltips and unread badge.
   - Update sidebar navigation list to the 4 primary items.
2. **Step 2: Client Details & Services Interactive Cards (`ClientShowView.tsx`):**
   - Port interactive `Details` switches and `Services` checkboxes from prototype.
   - Add `View Client Deadlines` deep-link button.
3. **Step 3: People Register Table (`PeopleView.tsx`, `PeopleTable.tsx`):**
   - Convert People screen into a clean TanStack Table of Client Directors with RBAC permissions.
4. **Step 4: Partner Review Queue (`InboxView.tsx`):**
   - Build `/inbox` for Partners to review, approve, or reject gated tasks.
5. **Step 5: Unified Fee Estimator & Quotes (`EstimatorView.tsx`):**
   - Build 2-tab `/estimator` uniting the proposal calculator and sent quotes tracker.
6. **Step 6: Settings & SAICA Governance Log (`SettingsView.tsx`, `AdminPanes.tsx`):**
   - Build Twenty-CRM-style settings hierarchy, Admin Pricing Matrix, and immutable SAICA Governance Log.
7. **Step 7: Verification & Impeccable Check:**
   - Full Vitest test suite, typecheck, production build, and Impeccable craft floor verification.

# Full CRMv2 Interactive Features & Complete Surfaces Design

**Date:** 2026-11-08  
**Scope:** Closing remaining blank views, sidebar header fix, full 2-pane Settings & RBAC, People & Directors relational directory, 5-Stage Onboarding Pipeline, and Drag-and-Drop Deadlines Kanban with Action Modal.

---

## 1. Intent & Purpose

FD on Call CRMv2 has successfully implemented its core statutory engine, 12-month rolling fee projection, client register, and client-side quote streaming (Phases 1–6). However, key operational surfaces in the sidebar remained placeholders (`/people`, `/pipeline`, `/settings`), the collapsed sidebar suffered a layout collision bug, and the Deadlines Kanban was static. This project upgrades CRMv2 into an interactive, complete practice management operating system matching Twenty CRM’s modern look and feel.

---

## 2. Goals, Non-Goals & Anti-Goals

### Goals
- **Fix Sidebar Header & Collapsed State:** Eliminate the 56px collision where the collapse toggle overlapped the logo mark; render the authentic `assets/fd-on-call-logo.png` logo asset; provide a Twenty CRM-style translucent glass workspace switcher popover on the top-left brand header.
- **People & Directors Directory (`/people`):** Unified relational directory of all 18 key practice individuals (9 practice staff + 9 client company directors/signers), filterable by `Practice Team` vs `Company Directors`, with linked client entity codes (`ALC-610`, `MUS-875`) and contact triggers.
- **5-Stage Onboarding Pipeline (`/pipeline`):** Interactive prospective client Kanban board (`Lead` → `Discovery` → `Estimate Sent` → `KYC & eFiling Transfer` → `Active Client`) with lead cards, estimated annual retainer values (ZAR), and direct client conversion.
- **Interactive Deadlines Kanban (`/deadlines`):** Mouse drag-and-drop movement across status columns (`Not Started` → `In Progress` → `Partner Review Gate` → `Submitted`), plus double-clicking cards to open the **Statutory Action Modal** (SARS submission confirmation number, ITA34 reference, partner review gate sign-off).
- **Two-Pane Practice Settings (`/settings`):**
  1. *Profile & Security:* Name, email, password change, logout, and **Data Management** (*Export My Data (JSON)* and *Delete Account / Data*).
  2. *Team & RBAC:* Member management with role-based access control (`Partner`, `Compliance Officer`, `Accountant`) and member invite modal.
  3. *🇿🇦 SA Public Holidays Gazette:* 2026/2027 statutory calendar, Computus Easter calculation, and Sunday observed rollbacks for practice year-end deadlines.
  4. *AI Providers & Assistant:* Secure configuration for BYO API keys (**Anthropic Claude**, **OpenAI ChatGPT**, **Google Gemini**), plus a practice copilot assistant drawer powered by the **Vercel AI SDK** (`ai` package).

### Non-Goals
- Real backend API calls to external Claude/OpenAI endpoints without a user-supplied API key (uses graceful mock simulation if no key is entered).
- Third-party OAuth multi-tenant provider setup (keeps single-tenant practice focus).

### Anti-Goals
- Bloated state libraries or heavy drag-and-drop engines: use clean, standard HTML5 drag-and-drop and standard Radix/React primitives (Ponytail principles).
- Merging people and companies into a single flat messy table: maintain clean relational boundaries.

---

## 3. Builder Rulings & Architecture Decisions (Post-Check)

1. **State Persistence (`PracticeStoreContext`):**
   - Application state is managed via a lightweight React Context backed by `localStorage` (`crmv2_practice_state`).
   - On first boot, state hydrates from `CLIENTS`, `STAFF`, and default pipeline leads.
   - Converting a prospect in `/pipeline` automatically adds the new client to the store and updates `/clients`, `/deadlines`, and `/people`.
   - Editing practice rates in Settings (R625 standard rate, 6% March escalation) dynamically recomputes quote estimates across views.
   - "Export My Practice Data" downloads a comprehensive JSON snapshot of clients, leads, tasks, and settings.
   - "Delete My Data / Reset Practice" resets `localStorage` back to pristine seed defaults with a confirmation dialog.

2. **Deadlines Kanban Grouping:**
   - The Deadlines board supports dual grouping: `Group by: Workflow Status` (`Not Started` → `In Progress` → `Partner Review Gate` → `Submitted`) and `Group by: Date Urgency` (`Overdue`, `7 Days`, `30 Days`, `Missing Date`).
   - Dragging a card to `Partner Review Gate` or `Submitted` automatically opens the **Statutory Action Modal** if required fields (e.g. SARS reference) or partner sign-off is needed.

3. **RBAC & Active Session Switcher:**
   - Active user session is switchable in the footer `UserPopover` between:
     - `Erik (Partner)`: Full access, sign-off on review gates, rate edits, AI key configuration.
     - `Chrizelle (Compliance Officer)`: Filing submissions, SARS reference logging, read rates.
     - `André (Accountant)`: Task drafting, bookkeeping, client record inspection.
   - Non-partners attempting to sign off a review gate receive a clear `PARTNER_REVIEW_REQUIRED` indicator.

4. **AI Copilot Execution Model:**
   - Runs purely client-side using the Vercel AI SDK (`ai` package) with provider adapters.
   - User API keys (Anthropic, OpenAI, Gemini) are stored securely in `localStorage`.
   - When no API key is provided, the copilot executes a fast rule-based local practice responder answering questions about deadlines, client turnover, and fee calculations using local practice state.

5. **Division Switcher:**
   - Toggling between *FD on Call* (Advisory) and *Accountant on Call* (Compliance) in the workspace popover updates the header logo to `accountant-on-call-logo.png` vs `fd-on-call-logo.png`, the workspace badge, and filters view context accordingly.

---

## 4. UI Component Specifications

### 4.1. Top-Left Workspace Header & Collapsed Sidebar Bug Fix
- **Expanded (`w-60` / 240px):**
  - Left: High-resolution logo `assets/fd-on-call-logo.png` + "FD on Call" title + dropdown chevron.
  - Clicking title opens **Translucent Glass Workspace Popover** (`bg-card/90 backdrop-blur border border-border shadow-2xl`):
    - Practice profile: "FD on Call — Durbanville Practice" (13 Clients, 9 Staff)
    - Division switcher: Switch between *FD on Call* (Advisory) and *Accountant on Call* (Compliance)
    - Quick shortcut to `/settings`
  - Right: `PanelLeftClose` toggle button.
- **Collapsed (`w-14` / 56px):**
  - Single centered container with logo icon.
  - Clicking logo expands the sidebar cleanly with **zero layout collision**.

### 4.2. People & Directors Directory (`/people`)
- **Data Model:** Normalized `Person` interface with relational links:
  ```ts
  interface Person {
    id: string;
    name: string;
    email: string;
    phone: string;
    isPracticeStaff: boolean;
    practiceRole?: 'Partner' | 'Accountant' | 'Compliance Officer' | 'Subcontractor';
    companyLinks: Array<{ clientCode: string; clientName: string; title: string }>;
  }
  ```
- **Filters:** `All (18)`, `Practice Team (9)`, `Company Directors (9)`.
- **Search:** Instant filter across name, role, email, phone, and linked company code.
- **Contact Card:** Name, Role badge, linked Company pills (`ALC-610`, `MUS-875`) with click-to-navigate, direct `mailto:` and phone triggers.

### 4.3. 5-Stage Onboarding Pipeline (`/pipeline`)
- **5 Stages:** `Lead` → `Discovery` → `Estimate Sent` → `KYC & eFiling Transfer` → `Active Client`.
- **Interactivity:**
  - Drag-and-drop cards across columns.
  - Card metrics: Prospect Legal Name, Estimated Turnover (ZAR), Estimated Monthly Retainer (ZAR), Assignee Partner.
  - Quick action: `[+ New Prospect]` modal, and `[Convert to Practice Client]` when moving to Active.

### 4.4. Interactive Deadlines Kanban & Action Modal (`/deadlines`)
- **Mouse Drag-and-Drop:** Move task cards between workflow columns.
- **Double-Click Action Modal:**
  - Shows task details: Service code (`IRP6`, `ITR14`, `AFS`, `VAT201`), Filing period, Due date with rollback `↩`.
  - Partner Review Gate sign-off section (authenticated as Erik/Wouter).
  - SARS submission fields: `SARS eFiling Reference Number`, `ITA34 Notice Issued`, `Submission Date`.
  - Primary button: `Save & Update Status`; secondary button: `Open Full Client Record`.

### 4.5. Two-Pane Settings & AI Integrations (`/settings`)
- **Left Navigation Pane:**
  - `My Profile & Account`
  - `Team & RBAC`
  - `🇿🇦 SA Public Holidays & Rules`
  - `AI Subscriptions & Providers`
- **Right Content Panes:**
  - *Profile:* First Name, Last Name, Email, Password, Data Export (`Download My Practice Data JSON`), Account Deletion / Reset (`Reset Practice State`).
  - *Team & RBAC:* Team member table with Role dropdowns (`Partner`, `Compliance Officer`, `Accountant`), and `[+ Invite Team Member]` modal.
  - *SA Public Holidays:* Table of all 2026 and 2027 South African statutory public holidays with Computus Easter and Sunday observed substitution dates, plus practice rates editor (R625 standard rate, 6% March escalation).
  - *AI Providers:* API Key inputs for Anthropic Claude (`sk-ant-...`), OpenAI ChatGPT (`sk-...`), and Google Gemini (`AIza...`) with connection test badges.
  - *In-App AI Assistant:* Slide-over copilot drawer in topbar (`Sparkles` icon) allowing interactive queries against practice data.

---

## 5. Verification Plan

1. **Automated Unit & Integration Tests:**
   - Practice store persistence and cross-view synchronization.
   - People & Directors directory filtering, search, and company relationship links.
   - Onboarding pipeline stage transitions and deal value totals.
   - Kanban drag-and-drop status update and double-click action modal handlers.
   - Settings RBAC permissions, SA holiday gazette builder, and AI provider key storage.
2. **Impeccable Craft Detector:** Zero violations across all new/modified UI files.
3. **Live Browser Verification:** Verify rendering at `http://localhost:3000/`.

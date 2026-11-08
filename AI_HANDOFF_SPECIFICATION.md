# FD on Call CRM (CRMv2) — AI-to-AI Master Hand-Off Specification

> **Target Audience:** Target LLM / AI Engineering Assistant taking over repository `/home/hein/Projects/CRMv2`.  
> **Client / Brand:** **FD on Call** (and subsidiary *Accountant on Call*), Durbanville, Western Cape, South Africa.  
> **Industry:** South African Chartered Accountancy (SAICA), Tax Advisory, Statutory Secretarial & Virtual Financial Direction.

---

## 1. Executive Summary & End Goal

The end goal is a high-velocity, production-grade practice operating system (**CRMv2**) for **FD on Call** in Durbanville, South Africa. 
Unlike generic global CRMs (Salesforce, HubSpot, upstream Twenty CRM) that lack South African statutory tax logic, CRMv2 embeds verified South African statutory compliance rules (Companies Act s30(1), SARS Tax Administration Act s25, Easter Computus holiday rollback), 12-month rolling fee projections, dual-signature digital SLAs (Documenso), Xero 15% VAT draft invoice synchronization, and SharePoint document vaults inside Twenty CRM's modern aesthetic (`#141414` dark canvas / `#f6f5f3` light canvas, `Instrument Serif`, `Geist`, and `Geist Mono`).

---

## 2. Technical Stack & Workspace Structure

```
/home/hein/Projects/CRMv2/
├── apps/web/                               # React 19 + Vite + Tailwind v4 + shadcn/ui
├── packages/domain/                        # 33 Pure TypeScript Domain & Compliance Modules
├── docs/                                   # Complete Technical & Functional Specifications
│   ├── 01-REVERSE-ENGINEERING-AND-GAP-ANALYSIS.md
│   ├── 02-PRD-AND-OPEN-QUESTIONS.md
│   ├── 03-ARCHITECTURE-AND-DATABASE-SPEC.md
│   ├── 04-BASELINE-CHANGELOG-AND-WORKFLOW-AUDIT.md
│   └── 05-UI-INFORMATION-ARCHITECTURE-AND-SCREEN-FLOWS.md
├── research/                               # SARS, CIPC, Xero & REA research files
└── assets/                                 # Official FD on Call logos and badges
```

### Stack Specifications:
- **Frontend:** React 19, Vite 7/8, Tailwind CSS v4, shadcn/ui primitives, Lucide React, TypeScript 5.8+.
- **Backend / API:** Node.js with Hono (Web Standards, type-safe RPC client).
- **Database / ORM:** PostgreSQL 16 + Drizzle ORM.
- **Domain Engine:** Zero-dependency TypeScript modules in `packages/domain/` handling calendar computations, SARS filing seasons, pricing matrices, and PDF/XLSX streaming exports.

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

## 4. The 4-Tab Client Information Architecture (`/clients/:code`)

```
[PERSISTENT TOPBAR: Brand Mark "FD on Call" | 🔍 Search Cmd+K | Breadcrumbs]
─────────────────────────────────────────────────────────────────────────────
[SIDEBAR]                 [CLIENT RECORD SHOW VIEW (/clients/:code)]
🏠 Home (Dashboard)        Header: [← Clients]  Muse 1399  [MUS-875]  Company  Partner: Erik
📥 Inbox (Review Queue)   ─────────────────────────────────────────────────────────
⚙️ Settings               [📋 Statutory Profile] [📅 Deadlines] [🧮 12-Mo Estimate] [📁 Vault]
                          ┌─────────────────────────────────────────────────────────┐
PRACTICE DATA             │ TAB 1: OVERVIEW & STATUTORY PROFILE                     │
🏢 Clients (13)           │ • Financial Year-End (Feb*) & CIPC Incorporation Date   │
👥 People & Directors (18)│ • Turnover (R4M) & VAT Registration (Category B)        │
                          │ • SARS eFiling Profile (Firm Profile vs Client Profile) │
STATUTORY OPS             ├─────────────────────────────────────────────────────────┤
📅 Deadlines (4)          │ TAB 2: DEADLINES & TASKS                                │
🧮 New Quote Calculator   │ • Generated filing calendar with SA Holiday Rollback    │
🎯 Onboarding Pipeline (5)│ • Partner Review Gate on AFS, ITR14, and Payable IRP6   │
                          ├─────────────────────────────────────────────────────────┤
FOOTER USER               │ TAB 3: 12-MONTH FEE ESTIMATE & QUOTE                    │
[EW] Erik (Partner) ➔     │ • Dynamic Columns (Dec 2026 – Nov 2027) + March +6%     │
• Profile Settings        │ • Smoothed Monthly Retainer: R 3,840 excl. VAT          │
• Change Password         │ • Actions: [Download PDF] [Download Excel] [Save]       │
• Log out                 ├─────────────────────────────────────────────────────────┤
                          │ TAB 4: SHAREPOINT VAULT & SLAS                          │
                          │ • /Clients/MUS-875/Contracts/ (Dual-Signed Documenso)   │
                          │ • /Clients/MUS-875/Tax_Returns/ (IRP6 & ITR14 Packs)    │
                          └─────────────────────────────────────────────────────────┘
```

---

## 5. Epics & Functional Requirements (1–7)

1. **Epic 1: Project Scaffolding & Design System (`SPEC-01`)**
   - Workspace setup, Tailwind v4 tokens, shadcn UI integration, and dark/light mode synchronization.
2. **Epic 2: Shell, Collapsible Navigation & Command Palette (`SPEC-02`)**
   - Twenty CRM 240px/56px collapsible sidebar, 48px topbar, static `[FD on Call]` brand mark, user popover for Partner Erik, and `Cmd+K` command search modal.
3. **Epic 3: Clients Register & Filtering (`SPEC-03`)**
   - TanStack Table displaying 9 statutory columns (`Code`, `Client`, `Type`, `Responsible`, `Year End`, `VAT`, `Payroll`, `Services`, `Next Filing`), multi-column sorting, global search, and entity filters.
4. **Epic 4: Client Record Show & 4-Tab Layout (`SPEC-04`)**
   - Top breadcrumb navigation, Tab 1 Statutory Profile, Tab 2 Deadlines & Tasks, Tab 3 12-Month Fee Estimate matrix, and Tab 4 SharePoint Vault & SLAs.
5. **Epic 5: Statutory Deadlines Dashboard & Linear Kanban (`SPEC-05`)**
   - 4 KPI tiles (`Overdue Filings`, `Due in 7 Days`, `Due in 30 Days`, `Missing a Date`), 5-lane Kanban workflow (`Not Started` ➔ `In Progress` ➔ `Partner Review Gate` ➔ `Approved (Ready to Lodge)` ➔ `Submitted`), and SA holiday rollback tags (`↩`).
6. **Epic 6: Timekeeping, Billable Retainers & Xero Invoicing (`SPEC-06`)**
   - Retainer hour depletion tracking, overage flagging, and Xero API v2 `DRAFT` invoice synchronization with 15% South African VAT (`OUTPUT2`).
7. **Epic 7: Single Practice Workspace & Admin Settings (`SPEC-07`)**
   - Single tenant lock (`FD on Call`), pruned external SaaS links (pointing to `docs/spec-handbook.html`), Team RBAC, and Admin Panel for Practice Rules, Service Catalogue pricing matrix, and immutable SAICA Governance Log.

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

1. **Verify Domain Imports:** Always import statutory date calculation functions (Easter Computus, SA public holiday rollback) directly from `packages/domain/src/domain/dates.ts`. Never hardcode statutory deadlines or tax calculation formulas in UI components.
2. **Adhere to Twenty CRM Aesthetic:** Maintain hairline borders (`#262626` / `rgba(27,24,23,0.12)`), compact table rows, Lucide icons, and explicit dark/light color tokens.
3. **Run Test Suites:** Before finalizing any changes or extensions, run `npm test` across the workspace to ensure all 50+ domain and UI tests pass successfully.

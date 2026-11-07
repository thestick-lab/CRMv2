# FD on Call CRM — Product Requirements Document (PRD), Agile Specifications & Open Questions Register

**Document Reference:** `docs/02-PRD-AND-OPEN-QUESTIONS.md`  
**Target System:** FD on Call Practice CRM (`/home/hein/Projects/CRMv2`)  
**Information Architecture Spec:** `docs/05-UI-INFORMATION-ARCHITECTURE-AND-SCREEN-FLOWS.md` | Diagram `09`  
**Status:** Approved Technical, Functional & UI Navigation Specification  

---

## 1. Product Vision & Executive Overview

**FD on Call** is a boutique South African accounting, tax, advisory, and secretarial practice based in the Western Cape. The practice services 13 active client entities structured into 4 client groups across 9 staff members.

The practice's core operational bottlenecks stem from:
1. Managing statutory tax and company filing deadlines across disconnected spreadsheets (`"Client info - Dummy.xlsx"`), risking severe SARS non-compliance penalties and CIPC company deregistrations.
2. Generating client fee proposals manually from static spreadsheets (`"Pricing.xlsx"`), leading to billing discrepancies against Xero invoices and cashflow unpredictability.
3. Chasing clients for physical signatures on printed SLA engagement contracts, delaying client onboarding and compliance calendar setup.
4. Fragmented storage of client KYC files, signed contracts, and tax receipts across local drives and email threads.

The **FD on Call Practice CRM** unifies South African statutory intelligence, fee calculation engines, and Twenty CRM's extensible UX into a cohesive local application. It incorporates self-hosted open-source **Documenso** for digital engagement contracts, connects to **SharePoint** via Microsoft Graph API for automated client document vaulting, and synchronizes with **Xero** for compliant 15% South African VAT billing.

---

## 2. Agile User Personas

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                       PRACTICE PERSONAS OVERVIEW                                       │
├───────────────────────────┬───────────────────────────┬────────────────────────────────────────────────┤
│ Persona                   │ Role in Practice          │ Primary CRM Workflows & Authorizations         │
├───────────────────────────┼───────────────────────────┼────────────────────────────────────────────────┤
│ 1. Erik (Managing Partner)│ Practice Executive & Tax  │ • Final sign-off on AFS, ITR14, payable IRP6   │
│                           │ Director                  │ • Approves 12-mo fee quotes & countersigns SLA │
│                           │                           │ • Monitors firm-wide smoothed retainers & WIP  │
├───────────────────────────┼───────────────────────────┼────────────────────────────────────────────────┤
│ 2. Wouter (Partner)       │ Trust & Advisory Director │ • Signs off on ITR12T Trust returns & IRP6     │
│                           │                           │ • Reviews high-net-worth client advisory files │
├───────────────────────────┼───────────────────────────┼────────────────────────────────────────────────┤
│ 3. Nikita (Compliance Off)│ Statutory Compliance Lead │ • Monitors practice #deadlines calendar        │
│                           │                           │ • Submits non-gated returns (CIPC AR, BO, VAT) │
│                           │                           │ • Clears "Missing a date" profile blockers     │
├───────────────────────────┼───────────────────────────┼────────────────────────────────────────────────┤
│ 4. André (Senior Account) │ Financial Statements Lead │ • Prepares AFS workbooks & company tax packs   │
│                           │                           │ • Submits draft returns to Partner Review Queue│
├───────────────────────────┼───────────────────────────┼────────────────────────────────────────────────┤
│ 5. Mia (Accountant)       │ Payroll Administrator     │ • Runs monthly payroll & submits EMP201        │
│                           │                           │ • Prepares bi-annual EMP501 reconciliations    │
├───────────────────────────┼───────────────────────────┼────────────────────────────────────────────────┤
│ 6. Willem (Tax Specialist)│ Income Tax Specialist     │ • Prepares individual ITR12 returns            │
│                           │                           │ • Calculates bi-annual IRP6 provisional tax    │
├───────────────────────────┼───────────────────────────┼────────────────────────────────────────────────┤
│ 7. Hannes & Caroline      │ External Subcontractors   │ • Assigned isolated accounting tasks           │
│                           │                           │ • Restricted permissions (no firm billing view)│
└───────────────────────────┴───────────────────────────┴────────────────────────────────────────────────┘
```

---

## 3. Epics, User Stories & Acceptance Criteria

### Epic 1: Client Statutory Master Data & Blocker Signal Engine (`/clients/:code` · Tab 1)
*Mounted in the Client Record Show view under Tab 1 (Overview & Statutory Profile) with automated blocker signal flags.*

#### User Story 1.1: Record Client Statutory Attributes
> **As an** Accountant (André/Mia),  
> **I want to** record South African compliance attributes on a client company profile,  
> **So that** the statutory compliance calendar and fee calculations reflect legal reality.

- **Acceptance Criteria 1.1.1 (Valid Statutory Profile):**
  - **Given** a client company in Twenty CRM,
  - **When** the user edits the statutory drawer and specifies Financial Year-End Month (`2`), Incorporation Date (`2018-05-14`), Turnover (`R18,400,000`), VAT Category (`B`), Payroll active (`true`) with `14` employees, and eFiling Profile (`firm`),
  - **Then** the system updates the record and recalculates statutory deadlines without error.

#### User Story 1.2: Blocker Signal Generation
> **As a** Compliance Officer (Nikita),  
> **I want to** see immediate visual warning signals when a client profile has missing compliance data,  
> **So that** we do not miss statutory filing deadlines due to unrecorded dates.

- **Acceptance Criteria 1.2.1 (Missing Incorporation Date):**
  - **Given** a registered `Company` entity with no `incorporationDate`,
  - **When** the statutory schedule engine executes,
  - **Then** the `CIPC_AR` task is flagged with signal `Missing incorporation date`, its due date is rendered as `TBD`, and the practice dashboard increments the `Missing a date` KPI tile.
- **Acceptance Criteria 1.2.2 (Assumed February Year-End):**
  - **Given** a client whose financial year-end was flagged as assumed (`yearEndAssumed = true`),
  - **When** viewing the client profile and deadlines calendar,
  - **Then** a warning indicator `Feb* (Assumed)` is displayed prompting verification against CIPC disclosure certificates.

---

### Epic 2: Statutory Deadlines & Practice Calendar (`/deadlines` · Kanban & Table)
*Provide an interactive, centralized compliance dashboard with 4 metric tiles, dual Kanban/Table modes, and holiday-aware schedule calculation.*
#### User Story 2.1: Calendar Filtering & KPI Tiles
> **As a** Compliance Officer (Nikita) or Partner (Erik),  
> **I want to** filter statutory deadlines by Assignee, Service, and Horizon,  
> **So that** I can review upcoming practice deadlines and unblock overdue filings.

- **Acceptance Criteria 2.1.1 (Metric Tile Calculation):**
  - **Given** the practice database containing 13 clients and active tasks,
  - **When** the Deadlines view renders,
  - **Then** the 4 KPI tiles calculate:
    1. `Overdue`: Count of non-submitted tasks with `dueDate < today`.
    2. `Due in 7 days`: Count of non-submitted tasks due within `[today, today + 7 days]`.
    3. `Due in 30 days`: Count of non-submitted tasks due within `[today, today + 30 days]`.
    4. `Missing a date`: Count of statutory obligations missing master data attributes.

#### User Story 2.2: South African Holiday & Weekend Rollback
> **As an** Accountant,  
> **I want** statutory return due dates to automatically roll back to the preceding business day if they fall on a weekend or public holiday,  
> **So that** we never submit returns late per SARS rules.

- **Acceptance Criteria 2.2.1 (Weekend Rollback):**
  - **Given** a SARS `VAT201` filing due on the last day of April (e.g. 30 April falling on a Sunday),
  - **When** the due date is calculated via `businessDayOnOrBefore()`,
  - **Then** the deadline rolls backward to Friday 28 April (or preceding business day if Friday is a holiday).
- **Acceptance Criteria 2.2.2 (Easter Computus Holidays):**
  - **Given** a statutory filing window falling during Easter,
  - **When** due dates are evaluated,
  - **Then** the engine automatically identifies Good Friday and Family Day using the Easter Computus algorithm and excludes them as business days.
- **Acceptance Criteria 2.2.3 (Sunday Public Holiday Rollover):**
  - **Given** a South African public holiday falling on a Sunday (e.g., 27 April Freedom Day on Sunday),
  - **When** business days are evaluated,
  - **Then** Monday 28 April is automatically treated as an observed public holiday per §2(1) Public Holidays Act.

#### User Story 2.3: South African Public Holidays on Tasks & Calendar
> **As an** Accountant or Compliance Officer,  
> **I want** official South African public holidays visually rendered on the practice tasks calendar and compliance view,  
> **So that** staff understand why deadlines rolled back and can plan their filing sprints around practice closures.

- **Acceptance Criteria 2.3.1 (Visual Calendar Overlay):**
  - **Given** the Twenty CRM task calendar or monthly deadlines view,
  - **When** rendering calendar days,
  - **Then** official gazetted South African public holidays display as prominent informational badges on the date cell (e.g. `21 Mar · Human Rights Day`, `27 Apr · Freedom Day`, `16 Jun · Youth Day`, `09 Aug · National Women's Day`, `24 Sep · Heritage Day`, `16 Dec · Day of Reconciliation`).
- **Acceptance Criteria 2.3.2 (Rollback Explanation Tag):**
  - **Given** a statutory return whose nominal deadline falls on a holiday or weekend,
  - **When** the task card is displayed in the calendar or task drawer,
  - **Then** an explicit tooltip and pill indicates the rollback reason: *`Rollback from Sun 30 Apr → Fri 28 Apr (Freedom Day observed Mon 27th)`*.
- **Acceptance Criteria 2.3.3 (Annual Database Update):**
  - **Given** the annual gazetting of South African public holidays and variable election days,
  - **When** an administrator updates the versioned table `core.sa_public_holidays`,
  - **Then** all upcoming calendar displays and deadline rollback calculations update immediately without requiring code redeployments.
---

### Epic 3: Partner Review Gate Enforcement
*Enforce firm governance rules preventing tax and financial returns from being submitted without partner review.*

#### User Story 3.1: Partner Review Sign-Off Gate
> **As a** Managing Partner (Erik/Wouter),  
> **I want to** strictly control the submission of high-risk returns,  
> **So that** the practice directors are protected from unreviewed tax calculations.

- **Acceptance Criteria 3.1.1 (Always Review Gate):**
  - **Given** a task for `AFS`, `ITR14`, `ITR12`, `ITR12T`, or `EMP501` (`reviewRule = 'always'`),
  - **When** an accountant (André/Mia/Willem) attempts to update the task status from `'In review'` to `'Submitted'`,
  - **Then** the Twenty CRM server rejects the transition with error `PARTNER_REVIEW_REQUIRED` unless the current authenticated user is a verified Partner (`erik` or `wouter`).
- **Acceptance Criteria 3.1.2 (When-Payable IRP6 Gate):**
  - **Given** a provisional tax `IRP6` task with `irp6Outcome = 'payable'`,
  - **When** an accountant attempts to mark it `'Submitted'`,
  - **Then** the system requires a Partner sign-off; if `irp6Outcome = 'nil'`, the accountant can submit directly.
- **Acceptance Criteria 3.1.3 (Never Review Gate):**
  - **Given** a routine transactional return for `VAT201`, `EMP201`, `CIPC_AR`, or `BO` (`reviewRule = 'never'`),
  - **When** an assigned accountant completes the submission on eFiling or CIPC,
  - **Then** they can directly update the task status to `'Submitted'` and input the `sarsReference`.

---

### Epic 4: 12-Month Fee Estimator & Contract Exporter (`/quotes/new` & `/clients/:code` · Tab 3)
*Generate rolling 12-month client fee projections, annual price escalations, and client-ready PDF/XLSX quotes both for new prospect onboarding and existing client retainers.*
#### User Story 4.1: Dynamic Fee Projection Matrix
> **As a** Partner (Erik),  
> **I want to** build a 12-month fee projection across 21 standard service lines with March price escalation,  
> **So that** I can quote new clients a smoothed monthly debit order retainer.

- **Acceptance Criteria 4.1.1 (Followed vs Touched State):**
  - **Given** the 12-month estimation matrix (Columns C to P),
  - **When** client turnover and payroll values are loaded,
  - **Then** line items default to `followed` state with auto-calculated hours and fees; if a partner manually overrides an amount, the cell flags as `touched` and preserves the override.
- **Acceptance Criteria 4.1.2 (March Escalation & VAT):**
  - **Given** an engagement spanning past March,
  - **When** annual price escalation is enabled (e.g. 6%),
  - **Then** fees from March onward automatically escalate, and the Average Monthly Retainer is calculated both excluding and including 15% South African VAT.
- **Acceptance Criteria 4.1.3 (Client-Side PDF & Formula XLSX Export):**
  - **Given** an approved 12-month fee estimate,
  - **When** the user clicks "Download PDF Quote" or "Download Excel",
  - **Then** the browser streams an A4 Landscape PDF with signature blocks and an `.xlsx` workbook containing active `SUM` and `ROUND` formulas without server roundtrips.

---

### Epic 5: Lead Onboarding, Documenso E-Sign & SharePoint Vault (`SPEC-04`, `SPEC-05`)
*Automate the lead qualification, digital proposal signing, and client vault provisioning lifecycle.*

#### User Story 5.1: 5-Stage Kanban Onboarding Pipeline
> **As a** Partner,  
> **I want to** manage prospective clients on a Kanban board,  
> **So that** leads progress smoothly from initial inquiry to signed engagement.

- **Acceptance Criteria 5.1.1 (Kanban Stages):**
  - **Given** the Onboarding Pipeline view,
  - **When** leads are created,
  - **Then** they display across 5 distinct columns: `Lead` → `Discovery` → `Estimate Sent` → `KYC & eFiling Transfer` → `Active Client`.

#### User Story 5.2: Dual-Signature Documenso Contract Workflow
> **As a** Client Signatory and Managing Partner,  
> **I want to** digitally sign the SLA agreement online,  
> **So that** engagement contracts are legally binding under South African law without paper printing.

- **Acceptance Criteria 5.2.1 (Documenso Envelope Dispatch):**
  - **Given** a finalized proposal in `Estimate Sent` stage,
  - **When** the partner clicks "Send via Documenso",
  - **Then** the system generates an SLA PDF, calls Documenso REST API (`POST /api/v1/documents`), and registers the Client as Primary Signer and Partner as Countersigner.
- **Acceptance Criteria 5.2.2 (Webhook Auto-Conversion):**
  - **Given** a signed Documenso envelope,
  - **When** Documenso posts `DOCUMENT_COMPLETED` to `POST /api/webhooks/documenso`,
  - **Then** the webhook verifies the HMAC signature, updates `Opportunity.stage` to `'Active Client'`, provisions the `Company` record, materializes 12 months of statutory `ComplianceTask` records, and files the signed contract in SharePoint.

#### User Story 5.3: Automated SharePoint Client Vault Provisioning (`SPEC-05`)
> **As a** Compliance Officer,  
> **I want** a dedicated SharePoint directory hierarchy automatically created for each new client,  
> **So that** KYC, tax receipts, and signed SLAs are organized securely.

- **Acceptance Criteria 5.3.1 (Daemon Directory Creation):**
  - **Given** a new active client created in Twenty CRM,
  - **When** the client provisioning event fires,
  - **Then** the backend MSAL Node daemon calls Microsoft Graph API and creates:
    - `/Clients/{clientCode}/Contracts/`
    - `/Clients/{clientCode}/Tax_Returns/`
    - `/Clients/{clientCode}/Statutory_KYC/`
    - `/Clients/{clientCode}/Accounting_Invoices/`
  - and records the resulting `driveItem` IDs in Twenty CRM.

---

### Epic 6: Timekeeping, Billable Retainers & Xero Invoicing (`SPEC-06`)
*Track billable hours against retainer allowances and generate 15% South African VAT invoices in Xero.*

#### User Story 6.1: Retainer Hours Depletion & Overage Flagging
> **As an** Accountant and Partner,  
> **I want to** log time entries against client retainer allowances,  
> **So that** out-of-scope work is identified and billed.

- **Acceptance Criteria 6.1.1 (Retainer Depletion Math):**
  - **Given** a client with a 15.0-hour monthly SLA retainer,
  - **When** staff log 18.0 hours of work across compliance tasks in the billing period,
  - **Then** the system allocates 15.0 hours to the retainer and flags 3.0 hours as billable overage at the contracted hourly rate (e.g. R625/hr or R850/hr).

#### User Story 6.2: Xero Draft Invoice Generation with 15% SA VAT
> **As a** Partner (Erik),  
> **I want to** push monthly retainer invoices and out-of-scope billings directly into Xero,  
> **So that** invoices are ready for approval with exact South African tax codes.

- **Acceptance Criteria 6.2.1 (Xero Draft Invoicing):**
  - **Given** completed monthly billing calculations,
  - **When** the partner triggers Xero sync,
  - **Then** the system calls Xero API (`POST /api.xro/2.0/Invoices`) creating a `DRAFT` invoice (`Type: "ACCREC"`) with line items mapped to tax type `OUTPUT2` (15% SA VAT), client CIPC registration number, and 10-digit SARS VAT number on the header.

---

### Epic 7: Single Practice Workspace Lockdown & Persistent Navigation (`Layout.tsx`)
*Lock down the CRM to a single tenant dedicated to FD on Call, with static brand header, user profile popover, and practice handbook links.*
#### User Story 7.1: Single Practice Workspace Lockdown (`[FD on Call]`)
> **As a** Managing Partner,  
> **I want** the CRM permanently configured for a single workspace named "FD on Call",  
> **So that** staff and clients are never confused by multi-workspace dropdowns or SaaS tenant creation options.

- **Acceptance Criteria 7.1.1 (Multi-Workspace Disabled):**
  - **Given** Twenty CRM configuration,
  - **When** `IS_MULTIWORKSPACE_ENABLED=false` is set,
  - **Then** the multi-workspace switcher is hidden from the top-left navigation drawer and the workspace is hardcoded to `FD on Call`.
- **Acceptance Criteria 7.1.2 (Admin Panel Pruning):**
  - **Given** the Settings & Admin panel,
  - **When** accessed by staff or administrators,
  - **Then** generic multi-tenant billing, customer churn metrics, and workspace creation tools are pruned, leaving only Practice User Management, Review Gate Permissions, and Statutory Field Metadata.

#### User Story 7.2: twenty.com Documentation Link Removal
> **As an** Accountant,  
> **I want** help links and command menu shortcuts to open our internal practice procedures rather than generic twenty.com docs,  
> **So that** staff access South African statutory guides directly.

- **Acceptance Criteria 7.2.1 (Prune External Marketing Links):**
  - **Given** the Twenty CRM navigation drawer and Help menus,
  - **When** rendered,
  - **Then** all external links to `https://twenty.com/docs`, `https://twenty.com/discord`, and GitHub are removed and replaced with a direct link to the internal practice handbook (`docs/spec-handbook.html`).

#### User Story 7.3: Practice Rules & Fee Rates Admin Configuration
> **As a** Managing Partner (Erik/Wouter),  
> **I want to** manage practice hourly rates, turnover band thresholds, and statutory fee tables in an administrative Settings panel (`/settings/practice-rules`),  
> **So that** annual price escalations and Budget Speech tax changes take effect immediately across all calculations without code deployments.

- **Acceptance Criteria 7.3.1 (Dynamic Rate Updates):**
  - **Given** the practice configuration settings,
  - **When** a partner updates the standard hourly accounting rate (e.g. R625 to R675),
  - **Then** all unfinalized 12-month fee proposals, hourly AFS budgets, and out-of-scope billing calculations immediately reflect the new rate.
- **Acceptance Criteria 7.3.2 (De-coupled Daily Navigation):**
  - **Given** operational staff workflows,
  - **When** accountants use Twenty CRM daily,
  - **Then** practice rules and fee tables are enforced automatically by the server engine rather than requiring staff to consult a static `#rules` webpage.

---

## 4. Service Catalogue Matrix (10 Statutory Obligations)

| Service Code | Statutory Description | Governing Legislation | Review Gate | Practice Fee Structure | Statutory Due Date Rule |
|---|---|---|---|---|---|
| **`AFS`** | Annual Financial Statements compilation | Companies Act 71 of 2008 s30(1) | **`always`** (Partner sign-off) | Hourly @ R625/hr (12h, 16h, 24h, 28h by turnover band) | Exactly 6 months after FYE (business day on or before). |
| **`ITR14`** | Company Income Tax Return | Income Tax Act 58 of 1962 s66 | **`always`** (Partner sign-off) | Fixed: **R1,500** | Exactly 12 months after FYE (business day on or before). |
| **`ITR12`** | Individual Income Tax Return | Tax Administration Act 28 of 2011 s25 | **`always`** (Partner sign-off) | Fixed: **R1,050** | Per annual SARS Filing Season (Non-provisional: late Oct; Provisional: late Jan). |
| **`ITR12T`** | Trust Income Tax Return | Income Tax Act 58 of 1962 s66 | **`always`** (Partner sign-off) | Fixed: **R1,500** | Per annual SARS Trust Filing Season (late Jan). |
| **`IRP6`** | Provisional Tax Return (1st & 2nd payments) | Income Tax Act 4th Schedule s19 | **`when-payable`** (Nil bypasses; Payable reviewed) | Fixed: **R575** (Nil) / **R650** (Payable) | 1st period = end of Month 6 of FY; 2nd period = FYE (business day on or before). Optional 3rd top-up ad-hoc. |
| **`VAT201`** | Value Added Tax Declaration | Value-Added Tax Act 89 of 1991 s28(1) | **`never`** (Direct submission) | Fixed: **R545** per return | Last business day of following month per VAT Category (A, B, C, D, E, F). |
| **`EMP201`** | Monthly PAYE, UIF & SDL Declaration | Income Tax Act 4th Schedule s14 | **`never`** (Direct submission) | Fixed: **R495** per month | On or before 7th of following month (business day on or before). |
| **`EMP501`** | Employer Bi-Annual Reconciliation | Income Tax Act 4th Schedule s14(3) | **`always`** (Partner sign-off) | Tiered: **R1,900** (1–10 staff), **R2,500** (11–30 staff), **R3,250** (31+ staff) | Interim (Mar–Aug) due 31 Oct; Annual (Mar–Feb) due 31 May (business day on or before). |
| **`CIPC_AR`** | CIPC Annual Return & FAS | Companies Act 71 of 2008 s33 | **`never`** (Direct submission) | Practice Fee: **R525** + CIPC Fee: **R100 / R450 / R2,000 / R3,000** (VAT exempt) | Anniversary of incorporation date + 30 business days (`addBusinessDays`). |
| **`BO`** | Beneficial Ownership Register | General Laws (Anti-Money Laundering) Act 22 of 2022 | **`never`** (Direct submission) | Fixed: **R2,000** | Annual filing or within 10 business days of shareholding/directorship change. |

---

## 5. Open Questions Register

### Track 1: Autonomous Research & Regulatory Citations (Resolved)
- **Q1.1 (CIPC Beneficial Ownership Penalty Regime):** CIPC enforcement guidelines confirm non-filing of Beneficial Ownership triggers administrative compliance notices and blocks CIPC Annual Return processing. *Resolution: BO is mandatory for all Co/CC entities.*
- **Q1.2 (SARS Sunday Public Holiday Rollover):** Confirmed per Section 2(1) Public Holidays Act No. 36 of 1994: any public holiday falling on a Sunday rolls over to the consecutive Monday. SARS electronic eFiling deadlines falling on holidays or weekends roll back to the preceding business day per SARS Interpretation Note 90.

### Track 2: Practice Business Decisions (Pending Partner Erik & Wouter Sign-Off)
- [ ] **Q2.1: Pricing Discrepancy Reconciliation**  
  Confirm whether Xero Item List (27 Oct 2026) or Pricing schedule wins for:
  - `EMP201`: R495 vs R545
  - `EMP501`: Tiered (R1,900 / R2,500 / R3,250) vs flat R1,500
  - `ITR12`: R1,050 vs R1,250
  - `CIPC_AR`: R525 practice fee vs R545
- [ ] **Q2.2: Large Payroll Tier Scaling (>50 Staff)**  
  Confirm practice formula when a client's payroll exceeds 50 employees (e.g. +0.25 hrs per 25 additional employees vs. custom partner quote).
- [ ] **Q2.3: 9 Assumed February Year-Ends**  
  Confirm legal financial year-ends for companies currently marked assumed (`*`): `ALB-207`, `AXE-460`, `BLA-465`, `KHE-615`, `MUS-875`, `TOP-435`, and trusts (`BEN-585`, `CLU-614`, `THE-153`).
- [ ] **Q2.4: Missing Incorporation Dates & Turnover**  
  Provide missing incorporation dates for companies to resolve CIPC AR deadline blockers, and confirm annual turnover for unbanded clients (`CLU-614` and `LES-841`).
- [ ] **Q2.5: Senior Tax Specialist Sign-Off Authority**  
  Confirm whether Senior Tax Specialists (Nikita, Willem) are authorized to sign off on specific returns (e.g., nil IRP6, ITR12), or if review approval (`'In review'` → `'Submitted'`) is strictly restricted to Partners (Erik, Wouter).

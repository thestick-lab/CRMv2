# FD on Call CRM — Technical Architecture, Database Specification & API Plugin Topology

**Document Reference:** `docs/03-ARCHITECTURE-AND-DATABASE-SPEC.md`  
**Target System:** FD on Call Practice Ledger CRM (`/home/hein/Projects/CRMv2`)  
**Status:** Current implementation recorded 2026-11-10; §1–§5 are the planned production architecture, not deployed state.  

---

## Current implementation (2026-11-10)

The shipped product is a single-page React application. Everything a practitioner sees — clients, tasks, quotes, invoices, time, permissions, the governance trail — is read from and written to one in-browser practice store. There is **no application database**: no PostgreSQL instance is deployed, no practice-data schema or migration exists (the only Drizzle schema is the auth tables), and §3's DDL is a blueprint rather than a description of a live schema.

### Runtime topology

| Layer | Shipped implementation |
|---|---|
| UI | `apps/web` — React 19, Vite 7, Tailwind v4. No router library: the active screen is an in-memory `ViewKey` in `apps/web/src/App.tsx` (`dashboard`, `analytics`, `inbox`, `clients`, `client`, `team`, `deadlines`, `sales-pipeline`, `time`, `settings`, `govlog`). Deep links are navigation intents held in component state, not URLs. |
| Practice data | One `PracticeStoreContext` (`apps/web/src/context/PracticeStoreContext.tsx`), a `useReducer` store persisted on every change to `localStorage` under `crmv2_practice_state`. |
| Domain logic | `packages/domain` (npm name `fdoncall-practice`), imported as `fdoncall-practice/domain/*`: 7 rule modules (`catalogue`, `dates`, `estimate`, `pricing`, `rules`, `sars`, `types`) and 6 export modules (`logo`, `pdf`, `sheet`, `xlsx`, `zip`, `audit-pdf`). 52 domain unit tests. |
| Server | Exactly one component: `apps/web/functions/api/[[route]].ts`, a Cloudflare Pages Function (Hono + better-auth + Drizzle) bound to D1 database `crmv2-auth` via binding `DB` in `apps/web/wrangler.toml`. It only serves `/api/auth/*`. |
| Tests | 464 web tests across 48 files, plus the 52 domain tests; `npm test`, `npm run typecheck`, `npm run build` at the repo root. |

The only network call in the client is `POST /api/auth/sign-in/email` from `src/lib/auth-client.ts`, attempted only after the local seeded-credential check fails.

### Shipped practice data model

The store's state shape is declared in `PracticeStoreContext.tsx`; the statutory record types live in `packages/domain/src/domain/types.ts`.

| Type | Key fields | Notes |
|---|---|---|
| `Client` | `code`, `name`, `entityType`, `groupId`, `email`, `phone`, `location`, `timezone`, `contacts[]`, `services[]`, statutory profile (`vatCategory`, `yearEndMonth`, `yearEndAssumed`, `efilingProfile`, `payroll`, `incorporationDate`, `turnover`, `last*Afs/IncomeTax/AnnualReturnYear`), `staffId`, `subcontractorId`, `status` | `services` is the explicit statutory scope; absent means derive it from the client's attributes. `contacts` are directors/contact people owned by the record. `regOrIdNumber`/`taxNumber` are withheld in the prototype. |
| `ClientContact` | `id`, `name`, `role`, `email?`, `phone?`, `notes?` | Backfilled on load from the seeded directors when a persisted client has no `contacts` key. |
| `Task` | `clientCode`, `service`, `period`, `part`, `due`, `dueNote`, `estimated`, `likelyLate`, `info`, `missing`, `statutory`, `review`, `feeLabel`, `assigneeId` | Statutory obligations are derived from the client record + engine; the store persists only status/approval metadata in `taskStatusOverrides`. |
| `TaskStatusOverride` | `status`, `sarsReference`, `partnerSignOff`, `submissionDate`, `approvedBy`, `service`, `clientName`, `period`, `irp6Outcome` | The only persisted task state; keyed by derived task id. |
| `AdHocTask` | `clientCode`, `description`, `assigneeId`, `dueDate`, `status`, `blockedReason` | Practice-created work flowing through the same six deadlines lanes. |
| `Quote` | `number` (`Q-<seq>`), `clientCode?`, `prospect?`, `estimateInput`, `monthlyRetainerHours`, `adHocHourlyRate`, `vatInclusive`, `paymentTerms`, `expiryDate`, `stage`, `ownerStaffId`, `nextStep`, `documensoEnvelopeId`, `signedBy`, `signedAt`, `stageChangedAt` | `estimateInput` is authoritative; the fee schedule is recomputed by `computeEstimate`. |
| `QuoteProspect` | `name`, `contactPerson`, `entityType`, `turnover`, `payroll`, `employeeCount`, `vatCategory`, `yearEndMonth`, `incorporationDate`, `staffId` | Unregistered prospect captured before the quote converts to a client. |
| `Invoice` | `number` (`INV-<seq>`), `quoteId`, `clientCode`, `lineItems[]`, `taxRate`, `subtotal`, `vat`, `total`, `status` (`Draft`/`Sent`/`Paid`), `billingMonth`, `issueDate`, `dueDate`, `paymentTerms`, `paymentMethods`, `xeroSync` | `Overdue` is derived at render time and never stored. `billingMonth` (`YYYY-MM`) is independent of `issueDate` so a month can never be billed twice. |
| `InvoiceLine` | `description`, `quantity`, `unitAmount`, `accountCode`, `taxType` (`OUTPUT2`/`NONE`), `lineAmount` | `NONE` only for disbursements paid to CIPC on the client's behalf. |
| `TimeEntry` | `clientCode`, `serviceCode`, `taskId`, `staffUserId`, `startedAt`, `endedAt`, `durationMinutes`, `roundedMinutes`, `billable`, `description`, `invoiceId` | `roundedMinutes` is the nearest 0.25 h with a 15-minute floor. |
| `PermissionState` | `matrix` (role → row id → cell), `lastEditedBy`, `lastEditedAt` | Only overrides are stored; the default matrix in `src/lib/permissions.ts` is the fallback. |
| `ActivityEvent` | `type`, `actorName`, `actorInitials`, `tint`, `text`, `subline`, `at`, `taskId?`, `quoteId?`, `invoiceId?` | Feed source for Home's Team activity card and the Governance Log. |
| `PracticeSequences` | `quote`, `invoice` | Human-number counters behind `Q-n` and `INV-n`. |
| `IntegrationConfig` | `documensoBaseUrl`, `documensoApiKey`, `xeroClientId`, `xeroClientSecret`, `xeroTenantId` | Local placeholders; the simulated adapters ignore them. |
| `PracticeUser` / `PracticeContract` | `id`, `name`, `role`, `email`, `kind`, `contract` (`startDate`, `contractType`, `hourlyRate`, `phone`) | Signed-in user. `staffProfiles` holds the same contract terms plus internal `notes` for staff who are not the signed-in user. |
| `PracticeRates` | `standardHourlyRate`, `marchEscalationPct`, `serviceFees`, `updatedBy`, `updatedAt` | Quote/estimate defaults. |
| `AiApiKeys` | `anthropic`, `openai`, `gemini` | Stored beside integration credentials; unused by any network adapter. |

Also persisted: `savedEstimates` (client code → `EstimateInput` from quote conversion) and `division` (`fd-on-call` / `accountant-on-call`).

### Persistence contract: what a load does to stored state

`loadPracticeState()` reads `crmv2_practice_state`, parses it, and passes it to `mergePracticeState()`. The merge is **idempotent** — running it twice produces the same state — and follows these rules:

1. **Defaults fill gaps, persisted values win.** Missing top-level fields fall back to `getInitialPracticeState()`. The `rates`/`serviceFees`, `permissions` and `integrationConfig` maps merge one level over their defaults. Individual array records are *not* field-merged: a persisted client, quote, invoice or time entry is used as stored, except for the explicit migrations below.
2. **Legacy leads become quotes.** A stored `leads[]` array is mapped through `LEAD_STAGE_TO_QUOTE_STAGE` by the `MIGRATE_LEADS` reducer action, numbered after the persisted quote sequence, then dropped from state. A state persisted before quotes existed starts with `quotes: []` so its leads are the only quote source; a pristine state keeps the seeded prospects.
3. **Workflow statuses are normalised once.** Every `taskStatusOverrides` entry passes through `normalizeWorkflowStatus()` (`In review` → `Partner Review Gate`, `Done` → `Submitted`, `Not started` → `Not Started`, and so on) so all readers compare against the six lanes rather than a historical string.
4. **`Client.contacts` is backfilled** from the seeded directors matching the client code. A record that already has a `contacts` array — even an empty one — keeps it as the source of truth.
5. **`currentUser.contract` defaults from `kind`** (`subcontractor` or `employee`) without overwriting terms already on record.
6. **`Quote.stageChangedAt` defaults to `updatedAt`, then `createdAt`,** so stage ageing never renders `undefined`. The quote sequence is recomputed as the maximum of the persisted sequence and the trailing number of every stored quote.
7. **`Invoice.billingMonth` defaults to the first seven characters of `issueDate`,** so pre-`billingMonth` invoices still block a duplicate month.
8. **Failure is non-fatal.** A parse/read error logs and falls back to the seeded defaults; a write error logs and leaves the session state intact.

Consequence: clearing `localStorage` resets the practice to its seed data, and two browsers on the same machine do not share practice state. There is no server-side practice data to reconcile.

### Auth & security (shipped)

Authentication is the one server-side concern. `apps/web/functions/api/[[route]].ts` mounts better-auth over a Drizzle/D1 SQLite database (`binding = "DB"`, `database_name = "crmv2-auth"`, schema in `apps/web/src/db/auth-schema.ts`) and serves only `/api/auth/*`.

- **Seeded accounts.** Ten accounts (`SEEDED_STAFF_ACCOUNTS`) cover the six roles — two Partners plus Compliance Officer, Accountant, three Team members, two Subcontractors and Support Tech. They are created server-side by `ensureSeeded()` through `auth.api.signUpEmail()` (never through the HTTP routes) when the `user` table is empty, all with the demo password `FDonCall2026!`.
- **Login path.** `src/lib/auth-client.ts` first matches the entered credentials against the seeded list locally; only a miss falls through to `POST /api/auth/sign-in/email`. On success the returned `role`, `staffId` and `kind` seed `currentUser`.
- **Privilege-field guard.** `role`, `staffId` and `kind` are better-auth `additionalFields`, so a request body could otherwise set them. `apps/web/functions/api/auth-guard.ts` closes that hole before `auth.handler` sees the request:
  - every `/sign-up` path is refused with `403` (`Self-service sign-up is disabled for this practice.`) — account creation is a seeded/admin action, not a product path;
  - for JSON `POST` bodies on other auth routes, `role`, `staffId` and `kind` are stripped before forwarding (the request is rebuilt without `content-length`); non-POST, non-JSON and unparseable bodies are forwarded unchanged;
  - `sanitizeAuthRequest()` is pure and unit-tested independently of the Cloudflare runtime.
- **Why.** Without the guard, any caller reaching the deployed function could `POST /api/auth/sign-up/email` with `{"role":"Partner"}` and be granted the highest privileges in the permission matrix. The guard makes the seeded/admin path the only way a privileged account can exist.

Remaining hardening, all open:

- Declare the three privilege fields as non-input `additionalFields` so the schema itself refuses them, rather than relying on the request guard.
- Make account creation an admin-only server action with an audit entry, replacing both self-service sign-up and the demo-password seed.
- Practice data is not protected at all beyond the browser: `localStorage` is readable by any script on the origin and is unaffected by the auth session. A production deployment must move practice state behind the authenticated API before multiple users can share it.
- The demo password is compiled into the client bundle. It must not survive the move to real accounts.

### Integration boundary (shipped)

External systems are **seams, not connections**. `apps/web/src/lib/integrations/documenso.ts` and `xero.ts` build the exact request shapes the live services take, but no network call is made anywhere in the app; the payload builders are pure and the "sync" functions return clearly synthetic identifiers.

**Documenso (`documenso.ts`).** The live adapter is documented in-file as `POST {baseUrl}/api/documents`, adding two recipients (`role: 'SIGNER'`, `signingOrder: 1` = client, `2` = practice counter-signer) and sending. The simulated adapter returns the same envelope shape:

```ts
interface DocumensoEnvelope {
  envelopeId: string;        // `env-` + 12 synthetic characters
  recipients: { name: string; email: string; role: 'SIGNER'; signingOrder: number }[];
  sentAt: ISODate;
}
```

`createDocumensoEnvelope(quote, context)` signs a fee quote; `createDocumensoSlaEnvelope(client, context)` signs a client's master services agreement; `documensoDocumentForQuote`/`documensoDocumentForSla` produce the displayed title and `.pdf` document name; `withRecipientEmail` records a corrected signatory address. The quote's `documensoEnvelopeId` is what unlocks the `Signed` stage; a board move with no recorded envelope is refused.

**Xero (`xero.ts`).** `buildXeroDraftInvoicePayload(invoice, client)` returns the body `POST https://api.xero.com/api.xro/2.0/Invoices` accepts:

```ts
{
  Invoices: [{
    Type: 'ACCREC',
    Status: 'DRAFT',
    LineAmountTypes: 'Exclusive',
    Contact: { Name: string },
    LineItems: [{ Description, Quantity, UnitAmount, AccountCode, TaxType: 'OUTPUT2' | 'NONE' }],
    Date: ISODate,
    DueDate: ISODate,
    Reference: string,   // invoice number
  }],
}
```

Line amounts are converted with `cents()`; account codes come from the line, else `310` for `NONE` disbursements and `200` for revenue (estimate groups map to `200`/`210`/`220`/`230`/`240`). `summariseXeroDraft` computes VAT the way Xero does — rounded to the cent per taxable line, not on the aggregate — matching the invoice document, `reconcileInvoice` and the retainer overage maths. `simulateXeroSync` returns a synthetic sync result; `buildXeroEstimateDraftPayload` produces the monthly-retainer draft preview. Invoices are always `DRAFT` so a partner reviews before dispatch.

**Credentials.** `integrationConfig` holds `documensoBaseUrl`, `documensoApiKey`, `xeroClientId`, `xeroClientSecret` and `xeroTenantId`. They are local-only placeholders persisted in `localStorage`; the simulated adapters ignore them. Editing them configures nothing.

Open: neither live instance is wired; the Documenso webhook and inbound REST endpoints in §4 are unimplemented; there is no token storage, retry, or sync reconciliation beyond the `xeroSync` status field.

---

## 1. System Topology & Monorepo Architecture (planned production architecture)

> **Status: planned, not deployed.** The Twenty monorepo described below is the target production base. The shipped application runs entirely inside `apps/web` and does not import it.

The practice CRM is *intended* to be built on the official **Twenty CRM** monorepo located in `/home/hein/Projects/CRM/twenty/` (planned target, separate from `/home/hein/Projects/CRMv2`). The target runs an Nx-managed monorepo with Yarn 4.18.1 and Node `v26.13.0`:

```
/home/hein/Projects/CRM/
├── twenty/                                 # Target CRM base (planned production; not imported by CRMv2)
│   ├── packages/
│   │   ├── twenty-server/                  # NestJS API, PostgreSQL TypeORM, Redis/BullMQ, GraphQL Yoga
│   │   ├── twenty-front/                   # React 19 Client, Jotai, Linaria, Vite 8, Apollo Client
│   │   ├── twenty-ui/                      # Design system, theme tokens, layout primitives
│   │   └── twenty-shared/                  # Shared types, constants, and pure domain rules
│   └── packages/twenty-docker/             # Docker Compose dev infrastructure (Postgres 16 + Redis 7)
├── Client_CRM/                             # Read-Only Reference Specification & Domain Source
├── assets/                                 # FD on Call brand assets extracted from fdoncall.co.za
├── docs/                                   # Specifications, Agile PRD, and Diagram Suite
│   └── diagrams/                           # Standalone HTML+SVG architecture and flow diagrams
└── _archive/                               # Deprecated standalone prototypes (isolated from runtime)
```

The shipped repo is `/home/hein/Projects/CRMv2` — an npm workspace whose only relevant packages are `apps/web` and `packages/domain`.

---

## 2. API Plugin & Connector Architecture (planned production architecture)

> **Status: planned, not deployed.** No plugin connector exists in the shipped app; the simulated seams that the UI does call are described under "Integration boundary" above.

Twenty CRM acts as the unified operational hub, communicating with four external services via dedicated plugin connectors:

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                               TWENTY CRM API PLUGIN & CONNECTOR TOPOLOGY                               │
├────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                        │
│                                      ┌────────────────────────┐                                        │
│                                      │   Twenty Front (Web)   │                                        │
│                                      │   React 19 / Linaria   │                                        │
│                                      │   http://localhost:3001│                                        │
│                                      └───────────┬────────────┘                                        │
│                                                  │ GraphQL / REST                                      │
│                                                  ▼                                                     │
│                                      ┌────────────────────────┐                                        │
│                                      │  Twenty Server (NestJS)│                                        │
│                                      │  http://localhost:3000 │                                        │
│                                      └───────────┬────────────┘                                        │
│                                                  │                                                     │
│             ┌─────────────────────────┬──────────┴──────────┬─────────────────────────┐                │
│             │                         │                     │                         │                │
│             ▼                         ▼                     ▼                         ▼                │
│   ┌───────────────────┐     ┌───────────────────┐ ┌───────────────────┐     ┌───────────────────┐      │
│   │  Documenso Plugin │     │  MS Graph Plugin  │ │    Xero Plugin    │     │  Paystack Plugin  │      │
│   │  (E-Signatures)   │     │  (SharePoint)     │ │    (Accounting)   │     │  (Instant Pay)    │      │
│   └─────────┬─────────┘     └─────────┬─────────┘ └─────────┬─────────┘     └─────────┬─────────┘      │
│             │ REST API /              │ Graph API           │ OAuth2 REST             │ REST API       │
│             │ Webhook                 │ (App-Only)          │ (15% SA VAT)            │ (Capitec/Card) │
│             ▼                         ▼                     ▼                         ▼                │
│   ┌───────────────────┐     ┌───────────────────┐ ┌───────────────────┐     ┌───────────────────┐      │
│   │Documenso Container│     │Microsoft 365 M365 │ │   Xero SA API     │     │   Paystack API    │      │
│   │AGPL-3.0 Self-Host │     │SharePoint Tenant  │ │   Tax: OUTPUT2    │     │   Payment Gateway │      │
│   │PostgreSQL DB      │     │Client Vaults      │ │   Invoices (DRAFT)│     │   Ozow / EFT      │      │
│   └───────────────────┘     └───────────────────┘ └───────────────────┘     └───────────────────┘      │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 2.1 Documenso E-Sign Connector (`SPEC-04`)
- **Protocol:** Outbound REST API (`POST /api/v1/documents`) and Inbound Webhook (`POST /api/webhooks/documenso`).
- **Signature Security:** Webhooks authenticated via HMAC signature header (`X-Documenso-Signature`).
- **Dual-Signature Workflow:** Registers Client Signatory as recipient 1 and Managing Partner (Erik/Wouter) as recipient 2.
- **Auto-Activation:** On `DOCUMENT_COMPLETED`, updates `Opportunity.stage` to `'Active Client'`, creates the legal `Company` record, and materializes the client's 12-month `ComplianceTask` schedule.

### 2.2 Microsoft Graph SharePoint Vault Connector (`SPEC-05`)
- **Authentication:** MSAL Node daemon using Entra ID Client Credentials Grant (App-Only token).
- **Perimeter Isolation:** Outside clients never receive direct SharePoint or Entra ID accounts. All uploads/downloads route through Twenty server daemons.
- **Directory Hierarchy:**
  - `/Clients/{clientCode}/Contracts/` (Signed Documenso engagement agreements).
  - `/Clients/{clientCode}/Tax_Returns/` (Signed AFS, ITR14, ITR12, IRP6 receipts).
  - `/Clients/{clientCode}/Statutory_KYC/` (CIPC COR14.3 certificates, FICA IDs, Beneficial Ownership).
  - `/Clients/{clientCode}/Accounting_Invoices/` (Monthly Xero billing PDF copies).

### 2.3 Xero Accounting Connector (`SPEC-06`)
- **Authentication:** OAuth2 Authorization Code Grant with offline access and Redis-cached refresh tokens.
- **Tax Mapping:** Strictly South African 15.0% Standard VAT (`TaxType: "OUTPUT2"`). Zero-rated items map to `NONE`.
- **Payload Safety:** Invoices created in `DRAFT` status (`Status: "DRAFT"`), requiring Partner review before client dispatch.

### 2.4 Paystack Instant Payment Connector
- **Use Case:** Generates instant checkout URLs for one-off ad-hoc tax filings or initial engagement deposits.
- **Payment Rails:** Supports South African localized payment rails: Ozow Instant EFT, Capitec Pay, Visa, and Mastercard.

---

## 3. Physical Database Schema & Object Extensions (planned production schema — not deployed)

> **Status: planned production schema, future work.** No PostgreSQL database exists today. The DDL below is retained as the target schema for the Twenty deployment: it is not executed by any migration and no table described here is live. The shipped data model is the localStorage-backed state documented at the top of this document.

In the planned deployment, Twenty CRM stores data in PostgreSQL 16 under the `core` schema. The extensions below add South African statutory attributes to Twenty's standard objects and introduce commercial tables for contracts and timekeeping. Nothing in this section exists in the shipped app.

### 3.1 Company Object Extensions (`core.company`)

```sql
-- Core Twenty 'company' table extended with South African statutory attributes
ALTER TABLE core.company
  ADD COLUMN client_code VARCHAR(32) UNIQUE,
  ADD COLUMN entity_type VARCHAR(32) NOT NULL DEFAULT 'Company' CHECK (entity_type IN ('Company', 'Close corporation', 'Trust', 'Individual')),
  ADD COLUMN client_group_id VARCHAR(64),
  ADD COLUMN year_end_month INTEGER CHECK (year_end_month BETWEEN 1 AND 12),
  ADD COLUMN year_end_assumed BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN incorporation_date DATE,
  ADD COLUMN turnover NUMERIC(15, 2) DEFAULT 0.00,
  ADD COLUMN turnover_year INTEGER,
  ADD COLUMN turnover_source VARCHAR(32) CHECK (turnover_source IN ('Xero', 'AFS', 'Tax return', 'Client', 'Other')),
  ADD COLUMN vat_category VARCHAR(8) CHECK (vat_category IN ('A', 'B', 'C', 'D', 'E', 'F')),
  ADD COLUMN vat_registered_on DATE,
  ADD COLUMN payroll_active BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN payroll_from DATE,
  ADD COLUMN employee_count INTEGER DEFAULT 0,
  ADD COLUMN efiling_profile VARCHAR(16) NOT NULL DEFAULT 'firm' CHECK (efiling_profile IN ('firm', 'client')),
  ADD COLUMN efiling_transferred_on DATE,
  ADD COLUMN service_overrides JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN xero_contact_id VARCHAR(64),
  ADD COLUMN sharepoint_vault_id VARCHAR(128);

CREATE INDEX idx_company_client_code ON core.company(client_code);
CREATE INDEX idx_company_fye ON core.company(year_end_month);
```

### 3.2 Person Object Extensions (`core.person`)

```sql
-- Core Twenty 'person' table extended for South African Directors & Taxpayers
ALTER TABLE core.person
  ADD COLUMN id_number_enc BYTEA,          -- AES-256 encrypted South African ID Number (POPIA compliance)
  ADD COLUMN tax_number_enc BYTEA,        -- AES-256 encrypted SARS Income Tax Reference Number
  ADD COLUMN is_provisional_taxpayer BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN role_in_company VARCHAR(64) DEFAULT 'Director'; -- Director, Trustee, Public Officer, Billing Contact
```

### 3.3 Task Object Extensions (`core.task` for Compliance Deadlines)

```sql
-- Core Twenty 'task' table extended for Statutory Obligations
ALTER TABLE core.task
  ADD COLUMN service_code VARCHAR(16) CHECK (service_code IN ('AFS', 'ITR14', 'ITR12', 'ITR12T', 'IRP6', 'VAT201', 'EMP201', 'EMP501', 'CIPC_AR', 'BO', 'AD_HOC')),
  ADD COLUMN filing_period VARCHAR(32),   -- e.g. '2026-P1', '2026-02', '2025/2026'
  ADD COLUMN review_rule VARCHAR(16) NOT NULL DEFAULT 'never' CHECK (review_rule IN ('always', 'when-payable', 'never')),
  ADD COLUMN irp6_outcome VARCHAR(16) NOT NULL DEFAULT 'unknown' CHECK (irp6_outcome IN ('unknown', 'nil', 'payable')),
  ADD COLUMN reviewed_by_partner_id UUID REFERENCES core."user"(id),
  ADD COLUMN reviewed_at TIMESTAMPTZ,
  ADD COLUMN sars_submission_reference VARCHAR(64),
  ADD COLUMN blocker_signal VARCHAR(64);  -- 'Missing incorporation date', 'Missing turnover', etc.

CREATE INDEX idx_task_service_due ON core.task(service_code, "dueAt");
CREATE INDEX idx_task_review_rule ON core.task(review_rule);
```

### 3.4 Contracts Table (`SPEC-04` Documenso Integration)

```sql
CREATE TYPE contract_status AS ENUM (
  'draft', 'sent_to_client', 'client_signed', 'countersigned', 'active', 'terminated'
);

CREATE TABLE core.contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES core.company(id) ON DELETE CASCADE,
  opportunity_id UUID REFERENCES core.opportunity(id),
  contract_number VARCHAR(64) UNIQUE NOT NULL,
  engagement_type VARCHAR(32) NOT NULL DEFAULT 'Accounting & Tax SLA',
  monthly_retainer_zar NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  monthly_retainer_hours NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
  ad_hoc_hourly_rate_zar NUMERIC(10, 2) NOT NULL DEFAULT 625.00,
  documenso_document_id VARCHAR(128),
  status contract_status NOT NULL DEFAULT 'draft',
  client_signer_email VARCHAR(255) NOT NULL,
  client_signer_name VARCHAR(128) NOT NULL,
  client_signed_at TIMESTAMPTZ,
  partner_countersigned_at TIMESTAMPTZ,
  sharepoint_contract_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 3.5 Time Entries & Billable Work Table (`SPEC-06` Timekeeping)

```sql
CREATE TABLE core.time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES core.company(id) ON DELETE CASCADE,
  task_id UUID REFERENCES core.task(id) ON DELETE SET NULL,
  staff_user_id UUID NOT NULL REFERENCES core."user"(id),
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
  description TEXT NOT NULL,
  is_covered_by_retainer BOOLEAN NOT NULL DEFAULT TRUE,
  hourly_rate_zar NUMERIC(10, 2) NOT NULL DEFAULT 625.00,
  xero_invoice_id VARCHAR(128),
  billed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_time_entries_company_date ON core.time_entries(company_id, created_at);
```

### 3.6 Tenant Storage Configuration (`SPEC-05` SharePoint Vault)

```sql
CREATE TABLE core.tenant_storage_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID UNIQUE NOT NULL REFERENCES core.company(id) ON DELETE CASCADE,
  sharepoint_site_id VARCHAR(128) NOT NULL,
  sharepoint_drive_id VARCHAR(128) NOT NULL,
  root_folder_drive_item_id VARCHAR(128) NOT NULL,
  contracts_drive_item_id VARCHAR(128),
  tax_returns_drive_item_id VARCHAR(128),
  kyc_drive_item_id VARCHAR(128),
  invoices_drive_item_id VARCHAR(128),
  provisioned_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 3.7 South African Public Holidays Table (Annual Dynamic Engine)

```sql
CREATE TABLE core.sa_public_holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  holiday_date DATE UNIQUE NOT NULL,
  name VARCHAR(128) NOT NULL,
  is_variable_easter BOOLEAN NOT NULL DEFAULT FALSE,
  is_sunday_rollover BOOLEAN NOT NULL DEFAULT FALSE,
  gazette_reference VARCHAR(128),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sa_holidays_date ON core.sa_public_holidays(holiday_date);
```
### 3.8 Statutory Rules & Fee Configuration Tables (core.sa_statutory_rules)

```sql
CREATE TABLE core.sa_statutory_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_code VARCHAR(16) UNIQUE NOT NULL,
  service_name VARCHAR(128) NOT NULL,
  governing_law VARCHAR(128) NOT NULL,
  review_rule VARCHAR(16) NOT NULL DEFAULT 'never' CHECK (review_rule IN ('always', 'when-payable', 'never')),
  is_hourly BOOLEAN NOT NULL DEFAULT FALSE,
  default_hourly_rate_zar NUMERIC(10, 2) DEFAULT 625.00,
  fixed_fee_zar NUMERIC(10, 2),
  turnover_hours_band JSONB, -- {"under_1m": 12, "1m_to_10m": 16, "10m_to_25m": 24, "over_25m": 28}
  disbursement_fee_zar NUMERIC(10, 2) DEFAULT 0.00,
  is_disbursement_vat_exempt BOOLEAN NOT NULL DEFAULT FALSE,
  xero_item_code VARCHAR(32),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE core.sa_tax_brackets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tax_year INTEGER NOT NULL,
  entity_type VARCHAR(32) NOT NULL, -- 'Individual', 'Company', 'Trust'
  bracket_definition JSONB NOT NULL,
  rebates JSONB,
  medical_credits JSONB,
  effective_from DATE NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tax_year, entity_type)
);
```

### 3.9 Single Practice Workspace Lockdown & Link Pruning Policy
- **Single Workspace Configuration (`packages/twenty-server/.env`):**
  - `IS_MULTIWORKSPACE_ENABLED=false`
  - `DEFAULT_WORKSPACE_NAME="FD on Call"`
  - `SIGN_IN_PREFILLED=true` (during dev/testing; credentials scoped to `FD on Call`)
- **Admin Panel & Settings Pruning:**
  - Hide `MultiWorkspaceDropdown` and multi-tenant billing redirects from navigation.
  - Retain only Practice User Management, Review Gate Permissions, and Statutory Field Metadata.
- **twenty.com Documentation Link Removal:**
  - Remove all external marketing links pointing to `https://twenty.com/docs` and Discord.
  - Re-point navigation help buttons to the internal practice handbook: `docs/spec-handbook.html`.

---

## 4. Webhook & Inbound REST Payload Specifications (planned production endpoints)

> **Status: planned, not implemented.** No webhook route exists in the shipped Pages Function, which serves only `/api/auth/*`.

### 4.1 Documenso Webhook Endpoint (`POST /api/webhooks/documenso`)
- **Headers Required:**
  - `Content-Type: application/json`
  - `X-Documenso-Signature: t=1793970000,v1=9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08`
- **Payload Schema (`DOCUMENT_COMPLETED`):**

```json
{
  "event": "DOCUMENT_COMPLETED",
  "documentId": "doc_928374182374",
  "documentTitle": "FD on Call - Engagement SLA - Alco Holdings (Pty) Ltd",
  "status": "COMPLETED",
  "recipients": [
    {
      "email": "director@alcoholdings.co.za",
      "name": "Johan Alco",
      "role": "SIGNER",
      "signedAt": "2026-11-06T14:30:00Z"
    },
    {
      "email": "erik@fdoncall.co.za",
      "name": "Erik Partner",
      "role": "SIGNER",
      "signedAt": "2026-11-06T15:00:00Z"
    }
  ],
  "customData": {
    "opportunityId": "opp_1a2b3c4d5e",
    "clientCode": "ALC-610",
    "fyeMonth": 2,
    "annualRetainerZar": 84000.00
  }
}
```

---

## 5. Security & POPIA Compliance Architecture (planned production controls)

> **Status: planned, not implemented.** Field encryption, database guards and Graph credentials described here belong to the target Twenty deployment. The shipped app's actual controls — and their gaps — are in "Auth & security (shipped)" above.

1. **Protection of Personal Information Act (POPIA No. 4 of 2013):**
   - South African National ID numbers and SARS Tax Reference Numbers are encrypted at rest using AES-256-GCM authenticated encryption.
   - Keys are managed via environment variable `FIELD_ENCRYPTION_KEY` and never stored in plain database columns.
2. **Partner Review Authority Boundary:**
   - Database trigger / API guard:
     ```typescript
     if (task.reviewRule === 'always' || (task.serviceCode === 'IRP6' && task.irp6Outcome === 'payable')) {
       if (nextStatus === TaskStatus.SUBMITTED && !currentUser.isPartner) {
         throw new ForbiddenException('Only Managing Partners (Erik/Wouter) can submit returns subject to review.');
       }
     }
     ```
3. **Headless Storage Sandbox:**
   - Microsoft Graph API credentials reside only on Twenty server; external clients cannot browse or access files outside their specific tenant directory.

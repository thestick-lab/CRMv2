# FD on Call CRM — Technical Architecture, Database Specification & API Plugin Topology

**Document Reference:** `docs/03-ARCHITECTURE-AND-DATABASE-SPEC.md`  
**Target System:** FD on Call Practice Ledger CRM (Native Twenty CRM Monorepo)  
**Status:** Approved Technical Architecture Specification  

---

## 1. System Topology & Monorepo Architecture

The practice CRM is built on the official **Twenty CRM** monorepo located in `/home/hein/Projects/CRM/twenty/`. It runs on an Nx-managed monorepo with Yarn 4.18.1 and Node `v26.13.0`:

```
/home/hein/Projects/CRM/
├── twenty/                                 # Primary CRM Monorepo (Active Application Base)
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

---

## 2. API Plugin & Connector Architecture

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

## 3. Physical Database Schema & Object Extensions

Twenty CRM stores data in PostgreSQL 16 under the `core` schema. We extend Twenty's native standard objects with South African statutory attributes and introduce commercial tables for contracts and timekeeping.

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

## 4. Webhook & Inbound REST Payload Specifications

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

## 5. Security & POPIA Compliance Architecture

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

# FD on Call CRM (CRMv2)

High-performance, standalone practice operating system for **FD on Call** (Chartered Accountants & Tax Advisors, Western Cape, South Africa).

Combines Twenty CRM's modern dark/light UI aesthetic with South African statutory compliance engines (Companies Act s30(1), SARS Tax Administration Act s25), rolling 12-month practice economics estimators, and dual-signature digital SLAs.

---

## Quick Navigation

* **Master Handoff & Architecture Blueprint:** [`HANDOFF.md`](HANDOFF.md)
* **Master UI Screen & Information Architecture Spec:** [`docs/05-UI-INFORMATION-ARCHITECTURE-AND-SCREEN-FLOWS.md`](docs/05-UI-INFORMATION-ARCHITECTURE-AND-SCREEN-FLOWS.md)
* **Interactive Specification Handbook:** Open [`docs/spec-handbook.html`](docs/spec-handbook.html) in your browser.
* **Interactive SVG Diagrams (9 total):** Located under [`docs/diagrams/`](docs/diagrams/)
  * `09 · UI Information Architecture & Screen Flows`
  * `01 · Architecture Delta (Twenty to FD on Call)`
  * `02 · Practice Data Flow`
  * `03 · Statutory Compliance Rule Flowchart`
* **Pure TypeScript Domain Engine:** Ready-to-use in [`packages/domain/src/domain/`](packages/domain/src/domain/)
  * `dates.ts`: Easter Sunday Computus & South African public holiday rollbacks
  * `sars.ts`: Filing seasons for IRP6, ITR14, ITR12, VAT201, EMP201, EMP501
  * `pricing.ts` & `catalogue.ts`: 21 service catalog lines & turnover bands
  * `estimate.ts`: 12-month rolling fee matrix with March escalation
* **Export Generators:** [`packages/domain/src/export/`](packages/domain/src/export/) (`pdf.ts`, `sheet.ts`, `xlsx.ts`)
* **Brand Assets:** [`assets/`](assets/) (Official FD on Call logos, badges, and favicons)
* **Redesign spec & plan (2026-11-09):** [`docs/superpowers/specs/2026-11-09-crm-redesign-design.md`](docs/superpowers/specs/2026-11-09-crm-redesign-design.md) · [`docs/superpowers/plans/2026-11-09-crm-redesign.md`](docs/superpowers/plans/2026-11-09-crm-redesign.md) (the plan's appendix lists the open product decisions)

---

## Practice workflow (shipped with the 2026-11 redesign)

* **Quotes → signature → invoice:** a three-step quote builder (client, scope, fee schedule) with a live branded document preview, stage rules enforced (`Draft → Sent → Accepted → Signed → Active Client`, `Closed Lost` only from draft/sent/accepted), a simulated Documenso dual-signer envelope, and invoice creation from an accepted quote with 15% VAT reconciliation and a simulated Xero `ACCREC` draft push.
* **Time tracking:** quarter-hour rounding (nearest 15 minutes, 15-minute floor), a topbar timer, a timesheet Log tab, and a Report tab whose KPIs, client bars and grouped rows reconcile to the underlying entries; billed retainer overage flows onto the invoice as a priced line.
* **Roles & permissions:** a six-role matrix (Partner, Compliance Officer, Accountant, Team member, Subcontractor, Support Tech) over Clients, Deadlines & Tasks, Quotes & Invoices, Time, People and Settings, enforced across navigation and every action — partner sign-off stays locked to Partner.
* **Governance log:** a read-only, derived audit trail of sign-offs, statutory submissions, quote and invoice decisions, time and permission changes, filterable per client and exportable to CSV/PDF.

---

## Tech Stack

* **Frontend:** React 19 + Vite 8 + Tailwind CSS + shadcn/ui (`@tanstack/react-table`, Lucide icons, Radix UI primitives)
* **Auth & Roles:** Better-Auth (email/password, sessions, partner review gates)
* **Backend:** Node.js with Hono (REST / type-safe RPC)
* **Database & ORM:** PostgreSQL 16 + Drizzle ORM
* **Domain Engine:** Pure TypeScript (zero external dependencies)

See [`HANDOFF.md`](HANDOFF.md) for full phase-by-phase execution instructions.

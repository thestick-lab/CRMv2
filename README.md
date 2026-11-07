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

---

## Tech Stack

* **Frontend:** React 19 + Vite 8 + Tailwind CSS + shadcn/ui (`@tanstack/react-table`, Lucide icons, Radix UI primitives)
* **Auth & Roles:** Better-Auth (email/password, sessions, partner review gates)
* **Backend:** Node.js with Hono (REST / type-safe RPC)
* **Database & ORM:** PostgreSQL 16 + Drizzle ORM
* **Domain Engine:** Pure TypeScript (zero external dependencies)

See [`HANDOFF.md`](HANDOFF.md) for full phase-by-phase execution instructions.

# FD on Call CRM (CRMv2)

High-performance, standalone practice operating system for **FD on Call** (Chartered Accountants & Tax Advisors, Western Cape, South Africa).

Combines Twenty CRM's modern dark/light UI aesthetic with South African statutory compliance engines (Companies Act s30(1), SARS Tax Administration Act s25), a quote → signature → invoice pipeline, rolling 12-month practice economics estimators, retainer-based time tracking, a six-role permission matrix, and a derived governance audit log.

---

## Quick Navigation

* **Master Handoff & Architecture Blueprint:** [`HANDOFF.md`](HANDOFF.md)
* **AI-to-AI Handoff:** [`AI_HANDOFF_SPECIFICATION.md`](AI_HANDOFF_SPECIFICATION.md)
* **Master UI Screen & Information Architecture Spec:** [`docs/05-UI-INFORMATION-ARCHITECTURE-AND-SCREEN-FLOWS.md`](docs/05-UI-INFORMATION-ARCHITECTURE-AND-SCREEN-FLOWS.md)
* **Architecture & Data Model Spec:** [`docs/03-ARCHITECTURE-AND-DATABASE-SPEC.md`](docs/03-ARCHITECTURE-AND-DATABASE-SPEC.md)
* **Interactive Specification Handbook:** Open [`docs/spec-handbook.html`](docs/spec-handbook.html) in your browser.
* **Interactive SVG Diagrams (9 total):** Located under [`docs/diagrams/`](docs/diagrams/) — `09` (UI IA) and `06` (schema/cloud architecture) predate the 2026-11 redesign and need regenerating.
* **Pure TypeScript Domain Engine:** Ready-to-use in [`packages/domain/src/domain/`](packages/domain/src/domain/)
  * `dates.ts`: Easter Sunday Computus & South African public holiday rollbacks
  * `sars.ts`: Filing seasons for IRP6, ITR14, ITR12, VAT201, EMP201, EMP501
  * `pricing.ts` & `catalogue.ts`: service catalogue lines & turnover bands
  * `estimate.ts`: 12-month rolling fee matrix with March escalation
  * `rules.ts` & `types.ts`: deadline generation rules & entity types
* **Export Generators:** [`packages/domain/src/export/`](packages/domain/src/export/) (`pdf.ts`, `sheet.ts`, `xlsx.ts`, `zip.ts`, `logo.ts`, `audit-pdf.ts`)
* **Brand Assets:** [`assets/`](assets/) (Official FD on Call logos, badges, and favicons)
* **Redesign spec & plan (2026-11-09):** [`docs/superpowers/specs/2026-11-09-crm-redesign-design.md`](docs/superpowers/specs/2026-11-09-crm-redesign-design.md) · [`docs/superpowers/plans/2026-11-09-crm-redesign.md`](docs/superpowers/plans/2026-11-09-crm-redesign.md) (the plan's appendix lists the open product decisions)

---

## Practice workflow (shipped with the 2026-11 redesign)

Eleven views, grouped in the sidebar as **Practice** (Home, Analytics, Inbox), **Work** (Clients, Team, Deadlines, Sales Pipeline, Time) and **Admin** (Settings, Governance Log).

* **Quotes → signature → invoice:** a three-step quote builder (client, scope, fee schedule) with a live branded document preview, stage rules enforced (`Draft Quote → Quote Sent → Accepted → Signed → Active Client`, `Closed Lost` only from draft/sent/accepted), signing additionally requiring a recorded Documenso envelope, a simulated dual-signer envelope, and invoice creation from an accepted quote with per-line 15% VAT reconciliation, a stored billing month, and a simulated Xero `ACCREC` draft push.
* **Sales pipeline:** a six-stage quote board with `Booked` and `Open pipeline value` kept separate, stage-value donut, ageing chips (amber from 15 days in stage), and Pipeline / Quotes / Invoices tabs.
* **Time tracking:** quarter-hour rounding (nearest 15 minutes, 15-minute floor), a session-only topbar timer, a timesheet Log tab, and a Report tab whose KPIs, client bars and grouped rows reconcile to the underlying entries; retainer overage flows onto the invoice as a priced line, and deleting that line releases the entries again.
* **Roles & permissions:** a six-role matrix (Partner, Compliance Officer, Accountant, Team member, Subcontractor, Support Tech) over Clients, Deadlines & Tasks, Quotes & Invoices, Time, People and Settings — 18 rows, `Allowed`/`Not allowed`/`Limited` stored with `Inherited`/`Custom` derived for display, enforced across navigation, ⌘K, deep links and every action. Partner sign-off stays locked to Partner; invites and role changes need `Settings — manage`.
* **Governance log:** a read-only, derived audit trail of sign-offs, statutory submissions, quote and invoice decisions, time and permission changes, filterable per client and exportable to CSV/PDF; each client's History tab shows the same trail scoped to that client.

---

## Tech Stack

* **Frontend:** React 19 + Vite 7 + Tailwind CSS v4, shadcn-style primitives on Radix (`@tanstack/react-table`, Lucide icons). No router library — in-memory `ViewKey` routing in `apps/web/src/App.tsx`.
* **State:** one `PracticeStoreContext` persisted to `localStorage` (`crmv2_practice_state`) with an idempotent load-time migration. Practice data is client-side; no application database is deployed.
* **Auth:** better-auth on a Cloudflare Pages Function (`apps/web/functions/api/[[route]].ts`) backed by D1 (`crmv2-auth`), with ten seeded staff accounts. HTTP self-service sign-up is refused and privilege fields are stripped from auth bodies (`functions/api/auth-guard.ts`); the login screen matches seeded credentials.
* **Domain Engine:** Pure TypeScript, zero external dependencies (7 domain modules + 6 export modules).
* **Integrations:** Documenso and Xero are simulated seams with the real request/payload shapes and no network calls.

```bash
npm install
npm run dev        # http://localhost:3000 (binds IPv6 — use `localhost`, not 127.0.0.1)
npm test           # 464 web + 52 domain tests
npm run typecheck
npm run build
```

See [`HANDOFF.md`](HANDOFF.md) for the phase-by-phase history and the current architecture.

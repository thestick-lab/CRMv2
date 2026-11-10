# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

React 19, Vite 7, Tailwind CSS v4, shadcn/ui primitives, Lucide React, TypeScript 5.8+, pure TypeScript domain engine (`packages/domain`).

## Users

Six permission roles over one practice: Partners (Erik, Wouter), Compliance Officers, Accountants, Team members, Subcontractors (assigned work only), and a Support Tech (system/admin support with no client, deadline, quote, invoice or time data). All at FD on Call and subsidiary Accountant on Call in Durbanville, Western Cape, South Africa.

## Product Purpose

A high-velocity practice operating system unifying South African statutory compliance calendars, a quote → signature → invoice pipeline, 12-month rolling practice fee projections, retainer-based time tracking and billing, a six-role permission matrix with a derived governance audit log, client-side PDF/XLSX generators, dual-signature digital SLAs, and SharePoint vaults inside Twenty CRM's modern dark/light aesthetic.

## Positioning

Unlike generic global CRMs (Salesforce, HubSpot, Twenty upstream) that lack South African statutory tax logic, or monolithic practice suites with rigid UIs, CRMv2 embeds verified South African statutory rules (Companies Act s30(1), SARS Tax Administration Act s25, Easter Computus holiday rollback) directly into a sub-second HMR web workspace.

## Operating Context

- Practice staff managing 13 active SME clients and 9 practice team members.
- Daily workflows: monitoring statutory deadlines (IRP6 provisional tax, ITR14 corporate income tax, VAT201, EMP201), reviewing compliance status, building 12-month fee proposals with annual March price increases, and dispatching quotes.
- Dual dark/light theme operation: dark canvas (`#141414`) by default for high-focus operational work, light mode (`#f6f5f3`) for client meetings and reviews.

## Capabilities and Constraints

- Eleven views in a grouped collapsible sidebar: **Practice** (Home, Analytics, Inbox), **Work** (Clients, Team, Deadlines, Sales Pipeline, Time), **Admin** (Settings, Governance Log). Items are filtered by the permission matrix; ⌘K and deep links enforce the same rules.
- Quote builder (client → scope → fee schedule) with a live document preview and enforced lifecycle; Sales Pipeline board with `Booked` vs `Open pipeline value`; invoice builder with a stored billing month, cent-exact per-line 15% VAT, derived `Overdue`, and a simulated Xero draft push.
- Six-lane Deadlines board with a docked detail panel, keyboard moves, ad-hoc tasks, and SA holiday rollback tags; Inbox for partner review.
- Time tracking with quarter-hour rounding (15-minute floor), a session-only topbar timer, a timesheet, and a reconciling report; retainer overage bills onto the invoice.
- Six-role / six-group / 18-row permission matrix (`Allowed | Not allowed | Limited` stored, `Inherited` / `Custom` derived), assigned-scope for Subcontractors, partner sign-off locked, `Settings — manage` for invites and role changes.
- Read-only derived governance log with CSV/PDF export and a per-client history trail.
- **Constraints:** practice data is client-side (`localStorage`, one store with an idempotent load-time migration); no application database is deployed. Documenso and Xero are simulated seams with the real payload shapes and no network calls. Auth is better-auth on a Cloudflare Pages Function with D1 — HTTP self-service sign-up is refused and privilege fields are stripped from auth bodies.
- Direct import from `packages/domain` for all statutory date rules, pricing bands, and estimate calculations.

## Brand Commitments

- Primary brand: "FD on Call" | Subsidiary: "Accountant on Call".
- Brand Crimson: `#c4161c` (hover `#a01217` / `#d91b22`).
- Canvas: `#141414` (dark) / `#f6f5f3` (light) | Cards: `#181818` / `#ffffff`.
- Typography: `Instrument Serif` (Display), `Geist` / `Inter` (UI Sans), `Geist Mono` (Tabular numeric and dates).

## Evidence on Hand

- Verified specifications in `HANDOFF.md`, `AI_HANDOFF_SPECIFICATION.md`, `docs/01` through `docs/05`, and `docs/design.md`; the 2026-11 redesign spec and plan in `docs/superpowers/`.
- 9 diagrams in `docs/diagrams/` (the UI IA and schema diagrams predate the 2026-11 redesign and need regenerating).
- 7 domain modules + 6 export modules in `packages/domain/` with 52 passing unit tests; 464 web tests across 48 files.
- Official brand assets in `assets/` and `apps/web/public/`.

## Product Principles

1. **Statutory Precision:** Deadlines roll back before weekends and South African public holidays; tax rules must never drift.
2. **Twenty CRM Aesthetic, Zero Monorepo Bloat:** Crisp typography, hairline borders, compact table rows, and fast collapsible navigation without heavy runtime abstractions.
3. **Lazy Senior Craft (Ponytail):** Minimal code, standard platform primitives, no unnecessary abstractions or redundant wrappers.

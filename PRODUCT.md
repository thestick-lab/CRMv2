# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

React 19, Vite 7, Tailwind CSS v4, shadcn/ui primitives, Lucide React, TypeScript 5.8+, pure TypeScript domain engine (`packages/domain`).

## Users

Partners (Erik, Wouter), Senior Chartered Accountants (CA(SA)), Practice Accountants, and Compliance Officers at FD on Call and subsidiary Accountant on Call in Durbanville, Western Cape, South Africa.

## Product Purpose

A high-velocity practice operating system unifying South African statutory compliance calendars, 12-month rolling practice fee projections, client-side PDF/XLSX quote generators, dual-signature digital SLAs, and SharePoint vaults inside Twenty CRM's modern dark/light aesthetic.

## Positioning

Unlike generic global CRMs (Salesforce, HubSpot, Twenty upstream) that lack South African statutory tax logic, or monolithic practice suites with rigid UIs, CRMv2 embeds verified South African statutory rules (Companies Act s30(1), SARS Tax Administration Act s25, Easter Computus holiday rollback) directly into a sub-second HMR web workspace.

## Operating Context

- Practice staff managing 13 active SME clients and 9 practice team members.
- Daily workflows: monitoring statutory deadlines (IRP6 provisional tax, ITR14 corporate income tax, VAT201, EMP201), reviewing compliance status, building 12-month fee proposals with annual March price increases, and dispatching quotes.
- Dual dark/light theme operation: dark canvas (`#141414`) by default for high-focus operational work, light mode (`#f6f5f3`) for client meetings and reviews.

## Capabilities and Constraints

- Collapsible sidebar with Twenty CRM navigation hierarchy: Home, Inbox, Settings, Practice Data (Clients, People & Directors), Statutory Ops (Deadlines, New Quote Calculator, Onboarding Pipeline).
- Persistent topbar with static brand mark `[FD] FD on Call`, `Cmd+K` command search, breadcrumbs, and dark/light toggle.
- User profile popover in footer for Erik (Partner).
- Direct import from `packages/domain` for all statutory date rules, pricing bands, and estimate calculations.

## Brand Commitments

- Primary brand: "FD on Call" | Subsidiary: "Accountant on Call".
- Brand Crimson: `#c4161c` (hover `#a01217` / `#d91b22`).
- Canvas: `#141414` (dark) / `#f6f5f3` (light) | Cards: `#181818` / `#ffffff`.
- Typography: `Instrument Serif` (Display), `Geist` / `Inter` (UI Sans), `Geist Mono` (Tabular numeric and dates).

## Evidence on Hand

- Verified specifications in `HANDOFF.md`, `docs/01` through `docs/05`, and `docs/design.md`.
- 9 publication-grade diagrams in `docs/diagrams/`.
- 33 pure TypeScript domain modules in `packages/domain/` with 50 passing unit tests.
- Official brand assets in `assets/` and `apps/web/public/`.

## Product Principles

1. **Statutory Precision:** Deadlines roll back before weekends and South African public holidays; tax rules must never drift.
2. **Twenty CRM Aesthetic, Zero Monorepo Bloat:** Crisp typography, hairline borders, compact table rows, and fast collapsible navigation without heavy runtime abstractions.
3. **Lazy Senior Craft (Ponytail):** Minimal code, standard platform primitives, no unnecessary abstractions or redundant wrappers.

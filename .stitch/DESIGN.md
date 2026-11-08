# Design System: FD on Call Practice Ledger (CRMv2)

Comprehensive `DESIGN.md` specification for the FD on Call CRMv2 application, providing tokens, component rules, and visual foundations for Stitch Canvas.

## 1. Visual Theme & Atmosphere

Precision practice ledger aesthetic built for high-density accounting, statutory compliance tracking, and executive financial direction. High contrast, typographic clarity, and restrained utilitarian elegance. 
The interface defaults to a deep obsidian slate environment (`#141414` / `#181818`) with signature crimson (`#c4161c`) active telemetry, paired with a warm limestone light surface (`#f6f5f3`) for client-facing exports.

## 2. Color Palette & Roles

### Primary Foundation
- **Obsidian Dark Surface (`#141414`)**: Root application background in dark mode.
- **Card & Container Dark (`#181818`)**: Elevated panels, data tables, and modal dialogs.
- **Warm Limestone Light (`#f6f5f3`)**: Primary background for light mode documents and exported client statements.
- **Card Surface Light (`#ffffff`)**: Clean white container fill for light mode cards and forms.

### Accent & Interactive
- **FD Crimson (`#c4161c`)**: Signature brand accent for primary CTAs, active tab indicators, and critical compliance badges.
- **Crimson Hover Dark (`#d91b22`)**: Hover state on dark buttons and interactive controls.
- **Crimson Hover Light (`#a01217`)**: Hover state on light buttons.
- **Secondary Slate (`#222222` dark / `#f0eee9` light)**: Pill chips, secondary actions, and table header rows.

### Typography & Text Hierarchy
- **Primary Text (`#ebebeb` dark / `#1b1817` light)**: Main table data, titles, and active inputs.
- **Muted Text (`#888888` dark / `#5c5652` light)**: Table column headers, metadata subtext, timestamps, and statutory codes.
- **Structural Border (`#262626` dark / `rgba(27, 24, 23, 0.12)` light)**: 1px divider lines, cell borders, and card outlines.

### Functional & Status States
- **Compliant / Success Green (`#10b981`)**: On-time filings, verified bank feeds, paid invoices.
- **Pending / Warning Amber (`#f59e0b`)**: Upcoming statutory deadlines within 7 days, provisional tax calculations.
- **Overdue / Destructive Red (`#ef4444` dark / `#dc2626` light)**: SARS statutory breaches, unallocated payments, destructive actions.
- **Informational Cyan / Slate (`#38bdf8`)**: Active AI practice assistant suggestions and external API sync indicators (Xero, Documenso).

## 3. Typography Rules

- **Geist Sans**: Primary interface font for navigation, buttons, table records, and form labels.
  - Display / H1: `600` weight, `24px` to `28px`, `-0.02em` letter-spacing.
  - Section Headings (H2 / H3): `600` weight, `16px` to `18px`, `-0.01em` letter-spacing.
  - Body Text: `400` / `500` weight, `14px`, line-height `20px`.
  - Captions & Microcopy: `500` weight, `12px`, line-height `16px`.
- **Geist Mono**: High-precision tabular numeric telemetry (`font-variant-numeric: tabular-nums`).
  - Ledger balances, currency figures (ZAR `R xxx,xxx`), statutory registration numbers, tax period codes (`2026/01`).
- **Instrument Serif**: Editorial accent used for executive summary banners and brand mark ("FD on Call").

## 4. Component Stylings

- **Buttons**:
  - Primary: Solid FD Crimson (`#c4161c`) with white text (`#ffffff`), subtle inset highlight, `rounded-md` (`6px`), `h-9` or `h-8` compact size.
  - Secondary / Outline: `#222222` background with `#262626` 1px border and `#ebebeb` text.
- **Ledger Tables & Data Grids**:
  - Compact row height (`36px` to `40px`) with 1px horizontal hairlines (`#262626`).
  - Sticky header with muted uppercase column labels (`11px`, `tracking-wider`).
  - Right-aligned monetary values in Geist Mono tabular numbers.
- **Badges & Status Chips**:
  - Pill shape (`rounded-full`), `11px` font, compact padding (`px-2 py-0.5`).
  - Status color pairings with 15% opacity container fills (e.g. green border + `#10b98115` fill).
- **Modals & Drawers**:
  - Centered dialogs with dark backdrop blur (`backdrop-blur-sm bg-black/70`), crisp `#262626` border, `rounded-lg` (`8px`).
  - Right-side sliding AI Practice Assistant drawer with conversational stream.

## 5. Layout Principles

- **Navigation**: Persistent 64px compact icon + label sidebar with collapsible workspace switcher popover at top and user profile at bottom.
- **Top Bar**: Search trigger (`cmd+k`), quick actions (+ Client, + Deadline), notification indicator, and sync status badge.
- **Baseline Grid**: 4px / 8px spacing unit. Container padding `px-6 py-6` desktop, collapsing to `px-4` on mobile.
- **Density**: High-density practice workflow maximizing visible data records per screen without clutter.

## 6. Design System Notes for Stitch Generation

- **Atmosphere keywords**: Obsidian dark theme, FD crimson accents, tabular ledger data grid, statutory compliance tracker, minimalist executive fintech.
- **Component prompts**:
  - Dark data table with sticky headers, filter bar, Geist Mono tabular revenue numbers, and status badges.
  - Statutory deadlines kanban board with Overdue, Due This Week, In Progress, and Completed columns.
  - Executive financial summary cards with primary stats, mini progress bars, and crimson callout badges.

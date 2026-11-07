# FD on Call — Brand Design System & Visual Specification (`design.md`)

<!-- impeccable:design-schema 1 -->

**Extracted From Production Domain:** `https://fdoncall.co.za/`  
**Organization:** FD on Call (and subsidiary *Accountant on Call*)  
**Location:** Unit 21 Frazzitta Business Park, C/O Langeberg Road & Batis Road, Durbanville, Cape Town, 7550  
**Contact:** `woutervs@fdoncall.co.za` | `erikw@fdoncall.co.za` | +27 86 100 0801 / +27 82 666 4642  
**Industry:** South African Chartered Accountancy, Tax Advisory, Secretarial Governance & Virtual Financial Direction  
**Accreditations:** SAICA Chartered Accountants (South Africa), Xero Certified Advisor  

---

## 1. Brand Identity & Practice Positioning

### Core Philosophy
FD on Call provides South African SMEs and mid-market enterprises with executive-grade financial steering and airtight statutory compliance. Unlike conventional reactive accounting firms, FD on Call integrates senior Chartered Accountants (CA(SA)) and dedicated Business Accountants directly into client operations.

### Taglines & Mottoes
- *"Take Your Business to New Heights"*
- *"Your own Financial Director – On Call"*
- *"Your own Accountant – On Call"*
- *"Compliance, Growth and Prosperity through astute comprehensive Financial Management!"*

### Service Divisions
1. **Financial Director on Call (Executive Advisory):**
   - High-level financial architecture, cashflow forecasting, board reporting, BBBEE efficiency, director accountability.
2. **Accountant on Call (Core Compliance & Operations):**
   - Monthly management accounting, bank reconciliations, payroll administration (SimplePay), Xero cloud ledger setup.
3. **Statutory Tax & Secretarial Governance:**
   - SARS returns (`ITR14`, `ITR12`, `ITR12T`, `IRP6`, `VAT201`, `EMP201`, `EMP501`).
   - CIPC compliance (Annual Returns, Beneficial Ownership register, MOI updates).

---

## 2. Brand Asset Manifest

The following assets have been extracted directly from `https://fdoncall.co.za/` and catalogued in `/home/hein/Projects/CRM/assets/`:

| File Name | Format | Dimensions | Usage in Twenty CRM UI |
|---|---|---|---|
| `fd-on-call-logo.png` | PNG (RGBA) | 1600 × 458 | Primary workspace header logo, login splash, PDF quote headers. |
| `accountant-on-call-logo.png` | PNG (RGBA) | 1600 × 458 | Secondary practice division header, compliance module banner. |
| `fd-on-call-footer-logo.png` | PNG (RGBA) | 1294 × 488 | High-contrast variant for dark surfaces and export footers. |
| `accountant-on-call-footer-logo.jpg` | JPEG | 1693 × 627 | Alternative brand mark for engagement letters and reports. |
| `xero-certified-advisor.png` | PNG (RGBA) | 1119 × 443 | Accreditation badge displayed in settings and export summaries. |
| `favicon-192.jpg` | JPEG | 192 × 192 | PWA application icon and workspace avatar fallback. |
| `favicon-32.jpg` | JPEG | 32 × 32 | Browser tab favicon for Twenty web client. |
| `fd-on-call-social.jpg` | JPEG | 1200 × 630 | OpenGraph social preview card. |

---

## 3. Color Tokens & Semantic Roles

Extracted directly from production CSS (`fdoncall.co.za` Divi core styles, Rank Math schemas, and sampled image histograms):

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                FD ON CALL BRAND COLOR SYSTEM                           │
├────────────────────┬────────────────────┬────────────────────┬─────────────────────────┤
│ Brand Crimson      │ Crimson Hover      │ Crimson Subdued    │ Crimson Highlight       │
│ #c4161c            │ #a01217            │ #fdf2f2            │ rgba(196, 22, 28, 0.08) │
│ (Primary Accent)   │ (Active/Pressed)   │ (Light Badge Bg)   │ (Active Nav Item)       │
├────────────────────┼────────────────────┼────────────────────┼─────────────────────────┤
│ Jet Ink / Primary  │ Slate Muted        │ Practice Paper     │ Card Surface            │
│ #1b1817            │ #5c5652            │ #f6f5f3            │ #ffffff                 │
│ (Primary Text)     │ (Secondary Labels) │ (App Canvas Bg)    │ (Elevated Containers)   │
├────────────────────┼────────────────────┼────────────────────┼─────────────────────────┤
│ Dark Canvas        │ Dark Elevated Card │ Dark Border        │ Light Rule Border       │
│ #161514            │ #1f1d1b            │ #2a2725            │ rgba(27,24,23,0.10)     │
│ (Dark Mode Canvas) │ (Dark Mode Card)   │ (Dark Hairline)    │ (Light Hairline)        │
└────────────────────┴────────────────────┴────────────────────┴─────────────────────────┘
```

### Contrast Verifications (WCAG 2.1 Level AA & AAA)
- **Brand Crimson (`#c4161c`) on Practice Paper (`#f6f5f3`):** 5.76:1 (Passes AA text, AAA UI components).
- **Brand Crimson (`#c4161c`) on White (`#ffffff`):** 5.92:1 (Passes AA text, AAA UI components).
- **White (`#ffffff`) on Brand Crimson (`#c4161c`):** 5.92:1 (Buttons and badges pass AA/AAA).
- **Jet Ink (`#1b1817`) on Practice Paper (`#f6f5f3`):** 16.2:1 (Exceeds 7:1 AAA standard).
- **Slate Muted (`#5c5652`) on Practice Paper (`#f6f5f3`):** 6.63:1 (Passes AA for small text).
- **Dark Mode Foreground (`#f6f5f3`) on Dark Canvas (`#161514`):** 16.8:1 (Flawless night contrast).

---

## 4. Typography Hierarchy

| Role | Font Family | Fallback Stack | Sizing / Tracking | Usage in Twenty CRM UI |
|---|---|---|---|---|
| **Editorial Display** | `Instrument Serif` | `Georgia, serif` | 24px–36px / `-0.02em` | Workspace hero titles, KPI aggregate numbers, export headers. |
| **Interface Sans** | `Inter`, `Geist`, or `Open Sans` | `-apple-system, BlinkMacSystemFont, sans-serif` | 13px–15px / `normal` | Navigation links, table row data, form labels, dialogs. |
| **Monospace Technical** | `Geist Mono` or `JetBrains Mono` | `ui-monospace, monospace` | 12px–13px / `-0.01em` | ZAR currency figures, entity codes (`ALC-610`), tax deadlines (`2026-08-31`), status pills. |

---

## 5. Twenty CRM UI Theme Mapping Matrix

Twenty CRM's frontend packages (`twenty-ui` and `twenty-front`) define theme variables via emotion/styled-components and CSS variables under `@twentyhq/twenty-ui/src/theme`. The table below establishes the direct token injection map:

| Twenty UI Token | Upstream Default | FD on Call Value (Light) | FD on Call Value (Dark) | Semantic UI Function |
|---|---|---|---|---|
| `accent` | Blue (`#2563eb`) | `#c4161c` (Crimson) | `#e52b32` (Vibrant Crimson) | Active controls, primary buttons, focus rings. |
| `accentHover` | Blue hover (`#1d4ed8`) | `#a01217` (Deep Crimson) | `#f87171` (Light Coral) | Button hover, interactive link hover. |
| `background.canvas` | `#f8f9fa` | `#f6f5f3` (Warm Paper) | `#161514` (Deep Charcoal) | Full viewport canvas background. |
| `background.surface` | `#ffffff` | `#ffffff` (Pure White) | `#1f1d1b` (Elevated Charcoal) | Table cards, modal sheets, dropdown menus. |
| `background.secondary` | `#f1f3f5` | `#efedea` (Light Sand) | `#262321` (Muted Charcoal) | Table header, sidebar background, chip containers. |
| `border.default` | `#e9ecef` | `rgba(27, 24, 23, 0.10)` | `#2a2725` | Hairline grid borders, divider lines. |
| `border.strong` | `#dee2e6` | `rgba(27, 24, 23, 0.18)` | `#3d3936` | Card outer boundaries, active input borders. |
| `font.color.primary` | `#212529` | `#1b1817` (Jet Ink) | `#f6f5f3` (Off-white Paper) | Primary headings, table text, input values. |
| `font.color.secondary` | `#495057` | `#5c5652` (Slate Muted) | `#a8a29e` (Warm Slate) | Subheaders, column headers, meta descriptions. |
| `font.color.tertiary` | `#868e96` | `#8a837c` (Warm Muted) | `#78716c` (Muted Stone) | Placeholders, disabled states, timestamps. |
| `tag.color.red` | Standard Red | `#c4161c` / bg `#fdf2f2` | `#f87171` / bg `#381617` | Overdue compliance tasks, critical SARS warnings. |

---

## 6. Impeccable Craft & Floor Standards

In accordance with `.claude/skills/impeccable/reference/craft-floor.md`:

1. **Browser Surface Styling:**
   - Text selection uses brand crimson tint: `::selection { background: rgba(196, 22, 28, 0.18); color: #1b1817; }`.
   - Custom sleek scrollbars: 6px track width, thumb `#5c5652` with hover `#1b1817`, rounded pill geometry.
   - Focus rings: 2px solid `#c4161c` with `2px` offset, avoiding default browser blue.
2. **Elevation & Depth:**
   - Single declaration: never layer a heavy border under a diffuse shadow. Cards use 1px subtle hairline rule (`rgba(27,24,23,0.08)`) with minimal soft blur (`0 1px 3px rgba(0,0,0,0.04)`).
   - Card border radii: 8px for compact data tiles, 12px for modal dialogs.
3. **No Artificial Bloat / Refusals:**
   - No gradient text or decorative glassmorphism halos.
   - No gratuitous section kickers/eyebrows.
   - Clean tabular numerals (`font-feature-settings: "tnum"`) across all financial tables.

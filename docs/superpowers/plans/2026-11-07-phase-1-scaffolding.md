# Phase 1: Project Scaffolding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish the npm multi-package workspace, verify and run the pure TypeScript domain engine (`packages/domain`) test suite, scaffold the modern React 19 + Vite frontend application (`apps/web`), and configure Tailwind CSS with FD on Call's exact design tokens.

**Architecture:** A lightweight monorepo using npm workspaces (`apps/*`, `packages/*`). `packages/domain` serves as an unbundled, zero-runtime-drift TypeScript package consumed directly by `apps/web`. `apps/web` uses Vite 8 / React 19 with Tailwind CSS configured with the dark/light palette tokens from `docs/design.md`.

**Tech Stack:** Node.js 26, npm 11 workspaces, React 19, Vite, TypeScript 5.8+, Tailwind CSS, Vitest, Lucide React, pdf-lib, pako.

**Spec:** `HANDOFF.md` (Section 5 & Section 6, Phase 1) and `docs/design.md`.

## Global Constraints

- Must use native `npm` workspaces without Yarn or Nx monorepo overhead.
- Must support Node.js `>=26.0.0`.
- All brand tokens must match `docs/design.md`: Canvas `#141414` (dark) / `#f6f5f3` (light), Surface `#181818` / `#ffffff`, Hairline border `#262626` / `rgba(27,24,23,0.12)`, Brand Crimson `#c4161c` (hover `#d91b22`), Text Primary `#ebebeb` / `#1b1817`.
- `packages/domain` must retain 100% test coverage with zero regressions across holiday rollbacks, SARS deadlines, and fee estimates.
- `apps/web` must link to `packages/domain` cleanly via workspace dependency.

## Review Focus

1. **Domain Test Compatibility:** Vitest executing tests that originally referenced `bun:test` without breaking assertion semantics or date calculations.
2. **Module Resolution in Vite:** `apps/web` resolving TypeScript sources directly from `packages/domain` with instant HMR and no pre-build requirements.
3. **Tailwind Dark/Light Mode Token Resolution:** CSS variables and utility classes resolving `#141414` canvas, `#c4161c` crimson, and tabular monospace fonts correctly.
4. **Clean Root Scripts:** `npm run test`, `npm run build`, and `npm run dev` functioning from the monorepo root.
5. **Node 26 Compatibility:** Clean package resolution without peer-dependency conflicts on React 19.

---

### Task 1: Root Workspace & `packages/domain` Test Suite

**Files:**
- Create: `package.json` (root)
- Modify: `packages/domain/package.json`
- Modify: `packages/domain/tsconfig.json`
- Create: `packages/domain/vitest.config.ts`
- Modify: `packages/domain/tests/rules.test.ts:1`
- Modify: `packages/domain/tests/estimate.test.ts:1`
- Modify: `packages/domain/tests/export.test.ts:1`

**Interfaces:**
- Consumes: `packages/domain/src/domain/*`, `packages/domain/src/export/*`
- Produces: Working `npm test` running all domain unit tests in Vitest.

- [ ] **Step 1: Create root `package.json` with npm workspaces**

Configure `"workspaces": ["apps/*", "packages/*"]`, private root, and delegate scripts `test`, `build`, `typecheck`.

- [ ] **Step 2: Update `packages/domain/package.json` with dependencies and export map**

Add dependencies `pdf-lib: "^1.17.9"`, `pako: "^2.1.0"`, `@types/pako: "^2.0.3"`, `vitest: "^3.0.0"`. Define exports for `./*` pointing to `./src/*`.

- [ ] **Step 3: Create `packages/domain/vitest.config.ts` and update test imports**

Create `vitest.config.ts` configuring Vitest with TypeScript resolve. Update line 1 of `rules.test.ts`, `estimate.test.ts`, and `export.test.ts` from `from 'bun:test'` to `from 'vitest'`.

- [ ] **Step 4: Run `npm install` and verify domain tests pass**

Run: `npm install && npm test --workspace=packages/domain`
Expected: PASS (all tests pass across `rules.test.ts`, `estimate.test.ts`, `export.test.ts`).

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json packages/domain
git commit -m "chore: setup npm workspace and vitest suite for packages/domain"
```

---

### Task 2: Scaffold `apps/web` with Vite, React 19, TypeScript & Workspace Link

**Files:**
- Create: `apps/web/package.json`
- Create: `apps/web/vite.config.ts`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/tsconfig.app.json`
- Create: `apps/web/tsconfig.node.json`
- Create: `apps/web/index.html`
- Create: `apps/web/src/main.tsx`
- Create: `apps/web/src/App.tsx`
- Create: `apps/web/src/vite-env.d.ts`

**Interfaces:**
- Consumes: `packages/domain/src/domain/dates`, `packages/domain/src/data/seed`
- Produces: Runnable React 19 + Vite web application with `@/*` path alias and direct workspace access to `packages/domain`.

- [ ] **Step 1: Create `apps/web/package.json` with React 19, Lucide, and workspace dependency**

Set `"name": "@crmv2/web"`, dependencies: `react: "^19.0.0"`, `react-dom: "^19.0.0"`, `lucide-react: "^0.475.0"`, `clsx`, `tailwind-merge`, and `"fdoncall-practice": "*"` (or workspace link).

- [ ] **Step 2: Configure `apps/web/vite.config.ts` and tsconfig files**

Configure `@vitejs/plugin-react`, path aliases (`@` -> `./src`), and resolution for `fdoncall-practice` pointing to `../../packages/domain/src`.

- [ ] **Step 3: Create `index.html` and minimal entry `src/main.tsx` importing from domain**

Set title `FD on Call CRM`, link Google Fonts (`Instrument Serif`, `Geist`, `Geist Mono`), mount `<App />`. In `App.tsx`, import `todayInSouthAfrica` or `CLIENTS` from `fdoncall-practice` to prove cross-workspace type resolution and runtime execution.

- [ ] **Step 4: Install and verify dev and build commands**

Run: `npm install && npm run build --workspace=@crmv2/web`
Expected: Vite build succeeds with 0 errors and outputs to `apps/web/dist`.

- [ ] **Step 5: Commit**

```bash
git add apps/web package-lock.json
git commit -m "feat(web): scaffold react 19 vite application with domain workspace link"
```

---

### Task 3: Configure Tailwind CSS, Design Tokens & shadcn Base Primitives

**Files:**
- Create: `apps/web/src/index.css`
- Create: `apps/web/src/lib/utils.ts`
- Create: `apps/web/components.json` (shadcn config)
- Modify: `apps/web/vite.config.ts` (Tailwind plugin or PostCSS)
- Create: `apps/web/src/components/ui/button.tsx`
- Create: `apps/web/src/components/ui/badge.tsx`

**Interfaces:**
- Consumes: `docs/design.md` color tokens
- Produces: Tailwind styling layer with CSS variables for Canvas (`#141414`), Surface (`#181818`), Border (`#262626`), Crimson (`#c4161c`), plus `cn()` helper and basic button/badge primitives.

- [ ] **Step 1: Install Tailwind CSS & Radix primitives in `apps/web`**

Install `@tailwindcss/vite` (or Tailwind CSS v4 / PostCSS) and `@radix-ui/react-slot`.

- [ ] **Step 2: Create `apps/web/src/index.css` with exact FD on Call design tokens**

Define `:root` (light mode) and `.dark` (dark mode default) variables:
- Canvas: `--background: #141414` (dark) / `#f6f5f3` (light)
- Surface: `--card: #181818` / `#ffffff`
- Border: `--border: #262626` / `rgba(27,24,23,0.12)`
- Foreground: `--foreground: #ebebeb` / `#1b1817`
- Crimson: `--primary: #c4161c`, `--primary-hover: #d91b22`
- Fonts: `font-serif` (Instrument Serif), `font-sans` (Geist/Inter), `font-mono` (Geist Mono).

- [ ] **Step 3: Create `src/lib/utils.ts` with `cn` helper**

Implement `cn(...inputs: ClassValue[])` combining `clsx` and `twMerge`.

- [ ] **Step 4: Create base button and badge primitives in `apps/web/src/components/ui/`**

Create `button.tsx` and `badge.tsx` supporting default, outline, and crimson primary variants.

- [ ] **Step 5: Commit**

```bash
git add apps/web
git commit -m "feat(web): configure tailwind tokens, fonts, and ui primitives"
```

---

### Task 4: End-to-End Build & Smoke Test Verification

**Files:**
- Modify: `apps/web/src/App.tsx`
- Create: `apps/web/src/App.test.tsx` (or smoke test in vitest)

**Interfaces:**
- Consumes: `apps/web`, `packages/domain`
- Produces: Verified smoke run displaying FD on Call branding, statutory date calculation from domain engine, and clean full-workspace build.

- [ ] **Step 1: Update `App.tsx` to render branded Phase 1 verification shell**

Include header with FD on Call logo/mark (`#c4161c`), typography test (`Instrument Serif` title, `Geist Mono` currency/statutory dates), and live calculation from `packages/domain/src/domain/dates.ts` (`todayInSouthAfrica`, Easter Computus check) and `seed.ts` (13 clients loaded count).

- [ ] **Step 2: Run root-level lint, typecheck, tests, and build**

Run: `npm test && npm run build --workspaces`
Expected: All tests pass, all packages build cleanly with exit code 0.

- [ ] **Step 3: Smoke test Vite dev server**

Run a brief build or dev server start check to ensure Vite starts and serves HTML on localhost.

- [ ] **Step 4: Update `HANDOFF.md` checklist for Phase 1**

Check off `- [x] Phase 1: Project Scaffolding` in `HANDOFF.md`.

- [ ] **Step 5: Final Phase 1 Commit**

```bash
git add .
git commit -m "feat: complete Phase 1 project scaffolding and domain integration"
```

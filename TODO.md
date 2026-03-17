# Droplet — TODO

> Prioritized, actionable development tasks. Each task max ~30 minutes.
> Governed by **Droplet-PM**. Do not add tasks without PM approval.
> Ref: `SPEC.md` for full specification. `AGENTS.md` for coding rules. `DONE.md` for completed phases.
> Implementation agent: **Droplet-Engineer** (Senior Developer).
>
> **STATUS: All Milestones 0–20 COMPLETE. Phases 1–59.2 complete. 368 unit tests passing (65+ suites). Build passing.**
> **PM deep audit #28 (2026-03-17): Full triple-audit (PM + Architect + Engineer). Owner instructions integrated.**
> **Priority order: 60.1 → 60.2 → 60.3 → 60.4 → 60.5 → 60.6 → 60.7 → 61.1 → 61.2 → 61.3 → 31.4 → 46.1 → 46.2 → 62.1 → 29.x → 26.x**
> **All Phase 26+ deferred work is ON HOLD until PM-approved.**

---

## Phase 60: Color Palette Upgrade — HIGH (PM Audit #28, Owner Directive — Color Palette)

> **HIGH priority. Owner directive: Replace entire app color palette with Navy (#0D3B66) / Lemon (#FAF0CA) / Grass (#27A148). Remove custom lightAccent, darkAccent, jwdAqua, jwdMarine, lightBorders, darkBorders palettes. Replace borders with TailwindCSS slate palette.**
> **Scope: 58 source files + globals.css. Token-based architecture makes migration clean — palette changes in CSS propagate via design tokens.**

---

### 60.1 HIGH — Define new color palette in globals.css

**Ref:** PM audit #28 — Owner color palette directive. Architect report: 14 palette groups, 122 CSS custom properties.

**What to do:**

1. In `src/app/globals.css`, replace existing `@theme` palette definitions with new scales generated from:
   - **Navy** (#0D3B66) — replaces `jwdMarine`, `darkBackground`, `darkText` (dark mode base)
   - **Lemon** (#FAF0CA) — replaces `lightBackground` (light mode base), used as light mode secondary
   - **Grass** (#27A148) — replaces `lightAccent` AND `darkAccent` (unified accent for both themes)
2. Generate 100-900 (or 100-1000) shade scales for each base color.
3. Replace `lightBorders` / `darkBorders` custom definitions with TailwindCSS `slate` palette references.
4. Remove `lightPrimary`, `darkPrimary`, `lightSecondary`, `darkSecondary` palettes — consolidate into the 3-palette system (Navy/Lemon/Grass) plus `slate` for borders.
5. Keep token names that match the new intent (e.g., rename `lightAccent` → `accent` since it's now the same for both themes, or keep separate names but point to same Grass values).

**Acceptance criteria:**

- [ ] globals.css defines Navy, Lemon, Grass palettes with proper shade scales
- [ ] `lightAccent` and `darkAccent` both resolve to Grass (#27A148) shades
- [ ] `jwdAqua` and `jwdMarine` removed — replaced with Navy shades
- [ ] `lightBorders` and `darkBorders` removed — replaced with `slate` palette
- [ ] `lightPrimary`/`darkPrimary`/`lightSecondary`/`darkSecondary` removed — replaced with Navy/Lemon shades
- [ ] Body `@apply` rule updated for new palette
- [ ] Button utility classes updated for Grass accent
- [ ] Scrollbar, markdown, and blockquote styles updated
- [ ] `npx tsc --noEmit` passes

---

### 60.2 HIGH — Replace bg-white with design tokens across all non-admin files

**Ref:** PM audit #28 — Architect report: 45 `bg-white` instances across 20 non-admin files. Pre-step before palette propagation.

**Files:** 20 files listed in Architect report (public pages, shared components, chat components, layout).

**What to do:**

1. Replace all `bg-white` and `bg-white/xx` usages with appropriate Lemon-based light background token (e.g., `bg-lightBackground-100/xx`).
2. Ensure each replacement has proper `dark:` counterpart using Navy-based dark token.
3. Special attention to `alert-message.tsx` — 4 severity variants use `bg-white`.

**Acceptance criteria:**

- [ ] Zero `bg-white` in any src/ file
- [ ] All replacements have dark mode pairing
- [ ] Alert message severity colors preserved (sky, red, emerald, amber text colors)
- [ ] Visual consistency maintained
- [ ] `npx tsc --noEmit` passes

---

### 60.3 HIGH — Migrate border tokens (lightBorders/darkBorders → slate)

**Ref:** Architect report: 43 files use `lightBorders`, 43 use `darkBorders`. Highest-impact migration batch.

**What to do:**

1. Replace all `lightBorders-*` references with `slate-*` equivalents from TailwindCSS.
2. Replace all `darkBorders-*` references with `slate-*` equivalents for dark mode.
3. Mapping: `lightBorders-100→slate-100`, `lightBorders-200→slate-200`, `lightBorders-300→slate-300`, `lightBorders-400→slate-400`, etc. Adjust shade mapping for visual consistency.

**Acceptance criteria:**

- [ ] Zero `lightBorders` or `darkBorders` references in src/
- [ ] All border tokens use TailwindCSS `slate` palette
- [ ] Both light and dark modes render correctly
- [ ] `npx tsc --noEmit` passes

---

### 60.4 HIGH — Migrate background tokens to new palette

**Ref:** Architect report: `lightBackground` in 31 files, `jwdMarine` in 42 files, `darkBackground` in 1 file.

**What to do:**

1. Update `lightBackground` CSS variables to generate from Lemon (#FAF0CA) as base color.
2. Update `jwdMarine` CSS variables to generate from Navy (#0D3B66) as base color. Or rename token to `navy` and find/replace across 42 files.
3. Remove `darkBackground` definitions (only used in globals.css itself).

**Acceptance criteria:**

- [ ] Light backgrounds use Lemon (#FAF0CA) shade scale
- [ ] Dark backgrounds use Navy (#0D3B66) shade scale
- [ ] `jwdAqua` references (4 files) replaced with closest Navy or slate shade
- [ ] `npx tsc --noEmit` passes

---

### 60.5 HIGH — Migrate accent and primary tokens to Grass

**Ref:** Architect report: `lightAccent` in 10 files, `darkAccent` in 10 files, `lightPrimary` in 23 files, `darkPrimary` in 22 files.

**What to do:**

1. Update `lightAccent` CSS variables to Grass (#27A148) shade scale.
2. Update `darkAccent` CSS variables to Grass (#27A148) shade scale (same as light — unified accent).
3. Evaluate `lightPrimary`/`darkPrimary` usage — these are decorative (progress bars, header backgrounds). Replace with appropriate Navy/Lemon/Grass shades.
4. Evaluate `lightSecondary`/`darkSecondary` — used for hover states, utility highlights. Replace with appropriate palette shades.

**Acceptance criteria:**

- [ ] All accent colors resolve to Grass (#27A148) shades
- [ ] `lightPrimary`/`darkPrimary` removed or reassigned
- [ ] `lightSecondary`/`darkSecondary` removed or reassigned
- [ ] `npx tsc --noEmit` passes

---

### 60.6 HIGH — Migrate text tokens

**Ref:** Architect report: `lightText` in 7 files, `darkText` in 5 files.

**What to do:**

1. Light theme text: Update `lightText` CSS variables to Navy (#0D3B66) shade scale per owner directive.
2. Dark theme text: Update `darkText` CSS variables to Lemon (#FAF0CA) shade scale per owner directive.

**Acceptance criteria:**

- [ ] Light theme primary text is Navy-based
- [ ] Dark theme primary text is Lemon-based
- [ ] Text readability maintained (contrast ratios)
- [ ] `npx tsc --noEmit` passes

---

### 60.7 HIGH — Remove old palette definitions and visual QA

**What to do:**

1. Remove all old palette CSS custom properties from globals.css that are no longer referenced.
2. Verify zero references remain to removed palette names in src/.
3. Visual QA: verify all pages in light mode AND dark mode render correctly.
4. Run full validation gateway.

**Acceptance criteria:**

- [ ] Zero unused CSS custom properties in globals.css
- [ ] Zero stale palette references in src/
- [ ] All pages render correctly in light mode
- [ ] All pages render correctly in dark mode
- [ ] `npx prettier . --write` passes
- [ ] `npm run lint` passes
- [ ] `npx tsc --noEmit` passes
- [ ] `npm run test` passes
- [ ] `npm run build` passes

---

## Phase 61: Admin Design Alignment & Data Organization — MEDIUM (PM Audit #28, Owner Directives)

> **MEDIUM priority. Run after Phase 60 (palette migration). Admin design must match /app design. JSON data outsourcing.**

---

### 61.1 MEDIUM — Proper confirmation modal component (replace window.confirm bridge)

**Ref:** AGENTS.md UX Safety Rules: "No window.confirm() in production UI." Currently 4 locations use window.confirm as temporary bridge.

**Files:** `src/components/admin/admin-managed-form.tsx`, `src/components/chat/library-delete-button.tsx`, `src/components/chat/sidebar/chat-sidebar-nav-v2.tsx`, `src/components/sections/profile-hero-editor.tsx`

**What to do:**

1. Create a reusable `ConfirmationModal` component using the app's design system (not browser native dialog).
2. Replace all 4 `window.confirm()` usages with the new modal.
3. Modal must show title, description, confirm/cancel buttons with appropriate styling.

**Acceptance criteria:**

- [ ] Zero `window.confirm()` calls in src/
- [ ] Reusable `ConfirmationModal` component created
- [ ] All destructive actions use the modal
- [ ] Modal accessible (keyboard, screen reader)
- [ ] `npx tsc --noEmit` passes

---

### 61.2 MEDIUM — Outsource static JSON data to dedicated folder

**Ref:** Owner directive: "JSON data inside app files/components must be outsourced to a folder named json or similar."

**Files:** `src/constants/landing-data.ts`, `src/constants/cookies-data.ts`

**What to do:**

1. Create `src/json/` directory.
2. Move pure static data arrays from `landing-data.ts` (featureCards, howItWorksSteps) and `cookies-data.ts` (cookieCategories) to JSON files in `src/json/`.
3. Update imports in consuming components.
4. Note: `about-data.ts`, `terms-data.ts`, `privacy-data.ts`, and `faqs.tsx` contain builder functions with dynamic config interpolation — these stay in `src/constants/`.

**Acceptance criteria:**

- [ ] `src/json/` directory exists with static data files
- [ ] `landing-data.ts` and `cookies-data.ts` import from json files or are moved entirely
- [ ] Builder functions remain in `src/constants/`
- [ ] `npx tsc --noEmit` passes

---

### 61.3 MEDIUM — Admin user detail usage columns in users list table

**Ref:** Owner directive: "In /admin/users table must provide information about usage and limits (remained vs included)."

**Files:** `src/app/(admin)/admin/users/page.tsx`, `src/components/admin/users/admin-users-table.tsx`

**What to do:**

1. Add usage summary columns to admin users list table: current plan, conversations used/limit, media used/limit.
2. Keep it concise — full detail available on user detail page.

**Acceptance criteria:**

- [ ] Users list table shows plan name, conversations used/limit, media usage summary
- [ ] Data fetched server-side, passed as props
- [ ] `npx tsc --noEmit` passes

---

## Phase 31.4: E2E Test Updates — LOW (remaining)

### 31.4 LOW — Update E2E tests for current UI structure

**Ref:** PM audit #28 — Engineer analysis: E2E failures caused by stale Clerk auth session and DB connectivity. `pricing-public.spec.ts` is a confirmed duplicate of `plans-public.spec.ts`.

**Files:** `tests/e2e/chat-app-shell.spec.ts`, `tests/e2e/plans-public.spec.ts`, `tests/e2e/pricing-public.spec.ts`, `tests/e2e/public-pages.spec.ts`, `tests/e2e/user-profile.spec.ts`

**What to do:**

1. Delete `pricing-public.spec.ts` (confirmed duplicate of `plans-public.spec.ts`).
2. Fix auth session refresh logic in E2E global setup.
3. Update selectors/assertions in remaining failing specs.
4. Add DB connectivity check in E2E setup.

**Acceptance criteria:**

- [ ] `pricing-public.spec.ts` deleted
- [ ] `npm run test:e2e` passes with 0 failures (excluding intentionally skipped)
- [ ] No duplicate test files

---

## Phase 46: Performance & Resource Leak Audit — LOW (PM Audit #24)

> **Codebase is clean. All resource leaks resolved (autoAnimate fixed Phase 49.1). Only minor items remain.**

---

### 46.1 LOW — Add admin error boundary

**Files:** `src/app/(admin)/error.tsx` (new)

**What to do:**

1. Create `error.tsx` for admin route group.
2. Handle admin-specific errors with appropriate recovery UI.

---

### 46.2 LOW — Add stderr logging to silent catch blocks

**Files:** `src/components/shared/audio-player.tsx`, `src/components/chat/chat-sidebar.tsx`, `src/components/chat/sidebar/chat-sidebar-shell.tsx`

**What to do:**

1. Replace empty `catch {}` blocks (3 total) with `catch { /* localStorage/audio non-critical */ }` comments or minimal stderr logging where appropriate.

---

## Phase 62: Confirmation Modal Upgrade — LOW

### 62.1 LOW — Replace window.confirm temporary bridge

**Note:** This is tracked separately from 61.1 in case palette migration takes priority. If 61.1 is executed first, skip this phase.

---

## Phase 29: App-Wide Modernization — ON HOLD

> **ON HOLD until all HIGH-priority phases complete.**

### 29.1 Implement Zod schema validation across the app

### 29.2 Implement Zustand for client-side state management

---

## Phase 26: Deferred Features — ON HOLD

### 26.1 Persona-aware media generation prompts (TD-AI-09)

### 26.2 Implement Stripe subscription mode — auto-renewal (TD-PLAN-01)

---

> **Completed phases** are archived in [`DONE.md`](DONE.md).
> All phases through 59.2 complete. All Milestones 0–20 COMPLETED.
> Phase 10–12 superseded (see DONE.md for mapping).

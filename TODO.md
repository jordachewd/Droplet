# Droplet — TODO

> Prioritized, actionable development tasks. Each task max ~30 minutes.
> Governed by **Droplet-PM**. Do not add tasks without PM approval.
> Ref: `SPEC.md` for full specification. `AGENTS.md` for coding rules. `DONE.md` for completed phases.
> Implementation agent: **Droplet-Engineer** (Senior Developer).
>
> **STATUS: All Milestones 0–22 COMPLETE (21 delivered, 22 pending). Phases 1–60.7, 63.1–63.2 complete. 369 unit tests passing (65+ suites). Build passing.**
> **PM deep audit #30 (2026-03-18): Triple-audit (PM + Architect + Engineer). Brand palette v2 migration planned.**
> **Priority order: 64.1 → 64.2 → 64.3 → 64.4 → 64.5 → 64.6 → 64.7 → 61.1 → 61.2 → 61.3 → 31.4 → 46.x → 29.x → 26.x**
> **All Phase 26+ deferred work is ON HOLD until PM-approved.**

---

## Phase 64: Brand Color Palette v2 Migration — HIGH (PM Audit #30, Owner-Directed)

> **HIGH priority. Owner-directed brand palette change. Blocks all feature work until complete.**
> **Milestone 22. Triple-audit (PM + Architect + Engineer) confirmed scope: ~60 files, ~538 references, ~175 min estimated.**
>
> **Brand Palette:** Night Indigo (#1B003F), Twilight Purple (#4B0082), Midnight Blue (#191970), Lavender Haze (#E6E6FA), Dusty Blue (#6495ED).
> **Light Theme:** Text = Midnight Blue, Background = Lavender Haze, Buttons = bg Twilight Purple / text Lavender Haze.
> **Dark Theme:** Text = Lavender Haze, Background = Night Indigo, Buttons = bg Dusty Blue / text Lavender Haze.
>
> **Migration mapping:**
>
> - `lightBackground-*` → `lavenderHaze-*` (53 files, 217 refs)
> - `darkBackground-*` → `nightIndigo-*` (55 files, 241 refs)
> - `lightText-*` → `midnightBlue-*` (7 files, 15 refs)
> - `darkText-*` → `lavenderHaze-*` (5 files, 12 refs)
> - `grass-*` → `twilightPurple-*` (light) / `dustyBlue-*` (dark) (11 files, 53 refs)
> - Remove dead `navy-*`, `lemon-*` definitions (0 component refs)
>
> **Execution order:** 64.1 → 64.2 → 64.3 → 64.4 → 64.5 → 64.6 → 64.7. Each sub-phase is a checkpoint.

---

### 64.1 HIGH — Define new brand palette shade scales in globals.css @theme

**Ref:** Milestone 22 Block A. Foundation step — everything depends on this.

**What to do:**

1. Generate 10-step shade scales (100-1000) for all 5 brand colors using oklch-based perceptual lightness. Use https://uicolors.app/create or similar tool. Base (500) values: Night Indigo #1B003F, Twilight Purple #4B0082, Midnight Blue #191970, Lavender Haze #E6E6FA, Dusty Blue #6495ED.
2. Add all 5 new palette definitions to the `@theme` block in `src/app/globals.css` as `--color-nightIndigo-*`, `--color-twilightPurple-*`, `--color-midnightBlue-*`, `--color-lavenderHaze-*`, `--color-dustyBlue-*`.
3. Remove `--color-navy-*` (10 definitions) and `--color-lemon-*` (9 definitions) — confirmed dead tokens with zero component references.
4. Remove `--color-lightBackground-*`, `--color-darkBackground-*`, `--color-lightText-*`, `--color-darkText-*` definitions.
5. Keep `--color-grass-*` temporarily (needed until 64.5).
6. Verify contrast: `lavenderHaze-500` (#E6E6FA) on `nightIndigo-1000` must be ≥4.5:1 (currently ~13.5:1 — good). Also verify `lavenderHaze-700` against `nightIndigo-900`/`1000`.

**Acceptance criteria:**

- [ ] `@theme` block contains 5 new brand palettes + grass (temporary)
- [ ] Zero `--color-navy-*` or `--color-lemon-*` definitions remain
- [ ] Zero `--color-lightBackground-*`, `--color-darkBackground-*`, `--color-lightText-*`, `--color-darkText-*` definitions remain
- [ ] Contrast check: lavenderHaze shades 500-700 all pass ≥4.5:1 against nightIndigo 900-1000
- [ ] `npx tsc --noEmit` passes (CSS-only change, no type impact)

---

### 64.2 HIGH — Update globals.css component utility classes + @apply rules

**Ref:** Milestone 22 Block A. 18 @apply rules in globals.css reference old tokens. Globals.css changes propagate to every component using these utility classes.

**Files:** `src/app/globals.css` only.

**What to do:**

1. Update `body` base: `bg-lightBackground-500` → `bg-lavenderHaze-500`, `text-lightText-500` → `text-midnightBlue-500`, `dark:bg-darkBackground-1000` → `dark:bg-nightIndigo-1000`, `dark:text-darkText-500` → `dark:text-lavenderHaze-500`.
2. Update `a` element: `text-lightText-600` → `text-midnightBlue-600`, `hover:text-darkBackground-500` → `hover:text-nightIndigo-500`, `dark:text-darkText-700` → `dark:text-lavenderHaze-700`.
3. Update `.heading-*`, `.body-*` text classes: `lightText-500` → `midnightBlue-500`, `darkText-500` → `lavenderHaze-500`.
4. Update `.btn-text` and `.btn-outlined`: `grass-*` → `twilightPurple-*` (light) / `dustyBlue-*` (dark). Already split via `dark:` prefix.
5. Update `.btn-contained`: `darkBackground-600` → `twilightPurple-600` (light), add `dark:border-dustyBlue-600 dark:bg-dustyBlue-600`. Also change `text-white` to `text-lavenderHaze-500` per brand spec. **Fix hardcoded teal shadow** `rgba(21,118,118,0.3)` → use new brand accent color rgb values.
6. Update `.icon-btn`: `lightText-500` → `midnightBlue-500`, `lightBackground-300` → `lavenderHaze-300`, etc.
7. Update `.tooltip-content`: `darkBackground-600` → `nightIndigo-600`.
8. Update `.chat-markdown`, `.chat-markdown--bot`, table styles, `.droplet-scrollbar`: all old tokens → new brand tokens.

**Acceptance criteria:**

- [ ] Zero `lightBackground-*`, `darkBackground-*`, `lightText-*`, `darkText-*`, `grass-*` references in globals.css @apply rules
- [ ] `btn-contained` shadow uses brand accent rgb, not teal
- [ ] `btn-contained` has light (twilightPurple) and dark (dustyBlue) variants
- [ ] Visual smoke test: whole app reflects new palette via globals.css cascade
- [ ] `npx tsc --noEmit` passes

---

### 64.3 HIGH — Bulk rename: lightBackground → lavenderHaze + darkText → lavenderHaze

**Ref:** Milestone 22 Block B. Mechanical find-replace across all component files.

**What to do:**

1. Find-replace `lightBackground-` → `lavenderHaze-` in ALL files under `src/` (excluding globals.css @theme definitions which were already removed in 64.1).
2. Find-replace `darkText-` → `lavenderHaze-` in ALL files under `src/`.
3. Both map to the same `lavenderHaze-*` palette. This is architecturally correct — they shared the same Lemon-based values in the old system.
4. Verify all opacity modifiers are preserved (e.g., `bg-lavenderHaze-100/80`).

**Estimated scope:** 53 files (lightBackground) + 5 files (darkText) = ~58 files, ~229 refs.

**Acceptance criteria:**

- [ ] Zero `lightBackground-` references in `src/` (grep verification)
- [ ] Zero `darkText-` references in `src/` (grep verification)
- [ ] All opacity modifiers preserved
- [ ] `npx tsc --noEmit` passes

---

### 64.4 HIGH — Bulk rename: darkBackground → nightIndigo + lightText → midnightBlue

**Ref:** Milestone 22 Block B. Mechanical find-replace across all component files.

**What to do:**

1. Find-replace `darkBackground-` → `nightIndigo-` in ALL files under `src/`.
2. Find-replace `lightText-` → `midnightBlue-` in ALL files under `src/`.
3. Note: `darkBackground-*` is used as both background AND accent (btn-contained, tooltip, link hover). The rename is correct per brand spec — these non-background uses intentionally change from navy to deep purple.
4. Verify all opacity modifiers are preserved.

**Estimated scope:** 55 files (darkBackground) + 7 files (lightText) = ~62 files, ~256 refs.

**Acceptance criteria:**

- [ ] Zero `darkBackground-` references in `src/` (grep verification)
- [ ] Zero `lightText-` references in `src/` (grep verification)
- [ ] All opacity modifiers preserved
- [ ] `npx tsc --noEmit` passes

---

### 64.5 HIGH — Migrate grass → twilightPurple/dustyBlue (accent split)

**Ref:** Milestone 22 Block B. Most complex sub-task. `grass-*` is unified accent, new design splits by theme.

**Files:** 11 files, 53 refs. Architect identified 17 locations with existing `dark:` prefix (mechanical) and 8 locations needing manual `dark:` additions.

**What to do:**

1. **Mechanical split** (17 locations): Where `grass-X` has a `dark:grass-Y` companion on same element, replace `grass-X` → `twilightPurple-X` and `dark:grass-Y` → `dark:dustyBlue-Y`.
2. **Manual split** (8 locations needing new dark variants):
   - `plan-promo.tsx`: `bg-grass-500 text-grass-1000` → `bg-twilightPurple-500 text-twilightPurple-1000 dark:bg-dustyBlue-500 dark:text-dustyBlue-1000`. Same for `border-grass-1000` lines.
   - `plan-card.tsx`: Same pattern. `bg-grass-500 text-grass-1000 dark:bg-grass-500 dark:text-grass-1000` → `bg-twilightPurple-500 text-twilightPurple-1000 dark:bg-dustyBlue-500 dark:text-dustyBlue-1000`.
   - `checkout-form.tsx`: `disabled:text-grass-1000/50` → `disabled:text-twilightPurple-1000/50 dark:disabled:text-dustyBlue-1000/50`.
3. After all replacements, remove `--color-grass-*` definitions from `@theme` block.
4. Gradient tokens (about, landing-page): `to-grass-100` → `to-twilightPurple-100`. Dark gradient lines already use separate tokens.

**Acceptance criteria:**

- [ ] Zero `grass-` references in `src/` (grep verification)
- [ ] Zero `--color-grass-*` definitions in globals.css
- [ ] All button/accent elements have both light (twilightPurple) and dark (dustyBlue) variants
- [ ] `npx tsc --noEmit` passes

---

### 64.6 HIGH — Clerk appearance hex update + btn-contained shadow cleanup

**Ref:** Milestone 22 Block C. Non-token-based color references that won't be caught by find-replace.

**Files:** `src/app/layout.tsx`, `src/app/globals.css`

**What to do:**

1. Update Clerk `appearance.variables` in `layout.tsx`:
   - `colorPrimary: "#6A0DAD"` → `colorPrimary: "#4B0082"` (Twilight Purple)
   - `colorText: "#008080"` → `colorText: "#191970"` (Midnight Blue)
2. Verify `btn-contained` shadow was updated in 64.2. If not, fix `rgba(21,118,118,0.3)` → appropriate brand accent rgb values.

**Acceptance criteria:**

- [ ] Clerk appearance uses brand palette hex values
- [ ] No hardcoded teal/legacy color values in src/
- [ ] `npx tsc --noEmit` passes

---

### 64.7 HIGH — Full validation gateway + zero-reference verification

**Ref:** Milestone 22 Block C. Final checkpoint.

**What to do:**

1. Grep verify: zero hits for ALL removed token names in `src/`: `lightBackground-`, `darkBackground-`, `lightText-`, `darkText-`, `grass-`, `navy-`, `lemon-`.
2. Grep verify: zero `--color-navy`, `--color-lemon`, `--color-grass`, `--color-lightBackground`, `--color-darkBackground`, `--color-lightText`, `--color-darkText` in globals.css.
3. Verify `@theme` block contains ONLY: `nightIndigo-*`, `twilightPurple-*`, `midnightBlue-*`, `lavenderHaze-*`, `dustyBlue-*` + standard Tailwind overrides (breakpoints, container, text sizes).
4. Run full validation gateway:
   ```bash
   npx prettier --write .
   npm run lint
   npx tsc --noEmit
   npm run test
   npm run build
   ```
5. All 5 gates must pass.

**Acceptance criteria:**

- [ ] Zero old token references in src/
- [ ] @theme block clean — only 5 brand palettes
- [ ] Prettier passes
- [ ] Lint passes
- [ ] TypeScript passes
- [ ] Unit tests pass (369+)
- [ ] Build passes

---

## Phase 63: Critical Bug Fixes — CRITICAL (PM Audit #29, Triple-Audit Confirmed)

> **CRITICAL priority. Triple-audit confirmed: client self-delete orphans Clerk account. Must be fixed before any feature work.**
> **Premium media limitation report also investigated — requires admin UI safeguard and owner clarification on Premium video limit.**

---

### ~~63.1 CRITICAL — Fix client self-delete to also delete from Clerk~~ ✅ DONE

**Completed PM audit #29.** Clerk deletion added before MongoDB cleanup. Clerk failure prevents MongoDB deletion. Unit test added (369 total). Archived to DONE.md.

---

### ~~63.2 HIGH — Add admin limits UI safeguard for unlimited (-1) values~~ ✅ DONE

**Completed PM audit #29.** LimitInput component added with Unlimited badge, min={-1}, amber warning on unlimited→finite change, helper text. Archived to DONE.md.

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

# Droplet — TODO

> Prioritized, actionable development tasks. Each task max ~30 minutes.
> Governed by **Droplet-PM**. Do not add tasks without PM approval.
> Ref: `SPEC.md` for full specification. `AGENTS.md` for coding rules. `DONE.md` for completed phases.
> Implementation agent: **Droplet-Engineer** (Senior Developer).
>
> **STATUS: All Milestones 0–21 COMPLETE. Phases 1–60.7, 63.1–63.2 complete. 369 unit tests passing (65+ suites). Build passing.**
> **PM deep audit #29 (2026-03-17): Full triple-audit (PM + Architect + Engineer). Owner instructions integrated.**
> **Priority order: 61.1 → 61.2 → 61.3 → 31.4 → 46.1 → 46.2 → 29.x → 26.x**
> **All Phase 26+ deferred work is ON HOLD until PM-approved.**

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

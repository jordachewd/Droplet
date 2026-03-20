# Droplet — TODO

> Prioritized, actionable development tasks. Each task max ~30 minutes.
> Governed by **Droplet-PM**. Do not add tasks without PM approval.
> Ref: `SPEC.md` for full specification. `AGENTS.md` for coding rules. `DONE.md` for completed phases.
> Implementation agent: **Droplet-Engineer** (Senior Developer).
>
> **STATUS: Milestone 22 COMPLETE. Milestone 23 Block A COMPLETE. All Phases 1–76 complete (incl. 63.1–63.2, 61.1, 68.1–68.4, 69.1, 70.1–70.2, 71.1–71.2, 76). 379 unit tests (66 suites). Build passing. Node.js 20.20.1 verified. Phases 76–78 archived to DONE (2026-03-20).**
> **PM deep audit #36 (2026-03-20): Triple-audit (PM + Architect + Engineer). Phase 76 archived. Premium video limit root cause confirmed. New priority sequence from owner instructions.**
> **Priority order: 80 (CRITICAL) → 73.x (CRITICAL) → 74.x (CRITICAL/HIGH) → 72.x (HIGH) → 31.4 → 75 → 46.x → 29.x → 26.x**

---

## Phase 80: Premium Video Limit Fix — CRITICAL

### 80.1 CRITICAL — Fix `PLAN_LIMITS.Premium.video` default

**Ref:** Owner instruction: "PREMIUM user has media limitations — gets error message about that — why?" Triple-audit root cause: `PLAN_LIMITS.Premium.video = 10` (same as Pro). Premium images = `-1` (unlimited), audio = `-1`, but video = `10`. This is a bug — Premium video should be `-1` (unlimited).

**Files:** `src/constants/plans.tsx`

**What to do:**

1. Change `PLAN_LIMITS.Premium.video` from `10` to `-1`.
2. Update SPEC.md Premium plan limits table to show `Unlimited` for video.
3. Run `npm run test` to verify no test regressions.

**Acceptance criteria:**

- [ ] `PLAN_LIMITS.Premium.video` is `-1`
- [ ] Premium video is now unlimited (matching images/audio)
- [ ] All tests pass
- [ ] Build passes

---

## Phase 72: WCAG 2.2 AA Accessibility Pass — HIGH

### 72.1 HIGH — Navigation and landmark accessibility

**Ref:** Owner instruction: "Entire app must be WCAG 2.2 AA accessibility standards compliant."

**Files:** `src/app/(admin)/layout.tsx`, `src/components/admin/admin-layout-shell.tsx`

**What to do:**

1. Add skip-to-content link in admin layout (missing — present in chat and public layouts).
2. Add `<main>` landmark element in admin layout.
3. Verify all layouts have proper landmark hierarchy (`<header>`, `<nav>`, `<main>`, `<footer>`).
4. Add `aria-current="page"` on active navigation links in header and sidebar.

**Acceptance criteria:**

- [ ] Skip-to-content link present in admin layout
- [ ] `<main>` landmark in admin layout
- [ ] `aria-current="page"` on active nav links
- [ ] Build passes

---

### 72.2 HIGH — Color contrast and opacity violations

**Ref:** Triple-audit finding: `opacity-60`, `opacity-65`, `opacity-70` on text elements likely fail WCAG AA 4.5:1 contrast ratio.

**Files:** Admin pages, landing page, sidebar, footer, settings descriptions, profile usage labels — all files with `opacity-60`/`opacity-65`/`opacity-70`/`opacity-85` on text

**What to do:**

1. Audit all `opacity-60`, `opacity-65`, `opacity-70` on text elements across the codebase.
2. Replace opacity-based text dimming with explicit color tokens that maintain AA contrast (e.g., `text-midnightBlue-300 dark:text-lavenderHaze-300` instead of `opacity-60`).
3. Verify key color combinations pass 4.5:1 for normal text, 3:1 for large text.
4. Test with a contrast checker tool.

**Acceptance criteria:**

- [ ] No `opacity-60` or `opacity-65` on text-bearing elements
- [ ] All text meets 4.5:1 contrast on its background
- [ ] Build passes

---

### 72.3 HIGH — Form label, ARIA, and semantic HTML audit

**Files:** All form components, modals, interactive elements

**What to do:**

1. Fix `AvatarMenu` `aria-expanded`: use `aria-expanded={open}` instead of `aria-expanded={open ? "true" : undefined}`.
2. Fix `ConfirmationModal` duplicate IDs: use `useId()` hook for unique `aria-labelledby`/`aria-describedby` IDs.
3. Add `aria-hidden="true"` to decorative Logo SVG in `app-logo.tsx` when text label is visible.
4. Audit all admin form inputs for proper `<label>` association.
5. Verify all `required` fields have `aria-required="true"`.
6. Verify error messages use `aria-live="polite"` or `role="alert"`.

**Acceptance criteria:**

- [ ] `aria-expanded` always has a value (not `undefined`)
- [ ] No duplicate element IDs across simultaneous components
- [ ] All form controls have associated labels
- [ ] Build passes

---

### 72.4 MEDIUM — Admin table semantics

**Ref:** Triple-audit finding: Admin tables use grid divs, not `<table>` — screen readers cannot navigate as table.

**Files:** `src/components/admin/users/admin-users-table.tsx`, `src/components/admin/transactions/admin-transactions-table.tsx`, `src/components/admin/website/admin-website-manager.tsx`

**What to do:**

1. Evaluate whether admin tables should use semantic `<table>`, `<thead>`, `<tbody>`, `<tr>`, `<th>`, `<td>` elements.
2. If using div-based grid, add ARIA table roles: `role="table"`, `role="row"`, `role="columnheader"`, `role="cell"`.
3. Add table caption/aria-label for context.

**Acceptance criteria:**

- [ ] Admin tables navigable by screen readers as data tables
- [ ] Column headers associated with cells
- [ ] Build passes

---

## Phase 73: Codebase Quality & Server-Side Operations — CRITICAL

### 73.1 CRITICAL — Fix all client component data-consumer violations

**Ref:** Owner instruction: "Components must be data consumers, especially 'use client' ones." Triple-audit found 5 violations.

**Files:** `src/components/chat/chat-header.tsx`, `src/components/chat/chat-wrapper.tsx`, `src/components/sections/plans-section.tsx`, `src/components/sections/faqs-section.tsx`, `src/components/chat/chat-body.tsx`

**What to do:**

1. `chat-header.tsx`: Remove `PERSONAS` import fallback. Ensure all parent Server Components always pass `personas` prop with effective config data. Make the prop required (no default).
2. `chat-wrapper.tsx`: Remove `PERSONAS`, `DEFAULT_PERSONA_ID`, `getPersona` imports. Receive full effective persona config as props from parent Server Component.
3. `plans-section.tsx`: Remove `plans as defaultPlans` import fallback. Make `plansData` prop required.
4. `faqs-section.tsx`: Remove hardcoded FAQ data import fallback. Make `faqsData` prop required.
5. `chat-body.tsx`: Remove `SUPPORT_EMAIL` and `STOP_REASON_MESSAGES` direct imports. Receive these values as props from parent (`chat-wrapper.tsx`), which receives them from parent Server Component.
6. Verify all parent Server Components pass the required effective config data.

**Acceptance criteria:**

- [ ] Zero direct constant imports in the 5 listed client components
- [ ] All data flows: Server Component → effective config resolver → prop → client component
- [ ] All props are required (no fallbacks to hardcoded constants)
- [ ] Build passes, all 379+ tests pass

---

### 73.2 MEDIUM — Minor re-render and code quality fixes

**Files:** `src/components/chat/sidebar/chat-sidebar-nav-v2.tsx`, `src/components/shared/plan-count-down.tsx`

**What to do:**

1. `chat-sidebar-nav-v2.tsx`: Evaluate if `useEffect → setConversationItems(historyItems)` can be replaced with direct prop usage (eliminate unnecessary state copy).
2. `plan-count-down.tsx`: Verify countdown uses current time reference correctly for each tick.

**Acceptance criteria:**

- [ ] No unnecessary state duplication
- [ ] Countdown displays correctly
- [ ] Build passes

---

## Phase 74: Admin Configurability Deepening — CRITICAL

### 74.1 HIGH — Support email admin-configurable

**Ref:** Owner instruction: "NO HARDCODED data." Triple-audit finding: support email hardcoded in `src/constants/support.ts`.

**Files:** `src/constants/support.ts`, `src/lib/utils/effective-plan-config.ts` or new utility, admin settings

**What to do:**

1. Add `admin.supportEmail` to AppSetting.
2. Create or extend resolver to read from AppSetting with fallback to constant.
3. Wire admin settings UI to edit support email.
4. Replace hardcoded usage with resolver in all consuming files.

**Acceptance criteria:**

- [ ] Support email admin-configurable
- [ ] Fallback to constant when no override
- [ ] Build passes

---

### 74.2 MEDIUM — FAQ content admin-configurable

**Ref:** Owner instruction: "NO HARDCODED data." FAQ questions/answers are hardcoded in `src/constants/faqs.tsx`.

**Files:** `src/constants/faqs.tsx`, admin settings

**What to do:**

1. Add `admin.faqOverrides` to AppSetting.
2. Create `getEffectiveFaqConfig()` that merges admin overrides with defaults.
3. Wire admin settings UI to edit FAQ questions and answers.
4. Audit trail for FAQ changes.

**Acceptance criteria:**

- [ ] FAQ content admin-editable
- [ ] Fallback to defaults
- [ ] Build passes

---

### 74.3 LOW — Content layer admin-configurability assessment

**Ref:** Triple-audit identified remaining hardcoded content: hero copy, landing page cards, about page narrative, navigation labels, footer links, stop reason messages.

**Files:** Assessment only — no code changes.

**What to do:**

1. Assess each content area: can it use the existing `PublicPage` model or does it need AppSetting?
2. Identify which content areas provide the highest admin value.
3. Propose a phased approach for remaining content configurability.

**Acceptance criteria:**

- [ ] Written assessment with recommendation per content area
- [ ] PM-approved priority for each area

---

## Phase 75: `/faqs` Documentation Cleanup — LOW

### 75.1 LOW — Remove stale `/faqs` references from docs and tests

**Ref:** PM audit #35 — `/faqs` route removed. References remain in E2E tests.

**Files:** `tests/e2e/auth-boundaries.spec.ts`, `tests/e2e/public-pages.spec.ts`

**What to do:**

1. Remove or update `/faqs` navigation test in `auth-boundaries.spec.ts`.
2. Remove or update `/faqs` assertions in `public-pages.spec.ts`.
3. Verify no other stale `/faqs` references in test files.

**Acceptance criteria:**

- [ ] Zero `/faqs` references in test assertions
- [ ] E2E tests pass (for non-connectivity-related specs)

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

> **ON HOLD until all HIGH/CRITICAL-priority phases complete.**

### 29.1 Implement Zod schema validation across the app

### 29.2 Implement Zustand for client-side state management

---

## Phase 26: Deferred Features — ON HOLD

### 26.1 Persona-aware media generation prompts (TD-AI-09)

### 26.2 Implement Stripe subscription mode — auto-renewal (TD-PLAN-01)

---

> **Completed phases** are archived in [`DONE.md`](DONE.md).
> All phases through 76 complete (incl. 63.1–63.2, 61.1, 68.1–68.4, 69.1, 70.1–70.2, 71.1–71.2, 76). All Milestones 0–22 COMPLETE. Milestone 23 Block A COMPLETE.
> Phase 10–12 superseded (see DONE.md for mapping).

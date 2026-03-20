# Droplet — TODO

> Prioritized, actionable development tasks. Each task max ~30 minutes.
> Governed by **Droplet-PM**. Do not add tasks without PM approval.
> Ref: `SPEC.md` for full specification. `AGENTS.md` for coding rules. `DONE.md` for completed phases.
> Implementation agent: **Droplet-Engineer** (Senior Developer).
>
> **STATUS: Milestone 22 COMPLETE. Milestone 23 Block A COMPLETE. All Phases 1–71.2 complete (incl. 63.1–63.2, 61.1, 68.1–68.4, 69.1, 70.1–70.2, 71.1–71.2). 379 unit tests (66 suites). Build passing. Node.js 20.20.1 verified. Phase 76 archived to DONE (2026-03-20).**
> **PM deep audit #35 (2026-03-19): Triple-audit (PM + Architect + Engineer). Phases 68.4, 71.1, 71.2, 70.2 archived. New priority sequence from owner instructions.**
> **Priority order: 72.x → 73.x → 74.x → 31.4 → 75 → 46.x → 29.x → 26.x**
> **HIGH: Phase 72 (WCAG 2.2 AA). CRITICAL: Phase 73 (codebase quality/data-consumer discipline). CRITICAL: Phase 74 (admin configurability audit). LOW: remaining.**

---

## Phase 72: WCAG 2.2 AA Accessibility Pass — HIGH

### 72.1 HIGH — Navigation and landmark accessibility

**Ref:** Owner instruction: "Entire app must be WCAG 2.2 AA accessibility standards compliant."

**Files:** `src/components/layout/header.tsx`, `src/components/layout/footer.tsx`, `src/app/(chat)/layout.tsx`

**What to do:**

1. Add `aria-label="Main navigation"` to `<nav>` in header.
2. Add responsive mobile navigation (hamburger menu for `md:hidden`).
3. Wrap footer links in `<nav aria-label="Footer navigation">`.
4. Add skip-to-content link at the top of the page layout.
5. Ensure semantic `<footer>` element is used (not `<section>`).

**Acceptance criteria:**

- [ ] All `<nav>` elements have `aria-label`
- [ ] Mobile navigation exists and is keyboard-accessible
- [ ] Skip-to-content link present
- [ ] Footer uses semantic element
- [ ] Build passes

---

### 72.2 HIGH — Image alt text and focus indicators

**Files:** `src/components/sections/hero-section.tsx`, `src/components/shared/persona-card.tsx`, all components with `<Image>`

**What to do:**

1. Replace `alt="hero"` with descriptive alt text in hero section.
2. Audit all `<Image>` components for meaningful alt text.
3. Verify all interactive elements have visible focus indicators (`:focus-visible`).
4. Verify color contrast ratios meet WCAG AA (4.5:1 for text, 3:1 for large text).

**Acceptance criteria:**

- [ ] No generic alt text (`alt="hero"`, `alt="image"`)
- [ ] All interactive elements have visible focus ring
- [ ] Key color combinations pass contrast ratio check
- [ ] Build passes

---

### 72.3 MEDIUM — Form label and ARIA audit

**Files:** All form components in `src/components/`

**What to do:**

1. Audit all `<input>`, `<select>`, `<textarea>` for associated `<label>` or `aria-label`.
2. Verify all required fields have `aria-required="true"`.
3. Verify form error messages are announced via `aria-live="polite"` or `role="alert"`.
4. Verify all dialog/modal components have `aria-modal="true"` and focus trap.

**Acceptance criteria:**

- [ ] All form controls have labels
- [ ] Error messages accessible to screen readers
- [ ] Modal focus trapping works
- [ ] Build passes

---

## Phase 73: Codebase Quality & Server-Side Operations — CRITICAL

### 73.1 CRITICAL — Verify all client components are data consumers

**Ref:** Owner instruction: "Components must be data consumers, especially 'use client' ones."

**Files:** All `"use client"` components

**What to do:**

1. Verify `chat-header.tsx` always receives `personas` prop and does not fall back to hardcoded `PERSONAS`.
2. Verify `chat-wrapper.tsx` receives effective persona data from parent Server Component.
3. Verify `plans-section.tsx` always receives `plansData` prop.
4. Verify `faqs-section.tsx` always receives `faqsData` prop.
5. Remove hardcoded fallback constants from client components where callers always pass resolved data.

**Acceptance criteria:**

- [ ] Zero direct `PERSONAS` imports in client components (effective config passed as props)
- [ ] All client components receive data as props from Server Components
- [ ] Build passes, all tests pass

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
> All phases through 71.2 complete (incl. 63.1–63.2, 61.1, 68.1–68.4, 69.1, 70.1–70.2, 71.1–71.2). All Milestones 0–22 COMPLETE. Milestone 23 Block A COMPLETE.
> Phase 10–12 superseded (see DONE.md for mapping).

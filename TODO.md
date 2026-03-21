# Droplet — TODO

> Prioritized, actionable development tasks. Each task max ~30 minutes.
> Governed by **Droplet-PM**. Do not add tasks without PM approval.
> Ref: `SPEC.md` for full specification. `AGENTS.md` for coding rules. `DONE.md` for completed phases.
> Implementation agent: **Droplet-Engineer** (Senior Developer).
>
> **STATUS: PM audit #45 (2026-03-21). All Phases 1–96.3, 99.1, 99.3, 100.1–100.3, 95-R complete. 393 unit tests (64 suites). All 6 gates GREEN. Build passing. Node.js 24.12.0 runtime.**
> **Coverage: 76.27/65.31/79.64/76.67 vs 76/65/79/76 (MET).**
> **Owner directive: FULL TESTING INFRASTRUCTURE REBUILD from scratch. TDD methodology. No hardcoded data. Code reuse maximized. WCAG 2.2 AA compliance.**
> **Priority order: 101 (CRITICAL WCAG viewport) → 100.4 (HIGH isObjectRecord) → 102 (HIGH resource leak) → 96.4 (HIGH TDD) → 99.5 (HIGH WCAG) → 72.4 (HIGH WCAG) → 97.1 (HIGH WCAG E2E) → 96.5–96.8 (HIGH/MEDIUM TDD) → 99.2 (MEDIUM) → 99.4 (MEDIUM knip) → 73.3 (MEDIUM) → 98 (HIGH coverage) → 74.2 → 87 → 29.x → 26.x**

---

## ~~COMPLETED — Phases 94–100.3~~

> All moved to DONE.md. Phase 94 (config hardening), Phase 95 (E2E spec remediation), Phase 95-R (E2E Chromium fix), Phase 96.1 (merge conversation-stop), Phase 96.2 (reduce mock scope), Phase 96.3 (webhook edge-case tests), Phase 99.1 (aria-live), Phase 99.3 (stable keys), Phase 100.1–100.3 (code deduplication).

---

## CRITICAL — WCAG Viewport Zoom Restriction (PM audit #45, Triple-Audit)

### Phase 101: Remove viewport zoom restriction — CRITICAL

> All 3 audits independently confirmed: `maximumScale: 1` and `userScalable: false` in `layout.tsx` prevents mobile zoom — WCAG 2.2 AA SC 1.4.4 (Resize Text) FAILURE. Legal and accessibility release blocker.

**File:** `src/app/layout.tsx`

**What to do:**

1. Remove `maximumScale: 1` and `userScalable: false` from the viewport metadata.
2. Or change to `maximumScale: 5` and `userScalable: true`.

**Acceptance criteria:**

- [ ] Viewport allows user zoom on mobile
- [ ] WCAG 2.2 AA SC 1.4.4 satisfied
- [ ] Build passes

---

## HIGH — Code Deduplication Missed File (PM audit #45, Triple-Audit)

### Phase 100.4: Fix 4th `isObjectRecord` duplicate — HIGH

> Phase 100.1 extracted `isObjectRecord` to `type-guards.ts` but missed a 4th local copy in `effective-model-config.ts`. TD-REUSE-01 not fully resolved until this is fixed.

**File:** `src/lib/utils/effective-model-config.ts`

**What to do:**

1. Import `isObjectRecord` from `@/lib/utils/type-guards`.
2. Delete the local `function isObjectRecord(...)` definition (~line 22).

**Acceptance criteria:**

- [ ] Zero local `isObjectRecord` definitions remain
- [ ] TD-REUSE-01 fully resolved
- [ ] Build passes, tests pass

---

## HIGH — Resource Leak Fix (PM audit #45, Engineer Audit)

### Phase 102: Add AbortController to chat streaming fetch — HIGH

> Chat streaming `fetch("/api/openai")` in `chat-wrapper.tsx` has no `AbortController`. If user navigates away during stream, `ReadableStreamDefaultReader` continues consuming indefinitely, leaking HTTP connections.

**File:** `src/components/chat/chat-wrapper.tsx`

**What to do:**

1. Create `AbortController` before fetch call.
2. Pass `signal: controller.signal` to `fetch()` options.
3. Add cleanup: call `controller.abort()` in the `useEffect` return or component unmount path.
4. Handle `AbortError` in catch block (do not treat as user-visible error).

**Acceptance criteria:**

- [ ] Streaming fetch uses AbortController
- [ ] Navigation during streaming cleanly cancels the fetch
- [ ] No resource leak on unmount
- [ ] Build passes

---

## HIGH — Unit Test Quality (TDD Rebuild Continues)

### Phase 96: Unit Test Depth Improvement — HIGH

> ~~Phases 96.1–96.3 COMPLETE (moved to DONE.md).~~ Remaining: 96.4–96.8.
> All new tests MUST follow TDD methodology.

#### 96.4 HIGH — Add admin authorization failure tests

**Files:** `tests/unit/actions/admin-audit-trail.test.ts` or new file

**What to do (TDD):**

1. Test: non-admin user calling admin action → rejected (throws or returns error).
2. Test: unauthenticated user calling admin action → rejected.
3. Test: admin user calling admin action → succeeds (audit logged).

**Acceptance criteria:**

- [ ] Authorization rejection tested
- [ ] All 3 paths (no auth, wrong role, correct role) tested
- [ ] Tests pass

#### 96.5 HIGH — Add upload file size validation test

**File:** `tests/unit/routes/upload-route.test.ts`

**What to do (TDD):**

1. Test: oversized file (> limit) → rejected with proper error.
2. Test: exactly-at-limit file → accepted.
3. Test: empty file → rejected.

**Acceptance criteria:**

- [ ] Size boundary tests added
- [ ] Tests pass

#### 96.6 MEDIUM — Add Zustand store tests

**Files:** New: `tests/unit/stores/` — one file per store

**What to do (TDD):**

1. Test each store's initial state.
2. Test each store's actions (set, reset, toggle).
3. Test state transitions and edge cases.

**Acceptance criteria:**

- [ ] All Zustand stores tested
- [ ] State transitions verified
- [ ] Tests pass

#### 96.7 MEDIUM — Add component tests for untested components

**Files:** New tests for: `confirmation-modal`, `plan-card`, `persona-card`, `checkout-form`

**What to do (TDD):**

1. `confirmation-modal.test.tsx`: open/close, confirm/cancel callbacks, Escape key, backdrop click.
2. `plan-card.test.tsx` (or expand `plans.test.ts`): renders price, title, features list, CTA.
3. `persona-card.test.tsx`: renders persona info, trial badge, click handler.
4. `checkout-form.test.tsx`: renders, submit handler, loading state.

**Acceptance criteria:**

- [ ] 4 new component test files
- [ ] Behavioral tests (user interaction), not just render checks
- [ ] Tests pass

#### 96.8 MEDIUM — Expand user model tests

**File:** `tests/unit/models/user-model.test.ts`

**What to do (TDD):**

1. Test required field validation (clerkId, username, email, role).
2. Test plan subdoc defaults (Lite plan).
3. Test index existence (clerkId unique, email indexed).
4. Test plan transition rules if applicable.

**Acceptance criteria:**

- [ ] At least 6 tests (up from 1)
- [ ] All schema constraints validated
- [ ] Tests pass

---

## HIGH — E2E Quality Rebuild (PM audit #42, Triple-Audit)

### Phase 97: E2E Test Depth Improvement — HIGH

#### 97.1 HIGH — Add WCAG accessibility E2E via @axe-core/playwright

**Files:** New: `tests/e2e/accessibility.spec.ts`, `package.json`

**What to do:**

1. Install `@axe-core/playwright` as devDependency.
2. Create `accessibility.spec.ts` that runs axe against: `/`, `/about`, `/plans`, `/personas`, `/privacy`, `/cookies`, `/terms`.
3. Each route check: `const results = await new AxeBuilder({ page }).analyze()` then `expect(results.violations).toEqual([])`.
4. Start with public pages. App pages can be added later.

**Acceptance criteria:**

- [ ] `@axe-core/playwright` installed
- [ ] All 7 public routes scanned
- [ ] Results reported (violations list)
- [ ] Known violations documented (not silently passing)

#### 97.2 MEDIUM — Add admin settings → app propagation E2E

**File:** New: `tests/e2e/admin-settings-propagation.spec.ts`

**What to do:**

1. Test: Admin changes support email in settings → public plans page shows new email.
2. Test: Admin changes plan price → plans page shows new price.
3. Revert changes in `afterAll`.

**Acceptance criteria:**

- [ ] Settings-to-app propagation verified end-to-end
- [ ] Test data cleaned up

#### 97.3 MEDIUM — Deduplicate withMongoConnection in conversation-lifecycle

**File:** `tests/e2e/conversation-lifecycle.spec.ts`

**What to do:**

1. Replace local `withMongoConnection` with import from `tests/e2e/utils/mongo.ts`.

**Acceptance criteria:**

- [ ] Zero local Mongo helper duplication
- [ ] Tests pass

---

## HIGH — Coverage Gate Achievement (PM audit #42)

### Phase 98: Coverage Improvement — HIGH

> Drive coverage from 76.28/65.32/79.75/76.68 toward 82/78/82/82+. Branch coverage (65%) is the biggest gap.

#### 98.1 HIGH — Close branch coverage gap

**Approach:** Run `npm run test:coverage` with `lcov` reporter (after Phase 94.1), identify files with lowest branch coverage, add targeted tests. Priority files: route handlers (many conditional branches), action files (error handling branches), utility functions with switch/ternary logic.

**Method:** Iterative. Run coverage → identify gaps → write tests → repeat. Target: branches 78%+.

**Acceptance criteria:**

- [ ] Branch coverage >= 78%
- [ ] No coverage gained through mock-wiring tests
- [ ] Tests validate actual branching behavior

#### 98.2 HIGH — Close statement/line coverage gap

**Approach:** Same iterative method. Target: statements 82%+, lines 82%+.

**Acceptance criteria:**

- [ ] Statement coverage >= 82%
- [ ] Line coverage >= 82%
- [ ] `npm run test:coverage` passes

#### 98.3 HIGH — Raise thresholds to match achieved coverage

**File:** `vitest.config.mts`

**What to do:** After 98.1 and 98.2 are done, raise thresholds to match new coverage floor.

**Acceptance criteria:**

- [ ] Thresholds raised to match or exceed achieved coverage
- [ ] `npm run test:coverage` passes with new thresholds
- [ ] Gate F validation includes both `npm run test` and `npm run test:coverage`

---

## MEDIUM — WCAG & Code Quality

### Phase 72.4 HIGH — Admin table semantics (promoted PM audit #45)

**Files:** `src/components/admin/users/admin-users-table.tsx`, `src/components/admin/transactions/admin-transactions-table.tsx`, `src/components/admin/website/admin-website-manager.tsx`

**What to do:**

1. Convert div-based grid tables to semantic `<table>` or add ARIA table roles (`role="grid"`, `role="row"`, `role="columnheader"`, `role="cell"`).
2. Add table caption/aria-label.
3. Maintain existing styling with Tailwind on semantic elements.

**Acceptance criteria:**

- [ ] Admin tables navigable by screen readers as data tables
- [ ] WCAG 2.2 AA Success Criterion 1.3.1 satisfied
- [ ] Build passes and visual appearance unchanged

### Phase 73.3 MEDIUM — Admin client component data-consumer violations

**Files:** `src/components/admin/admin-sidebar.tsx`, `src/components/admin/settings/admin-personas-section.tsx`, `src/components/admin/settings/admin-models-section.tsx`

**What to do:**

1. Remove direct constant imports for dynamic data.
2. Pass data from server parent layout/page as props.

**Acceptance criteria:**

- [ ] Zero direct constant imports for dynamic data in admin client components
- [ ] Build passes

---

## HIGH — Triple-Audit Findings (PM audit #43 → Updated PM audit #45)

### Phase 99: Code Quality & WCAG Fixes — HIGH/MEDIUM

> Findings from PM audit #43–#45 triple-audits. ~~99.1, 99.3 COMPLETE (moved to DONE.md).~~ Remaining: 99.2, 99.4, 99.5.

#### 99.2 MEDIUM — Migrate ConfirmationModal to native `<dialog>`

**File:** `src/components/shared/confirmation-modal.tsx`

**What to do:**

1. Replace custom `role="dialog"` div with native `<dialog>` element using `showModal()`/`close()`.
2. Native `<dialog>` provides: focus trapping, ESC to close, modal backdrop, inert background.
3. Remove manual focus trap code, manual ESC handler, manual backdrop click handler.
4. Test with keyboard navigation and screen reader.

**Acceptance criteria:**

- [ ] Uses native `<dialog>` element
- [ ] Manual focus trap removed
- [ ] Keyboard and screen reader accessible
- [ ] Build passes, existing tests pass

#### 99.4 MEDIUM — Knip cleanup: dead exports + unused test factories (PM audit #45)

**Files:** `src/constants/faqs.tsx`, `tests/unit/constants/faqs.test.ts`, `tests/unit/factories.ts`

**What to do:**

1. Remove `export const faqs = buildFaqs()` from `src/constants/faqs.tsx` (dead export).
2. Update `faqs.test.ts` to call `buildFaqs()` directly with test data and verify interpolation.
3. Remove or consume unused test factory exports: `createTestTransaction`, `createTestEntitlements` (Phase 96.3 tests do not consume these despite availability).
4. Remove `export` from `createMessageId` in `message-id.ts` — it is only used internally by `ensureMessageHasId`.

**Acceptance criteria:**

- [ ] Dead `faqs` export removed
- [ ] Unused test factory exports removed or consumed
- [ ] `createMessageId` no longer exported
- [ ] `npm run knip` reports 0 unused exports
- [ ] Tests pass

#### 99.5 HIGH — AudioPlayer ARIA improvements (PM audit #45, Triple-Audit)

**File:** `src/components/shared/audio-player.tsx`

**What to do:**

1. Add `aria-label="Play"` / `aria-label="Pause"` (toggle based on state) to the icon-only play/pause button.
2. Add ARIA semantics to progress bar (role, aria-valuenow, aria-valuemin, aria-valuemax, aria-label).
3. Fix 11 ESLint warnings (all `set-state-in-effect` in this file) — extract state updates into stable callbacks.

**Acceptance criteria:**

- [ ] Play/pause button has accessible name
- [ ] Progress bar has ARIA semantics (role="progressbar" or role="slider")
- [ ] ESLint warnings in audio-player.tsx resolved
- [ ] Build passes

---

## LOW — Remaining Work

### Phase 74.2 MEDIUM — FAQ content admin-configurable

**Files:** `src/constants/faqs.tsx`, admin settings

### Phase 87 LOW — createTaskSchema strict mode

**File:** `src/lib/actions/task.actions.tsx`

### Phase 73.2 LOW — Minor re-render and code quality fixes

**Files:** `src/components/chat/sidebar/chat-sidebar-nav-v2.tsx`, `src/components/shared/plan-count-down.tsx`

### Phase 74.3 LOW — Content layer admin-configurability assessment

### Phase 46.1 LOW — Admin error boundary

### Phase 46.2 LOW — Silent catch logging

---

## ON HOLD — Deferred

### Phase 29.x — Zod/Zustand app-wide modernization

### Phase 26.x — Persona-aware media prompts, Stripe auto-renewal

---

> **Completed phases** archived in [`DONE.md`](DONE.md).
> All phases through 100.3 complete (including 86, 88–96.3, 99.1, 99.3, 100.1–100.3, 95-R).
> All Milestones 0–24 COMPLETE. Milestone 25 IN PROGRESS.

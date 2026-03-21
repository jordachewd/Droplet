# Droplet — TODO

> Prioritized, actionable development tasks. Each task max ~30 minutes.
> Governed by **Droplet-PM**. Do not add tasks without PM approval.
> Ref: `SPEC.md` for full specification. `AGENTS.md` for coding rules. `DONE.md` for completed phases.
> Implementation agent: **Droplet-Engineer** (Senior Developer).
>
> **STATUS: PM audit #46 (2026-03-21). All Phases 1–102 complete (including 72.4, 96.4, 97.1, 99.5, 100.4, 101, 102). 400 unit tests (65 suites). All 6 gates GREEN. Build passing. Node.js 24.12.0 runtime.**
> **E2E: 108 passed, 0 failed, 25 skipped.**
> **Coverage: 76.27/65.31/79.64/76.67 vs 76/65/79/76 (MET).**
> **Owner directive: FULL TESTING INFRASTRUCTURE REBUILD from scratch. TDD methodology. No hardcoded data. Code reuse maximized. WCAG 2.2 AA compliance. Full admin configurability.**
> **Priority order: 99.4 (HIGH knip) → 103 (HIGH WCAG color contrast) → 96.5 (HIGH TDD) → 96.6 (MEDIUM Zustand tests) → 96.7 (MEDIUM component tests) → 96.8 (MEDIUM user model tests) → 73.3 (MEDIUM data-consumer) → 99.2 (MEDIUM native dialog) → 98 (HIGH coverage) → 74.2 (MEDIUM FAQ admin) → 104 (MEDIUM landing admin) → 87 (LOW) → 29.x → 26.x**

---

## ~~COMPLETED — Phases 94–102~~

> All moved to DONE.md. Phases 94 (config hardening), 95 (E2E spec remediation), 95-R (E2E Chromium fix), 96.1 (merge conversation-stop), 96.2 (reduce mock scope), 96.3 (webhook edge-case tests), 96.4 (admin auth tests), 97.1 (WCAG E2E), 99.1 (aria-live), 99.3 (stable keys), 99.5 (AudioPlayer ARIA), 100.1–100.4 (code deduplication), 101 (viewport zoom), 102 (AbortController).

---

## HIGH — Knip Cleanup (Owner directive: keep clean)

### Phase 99.4: Knip cleanup — dead exports + unused files — HIGH

> `npm run knip` reports 5 unused files and 3 unused exports. Owner directive: knip must stay clean.

**Files:**

- Root: `_update-plan.mjs`, `_update-step1.js`, `_update-step2.js`, `_update-step3.js`, `_update-step4.js` (old DB migration scripts)
- `tests/unit/test-support/factories.ts` (unused exports: `createTestTransaction`, `createTestEntitlements`)
- `src/lib/utils/message-id.ts` (unused export: `createMessageId`)

**What to do:**

1. Delete 5 unused root migration scripts (or move to `scripts/archive/` if historical value).
2. Remove `export` from `createTestTransaction` and `createTestEntitlements` in `factories.ts` — OR consume them in upcoming Phase 96.5+ tests.
3. Remove `export` from `createMessageId` in `message-id.ts` — only used internally by `ensureMessageHasId`.
4. Verify `npm run knip` reports 0 findings.

**Acceptance criteria:**

- [ ] `npm run knip` reports 0 unused files and 0 unused exports
- [ ] Build passes, tests pass

---

## HIGH — WCAG Color Contrast Fixes (PM audit #46, axe-core findings)

### Phase 103: Fix WCAG color contrast violations — HIGH

> axe-core E2E (Phase 97.1) identified `color-contrast` violations on `/` and `/plans` pages, and `heading-order` on `/personas`. These are tracked as known violations but must be fixed for WCAG 2.2 AA compliance (release blocker).

#### 103.1 HIGH — Fix color contrast on landing page (`/`)

**File:** `src/components/sections/landing-page.tsx`, `src/app/globals.css`

**What to do:**

1. Run axe analysis to identify exact elements with contrast failures.
2. Adjust text/background color combinations to meet WCAG AA 4.5:1 ratio for normal text, 3:1 for large text.
3. Update known violations in `accessibility.spec.ts` — remove `color-contrast` from `/` once fixed.

**Acceptance criteria:**

- [ ] `/` passes axe color-contrast check
- [ ] WCAG AA contrast ratios met
- [ ] Build passes

#### 103.2 HIGH — Fix color contrast on plans page (`/plans`)

**File:** `src/app/(public)/plans/page.tsx`, related section components

**What to do:**

1. Same approach as 103.1 for `/plans` route.
2. Update known violations in `accessibility.spec.ts`.

**Acceptance criteria:**

- [ ] `/plans` passes axe color-contrast check
- [ ] Build passes

#### 103.3 MEDIUM — Fix heading order on personas page (`/personas`)

**File:** `src/app/(public)/personas/page.tsx`, persona card components

**What to do:**

1. Ensure heading levels are sequential (no skipping from h2 to h4, etc.).
2. Update known violations in `accessibility.spec.ts`.

**Acceptance criteria:**

- [ ] `/personas` passes axe heading-order check
- [ ] Build passes

#### 103.4 MEDIUM — Fix duplicate landmark violations

**Files:** Layout components (`src/app/layout.tsx`, route layouts)

**What to do:**

1. Investigate `landmark-main-is-top-level`, `landmark-no-duplicate-main`, `landmark-unique` violations.
2. Ensure only one `<main>` element exists per page.
3. Update known violations in `accessibility.spec.ts`.

**Acceptance criteria:**

- [ ] All public routes pass landmark axe checks
- [ ] `accessibility.spec.ts` known violations list reduced to zero (or justified exceptions only)
- [ ] Build passes

---

## HIGH — Unit Test Quality (TDD Rebuild Continues)

### Phase 96: Unit Test Depth Improvement — HIGH

> ~~Phases 96.1–96.4 COMPLETE (moved to DONE.md).~~ Remaining: 96.5–96.8.
> All new tests MUST follow TDD methodology.

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

### Phase 97: E2E Test Depth Improvement — MEDIUM

> ~~97.1 COMPLETE (moved to DONE.md).~~ Remaining: 97.2, 97.3.

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

## MEDIUM — Code Quality

### Phase 73.3 MEDIUM — Admin client component data-consumer violations

**Files:** `src/components/admin/admin-sidebar.tsx`, `src/components/admin/settings/admin-personas-section.tsx`, `src/components/admin/settings/admin-models-section.tsx`

**What to do:**

1. Remove direct constant imports for dynamic data.
2. Pass data from server parent layout/page as props.

**Acceptance criteria:**

- [ ] Zero direct constant imports for dynamic data in admin client components
- [ ] Build passes

---

## MEDIUM — Triple-Audit Findings (PM audit #43–#46)

### Phase 99: Code Quality Fixes — MEDIUM

> Findings from PM audit #43–#46 triple-audits. ~~99.1, 99.3, 99.5 COMPLETE (moved to DONE.md).~~ Remaining: 99.2.

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

---

## MEDIUM — Admin Configurability (Owner directive: NO hardcoded data)

### Phase 104: Landing page content admin-configurable — MEDIUM

> Owner directive: "NO HARDCODED data — everything MUST be fully configurable from ADMIN panel." Landing page feature cards, how-it-works steps, and hero copy are currently loaded from static JSON/constants, not admin-editable.

#### 104.1 MEDIUM — Landing page feature cards admin-editable

**Files:** Admin settings, `src/lib/utils/effective-website-config.ts` (new or extend), landing page Server Component

**What to do:**

1. Add `admin.landingFeatureCards` AppSetting field.
2. Create `getEffectiveLandingFeatureCards()` resolver with fallback to current constants.
3. Admin settings UI for editing feature card titles/descriptions/icons.
4. Landing page Server Component reads from resolver instead of static import.

**Acceptance criteria:**

- [ ] Feature cards admin-editable from `/admin/settings`
- [ ] Fallback to defaults if no admin override
- [ ] Build passes

#### 104.2 MEDIUM — Hero and about copy admin-editable

**Files:** Same pattern as 104.1

**What to do:**

1. Add `admin.heroCopy` and `admin.aboutCopy` AppSetting fields.
2. Resolvers with fallback to current static content.
3. Admin UI for editing.

**Acceptance criteria:**

- [ ] Hero and about text admin-editable
- [ ] Build passes

### Phase 74.2 MEDIUM — FAQ content admin-configurable

**Files:** `src/constants/faqs.tsx`, admin settings

**What to do:**

1. Add `admin.faqContent` AppSetting field.
2. Create `getEffectiveFaqContent()` resolver with fallback to `buildFaqs()`.
3. Admin UI for adding/editing/removing FAQ entries.

**Acceptance criteria:**

- [ ] FAQ questions and answers admin-editable from `/admin/settings`
- [ ] Fallback to defaults
- [ ] Build passes

---

## LOW — Remaining Work

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
> All phases through 102 complete (including 72.4, 86, 88–96.4, 97.1, 99.1, 99.3, 99.5, 100.1–100.4, 101, 102).
> All Milestones 0–24 COMPLETE. Milestone 25 IN PROGRESS.

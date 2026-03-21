# Droplet — TODO

> Prioritized, actionable development tasks. Each task max ~30 minutes.
> Governed by **Droplet-PM**. Do not add tasks without PM approval.
> Ref: `SPEC.md` for full specification. `AGENTS.md` for coding rules. `DONE.md` for completed phases.
> Implementation agent: **Droplet-Engineer** (Senior Developer).
>
> **STATUS: PM audit #44 (2026-03-21). All Phases 1–96.2 complete. 390 unit tests (64 suites). Build passing. Node.js 24.12.0 runtime.**
> **Coverage: 76.27/65.31/79.64/76.67 vs 76/65/79/76 (MET). Gates 1–4 + 6 GREEN. Gate 5 (E2E) NEEDS INVESTIGATION — 4 Chromium failures reported.**
> **Owner directive: FULL TESTING INFRASTRUCTURE REBUILD from scratch. TDD methodology. No hardcoded data. Code reuse maximized. WCAG 2.2 AA compliance.**
> **Priority order: E2E Investigation (BLOCKER) → 100.1–100.3 (HIGH quick wins) → 99.1 + 99.3 (HIGH WCAG) → 96.3 (HIGH TDD) → 96.4 (HIGH TDD) → 97.1 (HIGH) → 96.5–96.8 (HIGH/MEDIUM) → 99.2 (MEDIUM) → 72.4 (MEDIUM) → 73.3 (MEDIUM) → 98 (HIGH) → 74.2 → 87 → 29.x → 26.x**

---

## ~~COMPLETED — Phases 94–96.2~~

> All moved to DONE.md. Phase 94 (config hardening), Phase 95 (E2E spec remediation), Phase 96.1 (merge conversation-stop), Phase 96.2 (reduce mock scope — pure utilities un-mocked).

---

## BLOCKER — E2E Regression Investigation (PM audit #44)

### Phase 95-R: Investigate 4 E2E Chromium Failures — BLOCKER

> 4 E2E specs reported failing: `chat-app-shell`, `error-handling`, `plans-public`, `public-pages`. These were fixed in Phase 95.1–95.4 and verified passing (87 E2E, 0 failed). Phase 96.2 only changed unit test files — cannot be source of E2E regression. Must determine: environment issue, test flakiness, or actual regression.

**What to do:**

1. Run `npm run test:e2e` with `--reporter=list` to capture exact failure messages.
2. Compare failures against Phase 95 structural assertion changes.
3. If environment/timing: fix with Playwright timeout/retry config or test stability improvements.
4. If actual regression: identify source, fix it.
5. All 6 validation gates must be GREEN before any new work proceeds.

**Acceptance criteria:**

- [ ] Root cause identified for all 4 failures
- [ ] All 4 specs passing again
- [ ] `npm run test:e2e` shows 0 failures

---

## HIGH — Code Deduplication (PM audit #44, Owner Directive: Reuse Code)

### Phase 100: Extract Duplicated Code — HIGH

> Triple-audit independently confirmed 3 patterns duplicated 3-4x each. Owner directive: "RE-USE repetitive code as much as possible."

#### 100.1 HIGH — Extract `isObjectRecord` to shared utility

**Files:** `src/lib/utils/effective-plan-config.ts`, `src/lib/utils/effective-persona-config.ts`, `src/components/admin/settings/normalize-admin-settings.ts`

**What to do:**

1. Create `src/lib/utils/type-guards.ts` with shared `isObjectRecord()` function.
2. Replace all 3 local definitions with import from shared utility.
3. Add `import "server-only"` if file is server-only (check usage in client components — `normalize-admin-settings.ts` is used client-side, so extract to a non-server-only shared file).

**Acceptance criteria:**

- [ ] Single definition of `isObjectRecord`
- [ ] All 3 files import from shared location
- [ ] Build passes, tests pass

#### 100.2 HIGH — Extract `VALID_PERSONA_ID_SET` to shared export

**Files:** `src/lib/actions/admin.actions.tsx`, `src/lib/utils/effective-persona-access.ts`, `src/lib/utils/effective-persona-config.ts`, `src/components/admin/settings/normalize-admin-settings.ts`

**What to do:**

1. Export `VALID_PERSONA_ID_SET` from `src/constants/assistant-personas.tsx` (already imports PERSONAS).
2. Replace all 4 local `new Set(PERSONAS.map(...))` with import from shared export.

**Acceptance criteria:**

- [ ] Single `VALID_PERSONA_ID_SET` definition
- [ ] All 4 files import from shared location
- [ ] Build passes, tests pass

#### 100.3 HIGH — Extract `legalReviewDisclaimer` to shared constant

**Files:** `src/constants/privacy-data.ts`, `src/constants/cookies-data.ts`, `src/constants/terms-data.ts`

**What to do:**

1. Create shared export in `src/constants/legal-shared.ts` (or add to one of the existing files as the canonical source).
2. Import from shared location in all 3 files.

**Acceptance criteria:**

- [ ] Single definition of `legalReviewDisclaimer`
- [ ] All 3 consumer files import from shared location
- [ ] Build passes, tests pass

---

## HIGH — WCAG Quick Wins (PM audit #44, Owner Directive: WCAG 2.2 AA)

### Phase 99: WCAG Quick Fixes — HIGH

> Findings from PM audit #44 triple-audit. Quick wins with high WCAG impact.

#### 99.1 HIGH — Add `aria-live` region to chat messages

**File:** `src/components/chat/chat-body.tsx`

**What to do:**

1. Add `aria-live="polite"` to the chat message container so screen readers announce incoming AI responses.
2. WCAG 2.2 AA 4.1.3 (Status Messages) — currently violated.

**Acceptance criteria:**

- [ ] Chat message container has `aria-live="polite"`
- [ ] Build passes

#### 99.3 HIGH — Use stable message keys in ChatBody

**File:** `src/components/chat/chat-body.tsx`

**What to do:**

1. Replace `key={\`${message.role}-${index}\`}` with a stable unique ID per message.
2. Assign a unique `id` to each `Message` object at creation time (e.g., `crypto.randomUUID()` or counter).
3. Also fix `chat-intro.tsx` index-based key if trivially combined.

**Acceptance criteria:**

- [ ] No array index in React key for messages
- [ ] Each message has a stable unique key
- [ ] Build passes

#### 99.5 MEDIUM — Add `aria-label` to AudioPlayer play/pause button

**File:** `src/components/shared/audio-player.tsx`

**What to do:**

1. Add `aria-label="Play"` / `aria-label="Pause"` (toggle based on state) to the icon-only play/pause button.

**Acceptance criteria:**

- [ ] Button has accessible name
- [ ] Build passes

---

## HIGH — Unit Test Quality (TDD Rebuild Continues)

### Phase 96: Unit Test Depth Improvement — HIGH

> ~~Phase 96.1 + 96.2 COMPLETE (moved to DONE.md).~~ Remaining: 96.3–96.8.
> All new tests MUST follow TDD methodology: write failing test first, then verify behavior.

#### 96.3 HIGH — Add webhook idempotency and edge case tests

**Files:** `tests/unit/routes/stripe-webhook-route.test.ts`, `tests/unit/routes/clerk-webhook-route.test.ts`

**What to do (TDD):**

1. Stripe: Test duplicate `stripeId` — idempotency prevents double-processing (returns 200, no duplicate Transaction).
2. Stripe: Test `User.findOne` returning null (user deleted between checkout and webhook).
3. Clerk: Test `user.created` replay — no duplicate User, no throw.
4. Clerk: Test `user.deleted` with already-deleted user — returns 200, no throw.
5. Clerk: Test cascade cleanup partial failure — webhook returns 200, partial cleanup logged.

**Acceptance criteria:**

- [ ] Idempotency tested for both webhooks
- [ ] All edge cases tested
- [ ] Tests pass

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

### Phase 72.4 MEDIUM — Admin table semantics

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

## HIGH — Triple-Audit Findings (PM audit #43 → Updated PM audit #44)

### Phase 99: Code Quality & WCAG Fixes — MEDIUM

> Findings from PM audit #43 + #44 triple-audits. HIGH items (99.1, 99.3) promoted to WCAG Quick Wins section above.

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

#### 99.4 MEDIUM — Remove dead `faqs` export + fix buildFaqs test

**Files:** `src/constants/faqs.tsx`, `tests/unit/constants/faqs.test.ts`

**What to do:**

1. Remove `export const faqs = buildFaqs()` from `src/constants/faqs.tsx` (dead export — only test imports it).
2. Update `faqs.test.ts` to call `buildFaqs()` directly with test data and verify interpolation.
3. Add test for `buildFaqs()` with custom pricing/persona configs to verify admin override injection.

**Acceptance criteria:**

- [ ] Dead `faqs` export removed
- [ ] Test calls `buildFaqs()` directly
- [ ] Test verifies override injection works
- [ ] `npm run knip` still clean

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
> All phases through 96.2 complete (including 86, 88–96.2).
> All Milestones 0–24 COMPLETE. Milestone 25 IN PROGRESS.

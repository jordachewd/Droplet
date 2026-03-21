# Droplet — TODO

> Prioritized, actionable development tasks. Each task max ~30 minutes.
> Governed by **Droplet-PM**. Do not add tasks without PM approval.
> Ref: `SPEC.md` for full specification. `AGENTS.md` for coding rules. `DONE.md` for completed phases.
> Implementation agent: **Droplet-Engineer** (Senior Developer).
>
> **STATUS: PM audit #40 (2026-03-21). All Phases 1–85 + 80.1, 73.1, 74.1, 72.1, 72.2, 72.3, 75 complete. 386 unit tests (67 suites). Build passing. Node.js 24.12.0 runtime.**
> **Owner directive: FULL TESTING INFRASTRUCTURE REBUILD. TDD approach. Aggressive test quality. All tech stack configs hardened.**
> **Priority order: 88 (CRITICAL — P1 stale selection) → 89 (CRITICAL — config hardening) → 90 (HIGH — unit test rebuild) → 91 (HIGH — E2E rebuild) → 86 (MEDIUM — server-only guards) → 72.4 (MEDIUM — WCAG tables) → 73.3 (MEDIUM — admin data consumers) → 87 (LOW) → 74.2 → 73.2 → 46.x → 29.x → 26.x**

---

## CRITICAL — P1 Bug Fixes (Must be first)

### Phase 88: Admin Table Stale Selection on Pagination — CRITICAL

> Owner-reported P1. Triple-audit confirmed (Architect + Engineer + PM). Stale selection state persists across pagination, enabling bulk destructive actions on wrong records.

#### 88.1 CRITICAL — Clear user selection state on pagination

**Ref:** Owner review comment. Architect Finding P1-A. Engineer Finding 1.1.

**File:** `src/components/admin/users/admin-users-table.tsx`

**What to do:**

1. Add `useEffect` that clears `selectedUserIds` when `users` prop reference changes.
2. This ensures navigating via pagination `<Link>` resets selection to empty.
3. Verify: after navigating to page 2, no page-1 IDs remain in selection state.
4. Verify: `allSelected` checkbox is unchecked after page change.

**Acceptance criteria:**

- [ ] Selection cleared on every page/search change
- [ ] Bulk suspend/remove forms never contain IDs from a different page
- [ ] Build passes

#### 88.2 CRITICAL — Clear transaction selection state on pagination

**Ref:** Owner review comment. Architect Finding P1-B. Engineer Finding 1.1.

**File:** `src/components/admin/transactions/admin-transactions-table.tsx`

**What to do:**

1. Add `useEffect` that clears `selectedTransactionIds` when `transactions` prop reference changes.
2. Same pattern as 88.1.

**Acceptance criteria:**

- [ ] Selection cleared on every page change
- [ ] Bulk delete form never contains IDs from a different page
- [ ] Build passes

---

## CRITICAL — Tech Stack Config Hardening

### Phase 89: Config Cleanup — CRITICAL

> Triple-audit confirmed. Dual ESLint config, incorrect dependency placement, fragile vitest environment.

#### 89.1 CRITICAL — Delete dead `.eslintrc.json`

**Ref:** Architect Finding P1-C. Engineer Finding 2.1.

**File:** `.eslintrc.json` (DELETE)

**What to do:**

1. Delete `.eslintrc.json`. ESLint 10 uses flat config only (`eslint.config.mjs` is the active config).
2. Verify `npm run lint` still passes.

**Acceptance criteria:**

- [ ] `.eslintrc.json` deleted
- [ ] `npm run lint` passes

#### 89.2 CRITICAL — Move runtime dependencies from devDependencies to dependencies

**Ref:** Engineer Finding 1.2, 5.3. Architect Finding 6.2.

**File:** `package.json`

**What to do:**

1. Move `react`, `react-dom`, `@clerk/nextjs` from `devDependencies` to `dependencies`.
2. Run `npm install` to regenerate lock file.
3. Verify `npm run build` still passes.

**Acceptance criteria:**

- [ ] `react`, `react-dom`, `@clerk/nextjs` in `dependencies`
- [ ] `npm run build` passes
- [ ] Lock file updated

#### 89.3 HIGH — Add `environmentMatchGlobs` to vitest config

**Ref:** Architect Finding 3.1. Engineer Finding 2.2.

**File:** `vitest.config.mts`

**What to do:**

1. Add `environmentMatchGlobs: [["**/*.test.tsx", "jsdom"]]` to the vitest config `test` section.
2. This makes jsdom automatic for `.tsx` test files — no more per-file pragma required.
3. Keep existing pragmas for backward compatibility — no removal needed.
4. Verify `npm run test` still passes.

**Acceptance criteria:**

- [ ] `environmentMatchGlobs` configured
- [ ] All 386 tests still pass
- [ ] New `.tsx` tests auto-get jsdom

#### 89.4 MEDIUM — Reduce Playwright browser projects for dev

**Ref:** Architect Finding 3.2, 6.4. Engineer Finding 2.3.

**File:** `playwright.config.ts`

**What to do:**

1. Keep only Chromium, Firefox, and WebKit as default browser projects.
2. Remove Mobile Chrome, Mobile Safari, Microsoft Edge, and Google Chrome channel.
3. Use environment variable `PLAYWRIGHT_FULL_MATRIX=1` to restore all 7 for release validation.

**Acceptance criteria:**

- [ ] Default: 3 browser projects (Chromium, Firefox, WebKit)
- [ ] `PLAYWRIGHT_FULL_MATRIX=1` restores full 7
- [ ] E2E tests pass with reduced set

---

## HIGH — Testing Infrastructure Rebuild (TDD)

### Phase 90: Unit Test Structure & Quality Rebuild — HIGH

> Owner directive: "Refactor all unit and e2e tests from scratch; Remove old flow and rebuild entire testing process!"
> TDD approach: Write failing tests FIRST, then just enough code to pass.

#### 90.1 HIGH — Create unit test directory structure

**Files:** `tests/unit/` restructure

**What to do:**

1. Create subdirectories: `tests/unit/actions/`, `tests/unit/components/`, `tests/unit/routes/`, `tests/unit/utils/`, `tests/unit/models/`, `tests/unit/constants/`.
2. Move existing test files into appropriate subdirectories.
3. Verify vitest glob still matches (current `tests/unit/**/*.test.ts(x)` already matches subdirs).
4. Verify all tests still pass after move.

**Acceptance criteria:**

- [ ] Tests organized by domain in subdirectories
- [ ] All 386 tests still pass
- [ ] No orphan test files in root `tests/unit/`

#### 90.2 HIGH — Consolidate phase-suffixed duplicate test files

**Ref:** Engineer Finding 3.1, 3.2.

**Files:** `openai-route-phase16.test.ts`, `generate-response-phase16.test.ts`, `generate-audio-phase16.test.ts`, `generate-title-phase16.test.ts`, `checkout-plan-phase17.test.ts`

**What to do:**

1. For each pair: merge unique test cases from the phase-suffixed file into the base file.
2. Remove duplicate test cases. Delete empty phase-suffixed files.
3. Verify all tests pass and no coverage is lost.

**Acceptance criteria:**

- [ ] Zero phase-suffixed test files remain
- [ ] All unique test scenarios preserved
- [ ] Tests pass

#### 90.3 HIGH — Add failure path tests to media generation utilities

**Ref:** Engineer Finding 3.11.

**Files:** `tests/unit/generate-image.test.ts`, `tests/unit/generate-audio.test.ts`, `tests/unit/generate-video.test.ts`

**What to do (TDD — write tests FIRST):**

1. Add test: OpenAI API call throws — verify error is propagated correctly.
2. Add test: S3 upload fails — verify error handling and no orphan data.
3. Add test: `sharp` conversion fails (image only) — verify graceful error.
4. Add test: empty/malformed API response — verify rejection.
5. Fix code if test rightfully fails.

**Acceptance criteria:**

- [ ] Each media generation utility has at least 2 failure path tests
- [ ] Tests assert actual error behavior, not mock setup
- [ ] Tests pass

#### 90.4 HIGH — Add webhook idempotency and edge case tests

**Ref:** Engineer Finding 3.3, 3.4.

**Files:** `tests/unit/stripe-webhook-route.test.ts`, `tests/unit/clerk-webhook-route.test.ts`

**What to do (TDD):**

1. Stripe: Add test for duplicate `stripeId` — idempotency prevents double-processing.
2. Stripe: Add test for `User.findOne` returning null.
3. Clerk: Add test for `user.deleted` with already-deleted user (no throw).
4. Clerk: Add test for cascade cleanup partial failure (webhook still returns 200).

**Acceptance criteria:**

- [ ] Idempotency tested for both webhooks
- [ ] Edge cases tested
- [ ] Tests pass

#### 90.5 HIGH — Reduce mock scope in OpenAI route tests

**Ref:** Engineer Finding 3.1.

**Files:** `tests/unit/openai-route.test.ts`, `tests/unit/conversation-stop.test.ts`

**What to do:**

1. Stop mocking `resolveEntitlements`, `PLAN_LIMITS`, `checkUsageLimit` — let these run with test data.
2. Keep mocking: `connectToDatabase`, Mongoose model methods, `auth()`, media generation functions.
3. Fix tests that now rightfully fail because mocks were hiding real issues.

**Acceptance criteria:**

- [ ] Pure functions (`resolveEntitlements`, `checkUsageLimit`) run un-mocked
- [ ] Tests validate actual limit enforcement behavior
- [ ] Tests pass

#### 90.6 MEDIUM — Add admin table selection clearing tests (TDD for Phase 88)

**Files:** New: `tests/unit/components/admin-users-table.test.tsx`, `tests/unit/components/admin-transactions-table.test.tsx`

**What to do (TDD — write tests FIRST):**

1. Test: render table with page 1 data, select rows, re-render with page 2 data — selection must be empty.
2. Test: `allSelected` is false after prop change.
3. Tests should FAIL before Phase 88 fix, PASS after.

**Acceptance criteria:**

- [ ] Selection reset on prop change tested
- [ ] Tests validate P1 fix correctness

#### 90.7 MEDIUM — Add security injection tests to validation schemas

**Ref:** Engineer Finding 3.14.

**File:** `tests/unit/validation-schemas.test.ts`

**What to do (TDD):**

1. Add test: XSS payload in message text — verify schema behavior.
2. Add test: very long string (100K chars) — verify schema behavior.
3. Add test: null bytes in strings — verify handling.

**Acceptance criteria:**

- [ ] Security edge cases tested
- [ ] Tests pass

---

### Phase 91: E2E Test Rebuild — HIGH

> Owner directive: Full E2E testing rebuild. Aggressive behavioral testing, not smoke tests.

#### 91.1 HIGH — Consolidate overlapping public page specs

**Ref:** Engineer Finding 4.1.

**Files:** `tests/e2e/landing-page.spec.ts`, `tests/e2e/public-pages.spec.ts`

**What to do:**

1. Merge `landing-page.spec.ts` into `public-pages.spec.ts`.
2. Remove duplicate assertions (hero heading, CTA links tested in both).
3. Single spec covers all public page rendering + navigation.

**Acceptance criteria:**

- [ ] Zero duplicate assertions across E2E specs
- [ ] All public page tests in one organized spec
- [ ] Tests pass

#### 91.2 HIGH — Add E2E spec for admin bulk actions + pagination selection

**Ref:** Architect Finding 5.3. Engineer Finding 4.11.

**File:** New: `tests/e2e/admin-bulk-actions.spec.ts`

**What to do:**

1. Test: Admin selects user, clicks "Suspend", sees confirmation dialog, confirms.
2. Test: Admin selects transaction, clicks "Delete", sees confirmation.
3. Test: Admin navigates to page 2 — verify selection is empty (P1 fix validation).
4. Clean up test data after each test.

**Acceptance criteria:**

- [ ] Bulk actions tested
- [ ] Pagination selection reset validated
- [ ] Proper cleanup

#### 91.3 HIGH — Add E2E cleanup to admin-features.spec.ts

**Ref:** Engineer Finding 4.4.

**File:** `tests/e2e/admin-features.spec.ts`

**What to do:**

1. Add `test.afterAll` to delete E2E-created public page via direct MongoDB.

**Acceptance criteria:**

- [ ] Created test pages cleaned up after test run

#### 91.4 MEDIUM — Convert admin-users.spec.ts from smoke to behavioral

**Ref:** Engineer Finding 4.3.

**File:** `tests/e2e/admin-users.spec.ts`

**What to do:**

1. Add test: search for test user, verify correct user displayed.
2. Add test: open user detail, verify usage data rendered.

**Acceptance criteria:**

- [ ] Tests verify actual data, not just renders

#### 91.5 MEDIUM — Add E2E error state testing

**File:** New: `tests/e2e/error-handling.spec.ts`

**What to do:**

1. Test: Mock API to return 500 — verify error UI.
2. Test: Verify 401 redirects to sign-in.

**Acceptance criteria:**

- [ ] Error states have E2E coverage

---

## MEDIUM — Server-Only Guards

### Phase 86: Server-Only Guards — Mongoose Models, OpenAI, AWS — MEDIUM

> TD-SEC-06. Triple-audit confirmed.

#### 86.1 MEDIUM — Add `import "server-only"` to all 8 Mongoose model files

**Files:** All 8 in `src/lib/database/models/`

**Acceptance criteria:**

- [ ] All 8 model files have `import "server-only"` guard
- [ ] Build passes

#### 86.2 MEDIUM — Add `import "server-only"` to OpenAI utility files

**Files:** 5 files in `src/lib/utils/openai/` (not `filterAssistantMsg.tsx`)

**Acceptance criteria:**

- [ ] 5 OpenAI generation utilities guarded
- [ ] `filterAssistantMsg.tsx` remains unguarded
- [ ] Build passes

#### 86.3 MEDIUM — Add `import "server-only"` to AWS utility files

**Files:** All 5 in `src/lib/utils/aws/`

**Acceptance criteria:**

- [ ] All 5 AWS utility files guarded
- [ ] Build passes

---

## MEDIUM — WCAG & Code Quality

### Phase 72.4 MEDIUM — Admin table semantics

**Files:** `src/components/admin/users/admin-users-table.tsx`, `src/components/admin/transactions/admin-transactions-table.tsx`, `src/components/admin/website/admin-website-manager.tsx`

**What to do:**

1. Convert div-based grid tables to semantic `<table>` or add ARIA table roles.
2. Add table caption/aria-label.

**Acceptance criteria:**

- [ ] Admin tables navigable by screen readers as data tables
- [ ] Build passes

### Phase 73.3 MEDIUM — Admin client component data-consumer violations

**Files:** `src/components/admin/admin-sidebar.tsx`, `src/components/admin/settings/admin-personas-section.tsx`, `src/components/admin/settings/admin-models-section.tsx`

**What to do:**

1. Remove direct constant imports. Pass data from server parent layout.

**Acceptance criteria:**

- [ ] Zero direct constant imports for dynamic data in admin client components
- [ ] Build passes

### Phase 73.2 MEDIUM — Minor re-render and code quality fixes

**Files:** `src/components/chat/sidebar/chat-sidebar-nav-v2.tsx`, `src/components/shared/plan-count-down.tsx`

**Acceptance criteria:**

- [ ] No unnecessary state duplication
- [ ] Build passes

---

## LOW — Remaining Work

### Phase 87 LOW — createTaskSchema strict mode

**File:** `src/lib/actions/task.actions.tsx`

### Phase 74.2 MEDIUM — FAQ content admin-configurable

**Files:** `src/constants/faqs.tsx`, admin settings

### Phase 74.3 LOW — Content layer admin-configurability assessment

### Phase 46.1 LOW — Admin error boundary

### Phase 46.2 LOW — Silent catch logging

---

## ON HOLD — Deferred

### Phase 29.x — Zod/Zustand app-wide modernization

### Phase 26.x — Persona-aware media prompts, Stripe auto-renewal

---

> **Completed phases** archived in [`DONE.md`](DONE.md).
> All phases through 85 complete, plus 80.1, 73.1, 74.1, 72.1, 72.2, 72.3, 75.
> All Milestones 0–22 COMPLETE. Milestone 23 Block A COMPLETE.

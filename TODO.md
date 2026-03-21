# Droplet — TODO

> Prioritized, actionable development tasks. Each task max ~30 minutes.
> Governed by **Droplet-PM**. Do not add tasks without PM approval.
> Ref: `SPEC.md` for full specification. `AGENTS.md` for coding rules. `DONE.md` for completed phases.
> Implementation agent: **Droplet-Engineer** (Senior Developer).
>
> **STATUS: PM audit #42 (2026-03-21). All Phases 1–93 complete (including 86, 90.6, 91.2–91.4, 92.1–92.2, 93.1–93.2). 394 unit tests (65 suites). 81 E2E passed. Build passing. Node.js 24.12.0 runtime.**
> **CRITICAL: Coverage gate NOT met (76.28/65.32/79.75/76.68 vs 80/75/80/80). 4 E2E specs failing (chat-app-shell, plans-public, public-pages, user-profile).**
> **Owner directive: FULL TESTING INFRASTRUCTURE REBUILD FROM SCRATCH. TDD approach. Aggressive test quality. All tech stack configs hardened.**
> **Priority order: 94 (CRITICAL) → 95 (CRITICAL) → 96 (HIGH) → 97 (HIGH) → 98 (HIGH) → 72.4 → 73.3 → 74.2 → 87 → 73.2 → 29.x → 26.x**

---

## CRITICAL — Testing Foundation Rebuild (PM audit #42, Triple-Audit)

### Phase 94: Testing Config & Toolchain Hardening — CRITICAL

> Architect P0-1, P1-3/4/5/6, P2-7/9. Engineer Finding 10. PM independent confirmation. The testing toolchain has structural gaps that undermine all subsequent testing work. Fix these FIRST before writing any new tests.

#### 94.1 CRITICAL — Align Vitest coverage config with reality

**File:** `vitest.config.mts`

**What to do:**

1. Lower coverage thresholds to current reality: statements 76%, branches 65%, functions 79%, lines 76%.
2. Add reporters: `["text", "json-summary", "lcov"]` (enables CI tooling and visual coverage exploration).
3. Add `setupFiles: ["./tests/unit/vitest.setup.ts"]` — create setup file with: global `afterEach(() => { vi.restoreAllMocks(); })` for automatic mock cleanup.
4. Keep `environmentMatchGlobs` and `server-only` alias as-is.
5. **IMPORTANT:** Thresholds will be incrementally raised as Phase 98 delivers coverage. The point is NOT to lower ambition — it is to make coverage enforcement ACTUAL instead of decorative.

**Acceptance criteria:**

- [ ] Thresholds match reality (76/65/79/76)
- [ ] `npm run test:coverage` PASSES (threshold actually enforced)
- [ ] `lcov` reporter enabled for CI tooling
- [ ] `vitest.setup.ts` created with mock cleanup
- [ ] All 394 existing tests still pass

#### 94.2 CRITICAL — Harden Playwright config

**File:** `playwright.config.ts`

**What to do:**

1. Add `actionTimeout: 10_000` to `use` block (individual action timeout — a 29s click is a failure).
2. Add `expect: { timeout: 5_000 }` to top-level config.
3. Keep everything else as-is.

**Acceptance criteria:**

- [ ] `actionTimeout: 10_000` configured
- [ ] `expect.timeout: 5_000` configured
- [ ] Build passes

#### 94.3 HIGH — Harden ESLint rules

**File:** `eslint.config.mjs`

**What to do:**

1. Add `"no-console": ["error", { "allow": ["warn", "error"] }]` — prevent console.log in production code.
2. Add `"no-restricted-globals": ["error", "alert", "confirm"]` — prevent window.alert/confirm regression.
3. Run `npm run lint` — fix any new violations. Tests dir may need eslint ignore or rule override.

**Acceptance criteria:**

- [ ] `no-console` rule enforced (error level)
- [ ] `no-restricted-globals` for alert/confirm enforced
- [ ] `npm run lint` passes (violations fixed or test overrides added)
- [ ] src/ remains clean of console.log and window.alert/confirm

#### 94.4 HIGH — Harden TypeScript config

**File:** `tsconfig.json`

**What to do:**

1. Add `"noFallthroughCasesInSwitch": true` to `compilerOptions`.
2. Add `"forceConsistentCasingInFileNames": true` to `compilerOptions`.
3. Run `npx tsc --noEmit` — fix any new errors.

**Acceptance criteria:**

- [ ] Both new options added
- [ ] `npx tsc --noEmit` passes

#### 94.5 HIGH — Create shared test factories and utilities

**Files:** New: `tests/unit/test-support/factories.ts`, update: `tests/unit/test-support/server-only.ts`

**What to do:**

1. Create `factories.ts` with reusable factory functions:
   - `createTestUser(overrides?)` — returns a User-shaped object with plan defaults
   - `createTestTask(overrides?)` — returns a Task-shaped object
   - `createTestTransaction(overrides?)` — returns a Transaction-shaped object
   - `createTestEntitlements(overrides?)` — returns entitlement decision
   - `buildMockRequest(overrides?)` — returns mock Next.js Request
2. Extract the duplicated `buildRequest()`, `createExistingTask()`, `createDefaultUser()` patterns from `openai-route.test.ts` and `conversation-stop.test.ts` into shared factories.
3. Do NOT change test behavior — only extract duplicated factory code.

**Acceptance criteria:**

- [ ] `factories.ts` created with at least 5 factory functions
- [ ] No test behavior changes
- [ ] All 394 tests still pass
- [ ] openai-route.test.ts and conversation-stop.test.ts import from factories

---

## CRITICAL — Fix 4 Failing E2E Specs (PM audit #42, Triple-Audit)

### Phase 95: E2E Spec Remediation — CRITICAL

> All 3 audits agree: 4 E2E specs fail because they assert hardcoded content (prices, heading text, FAQ copy) that is now admin-configurable. This directly violates the owner directive: NO HARDCODED data. The fix is NOT to update hardcoded values — it is to change assertion strategy to structural.

#### 95.1 CRITICAL — Fix `plans-public.spec.ts`

**File:** `tests/e2e/plans-public.spec.ts`

**What to do:**

1. Replace `page.getByText("Free forever", { exact: true })` with structural assertion: `.PlanCard` elements exist (count 3).
2. Replace `$19` / `$39` assertions with: each `.PlanCard` has a price element (any content).
3. Replace persona description text assertions with: each card contains persona summary text (any content).
4. Keep FAQ section tests but assert structure (summary elements expandable) not specific text.
5. Keep `support email` assertion but make it check for email format, not specific address.

**Acceptance criteria:**

- [ ] Zero hardcoded prices, plan names, or copy in assertions
- [ ] Test passes regardless of admin config changes
- [ ] Structural assertions: 3 plan cards, each with heading + price + features list
- [ ] FAQ assertions: expandable sections exist and toggle

#### 95.2 HIGH — Fix `public-pages.spec.ts`

**File:** `tests/e2e/public-pages.spec.ts`

**What to do:**

1. Keep route navigation and response assertions.
2. Replace exact heading text assertions with: page has a main heading (h1/h2 role).
3. Replace about page specific heading text with: `.AboutPage article` elements exist (count >= 3).
4. Keep theme toggle test as-is (behavioral, not content).
5. Keep 404 test as-is (framework behavior, not admin-configurable).

**Acceptance criteria:**

- [ ] Zero hardcoded marketing copy in assertions
- [ ] Landing page: heading exists, CTAs exist, sections exist
- [ ] About page: articles exist with headings
- [ ] Plans page: 3 plan cards with structural checks (reuse from 95.1 pattern)
- [ ] Test passes

#### 95.3 HIGH — Fix `user-profile.spec.ts`

**File:** `tests/e2e/user-profile.spec.ts`

**What to do:**

1. Keep profile page heading and `.ProfileHero` assertions.
2. Keep email assertion (user-specific, not admin-configurable).
3. Replace `$19` / `$39` assertions with: `.PlanCard` exists (count 3), each has price element.
4. Keep Subscribe/Upgrade button existence checks.

**Acceptance criteria:**

- [ ] Zero hardcoded prices or plan copy
- [ ] Profile page assertions are structural
- [ ] Plans page assertions are structural
- [ ] Test passes

#### 95.4 HIGH — Fix `chat-app-shell.spec.ts`

**File:** `tests/e2e/chat-app-shell.spec.ts`

**What to do:**

1. Remove the `ensureNotSignedOut()` recovery function entirely — if auth drops, test should fail (reveals real problem).
2. Replace `toHaveClass(/translate-x-0/)` CSS class assertion with ARIA-based or visibility check.
3. Simplify the multi-step sidebar navigation test — reduce defensive re-auth calls.
4. Keep account menu navigation tests but remove recovery loops.
5. If test remains flaky after fixes, reduce scope to single sidebar destination + single account menu destination.

**Acceptance criteria:**

- [ ] Zero `ensureNotSignedOut()` calls
- [ ] Zero CSS class assertions for sidebar state
- [ ] Test fails cleanly on auth issues instead of silently recovering
- [ ] Test passes on chromium

---

## HIGH — Unit Test Quality Rebuild (PM audit #42, Triple-Audit)

### Phase 96: Unit Test Depth Improvement — HIGH

> Targets the over-mocking epidemic (Architect U2/U3), missing critical path tests (Engineer Findings 4-8), and coverage gap drivers.

#### 96.1 HIGH — Merge conversation-stop.test.ts into openai-route.test.ts

**Files:** `tests/unit/routes/conversation-stop.test.ts` → `tests/unit/routes/openai-route.test.ts`

**What to do:**

1. Move unique test scenarios from `conversation-stop.test.ts` into `openai-route.test.ts` as a `describe("conversation stop behavior")` block.
2. Delete `conversation-stop.test.ts`.
3. Eliminate the shared 13-mock setup duplication.
4. Use shared factories from Phase 94.5.

**Acceptance criteria:**

- [ ] Single file for OpenAI route tests
- [ ] Zero duplicate mock setup
- [ ] All existing scenarios preserved
- [ ] Tests pass

#### 96.2 HIGH — Reduce mock scope in OpenAI route tests

**Files:** `tests/unit/routes/openai-route.test.ts`

**What to do:**

1. Stop mocking: `resolveEntitlements`, `PLAN_LIMITS`, `checkUsageLimit`, `resolveModelPolicy` — let pure functions run with test data.
2. Keep mocking: `connectToDatabase`, Mongoose model methods (`User.findOne`, `Task.findOne`, etc.), `auth()`, media generation functions.
3. Fix tests that now rightfully fail because mocks were hiding real issues.
4. This is the most important quality improvement — turns mock-wiring tests into behavioral tests.

**Acceptance criteria:**

- [ ] Pure functions run un-mocked
- [ ] Tests validate actual limit enforcement behavior
- [ ] Tests catch real bugs (e.g., wrong plan → wrong model)
- [ ] Tests pass

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
> All phases through 93 complete (including 86, 90.6, 91.2–91.4, 92.1–92.2, 93.1–93.2).
> All Milestones 0–24 COMPLETE. Milestone 25 IN PROGRESS.

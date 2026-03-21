# Droplet — TODO

> Prioritized, actionable development tasks. Each task max ~30 minutes.
> Governed by **Droplet-PM**. Do not add tasks without PM approval.
> Ref: `SPEC.md` for full specification. `AGENTS.md` for coding rules. `DONE.md` for completed phases.
> Implementation agent: **Droplet-Engineer** (Senior Developer).
>
> **STATUS: PM audit #41 (2026-03-21). All Phases 1–85 + 80.1, 73.1, 74.1, 72.1, 72.2, 72.3, 75, 88, 89, 90.1–90.3, 90.7, 91.1, 91.5 complete. 390 unit tests (63 suites). 81 E2E passed. Build passing. Node.js 24.12.0 runtime.**
> **Owner directive: FULL TESTING INFRASTRUCTURE REBUILD. TDD approach. Aggressive test quality. All tech stack configs hardened.**
> **Priority order: 92 (CRITICAL — server-only credential guards) → 93 (HIGH — coverage + config tightening) → 90.4–90.6 (HIGH — remaining unit test rebuild) → 91.2–91.4 (HIGH — remaining E2E rebuild) → 86 (MEDIUM — server-only extended) → 72.4 (MEDIUM — WCAG tables) → 73.3 (MEDIUM — admin data consumers) → 87 (LOW) → 74.2 → 73.2 → 46.x → 29.x → 26.x**

---

## CRITICAL — Server-Only Credential Guards (NEW — PM audit #41)

### Phase 92: Credential-Bearing Modules Missing `server-only` — CRITICAL

> Triple-audit confirmed (Architect P0-1 + Engineer + PM). `openai.tsx` and `aws.tsx` instantiate clients with secret env vars (`OPENAI_KEY`, `AWS_S3_SECRET_KEY`) but have NO `import "server-only"` guard. One mistaken client import = credential exposure in browser JS.

#### 92.1 CRITICAL — Add `import "server-only"` to OpenAI and AWS constants

**Files:** `src/constants/openai.tsx`, `src/constants/aws.tsx`

**What to do:**

1. Add `import "server-only";` as first line in both files.
2. Verify `npm run build` passes (no client import chains break).
3. These files contain `new OpenAI({apiKey: process.env.OPENAI_KEY!})` and `new S3Client({secretAccessKey: process.env.AWS_S3_SECRET_KEY!})`.

**Acceptance criteria:**

- [ ] Both constants files have `import "server-only"` guard
- [ ] Build passes — no client component import chains break
- [ ] No secret env vars exposed to client bundles

#### 92.2 CRITICAL — Add `import "server-only"` to `resolve-entitlements.tsx` and `download-url-allowlist.ts`

**Files:** `src/lib/utils/resolve-entitlements.tsx`, `src/lib/utils/download-url-allowlist.ts`

**What to do:**

1. Add `import "server-only";` as first line in both files.
2. `resolve-entitlements.tsx` contains business logic that must not leak to client.
3. `download-url-allowlist.ts` reads env vars and exposes infrastructure patterns.
4. Verify build passes.

**Acceptance criteria:**

- [ ] Both files have `import "server-only"` guard
- [ ] Build passes

---

## HIGH — Coverage & Config Tightening (NEW — PM audit #41)

### Phase 93: Test Infrastructure Hardening — HIGH

> Triple-audit confirmed. Coverage thresholds too low for billing SaaS. ESLint too permissive.

#### 93.1 HIGH — Raise Vitest coverage thresholds

**File:** `vitest.config.mts`

**What to do:**

1. Raise thresholds: statements 80%, branches 75%, functions 80%, lines 80%.
2. Run `npm run test:coverage` to verify current coverage meets new thresholds.
3. If any threshold fails, do NOT lower — fix the coverage gap.

**Acceptance criteria:**

- [ ] Thresholds: 80/75/80/80
- [ ] `npm run test:coverage` passes with new thresholds

#### 93.2 MEDIUM — Re-enable `react-hooks/set-state-in-effect` ESLint rule

**File:** `eslint.config.mjs`

**What to do:**

1. Change `"react-hooks/set-state-in-effect": "off"` to `"warn"`.
2. Run `npm run lint` — fix any violations or suppress with `// eslint-disable-next-line` comments with justification.
3. Setting state in useEffect without proper cleanup is a real antipattern.

**Acceptance criteria:**

- [ ] Rule set to `"warn"` (not `"off"`)
- [ ] `npm run lint` passes (violations fixed or individually suppressed)

---

## HIGH — Remaining Unit Test Rebuild (Phases 90.4–90.6)

### Phase 90: Unit Test Quality (remaining sub-phases)

#### 90.4 HIGH — Add webhook idempotency and edge case tests

**Ref:** Engineer Finding 3.3, 3.4.

**Files:** `tests/unit/routes/stripe-webhook-route.test.ts`, `tests/unit/routes/clerk-webhook-route.test.ts`

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

**Ref:** Architect P2-3, Engineer Finding 3.1.

**Files:** `tests/unit/routes/openai-route.test.ts`, `tests/unit/routes/conversation-stop.test.ts`

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
3. Tests validate the Phase 88 fix is correct.

**Acceptance criteria:**

- [ ] Selection reset on prop change tested
- [ ] Tests validate P1 fix correctness

---

## HIGH — Remaining E2E Test Rebuild (Phases 91.2–91.4)

### Phase 91: E2E Test Quality (remaining sub-phases)

#### 91.2 HIGH — Add E2E spec for admin bulk actions + pagination selection

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

**File:** `tests/e2e/admin-features.spec.ts`

**What to do:**

1. Add `test.afterAll` to delete E2E-created public page via direct MongoDB.

**Acceptance criteria:**

- [ ] Created test pages cleaned up after test run

#### 91.4 MEDIUM — Convert admin-users.spec.ts from smoke to behavioral

**File:** `tests/e2e/admin-users.spec.ts`

**What to do:**

1. Add test: search for test user, verify correct user displayed.
2. Add test: open user detail, verify usage data rendered.

**Acceptance criteria:**

- [ ] Tests verify actual data, not just renders

---

## MEDIUM — Server-Only Guards (Extended)

### Phase 86: Server-Only Guards — Mongoose Models, OpenAI, AWS — MEDIUM

> TD-SEC-06. Triple-audit confirmed. Phase 92 covers the CRITICAL constant files. This phase covers the remaining 18 files.

#### 86.1 MEDIUM — Add `import "server-only"` to all 8 Mongoose model files

**Files:** All 8 in `src/lib/database/models/`

**Acceptance criteria:**

- [ ] All 8 model files have `import "server-only"` guard
- [ ] Build passes

#### 86.2 MEDIUM — Add `import "server-only"` to OpenAI utility files

**Files:** 5 files in `src/lib/utils/openai/` (not `filterAssistantMsg.tsx`)

**Acceptance criteria:**

- [ ] 5 OpenAI generation utilities guarded
- [ ] `filterAssistantMsg.tsx` remains unguarded (used client-side)
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
> All phases through 85 complete, plus 80.1, 73.1, 74.1, 72.1, 72.2, 72.3, 75, 88, 89, 90.1–90.3, 90.7, 91.1, 91.5.
> All Milestones 0–24 COMPLETE. Milestone 25 IN PROGRESS.

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

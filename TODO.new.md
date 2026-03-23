# Droplet — TODO

> Prioritized, actionable development tasks. Each task max ~30 minutes.
> Governed by **Droplet-PM**. Do not add tasks without PM approval.
> Ref: `SPEC.md` for full specification. `AGENTS.md` for coding rules. `DONE.md` for completed phases.
> Implementation agent: **Droplet-Engineer** (Senior Developer).
>
> **STATUS: PM audit #48 (2026-03-23). All Phases 1–103.4 complete. 433 unit tests (72 suites). Build passes. TSC passes. Node.js 24.12.0 runtime.**
> **GATE STATUS: lint FAILS (29 errors from orphan `_update_plan.js`), knip FAILS (2 orphan files). TSC/build/unit tests/E2E pass.**
> **E2E: 108 passed, 0 failed, 25 skipped.**
> **Coverage: 78.18/65.94/83.01/78.51.**
> **Owner directive (CRITICAL): FULL TDD TESTING REBUILD from scratch. NO hardcoded data. WCAG 2.2 AA. Code reuse. Full admin configurability. Components as data consumers. Server-side utilities.**
> **Priority order: 111 (BLOCKER gate fix) → 105 (HIGH security) → 112 (CRITICAL TDD rebuild) → 106 (HIGH shared types) → 107 (HIGH stop-reason config) → 74.2 (MEDIUM FAQ admin) → 104 (MEDIUM landing/hero admin) → 108 (MEDIUM WCAG tabs) → 109 (MEDIUM WCAG icons) → 110 (LOW hamburger aria) → 97.2 (MEDIUM E2E admin) → 97.3 (LOW) → 87 (LOW)**

---

## BLOCKER — Gate Fix (PM audit #48 — lint + knip currently FAILING)

### Phase 111: Clean orphan dev scripts — BLOCKER

> `_update_plan.js` and `_up.js` are root-level dev utility scripts. They cause ALL 29 lint errors (`no-console`, `no-require-imports`) and both knip findings. **Lint and knip gates are RED because of these files.**

#### 111.1 BLOCKER — Remove or ignore orphan dev scripts

**Files:** `_update_plan.js`, `_up.js` (project root)

**What to do:**

1. Check if these scripts are used by any npm script, CI pipeline, or developer workflow.
2. If NOT used: delete both files.
3. If used occasionally: add both to eslint `ignores` array in `eslint.config.mjs` AND add to `knip.json` ignore list.
4. Verify `npm run lint` passes (0 errors).
5. Verify `npm run knip` passes (0 findings).

**Acceptance criteria:**

- [ ] `npm run lint` passes with 0 errors (warnings acceptable)
- [ ] `npm run knip` passes with 0 findings
- [ ] All 7 validation gates GREEN

---

## HIGH — Security Hardening (PM audit #47+48, confirmed)

### Phase 105: Add missing `server-only` guards — HIGH

> TD-SEC-09. `classify-task-complexity.ts` and `message-policy.ts` are server-only utilities consumed only by `/api/openai` route. Missing `import "server-only"` guard. PM-verified both files lack the guard.

#### 105.1 HIGH — Add `server-only` to `classify-task-complexity.ts`

**File:** `src/lib/utils/openai/classify-task-complexity.ts`

**What to do:**

1. Add `import "server-only";` at line 1.
2. Verify build passes.

**Acceptance criteria:**

- [ ] `import "server-only"` present
- [ ] Build passes, tests pass

#### 105.2 HIGH — Add `server-only` to `message-policy.ts`

**File:** `src/lib/utils/openai/message-policy.ts`

**What to do:**

1. Add `import "server-only";` at line 1.
2. Verify build passes.

**Acceptance criteria:**

- [ ] `import "server-only"` present
- [ ] Build passes, tests pass

---

## CRITICAL — Full TDD Testing Rebuild (Owner directive — March 2026)

### Phase 112: Full unit and E2E test rebuild from scratch — CRITICAL

> Owner mandate: "Refactor ALL unit and e2e tests from scratch. Remove old flow and rebuild entire testing process. TDD methodology." This is the primary work directive for Milestone 25.
>
> **Rebuild strategy (PM-approved):**
>
> 1. Do NOT blindly delete all tests. Assess each test file for quality.
> 2. Tests that validate BEHAVIOR (observable outputs, HTTP responses, rendered DOM, stored state) are KEPT and refactored.
> 3. Tests that only validate WIRING (mock call counts, `as never` casts, "renders without crashing") are REBUILT from scratch using TDD.
> 4. All new/rebuilt tests must follow TDD: write failing test → write minimum code to pass → refactor.
> 5. Coverage target after rebuild: statements ≥82%, branches ≥78%, functions ≥82%, lines ≥82%.
>
> **Rebuild order (highest ROI first):**
>
> 1. Core utility tests (pure functions — fastest, most deterministic)
> 2. Server action tests (mutation paths)
> 3. API route tests (integration-level)
> 4. Component tests (behavior + a11y focused)
> 5. E2E test expansion (admin settings, chat lifecycle, authenticated a11y)

#### 112.1 CRITICAL — Audit and classify all 72 unit test files

**What to do:**

1. Read every unit test file in `tests/unit/`.
2. Classify each as: **KEEP** (behavior-focused, high-value), **REFACTOR** (structure ok, needs mock reduction / split), or **REBUILD** (tautological, mock-heavy, renders-without-crashing).
3. Document classification.
4. Identify test files that are MISSING entirely (components, routes, utilities with 0% coverage).

**Known high-value KEEP candidates:**

- `openai-route.test.ts` (30+ behavioral scenarios — split into sub-files, keep scenarios)
- `admin-audit-trail.test.ts` (auth + audit coverage)
- `check-daily-conversations.test.ts`, `check-usage-limit.test.ts`, `rate-limit.test.ts` (core business logic)
- `resolve-entitlements.test.ts`, `ai-model-policy.test.ts` (plan gating matrix)
- `validation-schemas.test.ts` (input boundary + security injection tests)

**Known REBUILD candidates:**

- Component tests with only "renders without crashing" assertions
- Tests with 10+ `as never` casts on mocks
- Tests asserting mock call counts as primary validation

**Acceptance criteria:**

- [ ] Every unit test file classified (KEEP/REFACTOR/REBUILD)
- [ ] Missing test files identified
- [ ] Classification documented

#### 112.2 CRITICAL — Rebuild core utility unit tests (TDD)

**Target files (pure logic — 0% or low branch coverage):**

1. `effective-persona-access.ts` — **0% branch** — core entitlement logic, MUST test
2. `handleError.tsx` — **33% branch** — error utility
3. `deleteFileFromAWS.tsx` — **0% branch** — S3 cleanup
4. `mongoose.tsx` — **21.73% branch** — DB connection manager
5. `check-usage-limit.ts` — verify/improve existing tests
6. `check-daily-conversations.ts` — verify/improve existing tests
7. `resolve-entitlements.ts` — verify/improve existing tests
8. `ai-model-policy.ts` — verify/improve existing tests
9. `classify-task-complexity.ts` — verify/improve existing tests
10. `message-policy.ts` — verify/improve existing tests

**Approach:** Write behavioral tests covering all branches. Test edge cases, error paths, boundary conditions. No mocking of pure logic — only mock IO boundaries (DB, network).

**Acceptance criteria:**

- [ ] `effective-persona-access.ts` branch coverage ≥80%
- [ ] `handleError.tsx` branch coverage ≥60%
- [ ] `deleteFileFromAWS.tsx` branch coverage ≥60%
- [ ] `mongoose.tsx` branch coverage ≥40%
- [ ] All 10 utility files have behavioral tests
- [ ] Tests validate observable outputs, not mock calls

#### 112.3 CRITICAL — Rebuild server action tests (TDD)

**Target files:**

1. `admin.actions.tsx` — **27.81% branch** — all admin mutations, critical security surface
2. `admin-queries.ts` — **20.14% branch** — admin data access layer
3. `task.actions.tsx` — task CRUD (verify existing coverage)
4. `user.actions.tsx` — user mutations + deletion cascade (verify existing)
5. `transaction.action.tsx` — transaction operations (verify existing)

**Approach:** Test each exported action: auth failure, forbidden, success, edge cases. Verify audit trail. Verify ownership enforcement.

**Acceptance criteria:**

- [ ] `admin.actions.tsx` branch coverage ≥60%
- [ ] `admin-queries.ts` branch coverage ≥50%
- [ ] Auth/ownership enforcement tested on every action
- [ ] Admin audit trail verified on every admin mutation

#### 112.4 CRITICAL — Rebuild API route tests (TDD)

**Target files:**

1. `openai-route.test.ts` — REFACTOR: split into ≤300-line focused modules, keep scenarios, reduce `as never` casts
2. `/api/upload` route tests — verify/improve
3. `/api/download` route tests — verify/improve
4. `/api/aws` route tests — verify/improve
5. Clerk webhook Route tests — verify idempotency + edge cases
6. Stripe webhook route tests — verify idempotency + plan update

**Missing edge cases to add:**

- Malformed JSON body handling
- `ensureUserSynced` failure path (503 response)
- `emitUsageEvents` failure being non-fatal
- Concurrent request race conditions

**Acceptance criteria:**

- [ ] `openai-route.test.ts` split into focused sub-files
- [ ] Missing edge cases covered
- [ ] `as never` casts reduced to zero (use typed factories)

#### 112.5 HIGH — Rebuild component tests (TDD + a11y)

**Target files (0% or thin coverage):**

1. `chat-body.tsx` — **14% branch** — core chat display
2. `chat-wrapper.tsx` — main chat client (streaming + state)
3. `library-tabs.tsx` — tab management + keyboard nav
4. `header.tsx` — mobile menu toggle + scroll
5. `chat-sidebar-shell.tsx` — resize + localStorage
6. `admin-settings-tabs.tsx` — tab management

**Approach:** Test user interactions, conditional rendering, a11y attributes. NOT "renders without crashing". Every test must answer: "What observable behavior changes if this code breaks?"

**Acceptance criteria:**

- [ ] All target components have behavioral tests
- [ ] `chat-body.tsx` branch coverage ≥50%
- [ ] Keyboard navigation tested for tabs and modals

#### 112.6 HIGH — Expand E2E test suite

**New/improved specs:**

1. Admin settings → app propagation E2E (Phase 97.2)
2. Chat conversation flow (send prompt → receive response → continue) — currently MISSING
3. Authenticated route a11y scan (extend `accessibility.spec.ts` to `/app/*` routes)
4. Remove local `withMongoConnection` duplication (Phase 97.3)

**Acceptance criteria:**

- [ ] Admin settings propagation verified E2E
- [ ] Basic chat flow E2E exists
- [ ] Authenticated route a11y scanning added
- [ ] Zero local Mongo helper duplication

#### 112.7 HIGH — Raise coverage thresholds post-rebuild

**File:** `vitest.config.mts`

**What to do:** After 112.2–112.5, raise thresholds to match achieved coverage (target: 82/78/82/82+).

**Acceptance criteria:**

- [ ] Thresholds raised to ≥82/78/82/82
- [ ] `npm run test:coverage` passes

---

## HIGH — Code Reuse: Extract shared types (PM audit #47)

### Phase 106: Extract `ChatApiResponse` / `ChatStreamEvent` to shared types — HIGH

> TD-REUSE-04.

**Files:** `src/types/chat-api.d.ts` (new), `src/app/api/openai/route.tsx`, `src/components/chat/chat-wrapper.tsx`

**What to do:**

1. Create `src/types/chat-api.d.ts` with shared types.
2. Import from shared location in both files.
3. Remove local type definitions.

**Acceptance criteria:**

- [ ] Zero duplicate type definitions
- [ ] Build passes, tests pass

---

## HIGH — Admin Configurability: Stop Reason Messages (PM audit #47)

### Phase 107: Stop reason messages admin-configurable — HIGH

> TD-HARDCODE-01. 9 user-facing strings hardcoded.

#### 107.1 HIGH — Create `getEffectiveStopReasonMessages()` resolver

**Files:** `src/lib/utils/effective-stop-reasons.ts` (new), `src/constants/stop-reasons.ts`

**What to do:**

1. Create resolver following `effective-*` pattern.
2. Read from `AppSetting("admin.stopReasonMessages")`.
3. Fallback to `STOP_REASON_MESSAGES`.
4. Add `import "server-only"` guard.

**Acceptance criteria:**

- [ ] Resolver created and tested
- [ ] Falls back to defaults when no admin override
- [ ] Build passes

#### 107.2 HIGH — Admin UI for stop reason message editing

**What to do:**

1. Create `admin-stop-reasons-section.tsx`.
2. One textarea per stop reason code.
3. Save via admin action. Audit trail.

**Acceptance criteria:**

- [ ] All 9 stop reason messages editable from `/admin/settings`
- [ ] Build passes

#### 107.3 HIGH — Wire consumers to use resolver

**What to do:**

1. Replace `STOP_REASON_MESSAGES` import with `getEffectiveStopReasonMessages()`.
2. Pass resolved messages as props.

**Acceptance criteria:**

- [ ] Zero hardcoded stop reason message imports in consumer files
- [ ] Build passes, tests pass

---

## MEDIUM — Admin Configurability (Owner directive)

### Phase 74.2 MEDIUM — FAQ content admin-configurable

**What to do:**

1. `admin.faqContent` AppSetting + `getEffectiveFaqContent()` resolver.
2. Admin UI for FAQ entries. Fallback to `buildFaqs()`.

**Acceptance criteria:**

- [ ] FAQ admin-editable from `/admin/settings`
- [ ] Build passes

### Phase 104: Landing/hero/about content admin-configurable — MEDIUM

#### 104.1 — Landing feature cards + how-it-works

#### 104.2 — Hero copy

#### 104.3 — About page copy

See SPEC.md for full requirements on each.

---

## MEDIUM — WCAG 2.2 AA Remaining Gaps

### Phase 108 MEDIUM — Library tabs arrow-key navigation (TD-WCAG-05)

### Phase 109 MEDIUM — Decorative icon `aria-hidden` across ~15 components (TD-WCAG-06 expanded)

### Phase 110 LOW — Mobile header hamburger `aria-expanded`

---

## LOW — Remaining Work

### Phase 87 LOW — createTaskSchema strict mode (TD-TASK-PASSTHROUGH)

### Phase 73.2 LOW — Minor re-render and code quality fixes

### Phase 46.1 LOW — Admin error boundary

### Phase 46.2 LOW — Silent catch logging

---

## ON HOLD — Deferred

### Phase 29.x — Zod/Zustand app-wide modernization

### Phase 26.x — Persona-aware media prompts, Stripe auto-renewal

### Legal/nav/footer admin configurability — Deferred to v2

---

> **Completed phases** archived in [`DONE.md`](DONE.md).
> All phases through 103.4 complete.
> All Milestones 0–24 COMPLETE. Milestone 25 IN PROGRESS.

# Droplet — TODO

> Prioritized, actionable development tasks. Each task max ~30 minutes.
> Governed by **Droplet-PM**. Do not add tasks without PM approval.
> Ref: `SPEC.md` for full specification. `AGENTS.md` for coding rules. `DONE.md` for completed phases.
> Implementation agent: **Droplet-Engineer** (Senior Developer).
>
> **STATUS: PM audit #72 (2026-03-28). Milestones 0–25 COMPLETE. All phases through 157 complete (incl. 142, 156). 586 unit tests (101 suites). 8 E2E specs. Build passes. TSC clean. Node.js 24.12.0 runtime.**
> **GATE STATUS: All 7 gates GREEN (Button test mismatch is pre-existing — test asserts `btn-md`, component defaults `btn-sm`). Lint (0 errors, 0 warnings), Knip (0 findings), TSC clean, build passes, unit tests (101/586), E2E (8 specs), coverage 85/80/85/85.**
> **TDD REBUILD COMPLETE. WCAG 2.2 AA COMPLETE. User deletion cascade COMPLETE (Phase 150). Library uploaded tab COMPLETE (Phase 151). Payment processing COMPLETE (Phase 157). Rate limiting on all routes COMPLETE (Phase 142). Server-only guards on all constants COMPLETE (Phase 156).**
> **Zero: `as never`, `as any`, `console.log`, `console.error`, `window.alert`, `window.confirm`, `strict: false`, stale TODOs — all in `src/`.**
> **Triple audit #72 conducted. Architect + Engineer + PM. Zero CRITICAL bugs remaining. TD-WEBHOOK-01 RESOLVED. TD-RATELIMIT-02 RESOLVED. TD-SERVERONLY-01 RESOLVED.**
> **NEXT SESSION: 155.1 (HIGH scrollbar cleanup) → 158 (HIGH streaming hardening) → Button test fix → 143 (MEDIUM env validation) → 144–148 (MEDIUM/LOW)**

---

## HIGH — Scrollbar Cleanup Completion (PM audit #71)

### Phase 155.1 HIGH — Remove 2 remaining `droplet-scrollbar` references in admin-layout-shell

> Phase 155 claimed "Zero `droplet-scrollbar` references remaining in `src/`" but PM audit #71 found 2 dangling references at `src/components/admin/admin-layout-shell.tsx` L86 and L117. No functional impact (CSS class was already removed) but the class name must be cleaned from the JSX.

**File:** `src/components/admin/admin-layout-shell.tsx`

**What to do:**

1. Remove `droplet-scrollbar` from the `className` string at line 86.
2. Remove `droplet-scrollbar` from the `className` string at line 117.

**Acceptance criteria:**

- [ ] Zero `droplet-scrollbar` references in `src/`
- [ ] Build passes

---

## HIGH — Streaming Error Handling Hardening (PM audit #71 — Triple audit finding C2)

### Phase 158 HIGH — Harden SSE streaming catch/finally blocks against double-throw

> Architect + Engineer finding. In `/api/openai/route.tsx` streaming path, the `catch` block calls `writeStreamEvent(controller, { type: "error" })` which can itself throw if the controller is already closed/errored (e.g., client disconnect). If this happens, no `error` or `final` event reaches the client → client shows "The response stream ended unexpectedly." Similarly, `controller.close()` in `finally` can throw if already closed.

**File:** `src/app/api/openai/route.tsx`

**What to do:**

1. Wrap the `writeStreamEvent` call in the `catch` block with its own try/catch.
2. Wrap `controller.close()` in the `finally` block with its own try/catch.
3. Inner catch blocks should be silent (stream is already broken, nothing to do).

**Acceptance criteria:**

- [ ] `writeStreamEvent` in catch block wrapped in try/catch
- [ ] `controller.close()` in finally block wrapped in try/catch
- [ ] No "stream ended unexpectedly" on client disconnect during media generation
- [ ] Build passes, tests pass

---

## HIGH — Button Test Default Size Mismatch (PM audit #72)

### Phase 159 HIGH — Fix Button test asserting wrong default size

> PM audit #72 triple audit finding. Button component defaults to `size = "sm"` (producing `btn-sm`), but test asserts `btn-md`. Test is wrong, not the component. Blocking full gate green status.

**File:** `tests/unit/components/button.test.tsx`

**What to do:**

1. Change line 15: `expect(button.className).toContain("btn-md")` → `expect(button.className).toContain("btn-sm")`

**Acceptance criteria:**

- [ ] Button default render test asserts `btn-sm` (matching component default)
- [ ] All unit tests pass
- [ ] Build passes

---

## MEDIUM — Environment Variable Runtime Validation (PM audit #67)

### Phase 143 MEDIUM — Replace `as string` / `!` casts on env vars with runtime validation

> Architect finding W-2, Engineer finding H-1/H-2/H-4. 4 `as string` casts and 4 `!` non-null assertions on `process.env` values. If any env var is missing, broken clients are silently constructed (S3Client with `undefined` region, OpenAI with `undefined` API key). Errors surface later as cryptic API failures.

**Files:**

1. `src/constants/aws.tsx` — 3 `as string` casts on `AWS_S3_REGION`, `AWS_S3_ACCESS_ID`, `AWS_S3_SECRET_KEY`
2. `src/constants/openai.tsx` — 3 `!` on `OPENAI_ORG`, `OPENAI_PRJ`, `OPENAI_KEY`
3. `src/lib/database/mongoose.tsx` — 1 `as string` on `MONGODB_URL`
4. `src/lib/actions/transaction.action.tsx` — 1 `!` on `STRIPE_SECRET_KEY`

**What to do:**

1. Create a shared `requireEnv(name: string): string` utility that throws with a clear message.
2. Replace `process.env.VAR as string` with `requireEnv("VAR")`.
3. Replace `process.env.VAR!` with `requireEnv("VAR")`.
4. This ensures fast failure with clear error messages on missing env vars.

**Acceptance criteria:**

- [ ] Zero `as string` on `process.env` in codebase
- [ ] Zero `!` on `process.env` in codebase
- [ ] Missing env vars throw clear error at module load
- [ ] Build passes, tests pass

---

## MEDIUM — Admin Config In-Memory Cache (PM audit #67)

### Phase 144 MEDIUM — Cache admin config queries with short TTL

> Architect finding O-2. `getEffectivePlanConfig()`, `getEffectivePersonaAccessByPlan()`, `getEffectiveModelConfig()`, `getEffectiveSupportEmail()`, `getEffectiveStopReasonMessages()` are called on every `/api/openai` request (5 DB round trips per chat message). These settings change only when admin updates them.

**Files:**

1. Create `src/lib/utils/config-cache.ts` — simple in-memory cache with TTL (30s)
2. Update all `effective-*.ts` resolvers to use cache

**What to do:**

1. Create a generic `cachedQuery<T>(key: string, fetcher: () => Promise<T>, ttlMs: number): Promise<T>` utility.
2. Wrap each `getEffective*` resolver's DB calls in the cache.
3. TTL of 30 seconds balances freshness with DB load reduction.
4. Cache invalidation happens naturally via TTL expiry (admin updates are infrequent).

**Acceptance criteria:**

- [ ] Admin config queries cached with 30s TTL
- [ ] Repeated calls within TTL window return cached result
- [ ] Cache is per-process (no shared state concerns)
- [ ] Build passes, tests pass

---

## MEDIUM — Upload Filename Collision Prevention (PM audit #67)

### Phase 145 MEDIUM — Use `crypto.randomUUID()` for upload filenames

> Engineer finding M-7. `uploaded_file_${Date.now()}.${fileExtension}` could collide under high-concurrency uploads from the same user.

**File:** `src/app/api/upload/route.tsx`

**What to do:**

1. Replace `Date.now()` with `crypto.randomUUID()` in upload filename generation.
2. Result: `uploaded_file_${crypto.randomUUID()}.${fileExtension}`.

**Acceptance criteria:**

- [ ] Upload filenames use `crypto.randomUUID()` instead of `Date.now()`
- [ ] Build passes

---

## LOW — Admin User Detail Transaction Limit (PM audit #67)

### Phase 146 LOW — Add `.limit(50)` to admin user detail transaction query

> Architect finding W-6. `Transaction.find({ clerkId: user.clerkId })` in `getAdminUserDetail` has no `.limit()`. A user with many transactions causes an unbounded query.

**File:** `src/lib/utils/admin-queries.ts`

**What to do:** Add `.limit(50)` to the transaction query in `getAdminUserDetail`.

**Acceptance criteria:**

- [ ] Transaction query in admin user detail has `.limit(50)`
- [ ] Build passes

---

## LOW — Rename `.tsx` Utility Files to `.ts` (PM audit #67)

### Phase 147 LOW — Rename utility files with `.tsx` extension that contain no JSX

> Engineer finding L-4/L-5. Per coding standards, utility-only files should use `.ts` extension. Several utility files use `.tsx` but contain no JSX.

**Files to evaluate:**

1. `src/lib/utils/handleError.tsx` → `.ts`
2. `src/lib/utils/getPlanStatus.tsx` → `.ts`
3. `src/lib/utils/getFullName.tsx` → `.ts`
4. `src/lib/utils/getFormattedDate.tsx` → `.ts`
5. `src/lib/utils/generateString.tsx` → `.ts`

**What to do:**

1. Verify each file contains no JSX.
2. Rename `.tsx` → `.ts`.
3. Update all imports.
4. Update test file imports if needed.

**Acceptance criteria:**

- [ ] All utility-only files use `.ts` extension
- [ ] All imports updated
- [ ] Build passes, tests pass

---

## LOW — Bulk Operations Partial-Failure Reporting (PM audit #67)

### Phase 148 LOW — Report partial success/failure in admin bulk operations

> Engineer finding H-6. `bulkRemoveUsersAction` fails midway through a batch with no partial-failure reporting. Users deleted so far are not reported and no rollback is possible.

**File:** `src/lib/actions/admin.actions.tsx`

**What to do:**

1. Track successful and failed operations in the loop.
2. Return partial results: `{ success: N, failed: M, errors: [...] }`.
3. Apply to `bulkRemoveUsersAction` and `bulkSuspendUsersAction`.

**Acceptance criteria:**

- [ ] Bulk operations report partial success/failure
- [ ] Build passes

---

## LOW — Remaining Work

### Phase 73.2 LOW — Minor re-render and code quality fixes

### Phase 46.1 LOW — Admin error boundary

### Phase 46.2 LOW — Silent catch logging

---

## ON HOLD — Deferred

### Phase 29.x — Zod/Zustand app-wide modernization

### Phase 26.x — Persona-aware media prompts, Stripe auto-renewal

### Legal/nav/footer admin configurability — Deferred to v2

### TypeScript 6 / @typescript-eslint compatibility — Monitor for official TS 6 support in `@typescript-eslint` (Engineer finding M-3, PM audit #66)

---

> **Completed phases** archived in [`DONE.md`](DONE.md).
> All phases through 157 complete (incl. 135–142, 149–157, 74.2, 104, 125.3, 126.2, 134, plus 107.1–107.3, 108, 114, 125.1, 131, 132, 133, 120.1–120.7, 121–130, 128.2, 106, 156).
> All Milestones 0–25 COMPLETE.

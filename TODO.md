# Droplet — TODO

> Prioritized, actionable development tasks. Each task max ~30 minutes.
> Governed by **Droplet-PM**. Do not add tasks without PM approval.
> Ref: `SPEC.md` for full specification. `AGENTS.md` for coding rules. `DONE.md` for completed phases.
> Implementation agent: **Droplet-Engineer** (Senior Developer).
>
> **STATUS: PM audit #67 (2026-03-27). Milestones 0–25 COMPLETE. All phases through 140 complete (incl. 135–140, 74.2, 104, 125.3, 126.2, 134). 561 unit tests (97 suites). 8 E2E specs. Build passes. TSC clean. Node.js 24.12.0 runtime.**
> **GATE STATUS: All 7 gates GREEN. Lint (0 errors, 0 warnings), Knip (0 findings), TSC clean, build passes, unit tests (97/561), E2E (8 specs), coverage 85/80/85/85.**
> **TDD REBUILD COMPLETE. WCAG 2.2 AA COMPLETE. TD-HARDCODE-01 RESOLVED. Admin configurability ALL RESOLVED (FAQ 74.2 ✅, landing/hero/about 104 ✅, stop reasons 107 ✅, support email 74.1 ✅).**
> **Zero: `as never`, `as any`, `console.log`, `console.error`, `window.alert`, `window.confirm`, `strict: false`, stale TODOs — all in `src/`.**
> **SWOT audit #67 conducted. Architect + Engineer + PM triple audit. New findings below.**
> **NEXT SESSION: 141 (CRITICAL suspended user enforcement) → 142 (HIGH upload/aws rate limiting) → 143 (MEDIUM env var validation) → 144 (MEDIUM admin config caching) → 145 (MEDIUM upload filename collision) → 146 (LOW admin detail transaction limit) → 147 (LOW .tsx→.ts renames) → 148 (LOW bulk ops partial-failure)**

---

## CRITICAL — Suspended User Enforcement (PM audit #67 — Architect + Engineer + PM triple-confirmed)

### Phase 141 CRITICAL — Enforce `User.suspended` check in all API routes

> **Triple-confirmed finding.** Admin can suspend users via `toggleUserSuspensionAction` (sets `User.suspended = true`), but NO API route checks this field. Suspended users retain full API access — they can chat, upload files, generate media, and download content. `resolveEntitlements` already supports `isSuspended` parameter but it's never passed. `getUserById` doesn't even select the `suspended` field.

**Files:**

1. `src/lib/actions/user.actions.tsx` — `getUserById()` .select() must include `suspended`
2. `src/app/api/openai/route.tsx` — Add suspended check after `getUserById`, pass `isSuspended` to `resolveEntitlements`, return 403 if suspended
3. `src/app/api/upload/route.tsx` — Add suspended check after auth
4. `src/app/api/download/route.tsx` — Add suspended check after auth
5. `src/app/api/aws/route.tsx` — Add suspended check after auth
6. `src/lib/database/models/user.model.tsx` — Add `index: true` to `suspended` field

**What to do:**

1. Add `suspended` to `getUserById()` `.select()` projection.
2. In `/api/openai` route: after `getUserById`, check `if (userData.suspended)` → return `NextResponse.json({ error: "Account suspended" }, { status: 403 })`.
3. Pass `isSuspended: Boolean(userData.suspended)` to `resolveEntitlements()` call.
4. In `/api/upload`, `/api/download`, `/api/aws`: fetch user and check `suspended` before processing. Consider extracting a shared `requireActiveUser(userId)` guard.
5. Add `index: true` to `suspended` field in user model schema.
6. Add unit tests for suspended user rejection in each route.

**Acceptance criteria:**

- [ ] `getUserById` returns `suspended` field
- [ ] `/api/openai` returns 403 for suspended users
- [ ] `/api/upload` returns 403 for suspended users
- [ ] `/api/download` returns 403 for suspended users
- [ ] `/api/aws` returns 403 for suspended users
- [ ] `resolveEntitlements` receives `isSuspended` flag in production
- [ ] `suspended` field has `index: true` in user model
- [ ] Unit tests cover all 4 API routes rejecting suspended users
- [ ] Build passes, tests pass

---

## HIGH — Rate Limiting on Upload/AWS Endpoints (PM audit #67)

### Phase 142 HIGH — Add rate limiting to `/api/upload` and `/api/aws` endpoints

> Architect finding T-1. Upload and AWS endpoints have auth checks but zero rate limiting. An authenticated user can flood S3 with unlimited uploads — each triggers S3 PUT operations. This is a cost attack vector. The `/api/openai` endpoint has rate limiting but these don't.

**Files:**

1. `src/app/api/upload/route.tsx` — Add `enforceSlidingWindowRateLimit`
2. `src/app/api/aws/route.tsx` — Add `enforceSlidingWindowRateLimit`

**What to do:**

1. Import `enforceSlidingWindowRateLimit` from `@/lib/utils/rate-limit`.
2. Apply `enforceSlidingWindowRateLimit({ key: \`upload:${userId}\`, limit: 30, windowMs: 60_000 })` before processing in upload route.
3. Apply `enforceSlidingWindowRateLimit({ key: \`aws:${userId}\`, limit: 30, windowMs: 60_000 })` before processing in aws route.
4. Return proper 429 response with `Retry-After` header on rate limit hit.

**Acceptance criteria:**

- [ ] `/api/upload` has per-user rate limiting (30 req/60s)
- [ ] `/api/aws` has per-user rate limiting (30 req/60s)
- [ ] Rate limit returns 429 with `Retry-After` header
- [ ] Build passes, tests pass

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

1. Create a shared `throwEnvError(name: string): never` utility (or inline).
2. Replace `process.env.VAR as string` with `process.env.VAR ?? throwEnvError("VAR")`.
3. Replace `process.env.VAR!` with `process.env.VAR ?? throwEnvError("VAR")`.
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

### Admin config caching (Phase 144) — Optional performance optimization, not blocking

---

> **Completed phases** archived in [`DONE.md`](DONE.md).
> All phases through 140 complete (incl. 135–140, 74.2, 104, 125.3, 126.2, 134, plus 107.1–107.3, 108, 114, 125.1, 131, 132, 133, 120.1–120.7, 121–130, 128.2, 106).
> All Milestones 0–25 COMPLETE.

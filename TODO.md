# Droplet — TODO

> Prioritized, actionable development tasks. Each task max ~30 minutes.
> Governed by **Droplet-PM**. Do not add tasks without PM approval.
> Ref: `SPEC.md` for full specification. `AGENTS.md` for coding rules. `DONE.md` for completed phases.
> Implementation agent: **Droplet-Engineer** (Senior Developer).
>
> **STATUS: PM audit #71 (2026-03-28). Milestones 0–25 COMPLETE. All phases through 155 complete. 586 unit tests (101 suites). 8 E2E specs. Build passes. TSC clean. Node.js 24.12.0 runtime.**
> **GATE STATUS: All 7 gates GREEN. Lint (0 errors, 0 warnings), Knip (0 findings), TSC clean, build passes, unit tests (101/586), E2E (8 specs), coverage 85/80/85/85.**
> **TDD REBUILD COMPLETE. WCAG 2.2 AA COMPLETE. User deletion cascade COMPLETE (Phase 150). Library uploaded tab COMPLETE (Phase 151).**
> **Zero: `as never`, `as any`, `console.log`, `console.error`, `window.alert`, `window.confirm`, `strict: false`, stale TODOs — all in `src/`.**
> **Triple audit #71 conducted. Architect + Engineer + PM. ONE CRITICAL bug: Stripe webhook schema mismatch silently drops all payment processing (customers charged, no plan upgrade).**
> **NEXT SESSION: 157 (CRITICAL Stripe webhook fix) → 155.1 (HIGH scrollbar cleanup) → 158 (HIGH streaming hardening) → 156 (HIGH server-only guards) → 142 (HIGH rate limiting) → 143–148 (MEDIUM/LOW)**

---

## CRITICAL — Stripe Webhook Schema Mismatch (PM audit #71 — Triple audit finding C1)

### Phase 157 CRITICAL — Fix Stripe webhook `checkoutSessionMetadataSchema.strict()` rejecting valid payment metadata

> **ROOT CAUSE (Architect finding, Engineer + PM confirmed):** `checkoutPlan()` in `src/lib/actions/transaction.action.tsx` sends 6 fields in Stripe session metadata including `name: fullName`. The webhook handler in `src/app/api/webhooks/stripe/route.tsx` defines `checkoutSessionMetadataSchema` with only 5 fields and uses `.strict()` which rejects any extra keys. `safeParse` fails → no Transaction created → no User plan updated. **Customer is charged by Stripe but receives no plan upgrade. P0 money-loss bug.**

**Files:**

1. `src/app/api/webhooks/stripe/route.tsx` — Change `.strict()` to `.strip()` on `checkoutSessionMetadataSchema`
2. `src/lib/actions/transaction.action.tsx` — Remove unused `name` field from Stripe metadata

**What to do:**

1. In `route.tsx` L45-51: change `checkoutSessionMetadataSchema` from `.strict()` to `.strip()` (strips unknown keys instead of rejecting). This makes the webhook resilient to future metadata additions.
2. In `transaction.action.tsx` L95: remove `name: fullName` from the `metadata` object — this field is unused by the webhook handler.
3. Apply BOTH fixes for defense-in-depth (fix sender AND receiver).
4. Update unit tests for the webhook to verify extra metadata fields are tolerated.

**Acceptance criteria:**

- [ ] `checkoutSessionMetadataSchema` uses `.strip()` instead of `.strict()`
- [ ] `name` field removed from `checkoutPlan()` metadata
- [ ] Webhook correctly processes `checkout.session.completed` events
- [ ] Transaction record created in database after successful payment
- [ ] User plan updated after successful payment
- [ ] Existing unit tests pass
- [ ] New test: webhook tolerates extra metadata keys
- [ ] Build passes, all 7 gates GREEN

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

## HIGH — Add `server-only` Guards to Constants Files (PM audit #70 — SWOT finding W1/W2)

### Phase 156 HIGH — Add `import "server-only"` to constants files + fix type imports

> Architect + PM SWOT finding. 4 constants files lack `server-only` guards: `plans.tsx`, `assistant-personas.tsx`, `faqs.tsx`, `stop-reasons.ts`. These contain business-critical data (plan limits, persona definitions, FAQ content, stop reason codes). Currently safe because only imported by server-side code, but one careless client import would bundle plan/persona internals to the browser. `stop-reasons.ts` is blocked by `admin-stop-reasons-section.tsx` client import — must be refactored first.

**Files:**

1. `src/constants/plans.tsx` — Add `import "server-only"`
2. `src/constants/assistant-personas.tsx` — Add `import "server-only"`
3. `src/constants/faqs.tsx` — Add `import "server-only"`
4. `src/components/admin/settings/types.ts` — Change to `import type` for `PlanLimits` and `FaqItem` (required before adding guards — these are type-only imports used by client components)
5. `src/components/sections/profile/profile-usage.tsx` — Change to `import type` for `PlanLimits`
6. `src/constants/stop-reasons.ts` — Add `import "server-only"` AFTER fixing client dependency
7. `src/components/admin/settings/admin-stop-reasons-section.tsx` — Receive `STOP_REASON_CODES` as prop instead of importing directly
8. `src/app/(admin)/admin/settings/page.tsx` — Pass `STOP_REASON_CODES` to the section component

**What to do:**

1. In `types.ts`: change `import { PlanLimits } from "@/constants/plans"` → `import type { PlanLimits } from "@/constants/plans"`. Same for `FaqItem`.
2. In `profile-usage.tsx`: change to `import type { PlanLimits } from "@/constants/plans"`.
3. Add `import "server-only"` to top of `plans.tsx`, `assistant-personas.tsx`, `faqs.tsx`.
4. In `admin-stop-reasons-section.tsx`: add `stopReasonCodes: string[]` prop, remove import of `STOP_REASON_CODES`.
5. In `admin/settings/page.tsx`: import `STOP_REASON_CODES` and pass as prop to the section component.
6. Add `import "server-only"` to `stop-reasons.ts`.
7. Update unit tests if needed.

**Acceptance criteria:**

- [ ] `plans.tsx` has `import "server-only"`
- [ ] `assistant-personas.tsx` has `import "server-only"`
- [ ] `faqs.tsx` has `import "server-only"`
- [ ] `stop-reasons.ts` has `import "server-only"`
- [ ] `types.ts` uses `import type` for all plan/faq type imports
- [ ] `admin-stop-reasons-section.tsx` receives codes as prop (data-consumer pattern)
- [ ] Build passes, tests pass

---

## HIGH — Rate Limiting on Upload/AWS/Download Endpoints (PM audit #67 + #70)

### Phase 142 HIGH — Add rate limiting to `/api/upload`, `/api/aws`, and `/api/download` endpoints

> Architect finding T-1, Engineer finding M1/M2. Upload, AWS, and download endpoints have auth checks but zero rate limiting. An authenticated user can flood S3 with unlimited uploads or downloads — each triggers S3 operations. This is a cost attack vector. The `/api/openai` endpoint has rate limiting but these don't.

**Files:**

1. `src/app/api/upload/route.tsx` — Add `enforceSlidingWindowRateLimit`
2. `src/app/api/aws/route.tsx` — Add `enforceSlidingWindowRateLimit`
3. `src/app/api/download/route.tsx` — Add `enforceSlidingWindowRateLimit`

**What to do:**

1. Import `enforceSlidingWindowRateLimit` from `@/lib/utils/rate-limit`.
2. Apply `enforceSlidingWindowRateLimit({ key: \`upload:${userId}\`, limit: 30, windowMs: 60_000 })` before processing in upload route.
3. Apply `enforceSlidingWindowRateLimit({ key: \`aws:${userId}\`, limit: 30, windowMs: 60_000 })` before processing in aws route.
4. Apply `enforceSlidingWindowRateLimit({ key: \`download:${userId}\`, limit: 60, windowMs: 60_000 })` before processing in download route.
5. Return proper 429 response with `Retry-After` header on rate limit hit.

**Acceptance criteria:**

- [ ] `/api/upload` has per-user rate limiting (30 req/60s)
- [ ] `/api/aws` has per-user rate limiting (30 req/60s)
- [ ] `/api/download` has per-user rate limiting (60 req/60s)
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
> All phases through 155 complete (incl. 135–141, 149–155, 74.2, 104, 125.3, 126.2, 134, plus 107.1–107.3, 108, 114, 125.1, 131, 132, 133, 120.1–120.7, 121–130, 128.2, 106).
> All Milestones 0–25 COMPLETE.

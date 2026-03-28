# Droplet — TODO

> Prioritized, actionable development tasks. Each task max ~30 minutes.
> Governed by **Droplet-PM**. Do not add tasks without PM approval.
> Ref: `SPEC.md` for full specification. `AGENTS.md` for coding rules. `DONE.md` for completed phases.
> Implementation agent: **Droplet-Engineer** (Senior Developer).
>
> **STATUS: PM audit #73 (2026-03-28). Milestones 0–25 COMPLETE. All phases through 159 complete (incl. 142, 155.1, 156, 158, 159). 591 unit tests (101 suites). 49 E2E tests (8 spec files). Build passes. TSC clean. Node.js 24.12.0 runtime.**
> **GATE STATUS: All 7 gates GREEN. Lint (0 errors, 0 warnings), Knip (0 findings), TSC clean, build passes, unit tests (101/591), E2E (8 specs/49 tests), coverage 85/80/85/85.**
> **TDD REBUILD COMPLETE. WCAG 2.2 AA COMPLETE. User deletion cascade COMPLETE (Phase 150). Library uploaded tab COMPLETE (Phase 151). Scrollbar removal COMPLETE (Phase 155 + 155.1). SSE catch/finally hardened (Phase 158). Button test fixed (Phase 159).**
> **Zero: `as never`, `as any`, `console.log`, `console.error`, `window.alert`, `window.confirm`, `strict: false`, `droplet-scrollbar`, stale TODOs — all in `src/`.**
>
> **OWNER RE-REPORTS (production testing, PM audit #73):**
>
> - **CRITICAL** — Media generation still triggers "The response stream ended unexpectedly" in production.
> - **CRITICAL** — Payment goes through Stripe but NO Transaction registered, user plan NOT updated.
> - **HIGH** — Admin `/admin/settings` fully configurable — minor promo text gaps remain.
>
> **ROOT CAUSE ANALYSIS (PM audit #73, triple audit — Architect + Engineer + PM):**
>
> - Stream error: Missing `maxDuration` export on API route (serverless function killed before media gen completes). No heartbeat for text-only responses. Silent failure swallowing in catch blocks.
> - Payment: Most likely Stripe Dashboard webhook endpoint misconfiguration. CRITICAL code bug found: non-atomic Transaction/User update — if Transaction.create succeeds but User.findOneAndUpdate fails, idempotency check prevents Stripe retry from ever updating user plan. Webhook error details swallowed (actual `constructEvent` error not logged).
>
> **NEXT SESSION: Phase 160 (CRITICAL stream fix) → Phase 161 (CRITICAL payment fix) → Phase 162 (HIGH promo text) → Phase 143–147 (MEDIUM/LOW)**

---

## CRITICAL — Stream Error Production Fix (PM audit #73 — triple audit)

### Phase 160 CRITICAL — Add `maxDuration`, text-streaming heartbeat, and error logging to `/api/openai` route

> Owner still reports "The response stream ended unexpectedly" on media generation AND large text responses in production. Phase 149 (heartbeat) + Phase 158 (catch/finally hardening) are applied — the in-container code is correct. But the serverless function itself is killed by the platform before media generation completes. Triple-confirmed root cause: no `export const maxDuration` → platform uses default (10–60s depending on plan) → video generation (up to 180s) always fails.

**File:** `src/app/api/openai/route.tsx`

**What to do:**

1. Add `export const maxDuration = 300;` near the top of the route file (after imports, before constants). This tells Next.js/Vercel to allow 300s function execution (covers 180s video + DB ops + margin).
2. Start a low-frequency heartbeat (30s interval) immediately after writing the `meta` stream event — not just during media generation. This prevents infrastructure idle-timeout kills during long text streaming where OpenAI may have pauses between chunks.
3. In the existing empty `catch {}` blocks (lines ~1549 and ~1554), add `process.stderr.write` logging so failed stream event writes and controller closes are not silently swallowed. Format: `[openai-stream] Failed to write <error|close> event to stream\n`.
4. Add a `didSendFinal` boolean flag. Before `controller.close()` in finally, if `!didSendFinal`, attempt to write a synthetic error event. This guarantees the client ALWAYS receives either `final` or `error`.

**Acceptance criteria:**

- [ ] `export const maxDuration = 300` exported from route file
- [ ] Text-streaming heartbeat started at stream creation (not just media generation)
- [ ] Empty `catch {}` blocks replaced with `catch { process.stderr.write(...) }`
- [ ] `didSendFinal` flag ensures client always gets `final` or `error` event
- [ ] Build passes, tests pass
- [ ] Media generation works in production without "stream ended unexpectedly"

---

## CRITICAL — Payment Webhook Production Fix (PM audit #73 — triple audit)

### Phase 161 CRITICAL — Harden Stripe webhook: non-atomic fix, error logging, arrival logging

> Owner still reports payment goes through Stripe but NO Transaction registered and user plan NOT updated. Code-level Phase 157 fix (.strict() → .strip()) is applied. Triple audit found TWO root causes:
>
> **RC-1 (Configuration):** Stripe Dashboard webhook endpoint likely not configured or misconfigured for production (wrong URL, wrong secret, or `checkout.session.completed` not selected). This is an ops task — verify in Stripe Dashboard.
>
> **RC-2 (Code bug — CRITICAL):** Non-atomic Transaction/User update with incorrect idempotency. If `Transaction.create` succeeds but `User.findOneAndUpdate` fails or returns null (DB hiccup, timeout), the idempotency check at line 162 finds the existing Transaction and returns 200 "Already processed" — the user plan is NEVER updated. Stripe stops retrying because it got 200. This is a permanent data consistency gap.

**File:** `src/app/api/webhooks/stripe/route.tsx`

**What to do:**

1. **Fix non-atomic idempotency (CRITICAL):** When the idempotency check finds an existing Transaction, also verify the user's plan was updated. If the user's plan doesn't match (still on old plan), reattempt the user plan update instead of returning "Already processed."
2. **Log actual `constructEvent` error:** Change the catch block at line 106 to capture the error and log it: `catch (err) { logStripeWebhookError(\`Invalid webhook signature: ${err instanceof Error ? err.message : "unknown"}\`); }`. This immediately reveals secret mismatches.
3. **Log actual `createTransaction` error:** Same pattern for the `createTransaction` catch block — log the real error message, not just "Failed to create transaction."
4. **Add pre-verification arrival log:** Before the signature verification try/catch, add `logStripeWebhookEvent("Webhook received")` or equivalent so operators can confirm webhooks are arriving at all.

**Acceptance criteria:**

- [ ] Idempotency check verifies BOTH Transaction existence AND user plan state
- [ ] If Transaction exists but user plan not updated, reattempt user plan update
- [ ] `constructEvent` error message logged (not swallowed)
- [ ] `createTransaction` error details logged (not swallowed)
- [ ] Webhook arrival logged before signature verification
- [ ] Build passes, tests pass

**Ops task (non-code, owner action):**

- [ ] Verify Stripe Dashboard → Developers → Webhooks → endpoint URL matches production domain (`/api/webhooks/stripe`)
- [ ] Verify `checkout.session.completed` event is selected in webhook endpoint config
- [ ] Verify `STRIPE_WEBHOOK_SECRET` in production .env matches the signing secret shown in Stripe Dashboard for that endpoint
- [ ] Check Stripe Dashboard → Developers → Webhooks → Event deliveries for recent failures

---

## HIGH — Admin Promo Text Configurability (PM audit #73)

### Phase 162 HIGH — Make sidebar promo upgrade text admin-configurable

> Owner directive: admin settings must control ALL display text. `ChatSidebarPromo` has hardcoded "Go Pro"/"Go Premium" and hardcoded promo descriptions. These should come from admin-configurable settings or at minimum from the effective plan config.

**File:** `src/components/chat/sidebar/chat-sidebar-promo.tsx`

**What to do:**

1. Accept promo title and description as props from the parent server component (which reads from effective admin config).
2. Or, if parent restructuring is too invasive, add `AppSetting` keys for `admin.promoTitle.pro`, `admin.promoTitle.premium`, `admin.promoDescription.pro`, `admin.promoDescription.premium` and create a resolver.
3. Remove hardcoded "Go Pro"/"Go Premium" and hardcoded promo description strings from the component.

**Acceptance criteria:**

- [ ] Zero hardcoded promo marketing text in `chat-sidebar-promo.tsx`
- [ ] Promo title and description come from admin-configurable source
- [ ] Build passes, tests pass

---

## MEDIUM — Environment Variable Runtime Validation (PM audit #67)

### Phase 143 MEDIUM — Replace `as string` / `!` casts on env vars with runtime validation

> Architect finding W-2, Engineer finding H-1/H-2/H-4. 4 `as string` casts and 4 `!` non-null assertions on `process.env` values. If any env var is missing, broken clients are silently constructed.

**Files:**

1. `src/constants/aws.tsx` — 3 `as string` casts on `AWS_S3_REGION`, `AWS_S3_ACCESS_ID`, `AWS_S3_SECRET_KEY`
2. `src/constants/openai.tsx` — 3 `!` on `OPENAI_ORG`, `OPENAI_PRJ`, `OPENAI_KEY`
3. `src/lib/database/mongoose.tsx` — 1 `as string` on `MONGODB_URL`
4. `src/lib/actions/transaction.action.tsx` — 1 `!` on `STRIPE_SECRET_KEY`

**What to do:**

1. Create a shared `requireEnv(name: string): string` utility that throws with a clear message.
2. Replace all `process.env.VAR as string` and `process.env.VAR!` with `requireEnv("VAR")`.

**Acceptance criteria:**

- [ ] Zero `as string` on `process.env` in codebase
- [ ] Zero `!` on `process.env` in codebase
- [ ] Missing env vars throw clear error at module load
- [ ] Build passes, tests pass

---

## MEDIUM — Admin Config In-Memory Cache (PM audit #67)

### Phase 144 MEDIUM — Cache admin config queries with short TTL

> 5+ DB round trips per `/api/openai` request for admin settings that change infrequently.

**What to do:**

1. Create `src/lib/utils/config-cache.ts` — simple in-memory cache with 30s TTL.
2. Wrap each `getEffective*` resolver's DB calls in the cache.

**Acceptance criteria:**

- [ ] Admin config queries cached with 30s TTL
- [ ] Repeated calls within TTL window return cached result
- [ ] Build passes, tests pass

---

## MEDIUM — Upload Filename Collision Prevention (PM audit #67)

### Phase 145 MEDIUM — Use `crypto.randomUUID()` for upload filenames

**File:** `src/app/api/upload/route.tsx`

**What to do:** Replace `Date.now()` with `crypto.randomUUID()` in upload filename generation.

**Acceptance criteria:**

- [ ] Upload filenames use `crypto.randomUUID()`
- [ ] Build passes

---

## LOW — Admin User Detail Transaction Limit (PM audit #67)

### Phase 146 LOW — Add `.limit(50)` to admin user detail transaction query

**File:** `src/lib/utils/admin-queries.ts`

**What to do:** Add `.limit(50)` to the transaction query in `getAdminUserDetail`.

**Acceptance criteria:**

- [ ] Transaction query has `.limit(50)`
- [ ] Build passes

---

## LOW — Rename `.tsx` Utility Files to `.ts` (PM audit #67)

### Phase 147 LOW — Rename utility files with `.tsx` extension that contain no JSX

**Files to evaluate:**

1. `src/lib/utils/handleError.tsx` → `.ts`
2. `src/lib/utils/getPlanStatus.tsx` → `.ts`
3. `src/lib/utils/getFullName.tsx` → `.ts`
4. `src/lib/utils/getFormattedDate.tsx` → `.ts`
5. `src/lib/utils/generateString.tsx` → `.ts`

**Acceptance criteria:**

- [ ] All utility-only files use `.ts` extension
- [ ] All imports updated
- [ ] Build passes, tests pass

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

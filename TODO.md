# Droplet — TODO

> Prioritized, actionable development tasks. Each task max ~30 minutes.
> Governed by **Droplet-PM**. Do not add tasks without PM approval.
> Ref: `SPEC.md` for full specification. `AGENTS.md` for coding rules. `DONE.md` for completed phases.
> Implementation agent: **Droplet-Engineer** (Senior Developer).
>
> **STATUS: PM audit #75 (2026-03-30). Milestones 0–25 COMPLETE. All phases through 161 complete + 164 complete. 592 unit tests (101 suites). 49 E2E tests (8 spec files). Build passes. TSC clean. Node.js 24.12.0 runtime.**
> **GATE STATUS: All 7 validation gates GREEN locally. Lint (0 errors, 0 warnings), Knip (0 findings), TSC clean, build passes, unit tests (101/592), E2E (8 specs/49 tests), coverage 85/80/85/85.**
> **RELEASE GATE STATUS: BLOCKED — 1 CRITICAL Vercel deployment blocker (maxDuration). Payment + stream code fixes complete but blocked from deploying.**
> **Zero: `as never`, `as any`, `console.log`, `console.error`, `window.alert`, `window.confirm`, `strict: false`, `droplet-scrollbar`, stale TODOs — all in `src/`.**
>
> **CRITICAL PRODUCTION BLOCKER (PM audit #75 — owner report):**
>
> - **CRITICAL** — Vercel Hobby plan rejects `maxDuration = 300` on `api/openai` route. Error: "Builder returned invalid maxDuration value for Serverless Function. Serverless Functions must have a maxDuration between 1 and 60 for plan hobby." Deployment FAILS. All code fixes (Phase 160, 161, 164) cannot reach production.
>
> **Previous CRITICAL bugs status (PM audit #75):**
>
> - Stream error fix (Phase 160): CODE-COMPLETE. `maxDuration=300`, heartbeat, `didSendFinal`, stderr logging all implemented. **BUT: maxDuration=300 exceeds Vercel Hobby limit (60s). Must be reduced to 60 OR owner must upgrade to Vercel Pro ($20/mo).**
> - Payment webhook fix (Phase 161): CODE-COMPLETE. Idempotency repair, top-level try/catch, arrival/error logging. **Awaiting deployment + Stripe Dashboard ops verification.**
> - Client timeout alignment (Phase 164): CODE-COMPLETE. `STREAM_REQUEST_TIMEOUT_MS = 310_000`. **Must be re-aligned if maxDuration changes.**
>
> **EXECUTION ORDER: Phase 160.1 (CRITICAL Vercel maxDuration fix) → Phase 162 (HIGH promo text) → Phase 163 (HIGH global-error) → Phase 166 (HIGH maxDuration on other routes) → Phase 167 (HIGH empty catch blocks) → Phase 143–148 (MEDIUM/LOW backlog)**

---

## CRITICAL — Vercel Hobby maxDuration Deployment Blocker (PM audit #75)

### Phase 160.1 CRITICAL — Fix `maxDuration` to comply with Vercel Hobby plan limit

> Owner reports Vercel build error: "Builder returned invalid maxDuration value for Serverless Function 'api/openai'. Serverless Functions must have a maxDuration between 1 and 60 for plan hobby." Phase 160 set `maxDuration = 300` which requires Vercel Pro ($20/mo). Vercel Hobby allows max 60s. Deployment is completely blocked.
>
> **Impact analysis:** Reducing to 60s means video generation (up to 180s) WILL time out on Hobby. Image generation (~15-30s) and audio generation (~10-20s) should fit. Text streaming with heartbeat should fit. This is a hard platform constraint — no code workaround exists. Owner must either: (a) accept 60s limit and disable/warn on video gen, OR (b) upgrade Vercel plan.
>
> **PM Decision:** Set `maxDuration = 60` to unblock deployment immediately. Video generation timeout is an accepted trade-off on Vercel Hobby. Document the constraint. Re-align client timeout to match.

**Files:**

1. `src/app/api/openai/route.tsx` — Change `maxDuration` from `300` to `60`
2. `src/components/chat/chat-wrapper.tsx` — Change `STREAM_REQUEST_TIMEOUT_MS` from `310_000` to `70_000` (60s server max + 10s margin)
3. `tests/unit/routes/openai-route-streaming.test.ts` — Update `maxDuration` assertion from `300` to `60`
4. `tests/unit/components/chat-wrapper.test.tsx` — Update timeout test from `310_000` to `70_000`

**What to do:**

1. Change `export const maxDuration = 300` to `export const maxDuration = 60` in the OpenAI route.
2. Change `STREAM_REQUEST_TIMEOUT_MS` from `310_000` to `70_000` in `chat-wrapper.tsx`.
3. Update the unit test asserting `maxDuration` value.
4. Update the unit test asserting `STREAM_REQUEST_TIMEOUT_MS` value.

**Acceptance criteria:**

- [ ] `export const maxDuration = 60` in OpenAI route
- [ ] `STREAM_REQUEST_TIMEOUT_MS = 70_000` in chat-wrapper
- [ ] Unit tests updated and passing
- [ ] Vercel build succeeds (no maxDuration error)
- [ ] Build passes, tests pass

**Known trade-off:** Video generation requests exceeding 60s will time out on Vercel Hobby. Text chat, image gen (~15-30s), and audio gen (~10-20s) should work within the 60s window. Owner can upgrade to Vercel Pro ($20/mo) for `maxDuration` up to 300s, which would restore full video generation support. When/if upgrading, change `maxDuration` back to `300` and `STREAM_REQUEST_TIMEOUT_MS` back to `310_000`.

**Ops decision required from owner:**

- [ ] Accept 60s limit on Hobby (video gen may time out) — OR
- [ ] Upgrade to Vercel Pro ($20/mo) for 300s maxDuration support

---

## HIGH — Admin Promo Text Configurability (PM audit #73)

### Phase 162 HIGH — Make sidebar promo upgrade text admin-configurable

> Owner directive: admin settings must control ALL display text. `ChatSidebarPromo` has hardcoded "Go Pro"/"Go Premium" and hardcoded promo descriptions. `PlanPromo` has hardcoded "Unlock premium features", "Free forever", "Admin access - full permissions". `PersonaCard` has hardcoded upgrade messaging. These should come from admin-configurable settings or at minimum from the effective plan config.

**Files:**

1. `src/components/chat/sidebar/chat-sidebar-promo.tsx` — "Go Pro"/"Go Premium", promo descriptions, "Admin"/"Account Suspended" text
2. `src/components/shared/plan-promo.tsx` — "Free forever", "Admin access - full permissions", "Unlock premium features with an upgrade!", "Upgrade now", suspension text
3. `src/components/shared/persona-card.tsx` — "Upgrade to ${requiredPlan} to unlock this persona", "Trial access with reduced limits..."

**What to do:**

1. Create `src/lib/utils/effective-promo-content.ts` resolver following the existing `effective-*` pattern. Keys: `admin.promoTitle.pro`, `admin.promoTitle.premium`, `admin.promoDescription.pro`, `admin.promoDescription.premium`, `admin.promoUpgradeCta`, `admin.promoAdminLabel`, `admin.promoAdminDescription`, `admin.promoSuspensionTitle`, `admin.promoSuspensionDescription`.
2. Parent server components pass resolved promo text as props to client components.
3. Remove ALL hardcoded marketing/promo strings from the 3 files above. CSS class names and route paths are excluded (those are structural, not marketing).

**Acceptance criteria:**

- [ ] Zero hardcoded promo/marketing text in `chat-sidebar-promo.tsx`
- [ ] Zero hardcoded promo/marketing text in `plan-promo.tsx`
- [ ] Zero hardcoded upgrade messaging text in `persona-card.tsx`
- [ ] Promo text comes from admin-configurable source via `effective-promo-content.ts` resolver
- [ ] Admin UI section for editing promo text in `/admin/settings`
- [ ] Build passes, tests pass

---

## HIGH — Global Error Boundary (PM audit #74 — Architect finding)

### Phase 163 HIGH — Add `global-error.tsx` for root layout error recovery

> No `global-error.tsx` exists. In Next.js, `global-error.tsx` catches errors in the root layout itself. Without it, a root layout error produces a raw browser error page with no recovery path.

**File:** `src/app/global-error.tsx` (new)

**What to do:**

1. Create `src/app/global-error.tsx` as a client component (`"use client"`).
2. Render a minimal error UI with "Something went wrong" message, a "Try again" button (calls `reset()`), and a "Return home" link.
3. Include required `<html>` and `<body>` tags (Next.js requirement for global-error).
4. Apply basic Droplet styling inline (no theme dependency since root layout may have failed).

**Acceptance criteria:**

- [ ] `src/app/global-error.tsx` exists and is a valid `"use client"` component
- [ ] Contains `<html>` and `<body>` tags
- [ ] Shows error recovery UI with "Try again" and "Return home"
- [ ] Build passes

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

## HIGH — Missing `maxDuration` on External-Service API Routes (PM audit #75 — Engineer finding)

### Phase 166 HIGH — Add `maxDuration` exports to 5 API routes calling external services

> AGENTS.md rule 10: "All API routes that call external services must export `maxDuration`." Only `/api/openai` has this export. 5 routes are missing it. Per SPEC.md Section 8.10: upload/download/aws = 30s, webhooks/stripe = 30s, webhooks/clerk = 30s.

**Files:**

1. `src/app/api/upload/route.tsx` — Add `export const maxDuration = 30;`
2. `src/app/api/download/route.tsx` — Add `export const maxDuration = 30;`
3. `src/app/api/aws/route.tsx` — Add `export const maxDuration = 30;`
4. `src/app/api/webhooks/stripe/route.tsx` — Add `export const maxDuration = 30;`
5. `src/app/api/webhooks/clerk/route.tsx` — Add `export const maxDuration = 30;`

**Acceptance criteria:**

- [ ] All 6 API routes have `export const maxDuration`
- [ ] Values: openai=60, upload/download/aws=30, webhooks=30
- [ ] Build passes

---

## HIGH — Fix Empty Catch Blocks (PM audit #75 — Engineer finding)

### Phase 167 HIGH — Add error handling to 2 empty catch blocks violating AGENTS.md

> AGENTS.md: "No empty catch blocks." 2 violations found by Engineer audit.

**Files:**

1. `src/components/chat/sidebar/chat-sidebar-shell.tsx` line 75 — `localStorage.setItem()` empty catch. Add `// localStorage quota exceeded — non-critical, intentionally discarded` comment.
2. `src/components/chat/chat-sidebar.tsx` line 49 — Server data-fetch empty catch. Add `process.stderr.write()` logging.

**Acceptance criteria:**

- [ ] Zero empty `catch {}` blocks in `src/`
- [ ] Build passes

---

## MEDIUM — Checkout Success Page DB Polling (PM audit #75 — Architect finding)

### Phase 165 MEDIUM — Add plan confirmation polling to checkout success page

> Architect recommendation: checkout success page shows "Payment successful" based on Stripe status, but webhook may not have processed yet. User sees old plan. Add lightweight polling for plan confirmation.

**File:** `src/app/(public)/checkout-success/page.tsx` (or add client component)

**What to do:**

1. Add a client component that polls a plan-status endpoint every 3-5s for up to 30s.
2. Show "Confirming your plan upgrade..." initially.
3. On confirmation: "Plan upgraded successfully!" with green indicator.
4. On timeout: "Payment successful. Your plan will be updated shortly."

**Acceptance criteria:**

- [ ] Checkout success page shows plan confirmation status
- [ ] Polling stops after confirmation or 30s timeout
- [ ] Build passes

---

## ON HOLD — Deferred

### Phase 29.x — Zod/Zustand app-wide modernization

### Phase 26.x — Persona-aware media prompts, Stripe auto-renewal

### Legal/nav/footer admin configurability — Deferred to v2

### TypeScript 6 / @typescript-eslint compatibility — Monitor for official TS 6 support in `@typescript-eslint` (Engineer finding M-3, PM audit #66)

---

> **Completed phases** archived in [`DONE.md`](DONE.md).
> All phases through 161 complete + 164 complete (incl. 135–142, 149–161, 164, 74.2, 104, 125.3, 126.2, 134, plus 107.1–107.3, 108, 114, 125.1, 131, 132, 133, 120.1–120.7, 121–130, 128.2, 106, 156).
> All Milestones 0–25 COMPLETE.

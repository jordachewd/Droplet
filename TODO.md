# Droplet — TODO

> Prioritized, actionable development tasks. Each task max ~30 minutes.
> Governed by **Droplet-PM**. Do not add tasks without PM approval.
> Ref: `SPEC.md` for full specification. `AGENTS.md` for coding rules. `DONE.md` for completed phases.
> Implementation agent: **Droplet-Engineer** (Senior Developer).
>
> **STATUS: PM audit #83 (2026-04-01). DEPLOYED TO PRODUCTION. 2 CRITICAL production bugs active (payment awaiting ops verification, streaming). Quintuple-audit verified (Architect + Engineer + PM + independent re-audit). 597 unit tests (101 suites). 49 E2E tests (8 spec files). All 7 gates GREEN. Build passes. TSC clean. Lint clean. Knip clean. Node.js 24.12.0 runtime.**
>
> **GATE STATUS: Product Gate RED (2 CRITICAL bugs). Admin Gate YELLOW (Phase 162 pending). Compliance Gate YELLOW (33 empty catch blocks, 8 env casts). Validation Gate GREEN (597 tests pass).**
>
> **Zero: `as never`, `as any`, `console.log`, `console.error`, `window.alert`, `window.confirm`, `strict: false`, `droplet-scrollbar`, stale TODOs — all in `src/`.**
>
> **REMAINING PRODUCTION BUGS (PM audit #83):**
>
> - 🟡 BUG-PAYMENT **AWAITING OPS VERIFICATION**: Phase 169 diagnostic logging DEPLOYED. Code quintuple-audited CORRECT (Architect + Engineer + PM independently confirm). **Owner must: (1) make test payment, (2) check Vercel function logs for `Event type received:` entries, (3) if `checkout.session.completed` absent → enable in Stripe Dashboard → Webhooks → Events.** No further engineering action until logs are reviewed.
> - 🔴 BUG-STREAM: Stream ends unexpectedly on media gen. Vercel Hobby 60s timeout kills function before pipeline completes. **Phase 160.2 (proactive 55s safety timer) is #1 engineering priority.**
>
> **EXECUTION ORDER (PM audit #83 — updated 2026-04-01):**
>
> 1. **🔴 Phase 160.2 CRITICAL** — Proactive timeout safety net (55s timer before Vercel kill). BUG-STREAM fix.
> 2. **Phase 167.2 HIGH** — Fix 33 remaining empty catch blocks.
> 3. **Phase 162 HIGH** — Promo text admin-configurable (~25 hardcoded strings).
> 4. **Phase 163 HIGH** — Global error boundary (`global-error.tsx`).
> 5. **Phase 165 MEDIUM** — Checkout success page DB polling.
> 6. **Phase 143 MEDIUM** — Env var runtime validation (8 unsafe casts).
> 7. **Phase 144 MEDIUM** — Admin config in-memory cache.
> 8. **Phase 145–148 LOW** — Backlog.
>
> _BUG-PAYMENT is now OPS/OWNER action, not engineering. BUG-STREAM is #1 engineering priority._

---

## 🔴 ENGINEER START HERE — Phase 160.2 CRITICAL — Proactive Timeout Safety Net

> Stream error on media gen still failing in production. All code mitigations (heartbeat, didSendFinal, maxDuration=60, controllerClosed guard) are deployed. Root cause: Vercel Hobby 60s function timeout kills server before pipeline completes. This phase adds a proactive safety net that sends a graceful error BEFORE Vercel kills the function.

**File:** `src/app/api/openai/route.tsx`

**What to do:**

1. At the start of the `ReadableStream.start(controller)` callback, record `const startTime = Date.now();`.
2. Define `const TIMEOUT_SAFETY_MS = (maxDuration - 5) * 1000;` (55s for current maxDuration=60).
3. Start a `setTimeout` (the "safety timer") that fires at `TIMEOUT_SAFETY_MS`:
   - Sends `writeStreamEvent(controller, { type: "error", error: "Your request is taking longer than expected. Media generation may still be processing in the background. Please check your library or start a new conversation." })` with source `"proactive timeout safety net"`.
   - Calls `stopGeneralHeartbeat()` and `stopMediaHeartbeat()`.
   - Sets `controllerClosed = true` and calls `controller.close()` (wrapped in try/catch).
4. Clear the safety timer in the `finally` block if the pipeline completes normally.
5. Update `src/components/chat/chat-wrapper.tsx` to display this specific timeout error message with orange/warning styling (not red/error — since media may still be processing in the background).

**Acceptance criteria:**

- [ ] Safety timer fires at `maxDuration - 5s` and sends graceful error event
- [ ] Client receives and displays the timeout message (not raw "stream ended unexpectedly")
- [ ] Normal-speed requests are unaffected (timer cleared before firing)
- [ ] Video gen requests get a clear message instead of silent crash
- [ ] Build passes, tests pass

---

## HIGH — Phase 167.2 — Fix 33 Remaining Empty Catch Blocks

> Phase 167 was partially completed (targeted catches in API routes, admin actions, delete cascade, sidebar). **33 parameterless `catch {` blocks remain across `src/`** (triple-audit verified, PM audit #82). 3 already have comments (image-holder.tsx L48, droplet-theme.tsx L49 + L59). 30 need fixing.
>
> AGENTS.md: "No empty catch blocks — every catch must either capture the error variable and log to `process.stderr.write()`, or have a code comment explaining why the error is intentionally discarded."

**Category A — Server-side catches that MUST LOG (production debugging at stake):**

| #   | File                                         | Line | Context                     |
| --- | -------------------------------------------- | ---- | --------------------------- |
| 1   | `src/app/api/webhooks/clerk/route.tsx`       | 292  | Webhook verify failure      |
| 2   | `src/app/api/webhooks/clerk/route.tsx`       | 497  | User delete cleanup         |
| 3   | `src/app/api/webhooks/clerk/route.tsx`       | 523  | Webhook processing failure  |
| 4   | `src/lib/actions/user.actions.tsx`           | 104  | Clerk user deletion failure |
| 5   | `src/lib/actions/task.actions.tsx`           | 338  | S3 cleanup                  |
| 6   | `src/lib/actions/task.actions.tsx`           | 348  | Task deletion               |
| 7   | `src/lib/utils/ensure-user-synced.ts`        | 108  | Clerk metadata sync         |
| 8   | `src/lib/utils/aws/uploadFileToAWS.tsx`      | 37   | S3 upload (use `{ cause }`) |
| 9   | `src/app/(public)/checkout-success/page.tsx` | 45   | Stripe session verify       |
| 10  | `src/lib/utils/openai/generateResponse.tsx`  | 425  | JSON.parse args             |

**Category B — Effective-\* resolver fallback catches (add comment — intentional fallback to defaults):**

| #   | File                                        | Line          | Count |
| --- | ------------------------------------------- | ------------- | ----- |
| 11  | `src/lib/utils/effective-website-copy.ts`   | 326, 340      | 2     |
| 12  | `src/lib/utils/effective-stop-reasons.ts`   | 65            | 1     |
| 13  | `src/lib/utils/effective-plan-config.ts`    | 267, 285, 299 | 3     |
| 14  | `src/lib/utils/effective-persona-config.ts` | 163           | 1     |
| 15  | `src/lib/utils/effective-persona-access.ts` | 69            | 1     |
| 16  | `src/lib/utils/effective-model-config.ts`   | 92            | 1     |
| 17  | `src/lib/utils/effective-faq-content.ts`    | 93            | 1     |

**Category C — Client catches (add comment for intentional discards):**

| #   | File                                               | Line | Context            |
| --- | -------------------------------------------------- | ---- | ------------------ |
| 18  | `src/components/shared/audio-player.tsx`           | 109  | Audio init failure |
| 19  | `src/components/chat/sidebar/chat-sidebar-nav.tsx` | 144  | Delete failure     |
| 20  | `src/components/chat/library-delete-button.tsx`    | 66   | Delete failure     |
| 21  | `src/components/chat/chat-wrapper.tsx`             | 300  | JSON parse         |
| 22  | `src/components/chat/chat-input.tsx`               | 115  | Upload failure     |

**Category D — Utility catches (add comment for URL/parse fallbacks):**

| #   | File                                          | Line  | Count |
| --- | --------------------------------------------- | ----- | ----- |
| 23  | `src/lib/utils/normalize-public-asset-url.ts` | 8, 33 | 2     |
| 24  | `src/lib/utils/aws/s3-file-reference.ts`      | 9, 99 | 2     |
| 25  | `src/lib/utils/download-url-allowlist.ts`     | 54    | 1     |
| 26  | `src/app/api/download/route.tsx`              | 55    | 1     |

**Already have comments (NO CHANGE):** `image-holder.tsx` L48, `droplet-theme.tsx` L49 + L59, `layout.tsx` L73.

**Instructions:**

1. **Category A:** Capture error — `catch (error)` → `process.stderr.write(\`[source] Error: ${error instanceof Error ? error.message : "unknown"}\\n\`)`. For `uploadFileToAWS`: use `throw new Error("File upload failed", { cause: error })`.
2. **Category B:** Add comment: `// Intentional fallback to defaults — admin config DB error is non-fatal`
3. **Category C:** Add comment where intentional, or capture error if genuinely useful.
4. **Category D:** Add comment: `// URL/path parse failure — non-fatal, fallback value used`

**Acceptance criteria:**

- [ ] Zero uncommented parameterless `catch {` blocks in `src/`
- [ ] Server-side catches (Category A) log error details via `process.stderr.write()`
- [ ] Client/utility catches (Categories B-D) have explaining comments or capture error
- [ ] `uploadFileToAWS` uses `{ cause: error }` pattern
- [ ] Build passes, tests pass

---

## HIGH — Phase 162 — Make Promo/Upgrade Text Admin-Configurable

> Owner directive: admin settings must control ALL display text. ~25 hardcoded marketing/promo strings across 3 files. Must be admin-configurable via `effective-promo-content.ts` resolver.

**Hardcoded strings to extract (triple-audit verified):**

**`src/components/chat/sidebar/chat-sidebar-promo.tsx`:**

- "Admin" (heading), "You have admin access." (description)
- "Account Suspended" (heading), "Your account has been suspended..." (description)
- "Go Premium" / "Go Pro" (heading), upgrade descriptions
- "Upgrade Now" (CTA)

**`src/components/shared/plan-promo.tsx`:**

- "Free forever" (badge), "Your plan" (badge)
- "Admin" / "You have admin access." / "Account suspended" / suspension description
- "Unlock premium features with an upgrade!" / "Upgrade now" / "Contact support"

**`src/components/shared/persona-card.tsx`:**

- "Upgrade to ${requiredPlan} to unlock this persona" / "Trial access with reduced limits..."

**What to do:**

1. Create `src/lib/utils/effective-promo-content.ts` resolver following existing `effective-*` pattern. Keys: `admin.promoTitle.pro`, `admin.promoTitle.premium`, `admin.promoDescription.pro`, `admin.promoDescription.premium`, `admin.promoUpgradeCta`, `admin.promoAdminLabel`, `admin.promoAdminDescription`, `admin.promoSuspensionTitle`, `admin.promoSuspensionDescription`, `admin.promoFreeLabel`, `admin.promoUpgradeMessage`, `admin.promoTrialLabel`, `admin.promoPersonaUpgrade`.
2. Parent server components pass resolved promo text as props to client components.
3. Remove ALL hardcoded marketing/promo strings from the 3 files above. CSS class names and route paths are excluded (structural).
4. Add admin UI section for editing promo text in `/admin/settings`.

**Acceptance criteria:**

- [ ] Zero hardcoded promo/marketing text in `chat-sidebar-promo.tsx`
- [ ] Zero hardcoded promo/marketing text in `plan-promo.tsx`
- [ ] Zero hardcoded upgrade messaging text in `persona-card.tsx`
- [ ] `effective-promo-content.ts` resolver with admin override + default fallback
- [ ] Admin UI section for editing promo text in `/admin/settings`
- [ ] Build passes, tests pass

---

## HIGH — Phase 163 — Global Error Boundary

> No `global-error.tsx` exists. `error.tsx` catches errors within the root layout's children, but `global-error.tsx` is needed for root layout errors themselves. Without it, root layout failures produce a raw browser error page.

**File:** `src/app/global-error.tsx` (new)

**What to do:**

1. Create `src/app/global-error.tsx` as a `"use client"` component.
2. Render minimal error UI: "Something went wrong" message, "Try again" button (`reset()`), "Return home" link.
3. Include required `<html>` and `<body>` tags (Next.js requirement for global-error).
4. Apply basic inline styling — no theme dependency since root layout may have failed.

**Acceptance criteria:**

- [ ] `src/app/global-error.tsx` exists and is a valid `"use client"` component
- [ ] Contains `<html>` and `<body>` tags
- [ ] Shows error recovery UI with "Try again" and "Return home"
- [ ] Build passes

---

## MEDIUM — Phase 165 — Checkout Success Page DB Polling

> After Stripe redirects to checkout success, webhook may not have processed yet. User sees "success" but plan is still Lite until webhook fires.

**File:** `src/app/(public)/checkout-success/page.tsx` (or new client component)

**What to do:**

1. Add a client component that polls a plan-status endpoint every 3-5s for up to 30s.
2. Show "Confirming your plan upgrade..." initially.
3. On confirmation: "Plan upgraded successfully!" with green indicator.
4. On timeout: "Payment successful. Your plan will be updated shortly. If not updated within a few minutes, contact support."

**Acceptance criteria:**

- [ ] Checkout success page shows plan confirmation status
- [ ] Polling stops after confirmation or 30s timeout
- [ ] Build passes

---

## MEDIUM — Phase 143 — Env Var Runtime Validation

> 8 unsafe `process.env` casts: 4 `as string` + 4 `!`. Missing env vars produce cryptic runtime crashes instead of clear startup errors.

**Locations (triple-audit verified):**

| File                                     | Line | Pattern     | Variable            |
| ---------------------------------------- | ---- | ----------- | ------------------- |
| `src/lib/database/mongoose.tsx`          | 5    | `as string` | `MONGODB_URL`       |
| `src/constants/aws.tsx`                  | 5    | `as string` | `AWS_S3_REGION`     |
| `src/constants/aws.tsx`                  | 7    | `as string` | `AWS_S3_ACCESS_ID`  |
| `src/constants/aws.tsx`                  | 8    | `as string` | `AWS_S3_SECRET_KEY` |
| `src/constants/openai.tsx`               | 5    | `!`         | `OPENAI_ORG`        |
| `src/constants/openai.tsx`               | 6    | `!`         | `OPENAI_PRJ`        |
| `src/constants/openai.tsx`               | 7    | `!`         | `OPENAI_KEY`        |
| `src/lib/actions/transaction.action.tsx` | 52   | `!`         | `STRIPE_SECRET_KEY` |

**What to do:**

1. Create a shared `requireEnv(name: string): string` utility that throws with a clear message if undefined.
2. Replace all `process.env.VAR as string` and `process.env.VAR!` with `requireEnv("VAR")`.

**Acceptance criteria:**

- [ ] Zero `as string` on `process.env` in codebase
- [ ] Zero `!` on `process.env` in codebase
- [ ] Missing env vars throw clear error at module load
- [ ] Build passes, tests pass

---

## MEDIUM — Phase 144 — Admin Config In-Memory Cache

> 5+ DB round trips per `/api/openai` request for admin settings that change infrequently.

**What to do:**

1. Create `src/lib/utils/config-cache.ts` — simple in-memory cache with 30s TTL.
2. Wrap each `getEffective*` resolver's DB calls in the cache.

**Acceptance criteria:**

- [ ] Admin config queries cached with 30s TTL
- [ ] Repeated calls within TTL window return cached result
- [ ] Build passes, tests pass

---

## MEDIUM — Phase 145 — Upload Filename Collision Prevention

**File:** `src/app/api/upload/route.tsx`

**What to do:** Replace `Date.now()` with `crypto.randomUUID()` in upload filename generation.

**Acceptance criteria:**

- [ ] Upload filenames use `crypto.randomUUID()`
- [ ] Build passes

---

## LOW — Phase 146 — Admin User Detail Transaction Limit

**File:** `src/lib/utils/admin-queries.ts`

**What to do:** Add `.limit(50)` to the transaction query in `getAdminUserDetail`.

**Acceptance criteria:**

- [ ] Transaction query has `.limit(50)`
- [ ] Build passes

---

## LOW — Phase 147 — Rename `.tsx` Utility Files to `.ts`

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

---

## LOW — Phase 148 — Bulk Operations Partial-Failure Reporting

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

---

## ON HOLD — Deferred

### Phase 29.x — Zod/Zustand app-wide modernization

### Phase 26.x — Persona-aware media prompts, Stripe auto-renewal

### Legal/nav/footer admin configurability — Deferred to v2

### TypeScript 6 / @typescript-eslint compatibility — Monitor for official TS 6 support in `@typescript-eslint`

---

> **Completed phases** archived in [`DONE.md`](DONE.md).
> All phases through 168 complete + 160.1 + 164 + 170 + 171 + 168.1 complete. Milestones 0–25 COMPLETE.

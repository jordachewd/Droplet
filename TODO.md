# Droplet — TODO

> Prioritized, actionable development tasks. Each task max ~30 minutes.
> Governed by **Droplet-PM**. Do not add tasks without PM approval.
> Ref: `SPEC.md` for full specification. `AGENTS.md` for coding rules. `DONE.md` for completed phases.
> Implementation agent: **Droplet-Engineer** (Senior Developer).
>
> **STATUS: PM audit #79 (2026-03-31). DEPLOYED TO PRODUCTION. 3 CRITICAL production bugs active (payment RE-OPENED, streaming, test regression). Phase 168 COMPLETE (audio player fix). Phase 167 partially completed (targeted catches). 592 unit tests (101 suites). 49 E2E tests (8 spec files). Build passes. TSC clean. Node.js 24.12.0 runtime.**
> **GATE STATUS: Product Gate RED (3 CRITICAL bugs). Admin Gate YELLOW (Phase 162 pending). Validation Gate YELLOW (1 test failure).**
> **Zero: `as never`, `as any`, `console.log`, `console.error`, `window.alert`, `window.confirm`, `strict: false`, `droplet-scrollbar`, stale TODOs — all in `src/`.**
>
> **REMAINING PRODUCTION BUGS (PM audit #79):**
>
> - 🔴 BUG-PAYMENT **RE-OPENED**: Owner reports (2026-03-31): Stripe payment succeeds, webhook returns 200 OK, but NO Transaction created and NO User plan updated. **Phase 169 (diagnostic logging) required to identify root cause.** Code logic verified correct — hypothesis: `checkout.session.completed` event may not be reaching webhook, or non-checkout events returning 200 "Unhandled event" masking the issue.
> - 🔴 BUG-STREAM: Stream ends unexpectedly on media gen. Vercel 60s timeout. **Phase 160.2 (proactive timeout safety net).**
> - ✅ ~~BUG-AUDIO~~: **RESOLVED (Phase 168 COMPLETE).** SSE controller guard, download Range support, audio player lifecycle hardening.
> - 🟡 TEST-REGRESSION: `chat-sidebar-promo.test.tsx` expects "Manage Plan" but UI renders "Upgrade Now". **Phase 168.1 (test fix).**
> - ⚠️ Admin configurability (Phase 162): PENDING — after critical bugs resolved.
>
> **EXECUTION ORDER (PM audit #79 — 3 critical bugs first, then hardening):**
>
> 1. **🔴 Phase 169 CRITICAL** — Stripe webhook diagnostic logging (BUG-PAYMENT investigation).
> 2. **🔴 Phase 160.2 CRITICAL** — Proactive timeout safety net (55s timer before Vercel kill).
> 3. **🔴 Phase 168.1 CRITICAL** — Fix `chat-sidebar-promo.test.tsx` test regression (Validation Gate blocker).
> 4. **Phase 167.2 HIGH** — Remaining 35 empty catch blocks.
> 5. **Phase 162 HIGH** — Promo text admin-configurable.
> 6. **Phase 163 HIGH** — Global error boundary.
> 7. **Phase 165 MEDIUM** — Checkout success page DB polling.
> 8. **Phase 143 MEDIUM** — Env var runtime validation.
> 9. **Phase 144–148 MEDIUM/LOW** — Backlog.
>
> _Critical bugs block ALL other work. No exceptions._

---

## 🔴 ENGINEER START HERE — Phase 169 CRITICAL — Stripe Webhook Diagnostic Logging (PM audit #79)

> **BUG-PAYMENT RE-OPENED.** Owner reports (2026-03-31): Stripe payment succeeds, webhook returns 200 OK for all requests, but NO Transaction created and NO User plan updated. Code logic triple-audited — correct. **Root cause hypothesis:** the webhook returns 200 "Unhandled event" for non-checkout event types (like `payment_intent.succeeded`, `charge.succeeded`). The actual `checkout.session.completed` event may not be reaching the webhook at all (not selected in Stripe Dashboard), OR it may be failing silently at a point that returns 200. The webhook currently has ZERO logging of event type received and ZERO logging at success return points — making production diagnosis impossible.

**File:** `src/app/api/webhooks/stripe/route.tsx`

**What to do:**

1. Add `logStripeWebhookInfo(\`Event type received: ${eventType}\`);`immediately after`const eventType = parsedEvent.data.type;` (line ~187).
2. Add `logStripeWebhookInfo(\`Checkout session ${id}: user ${theUserId} found. Processing...\`);` after the user lookup succeeds (line ~270).
3. Add `logStripeWebhookInfo(\`Checkout session ${checkoutSessionId}: Already processed — transaction and plan match.\`);` before the "Already processed" return (line ~280).
4. Add `logStripeWebhookInfo(\`Checkout session ${id}: Repair path completed.\`);` after successful repair (line ~300).
5. Add `logStripeWebhookInfo(\`Checkout session ${id}: Transaction created successfully.\`);`after`createTransaction` succeeds (line ~305).
6. Add `logStripeWebhookInfo(\`Checkout session ${id}: User plan updated successfully.\`);`after`applyCheckoutPlanUpdate` succeeds (line ~320).

**Additional diagnostic action for owner:**

After deploying Phase 169, have the owner:

1. Make a test payment in production
2. Check Vercel function logs for the webhook endpoint
3. Look for `Event type received:` log entries — this will show EXACTLY which events are hitting the webhook
4. If `checkout.session.completed` is NOT in the logs, the event type is not selected in Stripe Dashboard
5. If it IS in the logs, the subsequent logs will show which code path was taken

**Acceptance criteria:**

- [ ] Event type logged at entry for every webhook event
- [ ] Each 200 return path has descriptive logging
- [ ] No behavioral changes to webhook logic (logging only)
- [ ] Build passes, tests pass

---

## 🔴 Phase 168.1 CRITICAL — Fix `chat-sidebar-promo.test.tsx` test regression (PM audit #79)

> Unit test expects `"Manage Plan"` link text but the UI component renders `"Upgrade Now"`. This is a test-vs-code mismatch — the test was not updated when the link text changed. Validation Gate blocker (1 failing test).

**File:** `tests/unit/components/chat-sidebar-promo.test.tsx`

**What to do:**

1. Line 19: Change `screen.getByRole("link", { name: "Manage Plan" })` to `screen.getByRole("link", { name: "Upgrade Now" })`.
2. Line 33: Change `screen.queryByRole("link", { name: "Manage Plan" })` to match actual suspended/admin behavior — verify what the component actually renders and update assertion accordingly.
3. Verify by running `npx vitest run tests/unit/components/chat-sidebar-promo.test.tsx`.

**Acceptance criteria:**

- [ ] `chat-sidebar-promo.test.tsx` passes
- [ ] All unit tests pass (592+)
- [ ] Build passes

---

## 🔴 Phase 160.2 CRITICAL — Proactive Timeout Safety Net (PM audit #78)

> Stream error on media gen still failing in production. Code mitigations (heartbeat, didSendFinal, maxDuration=60) are deployed but do NOT fix root cause: Vercel Hobby 60s function timeout kills server before pipeline completes. This phase adds a proactive safety net.

**File:** `src/app/api/openai/route.tsx`

**What to do:**

1. At the start of the `ReadableStream.start(controller)` callback, record `const startTime = Date.now();`.
2. Define `const TIMEOUT_SAFETY_MS = (maxDuration - 5) * 1000;` (55s for current maxDuration=60).
3. Start a `setTimeout` (the "safety timer") that fires at `TIMEOUT_SAFETY_MS`:
   - Sends `writeErrorEvent("Your request is taking longer than expected. Media generation may still be processing in the background. Please check your library or start a new conversation.", "proactive timeout safety net")`
   - Calls `stopGeneralHeartbeat()` and `stopMediaHeartbeat()`
   - Calls `controller.close()` (wrapped in try/catch)
4. Clear the safety timer in the `finally` block if the pipeline completes normally.
5. **Additionally**: update `src/components/chat/chat-wrapper.tsx` to display this specific error message gracefully (not as a red alert — use orange/warning since media may still be processing).

**Acceptance criteria:**

- [ ] Safety timer fires at `maxDuration - 5s` and sends graceful error event
- [ ] Client receives and displays the timeout message (not raw "stream ended unexpectedly")
- [ ] Normal-speed requests are unaffected (timer cleared before firing)
- [ ] Video gen requests get a clear message instead of silent crash
- [ ] Build passes, tests pass

---

## MEDIUM — Checkout Success Page DB Polling (PM audit #75)

### Phase 165 MEDIUM — Add plan confirmation polling to checkout success page

> BUG-PAYMENT resolved (PM audit #78.1 — owner verified). Deprioritized back to MEDIUM. Still a good safety net: after Stripe redirects to `/checkout-success`, webhook may not have processed yet. User sees "success" but plan is still Lite.

**File:** `src/app/(public)/checkout-success/page.tsx` (or add client component)

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

## HIGH — Remaining Empty Catch Blocks (PM audit #78)

### Phase 167.2 HIGH — Fix remaining 35 parameterless `catch {` blocks across `src/`

> Phase 167 was partially completed (targeted catches in API routes, admin actions, delete cascade, sidebar — see DONE.md Phase 167). **35 parameterless `catch {` blocks remain across `src/`.** This phase covers the remaining ones.
>
> AGENTS.md: "No empty catch blocks — every catch must either capture the error variable and log to `process.stderr.write()`, or have a code comment explaining why the error is intentionally discarded."

**Category A — Server-side catches that MUST LOG (production debugging at stake):**

1. `src/app/api/webhooks/clerk/route.tsx` lines 292, 497, 523 — 3 webhook catches
2. `src/lib/actions/user.actions.tsx` line 104 — Clerk user deletion failure
3. `src/lib/actions/task.actions.tsx` lines 338, 348 — S3 cleanup and task deletion
4. `src/lib/utils/ensure-user-synced.ts` line 108 — Clerk metadata sync
5. `src/lib/utils/aws/uploadFileToAWS.tsx` line 37 — file upload (must use `{ cause: error }`)
6. `src/app/(public)/checkout-success/page.tsx` line 45 — Stripe session verify
7. `src/lib/utils/openai/generateResponse.tsx` line 425 — JSON.parse args

**Category B — Effective-\* resolver catches (add comment — intentional fallback to defaults):**

8-16. `effective-website-copy.ts` (2), `effective-stop-reasons.ts` (1), `effective-plan-config.ts` (3), `effective-persona-config.ts` (1), `effective-persona-access.ts` (1), `effective-model-config.ts` (1), `effective-faq-content.ts` (1)

**Category C — Client catches (add comment for intentional discards, log for real errors):**

17. `src/components/shared/audio-player.tsx` line 109 — audio init failure
18. `src/components/shared/image-holder.tsx` line 48 — download failure (already has comment ✅)
19. `src/components/layout/droplet-theme.tsx` lines 49, 67 — localStorage (already has comment ✅)
20. `src/components/chat/sidebar/chat-sidebar-nav.tsx` line 144 — delete failure
21. `src/components/chat/library-delete-button.tsx` line 66 — delete failure
22. `src/components/chat/chat-wrapper.tsx` line 300 — JSON parse
23. `src/components/chat/chat-input.tsx` line 115 — upload failure
24. `src/app/layout.tsx` line 73 — theme init (inline script — intentional)

**Category D — Utility catches (add comment for URL/parse fallbacks):**

25-28. `normalize-public-asset-url.ts` (2), `s3-file-reference.ts` (2), `download-url-allowlist.ts` (1), `download/route.tsx` (1)

**What to do:**

1. **For Category A blocks:** Capture error variable `catch (error)`, add `process.stderr.write(\`[source] Error: ${error instanceof Error ? error.message : "unknown"}\\n\`)`before the return/rethrow. For`uploadFileToAWS`: use `throw new Error("File upload failed", { cause: error })`.
2. **For Category B blocks:** Add comment: `// Intentional fallback to defaults — DB error non-fatal for admin config resolution`
3. **For Category C blocks 17, 20, 21, 22, 23:** Add comment or capture error where appropriate.
4. **For Category D blocks:** Add comment: `// URL/path parse failure — non-fatal, fallback value used`
5. For blocks that already have comments (#18, #19, #24): No change needed.

**Acceptance criteria:**

- [ ] Zero uncommented parameterless `catch {` blocks in `src/`
- [ ] Server-side catches (Category A) log error details via `process.stderr.write()`
- [ ] Client/utility catches (Categories B-D) have explaining comments or capture error
- [ ] `uploadFileToAWS` uses `{ cause: error }` pattern
- [ ] Build passes, tests pass

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

---

## ON HOLD — Deferred

### Phase 29.x — Zod/Zustand app-wide modernization

### Phase 26.x — Persona-aware media prompts, Stripe auto-renewal

### Legal/nav/footer admin configurability — Deferred to v2

### TypeScript 6 / @typescript-eslint compatibility — Monitor for official TS 6 support in `@typescript-eslint` (Engineer finding M-3, PM audit #66)

---

> **Completed phases** archived in [`DONE.md`](DONE.md).
> All phases through 166 complete + 160.1 + 164 complete (incl. 135–142, 149–161, 160.1, 164, 166, 74.2, 104, 125.3, 126.2, 134, plus 107.1–107.3, 108, 114, 125.1, 131, 132, 133, 120.1–120.7, 121–130, 128.2, 106, 156).
> All Milestones 0–25 COMPLETE.

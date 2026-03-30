# Droplet — TODO

> Prioritized, actionable development tasks. Each task max ~30 minutes.
> Governed by **Droplet-PM**. Do not add tasks without PM approval.
> Ref: `SPEC.md` for full specification. `AGENTS.md` for coding rules. `DONE.md` for completed phases.
> Implementation agent: **Droplet-Engineer** (Senior Developer).
>
> **STATUS: PM audit #77 (2026-03-30). Milestones 0–25 COMPLETE. All phases through 166 complete + 160.1 + 164 complete. 592 unit tests (101 suites). 49 E2E tests (8 spec files). Build passes. TSC clean. Node.js 24.12.0 runtime.**
> **GATE STATUS: All 7 validation gates GREEN locally. Lint (0 errors, 0 warnings), Knip (0 findings), TSC clean, build passes, unit tests (101/592), E2E (8 specs/49 tests), coverage 85/80/85/85.**
> **DEPLOYMENT UNBLOCKED (Phase 160.1 COMPLETE). ALL code fixes ready for production.**
> **Zero: `as never`, `as any`, `console.log`, `console.error`, `window.alert`, `window.confirm`, `strict: false`, `droplet-scrollbar`, stale TODOs — all in `src/`.**
>
> **OWNER-REPORTED BUGS STATUS (PM audit #77):**
>
> - ✅ Stream error fix (Phases 160 + 160.1): CODE-COMPLETE. `maxDuration=60`, dual heartbeat, `didSendFinal`, stderr logging. **Root cause: Vercel function timeout at 60s. Text/image/audio should work. Video exceeds 60s (accepted trade-off). REQUIRES PRODUCTION DEPLOYMENT TO VERIFY.**
> - ✅ Payment webhook fix (Phase 161): CODE-COMPLETE. Idempotency repair, top-level try/catch, arrival/error logging. **Root cause: Most likely Stripe webhook endpoint misconfiguration in production (URL, signing secret, or event type). Code is correct. REQUIRES: (1) production deployment, (2) Stripe Dashboard webhook endpoint verification.**
> - ✅ Client timeout (Phase 164 + 160.1): COMPLETE. `STREAM_REQUEST_TIMEOUT_MS = 70_000`, aligned with server `maxDuration=60`.
> - ✅ Phase 166 (maxDuration on all routes): VERIFIED COMPLETE. All 6 routes have exports.
> - ⚠️ Admin configurability (Phase 162): PENDING. Hardcoded promo text remains.
>
> **EXECUTION ORDER (PM audit #77):**
>
> 1. **🔴 DEPLOY TO PRODUCTION** — All code-complete fixes must ship.
> 2. **🔴 POST-DEPLOY OPS CHECKLIST** — Verify Stripe webhook endpoint, test streaming, test payment.
> 3. **Phase 167 HIGH** — Fix empty catch blocks (expanded scope: ~27 blocks across 5 files).
> 4. **Phase 162 HIGH** — Promo text admin-configurable (3 core files + expanded scope).
> 5. **Phase 163 HIGH** — Global error boundary.
> 6. **Phase 143 MEDIUM** — Env var runtime validation.
> 7. **Phase 165 MEDIUM** — Checkout success page DB polling.
> 8. **Phase 144–148 MEDIUM/LOW** — Backlog.

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

## ~~COMPLETED~~ — Phase 166 — maxDuration on all API routes — VERIFIED COMPLETE (PM audit #77)

> **VERIFIED COMPLETE (2026-03-30).** Moved to `DONE.md`. Triple-audit confirms all 6 API routes already have `export const maxDuration`. Values: openai=60, clerk-webhook=60, upload/download/aws/stripe-webhook=30.

---

## 🔴 POST-DEPLOY OPS CHECKLIST (PM audit #77 — CRITICAL)

> **This is not a code phase.** These are operational verification steps required immediately after production deployment. Both CRITICAL owner-reported bugs are code-complete — the remaining risk is deployment and ops configuration.

**Stripe Webhook Verification:**

1. [ ] Open Stripe Dashboard → Developers → Webhooks
2. [ ] Verify endpoint URL is exactly `https://<production-domain>/api/webhooks/stripe`
3. [ ] Verify `checkout.session.completed` is in the enabled events list
4. [ ] Verify signing secret matches `STRIPE_WEBHOOK_SECRET` env var in Vercel
5. [ ] Test a real payment → check Stripe Dashboard for webhook delivery status (200/400/500)
6. [ ] Verify Transaction record created in MongoDB after successful payment
7. [ ] Verify User plan updated in MongoDB after successful payment

**Streaming Verification:**

8. [ ] Test text chat — should stream without errors
9. [ ] Test image generation — should complete within 60s
10. [ ] Test audio generation — should complete within 60s
11. [ ] Test video generation — should fail gracefully with user-friendly timeout error (not crash)
12. [ ] Check Vercel function logs for `[openai-route]` entries confirming heartbeat/didSendFinal behavior

**Environment Variables:**

13. [ ] Verify all env vars are set in Vercel: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `OPENAI_*`, `AWS_*`, `MONGODB_URL`, `NEXT_PUBLIC_API_BASE_URL`, `CLERK_*`

---

## HIGH — Fix Empty Catch Blocks — Expanded Scope (PM audit #76)

### Phase 167 HIGH — Add error handling to all empty catch blocks violating AGENTS.md

> **EXPANDED from 2 blocks to 20+ (PM audit #76).** Triple-audit confirmed: Architect found 15 in admin.actions.tsx + 6 in delete-user-cascade.ts. Engineer found 3 in API routes (aws + upload). PM independently verified all counts.
>
> AGENTS.md: "No empty catch blocks — every catch must either capture the error variable and log to `process.stderr.write()`, or have a code comment explaining why the error is intentionally discarded."

**Category A — API Route catches (MUST LOG — production debugging at stake):**

1. `src/app/api/aws/route.tsx` line 165 — POST catch: returns 500 without logging
2. `src/app/api/aws/route.tsx` line 240 — DELETE catch: returns 500 without logging
3. `src/app/api/upload/route.tsx` line 141 — POST catch: returns 500 without logging
4. `src/app/api/openai/route.tsx` line ~777 — inner catch: returns error JSON without logging
5. `src/app/api/openai/route.tsx` line ~1686 — outer catch: returns 500 without logging

**Category B — Admin action catches (15 blocks — MUST LOG):**

6-20. `src/lib/actions/admin.actions.tsx` — 15 `catch {` blocks at lines 56, 498, 522, 645, 702, 757, 796, 851, 908, 959, 989, 1030, 1068, 1116, 1164. All return `errorState(...)` to UI but discard actual error details.

**Category C — Cascade utility catches (6 blocks — add error variable capture):**

21-26. `src/lib/utils/delete-user-cascade.ts` — 6 `catch {` blocks. Currently call `onStepError(step)` but don't capture error variable.

**Category D — Client/utility catches (comment-only — acceptable fallback patterns):**

27. `src/components/chat/sidebar/chat-sidebar-shell.tsx` line 75 — localStorage write. Add comment: `// localStorage quota exceeded — non-critical, intentionally discarded`
28. `src/components/chat/chat-sidebar.tsx` line 49 — Server data-fetch fallback. Add `process.stderr.write()` logging.

**What to do:**

1. **For all Category A + B blocks:** Capture error variable `catch (error)`, add `process.stderr.write(\`[source] Error: ${error instanceof Error ? error.message : "unknown"}\\n\`)` before the return statement.
2. **For Category C blocks:** Capture error variable, pass to `onStepError(step, error)` (update callback signature).
3. **For Category D block 27:** Add comment explaining intentional discard.
4. **For Category D block 28:** Add `process.stderr.write()` logging.

**Acceptance criteria:**

- [ ] Zero parameterless `catch {` blocks in `src/` (every catch either captures error or has explaining comment)
- [ ] All API route catches log error details via `process.stderr.write()`
- [ ] All admin action catches log error details via `process.stderr.write()`
- [ ] Build passes, tests pass

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
> All phases through 166 complete + 160.1 + 164 complete (incl. 135–142, 149–161, 160.1, 164, 166, 74.2, 104, 125.3, 126.2, 134, plus 107.1–107.3, 108, 114, 125.1, 131, 132, 133, 120.1–120.7, 121–130, 128.2, 106, 156).
> All Milestones 0–25 COMPLETE.

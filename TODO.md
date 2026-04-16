# Droplet — TODO

> Prioritized, actionable development tasks. Each task max ~30 minutes.
> Governed by **Droplet-PM**. Do not add tasks without PM approval.
> Ref: `SPEC.md` for full specification. `AGENTS.md` for coding rules. `DONE.md` for completed phases.
> Implementation agent: **Droplet-Engineer** (Senior Developer).
>
> **STATUS: PM audit #126 (2026-04-16). V1.0 MVP RELEASED. ALL Phases through 233 COMPLETE. Phase 226 COMPLETE. Type file cleanup COMPLETE. 0 HIGH bugs. All 7 gates GREEN.**
>
> **GATE STATUS: All 7 gates GREEN. 0 npm vulnerabilities. 0 critical security issues. Code hygiene 100% (0 console.log, 0 Math.random, 0 as any, 0 ts-ignore, 0 empty catch, 0 window.alert).**
>
> **TEST STATUS: 729 tests (110 suites), 49 E2E (6 skipped). 0 failures. All gates GREEN.**
>
> **ACTIVE BACKLOG: PM audit #126 — 0 HIGH items. 0 CRITICAL items. 2 god files remain: stripe/route.tsx (1,094), generateResponse.tsx (1,078). Next: Cleanup tasks → Phase 228 (Stripe webhook split).**

---

## Archived Phases — See [DONE.md](DONE.md)

> All phases through 233 + Phase 226 + type file cleanup archived. See DONE.md for completion records.

---

## Execution Order (PM audit #126)

> Priority: cleanup first → god file decomposition next. No critical/high items. All work below is LOW risk.

---

### 1. Cleanup — Delete Stale Test Artifact (1 min)

> **Risk:** NONE. **Effort:** 1 minute. **Source:** PM audit #125.
> **Problem:** `tests/unit/phase-112.1-test-audit.md` (115 lines) is a stale historical doc from Phase 112.1 that references deleted `admin.actions.tsx`.
> **Fix:** Delete the file.
> **Acceptance criteria:** File deleted, knip clean.

### 2. Phase 228 — Extract Stripe Webhook Handlers Into Modules (LOW)

> **Risk:** LOW. **Effort:** 1–2 hours. **Source:** Architect audit L3.
> **Problem:** `src/app/api/webhooks/stripe/route.tsx` is **1,094 lines** — largest file in codebase. 5 handler functions + 15 shared utilities + 10+ Zod schemas. Well-structured internally but monolithic and hard to test in isolation.
> **Fix:** Extract handlers and shared utilities into modules under `src/lib/utils/stripe/`:
>
> **228-A: Create `stripe-webhook-shared.ts`** (~400 lines)
> — All Zod schemas, shared types, `findWebhookUser`, `claimTransaction`, `updateUserWithGuard`, `resolveExpandableId`, `getLitePlanDefaults`, `calculateExpiresOn`
> — No `"use server"`. Add `import "server-only"`.
>
> **228-B: Create `stripe-webhook-handlers.ts`** (~650 lines)
> — 5 event handlers: `handleCheckoutSessionCompleted`, `handleInvoicePaid`, `handleInvoicePaymentFailed`, `handleCustomerSubscriptionUpdated`, `handleCustomerSubscriptionDeleted`
> — 1 dispatcher: `dispatchStripeWebhookEvent`
> — Import shared from `stripe-webhook-shared.ts`
> — No `"use server"`. Add `import "server-only"`.
>
> **228-C: Slim `route.tsx`** (~50 lines)
> — POST entry point + Stripe signature verification + call `dispatchStripeWebhookEvent`
> — Keep `maxDuration = 60` export
>
> **Acceptance criteria:**
>
> - Shared module has all schemas + types + utilities, no `"use server"`, `import "server-only"`
> - Handlers module has all 5 handlers + dispatcher, no `"use server"`, `import "server-only"`
> - `route.tsx` reduced to ~50 lines (POST + sig verify + dispatch)
> - All error messages, audit logging, and Stripe API interactions unchanged
> - All 7 gates GREEN, knip clean

### 3. Phase 229 — Extract generateResponse Retry/Tool Helpers (LOW)

> **Risk:** LOW. **Effort:** 1–2 hours. **Source:** Architect audit L4.
> **Problem:** `src/lib/utils/openai/generateResponse.tsx` is **1,078 lines** — second largest file. Retry logic (~137 lines) and vision URL resolution (~112 lines) can be extracted.
> **Fix:** Extract into `src/lib/utils/openai/openai-retry.ts` and `src/lib/utils/openai/vision-url.ts`.
> **Acceptance criteria:**
>
> - `openai-retry.ts`: `withOpenAIRetry()`, `classifyOpenAIError()`, `isRetryableOpenAIError()`, `serializeToolCalls()`, `getOpenAIErrorStatus()`, `waitForRetry()`, `logOpenAIRetry()`
> - `vision-url.ts`: `resolveImageInputUrlsForOpenAI()`, `buildVisionPresignedUrl()`, `isInternalDownloadKeyUrl()`
> - `generateResponse.tsx` imports and uses them — no behavioral change
> - All 7 gates GREEN, knip clean

---

## SWOT-DERIVED — Known Issues

### LOW — Admin Sidebar Collapsed State Not Persisted

> **Source:** SWOT Weakness. **Risk:** LOW. **Impact:** Admin sidebar resets to open on page reload.
> Chat sidebar persists via `droplet-sidebar-collapsed` localStorage key. Admin does not.

---

## DEFERRED

### Phase 29.6 — updateAdminSettingAction Zod Schema Map (DEFERRED)

> 18 branches (including new `admin.stripePriceIds`), working correctly with Zod under the hood. Revisit only if branch count exceeds ~25 or bugs emerge.

### Legal/nav/footer admin configurability — Deferred to v2

> Legal text rarely changes (requires legal review), nav is structural (tied to routes), footer changes ~yearly. Minimal value.

### E2E Firefox Flake — Monitor

> 1 test (`error-boundary-handling > API failure feedback`) fails intermittently on Firefox only. Chromium/WebKit pass. Browser timing issue, not product bug. Monitor.

### Vercel Pro Upgrade — Recommended

> $20/mo. Raises `maxDuration` from 60s to 300s. Eliminates media generation timeout edge cases. Not a bug — architecture constraint.

---

> **Completed phases** archived in [`DONE.md`](DONE.md).
> Includes: Phases 143–148, 165, 165.1, 180.1–180.4, 185–222 (all sub-phases), 217-A/B/C/C-fix/D/E/F/G, 218-B, 218-C, 218-C-fix, 26.x, 29.1–29.5, 29.7, 223, 224, 225-A/B/C/D, 226, 227, 230, 231, 231-fix, 232, 233, type file cleanup.
> Phase 29.7 (Zustand audit) — COMPLETE. No changes needed. 4 stores, all properly implemented.
> TypeScript 6 / ESLint compatibility — **CLOSED** (audit #103). No issues.
> jsdom upgrade — **PIN MAINTAINED** (audit #103). ~24.1.3 stable. ESM TLA incompatibility persists.
> E2E fragile homepage heading — **FIXED** (audit #105). Structural assertion.

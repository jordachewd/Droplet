# Droplet — TODO

> Prioritized, actionable development tasks. Each task max ~30 minutes.
> Governed by **Droplet-PM**. Do not add tasks without PM approval.
> Ref: `SPEC.md` for full specification. `AGENTS.md` for coding rules. `DONE.md` for completed phases.
> Implementation agent: **Droplet-Engineer** (Senior Developer).
>
> **STATUS: PM audit #125 (2026-04-16). V1.0 MVP RELEASED. ALL Phases through 233 COMPLETE. Phase 226 (admin actions split) COMPLETE. 0 HIGH bugs. All 7 gates GREEN.**
>
> **GATE STATUS: All 7 gates GREEN. 0 npm vulnerabilities. 0 critical security issues. Code hygiene 100% (0 console.log, 0 Math.random, 0 as any, 0 ts-ignore, 0 empty catch, 0 window.alert).**
>
> **TEST STATUS: 729 tests (110 suites), 49 E2E (6 skipped). 0 failures. All gates GREEN.**
>
> **ACTIVE BACKLOG: PM audit #125 — 0 HIGH items. 2 god files remain: stripe/route.tsx (1,094), generateResponse.tsx (1,078). Next: Phase 228 (Stripe webhook split).**

---

## Archived Phases — See [DONE.md](DONE.md)

> All phases through 233 + Phase 226 archived. See DONE.md for completion records.

---

## ARCHITECT AUDIT #118 — Structural Improvements (2026-04-11)

> Source: Droplet-Architect deep codebase audit. All 7 gates GREEN. Zero security vulnerabilities. Zero critical issues. Improvements target maintainability, fragility reduction, and future velocity.

---

## ✅ Phase 226 — Split Admin Actions Into Domain Files — COMPLETED (PM audit #125) — Archived to DONE.md

> ✅ Phase 226 COMPLETE. `admin.actions.tsx` (1,782 lines) split into 5 domain files: `admin-user.actions.tsx` (409), `admin-settings.actions.tsx` (490), `admin-pages.actions.tsx` (481), `admin-transaction.actions.tsx` (73), `admin-action-helpers.ts` (206). Original deleted. All imports updated. All 7 gates GREEN, knip clean. See [DONE.md](DONE.md).

### Phase 228 — Extract Stripe Webhook Handlers Into Modules (LOW)

> **Risk:** LOW. **Effort:** 1–2 hours. **Source:** Architect audit L3. PM audit #125 corrected size.
> **Problem:** `src/app/api/webhooks/stripe/route.tsx` is **1,094 lines** handling 5 event types in a single file. 5 handler functions + 15 shared utilities + 10+ Zod schemas. Handlers are well-structured internally but the file is hard to test in isolation.
> **Fix:** Extract handlers and shared utilities into modules under `src/lib/utils/stripe/`:
>
> - `handle-checkout-completed.ts`
> - `handle-invoice-paid.ts`
> - `handle-invoice-payment-failed.ts`
> - `handle-subscription-updated.ts`
> - `handle-subscription-deleted.ts`
>
> Keep shared Zod schemas and utility functions in `stripe-webhook-shared.ts`.
> **Acceptance criteria:**
>
> - Each handler in its own file, exported as a single async function
> - `route.tsx` reduced to dispatcher + Stripe signature verification
> - All 7 gates GREEN, knip clean

### Phase 229 — Extract generateResponse Retry/Tool Helpers (LOW)

> **Risk:** LOW. **Effort:** 1–2 hours. **Source:** Architect audit L4. PM audit #125 corrected size.
> **Problem:** `src/lib/utils/openai/generateResponse.tsx` is **1,078 lines**. The retry logic (`withOpenAIRetry`, `classifyOpenAIError`, `isRetryableOpenAIError`, `serializeToolCalls`, `getOpenAIErrorStatus`, `waitForRetry`, `logOpenAIRetry` — ~137 lines) and vision URL resolution (`resolveImageInputUrlsForOpenAI`, `buildVisionPresignedUrl`, `isInternalDownloadKeyUrl` — ~112 lines) could be extracted. `buildOpenAIResponsePayload` at ~314 lines is the single largest function in the codebase — future decomposition target.
> **Fix:** Extract `withOpenAIRetry()`, `classifyOpenAIError()`, `isRetryableOpenAIError()`, `serializeToolCalls()` into `src/lib/utils/openai/openai-retry.ts`.
> **Acceptance criteria:**
>
> - New file with exported functions
> - `generateResponse.tsx` imports and uses them — no behavioral change
> - All 7 gates GREEN

---

## SWOT-DERIVED — Known Issues (from PM audit #115 SWOT analysis)

### ✅ MEDIUM — Duplicate Transaction on Initial Subscription — RESOLVED (Phase 223)

> Fixed by Phase 223. Checkout handler now stores `stripeInvoiceId` from checkout payload; claim filter uses `$or` on both `stripeId` and `stripeInvoiceId`. When `invoice.paid` fires with the same invoice ID, the existing transaction is found and no duplicate is created. See [DONE.md](DONE.md).

### ✅ MEDIUM — User Model Plan Subdoc Schema Gap — RESOLVED (Phase 223)

> Fixed by Phase 223. `stripeSubscriptionId` and `subscriptionStatus` added to plan subdocument schema in User model. Webhook writes to plan subdoc are no longer silently stripped by `strict: true`. See [DONE.md](DONE.md).

### LOW — Admin Sidebar Collapsed State Not Persisted

> **Source:** SWOT Weakness. **Risk:** LOW. **Impact:** Admin sidebar resets to open on page reload.
> Chat sidebar persists via `droplet-sidebar-collapsed` localStorage key. Admin does not.

### ✅ LOW — catch {} Blocks Missing Comments — RESOLVED (Phase 223)

> Fixed by Phase 223. Missing comment added to `isInternalDownloadKeyUrl` catch block in `generateResponse.tsx`. All catch blocks in `src/` now have explanatory comments. See [DONE.md](DONE.md).

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
> Includes: Phases 143–148, 165, 165.1, 180.1–180.4, 185–222 (all sub-phases), 217-A/B/C/C-fix/D/E/F/G, 218-B, 218-C, 218-C-fix, 26.x, 29.1–29.5, 29.7, 223, 224, 225-A/B/C/D, 227, 230, 231, 231-fix, 232, 233.
> Phase 29.7 (Zustand audit) — COMPLETE. No changes needed. 4 stores, all properly implemented.
> TypeScript 6 / ESLint compatibility — **CLOSED** (audit #103). No issues.
> jsdom upgrade — **PIN MAINTAINED** (audit #103). ~24.1.3 stable. ESM TLA incompatibility persists.
> E2E fragile homepage heading — **FIXED** (audit #105). Structural assertion.

# Droplet — TODO

> Prioritized, actionable development tasks. Each task max ~30 minutes.
> Governed by **Droplet-PM**. Do not add tasks without PM approval.
> Ref: `SPEC.md` for full specification. `AGENTS.md` for coding rules. `DONE.md` for completed phases.
> Implementation agent: **Droplet-Engineer** (Senior Developer).
>
> **STATUS: PM audit #123 (2026-04-11). V1.0 MVP RELEASED. ALL Phases through 233 COMPLETE. Phase 225 (full OpenAI route decomposition) COMPLETE. Phase 230 (.d.tsx rename) COMPLETE. 0 HIGH bugs. All 7 gates GREEN.**
>
> **GATE STATUS: All 7 gates GREEN. 0 vulnerabilities. 0 critical security issues.**
>
> **TEST STATUS: 729 tests (110 suites), 49 E2E (6 skipped). 0 failures. All gates GREEN.**
>
> **ACTIVE BACKLOG: PM audit #123 — 0 HIGH items. OpenAI route decomposition COMPLETE (route 1,461→883 lines, 4 modules extracted). Next: god file decomposition (226/228/229).**

---

## COMPLETED — Stripe Recurring Billing (All Phases 217-A through 217-G) — Archived to DONE.md

> ✅ Stripe billing COMPLETE (PM audit #115). All phases delivered: 217-A (schema), 217-B (checkout), 217-C (webhooks), 217-C-fix (path conflict), 217-D (cancellation), 217-E (yearly billing UI), 217-F (admin Price IDs), 217-G (tests + docs + grandfathering). See [DONE.md](DONE.md).

## COMPLETED — Phase 218-C-fix: Dead CSS Cleanup — Archived to DONE.md

> ✅ Phase 218-C-fix COMPLETE (PM audit #115). Dead `.toggle-theme-button` removed from `layout.css`. See [DONE.md](DONE.md).

## COMPLETED — Phase 26.x: Persona-aware Media Prompts — Archived to DONE.md

> ✅ Phase 26.x COMPLETE (PM audit #115). `PERSONA_IMAGE_STYLE_HINTS` + `PERSONA_AUDIO_STYLE_HINTS` (6 personas each). `personaId` threaded through `generateImage()`, `generateAudio()`, `generateResponse()`. Both TTS and audio_in_out modes. Tests for all paths. See [DONE.md](DONE.md).

---

## ARCHITECT AUDIT #118 — Structural Improvements (2026-04-11)

> Source: Droplet-Architect deep codebase audit. All 7 gates GREEN. Zero security vulnerabilities. Zero critical issues. Improvements target maintainability, fragility reduction, and future velocity.

---

## ✅ Phase 225 — OpenAI Route Decomposition — COMPLETED (PM audit #123) — Archived to DONE.md

> ✅ All 4 sub-phases delivered (225-A/B/C/D). Route reduced from ~1,549 to 883 lines (43% reduction). 4 focused modules: `media-slot.ts` (114), `conversation-lifecycle.ts` (221), `stream-orchestrator.ts` (278), `route-helpers.ts` (288) = 901 lines extracted. `<500` target was aspirational — remaining 883 lines are genuine request orchestration. Class-based `StreamLifecycleOrchestrator` with zero timer leaks. All modules have `import "server-only"`, no circular dependencies. Phase 230 (.d.tsx → .d.ts rename) also DONE. Triple audit confirmed (PM + Architect + Engineer). 729 tests (110 suites). All 7 gates GREEN. See [DONE.md](DONE.md).

### Phase 226 — Split Admin Actions Into Domain Files (LOW)

> **Risk:** LOW. **Effort:** 1–2 hours. **Source:** Architect audit L1.
> **Problem:** `src/lib/actions/admin.actions.tsx` is 1,564 lines — the largest file in the codebase. Houses all admin mutations in one file.
> **Fix:** Split into domain-specific action files:
>
> - `src/lib/actions/admin-user.actions.tsx` — user CRUD, suspension, bulk operations
> - `src/lib/actions/admin-settings.actions.tsx` — setting updates
> - `src/lib/actions/admin-pages.actions.tsx` — public page CRUD
>
> **Acceptance criteria:**
>
> - Each new file exports its domain's server actions with `"use server"` directive
> - All imports across `src/` updated to new paths
> - Original `admin.actions.tsx` deleted or reduced to a re-export barrel
> - All 7 gates GREEN, knip clean

### ~~Phase 227 — Reconcile SPEC.md / AGENTS.md Plan Limit Documentation~~ — DONE (PM audit #119) — Archived to DONE.md

> ✅ SPEC.md Lite detailed limits table fixed by PM audit #119 to match `PLAN_LIMITS` (10 conv/day, 10 prompts, 1 image, 1 audio). AGENTS.md Rule 5 already matches code. No remaining discrepancy. Move to DONE.md.

### Phase 228 — Extract Stripe Webhook Handlers Into Modules (LOW)

> **Risk:** LOW. **Effort:** 1–2 hours. **Source:** Architect audit L3.
> **Problem:** `src/app/api/webhooks/stripe/route.tsx` is 1,094 lines handling 5 event types in a single file. Each handler is well-structured internally but the file is hard to test in isolation.
> **Fix:** Extract each handler into its own module under `src/lib/utils/stripe/`:
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

> **Risk:** LOW. **Effort:** 1–2 hours. **Source:** Architect audit L4.
> **Problem:** `src/lib/utils/openai/generateResponse.tsx` is 1,078 lines. The retry logic (`withOpenAIRetry`) and tool call serialization could be extracted.
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

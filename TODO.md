# Droplet — TODO

> Prioritized, actionable development tasks. Each task max ~30 minutes.
> Governed by **Droplet-PM**. Do not add tasks without PM approval.
> Ref: `SPEC.md` for full specification. `AGENTS.md` for coding rules. `DONE.md` for completed phases.
> Implementation agent: **Droplet-Engineer** (Senior Developer).
>
> **STATUS: PM audit #120 (2026-04-11). V1.0 MVP RELEASED. Stripe recurring billing COMPLETE (all 217 phases). Phase 26.x COMPLETE. Phase 223 COMPLETE. Phases 231/232/224/233/225-A COMPLETE. 1 HIGH bug discovered (Phase 231 admin guard DB-failure bypass). All 7 gates GREEN.**
>
> **GATE STATUS: All 7 gates GREEN. 0 vulnerabilities. 0 critical security issues.**
>
> **TEST STATUS: 728 tests (110 suites), 49 E2E (6 skipped). 0 failures. All gates GREEN.**
>
> **ACTIVE BACKLOG: PM audit #120 — 1 HIGH fix (Phase 231-fix) queued above existing architect recommendations.**

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

## PM AUDIT #120 — CRITICAL Fix (2026-04-11)

> Source: Deep ruthless triple audit (PM + Architect + Engineer). All three audits independently confirmed the same vulnerability.

### Phase 231-fix — Fail-Safe Admin Guard on DB Error in Clerk `user.deleted` Webhook (HIGH)

> **Risk:** HIGH. **Effort:** 10 min. **Source:** PM audit #120, confirmed by Architect + Engineer.
> **Problem:** Phase 231 added admin deletion guard but the `catch` block in `src/app/api/webhooks/clerk/route.tsx` (lines ~507-521) logs the error and falls through. If `User.findOne()` throws (DB timeout, replica-set failover), `userToDelete` remains `null`, the admin guard is never evaluated, and `deleteUserCascade()` runs unconditionally — destroying all admin user data (transactions, tasks, usage events, rate limit entries, uploads, S3 objects).
> **Fix:** The `catch` block must fail-safe: add `return NextResponse.json({ message: "OK" });` inside the catch block. This prevents cascade when the admin check cannot be verified. Return 200 prevents Clerk retry loops.
> **Acceptance criteria:**
>
> - `catch` block for `User.findOne()` in the `user.deleted` handler returns `NextResponse.json({ message: "OK" })` after logging
> - Admin data is preserved when DB is unreachable during webhook
> - New unit test: `User.findOne` rejection during admin lookup → returns 200, cascade does NOT run
> - All 7 gates GREEN

---

## ✅ PM AUDIT #119 — Phases 231/232/224/233 — COMPLETED (PM audit #120) — Move to DONE.md

> All 4 phases implemented by Droplet-Engineer and verified by triple audit (PM + Architect + Engineer). 728 tests (110 suites). All 7 gates GREEN.

### ~~Phase 231 — Guard Admin Users in Clerk `user.deleted` Webhook~~ — DONE (with known issue → Phase 231-fix)

> ✅ Implemented. Admin role check added before cascade. Returns 200 to prevent Clerk retry. Warning logged via `process.stderr.write()`. **Known issue:** catch block falls through on DB failure — addressed by Phase 231-fix above.

### ~~Phase 232 — Rollback Daily Slot on Title Generation Failure~~ — DONE

> ✅ Implemented. `generateTitle()` wrapped in try/catch with `dailyConversationsStarted` rollback. Rollback failure logged to stderr. Original error re-thrown. Admin path correctly unprotected. Tested.

### ~~Phase 224 — Add `connectToDatabase()` to OpenAI Route~~ — DONE

> ✅ Implemented. `connectToDatabase()` called at line 685, before any model operations. Tested.

### ~~Phase 233 — Add Transaction `createdAt` Descending Index~~ — DONE

> ✅ Implemented. `TransactionSchema.index({ createdAt: -1 })` at line 80. Benefits 3 admin sort queries. Tested.

### Phase 225 — Decompose OpenAI Route Into Focused Modules (MEDIUM)

> **Risk:** MEDIUM. **Effort:** 2–3 hours (split into sub-phases). **Source:** Architect audit M1.
> **Problem:** `src/app/api/openai/route.tsx` is 1,461 lines — the 2nd-largest file in the codebase. It owns the entire chat lifecycle: request validation, auth, rate limiting, entitlement resolution, plan expiry, prompt/daily/storage limit enforcement, media slot claim/rollback, streaming SSE orchestration, non-streaming orchestration, task creation, title generation, response finalization, and persistence. Any change to any of these concerns touches this file.
> **Fix:** Extract into focused modules. Keep `POST()` as a thin coordinator.

#### ~~Phase 225-A — Extract media slot claim/rollback logic~~ — DONE

> ✅ Extracted to `src/lib/utils/openai/media-slot.ts` (122 lines). `claimMediaGenerationSlot()`, `rollbackMediaGenerationSlot()`, `resolveMediaCounterField()`. Atomic `$lt` guard, `$gt: 0` rollback guard, unlimited bypass, `import "server-only"`. 5 new tests. Route reduced from ~1,549 to 1,461 lines. All 7 gates GREEN.

#### Phase 225-B — Extract conversation lifecycle helpers

> Extract `persistConversationStop()`, `persistConversationNotice()`, `createStopTaskData()`, `createStopResponsePayload()`, `buildEndActionInstructions()`, `getPlanBoundEndAction()`, `resolvePromptLimitEndAction()` into `src/lib/utils/openai/conversation-lifecycle.ts`.
> **Acceptance criteria:**
>
> - New file with exported functions
> - `route.tsx` imports and uses them — no behavioral change
> - All 7 gates GREEN

#### Phase 225-C — Extract streaming SSE orchestrator

> Extract streaming logic (heartbeat management, proactive timeout, `writeStreamEvent()`, `writeErrorEvent()`, `writeFinalEvent()`, SSE `ReadableStream` construction) into `src/lib/utils/openai/stream-orchestrator.ts`.
> **Acceptance criteria:**
>
> - New file with exported functions/classes
> - `route.tsx` streaming path uses the new module — no behavioral change
> - All 7 gates GREEN

#### Phase 225-D — Extract route guard utilities

> Extract `emitBlockedChatUsageEvent()`, `emitUsageEventsSafely()`, `estimateConversationBytes()`, `shouldStreamResponse()`, `getLatestUserMessage()`, `isMediaLimitStopReason()`, `isMediaSpecificLimitStopReason()`, `createUsageTaskId()` into `src/lib/utils/openai/route-helpers.ts`.
> **Acceptance criteria:**
>
> - New file with exported functions
> - `route.tsx` imports and uses them — no behavioral change
> - `route.tsx` reduced to <500 lines (thin coordinator)
> - All 7 gates GREEN

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
> **Problem:** `src/app/api/webhooks/stripe/route.tsx` is 1,253 lines handling 5 event types in a single file. Each handler is well-structured internally but the file is hard to test in isolation.
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
> **Problem:** `src/lib/utils/openai/generateResponse.tsx` is 1,188 lines. The retry logic (`withOpenAIRetry`) and tool call serialization could be extracted.
> **Fix:** Extract `withOpenAIRetry()`, `classifyOpenAIError()`, `isRetryableOpenAIError()`, `serializeToolCalls()` into `src/lib/utils/openai/openai-retry.ts`.
> **Acceptance criteria:**
>
> - New file with exported functions
> - `generateResponse.tsx` imports and uses them — no behavioral change
> - All 7 gates GREEN

### Phase 230 — Rename Type Declaration `.d.tsx` → `.d.ts` (LOW)

> **Risk:** LOW. **Effort:** 15 min. **Source:** Architect audit L7.
> **Problem:** Type declaration files in `src/types/` use non-standard `.d.tsx` extension (e.g., `UserData.d.tsx`). Standard TypeScript convention is `.d.ts`. No functional impact but violates community conventions.
> **Fix:** Rename all `.d.tsx` files in `src/types/` to `.d.ts`. Update all imports across `src/`.
> **Acceptance criteria:**
>
> - All `.d.tsx` in `src/types/` renamed to `.d.ts`
> - All imports updated
> - All 7 gates GREEN, knip clean

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
> Includes: Phases 143–148, 165, 165.1, 180.1–180.4, 185–222 (all sub-phases), 217-A/B/C/C-fix/D/E/F/G, 218-B, 218-C, 218-C-fix, 26.x, 29.1–29.5, 29.7, 223.
> Phase 29.7 (Zustand audit) — COMPLETE. No changes needed. 4 stores, all properly implemented.
> TypeScript 6 / ESLint compatibility — **CLOSED** (audit #103). No issues.
> jsdom upgrade — **PIN MAINTAINED** (audit #103). ~24.1.3 stable. ESM TLA incompatibility persists.
> E2E fragile homepage heading — **FIXED** (audit #105). Structural assertion.

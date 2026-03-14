# Droplet — DONE (Completed Phases)

> Archive of completed development phases. Moved from `TODO.md` to keep it focused on actionable work.
> Governed by **Droplet-PM**.
> Last updated: 2026-03-14 — Phase 27.6 COMPLETE (three-agent cross-verified PM audit #6). Phases 1–25.7 + 27.1–27.3 + 27.6 complete.

---

## Phase 27.6 — Unify all /app/\* pages under shared layout — COMPLETED (2026-03-14)

- [x] Shared `(chat)/layout.tsx` created — provides `ChatSidebar` + main content section for all `/app/*` routes.
- [x] All 7 `/app/*` pages confirmed under shared layout: `/app`, `/app/new`, `/app/library`, `/app/personas`, `/app/c/[conversationId]`, `/app/profile`, `/app/plans`.
- [x] Sidebar visible and functional on all pages (desktop) — verified via Playwright MCP browser session.
- [x] Mobile responsive: open sidebar button appears, sidebar opens and collapses correctly.
- [x] `/app/plans` and `/app/profile` switched from `RouteGroupLayout` to `PageWrapper` content wrapper under shared shell.
- [x] Redundant per-page sidebar/header duplication removed from `/app` and `/app/c/[conversationId]`.
- [x] Three-agent cross-verification: PM audit #6 independently confirmed by Architect and Engineer.

Resolved: TD-UI-14.

**Files changed:** `src/app/(chat)/layout.tsx`, `src/app/(chat)/app/page.tsx`, `src/app/(chat)/app/c/[conversationId]/page.tsx`, `src/app/(chat)/app/plans/page.tsx`, `src/app/(chat)/app/profile/page.tsx`, `src/components/sections/plans-section.tsx`, `tests/e2e/conversation-lifecycle.spec.ts`

---

## Phase 27.1 CRITICAL — Fix limits enforcement race condition — COMPLETED (2026-03-14)

- [x] Atomic prompt slot claim via `incrementPromptCountIfBelowLimit` using `findOneAndUpdate` with `{ promptCount: { $lt: limit } }` — single atomic MongoDB operation, no race window.
- [x] `promptCountIncrement` removed from `finalizeAIResponse` and `UpdateTaskParams` interface.
- [x] Daily conversation limit compensating pattern — after `createTask`, immediately checks `checkDailyConversationLimit`. If over limit, deletes the just-created task and returns 403.
- [x] UTC timezone fix — `getStartOfDay()` now uses `setUTCHours(0, 0, 0, 0)` instead of local timezone.
- [x] Unit tests for atomic prompt limit, daily limit boundary, UTC correctness.
- [x] Three-agent cross-verification: PM, Architect, Engineer all independently confirmed.

Resolved: TD-LIMIT-01, TD-LIMIT-02.

**Files changed:** `src/app/api/openai/route.tsx`, `src/lib/actions/task.actions.tsx`, `src/lib/utils/check-daily-conversations.ts`, `src/types/TaskData.d.tsx`, `tests/unit/openai-route.test.ts`, `tests/unit/task-actions.test.ts`, `tests/unit/check-daily-conversations.test.ts`

---

## Phase 27.2 CRITICAL — Fix image/audio generation unhandled exceptions — COMPLETED (2026-03-14)

- [x] `generateImage()` call in `buildOpenAIResponsePayload()` wrapped in try-catch — returns `{ errorType: "service_error", errorMessage: "Image generation failed. Please try again." }` instead of crashing.
- [x] `generateAudio()` call in `buildOpenAIResponsePayload()` wrapped in identical try-catch pattern.
- [x] Error payloads structured consistently with existing error response format.
- [x] Conversation not corrupted on media generation failure.
- [x] Unit tests for both failure paths.
- [x] Three-agent cross-verification: PM, Architect, Engineer all independently confirmed.

Resolved: TD-AI-19.

**Files changed:** `src/lib/utils/openai/generateResponse.tsx`, `tests/unit/generate-response.test.ts`

---

## Phase 27.3 CRITICAL — Enable universal feature access (all features × all plans × all personas) — COMPLETED (2026-03-14)

- [x] `PLAN_LIMITS` updated: Lite audio=3, video=1; Pro video=10.
- [x] All 9 personas set to `supportsImage: true` and `supportsAudio: true`.
- [x] `resolveEntitlements("Lite")` now returns `supportsAudioGeneration: true`, `supportsVideoGeneration: true`.
- [x] All `createBlockedRule` calls removed from `ai-model-policy.ts` — Lite audio resolves to `gpt-4o-mini-tts` (TTS only, `audio_in_out` blocked), Lite/Pro video resolves to `sora-2`.
- [x] Persona blocking removed from `generateResponse.tsx` — features now plan-gated only.
- [x] Plan card descriptions updated: Lite shows "3 audio/month", "1 video/month (coming soon)".
- [x] `videoGenerations` field added to User model plan subdoc and `PlanData.d.tsx`.
- [x] README.md pricing matrix aligned.
- [x] Unit tests for Lite audio/video entitlement, Pro video entitlement, persona feature universality.
- [x] Three-agent cross-verification: PM, Architect, Engineer all independently confirmed.

Resolved: TD-FEAT-01.

**Files changed:** `src/constants/plans.tsx`, `src/constants/assistant-personas.tsx`, `src/lib/utils/resolve-entitlements.tsx`, `src/lib/utils/ai-model-policy.ts`, `src/lib/utils/openai/generateResponse.tsx`, `src/lib/utils/check-usage-limit.ts`, `src/lib/database/models/user.model.tsx`, `src/types/PlanData.d.tsx`, `README.md`, `tests/unit/ai-model-policy.test.ts`, `tests/unit/conversation-stop.test.ts`, `tests/unit/generate-response.test.ts`, `tests/unit/assistant-personas.test.ts`

---

## Starter Prompts Expansion — COMPLETED (2026-03-13)

- [x] All 9 personas updated from 3 to 6 starter prompts each in `src/constants/assistant-personas.tsx`.
- [x] Prompts cover diverse use cases per persona domain.
- [x] `npx tsc --noEmit` clean. All 297 unit tests pass.

**Files changed:** `src/constants/assistant-personas.tsx`

---

## Phase 25.7: Operational Verification & Cleanup — COMPLETE

### 25.7.2 Clean up test output noise — COMPLETED

- [x] **25.7.2** `priority` prop warning fixed via `MockNextImageProps` sanitization in `chat-input.test.tsx` (line 8). S3 cleanup stderr noise addressed via `process.stderr.write` spy lifecycle in `task-actions.test.ts` (line 182). All tests pass, clean output.

**Files changed:** `tests/unit/chat-input.test.tsx`, `tests/unit/task-actions.test.ts`

### 25.7.3 Verify admin audit trail completeness — COMPLETED

- [x] **25.7.3** New file `tests/unit/admin-audit-trail.test.ts` covers all 8 admin actions: `toggleUserSuspensionAction`, `removeUserByAdminAction`, `updateAdminSettingAction`, `createPublicPageAction`, `togglePublicPagePublishedAction`, `deletePublicPageAction`, `updatePublicPageSortOrderAction`, `savePublicPageAction`. Each action verified to emit audit entry with `adminId`, `action`, `targetType`, `targetId`.

**Files changed:** `tests/unit/admin-audit-trail.test.ts` (new)

### 25.7.4 Stabilize flaky E2E tests — COMPLETED

- [x] **25.7.4** `admin-features.spec.ts` stabilized: post-submit network-idle wait, robust row locator with timeout, row scroll before Edit click. `chat-app-shell.spec.ts` stabilized: sidebar-link helper with container scroll + `force: true` click, desktop sidebar preference reset, signed-out recovery path. Full E2E suite: 185 passed, 8 skipped, 0 failures. 3 consecutive runs verified on both affected specs.

**Files changed:** `tests/e2e/admin-features.spec.ts`, `tests/e2e/chat-app-shell.spec.ts`

### 25.7.1 Release Gate Verification — PM VERIFIED

> PM ran full 6-gate validation (2026-03-13). Droplet-Architect independently verified all 3 hotfixes.

- [x] **25.7.1** Gates 1–4 (prettier, lint, tsc, unit tests) and Gate 6 (build): PASS.
- [x] Gate 5 (E2E): 183 passed, 2 flaky failures (admin-features CMS timing, chat-app-shell Mobile Chrome viewport), 8 skipped.
- [x] Gate A (Contract): PASS — billing semantics frozen (one-time payments v1), limits frozen, Premium extras defined, all model IDs verified.
- [x] Gate B (Architecture): PASS — entitlement resolver live, route/auth boundaries correct, storage guardrails (12MB threshold) enforced.
- [x] Gate C (Product): PASS — Lite permanent + auth-required, all 9 personas available, 5 stop reasons work, streaming stable.
- [x] Gate D (Admin): PASS — all 9 admin routes exist, 8 admin actions audited, role enforcement at proxy + server.
- [x] Gate E (Public): PASS — 8 public pages live + checkout-success, legal pages have review disclaimer, no trial messaging.
- [x] Gate F (Validation): CONDITIONAL PASS — 2 flaky E2E tests tracked as 25.7.4.

**Phase 25.7 now fully complete** — 25.7.2, 25.7.3, 25.7.4 all delivered and PM-verified.

---

## HF-9.2: LOW — updateUser Error Handling Fix — COMPLETED

- [x] **HF-9.2** Replace `serializeForClient(error)` with `handleError({ error, source: "updateUser" })` in `updateUser` catch block. Pattern now consistent with all other server actions. Test added in `user-actions.test.ts` (line 81) asserting rethrow with source metadata.

Resolved: TD-SEC-03.

**Files changed:** `src/lib/actions/user.actions.tsx`, `tests/unit/user-actions.test.ts`

---

## HF-9.1: MEDIUM — Chat Input Upload Error Sanitization — COMPLETED

- [x] **HF-9.1** Replace conditional `error instanceof Error ? error.message : ...` with fixed generic string `"Failed to upload file. Please try again."`. Catch block no longer binds error variable. Test updated in `chat-input.test.tsx` (line 131) asserting generic message.

Resolved: TD-SEC-02.

**Files changed:** `src/components/chat/chat-input.tsx`, `tests/unit/chat-input.test.tsx`

---

## HF-8.2: HIGH — Stripe Webhook Unhandled Event Sanitization — COMPLETED

- [x] **HF-8.2** Replace `STRIPE: Unhandled event type: ${eventType}` response with generic `{ message: "Unhandled event" }`. Event type logged server-side via `logStripeWebhookError()`. HTTP 200 preserved. Test updated in `stripe-webhook-route.test.ts` (line 328) asserting generic message and server-side log.

Resolved: TD-SEC-01.

**Files changed:** `src/app/api/webhooks/stripe/route.tsx`, `tests/unit/stripe-webhook-route.test.ts`

---

## Phase 25.6: Unit Test Gap Coverage — COMPLETED

- [x] **25.6.1** Unit: Conversation stop enforcement edge cases — `tests/unit/conversation-stop.test.ts`. All 5 stop reasons tested (`prompt_limit_reached`, `daily_conversation_limit_reached`, `conversation_storage_limit_reached`, `media_limit_reached`, `billing_state_invalid`) with correct `endedReason` and `endAction`. Unlimited plan bypass verified. Premium bypass verified.
- [x] **25.6.2** Unit: Webhook idempotency edge cases — verified coverage across `clerk-webhook-route.test.ts` and `stripe-webhook-route.test.ts`. Clerk duplicate `user.created` idempotency, Clerk `user.deleted` with non-existent user, Stripe duplicate `stripeId` idempotency, invalid signature rejection — all covered.
- [x] **25.6.3** Unit: Entitlement resolver full coverage — `resolve-entitlements.test.ts` extended. All plan × feature combinations (Lite/Pro/Premium × image/audio/video), expired paid plan revert to Lite, suspended user blocking, all 9 personas accessible across all plans — all verified.

Additional: `checkout-success-page.test.tsx` (new, 5 tests) covering success path, missing session_id, oversized session_id, unverified payment, missing Stripe secret. `public-pages.spec.ts` updated with checkout-success E2E assertion.

57 test files, 287 tests passing. All 6 validation gates green.

**Files changed:** `tests/unit/conversation-stop.test.ts` (new), `tests/unit/checkout-success-page.test.tsx` (new), `tests/unit/stripe-webhook-route.test.ts`, `tests/unit/resolve-entitlements.test.ts`, `tests/e2e/public-pages.spec.ts`

---

## HF-8.1: Stripe Webhook Error Response Sanitization — COMPLETED

- [x] **HF-8.1** Sanitize Stripe webhook error responses — all detailed error strings replaced with generic `WEBHOOK_FAILURE_MESSAGE` constant (`"Webhook processing failed"`). `logStripeWebhookError()` helper writes details to `process.stderr` only. `createWebhookErrorResponse()` helper returns generic JSON bodies. Success response returns `{ message: "OK" }` only — no transaction/user data. Tests updated (9 test cases covering all error paths and generic message assertions).

**Residual:** Unhandled event fallback still leaks `eventType` in response — tracked as HF-8.2.

**Files changed:** `src/app/api/webhooks/stripe/route.tsx`, `tests/unit/stripe-webhook-route.test.ts`

---

## HF-4: CRITICAL — Stripe Checkout Return URL Fix — COMPLETED

- [x] **HF-4.1** Fix Stripe checkout return URL issue — public intermediary route created at `src/app/(public)/checkout-success/page.tsx`. Server-side Stripe session verification via `stripe.checkout.sessions.retrieve()`. Input validation (non-empty, max 255 chars). Success UI with link to `/app/profile`, error UI with link to `/app/plans`. `success_url` in `transaction.action.tsx` updated to `${BASEURL}/checkout-success?session_id={CHECKOUT_SESSION_ID}`. No user data modification on this page (webhook responsibility). Generic error messages only. Unit tests added (`checkout-success-page.test.tsx`, 5 tests). E2E coverage added (`public-pages.spec.ts`).

Resolved: TD-BILL-02. Stripe checkout now returns to a public route that does not require an active Clerk session. Clerk session expiry during external checkout no longer causes a redirect loop.

**Files changed:** `src/app/(public)/checkout-success/page.tsx` (new), `src/lib/actions/transaction.action.tsx`, `tests/unit/checkout-success-page.test.tsx` (new), `tests/e2e/public-pages.spec.ts`

---

## HF-7: MEDIUM — Context Compaction Non-Text Token Cost — COMPLETED

- [x] **HF-7.1** Add non-text token cost estimation to message compaction — `estimateContentItemTokens()` in `message-policy.ts` assigns heuristic costs: 300 tokens per `image_url`, 500 tokens per `input_audio`. Non-text items in older messages are evicted when token budget is exceeded. Most recent user message retains all non-text items regardless of budget. Tests added in `message-policy.test.ts` (4 tests covering image/audio estimation, eviction, preservation).

**Files changed:** `src/lib/utils/openai/message-policy.ts`, `tests/unit/message-policy.test.ts`

---

## HF-6: HIGH — Premium Chat Retry Model Downgrade — COMPLETED

- [x] **HF-6.1** Set distinct fallback models for Premium chat task classes — Premium chat simple/standard fallback changed from `gpt-4.1` to `gpt-4o-mini`; complex fallback changed from `gpt-4.1` to `gpt-4.1-mini`. All 3 Premium chat `fallbackModel` values now differ from their `model` values. Tests updated in `ai-model-policy.test.ts`.

Resolved: AGENTS.md rule "Retries should downgrade model tier" now enforced for Premium chat.

**Files changed:** `src/lib/utils/ai-model-policy.ts`, `tests/unit/ai-model-policy.test.ts`

---

## HF-5: CRITICAL — Auth Reliability: Webhook Over-Fetch & Self-Heal Race — COMPLETED

- [x] **HF-5.1** Remove unnecessary Clerk API call for missing username in webhook — condition in `resolveUserCreatedParams()` changed from `if (!webhookEmail || !webhookUsername)` to `if (!webhookEmail)` only. Webhook with email but no username now succeeds without calling `client.users.getUser()`. Tests updated in `clerk-webhook-route.test.ts` to assert no unnecessary `getUser` call when email exists.
- [x] **HF-5.2** Fix self-heal duplicate-key race returning false 503 — `User.create()` wrapped in try/catch for MongoDB error code 11000 (duplicate key). On 11000, refetches existing user via `findSyncedUserByClerkId()`. `client.users.updateUserMetadata()` wrapped in non-fatal try/catch with stderr warning. Tests added in `ensure-user-synced.test.ts` (10 tests covering race recovery and metadata failure scenarios).

**Files changed:** `src/app/api/webhooks/clerk/route.tsx`, `src/lib/utils/ensure-user-synced.ts`, `tests/unit/clerk-webhook-route.test.ts`, `tests/unit/ensure-user-synced.test.ts`

---

## Phase 25.5.4–25.5.7: E2E Test Expansion — COMPLETED

- [x] **25.5.4** E2E: Conversation lifecycle — `tests/e2e/conversation-lifecycle.spec.ts` (212 lines). Full create→list→resume→delete cycle with MongoDB seeding, `/api/openai` mocking, proper cleanup. Skips non-Chromium.
- [x] **25.5.5** E2E: User profile and plan pages — `tests/e2e/user-profile.spec.ts` (62 lines). Profile rendering, plan badge, plan catalog with $19/$39 price assertions, upgrade CTA.
- [x] **25.5.6** E2E: Admin dashboard and user management — `tests/e2e/admin-users.spec.ts` (41 lines). Dashboard→users list→user detail navigation with action button presence assertions.
- [x] **25.5.7** E2E: Admin features — `tests/e2e/admin-features.spec.ts` (77 lines). Transactions, usage, settings, and website management pages. CMS page creation and Tiptap editor rendering.
- [x] Admin credential helpers added to `e2e-test-user.ts`. Admin storage setup added to `global.setup.ts`. Flake hardening in `chat-app-shell.spec.ts` (`scrollIntoViewIfNeeded()` before click).

Full E2E suite: 178 passed, 8 skipped, 0 failed. 55 unit test suites, 268 unit tests passed. All 6 validation gates green.

**Files changed:** `tests/e2e/conversation-lifecycle.spec.ts` (new), `tests/e2e/user-profile.spec.ts` (new), `tests/e2e/admin-users.spec.ts` (new), `tests/e2e/admin-features.spec.ts` (new), `tests/e2e/utils/e2e-test-user.ts`, `tests/e2e/global.setup.ts`, `tests/e2e/chat-app-shell.spec.ts`

---

## HF-3: CLOSED (Invalid) — Model IDs Verified Real

HF-3 was predicated on the claim that `gpt-image-1-mini`, `gpt-image-1.5`, `gpt-audio-mini`, `gpt-audio-1.5`, and `gpt-4o-mini-tts` were "invented" model IDs not recognized by the OpenAI API.

**Verification result (March 2026):** All 5 model IDs are real, officially documented OpenAI models confirmed by:

- OpenAI official model catalog at `developers.openai.com/api/docs/models/all/`
- OpenAI image generation guide explicitly listing `gpt-image-1.5`, `gpt-image-1`, `gpt-image-1-mini`
- OpenAI audio docs listing `gpt-audio-1.5`, `gpt-audio-mini`, `gpt-4o-mini-tts`
- User confirmation that all models are configured in their OpenAI dashboard
- Independent verification by Droplet-Architect and Droplet-Engineer agents

The API calling code in `generateImage.tsx` and `generateAudio.tsx` is compatible with these models.

**Closed tasks:** HF-3.1 (image model IDs), HF-3.2 (audio model IDs), HF-3.3 (re-scoped — TD-AI-16 and TD-AI-17 removed from SPEC.md tech debt).

**Remaining concern:** `MODEL_PRICING` values for audio models have TODO comments noting unverified pricing — this is a low-priority accuracy issue (TD-AI-13), not a functional blocker.

---

## HF-2: Critical — Missing MongoDB User Self-Healing — COMPLETED

- [x] **HF-2.1** Create self-healing user sync utility — `ensureUserSynced()` in `src/lib/utils/ensure-user-synced.ts`. Queries MongoDB for user by `clerkId`, falls back to Clerk API if missing, creates MongoDB record with Lite plan defaults, sets Clerk `publicMetadata`. Returns serialized user data or `null` on failure.
- [x] **HF-2.2** Fix `/app/profile` to handle missing MongoDB user — replaced `getUserById` with `ensureUserSynced`, error state with support contact and retry guidance instead of permanent loading spinner.
- [x] **HF-2.3** Fix `/app/plans` to handle missing MongoDB user — same self-healing pattern as HF-2.2.
- [x] **HF-2.4** Fix `/api/openai` to reject when user record is missing — attempts self-heal, returns HTTP 503 on failure instead of silent Lite degradation.
- [x] **HF-2.5** Remove dead svix dependency — `svix` uninstalled from `package.json`, zero imports confirmed in `src/`.
- [x] **HF-2.6** Verify Clerk Dashboard webhook configuration — webhook endpoint, signing secret, and event subscriptions confirmed working on both local and production.

Resolved: TD-AUTH-03, TD-AUTH-04. Self-healing user sync operational. Clerk issue confirmed fixed on local and production environments.

**Files changed:** `src/lib/utils/ensure-user-synced.ts` (new), `src/app/(chat)/app/profile/page.tsx`, `src/app/(chat)/app/plans/page.tsx`, `src/app/api/openai/route.tsx`, `package.json`

---

## HF-1: Clerk Webhook Fix — COMPLETED

- [x] **HF-1** Fix Clerk webhook to restore user sync — migrated from raw `svix` verification to `verifyWebhook()` from `@clerk/nextjs/webhooks`. Env var renamed from `CLERK_WEBHOOK_SECRET` to `CLERK_WEBHOOK_SIGNING_SECRET` (Clerk canonical name). Signing secret passed explicitly via `signingSecret` parameter. Diagnostic logging added via `logWebhookVerificationFailure()` using `process.stderr.write()`. Unit tests migrated (13 tests) to mock `verifyWebhook` instead of raw Svix `Webhook`. SPEC.md env var table updated. `svix` package now dead dependency in `package.json` (zero imports in source — cleanup tracked as 25.7.4).

**Files changed:** `src/app/api/webhooks/clerk/route.tsx`, `tests/unit/clerk-webhook-route.test.ts`, `SPEC.md`

---

## Phase 25.5.3: Authenticated App Shell E2E — COMPLETED

- [x] **25.5.3** E2E: Authenticated app shell and navigation — `tests/e2e/chat-app-shell.spec.ts` covering `/app` shell rendering with sidebar and main content, sidebar navigation to 5 routes (New Chat, Library, Personas, Profile, Plans), each page renders expected content, persona picker with 9 PersonaCard components visible on `/app/new`. Uses parameterized `SidebarDestination` array for DRY route assertions. Auth handled via stored Clerk session with fallback sign-in.

**Files changed:** `tests/e2e/chat-app-shell.spec.ts` (new)

---

## Phase 25.5.2: Auth Boundary E2E Coverage — COMPLETED

- [x] **25.5.2** E2E: Auth boundary enforcement — dedicated `tests/e2e/auth-boundaries.spec.ts` covering unauthenticated `/app/*` redirect to sign-in, unauthenticated `/admin/*` redirect to sign-in, authenticated non-admin `/admin/*` blocked (403), and public-route accessibility confirmed. Removed duplicate auth-boundary assertions from `authenticated-flows.spec.ts` and `landing-page.spec.ts`. Updated `global.setup.ts` for guest storageState persistence. Stabilized `public-pages.spec.ts` with serial execution and locator reacquisition. Updated `playwright.config.ts` to `127.0.0.1`. Gates 1–5 passed; Gate 6 (full E2E) blocked by MongoDB Atlas connectivity (not a code issue).

**Files changed:** `playwright.config.ts`, `tests/e2e/auth-boundaries.spec.ts` (new), `tests/e2e/authenticated-flows.spec.ts`, `tests/e2e/global.setup.ts`, `tests/e2e/landing-page.spec.ts`, `tests/e2e/plans-public.spec.ts`, `tests/e2e/pricing-public.spec.ts`, `tests/e2e/public-pages.spec.ts`

---

## Phase 25.5.1: Public Page E2E Coverage — COMPLETED

- [x] **25.5.1** E2E: Public page rendering and inter-page navigation — 70 E2E tests added to `tests/e2e/public-pages.spec.ts`. All 8 public routes verified for HTTP 200 + key content rendering. Footer legal-link navigation (Privacy, Terms) verified. Desktop header navigation (About, Personas, Plans, FAQs) verified with intentional mobile skip (links hidden below md breakpoint). Lite price asserted as "Free" (correct zero-price representation). Full E2E suite: 133 passed, 2 skipped. All 6 validation gates green.

**Files changed:** `tests/e2e/public-pages.spec.ts`

---

## Phase 25: Production Hardening — COMPLETED

- [x] **25.1** Add `X-Accel-Buffering: no` to streaming responses — SSE-compatible header added to `STREAM_HEADERS` constant in `/api/openai` route. Only applied to streaming SSE responses; non-streaming JSON responses unaffected.
- [x] **25.2** Verify all admin server actions emit audit log entries — all 8 exported admin mutation actions confirmed to call `createAdminAuditLogEntry()` after mutation. Each also calls `requireAdminActionAccess()` for auth. No code changes required; verification-only task.
- [x] **25.3** Replace in-memory rate limiter with persistent store — `RateLimitEntry` model with TTL index for automatic cleanup, MongoDB-backed atomic sliding window in `rate-limit.ts` using aggregation pipeline, `crypto.randomUUID()` for request IDs. Survives process restarts, works across multiple instances.
- [x] **25.4** Design server-side task complexity classification — `classifyTaskComplexity()` in `classify-task-complexity.ts` with heuristic classification (`simple`/`standard`/`complex`), explicit deep-analysis intent detection via regex pattern, wired into `/api/openai` route for `resolveModelPolicy()`. Frontend does not send `taskClass` or `explicitPremium`.

Resolved: TD-API-01 (persistent rate limiter replaces in-memory), TD-CODE-01 (zero relative imports across `src/`). 53 test suites, 248 tests passing, 79 E2E tests passing. All 6 validation gates green.

**Files changed (25.1):** `src/app/api/openai/route.tsx`
**Files changed (25.2):** None (verification only)
**Files changed (25.3):** `src/lib/database/models/rate-limit-entry.model.tsx` (new), `src/lib/utils/rate-limit.ts`, `src/app/api/openai/route.tsx`, `tests/unit/rate-limit.test.ts` (new)
**Files changed (25.4):** `src/lib/utils/openai/classify-task-complexity.ts` (new), `tests/unit/classify-task-complexity.test.ts` (new), `src/app/api/openai/route.tsx`, `tests/unit/openai-route.test.ts`

---

## Phase 24: Testing Hardening — COMPLETED

- [x] **24.1** Add test coverage configuration — `v8` provider in `vitest.config.mts`, thresholds 70/60/70/70 (statements/branches/functions/lines), `test:coverage` script in `package.json`, `@vitest/coverage-v8` dependency added. Coverage run result: 82% statements, 71% branches, 88% functions, 82% lines — all above thresholds.
- [x] **24.2** Add unit tests for chat-body stop-state rendering — 9 tests covering all 5 stop reasons, 3 action link targets (`/app/new`, `/app/plans`, `mailto:`), and amber ended-state styling. Parameterized coverage using jsdom environment. Next.js `Link` mocked to plain anchors for stable route assertions.
- [x] **24.3** Expand streaming test coverage — 5 test cases: happy path, error during stream (503 → `service_error`), tool call handling (image generation routing), abort signal propagation (AbortController mid-stream), empty/null response normalization. All scenarios verified in `generate-streaming-response.test.ts`.
- [x] **24.4** Fix relative import violations — replaced all 15 relative `../` import paths with `@/*` alias imports across 10 files (profile-hero, profile-billing, plans-section, footer, header, user.actions, task.actions, generateTitle, generateAudio, generateImage). Zero relative imports remain in `src/`.

53 test suites, 248 tests passing, 79 E2E tests passing. All 6 validation gates green.

**Files changed (24.1):** `vitest.config.mts`, `package.json`, `package-lock.json`
**Files changed (24.2):** `tests/unit/chat-body.test.tsx` (new)
**Files changed (24.3):** `tests/unit/generate-streaming-response.test.ts`
**Files changed (24.4):** `src/components/sections/profile-hero.tsx`, `src/components/sections/profile-billing.tsx`, `src/components/sections/plans-section.tsx`, `src/components/layout/footer.tsx`, `src/components/layout/header.tsx`, `src/lib/actions/user.actions.tsx`, `src/lib/actions/task.actions.tsx`, `src/lib/utils/openai/generateTitle.tsx`, `src/lib/utils/openai/generateAudio.tsx`, `src/lib/utils/openai/generateImage.tsx`

---

## Phase 23: Post-Phase-22 Cleanup — COMPLETED

- [x] **23.1** Remove dead `chatSystemMsg` constant from `src/constants/openai.tsx` (confirmed zero usages, removed export, behavior-neutral)
- [x] **23.2** Abstract TTS routing to policy flag — `isTtsOnly: boolean` added to `ResolvedModelPolicy`, `MODEL_CAPABILITIES` map drives resolution centrally, `generateAudio.tsx` uses `policy.isTtsOnly` instead of string comparison

Resolved: TD-AI-14 (Phase 23.1), TD-AI-15 (Phase 23.2). 51 test suites, 229 tests passing, 79 E2E tests passing. All 6 validation gates green.

**Files changed (23.1):** `src/constants/openai.tsx`
**Files changed (23.2):** `src/lib/utils/ai-model-policy.ts`, `src/lib/utils/openai/generateAudio.tsx`, `tests/unit/ai-model-policy.test.ts`

---

## Phase 22: Prompt System & OpenAI Resilience — COMPLETED

- [x] **22.1** Implement retry/backoff for OpenAI failures (`withOpenAIRetry()` wrapper with exponential backoff 1s/2s/4s, transient-only retries for 429/500/502/503, immediate failure for 400/401/403, `maxRetries: 0` on SDK requests, model downgrade via `retryAttempt` parameter)
- [x] **22.2** Create prompt versioning and management system (`src/constants/persona-prompts.ts` with `import "server-only"`, `PROMPT_VERSION = "1.0"`, model-family resolution, temperature/max-token settings per persona)
- [x] **22.3** Improve persona-specific prompts (all 9 personas with distinct prompts, `COMPANION_SAFETY_RULES` for companion personas, `WELLNESS_SAFETY_RULES` for wellness, model-family-aware prompt adaptation)

Resolved: TD-AI-06 (fully), TD-AI-09 (partially — chat prompts optimized, media prompts pending). Both streaming and non-streaming chat paths use retry. Streaming only retries before first content chunk emitted. Vitest server-only alias added for test coverage. 51 test suites, 229 tests passing, 79 E2E tests passing. All 6 validation gates green.

**Files changed:** `src/lib/utils/openai/generateResponse.tsx`, `src/constants/persona-prompts.ts` (new), `src/constants/assistant-personas.tsx`, `vitest.config.mts`, `tests/unit/openai-retry.test.ts` (new), `tests/unit/persona-prompts.test.ts` (new), `tests/unit/ai-model-policy.test.ts`, `tests/e2e/landing-page.spec.ts`

**Known residual items (non-blocking):**

- ~~Dead `chatSystemMsg` export in `openai.tsx`~~ — **Resolved** in Phase 23.1 (TD-AI-14)
- Hardcoded TTS model-name branch in `generateAudio.tsx` (TD-AI-15)
- Image/audio generation not persona-aware (TD-AI-09 partial)

---

## Phase 21-C: Post-Policy Cleanup — COMPLETED

- [x] **21-C.1** Remove dead `combinedCount` parameter from `check-usage-limit.ts`, callers in `route.tsx`, and tests
- [x] **21-C.2** Fix video matrix/resolver dual source of truth — matrix `final.model` now `sora-2` with notes documenting `explicitPremium` override

Resolved: TD-AI-11 (fully), TD-AI-12 (fully). All tests passing. All 6 validation gates green.

**Files changed:** `src/lib/utils/check-usage-limit.ts`, `src/app/api/openai/route.tsx`, `src/lib/utils/ai-model-policy.ts`, `tests/unit/check-usage-limit.test.ts`

---

## Phase 21: Model Policy Overhaul — COMPLETED

- [x] **21.1** Fix Premium video generation claim ("Video generation - Coming soon (Premium)")
- [x] **21.2** Implement model policy types and `MODEL_POLICY_MATRIX` constant (all 3 plans × 5 features × task classes)
- [x] **21.3** Implement `resolveModelPolicy()` resolver with downgrade logic, hard blocking, audio mode differentiation
- [x] **21.4** Update Lite plan limits — block audio generation (image-only media, `supportsAudioGeneration: false`)
- [x] **21.5** Migrate `generateTitle` to new model policy (`gpt-4.1-nano` pinned, token caps enforced)
- [x] **21.6** Migrate `generateImage` to new model policy (`gpt-image-1-mini` / `gpt-image-1.5`)
- [x] **21.7** Migrate `generateAudio` to new model policy (Lite blocked, Pro `gpt-audio-mini`, Premium `gpt-audio-1.5`)
- [x] **21.8** Migrate `generateResponse` (chat) to new model policy with context compaction via `message-policy.ts`
- [x] **21.9** Migrate `/api/openai` route to new model policy (defaults: `taskClass: "standard"`, `budgetState: "normal"`)
- [x] **21.10** Update cost estimation and `MODEL_PRICING` for new model IDs (deprecated model entries removed)
- [x] **21.11** Rewrite `ai-model-policy.test.ts` — 10 test cases covering all plan × feature combinations, downgrade triggers, hard blocking, Premium routing, audio mode
- [x] **21.12** Update plan constants and admin settings snapshot for new model structure

Resolved: TD-AI-10 (fully), TD-AI-08 (partially — video now shows "Coming soon"). 49 test suites, 220 tests passing, 79 E2E tests passing. All 6 validation gates green. PM-verified: typecheck, lint, and unit tests independently confirmed.

**Files changed:** `src/lib/utils/ai-model-policy.ts`, `src/lib/utils/openai/generateTitle.tsx`, `src/lib/utils/openai/generateImage.tsx`, `src/lib/utils/openai/generateAudio.tsx`, `src/lib/utils/openai/generateResponse.tsx`, `src/lib/utils/openai/message-policy.ts` (new), `src/app/api/openai/route.tsx`, `src/constants/plans.tsx`, `src/lib/utils/resolve-entitlements.tsx`, `src/lib/utils/check-usage-limit.ts`, `src/lib/utils/admin-queries.ts`, `tests/unit/ai-model-policy.test.ts`, `tests/unit/plans.test.ts`, `tests/unit/resolve-entitlements.test.ts`, `tests/unit/check-usage-limit.test.ts`

**Known residual items (non-blocking):**

- Dead `combinedCount` parameter in `check-usage-limit.ts` and callers (TD-AI-11)
- Video matrix/resolver dual source of truth (TD-AI-12)
- 5 model pricing placeholders pending OpenAI confirmation (TD-AI-13)

---

## Phase 20: Error Handling, File Cleanup & Webhook Hardening — COMPLETED

- [x] **20.1** Refactor handleError to preserve stack traces (`new Error(message, { cause: error })` pattern)
- [x] **20.4** Add S3 cleanup on task deletion (scan messages for S3 URLs, best-effort delete, per-key try/catch)
- [x] **20.5** Refactor chat input to upload via `/api/upload` (FormData upload, blob preview, upload failure blocks send)
- [x] **20.6** Remove `deleteAllTransactions` action (function deleted entirely)
- [x] **20.8** Add idempotency check to Clerk webhook handlers (duplicate `user.created` check, graceful miss for `user.updated`/`user.deleted`)
- [x] **20.9** Remove yearly billing UI toggle (monthly-only pricing display, no yearly toggle/badge)
- [x] **20.10** Extract SUPPORT_EMAIL to shared constant (`src/constants/support.ts`, consumed by 7 files)
- [x] **20.11** Clean up orphan directories (`src/app/(chat)/dashboard/`, `src/app/(public)/pricing/` removed)

Resolved: TD-API-06, TD-FILE-01 (fully), TD-FILE-02, TD-ACT-01, TD-WEBHOOK-02. Tasks 20.2, 20.3, 20.7 completed in Phase 19 delivery (see below). 49 test suites, 215 tests passing, 79 E2E tests passing. All 6 validation gates green.

**Files changed:** `src/lib/utils/handleError.tsx`, `src/lib/actions/task.actions.tsx`, `src/components/chat/chat-input.tsx`, `src/app/api/webhooks/clerk/route.tsx`, `src/lib/actions/transaction.action.tsx`, `src/components/sections/plans-section.tsx`, `src/components/shared/plan-card.tsx`, `src/lib/utils/getPlanStatus.tsx`, `src/components/shared/plan-promo.tsx`, `src/constants/support.ts`, `tests/unit/chat-input.test.tsx`, `tests/unit/task-actions.test.ts`, `tests/unit/clerk-webhook-route.test.ts`, `tests/e2e/plans-public.spec.ts`, `tests/e2e/pricing-public.spec.ts`

---

## Phase 19: Streaming Implementation — COMPLETED

- [x] **19.1** Create streaming API route (`generateStreamingResponse()` in `generateResponse.tsx`, SSE branch in `/api/openai` with `meta`, `chunk`, `final`, `error` events)
- [x] **19.2** Update chat UI to render streamed responses (`chat-wrapper.tsx` consumes SSE via `ReadableStream.getReader()`, progressive text rendering, JSON fallback for non-streaming clients)

Resolved: TD-AI-01, TD-API-07. Streaming works end-to-end. All auth/limit checks preserved before stream. Legacy non-streaming path intact. Final task persistence and usage event emission happen after stream completion. Manually verified via Playwright MCP browser session. All gates green.

**Files changed:** `src/app/api/openai/route.tsx`, `src/lib/utils/openai/generateResponse.tsx`, `src/components/chat/chat-wrapper.tsx`, `tests/unit/generate-streaming-response.test.ts`, `tests/unit/openai-route.test.ts`, `tests/unit/chat-wrapper.test.tsx`

---

## Phase 20 (Partial): Webhook Privacy Fix — COMPLETED

- [x] **20.7** Add Task and S3 cleanup to Clerk webhook `user.deleted` handler (Task.deleteMany + deleteS3Prefix with isolated error handling per cleanup step)

Tasks 20.2 (S3 cleanup on user deletion) and 20.3 (orphaned Task deletion) were merged into 20.7 delivery — all three resolved together.

Resolved: TD-DB-15, TD-WEBHOOK-01, TD-FILE-01 (Clerk webhook portion). Each cleanup step has independent try/catch; webhook always returns 200 even on partial failure. `process.stderr.write()` for error logging (AGENTS.md compliant).

**Files changed:** `src/app/api/webhooks/clerk/route.tsx`, `src/lib/utils/aws/delete-s3-prefix.ts`, `tests/unit/clerk-webhook-route.test.ts`

---

## Phase 18: Public Pages & Navigation — COMPLETED

- [x] **15.1** Build daily conversation limit check utility (`checkDailyConversationLimit` in `check-daily-conversations.ts`)
- [x] **15.2** Add prompt count tracking to conversation flow (`promptCount` init/increment via `$inc` in `task.actions.tsx`)
- [x] **15.3** Integrate daily conversation limit into `/api/openai` (new conversations only, unlimited plans bypass)
- [x] **15.4** Add conversation stop handling to chat UI (stop reason messages, action links, input disabled for ended conversations)
- [x] **15.5** Add message count / document size guard for Task (`estimatedBytes` tracking, 12MB threshold, pre/post-response checks)

Resolved: TD-PLAN-07, TD-PLAN-08, TD-DB-05. 46 test suites, 188 tests passing, 58 E2E tests passing. Lint, typecheck, build all green.

**Remaining gap**: UsageEvent emission not implemented (TD-AI-03) — elevated to Phase 16.

---

## Phase 14: Data Model Foundation — COMPLETED

- [x] **14.1** Add conversation lifecycle fields to Task model (promptCount, mediaCount, estimatedBytes, status, endedAt, endedReason, endAction)
- [x] **14.2** Create UsageEvent model with all SPEC.md 6.4 fields and indexes
- [x] **14.3** Create UsageEvent type definition (UsageEventData, CreateUsageEventParams)
- [x] **14.4** Create AppSetting model with key (unique), value (Mixed), category (indexed)
- [x] **14.5** Create PublicPage model with slug (unique), content, sortOrder, isPublished
- [x] **14.6** Create AdminAuditLog model with adminId, action, targetType, targetId (all indexed)

All 6 tasks verified. 41 test suites, 184 tests passing. Lint, typecheck, build all green.

---

## Phase 13: Product Rule Reconciliation — COMPLETED

- [x] **13.1** Remove Lite plan 3-day expiry — Lite is now "Free forever" with far-future expiry
- [x] **13.2** Update plan prices to $19 (Pro) / $39 (Premium)
- [x] **13.3** Allow all 9 personas in all plans (removed Lite persona restrictions)
- [x] **13.4** Update Lite plan inclusions and limits display
- [x] **13.5** Update Pro plan inclusions display
- [x] **13.6** Update Premium plan inclusions display (3 premium media features)
- [x] **13.7** Update PLAN_LIMITS constant for all tiers (conversationsPerDay, promptsPerConversation, video)
- [x] **13.8** Update FAQ content — remove trial references, add support email, rewrite free plan FAQ

---

## Phase 9: Production UX Polish — COMPLETED

- [x] **9.1** Add conversation delete button to chat sidebar
- [x] **9.2** Add conversation delete button to library page
- [x] **9.3** Add loading skeleton for chat layout
- [x] **9.4** Add loading skeleton for account layout

---

## Phase 8: Database Optimization — COMPLETED

- [x] **8.1** `.lean()` and `.select()` on getUserById
- [x] **8.2** `.lean()` on getAllTransactions
- [x] **8.3** Optimize task-queries with `.lean()` and `.select()`
- [x] **8.4** Index on Task.personaId
- [x] **8.5** Mongoose connection pooling review

---

## Phase 7: Persona Rename — COMPLETED

- [x] **7.1–7.26** Full persona rename from "assistant role" to "persona" across all files

---

## Phase 6: Testing — COMPLETED

- [x] **6.1–6.5** generateResponse, generateTitle, deleteTask, getUserById tests

---

## Phase 5: Error Handling — COMPLETED

- [x] **5.1–5.2** OpenAI error classification, chat error boundary

---

## Phase 4: Plan Enforcement (Usage Limits) — COMPLETED

- [x] **4.1–4.6** Usage tracking fields, plan limits, usage check, enforcement, reset

---

## Phase 3: Core Feature Gaps — COMPLETED

- [x] **3.1–3.5** deleteTask, mapDateToLabel, generateImage S3, error.tsx, .env example

---

## Phase 2: Security Fixes (Ownership) — COMPLETED

- [x] **2.1–2.5** Ownership enforcement, console.log removal

---

## Phase 1: Security & Data Integrity — COMPLETED

- [x] **1.1–1.9** strict:true fixes, index additions, ownership validation, createUser non-export

---

## Phase 16: AI Model Policy & Usage Logging — COMPLETED

- [x] **16.1** Create AI model policy resolver (`ai-model-policy.ts` with `resolveModelForPlan`, `MODEL_POLICY`, `estimateModelCostCents`)
- [x] **16.2** Wire model policy into `generateResponse` (plan-aware chat model selection)
- [x] **16.3** Wire model policy into `generateTitle`, `generateImage`, `generateAudio` (all plan-aware)
- [x] **16.4** Emit UsageEvent for every AI request in `/api/openai` (fire-and-forget, blocked events with reason, `usage-event-utils.ts`)
- [x] **16.5** Add unit tests for AI model policy resolver (`ai-model-policy.test.ts`)

Resolved: TD-AI-07 (hardcoded models), TD-AI-03 (no usage logging). 48 test suites, 204 tests passing, 65 E2E tests passing. All gates green.

---

## Phase 17: Route Restructure & Admin Control Plane — COMPLETED

- [x] **17.1** Create `/admin` route group and layout (admin sidebar, dashboard with stats, `requireAdminPageAccess()`)
- [x] **17.2** Create `/admin/users` list page (search, role filter, plan display)
- [x] **17.3** Create `/admin/users/[userId]` detail page (suspend, reinstate, remove actions, audit logged)
- [x] **17.4** Create `/admin/transactions` list page (with user join, optimized queries)
- [x] **17.5** Create `/admin/transactions/[transactionId]` detail page
- [x] **17.6** Create `/admin/usage` page (by user, model, type, day, provider, cost estimates)
- [x] **17.7** Create `/admin/settings` page (AI models, pricing, limits, theme — read/write via AppSetting)
- [x] **17.8** Create `/admin/website` management page (CRUD for public pages, publish/unpublish, sort)
- [x] **17.9** Create `/admin/website/[pageId]` editor page (Tiptap rich-text editor integrated)
- [x] **17.10** Move `/profile` to `/app/profile` (with plan info, purchase history, upgrade link)
- [x] **17.11** Move `/plans` to `/app/plans` and rename `/pricing` to `/plans` (public)
- [x] **17.12** Update proxy for new route structure (now: `/app(.*)`, `/admin(.*)` only)
- [x] **17.13** Update Stripe checkout redirect URLs (`success_url` → `/app/profile`, `cancel_url` → `/app/plans`)
- [x] **17.14** Remove old `/dashboard` route
- [x] **17.17** Update E2E tests for new route structure

**Deferred to Phase 18:** 17.15 (header nav for `/about`, `/faqs`) and 17.16 (footer links for `/privacy`, `/terms`) — blocked by public page routes not existing yet.

Resolved: TD-AUTH-01, TD-AUTH-02, TD-UI-09, TD-UI-10, TD-BILL-01. Admin infrastructure: `admin-auth.ts`, `admin-audit.ts`, `admin-queries.ts`, `admin.actions.tsx`, `admin-sidebar.tsx`, `admin-layout-shell.tsx`, `tiptap-editor.tsx`. Tiptap packages installed. 48 test suites, 204 tests, 65 E2E tests passing. All gates green.

---

## Phase 17-C: Pre-Phase-18 Cleanup — COMPLETED

- [x] **17-C.1** Delete orphaned `(account)` route group (`src/app/(account)/` directory removed)
- [x] **17-C.2** Remove all `console.error` calls from production source code (15 instances across webhooks, API routes, chat components)

Resolved: TD-LOG-01. Zero `console.error` / `console.log` / `console.warn` in `src/`. 48 test suites, 205 tests passing, 77 E2E tests passing. All gates green.

---

## Phase 18: Public Pages & Navigation — COMPLETED

- [x] **18.1** Create `/about` page (5 content sections: persona-led guidance, workflow, nine personas, media, plans & limits)
- [x] **18.2** Create `/faqs` page (FaqsSection reuse + "Still need help?" CTA)
- [x] **18.3** Create `/privacy` page (6-section privacy policy with legal review disclaimer)
- [x] **18.4** Create `/cookies` page (3 cookie categories + managing preferences guidance)
- [x] **18.5** Create `/terms` page (6 sections: service, accounts, AI disclaimer, payment, refunds, liability)
- [x] **18.6** Enhance homepage with product sections (7 sections: Hero, Features, Workflow, Persona Spotlight, CTA, Plans, FAQs)
- [x] **18.7** Update header navigation for public pages (`/about`, `/personas`, `/plans`, `/faqs` links)
- [x] **18.8** Update footer links for legal pages (`<Link>` to `/privacy` and `/terms`)
- [x] **18.9** Run full validation gate (all 6 steps pass)

Resolved: TD-UI-08 (5 public pages), TD-UI-07 (homepage sections), TD-UI-12 (footer links), TD-UI-13 (header nav). Legal pages include disclaimer for pre-production legal review. 48 test suites, 205 tests passing, 77 E2E tests passing. All gates green.

---

## Phase 10–12: (Superseded)

Old Phase 10-12 tasks have been incorporated into the new phase structure:

- 10.1 → 20.1, 10.2 → 20.2, 10.3 → 20.3, 10.4 → 20.4
- 11.1 → 22.1, 11.2 → 22.2
- 12.x → 23.x (deferred items)

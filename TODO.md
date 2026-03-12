# Droplet — TODO

> Prioritized, actionable development tasks. Each task max ~30 minutes.
> Governed by **Droplet-PM**. Do not add tasks without PM approval.
> Ref: `SPEC.md` for full specification. `AGENTS.md` for coding rules. `DONE.md` for completed phases.
> Implementation agent: **Codex Agent** (Senior Developer).

---

## Phase 24: Testing Hardening — CURRENT PRIORITY

> Improve test coverage for reliability before production hardening.
> Ref: ThePlan.md Milestone 8 prerequisites.
> Depends on: Phase 23 (complete)

---

### 24.1 Add test coverage configuration

**Files:** `vitest.config.mts`, `package.json`

**What to do:**

- Add `coverage` config to `vitest.config.mts` with `v8` provider.
- Set thresholds: 70% statements, 60% branches, 70% functions, 70% lines.
- Add `"test:coverage": "vitest run --coverage"` script to `package.json`.

**Acceptance criteria:**

- [ ] Coverage config in `vitest.config.mts` with `v8` provider
- [ ] Thresholds: 70/60/70/70 (statements/branches/functions/lines)
- [ ] `npm run test:coverage` runs and reports coverage
- [ ] All existing tests pass
- [ ] `npx tsc --noEmit` passes

---

### 24.2 Add unit tests for chat-body stop-state rendering

**File (new):** `tests/unit/chat-body.test.tsx`

**What to do:**

- Test `ChatBodyEndNotice` renders correct stop reason titles for each reason code (`prompt_limit_reached`, `media_limit_reached`, `daily_conversation_limit_reached`, `conversation_storage_limit_reached`, `billing_state_invalid`).
- Test action links point to correct routes (`/app/new`, `/app/plans`, `mailto:` support).
- Test amber visual styling applied for ended conversations.

**Acceptance criteria:**

- [ ] Tests cover all 5 stop reason titles
- [ ] Tests verify action link routes
- [ ] Tests verify visual styling distinction
- [ ] `npx tsc --noEmit` passes
- [ ] All tests pass

---

### 24.3 Expand streaming test coverage

**File:** `tests/unit/generate-streaming-response.test.ts`

**What to do:**

- Add tests for: OpenAI failure during stream (error event), tool call handling after stream, abort signal propagation (request cancelled mid-stream), empty response handling.

**Acceptance criteria:**

- [ ] Error path tested (OpenAI API error during stream emits `error` SSE event)
- [ ] Tool call routing tested after stream completion
- [ ] Abort signal test (request cancelled mid-stream)
- [ ] Empty/null response handled
- [ ] All tests pass

---

## Phase 25: Production Hardening

> Close operational gaps before launch.
> Ref: ThePlan.md Milestone 8.
> Depends on: Phase 24

---

### 25.1 Add `X-Accel-Buffering: no` to streaming responses

**File:** `src/app/api/openai/route.tsx`

**What to do:**

- Add `"X-Accel-Buffering": "no"` header to the streaming SSE `Response` constructor.
- Only add to streaming responses, not non-streaming JSON responses.

**Acceptance criteria:**

- [ ] `X-Accel-Buffering: no` header present on streaming responses
- [ ] Non-streaming responses unaffected
- [ ] `npx tsc --noEmit` passes
- [ ] All tests pass

---

### 25.2 Verify all admin server actions emit audit log entries

**Files:** `src/lib/actions/admin.actions.tsx`

**What to do:**

- Audit every exported admin action function.
- Confirm each calls `createAdminAuditLogEntry()` after mutation.
- Add missing audit log calls if any are found.
- Document which actions were already correct and which were fixed.

**Acceptance criteria:**

- [ ] Every exported admin mutation action has a `createAdminAuditLogEntry()` call
- [ ] No admin state change can happen without audit trail
- [ ] `npx tsc --noEmit` passes
- [ ] All tests pass

---

### 25.3 Replace in-memory rate limiter with persistent store

**Files:** `src/lib/utils/rate-limit.ts`, `src/app/api/openai/route.tsx`
**Ref:** TD-API-01

**What to do:**

- Replace the current in-memory sliding window rate limiter with a MongoDB-backed implementation.
- Use a `RateLimitEntry` collection with TTL index for automatic cleanup.
- Keep the same API surface (`enforceSlidingWindowRateLimit`).
- Must survive process restarts and work across multiple instances.
- Add a unit test for the new implementation.

**Acceptance criteria:**

- [ ] Rate limiter uses MongoDB storage
- [ ] Survives process restarts
- [ ] Works across multiple instances
- [ ] Same API surface preserved (`enforceSlidingWindowRateLimit`)
- [ ] TTL index on entries for automatic cleanup
- [ ] `npx tsc --noEmit` passes
- [ ] All tests pass

---

### 25.4 Design server-side task complexity classification

**Files (new):** `src/lib/utils/openai/classify-task-complexity.ts`, `tests/unit/classify-task-complexity.test.ts`
**Ref:** SPEC.md Section 8.3, ThePlan.md Section 5.6

**What to do:**

- Create a server-side `classifyTaskComplexity()` function.
- Classification based on: message length, conversation history depth, presence of analytical/technical keywords, explicit user request for deep analysis.
- Returns `TaskClass` (`simple`, `standard`, `complex`).
- Wire into `/api/openai` route so `resolveModelPolicy()` receives classified `taskClass` instead of always `"standard"`.
- **Important:** Classification must happen server-side. Frontend must NOT send `taskClass`.

**Acceptance criteria:**

- [ ] `classifyTaskComplexity()` function exists
- [ ] Classifies messages as `simple`, `standard`, or `complex`
- [ ] `/api/openai` route uses classifier output for `resolveModelPolicy()`
- [ ] Frontend does not send `taskClass` or `explicitPremium`
- [ ] Premium users can reach `gpt-5.4` for genuinely complex requests
- [ ] Unit tests for classifier function
- [ ] `npx tsc --noEmit` passes
- [ ] All tests pass

---

## Phase 26: Deferred Features

> Lower priority items deferred from v1 core.
> Only proceed after Phase 25 is complete and stable.
> Depends on: Phase 25

---

### 26.1 Persona-aware media generation prompts

**Files:** `src/lib/utils/openai/generateImage.tsx`, `src/lib/utils/openai/generateAudio.tsx`, `src/constants/persona-prompts.ts`
**Ref:** TD-AI-09 (remaining gap)

**What to do:**

- Extend `persona-prompts.ts` to include image and audio prompt guidance per persona.
- In `generateImage.tsx`, inject persona-specific style/tone hints into the image generation prompt.
- In `generateAudio.tsx`, inject persona-specific voice/tone hints into audio generation.
- Preserve existing prompt structure — extend, don't replace.

**Acceptance criteria:**

- [ ] Image generation prompts include persona-specific context
- [ ] Audio generation prompts include persona-specific context
- [ ] Existing chat prompt behavior unaffected
- [ ] Unit tests for persona-aware media prompts
- [ ] `npx tsc --noEmit` passes
- [ ] All tests pass

---

### 26.2 Implement Stripe subscription mode (auto-renewal)

**Ref:** TD-PLAN-01

**What to do:**

- Migrate from one-time Stripe Checkout payments to `mode: "subscription"`.
- Handle `invoice.paid`, `customer.subscription.updated`, `customer.subscription.deleted` webhooks.
- Update plan lifecycle to auto-renew instead of expiring.
- Preserve webhook idempotency patterns.
- This is a significant change — requires careful webhook testing.

**Acceptance criteria:**

- [ ] Stripe sessions use `mode: "subscription"`
- [ ] Subscription lifecycle webhooks handled with idempotency
- [ ] Plan auto-renews on successful payment
- [ ] Plan downgrades on failed payment or cancellation
- [ ] `npx tsc --noEmit` passes
- [ ] All tests pass

---

### 26.3 Add video generation support for Premium

**Ref:** TD-AI-08

**What to do:**

- Implement video generation for Premium plan users.
- Requires: verified provider support, cost ceiling, moderation workflow, S3 storage lifecycle.
- Use `resolveModelPolicy({ plan: "premium", feature: "video_generation", taskClass })` for model selection — `sora-2` for previews, `sora-2-pro` for final renders.
- Wire into `/api/openai` tool calling flow.
- Remove "Coming soon" label from Premium plan inclusions.
- Video stored in S3 with URL reference in messages.

**Acceptance criteria:**

- [ ] Video generation works for Premium users
- [ ] Other plans correctly blocked from video
- [ ] Usage event logged for video requests
- [ ] Video stored in S3, URL in message
- [ ] Plan inclusions show video as available (remove "Coming soon")
- [ ] `npx tsc --noEmit` passes
- [ ] All tests pass

---

> **Completed phases** are archived in [`DONE.md`](DONE.md).
> Phases 1–9, 13–23 are complete. Phase 10–12 superseded (see DONE.md for mapping).

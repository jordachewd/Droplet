# Droplet — TODO

> Prioritized, actionable development tasks. Each task max ~30 minutes.
> Governed by **Droplet-PM**. Do not add tasks without PM approval.
> Ref: `SPEC.md` for full specification. `AGENTS.md` for coding rules. `DONE.md` for completed phases.
> Implementation agent: **Codex Agent** (Senior Developer).

---

## Phase 21-C: Post-Policy Cleanup — CURRENT PRIORITY

> Minor cleanup items discovered during Phase 21 PM review.
> Quick wins that clear dead code before the next feature phase.
> Depends on: Phase 21 (complete)

---

### 21-C.1 Remove dead `combinedCount` parameter from check-usage-limit

**Files:** `src/lib/utils/check-usage-limit.ts`, `src/app/api/openai/route.tsx`, `tests/unit/check-usage-limit.test.ts`
**Ref:** TD-AI-11

**What to do:**

- Remove `combinedCount` from the `CheckUsageLimitParams` interface in `check-usage-limit.ts`.
- Remove the `void combinedCount;` line inside the function body.
- Remove computation/passing of `combinedCount` / `combinedMediaUsageCount` from callers in `route.tsx`.
- Update any test calls that pass `combinedCount`.

**Acceptance criteria:**

- [ ] `combinedCount` removed from `CheckUsageLimitParams` interface
- [ ] `void combinedCount;` line removed from function body
- [ ] No caller computes or passes `combinedCount`
- [ ] `npx tsc --noEmit` passes
- [ ] All existing tests pass (49 suites, 220+ tests)

---

### 21-C.2 Fix video matrix/resolver dual source of truth

**File:** `src/lib/utils/ai-model-policy.ts`
**Ref:** TD-AI-12

**What to do:**

- In `MODEL_POLICY_MATRIX.premium.video_generation`, change the `final` task class entry to `model: "sora-2"` (matching actual runtime behavior where `sora-2-pro` is only used when `explicitPremium === true`).
- Add a `notes` field: `"sora-2-pro requires explicitPremium — see resolver override"`.
- This makes the matrix truthful about default behavior. The resolver override for `explicitPremium` remains unchanged.

**Acceptance criteria:**

- [ ] Matrix `final.model` is `sora-2` (not `sora-2-pro`)
- [ ] Matrix `final.notes` documents the `explicitPremium` override
- [ ] Resolver override for `sora-2-pro` on `explicitPremium` unchanged
- [ ] All existing tests pass
- [ ] `npx tsc --noEmit` passes

---

## Phase 22: Prompt System & OpenAI Resilience — NEXT

> Prompt quality improvement and OpenAI error resilience.
> Ref: TD-AI-09, TD-AI-06
> Depends on: Phase 21-C (cleanup must be complete)

---

### 22.1 Implement retry/backoff for OpenAI failures

**File:** `src/lib/utils/openai/generateResponse.tsx`
**Ref:** TD-AI-06, SPEC.md Section 8.5

**What to do:**

- Add exponential backoff for transient OpenAI errors (429, 500, 502, 503).
- Max 3 retries with increasing delay (e.g., 1s, 2s, 4s).
- On retry, use `resolveModelPolicy()` with `retryAttempt` parameter to trigger model downgrade per SPEC.md Section 8.5.
- Log retries server-side via `process.stderr.write()` (NOT `console.error`).
- Non-retryable errors (400, 401, 403) must fail immediately without retry.

**Acceptance criteria:**

- [ ] Transient errors (429, 500, 502, 503) trigger retry with exponential backoff
- [ ] Max 3 retries with increasing delays
- [ ] Retries use fallback model via `retryAttempt` parameter
- [ ] Non-retryable errors (400, 401, 403) fail immediately
- [ ] Retry logging uses `process.stderr.write()`
- [ ] `npx tsc --noEmit` passes
- [ ] All existing tests pass

---

### 22.2 Create prompt versioning and management system

**File (new):** `src/constants/persona-prompts.ts`
**Ref:** TD-AI-09

**What to do:**

- Create a prompt configuration file that defines system prompts per persona, per model family.
- Structure: `{ [personaId]: { [modelFamily]: { systemPrompt, temperature, maxTokens } } }`.
- Current `systemPrompt` field on persona objects becomes the default/fallback.
- Add prompt version identifier (e.g., `PROMPT_VERSION = "1.0"`).
- Update `buildPersonaAwareSystemPrompt()` (or its caller) to check the new config first, falling back to the persona's default `systemPrompt`.

**Acceptance criteria:**

- [ ] Prompt configuration file created with all 9 personas
- [ ] Prompts organized by persona and model family
- [ ] Version identifier present
- [ ] `buildPersonaAwareSystemPrompt` uses new config when available
- [ ] Fallback to default `systemPrompt` works
- [ ] `npx tsc --noEmit` passes
- [ ] All existing tests pass

---

### 22.3 Improve persona-specific prompts

**Files:** `src/constants/persona-prompts.ts`, `src/constants/assistant-personas.tsx`
**Ref:** TD-AI-09

**What to do:**

- Review and improve each persona's system prompt for:
  - Distinct personality and tone
  - Clear domain expertise boundaries
  - Safety constraints (especially companion personas: boyfriend, girlfriend, best-friend)
  - Answer formatting preferences
  - Model-aware instructions (simpler prompts for cheaper models, richer for premium)
- Companion personas MUST include:
  - No romantic/sexual content generation
  - No medical/legal/financial advice
  - Clear boundary when user requests exceed persona scope
- Productivity personas (Strategist, Developer, Analyst) should emphasize:
  - Structured, actionable output
  - Domain-appropriate formatting (code blocks for Developer, lists for Strategist)

**Acceptance criteria:**

- [ ] All 9 personas have improved, distinct prompts
- [ ] Safety constraints defined for companion personas
- [ ] Prompts vary by model tier where appropriate
- [ ] `npx tsc --noEmit` passes
- [ ] All existing tests pass

---

## Phase 23: Testing Hardening

> Improve test coverage for updated policy and components.
> Depends on: Phase 22

---

### 23.1 Add test coverage configuration

**Files:** `vitest.config.mts`, `package.json`

**What to do:**

- Add `coverage` config with `v8` provider and 70/60/70/70 thresholds (statements/branches/functions/lines).
- Add `test:coverage` script to `package.json`.

**Acceptance criteria:**

- [ ] Coverage config in Vitest config
- [ ] `npm run test:coverage` works and reports coverage
- [ ] All existing tests pass

---

### 23.2 Add unit tests for chat-body stop-state rendering

**File (new):** `tests/unit/chat-body.test.tsx`

**What to do:**

- Test `ChatBodyEndNotice` renders correct stop reason titles for each reason code.
- Test action links point to correct routes (`/app/new`, `/app/plans`, `mailto:`).
- Test amber visual styling applied for ended conversations.
- Test `billing_state_invalid` stop reason rendering.

**Acceptance criteria:**

- [ ] Tests cover all stop reason titles
- [ ] Tests verify action link routes
- [ ] Tests verify visual distinction
- [ ] All tests pass

---

### 23.3 Expand streaming test coverage

**File:** `tests/unit/generate-streaming-response.test.ts`

**What to do:**

- Current test file has limited coverage. The streaming helper is a critical path.
- Add tests for: error path (OpenAI failure during stream), tool call handling after stream, abort signal propagation, empty response handling.

**Acceptance criteria:**

- [ ] Error path tested (OpenAI API error during stream)
- [ ] Tool call routing tested after stream completion
- [ ] Abort signal test (request cancelled mid-stream)
- [ ] Empty/null response handled
- [ ] All tests pass

---

### 23.4 Add retry/backoff unit tests

**File (new):** `tests/unit/openai-retry.test.ts`

**What to do:**

- Test that transient errors (429, 500, 502, 503) trigger retries.
- Test that non-retryable errors (400, 401, 403) fail immediately without retry.
- Test that retry attempts pass incremented `retryAttempt` to `resolveModelPolicy()`.
- Test that max retries (3) are respected.
- Test backoff timing (1s, 2s, 4s pattern).

**Acceptance criteria:**

- [ ] Transient error retry behavior verified
- [ ] Non-retryable error immediate failure verified
- [ ] `retryAttempt` parameter escalation verified
- [ ] Max retry limit verified
- [ ] All tests pass

---

## Phase 24: Resilience & Deferred Items

> Lower priority. Not blocking v1 launch but important for production hardening.
> Maps to ThePlan.md Milestone 8 (Security & Observability Hardening).

---

### 24.1 Replace in-memory rate limiter with persistent store

**Files:** `src/lib/utils/rate-limit.ts`, `src/app/api/openai/route.tsx`
**Ref:** TD-API-01

**What to do:**

- Replace the current in-memory sliding window rate limiter with a persistent store (Redis or MongoDB-backed).
- Must survive process restarts and work across multiple instances.
- Keep the same API surface (`enforceSlidingWindowRateLimit`).

**Acceptance criteria:**

- [ ] Rate limiter uses persistent storage
- [ ] Survives process restarts
- [ ] Works across multiple instances
- [ ] Same API surface preserved
- [ ] `npx tsc --noEmit` passes
- [ ] All existing tests pass

---

### 24.2 Implement Stripe subscription mode (auto-renewal)

**Ref:** TD-PLAN-01

**What to do:**

- Migrate from one-time Stripe Checkout payments to subscription mode.
- Handle `invoice.paid`, `customer.subscription.updated`, `customer.subscription.deleted` webhooks.
- Update plan lifecycle to auto-renew instead of expiring.
- This is a significant change — requires careful Stripe webhook testing.

**Acceptance criteria:**

- [ ] Stripe sessions use `mode: "subscription"`
- [ ] Subscription lifecycle webhooks handled
- [ ] Plan auto-renews on successful payment
- [ ] Plan downgrades on failed payment
- [ ] `npx tsc --noEmit` passes
- [ ] All existing tests pass

---

### 24.3 Add video generation support for Premium

**Ref:** TD-AI-08

**What to do:**

- Implement video generation for Premium plan users.
- Requires: verified provider, cost ceiling, moderation workflow, S3 storage lifecycle.
- Use `resolveModelPolicy({ plan: "premium", feature: "video_generation", taskClass })` for model selection — `sora-2` for previews, `sora-2-pro` for final renders.
- Wire into `/api/openai` tool calling flow.
- Remove "Coming soon" label from Premium plan inclusions.

**Acceptance criteria:**

- [ ] Video generation works for Premium users
- [ ] Other plans correctly blocked from video
- [ ] Usage event logged for video requests
- [ ] Video stored in S3, URL in message
- [ ] Plan inclusions show video as available (remove "Coming soon")
- [ ] `npx tsc --noEmit` passes
- [ ] All existing tests pass

---

### 24.4 Verify all admin server actions emit audit log entries

**Files:** `src/lib/actions/admin.actions.tsx`

**What to do:**

- Audit every exported admin action to confirm `createAdminAuditLogEntry()` is called.
- Add missing audit log calls if any are found.

**Acceptance criteria:**

- [ ] Every admin mutation has an audit log entry
- [ ] `npx tsc --noEmit` passes
- [ ] All existing tests pass

---

### 24.5 Add `X-Accel-Buffering: no` to streaming response headers

**File:** `src/app/api/openai/route.tsx`

**What to do:**

- Add `X-Accel-Buffering: no` header to streaming SSE responses.
- This prevents reverse proxies (nginx) from buffering streamed chunks.

**Acceptance criteria:**

- [ ] Header present on streaming responses
- [ ] Non-streaming responses unaffected
- [ ] `npx tsc --noEmit` passes

---

### 24.6 Design server-side task complexity classification

**Ref:** ThePlan.md Section 5.6, SPEC.md Section 8.3

**What to do:**

- Currently chat requests default to `taskClass: "standard"` and `explicitPremium: false` because the request contract doesn't carry richer signals.
- Design and implement a server-side heuristic to classify incoming messages as `simple`, `standard`, or `complex` based on: message length, conversation history depth, presence of technical/analytical keywords, explicit user request for deep analysis.
- This enables Premium users to reach `gpt-5.4` for genuinely complex requests without requiring a client-side toggle.
- **Important:** The classification must happen server-side. The frontend must NOT send `taskClass` or `explicitPremium` as trusted input.

**Acceptance criteria:**

- [ ] Server-side classifier function exists (e.g., `classifyTaskComplexity()`)
- [ ] Classification based on message content, conversation depth, and explicit cues
- [ ] `resolveModelPolicy()` receives classified `taskClass` from classifier
- [ ] Premium users can reach `gpt-5.4` for genuinely complex requests
- [ ] Frontend does not send `taskClass` or `explicitPremium`
- [ ] `npx tsc --noEmit` passes
- [ ] Unit tests for classifier function

---

> **Completed phases** are archived in [`DONE.md`](DONE.md).
> Phases 1–9, 13–21 are complete. Phase 10–12 superseded (see DONE.md for mapping).

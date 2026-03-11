# Droplet — TODO

> Prioritized, actionable development tasks. Each task max ~30 minutes.
> Governed by **Droplet-PM**. Do not add tasks without PM approval.
> Ref: `SPEC.md` for full specification. `AGENTS.md` for coding rules. `DONE.md` for completed phases.
> Implementation agent: **Codex Agent** (Senior Developer).

---

## Phase 21: Prompt Improvement & Product Cleanup — CURRENT PRIORITY

> Complete the remaining Milestone 5 gap (prompt quality) and fix the video generation UI claim.
> Ref: TD-AI-09, TD-AI-08
> Depends on: Phase 20 (complete)

---

### 21.1 Fix Premium video generation claim in plan inclusions

**File:** `src/constants/plans.tsx`
**Ref:** TD-AI-08

**What to do:**

- The Premium plan inclusions currently display "Video generation - 10/month (Premium)" but no video generation implementation exists.
- Change the label to "Video generation - Coming soon (Premium)" or equivalent.
- Do NOT remove the entry — video generation is planned for Phase 23.
- Do NOT change `PLAN_LIMITS.Premium.video` (keep the limit constant for future use).

**Acceptance criteria:**

- [ ] Premium plan inclusions label shows "Coming soon" instead of implying availability
- [ ] No functional changes to plan limits or model policy
- [ ] `npx tsc --noEmit` passes
- [ ] `npm run build` passes
- [ ] E2E plans tests still pass

---

### 21.2 Create prompt versioning and management system

**Files (new):** `src/constants/persona-prompts.ts`
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
- [ ] Fallback to default systemPrompt works
- [ ] `npx tsc --noEmit` passes
- [ ] All existing tests pass

---

### 21.3 Improve persona-specific prompts

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

## Phase 22: Testing & Hardening

> Improve test coverage and add resilience for production.
> Ref: TD-AI-06

---

### 22.1 Add test coverage configuration

**Files:** `vitest.config.mts`, `package.json`

**What to do:**

- Add `coverage` config with `v8` provider and 70/60/70/70 thresholds (statements/branches/functions/lines).
- Add `test:coverage` script to `package.json`.

**Acceptance criteria:**

- [ ] Coverage config in Vitest config
- [ ] `npm run test:coverage` works and reports coverage
- [ ] All existing tests pass

---

### 22.2 Add unit tests for updated entitlements

**File (new):** `tests/unit/resolve-entitlements.test.ts`

**What to do:**

- Test all plans return all 9 persona IDs.
- Test Lite has audio generation enabled.
- Test fallback behavior for `resolvePersonaForPlan`.

**Acceptance criteria:**

- [ ] Tests verify all plans allow all 9 personas
- [ ] Tests verify Lite audio generation enabled
- [ ] All tests pass

---

### 22.3 Add unit tests for chat-body stop-state rendering

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

### 22.4 Implement retry/backoff for OpenAI failures

**Files:** `src/lib/utils/openai/generateResponse.tsx`
**Ref:** TD-AI-06

**What to do:**

- Add exponential backoff for transient OpenAI errors (429, 500, 502, 503).
- Max 3 retries with increasing delay (e.g., 1s, 2s, 4s).
- Log retries server-side via `process.stderr.write()` (NOT `console.error`).
- Non-retryable errors (400, 401, 403) must fail immediately without retry.

**Acceptance criteria:**

- [ ] Transient errors trigger retry with exponential backoff
- [ ] Max 3 retries
- [ ] Non-retryable errors fail immediately
- [ ] Retry logging uses `process.stderr.write()`
- [ ] `npx tsc --noEmit` passes
- [ ] All existing tests pass

---

### 22.5 Expand streaming test coverage

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

## Phase 23: Resilience & Deferred Items

> Lower priority. Not blocking v1 launch but important for production hardening.
> Maps to ThePlan.md Milestone 8 (Security & Observability Hardening).

---

### 23.1 Replace in-memory rate limiter with persistent store

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

### 23.2 Implement Stripe subscription mode (auto-renewal)

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

---

### 23.3 Add video generation support for Premium

**Ref:** TD-AI-08

**What to do:**

- Implement video generation for Premium plan users.
- Requires: verified provider, cost ceiling, moderation workflow, S3 storage lifecycle.
- Update `ai-model-policy.ts` with real video model ID.
- Update `generateVideo` utility (or create new).
- Wire into `/api/openai` tool calling flow.
- Remove "Coming soon" label from Premium plan inclusions.

**Acceptance criteria:**

- [ ] Video generation works for Premium users
- [ ] Other plans correctly blocked from video
- [ ] Usage event logged for video requests
- [ ] Video stored in S3, URL in message
- [ ] Plan inclusions show video as available (remove "Coming soon")
- [ ] `npx tsc --noEmit` passes

---

### 23.4 Verify all admin server actions emit audit log entries

**Files:** `src/lib/actions/admin.actions.tsx`

**What to do:**

- Audit every exported admin action to confirm `createAdminAuditLogEntry()` is called.
- Add missing audit log calls if any are found.

**Acceptance criteria:**

- [ ] Every admin mutation has an audit log entry
- [ ] `npx tsc --noEmit` passes

---

### 23.5 Add `X-Accel-Buffering: no` to streaming response headers

**File:** `src/app/api/openai/route.tsx`

**What to do:**

- Add `X-Accel-Buffering: no` header to streaming SSE responses.
- This prevents reverse proxies (nginx) from buffering streamed chunks.

**Acceptance criteria:**

- [ ] Header present on streaming responses
- [ ] Non-streaming responses unaffected
- [ ] `npx tsc --noEmit` passes

---

> **Completed phases** are archived in [`DONE.md`](DONE.md).
> Phases 1–9, 13–20 are complete. Phase 10–12 superseded (see DONE.md for mapping).

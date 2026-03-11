# Droplet — TODO

> Prioritized, actionable development tasks. Each task max ~30 minutes.
> Governed by **Droplet-PM**. Do not add tasks without PM approval.
> Ref: `SPEC.md` for full specification. `AGENTS.md` for coding rules. `DONE.md` for completed phases.
> Implementation agent: **Codex Agent** (Senior Developer).

---

## Phase 21: Model Policy Overhaul — CURRENT PRIORITY

> Replace flat `resolveModelForPlan(planName, requestType)` with comprehensive `resolveModelPolicy()`.
> Implements the approved Model Policy Matrix from SPEC.md Section 8.
> Ref: TD-AI-10, TD-AI-08, SPEC.md Section 8
> Depends on: Phase 20 (complete)

---

### 21.1 Fix Premium video generation claim in plan inclusions

**File:** `src/constants/plans.tsx`
**Ref:** TD-AI-08

**What to do:**

- The Premium plan inclusions currently display "Video generation - 10/month (Premium)" but no video generation implementation exists.
- Change the label to "Video generation - Coming soon (Premium)" or equivalent.
- Do NOT remove the entry — video generation is planned for Phase 24.
- Do NOT change `PLAN_LIMITS.Premium.video` (keep the limit constant for future use).

**Acceptance criteria:**

- [ ] Premium plan inclusions label shows "Coming soon" instead of implying availability
- [ ] No functional changes to plan limits or model policy
- [ ] `npx tsc --noEmit` passes
- [ ] `npm run build` passes
- [ ] E2E plans tests still pass

---

### 21.2 Implement model policy types and PlanPolicyMatrix constant

**File:** `src/lib/utils/ai-model-policy.ts`
**Ref:** SPEC.md Section 8.2, 8.3, 8.4, 8.8

**What to do:**

- Define the new type system: `PlanTier`, `FeatureType`, `TaskClass`, `AudioMode`, `BudgetState`, `ResolveModelInput`, `ModelPolicyRule`, `FeaturePolicyConfig`, `PlanPolicyMatrix`, `ResolvedModelPolicy`.
- Implement the full `MODEL_POLICY_MATRIX` constant with all plans × features × task classes as defined in SPEC.md Section 8.2.
- Include token limits per task class from SPEC.md Section 8.4.
- Mark audio and video as `hardBlocked` for Lite. Mark video as `hardBlocked` for Pro.
- Keep the old `resolveModelForPlan()` function temporarily as a backward-compatible wrapper (removed in 21.8).
- Export both old and new types.

**Acceptance criteria:**

- [ ] All types from SPEC.md Section 8.8 are defined and exported
- [ ] `MODEL_POLICY_MATRIX` covers all 3 plans × 5 features × applicable task classes
- [ ] Token limits match SPEC.md Section 8.4 exactly
- [ ] Lite audio/video are `hardBlocked: true`
- [ ] Pro video is `hardBlocked: true`
- [ ] Old `resolveModelForPlan()` still works (backward compatible)
- [ ] `npx tsc --noEmit` passes
- [ ] All existing tests pass

---

### 21.3 Implement resolveModelPolicy() resolver

**File:** `src/lib/utils/ai-model-policy.ts`
**Ref:** SPEC.md Section 8.5, 8.6, 8.7

**What to do:**

- Implement `resolveModelPolicy(input: ResolveModelInput): ResolvedModelPolicy` function.
- Resolution rules:
  - Title generation always returns cheapest model (`gpt-4.1-nano`) regardless of plan or context.
  - Hard limit reached blocks request entirely (`hardBlocked: true`).
  - Soft limit, high latency, and retry attempts trigger fallback model (if available).
  - Premium chat returns `gpt-5.4` only when `taskClass === "complex"` AND `explicitPremium === true`; otherwise `gpt-4.1`.
  - Video generation: `sora-2-pro` only for `taskClass === "final"` AND `explicitPremium === true`; otherwise `sora-2`.
  - Audio fallback to TTS model blocked when `audioMode === "audio_in_out"`.
- Track downgrade reasons in `downgradeReasons` array.
- Return `wasDowngraded: true` when fallback was used.

**Acceptance criteria:**

- [ ] Function resolves correct model for all plan × feature × task class combinations
- [ ] Downgrade triggers work: soft limit, high latency, retry
- [ ] Hard limit blocks request
- [ ] Premium chat uses `gpt-5.4` only for complex + explicit premium
- [ ] Video uses `sora-2-pro` only for final + explicit premium
- [ ] TTS fallback blocked for `audio_in_out` mode
- [ ] `npx tsc --noEmit` passes
- [ ] All existing tests pass

---

### 21.4 Update Lite plan limits — block audio generation

**Files:** `src/constants/plans.tsx`, `src/lib/utils/resolve-entitlements.tsx`, `src/lib/utils/check-usage-limit.ts`
**Ref:** SPEC.md Section 4, Section 8.2

**What to do:**

- Update `PLAN_LIMITS.Lite`: change media generations from combined image+audio to image-only (3 images/month). Set audio limit to 0.
- Update Lite plan inclusions in `plans.tsx`: audio generation should show as "Not available" or equivalent.
- Update `resolve-entitlements.tsx`: Lite `supportsAudioGeneration` should return `false`.
- Update `check-usage-limit.ts`: remove Lite combined image+audio logic; Lite now checks image-only.
- Do NOT change Pro or Premium limits.

**Acceptance criteria:**

- [ ] Lite plan has image-only media limit (3/month)
- [ ] Lite plan audio is blocked (not available)
- [ ] Lite plan inclusions display reflects blocked audio
- [ ] `resolve-entitlements.tsx` returns `supportsAudioGeneration: false` for Lite
- [ ] `check-usage-limit.ts` handles Lite image-only correctly
- [ ] Pro and Premium limits unchanged
- [ ] `npx tsc --noEmit` passes
- [ ] All existing tests pass

---

### 21.5 Migrate generateTitle to new model policy

**File:** `src/lib/utils/openai/generateTitle.tsx`
**Ref:** SPEC.md Section 8.2

**What to do:**

- Replace `resolveModelForPlan(planName, "title")` with `resolveModelPolicy({ plan, feature: "title_generation", taskClass: "utility" })`.
- Use `policy.model` for the model name.
- Use `policy.maxInputTokens` and `policy.maxOutputTokens` from the resolver to cap input/output.
- Handle `policy.hardBlocked` (should never happen for titles, but guard defensively).
- Update the returned `AIRequestMetric` to use the resolved model name.

**Acceptance criteria:**

- [ ] Title generation uses `resolveModelPolicy()` instead of old resolver
- [ ] Token limits from policy are enforced
- [ ] Returned metric uses correct resolved model name
- [ ] Title generation uses `gpt-4.1-nano` (fallback `gpt-4o-mini`)
- [ ] `npx tsc --noEmit` passes
- [ ] All existing tests pass

---

### 21.6 Migrate generateImage to new model policy

**File:** `src/lib/utils/openai/generateImage.tsx`
**Ref:** SPEC.md Section 8.2

**What to do:**

- Replace `resolveModelForPlan(planName, "image")` with `resolveModelPolicy({ plan, feature: "image_generation", taskClass: "final" })`.
- Update the OpenAI API call to use the resolved model (`gpt-image-1-mini` for Lite, `gpt-image-1.5` for Pro/Premium).
- Handle `policy.hardBlocked` (return appropriate error).
- Verify the new image model names work with the OpenAI SDK image generation API. Check OpenAI SDK docs and adapt the API call if needed (DALL-E 3 call pattern may differ from GPT Image models).
- Update the returned `AIRequestMetric` to use the resolved model name.

**Acceptance criteria:**

- [ ] Image generation uses `resolveModelPolicy()` instead of old resolver
- [ ] Lite uses `gpt-image-1-mini`, Pro/Premium use `gpt-image-1.5`
- [ ] API call works with new model names
- [ ] Returned metric uses correct model name
- [ ] `npx tsc --noEmit` passes
- [ ] All existing tests pass

---

### 21.7 Migrate generateAudio to new model policy

**File:** `src/lib/utils/openai/generateAudio.tsx`
**Ref:** SPEC.md Section 8.2, 8.6

**What to do:**

- Replace `resolveModelForPlan(planName, "audio")` with `resolveModelPolicy({ plan, feature: "audio_generation", taskClass: "final", audioMode })`.
- Lite audio is `hardBlocked` — return appropriate error.
- Pro uses `gpt-audio-mini` (fallback `gpt-4o-mini-tts` for TTS only).
- Premium uses `gpt-audio-1.5` (fallback `gpt-audio-mini`).
- Handle `policy.hardBlocked` (return appropriate error).
- Pass `audioMode` parameter to resolver. Accept `audioMode` as function parameter.
- Update the returned `AIRequestMetric` to use the resolved model name.

**Acceptance criteria:**

- [ ] Audio generation uses `resolveModelPolicy()` instead of old resolver
- [ ] Lite audio requests are blocked
- [ ] Pro uses `gpt-audio-mini`, Premium uses `gpt-audio-1.5`
- [ ] Audio mode passed to resolver
- [ ] API call works with new model names
- [ ] `npx tsc --noEmit` passes
- [ ] All existing tests pass

---

### 21.8 Migrate generateResponse (chat) to new model policy

**File:** `src/lib/utils/openai/generateResponse.tsx`
**Ref:** SPEC.md Section 8.2, 8.4

**What to do:**

- Replace `resolveModelForPlan(planName, "chat")` with `resolveModelPolicy({ plan, feature: "chat", taskClass, budgetState, retryAttempt, highLatency, explicitPremium })`.
- Accept `taskClass` parameter (default to `"standard"`).
- Use `policy.maxInputTokens` and `policy.maxOutputTokens` for context compaction and output limiting.
- Handle `policy.hardBlocked`.
- For streaming: pass policy context to `generateStreamingResponse()` as well.
- Premium chat: ensure `gpt-5.4` only used when `explicitPremium && taskClass === "complex"`.
- Update the returned `AIRequestMetric`.
- Remove old `resolveModelForPlan()` backward-compatible wrapper (all consumers now migrated).

**Acceptance criteria:**

- [ ] Chat uses `resolveModelPolicy()` with full context
- [ ] Token limits from policy applied to context and output
- [ ] Lite: `gpt-4o-mini`, Pro: `gpt-4.1`, Premium: `gpt-4.1` (default) / `gpt-5.4` (complex+explicit)
- [ ] Old `resolveModelForPlan()` removed
- [ ] Streaming works with new policy
- [ ] `npx tsc --noEmit` passes
- [ ] All existing tests pass

---

### 21.9 Migrate /api/openai route to new model policy

**File:** `src/app/api/openai/route.tsx`
**Ref:** SPEC.md Section 8

**What to do:**

- Update all `resolveModelForPlan()` calls to `resolveModelPolicy()`.
- Pass appropriate context: plan, feature, task class, budget state.
- Handle `policy.hardBlocked` responses: return 403 with appropriate error message.
- Update blocked-event usage emission to use new resolver types.
- Ensure the route never exposes model IDs to the client beyond what the policy returns.
- Remove any remaining imports of old resolver function.

**Acceptance criteria:**

- [ ] Route uses `resolveModelPolicy()` exclusively
- [ ] Hard-blocked features return 403
- [ ] Usage events use new model names
- [ ] No old resolver imports remain
- [ ] `npx tsc --noEmit` passes
- [ ] All existing tests pass

---

### 21.10 Update cost estimation and MODEL_PRICING for new models

**Files:** `src/lib/utils/ai-model-policy.ts`, `src/lib/utils/usage-event-utils.ts`
**Ref:** SPEC.md Section 8.2

**What to do:**

- Update `MODEL_PRICING` constant with pricing entries for all new model IDs: `gpt-4.1-nano`, `gpt-4.1`, `gpt-5.4`, `gpt-image-1-mini`, `gpt-image-1.5`, `gpt-audio-mini`, `gpt-audio-1.5`, `gpt-4o-mini-tts`, `sora-2`, `sora-2-pro`.
- Remove pricing entries for deprecated model IDs: `gpt-5.2-pro`, `gpt-5.4-pro`, `dall-e-3`, `gpt-4o-audio-preview`, `premium-video-placeholder`.
- Keep `gpt-4o-mini` pricing (still used as chat and fallback model).
- Use placeholder pricing where actual OpenAI pricing is not yet confirmed — mark with `// TODO: verify actual pricing` comments.

**Acceptance criteria:**

- [ ] All new model IDs have pricing entries
- [ ] Deprecated model IDs removed
- [ ] `estimateModelCostCents()` works with all new model names
- [ ] Placeholder pricing clearly marked
- [ ] `npx tsc --noEmit` passes
- [ ] All existing tests pass

---

### 21.11 Rewrite ai-model-policy unit tests

**File:** `tests/unit/ai-model-policy.test.ts`
**Ref:** SPEC.md Section 8

**What to do:**

- Rewrite all tests for the new `resolveModelPolicy()` function.
- Test all plan × feature combinations from the Model Policy Matrix (Section 8.2).
- Test downgrade triggers: soft limit, high latency, retry attempt.
- Test hard blocking: Lite audio, Lite video, Pro video, hard limit reached.
- Test Premium chat routing: standard → `gpt-4.1`, complex + explicit → `gpt-5.4`.
- Test Premium video routing: preview → `sora-2`, final + explicit → `sora-2-pro`.
- Test audio mode: TTS fallback blocked for `audio_in_out`.
- Test title generation always returns `gpt-4.1-nano` regardless of plan or context.
- Test `wasDowngraded` and `downgradeReasons` population.

**Acceptance criteria:**

- [ ] All plan × feature combinations tested
- [ ] All downgrade triggers tested
- [ ] All hard-block scenarios tested
- [ ] Premium chat and video routing tested
- [ ] Audio mode differentiation tested
- [ ] Title pinning tested
- [ ] All tests pass
- [ ] `npx tsc --noEmit` passes

---

### 21.12 Update plan constants and marketing copy for new models

**Files:** `src/constants/plans.tsx`, `src/lib/utils/admin-queries.ts`
**Ref:** SPEC.md Section 4, Section 8.2

**What to do:**

- Update plan descriptions in `plans.tsx` to reflect new model names where model names appear in marketing copy. Do NOT put specific model IDs in user-facing plan descriptions — use descriptive labels ("Advanced AI model", "Best AI model").
- Update admin settings snapshot in `admin-queries.ts` to reflect new model structure from `MODEL_POLICY_MATRIX`.
- Remove any remaining references to `gpt-5.2-pro`, `gpt-5.4-pro`, `dall-e-3`, `gpt-4o-audio-preview` in constants.

**Acceptance criteria:**

- [ ] No references to deprecated model names in constants
- [ ] Plan descriptions use descriptive labels (not raw model IDs)
- [ ] Admin settings snapshot reflects new model policy structure
- [ ] `npx tsc --noEmit` passes
- [ ] `npm run build` passes

---

## Phase 22: Prompt System & OpenAI Resilience

> Prompt quality improvement and OpenAI error resilience.
> Ref: TD-AI-09, TD-AI-06
> Depends on: Phase 21 (model policy overhaul must be complete)

---

### 22.1 Implement retry/backoff for OpenAI failures

**Files:** `src/lib/utils/openai/generateResponse.tsx`
**Ref:** TD-AI-06, SPEC.md Section 8.5

**What to do:**

- Add exponential backoff for transient OpenAI errors (429, 500, 502, 503).
- Max 3 retries with increasing delay (e.g., 1s, 2s, 4s).
- On retry, use `resolveModelPolicy()` with `retryAttempt` parameter to trigger model downgrade per SPEC.md Section 8.5.
- Log retries server-side via `process.stderr.write()` (NOT `console.error`).
- Non-retryable errors (400, 401, 403) must fail immediately without retry.

**Acceptance criteria:**

- [ ] Transient errors trigger retry with exponential backoff
- [ ] Max 3 retries
- [ ] Retries use fallback model via `retryAttempt` parameter
- [ ] Non-retryable errors fail immediately
- [ ] Retry logging uses `process.stderr.write()`
- [ ] `npx tsc --noEmit` passes
- [ ] All existing tests pass

---

### 22.2 Create prompt versioning and management system

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

### 23.2 Add unit tests for updated entitlements

**File (new):** `tests/unit/resolve-entitlements.test.ts`

**What to do:**

- Test all plans return all 9 persona IDs.
- Test Lite has audio generation **disabled** (new rule per SPEC.md Section 4).
- Test Pro/Premium have audio generation enabled.
- Test fallback behavior for `resolvePersonaForPlan`.

**Acceptance criteria:**

- [ ] Tests verify all plans allow all 9 personas
- [ ] Tests verify Lite audio generation blocked
- [ ] Tests verify Pro/Premium audio enabled
- [ ] All tests pass

---

### 23.3 Add unit tests for chat-body stop-state rendering

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

### 23.4 Expand streaming test coverage

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

---

### 24.4 Verify all admin server actions emit audit log entries

**Files:** `src/lib/actions/admin.actions.tsx`

**What to do:**

- Audit every exported admin action to confirm `createAdminAuditLogEntry()` is called.
- Add missing audit log calls if any are found.

**Acceptance criteria:**

- [ ] Every admin mutation has an audit log entry
- [ ] `npx tsc --noEmit` passes

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

> **Completed phases** are archived in [`DONE.md`](DONE.md).
> Phases 1–9, 13–20 are complete. Phase 10–12 superseded (see DONE.md for mapping).

# Droplet — TODO

> Prioritized, actionable development tasks. Each task max ~30 minutes.
> Governed by **Droplet-PM**. Do not add tasks without PM approval.
> Ref: `SPEC.md` for full specification. `AGENTS.md` for coding rules. `DONE.md` for completed phases.
> Implementation agent: **Droplet-Engineer** (Senior Developer).
>
> **STATUS: Phases 1–25.7 + 27.1–27.3 + 27.6–27.10 + 28.1 + 28.3-code complete.**
> **PM deep audit #9 (2026-03-16): Four-agent independent audit (PM + Architect + Engineer + code verification).**
> **28.1 VERIFIED COMPLETE. 28.3-code VERIFIED COMPLETE (messages bug fixed). 28.2 NOT COMPLETE (image model IDs unchanged, no live test done).**
> **New issues found: media counter TOCTOU (TD-LIMIT-07), audio tool definition misleading (TD-AI-23), `response_format` compatibility risk (TD-AI-24).**
> **Priority order: 28.2-fix (image model IDs — IMMEDIATE) → 28.3-verify (audio live test) → 28.6 (media counter TOCTOU) → 28.7 (audio tool definition fix) → 27.4 → 27.5 → 29.1 (Zod) → 29.2 (Zustand) → Phase 26.**
> **All Phase 26+ deferred work is ON HOLD until all CRITICAL Phase 28 subtasks are PM-approved complete.**

---

## Phase 28: CRITICAL — Media Generation Fixes & Limit Enforcement

> **Blocking all other work.** Owner-reported and four-agent-verified critical bugs.
> PM audit #9 status: 28.1 DONE (archived in DONE.md). 28.3-code DONE (messages bug fixed, archived in DONE.md). 28.2 NOT DONE — image model IDs still broken. New subtasks added: 28.6 (media TOCTOU), 28.7 (audio tool definition).

---

### 28.2-fix CRITICAL — Fix image generation model IDs (IMMEDIATE)

**Files:** `src/lib/utils/ai-model-policy.ts`, `src/lib/utils/openai/generateImage.tsx`, `tests/unit/ai-model-policy.test.ts`
**Ref:** TD-AI-20, TD-AI-24

**Status: NOT DONE. This is the #1 blocking issue. Image generation is 100% broken for all plans.**

**Root cause (PM-verified):** Image model IDs in the policy matrix are `gpt-image-1-mini` (Lite) and `gpt-image-1.5` (Pro/Premium). These have **never been live-tested** against the OpenAI API. HF-3 (DONE.md) claimed doc-verification but Owner consistently reports "Image generation failed" — the generic error message in `generateResponse.tsx` masks the actual OpenAI API error (HTTP 400 invalid model). The previous Engineer work on 28.2 only updated test expectations to match existing (broken) IDs — it did NOT change the model IDs or run a live API test.

**Additional concern:** `response_format: "b64_json"` in `generateImage.tsx` line 75 may not be compatible with newer `gpt-image-*` models (GPT Image API uses different output parameters than DALL-E). This must be verified alongside model IDs.

**What to do:**

1. Read available MCPs (Context7) for current OpenAI image generation API documentation — model names AND API parameters.
2. **Live-test** `gpt-image-1-mini` against the OpenAI API with `openAiClient.images.generate()`. Record exact response or error.
3. **Live-test** `gpt-image-1.5` against the OpenAI API. Record exact response or error.
4. If any model ID fails, consult OpenAI docs for confirmed-valid equivalents (e.g., `gpt-image-1`, `dall-e-3`).
5. **Verify `response_format: "b64_json"` compatibility** — if the valid model uses a different output format, update `generateImage.tsx` accordingly.
6. Update `MODEL_POLICY_MATRIX` with verified model IDs.
7. Update `MODEL_PRICING` entries if model IDs change.
8. Update `MODEL_CAPABILITIES` entries if model IDs change.
9. Update unit tests for corrected model IDs.
10. **End-to-end verify**: trigger image generation via chat and confirm the full pipeline works (OpenAI → buffer → S3 → URL in response).

**Acceptance criteria:**

- [ ] All image model IDs in `MODEL_POLICY_MATRIX` are **live-tested** (not just doc-checked) — record test results
- [ ] `response_format` parameter is compatible with the chosen model
- [ ] Image generation succeeds end-to-end for Lite plan
- [ ] Image generation succeeds end-to-end for Pro/Premium plans
- [ ] Fallback model IDs are also live-tested
- [ ] `MODEL_PRICING` updated for changed IDs
- [ ] `MODEL_CAPABILITIES` updated for changed IDs
- [ ] Media generation failures still log model ID + HTTP status to stderr
- [ ] Unit tests updated for correct model IDs
- [ ] `npx tsc --noEmit` passes
- [ ] All tests pass

---

### 28.3-verify HIGH — Live-test audio model IDs and verify TTS end-to-end

**Files:** `src/lib/utils/ai-model-policy.ts`, `src/lib/utils/openai/generateAudio.tsx`
**Ref:** TD-AI-21 (remaining: model ID live-test)
**Depends on:** 28.2-fix complete (same verification methodology)

**Status: Code fix DONE (ttsText extraction). Model ID live-testing NOT DONE.**

**Context:** The TTS path currently works because `isTtsOnly` policy forces ALL plans to `gpt-4o-mini-tts` (verified valid). But `gpt-audio-mini` and `gpt-audio-1.5` in the policy matrix are unverified and will break if `audio_in_out` is ever enabled for Pro/Premium.

**What to do:**

1. **Live-test** `gpt-4o-mini-tts` with `openAiClient.audio.speech.create()` — confirm TTS works.
2. **Live-test** `gpt-audio-mini` with `openAiClient.chat.completions.create()` with audio modality — record result.
3. **Live-test** `gpt-audio-1.5` with same approach — record result.
4. If any model ID is invalid, replace with confirmed-valid equivalent.
5. **End-to-end verify**: trigger audio generation via chat and confirm pipeline works (OpenAI → buffer → S3 → URL in response).
6. Update unit tests for any corrected model IDs.

**Acceptance criteria:**

- [ ] `gpt-4o-mini-tts` TTS path works end-to-end (Lite → Pro → Premium)
- [ ] `gpt-audio-mini` and `gpt-audio-1.5` live-tested and recorded
- [ ] Invalid model IDs replaced if found
- [ ] Audio generation works end-to-end via chat interface
- [ ] `npx tsc --noEmit` passes
- [ ] All tests pass

---

### 28.6 HIGH — Fix media generation counter TOCTOU race

**Files:** `src/app/api/openai/route.tsx`
**Ref:** TD-LIMIT-07 (new — Architect audit #9)
**Depends on:** 28.2-fix complete

**Root cause (Architect-identified):** Image/audio generation counters use read-then-write pattern:

1. **Check** (~L684): `checkUsageLimit()` reads `userData.plan.imageGenerations` from user object fetched at request start.
2. **Increment** (~L474): After AI response, `User.findOneAndUpdate({ $inc })` increments counter.

Between steps, concurrent requests can both pass the check and exceed quotas. This violates AGENTS.md: "Limit checks must be atomic — use `findOneAndUpdate` with `$lt` guard."

**What to do:**

1. Replace the separated check-then-increment for media counters with a single atomic `findOneAndUpdate` with `$lt` guard, modeled after `incrementPromptCountIfBelowLimit` and `claimDailyConversationSlot`.
2. Create function `claimMediaGenerationSlot(userId, mediaType, planName)` that atomically checks limit AND increments counter.
3. Call this BEFORE `generateImage`/`generateAudio` in `buildOpenAIResponsePayload`.
4. Remove the post-response `$inc` pattern for media counters.
5. Handle rollback if generation fails after slot claim (decrement counter).
6. Unit tests for atomic boundary, concurrent claim rejection, and rollback.

**Acceptance criteria:**

- [ ] Media limit check and increment are a SINGLE atomic MongoDB operation
- [ ] No TOCTOU gap between check and increment
- [ ] Rollback on generation failure
- [ ] Concurrent requests cannot exceed media quota
- [ ] Unit tests cover atomic boundary and rollback
- [ ] `npx tsc --noEmit` passes
- [ ] All tests pass

---

### 28.7 MEDIUM — Fix audio tool definition content parameter

**Files:** `src/constants/openai.tsx`
**Ref:** TD-AI-23 (new — Architect audit #9)

**Root cause:** The `getGeneratedAudio` tool definition describes `content` as "Description of the audio file to generate." This misleads the AI model into providing a brief description (e.g., "A soothing poem about rain") instead of the actual text to be spoken. The TTS path uses this value as literal speech input — a description produces garbage audio.

**What to do:**

1. Change `content` parameter description to: `"The exact text content to be spoken aloud as audio. Provide the full text, not a description."`
2. Verify that the tool call `strict: true` schema is still valid after the description change.

**Acceptance criteria:**

- [ ] Audio tool definition `content` description clearly instructs model to provide exact text to speak
- [ ] AI model provides actual speech text (not description) when generating audio
- [ ] `npx tsc --noEmit` passes
- [ ] All tests pass

---

## Phase 27: UX & Architecture Completion (remaining)

> 27.1–27.3 + 27.6–27.10 RESOLVED (archived in DONE.md).
> Remaining: 27.4 (admin forms) + 27.5 (settings propagation).
> **ON HOLD until Phase 28 CRITICAL subtasks (28.2-fix, 28.3-verify) are complete.**

---

### 27.4 Admin settings page — replace editors with proper form controls

**Files:** `src/app/(admin)/admin/settings/page.tsx`, potentially new client components
**Ref:** TD-ADMIN-01

**What to do:**

1. Replace the JSON textarea editors with proper form controls:
   - **AI Models**: dropdown selectors for model-per-plan (Lite chat, Pro chat, Premium chat, image, audio)
   - **Pricing**: number input fields for Pro price and Premium price
   - **Limits**: number input fields for each limit (conversations/day, prompts/conversation, image gens, audio gens) per plan
   - **Theme**: radio buttons or toggle for dark/light default mode
2. Keep the same `updateAdminSettingAction` backend — structure the form data to match expected JSON schema.
3. Settings page must read current values from `AppSetting` collection on load (already does via `getAdminSettingsSnapshot()`).

**Acceptance criteria:**

- [ ] No JSON textareas on settings page — proper input fields, selectors, radios
- [ ] Each setting category uses appropriate form control type
- [ ] Form submits to existing `updateAdminSettingAction`
- [ ] Current saved values pre-populate form controls on load
- [ ] Admin audit trail preserved
- [ ] `npx tsc --noEmit` passes
- [ ] All tests pass

---

### 27.5 Admin settings — propagate pricing & limits to plan cards

**Files:** `src/constants/plans.tsx`, `src/lib/utils/resolve-entitlements.tsx`, `src/lib/utils/check-usage-limit.ts`, `src/lib/utils/admin-queries.ts`, plan card components
**Ref:** TD-ADMIN-02
**Depends on:** 27.4 complete

**What to do:**

1. Create a server-side utility (e.g., `getEffectivePlanConfig()`) that reads `AppSetting` values for pricing and limits, falling back to hardcoded `PLAN_LIMITS` defaults when no setting exists.
2. Wire plan card components (`/plans` public page and `/app/plans` authenticated page) to use effective config instead of static constants.
3. Wire entitlement resolver and usage limit checks to use effective config for limit values.
4. Ensure admin changes to pricing/limits take effect on next page load — no restart required.
5. Add cache-control / `revalidatePath` so changes propagate without stale data.

**Acceptance criteria:**

- [ ] Plan cards on `/plans` and `/app/plans` show prices from AppSetting (or defaults)
- [ ] Entitlement resolver uses limits from AppSetting (or defaults)
- [ ] Usage limit checks use limits from AppSetting (or defaults)
- [ ] Admin saves new price → plan cards reflect it on next load
- [ ] Admin saves new limit → limits enforce on next request
- [ ] Fallback to hardcoded defaults when AppSetting is empty
- [ ] `npx tsc --noEmit` passes
- [ ] All tests pass

---

## Phase 29: App-Wide Modernization — ON HOLD

> **ON HOLD until Phase 28 CRITICAL subtasks are complete.**
> Owner-approved modernization items. Dependencies already installed.
> Depends on: Phase 28 complete.

---

### 29.1 Implement Zod schema validation across the app

**Ref:** Owner instruction (2026-03-16)

**What to do:**

1. Read available Zod Skills and MCPs for best practices and updated documentation.
2. Add Zod schemas for all API route request bodies (`/api/openai`, `/api/upload`, `/api/download`, `/api/aws`).
3. Add Zod schemas for server action inputs (user actions, task actions, transaction actions, admin actions).
4. Add Zod schemas for webhook payloads (Clerk, Stripe) as additional validation after signature verification.
5. Replace manual `typeof` / truthiness checks with Zod `.safeParse()` at system boundaries.
6. Use `z.infer<>` for TypeScript type derivation where it reduces duplication.
7. Do NOT add Zod to internal utility functions that receive already-validated data.

**Acceptance criteria:**

- [ ] All API route request bodies validated with Zod schemas
- [ ] All server action inputs validated with Zod schemas
- [ ] Webhook payloads have Zod validation after signature verification
- [ ] `z.infer<>` used where it reduces type duplication
- [ ] No Zod on internal utility functions (only at system boundaries)
- [ ] `npx tsc --noEmit` passes
- [ ] All tests pass

---

### 29.2 Implement Zustand for client-side state management

**Ref:** Owner instruction (2026-03-16)

**What to do:**

1. Read available Zustand Skills and Context7 MCP for documentation and best practices.
2. Create Zustand stores for: chat state (current conversation, messages, loading), UI state (sidebar, theme), user preferences.
3. Replace prop-drilling and scattered `useState` with Zustand stores where appropriate.
4. Keep Server Component data flow unchanged — Zustand is for CLIENT components only.
5. Do NOT replace simple local state (single-component `useState`) with Zustand — only shared state.

**Acceptance criteria:**

- [ ] Zustand stores created for shared client state (chat, UI, preferences)
- [ ] Prop-drilling reduced in chat components
- [ ] Server Component data flow unchanged
- [ ] Simple local state left as `useState`
- [ ] `npx tsc --noEmit` passes
- [ ] All tests pass

---

## Phase 26: Deferred Features — ON HOLD

> **ON HOLD until Phase 28 + Phase 27 remaining (27.4–27.5) + Phase 29 are PM-approved complete.**
> Depends on: Phase 28 + Phase 27 + Phase 29 complete.

---

### 26.1 Persona-aware media generation prompts

**Ref:** TD-AI-09 (remaining gap)

### 26.2 Implement Stripe subscription mode (auto-renewal)

**Ref:** TD-PLAN-01

### 26.3 Add video generation support for Premium

**Ref:** TD-AI-08

---

> **Completed phases** are archived in [`DONE.md`](DONE.md).
> HF-1 through HF-9.2 complete. Phases 1–25.7 + 27.1–27.3 + 27.6–27.10 + 28.1 + 28.3-code complete.
> Phase 10–12 superseded (see DONE.md for mapping).

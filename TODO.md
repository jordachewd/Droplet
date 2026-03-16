# Droplet — TODO

> Prioritized, actionable development tasks. Each task max ~30 minutes.
> Governed by **Droplet-PM**. Do not add tasks without PM approval.
> Ref: `SPEC.md` for full specification. `AGENTS.md` for coding rules. `DONE.md` for completed phases.
> Implementation agent: **Droplet-Engineer** (Senior Developer).
>
> **STATUS: Phases 1–25.7 + 27.1–27.3 + 27.6–27.10 complete.**
> **PM deep audit #8 (2026-03-16): Three-agent independent audit. CRITICAL bugs found: audio generation fully broken (malformed messages + hardcoded audioMode), image generation failing (model IDs need live verification), daily limit TOCTOU race allows bypass under concurrent requests.**
> **Priority order: 28.2 (image model IDs) → 28.3 (audio generation fix — expanded) → 28.1 (daily limit atomic pattern — re-scoped) → 27.4 (admin forms) → 27.5 (settings propagation) → 28.4 (Zod) → 28.5 (Zustand) → Phase 26.**
> **All Phase 26+ deferred work is ON HOLD until Phase 28 (all CRITICAL subtasks 28.1–28.3) is PM-approved complete.**

---

## Phase 28: CRITICAL — Media Generation Fixes & Limit Enforcement

> **Blocking all other work.** Owner-reported and three-agent-verified critical bugs.
> Depends on: Phase 27.7–27.10 complete (verified).
> PM audit #8 re-scoped: 28.1 re-written (durable counter already exists, TOCTOU race is the real gap). 28.3 expanded (messages parameter bug added). Priority reordered: 28.2 → 28.3 → 28.1 (media is more impactful than narrow race condition).

---

### 28.2 CRITICAL — Verify and fix image generation model IDs

**Files:** `src/lib/utils/ai-model-policy.ts`, `src/lib/utils/openai/generateImage.tsx`, `tests/unit/ai-model-policy.test.ts`
**Ref:** TD-AI-20

**Root cause:** Image model IDs in the policy matrix (`gpt-image-1-mini`, `gpt-image-1.5`) may not be valid OpenAI API model identifiers. HF-3 (DONE.md) claims these were verified against OpenAI docs, but owner still reports "Image generation failed" errors. The try-catch in `generateResponse.tsx` returns a generic error — the actual OpenAI error (e.g., 400 invalid model) is only in stderr. **Only a live API test will resolve this contradiction.**

**What to do:**

1. Read available MCPs (Context7) for current OpenAI image model documentation.
2. **Live-test** `gpt-image-1-mini` against the OpenAI API with a simple `images.generate` call.
3. **Live-test** `gpt-image-1.5` against the OpenAI API with a simple `images.generate` call.
4. If any model ID fails, replace it with a confirmed-valid equivalent from OpenAI docs (`gpt-image-1`, `dall-e-3`, etc.).
5. Update the policy matrix with verified model IDs.
6. Add structured error logging on media generation failure — log the model ID and HTTP status code alongside the generic user message.
7. Update unit tests for any corrected model IDs.
8. Verify image generation works end-to-end after the fix.

**Acceptance criteria:**

- [ ] All image model IDs in `MODEL_POLICY_MATRIX` are **live-tested** against the OpenAI API (not just doc-checked)
- [ ] Image generation succeeds for Lite plan
- [ ] Image generation succeeds for Pro/Premium plans
- [ ] Policy matrix fallback model IDs are also live-tested
- [ ] Media generation failures log model ID + HTTP status to stderr
- [ ] Unit tests updated for correct model IDs
- [ ] `npx tsc --noEmit` passes
- [ ] All tests pass

---

### 28.3 CRITICAL — Fix audio generation (messages bug + audioMode + model IDs)

**Files:** `src/lib/utils/openai/generateResponse.tsx`, `src/lib/utils/openai/generateAudio.tsx`, `src/lib/utils/ai-model-policy.ts`, `src/lib/utils/openai/message-policy.ts`, `tests/unit/ai-model-policy.test.ts`, `tests/unit/generate-response.test.ts`
**Ref:** TD-AI-21, TD-AI-22

**Root cause:** Three independent bugs, each of which causes audio generation to fail:

1. **Messages parameter bug (TD-AI-22):** The tool call handler in `generateResponse.tsx` passes `parsedArgs` (the JSON-parsed tool call function arguments from the model) as the `messages` parameter to `generateAudio()`. These are NOT proper `Message[]` objects — they are whatever JSON the model decided to pass (e.g., `{ role: "...", content: "..." }`). The `buildTextToSpeechInput` function expects `Message[]` format. This causes TTS to fail or produce garbage input. For `audio_in_out`, malformed messages are passed directly to `chat.completions.create()`, which will fail.
2. **audioMode hardcoded (TD-AI-21):** The tool call handler always passes `audioMode: "tts"` regardless of user plan. Pro/Premium users who should have access to `audio_in_out` are forced into TTS-only mode.
3. **Audio model IDs (TD-AI-21):** `gpt-audio-mini` and `gpt-audio-1.5` may not be valid. Same HF-3 contradiction as image model IDs.

**What to do:**

1. **Fix the messages parameter:** Extract the TTS text from the tool call arguments (`parsedArgs.content` or similar) and pass it as a dedicated text input. For TTS mode, the `generateAudio` function needs the text to speak, NOT the conversation history. For `audio_in_out` mode, pass the actual conversation messages from the route context (already available in the route handler scope), NOT the tool call arguments.
2. **Fix audioMode determination:** For Lite, always `"tts"` (isTtsOnly enforced by policy). For Pro/Premium, default to `"tts"` for now (since tool calls request TTS-style generation). `audio_in_out` can be implemented as a future enhancement when the frontend supports audio input. The key fix: ensure that when `audioMode === "tts"`, the `audio.speech.create()` path is ALWAYS used, regardless of which model is resolved.
3. **Live-test audio model IDs** against the OpenAI API. If invalid, replace with confirmed-valid equivalents from OpenAI docs.
4. Add structured error logging for audio generation failures (model ID + HTTP status).
5. Update unit tests for all three fixes.

**Acceptance criteria:**

- [ ] Audio tool call handler passes correct text input (from tool args) for TTS, not raw parsedArgs as messages
- [ ] TTS requests use `audio.speech.create()` for ALL plans (Lite, Pro, Premium)
- [ ] `audio_in_out` mode correctly blocked for Lite (isTtsOnly enforcement preserved)
- [ ] All audio model IDs are **live-tested** against the OpenAI API
- [ ] Audio generation succeeds for Lite (TTS path)
- [ ] Audio generation succeeds for Pro/Premium (TTS path)
- [ ] Audio generation failures log model ID + HTTP status to stderr
- [ ] Unit tests cover: TTS path with correct text extraction, audioMode routing, model ID validity
- [ ] `npx tsc --noEmit` passes
- [ ] All tests pass

---

### 28.1 CRITICAL — Fix daily conversation limit TOCTOU race + midnight race (re-scoped)

**Files:** `src/lib/actions/task.actions.tsx`, `src/lib/utils/check-daily-conversations.ts`, `src/app/api/openai/route.tsx`, `tests/unit/check-daily-conversations.test.ts`, `tests/unit/task-actions.test.ts`, `tests/unit/openai-route.test.ts`
**Ref:** TD-LIMIT-05 (TOCTOU race), TD-LIMIT-06 (midnight race)

**IMPORTANT — What is already done (do NOT re-implement):**

- Durable counter (`User.dailyConversationsStarted` + `User.dailyConversationWindowStart`) — **already implemented** (Phase 27.1)
- `checkDailyConversationLimit` reads from durable counter, NOT `Task.countDocuments` — **already implemented**
- Check-before-create (daily check at route L869, task create at L917) — **already implemented**
- TD-LIMIT-03 and TD-LIMIT-04 are **RESOLVED in code** — do not re-implement them

**Root cause of remaining bugs:**

1. **TOCTOU race (TD-LIMIT-05):** `checkDailyConversationLimit` (read) and `incrementDailyConversationCounter` (write) are separate operations separated by seconds (title generation via OpenAI API). Two concurrent requests can both read counter=4/5, both see `allowed: true`, both create tasks, both increment to 6. **Fix:** Replace separated check-then-increment with a single atomic claim-then-create, modeled after the successful `incrementPromptCountIfBelowLimit` pattern.
2. **Midnight race (TD-LIMIT-06):** At UTC midnight, two concurrent requests see yesterday's window, both reach Phase 2 (reset), both `$set dailyConversationsStarted: 1`. One increment is lost. **Fix:** Handle window reset within the same atomic operation.
3. **Rollback delete has no error handling (Copilot review):** If `incrementDailyConversationCounter` fails and the compensating `Task.findOneAndDelete` also fails, the error is masked and an orphan task persists. **Fix:** Wrap rollback delete in its own try/catch with stderr logging.

**What to do:**

1. Create new function `claimDailyConversationSlot(userId, planName)` that atomically checks the limit AND increments the counter in a single `findOneAndUpdate` operation:
   ```
   User.findOneAndUpdate(
     { clerkId: userId, dailyConversationWindowStart: { $gte: startOfDay }, dailyConversationsStarted: { $lt: limit } },
     { $inc: { dailyConversationsStarted: 1 } },
     { returnDocument: "after" }
   )
   ```
   If returns null AND the window is stale (yesterday), do an atomic reset-and-claim:
   ```
   User.findOneAndUpdate(
     { clerkId: userId, dailyConversationWindowStart: { $lt: startOfDay } },
     { $set: { dailyConversationsStarted: 1, dailyConversationWindowStart: startOfDay } },
     { returnDocument: "after" }
   )
   ```
   If both return null, limit is reached.
2. Replace the separated `checkDailyConversationLimit` + `incrementDailyConversationCounter` calls in the route with the single `claimDailyConversationSlot` call BEFORE task creation.
3. Remove `incrementDailyConversationCounter` from `createTask` — the slot is already claimed before create.
4. Wrap the rollback `Task.findOneAndDelete` in its own try/catch with `process.stderr.write` logging.
5. Update unit tests for: atomic claim at exact boundary, midnight reset under concurrent requests, rollback delete failure logging, unlimited plan bypass.

**Acceptance criteria:**

- [ ] Daily limit check and increment are a SINGLE atomic MongoDB operation (no TOCTOU gap)
- [ ] Midnight window reset is handled atomically (no lost increments at day boundary)
- [ ] Rollback delete wrapped in try/catch with stderr logging
- [ ] Lite users can create exactly 5 conversations per day under concurrent requests
- [ ] Counter resets correctly at UTC midnight
- [ ] `incrementDailyConversationCounter` removed from `createTask` (slot claimed before create)
- [ ] Unit tests cover: atomic boundary, concurrent claim rejection, midnight reset, rollback failure logging, unlimited bypass
- [ ] `npx tsc --noEmit` passes
- [ ] All tests pass

---

## Phase 27: UX & Architecture Completion (remaining)

> 27.1–27.3 + 27.6–27.10 RESOLVED (archived in DONE.md).
> Remaining: 27.4 (admin forms) + 27.5 (settings propagation).
> **ON HOLD until Phase 28 (CRITICAL) is complete.**

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
**Depends on:** 27.4 complete (settings must be usable before they're consumed)

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

## Phase 26: Deferred Features — ON HOLD

> **ON HOLD until Phase 28 (CRITICAL) + Phase 27 remaining (27.4–27.5) are PM-approved complete.**
> Lower priority items deferred from v1 core.
> Depends on: Phase 28 + Phase 27 complete.

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
- Use `resolveModelPolicy({ plan: "premium", feature: "video_generation", taskClass })` for model selection.
- Wire into `/api/openai` tool calling flow.
- Remove "Coming soon" label from Premium plan inclusions.
- Video stored in S3 with URL reference in messages.
- Verify video model IDs are real OpenAI API identifiers before implementation.

**Acceptance criteria:**

- [ ] Video generation works for Premium users
- [ ] Other plans correctly blocked from video
- [ ] Usage event logged for video requests
- [ ] Video stored in S3, URL in message
- [ ] Plan inclusions show video as available (remove "Coming soon")
- [ ] `npx tsc --noEmit` passes
- [ ] All tests pass

---

## Phase 29: App-Wide Modernization — ON HOLD

> **ON HOLD until Phase 28 (CRITICAL) is complete.**
> Owner-approved modernization items. Dependencies already installed.
> Depends on: Phase 28 complete.

---

### 28.4 Implement Zod schema validation across the app

**Ref:** Owner instruction (2026-03-15)

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

### 28.5 Implement Zustand for client-side state management

**Ref:** Owner instruction (2026-03-15)

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

> **Completed phases** are archived in [`DONE.md`](DONE.md).
> HF-1 through HF-9.2 complete. Phases 1–25.7 + 27.1–27.3 + 27.6–27.10 complete.
> Phase 10–12 superseded (see DONE.md for mapping).

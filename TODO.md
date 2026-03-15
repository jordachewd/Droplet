# Droplet — TODO

> Prioritized, actionable development tasks. Each task max ~30 minutes.
> Governed by **Droplet-PM**. Do not add tasks without PM approval.
> Ref: `SPEC.md` for full specification. `AGENTS.md` for coding rules. `DONE.md` for completed phases.
> Implementation agent: **Droplet-Engineer** (Senior Developer).
>
> **STATUS: Phases 1–25.7 + 27.1–27.3 + 27.6–27.10 complete.**
> **PM deep audit #7 (2026-03-15): Three-agent independent audit. CRITICAL bugs found: daily limit bypass via deletion + off-by-one, media generation model ID failures. Phases 27.7–27.10 verified complete and archived.**
> **Priority order: 28.1 (durable daily counter) → 28.2 (media model IDs) → 28.3 (audio mode routing) → 27.4 (admin forms) → 27.5 (settings propagation) → 28.4 (Zod) → 28.5 (Zustand) → Phase 26.**
> **All Phase 26+ deferred work is ON HOLD until Phase 28 (all CRITICAL subtasks 28.1–28.3) is PM-approved complete.**

---

## Phase 28: CRITICAL — Limit Enforcement & Media Generation Fixes

> **Blocking all other work.** Owner-reported and three-agent-verified critical bugs.
> Depends on: Phase 27.7–27.10 complete (verified).

---

### 28.1 CRITICAL — Implement durable daily conversation counter (fix limit bypass + off-by-one)

**Files:** `src/lib/utils/check-daily-conversations.ts`, `src/app/api/openai/route.tsx`, `src/lib/database/models/user.model.tsx` (or new DailyUsage model), `src/lib/actions/task.actions.tsx`, `tests/unit/check-daily-conversations.test.ts`, `tests/unit/openai-route.test.ts`
**Ref:** TD-LIMIT-03, TD-LIMIT-04

**Root cause:** `checkDailyConversationLimit` uses `Task.countDocuments({ userId, createdAt: { $gte: startOfDay } })` — a live count of existing tasks. When users delete conversations, the count drops, allowing more conversations beyond the limit. Additionally, the task is created BEFORE the daily limit check, so the newly created task is included in the count, creating an off-by-one (effective limit = N-1).

**What to do:**

1. Add a `dailyConversationsStarted` counter field to the User model (or create a lightweight `DailyUsage` collection keyed by `userId + date`). This counter is incremented on conversation creation and **never decremented** by task deletion.
2. Rewrite `checkDailyConversationLimit` to read the durable counter instead of `Task.countDocuments`.
3. Move the daily limit check BEFORE task creation in the `/api/openai` route. If limit is hit, return the stop response WITHOUT creating a task first.
4. Remove the compensating `deleteTask` pattern (no longer needed — check happens before create).
5. Update unit tests to cover: durable counter incremented on creation, counter not decremented on deletion, correct limit boundary (exactly 5 for Lite), off-by-one eliminated.

**Acceptance criteria:**

- [ ] Daily conversation limit uses a durable counter, not `Task.countDocuments`
- [ ] Deleting conversations does NOT free up daily quota
- [ ] Daily limit check happens BEFORE task creation (no off-by-one)
- [ ] Compensating delete pattern removed
- [ ] Lite users can create exactly 5 conversations per day (not 4)
- [ ] Counter resets at UTC midnight (or 24h rolling window — match existing behavior)
- [ ] Unit tests cover: boundary at exact limit, deletion does not affect count, unlimited plan bypass
- [ ] `npx tsc --noEmit` passes
- [ ] All tests pass

---

### 28.2 CRITICAL — Verify and fix image generation model IDs

**Files:** `src/lib/utils/ai-model-policy.ts`, `src/lib/utils/openai/generateImage.tsx`, `tests/unit/ai-model-policy.test.ts`
**Ref:** TD-AI-20

**Root cause:** Image model IDs in the policy matrix (`gpt-image-1-mini`, `gpt-image-1.5`) may not be valid OpenAI API model identifiers. If invalid, every image generation call returns a 400 error, which is caught and shown as "Image generation failed" — matching the owner's report.

**What to do:**

1. Check Zod Skills or Context7 MCP for current OpenAI image model documentation.
2. Test each image model ID against the actual OpenAI API (live verification call).
3. If any model ID is invalid, replace it with the confirmed-valid equivalent (e.g., `dall-e-3`, `gpt-image-1`, or whatever the API currently supports).
4. Update the policy matrix with verified model IDs.
5. Update unit tests for the corrected model IDs.
6. Verify image generation works end-to-end after the fix.

**Acceptance criteria:**

- [ ] All image model IDs in `MODEL_POLICY_MATRIX` are verified-valid OpenAI API model identifiers
- [ ] Image generation succeeds for Lite plan
- [ ] Image generation succeeds for Pro/Premium plans
- [ ] Policy matrix fallback model IDs are also verified
- [ ] Unit tests updated for correct model IDs
- [ ] `npx tsc --noEmit` passes
- [ ] All tests pass

---

### 28.3 CRITICAL — Verify and fix audio generation model IDs + TTS mode routing

**Files:** `src/lib/utils/ai-model-policy.ts`, `src/lib/utils/openai/generateAudio.tsx`, `src/lib/utils/openai/generateResponse.tsx`, `tests/unit/ai-model-policy.test.ts`
**Ref:** TD-AI-21

**Root cause:** Two issues:

1. Audio model IDs (`gpt-audio-mini`, `gpt-audio-1.5`) may not be valid. If invalid, Pro/Premium audio fails.
2. The tool call handler in `generateResponse.tsx` always passes `audioMode: "tts"`, but for Pro/Premium the `isTtsOnly` flag resolves to `false` (because the model isn't in the TTS-only list), routing TTS requests through `chat.completions.create()` with `modalities: ["text", "audio"]` instead of `audio.speech.create()`. This may fail if the model doesn't support that modality.

**What to do:**

1. Verify all audio model IDs against the OpenAI API (live verification).
2. Fix any invalid model IDs with confirmed-valid equivalents.
3. Fix the TTS routing: if the tool call requests TTS mode, the `generateAudio` function should use the `audio.speech.create()` path regardless of which model is used (when `audioMode === "tts"`). The `isTtsOnly` policy flag should control whether `audio_in_out` is ALLOWED, not override the requested mode.
4. Update unit tests.

**Acceptance criteria:**

- [ ] All audio model IDs are verified-valid OpenAI API model identifiers
- [ ] TTS requests use `audio.speech.create()` for ALL plans (Lite, Pro, Premium)
- [ ] `audio_in_out` mode correctly blocked for Lite (isTtsOnly enforcement preserved)
- [ ] Audio generation succeeds for Lite (TTS path)
- [ ] Audio generation succeeds for Pro/Premium (TTS path)
- [ ] Unit tests updated for correct model IDs and TTS routing
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

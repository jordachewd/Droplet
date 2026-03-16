# Droplet — TODO

> Prioritized, actionable development tasks. Each task max ~30 minutes.
> Governed by **Droplet-PM**. Do not add tasks without PM approval.
> Ref: `SPEC.md` for full specification. `AGENTS.md` for coding rules. `DONE.md` for completed phases.
> Implementation agent: **Droplet-Engineer** (Senior Developer).
>
> **STATUS: Phases 1–25.7 + 27.1–27.3 + 27.6–27.10 + 28.1 + 28.2-fix + 28.3-code complete.**
> **PM deep audit #10 (2026-03-16): Three-agent independent audit (PM + Architect + Engineer).**
> **28.2-fix VERIFIED COMPLETE (image generation fixed). 28.1 VERIFIED COMPLETE. 28.3-code VERIFIED COMPLETE.**
> **CRITICAL POLICY CHANGE: Per-plan persona gating approved (replaces old Rule #3). New Interviewer persona approved.**
> **Priority order: 28.4 (UI copy fix — IMMEDIATE) → 28.7 (audio tool fix — IMMEDIATE) → 28.3-verify (audio live test) → 28.6 (media TOCTOU) → 30.1-30.5 (persona policy implementation) → 27.4 → 27.5 → 29.1 (Zod) → 29.2 (Zustand) → Phase 26.**
> **All Phase 26+ deferred work is ON HOLD until Phase 28 + Phase 30 are PM-approved complete.**

---

## Phase 28: CRITICAL — Media Generation Fixes & Limit Enforcement (remaining)

> PM audit #10 status: 28.1 DONE, 28.2-fix DONE, 28.3-code DONE (all archived in DONE.md).
> Remaining: 28.4 (UI copy fix), 28.7 (audio tool fix), 28.3-verify (audio live test), 28.6 (media TOCTOU).

---

### 28.4 CRITICAL — Fix plan card UI copy ("messages" → "prompts")

**Files:** `src/constants/plans.tsx`, `tests/unit/plans.test.ts`
**Ref:** PM audit #10 — root cause of owner's limit bypass report

**Status: NOT DONE. This is the #1 immediate task.**

**Root cause (PM + Engineer + Architect independently confirmed):** Plan card labels say "10 messages per conversation" but the actual limit is 10 **user prompts** (not total messages). A 10-prompt conversation displays ~20 visible messages (10 user + 10 AI response). The owner counted total visible messages and concluded limits are broken. Backend enforcement is architecturally correct (atomic `$lt` guards) — the issue is misleading UI copy.

**What to do:**

1. In `plans.tsx`, change Lite inclusions label from `"10 messages per conversation"` to `"10 prompts per conversation"`.
2. In `plans.tsx`, change Pro inclusions label from `"100 messages per conversation"` to `"100 prompts per conversation"`.
3. In `plans.tsx`, change Premium inclusions label from `"Unlimited messages"` to `"Unlimited prompts"` (if applicable).
4. Update corresponding test assertions in `plans.test.ts`.
5. Verify all plan cards (`/plans` and `/app/plans`) render correct labels.

**Acceptance criteria:**

- [ ] Plan card labels say "prompts" not "messages" for conversation limits
- [ ] Test assertions updated
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

## Phase 30: Persona Policy Implementation — CRITICAL

> Owner-mandated policy change: per-plan persona gating + new Interviewer persona.
> Depends on: Phase 28 remaining subtasks complete (28.4, 28.7 minimum).
> **Blocking Phase 26+ work.** Personas are the core product to sell.

---

### 30.1 HIGH — Add Interviewer persona definition

**Files:** `src/constants/assistant-personas.tsx`, `src/constants/persona-prompts.ts`, `src/types/PersonaId.d.tsx` (or equivalent type file)
**Ref:** Owner instruction (2026-03-16), SPEC.md Section 3

**What to do:**

1. Add `interviewer` to the `PersonaId` type union.
2. Add Interviewer persona object to `PERSONAS` array in `assistant-personas.tsx`:
   - `id: "interviewer"`, `label: "Interviewer"`, `category: "Career"`, `tagline`, `description`, `icon`, 6 `starterPrompts`, `supportsImage: true`, `supportsAudio: true`.
3. Add Interviewer system prompt in `persona-prompts.ts` — interview readiness simulator: realistic interview conversations, structured feedback, role/company/level tailoring.
4. Persona must follow all persona behavioral requirements (pragmatic, direct, honest, practical — see SPEC.md).
5. Update `PERSONA_MAP` if not auto-derived.
6. Update all tests that assert persona count (currently 9 → 10).

**Acceptance criteria:**

- [ ] Interviewer persona exists with `id: "interviewer"`
- [ ] 6 starter prompts covering different interview types (technical, behavioral, promotion, etc.)
- [ ] system prompt instructs realistic interview simulation with structured feedback
- [ ] All persona-count assertions updated from 9 to 10
- [ ] `npx tsc --noEmit` passes
- [ ] All tests pass

---

### 30.2 HIGH — Implement per-plan persona gating in entitlements

**Files:** `src/lib/utils/resolve-entitlements.tsx`, `src/constants/plans.tsx`, `src/constants/assistant-personas.tsx`
**Ref:** AGENTS.md Rule #3 (updated), SPEC.md Section 3
**Depends on:** 30.1 complete

**What to do:**

1. Define default persona access per plan as a constant:
   - `Lite`: `["strategist", "developer", "best-friend"]`
   - `Pro`: Lite personas + `["teacher", "wellness", "boyfriend", "girlfriend"]`
   - `Premium`: all 10 personas
2. Update `resolveEntitlements()` to filter `allowedPersonaIds` by plan.
3. Update plan card inclusions: Lite says "3 personas", Pro says "7 personas", Premium says "All 10 personas" (with list).
4. Update `/api/openai` route to reject requests with personas not in the user's plan entitlement.
5. Update unit tests for persona gating per plan.

**Acceptance criteria:**

- [ ] `resolveEntitlements("Lite")` returns only 3 persona IDs
- [ ] `resolveEntitlements("Pro")` returns 7 persona IDs
- [ ] `resolveEntitlements("Premium")` returns all 10
- [ ] API route rejects persona not in user's plan
- [ ] Plan cards show correct persona count per plan
- [ ] Unit tests cover all plan × persona combinations
- [ ] `npx tsc --noEmit` passes
- [ ] All tests pass

---

### 30.3 HIGH — Update persona picker UI for plan-gated display

**Files:** `src/components/chat/chat-persona-picker.tsx`, related chat components
**Ref:** SPEC.md Section 3
**Depends on:** 30.2 complete

**What to do:**

1. Persona picker must only show personas available for the user's current plan.
2. Optionally show locked personas with upgrade CTA (visual only, backend enforces).
3. Persona grid must display **two persona cards per row** (owner requirement).
4. Verify persona picker works on `/app/new`, `/app/personas`, and `/personas` (public).

**Acceptance criteria:**

- [ ] Persona picker filters by user's plan entitlement
- [ ] Grid shows 2 persona cards per row on all screen sizes
- [ ] Locked personas show upgrade prompt (or are hidden)
- [ ] Works on all persona grid pages
- [ ] `npx tsc --noEmit` passes
- [ ] All tests pass

---

### 30.4 MEDIUM — Add admin persona access control per plan

**Files:** `src/app/(admin)/admin/settings/page.tsx`, `src/lib/utils/resolve-entitlements.tsx`, `src/lib/database/models/app-setting.model.tsx`
**Ref:** Owner instruction: admin must be able to enable/disable persona access per plan
**Depends on:** 30.2 + 27.4 complete

**What to do:**

1. Add admin settings section for "Persona Access" with checkboxes per plan per persona.
2. Save as AppSetting (key: `persona_access_lite`, `persona_access_pro`, `persona_access_premium`).
3. `resolveEntitlements()` reads AppSetting first, falls back to hardcoded defaults.
4. Admin audit trail for persona access changes.

**Acceptance criteria:**

- [ ] Admin can toggle persona access per plan in settings
- [ ] Changes take effect on next entitlement check
- [ ] Falls back to defaults when no AppSetting exists
- [ ] Audit log entry created
- [ ] `npx tsc --noEmit` passes
- [ ] All tests pass

---

### 30.5 LOW — Generate persona hero images

**Ref:** Owner instruction: each persona must have a representative character/image as hero
**Depends on:** 30.1 complete (Interviewer added)

**What to do:**

1. Generate a representative character image for each of the 10 personas.
2. Store images in `public/personas/` as optimized WebP/PNG.
3. Add `heroImage` field to persona definition in `assistant-personas.tsx`.
4. Display hero images on persona cards, persona picker, and `/personas` public page.

**Acceptance criteria:**

- [ ] 10 persona hero images exist in `public/personas/`
- [ ] Each persona definition has `heroImage` path
- [ ] Hero images visible on persona cards and public personas page
- [ ] Images are optimized (< 200KB each)
- [ ] `npx tsc --noEmit` passes
- [ ] All tests pass

---

## Phase 27: UX & Architecture Completion (remaining)

> 27.1–27.3 + 27.6–27.10 RESOLVED (archived in DONE.md).
> Remaining: 27.4 (admin forms) + 27.5 (settings propagation).
> **ON HOLD until Phase 28 remaining + Phase 30.1–30.3 are PM-approved complete.**

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

> **ON HOLD until Phase 28 + Phase 30 + Phase 27 remaining (27.4–27.5) + Phase 29 are PM-approved complete.**
> Depends on: Phase 28 + Phase 30 + Phase 27 + Phase 29 complete.

---

### 26.1 Persona-aware media generation prompts

**Ref:** TD-AI-09 (remaining gap)

### 26.2 Implement Stripe subscription mode (auto-renewal)

**Ref:** TD-PLAN-01

### 26.3 Add video generation support for Premium

**Ref:** TD-AI-08

---

> **Completed phases** are archived in [`DONE.md`](DONE.md).
> HF-1 through HF-9.2 complete. Phases 1–25.7 + 27.1–27.3 + 27.6–27.10 + 28.1 + 28.2-fix + 28.3-code complete.
> Phase 10–12 superseded (see DONE.md for mapping).

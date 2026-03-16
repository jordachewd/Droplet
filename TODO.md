# Droplet — TODO

> Prioritized, actionable development tasks. Each task max ~30 minutes.
> Governed by **Droplet-PM**. Do not add tasks without PM approval.
> Ref: `SPEC.md` for full specification. `AGENTS.md` for coding rules. `DONE.md` for completed phases.
> Implementation agent: **Droplet-Engineer** (Senior Developer).
>
> **STATUS: Phases 1–25.7 + 27.1–27.4 + 27.6–27.10 + 28.1 + 28.2-fix + 28.3-code + 30.1 + 30.2 + 30.3 complete.**
> **PM deep audit #11 (2026-03-16): Owner instructions received. New phases added.**
> **30.1 DONE (Interviewer). 30.2 DONE (persona gating). 30.3 DONE (persona picker UI). 27.4 DONE (admin forms).**
> **CRITICAL OWNER INSTRUCTIONS: Library media tabs, ChatHeader on all pages, sidebar cleanup, persona trial access model.**
> **Priority order: 28.4 → 28.7 → 28.3-verify → 28.6 → 30.5 → 31.1–31.4 (layout/nav) → 32.1–32.5 (Library) → 33.1–33.8 (persona trial access) → 30.4 → 27.5 → 34.x (video gen) → 29.1 → 29.2 → Phase 26.**
> **All Phase 26+ deferred work is ON HOLD until Phase 28 remaining + Phases 31–33 are PM-approved complete.**

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

## Phase 30: Persona Policy Implementation (remaining)

> Owner-mandated policy change: per-plan persona gating + new Interviewer persona.
> **30.1 DONE** (Interviewer persona added). **30.2 DONE** (per-plan persona gating). **30.3 DONE** (persona picker UI).
> Remaining: 30.4 (admin persona controls), 30.5 (persona hero images).
> Depends on: Phase 28 remaining subtasks complete (28.4, 28.7 minimum).

---

### 30.4 MEDIUM — Add admin persona access control per plan

**Files:** `src/app/(admin)/admin/settings/page.tsx`, `src/lib/utils/resolve-entitlements.tsx`, `src/lib/database/models/app-setting.model.tsx`
**Ref:** Owner instruction: admin must be able to enable/disable persona access per plan
**Depends on:** Phase 33 complete (trial access system must be stable first)

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

## Phase 27: UX & Architecture Completion (remaining)

> 27.1–27.4 + 27.6–27.10 RESOLVED (archived in DONE.md).
> Remaining: 27.5 (settings propagation).
> **ON HOLD until Phase 28 remaining + Phases 31–33 are PM-approved complete.**

---

### 27.5 Admin settings — propagate pricing & limits to plan cards

**Files:** `src/constants/plans.tsx`, `src/lib/utils/resolve-entitlements.tsx`, `src/lib/utils/check-usage-limit.ts`, `src/lib/utils/admin-queries.ts`, plan card components
**Ref:** TD-ADMIN-02
**Depends on:** 27.4 complete (DONE)

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

## Phase 31: Layout & Navigation Updates — HIGH

> Owner-mandated (2026-03-16): ChatHeader on all /app pages, sidebar cleanup, toggle relocation.
> Depends on: Phase 28 remaining complete.
> Fast-win, high owner visibility.

---

### 31.1 HIGH — Move ChatHeader to layout level for all /app routes

**Files:** `src/app/(chat)/layout.tsx`, `src/components/chat/chat-header.tsx`, `src/components/chat/chat-wrapper.tsx`
**Ref:** Owner instruction: ChatHeader must be present on all /app pages

**Context:** Currently `ChatHeader` only renders on `/app` and `/app/c/[id]` (inside `ChatWrapper`). Other 5 pages (`/app/new`, `/app/library`, `/app/personas`, `/app/plans`, `/app/profile`) use `PageWrapper` with no header.

**What to do:**

1. Add a **base `ChatHeader`** to the `(chat)` layout's main section so it renders on ALL `/app/*` routes.
2. Base header shows: sidebar toggle (left), app brand, theme toggle, avatar menu (right).
3. On chat pages (`/app`, `/app/c/[id]`), `ChatWrapper` enhances the header with persona label, message count, and conversation status via Zustand `useChatStore`.
4. Remove duplicate `ChatHeader` rendering from `ChatWrapper` to avoid double header.
5. Verify all pages have correct padding/spacing with header present.

**Acceptance criteria:**

- [ ] `ChatHeader` visible on all 7 `/app/*` routes
- [ ] Header shows brand + theme toggle + avatar menu on all pages
- [ ] Chat pages show persona + message count in header
- [ ] No double header on chat pages
- [ ] `npx tsc --noEmit` passes
- [ ] All tests pass

---

### 31.2 HIGH — Move sidebar toggle to ChatHeader as first-left item

**Files:** `src/components/chat/sidebar/sidebar-head.tsx`, `src/components/chat/chat-header.tsx`, `src/components/shared/sidebar-toggle.tsx`
**Ref:** Owner instruction: ChatSidebarHeadToggle to be moved inside ChatHeader as first item on the left
**Depends on:** 31.1 complete

**What to do:**

1. Move `SidebarToggle` button from `SidebarHead` (inside sidebar) to `ChatHeader` (inside main content area) as the first item on the left.
2. The toggle must still operate the same sidebar state (Zustand `usePreferencesStore`).
3. Remove `ChatSidebarHeadToggle` from `SidebarHead`.
4. Verify toggle works on desktop (collapse/expand) and mobile (open/close overlay).

**Acceptance criteria:**

- [ ] Sidebar toggle appears as first-left item in ChatHeader
- [ ] Toggle removed from sidebar header
- [ ] Desktop toggle collapses/expands sidebar
- [ ] Mobile toggle opens/closes sidebar overlay
- [ ] `npx tsc --noEmit` passes
- [ ] All tests pass

---

### 31.3 MEDIUM — Remove Plans and Profile from sidebar navigation

**Files:** `src/components/chat/sidebar/chat-sidebar-nav.tsx`
**Ref:** Owner instruction: no need of Plans and Profile in sidebar as they are in AvatarMenu

**What to do:**

1. Remove "Plans" and "Profile" entries from `DISCOVER_LINKS` in sidebar nav.
2. Keep the "Personas" link in DISCOVER section (or collapse DISCOVER if empty).
3. Update E2E tests that assert sidebar navigation destinations.

**Acceptance criteria:**

- [ ] Plans and Profile links removed from sidebar
- [ ] Plans and Profile still accessible via AvatarMenu
- [ ] Sidebar navigation tests updated
- [ ] `npx tsc --noEmit` passes
- [ ] All tests pass

---

### 31.4 LOW — Update E2E tests for layout changes

**Files:** `tests/e2e/chat-app-shell.spec.ts`, related E2E specs
**Ref:** Phase 31.1–31.3

**What to do:**

1. Update sidebar navigation assertions (fewer links).
2. Add assertions for ChatHeader presence on non-chat pages.
3. Verify sidebar toggle works from its new position in header.

**Acceptance criteria:**

- [ ] E2E tests reflect new layout structure
- [ ] No false positives from old layout assertions
- [ ] `npm run test:e2e` passes

---

## Phase 32: Library Media Tabs — HIGH

> Owner-mandated (2026-03-16): Library must show Chats, Images, Audios, Videos tabs.
> Depends on: Phase 28 remaining complete (media generation working).

---

### 32.1 HIGH — Add media aggregation query helpers

**Files:** `src/lib/utils/task-queries.tsx`
**Ref:** Owner instruction: generated media must be accessible in Library

**What to do:**

1. Add `getMediaItemsByUserId(userId, mediaType, limit, offset)` query helper using MongoDB aggregation:
   - `$match` by userId → `$unwind` messages → `$unwind` messages.content → `$match` by content type.
   - Returns: `{ url, taskId, taskTitle, personaId, createdAt }`.
2. Support filtering by media type: `image_url`, `audio_url`, `video_url`.
3. Support pagination via `$skip` and `$limit`.
4. Use `.lean()` for read-only results.

**Acceptance criteria:**

- [ ] Query returns media items extracted from Task messages
- [ ] Supports filtering by image, audio, video types
- [ ] Supports pagination
- [ ] Returns task context (title, persona, date) per media item
- [ ] Unit tests for query helpers
- [ ] `npx tsc --noEmit` passes
- [ ] All tests pass

---

### 32.2 HIGH — Add video_url to ContentItem type

**Files:** `src/types/index.tsx` (or ContentItem type definition), `src/lib/database/models/tasks.model.tsx`
**Ref:** Forward-looking schema preparation

**What to do:**

1. Add `"video_url"` to the `ContentItem.type` union: `"text" | "temp" | "image_url" | "audio_url" | "video_url"`.
2. Add `video_url?: string` field to ContentItem if schema requires explicit field.
3. Update `MessageSchema` in task model to include `video_url` field.
4. No behavioral change — just schema readiness for Phase 34.

**Acceptance criteria:**

- [ ] `video_url` type added to ContentItem
- [ ] Schema supports video URL storage
- [ ] Existing functionality unchanged
- [ ] `npx tsc --noEmit` passes
- [ ] All tests pass

---

### 32.3 HIGH — Build tabbed Library UI

**Files:** `src/app/(chat)/app/library/page.tsx`, new client component for tabs
**Ref:** Owner instruction: tabs for Chat sessions, Images, Audios, Videos

**What to do:**

1. Add a tab bar at the top of the Library page: **Chats** (default) | **Images** | **Audios** | **Videos**.
2. "Chats" tab shows current conversation list (existing functionality).
3. "Images" tab queries and displays image grid with thumbnails, persona label, conversation link, and date.
4. "Audios" tab queries and displays audio items with play controls, persona label, conversation link, and date.
5. "Videos" tab shows placeholder "Coming soon" state (no video generation yet).
6. Each tab should show item count.
7. Use server component for data fetching per tab, client component for tab switching.

**Acceptance criteria:**

- [ ] 4 tabs visible on Library page
- [ ] Chats tab shows conversation list (existing)
- [ ] Images tab shows generated images with context
- [ ] Audios tab shows generated audio files with play controls
- [ ] Videos tab shows coming soon state
- [ ] Tab switching is responsive and accessible
- [ ] `npx tsc --noEmit` passes
- [ ] All tests pass

---

### 32.4 MEDIUM — Media card components

**Files:** `src/components/chat/library/` (new directory)

**What to do:**

1. Create `ImageMediaCard` — shows image thumbnail, persona icon, conversation title (link), date.
2. Create `AudioMediaCard` — shows audio player, persona icon, conversation title (link), date.
3. Create `VideoMediaCard` — placeholder for future use.
4. Grid layout: 2 columns mobile, 3 columns tablet, 4 columns desktop.

**Acceptance criteria:**

- [ ] Media cards show relevant context (persona, conversation, date)
- [ ] Image cards show thumbnails
- [ ] Audio cards have inline player
- [ ] Responsive grid layout
- [ ] `npx tsc --noEmit` passes
- [ ] All tests pass

---

### 32.5 LOW — Library pagination

**Files:** Library page and query helpers

**What to do:**

1. Add pagination for each media tab (initial load 20 items, load more).
2. Conversations tab: increase limit or add pagination.
3. Use cursor-based pagination for performance.

**Acceptance criteria:**

- [ ] Each tab loads initial batch and supports "load more"
- [ ] No performance degradation on large datasets
- [ ] `npx tsc --noEmit` passes
- [ ] All tests pass

---

## Phase 33: Persona Trial Access System — CRITICAL

> Owner-mandated (2026-03-16): Users must be able to TEST personas outside their plan.
> **"Personas are the real product we sell!"** — try-before-you-buy conversion funnel.
> Depends on: Phase 30 complete (base persona gating in place).
> This phase replaces the binary "blocked" model with a three-tier access model.

### PM-Frozen Trial Limit Semantics (Decision Gate 33.1)

**Per conversation** for trial (limited-access) personas:

- 5 prompts per conversation (vs full plan limit for full-access personas)
- 3 image generations per 30-day rolling window
- 2 audio generations per 30-day rolling window
- 1 video generation per 30-day rolling window (when implemented)

**Tracking:** GLOBAL across all trial personas (NOT per-persona). Shared trial counters on User model.
**Quota separation:** Trial limits are SEPARATE from plan limits. Using a trial persona does NOT consume plan quota.
**Conversation end:** When trial prompts are exhausted in a conversation, the conversation ends with upgrade CTA.

---

### 33.1 CRITICAL — Freeze & document trial limit semantics

**Status: PM-FROZEN (see above).** This task is pre-resolved documentation.

**What to do:**

1. Document the frozen trial limit semantics in SPEC.md Section 4.
2. Confirm the frozen semantics match the implementation plan in 33.2–33.8.
3. No code changes.

**Acceptance criteria:**

- [ ] Trial limit semantics documented in SPEC.md
- [ ] Semantics approved by PM (this document)

---

### 33.2 HIGH — Add PersonaAccessLevel type and PERSONA_TRIAL_LIMITS constant

**Files:** `src/types/PersonaData.d.tsx`, `src/constants/plans.tsx`

**What to do:**

1. Add `PersonaAccessLevel` type: `"full" | "limited" | "blocked"`.
2. Add `PERSONA_TRIAL_LIMITS` constant: `{ promptsPerConversation: 5, images: 3, audio: 2, video: 1 }`.
3. Update existing type definitions to use `PersonaAccessLevel` where applicable.

**Acceptance criteria:**

- [ ] `PersonaAccessLevel` type exported
- [ ] `PERSONA_TRIAL_LIMITS` constant exported from plans.tsx
- [ ] `npx tsc --noEmit` passes

---

### 33.3 HIGH — Refactor resolveEntitlements() for three-tier persona access

**Files:** `src/lib/utils/resolve-entitlements.tsx`
**Depends on:** 33.2 complete

**What to do:**

1. Replace `allowedPersonaIds: PersonaId[]` with `personaAccess: Record<PersonaId, PersonaAccessLevel>`.
2. Lite: 3 personas `full`, remaining 7 personas `limited`.
3. Pro: 7 personas `full`, remaining 3 personas `limited`.
4. Premium: all 10 personas `full`.
5. Maintain backward compatibility: keep `allowedPersonaIds` as derived list (all `full` + `limited` personas).
6. Add `trialPersonaIds` as derived list (all `limited` personas).
7. Update unit tests for three-tier access.

**Acceptance criteria:**

- [ ] `resolveEntitlements()` returns `personaAccess` with full/limited/blocked per persona
- [ ] Lite: 3 full, 7 limited. Pro: 7 full, 3 limited. Premium: 10 full.
- [ ] `allowedPersonaIds` includes both full and limited personas
- [ ] `trialPersonaIds` returns only limited personas
- [ ] Unit tests pass
- [ ] `npx tsc --noEmit` passes

---

### 33.4 HIGH — Add trial usage tracking fields to User model

**Files:** `src/lib/database/models/user.model.tsx`, `src/types/PlanData.d.tsx`

**What to do:**

1. Add `trialUsage` embedded subdocument to User model plan subdoc:
   - `trialImageGenerations: Number` (default 0)
   - `trialAudioGenerations: Number` (default 0)
   - `trialVideoGenerations: Number` (default 0)
   - `trialUsagePeriodStart: Date`
2. Trial prompt count: tracked per-Task via existing `promptCount` (no new field needed — limit enforcement uses different ceiling).
3. Add corresponding TypeScript types.

**Acceptance criteria:**

- [ ] Trial usage fields on User model
- [ ] TypeScript types updated
- [ ] `npx tsc --noEmit` passes
- [ ] All tests pass

---

### 33.5 HIGH — Update /api/openai to apply trial limits for limited-access personas

**Files:** `src/app/api/openai/route.tsx`, `src/lib/utils/check-usage-limit.ts`
**Depends on:** 33.3 + 33.4 complete

**What to do:**

1. When persona is `limited` access: use `PERSONA_TRIAL_LIMITS.promptsPerConversation` (5) instead of plan's limit (10/100/unlimited).
2. For media in trial persona conversations: check trial media counters (`trialImageGenerations`, etc.) against `PERSONA_TRIAL_LIMITS`.
3. When trial limit hit: end conversation with stop reason `trial_limit_reached` and action `upgrade_plan`.
4. Replace the 403 "not available for your plan" rejection with conditional logic: `blocked` → reject, `limited` → allow with trial limits.
5. Atomic trial media counter via `findOneAndUpdate` with `$lt` guard (same pattern as plan counters).

**Acceptance criteria:**

- [ ] Trial personas allowed with reduced limits (not blocked)
- [ ] 5 prompts/conversation enforced for trial personas
- [ ] Trial media counters enforced atomically
- [ ] Trial limit hit → conversation ends with upgrade CTA
- [ ] Full-access personas unaffected
- [ ] Unit tests for trial vs full limit paths
- [ ] `npx tsc --noEmit` passes
- [ ] All tests pass

---

### 33.6 MEDIUM — Update persona picker for trial personas with badge/CTA

**Files:** `src/components/chat/chat-persona-picker.tsx`
**Depends on:** 33.3 complete

**What to do:**

1. Show all personas (not just full-access ones).
2. Full-access personas: show "Open" (current).
3. Limited-access personas: show "Trial" badge instead of "Locked". Enable button (not disabled).
4. On selecting a trial persona: show brief info tooltip "Limited access — 5 prompts per conversation. Upgrade to unlock full access."
5. Remove `disabled={isLocked}` for trial personas.

**Acceptance criteria:**

- [ ] All 10 personas visible regardless of plan
- [ ] Full = "Open", Limited = "Trial", Blocked = "Locked" (only if admin-blocked)
- [ ] Trial personas are selectable
- [ ] Trial info visible to user
- [ ] `npx tsc --noEmit` passes
- [ ] All tests pass

---

### 33.7 MEDIUM — Update plan cards to explain trial access

**Files:** `src/constants/plans.tsx`, plan card components

**What to do:**

1. Lite plan card: "3 personas (full access) + try all others (limited)".
2. Pro plan card: "7 personas (full access) + try all others (limited)".
3. Premium plan card: "All 10 personas (unlimited)".
4. Add brief explanation of trial limits where applicable.

**Acceptance criteria:**

- [ ] Plan cards accurately describe trial access
- [ ] No misleading "blocked" language for non-plan personas
- [ ] `npx tsc --noEmit` passes
- [ ] All tests pass

---

### 33.8 LOW — E2E tests for persona trial access flow

**Files:** `tests/e2e/` (new or updated specs)

**What to do:**

1. Test: Lite user can select a trial persona and start conversation.
2. Test: Trial conversation stops at 5 prompts with upgrade CTA.
3. Test: Full-access persona conversation uses plan limits (10 prompts).
4. Test: Persona picker shows "Trial" badge for limited personas.

**Acceptance criteria:**

- [ ] E2E covers trial persona selection + limit enforcement
- [ ] E2E covers upgrade CTA on trial limit
- [ ] `npm run test:e2e` passes

---

## Phase 30: Persona Policy Implementation (remaining — continued)

### 30.5 MEDIUM — Generate persona hero images

**Ref:** Owner instruction: each persona must have a representative character/image as hero
**Depends on:** 30.1 complete (Interviewer added — DONE)

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

## Phase 34: Video Generation — ON HOLD (gated)

> **GATED:** Requires Sora API verification + S3 cost ceiling approval before implementation.
> Depends on: Phase 28 audio verification complete, Phase 33 entitlement system stable.
> Owner requests video generation to work — this is the implementation phase.

---

### 34.1 DECISION GATE — Verify Sora API availability and pricing

**What to do:**

1. Live-test `sora-2` and `sora-2-pro` model IDs against OpenAI API.
2. Measure video generation latency and output size.
3. Calculate S3 storage cost for video files.
4. Present cost ceiling analysis to PM/Owner for approval.

**Acceptance criteria:**

- [ ] Sora API availability confirmed or alternative chosen
- [ ] Cost analysis presented and approved

---

### 34.2 HIGH — Implement generateVideo utility

**Files:** `src/lib/utils/openai/generateVideo.tsx` (new)

**What to do:**

1. Create `generateVideo()` following same pattern as `generateImage()`/`generateAudio()`.
2. Use `resolveModelPolicy()` for model selection.
3. Upload video file to S3, return URL.
4. Handle video-specific constraints (longer generation time, larger files).

---

### 34.3 HIGH — Add video tool definition and API route integration

**Files:** `src/constants/openai.tsx`, `src/app/api/openai/route.tsx`, `src/lib/utils/openai/generateResponse.tsx`

**What to do:**

1. Add video tool definition in OpenAI constants.
2. Wire video generation into `buildOpenAIResponsePayload` tool call handler.
3. Wire video counter tracking in API route.

---

### 34.4 MEDIUM — Video player component for chat messages

**Files:** `src/components/chat/` (new component)

**What to do:**

1. Create inline video player component for chat message rendering.
2. Support basic controls: play, pause, volume, fullscreen.

---

## Phase 29: App-Wide Modernization — ON HOLD

> **ON HOLD until Phases 28 + 31 + 32 + 33 are PM-approved complete.**
> Owner-approved modernization items. Dependencies already installed.

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

> **ON HOLD until Phases 28 + 31 + 32 + 33 + 34 + 29 are PM-approved complete.**
> Depends on: All preceding phases complete.

---

### 26.1 Persona-aware media generation prompts

**Ref:** TD-AI-09 (remaining gap)

### 26.2 Implement Stripe subscription mode (auto-renewal)

**Ref:** TD-PLAN-01

---

> **Completed phases** are archived in [`DONE.md`](DONE.md).
> HF-1 through HF-9.2 complete. Phases 1–25.7 + 27.1–27.4 + 27.6–27.10 + 28.1 + 28.2-fix + 28.3-code + 30.1 + 30.2 + 30.3 complete.
> Phase 10–12 superseded (see DONE.md for mapping).

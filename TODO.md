# Droplet — TODO

> Prioritized, actionable development tasks. Each task max ~30 minutes.
> Governed by **Droplet-PM**. Do not add tasks without PM approval.
> Ref: `SPEC.md` for full specification. `AGENTS.md` for coding rules. `DONE.md` for completed phases.
> Implementation agent: **Droplet-Engineer** (Senior Developer).
>
> **STATUS: Phases 1–45.4 complete. Phase 43.2 complete (placeholders). All Milestones 0–18 MOSTLY COMPLETE.**
> **PM deep audit #22 (2026-03-17): Full triple-audit (PM + Architect + Engineer). Video generation confirmed NOT implemented. Currency hardcoding confirmed. autoAnimate leak confirmed. Chat "Invalid request body" confirmed FIXED.**
> **357 unit tests passing (65 suites). 180 E2E passing. 48 skipped (explained). Build passing.**
> **OWNER INSTRUCTIONS (latest, 2026-03-17): Video integration HIGH (Sora API confirmed), video player HIGH, currency configurability, admin full permissions display, admin design, import type fixes, SVG optimization.**
> **Sora API UNBLOCKED (2026-03-17): Owner confirmed `sora-2` and `sora-2-pro` configured on OpenAI platform. SDK v6.31.0 has `openAiClient.videos.*` API. Phase 34 elevated to HIGH.**
> **Priority order: 47.1 → 34.2 → 34.3 → 34.4 → 34.5 → 34.6 → 34.7 → 34.8 → 48.1 → 49.1 → 49.2 → 49.3 → 49.4 → 49.5 → 46.x → 31.4 → 29.x → 26.x**
> **All Phase 26+ deferred work is ON HOLD until PM-approved complete.**

---

## Phase 47: Video Generation Claims Suppression — CRITICAL (Owner-Directed, PM Audit #22)

> **CRITICAL priority. PM audit #22 triple-audit finding: Video generation is NOT implemented. No `generateVideo.tsx`, no video tool in `getChatTools()`, no video handler in `processToolUsage()`, no video rendering in `chat-body.tsx`, no `VideoPlayer` component. But system prompts and entitlements claim video IS available, causing the AI to produce confusing refusal messages or errors when users request video.**
> **Root cause of Owner-reported issue: "I get an error message or 'I can generate audio or images, but I'm currently unable to create or generate videos.'"**
> **Phase 34 (full video implementation) remains ON HOLD pending Sora API verification. This phase only suppresses false claims.**

---

### 47.1 CRITICAL — Suppress video capability claims until implementation exists

**Ref:** PM audit #22 — `supportsVideoGeneration: true` is resolved by entitlements and passed to system prompt context, but no video tool exists for the AI to call. AI model fabricates errors or refusals.

**Files:** `src/lib/utils/resolve-entitlements.tsx`, `src/lib/utils/openai/generateResponse.tsx`, `src/constants/persona-prompts.ts`

**What to do:**

1. In `resolveEntitlements()`, force `supportsVideoGeneration: false` for ALL plans until Phase 34 delivers the video tool. Add comment: `// Video generation not implemented — suppress until Phase 34`.
2. Verify system prompt builder does NOT mention video capability when `supportsVideoGeneration` is false.
3. Verify plan cards already show "Coming soon" for video (confirmed — no change needed there).
4. Do NOT remove video scaffolding (model policy, DB fields, usage counters) — those are future-ready.

**Acceptance criteria:**

- [x] `supportsVideoGeneration` returns `false` for all plans
- [x] AI model no longer claims it can generate videos
- [x] No confusing errors when user asks for video — model responds honestly that video is coming soon
- [x] Plan cards still show "Coming soon" for video
- [x] Video scaffolding (model policy, DB schema, counters) preserved
- [x] `npx tsc --noEmit` passes
- [x] All tests pass

---

## Phase 48: Currency Configurability — HIGH (Owner-Directed, PM Audit #22)

> **HIGH priority. Owner directive: "Hardcoded '$' currency symbol is not allowed. The app will use different currencies depending on selling region. For now USD and Euro — must be configurable by admin."**
> **PM audit #22: Hardcoded `$` confirmed in plan-card.tsx, about page, faqs.tsx, terms-data.ts, admin usage page.**

---

### 48.1 HIGH — Add configurable currency symbol to plan pricing display

**Ref:** PM audit #22 — `$` hardcoded in 5 files. Owner wants admin-configurable currency (USD `$` / EUR `€`).

**Files:** `src/constants/plans.tsx`, `src/lib/utils/effective-plan-config.ts`, `src/components/shared/plan-card.tsx`, `src/constants/faqs.tsx`, `src/constants/about-data.ts`, `src/constants/terms-data.ts`, `src/app/(admin)/admin/settings/page.tsx`, `src/app/(admin)/admin/usage/page.tsx`

**What to do:**

1. Add `currencySymbol: string` field to `PlanPricing` type (default `"$"`).
2. Add `getEffectiveCurrencySymbol()` to `effective-plan-config.ts` — reads `AppSetting("admin.currencySymbol")`, falls back to `"$"`.
3. Pass `currencySymbol` from server to all plan display surfaces.
4. Replace hardcoded `"$"` in `plan-card.tsx` with prop-driven `currencySymbol`.
5. Replace hardcoded `$` prefix in `buildFaqs()` template literals with `currencySymbol` param.
6. Replace hardcoded `$` prefix in `buildAboutSections()` with `currencySymbol` param.
7. Replace hardcoded `$` prefix in `buildTermsSections()` with `currencySymbol` param.
8. Replace hardcoded `$` in admin usage `formatCost()` with effective currency symbol.
9. Add currency symbol selector (USD/EUR) to admin settings page.

**Acceptance criteria:**

- [x] Zero hardcoded `$` currency symbols in rendering code
- [x] `currencySymbol` resolved from admin settings with `$` fallback
- [x] Admin can switch between `$` (USD) and `€` (EUR)
- [x] All plan cards, FAQs, About, Terms render correct currency symbol
- [x] `npx tsc --noEmit` passes
- [x] All tests pass

---

## Phase 49: Code Quality Fixes — HIGH-MEDIUM (PM Audit #22)

> **Findings from PM audit #22 triple-audit. Mixed priority.**

---

### 49.1 HIGH — Fix autoAnimate MutationObserver leak in chat-body.tsx

**Ref:** PM audit #22 — `autoAnimate()` called on every message update without cleanup. MutationObserver leak. Supersedes Phase 45.5.

**Files:** `src/components/chat/chat-body.tsx`

**What to do:**

1. Separate autoAnimate initialization from scroll-to-bottom logic.
2. Initialize `autoAnimate()` once on ref availability (not on every message change).
3. Store return value (AnimationController).
4. Call cleanup in useEffect return function.
5. Keep scroll-to-bottom in separate effect keyed on `messages.length`.

**Acceptance criteria:**

- [x] autoAnimate called once, not on every message
- [x] Cleanup function returned from useEffect
- [x] No MutationObserver leak
- [x] Scroll-to-bottom still works on new messages
- [x] `npx tsc --noEmit` passes

---

### 49.2 MEDIUM — Fix `import type` issues in faqs.tsx and about-data.ts

**Ref:** PM audit #22 + Copilot code review — `FullPersonaAccessByPlan` imported as runtime from `effective-persona-access.ts` (which has `import "server-only"`), but only used as a type.

**Files:** `src/constants/faqs.tsx`, `src/constants/about-data.ts`

**What to do:**

1. Change `import { FullPersonaAccessByPlan }` to `import type { FullPersonaAccessByPlan }` in both files.

**Acceptance criteria:**

- [x] `import type` used for type-only imports from server-only modules
- [x] No runtime dependency on `server-only` sentinel from constants files
- [x] `npx tsc --noEmit` passes

---

### 49.3 MEDIUM — Add `unoptimized` to persona card SVG images

**Ref:** PM audit #22 + Copilot code review — `persona-card.tsx` uses `next/image` with SVG hero images. SVGs routed through image optimizer produce blurry raster versions.

**Files:** `src/components/shared/persona-card.tsx`

**What to do:**

1. Add `unoptimized` prop to `<Image>` rendering `persona.heroImage` (which are `.svg` files).

**Acceptance criteria:**

- [x] SVG persona images served directly without optimization
- [x] `npx tsc --noEmit` passes

---

### 49.4 MEDIUM — Make PlanPromo and ChatSidebarPromo admin-role-aware

**Ref:** PM audit #22 — Admin users see "Unlock premium features" promo. Owner directive: admin role has full permission with no limitations — promo cards should display relevant info.

**Files:** `src/components/shared/plan-promo.tsx`, `src/components/chat/sidebar/chat-sidebar-promo.tsx`

**What to do:**

1. In `PlanPromo` (Server Component): check `userData.role === "admin"` — if admin, show "Admin Access — Full permissions" instead of upgrade promo.
2. In `ChatSidebarPromo` (Client Component): receive `userRole` prop from parent server layout. If admin, show admin-appropriate message or hide promo entirely.

**Acceptance criteria:**

- [x] Admin users do not see upgrade promo
- [x] Admin users see "Admin Access" or equivalent
- [x] Non-admin users see upgrade promo as before
- [x] `npx tsc --noEmit` passes

---

### 49.5 MEDIUM — Remove hardcoded promo text in chat-sidebar-promo.tsx

**Ref:** PM audit #22 — Hardcoded "Unlock image and audio features with Pro." text. Should reference plan features dynamically.

**Files:** `src/components/chat/sidebar/chat-sidebar-promo.tsx`

**What to do:**

1. Receive plan name or promo text as prop from parent server layout.
2. Display contextual promo based on current plan: Lite users see upgrade to Pro, Pro users see upgrade to Premium, Premium/admin see nothing.

**Acceptance criteria:**

- [x] Zero hardcoded promo text
- [x] Promo contextual to user's current plan
- [x] `npx tsc --noEmit` passes

---

## Phase 46: Performance & Resource Leak Audit — ON HOLD

> **HIGH priority. After Phase 45. Owner directive: "Evaluate entire codebase for good practices, reduce unnecessary re-renders and resource leaks."**
> **PM audit #21 finding: Codebase is mostly clean. Minor items identified below.**

---

### 46.1 LOW — Add admin error boundary

**Files:** `src/app/(admin)/error.tsx` (new)

**What to do:**

1. Create `error.tsx` for admin route group.
2. Handle admin-specific errors with appropriate recovery UI.

---

### 46.2 LOW — Add stderr logging to silent catch blocks

**Files:** `src/components/shared/audio-player.tsx`, `src/components/chat/chat-sidebar.tsx`

**What to do:**

1. Replace empty `catch {}` blocks with `catch { /* localStorage/audio non-critical */ }` comments or minimal stderr logging where appropriate.

---

## Phase 31.4: E2E Test Updates — LOW (remaining)

### 31.4 LOW — Update E2E tests for layout changes

**Files:** `tests/e2e/chat-app-shell.spec.ts`, related E2E specs

**Acceptance criteria:**

- [ ] E2E tests reflect current layout structure
- [ ] `npm run test:e2e` passes

---

## Phase 34: Video Generation — HIGH (UNBLOCKED)

> **UNBLOCKED (2026-03-17):** Owner confirmed Sora API models `sora-2` and `sora-2-pro` configured on OpenAI platform.
> **SDK support:** OpenAI SDK v6.31.0 includes `openAiClient.videos.*` API — async job model (create → poll → download).
> **Model policy:** Already configured in `ai-model-policy.ts`. Pricing: `sora-2` = $0.10/video, `sora-2-pro` = $0.30/video.
> **Scaffolding ready:** DB counters (`videoGenerations`, `trialVideoGenerations`), plan limits (Lite: 1, Pro: 10, Premium: unlimited), `ContentItem.video_url` type, library tab, admin settings fields — all exist.
> **Phase 47.1 (suppress false claims) must complete FIRST** — protects users during development window.
> **Depends on:** Phase 47.1 complete. After 34.8, video is fully live.

---

### 34.1 DECISION GATE — PASSED ✅

**Verified 2026-03-17:**

- Sora API models (`sora-2`, `sora-2-pro`) confirmed configured on Owner's OpenAI platform.
- OpenAI SDK v6.31.0 includes `openAiClient.videos.create()`, `.retrieve()`, `.downloadContent()`.
- Async job model: create returns `Video` object with `status` (`queued` | `in_progress` | `completed` | `failed`), poll until done, download MP4.
- Duration: 4, 8, or 12 seconds. Sizes: 720x1280, 1280x720, 1024x1792, 1792x1024.
- Model policy already in `ai-model-policy.ts` (all plans use `sora-2`, Premium can override to `sora-2-pro`).
- S3 storage: follows existing pattern (`{userId}/videos/`).
- No separate cost ceiling approval needed — flat pricing already defined.

---

### 34.2 HIGH — Create generateVideo.tsx utility

**Ref:** Follow `generateImage.tsx` and `generateAudio.tsx` patterns exactly.

**Files:** `src/lib/utils/openai/generateVideo.tsx` (new)

**What to do:**

1. Create `generateVideo.tsx` following the existing media generation pattern.
2. Interface: `GenerateVideoParams { prompt: string; role: MessageRole; taskId: string; userId: string; planName: PlanName; modelOverrides?: ModelPolicyModelOverrides; }`
3. Resolve model via `resolveModelPolicy({ plan, feature: "video_generation", taskClass: "final", modelOverrides })`.
4. Check `policy.hardBlocked` — throw if blocked.
5. Call `openAiClient.videos.create({ prompt, model: policy.model, seconds: "4", size: "1280x720" })`.
6. Poll `openAiClient.videos.retrieve(video.id)` in a loop (1-second interval, max 180 seconds timeout). Check `video.status === "completed"` or `"failed"`.
7. On `"failed"`: throw with error message from `video.error.message`.
8. On `"completed"`: call `openAiClient.videos.downloadContent(video.id, { variant: "video" })` to get Response object.
9. Convert response to Buffer: `Buffer.from(await response.arrayBuffer())`.
10. Upload to S3: `uploadFileToAWS(videoBuffer, fileName, "video/mp4", \`${userId}/videos\`)`. Filename pattern: `${taskId}_video_${generateString()}.mp4`.
11. Build `taskData: Message` with content: `[{ type: "text", text: prompt }, { type: "video_url", video_url: videoS3Url }]`.
12. Return `JSON.stringify({ taskData, generatedVideo: true, model: policy.model, requestMetric })`.
13. Error handling: log to stderr with `[generateVideo]` prefix, call `handleError()`.

**Acceptance criteria:**

- [ ] `generateVideo()` follows exact pattern of `generateImage()` and `generateAudio()`
- [ ] Model resolved via `resolveModelPolicy` — no hardcoded model names
- [ ] Polling has maximum timeout (180s) to prevent infinite wait
- [ ] Video uploaded to S3, URL stored in message content
- [ ] Error handling with stderr logging matches existing pattern
- [ ] `npx tsc --noEmit` passes

---

### 34.3 HIGH — Add video tool definition + update getChatTools

**Ref:** Follow `imageGenerationTool` and `audioGenerationTool` patterns.

**Files:** `src/constants/openai.tsx`

**What to do:**

1. Add `videoGenerationTool` constant:
   ```typescript
   const videoGenerationTool = {
     type: "function",
     function: {
       name: "getGeneratedVideo",
       description:
         "Generates a short video clip when requested by the user. Use this function if the user asks for a video, " +
         "e.g., when prompted with 'generate video ...', 'create video ...' or anything related. " +
         "USE PREVIOUS PROMPTS for generating videos as well. Trim prompts to maximum 4000 characters.",
       strict: true,
       parameters: {
         type: "object",
         properties: {
           prompt: {
             type: "string",
             description: "Description of the video to generate",
           },
         },
         required: ["prompt"],
         additionalProperties: false,
       },
     },
   };
   ```
2. Update `chatTools` array to include `videoGenerationTool`.
3. Add `supportsVideoGeneration: boolean` parameter to `getChatTools()` function.
4. Conditionally push `videoGenerationTool` when `supportsVideoGeneration` is true.

**Acceptance criteria:**

- [ ] Video tool follows same structure as image/audio tools
- [ ] `getChatTools()` accepts and uses `supportsVideoGeneration` flag
- [ ] `npx tsc --noEmit` passes

---

### 34.4 HIGH — Add video handler in generateResponse.tsx

**Ref:** Follow exact image/audio handler patterns in `buildOpenAIResponsePayload()`.

**Files:** `src/lib/utils/openai/generateResponse.tsx`

**What to do:**

1. Import `generateVideo` from `./generateVideo`.
2. Update `claimMediaGenerationSlot` type to accept `limitType: "images" | "audio" | "video"`.
3. Update `rollbackMediaGenerationSlot` type to accept `limitType: "images" | "audio" | "video"`.
4. Add `getGeneratedVideo` case in `buildOpenAIResponsePayload()` after the audio handler:
   - Resolve video policy via `resolveFeaturePolicy({ feature: "video_generation", taskClass: "final" })`.
   - Check `entitlements.supportsVideoGeneration` and `videoPolicy.hardBlocked`.
   - Claim video slot via `claimMediaGenerationSlot({ limitType: "video" })`.
   - Call `generateVideo({ prompt: parsedArgs.prompt, role, taskId, userId, planName, modelOverrides })`.
   - Parse response, accumulate metrics.
   - On error: rollback slot, log to stderr, return service_error payload.
5. Update the default no-tool return to include `generatedVideo: false`.
6. Update both `getChatTools()` calls in `runChatCompletion()` and `runStreamingChatCompletion()` to pass `supportsVideoGeneration: entitlements.supportsVideoGeneration`.

**Acceptance criteria:**

- [ ] Video handler follows exact same pattern as image/audio handlers
- [ ] Slot claim and rollback are atomic with proper error isolation
- [ ] `supportsVideoGeneration` passed to `getChatTools()` in both streaming and non-streaming paths
- [ ] `npx tsc --noEmit` passes

---

### 34.5 HIGH — Update API route video slot management

**Ref:** Extend existing `MediaUsageLimitType` and counter field resolution.

**Files:** `src/app/api/openai/route.tsx`

**What to do:**

1. Update `MediaUsageLimitType` from `"images" | "audio"` to `"images" | "audio" | "video"`.
2. Update `resolveMediaCounterField()` return type union to include `"plan.videoGenerations"` and `"plan.trialUsage.trialVideoGenerations"`.
3. Add video case logic: if `limitType === "video"`, map to `"plan.videoGenerations"` (plan scope) or `"plan.trialUsage.trialVideoGenerations"` (trial scope).
4. Update remaining-count calculation in `claimMediaGenerationSlot()` to handle video counter fields.
5. Verify the `claimMediaGenerationSlot` and `rollbackMediaGenerationSlot` closures passed to `generateResponse()` work correctly with `"video"` type.

**Acceptance criteria:**

- [ ] `"video"` added to `MediaUsageLimitType`
- [ ] `resolveMediaCounterField()` correctly maps video to DB fields
- [ ] Slot claim/rollback work atomically for video (same TOCTOU-safe pattern)
- [ ] `npx tsc --noEmit` passes

---

### 34.6 HIGH — Create VideoPlayer component + chat rendering

**Ref:** Follow `AudioPlayer` component pattern. Use HTML5 `<video>` element.

**Files:** `src/components/chat/video-player.tsx` (new), `src/components/chat/chat-body.tsx`

**What to do:**

1. Create `video-player.tsx` with `VideoPlayer` component:
   - Props: `{ videoSrc: string | null }`.
   - Render HTML5 `<video>` element with `controls`, `preload="metadata"`, `playsInline`.
   - Set `className="VideoPlayer"` per coding standards.
   - Max width constraint (e.g., `max-w-md`) to fit chat bubble.
   - Handle null/empty src gracefully (show placeholder or nothing).
   - Add `"use client"` directive (needs browser `<video>` element).
2. In `chat-body.tsx`, add video rendering case in the content array map:
   ```typescript
   if (reply.type === "video_url") {
     return (
       <VideoPlayer
         key={contentIndex}
         videoSrc={reply.video_url || null}
       />
     );
   }
   ```
3. Import `VideoPlayer` in `chat-body.tsx`.

**Acceptance criteria:**

- [ ] `VideoPlayer` renders HTML5 video with controls
- [ ] Video displays correctly in chat messages
- [ ] Null/empty src handled gracefully
- [ ] Component has unique CSS class `VideoPlayer`
- [ ] `npx tsc --noEmit` passes

---

### 34.7 HIGH — Re-enable supportsVideoGeneration + update library

**Ref:** Reverses Phase 47.1 suppression now that video tool chain is complete.

**Files:** `src/lib/utils/resolve-entitlements.tsx`, `src/app/(chat)/app/library/page.tsx`, `src/components/chat/library-tabs.tsx`

**What to do:**

1. In `resolve-entitlements.tsx`: verify `supportsVideoGeneration: true` is restored (if Phase 47.1 changed it to false, change it back to true).
2. In `library/page.tsx`: update video items query to aggregate `video_url` content items from tasks (follow same pattern as `imageItems` and `audioItems` aggregation).
3. In `library-tabs.tsx`: replace "Video Library Coming Soon" placeholder with actual video card rendering using `LibraryMediaCard` (follow images/audios pattern).
4. Update the placeholder text in `library-tabs.tsx` from "Video generation is gated pending Sora API verification" to actual empty state ("No videos generated yet").

**Acceptance criteria:**

- [ ] `supportsVideoGeneration` returns `true` for all non-suspended plans
- [ ] Library page queries and displays video items
- [ ] "Coming Soon" placeholder removed from library videos tab
- [ ] Videos appear in library after generation
- [ ] `npx tsc --noEmit` passes
- [ ] All tests pass

---

### 34.8 HIGH — Video generation unit tests

**Ref:** Test coverage for new video functionality.

**Files:** `tests/unit/generateVideo.test.ts` (new), `tests/unit/openai-tools.test.ts` (update if exists)

**What to do:**

1. Test `generateVideo()`: mock `openAiClient.videos.create()`, `retrieve()`, `downloadContent()`. Verify polling logic, S3 upload call, return shape.
2. Test `getChatTools()` with `supportsVideoGeneration: true/false` — verify tool inclusion/exclusion.
3. Test `resolveMediaCounterField()` with `"video"` type — verify correct DB field paths.
4. Test video handler in `buildOpenAIResponsePayload()` if feasible (mock dependencies).

**Acceptance criteria:**

- [ ] Unit tests cover generateVideo success path
- [ ] Unit tests cover generateVideo failure/timeout path
- [ ] Unit tests cover getChatTools video flag
- [ ] All existing tests still pass
- [ ] `npm run test` passes

---

## Phase 29: App-Wide Modernization — ON HOLD

> **ON HOLD until Phase 44 + 45 complete.**

### 29.1 Implement Zod schema validation across the app

### 29.2 Implement Zustand for client-side state management

---

## Phase 26: Deferred Features — ON HOLD

### 26.1 Persona-aware media generation prompts (TD-AI-09)

### 26.2 Implement Stripe subscription mode — auto-renewal (TD-PLAN-01)

---

> **Completed phases** are archived in [`DONE.md`](DONE.md).
> All phases through 43.4 complete (except 43.2 hero images — in progress).
> Phase 10–12 superseded (see DONE.md for mapping).

# Droplet — TODO

> Prioritized, actionable development tasks. Each task max ~30 minutes.
> Governed by **Droplet-PM**. Do not add tasks without PM approval.
> Ref: `SPEC.md` for full specification. `AGENTS.md` for coding rules. `DONE.md` for completed phases.
> Implementation agent: **Droplet-Engineer** (Senior Developer).
>
> **STATUS: Phase 25.7 COMPLETE (PM-verified 2026-03-13). All milestones 0–8 complete. Phases 1–25.7 complete.**
> **TWO CRITICAL BUGS FOUND: (1) Limits race condition allows plan limit bypass. (2) Image/audio generation crashes on any provider/upload error.**
> **PRODUCT RULE CHANGE: All features (image, audio, video) now available in all plans and all personas (Rule 10). Frozen Rule 5 updated.**
> **All Phase 26+ deferred work is ON HOLD until Phase 27 (critical/medium bug fixes + rule change) is complete.**
> **Priority order: 27.1 (CRITICAL) → 27.2 (CRITICAL) → 27.3 (HIGH) → 27.4 → 27.5 → 27.6 → 27.7 → Phase 26.**
> **COMPLETED THIS SESSION: 6 starter prompts per persona (all 9 personas updated). No TODO entry needed — already done.**

---

## Phase 27: Critical & Medium Bug Fixes

> **Blocking all other work.** Discovered during PM deep audit (2026-03-13).
> These are production-impacting bugs that must be resolved before any feature work.
> Depends on: Phase 25.7 complete (verified).

---

### 27.1 CRITICAL — Fix limits enforcement race condition (prompt limit + daily conversation limit bypass)

**Files:** `src/app/api/openai/route.tsx`, `src/lib/actions/task.actions.tsx`, `src/lib/utils/check-daily-conversations.ts`, `src/lib/utils/check-usage-limit.ts`
**Ref:** TD-LIMIT-01 (new), TD-LIMIT-02 (new)

**Root cause — prompt limit:** The prompt limit check in `/api/openai` uses a **read-check-write** pattern: it reads `persistedTask.promptCount`, compares to `PLAN_LIMITS[planName].promptsPerConversation`, then (after AI generation completes 5–30 seconds later) increments via `$inc: { promptCount: 1 }`. During the AI generation window, concurrent requests all read the same stale `promptCount`, all pass the check, and all increment — allowing overshoot by the number of concurrent in-flight requests.

**Root cause — daily conversation limit:** Same read-check-write race. `checkDailyConversationLimit()` counts existing tasks, then the task is created AFTER the check passes. Multiple simultaneous new-conversation requests all count the same total and all pass.

**Secondary issue:** `getStartOfDay()` in `check-daily-conversations.ts` uses `setHours(0,0,0,0)` (local timezone), but `Task.createdAt` timestamps are UTC. Minor edge case near midnight — users in non-UTC timezones may see incorrect daily reset boundary.

**What to do:**

1. **Prompt limit fix (atomic check-and-increment):** Replace the separate read → check → write with an atomic `findOneAndUpdate` that checks the condition in the query filter:
   ```
   Task.findOneAndUpdate(
     { _id: taskId, userId, promptCount: { $lt: limit } },
     { $inc: { promptCount: 1 } },
     { new: true }
   )
   ```
   If the update returns `null`, the limit has been reached — block the request. This is a single atomic MongoDB operation — no race window.
2. Remove `promptCountIncrement` from `finalizeAIResponse` / `updateTask` — the increment now happens BEFORE the AI call, not after.
3. For new conversations: `createTask` already sets `promptCount: 1`, which is correct. The atomic increment applies starting from the second message.
4. **Daily conversation limit fix:** After `createTask`, immediately count today's tasks. If count exceeds the limit, delete the just-created task and return the limit error. This is a compensating pattern — the creation acts as the atomic gate.
5. **Timezone fix:** Change `getStartOfDay()` to use `setUTCHours(0,0,0,0)` instead of `setHours(0,0,0,0)`.
6. Add unit tests covering: concurrent prompt limit enforcement, daily limit boundary, UTC timezone correctness.

**Acceptance criteria:**

- [ ] Prompt limit uses atomic `findOneAndUpdate` with `$lt` condition — no separate read-check-write
- [ ] `promptCountIncrement` removed from `finalizeAIResponse` and `updateTask` interface
- [ ] Daily conversation limit cannot be bypassed by simultaneous new-conversation requests
- [ ] `getStartOfDay()` uses UTC (`setUTCHours`) not local timezone
- [ ] Lite user CANNOT send more than 10 messages per conversation under any concurrency scenario
- [ ] Lite user CANNOT create more than 5 conversations per day under any concurrency scenario
- [ ] Conversation ends cleanly with correct stop reason when limits are hit
- [ ] Unit tests for atomic prompt limit enforcement
- [ ] Unit tests for daily limit boundary
- [ ] `npx tsc --noEmit` passes
- [ ] All existing tests pass

---

### 27.2 CRITICAL — Fix image/audio generation unhandled exceptions

**Files:** `src/lib/utils/openai/generateResponse.tsx`, `src/lib/utils/openai/generateImage.tsx`, `src/lib/utils/openai/generateAudio.tsx`
**Ref:** TD-AI-19

**Root cause:** `generateImage()` and `generateAudio()` catch errors then re-throw via `handleError()`. The callers in `buildOpenAIResponsePayload()` (in `generateResponse.tsx`) call these functions **without try-catch**. Any OpenAI API failure, Sharp conversion failure, or S3 upload failure crashes the request with a 500 error.

**What to do:**

1. In `generateResponse.tsx` → `buildOpenAIResponsePayload()`, wrap the `generateImage()` call in try-catch. On error, return an error payload (`{ errorType: "service_error", errorMessage: "Image generation failed. Please try again." }`) — do NOT re-throw.
2. Same for the `generateAudio()` call — wrap in try-catch with graceful error payload.
3. Ensure the error payload is structured identically to other error responses so the chat UI can display it.
4. Add unit tests covering: OpenAI API failure path, S3 upload failure path, and Sharp conversion failure path.
5. Do NOT change `generateImage()` or `generateAudio()` internal error handling — fix at the call site only.

**Acceptance criteria:**

- [ ] `generateImage()` call wrapped in try-catch with graceful error payload
- [ ] `generateAudio()` call wrapped in try-catch with graceful error payload
- [ ] User sees "Image generation failed" message instead of 500 error
- [ ] User sees "Audio generation failed" message instead of 500 error
- [ ] Conversation is NOT corrupted on media generation failure
- [ ] Unit tests for both failure paths
- [ ] `npx tsc --noEmit` passes
- [ ] All existing tests pass

---

### 27.3 HIGH — Enable universal feature access (all features × all plans × all personas)

**Files:** `src/constants/plans.tsx`, `src/constants/assistant-personas.tsx`, `src/lib/utils/resolve-entitlements.tsx`, `src/lib/utils/ai-model-policy.ts`, `src/lib/utils/openai/generateResponse.tsx`, plan card components
**Ref:** TD-FEAT-01 (new), AGENTS.md Rules 5 & 10

**Product rule change (PM-approved, frozen rule override):** All features (image, audio, video) must be available in ALL plans and ALL personas — differentiated by plan limits (quantity) and persona purpose (prompt context). No feature is plan-exclusive or persona-exclusive.

**New limits matrix:**

| Feature                 | Lite | Pro | Premium   |
| ----------------------- | ---- | --- | --------- |
| Image generations/month | 3    | 50  | Unlimited |
| Audio generations/month | 3    | 50  | Unlimited |
| Video generations/month | 1    | 10  | 10        |

**What to do:**

1. **`src/constants/plans.tsx`** — Update `PLAN_LIMITS`:
   - Lite: `audio: 0 → 3`, `video: 0 → 1`
   - Pro: `video: 0 → 10`
   - Update plan card descriptions: remove "no audio", "no video" text. Replace with actual limits.
2. **`src/constants/assistant-personas.tsx`** — Set `supportsImage: true` and `supportsAudio: true` for ALL 9 personas. Currently 5 personas block image, 4 block audio.
3. **`src/lib/utils/resolve-entitlements.tsx`** — Lite plan: change `supportsAudioGeneration: false` → `true`. Add video entitlement checks (`supportsVideoGeneration`) gated by `checkUsageLimit` for all plans.
4. **`src/lib/utils/ai-model-policy.ts`** — Remove `createBlockedRule("Audio generation is not available on Lite.")`. Remove `createBlockedRule("Video generation is not available on Lite.")`. Remove `createBlockedRule("Video generation is not available on Pro.")`. Add Lite audio model policy (use `gpt-4o-mini-tts` for TTS, block `audio_in_out`). Add Lite/Pro video model policy (use `sora-2`, same model as Premium — video is still "coming soon" but policy must be defined).
5. **`src/lib/utils/openai/generateResponse.tsx`** — Adjust persona capability checks: remove `!selectedPersona.supportsAudio` and `!selectedPersona.supportsImage` blocking conditions. Features are now plan-gated only, not persona-gated.
6. **Plan card components** — Update inclusion text: Lite should list "3 images, 3 audio, 1 video /month". Pro should list "50 images, 50 audio, 10 video /month".
7. Update unit tests: new entitlement combos (Lite+audio, Lite+video, Pro+video), persona feature universality.

**Acceptance criteria:**

- [ ] `PLAN_LIMITS` reflects new limits: Lite audio=3, Lite video=1, Pro video=10
- [ ] All 9 personas have `supportsImage: true` and `supportsAudio: true`
- [ ] `resolveEntitlements("lite")` returns `supportsAudioGeneration: true`
- [ ] Model policy: Lite audio resolves to `gpt-4o-mini-tts` (not blocked)
- [ ] Model policy: Lite/Pro video resolves to `sora-2` (not blocked)
- [ ] Persona checks in `generateResponse.tsx` no longer block features per persona
- [ ] Plan card UI reflects accurate feature limits for all 3 plans
- [ ] No feature is blocked for any plan — all are limited by quantity
- [ ] No feature is blocked for any persona — all are available
- [ ] Unit tests for Lite audio entitlement, Lite video entitlement, Pro video entitlement
- [ ] Unit tests for persona feature universality (all personas × all features)
- [ ] `npx tsc --noEmit` passes
- [ ] All existing tests pass

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

### 27.6 Unify all /app/\* pages under shared layout

**Files:** `src/app/(chat)/layout.tsx` (new or modified), `src/app/(chat)/app/` page files
**Ref:** TD-UI-14

**What to do:**

1. Create a shared layout for the `(chat)` route group that provides consistent UI shell for ALL `/app/*` pages.
2. The shared shell must include: ChatSidebar (collapsible) + main content area — matching the existing `/app` and `/app/c/[conversationId]` layout.
3. Ensure `/app/new`, `/app/library`, `/app/personas` get the sidebar (currently they have neither header nor sidebar).
4. Ensure `/app/plans` and `/app/profile` use the same shell (currently they use `RouteGroupLayout` with `ChatHeader` but no sidebar).
5. Remove redundant per-page layout wrapping once the shared layout is in place.
6. Preserve responsive behavior — sidebar collapses on mobile.

**Acceptance criteria:**

- [ ] ALL `/app/*` pages share the same sidebar + main content layout
- [ ] Sidebar is visible and functional on all `/app/*` pages (desktop)
- [ ] Sidebar collapses correctly on mobile across all `/app/*` pages
- [ ] Navigation between `/app/*` pages is visually seamless (no layout shifts)
- [ ] Existing chat page and conversation page behavior unchanged
- [ ] E2E tests for app shell navigation still pass
- [ ] `npx tsc --noEmit` passes
- [ ] All tests pass

---

### 27.7 User profile — add edit capabilities and account deletion

**Files:** `src/app/(chat)/app/profile/page.tsx`, `src/components/sections/profile-hero.tsx`, `src/lib/actions/user.actions.tsx`
**Ref:** TD-UI-15, TD-ACT-02

**What to do:**

1. Add edit form to profile page for: first name, last name, email address, avatar image.
   - First/last name: text input fields with save button.
   - Email: text input (note: may also need Clerk update — verify sync requirement).
   - Avatar: file upload via `/api/upload` with preview, store URL in `User.userimg`.
2. Wire edit form to existing `updateUser()` server action (already exists, not wired to UI).
3. Add "Delete My Account" button with confirmation dialog.
4. Implement comprehensive account self-deletion:
   - Delete all user Tasks (conversations)
   - Delete all user Transactions
   - Delete all S3 assets under user prefix (`deleteS3Prefix`)
   - Delete MongoDB User record
   - Sign out from Clerk (`clerk.signOut()` client-side after server deletion)
5. Update `deleteUser()` action to handle full cleanup (currently only deletes MongoDB User).

**Acceptance criteria:**

- [ ] User can edit first name, last name on profile page
- [ ] User can edit email (with Clerk sync if required)
- [ ] User can upload/change avatar image
- [ ] User can delete their own account with confirmation
- [ ] Account deletion removes: User, Tasks, Transactions, S3 assets
- [ ] After deletion, user is signed out and redirected to homepage
- [ ] Owner-only access enforced — user can only edit/delete their own profile
- [ ] `npx tsc --noEmit` passes
- [ ] All tests pass

---

## Phase 26: Deferred Features — ON HOLD

> **ON HOLD until Phase 27 (all subtasks 27.1–27.7) is PM-approved complete.**
> Lower priority items deferred from v1 core.
> Depends on: Phase 27 complete.

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

> **Completed phases** are archived in [`DONE.md`](DONE.md).
> HF-1 through HF-9.2 complete. Phases 1–25.7 complete.
> Phase 10–12 superseded (see DONE.md for mapping).

# Droplet — TODO

> Prioritized, actionable development tasks. Each task max ~30 minutes.
> Governed by **Droplet-PM**. Do not add tasks without PM approval.
> Ref: `SPEC.md` for full specification. `AGENTS.md` for coding rules. `DONE.md` for completed phases.
> Implementation agent: **Droplet-Engineer** (Senior Developer).
>
> **STATUS: PM audit #85 (2026-04-03). DEPLOYED TO PRODUCTION. All 7 validation gates GREEN (606 tests, lint 0/0, TSC clean, build passes, knip 0). All Milestones 0–25 COMPLETE. Phase 185 DONE. Phase 180.1 DONE. C2 Stripe RESOLVED. C3 Facebook CLOSED. Owner directive: remove ALL video generation + increase token limits.**
>
> **GATE STATUS: Validation GREEN. Architecture GREEN. Product YELLOW (video gen removal pending, ~12 hardcoded marketing strings remain). Admin YELLOW (hardcoded strings). Public GREEN. Contract GREEN.**
>
> **OWNER DIRECTIVES (PM audit #85):**
>
> - 🔴 Remove ALL video generation from the app entirely. Both `sora-2` and `sora-2-pro` are deprecated. HIGH priority.
> - 🔴 Increase Token Limits by Plan and Task Class to the maximum possible.
>
> **EXECUTION ORDER (PM audit #85):**
>
> 1. **🔴 Phase 186-A — ENGINEER** — Remove ALL video generation from codebase (58 files, see task below).
> 2. **🔴 Phase 186-B — ENGINEER** — Increase token limits to maximum (ai-model-policy.ts).
> 3. **HIGH Phase 180.2** — Chat display text extraction (chat-intro + chat-input).
> 4. **HIGH Phase 180.3** — Plans display text extraction (plans-section + plan-card).
> 5. **HIGH Phase 180.4** — Currency symbol compliance (profile-billing).
> 6. **MEDIUM Phase 143** — Env var runtime validation.
> 7. **MEDIUM Phase 144** — Admin config cache.
> 8. **MEDIUM Phase 145–165** — Remaining backlog.

---

## ✅ Phase 185 — Remove `sora-2-pro` — DONE (2026-04-02)

> Archived in DONE.md.

---

## ✅ Phase 180.1 — Homepage Marketing Text Extraction — DONE (2026-04-03)

> Archived in DONE.md.

---

## 🔴 ENGINEER START HERE — Phase 186-A — Remove ALL Video Generation from Codebase

> Owner directive (2026-04-03): Both `sora-2` and `sora-2-pro` are deprecated. Remove ALL video generation entirely. HIGH priority.
> This is a deletion-heavy phase — no new features, just surgical removal.

### Files to DELETE entirely:

1. `src/lib/utils/openai/generateVideo.tsx` — Video generation utility
2. `src/components/shared/video-player.tsx` — VideoPlayer component
3. `tests/unit/utils/generate-video.test.tsx` — Video generation tests

### Files to MODIFY — Backend (remove video code paths):

4. `src/lib/utils/ai-model-policy.ts`:
   - Remove `"video_generation"` from `FeatureType` union
   - Remove `videoGenerationModel` from `ModelPolicyModelOverrides`
   - Remove all 3 plan `video_generation` policy blocks (lite/pro/premium)
   - Remove `"sora-2"` from `MODEL_PRICING`
   - Remove `if (feature === "video_generation")` from `getDefaultTaskClass`
   - Remove video generation admin override block from `resolveModelPolicy`

5. `src/lib/utils/openai/generateResponse.tsx`:
   - Remove `import { generateVideo }` import
   - Remove `"video"` from all `limitType` unions
   - Remove `"video_limit_reached"`, `"video_disabled"` from `BlockedReason`
   - Remove `generatedVideo` from response payload type
   - Remove `"video_generation"` from feature unions
   - Remove entire `getGeneratedVideo` handler block (~105 lines)
   - Remove `supportsVideoGeneration` from `getChatTools` calls

6. `src/app/api/openai/route.tsx`:
   - Remove `"video"` from `MediaUsageLimitType`
   - Remove `"video_limit_reached"` from stop reason checks
   - Remove video cases from `resolveMediaCounterField`
   - Remove `videoGenerations`/`trialVideoGenerations` from `atomicMediaSlot`
   - Remove `videoGenerationModel` from model overrides
   - Remove `videoUsage = checkUsageLimit(...)` block
   - Remove `videoUsage.didReset` from reset condition
   - Remove video fields from period reset
   - Remove `videoLimitReached` variable + entitlements pass
   - Remove `video:` from plan limits for trial/plan check

7. `src/lib/utils/resolve-entitlements.tsx`:
   - Remove `supportsVideoGeneration` field
   - Remove `videoLimitReached` field
   - Remove all video-related assignments in suspended/admin/normal paths

8. `src/constants/openai.tsx`:
   - Remove entire `videoGenerationTool` definition
   - Remove from `ChatTool` type union
   - Remove `supportsVideoGeneration` param from `getChatTools()`

9. `src/constants/plans.tsx`:
   - Remove `video: number` from `PlanLimits` type
   - Remove `video:` from all `PLAN_LIMITS` entries (Lite, Pro, Premium)
   - Remove `video:` from `PERSONA_TRIAL_LIMITS`
   - Remove `video: number` from `PersonaTrialLimits`
   - Remove video from `trialLimitsLabel`
   - Remove video generation inclusion rows from all 3 plans

10. `src/constants/stop-reasons.ts`:
    - Remove `"video_limit_reached"` from `STOP_REASONS`
    - Remove `video_limit_reached` message from `STOP_REASON_MESSAGES`

11. `src/constants/admin-options.ts`:
    - Remove `VIDEO_MODEL_OPTIONS` export entirely

12. `src/constants/persona-prompts.ts`:
    - Change `"images, audio, and video"` to `"images and audio"` in `CHAT_PLATFORM_PROMPT`

13. `src/constants/assistant-personas.tsx`:
    - Replace video-related Creator sample prompt ("Give me 10 video ideas...") with a non-video creative prompt

### Files to MODIFY — Types:

14. `src/types/index.tsx`:
    - Remove `"video_url"` from `ContentItem` type union
    - Remove `video_url` field

15. `src/types/PlanData.d.tsx`:
    - Remove `videoGenerations` field
    - Remove `trialVideoGenerations` field

16. `src/types/TaskData.d.tsx`:
    - Remove `"video_limit_reached"` from `StopReason` union

17. `src/types/AdminData.d.tsx`:
    - Remove `videoModel` field

### Files to MODIFY — Database Models:

18. `src/lib/database/models/user.model.tsx`:
    - Remove `videoGenerations` field from plan schema
    - Remove `trialVideoGenerations` field from trialUsage schema

19. `src/lib/database/models/tasks.model.tsx`:
    - Remove `video_url` field from `ContentItemSchema`
    - Keep `"video_limit_reached"` in `endedReason` enum with deprecation comment (`// Deprecated: retained for backward compat with existing tasks`)

### Files to MODIFY — Frontend:

20. `src/components/chat/chat-body.tsx`:
    - Remove `VideoPlayer` import
    - Remove `video_url` content rendering blocks

21. `src/components/chat/library-tabs.tsx`:
    - Remove `videos` prop and `videosPagination` prop
    - Remove `"videos"` from `LibraryTabId`
    - Remove Videos tab definition
    - Remove Videos tab panel
    - Remove `LibraryVideoCard` component

22. `src/app/(chat)/app/library/page.tsx`:
    - Remove `"videos"` from `LibraryTabId`
    - Remove all video query/pagination/mapping logic
    - Remove `videos`/`videosPagination` props from `LibraryTabs`

23. `src/components/sections/profile/profile-usage.tsx`:
    - Remove `videoUsed` prop
    - Remove Video Generations usage bar

24. `src/app/(chat)/app/profile/page.tsx`:
    - Remove `videoUsed` variable + prop

### Files to MODIFY — Admin:

25. `src/components/admin/settings/admin-models-section.tsx`:
    - Remove `video` from `modelOptions` type
    - Remove "Default Video Model" dropdown block

26. `src/components/admin/settings/admin-limits-section.tsx`:
    - Remove Video Generations limit inputs (all plans + trial)

27. `src/components/admin/settings/normalize-admin-settings.ts`:
    - Remove `videoModel` normalization
    - Remove `video:` from all plan limit normalizations
    - Remove `video:` from trial limit normalization

28. `src/components/admin/users/admin-users-table.tsx`:
    - Remove `video` from media usage type + display

29. `src/app/(admin)/admin/settings/page.tsx`:
    - Remove `VIDEO_MODEL_OPTIONS` import + prop

30. `src/app/(admin)/admin/users/[userId]/page.tsx`:
    - Remove Video Generations usage row + trial video usage

31. `src/lib/actions/admin.actions.tsx`:
    - Remove `videoModel` from form parsing
    - Remove `video:` from all plan limit parsing
    - Remove `video:` from trial limit parsing

32. `src/lib/utils/admin-queries.ts`:
    - Remove `videoGenerations`/`trialVideoGenerations` from types
    - Remove "Video Generated" dashboard metric card
    - Remove video from user table usage display
    - Remove video from user detail display
    - Remove `videoModel` from admin query defaults

### Files to MODIFY — Other utilities:

33. `src/lib/utils/effective-model-config.ts`:
    - Remove `videoModel` field + resolver

34. `src/lib/utils/effective-plan-config.ts`:
    - Remove `video:` from all plan limit normalizations + trial

35. `src/lib/utils/openai/filterAssistantMsg.tsx`:
    - Remove `video_url` filter condition

36. `src/lib/utils/task-queries.tsx`:
    - Remove `"video_url"` from `MediaContentType` union
    - Remove all `video_url` references in aggregation/mapping

37. `src/lib/utils/validation-schemas.ts`:
    - Remove `"video_url"` from Zod enum
    - Remove `video_url` field from schema

38. `src/lib/actions/user.actions.tsx`:
    - Remove `videoGenerations` from plan schema

39. `src/lib/actions/task.actions.tsx`:
    - Remove `"video_limit_reached"` from stop reasons
    - Remove `video_url` from URL collection

40. `src/app/api/webhooks/stripe/route.tsx`:
    - Remove `videoGenerations: 0` from checkout reset

41. `src/app/(public)/about/page.tsx`:
    - Remove "including video" text

42. `vitest.config.mts`:
    - Remove `video-player.tsx` from coverage exclude

### Files to MODIFY — Tests (remove video references):

43. `tests/unit/utils/generate-response.test.tsx` — Remove video mocks, imports, 2 test cases, `supportsVideoGeneration` refs
44. `tests/unit/utils/resolve-entitlements.test.ts` — Remove `supportsVideoGeneration` assertions
45. `tests/unit/utils/ai-model-policy.test.ts` — Remove/update premium video model test case
46. `tests/unit/utils/effective-model-config.test.ts` — Remove `videoModel` refs
47. `tests/unit/utils/effective-plan-config.test.ts` — Remove `video:` refs
48. `tests/unit/utils/admin-queries.test.ts` — Remove `videoGenerations`/`trialVideoGenerations` refs
49. `tests/unit/utils/task-queries.test.ts` — Remove `video_url` test data
50. `tests/unit/utils/filter-assistant-msg.test.tsx` — Remove/update `video_url` test data
51. `tests/unit/routes/openai-route-auth-validation.test.ts` — Remove `supportsVideoGeneration`, `videoGenerations`
52. `tests/unit/routes/openai-route-streaming.test.ts` — Remove `videoGenerations`
53. `tests/unit/routes/openai-route-resilience.test.ts` — Remove `videoGenerations`
54. `tests/unit/routes/openai-route-media.test.ts` — Remove `videoGenerations`
55. `tests/unit/routes/openai-route-conversation-stop.test.ts` — Remove `videoGenerations`
56. `tests/unit/routes/stripe-webhook-route.test.ts` — Remove `videoGenerations`
57. `tests/unit/constants/plans.test.ts` — Remove video generation label assertions
58. `tests/unit/components/chat-body.test.tsx` — Remove `video_limit_reached` test data
59. `tests/unit/components/chat-wrapper.test.tsx` — Remove video limit messages
60. `tests/unit/components/library-tabs-media-cards.test.tsx` — Remove video props + tests
61. `tests/unit/components/library-tabs-keyboard.test.tsx` — Remove video props + update tab tests
62. `tests/unit/components/profile-hero.test.tsx` — Remove `videoGenerations`
63. `tests/unit/components/profile-danger-zone.test.tsx` — Remove `videoGenerations`
64. `tests/unit/components/plan-promo.test.tsx` — Remove `videoGenerations`
65. `tests/unit/components/plan-card.test.tsx` — Remove video inclusion assertion
66. `tests/unit/actions/task-actions.test.ts` — Remove `video_url` test data
67. `tests/unit/actions/admin-actions-behavior.test.ts` — Remove `videoModel`
68. `tests/unit/actions/admin-actions-auth.test.ts` — Remove `videoModel`
69. `tests/unit/test-support/factories.ts` — Remove `videoGenerations`, `trialVideoGenerations`

### Backward Compatibility:

- **Keep `"video_limit_reached"` in `tasks.model.tsx` `endedReason` enum** with deprecation comment. Removing it would break reads of existing tasks that ended for this reason.
- Existing `video_url` fields in MongoDB documents become orphaned — Mongoose ignores unknown fields on read. Acceptable.
- Existing MP4 files in S3 under `{userId}/videos/` paths remain. Schedule S3 cleanup separately if needed.

### Acceptance criteria:

- [ ] Zero `sora` references in `src/` (except backward compat comment)
- [ ] Zero `video_generation` references in `src/`
- [ ] Zero `video_url` references in `src/` (except deprecated schema comment)
- [ ] Zero `videoGenerations` references in `src/` (except deprecated user model field comment if kept)
- [ ] Zero `VideoPlayer` references in `src/`
- [ ] Zero `VIDEO_MODEL_OPTIONS` references in `src/`
- [ ] `generateVideo.tsx` deleted
- [ ] `video-player.tsx` deleted
- [ ] `generate-video.test.tsx` deleted
- [ ] Library shows 4 tabs (Chats, Images, Audios, Uploaded) — no Videos tab
- [ ] Profile usage shows Image + Audio only — no Video bar
- [ ] Admin settings — no video model selector, no video limits inputs
- [ ] Plan cards — no video generation inclusion rows
- [ ] All tests pass, build passes, knip clean

---

## 🔴 Phase 186-B — Increase Token Limits to Maximum

> Owner directive (2026-04-03): Increase Token Limits by Plan and Task Class to the maximum possible.

**File:** `src/lib/utils/ai-model-policy.ts`

**Current → New token limits:**

| Plan    | Task Class | Model        | Current Input → New Input | Current Output → New Output |
| ------- | ---------- | ------------ | ------------------------- | --------------------------- |
| Lite    | simple     | gpt-4o-mini  | 8,000 → 32,000            | 600 → 4,096                 |
| Lite    | standard   | gpt-4o-mini  | 12,000 → 64,000           | 900 → 8,192                 |
| Lite    | complex    | gpt-4o-mini  | 14,000 → 128,000          | 1,200 → 16,384              |
| Pro     | simple     | gpt-4.1      | 12,000 → 64,000           | 700 → 8,192                 |
| Pro     | standard   | gpt-4.1      | 24,000 → 128,000          | 1,400 → 16,384              |
| Pro     | complex    | gpt-4.1      | 32,000 → 200,000          | 2,000 → 32,768              |
| Premium | simple     | gpt-4.1      | 16,000 → 128,000          | 900 → 16,384                |
| Premium | standard   | gpt-4.1      | 32,000 → 200,000          | 1,800 → 32,768              |
| Premium | complex    | gpt-4.1      | 48,000 → 500,000          | 2,800 → 32,768              |
| Title   | utility    | gpt-4.1-nano | 1,200 → 1,200             | 20 → 20                     |

**Model context window maximums (for reference):**

- gpt-4o-mini: 128K context, 16,384 output
- gpt-4.1: 1M context, 32,768 output
- gpt-4.1-nano: 1M context, 32,768 output

**Cost note:** Higher limits = higher per-request cost ceiling. gpt-4o-mini is cheap ($0.15/$0.60 per M). gpt-4.1 is 13x more expensive ($2/$8 per M).

**Tests to update:** `tests/unit/utils/ai-model-policy.test.ts` — update token limit assertions if any exist.

**Acceptance criteria:**

- [ ] All 9 chat token limits updated per table above
- [ ] Title generation limits unchanged (1,200/20)
- [ ] Build passes, tests pass

## ✅ Phase 180.1 — DONE (2026-04-03). Archived in DONE.md.

---

## HIGH — Phase 180.2 — Chat Display Text Extraction

> Both are Client Components — admin settings must be passed as props from parent Server Components.

**Files:** `src/components/chat/chat-intro.tsx`, `src/components/chat/chat-input.tsx`

**Strings to extract (2-3 configurable):**

1. `chat-intro.tsx`: `"welcome to your chat dashboard."` — greeting subheading
2. `chat-input.tsx`: `"Ask Droplet..."` — input placeholder (brand-adjacent)

**Structural strings (EXEMPT — no extraction):**

- `"Active persona:"` — UI label
- `"This conversation has ended."` — system state indicator
- `"Send message"` / `"Write a message first"` — tooltips
- `"Attach media"` — tooltip
- Error messages — system text

**Acceptance criteria:**

- [ ] Configurable strings flow from admin settings via props
- [ ] Default values match current text
- [ ] Build passes, tests pass

---

## HIGH — Phase 180.3 — Plans Display Text Extraction

**Files:** `src/components/sections/shared/plans-section.tsx`, `src/components/shared/plan-card.tsx`

**Strings to extract (2 configurable):**

1. `plans-section.tsx`: `"Subscribe Now"` — CTA button label
2. `plan-card.tsx`: `"Popular"` — marketing badge

**Structural strings (EXEMPT — no extraction):**

- `"Current"` — plan status badge
- `"Free"` — pricing display
- `"/Mo"` — billing period abbreviation

**Acceptance criteria:**

- [ ] Both configurable strings flow from admin settings
- [ ] Default values match current text
- [ ] Build passes, tests pass

---

## HIGH — Phase 180.4 — Currency Symbol Compliance

> SPEC.md Section 4, Rule 8: "Currency symbol must be admin-configurable. Resolved via `getEffectiveCurrencySymbol()`."

**File:** `src/components/sections/profile/profile-billing.tsx`

**Issue:** Line 55 uses hardcoded `$` in `${txn.amount}`. Should use `getEffectiveCurrencySymbol()`.

**What to do:**

1. Pass currency symbol as prop from parent Server Component (which calls `getEffectiveCurrencySymbol()`).
2. Replace `$` with the prop value in the template literal.

**Acceptance criteria:**

- [ ] Currency symbol resolved from admin setting
- [ ] Default remains `$` (USD)
- [ ] Build passes, tests pass

---

## MEDIUM — Phase 143 — Env Var Runtime Validation

> 8 unsafe `process.env` casts: 4 `as string` + 4 `!`. Missing env vars produce cryptic runtime crashes.

**What to do:**

1. Create a shared `requireEnv(name: string): string` utility that throws with a clear message if undefined.
2. Replace all `process.env.VAR as string` and `process.env.VAR!` with `requireEnv("VAR")`.

**Acceptance criteria:**

- [ ] Zero `as string` on `process.env` in codebase
- [ ] Zero `!` on `process.env` in codebase
- [ ] Build passes, tests pass

---

## MEDIUM — Phase 144 — Admin Config In-Memory Cache

> 5+ DB round trips per `/api/openai` request for admin settings that change infrequently.

**What to do:**

1. Create `src/lib/utils/config-cache.ts` — simple in-memory cache with 30s TTL.
2. Wrap each `getEffective*` resolver's DB calls in the cache.

**Acceptance criteria:**

- [ ] Admin config queries cached with 30s TTL
- [ ] Build passes, tests pass

---

## MEDIUM — Phase 145 — Upload Filename Collision Prevention

**File:** `src/app/api/upload/route.tsx`

**What to do:** Replace `Date.now()` with `crypto.randomUUID()` in upload filename generation.

**Acceptance criteria:**

- [ ] Upload filenames use `crypto.randomUUID()`
- [ ] Build passes

---

## MEDIUM — Phase 165 — Checkout Success Page DB Polling

> After Stripe redirects to checkout success, webhook may not have processed yet. User sees "success" but plan is still Lite.

**What to do:**

1. Add a client component that polls a plan-status endpoint every 3-5s for up to 30s.
2. Show "Confirming your plan upgrade..." initially.
3. On confirmation: "Plan upgraded successfully!" with green indicator.
4. On timeout: "Payment successful. Your plan will be updated shortly."

**Acceptance criteria:**

- [ ] Checkout success page shows plan confirmation status
- [ ] Polling stops after confirmation or 30s timeout
- [ ] Build passes

---

## LOW — Phase 146 — Admin User Detail Transaction Limit

**What to do:** Add `.limit(50)` to the transaction query in `getAdminUserDetail`.

---

## LOW — Phase 147 — Rename `.tsx` Utility Files to `.ts`

**Files:** `handleError.tsx`, `getPlanStatus.tsx`, `getFullName.tsx`, `getFormattedDate.tsx`, `generateString.tsx`

---

## LOW — Phase 148 — Bulk Operations Partial-Failure Reporting

**What to do:** Track successful/failed operations in bulk admin actions, return partial results.

---

## ON HOLD — Deferred

### Phase 29.x — Zod/Zustand app-wide modernization

### Phase 26.x — Persona-aware media prompts, Stripe auto-renewal

### Legal/nav/footer admin configurability — Deferred to v2

### TypeScript 6 / @typescript-eslint compatibility — Monitor

---

> **Completed phases** archived in [`DONE.md`](DONE.md).

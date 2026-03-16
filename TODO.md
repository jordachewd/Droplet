# Droplet — TODO

> Prioritized, actionable development tasks. Each task max ~30 minutes.
> Governed by **Droplet-PM**. Do not add tasks without PM approval.
> Ref: `SPEC.md` for full specification. `AGENTS.md` for coding rules. `DONE.md` for completed phases.
> Implementation agent: **Droplet-Engineer** (Senior Developer).
>
> **STATUS: Phases 1–25.7 + 27.1–27.4 + 27.6–27.10 + 28.1 + 28.2-fix + 28.3-code + 28.3-verify + 28.4 + 28.6 + 28.7 + 30.1 + 30.2 + 30.3 + 31.1 + 31.2 + 31.3 + 31.2-fix + 32.1 + 32.2 + 32.3 + 35.1 complete.**
> **PM deep audit #14 (2026-03-16): 35.1, 28.3-verify, 32.1, 32.2, 32.3 verified DONE. SPEC audio model reconciled (gpt-audio-1.5 → gpt-audio-mini). E2E regression flagged CRITICAL.**
> **CRITICAL: E2E suite degraded from 181→68 passing. Must stabilize before new feature work.**
> **OWNER INSTRUCTIONS: Admin design consistency, admin Usage Top Personas, persona trial access, video gen verification.**
> **Priority order: 37.1 (E2E stabilization) → 32.6 (Library error handling) → 33.1–33.8 (persona trial) → 32.4 (media cards) → 36.1 (admin design) → 36.2 (admin Top Personas) → 31.4 (layout E2E) → 30.4 → 32.5 → 30.5 → 27.5 → 34.x (video gen) → 35.2 → 29.1 → 29.2 → Phase 26.**
> **All Phase 26+ deferred work is ON HOLD until Phases 33 + 36 + 37 are PM-approved complete.**

---

## Phase 37: E2E Test Stabilization — CRITICAL

> PM audit #14 flagged: E2E suite degraded from 181 passing to 68 passing. Exit code 1.
> Must stabilize before any new feature work proceeds.
> **This is a release blocker.**

---

### 37.1 CRITICAL — Investigate and fix E2E test regression

**Files:** `tests/e2e/**/*.spec.ts`, Playwright config
**Ref:** PM audit #14 — E2E degraded from 181→68 passing tests

**Context:** Engineer reports "existing cross-browser failures not isolated to this change set" covering admin/auth/public/app shell flows across chromium/firefox/webkit/mobile projects. Numbers don't reconcile with previous audit (200 total → only 120 accounted for). This needs root-cause analysis.

**What to do:**

1. Run full E2E suite and capture per-spec, per-project results.
2. Categorize failures: (a) flaky/timing, (b) broken by recent changes, (c) pre-existing infrastructure issues, (d) test code vs app code failures.
3. Fix tests broken by 32.x and 35.1 changes (Library tabs, persona selector — these added new DOM elements that may break existing selectors).
4. Fix cross-browser timing issues (known pattern: increase timeouts, use `waitForLoadState`).
5. Skip or mark as known-flaky any tests failing due to browser-specific quirks NOT caused by app code.
6. Target: 170+ passing tests (≥85% of 200 total).

**Acceptance criteria:**

- [ ] Root cause of regression identified and documented
- [ ] Tests broken by 32.x/35.1 changes fixed
- [ ] Cross-browser timing flakes stabilized
- [ ] ≥170 passing tests (target: restore to ~181)
- [ ] Exit code 0 or only known-flaky skips

---

## Phase 32: Library Media Tabs (remaining)

> 32.1 DONE (media aggregation), 32.2 DONE (video_url schema), 32.3 DONE (tabbed Library UI).
> Remaining: 32.4 (media card components), 32.5 (pagination), 32.6 (error handling).

---

### 32.6 HIGH — Fix Library page silent error handling

**Files:** `src/app/(chat)/app/library/page.tsx`
**Ref:** PM audit #14 + Architect audit #13 — Library page catches all errors silently

**Context:** Library page has an empty `catch {}` block that swallows all errors. Users see empty tabs with zero feedback when data fetching fails.

**What to do:**

1. Replace empty `catch {}` with `catch (error) { process.stderr.write(...) }` for server-side logging.
2. Pass an error flag to the client component so empty tabs show "Failed to load" instead of just empty state.
3. Do NOT leak error details to client — use generic message only.

**Acceptance criteria:**

- [ ] Errors logged server-side via `process.stderr.write()`
- [ ] Client sees "Failed to load" message on error (not silent empty)
- [ ] No error details leaked to client
- [ ] `npx tsc --noEmit` passes
- [ ] All tests pass

---

## Phase 35: ChatHeader Persona Selector (remaining)

> 35.1 DONE (persona dropdown selector — archived in DONE.md).
> Remaining: 35.2 (E2E tests).

---

### 35.2 LOW — E2E tests for persona selector in ChatHeader

**Files:** `tests/e2e/chat-app-shell.spec.ts`
**Depends on:** 35.1 complete

**What to do:**

1. Assert persona selector is visible in header on `/app` pages.
2. Assert selector shows correct persona count for plan.
3. Assert selector is disabled during active conversation.

**Acceptance criteria:**

- [ ] E2E covers persona selector visibility and behavior
- [ ] `npm run test:e2e` passes

---

## Phase 28: Media Generation Fixes & Limit Enforcement — COMPLETE

> All tasks completed: 28.1, 28.2-fix, 28.3-code, 28.3-verify, 28.4, 28.6, 28.7.
> Archived in DONE.md. Audio live-test completed: gpt-4o-mini-tts ✅, gpt-audio-mini ✅, gpt-audio-1.5 ❌ (403).
> SPEC reconciled: Premium audio default → gpt-audio-mini (PM decision audit #14).

---

## Phase 30: Persona Policy Implementation (remaining)

> Owner-mandated policy change: per-plan persona gating + new Interviewer persona.
> **30.1 DONE** (Interviewer persona added). **30.2 DONE** (per-plan persona gating). **30.3 DONE** (persona picker UI).
> Remaining: 30.4 (admin persona controls), 30.5 (persona hero images).
> Depends on: Phase 28 remaining subtasks complete.

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
> **31.1 DONE** (ChatHeader in layout). **31.2 DONE** (sidebar toggle to header). **31.3 DONE** (Plans/Profile removed from sidebar).
> Remaining: 31.4 (E2E tests for layout changes).

---

### 31.1 — DONE — archived in DONE.md

### 31.2 — DONE — archived in DONE.md

### 31.3 — DONE — archived in DONE.md

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

## Phase 32: Library Media Tabs (remaining — continued)

> 32.1 DONE (media aggregation), 32.2 DONE (video_url schema), 32.3 DONE (tabbed Library UI), 32.6 DONE-pending (error handling — in Phase 32 remaining above).
> Remaining: 32.4 (media card components), 32.5 (pagination).

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

## Phase 36: Admin Design Consistency & Enhancement — MEDIUM

> Owner-mandated (2026-03-16): Admin panel must respect the same design, fonts, sizes, colors and proportions as client app.
> Owner-mandated (2026-03-16): Admin Usage must have a "Top Personas" statistic box.
> Depends on: Core functionality phases complete (28, 31–33, 35).

---

### 36.1 MEDIUM — Align admin panel design with client app design system

**Files:** `src/app/(admin)/admin/**/*.tsx`
**Ref:** Owner instruction: "ADMIN panel layout and sections must respect the same design, fonts, sizes, colors and proportions and CLIENT app panel layout"
**Depends on:** None (standalone styling task, can run in parallel with functional work)

**What to do:**

1. Audit admin pages for font, color, spacing, and component inconsistencies vs client app.
2. Apply consistent design tokens (fontFamily, fontSize, colors, spacing) from client app to admin pages.
3. Ensure admin uses same card, table, button, form control styling as client app.
4. Maintain admin-specific layout but ensure visual consistency across both panels.
5. Replace any raw JSON editors or plain textareas with proper form controls (inputs, selects, radios, checkboxes).

**Acceptance criteria:**

- [ ] Admin pages use same fonts, colors, and spacing as client app
- [ ] Form controls (inputs, selects, buttons) match client app styling
- [ ] Visual consistency across admin and client panels
- [ ] `npx tsc --noEmit` passes
- [ ] All tests pass

---

### 36.2 MEDIUM — Add "Top Personas" statistic box to Admin Usage page

**Files:** `src/app/(admin)/admin/usage/page.tsx`
**Ref:** Owner instruction: "ADMIN Usage must have a Top Persona(s) statistic box — similar to the other ones — Will reflect the usage of personas by the users."
**Depends on:** UsageEvent model exists (Phase 16 — DONE)

**What to do:**

1. Add a "Top Personas" statistic card to the admin Usage page, styled consistently with existing stat boxes.
2. Query `UsageEvent` collection to aggregate persona usage: group by `personaId`, count total requests per persona, sort descending.
3. Show top 5 personas with request count and percentage of total.
4. Include time-range filter if existing Usage page has one (match UX pattern).
5. Display persona label (not raw ID) using `getPersona()` helper.

**Acceptance criteria:**

- [ ] "Top Personas" stat box visible on admin Usage page
- [ ] Shows top 5 personas ranked by usage count
- [ ] Uses persona labels (not raw IDs)
- [ ] Styled consistently with other admin stat boxes
- [ ] `npx tsc --noEmit` passes
- [ ] All tests pass

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

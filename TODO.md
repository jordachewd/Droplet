# Droplet — TODO

> Prioritized, actionable development tasks. Each task max ~30 minutes.
> Governed by **Droplet-PM**. Do not add tasks without PM approval.
> Ref: `SPEC.md` for full specification. `AGENTS.md` for coding rules. `DONE.md` for completed phases.
> Implementation agent: **Droplet-Engineer** (Senior Developer).
>
> **STATUS: Phases 1–25.7 + 27.1–27.4 + 27.6–27.10 + 28.1 + 28.2-fix + 28.3-code + 28.3-verify + 28.4 + 28.6 + 28.7 + 30.1 + 30.2 + 30.3 + 31.1 + 31.2 + 31.3 + 31.2-fix + 32.1 + 32.2 + 32.3 + 32.6 + 33.1–33.7 + 35.1 + 37.1 complete.**
> **PM deep audit #15 (2026-03-16): 37.1, 32.6, 33.1–33.7 verified DONE. E2E stabilized (176 passed). 334 unit tests passing. Build passing.**
> **OWNER INSTRUCTIONS (latest): Fix error z-index CRITICAL. Move Library/Personas to AvatarMenu. Remove Persona Studio from landing. Admin design consistency. Admin Usage Top Personas.**
> **BUGS: allowedPersonaIds=[] entitlement leak (HIGH). Persona dropdown enabled mid-conversation (MEDIUM). AlertMessage stacking context (CRITICAL).**
> **Priority order: 38.1–38.3 (bug fixes) → 38.4–38.5 (Owner UI) → 36.1–36.2 (admin) → 38.6–38.7 (polish) → 33.8 + 35.2 (E2E) → 32.4 → 30.4 → 32.5 → 30.5 → 27.5 → 34.x → 29.1 → 29.2 → Phase 26.**
> **All Phase 26+ deferred work is ON HOLD until Phase 38 + 36 are PM-approved complete.**

---

## Phase 38: UI Polish, Bug Fixes & Owner UI Restructure — CRITICAL

> PM audit #15 + Architect audit: 2 confirmed bugs + 1 Owner-reported CRITICAL + Owner UI restructure.
> ThePlan.md Milestone 13.
> **Bug fixes FIRST (38.1–38.3). Then Owner UI (38.4–38.5). Then polish (38.6–38.7).**

---

### 38.1 CRITICAL — Fix AlertMessage stacking context (error messages behind ChatHeader)

**Files:** `src/components/chat/chat-wrapper.tsx`, `src/app/(chat)/layout.tsx`
**Ref:** Owner report: "error messages appear behind the ChatHeader; Must be above entire page"

**Root cause:** ChatWrapper's `<main>` element uses `className="... relative z-0"` which creates a new stacking context. AlertMessage inside it uses `fixed z-[100]`, but the `z-[100]` is constrained within the parent's `z-0` stacking context. ChatHeader is rendered in the layout OUTSIDE ChatWrapper, so AlertMessage appears behind it.

**What to do:**

1. **Option A (preferred):** Lift AlertMessage rendering from ChatWrapper to the layout level (`src/app/(chat)/layout.tsx`). Pass alert state up via Zustand store or render AlertMessage in layout.
2. **Option B:** Remove `z-0` from ChatWrapper's `<main>` element if it doesn't break other layering.
3. Verify AlertMessage renders above ChatHeader (`z-20`) on all `/app` pages.

**Acceptance criteria:**

- [ ] AlertMessage always renders above ChatHeader
- [ ] No visual layering regressions on any `/app` page
- [ ] `npx tsc --noEmit` passes
- [ ] All tests pass

---

### 38.2 HIGH — Fix allowedPersonaIds empty array entitlement leak

**Files:** `src/components/chat/chat-header.tsx`, `src/components/chat/chat-wrapper.tsx`
**Ref:** Copilot Code Review — `allowedPersonaIds?.length` treats `[]` as "no restriction"

**Root cause:** In both ChatHeader and ChatWrapper, `allowedPersonaIds?.length ? allowedPersonaIds : PERSONAS.map(...)` treats an empty array `[]` as falsy (`.length === 0`), falling back to ALL personas. If `resolveEntitlements()` returns `allowedPersonaIds: []` (e.g., suspended user), the UI would show all 10 personas.

**What to do:**

1. Distinguish `undefined` (no restriction — backward compat) from `[]` (everything blocked):
   - `undefined` → show all personas
   - `[]` → show no personas (or disable selector)
   - `PersonaId[]` with items → show exactly those
2. Apply the same fix in ChatHeader (`selectablePersonaIds` derivation) and ChatWrapper (`normalizedAllowedPersonaIds` derivation).

**Acceptance criteria:**

- [ ] `allowedPersonaIds=undefined` → all personas shown
- [ ] `allowedPersonaIds=[]` → no personas shown / selector disabled
- [ ] `allowedPersonaIds=["strategist","developer"]` → only those shown
- [ ] `npx tsc --noEmit` passes
- [ ] All tests pass

---

### 38.3 MEDIUM — Fix ChatHeader persona dropdown: disable when messages exist

**Files:** `src/components/chat/chat-header.tsx`
**Ref:** Copilot Code Review — persona dropdown only disabled on `/app/c/` routes

**Root cause:** `isConversationRoute` only checks `pathname?.startsWith("/app/c/")`. On `/app` or `/app/new`, when a user already has messages in the conversation, the dropdown remains enabled. Changing persona mid-conversation breaks system prompt continuity without resetting messages.

**What to do:**

1. Read `messages` from `useChatStore` (already imported).
2. Change disable condition to: `const shouldDisablePersonaChange = isConversationRoute || messages.length > 0 || taskStatus === "ended"`.
3. Apply to the `<select>` `disabled` prop.

**Acceptance criteria:**

- [ ] Persona dropdown disabled on `/app/c/[conversationId]` routes
- [ ] Persona dropdown disabled when `messages.length > 0`
- [ ] Persona dropdown disabled when `taskStatus === "ended"`
- [ ] Persona dropdown enabled on `/app`, `/app/new` (with no messages)
- [ ] `npx tsc --noEmit` passes
- [ ] All tests pass

---

### 38.4 HIGH — Move Library and Personas from sidebar to AvatarMenu

**Files:** `src/components/chat/sidebar/chat-sidebar-nav-v2.tsx`, `src/components/shared/avatar-menu.tsx`
**Ref:** Owner instruction: "no need of Personas and Library on the sidebar — move under AvatarMenu"

**What to do:**

1. Remove "Library" from `WORKSPACE_LINKS` in sidebar nav.
2. Remove "Personas" from `DISCOVER_LINKS` in sidebar nav.
3. Remove the DISCOVER section entirely from sidebar (if empty after removal).
4. Add "Library" (`/app/library`, icon `bi-clock-history`) to AvatarMenu — between Dashboard (admin) and Plans.
5. Add "Personas" (`/app/personas`, icon `bi-grid-3x3-gap`) to AvatarMenu — between Library and Plans.
6. Update E2E test assertions if sidebar link counts changed.

**Acceptance criteria:**

- [ ] Library and Personas links removed from sidebar
- [ ] Library and Personas links present in AvatarMenu dropdown
- [ ] Sidebar has only: Chat Dashboard, New Conversation, recent conversations
- [ ] DISCOVER section removed from sidebar
- [ ] AvatarMenu order: Dashboard (admin only) → Library → Personas → Plans → Profile → Logout
- [ ] `npx tsc --noEmit` passes
- [ ] All tests pass

---

### 38.5 HIGH — Remove ChatPersonaPicker section from landing page

**Files:** `src/components/chat/chat-wrapper.tsx`
**Ref:** Owner instruction: "we no longer need Persona Studio on /app landing page — remove it"

**Context:** Since persona selection now lives in ChatHeader dropdown (Phase 35.1), the ChatPersonaPicker section rendered in ChatWrapper is redundant on the `/app` landing page. The ChatPersonaPicker component file itself must be KEPT — it's still used on `/app/personas` page.

**What to do:**

1. Remove the `<ChatPersonaPicker>` section from ChatWrapper's render output.
2. Remove related props (`allowedPersonaIds`, `personaAccess`, `onSelectPersona`) from ChatWrapper if they were only used for the picker.
3. Keep `ChatPersonaPicker` component file — still used by `/app/personas`.
4. Verify `/app` landing and `/app/new` no longer show persona cards grid.

**Acceptance criteria:**

- [ ] No persona picker/studio on `/app` or `/app/new` pages
- [ ] ChatPersonaPicker component file preserved for `/app/personas`
- [ ] ChatHeader persona dropdown still works for persona selection
- [ ] `npx tsc --noEmit` passes
- [ ] All tests pass

---

### 38.6 LOW — Skip video_url aggregation in Library page

**Files:** `src/app/(chat)/app/library/page.tsx`
**Ref:** Copilot Code Review — Library fetches video_url but Videos tab shows "Coming Soon"

**What to do:**

1. Remove `getMediaItemsByUserId(userId, "video_url", 60)` from the `Promise.all()`.
2. Pass `videoItems = []` directly to the tabs component.
3. Keep the Videos tab in the UI (still shows "Coming Soon").

**Acceptance criteria:**

- [ ] No video_url aggregation query executed
- [ ] Videos tab still renders "Coming Soon" with 0 count
- [ ] `npx tsc --noEmit` passes
- [ ] All tests pass

---

### 38.7 LOW — Add accessible name to Logo when iconOnly

**Files:** `src/components/shared/app-logo.tsx`
**Ref:** Copilot Code Review — no accessible name when iconOnly hides text label

**What to do:**

1. Add `aria-label="Droplet home"` to the `<Link>` when `iconOnly={true}`.
2. Only apply when `iconOnly` is true (otherwise the visible "droplet" text serves as accessible name).

**Acceptance criteria:**

- [ ] Screen readers announce "Droplet home" when Logo is icon-only
- [ ] Full logo with text has no redundant aria-label
- [ ] `npx tsc --noEmit` passes

---

## Phase 37: E2E Test Stabilization — COMPLETE

> **37.1 DONE** — E2E suite stabilized: 176 passed, 24 skipped, 0 failures. Archived in DONE.md.

---

## Phase 32: Library Media Tabs (remaining)

> 32.1 DONE (media aggregation), 32.2 DONE (video_url schema), 32.3 DONE (tabbed Library UI), **32.6 DONE** (error handling).
> Remaining: 32.4 (media card components), 32.5 (pagination).

---

### 32.4 LOW — Media card components for Library

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

## Phase 33: Persona Trial Access System — MOSTLY COMPLETE

> **33.1–33.7 DONE** — Core trial system implemented and verified. Archived in DONE.md.
> Remaining: **33.8** (trial E2E tests).

---

### 33.8 MEDIUM — E2E tests for persona trial access flow

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

## Phase 35: ChatHeader Persona Selector — COMPLETE

> **35.1 DONE** (persona dropdown selector — archived in DONE.md).
> **35.2** (E2E tests) — merged into Phase 38 test coverage.

---

## Phase 28: Media Generation Fixes & Limit Enforcement — COMPLETE

> All tasks completed. Archived in DONE.md.

---

## Phase 36: Admin Design Consistency & Enhancement — MEDIUM

> Owner-mandated (2026-03-16): Admin panel must respect the same design, fonts, sizes, colors and proportions as client app.
> Owner-mandated (2026-03-16): Admin Usage must have a "Top Personas" statistic box.
> Depends on: Phase 38 bug fixes complete.

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

## Phase 30: Persona Policy Implementation (remaining)

> 30.1 DONE (Interviewer persona), 30.2 DONE (per-plan persona gating), 30.3 DONE (persona picker UI).
> Remaining: 30.4 (admin persona controls), 30.5 (persona hero images).

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

## Phase 31: Layout & Navigation Updates (remaining)

> 31.1 DONE (ChatHeader in layout), 31.2 DONE (sidebar toggle to header), 31.3 DONE (Plans/Profile from sidebar).
> Remaining: 31.4 (E2E tests).

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

## Phase 27: UX & Architecture Completion (remaining)

> 27.1–27.4 + 27.6–27.10 DONE. Remaining: 27.5 (settings propagation).
> **ON HOLD until Phase 38 + 36 + 33.8 are PM-approved complete.**

---

### 27.5 LOW — Admin settings — propagate pricing & limits to plan cards

**Files:** `src/constants/plans.tsx`, `src/lib/utils/resolve-entitlements.tsx`, `src/lib/utils/check-usage-limit.ts`, `src/lib/utils/admin-queries.ts`, plan card components
**Ref:** TD-ADMIN-02

**What to do:**

1. Create a server-side utility (e.g., `getEffectivePlanConfig()`) that reads `AppSetting` values for pricing and limits, falling back to hardcoded `PLAN_LIMITS` defaults.
2. Wire plan card components to use effective config instead of static constants.
3. Wire entitlement resolver and usage limit checks to use effective config.
4. Ensure admin changes take effect on next page load.
5. Add cache-control / `revalidatePath` so changes propagate without stale data.

**Acceptance criteria:**

- [ ] Plan cards show prices from AppSetting (or defaults)
- [ ] Entitlement resolver uses limits from AppSetting (or defaults)
- [ ] Admin saves new price → plan cards reflect on next load
- [ ] Fallback to hardcoded defaults when AppSetting is empty
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

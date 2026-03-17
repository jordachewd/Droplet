# Droplet — TODO

> Prioritized, actionable development tasks. Each task max ~30 minutes.
> Governed by **Droplet-PM**. Do not add tasks without PM approval.
> Ref: `SPEC.md` for full specification. `AGENTS.md` for coding rules. `DONE.md` for completed phases.
> Implementation agent: **Droplet-Engineer** (Senior Developer).
>
> **STATUS: Phases 1–25.7 + 27.1–27.5 + 27.6–27.10 + 28.1 + 28.2-fix + 28.3-code + 28.3-verify + 28.4 + 28.6 + 28.7 + 30.1 + 30.2 + 30.3 + 30.4 + 31.1 + 31.2 + 31.3 + 31.2-fix + 32.1 + 32.2 + 32.3 + 32.4 + 32.6 + 33.1–33.8 + 35.1 + 37.1 + 38.1–38.7 + 36.1–36.2 + 39.1 + 40.1 + 40.2 complete.**
> **PM deep audit #20 (2026-03-17): 32.4 VERIFIED DONE (Architect code audit + PM gateway verification). Library media card components complete with secure URL handling.**
> **359 unit tests passing (65 suites). 180 E2E passing. 48 skipped (explained: Chromium-only trial spec × 6 non-Chromium projects). Build passing.**
> **OWNER INSTRUCTIONS (latest, 2026-03-17): Persona restructure (10→6), critical bug fixes, admin panel redesign, plan card UI.**
> **CRITICAL BUGS FIXED: Chat generation error (40.1), persona access gating (40.2).**
> **Priority order: 41.1 → 41.2 → 41.3 → 41.4 → 42.1 → 42.2 → 42.3 → 43.1 → 43.2 → 43.3 → 43.4 → 32.5 → 31.4 → 34.x → 29.1 → 29.2 → Phase 26.**
> **All Phase 26+ deferred work is ON HOLD until Milestone 17 is PM-approved complete.**

---

## Phase 40: Critical Bug Fixes (Owner-Directed, 2026-03-17) — DONE

> **CRITICAL priority. Resolved.**

---

### 40.1 CRITICAL — Fix chat generation "Invalid request body" error — DONE

**Ref:** Owner report: after client user authentication, chat and any type of generation returns ERROR "Request failed. Invalid request body."

**Root cause:** Zod schema `openAiRequestBodySchema` used `.optional()` for `taskId` and `personaId`, but client sends `null` (not `undefined`) via JSON for new conversations. `.optional()` only accepts `undefined`; `null` fails validation.

**Fix:** Changed both fields to `.nullable().optional()`. Downstream code already handles null via truthy checks.

**What was done:**

1. ~~Reproduce the error with authenticated user.~~ Root cause identified via code analysis.
2. ~~Inspect `/api/openai` route request body construction and Zod validation.~~ Found `.optional()` vs `.nullable()` mismatch.
3. ~~Check if streaming payload, persona selection, or message format changed and caused incompatibility.~~ JSON serialization preserves `null` but `.optional()` only accepts `undefined`.
4. ~~Fix the root cause and verify chat works end-to-end.~~ Fix applied, regression tests added.

**Acceptance criteria:**

- [x] Chat generation works for authenticated Lite, Pro, and Premium users
- [x] Image and audio generation work without "Invalid request body" error
- [x] `npx tsc --noEmit` passes
- [x] All tests pass (14 new regression tests in `validation-schemas.test.ts`)

---

### 40.2 CRITICAL — Fix persona access gating enforcement — DONE

**Ref:** Owner report: all personas are available for Lite and Pro plans despite plan-gating rules.

**Root cause:** `DEFAULT_FULL_PERSONA_ACCESS_BY_PLAN` had wrong defaults — included `best-friend` for Lite and companion personas for Pro; `creator` was missing from Pro.

**Fix:** Corrected defaults to match AGENTS.md rule #3: Lite=[strategist,developer], Pro=[strategist,developer,teacher,creator,wellness]. Added `getRequiredPlanForPersona()` utility and PRO/PREMIUM upgrade labels in PersonaCard, PersonasSection, and ChatPersonaPicker.

**What was done:**

1. ~~Verify `resolveEntitlements()` correctly gates personas per plan.~~ Fixed `DEFAULT_FULL_PERSONA_ACCESS_BY_PLAN`.
2. ~~Check if admin AppSetting overrides are set too broadly.~~ Code handles overrides correctly; defaults were wrong.
3. ~~Verify ChatHeader dropdown and ChatPersonaPicker enforce persona access.~~ ChatHeader only shows allowed personas. ChatPersonaPicker updated with plan labels.
4. ~~Ensure `/api/openai` route rejects requests for non-accessible personas.~~ Already enforced (returns 403 for blocked).
5. ~~Add PRO/PREMIUM small-font label indicator on unavailable personas.~~ Added to PersonaCard, PersonasSection, ChatPersonaPicker.

**Acceptance criteria:**

- [x] Lite users see 2 full-access + 8 trial personas (10 total; becomes 2+4=6 after Phase 41)
- [x] Pro users see 5 full-access + 5 trial personas (10 total; becomes 5+1=6 after Phase 41)
- [x] Unavailable personas show "PRO" or "PREMIUM" label
- [x] API rejects conversations with blocked personas
- [ ] API rejects conversations with blocked personas
- [ ] `npx tsc --noEmit` passes
- [ ] All tests pass

---

## Phase 41: Persona Restructure (Owner-Directed, 2026-03-17) — DONE

> **HIGH priority. After Phase 40. All sub-phases complete.**

---

### 41.1 HIGH — Remove companion personas (Best Friend, Boyfriend, Girlfriend)

**Files:** `src/constants/assistant-personas.tsx`, `src/constants/persona-prompts.ts`, `src/types/PersonaData.d.tsx`, `src/lib/utils/resolve-entitlements.tsx`, `src/lib/utils/effective-persona-access.ts`, UI components

**What to do:**

1. Remove `best-friend`, `boyfriend`, `girlfriend` entries from `PERSONAS` array in `assistant-personas.tsx`.
2. Remove from `PersonaId` type union in `PersonaData.d.tsx`.
3. Remove COMPANION_SAFETY_RULES and companion persona prompts from `persona-prompts.ts`.
4. Remove from `DEFAULT_FULL_PERSONA_ACCESS_BY_PLAN` in `resolve-entitlements.tsx`.
5. Remove from `VALID_PERSONA_ID_SET` in `effective-persona-access.ts`.
6. Update all UI components that reference removed persona IDs.
7. Update tests referencing removed personas.

**Acceptance criteria:**

- [x] Zero references to `best-friend`, `boyfriend`, `girlfriend` in `src/`
- [x] `PersonaId` type has exactly 6 values
- [x] `PERSONAS` array has exactly 6 entries
- [x] `npx tsc --noEmit` passes
- [x] All tests pass (359 tests, 65 suites)

---

### 41.2 HIGH — Merge Strategist + Analyst persona

**Files:** `src/constants/assistant-personas.tsx`, `src/constants/persona-prompts.ts`, `src/types/PersonaData.d.tsx`

**What to do:**

1. Absorb Analyst capabilities into Strategist persona definition (description, system prompt, starter prompts).
2. Remove `analyst` entry from `PERSONAS` array.
3. Remove `analyst` from `PersonaId` type union.
4. Remove analyst-specific prompt config from `persona-prompts.ts`.
5. Update Strategist system prompt to include analysis capabilities.
6. Update all references to the `analyst` persona ID.

**Acceptance criteria:**

- [x] Zero references to `analyst` persona ID in `src/`
- [x] Strategist persona description and system prompt include analysis capabilities
- [x] `npx tsc --noEmit` passes
- [x] All tests pass (359 tests, 65 suites)

---

### 41.3 HIGH — Update default plan-gating for 6 personas

**Files:** `src/lib/utils/resolve-entitlements.tsx`, `src/constants/plans.tsx`

**What to do:**

1. Update `DEFAULT_FULL_PERSONA_ACCESS_BY_PLAN`:
   - Lite: `["strategist", "developer"]`
   - Pro: `["strategist", "developer", "teacher", "creator", "wellness"]`
   - Premium: all 6 persona IDs
2. Update plan card copy for new persona counts.
3. Update plan card features to show ✕ instead of "0" for unavailable options.

**Acceptance criteria:**

- [x] Default gating matches 2/5/6 split
- [x] Plan cards show ✕ for unavailable options
- [x] Trial access works for non-full-access personas
- [x] `npx tsc --noEmit` passes
- [x] All tests pass (359 tests, 65 suites)

---

### 41.4 HIGH — Handle orphaned DB records for removed personas

**What to do:**

1. Create a migration script to handle `Task.personaId` and `UsageEvent.personaId`:
   - `analyst` → reassign to `strategist`
   - `best-friend`, `boyfriend`, `girlfriend` → keep existing records readable but prevent new conversations
2. Update admin persona access AppSetting keys to remove invalid persona IDs.
3. Add graceful fallback in code for unknown persona IDs (default to `strategist`).

**Acceptance criteria:**

- [x] Existing conversations with removed persona IDs remain accessible (read-only)
- [x] New conversations cannot use removed persona IDs
- [x] UsageEvent aggregation handles legacy persona IDs gracefully
- [x] Admin persona access settings cleaned up
- [x] Migration script: `scripts/migrate-removed-personas.mjs`

---

## Phase 42: Admin Panel & Plan Card Improvements (Owner-Directed, 2026-03-17) — DONE

> **HIGH-MEDIUM priority. After Phase 41. All sub-phases complete.**

---

### 42.1 HIGH — Admin panel full design consistency with client app

**Ref:** Owner instruction: admin panel layout must respect same design, fonts, sizes, colors, proportions as client app panel layout.

**What to do:**

1. Audit admin panel pages against client app design system.
2. Ensure all admin pages use identical font families, sizes, spacing, colors, and proportions.
3. Match admin sidebar, header, cards, forms, tables to client app equivalents.
4. Verify dark/light theme consistency.

**Acceptance criteria:**

- [x] Admin panel visually consistent with client app design system
- [x] All admin pages verified in both light and dark themes
- [x] `npx tsc --noEmit` passes

---

### 42.2 MEDIUM — Plan card ✕ for unavailable options

**Files:** `src/constants/plans.tsx`, plan card components

**What to do:**

1. Replace "0" values in plan card feature lists with "✕" symbol.
2. E.g., "✕ Audio generations per month" instead of "0 audio generations per month".
3. Style ✕ with muted color to indicate unavailability.

**Acceptance criteria:**

- [x] No plan card shows "0" for any option
- [x] ✕ symbol used consistently for unavailable features
- [x] `npx tsc --noEmit` passes
- [x] All tests pass (359 tests, 65 suites)

---

### 42.3 MEDIUM — Unavailable persona PRO/PREMIUM labels

**Files:** persona card components, persona picker

**What to do:**

1. When a persona is not available for the user's plan, show a small-font "PRO" or "PREMIUM" label.
2. Determine label based on which plan first grants full access to that persona.
3. Style as subtle badge, not blocking interaction (trial still works).

**Acceptance criteria:**

- [x] Non-accessible personas show correct plan label
- [x] Labels are small font, clearly indicating required plan
- [x] Trial interaction not blocked — label is informational
- [x] `npx tsc --noEmit` passes
- [x] All tests pass (359 tests, 65 suites)

---

## Phase 43: Code Review Fixes & Persona Polish (Owner-Directed, 2026-03-17) — IN PROGRESS

> **MEDIUM-LOW priority. After Phase 42. Phases 43.1, 43.3, 43.4 DONE. 43.2 blocked (requires image generation).**

---

### 43.1 MEDIUM — Code review fixes (Copilot review)

**What to do:**

1. **task-queries.tsx**: Clamp `offset` to reasonable maximum (e.g., `Math.min(offset, 10000)`) to prevent expensive MongoDB `skip()`.
2. **library/page.tsx**: Same offset clamping for page parameter.
3. **library-tabs.tsx**: Sync `activeTabId` with `initialTabId` on client-side navigation via `useEffect` or make controlled.
4. **library/page.tsx**: Deduplicate `PaginationState` and `LibraryPaginationState` types.
5. **avatar-menu.tsx**: Replace `min-w-45` with `min-w-[180px]` (valid Tailwind token).
6. **alert-message.tsx**: Replace `z-100` with `z-[100]` (valid Tailwind v4).
7. **alert-message.tsx**: Replace `text-base!`, `leading-tight!`, `text-inherit!` with `!text-base`, `!leading-tight`, `!text-inherit` (correct Tailwind important syntax).

**Acceptance criteria:**

- [x] Items 1–6 fixed. Item 7 skipped: `text-base!` (suffix `!`) is correct Tailwind v4 important syntax; `!text-base` (prefix) was v3.
- [x] `npx tsc --noEmit` passes
- [x] All tests pass (359 tests, 65 suites)

---

### 43.2 MEDIUM — Persona hero images (6 personas)

**Ref:** Owner instruction + Phase 30.5 (updated scope: 6 images instead of 10)

**What to do:**

1. Generate representative character images for 6 personas.
2. Store in `public/personas/` as optimized WebP/PNG (< 200KB each).
3. Add `heroImage` field to persona definitions.
4. Display on persona cards and public `/personas` page.

**Acceptance criteria:**

- [ ] 6 hero images in `public/personas/`
- [ ] Each persona definition has `heroImage` path
- [ ] Images visible on persona cards and public page
- [ ] `npx tsc --noEmit` passes

---

### 43.3 MEDIUM — 3-per-row persona grid layout

**Ref:** Owner instruction: personas displayed in 3-per-row grid everywhere on desktop view.

**Files:** persona card grid components, `/personas` page, `/app/personas` page

**What to do:**

1. Update persona grid layout to 3 columns on desktop (e.g., `grid-cols-3`).
2. Ensure responsive behavior (1-col mobile, 2-col tablet, 3-col desktop).
3. Apply consistently to all persona display surfaces.

**Acceptance criteria:**

- [x] 3-per-row grid on desktop viewport
- [x] Responsive: 1-col mobile, 2-col tablet, 3-col desktop
- [x] Consistent across persona picker, public page, app page
- [x] `npx tsc --noEmit` passes

---

### 43.4 LOW — Persona category display and sorting

**Ref:** Owner instruction: personas sorted by categories

**What to do:**

1. Group personas by category in display order: Productivity, Learning, Creative, Lifestyle, Career.
2. Add category headers/separators in persona picker and public page.
3. Sort personas within each category alphabetically.

**Acceptance criteria:**

- [x] Personas grouped and sorted by category (Productivity, Learning, Creative, Lifestyle, Career)
- [x] Category tags visible on each persona card (existing design)
- [x] Order consistent across all persona surfaces
- [x] `npx tsc --noEmit` passes

---

## Phase 38: UI Polish, Bug Fixes & Owner UI Restructure — COMPLETE

> PM audit #16: All 7 tasks (38.1–38.7) verified DONE by Architect code audit + PM approval. Archived in DONE.md.

---

## Phase 36: Admin Design Consistency & Enhancement — COMPLETE

> PM audit #16: Both tasks (36.1–36.2) verified DONE by Architect code audit + PM approval. Archived in DONE.md.

---

## Phase 33: Persona Trial Access System — COMPLETE

> **33.1–33.8 DONE** — Core trial system + E2E tests verified. Archived in DONE.md.

---

## Phase 35: ChatHeader Persona Selector — COMPLETE

> **35.1 DONE** (persona dropdown selector — archived in DONE.md).
> **35.2** (E2E tests) — merged into Milestone 13 Block D test coverage.

---

## Phase 28: Media Generation Fixes & Limit Enforcement — COMPLETE

> All tasks completed. Archived in DONE.md.

---

## Phase 30: Persona Policy Implementation (remaining)

> 30.1 DONE (Interviewer persona), 30.2 DONE (per-plan persona gating), 30.3 DONE (persona picker UI), 30.4 DONE (admin persona access controls + runtime propagation).
> Remaining: 30.5 (persona hero images).

---

### 30.5 MEDIUM — Generate persona hero images — SUPERSEDED BY 43.2

> Scope reduced from 10 to 6 personas by Owner directive (2026-03-17). Moved to Phase 43.2.

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

> 27.1–27.5 + 27.6–27.10 DONE. Phase 27 COMPLETE.
> All admin settings propagation (pricing, limits, models, persona access) verified operational.

---

## Phase 39: Security Hardening — Checkout Price Bypass — COMPLETE

> **Identified by PM audit #18 + Architect code audit (2026-03-17). Resolved by Engineer (2026-03-17).**
> **39.1 VERIFIED DONE by Architect audit #19 + PM approval. TD-CHECKOUT-01 FULLY RESOLVED. Archived in DONE.md.**

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

> **ON HOLD until Milestone 13 Block D + Milestone 14 are PM-approved complete.**
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

> **ON HOLD until Milestone 13 Block D + Milestone 14 + Phases 34 + 29 are PM-approved complete.**
> Depends on: All preceding phases complete.

---

### 26.1 Persona-aware media generation prompts

**Ref:** TD-AI-09 (remaining gap)

### 26.2 Implement Stripe subscription mode (auto-renewal)

**Ref:** TD-PLAN-01

---

> **Completed phases** are archived in [`DONE.md`](DONE.md).
> HF-1 through HF-9.2 complete. Phases 1–25.7 + 27.1–27.4 + 27.6–27.10 + 28.1 + 28.2-fix + 28.3-code + 30.1 + 30.2 + 30.3 + 30.4 + 33.8 + 35.1 + 37.1 + 38.1–38.7 + 36.1–36.2 complete.
> Phase 10–12 superseded (see DONE.md for mapping).

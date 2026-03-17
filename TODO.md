# Droplet — TODO

> Prioritized, actionable development tasks. Each task max ~30 minutes.
> Governed by **Droplet-PM**. Do not add tasks without PM approval.
> Ref: `SPEC.md` for full specification. `AGENTS.md` for coding rules. `DONE.md` for completed phases.
> Implementation agent: **Droplet-Engineer** (Senior Developer).
>
> **STATUS: All Milestones 0–18 COMPLETE. Phases 1–49.5 complete. 365 unit tests passing (65 suites). Build passing.**
> **PM deep audit #24 (2026-03-17): Full triple-audit (PM + Architect + Engineer). All prior phases verified COMPLETE.**
> **OWNER INSTRUCTIONS (latest, 2026-03-17): Video generation prompt gap (CRITICAL), admin tabbed sections (HIGH), admin video model override (MEDIUM), admin error boundary (LOW).**
> **Priority order: 51.1 → 52.1 → 52.2 → 50.1 → 46.1 → 46.2 → 31.4 → 29.x → 26.x**
> **All Phase 26+ deferred work is ON HOLD until PM-approved.**

---

## Phase 51: Video Generation Prompt Fix — CRITICAL (PM Audit #24)

> **CRITICAL priority. PM audit #24 triple-audit finding (confirmed by all 3 agents independently): persona system prompts contain ZERO references to video generation capability. The AI model does not know it can generate video. This is the root cause of the owner-reported bug: "I can generate audio or images, but I'm currently unable to create or generate videos."**
> **The video tool (`getGeneratedVideo`) IS correctly registered in `getChatTools()`. The backend handler IS correct. But the model's own knowledge says video generation is not possible, and no system prompt overrides this. The model chooses NOT to invoke the video tool.**

---

### 51.1 CRITICAL — Add video generation capability to persona system prompts

**Ref:** PM audit #24 — Owner reported: "Video generation returns 'I can generate audio or images, but I'm currently unable to create or generate videos'" in some cases. Root cause: `src/constants/persona-prompts.ts` has zero mentions of "video" in any persona prompt. The model defaults to its training knowledge (no video capability) and refuses to call the registered video tool.

**Files:** `src/constants/persona-prompts.ts`

**What to do:**

1. Add video generation capability instruction to `CHAT_PLATFORM_PROMPT` (the shared platform-level instruction that all personas receive). Example: "You have access to tools for generating images, audio, and video. When the user asks for any of these, use the appropriate tool."
2. This is the same pattern used for image and audio — the model needs to know it has the capability via system prompt, not just via tool registration.
3. Do NOT add per-persona video instructions — the platform prompt covers all personas equally.

**Acceptance criteria:**

- [ ] `CHAT_PLATFORM_PROMPT` mentions image, audio, AND video generation capabilities
- [ ] All persona system prompts inherit video awareness via the shared platform prompt
- [ ] Model invokes `getGeneratedVideo` tool when user requests video
- [ ] `npx tsc --noEmit` passes
- [ ] All tests pass

---

## Phase 52: Admin Settings Tabbed UI — HIGH (Owner-Directed, PM Audit #24)

> **HIGH priority. Owner directive: "ADMIN side pages to use tabbed sections for better organized settings and configs (grouped by relevance)." PM audit #24: All 3 agents confirmed admin settings is a ~950-line single page with 7 inline form sections. No tab navigation. No section grouping.**

---

### 52.1 HIGH — Implement tabbed navigation for admin settings page

**Ref:** PM audit #24 — Owner directive for tabbed admin sections. Current admin settings is a flat grid of 7 card sections on one scroll. Needs tab-based grouping.

**Files:** `src/app/(admin)/admin/settings/page.tsx`

**What to do:**

1. Group the 7 existing settings sections into logical tabs:
   - **Models** — AI model selection per plan and feature
   - **Plans & Pricing** — Plan prices + currency symbol
   - **Limits** — Plan limits + trial limits
   - **Personas** — Per-plan persona access controls
   - **Theme** — Theme mode settings
2. Add a tab bar component at the top of the settings page.
3. Each tab renders only its section(s). Other sections are hidden (not removed from DOM — form state must persist across tab switches).
4. Use URL search params or local state for active tab — prefer local state to avoid unnecessary re-renders.
5. Accessible: `role="tablist"`, `role="tab"`, `role="tabpanel"`, `aria-selected`, `aria-controls`.

**Acceptance criteria:**

- [ ] Settings page has 5 tabs with proper grouping
- [ ] Only active tab's content is visible
- [ ] Tab state persists across form submissions (server re-renders)
- [ ] Proper ARIA accessibility on tab components
- [ ] Admin settings functionality unchanged
- [ ] `npx tsc --noEmit` passes

---

### 52.2 HIGH — Extract admin settings sections into separate components

**Ref:** PM audit #24 — Admin settings page is ~950 lines with 7 inline form sections and normalizer functions. Maintainability risk.

**Files:** `src/app/(admin)/admin/settings/page.tsx`, new component files in `src/components/admin/settings/`

**What to do:**

1. Extract each settings section into its own component:
   - `AdminModelsSection` — AI model dropdowns
   - `AdminPricingSection` — Plan pricing + currency
   - `AdminLimitsSection` — Plan limits + trial limits
   - `AdminPersonasSection` — Per-plan persona access
   - `AdminThemeSection` — Theme settings
2. Move model option arrays (`CHAT_MODEL_OPTIONS`, etc.) to `src/constants/admin-options.ts`.
3. Move normalizer functions to a utility file or keep co-located with components.
4. Main settings page becomes a thin shell that reads admin data and passes it to tab sections.

**Acceptance criteria:**

- [ ] Settings page main file is under 200 lines
- [ ] Each section is a separate component
- [ ] Model option arrays in constants file, not inline
- [ ] All admin functionality preserved
- [ ] `npx tsc --noEmit` passes
- [ ] All tests pass

---

## Phase 50: Admin Video Model Override — MEDIUM (PM Audit #23)

> **MEDIUM priority. PM audit #23: Admin cannot override video generation model. Inconsistent with image/audio admin overrides. No `videoGenerationModel` in `ModelPolicyModelOverrides` interface, no admin UI control, no `effective-model-config.ts` support.**

---

### 50.1 MEDIUM — Add videoGenerationModel to admin model overrides

**Ref:** PM audit #23 — Architect finding H1. Admin model override pattern exists for image (`imageGenerationModel`) and audio (`audioGenerationModel`) but not video.

**Files:** `src/lib/utils/ai-model-policy.ts`, `src/types/AdminData.d.tsx`, `src/lib/utils/effective-model-config.ts`, `src/app/api/openai/route.tsx`, `src/app/(admin)/admin/settings/page.tsx`

**What to do:**

1. Add `videoGenerationModel?: string` to `ModelPolicyModelOverrides` interface.
2. Add `videoGenerationModel` to `ModelSettingsFormValue` type.
3. Add video model resolution in `getEffectiveModelConfig()`.
4. Wire `videoGenerationModel` into `modelOverrides` construction in `/api/openai` route.
5. Add video model selector in admin settings page.
6. Apply `modelOverrides.videoGenerationModel` in `resolveModelPolicy()` for `video_generation` feature.

**Acceptance criteria:**

- [ ] Admin can change video model via settings panel
- [ ] `resolveModelPolicy()` applies admin video model override
- [ ] Follows same pattern as image/audio overrides
- [ ] `npx tsc --noEmit` passes
- [ ] All tests pass

---

## Phase 46: Performance & Resource Leak Audit — LOW (PM Audit #24)

> **PM audit #24: Codebase is clean. All resource leaks resolved (autoAnimate fixed Phase 49.1). Only minor items remain.**

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

## Phase 29: App-Wide Modernization — ON HOLD

> **ON HOLD until all HIGH-priority phases complete.**

### 29.1 Implement Zod schema validation across the app

### 29.2 Implement Zustand for client-side state management

---

## Phase 26: Deferred Features — ON HOLD

### 26.1 Persona-aware media generation prompts (TD-AI-09)

### 26.2 Implement Stripe subscription mode — auto-renewal (TD-PLAN-01)

---

> **Completed phases** are archived in [`DONE.md`](DONE.md).
> All phases through 49.5 complete. Phase 47.1 + 34.2–34.9e complete.
> Phase 10–12 superseded (see DONE.md for mapping).

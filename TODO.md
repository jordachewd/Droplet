# Droplet — TODO

> Prioritized, actionable development tasks. Each task max ~30 minutes.
> Governed by **Droplet-PM**. Do not add tasks without PM approval.
> Ref: `SPEC.md` for full specification. `AGENTS.md` for coding rules. `DONE.md` for completed phases.
> Implementation agent: **Droplet-Engineer** (Senior Developer).
>
> **STATUS: All Milestones 0–18 COMPLETE. Phases 1–51.1 complete. 365 unit tests passing (65 suites). Build passing.**
> **PM deep audit #25 (2026-03-17): Full triple-audit (PM + Architect + Engineer). Owner instructions integrated.**
> **Priority order: 53.1 → 53.2 → 53.3 → 52.1 → 52.2 → 54.1 → 54.2 → 54.3 → 54.4 → 50.1 → 55.1 → 46.1 → 46.2 → 31.4 → 29.x → 26.x**
> **All Phase 26+ deferred work is ON HOLD until PM-approved.**

---

## Phase 53: CRITICAL — Admin Role Bypass + Media Generation Fixes (PM Audit #25)

> **CRITICAL priority. Triple-audit confirmed: admin role has ZERO special treatment in `/api/openai`. Admin users on Lite get Lite limits. PlanPromo says "full permissions" but backend doesn't enforce it. Also: video tool silently removed when limit reached while system prompt still claims video capability — causes confusing AI refusals. Zod `.strict()` on chatMessageSchema may reject valid messages with extra fields on conversation resumption.**

---

### 53.1 CRITICAL — Add admin role bypass in /api/openai route

**Ref:** PM audit #25 — Architect finding H1, Engineer finding #4. Owner directive: "ADMIN has full permissions over all personas — TRIAL is not applicable for admin role."

**Files:** `src/app/api/openai/route.tsx`, `src/lib/utils/resolve-entitlements.tsx`

**What to do:**

1. In `/api/openai` route, after reading `userData`, check if `userData.role === "admin"`.
2. If admin: override entitlements to grant full access — all personas `"full"`, all limits set to `-1` (unlimited), all media generation supported, no trial restrictions.
3. Skip daily conversation limit claim for admin (or use `-1` unlimited).
4. Skip prompt limit enforcement for admin.
5. Skip media generation limit enforcement for admin.
6. Do NOT skip auth check — admin must still be authenticated.

**Acceptance criteria:**

- [ ] Admin user can use all 6 personas with full access (no trial limits)
- [ ] Admin user has no daily conversation limit
- [ ] Admin user has no prompt limit per conversation
- [ ] Admin user has no media generation limits
- [ ] Non-admin users are unaffected (same behavior as before)
- [ ] `npx tsc --noEmit` passes
- [ ] All tests pass (add test for admin bypass)

---

### 53.2 HIGH — Fix video tool removal causing confusing AI refusal

**Ref:** PM audit #25 — Engineer finding #2. When `videoLimitReached` is true, video tool is removed from `getChatTools()` but system prompt still says "access to tools for generating images, audio, and video." The AI model can't find the tool and generates a confusing text refusal.

**Files:** `src/app/api/openai/route.tsx`, `src/lib/utils/openai/generateResponse.tsx`

**What to do:**

1. When `videoLimitReached` is true, keep the video tool registered in `getChatTools()`.
2. In the `getGeneratedVideo` handler inside `buildOpenAIResponsePayload()`, check the limit and return a structured message: "You've reached your video generation limit for this period. Upgrade your plan for more video generations."
3. This approach keeps prompt-tool consistency — the model sees the tool, calls it, and gets a clear response about the limit.
4. Apply same pattern for image and audio if not already done.

**Acceptance criteria:**

- [ ] Video tool is always registered when `supportsVideoGeneration` is true (regardless of limit state)
- [ ] When user hits video limit, a clear limit-reached message is returned instead of confusing AI refusal
- [ ] Same pattern for image/audio limit messaging
- [ ] `npx tsc --noEmit` passes
- [ ] All tests pass

---

### 53.3 HIGH — Investigate Zod `.strict()` causing "Invalid request body" on conversation resumption

**Ref:** PM audit #25 — Engineer finding #1. `chatMessageSchema` uses `.strict()` which rejects any extra fields. When resuming conversations with stored tool_call metadata, `filterAssistantMsg` may not strip all non-schema fields, causing validation failure.

**Files:** `src/lib/utils/validation-schemas.ts`, `src/components/chat/chat-wrapper.tsx`

**What to do:**

1. Add server-side Zod validation error logging — log the actual rejected fields to stderr (not to client).
2. Either: (a) Change `chatMessageSchema` from `.strict()` to `.passthrough()` — let unknown fields through and ignore them server-side. OR (b) Ensure `filterAssistantMsg` strips ALL non-schema fields before sending.
3. Option (a) is recommended — the server should be resilient to extra fields in messages since the backend controls what it actually uses.

**Acceptance criteria:**

- [ ] Resuming conversations that previously had media generation does not trigger "Invalid request body"
- [ ] Zod validation errors are logged server-side for debugging
- [ ] Message validation remains type-safe for required fields
- [ ] `npx tsc --noEmit` passes
- [ ] All tests pass

---

## Phase 52: Admin Settings Tabbed UI — HIGH (Owner-Directed, PM Audit #25)

> **HIGH priority. Owner directive: "ADMIN side pages to use tabbed sections for better organized settings and configs (grouped by relevance)." PM audit #25: confirmed admin settings is a 735-line single page with 7 inline form sections, 5+ normalizer functions, 3 inline model option arrays. No tab navigation.**

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

## Phase 54: Admin Enrichment — MEDIUM (PM Audit #25)

> **MEDIUM priority. Triple-audit confirmed gaps in admin dashboard metrics, admin user detail, and currency hardcoding in admin views.**

---

### 54.1 MEDIUM — Add media generation count cards to admin dashboard

**Ref:** PM audit #25 — Architect finding H6. Dashboard shows only 4 metrics (Users, Conversations, Transactions, Usage Events). Owner directive: "Admin Dashboard must have cards/sections that will reflect any type of activity."

**Files:** `src/lib/utils/admin-queries.ts`, `src/app/(admin)/admin/page.tsx`

**What to do:**

1. In `getAdminDashboardStats()`, add queries for: total images generated, total audio generated, total video generated (from `UsageEvent` aggregation where `requestType` is `image`/`audio`/`video` and `blocked` is false).
2. Add 3 additional dashboard cards: Images Generated, Audio Generated, Video Generated.
3. Consider adding: active users (last 7 days), plan distribution (Lite/Pro/Premium counts).

**Acceptance criteria:**

- [ ] Dashboard shows 7+ metric cards (original 4 + 3 media generation counts)
- [ ] Counts reflect actual non-blocked media generation events
- [ ] `npx tsc --noEmit` passes

---

### 54.2 MEDIUM — Add video generations + remaining limits to admin user detail

**Ref:** PM audit #25 — Architect finding H4/H3. Admin user detail shows image and audio generations but NOT video. No remaining limits context. Admin users list has no usage columns.

**Files:** `src/lib/utils/admin-queries.ts`, `src/app/(admin)/admin/users/[userId]/page.tsx`

**What to do:**

1. In `getAdminUserDetail()`, add `videoGenerations: user.plan?.videoGenerations ?? 0` to returned data.
2. Add plan limits context — show "X of Y used" or "X remaining" for each media type.
3. Resolve effective plan limits via `getEffectivePlanConfig()` for accurate remaining display.
4. Show trial usage counters if applicable.

**Acceptance criteria:**

- [ ] Admin user detail shows video generations count
- [ ] Media generation counts show "used / limit" format
- [ ] `npx tsc --noEmit` passes

---

### 54.3 MEDIUM — Fix hardcoded `$` in admin user detail and transaction views

**Ref:** PM audit #25 — Architect finding H5/M5. Admin user detail page uses `${transaction.amount}` with hardcoded dollar sign. Must use `getEffectiveCurrencySymbol()`.

**Files:** `src/app/(admin)/admin/users/[userId]/page.tsx`, `src/app/(admin)/admin/transactions/page.tsx`, `src/app/(admin)/admin/transactions/[transactionId]/page.tsx`

**What to do:**

1. Read currency symbol via `getEffectiveCurrencySymbol()` in the server component.
2. Replace all hardcoded `$` in admin views with the dynamic currency symbol.
3. Also check admin user detail plan amount display for hardcoded `$`.

**Acceptance criteria:**

- [ ] All admin views use dynamic currency symbol
- [ ] Zero hardcoded `$` in admin transaction/user rendering
- [ ] `npx tsc --noEmit` passes

---

### 54.4 MEDIUM — Filter null personaId from Top Personas aggregation

**Ref:** PM audit #25 — Engineer finding #11. Top Personas aggregation at `admin-queries.ts` groups by `personaId` without filtering nulls. Title generation events and blocked events may have null `personaId`, causing `getPersona(null)` to fall back to "Strategist" — creating duplicate "Strategist" entries.

**Files:** `src/lib/utils/admin-queries.ts`

**What to do:**

1. Add `{ $match: { personaId: { $ne: null, $exists: true } } }` as the first pipeline stage in the topPersonas aggregation.

**Acceptance criteria:**

- [ ] Top Personas shows each persona at most once
- [ ] Null/undefined personaId events are excluded from the aggregation
- [ ] `npx tsc --noEmit` passes

---

## Phase 50: Admin Video Model Override — MEDIUM (PM Audit #23)

> **MEDIUM priority. Admin model override pattern exists for image and audio but not video.**

---

### 50.1 MEDIUM — Add videoGenerationModel to admin model overrides

**Ref:** PM audit #23 — Architect finding H1.

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

## Phase 55: Data Architecture Cleanup — LOW (PM Audit #25)

> **LOW priority. Structural cleanup — no runtime impact.**

---

### 55.1 LOW — Move inline data arrays and model options to constants

**Ref:** PM audit #25 — Engineer finding #14. `ADMIN_LINKS` in `admin-sidebar.tsx`, model option arrays in admin settings page.

**Files:** `src/components/admin/admin-sidebar.tsx`, `src/app/(admin)/admin/settings/page.tsx`, new `src/constants/admin-options.ts`

**What to do:**

1. Move `ADMIN_LINKS` to `src/constants/admin.ts`.
2. Move `CHAT_MODEL_OPTIONS`, `IMAGE_MODEL_OPTIONS`, `AUDIO_MODEL_OPTIONS` to `src/constants/admin-options.ts`.
3. Note: Phase 52.2 already plans to extract model options — coordinate to avoid duplication.

**Acceptance criteria:**

- [ ] No inline data arrays in component files
- [ ] Constants importable from dedicated files
- [ ] `npx tsc --noEmit` passes

---

## Phase 46: Performance & Resource Leak Audit — LOW (PM Audit #24)

> **Codebase is clean. All resource leaks resolved (autoAnimate fixed Phase 49.1). Only minor items remain.**

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
> All phases through 51.1 complete. Phase 47.1 + 34.2–34.9e complete.
> Phase 10–12 superseded (see DONE.md for mapping).

# Droplet — TODO

> Prioritized, actionable development tasks. Each task max ~30 minutes.
> Governed by **Droplet-PM**. Do not add tasks without PM approval.
> Ref: `SPEC.md` for full specification. `AGENTS.md` for coding rules. `DONE.md` for completed phases.
> Implementation agent: **Droplet-Engineer** (Senior Developer).
>
> **STATUS: Milestone 22 COMPLETE. All Phases 1–67.3, 63.1–63.2, 61.1 complete. 369 unit tests passing (65+ suites). Build passing.**
> **PM deep audit #33 (2026-03-19): Triple-audit (PM + Architect + Engineer). New owner directives: Lime Green accent color, button restyle, Premium video error UX fix. 6 owner items verified DONE (archived).**
> **Priority order: 69.1 → 68.1 → 68.2 → 68.3 → 70.1 → 31.4 → 46.x → 29.x → 26.x**
> **CRITICAL: Phase 69 (Premium error UX). HIGH: Phase 68 (Lime Green palette + button restyle). MEDIUM: Phase 70 (Admin layout alignment).**

---

## Phase 69: Premium Video Error UX Fix — CRITICAL

### 69.1 CRITICAL — Fix media-specific limit end action + improve stop messages

**Ref:** PM audit #33 — Owner reported: "PREMIUM user has media limitations - gets error message about that - why?" Root cause: `getPlanBoundEndAction()` returns `"contact_support"` for Premium (unlimited conversations → contact_support). Premium users hitting video cap (10/month) see generic "video generation limit" + "Contact support" — confusing for $39/month user.

**Files:** `src/app/api/openai/route.tsx`, `src/constants/stop-reasons.ts`

**What to do:**

1. In `route.tsx`, when a media-specific limit is hit (`image_limit_reached`, `audio_limit_reached`, `video_limit_reached`), the `endAction` should be `"start_new_conversation"` instead of using `getPlanBoundEndAction()`. The conversation should NOT end — only the media generation is blocked. User can still chat.
2. Update `stop-reasons.ts` messages for media limits to be more informative. Include: "You can continue chatting. Start a new conversation to keep going."
3. Verify that admin role still bypasses all limits (no regression from Phase 53.1).

**Acceptance criteria:**

- [ ] Premium user hitting video cap sees clear, non-alarming message
- [ ] End action for media limits is `start_new_conversation`, not `contact_support`
- [ ] Messages explain that other features are still available
- [ ] Admin bypasses unchanged
- [ ] Existing unit tests pass, new test for Premium video limit behavior

---

## Phase 68: Brand Color Palette v3 — Lime Green Accent — HIGH

### 68.1 HIGH — Add limeGreen palette scale to globals.css @theme

**Ref:** PM audit #33 — Owner directive: Lime Green (#B8F60D) as new accent color. Must generate 10-step shade scale (100–1000) anchored at 500 = #B8F60D.

**Files:** `src/app/globals.css`

**What to do:**

1. Add `--color-limeGreen-100` through `--color-limeGreen-1000` to the `@theme` block.
2. Base hex for 500: `#B8F60D`. Generate lighter shades (100–400) and darker shades (600–1000).
3. Do NOT remove any existing palette tokens (nightIndigo, twilightPurple, midnightBlue, lavenderHaze, dustyBlue) — they remain for non-button uses.

**Acceptance criteria:**

- [ ] `limeGreen` palette (10 shades) exists in `@theme`
- [ ] `bg-limeGreen-500`, `text-limeGreen-500`, etc. work in Tailwind classes
- [ ] No existing palette tokens removed
- [ ] Build passes

---

### 68.2 HIGH — Restyle .btn-text, .btn-outlined, .btn-contained with Lime Green

**Ref:** PM audit #33 — Owner directive: All button styles use Lime Green for BOTH dark and light themes. `.icon-btn` stays unchanged.

**Files:** `src/app/globals.css`

**What to do:**

1. Update `.btn-text`: `text-limeGreen-500 hover:text-limeGreen-500` (both themes, same color). Remove separate light/dark variants.
2. Update `.btn-outlined`: `text-limeGreen-500 border-limeGreen-500 hover:text-limeGreen-800 hover:border-limeGreen-800 bg-transparent hover:bg-transparent` (both themes). Remove separate light/dark variants.
3. Update `.btn-contained`: `text-lavenderHaze-500 border-limeGreen-500 bg-limeGreen-500 hover:text-lavenderHaze-800 hover:border-limeGreen-800 hover:bg-limeGreen-800` (both themes). Remove shadow definitions that reference twilightPurple/dustyBlue hex.
4. `.icon-btn` — DO NOT CHANGE.

**Acceptance criteria:**

- [ ] `.btn-text` uses limeGreen-500 for both themes
- [ ] `.btn-outlined` uses limeGreen-500/800 for both themes, transparent bg
- [ ] `.btn-contained` uses limeGreen bg, lavenderHaze text for both themes
- [ ] `.icon-btn` is identical to current version (unchanged)
- [ ] No `dark:` prefix on button color properties (same for both themes)
- [ ] Build passes, lint passes

---

### 68.3 HIGH — Update Clerk appearance and verify visual consistency

**Ref:** PM audit #33 — Clerk appearance and any hardcoded color references must reflect new accent.

**Files:** `src/app/layout.tsx` (Clerk provider), any file referencing `twilightPurple` or `dustyBlue` in button contexts

**What to do:**

1. Check Clerk `appearance` config — if `colorPrimary` uses twilightPurple, consider updating to limeGreen or keeping twilightPurple for sign-in forms (PM decision: keep twilightPurple for Clerk — it's auth, not app buttons).
2. Grep for any inline twilightPurple/dustyBlue references specifically in button contexts (not all uses — only button-related). These should now use limeGreen.
3. Verify no visual regressions in both light and dark themes.

**Acceptance criteria:**

- [ ] No button-context references to twilightPurple/dustyBlue remain (structural/non-button uses OK)
- [ ] Clerk appearance decision documented
- [ ] Both themes visually consistent
- [ ] Full validation gateway passes (prettier, lint, tsc, unit tests, build)

---

## Phase 70: Admin Panel Design Alignment — MEDIUM

### 70.1 MEDIUM — Align admin layout with /app design system

**Ref:** PM audit #33 — Owner reports admin panel "still old design." Admin uses `AdminLayoutShell` with different background, header, and spacing vs `/app`'s `PageWrapper`.

**Files:** `src/components/admin/admin-layout-shell.tsx`, `src/app/(admin)/layout.tsx`

**What to do:**

1. Align admin background gradient/colors with the body gradient from globals.css (currently admin hardcodes `bg-lavenderHaze-200 dark:bg-nightIndigo-1000`).
2. Ensure admin header styling matches chat header visual weight (fonts, spacing, colors).
3. Ensure admin sidebar styling matches chat sidebar visual patterns.
4. Card backgrounds, border radius, and spacing should match `/app` patterns.

**Acceptance criteria:**

- [ ] Admin panel visually matches `/app` design system (colors, fonts, spacing)
- [ ] No functional regression in admin features
- [ ] Both light and dark themes consistent
- [ ] Build passes

---

## Phase 31.4: E2E Test Updates — LOW (remaining)

### 31.4 LOW — Update E2E tests for current UI structure

**Ref:** PM audit #28 — Engineer analysis: E2E failures caused by stale Clerk auth session and DB connectivity. `pricing-public.spec.ts` is a confirmed duplicate of `plans-public.spec.ts`.

**Files:** `tests/e2e/chat-app-shell.spec.ts`, `tests/e2e/plans-public.spec.ts`, `tests/e2e/pricing-public.spec.ts`, `tests/e2e/public-pages.spec.ts`, `tests/e2e/user-profile.spec.ts`

**What to do:**

1. Delete `pricing-public.spec.ts` (confirmed duplicate of `plans-public.spec.ts`).
2. Fix auth session refresh logic in E2E global setup.
3. Update selectors/assertions in remaining failing specs.
4. Add DB connectivity check in E2E setup.

**Acceptance criteria:**

- [ ] `pricing-public.spec.ts` deleted
- [ ] `npm run test:e2e` passes with 0 failures (excluding intentionally skipped)
- [ ] No duplicate test files

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

**Files:** `src/components/shared/audio-player.tsx`, `src/components/chat/chat-sidebar.tsx`, `src/components/chat/sidebar/chat-sidebar-shell.tsx`

**What to do:**

1. Replace empty `catch {}` blocks (3 total) with `catch { /* localStorage/audio non-critical */ }` comments or minimal stderr logging where appropriate.

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
> All phases through 67.3 complete (incl. 63.1–63.2, 61.1). All Milestones 0–22 COMPLETE.
> Phase 10–12 superseded (see DONE.md for mapping).

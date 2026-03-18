# Droplet — TODO

> Prioritized, actionable development tasks. Each task max ~30 minutes.
> Governed by **Droplet-PM**. Do not add tasks without PM approval.
> Ref: `SPEC.md` for full specification. `AGENTS.md` for coding rules. `DONE.md` for completed phases.
> Implementation agent: **Droplet-Engineer** (Senior Developer).
>
> **STATUS: Milestone 22 substantially COMPLETE. Phases 1–64.7, 63.1–63.2 complete. 369 unit tests passing (65+ suites). Build passing.**
> **PM deep audit #31 (2026-03-18): Triple-audit (PM + Architect + Engineer). 2 CRITICAL bugs found. Owner directives integrated.**
> **Priority order: 65.1 → 65.2 → 65.3 → 65.4 → 66.1 → 66.2 → 66.3 → 67.1 → 67.2 → 67.3 → 61.1 → 61.2 → 61.3 → 31.4 → 46.x → 29.x → 26.x**
> **CRITICAL bugs (Phase 65) MUST be resolved before any other work. All Phase 26+ deferred work is ON HOLD until PM-approved.**

---

## ~~Phase 64: Brand Color Palette v2 Migration~~ — ✅ DONE (Archived to DONE.md)

**Completed 2026-03-18.** All 7 sub-tasks (64.1–64.7) delivered. ~60 files, ~538 references migrated. Brand palette v2 operational.

---

## ~~Phase 63: Critical Bug Fixes~~ — ✅ DONE (Archived to DONE.md)

**Completed 2026-03-17.** 63.1 (Client self-delete Clerk cascade) + 63.2 (Admin limits UI safeguard) delivered.

---

## Phase 65: CRITICAL Bug Fixes — CRITICAL (PM Audit #31, Triple-Audit Confirmed)

> **CRITICAL priority. Triple-audit (PM + Architect + Engineer) all confirmed these bugs independently.**
> **MUST be resolved before any other work. Premium users are affected.**

---

### 65.1 CRITICAL — Split `media_limit_reached` into type-specific stop reasons (image/audio/video)

**Ref:** PM audit #31. Owner report: "PREMIUM user has media limitations — gets error message about that — why?" Root cause: Premium has unlimited images + audio, but video is capped at 10/month. When video limit is hit, the error says "You've reached your media generation limit" (generic) — Premium user thinks ALL media is limited.

**Files:** `src/types/TaskData.d.tsx`, `src/lib/database/models/tasks.model.tsx`, `src/lib/actions/task.actions.tsx`, `src/lib/utils/openai/generateResponse.tsx`, `src/app/api/openai/route.tsx`, `src/components/chat/chat-body.tsx`, `tests/unit/conversation-stop.test.ts`, `tests/unit/chat-body.test.tsx`

**What to do:**

1. Add three new `TaskEndedReason` variants: `"image_limit_reached"`, `"audio_limit_reached"`, `"video_limit_reached"` alongside existing `"media_limit_reached"` (keep for backward compat with existing DB records).
2. Add three new `BlockedReason` variants in `generateResponse.tsx`: `"image_limit_reached"`, `"audio_limit_reached"`, `"video_limit_reached"`.
3. Update `generateResponse.tsx` blocked handlers to return type-specific `blockedReason` instead of generic `"media_limit_reached"`.
4. Update `STOP_REASON_MESSAGES` in `route.tsx` with type-specific messages:
   - `image_limit_reached: "You've reached your image generation limit for this billing period."`
   - `audio_limit_reached: "You've reached your audio generation limit for this billing period."`
   - `video_limit_reached: "You've reached your video generation limit for this billing period."`
5. Update `stopReasonTitles` in `chat-body.tsx` with matching messages.
6. Update `finalizeAIResponse()` in route to map type-specific blocked reasons.
7. Update Mongoose `endedReason` enum to include new values.
8. Update `VALID_STATUS_TRANSITIONS` in `task.actions.tsx`.
9. Update unit tests for all three new stop reason types.

**Acceptance criteria:**

- [ ] Premium user hitting video limit sees "video generation limit" not "media generation limit"
- [ ] Each media type has its own specific stop reason and user-facing message
- [ ] Existing `media_limit_reached` records in DB still render correctly (backward compat)
- [ ] Unit tests cover all three new stop reason types
- [ ] `npx tsc --noEmit` passes
- [ ] `npm run test` passes

---

### 65.2 CRITICAL — Add UsageEvent cascade to all user deletion paths

**Ref:** PM audit #31. UsageEvent records orphaned forever when users are deleted. GDPR compliance risk — user data retained after deletion.

**Files:** `src/lib/actions/user.actions.tsx`, `src/lib/actions/admin.actions.tsx`, `src/app/api/webhooks/clerk/route.tsx`

**What to do:**

1. Add `UsageEvent.deleteMany({ userId: clerkId })` to user self-delete in `user.actions.tsx`.
2. Add `UsageEvent.deleteMany({ userId: targetUser.clerkId })` to admin `removeUserByAdmin` in `admin.actions.tsx`.
3. Add `UsageEvent.deleteMany({ userId: clerkId })` to Clerk webhook `user.deleted` handler.
4. Optionally add `RateLimitEntry.deleteMany({ key: { $regex: clerkId } })` — lower priority since TTL auto-expires, but cleaner.
5. Do NOT delete AdminAuditLog entries — audit trail must persist beyond user lifecycle.

**Acceptance criteria:**

- [ ] All three deletion paths include `UsageEvent.deleteMany`
- [ ] No orphaned UsageEvent records after user deletion
- [ ] AdminAuditLog entries preserved (not deleted)
- [ ] `npx tsc --noEmit` passes
- [ ] Existing unit tests still pass

---

### 65.3 HIGH — Fix admin removeUserByAdmin deletion order (race condition)

**Ref:** PM audit #31. `User.findByIdAndDelete` runs in parallel with `Task.deleteMany` and `Transaction.deleteMany`. If User deletes first but child cleanup fails, orphaned data remains with no way to retry.

**Files:** `src/lib/actions/admin.actions.tsx`

**What to do:**

1. Change admin `removeUserByAdmin` to delete child data FIRST, then User document LAST.
2. Match the pattern used in user self-delete (`user.actions.tsx`) — sequential, not parallel.
3. Order: Clerk delete → Tasks delete → Transactions delete → UsageEvent delete → S3 cleanup → User delete.

**Acceptance criteria:**

- [ ] `User.findByIdAndDelete` runs AFTER child data cleanup
- [ ] Failure in any child cleanup step prevents User deletion (returns error)
- [ ] `npx tsc --noEmit` passes

---

### 65.4 HIGH — Extract STOP_REASON_MESSAGES to shared constant

**Ref:** PM audit #31. Stop reason messages are duplicated in `route.tsx` and `chat-body.tsx`. If one changes and the other doesn't, user sees inconsistent messages.

**Files:** `src/constants/openai.tsx` (or new `src/constants/stop-reasons.ts`), `src/app/api/openai/route.tsx`, `src/components/chat/chat-body.tsx`

**What to do:**

1. Create a shared `STOP_REASON_MESSAGES` constant in `src/constants/`.
2. Import and use in both `route.tsx` and `chat-body.tsx`.
3. Remove the duplicated definitions.

**Acceptance criteria:**

- [ ] Single source of truth for stop reason messages
- [ ] Both route.tsx and chat-body.tsx import from shared constant
- [ ] `npx tsc --noEmit` passes

---

## Phase 66: Profile & Admin Usability — HIGH (PM Audit #31, Owner-Directed)

> **HIGH priority. Owner directives: "client profile page must display plan limitations and usage" and "admin/users table must provide usage and limits info."**

---

### 66.1 HIGH — Add usage display section to client profile page

**Ref:** Owner directive. Profile page has `userData.plan` with `imageGenerations`, `audioGenerations`, `videoGenerations`, `usagePeriodStart` — but never displays them.

**Files:** `src/app/(chat)/app/profile/page.tsx`, `src/components/sections/profile-hero.tsx` (or new `profile-usage.tsx`)

**What to do:**

1. Fetch effective plan limits server-side via `getEffectivePlanConfig()`.
2. Compute usage data: images used/limit, audio used/limit, video used/limit, daily conversations used/limit.
3. Display a "Usage" section (below profile info, above billing) showing:
   - Current plan name + tier badge
   - Media generation counters: `{used} / {limit}` with progress bars (or "Unlimited" for -1)
   - Daily conversations: `{used} / {limit}` (fetch daily count from User model)
   - Usage period start + reset date
4. Data fetched server-side, passed as props. No client-side fetching.

**Acceptance criteria:**

- [ ] Profile page shows image/audio/video usage counters with limits
- [ ] Profile page shows daily conversation usage
- [ ] "Unlimited" displayed for -1 limit values
- [ ] All data from server-side, no useEffect fetching
- [ ] `npx tsc --noEmit` passes

---

### 66.2 HIGH — Make video generation limit editable in admin settings

**Ref:** PM audit #31. Video limit uses `<input type="hidden">` — admin cannot change it.

**Files:** `src/components/admin/settings/admin-limits-section.tsx`

**What to do:**

1. Replace `<input type="hidden" name="${fieldPrefix}Video" value={planLimits.video} />` with `<LimitInput label="Video Generations" name="${fieldPrefix}Video" defaultValue={planLimits.video} />`.
2. Verify the form submission parses `${plan}Video` correctly in `admin.actions.tsx`.

**Acceptance criteria:**

- [ ] Video generation limits editable via admin UI for all plans
- [ ] Existing LimitInput component reused (shows Unlimited badge for -1)
- [ ] Form submission correctly saves video limit changes
- [ ] `npx tsc --noEmit` passes

---

### 66.3 MEDIUM — Add usage summary columns to admin users list table

**Ref:** Owner directive: "In /admin/users table must provide information about usage and limits."

**Files:** `src/app/(admin)/admin/users/page.tsx`, `src/components/admin/users/admin-users-table.tsx`, `src/lib/utils/admin-queries.ts`

**What to do:**

1. Extend admin users list query to include plan limits and basic usage data (images/audio/video used, conversations today).
2. Add concise usage columns to the users table: "Plan" (already exists), "Media Used" (e.g., "3/50 img · 2/50 aud · 0/10 vid"), "Convos Today" (e.g., "3/50").
3. Keep table concise — full detail available on user detail page click-through.
4. Data fetched server-side, passed as props to table component.

**Acceptance criteria:**

- [ ] Users list table shows media usage summary per user
- [ ] Users list table shows daily conversation count
- [ ] Data fetched server-side, not client-side
- [ ] Unlimited values shown as "∞"
- [ ] `npx tsc --noEmit` passes

---

## Phase 67: Admin Configurability & Hardcoded Data Removal — HIGH (PM Audit #31, Owner-Directed)

> **HIGH priority. Owner directive: "NO HARDCODED data — everything MUST be fully configurable from the ADMIN panel."**

---

### 67.1 HIGH — Refactor PlanPromo to accept data as props (remove independent fetch)

**Ref:** PM audit #31. `PlanPromo` calls `auth()` + `getUserById()` independently despite being rendered inside pages that already have user data. Redundant DB query. Violates "components must be data consumers" rule.

**Files:** `src/components/shared/plan-promo.tsx`, all parent pages that render `PlanPromo`

**What to do:**

1. Change `PlanPromo` from async Server Component that fetches its own data to a pure data-consuming component that receives `planName`, `role`, and `plan` data as props.
2. Update all parent pages to pass the required props.
3. Remove the independent `auth()` + `getUserById()` calls from PlanPromo.

**Acceptance criteria:**

- [ ] PlanPromo receives all data via props
- [ ] Zero independent data fetching inside PlanPromo
- [ ] All parent pages pass required props
- [ ] `npx tsc --noEmit` passes

---

### 67.2 MEDIUM — Add `"server-only"` import to admin-queries.ts

**Ref:** PM audit #31. `admin-queries.ts` has no `"server-only"` guard — if accidentally imported from a client component, it would leak server-side DB logic.

**Files:** `src/lib/utils/admin-queries.ts`

**What to do:**

1. Add `import "server-only";` as the first import in `admin-queries.ts`.

**Acceptance criteria:**

- [ ] `import "server-only"` present
- [ ] `npx tsc --noEmit` passes

---

### 67.3 MEDIUM — Outsource pure static JSON data to dedicated folder

**Ref:** Owner directive: "JSON data inside app files/components must be outsourced to a folder named json or similar."

**Files:** `src/constants/landing-data.ts`, `src/constants/cookies-data.ts`, `src/constants/privacy-data.ts`, `src/constants/terms-data.ts`

**What to do:**

1. Create `src/json/` directory.
2. Move pure static data arrays from files that have NO dynamic logic:
   - `landing-data.ts` → `src/json/landing.json` (featureCards, howItWorksSteps)
   - `cookies-data.ts` → `src/json/cookies.json` (cookieCategories)
   - `privacy-data.ts` → `src/json/privacy.json` (privacy sections)
   - `terms-data.ts` → `src/json/terms.json` (terms sections — BUT `buildTermsSections` uses pricing interpolation, so only static parts)
3. Keep builder functions that use dynamic config interpolation in `src/constants/` — they import from JSON + apply config.
4. Update imports in consuming components.

**Acceptance criteria:**

- [ ] `src/json/` directory exists with static data files
- [ ] Builder functions remain in `src/constants/` importing from json
- [ ] No runtime logic in JSON files
- [ ] `npx tsc --noEmit` passes

---

## Phase 61: Admin Design Alignment & UX — MEDIUM (PM Audit #28, Owner Directives)

> **MEDIUM priority. Run after Phase 65-67. Admin design must match /app design.**

---

### 61.1 MEDIUM — Proper confirmation modal component (replace window.confirm bridge)

**Ref:** AGENTS.md UX Safety Rules: "No window.confirm() in production UI." Currently 4 locations use window.confirm as temporary bridge.

**Files:** `src/components/admin/admin-managed-form.tsx`, `src/components/chat/library-delete-button.tsx`, `src/components/chat/sidebar/chat-sidebar-nav-v2.tsx`, `src/components/sections/profile-hero-editor.tsx`

**What to do:**

1. Create a reusable `ConfirmationModal` component using the app's design system (not browser native dialog).
2. Replace all 4 `window.confirm()` usages with the new modal.
3. Modal must show title, description, confirm/cancel buttons with appropriate styling.

**Acceptance criteria:**

- [ ] Zero `window.confirm()` calls in src/
- [ ] Reusable `ConfirmationModal` component created
- [ ] All destructive actions use the modal
- [ ] Modal accessible (keyboard, screen reader)
- [ ] `npx tsc --noEmit` passes

---

### 61.2 MEDIUM — Outsource remaining static data constants to JSON folder

**Ref:** If Phase 67.3 is complete, evaluate if additional constants can be moved. If already sufficient, mark as N/A.

**Acceptance criteria:**

- [ ] All pure static data arrays live in `src/json/`
- [ ] Builder functions that use dynamic config remain in `src/constants/`

---

### 61.3 MEDIUM — Admin user detail usage columns in users list table

**Ref:** Superseded by Phase 66.3. If 66.3 is complete, mark this as N/A.

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
> All phases through 64.7 complete. All Milestones 0–21 COMPLETED. Milestone 22 substantially complete.
> Phase 10–12 superseded (see DONE.md for mapping).

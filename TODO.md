# Droplet — TODO

> Prioritized, actionable development tasks. Each task max ~30 minutes.
> Governed by **Droplet-PM**. Do not add tasks without PM approval.
> Ref: `SPEC.md` for full specification. `AGENTS.md` for coding rules. `DONE.md` for completed phases.
> Implementation agent: **Droplet-Engineer** (Senior Developer).
>
> **STATUS: Phases 1–45.4 complete. Phase 43.2 complete (placeholders). Phase 47.1 complete. Phase 34.2–34.8 complete. All Milestones 0–18 MOSTLY COMPLETE. Milestone 12 (Video) COMPLETE.**
> **PM deep audit #23 (2026-03-17): Full triple-audit (PM + Architect + Engineer). Video generation IMPLEMENTED (Phase 34). Plan cards still show "coming soon" for video — MUST FIX. Currency hardcoding confirmed NOT fixed. autoAnimate leak confirmed NOT fixed. Phase 48/49 checkboxes were FALSE — corrected.**
> **360 unit tests passing (65 suites). 174 E2E passing. 6 E2E failed (timeout/navigation, pre-existing). 48 skipped (explained). Build passing.**
> **OWNER INSTRUCTIONS (latest, 2026-03-17): Currency configurability HIGH, admin full permissions display, import type fixes, SVG optimization.**
> **Priority order: 34.9 → 49.1 → 48.1 → 49.2 → 49.3 → 49.4 → 49.5 → 50.1 → 46.x → 31.4 → 29.x → 26.x**
> **All Phase 26+ deferred work is ON HOLD until PM-approved complete.**

---

## Phase 47: Video Generation Claims Suppression — COMPLETED (PM Audit #23)

> **COMPLETED.** Phase 47.1 executed (suppression), then Phase 34.2-34.8 delivered full video implementation, and Phase 34.7 re-enabled `supportsVideoGeneration: true`. Suppression was temporary, now reversed. Archived in `DONE.md`.

---

## Phase 34.9: Video Implementation Quality Fixes — CRITICAL (PM Audit #23)

> **CRITICAL priority. PM audit #23 triple-audit finding: Phase 34 video implementation is structurally sound but has quality gaps that must be fixed before declaring video fully ship-ready.**
> **Plan cards still say "(coming soon)" for video — directly contradicts implemented feature.**
> **Sora API call missing required parameters. VideoPlayer missing iOS support. Tool description has formatting errors. Unit test coverage insufficient.**

---

### 34.9a CRITICAL — Remove "(coming soon)" from plan card video labels

**Ref:** PM audit #23 — 3 instances of `(coming soon)` appended to video generation labels in plan cards. Video IS implemented. User-facing false claim.

**Files:** `src/constants/plans.tsx`

**What to do:**

1. Remove `(coming soon)` suffix from video generation label in Lite plan features (line ~206).
2. Remove `(coming soon)` suffix from video generation label in Pro plan features (line ~270).
3. Remove `(coming soon)` suffix from video generation label in Premium plan features (line ~342).

**Acceptance criteria:**

- [ ] Zero "coming soon" references for video in plan cards
- [ ] Video feature labels match image/audio pattern (just the limit label)
- [ ] `npx tsc --noEmit` passes

---

### 34.9b HIGH — Add `seconds` and `size` parameters to Sora API call

**Ref:** PM audit #23 — `openAiClient.videos.create()` called without `seconds` or `size`. Uncontrolled video output. Phase 34.2 spec explicitly required `seconds: "4"` and `size: "1280x720"`.

**Files:** `src/lib/utils/openai/generateVideo.tsx`

**What to do:**

1. Add `seconds: "4"` to the `openAiClient.videos.create()` call (line ~116).
2. Add `size: "1280x720"` to the same call.

**Acceptance criteria:**

- [ ] Sora API call includes explicit `seconds` and `size`
- [ ] `npx tsc --noEmit` passes

---

### 34.9c HIGH — Add `playsInline` to VideoPlayer

**Ref:** PM audit #23 — `<video>` element missing `playsInline`. iOS Safari forces fullscreen.

**Files:** `src/components/shared/video-player.tsx`

**What to do:**

1. Add `playsInline` attribute to the `<video>` element.

**Acceptance criteria:**

- [ ] `<video>` has `playsInline` attribute
- [ ] Video plays inline on iOS Safari
- [ ] `npx tsc --noEmit` passes

---

### 34.9d HIGH — Fix video tool description missing spaces

**Ref:** PM audit #23 — String concatenation in `videoGenerationTool` produces `"video,e.g."` (missing space).

**Files:** `src/constants/openai.tsx`

**What to do:**

1. Add space before `"e.g."` in the video tool description string concatenation (line ~67-68).

**Acceptance criteria:**

- [ ] Tool description reads naturally with proper spacing
- [ ] `npx tsc --noEmit` passes

---

### 34.9e HIGH — Add failure and timeout unit tests for generateVideo

**Ref:** PM audit #23 — Only 1 happy-path test exists. Phase 34.8 spec required failure/timeout coverage.

**Files:** `tests/unit/generate-video.test.ts`

**What to do:**

1. Add test: Sora API returns `"failed"` status with `failure_reason` → throws error.
2. Add test: Polling exceeds 180s timeout → throws timeout error.
3. Add test: `hardBlocked` policy → throws blocked error.
4. Add test: Video buffer is 0 bytes → throws empty content error.

**Acceptance criteria:**

- [ ] At least 4 additional tests covering failure paths
- [ ] `npm run test` passes

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

- [ ] Zero hardcoded `$` currency symbols in rendering code
- [ ] `currencySymbol` resolved from admin settings with `$` fallback
- [ ] Admin can switch between `$` (USD) and `€` (EUR)
- [ ] All plan cards, FAQs, About, Terms render correct currency symbol
- [ ] `npx tsc --noEmit` passes
- [ ] All tests pass

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

- [ ] autoAnimate called once, not on every message
- [ ] Cleanup function returned from useEffect
- [ ] No MutationObserver leak
- [ ] Scroll-to-bottom still works on new messages
- [ ] `npx tsc --noEmit` passes

---

### 49.2 MEDIUM — Fix `import type` issues in faqs.tsx and about-data.ts

**Ref:** PM audit #22 + Copilot code review — `FullPersonaAccessByPlan` imported as runtime from `effective-persona-access.ts` (which has `import "server-only"`), but only used as a type.

**Files:** `src/constants/faqs.tsx`, `src/constants/about-data.ts`

**What to do:**

1. Change `import { FullPersonaAccessByPlan }` to `import type { FullPersonaAccessByPlan }` in both files.

**Acceptance criteria:**

- [ ] `import type` used for type-only imports from server-only modules
- [ ] No runtime dependency on `server-only` sentinel from constants files
- [ ] `npx tsc --noEmit` passes

---

### 49.3 MEDIUM — Add `unoptimized` to persona card SVG images

**Ref:** PM audit #22 + Copilot code review — `persona-card.tsx` uses `next/image` with SVG hero images. SVGs routed through image optimizer produce blurry raster versions.

**Files:** `src/components/shared/persona-card.tsx`

**What to do:**

1. Add `unoptimized` prop to `<Image>` rendering `persona.heroImage` (which are `.svg` files).

**Acceptance criteria:**

- [ ] SVG persona images served directly without optimization
- [ ] `npx tsc --noEmit` passes

---

### 49.4 MEDIUM — Make PlanPromo and ChatSidebarPromo admin-role-aware

**Ref:** PM audit #22 — Admin users see "Unlock premium features" promo. Owner directive: admin role has full permission with no limitations — promo cards should display relevant info.

**Files:** `src/components/shared/plan-promo.tsx`, `src/components/chat/sidebar/chat-sidebar-promo.tsx`

**What to do:**

1. In `PlanPromo` (Server Component): check `userData.role === "admin"` — if admin, show "Admin Access — Full permissions" instead of upgrade promo.
2. In `ChatSidebarPromo` (Client Component): receive `userRole` prop from parent server layout. If admin, show admin-appropriate message or hide promo entirely.

**Acceptance criteria:**

- [ ] Admin users do not see upgrade promo
- [ ] Admin users see "Admin Access" or equivalent
- [ ] Non-admin users see upgrade promo as before
- [ ] `npx tsc --noEmit` passes

---

### 49.5 MEDIUM — Remove hardcoded promo text in chat-sidebar-promo.tsx

**Ref:** PM audit #22 — Hardcoded "Unlock image and audio features with Pro." text. Should reference plan features dynamically.

**Files:** `src/components/chat/sidebar/chat-sidebar-promo.tsx`

**What to do:**

1. Receive plan name or promo text as prop from parent server layout.
2. Display contextual promo based on current plan: Lite users see upgrade to Pro, Pro users see upgrade to Premium, Premium/admin see nothing.

**Acceptance criteria:**

- [ ] Zero hardcoded promo text
- [ ] Promo contextual to user's current plan
- [ ] `npx tsc --noEmit` passes

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

## Phase 34: Video Generation — COMPLETED (PM Audit #23)

> **COMPLETED (2026-03-17).** All phases 34.1–34.8 implemented by Droplet-Engineer. Verified by triple-audit (PM + Architect + Engineer). Video generation end-to-end operational. Quality gaps tracked in Phase 34.9 above.
> Archived in `DONE.md`.

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

> **Completed phases** are archived in [`DONE.md`](DONE.md).
> All phases through 45.4 complete. Phase 47.1 + 34.2–34.8 complete.
> Phase 10–12 superseded (see DONE.md for mapping).

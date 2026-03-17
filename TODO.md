# Droplet — TODO

> Prioritized, actionable development tasks. Each task max ~30 minutes.
> Governed by **Droplet-PM**. Do not add tasks without PM approval.
> Ref: `SPEC.md` for full specification. `AGENTS.md` for coding rules. `DONE.md` for completed phases.
> Implementation agent: **Droplet-Engineer** (Senior Developer).
>
> **STATUS: Phases 1–43.4 complete (except 43.2 hero images — in progress). All Milestones 0–17 COMPLETED.**
> **PM deep audit #21 (2026-03-17): Full codebase audit by PM + Architect + Engineer. All critical bugs from Phases 40–43 resolved.**
> **359 unit tests passing (65 suites). 180 E2E passing. 48 skipped (explained). Build passing.**
> **OWNER INSTRUCTIONS (latest, 2026-03-17): Admin configurability audit, no hardcoded plan refs, no client fetch(), re-render audit, server-side utilities, JSON/types outsourcing.**
> **Priority order: 44.1 → 44.2 → 44.3 → 44.4 → 44.5 → 45.1 → 45.2 → 45.3 → 45.4 → 43.2 → 46.x → 31.4 → 34.x → 29.1 → 29.2 → Phase 26.**
> **All Phase 26+ deferred work is ON HOLD until Milestone 18 is PM-approved complete.**

---

## Phase 44: Admin Configurability Audit — CRITICAL (Owner-Directed, 2026-03-17)

> **CRITICAL priority. Owner directive: "Plans, prices, features, settings, naming, descriptions, limits, etc must be fully configurable from the ADMIN panel; NO hardcoded references inside code."**
> **PM deep audit #21: Architect + Engineer + PM all confirmed critical hardcoded values in public pages.**
> **Must be resolved before any other feature work.**

---

### 44.1 CRITICAL — Fix stale FAQ persona counts and pricing

**Ref:** PM audit #21 — FAQs reference "3 personas / 7 personas / 10 personas" (old 10-persona system). Current system: 6 personas, 2/5/6 split. Also contains hardcoded "$19" and "$39" prices.

**Files:** `src/constants/faqs.tsx`, `src/components/sections/faqs-section.tsx`

**What to do:**

1. Convert `faqs` from a static constant to a function `buildFaqs(config)` that takes pricing + persona gating config.
2. Replace hardcoded "$19" / "$39" with `config.proPlanPrice` / `config.premiumPlanPrice`.
3. Replace hardcoded "3 personas / 7 personas / 10 personas" with correct admin-resolved counts.
4. All pages rendering FAQs (`/faqs`, `/plans`, `/app/plans`, landing page) must call `getEffectivePlanConfig()` and `getEffectivePersonaAccessByPlan()` server-side and pass to `buildFaqs()`.

**Acceptance criteria:**

- [ ] Zero hardcoded prices in FAQ text
- [ ] Persona counts match current admin-configured values (currently 2/5/6)
- [ ] FAQ renders correctly with admin-overridden pricing
- [ ] `npx tsc --noEmit` passes
- [ ] All tests pass

---

### 44.2 CRITICAL — Fix hardcoded prices and persona count in About page

**Ref:** PM audit #21 — About page has hardcoded `$19`, `$39`, `10` personas, and hardcoded persona gating text.

**Files:** `src/app/(public)/about/page.tsx`

**What to do:**

1. About page is a Server Component — call `getEffectivePlanConfig()` and `getEffectivePersonaAccessByPlan()` at the top.
2. Replace hardcoded `$19` / `$39` with effective pricing values.
3. Replace hardcoded `10` persona count with `PERSONAS.length` or admin-derived count.
4. Replace hardcoded persona gating description ("Lite includes Strategist and Developer...") with dynamically generated text from persona access config.

**Acceptance criteria:**

- [ ] Zero hardcoded pricing in About page
- [ ] Persona count and gating text derived from admin config
- [ ] `npx tsc --noEmit` passes
- [ ] All tests pass

---

### 44.3 CRITICAL — Fix hardcoded prices in Terms page

**Ref:** PM audit #21 — Terms page has `"Pro for $19, and Premium for $39"` hardcoded.

**Files:** `src/app/(public)/terms/page.tsx`

**What to do:**

1. Terms page is a Server Component — call `getEffectivePlanConfig()` at the top.
2. Use template interpolation for the pricing text in `termsSections`.

**Acceptance criteria:**

- [ ] Zero hardcoded prices in Terms page
- [ ] `npx tsc --noEmit` passes

---

### 44.4 HIGH — Make plan card persona labels dynamic

**Ref:** PM audit #21 — Plan card descriptions contain hardcoded "2 personas (full access)", "5 personas (full access)", "All 6 personas", and trial limit labels.

**Files:** `src/constants/plans.tsx`

**What to do:**

1. `buildPlans()` already accepts `pricing` and `limits` params. Add `personaAccess` param.
2. Generate persona count labels dynamically: count the admin-resolved full-access persona IDs per plan.
3. Generate trial limit labels from effective trial limits.
4. Ensure all call sites pass admin-resolved config.

**Acceptance criteria:**

- [ ] Persona count in plan cards matches admin-configured persona access
- [ ] No hardcoded "2 personas" / "5 personas" / "6 personas" strings
- [ ] `npx tsc --noEmit` passes

---

### 44.5 HIGH — Create `getEffectiveTrialLimits()` utility

**Ref:** PM audit #21 — `PERSONA_TRIAL_LIMITS` is used directly in `/api/openai` route (6 call sites). No admin-configurable path.

**Files:** `src/lib/utils/effective-plan-config.ts` (extend), `src/app/api/openai/route.tsx`, `src/constants/plans.tsx`

**What to do:**

1. Add `getEffectiveTrialLimits()` to `effective-plan-config.ts` — reads `AppSetting("admin.trialLimits")`, falls back to `PERSONA_TRIAL_LIMITS`.
2. Replace all 6 direct `PERSONA_TRIAL_LIMITS` references in `/api/openai` route with `effectiveTrialLimits`.
3. Add trial limits section to admin settings page.

**Acceptance criteria:**

- [ ] Zero direct `PERSONA_TRIAL_LIMITS` imports in route handlers
- [ ] Admin can configure trial limits via settings page
- [ ] Falls back to defaults when no admin setting exists
- [ ] `npx tsc --noEmit` passes
- [ ] All tests pass

---

## Phase 45: Code Quality & Organization (Owner-Directed, 2026-03-17)

> **HIGH-MEDIUM priority. After Phase 44. Owner directives: server-side utilities, cleanup dead code, outsource data/types.**

---

### 45.1 HIGH — Remove dead code: V1 sidebar nav

**Ref:** PM audit #21 — `chat-sidebar-nav.tsx` (V1) is dead code. Only V2 is imported. V1 contains broken `/profile` and `/plans` links.

**Files:** `src/components/chat/sidebar/chat-sidebar-nav.tsx`

**What to do:**

1. Verify zero imports of `chat-sidebar-nav.tsx` (confirmed by PM audit).
2. Delete the file.

**Acceptance criteria:**

- [ ] `chat-sidebar-nav.tsx` deleted
- [ ] `npx tsc --noEmit` passes
- [ ] Build passes

---

### 45.2 MEDIUM — Add missing `.lean()` / `.select()` to DB queries

**Ref:** PM audit #21 — 5 DB queries missing read optimizations.

**Files:** `src/app/api/webhooks/stripe/route.tsx`, `src/lib/actions/transaction.action.tsx`, `src/app/api/webhooks/clerk/route.tsx`, `src/lib/utils/check-daily-conversations.ts`

**What to do:**

1. Stripe webhook `Transaction.findOne({ stripeId })` — add `.select("_id").lean()`.
2. Stripe webhook `User.findOne({ _id, clerkId })` — add `.select("_id clerkId").lean()`.
3. `checkoutPlan` `User.findOne({ clerkId })` — add `.select("_id firstName lastName username email").lean()`.
4. Clerk webhook `User.findOne({ clerkId })` — add `.lean()` and `.select()`.
5. `check-daily-conversations.ts` — add `.lean()` to query with existing `.select()`.

**Acceptance criteria:**

- [ ] All 5 queries have `.lean()` and `.select()` applied
- [ ] `npx tsc --noEmit` passes
- [ ] All tests pass

---

### 45.3 MEDIUM — Outsource inline data to constants files

**Ref:** Owner directive: "Dummy data JSONs must be outsourced in a folder named `json` or similar."

**Files:** `src/app/(public)/about/page.tsx`, `src/app/(public)/terms/page.tsx`, `src/app/(public)/privacy/page.tsx`, `src/app/(public)/cookies/page.tsx`, `src/components/sections/landing-page.tsx`

**What to do:**

1. Extract `aboutSections` from `about/page.tsx` to `src/constants/about-data.ts`.
2. Extract `termsSections` from `terms/page.tsx` to `src/constants/terms-data.ts`.
3. Extract `privacySections` from `privacy/page.tsx` to `src/constants/privacy-data.ts`.
4. Extract `cookieCategories` from `cookies/page.tsx` to `src/constants/cookies-data.ts`.
5. Extract `featureCards` and `howItWorksSteps` from `landing-page.tsx` to `src/constants/landing-data.ts`.
6. Import from the new constant files in each page.

**Acceptance criteria:**

- [ ] Zero large inline data arrays in page/component files
- [ ] New constants files in `src/constants/`
- [ ] No behavior changes — data-only extraction
- [ ] `npx tsc --noEmit` passes

---

### 45.4 MEDIUM — Consolidate shared TypeScript types to `src/types/`

**Ref:** Owner directive: "TypeScript must be outsourced from files into a folder named `types` or similar."

**Files:** Multiple component and utility files with shared types.

**What to do:**

1. Deduplicate `UploadRouteResponse` (exists in both `chat-input.tsx` and `profile-hero-editor.tsx`) → move to `src/types/UploadData.d.tsx`.
2. Deduplicate `ModelSettingsFormValue` (exists in both `effective-model-config.ts` and `admin/settings/page.tsx`) → move to `src/types/AdminData.d.tsx`.
3. Move exported `LibraryConversationCardItem`, `LibraryMediaCardItem`, `LibraryPaginationState` from `library-tabs.tsx` → to `src/types/LibraryData.d.tsx`.
4. Move exported `AlertParams` from `alert-message.tsx` → to `src/types/`.
5. Unify `ThemeMode` (in `droplet-theme.tsx`) and `UiThemeMode` (in `use-ui-store.ts`) → single type in `src/types/`.
6. Keep component-scoped Props interfaces co-located (those are fine where they are).

**Acceptance criteria:**

- [ ] Zero duplicated types across files
- [ ] Shared types in `src/types/`
- [ ] Component-local Props interfaces remain in component files
- [ ] `npx tsc --noEmit` passes
- [ ] All tests pass

---

### 45.5 LOW — Fix autoAnimate cleanup in chat-body

**Files:** `src/components/chat/chat-body.tsx`

**What to do:**

1. Store `autoAnimate()` return value.
2. Call cleanup in useEffect return function.

**Acceptance criteria:**

- [ ] No MutationObserver leak from autoAnimate
- [ ] `npx tsc --noEmit` passes

---

## Phase 43.2: Persona Hero Images — IN PROGRESS (Owner providing images)

> **Owner directive: use placeholders for now. Images will be provided by the owner.**

### 43.2 MEDIUM — Persona hero images (6 personas)

**What to do:**

1. Add placeholder hero images for 6 personas in `public/personas/`.
2. Add `heroImage` field to persona definitions in `assistant-personas.tsx`.
3. Display on persona cards and public `/personas` page.
4. Owner will provide final images to replace placeholders.

**Acceptance criteria:**

- [ ] 6 placeholder images in `public/personas/`
- [ ] Each persona definition has `heroImage` path
- [ ] Images visible on persona cards and public page
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

## Phase 34: Video Generation — ON HOLD (gated)

> **GATED:** Requires Sora API verification + S3 cost ceiling approval before implementation.

### 34.1 DECISION GATE — Verify Sora API availability and pricing

### 34.2 HIGH — Implement generateVideo utility

### 34.3 HIGH — Add video tool definition and API route integration

### 34.4 MEDIUM — Video player component for chat messages

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

> **Completed phases** are archived in [`DONE.md`](DONE.md).
> All phases through 43.4 complete (except 43.2 hero images — in progress).
> Phase 10–12 superseded (see DONE.md for mapping).

# Droplet — TODO

> Prioritized, actionable development tasks. Each task max ~30 minutes.
> Governed by **Droplet-PM**. Do not add tasks without PM approval.
> Ref: `SPEC.md` for full specification. `AGENTS.md` for coding rules. `DONE.md` for completed phases.
> Implementation agent: **Droplet-Engineer** (Senior Developer).
>
> **STATUS: All Milestones 0–18 COMPLETE. Phases 1–54.4 complete. 368 unit tests passing (65+ suites). Build passing.**
> **PM deep audit #26 (2026-03-17): Full triple-audit (PM + Architect + Engineer). Owner instructions integrated.**
> **Priority order: 56.1 → 56.2 → 56.3 → 50.1 → 55.1 → 46.1 → 46.2 → 31.4 → 29.x → 26.x**
> **All Phase 26+ deferred work is ON HOLD until PM-approved.**

---

## Phase 56: Admin UI Completeness — HIGH (PM Audit #26, Owner-Reported)

> **HIGH priority. PM audit #26 triple-audit confirmed: admin UI persona gap, Top Personas legacy ID duplicates, admin design token inconsistency. Owner directives: "Admin full permissions over all personas" (UI gap), "Top Personas not correct" (duplicates), "Admin panel design must match /app design" (inconsistent bg tokens).**

---

### 56.1 HIGH — Pass isAdmin to all resolveEntitlements() calls in /app pages

**Ref:** PM audit #26 — Both Architect and Engineer confirmed. Owner directive: "ADMIN has full permissions over all personas in /app/personas — TRIAL is not applicable for admin role."

**Root cause:** Backend (Phase 53.1) correctly grants admin full access in `/api/openai` route. But all 5 `/app` server component pages call `resolveEntitlements()` WITHOUT `isAdmin: true`. Admin users on Lite plan see only 2 personas as "full access" with Trial/PRO/PREMIUM labels on the remaining 4 — even though backend grants full access to all 6.

**Files:** `src/app/(chat)/layout.tsx`, `src/app/(chat)/app/page.tsx`, `src/app/(chat)/app/new/page.tsx`, `src/app/(chat)/app/personas/page.tsx`, `src/app/(chat)/app/c/[conversationId]/page.tsx`

**What to do:**

1. In each of the 5 files, after `ensureUserSynced()`, check `userData?.role === "admin"`.
2. Pass `isAdmin: true` to `resolveEntitlements()` when user is admin.
3. This makes admin users see all 6 personas as "full access" in the UI — matching backend behavior.

**Acceptance criteria:**

- [ ] Admin user sees all 6 personas as "full access" (no Trial/PRO/PREMIUM labels)
- [ ] Admin user sees no trial badges on any persona
- [ ] Non-admin users are unaffected (same behavior as before)
- [ ] `npx tsc --noEmit` passes
- [ ] All tests pass

---

### 56.2 MEDIUM — Fix Top Personas aggregation to filter valid current persona IDs

**Ref:** PM audit #26 — Owner reported: "in /admin/usage page inside Top Personas there is Strategist mentioned several times." Root cause: legacy persona IDs (`analyst`, `best-friend`, `boyfriend`, `girlfriend`) in UsageEvent records from pre-Phase 41 (10→6 persona restructure) resolve to "Strategist" via `getPersona()` fallback. Phase 54.4 null filter is necessary but insufficient.

**Files:** `src/lib/utils/admin-queries.ts`

**What to do:**

1. Import `PERSONAS` from `@/constants/assistant-personas`.
2. Change the first `$match` stage in the topPersonas aggregation from:
   ```js
   { $match: { personaId: { $exists: true, $ne: null } } }
   ```
   to:
   ```js
   {
     $match: {
       personaId: {
         $in: PERSONAS.map((p) => p.id);
       }
     }
   }
   ```
3. This automatically excludes legacy persona IDs by matching only current valid IDs.

**Acceptance criteria:**

- [ ] Top Personas shows each persona at most once
- [ ] Legacy persona IDs (analyst, best-friend, boyfriend, girlfriend) excluded
- [ ] Current valid personas (strategist, teacher, developer, creator, wellness, interviewer) included
- [ ] `npx tsc --noEmit` passes
- [ ] All tests pass

---

### 56.3 MEDIUM — Standardize admin page design tokens

**Ref:** PM audit #26 — Owner directive: "Admin panel layout and sections must respect the same design, fonts, sizes, colors and proportions as /app panel layout — Still old design!!" Root cause: Admin dashboard + usage use `bg-lightBackground-100/80` (correct, matches `/app`), but users, user detail, transactions, transaction detail, and website pages use `bg-white/70` (old design).

**Files:** `src/app/(admin)/admin/users/page.tsx`, `src/app/(admin)/admin/users/[userId]/page.tsx`, `src/app/(admin)/admin/transactions/page.tsx`, `src/app/(admin)/admin/transactions/[transactionId]/page.tsx`, `src/app/(admin)/admin/website/page.tsx`, `src/app/(admin)/admin/website/[pageId]/page.tsx`

**What to do:**

1. Replace all `bg-white/70` with `bg-lightBackground-100/80` in the 6 admin page files.
2. Verify dark mode equivalent is already `dark:bg-jwdMarine-900/70` (should be consistent).
3. Do not change any other styling — only the background token.

**Acceptance criteria:**

- [ ] All admin pages use `bg-lightBackground-100/80` for card backgrounds
- [ ] Visual consistency across all admin pages matches dashboard + usage pages
- [ ] Dark mode unaffected (already using correct `dark:bg-jwdMarine-900/70`)
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

### 55.1 LOW — Move ADMIN_LINKS to constants

**Ref:** PM audit #26 — `ADMIN_LINKS` still inline in `admin-sidebar.tsx`. Model option arrays already moved to `admin-options.ts` (Phase 52.2).

**Files:** `src/components/admin/admin-sidebar.tsx`, new `src/constants/admin.ts`

**What to do:**

1. Move `ADMIN_LINKS` to `src/constants/admin.ts`.

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
> All phases through 54.4 complete. Phase 47.1 + 34.2–34.9e complete.
> Phase 10–12 superseded (see DONE.md for mapping).

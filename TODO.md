# Droplet — TODO

> Prioritized, actionable development tasks. Each task max ~30 minutes.
> Governed by **Droplet-PM**. Do not add tasks without PM approval.
> Ref: `SPEC.md` for full specification. `AGENTS.md` for coding rules. `DONE.md` for completed phases.
> Implementation agent: **Droplet-Engineer** (Senior Developer).
>
> **STATUS: Milestone 22 COMPLETE. All Phases 1–70.1 complete (incl. 63.1–63.2, 61.1). 374 unit tests (65 suites). Build passing.**
> **PM deep audit #34 (2026-03-19): Triple-audit (PM + Architect + Engineer). Owner button color corrections. Phases 69.1, 68.1–68.3, 70.1 archived.**
> **Priority order: 68.4 → 71.1 → 71.2 → 70.2 → 31.4 → 46.x → 29.x → 26.x**
> **HIGH: Phase 68.4 (button text correction). HIGH: Phase 71 (admin persona configurability). HIGH: Phase 70.2 (admin design polish). LOW: remaining.**

---

## Phase 68.4: Button Text Color Correction — HIGH

### 68.4 HIGH — Fix `.btn-text` hover and `.btn-contained` text color

**Ref:** PM audit #34 — Owner correction: `.btn-contained` text must be Midnight Blue (500) not Lavender Haze. `.btn-text` hover must be Lime Green (800) not 500. Engineer's Phase 68.2 implemented per original spec; owner subsequently provided corrections.

**Files:** `src/app/globals.css`

**What to do:**

1. `.btn-text`: Change `hover:text-limeGreen-500` → `hover:text-limeGreen-800`
2. `.btn-contained`: Change `text-lavenderHaze-500` → `text-midnightBlue-500`
3. `.btn-contained`: Change `hover:text-lavenderHaze-800` → `hover:text-midnightBlue-500`
4. Verify visual contrast: midnightBlue-500 (#191970) on limeGreen-500 (#B8F60D) = high contrast. Good.
5. `.icon-btn` — DO NOT CHANGE.

**Acceptance criteria:**

- [ ] `.btn-text` hover color is `limeGreen-800`
- [ ] `.btn-contained` text color is `midnightBlue-500` (both default and hover)
- [ ] `.icon-btn` unchanged
- [ ] No `dark:` prefix on button color properties (same for both themes)
- [ ] Build passes, lint passes

---

## Phase 71: Admin Persona Content Configurability — HIGH

### 71.1 HIGH — Create persona override AppSetting model and resolution layer

**Ref:** PM audit #34 — Owner directive: "NO HARDCODED data — everything MUST be fully configurable from ADMIN panel." Triple-audit confirmed: persona names, descriptions, taglines, system prompts, starter prompts, hero images are ALL hardcoded in `src/constants/assistant-personas.tsx`. Admin personas tab only controls plan-gated access checkboxes.

**Files:** `src/lib/utils/effective-persona-config.ts` (new), `src/constants/assistant-personas.tsx`

**What to do:**

1. Create `getEffectivePersonaConfig()` utility that reads `AppSetting("admin.personaOverrides")` and merges with hardcoded persona defaults.
2. Override fields: `label`, `tagline`, `description`, `starterPrompts[]` (at minimum).
3. System prompts remain in code for v1 (complex, versioned, safety-critical — admin override deferred to v2).
4. Hero images remain in code for v1 (requires file upload flow — deferred to v2).
5. Add `import "server-only"` guard.
6. Return merged persona array with overrides applied on matching `id`.

**Acceptance criteria:**

- [ ] `getEffectivePersonaConfig()` exists and works
- [ ] Returns personas with admin overrides merged
- [ ] Falls back to hardcoded defaults when no overrides exist
- [ ] `import "server-only"` present
- [ ] Unit test for merge behavior

---

### 71.2 HIGH — Add persona content editing to admin settings

**Ref:** Phase 71.1 must be complete first.

**Files:** `src/components/admin/settings/admin-personas-section.tsx`, `src/lib/actions/admin.actions.tsx`

**What to do:**

1. Extend existing admin personas section with editable fields per persona: `label`, `tagline`, `description`, `starterPrompts` (textarea, one per line).
2. Save to `AppSetting("admin.personaOverrides")` as JSON.
3. Wire all persona-consuming pages to use `getEffectivePersonaConfig()` instead of raw `PERSONAS` constant.
4. Audit trail: log admin persona content changes to AdminAuditLog.

**Acceptance criteria:**

- [ ] Admin can edit persona labels, taglines, descriptions, starter prompts from `/admin/settings`
- [ ] Changes persist and propagate to all persona surfaces
- [ ] Fallback to defaults when no overrides set
- [ ] Audit trail logged
- [ ] Build passes

---

## Phase 70.2: Admin Panel Design Polish — HIGH

### 70.2 HIGH — Full admin panel design alignment with /app

**Ref:** PM audit #34 — Owner still reports "old design." Triple-audit found: shell is aligned (same tokens), but card styling, form sections, and overall polish may differ. Content cards use boxy `rounded-2xl` pattern without glassmorphism. No brand identity in admin sidebar header.

**Files:** Admin page files, admin component files

**What to do:**

1. Audit all admin pages (dashboard, users, transactions, usage, settings, website) for visual consistency with `/app` patterns.
2. Apply consistent card elevation, backdrop blur, or other polish elements matching chat panels.
3. Add Droplet brand identity to admin sidebar header (logo or icon).
4. Ensure form sections have the same spacing, font sizes, and border radius as chat-side components.
5. Both light and dark themes must be consistent.

**Acceptance criteria:**

- [ ] Admin panel passes owner visual review
- [ ] Both themes consistent
- [ ] No functional regression
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
> All phases through 70.1 complete (incl. 63.1–63.2, 61.1, 68.1–68.3, 69.1). All Milestones 0–22 COMPLETE.
> Phase 10–12 superseded (see DONE.md for mapping).

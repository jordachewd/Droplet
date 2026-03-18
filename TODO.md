# Droplet — TODO

> Prioritized, actionable development tasks. Each task max ~30 minutes.
> Governed by **Droplet-PM**. Do not add tasks without PM approval.
> Ref: `SPEC.md` for full specification. `AGENTS.md` for coding rules. `DONE.md` for completed phases.
> Implementation agent: **Droplet-Engineer** (Senior Developer).
>
> **STATUS: Milestone 22 COMPLETE. All Phases 1–67.3, 63.1–63.2, 61.1 complete. 369 unit tests passing (65+ suites). Build passing.**
> **PM deep audit #32 (2026-03-18): Triple-audit (PM + Architect + Engineer). 11 previously-listed TODO phases verified DONE in code and archived. All CRITICAL/HIGH owner directives delivered.**
> **Priority order: 31.4 → 46.1 → 46.2 → 29.x → 26.x**
> **Only LOW-priority and ON HOLD items remain. No CRITICAL or HIGH work outstanding.**

---

## ~~Phase 65: CRITICAL Bug Fixes~~ — ✅ DONE (Archived to DONE.md)

**Completed 2026-03-18.** 65.1 (type-specific stop reasons) + 65.2 (UsageEvent cascade) + 65.3 (admin delete order fix) + 65.4 (shared stop-reasons constant) delivered. TD-MEDIA-01, TD-DATA-01, TD-DATA-02 RESOLVED.

---

## ~~Phase 66: Profile & Admin Usability~~ — ✅ DONE (Archived to DONE.md)

**Completed 2026-03-18.** 66.1 (profile usage display) + 66.2 (video limit editable) + 66.3 (admin users table usage columns) delivered.

---

## ~~Phase 67: Admin Configurability & Hardcoded Data Removal~~ — ✅ DONE (Archived to DONE.md)

**Completed 2026-03-18.** 67.1 (PlanPromo props-only) + 67.2 (server-only guard) + 67.3 (JSON outsourcing) delivered.

---

## ~~Phase 61.1: Confirmation Modal~~ — ✅ DONE (Archived to DONE.md)

**Completed 2026-03-18.** ConfirmationModal component created. Zero `window.confirm()` in src/. TD-UX-05 RESOLVED.

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

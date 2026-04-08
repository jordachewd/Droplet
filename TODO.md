# Droplet — TODO

> Prioritized, actionable development tasks. Each task max ~30 minutes.
> Governed by **Droplet-PM**. Do not add tasks without PM approval.
> Ref: `SPEC.md` for full specification. `AGENTS.md` for coding rules. `DONE.md` for completed phases.
> Implementation agent: **Droplet-Engineer** (Senior Developer).
>
> **STATUS: PM audit #102 (2026-04-08). V1.0 MVP RELEASED. Phases 218–219 COMPLETE. Phases 220–222 ACTIVE (shared hook + layout CSS + shared layout shell). OI51 (Stripe recurring) ON HOLD.**
>
> **GATE STATUS: Validation GREEN. Architecture GREEN. Product GREEN. Admin GREEN. Public GREEN. Contract GREEN.**
>
> **TEST STATUS: 644 tests (104 suites), 49 E2E (6 skipped). 0 failures. All gates GREEN.**
>
> **EXECUTION ORDER: Phase 220 → 221 → 222 (222-A → 222-B → 222-C). Phase 217 ON HOLD pending owner decisions.**

---

## ACTIVE — Codebase Cleanup & Shared Layout (Phases 219–222)

> Owner directives OI53–OI57 (PM audit #102). DX/maintainability improvements. Shared layout unification between admin and chat. All findings verified by triple-audit (Architect + Engineer + PM).

### Phase 219 — Orphan Cleanup — COMPLETED

> ✅ DONE (PM audit #102). See [DONE.md](DONE.md) for detailed completion record.

### Phase 220 — Extract `useIsDesktop()` Hook

> **Owner:** OI56. **Risk:** LOW (pure refactor, identical behavior). **Effort:** ~15min. **Dependencies:** None.
>
> 3 independent implementations of `useSyncExternalStore` + `window.matchMedia("(min-width: 1024px)")` exist in:
>
> - `src/components/admin/admin-layout-shell.tsx` (module-level functions)
> - `src/components/chat/sidebar/chat-sidebar-shell.tsx` (inline useCallback)
> - `src/components/chat/sidebar/sidebar-head.tsx` (inline with useRef)
>
> **Acceptance Criteria:**

- [ ] **220.1** — Create `src/lib/hooks/use-is-desktop.ts` with shared `useIsDesktop()` hook using `useSyncExternalStore`
- [ ] **220.2** — Replace implementation in `admin-layout-shell.tsx` with `useIsDesktop()` import
- [ ] **220.3** — Replace implementation in `chat-sidebar-shell.tsx` with `useIsDesktop()` import
- [ ] **220.4** — Replace implementation in `sidebar-head.tsx` with `useIsDesktop()` import
- [ ] **220.5** — Delete the 3 sets of module-level/inline functions that are now unused
- [ ] **220.6** — Validation: knip ✓, tsc ✓, lint ✓, tests ✓, build ✓

### Phase 221 — Extract Shared Layout CSS Classes

> **Owner:** OI55. **Risk:** LOW (CSS extraction, same pattern as Phase 218). **Effort:** ~20min. **Dependencies:** None.
>
> Inline Tailwind patterns used 2-50+ times across different files should be extracted to `src/styles/components/`.
>
> **Acceptance Criteria:**

- [ ] **221.1** — Create `src/styles/components/layout.css` with: `.app-sidebar` (sidebar base classes), `.sidebar-backdrop` (mobile overlay), `.app-header-bar` (sticky header), `.app-header-inner` (header flex container), `.sidebar-nav-link` (navigation link)
- [ ] **221.2** — Create `src/styles/components/forms.css` with: `.form-input` (input field base), `.form-field` (label+input container), `.admin-label` (section label), `.admin-form-surface` (admin surface + form gap)
- [ ] **221.3** — Add `@import "./components/layout.css"` and `@import "./components/forms.css"` to `src/styles/index.css`
- [ ] **221.4** — Apply `.app-sidebar` in `admin-sidebar.tsx`, `chat-sidebar-shell.tsx`, `chat-sidebar-loading.tsx`
- [ ] **221.5** — Apply `.sidebar-backdrop` in `admin-sidebar.tsx`, `chat-sidebar-shell.tsx`
- [ ] **221.6** — Apply `.app-header-bar` + `.app-header-inner` in `admin-layout-shell.tsx`, `chat-header.tsx`
- [ ] **221.7** — Apply `.sidebar-nav-link` in `admin-sidebar.tsx`, `chat-sidebar-nav.tsx`
- [ ] **221.8** — Apply `.form-input` in all admin form sections (50+ occurrences across admin settings forms)
- [ ] **221.9** — Apply `.admin-label` in admin tables and form sections (20+ occurrences)
- [ ] **221.10** — Validation: prettier ✓, lint ✓, tsc ✓, tests ✓, build ✓, knip ✓. Zero visual changes.

### Phase 222 — Shared `AppLayoutShell` + `SidebarShell` Components

> **Owner:** OI54. **Risk:** MEDIUM (affects both layouts simultaneously). **Effort:** ~30min. **Dependencies:** Phases 220, 221.
>
> Admin and chat layouts share ~60% identical code: sidebar wrapper, mobile backdrop, close-on-pathname, sticky header, main content wrapper. Extract shared components with slot-based composition.
>
> **Sub-phases for safety:**

#### Phase 222-A — `SidebarShell` Shared Component

- [ ] **222-A.1** — Create `src/components/shared/sidebar-shell.tsx` (client component) with: sidebar wrapper (uses `.app-sidebar`), mobile backdrop (uses `.sidebar-backdrop`), close-on-pathname effect, Zustand sidebar state. Accepts `header`, `navigation`, `footer` slot props + `id` + `expandedWidth` (w-72 vs w-56).
- [ ] **222-A.2** — Refactor `AdminSidebar` to use `SidebarShell` wrapper (pass admin nav links, head, footer as slots)
- [ ] **222-A.3** — Refactor `ChatSidebarShell` to use `SidebarShell` wrapper (pass chat nav, head, recent section as slots)
- [ ] **222-A.4** — Validation: all gates GREEN. E2E regression check.

#### Phase 222-B — `AppHeader` Shared Component

- [ ] **222-B.1** — Create `src/components/shared/app-header.tsx` (client component) with: sticky header bar (uses `.app-header-bar` + `.app-header-inner`), left content slot, right content slot (default: `ToggleTheme` + `AvatarMenu`)
- [ ] **222-B.2** — Refactor `AdminLayoutShell` header to use `AppHeader` (pass `SidebarToggle` + "Open App" link as left/right content)
- [ ] **222-B.3** — Refactor `ChatHeader` to use `AppHeader` (pass mobile-only `SidebarToggle` + badges as left content)
- [ ] **222-B.4** — Validation: all gates GREEN.

#### Phase 222-C — `AppLayoutShell` Integration

- [ ] **222-C.1** — Create `src/components/shared/app-layout-shell.tsx` with: outer section wrapper, sidebar slot, main content column, skip link. Accepts `sidebar`, `header`, `children`, `mainId`, `skipLinkTarget`.
- [ ] **222-C.2** — Refactor `AdminLayoutShell` to use `AppLayoutShell` (pass `AdminSidebar`, `AppHeader` with admin actions)
- [ ] **222-C.3** — Refactor `(chat)/layout.tsx` to use `AppLayoutShell` (pass `ChatSidebar` with Suspense, `AppHeader` with chat badges)
- [ ] **222-C.4** — Validation: all gates GREEN. Full E2E suite. Zero visual regression.

---

## COMPLETED — Phases 218–219: CSS Architecture + Orphan Cleanup (Archived to DONE.md)

> Phase 218 (CSS modular architecture) ALL COMPLETE. Phase 219 (orphan cleanup) ALL COMPLETE. See [DONE.md](DONE.md) for detailed completion records.

---

## COMPLETED — Sidebar & Navigation Restructure (Archived to DONE.md)

> Phases 209–216 ALL COMPLETE. See [DONE.md](DONE.md) for detailed completion records.

---

## ON HOLD — Stripe Recurring Payment

### Phase 217-A through 217-D — Stripe Subscription Billing

> **Owner:** OI51. **Risk:** HIGH. **BLOCKED pending owner decisions.** See ThePlan.md for full phase breakdown.
>
> **Questions for owner before implementation:**
>
> 1. What happens to existing one-time paid users? Grandfather until expiry then revert to Lite? Auto-migrate to subscription?
> 2. Monthly billing only, or Monthly + Yearly (with discount)?
> 3. Use Stripe Customer Portal for subscription management, or build custom cancel UI?

---

## ON HOLD — Deferred

### Phase 29.6 — updateAdminSettingAction Zod Schema Map (DEFERRED)

> 15+ branches, 6-8 hour refactor, high risk. Current helper pattern works correctly with Zod under the hood. Revisit only if bugs or maintainability issues arise.

### Phase 26.x — Persona-aware media prompts

### Legal/nav/footer admin configurability — Deferred to v2

### TypeScript 6 / @typescript-eslint compatibility — Monitor

### jsdom upgrade — Monitor (pinned to ~24.1.3 due to ESM top-level await incompatibility with Vitest forks pool; upgrade when Vitest resolves ESM environment loading)

---

> **Completed phases** archived in [`DONE.md`](DONE.md).
> Includes: Phases 143–148, 165, 165.1, 180.1–180.4, 185–208, 29.1–29.5, 29.7.
> Phase 29.7 (Zustand audit) — COMPLETE. No changes needed. 4 stores, all properly implemented.

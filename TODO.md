# Droplet — TODO

> Prioritized, actionable development tasks. Each task max ~30 minutes.
> Governed by **Droplet-PM**. Do not add tasks without PM approval.
> Ref: `SPEC.md` for full specification. `AGENTS.md` for coding rules. `DONE.md` for completed phases.
> Implementation agent: **Droplet-Engineer** (Senior Developer).
>
> **STATUS: PM audit #98 (2026-04-07). V1.0 MVP RELEASED. Owner directives OI45–OI51 received. Sidebar restructure + Stripe recurring billing planned.**
>
> **GATE STATUS: Validation GREEN. Architecture GREEN. Product GREEN. Admin GREEN. Public GREEN. Contract GREEN.**
>
> **TEST STATUS: 640 tests (104 suites), 49 E2E (6 skipped). 0 failures. All gates GREEN.**
>
> **EXECUTION ORDER: Phases 209 → 211 → 213 → 212 → 210 → 214 → 215.0 → 215 → 216. Phase 217 ON HOLD.**

---

## ACTIVE — Sidebar & Navigation Restructure

### Phase 209 — Sidebar Label Renames + Library Link Migration

> **Owner:** OI46, OI48. **Risk:** Low. **Effort:** ~20min. **Dependencies:** None.

**What:** Rename sidebar workspace links. Add Library to sidebar. Clean avatar menu.

- [ ] In `chat-sidebar-nav.tsx` `WORKSPACE_LINKS`: rename "Chat Dashboard" → "Home" (keep `href: "/app"`, `exact: true`, icon `bi bi-house`)
- [ ] In `chat-sidebar-nav.tsx` `WORKSPACE_LINKS`: rename "New Conversation" → "Personas" (keep `href: "/app/new"`, icon `bi bi-grid-3x3-gap`)
- [ ] In `chat-sidebar-nav.tsx` `WORKSPACE_LINKS`: add Library entry `{ href: "/app/library", label: "Library", icon: "bi bi-collection" }` after Personas
- [ ] In `avatar-menu.tsx`: remove Library link (`/app/library`)
- [ ] In `avatar-menu.tsx`: remove Personas link (`/app/personas`)
- [ ] Verify sidebar rendering matches expected order: Home → Personas → Library
- [ ] All 7 gates pass

### Phase 211 — Hide Recent Section When Sidebar Collapsed

> **Owner:** OI45. **Risk:** Low. **Effort:** ~15min. **Dependencies:** None.

**What:** When sidebar is closed (desktop collapsed or mobile closed), the Recent heading + conversation items must not render.

- [ ] In `chat-sidebar-nav.tsx`: wrap the Recent `<section>` in a conditional that only renders when `isOpen === true`
- [ ] Verify: when sidebar collapsed on desktop, only Workspace icons visible (no Recent)
- [ ] Verify: when sidebar open, Recent section visible with conversation items
- [ ] All 7 gates pass

### Phase 213 — Sidebar Smooth Transitions (CSS)

> **Owner:** OI45. **Risk:** Low. **Effort:** ~15min. **Dependencies:** Phase 211.

**What:** Add CSS transitions for sidebar section content appear/disappear.

- [ ] Add `transition-all duration-300` (or similar) to sidebar section wrappers
- [ ] Ensure Workspace labels and Recent section fade/slide smoothly on sidebar open/close
- [ ] Verify no layout jumps or content flashes during transition
- [ ] All 7 gates pass

### Phase 212 — Sidebar Loading State

> **Owner:** OI45. **Risk:** Low. **Effort:** ~20min. **Dependencies:** None.

**What:** Show a loading indicator (bubble loader or skeleton) while sidebar data is being fetched server-side.

- [ ] Create a sidebar loading fallback component (skeleton or `LoadingBubbles`)
- [ ] Wrap `ChatSidebar` in `Suspense` with the loading fallback in the chat layout
- [ ] Verify: loading indicator visible on initial page load before sidebar data arrives
- [ ] All 7 gates pass

### Phase 210 — Remove `/app/personas` Route

> **Owner:** OI47. **Risk:** Medium. **Effort:** ~25min. **Dependencies:** Phase 209 (labels updated first).

**What:** Remove the duplicate `/app/personas` route. `/app/new` now serves as the persona browsing page (renamed to "Personas" in sidebar).

- [ ] Verify `/app/new` page has full persona access visibility (lock badges, trial indicators, required plan info) matching what `/app/personas` had. If not, merge missing features first.
- [ ] Delete `src/app/(chat)/app/personas/` directory
- [ ] Add Next.js redirect: `/app/personas` → `/app/new` in `next.config.ts` (for bookmarks)
- [ ] Update `revalidatePath("/app/personas")` calls in `admin.actions.tsx` (3 occurrences) → change to `revalidatePath("/app/new")`
- [ ] Update test assertions if any reference `/app/personas` (`admin-actions-behavior.test.ts` line 446)
- [ ] Verify public `/personas` route (under `(public)`) is untouched
- [ ] All 7 gates pass

### Phase 214 — Move Sidebar Toggle to SidebarHead

> **Owner:** OI45. **Risk:** Medium. **Effort:** ~25min. **Dependencies:** None.

**What:** Move the "Hide sidebar menu" button from ChatHeader into SidebarHead.

- [ ] In `sidebar-head.tsx`: add `SidebarToggle` button. When sidebar open → visible on right side of SidebarHead, same level as logo. When sidebar closed on desktop → hidden by default, appears on hover/focus-within over the logo area.
- [ ] In `chat-header.tsx`: remove `SidebarToggle` rendering. **KEEP a mobile-only hamburger button** that toggles `mobileSidebarOpen` — mobile users need a visible toggle when sidebar is off-screen.
- [ ] Pass sidebar toggle handlers to SidebarHead (via Zustand `useUiStore` — already used in ChatSidebarShell)
- [ ] Verify: desktop open sidebar → toggle visible in SidebarHead
- [ ] Verify: desktop collapsed sidebar → toggle appears on hover over logo
- [ ] Verify: mobile → hamburger button visible in ChatHeader to open sidebar
- [ ] Keyboard accessible: focus-within on logo area triggers toggle visibility
- [ ] All 7 gates pass

### Phase 215.0 — Create `renameTask` Server Action

> **Prerequisite for Phase 215.** **Risk:** Medium. **Effort:** ~20min. **Dependencies:** None.

**What:** Create a dedicated server action for renaming conversations. Cannot use existing `updateTask()` (schema requires `messages`, no `title` field).

- [ ] In `task.actions.tsx`: define `renameTaskSchema = z.object({ title: nonEmptyStringSchema }).strict()`
- [ ] Create `renameTask(taskId: string, title: string)` server action with `"use server"`
- [ ] Auth check (`auth()` + `userId`)
- [ ] Zod validation via `safeParse()`
- [ ] Ownership enforcement: `findOneAndUpdate({ _id: taskId, userId }, { title }, { strict: true, new: true })`
- [ ] Return `{ status: 200 }` on success, `{ status: 4xx, message }` on error
- [ ] Add 2-3 unit tests (success, unauthorized, invalid input)
- [ ] All 7 gates pass

### Phase 215 — Conversation Dropdown Menu (Rename + Delete)

> **Owner:** OI49. **Risk:** Medium. **Effort:** ~30min. **Dependencies:** Phases 211, 213, 215.0.

**What:** Each conversation item in Recent section gets a three-dot dropdown with Rename and Delete.

- [ ] In `chat-sidebar-nav.tsx`: replace standalone delete button with a dropdown trigger (horizontal three-dot icon `bi bi-three-dots`)
- [ ] Dropdown menu with two options: "Rename" and "Delete"
- [ ] "Delete" uses existing `requestDeleteConversation()` flow with `ConfirmationModal`
- [ ] "Rename" triggers inline edit mode: title becomes an editable input, Enter/blur saves via `renameTask()`, Escape cancels
- [ ] Show `AlertMessage` on rename success/failure
- [ ] Dropdown closes on outside click and Escape
- [ ] ARIA: `role="menu"`, `role="menuitem"`, keyboard navigation
- [ ] All 7 gates pass

### Phase 216 — Move PersonaSelector to ChatInput

> **Owner:** OI50. **Risk:** Medium. **Effort:** ~25min. **Dependencies:** None.

**What:** Move PersonaSelector from ChatHeader into ChatInputPrompt, next to the attach file button.

- [ ] In `chat-header.tsx`: remove `PersonaSelector` rendering and all persona-related logic/imports
- [ ] In `chat-input.tsx`: add `PersonaSelector` positioned next to the file upload button (left side of input area)
- [ ] Thread persona props from `ChatWrapper` through to `ChatInput`: `personas`, `allowedPersonaIds`, `selectedPersonaId`, `onPersonaChange`, `disabled`
- [ ] Keep disable logic: `isConversationRoute || messageCount > 0 || taskStatus === "ended"`
- [ ] ChatInput reads persona state from `useChatStore` + `usePreferencesStore` (or receives via props from ChatWrapper)
- [ ] Verify: persona selector visible next to attach button in input area
- [ ] Verify: persona change works on `/app` page (new conversation)
- [ ] Verify: persona selector disabled during active conversation
- [ ] ChatHeader retains: theme toggle, avatar menu, message count badge, conversation ended badge
- [ ] All 7 gates pass

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

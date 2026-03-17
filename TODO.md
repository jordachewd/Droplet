# Droplet — TODO

> Prioritized, actionable development tasks. Each task max ~30 minutes.
> Governed by **Droplet-PM**. Do not add tasks without PM approval.
> Ref: `SPEC.md` for full specification. `AGENTS.md` for coding rules. `DONE.md` for completed phases.
> Implementation agent: **Droplet-Engineer** (Senior Developer).
>
> **STATUS: All Milestones 0–19 COMPLETE. Phases 1–56.3 complete. 368 unit tests passing (65+ suites). Build passing.**
> **PM deep audit #27 (2026-03-17): Full triple-audit (PM + Architect + Engineer). Owner instructions integrated.**
> **Priority order: 57.1 → 57.2 → 57.3 → 57.4 → 58.1 → 58.2 → 58.3 → 59.1 → 59.2 → 31.4 → 46.1 → 46.2 → 29.x → 26.x**
> **All Phase 26+ deferred work is ON HOLD until PM-approved.**

---

## Phase 57: Admin Action Feedback & Safety — CRITICAL (PM Audit #27, Owner Directives #6/#7/#8)

> **CRITICAL priority. PM audit #27 triple-audit unanimous: ALL 14 admin forms have ZERO confirmation dialogs on destructive actions, ZERO visual feedback on any action, and ZERO loading indicators. Owner directives #6, #7, #8 are completely unimplemented in admin panel.**

---

### 57.1 CRITICAL — Add confirmation dialogs to all admin destructive actions

**Ref:** PM audit #27 — Both Architect and Engineer confirmed. Owner directive #6: "Any Delete or Remove user action MUST be prevented by a confirmation message and require user acknowledgement."

**Root cause:** Admin destructive actions fire immediately via plain `<form action={...}>`. Remove User deletes the entire user account, all tasks, transactions, and S3 assets with a single unconfirmed click. Suspend User and Delete Page also have no confirmation.

**Files:** `src/app/(admin)/admin/users/[userId]/page.tsx`, `src/app/(admin)/admin/website/page.tsx`

**What to do:**

1. Create a reusable `AdminActionButton` client component (or similar) that wraps destructive admin form buttons with `window.confirm()` before form submission.
2. Apply to "Remove User" button — message: "Are you sure you want to permanently remove this user? This will delete all their data including conversations, transactions, and files. This action cannot be undone."
3. Apply to "Suspend/Reinstate User" button — message: "Are you sure you want to suspend/reinstate this user?"
4. Apply to "Delete Page" button — message: "Are you sure you want to delete this page? This action cannot be undone."

**Acceptance criteria:**

- [ ] "Remove User" requires explicit confirmation before executing
- [ ] "Suspend/Reinstate User" requires explicit confirmation before executing
- [ ] "Delete Page" requires explicit confirmation before executing
- [ ] Canceling confirmation prevents the action
- [ ] `npx tsc --noEmit` passes
- [ ] All tests pass

---

### 57.2 CRITICAL — Add visual feedback (AlertMessage) to all admin forms

**Ref:** PM audit #27 — Owner directive #7: "Any action (Delete, Remove, Save, Update, Edit, etc) must be confirmed by a similar message as for errors; colors to be adapted (green = success, orange = warning, blue = info, red = error)."

**Root cause:** All 14 admin forms silently reload the page after submission. Admin has zero visual indication whether an action succeeded or failed.

**Affected forms (14 total):**

- Settings: Save Models, Save Pricing, Save Currency, Save Limits, Save Trial Limits, Save Persona Access, Save Theme (7 forms)
- Website: Create Page, Delete Page, Publish/Unpublish, Save Sort Order, Save Page Content (5 forms)
- Users: Suspend/Reinstate, Remove User (2 forms)

**What to do:**

1. Modify server actions (`admin.actions.tsx`, `website.actions.tsx`, etc.) to return `{ success: boolean; message: string }` instead of just calling `revalidatePath()`.
2. Use `useActionState` (React 19) in admin form wrappers to capture action result.
3. Display result using `AlertMessage` component with appropriate severity: `success` (green) for successful operations, `error` (red) for failures.
4. Auto-dismiss success messages after 5 seconds.

**Acceptance criteria:**

- [ ] Every admin save/update/delete action shows visual feedback
- [ ] Success: green AlertMessage with confirmation text
- [ ] Error: red AlertMessage with error description
- [ ] Messages auto-dismiss after timeout
- [ ] `npx tsc --noEmit` passes
- [ ] All tests pass

---

### 57.3 CRITICAL — Add loading indicators to all admin forms

**Ref:** PM audit #27 — Owner directive #8: "If any kind of user action take long time display LoadingBubbles so the user shall be aware that the action is on the way."

**Root cause:** Zero admin forms show any pending/loading state during submission.

**What to do:**

1. Use `useFormStatus()` hook in admin form submit buttons.
2. Show `LoadingBubbles` inline or disable the submit button with "Saving..." text while `pending === true`.
3. Apply to all 14 admin forms identified in 57.2.

**Acceptance criteria:**

- [ ] All admin submit buttons show loading state during submission
- [ ] Buttons disabled while pending (prevent double submission)
- [ ] Loading state visually clear (LoadingBubbles or spinner)
- [ ] `npx tsc --noEmit` passes

---

### 57.4 HIGH — Replace window.alert() with AlertMessage in user-facing actions

**Ref:** PM audit #27 — Owner directive #7 applies to ALL user types (admin, guest, client).

**Root cause:** User-facing delete error paths use `window.alert()` for error feedback. This is functional but visually inconsistent with the app's design system.

**Files:** `src/components/chat/library-delete-button.tsx`, `src/components/chat/sidebar/chat-sidebar-nav-v2.tsx`

**What to do:**

1. Replace `window.alert(...)` calls with `AlertMessage` component (or a callback to parent that triggers `AlertMessage`).
2. Success feedback: green message on successful deletion.
3. Error feedback: red message on failed deletion.

**Acceptance criteria:**

- [ ] No `window.alert()` calls remain in src/ (excluding test files)
- [ ] Delete success shows green feedback
- [ ] Delete failure shows red feedback
- [ ] `npx tsc --noEmit` passes

---

## Phase 58: Admin Bulk Actions — HIGH (PM Audit #27, Owner Directive #9)

> **HIGH priority. PM audit #27 triple-audit confirmed: ZERO admin data tables have bulk selection or bulk action capability. Owner directive: "All data tables in admin must have option to select one, more or all items/rows for Bulk Actions (edit/remove — where appropriate)."**

---

### 58.1 HIGH — Add bulk actions to admin users table

**Files:** `src/app/(admin)/admin/users/page.tsx`

**What to do:**

1. Add checkbox column to users table (per-row + select-all in header).
2. Add bulk action bar that appears when items are selected: "Bulk Suspend" and "Bulk Remove" buttons.
3. Bulk actions must trigger confirmation dialogs (per 57.1 pattern).
4. Show count of selected items.
5. Create corresponding bulk server actions in `admin.actions.tsx`.

**Acceptance criteria:**

- [ ] Users table has per-row checkboxes and select-all
- [ ] Bulk action bar appears when items selected
- [ ] "Bulk Suspend" and "Bulk Remove" available
- [ ] Each bulk action requires confirmation
- [ ] Bulk actions show feedback (per 57.2 pattern)
- [ ] `npx tsc --noEmit` passes

---

### 58.2 HIGH — Add bulk actions to admin transactions table

**Files:** `src/app/(admin)/admin/transactions/page.tsx`

**What to do:**

1. Add checkbox column to transactions table (per-row + select-all).
2. Add bulk action bar with appropriate actions (e.g., "Bulk Remove").
3. Bulk actions require confirmation and show feedback.

**Acceptance criteria:**

- [ ] Transactions table has per-row checkboxes and select-all
- [ ] Bulk action bar appears when items selected
- [ ] Bulk actions require confirmation and show feedback
- [ ] `npx tsc --noEmit` passes

---

### 58.3 HIGH — Add bulk actions to admin website pages table

**Files:** `src/app/(admin)/admin/website/page.tsx`

**What to do:**

1. Add checkbox column to pages table (per-row + select-all).
2. Add bulk action bar: "Bulk Delete", "Bulk Publish", "Bulk Unpublish".
3. Bulk actions require confirmation and show feedback.

**Acceptance criteria:**

- [ ] Website pages table has per-row checkboxes and select-all
- [ ] Bulk action bar appears when items selected
- [ ] "Bulk Delete", "Bulk Publish", "Bulk Unpublish" available
- [ ] Bulk actions require confirmation and show feedback
- [ ] `npx tsc --noEmit` passes

---

## Phase 59: Admin User Detail & Design Polish — MEDIUM (PM Audit #27, Owner Directives #11/#12)

> **MEDIUM priority. Admin user detail displays "used / limit" but not "remaining". Admin form inputs use `bg-white` instead of design tokens.**

---

### 59.1 MEDIUM — Show "remaining" in admin user detail usage section

**Ref:** PM audit #27 — Owner directive #12: "Admin users table and single page must provide information about usage and limits (remained vs included)."

**Files:** `src/app/(admin)/admin/users/[userId]/page.tsx`

**What to do:**

1. Change usage display format from `{used} / {limit}` to `{used} / {limit} ({remaining} left)` or equivalent "remaining" indicator.
2. Show visual progress bar for each metric (image, audio, video, conversations, prompts).
3. "Unlimited" plans show "Unlimited" instead of remaining count.

**Acceptance criteria:**

- [ ] Each usage metric shows used, limit, AND remaining
- [ ] Unlimited values clearly indicated
- [ ] `npx tsc --noEmit` passes

---

### 59.2 MEDIUM — Standardize admin form input design tokens

**Ref:** PM audit #27 — Architect finding M2: admin form inputs use `bg-white` while /app uses design tokens.

**Files:** `src/app/(admin)/admin/website/page.tsx`, `src/app/(admin)/admin/users/page.tsx`, `src/components/admin/settings/admin-models-section.tsx`, `src/components/admin/settings/admin-limits-section.tsx`, `src/components/admin/settings/admin-pricing-section.tsx`, `src/components/admin/tiptap-editor.tsx`

**What to do:**

1. Replace `bg-white` in admin form inputs/selects with `bg-lightBackground-100` (or similar design token matching `/app`).
2. Ensure `dark:bg-jwdMarine-1000` pairing is preserved.

**Acceptance criteria:**

- [ ] Zero `bg-white` in admin page/component files (only design tokens)
- [ ] Dark mode unaffected
- [ ] Visual consistency with /app form inputs
- [ ] `npx tsc --noEmit` passes

---

## Phase 31.4: E2E Test Updates — LOW (remaining)

### 31.4 LOW — Update E2E tests for current UI structure

**Ref:** PM audit #27 — Engineer analysis: 5 E2E failures caused by stale Clerk auth session (4 tests) and DB connectivity (2 tests). `pricing-public.spec.ts` is a duplicate of `plans-public.spec.ts`.

**Files:** `tests/e2e/chat-app-shell.spec.ts`, `tests/e2e/plans-public.spec.ts`, `tests/e2e/pricing-public.spec.ts`, `tests/e2e/public-pages.spec.ts`, `tests/e2e/user-profile.spec.ts`

**What to do:**

1. Fix auth session refresh logic in E2E global setup (stale Clerk token is root cause of 4/5 failures).
2. Remove or repurpose `pricing-public.spec.ts` (duplicate of `plans-public.spec.ts`).
3. Update selectors/assertions in remaining failing specs to match current UI text and structure.
4. Add DB connectivity check in E2E setup.

**Acceptance criteria:**

- [ ] `npm run test:e2e` passes with 0 failures (excluding intentionally skipped)
- [ ] No duplicate test files
- [ ] Auth session handled correctly across test runs

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
> All phases through 56.3 complete. Phase 47.1 + 34.2–34.9e complete.
> Phase 10–12 superseded (see DONE.md for mapping).

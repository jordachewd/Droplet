# Droplet — TODO

> Prioritized, actionable development tasks. Each task max ~30 minutes.
> Governed by **Droplet-PM**. Do not add tasks without PM approval.
> Ref: `SPEC.md` for full specification. `AGENTS.md` for coding rules. `DONE.md` for completed phases.
> Implementation agent: **Droplet-Engineer** (Senior Developer).
>
> **STATUS: Milestone 22 COMPLETE. Milestone 23 Block A COMPLETE. All Phases 1–84, 80.1, 73.1, 74.1, 72.1, 75 complete. 382 unit tests (66 suites). Build passing. Node.js 24.12.0 runtime.**
> **PM deep audit #39 (2026-03-21): Triple-audit (PM + Architect + Engineer). Phase 75 CLOSED (zero /faqs refs found in E2E). New phases: 85 (admin pagination), 86 (server-only guards on models/OpenAI/AWS), 87 (createTaskSchema strict). Zero critical issues. Orphan `_update_plan.cjs` needs manual deletion.**
> **Priority order: 72.2 (HIGH — WCAG) → 72.3 (HIGH — WCAG) → 85 (HIGH — admin pagination) → 72.4 (MEDIUM — WCAG) → 86 (MEDIUM — server-only) → 73.3 (MEDIUM) → 87 (LOW) → 74.2 (MEDIUM) → 73.2 (MEDIUM) → 31.4 → 46.x → 29.x → 26.x**

---

## Phase 73: Codebase Quality — MEDIUM

> Phase 73.1 COMPLETE — archived to DONE.md (PM audit #37).

### 73.2 MEDIUM — Minor re-render and code quality fixes

**Files:** `src/components/chat/sidebar/chat-sidebar-nav-v2.tsx`, `src/components/shared/plan-count-down.tsx`

**What to do:**

1. `chat-sidebar-nav-v2.tsx`: Evaluate if `useEffect → setConversationItems(historyItems)` can be replaced with direct prop usage (eliminate unnecessary state copy).
2. `plan-count-down.tsx`: Verify countdown uses current time reference correctly for each tick.

**Acceptance criteria:**

- [ ] No unnecessary state duplication
- [ ] Countdown displays correctly
- [ ] Build passes

---

### 73.3 MEDIUM — Admin client component data-consumer violations

**Ref:** PM audit #37 + Engineer audit: 3 admin client components import constants directly instead of receiving via props.

**Files:** `src/components/admin/admin-sidebar.tsx`, `src/components/admin/settings/admin-personas-section.tsx`, `src/components/admin/settings/admin-models-section.tsx`

**What to do:**

1. `admin-sidebar.tsx`: Remove `ADMIN_LINKS` constant import. Pass admin links from server parent layout.
2. `admin-personas-section.tsx`: Remove `PERSONAS` constant import. Pass persona base list from server parent.
3. `admin-models-section.tsx`: Remove model option constant imports. Pass model options from server parent.
4. Update admin layout/settings pages to pass required data as props.

**Acceptance criteria:**

- [ ] Zero direct constant imports for dynamic data in admin client components
- [ ] Server parents pass required data
- [ ] Build passes

---

## Phase 72: WCAG 2.2 AA Accessibility Pass — HIGH

> Phase 72.1 COMPLETE — archived to DONE.md (PM audit #38).

### 72.2 HIGH — Color contrast and opacity violations

**Ref:** Triple-audit finding: `opacity-60`, `opacity-65`, `opacity-70` on text elements likely fail WCAG AA 4.5:1 contrast ratio.

**Files:** Admin pages, landing page, sidebar, footer, settings descriptions, profile usage labels — all files with `opacity-60`/`opacity-65`/`opacity-70`/`opacity-85` on text

**What to do:**

1. Audit all `opacity-60`, `opacity-65`, `opacity-70` on text elements across the codebase.
2. Replace opacity-based text dimming with explicit color tokens that maintain AA contrast (e.g., `text-midnightBlue-300 dark:text-lavenderHaze-300` instead of `opacity-60`).
3. Verify key color combinations pass 4.5:1 for normal text, 3:1 for large text.
4. Test with a contrast checker tool.

**Acceptance criteria:**

- [ ] No `opacity-60` or `opacity-65` on text-bearing elements
- [ ] All text meets 4.5:1 contrast on its background
- [ ] Build passes

---

### 72.3 HIGH — Form label, ARIA, and semantic HTML audit

**Files:** All form components, modals, interactive elements

**What to do:**

1. Fix `AvatarMenu` `aria-expanded`: use `aria-expanded={open}` instead of `aria-expanded={open ? "true" : undefined}`.
2. Fix `ConfirmationModal` duplicate IDs: use `useId()` hook for unique `aria-labelledby`/`aria-describedby` IDs.
3. Add `aria-hidden="true"` to decorative Logo SVG in `app-logo.tsx` when text label is visible.
4. Audit all admin form inputs for proper `<label>` association.
5. Verify all `required` fields have `aria-required="true"`.
6. Verify error messages use `aria-live="polite"` or `role="alert"`.

**Acceptance criteria:**

- [ ] `aria-expanded` always has a value (not `undefined`)
- [ ] No duplicate element IDs across simultaneous components
- [ ] All form controls have associated labels
- [ ] Build passes

---

### 72.4 MEDIUM — Admin table semantics

**Ref:** Triple-audit finding: Admin tables use grid divs, not `<table>` — screen readers cannot navigate as table.

**Files:** `src/components/admin/users/admin-users-table.tsx`, `src/components/admin/transactions/admin-transactions-table.tsx`, `src/components/admin/website/admin-website-manager.tsx`

**What to do:**

1. Evaluate whether admin tables should use semantic `<table>`, `<thead>`, `<tbody>`, `<tr>`, `<th>`, `<td>` elements.
2. If using div-based grid, add ARIA table roles: `role="table"`, `role="row"`, `role="columnheader"`, `role="cell"`.
3. Add table caption/aria-label for context.

**Acceptance criteria:**

- [ ] Admin tables navigable by screen readers as data tables
- [ ] Column headers associated with cells
- [ ] Build passes

---

## Phase 74: Admin Configurability Deepening — HIGH

> Phase 74.1 COMPLETE — archived to DONE.md (PM audit #38).

### 74.2 MEDIUM — FAQ content admin-configurable

**Ref:** Owner instruction: "NO HARDCODED data." FAQ questions/answers are hardcoded in `src/constants/faqs.tsx`.

**Files:** `src/constants/faqs.tsx`, admin settings

**What to do:**

1. Add `admin.faqOverrides` to AppSetting.
2. Create `getEffectiveFaqConfig()` that merges admin overrides with defaults.
3. Wire admin settings UI to edit FAQ questions and answers.
4. Audit trail for FAQ changes.

**Acceptance criteria:**

- [ ] FAQ content admin-editable
- [ ] Fallback to defaults
- [ ] Build passes

---

### 74.3 LOW — Content layer admin-configurability assessment

**Ref:** Triple-audit identified remaining hardcoded content: hero copy, landing page cards, about page narrative, navigation labels, footer links, stop reason messages.

**Files:** Assessment only — no code changes.

**What to do:**

1. Assess each content area: can it use the existing `PublicPage` model or does it need AppSetting?
2. Identify which content areas provide the highest admin value.
3. Propose a phased approach for remaining content configurability.

**Acceptance criteria:**

- [ ] Written assessment with recommendation per content area
- [ ] PM-approved priority for each area

---

## Phase 85: Admin Query Pagination — HIGH (NEW — PM audit #39)

### 85.1 HIGH — Add server-side pagination to admin users and transactions queries

**Ref:** PM audit #39 — Architect finding: `getAdminUsers()` and `getAdminTransactions()` fetch ALL records with no `.limit()` or `.skip()`. Unbounded queries cause performance degradation at scale (10k+ records).

**Files:** `src/lib/utils/admin-queries.ts`, `src/components/admin/users/admin-users-table.tsx`, `src/components/admin/transactions/admin-transactions-table.tsx`, `src/app/(admin)/admin/users/page.tsx`, `src/app/(admin)/admin/transactions/page.tsx`

**What to do:**

1. Add `page` and `pageSize` parameters to `getAdminUsers()` and `getAdminTransactions()`.
2. Use `.skip((page - 1) * pageSize).limit(pageSize)` with a separate `countDocuments()` for total count.
3. Return `{ items, total, page, pageSize, totalPages }` from each query.
4. Add pagination UI controls to admin users and transactions tables.
5. Default `pageSize = 25`.

**Acceptance criteria:**

- [ ] Admin users and transactions queries paginated
- [ ] Pagination controls visible on both tables
- [ ] Build passes
- [ ] Unit tests updated

---

## Phase 86: Server-Only Guards — Mongoose Models, OpenAI, AWS — MEDIUM (NEW — PM audit #39)

### 86.1 MEDIUM — Add `import "server-only"` to all Mongoose model files

**Ref:** PM audit #39 — Engineer finding: 8 Mongoose model files lack `server-only` guard. Defense-in-depth — these import `mongoose` which is server-only, but explicit guard prevents accidental client import.

**Files:** All 8 files in `src/lib/database/models/`

**What to do:**

1. Add `import "server-only";` as first line to all 8 model files.
2. Verify no client component directly imports any model file.

**Acceptance criteria:**

- [ ] All 8 model files have `import "server-only"` guard
- [ ] Build passes

---

### 86.2 MEDIUM — Add `import "server-only"` to OpenAI utility files

**Ref:** PM audit #39 — Engineer finding: 5 OpenAI utility files lack guard (excludes `filterAssistantMsg.tsx` which is a pure utility and `message-policy.ts` which may be client-usable).

**Files:** `src/lib/utils/openai/generateAudio.tsx`, `generateImage.tsx`, `generateResponse.tsx`, `generateTitle.tsx`, `generateVideo.tsx`

**What to do:**

1. Add `import "server-only";` to the 5 OpenAI generation utility files.
2. Verify `classify-task-complexity.ts` and `message-policy.ts` — add guard only if they import server deps.
3. `filterAssistantMsg.tsx` is a pure array utility — do NOT add guard.

**Acceptance criteria:**

- [ ] All OpenAI generation utilities have `import "server-only"` guard
- [ ] `filterAssistantMsg.tsx` remains unguarded (pure utility)
- [ ] Build passes

---

### 86.3 MEDIUM — Add `import "server-only"` to AWS utility files

**Ref:** PM audit #39 — Engineer finding: 5 AWS utility files lack guard.

**Files:** All 5 files in `src/lib/utils/aws/`

**What to do:**

1. Add `import "server-only";` to all 5 AWS utility files.
2. Verify no client component directly imports any AWS file.

**Acceptance criteria:**

- [ ] All 5 AWS utility files have `import "server-only"` guard
- [ ] Build passes

---

## Phase 87: createTaskSchema Strict Mode — LOW (NEW — PM audit #39)

### 87.1 LOW — Change createTaskSchema from `.passthrough()` to `.strict()`

**Ref:** PM audit #39 — Architect finding: `createTaskSchema` in `task.actions.tsx` allows arbitrary additional fields via `.passthrough()`. Should use `.strict()` for defense-in-depth consistency.

**Files:** `src/lib/actions/task.actions.tsx`

**What to do:**

1. Change `createTaskSchema` from `.passthrough()` to `.strict()`.
2. Verify no caller passes extra fields to `createTask()`.
3. Run unit tests.

**Acceptance criteria:**

- [ ] `createTaskSchema` uses `.strict()`
- [ ] Unit tests pass
- [ ] Build passes

---

## Phase 31.4: E2E Test Updates — LOW (remaining)

### 31.4 LOW — Update E2E tests for current UI structure

**Ref:** PM audit #28 — Engineer analysis: E2E failures caused by stale Clerk auth session and DB connectivity. `pricing-public.spec.ts` already deleted (confirmed PM audit #38).

**Files:** `tests/e2e/chat-app-shell.spec.ts`, `tests/e2e/plans-public.spec.ts`, `tests/e2e/public-pages.spec.ts`, `tests/e2e/user-profile.spec.ts`

**What to do:**

1. Fix auth session refresh logic in E2E global setup.
2. Update selectors/assertions in remaining failing specs.
3. Add DB connectivity check in E2E setup.

**Acceptance criteria:**

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

> **ON HOLD until all HIGH/CRITICAL-priority phases complete.**

### 29.1 Implement Zod schema validation across the app

### 29.2 Implement Zustand for client-side state management

---

## Phase 26: Deferred Features — ON HOLD

### 26.1 Persona-aware media generation prompts (TD-AI-09)

### 26.2 Implement Stripe subscription mode — auto-renewal (TD-PLAN-01)

---

> **Completed phases** are archived in [`DONE.md`](DONE.md).
> All phases through 84 complete, plus 80.1, 73.1, 74.1, 72.1, 75 (incl. 63.1–63.2, 61.1, 68.1–68.4, 69.1, 70.1–70.2, 71.1–71.2, 76, 80.1, 73.1, 82, 83, 84, 74.1, 72.1, 75). All Milestones 0–22 COMPLETE. Milestone 23 Block A COMPLETE.
> Phase 10–12 superseded (see DONE.md for mapping).

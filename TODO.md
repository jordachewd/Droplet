# Droplet — TODO

> Prioritized, actionable development tasks. Each task max ~30 minutes.
> Governed by **Droplet-PM**. Do not add tasks without PM approval.
> Ref: `SPEC.md` for full specification. `AGENTS.md` for coding rules. `DONE.md` for completed phases.
> Implementation agent: **Droplet-Engineer** (Senior Developer).
>
> **STATUS: PM audit #63 (2026-03-26). Phases 1–130 complete. Phase 120.3 COMPLETE (server action tests rebuilt). 538 unit tests (82 suites). Build passes. TSC passes. Node.js 24.12.0 runtime.**
> **GATE STATUS: All 7 gates GREEN. Lint (0 errors, 6 warnings), Knip (0 findings), TSC, build, unit tests (82/538), E2E (108 passed, 25 skipped, 0 failed) — all pass.**
> **Owner directive (CRITICAL): FULL TDD TESTING REBUILD from scratch. NO hardcoded data. WCAG 2.2 AA. Code reuse. Full admin configurability. Shared Button component migration.**
> **Coverage: ~85/~72/~89/~85 (stmt/branch/func/lines). Thresholds: 76/65/79/76.**
> **SWOT audit conducted (PM audit #63). Weaknesses and Threats converted to tasks below. `as never` casts: 99 remaining in 11 test files.**
> **Priority order: 128.2 (HIGH Button migration — 11 buttons in 8 files) → 106 (HIGH shared types) → 120.4 (CRITICAL TDD route rebuild — eliminates 88 of 99 `as never` casts) → 120.5 (HIGH TDD component rebuild — 51 of 69 components untested) → 120.6 (HIGH TDD E2E rebuild) → 120.7 (HIGH coverage thresholds) → 107 (HIGH stop-reason config — 9 strings) → 108 (MEDIUM WCAG tabs) → 114 (MEDIUM WCAG avatar menu) → 131 (LOW server-only guards) → 132 (LOW stale TODO comments) → 126.2 (LOW lint warnings) → 125.1 (MEDIUM schema strict:true) → 74.2 (MEDIUM FAQ admin) → 104 (MEDIUM landing/hero admin)**

---

## HIGH — Shared Button Migration (PM audit #62)

### Phase 128.2 HIGH — Migrate existing buttons to shared `<Button>` component

> Phase 128.1 COMPLETE — `Button` component created with TDD tests + first consumer (`AdminFormSubmitButton`) migrated. Phase 128.2 covers the remaining 11 raw `<button className="btn btn-*">` instances across 8 files.

**Migration targets (11 buttons in 8 files):**

1. `src/app/error.tsx` — 1 × `btn btn-contained` (error recovery)
2. `src/app/(chat)/error.tsx` — 1 × `btn btn-contained` (error recovery)
3. `src/app/(admin)/admin/users/page.tsx` — 1 × `btn btn-md btn-contained` (form submit)
4. `src/components/shared/confirmation-modal.tsx` — 2 × `btn btn-sm` (cancel + confirm)
5. `src/components/admin/tiptap-editor.tsx` — 3 × `btn btn-sm btn-outlined` (bold, italic, bullets)
6. `src/components/admin/settings/admin-settings-tabs.tsx` — 1 × `btn btn-sm` (tab button)
7. `src/components/sections/profile/profile-hero-editor.tsx` — 1 × `btn btn-contained` (form submit)
8. `src/components/shared/audio-player.tsx` — 1 × `btn btn-sm btn-outlined` (play control)

**What to do:**

1. Replace each raw `<button className="btn btn-*">` with `<Button variant="..." size="...">`.
2. Do NOT change `<Link>` elements or non-`btn` buttons.
3. Verify no visual regressions.

**Acceptance criteria:**

- [ ] All 11 raw `<button className="btn btn-*">` instances use shared `Button`
- [ ] No visual regressions
- [ ] Build passes, tests pass

---

## CRITICAL — Full TDD Testing Rebuild (Owner directive — Primary work stream)

### Phase 120 CRITICAL — Full TDD test rebuild from scratch

> **Owner directive (2026-03-24 — ESCALATED):** Remove ALL existing unit and E2E tests and rebuild the entire testing process from scratch using strict Test-Driven Development methodology.
>
> **Phase 120.1 COMPLETE** — TDD test infrastructure built. See `DONE.md`.
> **Phase 120.2 COMPLETE** — All ~40 utility test files rebuilt from scratch (Batch A+B+C). Zero `as never` casts in utility tests.
> **Phase 120.3 COMPLETE** — All 4 server action test files rebuilt from scratch (TDD). Zero `as never` casts in action tests. Coverage: admin 76.69%, task 94.44%, user 81.25%, transaction 85%.
>
> **Current state:** 538 tests (82 suites). 99 `as never` casts remaining in 11 non-rebuilt test files (6 routes, 4 components, 1 constants). E2E: 14 specs, 108 passed, 25 skipped.
>
> **Key rule:** Every new/rebuilt test file MUST use shared factories from `tests/unit/test-support/`. Zero `as never` casts allowed. Follow TDD workflow in `tests/README.md`.

#### 120.4 CRITICAL — Rebuild API route tests (TDD)

**What to do:**

1. Delete ALL existing route test files in `tests/unit/routes/`
2. Split `openai-route` tests into focused ≤300-line modules by concern (auth, streaming, media, conversation-stop, rate-limit)
3. For each route, write failing tests FIRST
4. Cover: auth failure, malformed input, success paths, edge cases, webhook idempotency

**Target files:** All files in `src/app/api/` (openai, upload, download, aws, webhooks/clerk, webhooks/stripe)

**Acceptance criteria:**

- [ ] All route test files rebuilt from scratch using TDD
- [ ] `openai-route` split into ≤300-line focused test modules
- [ ] Missing edge cases covered (malformed JSON, 503 self-heal failure, non-fatal usage-event)
- [ ] Zero `as never` casts

#### 120.5 HIGH — Rebuild component tests (TDD + a11y)

**What to do:**

1. Delete ALL existing component test files in `tests/unit/components/`
2. For each component, write failing behavioral tests FIRST
3. Focus: user interactions, conditional rendering, a11y attributes, keyboard navigation
4. Every test must answer: "What observable behavior changes if this code breaks?"
5. NO "renders without crashing" tests

**Target files:** All tested components PLUS untested ones: `landing-page.tsx`, `hero-section.tsx`, `faqs-section.tsx`, `plans-section.tsx`, `personas-section.tsx`, `admin-settings-tabs.tsx`, `profile-hero-editor.tsx`

**Acceptance criteria:**

- [ ] All component test files rebuilt from scratch using TDD
- [ ] Keyboard navigation tested for tabs and modals
- [ ] All components with user interactions have tests
- [ ] Zero smoke tests ("renders without crashing")

#### 120.6 HIGH — Rebuild E2E tests (TDD)

**What to do:**

1. Delete ALL existing E2E test files in `tests/e2e/`
2. Rebuild with structural assertions (no hardcoded copy/prices)
3. Add missing specs: chat conversation flow, admin settings propagation, authenticated a11y scan
4. Keep Playwright workers=1 for Clerk stability

**Acceptance criteria:**

- [ ] All E2E test files rebuilt from scratch
- [ ] Basic chat flow E2E exists
- [ ] Admin settings propagation verified E2E
- [ ] Authenticated route a11y scanning added
- [ ] All assertions structural (no hardcoded content)

#### 120.7 HIGH — Raise coverage thresholds post-rebuild

**What to do:** After 120.2–120.5, raise vitest thresholds to match achieved coverage (target: 85/80/85/85+).

**Acceptance criteria:**

- [ ] Thresholds raised to ≥85/80/85/85
- [ ] `npm run test:coverage` passes

---

## HIGH — Code Reuse: Extract shared types (PM audit #47)

### Phase 106 HIGH — Extract `ChatApiResponse` / `ChatStreamEvent` to shared types

> TD-REUSE-04.

**Files:** `src/types/chat-api.d.ts` (new), `src/app/api/openai/route.tsx`, `src/components/chat/chat-wrapper.tsx`

**What to do:**

1. Create `src/types/chat-api.d.ts` with shared types.
2. Import from shared location in both files.
3. Remove local type definitions.

**Acceptance criteria:**

- [ ] Zero duplicate type definitions
- [ ] Build passes, tests pass

---

## HIGH — Admin Configurability: Stop Reason Messages (PM audit #47)

### Phase 107 HIGH — Stop reason messages admin-configurable

> TD-HARDCODE-01. 9 user-facing strings hardcoded.

#### 107.1 HIGH — Create `getEffectiveStopReasonMessages()` resolver

**Files:** `src/lib/utils/effective-stop-reasons.ts` (new), `src/constants/stop-reasons.ts`

**What to do:**

1. Create resolver following `effective-*` pattern.
2. Read from `AppSetting("admin.stopReasonMessages")`.
3. Fallback to `STOP_REASON_MESSAGES`.
4. Add `import "server-only"` guard.

**Acceptance criteria:**

- [ ] Resolver created and tested
- [ ] Falls back to defaults when no admin override
- [ ] Build passes

#### 107.2 HIGH — Admin UI for stop reason message editing

**What to do:**

1. Create `admin-stop-reasons-section.tsx`.
2. One textarea per stop reason code.
3. Save via admin action. Audit trail.

**Acceptance criteria:**

- [ ] All 9 stop reason messages editable from `/admin/settings`
- [ ] Build passes

#### 107.3 HIGH — Wire consumers to use resolver

**What to do:**

1. Replace `STOP_REASON_MESSAGES` import with `getEffectiveStopReasonMessages()`.
2. Pass resolved messages as props.

**Acceptance criteria:**

- [ ] Zero hardcoded stop reason message imports in consumer files
- [ ] Build passes, tests pass

---

## MEDIUM — WCAG 2.2 AA Remaining Gaps

### Phase 108 MEDIUM — Library tabs + admin settings tabs arrow-key navigation (TD-WCAG-05)

> Both `library-tabs.tsx` and `admin-settings-tabs.tsx` have `role="tablist"` but no arrow-key keyboard navigation. WCAG tablist pattern requires Left/Right arrow key focus movement with roving tabindex.

**What to do:**

1. Add `onKeyDown` handler to tablist for ArrowLeft/ArrowRight focus management.
2. Implement roving `tabIndex` (active tab = 0, others = -1).
3. Add Home/End key support for first/last tab.

**Acceptance criteria:**

- [ ] Arrow keys move focus between tabs in both components
- [ ] Roving tabindex implemented
- [ ] Build passes

### Phase 114 MEDIUM — AvatarMenu keyboard navigation (TD-WCAG-07)

> AvatarMenu dropdown has no keyboard navigation. No Escape handler, no Arrow key navigation, no `role="menu"`/`role="menuitem"`.

**What to do:**

1. Add `role="menu"` to dropdown, `role="menuitem"` to links.
2. Add `Escape` key handler to close menu.
3. Add `ArrowDown`/`ArrowUp` key navigation within menu items.
4. Focus management: focus first item on open, return focus to trigger on close.

**Acceptance criteria:**

- [ ] Menu keyboard-navigable
- [ ] Escape closes menu
- [ ] ARIA roles present
- [ ] Build passes

---

## MEDIUM — Admin Configurability (Owner directive)

### Phase 74.2 MEDIUM — FAQ content admin-configurable

**What to do:**

1. `admin.faqContent` AppSetting + `getEffectiveFaqContent()` resolver.
2. Admin UI for FAQ entries. Fallback to `buildFaqs()`.

**Acceptance criteria:**

- [ ] FAQ admin-editable from `/admin/settings`
- [ ] Build passes

### Phase 104 MEDIUM — Landing/hero/about content admin-configurable

#### 104.1 — Landing feature cards + how-it-works

#### 104.2 — Hero copy

#### 104.3 — About page copy

See SPEC.md for full requirements on each.

---

## MEDIUM — Database Schema Hardening (PM audit #58)

### Phase 125.1 MEDIUM — Add explicit `strict: true` to User, Task, Transaction schemas

> Architect finding MEDIUM-01. Mongoose defaults to strict, so no active vulnerability. This is a governance/auditability fix.

**Files:** `src/lib/database/models/user.model.tsx`, `src/lib/database/models/tasks.model.tsx`, `src/lib/database/models/transaction.model.tsx`

**What to do:**

1. Add `{ strict: true }` to schema options for all 3 models.
2. Verify build + tests pass.

**Acceptance criteria:**

- [ ] All 9 Mongoose models have explicit `strict: true` in schema options
- [ ] Build passes, tests pass

### Phase 125.3 LOW — Add `rate-limit.ts` bypass comment

> Architect finding MEDIUM-02. Rate limiter uses `.collection.findOneAndUpdate()` which bypasses Mongoose strict mode — this is intentional for atomic sliding-window logic.

**File:** `src/lib/utils/rate-limit.ts` L69

**What to do:** Add code comment explaining the MongoDB driver bypass is intentional.

---

## LOW — Lint Warning Cleanup (SWOT weakness — PM audit #60)

### Phase 126.2 LOW — Fix 6 `setState-in-effect` lint warnings

> 6 warnings across admin-layout-shell, admin-managed-form, admin-settings-tabs, admin-transactions-table, droplet-theme, audio-player. All are `react-hooks/set-state-in-effect`. Fixable with `key` prop pattern or derived state.

**What to do:**

1. Each component: replace setState-in-useEffect with `key` prop reset pattern or derived state.
2. Target: 0 lint warnings total.

**Acceptance criteria:**

- [ ] `npm run lint` reports 0 warnings
- [ ] No behavioral regressions
- [ ] Build passes, tests pass

---

## LOW — Remaining Work

### Phase 73.2 LOW — Minor re-render and code quality fixes

### Phase 46.1 LOW — Admin error boundary

### Phase 46.2 LOW — Silent catch logging

---

## LOW — Defensive Server-Only Guards (SWOT weakness — PM audit #63)

### Phase 131 LOW — Add `server-only` guard to 4 utility files

> Engineer audit finding. These files are only consumed by server-side code but lack the `import "server-only"` guard. No current leak — purely defensive.

**Files:**

1. `src/lib/utils/serialize-for-client.ts`
2. `src/lib/utils/generateString.tsx`
3. `src/lib/utils/validation-schemas.ts`
4. `src/lib/utils/upload-file-validation.ts`

**What to do:** Add `import "server-only"` at the top of each file.

**Acceptance criteria:**

- [ ] All 4 files have `import "server-only"`
- [ ] Build passes, tests pass

---

## LOW — Stale TODO Comments in Production Code (SWOT weakness — PM audit #63)

### Phase 132 LOW — Resolve stale TODO comments in `ai-model-policy.ts`

> 4 TODO comments at L377–L390. Two reference "when video generation is implemented" — video IS implemented (Phase 34.9). Either resolve with duration-aware pricing or update comments to reflect flat-rate is intentional.

**File:** `src/lib/utils/ai-model-policy.ts` L377–L390

**What to do:**

1. Update L386/L390 comments to note flat-rate pricing is intentional (or implement duration-aware pricing).
2. Review L377/L382 — verify audio token accounting or document current approach as intentional.

**Acceptance criteria:**

- [ ] Zero stale TODO comments in production code
- [ ] Build passes

---

## ON HOLD — Deferred

### Phase 29.x — Zod/Zustand app-wide modernization

### Phase 26.x — Persona-aware media prompts, Stripe auto-renewal

### Legal/nav/footer admin configurability — Deferred to v2

---

> **Completed phases** archived in [`DONE.md`](DONE.md).
> All phases through 130 complete (includes 120.1, 120.2-A/B/C, 120.3, 121–130).
> All Milestones 0–24 COMPLETE. Milestone 25 IN PROGRESS.

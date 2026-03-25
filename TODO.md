# Droplet — TODO

> Prioritized, actionable development tasks. Each task max ~30 minutes.
> Governed by **Droplet-PM**. Do not add tasks without PM approval.
> Ref: `SPEC.md` for full specification. `AGENTS.md` for coding rules. `DONE.md` for completed phases.
> Implementation agent: **Droplet-Engineer** (Senior Developer).
>
> **STATUS: PM audit #60 (2026-03-25). Phases 1–126 + 120.2-B complete. 120.2-C in progress (34/~40 utility files). 480 unit tests (76 suites). Build passes. TSC passes. Node.js 24.12.0 runtime.**
> **GATE STATUS: All 7 gates GREEN. Lint (0 errors, 6 warnings), Knip (0 findings), TSC, build, unit tests (76/480), E2E (108 passed, 25 skipped, 0 failed) — all pass.**
> **Owner directive (CRITICAL): FULL TDD TESTING REBUILD from scratch. NO hardcoded data. WCAG 2.2 AA. Code reuse. Full admin configurability. Shared Button component.**
> **Coverage: 85.47 / 72.36 / 89.5 / 85.68 (stmt/branch/func/lines). Thresholds: 76/65/79/76.**
> **SWOT audit conducted (PM audit #60). Weaknesses and Threats converted to tasks below.**
> **Priority order: 127 (CRITICAL AppSetting enum fix) → 128 (HIGH shared Button component) → 120.2-C (CRITICAL TDD utility rebuild — 6 remaining) → 120.3 (CRITICAL TDD action rebuild) → 106 (HIGH shared types) → 125.2 (HIGH transaction query fix) → 126.1 (HIGH handleError sanitization) → 120.4 (CRITICAL TDD route rebuild) → 120.5 (HIGH TDD component rebuild) → 120.6 (HIGH TDD E2E rebuild) → 120.7 (HIGH coverage thresholds) → 125.1 (MEDIUM schema strict:true) → 107 (HIGH stop-reason config) → 108 (MEDIUM WCAG tabs) → 114 (MEDIUM WCAG avatar menu) → 126.2 (LOW lint warnings) → 74.2 (MEDIUM FAQ admin) → 104 (MEDIUM landing/hero admin)**

---

## CRITICAL — Bug Fix (SWOT Threat — PM audit #60)

### Phase 127 CRITICAL — Fix AppSetting Mongoose `category` enum mismatch

> SWOT Threat: Zod schema in `admin.actions.tsx` includes `"trial"` in category enum, but Mongoose model `app-setting.model.tsx` does not. Any admin setting saved with `category: "trial"` passes Zod validation but fails at MongoDB level — silent data loss risk.

**Files:** `src/lib/database/models/app-setting.model.tsx`

**What to do:**

1. Add `"trial"` to the Mongoose `category` enum in `AppSettingSchema` and the `IAppSetting` interface.
2. Verify build + tests pass.

**Acceptance criteria:**

- [ ] Mongoose enum matches Zod enum: `["plans", "models", "theme", "limits", "trial", "features"]`
- [ ] Build passes, tests pass
- [ ] No silent DB failures for trial settings

---

## HIGH — Shared Button Component (Owner directive — PM audit #60)

### Phase 128 HIGH — Create shared configurable `<Button>` component

> Owner directive: create a configurable shared Button component to be used everywhere. Currently 30+ raw `<button>` instances with inline class patterns (`btn btn-sm/md/lg btn-contained/outlined/text`). No single reusable component exists.

#### 128.1 HIGH — Create `src/components/shared/button.tsx`

**What to do:**

1. Create `Button` component with props: `variant` (`contained` | `outlined` | `text`), `size` (`sm` | `md` | `lg`), `loading` (boolean → shows `LoadingBubbles` + disables), `disabled`, `type` (`button` | `submit` | `reset`), `className` (override), `children`, standard HTML button props.
2. Component must compose CSS classes from the existing `btn btn-*` pattern in `globals.css`.
3. Must include `aria-busy={loading}` when loading.
4. Must have unique CSS class `Button` on wrapper.
5. Write TDD tests FIRST.
6. Export from `src/components/shared/button.tsx`.

**Acceptance criteria:**

- [ ] `Button` component created with variant/size/loading/disabled props
- [ ] Uses existing `btn btn-*` CSS classes
- [ ] `aria-busy` set when loading
- [ ] TDD test file created with render + interaction tests
- [ ] Build passes, tests pass

#### 128.2 HIGH — Migrate existing buttons to shared `<Button>` component

**What to do:**

1. Incrementally replace raw `<button className="btn btn-*">` instances with `<Button>`.
2. Start with admin forms (`AdminFormSubmitButton` → use `Button` internally).
3. Then shared components, then page-level buttons.
4. Do NOT change `<Link>` elements or non-`btn` buttons yet.

**Acceptance criteria:**

- [ ] All `<button className="btn btn-*">` instances use shared `Button`
- [ ] No visual regressions
- [ ] Build passes, tests pass

---

## CRITICAL — Full TDD Testing Rebuild (Owner directive — Primary work stream)

### Phase 120 CRITICAL — Full TDD test rebuild from scratch

> **Owner directive (2026-03-24 — ESCALATED):** Remove ALL existing unit and E2E tests and rebuild the entire testing process from scratch using strict Test-Driven Development methodology.
>
> **Phase 120.1 COMPLETE** — TDD test infrastructure built. See `DONE.md`.
> **Phase 120.2 Batch A COMPLETE** — 6 IO/business-critical utility test files hardened. Tests: 409 → 419.
> **Phase 120.2 Batch B COMPLETE** — 8 HIGH-priority utility test files rebuilt. Tests: 419 → 480 (76 suites).
> **Phase 120.2 Batch C IN PROGRESS** — 34 of ~40 utility test files rebuilt. 6 remaining.
>
> **Current state:** 480 tests (76 suites). ~200 `as never` casts remaining in 12+ NON-rebuilt test files. E2E: 14 specs, 108 passed, 25 skipped.
>
> **Key rule:** Every new/rebuilt test file MUST use shared factories from `tests/unit/test-support/`. Zero `as never` casts allowed. Follow TDD workflow in `tests/README.md`.

#### 120.2-C CRITICAL — Finish utility test rebuild (TDD) — 6 remaining files

**Status: IN PROGRESS — 34/~40 files done.**

**Already rebuilt (34 files):** `admin-auth`, `admin-audit`, `delete-s3-prefix`, `get-file-from-aws`, `message-id`, `task-queries`, `type-guards`, `usage-event-utils`, `download-url-allowlist`, `get-formatted-date`, `message-policy`, `validation-schemas`, `ai-model-policy`, `resolve-entitlements`, `check-usage-limit`, `check-daily-conversations`, `effective-plan-config`, `effective-persona-access`, `effective-persona-config`, `effective-model-config`, `ensure-user-synced`, `rate-limit`, `generate-response`, `generate-image`, `generate-audio`, `generate-video`, `getFullName`, `filterAssistantMsg`, `handleError`, `classify-task-complexity`, `s3-file-reference`, `upload-file-validation`, `admin-queries`, `generateTitle`.

**Remaining files to rebuild (6 — Batch C):**

1. `database/mongoose.tsx` — DB connection (MEDIUM)
2. `normalize-public-asset-url.ts` — URL normalization (MEDIUM)
3. `serialize-for-client.ts` — serialization (MEDIUM)
4. `map-date-to-label.ts` — date labels (MEDIUM)
5. `getPlanStatus.tsx` — plan status (MEDIUM)
6. `generateString.tsx` — random string generation (MEDIUM)

**Per-file TDD workflow:**

1. Delete existing test file if present
2. Write failing tests FIRST covering all branches
3. Verify existing code passes
4. Target: 100% branch on pure functions, ≥85% on IO utilities
5. Use shared factories — zero `as never`

**Acceptance criteria:**

- [ ] All ~40 utility test files rebuilt from scratch using TDD
- [ ] Zero `as never` casts in utility tests
- [ ] Pure functions: 100% branch coverage
- [ ] IO utilities: ≥85% branch coverage
- [ ] All tests use shared factories

#### 120.3 CRITICAL — Rebuild server action tests (TDD)

**What to do:**

1. Delete ALL existing action test files in `tests/unit/actions/`
2. For each exported server action, write failing tests FIRST covering: auth failure, forbidden, success, edge cases, audit trail, ownership enforcement
3. Target: ≥75% branch coverage on all action files

**Target files:** `admin.actions.tsx`, `task.actions.tsx`, `user.actions.tsx`, `transaction.action.tsx`

**Acceptance criteria:**

- [ ] All action test files rebuilt from scratch using TDD
- [ ] `admin.actions.tsx` branch coverage ≥75%
- [ ] Auth/ownership enforcement tested on every action
- [ ] Admin audit trail verified on every admin mutation
- [ ] Zero `as never` casts

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

## HIGH — Database & Query Hardening (SWOT weakness — PM audit #60)

### Phase 125.2 HIGH — Harden `getAllTransactions()` query

> SWOT weakness: unbounded `.find()` without `.select()`. Has `.lean()` already. No `.limit()`. Returns all fields of all user transactions. Auth + ownership IS verified, but violates database discipline rules and leaks internal fields.

**File:** `src/lib/actions/transaction.action.tsx` L114

**What to do:**

1. Add `.select("plan amount billing createdAt expiresOn")` projection.
2. Add `.limit(100)`.
3. Verify no consumer depends on excluded fields.

**Acceptance criteria:**

- [ ] Query uses `.select()`, `.limit()`
- [ ] No consumer regressions
- [ ] Build passes, tests pass

---

## HIGH — Error Handling Hardening (SWOT threat — PM audit #60)

### Phase 126.1 HIGH — Sanitize `handleError` message propagation

> SWOT Threat: `handleError.tsx` re-throws with raw `error.message`. If any server action's `handleError` call goes uncaught before the UI boundary, internal DB/provider messages could leak to the client. All current call sites catch, but pattern is fragile.

**File:** `src/lib/utils/handleError.tsx`

**What to do:**

1. Strip internal details from the re-thrown `Error.message` — keep original in `cause` only.
2. Return generic "An unexpected error occurred" for non-whitelisted error messages.
3. Maintain `stderr` logging of full error details for debugging.

**Acceptance criteria:**

- [ ] `handleError` never propagates raw internal error messages
- [ ] Full error detail preserved in `error.cause` for server-side debugging
- [ ] All server action callers still function correctly
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

## ON HOLD — Deferred

### Phase 29.x — Zod/Zustand app-wide modernization

### Phase 26.x — Persona-aware media prompts, Stripe auto-renewal

### Legal/nav/footer admin configurability — Deferred to v2

---

> **Completed phases** archived in [`DONE.md`](DONE.md).
> All phases through 126 complete (includes 120.1, 120.2-A, 121–126).
> All Milestones 0–24 COMPLETE. Milestone 25 IN PROGRESS.

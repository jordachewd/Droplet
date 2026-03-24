# Droplet — TODO

> Prioritized, actionable development tasks. Each task max ~30 minutes.
> Governed by **Droplet-PM**. Do not add tasks without PM approval.
> Ref: `SPEC.md` for full specification. `AGENTS.md` for coding rules. `DONE.md` for completed phases.
> Implementation agent: **Droplet-Engineer** (Senior Developer).
>
> **STATUS: PM audit #52 (2026-03-24). Phases 1–113.2, 112.2, 109 complete. 482 unit tests (76 suites). Build passes. TSC passes. Node.js 24.12.0 runtime.**
> **GATE STATUS: 2 gates RED (Lint + Knip). TSC, build, unit tests (76/482), E2E (108 passed, 25 skipped, 0 failed) — pass.**
> **Owner directive (CRITICAL): FULL TDD TESTING REBUILD from scratch. NO hardcoded data. WCAG 2.2 AA. Code reuse. Full admin configurability.**
> **Priority order: 115 (BLOCKER lint) → 116 (BLOCKER orphan files) → 112.3 (CRITICAL server actions) → 112.4 (CRITICAL API routes) → 108 (MEDIUM WCAG tabs) → 114 (MEDIUM WCAG avatar menu) → 106 (HIGH shared types) → 107 (HIGH stop-reason config) → 112.5 (HIGH component rebuild) → 74.2 (MEDIUM FAQ admin) → 104 (MEDIUM landing/hero admin) → 112.6 (HIGH E2E expansion) → 112.7 (HIGH coverage thresholds) → 110 (LOW)**

---

## BLOCKER — Validation Gate Failures (PM audit #52)

### Phase 115 BLOCKER — Fix ESLint gate failure

> PM audit #52 discovered: ESLint crashes with `could not find plugin "react-hooks"`. Root cause: `react-hooks/set-state-in-effect` rule is referenced in a standalone config object, but the plugin is only registered inside `eslint-config-next`'s config objects. In ESLint flat config, plugins must be available in the same config object that references their rules.

**File:** `eslint.config.mjs`

**What to do:**

1. Import `eslint-plugin-react-hooks` directly from the nested path or install it as a direct dependency.
2. Register the plugin in the same config object that defines the `react-hooks/set-state-in-effect` rule.
3. Alternative: move the rule into the `nextCoreWebVitals` spread's config scope, or remove the rule if the plugin version doesn't support it in standalone registration.
4. Verify `npm run lint` passes with 0 errors.

**Acceptance criteria:**

- [ ] `npm run lint` exits 0 (no errors)
- [ ] `react-hooks/set-state-in-effect` rule is either properly registered or safely removed
- [ ] All 7 gates GREEN

### Phase 116 BLOCKER — Delete orphan dev scripts and build artifacts

> PM audit #52 discovered: 6 orphan files in project root left by agent editing sessions. These cause `npm run knip` and `npx prettier --check` to fail.

**Files to delete:**

1. `_e.js` — agent-generated ThePlan.md editing script
2. `_edit.js` — agent-generated editing script
3. `_edit_plan.js` — agent-generated editing script
4. `parse-results.cjs` — vitest result parser script
5. `parse-results.mjs` — vitest result parser script (duplicate)
6. `vitest-results.json` — 150KB build artifact

**What to do:**

1. Delete all 6 files.
2. Verify `npm run knip` passes (0 findings).
3. Verify `npx prettier --check` passes (0 warnings).

**Acceptance criteria:**

- [ ] All 6 files deleted
- [ ] `npm run knip` exits 0
- [ ] `npx prettier --check` exits 0
- [ ] All 7 gates GREEN

---

## CRITICAL — TDD Testing Rebuild (Owner directive — Primary work stream)

### Phase 112.3 CRITICAL — Rebuild server action tests (TDD)

**Target files:**

1. `admin.actions.tsx` — **27.81% branch** — all admin mutations, critical security surface
2. `admin-queries.ts` — **20.14% branch** — admin data access layer
3. `task.actions.tsx` — task CRUD (verify existing coverage)
4. `user.actions.tsx` — user mutations + deletion cascade (verify existing)
5. `transaction.action.tsx` — transaction operations (verify existing)

**Approach:** Test each exported action: auth failure, forbidden, success, edge cases. Verify audit trail. Verify ownership enforcement.

**Acceptance criteria:**

- [ ] `admin.actions.tsx` branch coverage ≥60%
- [ ] `admin-queries.ts` branch coverage ≥50%
- [ ] Auth/ownership enforcement tested on every action
- [ ] Admin audit trail verified on every admin mutation

### Phase 112.4 CRITICAL — Rebuild API route tests (TDD)

**Target files:**

1. `openai-route.test.ts` — REFACTOR: split into ≤300-line focused modules, keep scenarios, reduce `as never` casts
2. `/api/upload` route tests — verify/improve
3. `/api/download` route tests — verify/improve
4. `/api/aws` route tests — verify/improve
5. Clerk webhook route tests — verify idempotency + edge cases
6. Stripe webhook route tests — verify idempotency + plan update

**Missing edge cases to add:**

- Malformed JSON body handling
- `ensureUserSynced` failure path (503 response)
- `emitUsageEvents` failure being non-fatal
- Concurrent request race conditions

**Acceptance criteria:**

- [ ] `openai-route.test.ts` split into focused sub-files
- [ ] Missing edge cases covered
- [ ] `as never` casts reduced to zero (use typed factories)

### Phase 112.5 HIGH — Rebuild component tests (TDD + a11y)

**Target files (0% or thin coverage):**

1. `chat-body.tsx` — **14% branch** — core chat display
2. `chat-wrapper.tsx` — main chat client (streaming + state)
3. `library-tabs.tsx` — tab management + keyboard nav
4. `header.tsx` — mobile menu toggle + scroll
5. `chat-sidebar-shell.tsx` — resize + localStorage
6. `admin-settings-tabs.tsx` — tab management

**Approach:** Test user interactions, conditional rendering, a11y attributes. NOT "renders without crashing". Every test must answer: "What observable behavior changes if this code breaks?"

**Acceptance criteria:**

- [ ] All target components have behavioral tests
- [ ] `chat-body.tsx` branch coverage ≥50%
- [ ] Keyboard navigation tested for tabs and modals

### Phase 112.6 HIGH — Expand E2E test suite

**New/improved specs:**

1. Admin settings → app propagation E2E (Phase 97.2)
2. Chat conversation flow (send prompt → receive response → continue) — currently MISSING
3. Authenticated route a11y scan (extend `accessibility.spec.ts` to `/app/*` routes)
4. Remove local `withMongoConnection` duplication (Phase 97.3)

**Acceptance criteria:**

- [ ] Admin settings propagation verified E2E
- [ ] Basic chat flow E2E exists
- [ ] Authenticated route a11y scanning added
- [ ] Zero local Mongo helper duplication

### Phase 112.7 HIGH — Raise coverage thresholds post-rebuild

**File:** `vitest.config.mts`

**What to do:** After 112.3–112.5, raise thresholds to match achieved coverage (target: 82/78/82/82+).

**Acceptance criteria:**

- [ ] Thresholds raised to ≥82/78/82/82
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

### Phase 110 LOW — Mobile header hamburger `aria-expanded`

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
> All phases through 113.2 + 112.2 + 109 complete.
> All Milestones 0–24 COMPLETE. Milestone 25 IN PROGRESS.

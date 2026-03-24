# Droplet — TODO

> Prioritized, actionable development tasks. Each task max ~30 minutes.
> Governed by **Droplet-PM**. Do not add tasks without PM approval.
> Ref: `SPEC.md` for full specification. `AGENTS.md` for coding rules. `DONE.md` for completed phases.
> Implementation agent: **Droplet-Engineer** (Senior Developer).
>
> **STATUS: PM audit #51 (2026-03-24). All Phases 1–113.2 complete. 443 unit tests (74 suites). Build passes. TSC passes. Node.js 24.12.0 runtime.**
> **GATE STATUS: ALL 7 gates GREEN. Lint (0 errors, 6 warnings), knip (0 findings), TSC, build, unit tests (74/443), E2E (108 passed, 25 skipped, 0 failed) — all pass.**
> **Coverage: 78.55/66.3/83.53/78.85.**
> **Owner directive (CRITICAL): FULL TDD TESTING REBUILD from scratch. NO hardcoded data. WCAG 2.2 AA. Code reuse. Full admin configurability. Components as data consumers. Server-side utilities.**
> **Priority order: 112.2 (CRITICAL TDD rebuild core utils) → 109 (HIGH WCAG icons — quick win) → 112.3 (CRITICAL server actions) → 114 (MEDIUM WCAG avatar menu) → 112.4 (CRITICAL API routes) → 106 (HIGH shared types) → 107 (HIGH stop-reason config) → 108 (MEDIUM WCAG tabs) → 112.5 (HIGH component rebuild) → 74.2 (MEDIUM FAQ admin) → 104 (MEDIUM landing/hero admin) → 112.6 (HIGH E2E expansion) → 112.7 (HIGH coverage thresholds) → 110 (LOW) → 87 (LOW)**

---

## CRITICAL — TDD Testing Rebuild (Owner directive — Primary work stream)

### Phase 112.2 CRITICAL — Rebuild core utility unit tests (TDD) — IN PROGRESS

> Started: effective-persona-access.ts (100% branch ✅), handleError.tsx (100% branch ✅). Remaining 8 utilities need TDD rebuild.

**Target files (pure logic — remaining low branch coverage):**

1. ~~`effective-persona-access.ts`~~ — **100% branch** — DONE
2. ~~`handleError.tsx`~~ — **100% branch** — DONE
3. `deleteFileFromAWS.tsx` — **0% branch** — S3 cleanup, MUST test
4. `mongoose.tsx` — **21.73% branch** — DB connection manager
5. `check-usage-limit.ts` — verify/improve existing tests
6. `check-daily-conversations.ts` — verify/improve existing tests
7. `resolve-entitlements.ts` — verify/improve existing tests
8. `ai-model-policy.ts` — verify/improve existing tests
9. `classify-task-complexity.ts` — verify/improve existing tests
10. `message-policy.ts` — verify/improve existing tests

**Approach:** Write behavioral tests covering all branches. Test edge cases, error paths, boundary conditions. No mocking of pure logic — only mock IO boundaries (DB, network).

**Acceptance criteria:**

- [ ] `effective-persona-access.ts` branch coverage ≥80%
- [ ] `handleError.tsx` branch coverage ≥60%
- [ ] `deleteFileFromAWS.tsx` branch coverage ≥60%
- [ ] `mongoose.tsx` branch coverage ≥40%
- [ ] All 10 utility files have behavioral tests
- [ ] Tests validate observable outputs, not mock calls

#### 112.3 CRITICAL — Rebuild server action tests (TDD)

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

#### 112.4 CRITICAL — Rebuild API route tests (TDD)

**Target files:**

1. `openai-route.test.ts` — REFACTOR: split into ≤300-line focused modules, keep scenarios, reduce `as never` casts
2. `/api/upload` route tests — verify/improve
3. `/api/download` route tests — verify/improve
4. `/api/aws` route tests — verify/improve
5. Clerk webhook Route tests — verify idempotency + edge cases
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

#### 112.5 HIGH — Rebuild component tests (TDD + a11y)

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

#### 112.6 HIGH — Expand E2E test suite

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

#### 112.7 HIGH — Raise coverage thresholds post-rebuild

**File:** `vitest.config.mts`

**What to do:** After 112.2–112.5, raise thresholds to match achieved coverage (target: 82/78/82/82+).

**Acceptance criteria:**

- [ ] Thresholds raised to ≥82/78/82/82
- [ ] `npm run test:coverage` passes

---

## HIGH — Code Reuse: Extract shared types (PM audit #47)

### Phase 106: Extract `ChatApiResponse` / `ChatStreamEvent` to shared types — HIGH

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

### Phase 107: Stop reason messages admin-configurable — HIGH

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

## MEDIUM — Admin Configurability (Owner directive)

### Phase 74.2 MEDIUM — FAQ content admin-configurable

**What to do:**

1. `admin.faqContent` AppSetting + `getEffectiveFaqContent()` resolver.
2. Admin UI for FAQ entries. Fallback to `buildFaqs()`.

**Acceptance criteria:**

- [ ] FAQ admin-editable from `/admin/settings`
- [ ] Build passes

### Phase 104: Landing/hero/about content admin-configurable — MEDIUM

#### 104.1 — Landing feature cards + how-it-works

#### 104.2 — Hero copy

#### 104.3 — About page copy

See SPEC.md for full requirements on each.

---

## HIGH — WCAG 2.2 AA Remaining Gaps

### Phase 109 HIGH — Decorative icon `aria-hidden` across ~20 components (TD-WCAG-06)

> Architect audit confirmed: ~20 components with `<i className="bi bi-*">` icons missing `aria-hidden="true"`. Screen readers announce empty or meaningless content. Affects: logout-btn, avatar-menu, image-holder, alert-message, library-tabs, chat-input, chat-body, chat-intro, plan-card, persona-card, profile-billing, faqs-section, admin-sidebar, chat-sidebar-nav-v2, sidebar-toggle.

**What to do:**

1. Add `aria-hidden="true"` to all decorative `<i>` Bootstrap Icons across the codebase.
2. Grep for `<i className="bi ` and verify each — if decorative, add `aria-hidden="true"`.
3. Icons that convey meaning (e.g., icon-only buttons without text labels) need `aria-label` on the parent instead.

**Acceptance criteria:**

- [ ] All decorative `<i>` icons have `aria-hidden="true"`
- [ ] Icon-only interactive elements have `aria-label`
- [ ] Build passes, axe-core E2E passes

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

### Phase 114 MEDIUM — AvatarMenu keyboard navigation

> Architect audit: AvatarMenu dropdown has no keyboard navigation. No Escape handler, no Arrow key navigation, no `role="menu"`/`role="menuitem"`.

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
> All phases through 112.1 complete.
> All Milestones 0–24 COMPLETE. Milestone 25 IN PROGRESS.

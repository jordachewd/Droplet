# Droplet — TODO

> Prioritized, actionable development tasks. Each task max ~30 minutes.
> Governed by **Droplet-PM**. Do not add tasks without PM approval.
> Ref: `SPEC.md` for full specification. `AGENTS.md` for coding rules. `DONE.md` for completed phases.
> Implementation agent: **Droplet-Engineer** (Senior Developer).
>
> **STATUS: PM audit #56 (2026-03-24). Phases 1–123 complete (incl. 120.1). 120.2 partially complete (20/~40 utility files). 370 unit tests (62 suites). Build passes. TSC passes. Node.js 24.12.0 runtime.**
> **GATE STATUS: All 7 gates GREEN. Lint (0 errors, 6 warnings), Knip (0 findings), TSC, build, unit tests (62/370), E2E (108 passed, 25 skipped, 0 failed) — all pass.**
> **Owner directive (CRITICAL): FULL TDD TESTING REBUILD from scratch. NO hardcoded data. WCAG 2.2 AA. Code reuse. Full admin configurability.**
> **Priority order: 120.2 (CRITICAL TDD utility rebuild — continue) → 120.3 (CRITICAL TDD action rebuild) → 106 (HIGH shared types) → 120.4 (CRITICAL TDD route rebuild) → 120.5 (HIGH TDD component rebuild) → 120.6 (HIGH TDD E2E rebuild) → 120.7 (HIGH coverage thresholds) → 107 (HIGH stop-reason config) → 108 (MEDIUM WCAG tabs) → 114 (MEDIUM WCAG avatar menu) → 74.2 (MEDIUM FAQ admin) → 104 (MEDIUM landing/hero admin)**

---

## CRITICAL — Full TDD Testing Rebuild (Owner directive — Primary work stream)

### Phase 120 CRITICAL — Full TDD test rebuild from scratch

> **Owner directive (2026-03-24 — ESCALATED):** Remove ALL existing unit and E2E tests and rebuild the entire testing process from scratch using strict Test-Driven Development methodology. Write failing tests FIRST, then write just enough code to make them pass. This prevents over-engineering and ensures only necessary code is written.
>
> **Phase 120.1 COMPLETE** — TDD test infrastructure built (factories, mock helpers, vitest.setup, tests/README.md). See `DONE.md`.
> **Phase 120.2 IN PROGRESS** — 20 of ~40 utility test files rebuilt. Continue from here.
>
> **Current state:** 370 tests (62 suites). ~200 `as never` casts remaining in 18 NON-rebuilt files. 21/62 files use shared factories. E2E: 14 specs, 108 passed, 25 skipped.
>
> **Key rule:** Every new/rebuilt test file MUST use shared factories from `tests/unit/test-support/`. Zero `as never` casts allowed. Follow TDD workflow in `tests/README.md`.

#### 120.2 CRITICAL — Continue utility test rebuild (TDD)

**Status: IN PROGRESS — 20/~40 files done.**

**Already rebuilt (20 files):** `admin-auth`, `admin-audit`, `delete-s3-prefix`, `get-file-from-aws`, `message-id`, `task-queries`, `type-guards`, `usage-event-utils`, `download-url-allowlist`, `get-formatted-date`, `message-policy`, `validation-schemas`, `ai-model-policy`, `resolve-entitlements`, `check-usage-limit`, `check-daily-conversations`, `effective-plan-config`, `effective-persona-access`, `effective-persona-config`, `effective-model-config`.

**Remaining files to rebuild (~20):**

**Batch A — CRITICAL (IO/business logic, do first):**

1. `ensure-user-synced.ts` — self-healing user sync (CRITICAL)
2. `rate-limit.ts` — rate limiting (CRITICAL)
3. `openai/generateResponse.tsx` — core AI response generation (CRITICAL)
4. `openai/generateImage.tsx` — image generation (CRITICAL)
5. `openai/generateAudio.tsx` — audio generation (CRITICAL)
6. `openai/generateVideo.tsx` — video generation (CRITICAL)

**Batch B — HIGH (important utilities):**

7. `admin-queries.ts` — admin data queries
8. `openai/generateTitle.tsx` — title generation
9. `openai/classify-task-complexity.ts` — task complexity classifier
10. `upload-file-validation.ts` — file upload validation
11. `database/mongoose.tsx` — DB connection
12. `handleError.tsx` — error handler

**Batch C — MEDIUM (smaller pure utilities):**

13. `openai/filterAssistantMsg.tsx` — message filter
14. `aws/s3-file-reference.ts` — S3 URL reference
15. `normalize-public-asset-url.ts` — URL normalization
16. `serialize-for-client.ts` — serialization
17. `map-date-to-label.ts` — date labels
18. `getPlanStatus.tsx` — plan status
19. `getFullName.tsx` — user name
20. `generateString.tsx` — random string generation

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
> All phases through 116 complete (includes 113.2, 112.2, 112.1, 109, 110, 115, 116).
> All Milestones 0–24 COMPLETE. Milestone 25 IN PROGRESS.

# Droplet — TODO

> Prioritized, actionable development tasks. Each task max ~30 minutes.
> Governed by **Droplet-PM**. Do not add tasks without PM approval.
> Ref: `SPEC.md` for full specification. `AGENTS.md` for coding rules. `DONE.md` for completed phases.
> Implementation agent: **Droplet-Engineer** (Senior Developer).
>
> **STATUS: PM audit #47 (2026-03-21). All Phases 1–103.4 complete (including 73.3, 96.5–96.8, 99.2, 99.4). 433 unit tests (72 suites). All 7 gates GREEN. Build passing. Node.js 24.12.0 runtime.**
> **E2E: 108 passed, 0 failed, 25 skipped.**
> **Coverage: 78.18/65.94/83.01/78.51. Phase 98 IN PROGRESS.**
> **Owner directive: FULL TESTING INFRASTRUCTURE REBUILD from scratch. TDD methodology. No hardcoded data. Code reuse maximized. WCAG 2.2 AA compliance. Full admin configurability.**
> **Priority order: 105 (HIGH server-only guards) → 106 (HIGH shared types) → 107 (HIGH stop-reason admin config) → 98 (HIGH coverage) → 74.2 (MEDIUM FAQ admin) → 104 (MEDIUM landing/hero admin) → 108 (MEDIUM WCAG tabs keyboard) → 109 (MEDIUM WCAG icon a11y) → 97.2 (MEDIUM E2E admin settings) → 97.3 (LOW E2E dedup) → 87 (LOW) → 29.x → 26.x**

---

## ~~COMPLETED — Phases 94–103.4~~

> All moved to DONE.md. Phases 94–96.8, 97.1, 99.1–99.5, 100.1–100.4, 101, 102, 103.1–103.4, 73.3.

---

## HIGH — Security Hardening (PM audit #47, Triple-Audit finding)

### Phase 105: Add missing `server-only` guards — HIGH

> `classify-task-complexity.ts` and `message-policy.ts` are server-only utilities consumed only by `/api/openai` route. Missing `import "server-only"` guard creates risk of accidental client import.

#### 105.1 HIGH — Add `server-only` to `classify-task-complexity.ts`

**File:** `src/lib/utils/openai/classify-task-complexity.ts`

**What to do:**

1. Add `import "server-only";` at line 1.
2. Verify build passes.

**Acceptance criteria:**

- [ ] `import "server-only"` present
- [ ] Build passes, tests pass

#### 105.2 HIGH — Add `server-only` to `message-policy.ts`

**File:** `src/lib/utils/openai/message-policy.ts`

**What to do:**

1. Add `import "server-only";` at line 1.
2. Verify build passes.

**Acceptance criteria:**

- [ ] `import "server-only"` present
- [ ] Build passes, tests pass

---

## HIGH — Code Reuse: Extract shared types (PM audit #47, Triple-Audit finding)

### Phase 106: Extract `ChatApiResponse` / `ChatStreamEvent` to shared types — HIGH

> `ChatApiResponse` interface is defined identically in both `src/app/api/openai/route.tsx` and `src/components/chat/chat-wrapper.tsx`. `OpenAIStreamEvent` (route) and `ChatStreamEvent` (wrapper) are structurally identical. Violates code reuse rule.

**Files:** `src/types/chat-api.d.ts` (new), `src/app/api/openai/route.tsx`, `src/components/chat/chat-wrapper.tsx`

**What to do:**

1. Create `src/types/chat-api.d.ts` with shared `ChatApiResponse` and `ChatStreamEvent` types.
2. Import from shared location in both files.
3. Remove local type definitions.

**Acceptance criteria:**

- [ ] Zero duplicate type definitions
- [ ] Build passes, tests pass

---

## HIGH — Admin Configurability: Stop Reason Messages (PM audit #47, Triple-Audit finding)

### Phase 107: Stop reason messages admin-configurable — HIGH

> Owner directive: "NO HARDCODED data." Stop reason messages in `src/constants/stop-reasons.ts` are user-facing copy displayed when limits are hit. These are a core product touchpoint and must be admin-editable. Follows the established `effective-*` pattern.

#### 107.1 HIGH — Create `getEffectiveStopReasonMessages()` resolver

**Files:** `src/lib/utils/effective-stop-reasons.ts` (new), `src/constants/stop-reasons.ts` (fallback source)

**What to do:**

1. Create `getEffectiveStopReasonMessages()` following the `effective-*` pattern.
2. Read from `AppSetting("admin.stopReasonMessages")`.
3. Fallback to current hardcoded `STOP_REASON_MESSAGES` constant.
4. Add `import "server-only"` guard.

**Acceptance criteria:**

- [ ] Resolver created and tested
- [ ] Falls back to current constants when no admin override exists
- [ ] Build passes

#### 107.2 HIGH — Admin UI for stop reason message editing

**Files:** Admin settings page, new section component

**What to do:**

1. Create `admin-stop-reasons-section.tsx` in admin settings.
2. One textarea per stop reason code.
3. Save to `AppSetting` via admin action. Audit trail logged.

**Acceptance criteria:**

- [ ] All 9 stop reason messages editable from `/admin/settings`
- [ ] Build passes

#### 107.3 HIGH — Wire consumers to use effective resolver

**Files:** `src/app/(chat)/app/page.tsx`, `src/app/(chat)/app/c/[conversationId]/page.tsx`, `src/app/api/openai/route.tsx`

**What to do:**

1. Replace `STOP_REASON_MESSAGES` import with `getEffectiveStopReasonMessages()` call.
2. Pass resolved messages as props to consuming components.

**Acceptance criteria:**

- [ ] Zero hardcoded stop reason message imports in consumer files
- [ ] Build passes, tests pass

---

## HIGH — Coverage Gate Achievement (PM audit #47)

### Phase 98: Coverage Improvement — HIGH

> Coverage baseline: 78.18/65.94/83.01/78.51. Branch coverage (65.94%) remains the biggest gap. Target: 82/78/82/82+.
> **Priority files for branch coverage (0% or <30%):** effective-persona-access.ts (0%), deleteFileFromAWS.tsx (0%), chat-body.tsx (14%), mongoose.tsx (21.73%), admin.actions.tsx (27.81%), handleError.tsx (33.33%), admin-queries.ts (20.14%).

#### 98.1 HIGH — Close branch coverage gap — target 78%+

**Approach:** Focus on the 7 files listed above. Iterative: run coverage → write behavioral tests → repeat.

**Priority targets (most business-critical first):**

1. `effective-persona-access.ts` — 0% branch. Core entitlement logic. MUST be tested.
2. `admin.actions.tsx` — 27.81% branch. All admin mutations. Critical security surface.
3. `chat-body.tsx` — 14% branch. Core chat display component.
4. `admin-queries.ts` — 20.14% branch. Admin data access layer.
5. `mongoose.tsx` — 21.73% branch. DB connection manager.
6. `handleError.tsx` — 33.33% branch. Error utility.
7. `deleteFileFromAWS.tsx` — 0% branch. S3 cleanup.

**Acceptance criteria:**

- [ ] Branch coverage >= 78%
- [ ] Tests validate actual branching behavior, not mock wiring
- [ ] All 7 priority files have >= 60% branch coverage

#### 98.2 HIGH — Close statement/line coverage gap — target 82%+

**Acceptance criteria:**

- [ ] Statement coverage >= 82%
- [ ] Line coverage >= 82%

#### 98.3 HIGH — Raise thresholds to match achieved coverage

**File:** `vitest.config.mts`

**Acceptance criteria:**

- [ ] Thresholds raised to match or exceed achieved coverage
- [ ] `npm run test:coverage` passes with new thresholds

---

## MEDIUM — Admin Configurability (Owner directive: NO hardcoded data)

### Phase 74.2 MEDIUM — FAQ content admin-configurable

**Files:** `src/constants/faqs.tsx`, admin settings

**What to do:**

1. Add `admin.faqContent` AppSetting field.
2. Create `getEffectiveFaqContent()` resolver with fallback to `buildFaqs()`.
3. Admin UI for adding/editing/removing FAQ entries.

**Acceptance criteria:**

- [ ] FAQ questions and answers admin-editable from `/admin/settings`
- [ ] Fallback to defaults
- [ ] Build passes

### Phase 104: Landing page and hero content admin-configurable — MEDIUM

#### 104.1 MEDIUM — Landing page feature cards + how-it-works admin-editable

**Files:** Admin settings, `src/lib/utils/effective-website-config.ts` (new), landing page Server Component

**What to do:**

1. Add `admin.landingFeatureCards` and `admin.howItWorksSteps` AppSetting fields.
2. Create `getEffectiveLandingContent()` resolver with fallback to `src/json/landing.json`.
3. Admin settings UI for editing.
4. Landing page reads from resolver instead of static import.

**Acceptance criteria:**

- [ ] Feature cards and how-it-works steps admin-editable from `/admin/settings`
- [ ] Fallback to defaults if no admin override
- [ ] Build passes

#### 104.2 MEDIUM — Hero copy admin-editable

**What to do:**

1. Add `admin.heroCopy` AppSetting field (headline, subtitle, CTA text).
2. Resolver with fallback to current static text in `hero-section.tsx`.
3. Admin UI for editing. Server parent passes resolved copy as props.

**Acceptance criteria:**

- [ ] Hero headline, subtitle, CTA text admin-editable
- [ ] Build passes

#### 104.3 MEDIUM — About page copy admin-editable

**What to do:**

1. Add `admin.aboutCopy` AppSetting field.
2. Resolver with fallback to `buildAboutSections()`.
3. Admin UI for editing section titles and body text.

**Acceptance criteria:**

- [ ] About page section text admin-editable
- [ ] Build passes

---

## MEDIUM — WCAG 2.2 AA Remaining Gaps (PM audit #47, Triple-Audit)

### Phase 108: Library tabs arrow-key keyboard navigation — MEDIUM

> WCAG requires arrow-key focus movement between tabs in a tablist pattern. Currently tabs are `button` elements with `role="tablist"` and `aria-selected` but no arrow-key handler.

**File:** `src/components/chat/library-tabs.tsx`

**What to do:**

1. Add `onKeyDown` handler to tablist that moves focus with Left/Right arrow keys.
2. Tab key should move focus out of tablist (not between tabs).

**Acceptance criteria:**

- [ ] Arrow-key navigation between library tabs works
- [ ] Keyboard-only users can switch tabs
- [ ] Build passes

### Phase 109: Landing page feature card icon accessibility — MEDIUM

> Feature card icons use `<i className={card.icon}></i>` with no `aria-hidden="true"`. Screen readers may announce class names.

**File:** `src/components/sections/landing-page.tsx`

**What to do:**

1. Add `aria-hidden="true"` to decorative `<i>` icon elements.
2. Ensure the heading adequately describes each card (icon is decorative, not informational).

**Acceptance criteria:**

- [ ] Icons have `aria-hidden="true"`
- [ ] Build passes

### Phase 110: Mobile header hamburger `aria-expanded` — LOW

**File:** `src/components/layout/header.tsx`

**What to do:**

1. Add `aria-expanded={isMenuOpen}` to hamburger button.

**Acceptance criteria:**

- [ ] Hamburger button announces open/close state to screen readers
- [ ] Build passes

---

## MEDIUM — E2E Test Quality

### Phase 97: E2E Test Depth Improvement

> ~~97.1 COMPLETE (DONE.md).~~ Remaining: 97.2, 97.3.

#### 97.2 MEDIUM — Add admin settings → app propagation E2E

**File:** New: `tests/e2e/admin-settings-propagation.spec.ts`

**What to do:**

1. Test: Admin changes support email in settings → public plans page shows new email.
2. Test: Admin changes plan price → plans page shows new price.
3. Revert changes in `afterAll`.

**Acceptance criteria:**

- [ ] Settings-to-app propagation verified end-to-end
- [ ] Test data cleaned up

#### 97.3 LOW — Deduplicate withMongoConnection in conversation-lifecycle

**File:** `tests/e2e/conversation-lifecycle.spec.ts`

**What to do:**

1. Replace local `withMongoConnection` with import from `tests/e2e/utils/mongo.ts`.

**Acceptance criteria:**

- [ ] Zero local Mongo helper duplication
- [ ] Tests pass

---

## LOW — Remaining Work

### Phase 87 LOW — createTaskSchema strict mode

**File:** `src/lib/actions/task.actions.tsx`

### Phase 73.2 LOW — Minor re-render and code quality fixes

**Files:** `src/components/chat/sidebar/chat-sidebar-nav-v2.tsx`, `src/components/shared/plan-count-down.tsx`

### Phase 46.1 LOW — Admin error boundary

### Phase 46.2 LOW — Silent catch logging

---

## ON HOLD — Deferred

### Phase 29.x — Zod/Zustand app-wide modernization

### Phase 26.x — Persona-aware media prompts, Stripe auto-renewal

### Legal page admin configurability — Deferred to v2

> Legal pages (privacy, cookies, terms) content in static JSON. Intentionally code-managed for compliance reasons. Admin editing deferred until rich text editor (Tiptap) is re-evaluated.

### Nav/footer admin configurability — Deferred to v2

> Header nav links and footer content are hardcoded. Low user-impact, internal concern. Deferred.

### Admin nav configurability — Deferred to v2

> `ADMIN_LINKS` hardcoded. Internal admin concern only. No user impact. Deferred.

---

> **Completed phases** archived in [`DONE.md`](DONE.md).
> All phases through 103.4 complete (including 73.3, 86, 88–96.8, 97.1, 99.1–99.5, 100.1–100.4, 101, 102).
> All Milestones 0–24 COMPLETE. Milestone 25 IN PROGRESS.

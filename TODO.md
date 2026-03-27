# Droplet — TODO

> Prioritized, actionable development tasks. Each task max ~30 minutes.
> Governed by **Droplet-PM**. Do not add tasks without PM approval.
> Ref: `SPEC.md` for full specification. `AGENTS.md` for coding rules. `DONE.md` for completed phases.
> Implementation agent: **Droplet-Engineer** (Senior Developer).
>
> **STATUS: PM audit #65 (2026-03-27). Milestones 0–25 COMPLETE. Phases 1–130, 120.4–120.7, 128.2, 106 all complete. 543 unit tests (92 suites). 5 E2E specs. Build passes. TSC clean. Node.js 24.12.0 runtime.**
> **GATE STATUS: All 7 gates GREEN. Lint (0 errors, 7 warnings), Knip (0 findings), TSC clean, build passes, unit tests (92/543), E2E (5 specs), coverage 85/80/85/85.**
> **TDD REBUILD COMPLETE — Owner directive fulfilled. Phases 120.1–120.7 ALL DONE. Zero `as never` casts.**
> **SWOT audit #65 conducted. Weaknesses and Threats converted to tasks below.**
> **NEXT SESSION: 107 (HIGH stop-reason config) → 108 (MEDIUM WCAG tabs) → 114 (MEDIUM WCAG avatar menu) → 125.1 (MEDIUM schema strict:true) → 133 (MEDIUM streaming timeout) → 134 (MEDIUM E2E expansion) → 131 (LOW server-only) → 132 (LOW stale TODOs) → 126.2 (LOW lint warnings) → 74.2 (MEDIUM FAQ admin) → 104 (MEDIUM landing/hero admin)**

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

## MEDIUM — Streaming Timeout (SWOT threat — PM audit #65)

### Phase 133 MEDIUM — Add auto-timeout to streaming fetch in chat-wrapper.tsx

> Engineer audit finding. Streaming SSE fetch uses `AbortController` for manual cancel only. No auto-timeout — hung SSE connection leaves user in infinite loading state.

**File:** `src/components/chat/chat-wrapper.tsx`

**What to do:**

1. Add `AbortSignal.timeout()` or manual `setTimeout` + `abort()` as a safety net (e.g., 120s).
2. Show timeout error message to user when triggered.
3. Ensure abort cleanup is correct in both manual-cancel and timeout paths.

**Acceptance criteria:**

- [ ] Streaming fetch aborts automatically after reasonable timeout (e.g., 120s)
- [ ] User sees error message on timeout
- [ ] Manual cancel still works
- [ ] Build passes, tests pass

---

## MEDIUM — E2E Coverage Expansion (SWOT weakness — PM audit #65)

### Phase 134 MEDIUM — Add E2E tests for critical business paths

> E2E coverage dropped from 14 specs to 5 during TDD rebuild. Critical user paths now lack end-to-end coverage: billing/checkout flow, media generation, admin operations, error states.

**What to do:**

1. Add E2E spec for billing/checkout flow (structural assertions).
2. Add E2E spec for admin user operations (view, suspend).
3. Add E2E spec for error boundary handling.
4. Keep Playwright workers=1 for Clerk stability.

**Acceptance criteria:**

- [ ] At least 3 new E2E spec files covering billing, admin, and error paths
- [ ] All assertions structural (no hardcoded content)
- [ ] All 7 gates GREEN

---

## ON HOLD — Deferred

### Phase 29.x — Zod/Zustand app-wide modernization

### Phase 26.x — Persona-aware media prompts, Stripe auto-renewal

### Legal/nav/footer admin configurability — Deferred to v2

---

> **Completed phases** archived in [`DONE.md`](DONE.md).
> All phases through 130 complete + 120.4–120.7, 128.2, 106 (includes 120.1–120.7, 121–130, 128.2, 106).
> All Milestones 0–25 COMPLETE.

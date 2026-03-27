# Droplet — TODO

> Prioritized, actionable development tasks. Each task max ~30 minutes.
> Governed by **Droplet-PM**. Do not add tasks without PM approval.
> Ref: `SPEC.md` for full specification. `AGENTS.md` for coding rules. `DONE.md` for completed phases.
> Implementation agent: **Droplet-Engineer** (Senior Developer).
>
> **STATUS: PM audit #66 (2026-03-27). Milestones 0–25 COMPLETE. All phases through 133 complete (incl. 107.1–107.3, 108, 114, 125.1, 131, 132, 133). 551 unit tests (95 suites). 5 E2E specs (39 passed, 4 skipped). Build passes. TSC clean. Node.js 24.12.0 runtime.**
> **GATE STATUS: All 7 gates GREEN. Lint (0 errors, 7 warnings), Knip (0 findings), TSC clean, build passes, unit tests (95/551), E2E (5 specs), coverage 85/80/85/85.**
> **TDD REBUILD COMPLETE. WCAG 2.2 AA COMPLETE. TD-HARDCODE-01 RESOLVED. Zero `as never` casts. Zero `console.log`/`console.error`/`as any`/`window.alert`/`strict: false`/stale TODOs in `src/`.**
> **SWOT audit #66 conducted. New findings from Architect + Engineer + PM audit below.**
> **NEXT SESSION: 135 (HIGH checkoutPlan security) → 136 (HIGH API error key standardization) → 137 (HIGH handleError return type) → 126.2 (MEDIUM lint warnings) → 134 (MEDIUM E2E expansion) → 138 (MEDIUM JSON.stringify elimination) → 125.3 (LOW rate-limit comment) → 139 (LOW terms page ID) → 140 (LOW admin query limit) → 74.2 (MEDIUM FAQ admin) → 104 (MEDIUM landing/hero admin)**

---

## HIGH — Security: checkoutPlan Missing Error Handling (PM audit #66)

### Phase 135 HIGH — Add try/catch to `checkoutPlan` server action

> Engineer finding M-2. `checkoutPlan` is the only server action without try/catch + `handleError`. Stripe API failures will leak raw Stripe error messages to clients. Violates security rule: "Never leak provider error messages."

**File:** `src/lib/actions/transaction.action.tsx`

**What to do:**

1. Wrap the `checkoutPlan` function body in try/catch.
2. Call `handleError({ error, source: "checkoutPlan" })` in catch block.
3. Keep the existing explicit `throw new Error("Unable to start checkout.")` for price mismatch — it's already caught.

**Acceptance criteria:**

- [ ] `checkoutPlan` has try/catch + `handleError`
- [ ] Stripe errors no longer leak raw messages
- [ ] Build passes, tests pass

---

## HIGH — API Error Response Key Standardization (PM audit #66)

### Phase 136 HIGH — Standardize error response keys to `{ error: ... }` across all API routes

> Engineer finding H-1 + M-5. Upload route and AWS route use `{ message: "..." }` for error responses instead of `{ error: "..." }`. All other API routes use `{ error: "..." }`. Clients checking `.error` will miss these.

**Files:**

1. `src/app/api/upload/route.tsx` — L81: change `message` → `error`
2. `src/app/api/aws/route.tsx` — L75, L84, L96, L116, L128, L174: change `message` → `error`

**What to do:**

1. Replace all `{ message: "..." }` error responses with `{ error: "..." }` in both files.
2. Keep success responses unchanged.

**Acceptance criteria:**

- [ ] All error responses in `upload/route.tsx` and `aws/route.tsx` use `{ error: "..." }`
- [ ] Build passes, tests pass

---

## HIGH — handleError Return Type Fix (PM audit #66)

### Phase 137 HIGH — Change `handleError` return type to `never`

> Engineer finding H-3. `handleError` always throws but returns `void`. Downstream callers (`generateImage`, `generateAudio`, `generateVideo`) have imprecise return types (`string | undefined` instead of `string`) because TypeScript doesn't know execution stops. One-line fix with high type-safety impact.

**File:** `src/lib/utils/handleError.tsx`

**What to do:**

1. Change the `handleError` function signature to explicitly return `never`.
2. Verify downstream callers' return types narrow correctly.
3. Update tests if needed.

**Acceptance criteria:**

- [ ] `handleError` return type is `never`
- [ ] No `undefined` in return types of generate\* functions due to this
- [ ] Build passes, tests pass

---

## MEDIUM — Lint Warning Cleanup (PM audit #66)

### Phase 126.2 MEDIUM — Fix 7 lint warnings (6 `setState-in-effect` + 1 `no-img-element`)

> 6 `react-hooks/set-state-in-effect` warnings + 1 `@next/next/no-img-element` warning in test file. Target: 0 warnings total.

**Files:**

1. `src/components/admin/admin-layout-shell.tsx` — use `useSyncExternalStore` for media query
2. `src/components/admin/admin-managed-form.tsx` — derive alert from `actionState` during render
3. `src/components/admin/settings/admin-settings-tabs.tsx` — read localStorage in `useState` initializer
4. `src/components/admin/transactions/admin-transactions-table.tsx` — derive empty selection from `useMemo`
5. `src/components/layout/droplet-theme.tsx` — read initial theme in `useState` initializer
6. `src/components/shared/audio-player.tsx` — use `useRef` to track previous audioUrl
7. `tests/unit/components/hero-section.test.tsx` — suppress `@next/next/no-img-element` or use `next/image`

**What to do:**

1. Each component: replace setState-in-useEffect with `key` prop reset, derived state, or `useSyncExternalStore`.
2. Target: 0 lint warnings total.

**Acceptance criteria:**

- [ ] `npm run lint` reports 0 warnings
- [ ] No behavioral regressions
- [ ] Build passes, tests pass

---

## MEDIUM — E2E Coverage Expansion (PM audit #65)

### Phase 134 MEDIUM — Add E2E tests for critical business paths

> E2E coverage at 5 specs. Critical user paths lack E2E coverage: billing/checkout flow, admin operations, error states. Also add coverage for new stop-message admin UI and keyboard navigation flows.

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

## MEDIUM — JSON.stringify/parse Elimination in Generate Functions (PM audit #66)

### Phase 138 MEDIUM — Return typed objects from generate functions instead of JSON strings

> Engineer finding H-2 + M-4. `generateTitle`, `generateImage`, `generateAudio`, `generateVideo`, `generateResponse` (non-streaming) return `JSON.stringify(...)` that callers immediately `JSON.parse(... as string)`. 7 `as string` type assertions in codebase from this pattern. Streaming path already returns typed objects correctly.

**Files:**

1. `src/lib/utils/openai/generateTitle.tsx` — return typed object
2. `src/lib/utils/openai/generateImage.tsx` — return typed object
3. `src/lib/utils/openai/generateAudio.tsx` — return typed object
4. `src/lib/utils/openai/generateVideo.tsx` — return typed object
5. `src/lib/utils/openai/generateResponse.tsx` — return typed object (non-streaming path)
6. `src/app/api/openai/route.tsx` — remove `JSON.parse(... as string)` calls
7. Update all related tests

**What to do:**

1. Change each generate function to return the typed payload object directly.
2. Update all callers to use typed objects instead of parsing.
3. Remove `as string` assertions.
4. Update tests.

**Acceptance criteria:**

- [ ] Zero `as string` in generate/route files
- [ ] All generate functions return typed objects
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

### Phase 104 MEDIUM — Landing/hero/about content admin-configurable

#### 104.1 — Landing feature cards + how-it-works

#### 104.2 — Hero copy

#### 104.3 — About page copy

See SPEC.md for full requirements on each.

---

## LOW — Cosmetic / Code Quality

### Phase 125.3 LOW — Add `rate-limit.ts` bypass comment

> Rate limiter uses `.collection.findOneAndUpdate()` which bypasses Mongoose strict mode — intentional for atomic sliding-window logic.

**File:** `src/lib/utils/rate-limit.ts`

**What to do:** Add code comment explaining the MongoDB driver bypass is intentional.

### Phase 139 LOW — Fix terms page wrapper ID

> Architect finding L-1. Terms page at `src/app/(public)/terms/page.tsx` L25 uses `id="PrivacyPage"` instead of `id="TermsPage"`. Violates unique CSS class naming convention.

**File:** `src/app/(public)/terms/page.tsx`

**What to do:** Change `id="PrivacyPage"` to `id="TermsPage"`.

### Phase 140 LOW — Add `.limit()` to unbounded admin queries

> Architect finding M-3. `AppSetting.find({})` and `PublicPage.find({})` in `admin-queries.ts` lack `.limit()`. These admin-only collections are small but should have a safety cap.

**File:** `src/lib/utils/admin-queries.ts`

**What to do:** Add `.limit(500)` to `AppSetting.find({})` and `PublicPage.find({})` queries.

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

### TypeScript 6 / @typescript-eslint compatibility — Monitor for official TS 6 support in `@typescript-eslint` (Engineer finding M-3, PM audit #66)

---

> **Completed phases** archived in [`DONE.md`](DONE.md).
> All phases through 133 complete (incl. 107.1–107.3, 108, 114, 125.1, 131, 132, 133, plus 120.1–120.7, 121–130, 128.2, 106).
> All Milestones 0–25 COMPLETE.

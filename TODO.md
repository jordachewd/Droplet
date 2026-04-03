# Droplet — TODO

> Prioritized, actionable development tasks. Each task max ~30 minutes.
> Governed by **Droplet-PM**. Do not add tasks without PM approval.
> Ref: `SPEC.md` for full specification. `AGENTS.md` for coding rules. `DONE.md` for completed phases.
> Implementation agent: **Droplet-Engineer** (Senior Developer).
>
> **STATUS: PM audit #88 (2026-04-03). V1.0 MVP RELEASED. All 7 validation gates GREEN (599 tests, lint 0/0, TSC clean, build passes, knip 0). All Milestones 0–25 COMPLETE. Phases 143, 180.1–180.4, 185, 186-A, 186-B, 187-A–187-D COMPLETE.**
>
> **GATE STATUS: Validation GREEN. Architecture GREEN. Product GREEN. Admin GREEN. Public GREEN. Contract GREEN.**
>
> **OWNER DIRECTIVES:**
>
> - ✅ Remove ALL video generation — **DONE (Phase 186-A).**
> - ✅ Increase Token Limits to maximum — **DONE (Phase 186-B).**
> - ✅ Pre-release task list — **DONE. All 8 phases complete (PM audit #87).**
> - ✅ Env vars validated in Vercel — **ACKNOWLEDGED. `requireEnv()` kept as defense-in-depth.**
> - 🔴 PlanCard `isIncluded` bug — **Phase 188. If `limit === 0` then `isIncluded: false`, otherwise `true`.**
> - ✅ App is now released — **V1.0 MVP RELEASED.**
>
> **EXECUTION ORDER (PM audit #88 — Post-Release):**
>
> 1. **HIGH Phase 188** — Fix PlanCard `isIncluded` logic (owner-reported bug).
> 2. **MEDIUM Phase 144** — Admin config cache (30s TTL).
> 3. **MEDIUM Phase 145** — Upload filename collision prevention.
> 4. **MEDIUM Phase 165** — Checkout success page DB polling.
> 5. **LOW Phase 146** — Admin user detail transaction limit.
> 6. **LOW Phase 147** — Rename `.tsx` utility files to `.ts`.
> 7. **LOW Phase 148** — Bulk operations partial-failure reporting.

---

## ✅ Phase 185 — Remove `sora-2-pro` — DONE (2026-04-02)

> Archived in DONE.md.

---

## ✅ Phase 180.1 — Homepage Marketing Text Extraction — DONE (2026-04-03)

> Archived in DONE.md.

---

## ✅ Phase 186-A — Remove ALL Video Generation — DONE (2026-04-03)

> Archived in DONE.md.

---

## ✅ Phase 186-B — Increase Token Limits — DONE (2026-04-03)

> Archived in DONE.md.

---

## ✅ Phase 187-A — Add Admin Error Boundary — DONE (2026-04-03)

> Archived in DONE.md.

---

## ✅ Phase 187-B — Fix Clerk Webhook Cascade Order — DONE (2026-04-03)

> Archived in DONE.md.

---

## ✅ Phase 187-C — Fix Audio Player Error Recovery — DONE (2026-04-03)

> Archived in DONE.md.

---

## ✅ Phase 143 — Env Var Runtime Validation — DONE (2026-04-03)

> Archived in DONE.md.

---

## ✅ Phase 180.2 — Chat Display Text Extraction — DONE (2026-04-03)

> Archived in DONE.md.

---

## ✅ Phase 180.3 — Plans Display Text Extraction — DONE (2026-04-03)

> Archived in DONE.md.

---

## ✅ Phase 180.4 — Currency Symbol Compliance — DONE (2026-04-03)

> Archived in DONE.md.

---

## ✅ Phase 187-D — Download Rate-Limit Key Cleanup — DONE (2026-04-03)

> Archived in DONE.md.

---

## HIGH — Phase 188 — Fix PlanCard `isIncluded` Logic

> **Owner-reported bug (PM audit #88).** In `buildPlans()`, limit-derived inclusions have `isIncluded: true` hardcoded. Per owner directive: if `limit === 0` then `isIncluded` must be `false`, otherwise `isIncluded: true`. Currently, `formatMediaLimitLabel()` shows `"✕"` prefix for `limit === 0` but the plan card renders a checkmark icon — contradictory UX.

**File:** `src/constants/plans.tsx`

**What to do:**

1. In `buildPlans()`, change all 12 limit-derived inclusions (4 per plan × 3 plans) from `isIncluded: true` to `isIncluded: <limit> !== 0`.
2. Affected fields per plan: `conversationsPerDay`, `promptsPerConversation`, `images`, `audio`.
3. Static inclusions ("AI chat assistant", persona access, trial limits, file uploads, email support, quality labels) remain hardcoded — not limit-derived.
4. Add unit tests in `tests/unit/constants/plans.test.ts`:
   - Test: `isIncluded` is `false` when a limit is `0`.
   - Test: `isIncluded` is `true` when a limit is positive.
   - Test: `isIncluded` is `true` when a limit is `-1` (unlimited).

**Acceptance criteria:**

- [ ] All 12 limit-derived inclusions use `isIncluded: limit !== 0`
- [ ] `limit === -1` (unlimited) → `isIncluded: true`
- [ ] `limit === 0` → `isIncluded: false` with X icon on plan card
- [ ] `limit > 0` → `isIncluded: true` with checkmark icon
- [ ] 3 new unit tests pass
- [ ] Build passes, all existing tests pass

---

## MEDIUM — Phase 144 — Admin Config In-Memory Cache

> 5+ DB round trips per `/api/openai` request for admin settings that change infrequently.

**What to do:**

1. Create `src/lib/utils/config-cache.ts` — simple in-memory cache with 30s TTL.
2. Wrap each `getEffective*` resolver's DB calls in the cache.

**Acceptance criteria:**

- [ ] Admin config queries cached with 30s TTL
- [ ] Build passes, tests pass

---

## MEDIUM — Phase 145 — Upload Filename Collision Prevention

**File:** `src/app/api/upload/route.tsx`

**What to do:** Replace `Date.now()` with `crypto.randomUUID()` in upload filename generation.

**Acceptance criteria:**

- [ ] Upload filenames use `crypto.randomUUID()`
- [ ] Build passes

---

## MEDIUM — Phase 165 — Checkout Success Page DB Polling

> After Stripe redirects to checkout success, webhook may not have processed yet. User sees "success" but plan is still Lite.

**What to do:**

1. Add a client component that polls a plan-status endpoint every 3-5s for up to 30s.
2. Show "Confirming your plan upgrade..." initially.
3. On confirmation: "Plan upgraded successfully!" with green indicator.
4. On timeout: "Payment successful. Your plan will be updated shortly."

**Acceptance criteria:**

- [ ] Checkout success page shows plan confirmation status
- [ ] Polling stops after confirmation or 30s timeout
- [ ] Build passes

---

## LOW — Phase 146 — Admin User Detail Transaction Limit

**What to do:** Add `.limit(50)` to the transaction query in `getAdminUserDetail`.

---

## LOW — Phase 147 — Rename `.tsx` Utility Files to `.ts`

**Files:** `handleError.tsx`, `getPlanStatus.tsx`, `getFullName.tsx`, `getFormattedDate.tsx`, `generateString.tsx`

---

## LOW — Phase 148 — Bulk Operations Partial-Failure Reporting

**What to do:** Track successful/failed operations in bulk admin actions, return partial results.

---

## ON HOLD — Deferred

### Phase 29.x — Zod/Zustand app-wide modernization

### Phase 26.x — Persona-aware media prompts, Stripe auto-renewal

### Legal/nav/footer admin configurability — Deferred to v2

### TypeScript 6 / @typescript-eslint compatibility — Monitor

---

> **Completed phases** archived in [`DONE.md`](DONE.md).

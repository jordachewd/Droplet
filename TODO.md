# Droplet — TODO

> Prioritized, actionable development tasks. Each task max ~30 minutes.
> Governed by **Droplet-PM**. Do not add tasks without PM approval.
> Ref: `SPEC.md` for full specification. `AGENTS.md` for coding rules. `DONE.md` for completed phases.
> Implementation agent: **Droplet-Engineer** (Senior Developer).
>
> **STATUS: PM audit #95 (2026-04-06). V1.0 MVP RELEASED. All 7 validation gates GREEN (638 tests, lint 0/0, TSC clean, build passes, knip 0). All Milestones 0–25 COMPLETE. Phases 143–207 COMPLETE.**
>
> **GATE STATUS: Validation GREEN. Architecture GREEN. Product GREEN. Admin GREEN. Public GREEN. Contract GREEN.**
>
> **TEST STATUS: 638 tests (104 suites), 49 E2E (6 skipped). 0 failures. All gates GREEN.**
>
> **EXECUTION ORDER (PM audit #95 — Post-Release):**
>
> 1. **MEDIUM Phase 165.1** — Plan-status route hardening (rate limiting + `maxDuration`).
> 2. **LOW Phase 146** — Admin user detail transaction limit.
> 3. **LOW Phase 147** — Rename `.tsx` utility files to `.ts`.
> 4. **LOW Phase 148** — Bulk operations partial-failure reporting.
>
> All owner directives (OI1–OI44) RESOLVED. See `DONE.md` for archive.

---

## MEDIUM — Phase 165.1 — Plan-Status Route Hardening

> **PM audit #95 follow-up.** `/api/checkout/plan-status` route is missing `maxDuration` export and rate limiting. All other API routes have both. Consistency gap found by PM + Architect + Engineer audits.

**File:** `src/app/api/checkout/plan-status/route.tsx`

**What to do:**

1. Add `export const maxDuration = 60;` (Vercel Hobby ceiling, consistent with all 6 other API routes).
2. Add `enforceSlidingWindowRateLimit` — suggested: 30 requests / 60s window (consistent with download route pattern).

**Acceptance criteria:**

- [ ] `maxDuration = 60` exported from plan-status route
- [ ] Rate limiting applied with sliding window
- [ ] Build passes, tests pass

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
> Includes: Phases 143, 144, 145, 165, 180.1–180.4, 185–207.

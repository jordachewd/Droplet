# Droplet — TODO

> Prioritized, actionable development tasks. Each task max ~30 minutes.
> Governed by **Droplet-PM**. Do not add tasks without PM approval.
> Ref: `SPEC.md` for full specification. `AGENTS.md` for coding rules. `DONE.md` for completed phases.
> Implementation agent: **Droplet-Engineer** (Senior Developer).
>
> **STATUS: PM audit #99 (2026-04-07). V1.0 MVP RELEASED. Sidebar restructure COMPLETE (Phases 209–216). Owner directive OI51 (Stripe recurring) ON HOLD.**
>
> **GATE STATUS: Validation GREEN. Architecture GREEN. Product GREEN. Admin GREEN. Public GREEN. Contract GREEN.**
>
> **TEST STATUS: 644 tests (104 suites), 49 E2E (6 skipped). 0 failures. All gates GREEN.**
>
> **EXECUTION ORDER: Phase 217 ON HOLD pending owner decisions. No active implementation work.**

---

## COMPLETED — Sidebar & Navigation Restructure (Archived to DONE.md)

> Phases 209–216 ALL COMPLETE. See [DONE.md](DONE.md) for detailed completion records.

---

## ON HOLD — Stripe Recurring Payment

### Phase 217-A through 217-D — Stripe Subscription Billing

> **Owner:** OI51. **Risk:** HIGH. **BLOCKED pending owner decisions.** See ThePlan.md for full phase breakdown.
>
> **Questions for owner before implementation:**
>
> 1. What happens to existing one-time paid users? Grandfather until expiry then revert to Lite? Auto-migrate to subscription?
> 2. Monthly billing only, or Monthly + Yearly (with discount)?
> 3. Use Stripe Customer Portal for subscription management, or build custom cancel UI?

---

## ON HOLD — Deferred

### Phase 29.6 — updateAdminSettingAction Zod Schema Map (DEFERRED)

> 15+ branches, 6-8 hour refactor, high risk. Current helper pattern works correctly with Zod under the hood. Revisit only if bugs or maintainability issues arise.

### Phase 26.x — Persona-aware media prompts

### Legal/nav/footer admin configurability — Deferred to v2

### TypeScript 6 / @typescript-eslint compatibility — Monitor

### jsdom upgrade — Monitor (pinned to ~24.1.3 due to ESM top-level await incompatibility with Vitest forks pool; upgrade when Vitest resolves ESM environment loading)

---

> **Completed phases** archived in [`DONE.md`](DONE.md).
> Includes: Phases 143–148, 165, 165.1, 180.1–180.4, 185–208, 29.1–29.5, 29.7.
> Phase 29.7 (Zustand audit) — COMPLETE. No changes needed. 4 stores, all properly implemented.

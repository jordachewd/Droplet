# Droplet — TODO

> Prioritized, actionable development tasks. Each task max ~30 minutes.
> Governed by **Droplet-PM**. Do not add tasks without PM approval.
> Ref: `SPEC.md` for full specification. `AGENTS.md` for coding rules. `DONE.md` for completed phases.
> Implementation agent: **Droplet-Engineer** (Senior Developer).
>
> **STATUS: PM audit #97 (2026-04-06). V1.0 MVP RELEASED. All 7 validation gates GREEN (640 tests, lint 0/0, TSC clean, build passes, knip 0). All Milestones 0–25 COMPLETE. Phases 143–208, 29.1–29.5 COMPLETE.**
>
> **GATE STATUS: Validation GREEN. Architecture GREEN. Product GREEN. Admin GREEN. Public GREEN. Contract GREEN.**
>
> **TEST STATUS: 640 tests (104 suites), 49 E2E (6 skipped). 0 failures. All gates GREEN.**
>
> **EXECUTION ORDER: No active tasks. Post-release backlog EMPTY. Only deferred items remain.**
>
> All owner directives (OI1–OI44) RESOLVED. See `DONE.md` for archive.

---

## ON HOLD — Deferred

### Phase 29.6 — updateAdminSettingAction Zod Schema Map (DEFERRED)

> 15+ branches, 6-8 hour refactor, high risk. Current helper pattern works correctly with Zod under the hood. Revisit only if bugs or maintainability issues arise.

### Phase 26.x — Persona-aware media prompts, Stripe auto-renewal

### Legal/nav/footer admin configurability — Deferred to v2

### TypeScript 6 / @typescript-eslint compatibility — Monitor

### jsdom upgrade — Monitor (pinned to ~24.1.3 due to ESM top-level await incompatibility with Vitest forks pool; upgrade when Vitest resolves ESM environment loading)

---

> **Completed phases** archived in [`DONE.md`](DONE.md).
> Includes: Phases 143–148, 165, 165.1, 180.1–180.4, 185–208, 29.1–29.5, 29.7.
> Phase 29.7 (Zustand audit) — COMPLETE. No changes needed. 4 stores, all properly implemented.

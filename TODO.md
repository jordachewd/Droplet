# Droplet — TODO

> Prioritized, actionable development tasks. Each task max ~30 minutes.
> Governed by **Droplet-PM**. Do not add tasks without PM approval.
> Ref: `SPEC.md` for full specification. `AGENTS.md` for coding rules. `DONE.md` for completed phases.
> Implementation agent: **Droplet-Engineer** (Senior Developer).
>
> **STATUS: PM audit #127 (2026-04-16). V1.0 MVP RELEASED. ALL Phases through 233 COMPLETE. Phase 226 COMPLETE. Phase 228 COMPLETE. Phase 229 COMPLETE. Type file cleanup COMPLETE. 0 HIGH bugs. All 7 gates GREEN.**
>
> **GATE STATUS: All 7 gates GREEN. 0 npm vulnerabilities. 0 critical security issues. Code hygiene 100% (0 console.log, 0 Math.random, 0 as any, 0 ts-ignore, 0 empty catch, 0 window.alert).**
>
> **TEST STATUS: 729 tests (110 suites), 49 E2E (6 skipped). 0 failures. All gates GREEN.**
>
> **ACTIVE BACKLOG: PM audit #127 — 0 HIGH items. 0 CRITICAL items. 0 god files (all under 900 lines). Largest: generateResponse.tsx (861), admin-queries.ts (826), normalize-admin-settings.ts (813), openai/route.tsx (805).**

---

## Archived Phases — See [DONE.md](DONE.md)

> All phases through 233 + Phase 226 + Phase 228 + Phase 229 + type file cleanup archived. See DONE.md for completion records.

---

## Execution Order (PM audit #127)

> Priority: No critical or high items. No god files. Codebase is healthy and stable. Remaining work is LOW risk polish and maintenance.

---

### 1. LOW — Admin Sidebar Collapsed State Not Persisted

> **Source:** SWOT Weakness. **Risk:** LOW. **Impact:** Admin sidebar resets to open on page reload.
> Chat sidebar persists via `droplet-sidebar-collapsed` localStorage key. Admin does not.

---

## DEFERRED

### Phase 29.6 — updateAdminSettingAction Zod Schema Map (DEFERRED)

> 18 branches (including new `admin.stripePriceIds`), working correctly with Zod under the hood. Revisit only if branch count exceeds ~25 or bugs emerge.

### Legal/nav/footer admin configurability — Deferred to v2

> Legal text rarely changes (requires legal review), nav is structural (tied to routes), footer changes ~yearly. Minimal value.

### E2E Firefox Flake — Monitor

> 1 test (`error-boundary-handling > API failure feedback`) fails intermittently on Firefox only. Chromium/WebKit pass. Browser timing issue, not product bug. Monitor.

### Vercel Pro Upgrade — Recommended

> $20/mo. Raises `maxDuration` from 60s to 300s. Eliminates media generation timeout edge cases. Not a bug — architecture constraint.

---

> **Completed phases** archived in [`DONE.md`](DONE.md).
> Includes: Phases 143–148, 165, 165.1, 180.1–180.4, 185–222 (all sub-phases), 217-A/B/C/C-fix/D/E/F/G, 218-B, 218-C, 218-C-fix, 26.x, 29.1–29.5, 29.7, 223, 224, 225-A/B/C/D, 226, 227, 228, 229, 230, 231, 231-fix, 232, 233, type file cleanup.
> Phase 29.7 (Zustand audit) — COMPLETE. No changes needed. 4 stores, all properly implemented.
> TypeScript 6 / ESLint compatibility — **CLOSED** (audit #103). No issues.
> jsdom upgrade — **PIN MAINTAINED** (audit #103). ~24.1.3 stable. ESM TLA incompatibility persists.
> E2E fragile homepage heading — **FIXED** (audit #105). Structural assertion.

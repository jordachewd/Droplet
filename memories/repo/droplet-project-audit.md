# Droplet Project Audit State — PM Audit #57 (2026-03-24)

## Current Status

- All Milestones 0–24 COMPLETE. Milestone 25 IN PROGRESS (Block G — TDD Full Rebuild).
- All Phases 1–124 complete (including 120.1, 121, 122, 123, 124). Phase 120.2 partially complete (20/~40 utility files).
- 370 unit tests / 62 suites passing. Build passing. tsc clean. lint 0 errors, 6 warnings.
- Coverage: ~78.5/~66/~83.5/~79 vs 76/65/79/76 thresholds (MET). All 7 gates GREEN.
- E2E: 108 passed, 0 failed, 25 skipped (14 spec files).
- Node.js 24.12.0 runtime.

## Active Tech Debt

- TD-HARDCODE-01 (HIGH): Stop reason messages hardcoded. Phase 107.
- TD-TEST-03 (HIGH): Full TDD test rebuild in progress. Phase 120.
- TD-REUSE-04 (MEDIUM): ChatApiResponse duplicate types. Phase 106.
- TD-WCAG-05 (MEDIUM): Tabs missing arrow-key nav. Phase 108.
- TD-WCAG-07 (MEDIUM): AvatarMenu missing keyboard nav. Phase 114.
- TD-TEST-02 (MEDIUM): Route test refinement (deferred to TDD rebuild). Phase 112.4.
- TD-DB-01 (LOW): getAllTransactions() missing .select()/.limit(). Fix during Phase 120.3.
- TD-AI-09 (LOW): Image/audio prompts not persona-aware.
- TD-AI-13 (LOW): 5 model pricing placeholders.
- TD-PLAN-01 (LOW): No recurring subscriptions (deferred v1).
- TD-AI-18 (LOW-advisory): errorMessage forwarding fragile.
- TD-API-09 (LOW-monitor): messageTextContentSchema .strict().

## SWOT Summary (PM Audit #57)

### Strengths
- Clean route boundaries (proxy + server double-check)
- 44+ files with server-only guards
- Central policy architecture (resolveEntitlements, resolveModelPolicy, effective-*)
- Atomic quota enforcement (findOneAndUpdate + $lt)
- Strong DB discipline (indexes, lean, select, strict:true)
- Zero security debt (no console.log, no window.alert, no Math.random, no error.message leaks)
- Data-consumer pattern complete for all client components
- Admin audit trail on every admin mutation

### Weaknesses
- Hero, landing, FAQ, stop-reason content still hardcoded (Phases 74.2, 104, 107)
- TDD rebuild ~50% complete (20/~40 utility test files)
- Single-document conversation storage (future scalability risk)
- No recurring subscriptions (v1 deferred)

### Opportunities
- Admin configurability has clear implementation path (effective-* pattern)
- TDD infrastructure is strong (factories, mock helpers, documented workflow)
- Only 2 WCAG gaps remain (tabs keyboard, AvatarMenu keyboard)

### Threats
- Content changes require code deployments until admin configurability closes
- Coverage lower than pre-deletion baseline (370 vs 532 tests)
- gpt-audio-1.5 inaccessible (403) — Premium audio uses fallback

## Docs Updated This Session (PM Audit #57)

- SPEC.md: Header updated. TD-DB-01 added (getAllTransactions).
- TODO.md: Header updated. Phase 124 reference added.
- DONE.md: Phase 124 entry added. Header phase list updated.
- ThePlan.md: Execution order updated. OI16 + OI17 added. Milestone 25 block updated.
- AGENTS.md: Merge conflict in route boundaries table resolved.

## Priority Order (PM Audit #57)

1. Phase 120.2 CRITICAL — TDD utility test rebuild (20/~40 done, continue)
2. Phase 120.3 CRITICAL — TDD server action test rebuild (includes TD-DB-01 fix)
3. Phase 106 HIGH — Extract shared ChatApiResponse types
4. Phase 120.4 CRITICAL — TDD API route test rebuild
5. Phase 120.5 HIGH — TDD component test rebuild
6. Phase 120.6 HIGH — TDD E2E test rebuild
7. Phase 120.7 HIGH — Coverage thresholds
8. Phase 107 HIGH — Stop reason admin-configurable
9. Phase 108 MEDIUM — WCAG tabs keyboard
10. Phase 114 MEDIUM — WCAG AvatarMenu keyboard
11. Phase 74.2 MEDIUM — FAQ admin-configurable
12. Phase 104 MEDIUM — Landing/hero/about admin-configurable

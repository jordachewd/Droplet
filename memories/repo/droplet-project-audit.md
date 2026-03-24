# Droplet Project Audit State — PM Audit #46 (2026-03-21)

## Current Status

- All Milestones 0–24 COMPLETE. Milestone 25 IN PROGRESS (Block G — Testing Infrastructure Rebuild).
- All Phases 1–102 complete (including 72.4, 96.4, 97.1, 99.5, 100.4, 101, 102).
- 400 unit tests / 65 suites passing. Build passing. tsc clean. lint 0 errors, 10 warnings.
- Coverage: 76.27/65.31/79.64/76.67 vs 76/65/79/76 (MET). All 7 gates GREEN (knip added as gate 7).
- E2E: 108 passed, 0 failed, 25 skipped (15 spec files).
- Node.js 24.12.0 runtime.

## Active Tech Debt

- TD-WCAG-CONTRAST (HIGH): axe-core color-contrast violations on `/` and `/plans`. Phase 103.1–103.2.
- TD-WCAG-HEADING (MEDIUM): heading-order on `/personas`. Phase 103.3.
- TD-WCAG-LANDMARK (MEDIUM): duplicate landmarks on all public routes. Phase 103.4.
- TD-KNIP (HIGH): 5 unused root migration files + 3 unused exports. Phase 99.4.
- TD-TEST-07 (MEDIUM): Zero Zustand store tests. Phase 96.6.
- TD-DATA-CONSUMER (MEDIUM): 3 admin client components directly import constants. Phase 73.3.
- TD-DIALOG (MEDIUM): ConfirmationModal uses custom role="dialog" not native `<dialog>`. Phase 99.2.
- TD-TASK-PASSTHROUGH (LOW): createTaskSchema .passthrough(). Phase 87.
- TD-AUDIO-LINT (LOW): 10 ESLint warnings in audio-player.tsx (setState in useEffect).

## Resolved Tech Debt (PM Audit #46)

- TD-WCAG-03 RESOLVED — Viewport zoom restriction removed (Phase 101).
- TD-REUSE-01 FULLY RESOLVED — All 4 isObjectRecord files now import from type-guards.ts (Phase 100.4).
- TD-LEAK-01 RESOLVED — AbortController added to chat streaming fetch (Phase 102).
- TD-WCAG-04 RESOLVED — AudioPlayer ARIA progressbar + aria-label + live region (Phase 99.5).
- TD-WCAG-02 RESOLVED — @axe-core/playwright E2E scanning 7 public routes (Phase 97.1).
- TD-SEMANTIC-TABLE RESOLVED — Admin tables use semantic HTML (Phase 72.4).
- TD-AUTH-TEST RESOLVED — Admin authorization failure tests added (Phase 96.4).

## Droplet-Engineer Task List (Priority Order — PM Audit #46)

1. **Phase 99.4** — Knip cleanup: delete 5 unused files + fix 3 unused exports — **HIGH**
2. **Phase 103.1** — Fix color contrast on landing page — **HIGH** (WCAG release blocker)
3. **Phase 103.2** — Fix color contrast on plans page — **HIGH** (WCAG release blocker)
4. **Phase 103.3** — Fix heading order on personas page — **MEDIUM**
5. **Phase 103.4** — Fix duplicate landmark violations — **MEDIUM**
6. Phase 96.5 — Upload file size validation tests (HIGH TDD)
7. Phase 96.6 — Zustand store tests (MEDIUM TDD)
8. Phase 96.7 — Component tests: confirmation-modal, plan-card, persona-card, checkout-form (MEDIUM TDD)
9. Phase 96.8 — Expand user model tests (MEDIUM TDD)
10. Phase 73.3 — Admin client component data-consumer violations (MEDIUM)
11. Phase 99.2 — ConfirmationModal native `<dialog>` (MEDIUM)
12. Phase 98.1–98.3 — Coverage improvement to 82/78/82/82+ (HIGH)
13. Phase 74.2 — FAQ content admin-configurable (MEDIUM)
14. Phase 104.1–104.2 — Landing page content admin-configurable (MEDIUM)
15. Phase 87 — createTaskSchema strict mode (LOW)

## Owner Directives Status (PM Audit #46)

### DONE from Owner Instructions

- ✅ Code reuse: TD-REUSE-01/02/03 ALL FULLY RESOLVED (Phase 100.1–100.4).
- ✅ Viewport zoom: TD-WCAG-03 RESOLVED (Phase 101). Mobile pinch-to-zoom works.
- ✅ AbortController: TD-LEAK-01 RESOLVED (Phase 102). No more connection leaks.
- ✅ AudioPlayer ARIA: TD-WCAG-04 RESOLVED (Phase 99.5). Progressbar + aria-label.
- ✅ Admin table semantics: Semantic HTML `<table>` (Phase 72.4).
- ✅ WCAG E2E tests: @axe-core/playwright scanning 7 routes (Phase 97.1).
- ✅ Admin auth tests: Authorization enforcement tested (Phase 96.4).
- ✅ E2E stability: 108 passed, 0 failed, 25 skipped. All Chromium failures resolved.
- ✅ DEEP config check: Phase 89 + 94 hardening complete.
- ✅ P1 stale selection bug: Phase 88.1 + 88.2 DONE.
- ✅ Profile usage display: Phase 66.1 DONE.
- ✅ User removal cascade: Verified complete (Clerk + DB + S3).
- ✅ Server-side utilities: Architecture is Server Components first. Guards on all files.

### NOT DONE / IN PROGRESS

- ⚠️ WCAG color contrast: axe-core violations on `/` and `/plans` (Phase 103.1–103.2).
- ⚠️ WCAG heading order: `/personas` heading-order violation (Phase 103.3).
- ⚠️ WCAG landmarks: Duplicate landmarks all routes (Phase 103.4).
- ⚠️ Testing rebuild from scratch (TDD): 96.1–96.4 done. Remaining: 96.5–96.8, 97.2+, 98.
- ⚠️ knip: 5 unused files + 3 unused exports (Phase 99.4).
- ⚠️ Data consumer pattern: 3 admin violations remaining (Phase 73.3).
- ⚠️ Admin configurability: Core done (74.1). FAQ (74.2), hero/about/landing (104) remaining.
- ⚠️ Native dialog: ConfirmationModal still using custom CSS dialog (Phase 99.2).

## Docs Updated This Session (PM Audit #46)

- ThePlan.md: Updated by Architect. Test counts fixed to 65/400. 5 tech debt items marked RESOLVED. Milestone 25 phases 101–102 marked DONE.
- SPEC.md: Header updated to PM #46. Testing section updated (65 suites, 400 tests, 108 E2E). Gaps section cleaned — resolved items removed.
- TODO.md: 7 completed phases archived. New Phase 103 (WCAG contrast) + 104 (landing admin) added. Priority order updated.
- DONE.md: 7 new phase entries added (101, 100.4, 102, 96.4, 99.5, 72.4, 97.1).
- AGENTS.md: `npm run knip` added as validation Gate 7. "All six gates" → "All seven gates".

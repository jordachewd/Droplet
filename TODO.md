# Droplet — TODO

> Prioritized, actionable development tasks. Each task max ~30 minutes.
> Governed by **Droplet-PM**. Do not add tasks without PM approval.
> Ref: `SPEC.md` for full specification. `AGENTS.md` for coding rules. `DONE.md` for completed phases.
> Implementation agent: **Droplet-Engineer** (Senior Developer).
>
> **STATUS: PM audit #117 (2026-04-11). V1.0 MVP RELEASED. Stripe recurring billing COMPLETE (all 217 phases). Phase 26.x COMPLETE. Phase 223 COMPLETE (3 SWOT fixes). 0 HIGH bugs. All 7 gates GREEN.**
>
> **GATE STATUS: All 7 gates GREEN. 0 vulnerabilities. 0 critical issues.**
>
> **TEST STATUS: 719 tests (109 suites), 49 E2E (6 skipped). 0 failures. All gates GREEN.**
>
> **ACTIVE BACKLOG: EMPTY. All approved phases delivered. Awaiting owner direction.**

---

## COMPLETED — Stripe Recurring Billing (All Phases 217-A through 217-G) — Archived to DONE.md

> ✅ Stripe billing COMPLETE (PM audit #115). All phases delivered: 217-A (schema), 217-B (checkout), 217-C (webhooks), 217-C-fix (path conflict), 217-D (cancellation), 217-E (yearly billing UI), 217-F (admin Price IDs), 217-G (tests + docs + grandfathering). See [DONE.md](DONE.md).

## COMPLETED — Phase 218-C-fix: Dead CSS Cleanup — Archived to DONE.md

> ✅ Phase 218-C-fix COMPLETE (PM audit #115). Dead `.toggle-theme-button` removed from `layout.css`. See [DONE.md](DONE.md).

## COMPLETED — Phase 26.x: Persona-aware Media Prompts — Archived to DONE.md

> ✅ Phase 26.x COMPLETE (PM audit #115). `PERSONA_IMAGE_STYLE_HINTS` + `PERSONA_AUDIO_STYLE_HINTS` (6 personas each). `personaId` threaded through `generateImage()`, `generateAudio()`, `generateResponse()`. Both TTS and audio_in_out modes. Tests for all paths. See [DONE.md](DONE.md).

---

## SWOT-DERIVED — Known Issues (from PM audit #115 SWOT analysis)

### ✅ MEDIUM — Duplicate Transaction on Initial Subscription — RESOLVED (Phase 223)

> Fixed by Phase 223. Checkout handler now stores `stripeInvoiceId` from checkout payload; claim filter uses `$or` on both `stripeId` and `stripeInvoiceId`. When `invoice.paid` fires with the same invoice ID, the existing transaction is found and no duplicate is created. See [DONE.md](DONE.md).

### ✅ MEDIUM — User Model Plan Subdoc Schema Gap — RESOLVED (Phase 223)

> Fixed by Phase 223. `stripeSubscriptionId` and `subscriptionStatus` added to plan subdocument schema in User model. Webhook writes to plan subdoc are no longer silently stripped by `strict: true`. See [DONE.md](DONE.md).

### LOW — Admin Sidebar Collapsed State Not Persisted

> **Source:** SWOT Weakness. **Risk:** LOW. **Impact:** Admin sidebar resets to open on page reload.
> Chat sidebar persists via `droplet-sidebar-collapsed` localStorage key. Admin does not.

### ✅ LOW — catch {} Blocks Missing Comments — RESOLVED (Phase 223)

> Fixed by Phase 223. Missing comment added to `isInternalDownloadKeyUrl` catch block in `generateResponse.tsx`. All catch blocks in `src/` now have explanatory comments. See [DONE.md](DONE.md).

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
> Includes: Phases 143–148, 165, 165.1, 180.1–180.4, 185–222 (all sub-phases), 217-A/B/C/C-fix/D/E/F/G, 218-B, 218-C, 218-C-fix, 26.x, 29.1–29.5, 29.7, 223.
> Phase 29.7 (Zustand audit) — COMPLETE. No changes needed. 4 stores, all properly implemented.
> TypeScript 6 / ESLint compatibility — **CLOSED** (audit #103). No issues.
> jsdom upgrade — **PIN MAINTAINED** (audit #103). ~24.1.3 stable. ESM TLA incompatibility persists.
> E2E fragile homepage heading — **FIXED** (audit #105). Structural assertion.

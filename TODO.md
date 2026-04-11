# Droplet — TODO

> Prioritized, actionable development tasks. Each task max ~30 minutes.
> Governed by **Droplet-PM**. Do not add tasks without PM approval.
> Ref: `SPEC.md` for full specification. `AGENTS.md` for coding rules. `DONE.md` for completed phases.
> Implementation agent: **Droplet-Engineer** (Senior Developer).
>
> **STATUS: PM audit #115 (2026-04-11). V1.0 MVP RELEASED. Stripe recurring billing COMPLETE (all 217 phases). Phase 26.x COMPLETE. 0 HIGH bugs. All 7 gates GREEN.**
>
> **GATE STATUS: All 7 gates GREEN. 0 vulnerabilities. 0 critical issues.**
>
> **TEST STATUS: 717 tests (109 suites), 49 E2E (6 skipped). 0 failures. All gates GREEN.**
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

### MEDIUM — Duplicate Transaction on Initial Subscription

> **Source:** SWOT Threat. **Risk:** MEDIUM. **Impact:** Double transaction records on first payment.
> Both `checkout.session.completed` and `invoice.paid` fire on first Stripe subscription payment, creating 2 Transaction documents.
> Data integrity issue — not billing issue (Stripe only charges once). Overstates revenue in admin transaction view.
> **Fix approach:** Deduplicate by checking for existing transaction with same Stripe session/invoice ID before creating.

### MEDIUM — User Model Plan Subdoc Schema Gap

> **Source:** SWOT Weakness. **Risk:** MEDIUM. **Impact:** Webhook writes to `stripeSubscriptionId` and `subscriptionStatus` within `plan` subdoc are silently stripped by `strict: true`.
> Top-level fields work correctly for now. Schema should add these fields to the `plan` subdocument to match actual usage.
> **Fix approach:** Add `stripeSubscriptionId` and `subscriptionStatus` to `plan` subdoc schema in User model.

### LOW — Admin Sidebar Collapsed State Not Persisted

> **Source:** SWOT Weakness. **Risk:** LOW. **Impact:** Admin sidebar resets to open on page reload.
> Chat sidebar persists via `droplet-sidebar-collapsed` localStorage key. Admin does not.

### LOW — catch {} Blocks Missing Comments

> **Source:** SWOT Weakness. **Risk:** LOW. **Impact:** 1 `catch {}` block without explanatory comment in `src/lib/utils/openai/generateResponse.tsx:287` (`isInternalDownloadKeyUrl` URL parse fallback). All other 20+ catch blocks are compliant.

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
> Includes: Phases 143–148, 165, 165.1, 180.1–180.4, 185–222 (all sub-phases), 217-A/B/C/C-fix/D/E/F/G, 218-B, 218-C, 218-C-fix, 26.x, 29.1–29.5, 29.7.
> Phase 29.7 (Zustand audit) — COMPLETE. No changes needed. 4 stores, all properly implemented.
> TypeScript 6 / ESLint compatibility — **CLOSED** (audit #103). No issues.
> jsdom upgrade — **PIN MAINTAINED** (audit #103). ~24.1.3 stable. ESM TLA incompatibility persists.
> E2E fragile homepage heading — **FIXED** (audit #105). Structural assertion.

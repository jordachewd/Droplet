# Droplet — TODO

> Prioritized, actionable development tasks. Each task max ~30 minutes.
> Governed by **Droplet-PM**. Do not add tasks without PM approval.
> Ref: `SPEC.md` for full specification. `AGENTS.md` for coding rules. `DONE.md` for completed phases.
> Implementation agent: **Droplet-Engineer** (Senior Developer).
>
> **STATUS: PM audit #135 (2026-04-20). Phase 234-B CLOSED (localhost webhook verified by owner — HTTP 200, all 5 events). Phase 234-D CLOSED (sandbox email limitation — works in live mode). Prettier gate regression fixed (6 files). All 7 gates GREEN. 730 tests (110 suites). 0 lint errors. TSC clean. Build clean. Knip clean.**
>
> **GATE STATUS: All 7 gates GREEN. 730 tests (110 suites). 0 failures. 0 lint errors. TSC clean. Build clean. Knip clean. Prettier GREEN.**
>
> **ACTIVE BACKLOG: 0 code tasks. 0 owner actions. `/design` page KEPT per owner override (dev-only, remove before production). PRODUCTION DEPLOYMENT PENDING.**

---

## Archived Phases — See [DONE.md](DONE.md)

> All phases through 250 archived. See DONE.md for completion records.
> Phases 240-249 (onboarding + bug fixes) COMPLETE.
> Phase 238 (31 non-JSX `.tsx` → `.ts` rename) COMPLETE.
> Phase 234-B CLOSED (Stripe webhook localhost verified by owner).
> Phase 234-D CLOSED (email/invoice config — sandbox limitation, works in live mode).
> Phase 250 (prettier gate fix — 6 files) COMPLETE.
> Phase 237 CLOSED per owner override (PM audit #132) — `/design` page kept as dev-only design system preview.

---

## Execution Order (PM audit #135) — ACTIVE

> **No active code tasks. No pending owner actions. All phases COMPLETE.**
> **Next milestone: Production deployment verification (Stripe live-mode webhook + email delivery).**

---

### Pre-Production Checklist (When Switching to Stripe Live Mode)

The following must be verified when switching from Stripe sandbox to production live mode:

1. **Stripe Dashboard → Developers → Webhooks** — Create live-mode endpoint at `https://<production-domain>/api/webhooks/stripe`
2. **Live signing secret** → Set as `STRIPE_WEBHOOK_SECRET` in Vercel production environment variables
3. **All 5 events enabled** on the live endpoint: `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.updated`, `customer.subscription.deleted`
4. **Live Stripe API keys** → Set `STRIPE_SECRET_KEY` and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` in Vercel production env
5. **Live Price IDs** → Update admin settings with production Stripe Price IDs (Pro Monthly/Yearly, Premium Monthly/Yearly)
6. **Verify first live payment** triggers webhook → Transaction created → User plan updated → Profile reflects new plan
7. **Customer emails** — Stripe will send payment receipts automatically in live mode (enabled in sandbox, but sandbox does not deliver emails)
8. **Remove `/design` page** — Dev-only design system preview must be removed before production

---

## Known Limitations (Documented, Not Blocking)

### Email Sync to Clerk — DEFERRED

> MongoDB→Clerk email sync requires Clerk's email verification flow (create → verify → set primary). Complex to implement, low user frequency. Profile email edits currently save to MongoDB only. If Clerk `user.updated` webhook fires for another reason, email in MongoDB may revert. **Accept for v1.0.** Consider adding an "email changes require Clerk account settings" note in profile editor for v1.1.

### Lint Warnings — 6 `set-state-in-effect` Warnings — ACCEPTED

> 6 pre-existing `react-hooks/set-state-in-effect` warnings in `chat-input.tsx` (2), `chat-wrapper.tsx` (1), `library-tabs.tsx` (1), `chat-sidebar-nav.tsx` (1), `profile-hero-editor.tsx` (1). All are warnings, not errors. All are patterns where setState in effect is intentional (initializing from external state). Lint gate is GREEN (0 errors). Monitor only — fix if React Compiler requires it.

---

## SORTED DEFERRED ITEMS (PM audit #132 — Ruthless Re-Sort)

> All deferred items sorted by value/risk. Tri-agent consensus: no promotions needed.

### 1. Vercel Pro Upgrade — RECOMMENDED (Business Decision)

> $20/mo. Raises `maxDuration` from 60s to 300s. Eliminates media generation timeout edge cases. Zero engineering effort. Highest-leverage infrastructure spend. **Promote when monthly revenue exceeds ~$100/mo or when first user reports a timeout.** Not a code change.

### 2. Phase 29.6 — updateAdminSettingAction Zod Schema Map — CLOSED/MONITOR

> **Current state:** 18 branches in main update function (verified PM audit #128). Working correctly with Zod under the hood. Deferral threshold was ~25 branches. **Still 7 branches below threshold.** CLOSED as accepted pattern — reopen only if branch count approaches 25 or bugs emerge.

### 3. E2E Firefox Flake — MONITOR

> 1 test (`error-boundary-handling > API failure feedback`) fails intermittently on Firefox only. Chromium/WebKit pass. Browser timing issue, not product bug. Fix only if it becomes persistent or blocks CI.

### 4. Stripe Webhook Handler Unit Tests — MEDIUM (Future Hardening)

> **Found by:** Architect audit (PM audit #131). The Stripe webhook handlers (`stripe-webhook-handlers.ts`, `stripe-webhook-shared.ts`) are the most complex billing code paths but have no dedicated unit tests. The idempotency logic, user-matching fallback chain, and plan state transitions are tested only through the route-level integration test file (`stripe-webhook-route.test.ts`). Not blocking — current route-level tests cover the critical paths. Add dedicated unit tests when billing logic expands or bugs emerge.

### 5. Config Cache Unit Tests — LOW (Future Hardening)

> **Found by:** Architect audit (PM audit #131). `config-cache.ts` (30s TTL, in-flight dedup, `clearConfigCache()`) has no dedicated unit tests. The cache works correctly (proven by 730 passing tests that depend on it). Add tests when cache behavior changes.

### 6. Audio Player `act()` Test Warnings — LOW (Test Noise)

> **Found by:** Engineer audit (PM audit #131). `audio-player.test.tsx` produces `act(...)` warnings from React 19 strict mode. Tests still pass. Fix by wrapping state-triggering interactions in `act()` or `waitFor()`. Not blocking.

### 7. Legal/Nav/Footer Admin Configurability — DEFERRED TO V2

> Legal text requires legal review regardless of configurability. Nav is structural (tied to routes). Footer changes ~yearly. Zero user impact. Lowest priority of all deferred items.

### 8. `generateResponse.tsx` at 861 lines — MONITOR

> **Found by:** Engineer audit (PM audit #132). 39 lines from 900-line god file threshold. No action needed now. If any feature addition pushes it over, decompose proactively. Candidate extractions: tool call dispatch handlers, error recovery logic.

---

> **Completed phases** archived in [`DONE.md`](DONE.md).
> Includes: Phases 143–148, 165, 165.1, 180.1–180.4, 185–222 (all sub-phases), 217-A/B/C/C-fix/D/E/F/G, 218-B, 218-C, 218-C-fix, 26.x, 29.1–29.5, 29.7, 223, 224, 225-A/B/C/D, 226, 227, 228, 229, 230, 231, 231-fix, 232, 233, 234-A, 234-A2, 234-C, 235, 236, 237 (closed), type file cleanup, admin sidebar persistence, Prettier reformat (PM audit #131).
> Phase 29.7 (Zustand audit) — COMPLETE. No changes needed. 4 stores, all properly implemented.
> TypeScript 6 / ESLint compatibility — **CLOSED** (audit #103). No issues.
> jsdom upgrade — **PIN MAINTAINED** (audit #103). ~24.1.3 stable. ESM TLA incompatibility persists.
> E2E fragile homepage heading — **FIXED** (audit #105). Structural assertion.

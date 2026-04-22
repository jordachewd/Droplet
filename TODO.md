# Droplet — TODO

> Prioritized, actionable development tasks. Each task max ~30 minutes.
> Governed by **Droplet-PM**. Do not add tasks without PM approval.
> Ref: `SPEC.md` for full specification. `AGENTS.md` for coding rules. `DONE.md` for completed phases.
> Implementation agent: **Droplet-Engineer** (Senior Developer).
>
> **STATUS: PM audit #138 (2026-04-22). Ruthless deep dive audit complete (tri-agent: Architect + Engineer + PM). All 7 gates verified GREEN by Engineer live run. 730 tests (110 suites). 0 lint errors. TSC clean. Build clean. Knip clean. Prettier GREEN. 5 new tasks added (Phases 253-257). No CRITICAL issues found. 1 pre-production blocker (Phase 253: `/design` removal).**
>
> **GATE STATUS: All 7 gates GREEN. 730 tests (110 suites). 0 failures. 0 lint errors (6 accepted warnings). TSC clean. Build clean. Knip clean. Prettier GREEN.**
>
> **ACTIVE BACKLOG: 5 new code tasks (Phases 253-257). `/design` page must be removed before production (Phase 253). PRODUCTION DEPLOYMENT PENDING pending Phase 253 completion.**

---

## Archived Phases — See [DONE.md](DONE.md)

> All phases through 251 archived. See DONE.md for completion records.
> Phases 240-249 (onboarding + bug fixes) COMPLETE.
> Phase 251-A/B/C (Codex review regression fixes) COMPLETE.
> Phase 238 (31 non-JSX `.tsx` → `.ts` rename) COMPLETE.
> Phase 234-B CLOSED (Stripe webhook localhost verified by owner).
> Phase 234-D CLOSED (email/invoice config — sandbox limitation, works in live mode).
> Phase 250 (prettier gate fix — 6 files) COMPLETE.
> Phase 237 CLOSED per owner override (PM audit #132) — `/design` page kept as dev-only design system preview.

---

## Execution Order (PM audit #138) — ACTIVE

> **Priority 1: Phase 253 (remove `/design` page) — pre-production blocker. Must complete before any public launch.**
> **Priority 2-4: Phases 254-256 — operational and architectural cleanup, complete before next feature work.**
> **Priority 5: Phase 257 — low-effort gate hygiene.**

---

### Phase 253 — Remove `/design` Page — PRE-PRODUCTION REQUIRED (~10 min)

> **Priority: HIGH. Pre-production blocker. AGENTS.md rule: "Must be removed before production deployment."**
> Found: Ruthless deep dive audit (PM audit #138). Page ships in production build at `/design`. No auth guard. Publicly accessible. Static-only dev artifact, safe to delete.

**Phase 253-A — Delete `/design` directory and update route table (~10 min)**

- Delete `src/app/(public)/design/` directory and all contents
- In `AGENTS.md` route table, remove `/design` from the Public namespace entry and remove the `/design` explanatory note beneath it
- Run `npm run build` to verify route is gone (should return 404, not appear in build output)
- Acceptance: `/design` produces 404 in build, AGENTS.md route table updated, all 7 gates GREEN

---

### Phase 254 — Fix `invoice.payment_failed` Log Level (~10 min)

> **Priority: MEDIUM. Operational visibility. False-alarm log pollution in production monitoring.**
> Found: PM audit #138. `handleInvoicePaymentFailed()` in `stripe-webhook-handlers.ts` calls `logStripeWebhookError()` on the success path (line ~460: "marked user as past_due") — a normal billing event outcome incorrectly classified as an error. Misleads on-call monitoring.

- In `src/lib/utils/stripe/stripe-webhook-handlers.ts`, change `logStripeWebhookError(...)` to `logStripeWebhookInfo(...)` for the "marked user as past_due" success log on the `updateResult !== "not_matched"` path
- Add explicit `logStripeWebhookInfo(...)` for the `not_matched` branch with a clear idempotency message ("user already past_due, skipping")
- Acceptance: `invoice.payment_failed` success path logs as Info, not Error; `not_matched` path has its own Info log; all 7 gates GREEN

---

### Phase 255 — Standardize `requireEnv()` in Webhook and Billing Files (~15 min)

> **Priority: MEDIUM. Maintenance discipline. Silent misconfiguration risk during deploys.**
> Found: PM audit #138. 3 files load secrets via bare `process.env.*` with manual null checks instead of `requireEnv()` — inconsistent with every other secret-loading site in the codebase. Risk: deploy with missing secrets fails silently at runtime instead of loudly at startup.

- In `src/app/api/webhooks/stripe/route.tsx`: replace `const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET` + null guard with `const endpointSecret = requireEnv("STRIPE_WEBHOOK_SECRET")` (remove the manual null guard block — `requireEnv()` throws on miss)
- In `src/app/api/webhooks/clerk/route.tsx`: replace `const signingSecret = process.env.CLERK_WEBHOOK_SIGNING_SECRET` + null guard with `requireEnv("CLERK_WEBHOOK_SIGNING_SECRET")`
- In `src/app/(public)/checkout-success/page.tsx`: replace `const stripeSecret = process.env.STRIPE_SECRET_KEY` + null guard block with `requireEnv("STRIPE_SECRET_KEY")`
- Import `requireEnv` from `@/lib/utils/require-env` in each file as needed
- Acceptance: all 3 files use `requireEnv()`, manual null guards removed, all 7 gates GREEN

---

### Phase 256 — Convert `incrementPromptCountIfBelowLimit` to Private Util (~15 min)

> **Priority: MEDIUM. Architectural hygiene. Server action semantics misapplied to API-route internal helper.**
> Found: PM audit #138. `incrementPromptCountIfBelowLimit` in `src/lib/actions/task.actions.ts` is exported as a `"use server"` action but is only called from `src/app/api/openai/route.tsx`. Exporting it as a server action means clients could invoke it directly via Next.js's server action mechanism — architecturally confusing, potential self-harm abuse vector against own quota.

- Move `incrementPromptCountIfBelowLimit` from `src/lib/actions/task.actions.ts` to `src/lib/utils/task-queries.tsx` (or a new `src/lib/utils/prompt-slot.ts`) as a **non-exported** private async function
- Update `src/app/api/openai/route.tsx` to import from the new location
- Ensure the function retains its auth check and ownership enforcement
- Remove the export from `task.actions.ts`
- Acceptance: function is no longer exported as a server action, OpenAI route still uses it, all 7 gates GREEN, no broken imports

---

### Phase 257 — Create `.prettierignore` (~5 min)

> **Priority: LOW. Gate noise prevention. `.agents/` skill markdown files cause Prettier gate noise.**
> Found: PM audit #138 (Engineer report). Prettier runs against full project root. Third-party skill markdown files in `.agents/` are flagged. A `.prettierignore` prevents future noise.

- Create `.prettierignore` at project root with contents:
  ```
  node_modules/
  .next/
  .agents/
  ```
- Acceptance: `npx prettier . --check` still passes, `.agents/` content no longer checked, all 7 gates GREEN

---

### Phase 258 — UsageEvent Retention Decision + TTL (DECISION REQUIRED, then ~15 min)

> **Priority: LOW now, HIGH at scale. UsageEvent collection grows unbounded.**
> Found: PM audit #138. `usage-event.model.ts` has no TTL index. `rate-limit-entry.model.ts` correctly uses `expireAfterSeconds: 0`. At production volumes, UsageEvent accumulates ~1.2M docs/year with no archival strategy. Admin analytics queries will degrade.

**Owner decision required before implementation:**

- **Option A**: Add TTL index (e.g., `expireAfterSeconds: 7776000` = 90 days rolling window). Admin analytics is limited to the retention window.
- **Option B**: Keep indefinitely, monitor query performance. Add MongoDB index on `createdAt` to support range-bounded analytics queries.
- **Option C**: Partition by month — separate collection per YYYY-MM, rotate manually.

**Implementation (after owner chooses):**

- Add the chosen TTL index or `createdAt` index to `usage-event.model.ts`
- Document the retention decision in SPEC.md
- Acceptance: decision documented, index in place, all 7 gates GREEN

---

### Phase 252 — Optional: Regression Tests for Onboarding/Handoff (~30 min)

> Priority: LOW. Current coverage relies on existing 730-test suite + manual flow validation. No production blocker.

**Phase 252-A — Handoff Post-Hydration Gate Test (~15 min)**

- Add unit test in `tests/unit/components/` verifying that the handoff auto-send effect does NOT fire when `dbTaskId` is non-null (stale store)
- Assert `sendMessage` is only called after store is clean (`dbTaskId === null`, `task.length === 0`)
- Acceptance: test passes, no false positives

**Phase 252-B — Onboarding Trial Badge Rendering Test (~15 min)**

- Add unit test verifying "Trial" badge renders for `isTrial === true` personas
- Assert badge does NOT render for full-access personas
- Acceptance: test passes, covers Lite/Pro/Premium/Admin plan permutations

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

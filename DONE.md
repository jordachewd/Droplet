# Droplet — DONE (Completed Phases)

> Archive of completed and verified phases. Items moved here from TODO.md once fully implemented and gates verified.
> See `ThePlan.md` for the full historical record.

---

## Phase 253 — Remove `/design` Pre-Production Blocker

- **Completed**: May 2026 (commit `816dc81`).
- **What**: Deleted `src/app/(public)/design/page.tsx`. This was the final pre-production safety blocker — the `/design` route was a fully public, unauthenticated design system preview page with no auth guard. It was removed before deploying to production.
- **Verification**: `file_search` for `**/design/**` returns no results. No route exists. Phase 253 CONFIRMED DONE.

---

## Phases 254–257 — Technical Debt Resolution (PM Audit #139)

- **Completed**: April 22, 2026. Verified in PM audit #139 tri-audit.
- **Phase 254**: `handleInvoicePaymentFailed` uses `logStripeWebhookInfo` / `logStripeWebhookError` correctly on all paths.
- **Phase 255**: All 3 files use `requireEnv()` — clerk webhook, stripe webhook, checkout-success page. No manual null guards remain.
- **Phase 256**: `incrementPromptCountIfBelowLimit` exported from `task-queries.ts` only (not `task.actions.ts`). Auth check + ownership filter intact. All tests import from new location.
- **Phase 257**: `.prettierignore` at project root with `node_modules/`, `.next/`, `.agents/`.

---

## Phases 240–251 — Onboarding Wizard Pipeline

- **Completed**: April 2026. All sub-phases (240-251) verified in PM audits #134-#139.
- **What**: 6-step onboarding wizard, persona recommendation, settings preferences, system prompt injection of all 4 preferences, HandoffDialog plan-gating, handoff hydration race fix, preferences projection fix, trial badge rendering fix, onboarding idempotency.

---

## Phase 238 — Non-JSX `.tsx` → `.ts` Rename (31 files)

- **Completed**: April 2026.

---

## Phases 209–237 — Sidebar, CSS, Stripe, Admin, Testing

- **Completed**: March–April 2026. Full record in `ThePlan.md`.

---

## Milestones 0–25 and Phases 1–208

- **Completed**: 2025–March 2026. See `ThePlan.md` historical section for full record.
- **V1.0 MVP Released** (PM audit #94).

# Droplet Project Status (2026-03-13)

## Completed
- Phases 1–25.5 all complete (product rules, routes, admin, streaming, model policy, testing)
- HF-1 through HF-7 all resolved (HF-3 closed invalid, HF-4 investigation only)
- 55 unit test suites / 268 tests passing
- 178 E2E tests passing, 8 skipped
- All 6 validation gates green (prettier, lint, tsc, test, test:e2e, build)

## Current Priorities
1. **HF-4** (LAUNCH BLOCKER) — Stripe checkout → /sign-in redirect. Fix approved: public /checkout-success route with Stripe session verification.
2. **HF-8** (MEDIUM) — Stripe webhook leaks detailed error messages. Sanitize responses.
3. Phase 25.6 — Unit test gap coverage
4. Phase 25.7 — Operational verification
5. Phase 26 — Deferred features (video gen, subscriptions, persona-aware media prompts)

## Key Architecture Facts
- Transaction.stripeId has unique:true (verified)
- Plan expiry IS enforced in /api/openai (403 + billing_state_invalid)
- resolveEntitlements does NOT check expiry (relies on route-level check)
- Stripe webhook uses mode:"payment" (one-time), not subscription
- Rate limiting uses MongoDB (RateLimitEntry model), not Redis
- Premium chat fallbacks: simple/standard→gpt-4o-mini, complex→gpt-4.1-mini

## Tech Debt (Active)
- TD-BILL-02: Stripe redirect (HF-4)
- TD-AI-08: No video generation (coming soon label)
- TD-AI-09: Image/audio prompts not persona-aware
- TD-AI-13: 5 model pricing placeholders
- TD-PLAN-01: No recurring subscriptions

# Droplet — TODO

> Prioritized, actionable development tasks. Each task max ~30 minutes.
> Governed by **Droplet-PM**. Do not add tasks without PM approval.
> Ref: `SPEC.md` for full specification. `AGENTS.md` for coding rules. `DONE.md` for completed phases.
> Implementation agent: **Droplet-Engineer** (Senior Developer).
>
> **STATUS: HF-4 is the sole remaining launch blocker — Stripe checkout redirect fix.**
> All milestones 0–8 complete. HF-1, HF-2, HF-3, HF-5, HF-6, HF-7 complete (see DONE.md).
> Phases 1–25.5 complete (see DONE.md).
> Priority order: HF-4 (Stripe redirect — LAUNCH BLOCKER) → HF-8 (Stripe webhook sanitization) → Phase 25.6 → Phase 25.7 → Phase 26.
> **All non-HF-4 work is ON HOLD until HF-4 is resolved.**

---

## HF-4: CRITICAL (LAUNCH BLOCKER) — Stripe Checkout Returns to /sign-in Instead of /app/profile

> After completing Stripe payment, user lands on `/sign-in` instead of `/app/profile`.
> Code is correct — `success_url` is `${BASEURL}/app/profile` (verified in `transaction.action.tsx`).
> Root cause confirmed: Clerk auth session expires while user is on Stripe's external checkout domain.
> When user returns, the proxy sees no active session and redirects `/app/profile` → `/sign-in`.
> **Investigation complete (HF-4.1). Implementation approved by PM and Architect.**
> Ref: SPEC.md TD-BILL-02.

---

### HF-4.1 ~~Investigate and~~ fix Stripe checkout return URL issue

**Root cause (confirmed):** Clerk session cookie expires or fails to rehydrate while user is on Stripe's external domain. On return, the proxy (`/app(.*)` matcher) sees no active session and redirects to `/sign-in`.

**Approved fix (PM + Architect):** Create a public intermediary route with Stripe session verification.

**What to do:**

1. **Create public route** at `src/app/(public)/checkout-success/page.tsx` (outside `(chat)` group, so proxy does NOT intercept).
2. **Accept query parameter** `session_id` from Stripe template variable.
3. **Server-side verification** — call `stripe.checkout.sessions.retrieve(sessionId)` to verify `payment_status === 'paid'`.
4. **Validate input** — `session_id` must be a non-empty string of reasonable length (max 255 chars). Reject empty/missing with generic error.
5. **If payment verified**: render success confirmation UI with link to `/app/profile` (standard Next.js `<Link>`).
6. **If payment NOT verified or session_id invalid**: render generic error with link to `/app/plans`.
7. **Do NOT modify user data** on this page — that remains the Stripe webhook's responsibility. This page is purely confirmation UI.
8. **Update `success_url`** in `src/lib/actions/transaction.action.tsx` from `${BASEURL}/app/profile` to `${BASEURL}/checkout-success?session_id={CHECKOUT_SESSION_ID}` (Stripe template variable).
9. **Update header/nav** — no navigation link to this page (it's only reached via Stripe redirect).
10. **Update E2E tests** — the checkout redirect assertion (if any) must point to `/checkout-success`.

**Rejected alternatives:**

- Option B (longer Clerk session duration) — REJECTED. Global setting, creates security tradeoff, doesn't guarantee survival across slow checkouts.
- Direct redirect to `/sign-in` with post-login redirect — REJECTED. Bad UX, user already authenticated.

**Acceptance criteria:**

- [ ] Public route `/checkout-success` exists outside protected route groups
- [ ] Route validates `session_id` param (non-empty, max 255 chars)
- [ ] Route calls `stripe.checkout.sessions.retrieve()` server-side
- [ ] Verified payment shows success UI + link to `/app/profile`
- [ ] Unverified/invalid shows error UI + link to `/app/plans`
- [ ] No user data modification on this page (webhook handles that)
- [ ] `success_url` in `transaction.action.tsx` updated to use `{CHECKOUT_SESSION_ID}` template
- [ ] Generic error messages only — no Stripe session data leaked to client
- [ ] `npx tsc --noEmit` passes
- [ ] All tests pass

---

---

## HF-8: MEDIUM — Stripe Webhook Leaks Detailed Error Messages

> Discovered during PM deep audit (2026-03-13).
> Stripe webhook route returns detailed internal error strings in JSON responses.
> While the consumer is Stripe (not a browser), this violates AGENTS.md: "generic messages to clients; detailed logs server-side only."
> Also returns `serializeForClient(newTransaction)` data in success response — unnecessary data exposure.
> Depends on: HF-4 resolved first.
> Ref: AGENTS.md Security Rules.

---

### HF-8.1 Sanitize Stripe webhook error responses

**File:** `src/app/api/webhooks/stripe/route.tsx`

**What to do:**

1. Replace all detailed `error:` strings (e.g., `"Checkout session metadata is invalid"`, `"Missing stripe-signature header"`, `"Missing STRIPE_WEBHOOK_SECRET"`) with a generic `error: "Webhook processing failed"`.
2. Log the detailed error messages server-side via `process.stderr.write()` before returning the generic response.
3. Remove `newTransaction` and `updatedUser` from the success response body. Return only `{ message: "OK" }`.
4. Remove `newTransaction` from the failure response body at line ~192.
5. Keep HTTP status codes as-is (400/500 for errors, 200 for success).

**Acceptance criteria:**

- [ ] All webhook error responses return generic messages only
- [ ] Detailed errors logged server-side via `process.stderr.write()`
- [ ] Success response body contains only `{ message: "OK" }` — no transaction/user data
- [ ] HTTP status codes preserved (400/500 for errors, 200 for success)
- [ ] Existing Stripe webhook unit tests updated
- [ ] `npx tsc --noEmit` passes
- [ ] All tests pass

---

## Phase 25.6: Unit Test Gap Coverage

## Phase 25.6: Unit Test Gap Coverage

> Fill remaining unit test gaps for critical business logic.
> Ref: SPEC.md Sections 4, 7, 8.
> Depends on: Phase 25.5.

---

### 25.6.1 Unit: Conversation stop enforcement edge cases

**File (new or extend):** `tests/unit/conversation-stop.test.ts`

**What to do:**

- Test all 5 stop reasons trigger the correct `endedReason` and `endAction` on Task.
- Test that `prompt_limit_reached` is set when prompt count equals plan limit.
- Test that `daily_conversation_limit_reached` fires when conversation count equals daily limit.
- Test that `conversation_storage_limit_reached` fires at 12MB threshold.
- Test that unlimited plans (`-1` limits) bypass all checks.
- Test that `media_limit_reached` fires when image/audio count equals plan quota.

**Acceptance criteria:**

- [ ] All 5 stop reasons have dedicated test cases
- [ ] Unlimited plan bypass verified
- [ ] Correct `endAction` for each stop reason verified
- [ ] All tests pass

---

### 25.6.2 Unit: Webhook idempotency edge cases

**File (extend):** `tests/unit/clerk-webhook-route.test.ts`, `tests/unit/stripe-webhook.test.ts`

**What to do:**

- Test Clerk `user.created` with duplicate clerkId returns 200 without creating duplicate User.
- Test Clerk `user.deleted` with non-existent user returns 200 without throwing.
- Test Stripe `checkout.session.completed` with duplicate `stripeId` returns 200 without creating duplicate Transaction.
- Test Stripe webhook with invalid signature returns 400.

**Acceptance criteria:**

- [ ] Clerk duplicate user.created handled gracefully
- [ ] Clerk missing user.deleted handled gracefully
- [ ] Stripe duplicate transaction handled with idempotency
- [ ] Invalid webhook signatures rejected
- [ ] All tests pass

---

### 25.6.3 Unit: Entitlement resolver full coverage

**File (extend):** `tests/unit/resolve-entitlements.test.ts`

**What to do:**

- Test all plan × media feature combinations (Lite/Pro/Premium × image/audio/video).
- Test expired paid plan reverts to Lite entitlements.
- Test suspended user gets blocked entitlements.
- Test all 9 personas accessible for all plan tiers.

**Acceptance criteria:**

- [ ] 9+ plan × feature combinations tested
- [ ] Expired plan behavior verified
- [ ] Suspended user behavior verified
- [ ] All 9 personas accessible across all plans verified
- [ ] All tests pass

---

## Phase 25.7: Operational Verification & Cleanup

> Final verification before Phase 26.
> Ref: ThePlan.md Release Gates A–F.
> Depends on: Phase 25.6.

---

### 25.7.1 Verify all release gates and run full validation

**What to do:**

- Run the complete 6-gate validation workflow (prettier, lint, tsc, test, test:e2e, build).
- Walk through ThePlan.md Release Gates A through F:
  - Gate A (Contract): billing semantics, limits frozen, Premium extras defined, model claims verified.
  - Gate B (Architecture): entitlement resolver live, route/auth boundaries correct, storage guardrails enforced.
  - Gate C (Product): Lite permanent + auth-required, all personas available, stop reasons work, streaming stable.
  - Gate D (Admin): all admin areas exist, actions audited, role enforcement works.
  - Gate E (Public): public pages exist and accurate, legal pages exist, no obsolete trial messaging.
  - Gate F (Validation): all 6 validation commands pass.
- Document any gate failures as follow-up tasks.

**Acceptance criteria:**

- [ ] All 6 validation commands pass
- [ ] Gates A–F evaluated with pass/fail documented
- [ ] Any gate failures logged as actionable follow-ups
- [ ] No critical blockers remain

---

### 25.7.2 Clean up test output noise

**What to do:**

- Investigate and fix the stderr warning about a `priority` prop in test output (likely Next.js `<Image>` component).
- Investigate and suppress the S3 cleanup stderr log noise in tests (expected behavior but noisy).
- Ensure clean test output with zero unexpected warnings.

**Acceptance criteria:**

- [ ] `priority` prop warning resolved or suppressed in tests
- [ ] S3 cleanup log noise addressed in test environment
- [ ] `npm run test` output is clean (only pass/fail, no unexpected stderr)
- [ ] All tests still pass

---

### 25.7.3 Verify admin audit trail completeness

**File (new):** `tests/unit/admin-audit-trail.test.ts`

**What to do:**

- Create integration-style unit test that verifies all 8 admin action functions produce `AdminAuditLog` entries.
- Test that each audit log entry contains: `adminId`, `action`, `targetType`, `targetId`.
- Verify no admin mutation can execute without producing an audit entry.

**Acceptance criteria:**

- [ ] All 8 admin actions produce audit log entries
- [ ] Audit log entries contain required fields
- [ ] Test verifies the relationship between action and log
- [ ] All tests pass

---

## Phase 26: Deferred Features — FUTURE (Not Yet Approved)

> Lower priority items deferred from v1 core.
> Do NOT begin until Phase 25.7 is complete and PM-approved.
> Depends on: Phase 25.7 verification complete.

---

### 26.1 Persona-aware media generation prompts

**Files:** `src/lib/utils/openai/generateImage.tsx`, `src/lib/utils/openai/generateAudio.tsx`, `src/constants/persona-prompts.ts`
**Ref:** TD-AI-09 (remaining gap)

**What to do:**

- Extend `persona-prompts.ts` to include image and audio prompt guidance per persona.
- In `generateImage.tsx`, inject persona-specific style/tone hints into the image generation prompt.
- In `generateAudio.tsx`, inject persona-specific voice/tone hints into audio generation.
- Preserve existing prompt structure — extend, don't replace.

**Acceptance criteria:**

- [ ] Image generation prompts include persona-specific context
- [ ] Audio generation prompts include persona-specific context
- [ ] Existing chat prompt behavior unaffected
- [ ] Unit tests for persona-aware media prompts
- [ ] `npx tsc --noEmit` passes
- [ ] All tests pass

---

### 26.2 Implement Stripe subscription mode (auto-renewal)

**Ref:** TD-PLAN-01

**What to do:**

- Migrate from one-time Stripe Checkout payments to `mode: "subscription"`.
- Handle `invoice.paid`, `customer.subscription.updated`, `customer.subscription.deleted` webhooks.
- Update plan lifecycle to auto-renew instead of expiring.
- Preserve webhook idempotency patterns.
- This is a significant change — requires careful webhook testing.

**Acceptance criteria:**

- [ ] Stripe sessions use `mode: "subscription"`
- [ ] Subscription lifecycle webhooks handled with idempotency
- [ ] Plan auto-renews on successful payment
- [ ] Plan downgrades on failed payment or cancellation
- [ ] `npx tsc --noEmit` passes
- [ ] All tests pass

---

### 26.3 Add video generation support for Premium

**Ref:** TD-AI-08

**What to do:**

- Implement video generation for Premium plan users.
- Requires: verified provider support, cost ceiling, moderation workflow, S3 storage lifecycle.
- Use `resolveModelPolicy({ plan: "premium", feature: "video_generation", taskClass })` for model selection.
- Wire into `/api/openai` tool calling flow.
- Remove "Coming soon" label from Premium plan inclusions.
- Video stored in S3 with URL reference in messages.
- Verify video model IDs are real OpenAI API identifiers before implementation.

**Acceptance criteria:**

- [ ] Video generation works for Premium users
- [ ] Other plans correctly blocked from video
- [ ] Usage event logged for video requests
- [ ] Video stored in S3, URL in message
- [ ] Plan inclusions show video as available (remove "Coming soon")
- [ ] `npx tsc --noEmit` passes
- [ ] All tests pass

---

> **Completed phases** are archived in [`DONE.md`](DONE.md).
> HF-1, HF-2, Phases 1–25.5.3 complete. Phase 10–12 superseded (see DONE.md for mapping).

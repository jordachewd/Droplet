# Droplet — TODO

> Prioritized, actionable development tasks. Each task max ~30 minutes.
> Governed by **Droplet-PM**. Do not add tasks without PM approval.
> Ref: `SPEC.md` for full specification. `AGENTS.md` for coding rules. `DONE.md` for completed phases.
> Implementation agent: **Droplet-Engineer** (Senior Developer).
>
> **STATUS: HF-2 critical fix in progress — self-healing for missing MongoDB user records.**
> All milestones 0–8 implementation complete. HF-1 complete. Phases 1–25.5.3 complete (see DONE.md).
> Stop before Phase 26 (Deferred Features) — all routes and features require full operational verification first.

---

## HF-2: Critical — Missing MongoDB User Self-Healing — TOP PRIORITY

> When Clerk webhook fails, delays, or is misconfigured, authenticated users have no MongoDB record.
> `/app/profile` and `/app/plans` show permanent loading spinner. `/api/openai` silently degrades to Lite.
> This is the #1 blocker. Must be fixed before any other work proceeds.
>
> **Root cause**: The Clerk webhook code is correct (verified HF-1). The failure occurs when:
> (a) Clerk Dashboard webhook URL, signing secret, or subscribed events are misconfigured, or
> (b) the app runs locally without a tunnel (ngrok/Cloudflare) registered in Clerk Dashboard.
>
> **Code fix**: Pages and API routes must handle the "authenticated but no MongoDB user" scenario gracefully.
> Ref: SPEC.md Section 5 (Self-Healing User Sync Requirement). AGENTS.md Security Rules.

---

### HF-2.1 Create self-healing user sync utility

**File (new):** `src/lib/utils/ensure-user-synced.ts`

**What to do:**

- Create an async server-only function `ensureUserSynced(clerkUserId: string)` that:
  1. Queries MongoDB for existing user by `clerkId`.
  2. If user exists, returns the serialized user data.
  3. If user does NOT exist, fetches user data from Clerk via `clerkClient().users.getUser(clerkUserId)`.
  4. Creates the MongoDB user record with Lite plan defaults (reuse the same plan initialization logic from the webhook `user.created` handler).
  5. Sets Clerk `publicMetadata` (userId, role, userImg) — same as the webhook handler does.
  6. Returns the newly created serialized user data.
- Import `"server-only"` at the top.
- Use the same plan defaults as the webhook handler: Lite, permanent, free.
- Handle creation failure gracefully — return `null`, log to stderr.
- Do NOT duplicate webhook logic: extract shared helpers if needed (e.g., move `resolveUserCreatedParams` to a shared utility or import from the webhook module).

**Acceptance criteria:**

- [ ] Utility creates MongoDB user from Clerk data when user record is missing
- [ ] User gets Lite plan defaults on self-healing creation
- [ ] Clerk `publicMetadata` is set correctly (userId, role, userImg)
- [ ] Returns existing user without modification if already exists
- [ ] Does not throw on failure — returns `null`
- [ ] Unit test covers: existing user returns directly, missing user creates and returns, creation failure returns null
- [ ] `npx tsc --noEmit` passes
- [ ] All tests pass

---

### HF-2.2 Fix /app/profile to handle missing MongoDB user

**File:** `src/app/(chat)/app/profile/page.tsx`

**What to do:**

- Replace `getUserById(userId)` with `ensureUserSynced(userId)` from HF-2.1.
- If `ensureUserSynced` returns `null`, show a clear error state instead of `<LoadingBubbles />`:
  - Message: "We're having trouble loading your account. Please try refreshing the page or contact support."
  - Include support email link (`SUPPORT_EMAIL` from `@/constants/support`) and a refresh/retry link.
- If it returns user data, render normally (existing behavior unchanged).

**Acceptance criteria:**

- [ ] `/app/profile` renders user data when MongoDB user exists (no behavior change)
- [ ] `/app/profile` self-heals when MongoDB user is missing (creates it on-demand)
- [ ] `/app/profile` shows error message (not loading spinner) when self-healing fails
- [ ] Error message includes support contact and retry guidance
- [ ] `npx tsc --noEmit` passes
- [ ] All tests pass

---

### HF-2.3 Fix /app/plans to handle missing MongoDB user

**File:** `src/app/(chat)/app/plans/page.tsx`

**What to do:**

- Replace `getUserById(userId)` with `ensureUserSynced(userId)` from HF-2.1.
- Same error handling pattern as HF-2.2.
- If `ensureUserSynced` returns `null`, show error state instead of `<LoadingBubbles />`.
- If it returns user data, render normally.

**Acceptance criteria:**

- [ ] `/app/plans` renders plan data when MongoDB user exists (no behavior change)
- [ ] `/app/plans` self-heals when MongoDB user is missing
- [ ] `/app/plans` shows error message when self-healing fails
- [ ] `npx tsc --noEmit` passes
- [ ] All tests pass

---

### HF-2.4 Fix /api/openai to reject when user record is missing

**File:** `src/app/api/openai/route.tsx`

**What to do:**

- After `getUserById(userId)` returns `null`, attempt `ensureUserSynced(userId)` to self-heal.
- If self-healing succeeds, continue normally with the correct plan data.
- If self-healing fails, return HTTP 503 with `{ message: "Account not yet provisioned. Please try again in a moment." }`.
- Do NOT silently fall back to Lite — a paid Pro/Premium user must never be downgraded without feedback.

**Acceptance criteria:**

- [ ] Route attempts self-healing when user record is missing
- [ ] Route uses correct plan data after successful self-healing
- [ ] Route returns 503 (not silent Lite degradation) when self-healing fails
- [ ] Existing behavior unchanged when user record exists
- [ ] Unit test covers: missing user → self-heal succeeds → uses correct plan; missing user → self-heal fails → 503
- [ ] `npx tsc --noEmit` passes
- [ ] All tests pass

---

### HF-2.5 Remove dead svix dependency

**File:** `package.json`

**What to do:**

- Run `npm uninstall svix` to remove from `dependencies` and update `package-lock.json`.
- Verify zero imports of `svix` in source code (already confirmed).
- Run full 6-gate validation.

**Acceptance criteria:**

- [ ] `svix` removed from `package.json` dependencies
- [ ] `package-lock.json` updated
- [ ] Zero imports of `svix` in `src/`
- [ ] `npm run test` passes
- [ ] `npx tsc --noEmit` passes
- [ ] `npm run build` passes

---

### HF-2.6 Verify Clerk Dashboard webhook configuration

**What to do (operational — not a code task):**

- Log into Clerk Dashboard → Webhooks section.
- Verify the webhook endpoint URL is `https://<deployed-domain>/api/webhooks/clerk` (not localhost).
- Verify the signing secret shown in Clerk Dashboard matches the `CLERK_WEBHOOK_SIGNING_SECRET` value in `.env.local` exactly.
- Verify `user.created`, `user.updated`, `user.deleted` are checked as subscribed events.
- Check the "Attempts" tab for delivery logs — look for HTTP status codes and response bodies.
- If developing locally, confirm a tunnel (ngrok/Cloudflare Tunnel) is running and the tunnel URL is registered in Clerk Dashboard.
- Trigger a test event from Clerk Dashboard and verify it appears in MongoDB.

**Acceptance criteria:**

- [ ] Webhook endpoint URL is correct and reachable
- [ ] Signing secret matches `.env.local`
- [ ] All 3 event types are subscribed (`user.created`, `user.updated`, `user.deleted`)
- [ ] Test event successfully creates/updates user in MongoDB
- [ ] Clerk "Attempts" tab shows 200 responses

---

## Phase 25.5: Comprehensive E2E Test Expansion

> Expand E2E test coverage to verify all routes and features before deferred feature work.
> Ref: ThePlan.md Milestone 9 (Launch Readiness). AGENTS.md testing rules.
> Depends on: HF-2 complete. Phases 25.5.1–25.5.3 complete (see DONE.md).

---

### 25.5.4 E2E: Conversation lifecycle

**File (new):** `tests/e2e/conversation-lifecycle.spec.ts`

**What to do:**

- Test new conversation creation flow (select persona → send message → conversation created).
- Test conversation appears in library (`/app/library`).
- Test conversation resume via `/app/c/[conversationId]` shows previous messages.
- Test conversation delete from library removes it from list.

**Acceptance criteria:**

- [ ] New conversation creation tested (persona + first message)
- [ ] Conversation listed in library after creation
- [ ] Conversation resume shows message history
- [ ] Conversation delete removes from library
- [ ] All E2E tests pass

---

### 25.5.5 E2E: User profile and plan pages

**File (new):** `tests/e2e/user-profile.spec.ts`

**What to do:**

- Test `/app/profile` displays user info (name, email, current plan).
- Test plan badge shows correct tier name.
- Test `/app/plans` displays all 3 plan cards with correct prices and features.
- Test upgrade button or checkout link is present for higher plans.

**Acceptance criteria:**

- [ ] `/app/profile` renders user info and plan details
- [ ] Current plan tier correctly displayed
- [ ] `/app/plans` shows 3 plan cards ($0/$19/$39)
- [ ] Upgrade CTA present for non-Premium users
- [ ] All E2E tests pass

---

### 25.5.6 E2E: Admin dashboard and user management

**File (new):** `tests/e2e/admin-users.spec.ts`

**What to do:**

- Test `/admin` dashboard loads with overview stats (total users, transactions, usage).
- Test `/admin/users` list page renders with user rows.
- Test clicking a user navigates to `/admin/users/[userId]` detail page.
- Test suspend/reinstate action buttons are present on user detail page.

**Acceptance criteria:**

- [ ] `/admin` dashboard renders with stats cards
- [ ] `/admin/users` list renders with user data
- [ ] User detail page accessible and renders user info
- [ ] Admin action buttons visible on detail page
- [ ] All E2E tests pass

---

### 25.5.7 E2E: Admin transactions, usage, settings, and website

**File (new):** `tests/e2e/admin-features.spec.ts`

**What to do:**

- Test `/admin/transactions` list page renders.
- Test `/admin/usage` analytics page renders with data sections.
- Test `/admin/settings` page loads with current settings (model, pricing, limits).
- Test `/admin/website` page lists public pages with actions.
- Test `/admin/website/[pageId]` editor loads Tiptap editor component.

**Acceptance criteria:**

- [ ] Transactions list page renders
- [ ] Usage analytics page renders with data sections
- [ ] Settings page loads with editable fields
- [ ] Website management page lists pages
- [ ] Page editor renders Tiptap component
- [ ] All E2E tests pass

---

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
- Use `resolveModelPolicy({ plan: "premium", feature: "video_generation", taskClass })` for model selection — `sora-2` for previews, `sora-2-pro` for final renders.
- Wire into `/api/openai` tool calling flow.
- Remove "Coming soon" label from Premium plan inclusions.
- Video stored in S3 with URL reference in messages.

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
> HF-1, Phases 1–25.5.3 complete. Phase 10–12 superseded (see DONE.md for mapping).

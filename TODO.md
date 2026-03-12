# Droplet — TODO

> Prioritized, actionable development tasks. Each task max ~30 minutes.
> Governed by **Droplet-PM**. Do not add tasks without PM approval.
> Ref: `SPEC.md` for full specification. `AGENTS.md` for coding rules. `DONE.md` for completed phases.
> Implementation agent: **Codex Agent** (Senior Developer).
>
> **STATUS: Pre-Phase 26 — comprehensive verification and E2E expansion before deferred features.**
> All milestones 0–8 implementation complete. Phases 1–25.5.2 complete (see DONE.md).

---

## PRIORITY HOTFIX: Clerk Webhook Failure — User Sync Broken

> **Blocking issue.** Clerk webhooks (`user.created`, `user.updated`, `user.deleted`) fail silently. Users appear in Clerk Dashboard but never reach MongoDB. All `/app/*` pages that depend on the local user record crash.
> **Must be fixed before any other work proceeds.**

---

### HF-1 Fix Clerk webhook to restore user sync

**File:** `src/app/api/webhooks/clerk/route.tsx`
**Ref:** Clerk webhook sync docs (https://clerk.com/docs/guides/development/webhooks/syncing), `verifyWebhook()` reference (https://clerk.com/docs/reference/backend/verify-webhook), Clerk env vars (https://clerk.com/docs/guides/development/clerk-environment-variables).

**Root causes (verified against current Clerk docs, March 2026):**

1. **Environment variable name mismatch.** Current Clerk docs define the canonical webhook env var as `CLERK_WEBHOOK_SIGNING_SECRET`. Droplet's code reads `process.env.CLERK_WEBHOOK_SECRET` (line 234 of route.tsx). SPEC.md also documents the old name. If `.env.local` or production env uses one name and the code expects the other, verification fails on every request. Additionally, `verifyWebhook()` auto-reads `CLERK_WEBHOOK_SIGNING_SECRET` — using it avoids this mismatch entirely.

2. **Production deployment using Clerk development instance.** The SE report confirmed the production sign-in page shows Clerk "Development mode" badge. This means the deployed app uses `pk_test_*` / `sk_test_*` keys. If the webhook endpoint is configured in the production Clerk instance but the app runs on development keys (or vice versa), the webhook signing secret won't match and every verification will fail with a 400.

3. **Outdated manual Svix verification.** Droplet uses raw `new Webhook(secret).verify(body, headers)` from the `svix` package. Current Clerk docs (March 2026) recommend `verifyWebhook()` from `@clerk/nextjs/webhooks` (available since `@clerk/nextjs` v7+, which Droplet is on at 7.0.4). `verifyWebhook()` handles body reading, header extraction, and secret resolution internally — eliminates the entire class of body-consumption and header-mismatch bugs.

4. **Zero diagnostic logging on verification failure.** The catch block at verification (around line 270) returns `new Response("Error occured", { status: 400 })` with no server-side log. When verification fails, there is no trace in server logs to diagnose why.

**What to do:**

1. **Verify environment configuration (do this first, before any code change):**
   - Confirm `.env.local` has the webhook signing secret value copied from the Clerk Dashboard → Webhooks → your endpoint → Signing Secret.
   - Decide: either rename the env var to `CLERK_WEBHOOK_SIGNING_SECRET` (Clerk's canonical name) everywhere (code + `.env.local` + SPEC.md), or pass it explicitly to `verifyWebhook({ signingSecret: process.env.CLERK_WEBHOOK_SECRET })`.
   - Confirm the Clerk Dashboard webhook endpoint URL matches the actual deployed URL (`/api/webhooks/clerk`).
   - Confirm the Clerk Dashboard has subscriptions enabled for `user.created`, `user.updated`, `user.deleted`.

2. **Verify Clerk instance alignment:**
   - If the production deployment shows "Development mode", the `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is a `pk_test_*` key. Either switch production to use production Clerk keys (`pk_live_*`, `sk_live_*`), or ensure the webhook endpoint + signing secret are configured in the **development** instance Dashboard (not the production one).
   - Both the webhook signing secret AND the Clerk API keys must come from the **same** Clerk instance.

3. **Migrate from raw Svix to `verifyWebhook()`:**
   - Replace the entire manual verification block (headers extraction, `new Webhook()`, `.verify()`) with:
     ```typescript
     import { verifyWebhook } from "@clerk/nextjs/webhooks";

     export async function POST(req: Request) {
       try {
         const evt = await verifyWebhook(req);
         // ... handle evt.type as before
       } catch {
         process.stderr.write("[clerk-webhook] Verification failed.\n");
         return new Response("Webhook verification failed", { status: 400 });
       }
     }
     ```
   - If using the non-canonical env var name, pass it explicitly: `await verifyWebhook(req, { signingSecret: process.env.CLERK_WEBHOOK_SECRET })`.
   - Remove the `svix` import — it's no longer needed if `verifyWebhook()` is used.
   - Remove the manual `headers()` extraction for `svix-id`, `svix-timestamp`, `svix-signature`.
   - Remove the `ClerkWebhookEmailAddress`, `ClerkWebhookUserBase`, and related manual types if `verifyWebhook()` returns properly typed `WebhookEvent`.

4. **Add diagnostic logging on verification failure:**
   - In the catch block of `verifyWebhook()`, write to `process.stderr` so failed webhooks leave a trace in server logs. Do NOT log the error object to the client response.

5. **Update unit tests:**
   - Migrate `tests/unit/clerk-webhook-route.test.ts` to mock `verifyWebhook` instead of raw `Webhook` from `svix`.
   - Keep all existing test scenarios (duplicate user, missing user delete, signature failure, etc.).

6. **Update SPEC.md:**
   - Change the env var table entry from `CLERK_WEBHOOK_SECRET` to `CLERK_WEBHOOK_SIGNING_SECRET` (or document both if keeping the old name with explicit pass-through).

7. **Test the fix:**
   - Run `npm run test` — all unit tests must pass.
   - Run `npx tsc --noEmit` — no type errors.
   - Use Clerk Dashboard → Webhooks → Testing tab → Send Example for `user.created` to verify the endpoint responds 200 and the user appears in MongoDB.
   - Create a real user via sign-up and confirm the user record appears in MongoDB.

**Acceptance criteria:**

- [ ] Clerk webhook successfully creates user in MongoDB on `user.created`
- [ ] Clerk webhook successfully updates user in MongoDB on `user.updated`
- [ ] Clerk webhook successfully deletes user and related data on `user.deleted`
- [ ] `verifyWebhook()` from `@clerk/nextjs/webhooks` used instead of raw Svix
- [ ] Env var name aligned with Clerk's canonical `CLERK_WEBHOOK_SIGNING_SECRET` (or explicitly passed)
- [ ] Clerk instance keys (publishable + secret + webhook signing secret) all from the same instance
- [ ] Server-side diagnostic log on verification failure
- [ ] SPEC.md env var table updated
- [ ] Unit tests updated and passing
- [ ] `npx tsc --noEmit` passes
- [ ] `npm run test` passes
- [ ] Clerk Dashboard test webhook returns 200

---

## Phase 25.5: Comprehensive E2E Test Expansion — CURRENT PRIORITY

> Expand E2E test coverage to verify all routes and features before deferred feature work.
> Ref: ThePlan.md Milestone 9 (Launch Readiness). AGENTS.md testing rules.
> Depends on: Phase 25.4 (complete). Phases 25.5.1–25.5.2 complete (see DONE.md).

---

### 25.5.1 & 25.5.2 — COMPLETE

Moved to `DONE.md`.

---

### 25.5.3 E2E: Authenticated app shell and navigation

**File (new):** `tests/e2e/chat-app-shell.spec.ts`

**What to do:**

- Test that authenticated user sees `/app` with sidebar and main content area.
- Test sidebar links: New Chat, Library, Personas, Profile, Plans.
- Test navigation from sidebar to each route renders correct page.
- Test persona picker is visible on new conversation page.

**Acceptance criteria:**

- [ ] `/app` renders with sidebar and main content
- [ ] Sidebar navigation links to 5 routes verified
- [ ] Each navigated page renders expected content
- [ ] Persona picker visible on `/app/new`
- [ ] All E2E tests pass

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
> Phases 1–25.4 are complete. Phase 10–12 superseded (see DONE.md for mapping).

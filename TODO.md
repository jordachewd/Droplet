# Droplet — TODO

> Prioritized, actionable development tasks. Each task max ~30 minutes.
> Governed by **Droplet-PM**. Do not add tasks without PM approval.
> Ref: `SPEC.md` for full specification. `AGENTS.md` for coding rules. `DONE.md` for completed phases.
> Implementation agent: **Droplet-Engineer** (Senior Developer).
>
> **STATUS: HF-5 critical fix next — auth reliability (webhook over-fetch + self-heal race).**
> All milestones 0–8 implementation mostly complete. HF-1, HF-2 complete. HF-3 closed (invalid — model IDs verified real).
> Phases 1–25.5.3 complete (see DONE.md).
> Priority order: HF-5 (critical auth) → HF-4 (Stripe redirect) → HF-6 (Premium retry) → HF-7 (compaction) → Phase 25.5+.

---

## HF-4: HIGH — Stripe Checkout Returns to /sign-in Instead of /app/profile

> After completing Stripe payment, user lands on `/sign-in` instead of `/app/profile`.
> Code is correct — `success_url` is `${BASEURL}/app/profile` (verified in `transaction.action.tsx`).
> Likely cause: Clerk auth session expires while user is on Stripe's external checkout domain.
> When user returns, the proxy sees no active session and redirects `/app/profile` → `/sign-in`.
> Ref: SPEC.md TD-BILL-02.

---

### HF-4.1 Investigate and fix Stripe checkout return URL issue

**What to do:**

1. **Verify production env:** Confirm `NEXT_PUBLIC_API_BASE_URL` in production `.env` matches the deployed domain exactly (correct protocol, no trailing slash, correct domain).
2. **Test locally:** Complete the full checkout flow: click upgrade → complete Stripe test payment → verify landing page.
3. **Investigate session expiry:** Check if Clerk session expires during Stripe checkout:
   - Open browser DevTools Network tab before clicking upgrade.
   - Complete payment on Stripe.
   - After redirect back, check the Network tab for the redirect chain (is `/app/profile` returning 302 → `/sign-in`?).
   - Check Clerk session cookie expiration settings in Clerk Dashboard.
4. **If session expiry is the cause**, consider fixes:
   - Option A: Redirect `success_url` to a public intermediary route (e.g., `/checkout-success?session_id={CHECKOUT_SESSION_ID}`) that verifies payment status and redirects to `/app/profile` after ensuring re-authentication.
   - Option B: Adjust Clerk session duration/inactivity settings to survive the checkout window.
   - Option C: Use Stripe's `{CHECKOUT_SESSION_ID}` template in `success_url` and add a public `/checkout-complete` page that fetches session status and redirects appropriately.
5. **If env config is the cause**, fix the env var and verify.

**Acceptance criteria:**

- [ ] Root cause identified and documented
- [ ] After successful Stripe payment, user lands on `/app/profile` (not `/sign-in`)
- [ ] Fix verified on both local and production environments
- [ ] No regression to other Stripe or auth flows
- [ ] If code changes required: `npx tsc --noEmit` passes, all tests pass

---

## HF-5: CRITICAL — Auth Reliability: Webhook Over-Fetch & Self-Heal Race

> Two independent bugs on the user-creation critical path combine to degrade signup
> and chat reliability. During Clerk API degradation, valid signups fail (HF-5.1).
> During webhook/self-heal race conditions, authenticated users get false 503s (HF-5.2).
> Both confirmed by Architect and Engineer. No blockers — ready to implement.
> Ref: AGENTS.md Security Rules (self-healing user sync). SPEC.md Section 2.

---

### HF-5.1 Remove unnecessary Clerk API call for missing username in webhook

**File:** `src/app/api/webhooks/clerk/route.tsx`

**What to do:**

- In `resolveUserCreatedParams()`, change the condition `if (!webhookEmail || !webhookUsername)` to `if (!webhookEmail)`.
- The username fallback is already handled locally by `generateFallbackUsername()` — no Clerk backend call is needed for it.
- When `fallbackClerkUser` is null (because we skip the fetch), the username chain `webhookUsername ?? toNonEmptyString(fallbackClerkUser?.username) ?? generateFallbackUsername(...)` correctly falls through to local generation.
- Verify `firstName`, `lastName`, and `userimg` tolerate empty strings when `fallbackClerkUser` is null (they already default to `""`).

**Acceptance criteria:**

- [ ] Condition changed to `if (!webhookEmail)` only
- [ ] Webhook with email but no username succeeds WITHOUT calling `client.users.getUser()`
- [ ] Webhook with no email still calls `client.users.getUser()` as fallback
- [ ] `generateFallbackUsername()` produces valid usernames when webhook fields are missing
- [ ] Existing clerk-webhook unit tests updated and passing
- [ ] New test: webhook payload with email but no username → verify `getUser` NOT called
- [ ] `npx tsc --noEmit` passes

---

### HF-5.2 Fix self-heal duplicate-key race returning false 503

**File:** `src/lib/utils/ensure-user-synced.ts`

**What to do:**

1. Wrap `User.create()` in a targeted try/catch for MongoDB error code `11000` (duplicate key).
2. On `11000`, refetch the existing user with `User.findOne({ clerkId })` using the same `.select().lean()` projection as the happy path. Return the refetched user.
3. Wrap `client.users.updateUserMetadata()` in its own try/catch. Log a warning on failure but still return the successfully created (or refetched) user record. Metadata sync is non-critical — the next webhook or login event will reconcile it.
4. Keep the outer try/catch for truly unexpected errors (network failures, DB connection errors).
5. The consuming code in `src/app/api/openai/route.tsx` (line ~568) does NOT need changes — it already handles null correctly. This fix reduces false nulls.

**Acceptance criteria:**

- [ ] Duplicate key (11000) error caught specifically after `User.create()`
- [ ] Refetch uses same `.select().lean()` projection as the initial `findOne`
- [ ] `updateUserMetadata()` failure does NOT cause null return
- [ ] A code comment documents why metadata sync is non-fatal
- [ ] New unit test: `User.create()` throws 11000 → verify user returned (not null)
- [ ] New unit test: `updateUserMetadata()` throws → verify user still returned
- [ ] `npx tsc --noEmit` passes
- [ ] All existing tests pass

---

## HF-6: HIGH — Premium Chat Retries Never Downgrade Model Tier

> All 3 Premium chat task classes set `fallbackModel` equal to `model` (`gpt-4.1`).
> The resolver only downgrades when `fallbackModel !== model`, so the retry path is dead code
> for Premium chat. Violates AGENTS.md rule: "Retries should downgrade model tier."
> Pro plan correctly uses `gpt-4o-mini` as fallback — issue is isolated to Premium.
> Confirmed by Architect and Engineer. Depends on: HF-5 resolved first.
> Ref: AGENTS.md AI/OpenAI Rules. SPEC.md Section 8.

---

### HF-6.1 Set distinct fallback models for Premium chat task classes

**File:** `src/lib/utils/ai-model-policy.ts`

**What to do:**

- Change Premium chat `simple` fallbackModel from `"gpt-4.1"` to `"gpt-4o-mini"`.
- Change Premium chat `standard` fallbackModel from `"gpt-4.1"` to `"gpt-4o-mini"`.
- Change Premium chat `complex` fallbackModel from `"gpt-4.1"` to `"gpt-4.1-mini"` (complex warrants a smaller quality drop than simple/standard).
- Verify `gpt-4.1-mini` is a valid model ID. If not, use `gpt-4o-mini` and document the gap.
- When `gpt-5.4` is later wired as the primary complex model, its fallback should be `gpt-4.1`.
- Update the `notes` field on each rule to reflect the new downgrade behavior.

**PM Decision (recorded):** Complex Premium chat falls to `gpt-4.1-mini` (not `gpt-4o-mini`), preserving reasonable quality on retry. Simple/standard fall to `gpt-4o-mini`, matching Pro behavior.

**Acceptance criteria:**

- [ ] All 3 Premium chat `fallbackModel` values differ from their `model` values
- [ ] Existing unit test assertions updated (e.g., `ai-model-policy.test.ts` line ~85)
- [ ] New test: Premium chat with `retryAttempt: 1` → verify model resolves to fallbackModel
- [ ] New test: Premium chat with `highLatency: true` → verify downgrade fires
- [ ] `npx tsc --noEmit` passes
- [ ] All tests pass

---

## HF-7: MEDIUM — Context Compaction Ignores Non-Text Token Cost

> `estimateMessageTokens()` returns 0 for images/audio. Non-text content items always retained
> with zero cost in compaction. Image-heavy conversations pass through unchanged and can blow
> the provider context window, defeating the purpose of the compaction layer.
> Confirmed by Architect and Engineer. Needs design decisions before implementation.
> Depends on: HF-5 resolved first. Ref: SPEC.md Section 8.

---

### HF-7.1 Add non-text token cost estimation to message compaction

**File:** `src/lib/utils/openai/message-policy.ts`

**What to do:**

1. In `estimateMessageTokens()`, assign heuristic token costs to non-text content items:
   - `image_url`: 300 tokens (midpoint between low-detail 85 and high-detail 1105; detail level is not available in the content item type).
   - `input_audio`: 500 tokens per audio segment (conservative flat estimate; duration not stored).
   - Document these heuristics as approximate with a code comment.
2. In `trimMessageToTokenLimit()`, allow non-text items to be evicted when `remainingTokens <= 0` — currently they are pushed unconditionally.
3. In `compactMessagesToTokenLimit()`, include non-text token cost in `messageTokens` budget check. Evict entire older messages with non-text content when budget is exceeded.
4. **Critical constraint:** Never strip non-text items from the MOST RECENT user message (the one being responded to). The user expects a response to what they just sent.

**PM Decisions (recorded):**

- Heuristic image cost: 300 tokens per image item.
- Heuristic audio cost: 500 tokens per audio item.
- Eviction is acceptable for older non-text items. Recent user message is protected.
- These are conservative estimates — over-counting is safer than under-counting.

**Acceptance criteria:**

- [ ] `estimateMessageTokens()` returns non-zero for messages with image/audio content
- [ ] Non-text items in older messages are evicted when token budget is exceeded
- [ ] Most recent user message retains all non-text items regardless of budget
- [ ] Heuristic costs documented in code comments
- [ ] New test file: `tests/unit/message-policy.test.ts`
- [ ] Test: image-only message returns ~300 tokens per image
- [ ] Test: compaction with image-heavy conversation evicts older images
- [ ] Test: most recent user message images preserved even over budget
- [ ] Test: text-only compaction behavior unchanged (regression)
- [ ] `npx tsc --noEmit` passes
- [ ] All tests pass

---

## Phase 25.5: Comprehensive E2E Test Expansion

> Expand E2E test coverage to verify all routes and features before deferred feature work.
> Ref: ThePlan.md Milestone 9 (Launch Readiness). AGENTS.md testing rules.
> Depends on: HF-3 and HF-4 resolved. Phases 25.5.1–25.5.3 complete (see DONE.md).

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

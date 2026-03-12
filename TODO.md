# Droplet — TODO

> Prioritized, actionable development tasks. Each task max ~30 minutes.
> Governed by **Droplet-PM**. Do not add tasks without PM approval.
> Ref: `SPEC.md` for full specification. `AGENTS.md` for coding rules. `DONE.md` for completed phases.
> Implementation agent: **Droplet-Engineer** (Senior Developer).
>
> **STATUS: HF-3 critical fix required — image/audio generation broken due to placeholder model IDs.**
> All milestones 0–8 implementation mostly complete. HF-1, HF-2 complete. Phases 1–25.5.3 complete (see DONE.md).
> Image and audio generation are 100% broken and must be fixed before any other work proceeds.

---

## HF-3: CRITICAL — Fix Image & Audio Generation Model IDs — TOP PRIORITY

> Image generation fails for ALL plans. Audio generation fails for Pro/Premium.
> Root cause: `MODEL_POLICY_MATRIX` in `ai-model-policy.ts` uses invented model IDs
> (`gpt-image-1-mini`, `gpt-image-1.5`, `gpt-audio-mini`, `gpt-audio-1.5`, `gpt-4o-mini-tts`)
> that are not recognized by the OpenAI API. Every image/audio request returns an invalid-model error.
>
> This is the #1 blocker. Chat works because its model IDs (`gpt-4o-mini`, `gpt-4.1`) are valid.
> Ref: SPEC.md TD-AI-16, TD-AI-17. AGENTS.md AI/OpenAI Rules.

---

### HF-3.1 Replace image generation model IDs with real OpenAI models

**File:** `src/lib/utils/ai-model-policy.ts`

**What to do:**

- Check the OpenAI API documentation for currently available image generation models.
- Replace `gpt-image-1-mini` with the correct real OpenAI image model for cost-optimized generation (e.g., `dall-e-2` or the cheaper tier of whatever is currently available).
- Replace `gpt-image-1.5` with the correct real OpenAI image model for high-quality generation (e.g., `dall-e-3` or the higher tier of whatever is currently available).
- Update fallback model references to use valid IDs.
- Update the `MODEL_PRICING` entries for the new image model IDs with real per-request costs.
- Update the `MODEL_CAPABILITIES` map if image models have entries there.
- Verify the calling code in `generateImage.tsx` is compatible with the chosen model's API (some models use `response_format: "b64_json"`, others return URLs).

**Acceptance criteria:**

- [ ] Image model IDs in `MODEL_POLICY_MATRIX` are real, verified OpenAI API identifiers
- [ ] Lite uses cheaper image model, Pro/Premium use higher-quality model
- [ ] `MODEL_PRICING` updated with correct per-request costs for new model IDs
- [ ] `generateImage.tsx` API call is compatible with chosen model's response format
- [ ] `npx tsc --noEmit` passes
- [ ] Unit tests updated and passing (`ai-model-policy.test.ts`, any image-related tests)
- [ ] Image generation works end-to-end for Lite, Pro, and Premium plans

---

### HF-3.2 Replace audio generation model IDs with real OpenAI models

**File:** `src/lib/utils/ai-model-policy.ts`

**What to do:**

- Check the OpenAI API documentation for currently available audio/TTS models.
- Replace `gpt-audio-mini` with the correct real OpenAI audio model for Pro tier.
- Replace `gpt-audio-1.5` with the correct real OpenAI audio model for Premium tier.
- Replace `gpt-4o-mini-tts` with the correct real OpenAI TTS-only model for fallback.
- Maintain audio mode differentiation: TTS-only path (`audio.speech.create`) vs audio_in_out path (`chat.completions.create` with audio modality).
- Update `MODEL_PRICING` entries with real costs.
- Update the `MODEL_CAPABILITIES` map entries for the new audio model IDs (especially `isTtsOnly` flags).
- Verify compatibility with `generateAudio.tsx` calling code for both TTS and audio_in_out paths.

**Acceptance criteria:**

- [ ] Audio model IDs in `MODEL_POLICY_MATRIX` are real, verified OpenAI API identifiers
- [ ] TTS-only fallback model is correct and flagged properly in `MODEL_CAPABILITIES`
- [ ] Audio_in_out models support the `modalities: ["text", "audio"]` API parameter
- [ ] `MODEL_PRICING` updated with correct costs
- [ ] `npx tsc --noEmit` passes
- [ ] Unit tests updated and passing
- [ ] Audio generation works end-to-end for Pro and Premium plans
- [ ] Lite correctly blocks audio (existing behavior preserved)

---

### HF-3.3 Update SPEC.md and plan copy for corrected model names

**Files:** `SPEC.md`, `src/constants/plans.tsx`

**What to do:**

- Update SPEC.md Section 8.2 (Model Policy Matrix) with the corrected model IDs from HF-3.1 and HF-3.2.
- Update model references in Section 4 (plan tier contract) if they mention specific model names.
- Resolve TD-AI-16 and TD-AI-17 in the tech debt table.
- Review `src/constants/plans.tsx` plan feature descriptions — ensure no placeholder model names appear in user-facing text. Keep descriptions generic where possible (e.g., "AI image generation" not model-name-specific).
- Update `README.md` only if it references specific model names in a way that's now wrong.

**Acceptance criteria:**

- [ ] SPEC.md model references match real implementation
- [ ] TD-AI-16 and TD-AI-17 marked as resolved
- [ ] No placeholder model names in user-facing plan text
- [ ] `npx tsc --noEmit` passes

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

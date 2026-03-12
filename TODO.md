# Droplet — TODO

> Prioritized, actionable development tasks. Each task max ~30 minutes.
> Governed by **Droplet-PM**. Do not add tasks without PM approval.
> Ref: `SPEC.md` for full specification. `AGENTS.md` for coding rules. `DONE.md` for completed phases.
> Implementation agent: **Codex Agent** (Senior Developer).
>
> **STATUS: Pre-Phase 26 — comprehensive verification and E2E expansion before deferred features.**
> All milestones 0–8 implementation complete. Phases 1–25.5.1 complete (see DONE.md).

---

## Phase 25.5: Comprehensive E2E Test Expansion — CURRENT PRIORITY

> Expand E2E test coverage to verify all routes and features before deferred feature work.
> Ref: ThePlan.md Milestone 9 (Launch Readiness). AGENTS.md testing rules.
> Depends on: Phase 25.4 (complete). Phase 25.5.1 complete (see DONE.md).

---

### 25.5.1 E2E: Public page rendering and inter-page navigation — COMPLETE

Moved to `DONE.md`. 70 E2E tests added (133 total). All acceptance criteria met.

---

### 25.5.2 E2E: Auth boundary enforcement

**File (new):** `tests/e2e/auth-boundaries.spec.ts`

**What to do:**

- Test that unauthenticated users visiting `/app`, `/app/profile`, `/app/plans`, `/app/library` are redirected to sign-in.
- Test that unauthenticated users visiting `/admin`, `/admin/users`, `/admin/settings` are redirected to sign-in.
- Test that authenticated non-admin users visiting `/admin(.*)` are blocked (403 or redirect).
- Verify public pages remain accessible without auth.

**Acceptance criteria:**

- [ ] 4+ protected `/app` routes tested for auth redirect
- [ ] 3+ protected `/admin` routes tested for auth redirect
- [ ] Non-admin access to `/admin` tested for rejection
- [ ] Public pages confirmed accessible without auth
- [ ] All E2E tests pass

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

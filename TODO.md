# Droplet — TODO

> Prioritized, actionable development tasks. Each task max ~30 minutes.
> Governed by **Droplet-PM**. Do not add tasks without PM approval.
> Ref: `SPEC.md` for full specification. `AGENTS.md` for coding rules. `DONE.md` for completed phases.
> Implementation agent: **Droplet-Engineer** (Senior Developer).
>
> **STATUS: Phases 1–25.7 + 27.1–27.3 + 27.6 complete.**
> **PM deep audit #6 (2026-03-14): Three-agent independent audit. All critical bugs RESOLVED. 3 HIGH + 1 MEDIUM new findings added (27.8–27.10). 27.6 verified complete.**
> **Priority order: 27.8 (webhook sanitization) → 27.9 (Stripe video reset) → 27.10 (usage event logging) → 27.7 (profile) → 27.4 (admin forms) → 27.5 (settings propagation) → Phase 26.**
> **All Phase 26+ deferred work is ON HOLD until Phase 27 (all subtasks 27.4–27.10) is PM-approved complete.**

---

## Phase 27: UX, Security & Architecture Completion

> **Blocking all other work.** New HIGH-priority security fixes from PM audit #6, plus remaining medium-priority UX items.
> 27.1–27.3 resolved (archived in DONE.md). 27.6 verified complete (archived in DONE.md).
> Depends on: Phase 25.7 + 27.1–27.3 + 27.6 complete (verified).

---

### 27.8 HIGH — Sanitize Clerk webhook response bodies

**Files:** `src/app/api/webhooks/clerk/route.tsx`, `tests/unit/clerk-webhook-route.test.ts`
**Ref:** TD-SEC-04

**What to do:**

1. `user.created` handler (L289): replace `{ message: "OK", user: syncedUser }` with `{ message: "OK" }`.
2. `user.updated` handler (L344, L347): replace `{ message: "OK", user: null }` and `{ message: "OK", user: updatedUser }` with `{ message: "OK" }`.
3. `user.deleted` handler (L399-403): replace the JSON body that returns `deletedUser`, `deletedTransactions`, `deletedTasks`, `deletedObjectsCount` with `{ message: "OK" }`. Log deletion counts server-side via `process.stderr.write()`.
4. Update unit tests to assert only `{ message: "OK" }` in response bodies (no user data assertions).

**Why:** AGENTS.md rule: "generic messages to clients; detailed logs server-side only." Clerk stores webhook response bodies. Current responses leak user documents (email, plan data, clerkId) and internal deletion counts.

**Acceptance criteria:**

- [ ] All three Clerk webhook handlers return `{ message: "OK" }` only
- [ ] Deletion counts logged server-side via `process.stderr.write()`
- [ ] No user data, no deletion counts, no internal schema in any webhook response
- [ ] Unit tests updated to assert generic responses
- [ ] `npx tsc --noEmit` passes
- [ ] All tests pass

---

### 27.9 HIGH — Add videoGenerations reset to Stripe webhook

**Files:** `src/app/api/webhooks/stripe/route.tsx`, `tests/unit/stripe-webhook-route.test.ts`
**Ref:** TD-BILL-03

**What to do:**

1. In the `checkout.session.completed` handler, add `videoGenerations: 0` to the plan data object (alongside existing `imageGenerations: 0`, `audioGenerations: 0`).
2. Update unit test to assert `videoGenerations: 0` in the plan update.

**Why:** Video generation limits exist in `PLAN_LIMITS` (Lite: 1, Pro: 10, Premium: 10) and `videoGenerations` field exists in User model. On plan upgrade, image and audio counters reset but video does not. When video generation ships, upgraded users would carry stale video counts.

**Acceptance criteria:**

- [ ] Stripe webhook plan update includes `videoGenerations: 0`
- [ ] Unit test asserts video counter reset
- [ ] `npx tsc --noEmit` passes
- [ ] All tests pass

---

### 27.10 MEDIUM — Add failure logging to usage event emission

**Files:** `src/lib/utils/usage-event-utils.ts`
**Ref:** TD-OBS-01

**What to do:**

1. Replace `.catch(() => {})` on the `UsageEvent.create()` call with `.catch((err) => { process.stderr.write(`[UsageEvent] Failed to emit usage event: ${err instanceof Error ? err.message : "unknown"}\n`); })`.
2. Fire-and-forget pattern preserved — still non-blocking. Only adding observability.

**Why:** Current silent catch means if MongoDB rejects usage event writes (schema validation, connection issue, disk full), there is zero observability. Admin analytics become silently incomplete with no way to detect the gap.

**Acceptance criteria:**

- [ ] `.catch()` handler logs error message via `process.stderr.write()`
- [ ] Still fire-and-forget (non-blocking)
- [ ] `npx tsc --noEmit` passes
- [ ] All tests pass

---

### 27.7 User profile — add edit capabilities and account deletion

**Files:** `src/app/(chat)/app/profile/page.tsx`, `src/components/sections/profile-hero.tsx`, `src/lib/actions/user.actions.tsx`
**Ref:** TD-UI-15, TD-ACT-02

**What to do:**

1. Add edit form to profile page for: first name, last name, email address, avatar image.
   - First/last name: text input fields with save button.
   - Email: text input (note: may also need Clerk update — verify sync requirement).
   - Avatar: file upload via `/api/upload` with preview, store URL in `User.userimg`.
2. Wire edit form to existing `updateUser()` server action (already exists, not wired to UI).
3. Add "Delete My Account" button with confirmation dialog.
4. Implement comprehensive account self-deletion:
   - Delete all user Tasks (conversations)
   - Delete all user Transactions
   - Delete all S3 assets under user prefix (`deleteS3Prefix`)
   - Delete MongoDB User record
   - Sign out from Clerk (`clerk.signOut()` client-side after server deletion)
5. Update `deleteUser()` action to handle full cleanup (currently only deletes MongoDB User).

**Acceptance criteria:**

- [ ] User can edit first name, last name on profile page
- [ ] User can edit email (with Clerk sync if required)
- [ ] User can upload/change avatar image
- [ ] User can delete their own account with confirmation
- [ ] Account deletion removes: User, Tasks, Transactions, S3 assets
- [ ] After deletion, user is signed out and redirected to homepage
- [ ] Owner-only access enforced — user can only edit/delete their own profile
- [ ] `npx tsc --noEmit` passes
- [ ] All tests pass

---

### 27.4 Admin settings page — replace editors with proper form controls

**Files:** `src/app/(admin)/admin/settings/page.tsx`, potentially new client components
**Ref:** TD-ADMIN-01

**What to do:**

1. Replace the JSON textarea editors with proper form controls:
   - **AI Models**: dropdown selectors for model-per-plan (Lite chat, Pro chat, Premium chat, image, audio)
   - **Pricing**: number input fields for Pro price and Premium price
   - **Limits**: number input fields for each limit (conversations/day, prompts/conversation, image gens, audio gens) per plan
   - **Theme**: radio buttons or toggle for dark/light default mode
2. Keep the same `updateAdminSettingAction` backend — structure the form data to match expected JSON schema.
3. Settings page must read current values from `AppSetting` collection on load (already does via `getAdminSettingsSnapshot()`).

**Acceptance criteria:**

- [ ] No JSON textareas on settings page — proper input fields, selectors, radios
- [ ] Each setting category uses appropriate form control type
- [ ] Form submits to existing `updateAdminSettingAction`
- [ ] Current saved values pre-populate form controls on load
- [ ] Admin audit trail preserved
- [ ] `npx tsc --noEmit` passes
- [ ] All tests pass

---

### 27.5 Admin settings — propagate pricing & limits to plan cards

**Files:** `src/constants/plans.tsx`, `src/lib/utils/resolve-entitlements.tsx`, `src/lib/utils/check-usage-limit.ts`, `src/lib/utils/admin-queries.ts`, plan card components
**Ref:** TD-ADMIN-02
**Depends on:** 27.4 complete (settings must be usable before they're consumed)

**What to do:**

1. Create a server-side utility (e.g., `getEffectivePlanConfig()`) that reads `AppSetting` values for pricing and limits, falling back to hardcoded `PLAN_LIMITS` defaults when no setting exists.
2. Wire plan card components (`/plans` public page and `/app/plans` authenticated page) to use effective config instead of static constants.
3. Wire entitlement resolver and usage limit checks to use effective config for limit values.
4. Ensure admin changes to pricing/limits take effect on next page load — no restart required.
5. Add cache-control / `revalidatePath` so changes propagate without stale data.

**Acceptance criteria:**

- [ ] Plan cards on `/plans` and `/app/plans` show prices from AppSetting (or defaults)
- [ ] Entitlement resolver uses limits from AppSetting (or defaults)
- [ ] Usage limit checks use limits from AppSetting (or defaults)
- [ ] Admin saves new price → plan cards reflect it on next load
- [ ] Admin saves new limit → limits enforce on next request
- [ ] Fallback to hardcoded defaults when AppSetting is empty
- [ ] `npx tsc --noEmit` passes
- [ ] All tests pass

---

## Phase 26: Deferred Features — ON HOLD

> **ON HOLD until Phase 27 (all subtasks 27.4–27.7) is PM-approved complete.**
> Lower priority items deferred from v1 core.
> Depends on: Phase 27 complete.

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
> HF-1 through HF-9.2 complete. Phases 1–25.7 + 27.1–27.3 complete.
> Phase 10–12 superseded (see DONE.md for mapping).

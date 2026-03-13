# Droplet — TODO

> Prioritized, actionable development tasks. Each task max ~30 minutes.
> Governed by **Droplet-PM**. Do not add tasks without PM approval.
> Ref: `SPEC.md` for full specification. `AGENTS.md` for coding rules. `DONE.md` for completed phases.
> Implementation agent: **Droplet-Engineer** (Senior Developer).
>
> **STATUS: HF-8.2 and HF-9 are the remaining pre-25.7 fixes.**
> All milestones 0–8 complete. HF-1 through HF-8.1 complete. Phase 25.6 complete (see DONE.md).
> Phases 1–25.6 complete (see DONE.md).
> Two issues discovered during PM deep audit (2026-03-13): HF-8.2 (eventType leak), HF-9 (chat-input error leak).
> Both issues re-confirmed by Droplet-Architect audit (2026-03-13) with exact line numbers and reproduction steps.
> Priority order: HF-8.2 → HF-9 → Phase 25.7 → Phase 26.
> **All non-fix work is ON HOLD until HF-8.2 and HF-9 are resolved.**

---

## HF-8.2: HIGH — Stripe Webhook Leaks Event Type Name in Unhandled Response

> Discovered during PM deep audit (2026-03-13).
> HF-8.1 sanitized all error responses but missed the unhandled-event fallback at the end of the handler.
> The response includes `STRIPE: Unhandled event type: ${eventType}` — leaks internal Stripe event type names.
> While the consumer is Stripe (not a browser), this violates AGENTS.md: "generic messages to clients; detailed logs server-side only."
> Ref: AGENTS.md Security Rules. SPEC.md Section 10.

---

### HF-8.2 Fix unhandled event type leak in Stripe webhook

**File:** `src/app/api/webhooks/stripe/route.tsx`

**What to do:**

1. Replace the unhandled event response message from `` `STRIPE: Unhandled event type: ${eventType}` `` to a generic `"Unhandled event"`.
2. Log the actual event type server-side via `logStripeWebhookError()` before returning the generic response.
3. Keep HTTP status code as 200.

**Acceptance criteria:**

- [ ] Unhandled event response body does not contain the event type name
- [ ] Event type logged server-side via `logStripeWebhookError()`
- [ ] HTTP status code remains 200
- [ ] Existing Stripe webhook unit tests updated if they assert on this message
- [ ] `npx tsc --noEmit` passes
- [ ] All tests pass

---

## HF-9: MEDIUM — Chat Input Leaks Upload Error Details to Client

> Discovered during PM deep audit (2026-03-13).
> File upload errors in `chat-input.tsx` expose `error.message` to the client UI.
> This can leak AWS error details, network error strings, or validation internals.
> Ref: AGENTS.md Security Rules: "Return generic error messages to UI."

---

### HF-9.1 Sanitize upload error message in chat-input

**File:** `src/components/chat/chat-input.tsx`

**What to do:**

1. Replace the upload error handler that conditionally uses `error.message` with a fixed generic message.
2. Change: `error instanceof Error ? error.message : "Failed to upload the selected file."` → always use `"Failed to upload file. Please try again."`

**Acceptance criteria:**

- [ ] Upload error message is always a generic string (no `error.message` exposed)
- [ ] Upload still functions correctly for valid files
- [ ] `npx tsc --noEmit` passes
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

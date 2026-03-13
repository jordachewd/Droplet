# Droplet — TODO

> Prioritized, actionable development tasks. Each task max ~30 minutes.
> Governed by **Droplet-PM**. Do not add tasks without PM approval.
> Ref: `SPEC.md` for full specification. `AGENTS.md` for coding rules. `DONE.md` for completed phases.
> Implementation agent: **Droplet-Engineer** (Senior Developer).
>
> **STATUS: HF-8.2, HF-9.1, HF-9.2 COMPLETE (verified by PM + Architect, 2026-03-13).**
> All milestones 0–8 complete. HF-1 through HF-9.2 complete. Phases 1–25.6 complete (see DONE.md).
> **Current focus: Phase 25.7 — Operational Verification & Cleanup.**
> Phase 25.7 is the last gate before Phase 26 (deferred features).
> **Priority order: 25.7.2 → 25.7.3 → 25.7.4 → Phase 26.**
> 25.7.1 is effectively complete (PM ran full 6-gate validation, Gates A–F evaluated — see notes below).
> **Two flaky E2E tests must be stabilized before Phase 26 can begin.** (See 25.7.4.)

---

## Phase 25.7: Operational Verification & Cleanup

> Final verification before Phase 26.
> Ref: ThePlan.md Release Gates A–F.
> Depends on: Phase 25.6.

---

### 25.7.1 Verify all release gates and run full validation — PM VERIFIED

> **PM Verification (2026-03-13):**
> Gates 1–4 (prettier, lint, tsc, test) and Gate 6 (build): PASS.
> Gate 5 (E2E): 183 passed, 2 flaky failures (admin-features CMS timing, chat-app-shell Mobile Chrome viewport), 8 skipped.
> Gate A (Contract): PASS with caveat — billing semantics finalization tied to deferred Phase 26.2 (subscriptions).
> Gate B (Architecture): PASS.
> Gate C (Product): PASS.
> Gate D (Admin): PASS.
> Gate E (Public): PASS.
> Gate F (Validation): CONDITIONAL PASS — 2 flaky E2E tests need stabilization (tracked as 25.7.4).
> **No critical blockers remain. Flaky E2E stabilization is the only remaining pre-Phase-26 requirement.**

**Status: EFFECTIVELY COMPLETE** — moved to DONE.md upon formal close.

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

### 25.7.4 Stabilize flaky E2E tests

> Added by PM (2026-03-13). Two flaky E2E tests must be stabilized before Phase 26.
> These failures are intermittent and not caused by product bugs — they are test infrastructure issues.

**What to do:**

1. **admin-features.spec.ts** (chromium): CMS page creation assertion times out. The test creates a page via admin and immediately checks for the slug in the page list. Fix: add explicit wait for the page list to refresh after creation, or increase locator timeout, or re-fetch the page after the admin action.
2. **chat-app-shell.spec.ts** (Mobile Chrome): sidebar link click fails because element is "outside of the viewport" even after `scrollIntoViewIfNeeded()`. Fix: force scroll the sidebar container, or use `force: true` on click, or adjust the mobile viewport to ensure sidebar links are reachable.

**Acceptance criteria:**

- [ ] `admin-features.spec.ts` website editor test passes reliably across 3 consecutive runs
- [ ] `chat-app-shell.spec.ts` sidebar navigation passes on Mobile Chrome across 3 consecutive runs
- [ ] Full E2E suite: 0 failures across full run
- [ ] No test behavior changes (only reliability fixes)

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
> HF-1 through HF-9.2 complete. Phases 1–25.6 complete. Phase 25.7.1 PM-verified.
> Phase 10–12 superseded (see DONE.md for mapping).

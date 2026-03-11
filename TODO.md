# Droplet — TODO

> Prioritized, actionable development tasks. Each task max ~30 minutes.
> Governed by **Droplet-PM**. Do not add tasks without PM approval.
> Ref: `SPEC.md` for full specification. `AGENTS.md` for coding rules. `DONE.md` for completed phases.
> Implementation agent: **Codex Agent** (Senior Developer).

---

## Phase 20: Error Handling, File Cleanup & Webhook Hardening — CURRENT PRIORITY

> Fix error handling, S3 lifecycle gaps, inline base64, audit gaps, and Clerk webhook deficiencies.
> Ref: TD-API-06, TD-FILE-01, TD-FILE-02, TD-ACT-01, TD-WEBHOOK-02
> Tasks 20.2, 20.3, 20.7 completed in Phase 19 delivery — see DONE.md.

---

### 20.1 Refactor handleError to preserve stack traces

**File:** `src/lib/utils/handleError.tsx`
**Ref:** TD-API-06

**What to do:**

- Use `new Error(message, { cause: error })` pattern to preserve original stack trace.
- Keep the `source` annotation for debugging context.

**Acceptance criteria:**

- [ ] Original error preserved as `cause` on thrown error
- [ ] Source string still in error message
- [ ] Stack trace accessible via `error.cause`
- [ ] `npx tsc --noEmit` passes
- [ ] All existing tests pass

---

### 20.4 Add S3 cleanup on task deletion

**File:** `src/lib/actions/task.actions.tsx`
**Ref:** TD-FILE-01

**What to do:**

- In `deleteTask`, scan task messages for S3 image URLs before deletion.
- Delete matching S3 objects via `deleteFileFromAWS`.
- Wrap in try/catch — log errors but do not fail deletion.

**Acceptance criteria:**

- [ ] Task messages scanned for S3 URLs before deletion
- [ ] S3 objects deleted for matching URLs
- [ ] Task deletion succeeds even if S3 cleanup fails
- [ ] `npx tsc --noEmit` passes

---

### 20.5 Refactor chat input to upload via /api/upload — AGENTS.md VIOLATION FIX

**File:** `src/components/chat/chat-input.tsx`
**Ref:** TD-FILE-02

**What to do:**

- Upload files via `/api/upload` FormData before building message content.
- Replace inline base64 URLs with S3 URLs in message content.
- Handle upload failure gracefully.
- **This is the only remaining AGENTS.md rule violation** (no binary/base64 in MongoDB).

**Acceptance criteria:**

- [ ] All file attachments go through `/api/upload`
- [ ] No base64 in message content sent to `/api/openai`
- [ ] Upload failures prevent message send with user feedback
- [ ] `npx tsc --noEmit` passes

---

### 20.6 Audit or remove `deleteAllTransactions` action

**Files:** `src/lib/actions/transaction.action.tsx`
**Ref:** TD-ACT-01

**What to do:**

- Evaluate whether `deleteAllTransactions` is needed. If yes: add admin role check, `AdminAuditLog` entry, require confirmation parameter. If no: delete the function and any references.
- No unaudited bulk deletion path may exist.

**Acceptance criteria:**

- [ ] Action either removed or protected with admin role check + audit log
- [ ] No unaudited bulk deletion path exists
- [ ] `npx tsc --noEmit` passes

---

### 20.8 Add idempotency check to Clerk webhook handlers

**File:** `src/app/api/webhooks/clerk/route.tsx`
**Ref:** TD-WEBHOOK-02

**What to do:**

- For `user.created`: Before creating a User document, check if a User with that `clerkId` already exists. If yes, skip creation (Clerk may replay events). Without this, event replay will cause HTTP 500 due to `unique` constraint violation.
- For `user.updated` and `user.deleted`: These are naturally idempotent (update/delete operations), but ensure they do not throw on missing documents.
- The Stripe webhook already has idempotency via `Transaction.stripeId` check — follow the same pattern.

**Acceptance criteria:**

- [ ] Duplicate `user.created` events do not throw or create duplicate Users
- [ ] `user.updated` on non-existent user does not throw
- [ ] `user.deleted` on non-existent user does not throw
- [ ] `npx tsc --noEmit` passes
- [ ] `npm run test` passes

---

### 20.9 Remove yearly billing UI toggle

**Files:** `src/components/sections/plans-section.tsx`, `src/components/shared/plan-card.tsx`
**Ref:** ThePlan.md — yearly billing deferred from v1

**What to do:**

- Remove the monthly/yearly toggle from the plans UI.
- Remove yearly pricing display and any yearly billing constants.
- Keep only monthly pricing as the single billing option.
- This aligns with ThePlan.md which explicitly defers yearly billing from v1.

**Acceptance criteria:**

- [ ] No monthly/yearly toggle visible on plans page
- [ ] Only monthly pricing displayed
- [ ] No yearly billing constants or logic remain in plans UI
- [ ] `npx tsc --noEmit` passes
- [ ] `npm run build` passes

---

### 20.10 Extract SUPPORT_EMAIL to shared constant

**Files:** `src/app/api/openai/route.tsx`, `src/components/chat/chat-body.tsx`, new `src/constants/support.ts`

**What to do:**

- Create a `SUPPORT_EMAIL` constant in `src/constants/support.ts`.
- Replace the duplicated `SUPPORT_EMAIL` strings in `route.tsx` and `chat-body.tsx` with the shared import.

**Acceptance criteria:**

- [ ] Single source of truth for support email
- [ ] Both files import from shared constant
- [ ] `npx tsc --noEmit` passes

---

### 20.11 Clean up orphan directories

**Files:** `src/app/(chat)/dashboard/`, `src/app/(public)/pricing/`

**What to do:**

- Remove empty orphan directories left over from Phase 17 route restructure.
- Verify no imports or references point to these paths.

**Acceptance criteria:**

- [ ] Orphan directories removed
- [ ] No broken imports
- [ ] `npm run build` passes

---

## Phase 21: Prompt Improvement

> Improve and adapt prompts per persona and per model.
> Ref: TD-AI-09

---

### 21.1 Create prompt versioning and management system

**Files (new):** `src/constants/persona-prompts.ts`
**Ref:** TD-AI-09

**What to do:**

- Create a prompt configuration file that defines system prompts per persona, per model family.
- Structure: `{ [personaId]: { [modelFamily]: { systemPrompt, temperature, maxTokens } } }`.
- Current `systemPrompt` field on persona objects becomes the default/fallback.
- Add prompt version identifier.

**Acceptance criteria:**

- [ ] Prompt configuration file created
- [ ] Prompts organized by persona and model family
- [ ] Version identifier present
- [ ] `npx tsc --noEmit` passes

---

### 21.2 Improve persona-specific prompts

**Files:** `src/constants/assistant-personas.tsx` and/or the new prompt config
**Ref:** TD-AI-09

**What to do:**

- Review and improve each persona's system prompt for:
  - Distinct personality and tone
  - Clear domain expertise boundaries
  - Safety constraints (especially companion personas: boyfriend, girlfriend, best-friend)
  - Answer formatting preferences
  - Model-aware instructions (simpler prompts for cheaper models, richer for premium)

**Acceptance criteria:**

- [ ] All 9 personas have improved, distinct prompts
- [ ] Safety constraints defined for companion personas
- [ ] Prompts vary by model tier where appropriate
- [ ] `npx tsc --noEmit` passes

---

## Phase 22: Testing & Hardening

---

### 22.1 Add test coverage configuration

**File:** `vitest.config.mts`, `package.json`

**What to do:**

- Add `coverage` config with `v8` provider and 70/60/70/70 thresholds.
- Add `test:coverage` script.

**Acceptance criteria:**

- [ ] Coverage config in Vitest config
- [ ] `npm run test:coverage` works
- [ ] All existing tests pass

---

### 22.2 Add unit tests for updated entitlements

**File (new):** `tests/unit/resolve-entitlements.test.ts`

**What to do:**

- Test all plans return all 9 persona IDs.
- Test Lite has audio generation enabled.
- Test fallback behavior for `resolvePersonaForPlan`.

**Acceptance criteria:**

- [ ] Tests verify all plans allow all 9 personas
- [ ] Tests verify Lite audio generation enabled
- [ ] All tests pass

---

### 22.3 Add unit tests for chat-body stop-state rendering

**File (new):** `tests/unit/chat-body.test.tsx`

**What to do:**

- Test `ChatBodyEndNotice` renders correct stop reason titles for each reason code.
- Test action links point to correct routes (`/app/new`, `/app/plans`, `mailto:`).
- Test amber visual styling applied for ended conversations.
- Test `billing_state_invalid` stop reason rendering.

**Acceptance criteria:**

- [ ] Tests cover all stop reason titles
- [ ] Tests verify action link routes
- [ ] Tests verify visual distinction
- [ ] All tests pass

---

### 22.4 Implement retry/backoff for OpenAI failures

**Files:** `src/lib/utils/openai/generateResponse.tsx`
**Ref:** TD-AI-06

**What to do:**

- Add exponential backoff for transient OpenAI errors (429, 500, 502, 503).
- Max 3 retries with increasing delay.
- Log retries server-side (NOT `console.error`).

**Acceptance criteria:**

- [ ] Transient errors trigger retry with backoff
- [ ] Max 3 retries
- [ ] Non-retryable errors fail immediately
- [ ] `npx tsc --noEmit` passes

---

### 22.5 Expand streaming test coverage

**File:** `tests/unit/generate-streaming-response.test.ts`

**What to do:**

- Current test file has only 1 test case. The streaming helper is a critical path.
- Add tests for: error path (OpenAI failure during stream), tool call handling after stream, abort signal propagation, empty response handling.

**Acceptance criteria:**

- [ ] Error path tested (OpenAI API error during stream)
- [ ] Tool call routing tested after stream completion
- [ ] Abort signal test (request cancelled mid-stream)
- [ ] Empty/null response handled
- [ ] All tests pass

---

## Phase 23: Resilience & Deferred Items

> Lower priority. Not blocking v1 launch but important for production hardening.

- [ ] **23.1** Replace in-memory rate limiter with persistent store — Ref: TD-API-01
- [ ] **23.2** Implement Stripe subscription mode (auto-renewal) — Ref: TD-PLAN-01
- [ ] **23.3** Add video generation support for Premium — Ref: TD-AI-08
- [ ] **23.4** Verify all admin server actions emit audit log entries
- [ ] **23.5** Add `X-Accel-Buffering: no` to streaming response headers for reverse proxy compatibility

---

> **Completed phases** are archived in [`DONE.md`](DONE.md).
> Phases 1–9, 13–19 are complete. Phase 10–12 superseded (see DONE.md for mapping).

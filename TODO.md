# Cellesseon — TODO

> Prioritized, actionable development tasks. Each task is sized for 15-30 minutes.
> Governed by **CellesseonPM2**. Do not add tasks without PM approval.
> Ref: `SPEC.md` for full specification. `AGENTS.md` for coding rules.
> Implementation agent: **Codex Agent** (Senior Developer).

---

## Phase 1: Security & Data Integrity Fixes — COMPLETED

All Phase 1 tasks verified and merged.

- [x] **1.1** Fix `strict: false` in `updateUser` server action
- [x] **1.2** Fix `strict: false` in Clerk webhook `user.updated` handler
- [x] **1.3** Fix `strict: false` in Stripe webhook `User.findOneAndUpdate`
- [x] **1.4** Add missing index on `Task.userId`
- [x] **1.5** Add missing index on `Transaction.clerkId`
- [x] **1.6** Add missing index on `Transaction.userId`
- [x] **1.7** Add file ownership validation to `/api/aws` DELETE
- [x] **1.8** Add payload size validation to `/api/aws` POST
- [x] **1.9** Make `createUser` a non-exported helper

**Validation:** lint ✓ | tsc ✓ | 24 suites, 107 tests ✓

---

## Phase 2: Security Fixes (Ownership Enforcement) — NEXT PRIORITY

These are active security issues. Must be fixed before any feature work.

---

### 2.1 Fix `getUserById` ownership enforcement

**File:** `src/lib/actions/user.actions.tsx`
**Ref:** SEC-01

The `getUserById` function accepts any `userId` parameter but only checks that the caller is authenticated — it does not verify the caller owns the requested resource.

**What to do:**
- Compare `authedUserId` against the `userId` parameter
- If they do not match, throw `"Forbidden"`

**Acceptance Criteria:**
- [ ] `getUserById` returns data only when `authedUserId === userId`
- [ ] Returns `"Forbidden"` error when a user tries to read another user's data
- [ ] Existing unit tests (if any) updated to cover this check
- [ ] Add unit test: authenticated user reading own data succeeds
- [ ] Add unit test: authenticated user reading another user's data fails
- [ ] TypeScript compiles with no errors (`npx tsc --noEmit`)
- [ ] All existing tests pass (`npm run test`)

---

### 2.2 Fix `getAllTransactions` ownership enforcement

**File:** `src/lib/actions/transaction.action.tsx`
**Ref:** SEC-02

The `getAllTransactions` function accepts any `userId` string but does not verify the caller is requesting their own transactions.

**What to do:**
- Compare `authedUserId` against the `userId` parameter
- If they do not match, throw `"Forbidden"`

**Acceptance Criteria:**
- [ ] `getAllTransactions` returns data only when `authedUserId === userId`
- [ ] Throws `"Forbidden"` for cross-user access attempts
- [ ] Add unit test: user can read own transactions
- [ ] Add unit test: user cannot read another user's transactions
- [ ] TypeScript compiles with no errors
- [ ] All existing tests pass

---

### 2.3 Remove `console.log` from `generateImage`

**File:** `src/lib/utils/openai/generateImage.tsx`
**Ref:** TD-API-05

**What to do:**
- Remove `console.log` on line 50 (imageUrl logging)
- Remove `console.log` on line 58 (taskId logging)
- The `console.log` inside the commented-out block (line 72) stays commented — it will be removed when the block is removed
- Keep `console.error` for actual errors

**Acceptance Criteria:**
- [ ] No `console.log` calls in active code
- [ ] `console.error` for errors remains untouched
- [ ] TypeScript compiles with no errors
- [ ] All existing tests pass

---

### 2.4 Remove `console.log` from `generateAudio`

**File:** `src/lib/utils/openai/generateAudio.tsx`
**Ref:** TD-API-05

**What to do:**
- Remove `console.log` on line 35 (taskId logging)
- Keep `console.error` for actual errors

**Acceptance Criteria:**
- [ ] No `console.log` calls in the file
- [ ] TypeScript compiles with no errors
- [ ] All existing tests pass

---

### 2.5 Remove `console.log` from `/api/openai` route

**File:** `src/app/api/openai/route.tsx`
**Ref:** SEC-03

**What to do:**
- Remove `console.log("Generated Task Data:", taskData.content)` on line 108
- Keep `console.error` for the catch block

**Acceptance Criteria:**
- [ ] No `console.log` in the file
- [ ] TypeScript compiles with no errors
- [ ] All existing tests pass

---

## Phase 3: Core Feature Gaps

These tasks complete missing functionality that users expect.

---

### 3.1 Create `deleteTask` server action

**File:** `src/lib/actions/task.actions.tsx`

Create a server action that deletes a task by ID, verifying the authenticated user owns it.

**What to do:**
- Add `deleteTask(taskId: string)` exported function with `"use server"` (already at top of file)
- Call `auth()` and verify `userId` exists
- Call `connectToDatabase()`
- Use `Task.findOneAndDelete({ _id: taskId, userId })` to enforce ownership
- Return serialized success/failure response

**Acceptance Criteria:**
- [ ] Auth check before DB access
- [ ] Filters by both `_id` and `userId`
- [ ] Returns success response when task found and deleted
- [ ] Returns error response when task not found or user does not own it
- [ ] Add unit test in `tests/unit/task-actions.test.ts`: owner can delete their task
- [ ] Add unit test: non-owner cannot delete
- [ ] Add unit test: unauthenticated user cannot delete
- [ ] TypeScript compiles with no errors
- [ ] All existing tests pass

---

### 3.2 Extract `mapDateToLabel` to shared utility

**File (new):** `src/lib/utils/map-date-to-label.ts`
**Files to update:** `src/components/chat/chat-sidebar.tsx`, `src/app/(chat)/app/library/page.tsx`
**Ref:** TD-UI-05

The `mapDateToLabel` function is duplicated in two files. Extract it.

**What to do:**
- Create `src/lib/utils/map-date-to-label.ts` with the function (use `.ts` extension — no JSX)
- Import it in both `chat-sidebar.tsx` and `library/page.tsx`
- Remove the local copies from both files

**Acceptance Criteria:**
- [ ] Single source of truth for `mapDateToLabel`
- [ ] Both files import from `@/lib/utils/map-date-to-label`
- [ ] No duplicate function definitions remain
- [ ] Add unit test in `tests/unit/map-date-to-label.test.ts` covering: < 60 min, < 24 hours, >= 24 hours
- [ ] TypeScript compiles with no errors
- [ ] All existing tests pass

---

### 3.3 Fix `generateImage` to persist images to S3

**File:** `src/lib/utils/openai/generateImage.tsx`
**Ref:** TD-API-03

Generated images use temporary OpenAI URLs that expire. They must be persisted to S3.

**What to do:**
- After `convertToPng`, call `uploadFileToAWS` directly (import from `@/lib/utils/aws/uploadFileToAWS`)
- Use the S3 URL in the returned `taskData` instead of the OpenAI URL
- Remove all commented-out axios code and its import comment
- File naming: `${taskId}_image_${generateString()}.png`
- Folder: `${userId}/images` — note: `userId` is not currently passed to `generateImage`. Add it as a required parameter.
- Update the caller in `generateResponse.tsx` to pass `userId`
- Update the caller in `/api/openai/route.tsx` to pass `userId` through to `generateResponse`

**Acceptance Criteria:**
- [ ] `generateImage` accepts `userId` parameter
- [ ] Generated image uploaded to S3 via `uploadFileToAWS`
- [ ] S3 URL stored in `taskData.content[].image_url.url` instead of temporary OpenAI URL
- [ ] All commented-out axios code removed
- [ ] `generateResponse` passes `userId` to `generateImage`
- [ ] `/api/openai` passes `userId` to `generateResponse`
- [ ] TypeScript compiles with no errors
- [ ] All existing tests pass

---

### 3.4 Add `error.tsx` for app-level error handling

**File (new):** `src/app/error.tsx`
**Ref:** TD-UI-04

**What to do:**
- Create a `"use client"` component
- Show generic error message ("Something went wrong") with a "Try again" button
- Call Next.js `reset()` on retry
- Do not leak error details to the user
- Give the component a `ErrorPage` CSS class

**Acceptance Criteria:**
- [ ] `"use client"` directive at top
- [ ] Accepts `error` and `reset` props (Next.js convention)
- [ ] Shows generic error message
- [ ] "Try again" button calls `reset()`
- [ ] Does not display `error.message` or stack trace
- [ ] Has unique CSS class `ErrorPage`
- [ ] TypeScript compiles with no errors

---

### 3.5 Create `.env.local.example` file

**File (new):** `.env.local.example`

**What to do:**
- List all required environment variables from SPEC.md section 13
- Use placeholder values (e.g., `your_mongodb_url_here`)
- Add comments grouping variables by service
- Do NOT include any actual secrets

**Acceptance Criteria:**
- [ ] All 15 env vars from SPEC.md section 13 listed
- [ ] No real secrets or API keys
- [ ] Grouped with comments (MongoDB, Clerk, OpenAI, Stripe, AWS, App)
- [ ] File committed to repository

---

## Phase 4: Plan Enforcement (Usage Limits)

These tasks make billing claims enforceable. Critical for product integrity.

---

### 4.1 Add usage tracking fields to User plan schema

**File:** `src/lib/database/models/user.model.tsx`
**Type file:** `src/types/PlanData.d.tsx`
**Ref:** TD-PLAN-02

**What to do:**
- Add `imageGenerations: { type: Number, default: 0 }` to plan subdoc
- Add `audioGenerations: { type: Number, default: 0 }` to plan subdoc
- Add `usagePeriodStart: { type: Date, default: Date.now }` to plan subdoc
- Update `PlanData` type in `src/types/PlanData.d.tsx` to include these fields
- Update `IUser` interface to match

**Acceptance Criteria:**
- [ ] Plan subdoc includes `imageGenerations` (Number, default 0)
- [ ] Plan subdoc includes `audioGenerations` (Number, default 0)
- [ ] Plan subdoc includes `usagePeriodStart` (Date, default Date.now)
- [ ] `PlanData` type updated with optional fields (backward-compatible)
- [ ] TypeScript compiles with no errors
- [ ] All existing tests pass

---

### 4.2 Define plan limits constant

**File:** `src/constants/plans.tsx`
**Ref:** TD-PLAN-02

**What to do:**
- Add exported `PLAN_LIMITS` constant mapping plan names to their generation limits
- Lite: 3 images, 0 audio
- Pro: 20 images, 20 audio
- Premium: -1 (unlimited) images, -1 (unlimited) audio
- Add TypeScript type for the constant

**Acceptance Criteria:**
- [ ] `PLAN_LIMITS` constant exported with correct values
- [ ] Typed with `Record<PlanName, { images: number; audio: number }>`
- [ ] -1 means unlimited
- [ ] Unit test in `tests/unit/plans.test.ts` verifying limit values
- [ ] TypeScript compiles with no errors
- [ ] All existing tests pass

---

### 4.3 Create usage limit check utility

**File (new):** `src/lib/utils/check-usage-limit.ts`
**Ref:** TD-PLAN-02
**Depends on:** 4.1, 4.2

**What to do:**
- Create a pure function `checkUsageLimit({ planName, currentCount, limitType })` that returns `{ allowed: boolean; limit: number; remaining: number }`
- Import `PLAN_LIMITS` from constants
- Handle unlimited (-1) case
- Handle period reset logic: if `usagePeriodStart` is older than 30 days, usage should be considered reset

**Acceptance Criteria:**
- [ ] Returns `{ allowed: true }` when under limit
- [ ] Returns `{ allowed: false }` when at or over limit
- [ ] Returns `{ allowed: true }` for unlimited plans (-1)
- [ ] Unit test: Lite plan at limit returns false
- [ ] Unit test: Pro plan under limit returns true
- [ ] Unit test: Premium plan always returns true
- [ ] TypeScript compiles with no errors

---

### 4.4 Enforce image generation limit in `/api/openai` route

**File:** `src/app/api/openai/route.tsx`
**Ref:** TD-PLAN-02
**Depends on:** 4.1, 4.2, 4.3

**What to do:**
- After successful image generation in `generateResponse`, increment `plan.imageGenerations` via `User.findOneAndUpdate` with `$inc` and `strict: true`
- Before image generation, check current usage via `checkUsageLimit`
- If limit exceeded, return the entitlement-blocked response (already exists in generateResponse for disabled capabilities)
- Pass the usage check result through entitlements

**Acceptance Criteria:**
- [ ] Image generation checked against plan limit before OpenAI call
- [ ] Counter incremented after successful generation
- [ ] Returns 403 with descriptive message when limit exceeded
- [ ] Uses `strict: true` on `findOneAndUpdate`
- [ ] Unit test: generation blocked when at limit
- [ ] TypeScript compiles with no errors
- [ ] All existing tests pass

---

### 4.5 Enforce audio generation limit in `/api/openai` route

**File:** `src/app/api/openai/route.tsx`
**Ref:** TD-PLAN-02
**Depends on:** 4.1, 4.2, 4.3, 4.4

Same as 4.4 but for audio generation and `plan.audioGenerations` counter.

**Acceptance Criteria:**
- [ ] Audio generation checked against plan limit before OpenAI call
- [ ] Counter incremented after successful generation
- [ ] Returns 403 with descriptive message when limit exceeded
- [ ] Unit test: generation blocked when at limit
- [ ] TypeScript compiles with no errors
- [ ] All existing tests pass

---

### 4.6 Reset usage counters on plan renewal

**File:** `src/app/api/webhooks/stripe/route.tsx`
**Ref:** TD-PLAN-02
**Depends on:** 4.1

**What to do:**
- When updating user plan on `checkout.session.completed`, also reset `plan.imageGenerations` to 0, `plan.audioGenerations` to 0, and set `plan.usagePeriodStart` to `new Date()`

**Acceptance Criteria:**
- [ ] Counters reset to 0 on successful checkout
- [ ] `usagePeriodStart` set to current date
- [ ] Existing Stripe webhook tests updated
- [ ] TypeScript compiles with no errors
- [ ] All existing tests pass

---

## Phase 5: Error Handling & Resilience

---

### 5.1 Add OpenAI error classification to `generateResponse`

**File:** `src/lib/utils/openai/generateResponse.tsx`
**Ref:** TD-AI-02

**What to do:**
- Import `APIError` from `openai`
- Catch `APIError` specifically in the catch block
- Return structured error types: `rate_limit` (429), `timeout` (408/504), `service_error` (500/502/503), `unknown`
- Export a type for the error classification
- Let the caller (`/api/openai` route) map these to HTTP status codes

**Acceptance Criteria:**
- [ ] Catches `APIError` and inspects `status` property
- [ ] Returns distinguishable error type string
- [ ] `/api/openai` route maps error types to appropriate HTTP status codes (429, 504, 502)
- [ ] Does not leak OpenAI error details to client
- [ ] Unit test: mock APIError with status 429 returns rate_limit type
- [ ] TypeScript compiles with no errors
- [ ] All existing tests pass

---

### 5.2 Add `error.tsx` for chat route group

**File (new):** `src/app/(chat)/error.tsx`

Same pattern as 3.4 but scoped to the chat route group. This catches errors within the `/app` section specifically.

**Acceptance Criteria:**
- [ ] `"use client"` directive
- [ ] Generic error message with "Try again" button
- [ ] Calls `reset()` on retry
- [ ] Does not leak error details
- [ ] Has unique CSS class `ChatErrorPage`
- [ ] TypeScript compiles with no errors

---

## Phase 6: Testing Improvements

---

### 6.1 Add unit tests for `generateResponse` (happy path)

**File (new):** `tests/unit/generate-response.test.ts`

**What to do:**
- Mock `openAiClient.chat.completions.create`
- Test text response path (no tool call)
- Assert returned JSON has `taskData` and `taskUsage`

**Acceptance Criteria:**
- [ ] Mock OpenAI client
- [ ] Test text response path returns correct structure
- [ ] Assert `taskData.content[0].text` contains response text
- [ ] Assert `taskUsage` is a number
- [ ] Test passes

---

### 6.2 Add unit tests for `generateResponse` (tool call paths)

**File:** `tests/unit/generate-response.test.ts`
**Depends on:** 6.1

**What to do:**
- Mock tool call response for `getGeneratedImage`
- Mock tool call response for `getGeneratedAudio`
- Test that correct function is dispatched
- Test entitlement-blocked response when capability is disabled

**Acceptance Criteria:**
- [ ] Mock tool call for image generation
- [ ] Mock tool call for audio generation
- [ ] Assert entitlement-blocked message when capability disabled
- [ ] Tests pass

---

### 6.3 Add unit tests for `generateTitle`

**File (new):** `tests/unit/generate-title.test.ts`

**Acceptance Criteria:**
- [ ] Mock `openAiClient.chat.completions.create`
- [ ] Test that title and usage are returned
- [ ] Test error case when API returns empty choices
- [ ] Tests pass

---

### 6.4 Add unit test for `deleteTask` server action

**File:** `tests/unit/task-actions.test.ts`
**Depends on:** 3.1

**Acceptance Criteria:**
- [ ] Mock auth and database
- [ ] Test owner can delete their task
- [ ] Test non-owner cannot delete
- [ ] Test unauthenticated user cannot delete
- [ ] Tests pass

---

### 6.5 Add unit test for `getUserById` ownership check

**File (new):** `tests/unit/user-actions.test.ts`
**Depends on:** 2.1

**Acceptance Criteria:**
- [ ] Mock auth and database
- [ ] Test user can read own data
- [ ] Test user cannot read another user's data
- [ ] Test unauthenticated user gets error
- [ ] Tests pass

---

## Phase 7: Production Readiness (Deferred)

These tasks are important but should be tackled after Phases 2-6 are complete.
They are ordered by impact.

- [ ] **7.1** Add `.lean()` and `.select()` to `getUserById` query — fetch only needed fields
- [ ] **7.2** Add `.lean()` to `getAllTransactions` query
- [ ] **7.3** Implement response streaming for OpenAI chat — Ref: TD-AI-01
- [ ] **7.4** Replace in-memory rate limiter with persistent store (Redis/Upstash) — Ref: TD-API-01
- [ ] **7.5** Add S3 cleanup on user deletion in Clerk webhook — Ref: TD-FILE-01
- [ ] **7.6** Add S3 cleanup on task deletion — Ref: TD-FILE-01
- [ ] **7.7** Define yearly billing pricing discount — Ref: TD-PLAN-03
- [ ] **7.8** Add test coverage configuration
- [ ] **7.9** Add loading skeletons for page transitions — Ref: TD-UI-02
- [ ] **7.10** Implement retry/backoff for transient OpenAI failures — Ref: TD-AI-06
- [ ] **7.11** Implement Stripe subscription mode (auto-renewal) — Ref: TD-PLAN-01
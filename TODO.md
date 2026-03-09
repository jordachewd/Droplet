# Cellesseon — TODO

> Prioritized, actionable development tasks. Each task is sized for 15-30 minutes.
> Governed by **CellesseonPM2**. Do not add tasks without PM approval.
> Ref: `SPEC.md` for full specification and technical debt identifiers.

---

## Phase 1: Security & Data Integrity Fixes — COMPLETED

All Phase 1 tasks verified and merged.

- [x] **1.1** Fix `strict: false` in `updateUser` server action — `strict: true`, `upsert: false`, serialized 404 path
- [x] **1.2** Fix `strict: false` in Clerk webhook `user.updated` handler — `strict: true`, `upsert: false`, 404 response
- [x] **1.3** Fix `strict: false` in Stripe webhook `User.findOneAndUpdate` — `strict: true`
- [x] **1.4** Add missing index on `Task.userId`
- [x] **1.5** Add missing index on `Transaction.clerkId`
- [x] **1.6** Add missing index on `Transaction.userId`
- [x] **1.7** Add file ownership validation to `/api/aws` DELETE — 403 on cross-user folder
- [x] **1.8** Add payload size validation to `/api/aws` POST — 10 MB decoded limit
- [x] **1.9** Make `createUser` a non-exported helper — moved to `createUserFromWebhook` in Clerk webhook file

**Validation:** lint ✓ | tsc ✓ | 24 suites, 106 tests ✓

---

## Phase 2: Core Feature Gaps (Next Priority)

These tasks complete missing functionality users would expect. Implement in order.

---

### 2.1 Create `getUserTasks` server action

**File:** `src/lib/actions/task.actions.tsx`
**Ref:** TD-DB-06, TD-UI-01

Create a server action that retrieves a paginated list of the authenticated user's tasks (id, title, updatedAt only — no messages).

**Acceptance Criteria:**
- [ ] Auth check before DB access
- [ ] Returns `{ _id, title, updatedAt }` fields only (projection)
- [ ] Sorted by `updatedAt` descending
- [ ] Returns serialized result via `serializeForClient`
- [ ] Unit test covering authenticated + unauthenticated paths
- [ ] TypeScript compiles with no errors

---

### 2.2 Create `getTaskById` server action

**File:** `src/lib/actions/task.actions.tsx`
**Ref:** TD-DB-06, TD-UI-01
**Depends on:** 2.1

Create a server action that retrieves a single task by ID, verifying the authenticated user owns it.

**Acceptance Criteria:**
- [ ] Auth check before DB access
- [ ] Filters by both `_id` and `userId` to enforce ownership
- [ ] Returns serialized task document
- [ ] Returns null/error if task not found or user does not own it
- [ ] Unit test
- [ ] TypeScript compiles with no errors

---

### 2.3 Create `deleteTask` server action

**File:** `src/lib/actions/task.actions.tsx`
**Depends on:** 2.1

Create a server action that deletes a task by ID, verifying ownership.

**Acceptance Criteria:**
- [ ] Auth check before DB access
- [ ] Filters by both `_id` and `userId`
- [ ] Returns success/failure response
- [ ] Unit test
- [ ] TypeScript compiles with no errors

---

### 2.4 Add conversation history list to ChatSidebar

**File:** `src/components/chat/chat-sidebar.tsx`
**Ref:** TD-UI-01
**Depends on:** 2.1, 2.5

Replace the static "New Task" link with a dynamic list of previous conversations. Receive task list as a prop from the parent Server Component.

**Acceptance Criteria:**
- [ ] Sidebar displays list of tasks (title + relative date)
- [ ] Each task links to resume that conversation
- [ ] "New Task" button remains at top
- [ ] Empty state shown when no tasks exist
- [ ] Receives `tasks` as a prop (data fetched in parent Server Component)
- [ ] TypeScript compiles with no errors

---

### 2.5 Pass user task list to ChatSidebar from page.tsx

**File:** `src/app/page.tsx`
**Ref:** TD-UI-01
**Depends on:** 2.1

Fetch user tasks server-side using `getUserTasks` and pass them to `ChatSidebar`.

**Acceptance Criteria:**
- [ ] `page.tsx` calls `getUserTasks` for authenticated users
- [ ] Task list passed as prop to `ChatSidebar`
- [ ] TypeScript compiles with no errors

---

### 2.6 Add conversation resume capability to ChatWrapper

**File:** `src/components/chat/chat-wrapper.tsx`
**Ref:** TD-UI-01
**Depends on:** 2.2

Enable `ChatWrapper` to accept an initial task (messages + taskId) and resume an existing conversation.

**Acceptance Criteria:**
- [ ] Accepts optional `initialTask` and `initialTaskId` props
- [ ] When provided, initializes state with existing messages
- [ ] Subsequent messages continue updating the same task
- [ ] TypeScript compiles with no errors

---

## Phase 3: Image Persistence Fix

---

### 3.1 Fix `generateImage` to persist images to S3

**File:** `src/lib/utils/openai/generateImage.tsx`
**Ref:** TD-API-03
**Depends on:** Phase 1 completed

Uncomment and fix the AWS upload code. Replace the axios-based approach with a direct call to `uploadFileToAWS`. Return the S3 URL instead of the temporary OpenAI URL.

**Acceptance Criteria:**
- [ ] Generated images uploaded to S3 via `uploadFileToAWS`
- [ ] S3 URL stored in message content instead of temporary OpenAI URL
- [ ] Remove all commented-out axios code and import
- [ ] TypeScript compiles with no errors

---

### 3.2 Remove `console.log` statements from generateImage and generateAudio

**Files:** `src/lib/utils/openai/generateImage.tsx`, `src/lib/utils/openai/generateAudio.tsx`

**Acceptance Criteria:**
- [ ] All `console.log` calls removed from both files
- [ ] `console.error` for actual errors remains
- [ ] TypeScript compiles with no errors

---

## Phase 4: Plan Enforcement

---

### 4.1 Add usage tracking fields to User plan schema

**File:** `src/lib/database/models/user.model.tsx`
**Ref:** TD-PLAN-02

Add `imageGenerations` and `audioGenerations` counter fields to the plan subdocument. Add `usagePeriodStart` date field.

**Acceptance Criteria:**
- [ ] Plan subdoc includes `imageGenerations: { type: Number, default: 0 }`
- [ ] Plan subdoc includes `audioGenerations: { type: Number, default: 0 }`
- [ ] Plan subdoc includes `usagePeriodStart: { type: Date, default: Date.now }`
- [ ] Update `PlanData` type in `src/types/PlanData.d.tsx`
- [ ] TypeScript compiles with no errors

---

### 4.2 Define plan limits constant

**File:** `src/constants/plans.tsx`
**Ref:** TD-PLAN-02

Add a constant mapping plan names to their resource limits.

**Acceptance Criteria:**
- [ ] `PLAN_LIMITS` constant: `{ Lite: { images: 3, audio: 3 }, Pro: { images: 20, audio: 20 }, Premium: { images: -1, audio: -1 } }`
- [ ] Exported and typed
- [ ] TypeScript compiles with no errors

---

### 4.3 Add plan limit enforcement to `/api/openai` route

**File:** `src/app/api/openai/route.tsx`
**Ref:** TD-PLAN-02
**Depends on:** 4.1, 4.2

Before calling `generateResponse`, check user's plan limits for image/audio generation. After successful generation, increment the counter.

**Acceptance Criteria:**
- [ ] Check user's current usage vs limit before OpenAI call
- [ ] Return 403 with descriptive message if limit exceeded
- [ ] After successful generation, increment counter via `User.findOneAndUpdate` with `strict: true`
- [ ] Counter resets handled based on `usagePeriodStart`
- [ ] Unit test for limit checking logic
- [ ] TypeScript compiles with no errors

---

## Phase 5: Error Handling & Resilience

---

### 5.1 Add OpenAI error classification to `generateResponse`

**File:** `src/lib/utils/openai/generateResponse.tsx`
**Ref:** TD-AI-02

Catch OpenAI-specific errors and return structured error types instead of generic throws.

**Acceptance Criteria:**
- [ ] Catch `OpenAI.APIError` and inspect status code
- [ ] Return distinguishable error types: `rate_limit`, `timeout`, `service_error`, `unknown`
- [ ] `/api/openai` route maps these to appropriate HTTP status codes (429, 504, 502)
- [ ] TypeScript compiles with no errors

---

### 5.2 Add React error boundary component

**File:** `src/components/shared/error-boundary.tsx` (new)
**Ref:** TD-UI-04

**Acceptance Criteria:**
- [ ] Client component using React error boundary pattern
- [ ] Accepts `fallback` prop for custom error UI
- [ ] Default fallback shows "Something went wrong" with retry button
- [ ] Unit test
- [ ] TypeScript compiles with no errors

---

### 5.3 Add Next.js `error.tsx` for app-level error handling

**File:** `src/app/error.tsx` (new)

**Acceptance Criteria:**
- [ ] `"use client"` component
- [ ] Shows generic error message with "Try again" button
- [ ] Calls `reset()` on retry
- [ ] Does not leak error details to the user
- [ ] TypeScript compiles with no errors

---

## Phase 6: Admin Dashboard

---

### 6.1 Create admin `getUsers` server action

**File:** `src/lib/actions/user.actions.tsx`
**Ref:** TD-UI-03

**Acceptance Criteria:**
- [ ] Auth check: verify `userId` exists AND user role is `"admin"`
- [ ] Returns paginated user list (limit/skip)
- [ ] Does not expose sensitive fields (`plan.stripeId` excluded)
- [ ] Unit test
- [ ] TypeScript compiles with no errors

---

### 6.2 Replace admin dashboard placeholder with user list

**File:** `src/app/(admin)/dashboard/page.tsx`
**Ref:** TD-UI-03
**Depends on:** 6.1

**Acceptance Criteria:**
- [ ] Calls `getUsers` server-side
- [ ] Displays user table: username, email, role, plan name, registerAt
- [ ] Server Component (no `"use client"`)
- [ ] Remove all placeholder text
- [ ] TypeScript compiles with no errors

---

## Phase 7: Testing Improvements

---

### 7.1 Add unit tests for `generateResponse` (happy path)

**File:** `tests/unit/generate-response.test.ts` (new)

**Acceptance Criteria:**
- [ ] Mock `openAiClient.chat.completions.create`
- [ ] Test text response path (no tool call)
- [ ] Assert returned JSON has `taskData` and `taskUsage`
- [ ] Test passes

---

### 7.2 Add unit tests for `generateResponse` (tool call paths)

**File:** `tests/unit/generate-response.test.ts`
**Depends on:** 7.1

**Acceptance Criteria:**
- [ ] Mock tool call response for `getGeneratedImage`
- [ ] Mock tool call response for `getGeneratedAudio`
- [ ] Assert correct function is dispatched
- [ ] Tests pass

---

### 7.3 Add unit tests for `generateTitle`

**File:** `tests/unit/generate-title.test.ts` (new)

**Acceptance Criteria:**
- [ ] Mock `openAiClient.chat.completions.create`
- [ ] Test that title and usage are returned
- [ ] Test error case when API returns empty choices
- [ ] Tests pass

---

### 7.4 Add unit test for `getUserTasks` server action

**File:** `tests/unit/task-actions.test.ts`
**Depends on:** 2.1

**Acceptance Criteria:**
- [ ] Mock auth and database
- [ ] Test authenticated user gets their tasks
- [ ] Test unauthenticated user throws
- [ ] Tests pass

---

### 7.5 Add unit test for `deleteTask` server action

**File:** `tests/unit/task-actions.test.ts`
**Depends on:** 2.3

**Acceptance Criteria:**
- [ ] Mock auth and database
- [ ] Test owner can delete their task
- [ ] Test non-owner cannot delete
- [ ] Tests pass

---

## Phase 8: Production Readiness (Deferred)

These tasks are important but should be tackled after Phases 2-7 are complete.

- [ ] **8.1** Add `.env.local.example` file
- [ ] **8.2** Implement response streaming for OpenAI chat — Ref: TD-AI-01
- [ ] **8.3** Replace in-memory rate limiter with persistent store — Ref: TD-API-01
- [ ] **8.4** Add S3 cleanup on user deletion — Ref: TD-FILE-01
- [ ] **8.5** Add S3 cleanup on task deletion — Ref: TD-FILE-01
- [ ] **8.6** Implement Stripe subscription mode — Ref: TD-PLAN-01
- [ ] **8.7** Add test coverage configuration
- [ ] **8.8** Define yearly billing pricing — Ref: TD-PLAN-03

# Cellesseon — TODO

> Prioritized, actionable development tasks. Each task is sized for 15-30 minutes.
> Governed by **CellesseonPM2**. Do not add tasks without PM approval.
> Ref: `SPEC.md` for full specification. `AGENTS.md` for coding rules.
> Implementation agent: **Codex Agent** (Senior Developer).

---

## Phase 7: Production Readiness — NEXT PRIORITY

Critical product quality and performance improvements for v1 launch readiness.

---

### 7.1 Add `.lean()` and `.select()` to `getUserById` query

**File:** `src/lib/actions/user.actions.tsx`
**Ref:** AGENTS.md Database Rules

The `getUserById` function fetches full Mongoose documents. Add `.lean()` and `.select()` to fetch only needed fields and avoid document overhead.

**What to do:**

- Change `User.findOne({ clerkId: userId })` to `User.findOne({ clerkId: userId }).select('clerkId username email role plan firstName lastName userimg').lean()`
- Update the return to pass the lean result through `serializeForClient`

**Acceptance Criteria:**

- [ ] Query uses `.lean()` to return plain objects
- [ ] Query uses `.select()` to fetch only needed fields
- [ ] Existing functionality unchanged (returns same shape of data)
- [ ] TypeScript compiles with no errors (`npx tsc --noEmit`)
- [ ] All existing tests pass (`npm run test`)

---

### 7.2 Add `.lean()` to `getAllTransactions` query

**File:** `src/lib/actions/transaction.action.tsx`
**Ref:** AGENTS.md Database Rules

**What to do:**

- Add `.lean()` to the `Transaction.find()` chain
- Result already goes through `serializeForClient` so no other change needed

**Acceptance Criteria:**

- [ ] Query uses `.lean()` to return plain objects
- [ ] Existing functionality unchanged
- [ ] TypeScript compiles with no errors
- [ ] All existing tests pass

---

### 7.3 Add conversation delete button to chat sidebar

**File:** `src/components/chat/chat-sidebar.tsx`
**Ref:** TD-UI-06

The `deleteTask` server action exists and is tested, but there is no UI to trigger it. Add a delete button to each conversation item in the sidebar.

**What to do:**

- Import `deleteTask` from `@/lib/actions/task.actions`
- Add a delete button (trash icon) to each conversation list item
- On click, call `deleteTask(taskId)` and remove the item from the list
- Add a confirmation step (e.g., `window.confirm` or inline confirm UI)
- After successful deletion, if the current conversation was deleted, redirect to `/app`
- This component uses `"use client"` so direct calls to server actions work

**Acceptance Criteria:**

- [ ] Delete button visible on each conversation item in sidebar
- [ ] Confirmation before deletion
- [ ] Calls `deleteTask` with the task ID
- [ ] Removes item from list on success
- [ ] Redirects to `/app` if current conversation was deleted
- [ ] CSS class `SidebarDeleteBtn` on the delete button
- [ ] TypeScript compiles with no errors
- [ ] All existing tests pass

---

### 7.4 Add conversation delete button to library page

**File:** `src/app/(chat)/app/library/page.tsx`
**Ref:** TD-UI-06

Same concept as 7.3 but for the library page conversation list.

**What to do:**

- The library page is a Server Component — create a small `"use client"` wrapper component for the delete button
- Or: refactor the list item to include a client component for the delete action
- Import `deleteTask` from `@/lib/actions/task.actions`
- Add delete button per conversation item
- After deletion, use `revalidatePath` or `router.refresh()` to update the list

**Acceptance Criteria:**

- [ ] Delete button visible on each conversation item in library
- [ ] Confirmation before deletion
- [ ] Calls `deleteTask` with the task ID
- [ ] List updates after successful deletion
- [ ] CSS class `LibraryDeleteBtn` on the delete button
- [ ] TypeScript compiles with no errors
- [ ] All existing tests pass

---

### 7.5 Refactor `handleError` to preserve stack traces

**File:** `src/lib/utils/handleError.tsx`
**Ref:** TD-API-06

The current `handleError` concatenates error messages with source strings via `+`, destroying stack traces.

**What to do:**

- When `error` is an `Error` instance, create a new `Error` with the composed message but copy `error.cause` or set `{ cause: error }` to preserve the original
- Use `new Error(message, { cause: error })` pattern
- Keep the `source` annotation for debugging context

**Acceptance Criteria:**

- [ ] Original error is preserved as `cause` on the thrown error
- [ ] Source string still present in thrown error message
- [ ] Stack trace from original error accessible via `error.cause`
- [ ] TypeScript compiles with no errors
- [ ] All existing tests pass

---

### 7.6 Add S3 cleanup on user deletion in Clerk webhook

**File:** `src/app/api/webhooks/clerk/route.tsx`
**Ref:** TD-FILE-01

When a user is deleted, their S3 objects remain orphaned.

**What to do:**

- In the `user.deleted` handler, after deleting the user from MongoDB, list and delete all S3 objects under the `{clerkId}/` prefix
- Import `DeleteObjectsCommand` and `ListObjectsV2Command` from `@aws-sdk/client-s3`
- Import the S3 client from `@/constants/aws`
- Delete objects in batches (S3 allows up to 1000 per DeleteObjects call)
- Log errors but do not fail the webhook response — S3 cleanup is best-effort

**Acceptance Criteria:**

- [ ] S3 objects under `{clerkId}/` prefix are deleted on user deletion
- [ ] Uses batch deletion (ListObjectsV2 + DeleteObjects)
- [ ] Errors logged but do not fail the webhook response
- [ ] TypeScript compiles with no errors
- [ ] All existing tests pass

---

### 7.7 Add S3 cleanup on task deletion

**File:** `src/lib/actions/task.actions.tsx`
**Ref:** TD-FILE-01

When a task is deleted, associated S3 objects (images) remain orphaned.

**What to do:**

- In `deleteTask`, before or after deleting the task from MongoDB, scan the task's messages for `image_url` entries containing S3 URLs
- For each S3 URL, extract the key and delete via `deleteFileFromAWS`
- Log errors but do not fail the deletion — task removal takes priority over S3 cleanup
- The task must be fetched first (before deletion) to access its messages

**Acceptance Criteria:**

- [ ] Task messages scanned for S3 image URLs before/during deletion
- [ ] S3 objects deleted for matching URLs
- [ ] Task deletion succeeds even if S3 cleanup fails
- [ ] Errors logged but do not prevent task deletion
- [ ] TypeScript compiles with no errors
- [ ] All existing tests pass

---

### 7.8 Add `.lean()` and `.select()` to dashboard queries

**File:** `src/app/(chat)/dashboard/page.tsx`

The dashboard uses `countDocuments` (which is fine) but if future queries are added they should follow the `.lean()` / `.select()` convention.

**What to do:**

- Verify existing `countDocuments` calls are optimal (they are — no change needed)
- Add a comment noting that any future queries in this file must use `.lean()` + `.select()`
- No code change required unless queries beyond `countDocuments` exist

**Acceptance Criteria:**

- [ ] Existing queries verified as optimal
- [ ] No unnecessary changes
- [ ] TypeScript compiles with no errors

---

### 7.9 Add loading skeleton for chat layout

**File (new):** `src/app/(chat)/loading.tsx`
**Ref:** TD-UI-02

**What to do:**

- Create a `loading.tsx` file for the `(chat)` route group
- Show a simple loading skeleton (pulsing bars/blocks) matching the chat layout shape
- Use Tailwind's `animate-pulse` utility
- CSS class: `ChatLoadingSkeleton`

**Acceptance Criteria:**

- [ ] `loading.tsx` creates a skeleton UI matching chat layout
- [ ] Uses `animate-pulse` for visual loading feedback
- [ ] Has unique CSS class `ChatLoadingSkeleton`
- [ ] TypeScript compiles with no errors

---

### 7.10 Add loading skeleton for account layout

**File (new):** `src/app/(account)/loading.tsx`
**Ref:** TD-UI-02

**What to do:**

- Create a `loading.tsx` file for the `(account)` route group
- Show a simple loading skeleton matching the profile/plans page shape
- CSS class: `AccountLoadingSkeleton`

**Acceptance Criteria:**

- [ ] `loading.tsx` creates a skeleton UI
- [ ] Uses `animate-pulse` for visual loading feedback
- [ ] Has unique CSS class `AccountLoadingSkeleton`
- [ ] TypeScript compiles with no errors

---

### 7.11 Add test coverage configuration

**File:** `vitest.config.ts` (or `vitest.config.mts`)

**What to do:**

- Add `coverage` configuration to the Vitest config
- Set provider to `v8`
- Set threshold targets: statements 70%, branches 60%, functions 70%, lines 70%
- Exclude test files, config files, and type declaration files from coverage
- Add `test:coverage` script to `package.json`

**Acceptance Criteria:**

- [ ] Coverage config added to Vitest config
- [ ] `npm run test:coverage` script works
- [ ] Coverage report generated
- [ ] TypeScript compiles with no errors
- [ ] All existing tests pass

---

## Phase 8: Resilience & Cost Controls (Deferred)

Lower priority items for post-launch hardening. Not blocking v1.

- [ ] **8.1** Implement retry/backoff for transient OpenAI failures — Ref: TD-AI-06
- [ ] **8.2** Replace in-memory rate limiter with persistent store (Redis/Upstash) — Ref: TD-API-01
- [ ] **8.3** Define yearly billing pricing discount — Ref: TD-PLAN-03
- [ ] **8.4** Implement response streaming for OpenAI chat — Ref: TD-AI-01
- [ ] **8.5** Implement Stripe subscription mode (auto-renewal) — Ref: TD-PLAN-01
- [ ] **8.6** Add per-user token/cost tracking — Ref: TD-AI-03

---

## Completed Phases

### Phase 1: Security & Data Integrity Fixes — COMPLETED

- [x] **1.1** Fix `strict: false` in `updateUser` server action
- [x] **1.2** Fix `strict: false` in Clerk webhook `user.updated` handler
- [x] **1.3** Fix `strict: false` in Stripe webhook `User.findOneAndUpdate`
- [x] **1.4** Add missing index on `Task.userId`
- [x] **1.5** Add missing index on `Transaction.clerkId`
- [x] **1.6** Add missing index on `Transaction.userId`
- [x] **1.7** Add file ownership validation to `/api/aws` DELETE
- [x] **1.8** Add payload size validation to `/api/aws` POST
- [x] **1.9** Make `createUser` a non-exported helper

### Phase 2: Security Fixes (Ownership Enforcement) — COMPLETED

- [x] **2.1** Fix `getUserById` ownership enforcement
- [x] **2.2** Fix `getAllTransactions` ownership enforcement
- [x] **2.3** Remove `console.log` from `generateImage`
- [x] **2.4** Remove `console.log` from `generateAudio`
- [x] **2.5** Remove `console.log` from `/api/openai` route

### Phase 3: Core Feature Gaps — COMPLETED

- [x] **3.1** Create `deleteTask` server action
- [x] **3.2** Extract `mapDateToLabel` to shared utility
- [x] **3.3** Fix `generateImage` to persist images to S3
- [x] **3.4** Add `error.tsx` for app-level error handling
- [x] **3.5** Create `.env.local.example` file

### Phase 4: Plan Enforcement (Usage Limits) — COMPLETED

- [x] **4.1** Add usage tracking fields to User plan schema
- [x] **4.2** Define plan limits constant
- [x] **4.3** Create usage limit check utility
- [x] **4.4** Enforce image generation limit in `/api/openai` route
- [x] **4.5** Enforce audio generation limit in `/api/openai` route
- [x] **4.6** Reset usage counters on plan renewal

### Phase 5: Error Handling & Resilience — COMPLETED

- [x] **5.1** Add OpenAI error classification to `generateResponse`
- [x] **5.2** Add `error.tsx` for chat route group

### Phase 6: Testing Improvements — COMPLETED

- [x] **6.1** Add unit tests for `generateResponse` (happy path)
- [x] **6.2** Add unit tests for `generateResponse` (tool call paths)
- [x] **6.3** Add unit tests for `generateTitle`
- [x] **6.4** Add unit test for `deleteTask` server action
- [x] **6.5** Add unit test for `getUserById` ownership check

**Validation at Phase 6 completion:** lint pass | tsc pass | 31 suites, 139 tests pass

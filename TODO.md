# Cellesseon — TODO

> Prioritized, actionable development tasks. Each task is sized for 15–20 minutes.
> Governed by **CellesseonPM2**. Do not add tasks without PM approval.
> Ref: `SPEC.md` for full specification. `AGENTS.md` for coding rules.
> Implementation agent: **Codex Agent** (Senior Developer).

---

## Phase 9: Production UX Polish — CURRENT PRIORITY

---

## Phase 9: Production UX Polish

Conversation delete UI and loading feedback.

---

### 9.1 Add conversation delete button to chat sidebar

**File:** `src/components/chat/sidebar/chat-sidebar-shell.tsx` (or appropriate sidebar client component)
**Ref:** TD-UI-06

**What to do:**

- Add a delete button (trash icon) to each conversation list item
- On click, call `deleteTask(taskId)` and remove the item from the list
- Add a confirmation step (e.g., `window.confirm`)
- After successful deletion, if the current conversation was deleted, redirect to `/app`

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

### 9.2 Add conversation delete button to library page

**File:** `src/app/(chat)/app/library/page.tsx`
**Ref:** TD-UI-06

**What to do:**

- Create a small `"use client"` wrapper component for the delete button (library page is Server Component)
- Import `deleteTask` from `@/lib/actions/task.actions`
- Add delete button per conversation item
- After deletion, use `revalidatePath` or `router.refresh()` to update the list

**Acceptance Criteria:**

- [ ] Delete button visible on each conversation item in library
- [ ] Confirmation before deletion
- [ ] List updates after successful deletion
- [ ] CSS class `LibraryDeleteBtn` on the delete button
- [ ] TypeScript compiles with no errors
- [ ] All existing tests pass

---

### 9.3 Add loading skeleton for chat layout

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

### 9.4 Add loading skeleton for account layout

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

## Phase 10: Error Handling & File Cleanup

---

### 10.1 Refactor `handleError` to preserve stack traces

**File:** `src/lib/utils/handleError.tsx`
**Ref:** TD-API-06

**What to do:**

- When `error` is an `Error` instance, create a new `Error` with the composed message but set `{ cause: error }` to preserve the original
- Use `new Error(message, { cause: error })` pattern
- Keep the `source` annotation for debugging context

**Acceptance Criteria:**

- [ ] Original error is preserved as `cause` on the thrown error
- [ ] Source string still present in thrown error message
- [ ] Stack trace from original error accessible via `error.cause`
- [ ] TypeScript compiles with no errors
- [ ] All existing tests pass

---

### 10.2 Add S3 cleanup on user deletion in Clerk webhook

**File:** `src/app/api/webhooks/clerk/route.tsx`
**Ref:** TD-FILE-01

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

### 10.3 Add S3 cleanup on task deletion

**File:** `src/lib/actions/task.actions.tsx`
**Ref:** TD-FILE-01

**What to do:**

- In `deleteTask`, before or after deleting the task from MongoDB, scan the task's messages for `image_url` entries containing S3 URLs
- For each S3 URL, extract the key and delete via `deleteFileFromAWS`
- Log errors but do not fail the deletion — task removal takes priority
- The task must be fetched first (before deletion) to access its messages

**Acceptance Criteria:**

- [ ] Task messages scanned for S3 image URLs before/during deletion
- [ ] S3 objects deleted for matching URLs
- [ ] Task deletion succeeds even if S3 cleanup fails
- [ ] TypeScript compiles with no errors
- [ ] All existing tests pass

---

### 10.4 Refactor chat input to use `/api/upload` instead of inline base64

**File:** `src/components/chat/chat-input.tsx`
**Ref:** TD-FILE-02

**What to do:**

- Identify any code paths where files are sent as base64 directly in the message body instead of going through `/api/upload`
- Refactor those paths to upload via `/api/upload` first, then include the returned S3 URL in the message
- Keep the existing `/api/upload` validation (type + size allowlists) as the single entry point for file handling

**Acceptance Criteria:**

- [ ] All file attachments go through `/api/upload` before being sent in messages
- [ ] No base64 file data is embedded directly in message content for upload flows
- [ ] Existing file type and size validations still apply
- [ ] TypeScript compiles with no errors (`npx tsc --noEmit`)
- [ ] All existing tests pass (`npm run test`)

---

## Phase 11: Testing Improvements

---

### 11.1 Add test coverage configuration

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

### 11.2 Add unit tests for persona entitlement resolution

**File (new):** `tests/unit/resolve-entitlements.test.ts`

**What to do:**

- Test `resolveEntitlements()` returns correct `allowedPersonaIds` for each plan
- Test Lite excludes companion personas (boyfriend, girlfriend)
- Test Pro/Premium includes all 9 personas
- Test `resolvePersonaForPlan()` falls back correctly when persona is not in allowed list

**Acceptance Criteria:**

- [ ] Tests cover Lite, Pro, Premium entitlement shapes
- [ ] Tests verify persona ID allowlists
- [ ] Tests verify fallback behavior
- [ ] All tests pass

---

## Phase 12: Resilience & Cost Controls (Deferred)

Lower priority items for post-launch hardening. Not blocking v1.

- [ ] **12.1** Implement retry/backoff for transient OpenAI failures — Ref: TD-AI-06
- [ ] **12.2** Replace in-memory rate limiter with persistent store (Redis/Upstash) — Ref: TD-API-01
- [ ] **12.3** Define yearly billing pricing discount — Ref: TD-PLAN-03
- [ ] **12.4** Implement response streaming for OpenAI chat — Ref: TD-AI-01
- [ ] **12.5** Implement Stripe subscription mode (auto-renewal) — Ref: TD-PLAN-01
- [ ] **12.6** Add per-user token/cost tracking — Ref: TD-AI-03
- [ ] **12.7** Refactor audio storage: upload audio to S3 instead of base64 in Task.messages — Ref: TD-AI-05, TD-DB-07
- [ ] **12.8** Add message count / document size guard for Task messages array — Ref: TD-DB-05

---

## Completed Phases

### Phase 7: Persona Rename — COMPLETED

- [x] **7.1** Rename type file: `AssistantRoleData.d.tsx` → `PersonaData.d.tsx`
- [x] **7.2** Rename constants file: `assistant-roles.tsx` → `assistant-personas.tsx`
- [x] **7.3** Add Wellness and Analyst personas to constants
- [x] **7.4** Update `resolve-entitlements.tsx` for persona rename
- [x] **7.5** Update Task model: `assistantRoleId` → `personaId`
- [x] **7.6** Update `TaskData.d.tsx` types for persona rename
- [x] **7.7** Update `task.actions.tsx` for persona rename
- [x] **7.8** Update `task-queries.tsx` for persona rename
- [x] **7.9** Update `/api/openai/route.tsx` for persona rename
- [x] **7.10** Update `generateResponse.tsx` for persona rename
- [x] **7.11** Update `generateTitle.tsx` for persona rename
- [x] **7.12** Update `ChatWrapper` component for persona rename
- [x] **7.13** Rename `chat-role-picker.tsx` → `chat-persona-picker.tsx`
- [x] **7.14** Rename `roles-section.tsx` → `personas-section.tsx`
- [x] **7.15** Rename `assistant-role-card.tsx` → `persona-card.tsx`
- [x] **7.16** Update `ChatHeader` and `ChatBody` for persona naming
- [x] **7.17** Update `ChatIntro` for persona naming
- [x] **7.18** Rename route directories: `roles` → `personas`
- [x] **7.19** Update `NewConversationPage` for persona naming
- [x] **7.20** Update `ChatSidebar` and `LibraryPage` for persona rename
- [x] **7.21** Update `ChatPage` (app page) for persona rename
- [x] **7.22** Update navigation links site-wide for persona routes
- [x] **7.23** Update all unit tests for persona rename
- [x] **7.24** Update E2E tests for persona rename
- [x] **7.25** Update `AGENTS.md` constants reference
- [x] **7.26** Full validation pass after persona rename

**Validation at Phase 7 completion:** Zero `assistantRoleId` / `AssistantRole` references remain in `src/` or `tests/`. All persona naming active.

### Phase 8: Database Optimization — COMPLETED

- [x] **8.1** Add `.lean()` and `.select()` to `getUserById` query
- [x] **8.2** Add `.lean()` to `getAllTransactions` query
- [x] **8.3** Optimize `task-queries.tsx` with `.lean()` and `.select()` projections
- [x] **8.4** Add index on `Task.personaId` for persona-filtered queries
- [x] **8.5** Review Mongoose connection pooling settings (`maxPoolSize: 10`, `serverSelectionTimeoutMS: 5000`)

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

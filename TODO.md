# Cellesseon — TODO

> Prioritized, actionable development tasks. Each task is sized for 15–20 minutes.
> Governed by **CellesseonPM2**. Do not add tasks without PM approval.
> Ref: `SPEC.md` for full specification. `AGENTS.md` for coding rules.
> Implementation agent: **Codex Agent** (Senior Developer).

---

## Phase 10: Error Handling & File Cleanup — CURRENT PRIORITY

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

- In `deleteTask`, before deleting the task from MongoDB, fetch the task (with its messages) using `Task.findOne({ _id: taskId, userId })`
- Scan the task's messages for any content items with `type: "image_url"` where the URL contains the S3 bucket hostname
- For each matching S3 URL, extract the object key and delete via `deleteFileFromAWS`
- Wrap S3 cleanup in try/catch — log errors but do not fail the deletion
- Then proceed with the existing `Task.findOneAndDelete` call

**Acceptance Criteria:**

- [ ] Task is fetched before deletion to read messages
- [ ] Task messages scanned for content items with S3 image URLs
- [ ] S3 objects deleted for matching URLs via `deleteFileFromAWS`
- [ ] Task deletion succeeds even if S3 cleanup fails (try/catch around S3 ops)
- [ ] TypeScript compiles with no errors (`npx tsc --noEmit`)
- [ ] All existing tests pass (`npm run test`)

---

### 10.4 Refactor chat input to upload files via `/api/upload` instead of inline base64

**File:** `src/components/chat/chat-input.tsx`
**Ref:** TD-FILE-02

**What to do:**

- In `handleSubmit`, when `selectedFile` is present, upload the file via `fetch("/api/upload", ...)` using FormData before building the message content
- Replace the inline base64 `data:image/jpeg;base64,...` URL with the returned S3 URL in the `image_url` content item
- Handle upload failure gracefully — show user feedback and prevent message send if upload fails
- Keep the local preview (`fileUrl` state) as-is — display concern only

**Acceptance Criteria:**

- [ ] All file attachments go through `/api/upload` before being sent in messages
- [ ] No base64 file data is embedded directly in message content sent to `/api/openai`
- [ ] Upload failures prevent message send and show user feedback
- [ ] Existing file type and size validations still apply (enforced by `/api/upload`)
- [ ] TypeScript compiles with no errors (`npx tsc --noEmit`)
- [ ] All existing tests pass (`npm run test`)

---

## Phase 11: Testing Improvements

---

### 11.1 Add test coverage configuration

**File:** `vitest.config.mts`
**File:** `package.json` (add script)

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

- Test `resolveEntitlements()` returns correct `allowedPersonaIds` for each plan (Lite, Pro, Premium)
- Test Lite excludes companion personas (boyfriend, girlfriend)
- Test Pro and Premium include all 9 personas
- Test `resolvePersonaForPlan()` falls back correctly when a persona is not in the allowed list for the given plan
- Test that the default plan resolves to "Lite" when `planName` is `null` or `undefined`

**Acceptance Criteria:**

- [ ] Tests cover Lite, Pro, Premium entitlement shapes
- [ ] Tests verify persona ID allowlists for each plan
- [ ] Tests verify Lite excludes `boyfriend` and `girlfriend`
- [ ] Tests verify fallback behavior for `resolvePersonaForPlan`
- [ ] Tests verify `null`/`undefined` plan defaults to Lite
- [ ] All tests pass (`npm run test`)

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

### Phase 9: Production UX Polish — COMPLETED

- [x] **9.1** Add conversation delete button to chat sidebar — `SidebarDeleteBtn` in `chat-sidebar-nav.tsx`
- [x] **9.2** Add conversation delete button to library page — `LibraryDeleteButton` client component
- [x] **9.3** Add loading skeleton for chat layout — `(chat)/loading.tsx` with `ChatLoadingSkeleton`
- [x] **9.4** Add loading skeleton for account layout — `(account)/loading.tsx` with `AccountLoadingSkeleton`

**PM Decision (Phase 9):** Demo-item delete buttons remain **disabled** (not omitted). Disabled state with tooltip provides clear UX feedback that demo conversations cannot be deleted.

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

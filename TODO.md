# Cellesseon — TODO

> Prioritized, actionable development tasks. Each task is sized for 15–20 minutes.
> Governed by **CellesseonPM2**. Do not add tasks without PM approval.
> Ref: `SPEC.md` for full specification. `AGENTS.md` for coding rules.
> Implementation agent: **Codex Agent** (Senior Developer).

---

## Phase 7: Persona Rename — CURRENT PRIORITY

Rename "role" (referring to AI assistant profiles) to "persona" across the entire codebase.
This is a terminology correction — `User.role` ("client"/"admin") is unaffected.

---

### 7.1 Rename type file: `AssistantRoleData.d.tsx` → `PersonaData.d.tsx`

**File:** `src/types/AssistantRoleData.d.tsx`
**Ref:** TD-RENAME-01, SPEC.md §3

**What to do:**

- Rename the file from `AssistantRoleData.d.tsx` to `PersonaData.d.tsx`
- Rename type `AssistantRoleId` → `PersonaId`; add two new IDs: `"wellness"` and `"analyst"`
- Rename type `AssistantRoleCategory` → `PersonaCategory`; add `"Lifestyle"` to the union
- Rename interface `AssistantRole` → `Persona`
- Change `id: AssistantRoleId` → `id: PersonaId`
- Rename `ConversationListItem.assistantRoleId` → `ConversationListItem.personaId` (type `PersonaId`)
- Do NOT touch anything related to `User.role`

**Acceptance Criteria:**

- [ ] File renamed to `PersonaData.d.tsx`
- [ ] `PersonaId` type includes all 9 IDs: `strategist | teacher | developer | creator | wellness | analyst | best-friend | boyfriend | girlfriend`
- [ ] `PersonaCategory` includes `"Lifestyle"`
- [ ] `Persona` interface replaces `AssistantRole`
- [ ] `ConversationListItem` uses `personaId: PersonaId`
- [ ] TypeScript compiles with no errors (`npx tsc --noEmit`)

---

### 7.2 Rename constants file: `assistant-roles.tsx` → `assistant-personas.tsx`

**File:** `src/constants/assistant-roles.tsx`
**Ref:** TD-RENAME-01, SPEC.md §3

**What to do:**

- Rename file to `src/constants/assistant-personas.tsx`
- Rename `ASSISTANT_ROLES` → `PERSONAS`
- Rename `DEFAULT_ASSISTANT_ROLE_ID` → `DEFAULT_PERSONA_ID`
- Rename `ASSISTANT_ROLE_MAP` → `PERSONA_MAP`
- Rename `getAssistantRole()` → `getPersona()`
- Rename `buildRoleAwareSystemPrompt()` → `buildPersonaAwareSystemPrompt()`
- Rename `DEMO_CONVERSATIONS` items: `assistantRoleId` → `personaId`
- Update all internal type references from `AssistantRole`/`AssistantRoleId` → `Persona`/`PersonaId`
- Import types from new `PersonaData.d.tsx`
- Do NOT add the two new personas yet (separate task)

**Acceptance Criteria:**

- [ ] File renamed to `assistant-personas.tsx`
- [ ] All exports renamed per above
- [ ] Imports reference `@/types/PersonaData.d`
- [ ] TypeScript compiles with no errors
- [ ] All existing tests pass (`npm run test`)

---

### 7.3 Add Wellness and Analyst personas to constants

**File:** `src/constants/assistant-personas.tsx`
**Ref:** SPEC.md §3

**What to do:**

- Add `wellness` persona at index 4 (after `creator`):
  - id: `"wellness"`, label: `"Wellness"`, tagline: `"Mindful routines and stress relief."`, category: `"Lifestyle"`, icon: `"bi bi-flower1"`, supportsImage: false, supportsAudio: true
  - description: focused on mindfulness, stress management, healthy routines, and self-improvement guidance
  - 3 starter prompts about managing stress, building a morning routine, guided breathing exercise
  - systemPrompt: `"You are the Wellness persona in Cellesseon. Focus on mindfulness, healthy habits, stress relief, and practical self-improvement. Be calming, supportive, and evidence-informed. Never provide medical or clinical advice."`
- Add `analyst` persona at index 5 (after `wellness`):
  - id: `"analyst"`, label: `"Analyst"`, tagline: `"Data-driven insight and clarity."`, category: `"Productivity"`, icon: `"bi bi-bar-chart-line"`, supportsImage: true, supportsAudio: false
  - description: focused on data interpretation, report writing, market research, and critical thinking
  - 3 starter prompts about analyzing a dataset, writing an executive summary, comparing market competitors
  - systemPrompt: `"You are the Analyst persona in Cellesseon. Provide structured, data-driven insights. Use tables, comparisons, and clear reasoning. Prioritize accuracy and actionable conclusions over speculation."`
- Update `DEMO_CONVERSATIONS` to include one demo entry for `wellness` and one for `analyst`

**Acceptance Criteria:**

- [ ] `PERSONAS` array contains 9 entries
- [ ] Wellness and Analyst personas have correct id, category, icon, capabilities
- [ ] `DEMO_CONVERSATIONS` has entries for the new personas
- [ ] TypeScript compiles with no errors
- [ ] All existing tests pass

---

### 7.4 Update `resolve-entitlements.tsx` for persona rename

**File:** `src/lib/utils/resolve-entitlements.tsx`
**Ref:** TD-RENAME-01

**What to do:**

- Update imports to use `PersonaId` from `@/types/PersonaData.d` and `PERSONAS`/`getPersona`/`DEFAULT_PERSONA_ID` from `@/constants/assistant-personas`
- Rename `Entitlements.allowedRoleIds` → `Entitlements.allowedPersonaIds` (type `PersonaId[]`)
- Rename `resolveAssistantRoleForPlan()` → `resolvePersonaForPlan()`
- Update Lite plan `allowedPersonaIds` to include `"wellness"` and `"analyst"` (total 7 non-companion personas)
- Update all internal references

**Acceptance Criteria:**

- [ ] All exports use persona naming
- [ ] Lite plan allows 7 personas (strategist, teacher, developer, creator, wellness, analyst, best-friend)
- [ ] Pro/Premium allows all 9 personas
- [ ] TypeScript compiles with no errors
- [ ] All existing tests pass

---

### 7.5 Update Task model: `assistantRoleId` → `personaId`

**File:** `src/lib/database/models/tasks.model.tsx`
**Ref:** TD-RENAME-01, SPEC.md §6.3

**What to do:**

- Rename field `assistantRoleId` → `personaId` in the Mongoose schema
- Update the index on this field
- Update the default value to `"strategist"`
- Update `ITask` interface accordingly

**Acceptance Criteria:**

- [ ] Schema field is `personaId` with `index: true` and `default: "strategist"`
- [ ] `ITask` interface uses `personaId: string`
- [ ] Compound index `{ userId: 1, updatedAt: -1 }` still exists
- [ ] TypeScript compiles with no errors
- [ ] All existing tests pass

---

### 7.6 Update `TaskData.d.tsx` types for persona rename

**File:** `src/types/TaskData.d.tsx`
**Ref:** TD-RENAME-01

**What to do:**

- Rename `assistantRoleId` → `personaId` in all type interfaces (`CreateTaskInput`, `UpdateTaskParams`, `TaskHistoryItem`, etc.)
- Update any `AssistantRoleId` type references to `PersonaId`

**Acceptance Criteria:**

- [ ] All task-related type interfaces use `personaId`
- [ ] TypeScript compiles with no errors

---

### 7.7 Update `task.actions.tsx` for persona rename

**File:** `src/lib/actions/task.actions.tsx`
**Ref:** TD-RENAME-01

**What to do:**

- Change all `assistantRoleId` references to `personaId` in `createTask` and `updateTask`

**Acceptance Criteria:**

- [ ] `createTask` uses `personaId` (default: `"strategist"`)
- [ ] `updateTask` passes `personaId` through
- [ ] TypeScript compiles with no errors
- [ ] All existing tests pass

---

### 7.8 Update `task-queries.tsx` for persona rename

**File:** `src/lib/utils/task-queries.tsx`
**Ref:** TD-RENAME-01

**What to do:**

- Update all references from `assistantRoleId` → `personaId` in query projections and result mapping

**Acceptance Criteria:**

- [ ] All query helpers use `personaId`
- [ ] TypeScript compiles with no errors
- [ ] All existing tests pass

---

### 7.9 Update `/api/openai/route.tsx` for persona rename

**File:** `src/app/api/openai/route.tsx`
**Ref:** TD-RENAME-01

**What to do:**

- Update imports from `resolve-entitlements` and `assistant-personas`
- Change `assistantRoleId` → `personaId` in request body destructuring, response, and all internal references
- Use `resolvePersonaForPlan` instead of `resolveAssistantRoleForPlan`
- Use `resolveEntitlements` with updated property names
- Use `getPersona` instead of `getAssistantRole`

**Acceptance Criteria:**

- [ ] Request body expects `personaId` instead of `assistantRoleId`
- [ ] Response includes `personaId` instead of `assistantRoleId`
- [ ] All imports use new persona module names
- [ ] TypeScript compiles with no errors
- [ ] All existing tests pass

---

### 7.10 Update `generateResponse.tsx` for persona rename

**File:** `src/lib/utils/openai/generateResponse.tsx`
**Ref:** TD-RENAME-01

**What to do:**

- Change `assistantRoleId` → `personaId` in `GenerateResponseParams` interface
- Update imports to use `getPersona` and `buildPersonaAwareSystemPrompt` from `@/constants/assistant-personas`

**Acceptance Criteria:**

- [ ] `GenerateResponseParams.personaId` replaces `assistantRoleId`
- [ ] Uses `getPersona()` and `buildPersonaAwareSystemPrompt()`
- [ ] TypeScript compiles with no errors
- [ ] All existing tests pass

---

### 7.11 Update `generateTitle.tsx` for persona rename

**File:** `src/lib/utils/openai/generateTitle.tsx`
**Ref:** TD-RENAME-01

**What to do:**

- Rename parameter `assistantRoleId` → `personaId`
- Update import to use `getPersona` from `@/constants/assistant-personas`
- Update context string to use "persona" wording

**Acceptance Criteria:**

- [ ] Function signature uses `personaId`
- [ ] Imports from `assistant-personas`
- [ ] TypeScript compiles with no errors
- [ ] All existing tests pass

---

### 7.12 Update `ChatWrapper` component for persona rename

**File:** `src/components/chat/chat-wrapper.tsx`
**Ref:** TD-RENAME-01

**What to do:**

- Replace `ChatRolePicker` import with `ChatPersonaPicker` (from `chat-persona-picker`)
- Replace `selectedRoleId` → `selectedPersonaId`, `handleSelectRole` → `handleSelectPersona`
- Replace `getAssistantRole` → `getPersona`, `AssistantRoleId` → `PersonaId`
- Update all prop names passed to child components
- Update `assistantRoleLabel` prop name to `personaLabel`

**Acceptance Criteria:**

- [ ] All internal state uses persona naming
- [ ] Imports from `@/constants/assistant-personas` and `@/types/PersonaData.d`
- [ ] Renders `ChatPersonaPicker` instead of `ChatRolePicker`
- [ ] CSS class `ChatWrapper` unchanged
- [ ] TypeScript compiles with no errors

---

### 7.13 Rename `chat-role-picker.tsx` → `chat-persona-picker.tsx`

**File:** `src/components/chat/chat-role-picker.tsx`
**Ref:** TD-RENAME-01

**What to do:**

- Rename file to `chat-persona-picker.tsx`
- Rename component `ChatRolePicker` → `ChatPersonaPicker`
- Rename interface `ChatRolePickerProps` → `ChatPersonaPickerProps`
- Rename prop `selectedRoleId` → `selectedPersonaId`, `onSelectRole` → `onSelectPersona`
- CSS class: `ChatRolePicker` → `ChatPersonaPicker`
- Update imports from `@/constants/assistant-personas` and `@/types/PersonaData.d`
- Replace `ASSISTANT_ROLES` → `PERSONAS`

**Acceptance Criteria:**

- [ ] File renamed, component renamed, CSS class renamed
- [ ] Props use persona naming
- [ ] TypeScript compiles with no errors

---

### 7.14 Rename `roles-section.tsx` → `personas-section.tsx`

**File:** `src/components/sections/roles-section.tsx`
**Ref:** TD-RENAME-01

**What to do:**

- Rename file to `personas-section.tsx`
- Rename component `RolesSection` → `PersonasSection`
- CSS class: `RolesSection` → `PersonasSection`
- Update heading text: `"Assistant Roles"` → `"AI Personas"`, `"Choose Your AI Role"` → `"Choose Your AI Persona"`
- Update subtitle to reference personas instead of roles
- Update imports from `@/constants/assistant-personas`
- Replace `ASSISTANT_ROLES` → `PERSONAS`

**Acceptance Criteria:**

- [ ] File, component, CSS class renamed
- [ ] UI text uses "persona" wording
- [ ] TypeScript compiles with no errors

---

### 7.15 Rename `assistant-role-card.tsx` → `persona-card.tsx`

**File:** `src/components/shared/assistant-role-card.tsx`
**Ref:** TD-RENAME-01

**What to do:**

- Rename file to `persona-card.tsx`
- Rename component `AssistantRoleCard` → `PersonaCard`
- CSS class: `AssistantRoleCard` → `PersonaCard`
- Rename interface prop `role: AssistantRole` → `persona: Persona`
- Update all internal references from `role.` → `persona.`
- Update imports from `@/types/PersonaData.d`

**Acceptance Criteria:**

- [ ] File, component, CSS class, props renamed
- [ ] TypeScript compiles with no errors

---

### 7.16 Update `ChatHeader` and `ChatBody` for persona naming

**Files:** `src/components/chat/chat-header.tsx`, `src/components/chat/chat-body.tsx`
**Ref:** TD-RENAME-01

**What to do:**

- Rename prop `assistantRoleLabel` → `personaLabel` in both components
- Update internal references
- Update fallback text from `"Assistant"` to `"AI"` or keep as `"Assistant"` (unchanged display name is acceptable)

**Acceptance Criteria:**

- [ ] Prop renamed in both components
- [ ] TypeScript compiles with no errors

---

### 7.17 Update `ChatIntro` for persona naming

**File:** `src/components/chat/chat-intro.tsx`
**Ref:** TD-RENAME-01

**What to do:**

- Rename prop `role: AssistantRole` → `persona: Persona` (if applicable)
- Update imports from `@/types/PersonaData.d`
- Update internal references

**Acceptance Criteria:**

- [ ] Props use persona naming
- [ ] TypeScript compiles with no errors

---

### 7.18 Rename route directories: `roles` → `personas`

**Files:** `src/app/(public)/roles/page.tsx`, `src/app/(chat)/app/roles/page.tsx`
**Ref:** TD-RENAME-01

**What to do:**

- Rename `src/app/(public)/roles/` → `src/app/(public)/personas/`
- Rename `src/app/(chat)/app/roles/` → `src/app/(chat)/app/personas/`
- Update imports in both pages from `RolesSection` → `PersonasSection`
- Update component names (`AppRolesPage` → `AppPersonasPage`)

**Acceptance Criteria:**

- [ ] Route `/personas` serves public persona showcase
- [ ] Route `/app/personas` serves in-app persona page
- [ ] Old `/roles` and `/app/roles` no longer exist
- [ ] TypeScript compiles with no errors

---

### 7.19 Update `NewConversationPage` for persona naming

**File:** `src/app/(chat)/app/new/page.tsx`
**Ref:** TD-RENAME-01

**What to do:**

- Update imports from `@/constants/assistant-personas` (`PERSONAS`)
- Update import from `PersonaCard` instead of `AssistantRoleCard`
- Update heading text: `"Pick a demo AI role"` → `"Pick an AI persona"`

**Acceptance Criteria:**

- [ ] Uses `PERSONAS` and `PersonaCard`
- [ ] Heading text updated
- [ ] TypeScript compiles with no errors

---

### 7.20 Update `ChatSidebar` and `LibraryPage` for persona rename

**Files:** `src/components/chat/chat-sidebar.tsx`, `src/app/(chat)/app/library/page.tsx`
**Ref:** TD-RENAME-01

**What to do:**

- Replace `getAssistantRole` → `getPersona`, `DEMO_CONVERSATIONS` import from `@/constants/assistant-personas`
- Replace `assistantRoleId` → `personaId` in mapping logic
- Update `ConversationListItem` import from `@/types/PersonaData.d`

**Acceptance Criteria:**

- [ ] Both files use persona imports
- [ ] Mapping uses `personaId`
- [ ] TypeScript compiles with no errors
- [ ] All existing tests pass

---

### 7.21 Update `ChatPage` (app page) for persona rename

**File:** `src/app/(chat)/app/page.tsx`
**Ref:** TD-RENAME-01

**What to do:**

- Rename `searchParams.role` → `searchParams.persona` (or keep `role` as query param if major breakage; but update prop name `initialRoleId` → `initialPersonaId`)
- Update `ChatWrapper` prop name accordingly

**Acceptance Criteria:**

- [ ] Chat page passes `initialPersonaId` to `ChatWrapper`
- [ ] TypeScript compiles with no errors

---

### 7.22 Update navigation links site-wide for persona routes

**Files:** Multiple — sidebar nav, landing page, header, persona cards
**Ref:** TD-RENAME-01

**What to do:**

- Search for all `href` links pointing to `/roles` or `/app/roles` and update to `/personas` or `/app/personas`
- Search for `?role=` query params in links and update to `?persona=`
- Update sidebar nav labels from "Roles" → "Personas" where applicable

**Acceptance Criteria:**

- [ ] No remaining links to `/roles` or `/app/roles`
- [ ] All persona links use `?persona=` query param
- [ ] TypeScript compiles with no errors

---

### 7.23 Update all unit tests for persona rename

**Files:** `tests/unit/generate-response.test.ts`, `tests/unit/openai-route.test.ts`, `tests/unit/task-actions.test.ts`, `tests/unit/task-queries.test.ts`, and any others referencing `assistantRoleId`
**Ref:** TD-RENAME-01

**What to do:**

- Replace all `assistantRoleId` → `personaId` in test data and assertions
- Update imports from `AssistantRoleId` → `PersonaId`
- Update mock data to reference `@/constants/assistant-personas`
- Ensure test expectations match new response shapes

**Acceptance Criteria:**

- [ ] All unit tests pass (`npm run test`)
- [ ] No remaining references to `assistantRoleId` in test files
- [ ] TypeScript compiles with no errors

---

### 7.24 Update E2E tests for persona rename

**Files:** `tests/e2e/landing-page.spec.ts`, `tests/e2e/authenticated-flows.spec.ts`
**Ref:** TD-RENAME-01

**What to do:**

- Update any selectors or assertions referencing "role" terminology
- Update URL references from `/roles` to `/personas`

**Acceptance Criteria:**

- [ ] E2E tests pass (`npm run test:e2e`)
- [ ] No stale references to old role terminology

---

### 7.25 Update `AGENTS.md` constants reference

**File:** `AGENTS.md`
**Ref:** TD-RENAME-01

**What to do:**

- Update project structure line: `src/constants/` description from `assistant-roles` to `assistant-personas`

**Acceptance Criteria:**

- [ ] `AGENTS.md` references correct file names
- [ ] No stale "assistant-roles" references

---

### 7.26 Full validation pass after persona rename

**What to do:**

- Run all 6 validation gates in order:
  1. `npx prettier . --write`
  2. `npm run lint`
  3. `npx tsc --noEmit`
  4. `npm run test`
  5. `npm run test:e2e`
  6. `npm run build`

**Acceptance Criteria:**

- [ ] All 6 gates pass
- [ ] Zero references to `assistantRoleId` or `AssistantRole` remain in `src/` or `tests/`
- [ ] `User.role` ("client"/"admin") is unchanged everywhere

---

## Phase 8: Database Optimization — NEXT PRIORITY

MongoDB and Mongoose query optimization for efficiency and speed.

---

### 8.1 Add `.lean()` and `.select()` to `getUserById` query

**File:** `src/lib/actions/user.actions.tsx`
**Ref:** TD-DB-08, AGENTS.md Database Rules

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

### 8.2 Add `.lean()` to `getAllTransactions` query

**File:** `src/lib/actions/transaction.action.tsx`
**Ref:** TD-DB-09, AGENTS.md Database Rules

**What to do:**

- Add `.lean()` to the `Transaction.find()` chain
- Result already goes through `serializeForClient` so no other change needed

**Acceptance Criteria:**

- [ ] Query uses `.lean()` to return plain objects
- [ ] Existing functionality unchanged
- [ ] TypeScript compiles with no errors
- [ ] All existing tests pass

---

### 8.3 Optimize `task-queries.tsx` with `.lean()` and `.select()` projections

**File:** `src/lib/utils/task-queries.tsx`
**Ref:** AGENTS.md Database Rules

**What to do:**

- Add `.lean()` to all Task queries (e.g., `getRecentTasksByUserId`, `getTaskById`)
- Add `.select()` projections to history queries to fetch only `_id title personaId updatedAt` (not full messages array)
- For `getTaskById` (conversation resume), keep messages but add `.lean()`

**Acceptance Criteria:**

- [ ] History queries use `.select('_id title personaId updatedAt')` and `.lean()`
- [ ] Full task queries use `.lean()`
- [ ] No unnecessary message arrays loaded for list views
- [ ] TypeScript compiles with no errors
- [ ] All existing tests pass

---

### 8.4 Add index on `Task.personaId` for persona-filtered queries

**File:** `src/lib/database/models/tasks.model.tsx`
**Ref:** AGENTS.md Database Rules

**What to do:**

- Verify index exists on `personaId` field (should already be there from the rename)
- If future queries filter by `personaId` alone (e.g. admin persona usage stats), the single-field index is appropriate
- No action if already indexed — verify and document

**Acceptance Criteria:**

- [ ] `personaId` field has `index: true` in schema
- [ ] TypeScript compiles with no errors

---

### 8.5 Review Mongoose connection pooling settings

**File:** `src/lib/database/mongoose.tsx`
**Ref:** MongoDB best practices

**What to do:**

- Add `maxPoolSize` and `serverSelectionTimeoutMS` to connection options for production readiness
- Set `maxPoolSize: 10` (appropriate for serverless/edge)
- Set `serverSelectionTimeoutMS: 5000` to fail fast on connection issues
- Keep `bufferCommands: false` (already set)

**Acceptance Criteria:**

- [ ] Connection options include `maxPoolSize` and `serverSelectionTimeoutMS`
- [ ] `bufferCommands: false` preserved
- [ ] TypeScript compiles with no errors
- [ ] All existing tests pass

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

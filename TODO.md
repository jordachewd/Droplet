# Cellesseon — TODO

> Prioritized, actionable development tasks. Each task sized for 15–20 minutes.
> Governed by **CellesseonPM2**. Do not add tasks without PM approval.
> Ref: `SPEC.md` for full specification. `AGENTS.md` for coding rules.
> Implementation agent: **Codex Agent** (Senior Developer).

---

## Phase 13: Product Rule Reconciliation — CURRENT PRIORITY

> Fix fundamental conflicts between code and approved product direction.
> These must be completed before ANY other feature work.

---

### 13.1 Remove Lite plan 3-day expiry

**Files:** `src/constants/plans.tsx`, `src/lib/database/models/user.model.tsx`
**Ref:** TD-PLAN-04

**What to do:**

- In `getExpiresOn()`, remove the `case "Lite"` branch that adds 3 days. Lite should return `null` or a far-future date (e.g., year 9999) to indicate no expiry.
- In the Lite plan object, change `desc` from `"Free trial for 3 days"` to `"Free forever"`.
- In the User model, update the `plan.expiresOn` default to match the new Lite behavior (no expiry).
- In `src/app/api/openai/route.tsx`, ensure the plan expiry check skips Lite plans (Lite never expires).

**Acceptance Criteria:**

- [ ] `getExpiresOn("Lite")` returns a value indicating no expiry (null or far-future date)
- [ ] Lite plan description says "Free forever", not "Free trial for 3 days"
- [ ] New users created via Clerk webhook get Lite with no expiry
- [ ] `/api/openai` route does NOT block Lite users for plan expiration
- [ ] TypeScript compiles (`npx tsc --noEmit`)
- [ ] All existing tests pass (`npm run test`)

---

### 13.2 Update plan prices to $19/$39

**Files:** `src/constants/plans.tsx`
**Ref:** TD-PLAN-05

**What to do:**

- Change Pro plan `price` from `29` to `19`.
- Change Premium plan `price` from `69` to `39`.
- Update Pro `desc` to a better description (e.g., "Advanced AI for power users").
- Update Premium `desc` to a better description (e.g., "Ultimate AI experience with premium media").

**Acceptance Criteria:**

- [ ] Pro plan price is `19` in `plans` array
- [ ] Premium plan price is `39` in `plans` array
- [ ] Plan descriptions are updated and professional
- [ ] TypeScript compiles (`npx tsc --noEmit`)
- [ ] All existing tests pass — update any plan price assertions in tests

---

### 13.3 Allow all personas in all plans

**Files:** `src/lib/utils/resolve-entitlements.tsx`
**Ref:** TD-PLAN-06

**What to do:**

- In `resolveEntitlements()`, change the Lite case to return ALL 9 persona IDs (same as Pro/Premium) using `PERSONAS.map((p) => p.id)`.
- Enable audio generation for Lite (`supportsAudioGeneration: true`). Media limits will be enforced by usage counters, not by disabling the capability.

**Acceptance Criteria:**

- [ ] `resolveEntitlements("Lite")` returns all 9 persona IDs
- [ ] `resolveEntitlements("Lite")` returns `supportsAudioGeneration: true`
- [ ] Lite users can select any persona including `boyfriend` and `girlfriend`
- [ ] TypeScript compiles (`npx tsc --noEmit`)
- [ ] All existing tests pass — update entitlement test assertions

---

### 13.4 Update Lite plan inclusions and limits display

**Files:** `src/constants/plans.tsx`
**Ref:** TD-PLAN-09

**What to do:**

- Update Lite `inclusions` array to reflect actual limits:
  - "AI chat assistant" (included)
  - "All 9 personas" (included)
  - "5 conversations per day" (included)
  - "10 messages per conversation" (included)
  - "3 media generations per month" (included)
  - "File uploads (limited)" (included)
  - "Email support" (not included)
  - "Premium media features" (not included)
- Remove the `icon: "bi bi-clock-history"` (no longer a trial). Use `"bi bi-lightning"` or similar.

**Acceptance Criteria:**

- [ ] Lite plan inclusions accurately reflect product rules
- [ ] No "trial" or "3 days" language anywhere in plan data
- [ ] Plan icon updated from clock/history icon
- [ ] TypeScript compiles (`npx tsc --noEmit`)
- [ ] All existing tests pass

---

### 13.5 Update Pro plan inclusions display

**Files:** `src/constants/plans.tsx`
**Ref:** TD-PLAN-09

**What to do:**

- Update Pro `inclusions` array to reflect actual plan features:
  - "Advanced AI model (gpt-5.2-pro)" (included)
  - "All 9 personas" (included)
  - "50 conversations per day" (included)
  - "100 messages per conversation" (included)
  - "50 image generations per month" (included)
  - "50 audio generations per month" (included)
  - "Unlimited file uploads" (included)
  - "Email support" (included)
  - "Premium media features" (not included)

**Acceptance Criteria:**

- [ ] Pro plan inclusions accurately reflect approved limits and features
- [ ] TypeScript compiles (`npx tsc --noEmit`)
- [ ] All existing tests pass

---

### 13.6 Update Premium plan inclusions display

**Files:** `src/constants/plans.tsx`
**Ref:** TD-PLAN-09

**What to do:**

- Update Premium `inclusions` array to reflect actual plan features:
  - "Best AI model (gpt-5.4-pro)" (included)
  - "All 9 personas" (included)
  - "Unlimited conversations" (included)
  - "Unlimited messages" (included)
  - "Unlimited image generations" (included)
  - "Unlimited audio generations" (included)
  - "Quality image generation (Premium)" (included)
  - "Quality audio generation (Premium)" (included)
  - "Video generation — 10/month (Premium)" (included)
  - "Priority email support" (included)

**Acceptance Criteria:**

- [ ] Premium plan inclusions highlight 3 premium-only media features
- [ ] TypeScript compiles (`npx tsc --noEmit`)
- [ ] All existing tests pass

---

### 13.7 Update PLAN_LIMITS constant for all tiers

**Files:** `src/constants/plans.tsx`
**Ref:** TD-PLAN-07, TD-PLAN-08

**What to do:**

- Expand `PLAN_LIMITS` to include all limit types:
  ```ts
  export const PLAN_LIMITS = {
    Lite: { images: 3, audio: 3, video: 0, conversationsPerDay: 5, promptsPerConversation: 10 },
    Pro: { images: 50, audio: 50, video: 0, conversationsPerDay: 50, promptsPerConversation: 100 },
    Premium: { images: -1, audio: -1, video: 10, conversationsPerDay: -1, promptsPerConversation: -1 },
  };
  ```
- Note: Lite `audio` changes from `0` to `3` (media is now combined image+audio with 3 total, but tracked separately here for clarity; enforcement logic handles combined cap).
- Update `PlanLimits` type to include the new fields.

**Acceptance Criteria:**

- [ ] `PLAN_LIMITS` includes `conversationsPerDay` and `promptsPerConversation` for all plans
- [ ] `PLAN_LIMITS` includes `video` for all plans (0 for Lite/Pro, 10 for Premium)
- [ ] Lite audio limit updated from 0 to 3
- [ ] `PlanLimits` type updated to match new shape
- [ ] TypeScript compiles (`npx tsc --noEmit`)
- [ ] All existing tests pass — update plan limit test assertions

---

### 13.8 Update FAQ content to remove trial references

**Files:** `src/constants/faqs.tsx`
**Ref:** TD-UI-11

**What to do:**

- FAQ #1 (security): Keep as-is, the content is fine.
- FAQ #2 (support contact): Replace placeholder `[email address to be added soon]` with `support@cellesseon.com`.
- FAQ #6 (free trial): Rewrite to reflect that Lite is free forever. Change question to "Does Cellesseon have a free plan?" Answer: "Yes, every new account starts with our Lite plan which is free forever. You can upgrade to Pro or Premium anytime for additional features and higher limits."
- Review all other FAQs and ensure no "trial" language exists.

**Acceptance Criteria:**

- [ ] No FAQ references "free trial" or "trial period"
- [ ] Support email placeholder replaced with actual value
- [ ] FAQ #6 reflects permanent free Lite plan
- [ ] TypeScript compiles (`npx tsc --noEmit`)
- [ ] All existing tests pass

---

## Phase 14: Data Model Foundation

> Create the new database models required for usage tracking, admin, and content management.

---

### 14.1 Add conversation lifecycle fields to Task model

**Files:** `src/lib/database/models/tasks.model.tsx`, `src/types/TaskData.d.tsx`
**Ref:** TD-DB-10

**What to do:**

- Add to Task schema: `promptCount` (Number, default 0), `mediaCount` (Number, default 0), `estimatedBytes` (Number, default 0), `status` (String, enum `["active", "ended"]`, default `"active"`), `endedAt` (Date, optional), `endedReason` (String, optional), `endAction` (String, optional).
- Update `TaskData.d.tsx` types to include the new fields.
- Do NOT change any existing behavior — just add the fields with defaults so existing data is forward-compatible.

**Acceptance Criteria:**

- [ ] Task schema has all 7 new fields with correct types and defaults
- [ ] Types in `TaskData.d.tsx` updated
- [ ] Existing tasks remain valid (defaults handle missing data)
- [ ] TypeScript compiles (`npx tsc --noEmit`)
- [ ] All existing tests pass (`npm run test`)

---

### 14.2 Create UsageEvent model

**Files (new):** `src/lib/database/models/usage-event.model.tsx`
**Ref:** TD-DB-11

**What to do:**

- Create Mongoose model with fields per SPEC.md section 6.4.
- Indexes on: `userId`, `taskId`, `personaId`, `model`, `requestType`, `createdAt`.
- Add `strict: true` on the schema.
- Export the model with standard pattern: `const UsageEvent = models.UsageEvent || model("UsageEvent", UsageEventSchema);`

**Acceptance Criteria:**

- [ ] Model file created at `src/lib/database/models/usage-event.model.tsx`
- [ ] All fields from SPEC.md section 6.4 present with correct types
- [ ] Required indexes added
- [ ] Model follows existing model patterns in the codebase
- [ ] TypeScript compiles (`npx tsc --noEmit`)

---

### 14.3 Create UsageEvent type definition

**Files (new):** `src/types/UsageEventData.d.tsx`
**Ref:** TD-DB-11

**What to do:**

- Define TypeScript types for `UsageEventData`, `CreateUsageEventParams`.
- Types must match the UsageEvent model schema.

**Acceptance Criteria:**

- [ ] Type file created at `src/types/UsageEventData.d.tsx`
- [ ] Types match model schema
- [ ] TypeScript compiles (`npx tsc --noEmit`)

---

### 14.4 Create AppSetting model

**Files (new):** `src/lib/database/models/app-setting.model.tsx`
**Ref:** TD-DB-12

**What to do:**

- Create Mongoose model with fields per SPEC.md section 6.5.
- Index on `key` (unique) and `category`.
- `value` field type: `Schema.Types.Mixed`.
- Export with standard pattern.

**Acceptance Criteria:**

- [ ] Model file created at `src/lib/database/models/app-setting.model.tsx`
- [ ] All fields from SPEC.md section 6.5 present
- [ ] `key` has unique index, `category` has index
- [ ] TypeScript compiles (`npx tsc --noEmit`)

---

### 14.5 Create PublicPage model

**Files (new):** `src/lib/database/models/public-page.model.tsx`
**Ref:** TD-DB-13

**What to do:**

- Create Mongoose model with fields per SPEC.md section 6.6.
- Index on `slug` (unique).
- Export with standard pattern.

**Acceptance Criteria:**

- [ ] Model file created at `src/lib/database/models/public-page.model.tsx`
- [ ] All fields from SPEC.md section 6.6 present
- [ ] `slug` has unique index
- [ ] TypeScript compiles (`npx tsc --noEmit`)

---

### 14.6 Create AdminAuditLog model

**Files (new):** `src/lib/database/models/admin-audit-log.model.tsx`
**Ref:** TD-DB-14

**What to do:**

- Create Mongoose model with fields per SPEC.md section 6.7.
- Indexes on `adminId`, `action`, `createdAt`.
- Export with standard pattern.

**Acceptance Criteria:**

- [ ] Model file created at `src/lib/database/models/admin-audit-log.model.tsx`
- [ ] All fields from SPEC.md section 6.7 present
- [ ] Required indexes added
- [ ] TypeScript compiles (`npx tsc --noEmit`)

---

## Phase 15: Entitlement Engine & Usage Enforcement

> Build the canonical entitlement resolver and usage enforcement system.

---

### 15.1 Build daily conversation limit check utility

**Files (new):** `src/lib/utils/check-daily-conversations.ts`
**Ref:** TD-PLAN-07

**What to do:**

- Create utility function `checkDailyConversationLimit(userId: string, planName: PlanName)`.
- Query `Task.countDocuments({ userId, createdAt: { $gte: startOfToday } })` to get today's conversation count.
- Compare against `PLAN_LIMITS[planName].conversationsPerDay`.
- Return `{ allowed: boolean, limit: number, used: number, remaining: number }`.
- Handle unlimited plans (`-1`) by always returning `allowed: true`.

**Acceptance Criteria:**

- [ ] Function correctly counts today's conversations for the user
- [ ] Returns `allowed: false` when daily limit is reached
- [ ] Unlimited plans (`-1`) always return `allowed: true`
- [ ] TypeScript compiles (`npx tsc --noEmit`)

---

### 15.2 Add prompt count tracking to conversation flow

**Files:** `src/app/api/openai/route.tsx`, `src/lib/actions/task.actions.tsx`
**Ref:** TD-PLAN-08

**What to do:**

- In the `/api/openai` route, after resolving the task, check `task.promptCount` against `PLAN_LIMITS[planName].promptsPerConversation`.
- If limit reached, return a structured response with `stopReason: "prompt_limit_reached"` and appropriate `endAction`.
- When creating or updating a task with a new user message, increment `promptCount` with `$inc: { promptCount: 1 }`.
- In `createTask`, initialize `promptCount: 1` (the first user message).
- In `updateTask`, add `$inc: { promptCount: 1 }` when the update includes a user message.

**Acceptance Criteria:**

- [ ] `promptCount` is incremented on every user message
- [ ] `/api/openai` checks prompt count against plan limit before processing
- [ ] Conversation is stopped with `prompt_limit_reached` reason when limit hit
- [ ] User receives a clear message about the limit with next-action instruction
- [ ] Unlimited plans (`-1`) bypass the check
- [ ] TypeScript compiles (`npx tsc --noEmit`)
- [ ] All existing tests pass

---

### 15.3 Integrate daily conversation limit into /api/openai

**Files:** `src/app/api/openai/route.tsx`
**Ref:** TD-PLAN-07

**What to do:**

- Import `checkDailyConversationLimit` from the new utility.
- When creating a NEW conversation (no `taskId` in request), call `checkDailyConversationLimit(userId, planName)`.
- If `allowed === false`, return a structured response with `stopReason: "daily_conversation_limit_reached"` and `endAction: "upgrade_plan"` or `"contact_support"`.
- Return appropriate HTTP status and user-friendly message.

**Acceptance Criteria:**

- [ ] New conversation creation is blocked when daily limit reached
- [ ] Existing conversations are NOT blocked by daily limit (only new ones)
- [ ] Response includes stop reason and next action
- [ ] Unlimited plans bypass the check
- [ ] TypeScript compiles (`npx tsc --noEmit`)
- [ ] All existing tests pass

---

### 15.4 Add conversation stop handling to chat UI

**Files:** `src/components/chat/chat-wrapper.tsx`
**Ref:** TD-PLAN-07, TD-PLAN-08

**What to do:**

- When the `/api/openai` response contains a `stopReason`, render a conversation-end message in the chat.
- The message should display the stop reason in user-friendly language and the next action as a clickable link/button:
  - `start_new_conversation` → link to `/app/new`
  - `upgrade_plan` → link to `/app/plans` (or `/plans` until route migration)
  - `contact_support` → display support email
- Disable the chat input when the conversation is in `ended` status.
- Show a distinct visual state for ended conversations.

**Acceptance Criteria:**

- [ ] Stop reason messages render in chat when conversation ends
- [ ] Next-action links are clickable and go to correct routes
- [ ] Chat input is disabled for ended conversations
- [ ] Visual distinction between active and ended conversations
- [ ] TypeScript compiles (`npx tsc --noEmit`)

---

### 15.5 Add message count / document size guard for Task

**Files:** `src/app/api/openai/route.tsx`
**Ref:** TD-DB-05

**What to do:**

- Before adding a new message to a Task, estimate the current document size.
- Use a conservative formula: count messages * average message size estimate, or use `JSON.stringify(messages).length` as a rough byte estimate.
- If estimated size exceeds 12MB (leaving buffer before the 16MB MongoDB limit), stop the conversation with `stopReason: "conversation_storage_limit_reached"`.
- Update `Task.estimatedBytes` after each message addition.

**Acceptance Criteria:**

- [ ] Document size is estimated before adding messages
- [ ] Conversation stops when size approaches MongoDB document limit
- [ ] `estimatedBytes` field is updated on Task document
- [ ] Stop reason is `conversation_storage_limit_reached`
- [ ] TypeScript compiles (`npx tsc --noEmit`)
- [ ] All existing tests pass

---

## Phase 16: AI Model Policy Layer

> Make AI model selection plan-aware instead of hardcoded.

---

### 16.1 Create AI model policy resolver

**Files (new):** `src/lib/utils/ai-model-policy.ts`
**Ref:** TD-AI-07

**What to do:**

- Create a `resolveModelForPlan(planName: PlanName, requestType: "chat" | "title" | "image" | "audio" | "video")` function.
- Return the appropriate model ID based on plan and request type:
  - Lite chat: `"gpt-4o-mini"` (cheapest)
  - Pro chat: `"gpt-5.2-pro"`
  - Premium chat: `"gpt-5.4-pro"`
  - Title generation: `"gpt-4o-mini"` (all plans)
  - Image: `"dall-e-3"` (all plans, quality variant for Premium TBD)
  - Audio: `"gpt-4o-audio-preview"` (all plans, quality variant for Premium TBD)
  - Video: Premium only, provider TBD — return placeholder model ID
- Export a `MODEL_POLICY` constant that maps all plan+type combinations.

**Acceptance Criteria:**

- [ ] Function returns correct model for every plan + request type combination
- [ ] Lite gets cheapest model, Pro gets `gpt-5.2-pro`, Premium gets `gpt-5.4-pro`
- [ ] Video returns model only for Premium, returns `null` for other plans
- [ ] TypeScript compiles (`npx tsc --noEmit`)

---

### 16.2 Wire model policy into generateResponse

**Files:** `src/lib/utils/openai/generateResponse.tsx`
**Ref:** TD-AI-07

**What to do:**

- Import `resolveModelForPlan` from the new policy resolver.
- Replace the hardcoded `model: "gpt-4o"` with `model: resolveModelForPlan(planName, "chat")`.
- The `planName` must be passed through from the `/api/openai` route (add it to `generateResponse` params if not already there).

**Acceptance Criteria:**

- [ ] `generateResponse` uses plan-appropriate model instead of hardcoded `gpt-4o`
- [ ] Model is resolved at call time from the policy resolver
- [ ] TypeScript compiles (`npx tsc --noEmit`)
- [ ] All existing tests pass (update mocks as needed)

---

### 16.3 Wire model policy into generateTitle, generateImage, generateAudio

**Files:** `src/lib/utils/openai/generateTitle.tsx`, `src/lib/utils/openai/generateImage.tsx`, `src/lib/utils/openai/generateAudio.tsx`
**Ref:** TD-AI-07

**What to do:**

- Import `resolveModelForPlan` in each file.
- Replace hardcoded model strings with calls to the policy resolver.
- Pass `planName` through from the calling context (add parameter if needed).

**Acceptance Criteria:**

- [ ] All 3 files use `resolveModelForPlan` instead of hardcoded strings
- [ ] Model selection is plan-aware for all generation types
- [ ] TypeScript compiles (`npx tsc --noEmit`)
- [ ] All existing tests pass (update mocks as needed)

---

## Phase 17: Route Restructure

> Align route structure with target architecture. Move account pages under /app, admin under /admin.

---

### 17.1 Create /admin route group and layout

**Files (new):** `src/app/(admin)/layout.tsx`, `src/app/(admin)/admin/page.tsx`
**Ref:** TD-AUTH-02

**What to do:**

- Create a new `(admin)` route group with its own layout.
- Admin layout should include admin-specific navigation sidebar with links to: Dashboard, Users, Transactions, Usage, Settings, Website.
- Create the admin dashboard page at `/admin` — server component with auth check and basic stats (migrate from current `/dashboard` page).
- Admin layout must verify `sessionClaims.metadata.role === "admin"` server-side.

**Acceptance Criteria:**

- [ ] `/admin` route renders with admin layout and navigation
- [ ] Admin dashboard shows same stats as current `/dashboard`
- [ ] Server-side admin role check present
- [ ] TypeScript compiles (`npx tsc --noEmit`)

---

### 17.2 Create /admin/users list page

**Files (new):** `src/app/(admin)/admin/users/page.tsx`
**Ref:** TD-UI-10

**What to do:**

- Create server component that queries all users from MongoDB.
- Display user list with: username, email, role, plan name, registration date.
- Each row links to `/admin/users/[userId]`.
- Use `.lean()` and `.select()` for the query.
- Include search/filter capability (at minimum: search by username or email).

**Acceptance Criteria:**

- [ ] `/admin/users` renders a list of all users
- [ ] Each user row shows key info and links to detail page
- [ ] Query uses `.lean()` and `.select()`
- [ ] Admin role verified server-side
- [ ] TypeScript compiles (`npx tsc --noEmit`)

---

### 17.3 Create /admin/users/[userId] detail page

**Files (new):** `src/app/(admin)/admin/users/[userId]/page.tsx`
**Ref:** TD-UI-10

**What to do:**

- Create server component that fetches user by ID.
- Display: full user info, current plan details, usage stats (conversation count, media generation counts).
- Admin action buttons: suspend (set role to suspended or add suspended flag), remove (delete user + S3 cleanup).
- Each admin action must log to `AdminAuditLog`.
- Each admin action must be a server action with admin role verification.

**Acceptance Criteria:**

- [ ] User detail page renders with full user info
- [ ] Usage stats displayed (conversations, media counts)
- [ ] Admin actions (suspend, remove) are functional
- [ ] Admin actions log to AdminAuditLog
- [ ] Admin role verified in server actions
- [ ] TypeScript compiles (`npx tsc --noEmit`)

---

### 17.4 Create /admin/transactions list page

**Files (new):** `src/app/(admin)/admin/transactions/page.tsx`
**Ref:** TD-UI-10

**What to do:**

- Create server component querying all transactions.
- Display: user info, plan, amount, billing cycle, date, status.
- Each row links to `/admin/transactions/[transactionId]`.
- Use `.lean()` and `.select()`.

**Acceptance Criteria:**

- [ ] `/admin/transactions` lists all transactions
- [ ] Each row links to detail page
- [ ] Query optimized with `.lean()` and `.select()`
- [ ] Admin role verified
- [ ] TypeScript compiles (`npx tsc --noEmit`)

---

### 17.5 Create /admin/transactions/[transactionId] detail page

**Files (new):** `src/app/(admin)/admin/transactions/[transactionId]/page.tsx`
**Ref:** TD-UI-10

**What to do:**

- Display full transaction details.
- Show associated user info.
- Admin actions as applicable (view only for now — real Stripe operations can be added later).
- Admin actions log to AdminAuditLog.

**Acceptance Criteria:**

- [ ] Transaction detail page renders with full info
- [ ] Associated user info displayed
- [ ] Admin role verified
- [ ] TypeScript compiles (`npx tsc --noEmit`)

---

### 17.6 Create /admin/usage page

**Files (new):** `src/app/(admin)/admin/usage/page.tsx`
**Ref:** TD-UI-10

**What to do:**

- Create server component that queries `UsageEvent` collection.
- Display usage data: by user (top users), by model, by request type, by time period.
- Show cost estimates (placeholder values acceptable where real cost data not yet available).
- Include provider breakdown (OpenAI, AWS).

**Acceptance Criteria:**

- [ ] `/admin/usage` renders usage analytics
- [ ] Data shown by user, model, type, time period
- [ ] Cost estimates shown (placeholder acceptable)
- [ ] Admin role verified
- [ ] TypeScript compiles (`npx tsc --noEmit`)

---

### 17.7 Create /admin/settings page

**Files (new):** `src/app/(admin)/admin/settings/page.tsx`
**Ref:** TD-UI-10

**What to do:**

- Create page with settings sections:
  - **AI Models**: Selector to choose AI model for each plan tier.
  - **Pricing**: Change price and description for each plan.
  - **Limits**: Adjust limits for each plan (conversations/day, prompts/conversation, media counts).
  - **Theme**: Toggle default theme (dark/light).
- Read settings from `AppSetting` model. Write changes via server actions.
- Each change logs to AdminAuditLog.

**Acceptance Criteria:**

- [ ] Settings page renders all 4 sections
- [ ] Settings can be read and updated
- [ ] Changes persist to AppSetting model
- [ ] Changes logged to AdminAuditLog
- [ ] Admin role verified in all server actions
- [ ] TypeScript compiles (`npx tsc --noEmit`)

---

### 17.8 Create /admin/website management page

**Files (new):** `src/app/(admin)/admin/website/page.tsx`
**Ref:** TD-UI-10

**What to do:**

- List all `PublicPage` documents with: title, slug, published status, sort order.
- Add button to create new page.
- Each row: edit link → `/admin/website/[pageId]`, publish/unpublish toggle, delete button, drag-to-reorder (or sort order input).
- All mutations via server actions with admin role check and audit logging.

**Acceptance Criteria:**

- [ ] `/admin/website` lists all public pages
- [ ] Add, publish/unpublish, delete, and sort actions work
- [ ] All mutations logged to AdminAuditLog
- [ ] Admin role verified
- [ ] TypeScript compiles (`npx tsc --noEmit`)

---

### 17.9 Create /admin/website/[pageId] editor page

**Files (new):** `src/app/(admin)/admin/website/[pageId]/page.tsx`
**Ref:** TD-UI-10

**What to do:**

- Install Tiptap packages: `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/pm`.
- Create a client component `TiptapEditor` wrapping Tiptap with `immediatelyRender: false`.
- Page loads `PublicPage` document by ID, renders form with title field and Tiptap editor for content.
- Save button persists changes via server action.
- Audit log entry on save.

**Acceptance Criteria:**

- [ ] Tiptap packages installed
- [ ] Tiptap editor renders and produces HTML content
- [ ] Page content can be loaded and saved
- [ ] Admin role verified
- [ ] Audit log entry created on save
- [ ] TypeScript compiles (`npx tsc --noEmit`)

---

### 17.10 Move /profile to /app/profile

**Files:** `src/app/(account)/profile/page.tsx` → move to `src/app/(chat)/app/profile/page.tsx`
**Ref:** TD-UI-09

**What to do:**

- Move the profile page from `(account)/profile/` to `(chat)/app/profile/`.
- Update any navigation links pointing to `/profile` → `/app/profile`.
- Add user profile content: personal details (from Clerk), current plan info, purchase history (from transactions), upgrade plan link.

**Acceptance Criteria:**

- [ ] `/app/profile` renders the profile page
- [ ] Old `/profile` route no longer exists or redirects
- [ ] Navigation links updated
- [ ] User can see: personal details, current plan, purchase history
- [ ] User can access upgrade link
- [ ] TypeScript compiles (`npx tsc --noEmit`)

---

### 17.11 Move /plans to /app/plans and /pricing to /plans

**Files:** Route restructure for plans/pricing pages
**Ref:** TD-UI-09

**What to do:**

- Rename current `/pricing` (public) route to `/plans` (public pricing page).
- Move current `/plans` (authenticated checkout) to `/app/plans`.
- Update all navigation links accordingly.
- Ensure `/plans` is public (no auth required) and `/app/plans` is protected.

**Acceptance Criteria:**

- [ ] `/plans` is the public pricing page (no auth required)
- [ ] `/app/plans` is the authenticated plan selection + checkout page
- [ ] Navigation links updated throughout the app
- [ ] TypeScript compiles (`npx tsc --noEmit`)

---

### 17.12 Update proxy for new route structure

**Files:** `src/proxy.tsx`
**Ref:** TD-AUTH-01, TD-AUTH-02

**What to do:**

- Update `isProtectedRoute` to: `["/app(.*)"]`.
- Update `isAdminRoute` to: `["/admin(.*)"]`.
- Remove old routes: `/profile(.*)`, `/plans(.*)`, `/dashboard/:path*`.

**Acceptance Criteria:**

- [ ] Proxy protects `/app(.*)` and `/admin(.*)`
- [ ] Old route matchers removed
- [ ] Anonymous users redirected from `/app/*` to `/sign-in`
- [ ] Non-admin users redirected from `/admin/*` to `/403`
- [ ] TypeScript compiles (`npx tsc --noEmit`)
- [ ] All existing tests pass — update proxy test assertions

---

### 17.13 Remove old /dashboard route

**Files:** `src/app/(chat)/dashboard/page.tsx`

**What to do:**

- Delete the old dashboard page after `/admin` route is confirmed working.
- Remove any navigation links to `/dashboard`.

**Acceptance Criteria:**

- [ ] Old `/dashboard` page deleted
- [ ] No navigation links point to `/dashboard`
- [ ] `/admin` is the only admin entry point
- [ ] TypeScript compiles (`npx tsc --noEmit`)

---

## Phase 18: Public Pages

> Create missing public pages. Not just another chatbot — distinctive product narrative.

---

### 18.1 Create /about page

**Files (new):** `src/app/(public)/about/page.tsx`
**Ref:** TD-UI-08

**What to do:**

- Create server component with stacked sections explaining how Cellesseon works.
- Sections: (1) What is Cellesseon — persona-driven AI assistant, (2) How it works — choose persona, start chatting, (3) Personas — overview of 9 personas, (4) Media generation — images, audio, video, (5) Plans overview — link to `/plans`.
- Each section: heading + descriptive text + image placeholder (use CSS placeholder or public image).
- Reuse `PageWrapper` and `PageHead` layout components.

**Acceptance Criteria:**

- [ ] `/about` renders with multiple stacked content sections
- [ ] Sections explain personas, features, and media capabilities
- [ ] Reuses existing layout components
- [ ] Page is public (no auth required)
- [ ] TypeScript compiles (`npx tsc --noEmit`)

---

### 18.2 Create /faqs page

**Files (new):** `src/app/(public)/faqs/page.tsx`
**Ref:** TD-UI-08

**What to do:**

- Create page that renders the FAQ accordion.
- Reuse existing `FaqsSection` component (currently used in `/pricing` page).
- Wrap in `PageWrapper` with `PageHead`.

**Acceptance Criteria:**

- [ ] `/faqs` renders the FAQ accordion
- [ ] Reuses existing `FaqsSection` component
- [ ] Page is public
- [ ] TypeScript compiles (`npx tsc --noEmit`)

---

### 18.3 Create /privacy page

**Files (new):** `src/app/(public)/privacy/page.tsx`
**Ref:** TD-UI-08

**What to do:**

- Create page with real Privacy & Cookie Policy content.
- Content must be adapted for Cellesseon's purpose (AI chatbot SaaS collecting user data, using OpenAI API, Clerk auth, Stripe payments, AWS S3 storage).
- Cover: data collection, usage, storage, third-party sharing, cookies, user rights, contact info.
- Use structured sections with headings.
- Add disclaimer: "This policy is provided for informational purposes. Legal review recommended before production publication."

**Acceptance Criteria:**

- [ ] `/privacy` renders real privacy policy content
- [ ] Content covers all relevant data handling topics
- [ ] Adapted for Cellesseon context (AI, OpenAI, Clerk, Stripe, S3)
- [ ] Includes review disclaimer
- [ ] Page is public
- [ ] TypeScript compiles (`npx tsc --noEmit`)

---

### 18.4 Create /cookies page

**Files (new):** `src/app/(public)/cookies/page.tsx`
**Ref:** TD-UI-08

**What to do:**

- Create page with real Cookie Policy content.
- Document cookies used: Clerk session cookies, theme preference, analytics (if any).
- Explain cookie categories: essential, functional, optional.
- Add same review disclaimer as privacy page.

**Acceptance Criteria:**

- [ ] `/cookies` renders real cookie policy content
- [ ] Content documents actual cookies used
- [ ] Includes review disclaimer
- [ ] Page is public
- [ ] TypeScript compiles (`npx tsc --noEmit`)

---

### 18.5 Create /terms page

**Files (new):** `src/app/(public)/terms/page.tsx`
**Ref:** TD-UI-08

**What to do:**

- Create page with real Terms & Conditions content.
- Cover: service description, user responsibilities, AI-generated content disclaimer, payment terms, refund policy, account termination, limitation of liability, governing law.
- Adapted for Cellesseon SaaS context.
- Add review disclaimer.

**Acceptance Criteria:**

- [ ] `/terms` renders real terms & conditions content
- [ ] Content covers standard SaaS legal topics
- [ ] AI content disclaimer included
- [ ] Payment terms match approved plan structure
- [ ] Includes review disclaimer
- [ ] Page is public
- [ ] TypeScript compiles (`npx tsc --noEmit`)

---

### 18.6 Enhance homepage with product sections

**Files:** `src/components/sections/landing-page.tsx` or `src/app/(public)/page.tsx`
**Ref:** TD-UI-07

**What to do:**

- After the existing Hero section, add 3-4 additional sections:
  - **Feature showcase**: Highlight key capabilities (persona-driven chat, media generation, streaming responses).
  - **How it works**: 3-step visual (choose persona → start chatting → get results).
  - **Social proof / CTA**: Strong call-to-action to sign up or explore plans.
- Each section should have compelling heading, descriptive text, and visual element.
- Maintain existing design system (Tailwind, fonts, theme tokens).

**Acceptance Criteria:**

- [ ] Homepage has 3-4 sections beyond the Hero
- [ ] Sections include feature showcase, how-it-works, and CTA
- [ ] Design consistent with existing theme/system
- [ ] TypeScript compiles (`npx tsc --noEmit`)

---

### 18.7 Rename /pricing to /plans (public page)

**Files:** `src/app/(public)/pricing/page.tsx` → `src/app/(public)/plans/page.tsx`

**What to do:**

- Rename the route directory from `pricing` to `plans`.
- Update the page title/heading from "Pricing" to "Plans" or "Choose Your Plan".
- Update any links in header/footer navigation from `/pricing` to `/plans`.

**Acceptance Criteria:**

- [ ] `/plans` is the public pricing page
- [ ] `/pricing` no longer exists
- [ ] Navigation links updated
- [ ] TypeScript compiles (`npx tsc --noEmit`)

---

## Phase 19: Streaming Implementation

> Add streaming responses for chat UX.

---

### 19.1 Create streaming API route

**Files (new):** `src/app/api/openai/stream/route.tsx` or modify existing route
**Ref:** TD-AI-01

**What to do:**

- Implement streaming using OpenAI SDK's `openai.chat.completions.stream(...)`.
- Return a `ReadableStream` or use the Next.js `StreamingTextResponse` pattern.
- Include all existing auth, rate limiting, plan expiry, and entitlement checks.
- Emit usage event after stream completes.
- Handle tool calls (image/audio generation) after stream completion.

**Acceptance Criteria:**

- [ ] Streaming endpoint returns partial responses via SSE/ReadableStream
- [ ] All auth and limit checks remain in place
- [ ] Tool calls dispatched after stream completion
- [ ] Usage event emitted after completion
- [ ] Error handling works for streaming failures
- [ ] TypeScript compiles (`npx tsc --noEmit`)

---

### 19.2 Update chat UI to render streamed responses

**Files:** `src/components/chat/chat-wrapper.tsx`, `src/components/chat/chat-body.tsx`
**Ref:** TD-AI-01

**What to do:**

- Update `ChatWrapper` to consume streaming responses using `ReadableStream` reader or EventSource.
- Render partial text incrementally in `ChatBody` as chunks arrive.
- Replace "Thinking..." with actual incremental text display.
- Handle stream completion, errors, and tool-call follow-ups.
- Maintain existing UI/UX patterns (markdown rendering, code blocks, etc.).

**Acceptance Criteria:**

- [ ] Chat renders text incrementally as stream chunks arrive
- [ ] "Thinking..." replaced with real progressive rendering
- [ ] Message finalization works correctly after stream completion
- [ ] Error states handled gracefully
- [ ] Existing markdown rendering still works
- [ ] TypeScript compiles (`npx tsc --noEmit`)

---

## Phase 20: Error Handling & File Cleanup (from old Phase 10)

---

### 20.1 Refactor handleError to preserve stack traces

**File:** `src/lib/utils/handleError.tsx`
**Ref:** TD-API-06

**What to do:**

- Use `new Error(message, { cause: error })` pattern to preserve original stack trace.
- Keep the `source` annotation for debugging context.

**Acceptance Criteria:**

- [ ] Original error preserved as `cause` on thrown error
- [ ] Source string still in error message
- [ ] Stack trace accessible via `error.cause`
- [ ] TypeScript compiles (`npx tsc --noEmit`)
- [ ] All existing tests pass

---

### 20.2 Add S3 cleanup on user deletion in Clerk webhook

**File:** `src/app/api/webhooks/clerk/route.tsx`
**Ref:** TD-FILE-01

**What to do:**

- In `user.deleted` handler, after MongoDB deletion, list and delete all S3 objects under `{clerkId}/` prefix.
- Use batch deletion (ListObjectsV2 + DeleteObjects).
- Log errors but do not fail the webhook response.

**Acceptance Criteria:**

- [ ] S3 objects cleaned up on user deletion
- [ ] Uses batch deletion
- [ ] Errors logged but webhook succeeds
- [ ] TypeScript compiles (`npx tsc --noEmit`)
- [ ] All existing tests pass

---

### 20.3 Add S3 cleanup on task deletion

**File:** `src/lib/actions/task.actions.tsx`
**Ref:** TD-FILE-01

**What to do:**

- In `deleteTask`, scan task messages for S3 image URLs before deletion.
- Delete matching S3 objects via `deleteFileFromAWS`.
- Wrap in try/catch — log errors but do not fail deletion.

**Acceptance Criteria:**

- [ ] Task messages scanned for S3 URLs before deletion
- [ ] S3 objects deleted for matching URLs
- [ ] Task deletion succeeds even if S3 cleanup fails
- [ ] TypeScript compiles (`npx tsc --noEmit`)
- [ ] All existing tests pass

---

### 20.4 Refactor chat input to upload via /api/upload

**File:** `src/components/chat/chat-input.tsx`
**Ref:** TD-FILE-02

**What to do:**

- Upload files via `/api/upload` FormData before building message content.
- Replace inline base64 URLs with S3 URLs in message content.
- Handle upload failure gracefully.

**Acceptance Criteria:**

- [ ] All file attachments go through `/api/upload`
- [ ] No base64 in message content sent to `/api/openai`
- [ ] Upload failures prevent message send with user feedback
- [ ] TypeScript compiles (`npx tsc --noEmit`)
- [ ] All existing tests pass

---

### 20.5 Upload audio to S3 instead of base64 in messages

**Files:** `src/lib/utils/openai/generateAudio.tsx`, potentially `src/app/api/openai/route.tsx`
**Ref:** TD-AI-05, TD-DB-07

**What to do:**

- After audio generation, upload the audio data to S3 under `{userId}/audio/`.
- Store the S3 URL in the message content instead of the base64 data.
- Update audio player component to use URL instead of base64 data URI.

**Acceptance Criteria:**

- [ ] Audio data uploaded to S3 after generation
- [ ] Message content stores S3 URL, not base64
- [ ] Audio player renders from S3 URL
- [ ] TypeScript compiles (`npx tsc --noEmit`)
- [ ] All existing tests pass

---

## Phase 21: Prompt Improvement

> Improve and adapt prompts per persona and per model.

---

### 21.1 Create prompt versioning and management system

**Files (new):** `src/constants/persona-prompts.ts`
**Ref:** TD-AI-09

**What to do:**

- Create a prompt configuration file that defines system prompts per persona, per model family.
- Structure: `{ [personaId]: { [modelFamily]: { systemPrompt, temperature, maxTokens } } }`.
- The current `systemPrompt` field on persona objects becomes the default/fallback.
- Add prompt version identifier.

**Acceptance Criteria:**

- [ ] Prompt configuration file created
- [ ] Prompts organized by persona and model family
- [ ] Version identifier present
- [ ] TypeScript compiles (`npx tsc --noEmit`)

---

### 21.2 Improve persona-specific prompts

**Files:** `src/constants/assistant-personas.tsx` and/or the new prompt config
**Ref:** TD-AI-09

**What to do:**

- Review and improve each persona's system prompt for:
  - Distinct personality and tone
  - Clear domain expertise boundaries
  - Safety constraints (especially companion personas)
  - Answer formatting preferences
  - Model-aware instructions (simpler prompts for cheaper models, richer for premium)

**Acceptance Criteria:**

- [ ] All 9 personas have improved, distinct prompts
- [ ] Safety constraints defined for companion personas
- [ ] Prompts vary by model tier where appropriate
- [ ] TypeScript compiles (`npx tsc --noEmit`)

---

## Phase 22: Testing & Hardening

---

### 22.1 Add test coverage configuration

**File:** `vitest.config.mts`, `package.json`

**What to do:**

- Add `coverage` config with `v8` provider and 70/60/70/70 thresholds.
- Add `test:coverage` script.

**Acceptance Criteria:**

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

**Acceptance Criteria:**

- [ ] Tests verify all plans allow all 9 personas
- [ ] Tests verify Lite audio generation enabled
- [ ] All tests pass

---

### 22.3 Add unit tests for daily conversation limit

**File (new):** `tests/unit/check-daily-conversations.test.ts`

**What to do:**

- Test limit enforcement for each plan tier.
- Test unlimited plans bypass check.
- Test date boundary behavior.

**Acceptance Criteria:**

- [ ] Tests cover all plan tiers
- [ ] Tests verify unlimited plan bypass
- [ ] All tests pass

---

### 22.4 Add unit tests for AI model policy

**File (new):** `tests/unit/ai-model-policy.test.ts`

**What to do:**

- Test model resolution for each plan + request type combination.
- Test video returns null for non-Premium plans.

**Acceptance Criteria:**

- [ ] Tests cover all plan + type combinations
- [ ] Tests verify video restriction
- [ ] All tests pass

---

### 22.5 Implement retry/backoff for OpenAI failures

**Files:** `src/lib/utils/openai/generateResponse.tsx`
**Ref:** TD-AI-06

**What to do:**

- Add exponential backoff for transient OpenAI errors (429, 500, 502, 503).
- Max 3 retries with increasing delay.
- Log retries server-side.

**Acceptance Criteria:**

- [ ] Transient errors trigger retry with backoff
- [ ] Max 3 retries
- [ ] Non-retryable errors fail immediately
- [ ] TypeScript compiles (`npx tsc --noEmit`)
- [ ] All existing tests pass

---

## Phase 23: Resilience & Deferred Items

> Lower priority. Not blocking v1 launch but important for production hardening.

- [ ] **23.1** Replace in-memory rate limiter with persistent store — Ref: TD-API-01
- [ ] **23.2** Implement Stripe subscription mode (auto-renewal) — Ref: TD-PLAN-01
- [ ] **23.3** Add video generation support for Premium — Ref: TD-AI-08
- [ ] **23.4** Add per-user token/cost tracking via UsageEvent aggregation — Ref: TD-AI-03
- [ ] **23.5** Update UsageEvent emission in all OpenAI util functions
- [ ] **23.6** Add admin audit log emission in all admin server actions

---

## Completed Phases

### Phase 9: Production UX Polish — COMPLETED

- [x] **9.1** Add conversation delete button to chat sidebar
- [x] **9.2** Add conversation delete button to library page
- [x] **9.3** Add loading skeleton for chat layout
- [x] **9.4** Add loading skeleton for account layout

### Phase 7: Persona Rename — COMPLETED

- [x] **7.1–7.26** Full persona rename from "assistant role" to "persona" across all files

### Phase 8: Database Optimization — COMPLETED

- [x] **8.1** `.lean()` and `.select()` on getUserById
- [x] **8.2** `.lean()` on getAllTransactions
- [x] **8.3** Optimize task-queries with `.lean()` and `.select()`
- [x] **8.4** Index on Task.personaId
- [x] **8.5** Mongoose connection pooling review

### Phase 1: Security & Data Integrity — COMPLETED

- [x] **1.1–1.9** strict:true fixes, index additions, ownership validation, createUser non-export

### Phase 2: Security Fixes (Ownership) — COMPLETED

- [x] **2.1–2.5** Ownership enforcement, console.log removal

### Phase 3: Core Feature Gaps — COMPLETED

- [x] **3.1–3.5** deleteTask, mapDateToLabel, generateImage S3, error.tsx, .env example

### Phase 4: Plan Enforcement (Usage Limits) — COMPLETED

- [x] **4.1–4.6** Usage tracking fields, plan limits, usage check, enforcement, reset

### Phase 5: Error Handling — COMPLETED

- [x] **5.1–5.2** OpenAI error classification, chat error boundary

### Phase 6: Testing — COMPLETED

- [x] **6.1–6.5** generateResponse, generateTitle, deleteTask, getUserById tests

### Phase 10–12: (Superseded by Phases 13–23 above)

Old Phase 10-12 tasks have been incorporated into the new phase structure:
- 10.1 → 20.1, 10.2 → 20.2, 10.3 → 20.3, 10.4 → 20.4
- 11.1 → 22.1, 11.2 → 22.2
- 12.x → 23.x (deferred items)

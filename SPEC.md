# Droplet — Application Specification

> Canonical product and system specification for the Droplet AI assistant SaaS.
> This document is governed by **Droplet-PM** and must reflect approved direction only.
> Last updated: 2026-03-26 (PM audit #64). Milestones 0–24 COMPLETE. Milestone 25 IN PROGRESS — Full TDD testing rebuild (Phase 120). **All 7 gates GREEN.** 537 unit tests (83 suites). E2E: 108 passed, 0 failed, 25 skipped. Coverage: ~85/~72/~89/~85. Active TDs: TD-HARDCODE-01 (HIGH), TD-WCAG-05/WCAG-07/TEST-02 (MEDIUM). Build passing. Node.js 24.12.0. Phase 128.2 COMPLETE (Button migration). Phase 106 COMPLETE (shared ChatApiResponse types — TD-REUSE-04 RESOLVED). 100 `as never` casts in 12 non-rebuilt test files.

---

## 1. Product Overview

Droplet is an AI assistant SaaS built on OpenAI models.
Users **must create an account** to use the app � there is no anonymous/guest chat access.
Authenticated users interact with an AI assistant through predefined **personas** that shape conversation tone and capabilities.
Each conversation is bound to one persona. Personas control system prompt, tool availability, and behavioral boundaries.
The product monetises through tiered subscription plans paid via Stripe.

### Terminology

- **Persona** (plural: **Personas**): A predefined AI assistant profile that controls system prompt, capabilities, and tone. Not to be confused with `User.role` which refers to the user access level (`client` | `admin`).

### Core Value Proposition

- Multi-modal AI assistant (text + image + audio + video generation)
- 6 predefined personas with distinct system prompts and capabilities
- Streaming responses for real-time chat UX
- Conversation history persisted per user with resume capability
- Three-tier subscription model (Lite / Pro / Premium) with per-plan entitlements
- File upload and image download capabilities
- Full admin control plane for operational management

### Approved v1 Release Scope

- 6 predefined personas (no dynamic persona creation)
- Per-plan persona gating (Lite: 2, Pro: 5, Premium: all 6) � admin-configurable
- Text chat as primary mode with **streaming responses**
- Image upload support
- Image generation (all tiers, with enforced usage limits)
- Audio generation (all tiers, with enforced usage limits)
- Video generation (all tiers, with enforced usage limits — **Phase 34 COMPLETE, Phase 34.9 quality fixes COMPLETE, Phase 51.1 prompt fix COMPLETE**). `sora-2` and `sora-2-pro` operational. Async job model: create → poll → download MP4 → upload to S3. Duration: 4s default. `supportsVideoGeneration` is `true` for all non-suspended plans. Platform prompt includes media-tool awareness.
- Account-required access � no anonymous usage
- Authenticated `/app` experience with persona-led UX
- Real conversation history (list, resume, delete)
- Billing + entitlements that match product claims
- Full admin dashboard with users, transactions, usage, settings, and website management
- Public marketing site with product info, personas showcase, pricing, FAQs, and legal pages
- User profile with plan info, purchase history, and upgrade capability

### Deferred from v1

- Team/workspace features
- Multi-provider LLM routing
- Stripe subscription mode (auto-renewal)
- User-created custom personas
- Yearly billing pricing discount
- Broad role systems beyond `client` and `admin`

---

## 2. User Roles

| Role          | Access                                                                                                    |
| ------------- | --------------------------------------------------------------------------------------------------------- |
| **Anonymous** | Public pages only: `/`, `/about`, `/plans`, `/personas`, `/privacy`, `/cookies`, `/terms`                 |
| **Client**    | All public pages + chat (`/app`), conversation resume, library, new conversation, profile, plans, billing |
| **Admin**     | All client access + admin dashboard (`/admin/*`)                                                          |

`User.role` is stored in Mongoose and synced to Clerk `publicMetadata.role`.
Admin access is enforced at the proxy level (`src/proxy.tsx`) via Clerk session claims (`metadata.role === "admin"`).

> **Rule (new, PM audit #25):** Admin role users must have full permissions over all features and all personas with no limitations. Admin bypasses all plan limits (conversations, prompts, media generations), all trial restrictions, and all persona gating. This must be enforced in the backend `/api/openai` route, not just in UI components. Tracked as TD-ADMIN-03.

> **Note:** `User.role` refers to user access level (`client` / `admin`). It is unrelated to AI **personas**.

---

## 3. Personas

6 predefined personas defined in `src/constants/assistant-personas.tsx`:

| Persona ID    | Label       | Category     | Image | Audio | Lite | Pro | Premium |
| ------------- | ----------- | ------------ | ----- | ----- | ---- | --- | ------- |
| `strategist`  | Strategist  | Productivity | Yes   | Yes   | Yes  | Yes | Yes     |
| `teacher`     | Teacher     | Learning     | Yes   | Yes   | No   | Yes | Yes     |
| `developer`   | Developer   | Productivity | Yes   | Yes   | Yes  | Yes | Yes     |
| `creator`     | Creator     | Creative     | Yes   | Yes   | No   | Yes | Yes     |
| `wellness`    | Wellness    | Lifestyle    | Yes   | Yes   | No   | Yes | Yes     |
| `interviewer` | Interviewer | Career       | Yes   | Yes   | No   | No  | Yes     |

> **Rule 3 (updated):** Personas use a three-tier access model: **full** (plan's normal limits), **limited** (trial limits for try-before-you-buy), or **blocked** (admin-disabled). Lite: 2 personas full access (Strategist, Developer) + 4 personas limited access. Pro: 5 personas full access (+ Teacher, Creator, Wellness) + 1 persona limited access. Premium: all 6 personas full access. Admin can override via settings.
> **Rule 10:** All features (image, audio, video) are available for all personas � differentiated by persona purpose (prompt context), not blocked per persona. All plans provide all features � differentiated by plan limits (quantity).
> **Rule (new):** Each persona acts as an independent AI agent trained and skilled for its field. Related tools and features are provided to each persona to perform best in its domain. Personas are displayed in a 3-per-row grid on desktop. Each persona has a representative hero image. All persona configuration (access, enablement) is managed exclusively from the admin panel by the admin role. Unavailable personas are clearly labeled as "PRO" or "PREMIUM" feature with a small-font indicator.

### Persona Trial Access (Limited Access Model)

Users can TEST personas outside their plan's full-access set with reduced limits ("try before you buy").

**Trial limits per conversation (for limited-access personas):**

| Limit                    | Value | Scope                 |
| ------------------------ | ----- | --------------------- |
| Prompts per conversation | 5     | Per conversation      |
| Image generations        | 3     | 30-day rolling window |
| Audio generations        | 2     | 30-day rolling window |
| Video generations        | 1     | 30-day rolling window |

**Rules:**

- Trial limits are GLOBAL across all limited-access personas (not per-persona tracking).
- Trial media counters are SEPARATE from plan media counters.
- When trial prompt limit (5) is reached, conversation ends with upgrade CTA.
- When trial media limit is reached, media generation is blocked with upgrade CTA.
- Trial counters tracked on User model: `trialImageGenerations`, `trialAudioGenerations`, `trialVideoGenerations`, `trialUsagePeriodStart`.
- Atomic enforcement via `findOneAndUpdate` with `$lt` guard (same pattern as plan counters).

Each persona has: `id`, `label`, `tagline`, `description`, `category`, `icon`, `starterPrompts[]`, `systemPrompt`, `supportsImage`, `supportsAudio`.

### Persona Selection & Entitlements

- **Personas are plan-gated** (Lite: 2 personas, Pro: 5 personas, Premium: all 6 personas).
- Default persona access per plan is hardcoded in constants but overridable by admin via AppSetting.
- Persona selection UI: `ChatHeader` includes a persona dropdown selector for quick persona switching across all `/app` pages � selector is disabled during active conversations (`messages.length > 0` or `taskStatus === "ended"` � persona is bound per-task). `ChatPersonaPicker` component available on `/app/personas` page for full persona browsing with trial badges.
- Persona is stored per task in `Task.personaId`.
- System prompt is built per-persona via `buildPersonaAwareSystemPrompt()`.
- Entitlements resolved via `resolveEntitlements()` in `src/lib/utils/resolve-entitlements.tsx`.
- `allowedPersonaIds` normalization: `undefined` = all personas (no restriction), `[]` = all blocked, `[...ids]` = exact permitted set.

### Persona Behavioral Requirements

All personas must:

- Be pragmatic and direct
- Provide honest, clear answers without evasions or ambiguous wording
- Communicate clearly, as a partner who really wants to help
- Avoid unnecessary language or artificial questions
- Be intelligent, grounded in reality, and call a spade a spade
- Verify information before delivering it
- Get right to the point
- Be practical above all

### Interviewer Persona

The Interviewer persona is an interview readiness simulator:

- Practice realistic, back-and-forth interview conversations
- Receive structured feedback after each session
- Prepare for real interviews, promotions, and internal mobility
- Tailored to role, company, and experience level
- Premium-only persona (Lite and Pro: trial access)

### Prompt Architecture (Implemented � Phase 22)

Prompt system implemented in `src/constants/persona-prompts.ts` (server-only, versioned).

Current implementation covers:

- **Persona identity**: unique personality, tone, domain expertise � all 6 personas have distinct prompts
- **Plan tier**: model-family-aware prompt adaptation (nano/mini/standard/reasoning model families)
- **Model family resolution**: `resolvePromptModelFamily()` maps model IDs to prompt families
- **Temperature/max-token settings**: per-persona, per-model-family configuration
- **Safety constraints**: `WELLNESS_SAFETY_RULES` for wellness persona
- **Answer style and formatting**: persona-specific output formatting rules
- **Version identifier**: `PROMPT_VERSION = "1.0"`
- **Fallback chain**: model-family prompt ? persona default `systemPrompt` in assistant-personas.tsx

Prompts are versioned and separated from request handlers. `buildPersonaAwareSystemPrompt()` resolves prompts from the new config first, falling back to persona defaults.

**Remaining gap**: Image and audio generation requests are not yet persona-aware � they do not receive persona-specific prompt context. Chat prompts are fully persona-aware.

---

## 4. Subscription Plans

| Plan        | Price | Duration      | Chat Model (default)            | Limits                                                                                         |
| ----------- | ----- | ------------- | ------------------------------- | ---------------------------------------------------------------------------------------------- |
| **Lite**    | Free  | **Permanent** | `gpt-4o-mini`                   | 5 conversations/day, 10 prompts/conversation, 3 image/month, 3 audio/month, 1 video/month      |
| **Pro**     | $19   | Monthly       | `gpt-4.1`                       | 50 conversations/day, 100 prompts/conversation, 50 image/month, 50 audio/month, 10 video/month |
| **Premium** | $39   | Monthly       | `gpt-4.1` / `gpt-5.4` (complex) | Unlimited conversations, unlimited prompts, unlimited image + audio, unlimited video           |

> Full model policy (all features � plans � task classes) in **Section 8**.

### Plan Rules

1. **Lite is permanent and free.** There is no 3-day trial. There is no expiry. New users receive Lite by default upon account creation.
2. **Personas are plan-gated.** Lite: Strategist, Developer (2). Pro: all Lite + Teacher, Creator, Wellness (5). Premium: all 6 personas. Admin can override persona access per plan via admin settings.
3. **Pro and Premium are paid-only.** Activated via Stripe Checkout one-time payment.
4. **Premium advantages over Pro:** higher audio quality model (when available), `gpt-5.4` for complex reasoning, unlimited image/audio quotas, and higher video quota. See Section 8 for full model policy. Note: `gpt-audio-1.5` is currently inaccessible (403) � Premium audio uses `gpt-audio-mini` until access is restored.
5. When any limit is reached, the server **must end the conversation** with an exact stop reason and exact next-action instruction.
6. After a forced stop, the user is told one of: start a new conversation (if resources remain), upgrade plan (if applicable), or contact support.
7. **Plan cards must show ? for unavailable options** (not "0"). E.g., "? Audio generations per month" instead of "0 audio generations per month".
8. **Currency symbol must be admin-configurable.** Default: `$` (USD). Supported: `$` (USD), `�` (EUR). Resolved via `getEffectiveCurrencySymbol()` with `AppSetting("admin.currencySymbol")`. All price rendering must use dynamic currency symbol � no hardcoded `$` in rendering code.

### Lite Plan Limits (Detailed)

| Limit                         | Value | Reset Window          |
| ----------------------------- | ----- | --------------------- |
| Conversations per day         | 5     | 24 hours              |
| User prompts per conversation | 10    | Per conversation      |
| Image generations             | 3     | 30-day rolling window |
| Audio generations             | 3     | 30-day rolling window |
| Video generations             | 1     | 30-day rolling window |

### Pro Plan Limits (Detailed)

| Limit                         | Value | Reset Window          |
| ----------------------------- | ----- | --------------------- |
| Conversations per day         | 50    | 24 hours              |
| User prompts per conversation | 100   | Per conversation      |
| Image generations             | 50    | 30-day rolling window |
| Audio generations             | 50    | 30-day rolling window |
| Video generations             | 10    | 30-day rolling window |

### Premium Plan Limits (Detailed)

| Limit                         | Value     | Reset Window |
| ----------------------------- | --------- | ------------ |
| Conversations per day         | Unlimited | N/A          |
| User prompts per conversation | Unlimited | N/A          |
| Image generations             | Unlimited | N/A          |
| Audio generations             | Unlimited | N/A          |
| Video generations             | Unlimited | N/A          |

### Plan Lifecycle

1. New users start on **Lite** (permanent, no expiry).
2. Upgrade via Stripe Checkout (one-time payment per billing cycle).
3. On successful `checkout.session.completed` webhook, the user's plan and expiration are updated.
4. Expired paid plans revert to Lite behavior (checked in `/api/openai` route).
5. No auto-renewal � plans are one-time payments with set expiration dates for paid tiers.

### Usage Limit Enforcement

- Plan limits stored as constants in `PLAN_LIMITS`.
- Daily conversation count tracked via durable counter on User model (`dailyConversationsStarted` + `dailyConversationWindowStart`). Counter is incremented on conversation creation and **never decremented** by task deletion. Resets at UTC midnight. Check and increment are now a **single atomic** `findOneAndUpdate` operation via `claimDailyConversationSlot()` � TOCTOU race resolved (Phase 28.1).
- Per-conversation prompt count tracked on `Task.promptCount` field (initialized on creation, incremented atomically via `findOneAndUpdate` with `$lt` guard � no race window).
- Conversation storage tracked via `Task.estimatedBytes` field (12MB threshold, 4MB buffer before MongoDB 16MB limit).
- Media generation counters on User model plan subdoc.
- `claimDailyConversationSlot()` utility atomically checks AND increments daily quota in a single MongoDB operation � replaces old separated check+increment.
- `/api/openai` route checks all limits before making OpenAI calls: daily limit (new conversations only, claimed BEFORE task creation), prompt limit, storage limit, media limit.
- When any limit is hit: conversation is stopped with `taskStatus: "ended"`, stop reason is recorded on Task, user receives next-action message.
- Unlimited plans (`-1` values in `PLAN_LIMITS`) always bypass limit checks.

### Conversation Stop Reasons

| Reason Code                          | Message to User                                                         | Next Action                                |
| ------------------------------------ | ----------------------------------------------------------------------- | ------------------------------------------ |
| `prompt_limit_reached`               | "You've reached the message limit for this conversation."               | `start_new_conversation` or `upgrade_plan` |
| `media_limit_reached`                | "You've reached your media generation limit." (legacy generic)          | `upgrade_plan` or `contact_support`        |
| `image_limit_reached`                | "You've reached your image generation limit for this billing period."   | `upgrade_plan` or `contact_support`        |
| `audio_limit_reached`                | "You've reached your audio generation limit for this billing period."   | `upgrade_plan` or `contact_support`        |
| `video_limit_reached`                | "You've reached your video generation limit for this billing period."   | `upgrade_plan` or `contact_support`        |
| `daily_conversation_limit_reached`   | "You've reached the daily conversation limit for your plan."            | `upgrade_plan` or `contact_support`        |
| `conversation_storage_limit_reached` | "This conversation has reached its storage limit."                      | `start_new_conversation`                   |
| `billing_state_invalid`              | "Your plan has expired."                                                | `upgrade_plan`                             |
| `trial_limit_reached`                | "You've reached the trial limit for this persona. Upgrade to continue." | `upgrade_plan`                             |

### Plan Technical Debt

- **TD-PLAN-01**: No recurring subscriptions (deferred v1).

---

## 5. Authentication & Authorization

- **Provider**: Clerk (`@clerk/nextjs` v7)
- **Route protection**: `src/proxy.tsx` (Next.js 16 proxy convention). No `middleware.ts`.
- **Protected routes (target)**: `/app(.*)`, `/admin(.*)`
- **Admin routes**: `/admin(.*)` � requires `sessionClaims.metadata.role === "admin"`
- **Server actions**: Must verify `auth()` before DB operations. Ownership enforcement on all read/write operations.
- **API routes**: Must verify `auth()` before processing.
- **Webhooks**: Exempt from auth � verified via `verifyWebhook()` from `@clerk/nextjs/webhooks` (Clerk) and `stripe.webhooks.constructEvent` (Stripe).

### Self-Healing User Sync Requirement

When an authenticated user (valid Clerk session) has no corresponding MongoDB User record, server components and API routes must not silently fail or show permanent loading states. The required behavior is:

1. Attempt to create the MongoDB user record on-demand using Clerk API data (self-healing).
2. If self-healing succeeds, continue normally with the newly created user.
3. If self-healing fails, show a clear error message with retry guidance and support contact � never a permanent loading spinner.
4. API routes must return HTTP 503 ("Account not yet provisioned") instead of silently degrading to Lite.

---

## 6. Data Models

### 6.1 User

| Field      | Type            | Required | Index  | Notes                       |
| ---------- | --------------- | -------- | ------ | --------------------------- |
| clerkId    | String          | Yes      | unique | Clerk user ID               |
| username   | String          | Yes      | unique |                             |
| email      | String          | Yes      | Yes    | Indexed for admin search    |
| role       | String (enum)   | Yes      | No     | `"client"` or `"admin"`     |
| registerAt | Date            | Yes      | No     |                             |
| plan       | Embedded subdoc | Yes      | No     | See Plan embedded schema    |
| firstName  | String          | No       | No     |                             |
| lastName   | String          | No       | No     |                             |
| updatedAt  | Date            | No       | No     |                             |
| userimg    | String          | No       | No     |                             |
| suspended  | Boolean         | No       | No     | Admin-controlled suspension |

**Plan subdoc**: `{ id, name, amount, billing, startedOn, expiresOn, stripeId, imageGenerations, audioGenerations, usagePeriodStart }`

### 6.2 Transaction

| Field     | Type                | Required | Index  | Notes             |
| --------- | ------------------- | -------- | ------ | ----------------- |
| userId    | ObjectId (ref User) | Yes      | Yes    | Indexed           |
| stripeId  | String              | Yes      | unique | Stripe session ID |
| clerkId   | String              | Yes      | Yes    | Indexed           |
| createdAt | Date                | Yes      | No     |                   |
| expiresOn | Date                | Yes      | No     |                   |
| plan      | String (enum)       | Yes      | No     |                   |
| billing   | String (enum)       | Yes      | No     |                   |
| amount    | Number              | Yes      | No     |                   |

### 6.3 Task

| Field          | Type             | Required | Index | Notes                                  |
| -------------- | ---------------- | -------- | ----- | -------------------------------------- |
| userId         | String           | Yes      | Yes   | Indexed, compound index with updatedAt |
| title          | String           | Yes      | No    |                                        |
| messages       | [Message] subdoc | Yes      | No    | Array of messages                      |
| personaId      | String           | Yes      | Yes   | Indexed, defaults to "strategist"      |
| usage          | Number           | Yes      | No    | Token usage counter                    |
| promptCount    | Number           | Yes      | No    | User prompt counter (default 0)        |
| mediaCount     | Number           | Yes      | No    | Media generation counter (default 0)   |
| estimatedBytes | Number           | Yes      | No    | Conversation size estimate (default 0) |
| status         | String (enum)    | Yes      | No    | `active` / `ended` (default `active`)  |
| endedAt        | Date             | No       | No    | When conversation stopped              |
| endedReason    | String           | No       | No    | Stop reason code                       |
| endAction      | String           | No       | No    | Next action for user                   |
| createdAt      | Date             | No       | No    |                                        |
| updatedAt      | Date             | No       | Yes   | Indexed descending                     |

Compound index: `{ userId: 1, updatedAt: -1 }`

### 6.4 UsageEvent

Purpose: Request-level usage logging for cost tracking and admin analytics.

| Field         | Type    | Required | Index | Notes                                          |
| ------------- | ------- | -------- | ----- | ---------------------------------------------- |
| userId        | String  | Yes      | Yes   | User who made the request                      |
| taskId        | String  | Yes      | Yes   | Conversation this event belongs to             |
| personaId     | String  | Yes      | Yes   | Persona used                                   |
| model         | String  | Yes      | Yes   | AI model used                                  |
| provider      | String  | Yes      | No    | Provider (e.g., `openai`)                      |
| requestType   | String  | Yes      | Yes   | `chat` / `image` / `audio` / `video` / `title` |
| tokensIn      | Number  | No       | No    | Input tokens                                   |
| tokensOut     | Number  | No       | No    | Output tokens                                  |
| estimatedCost | Number  | No       | No    | Estimated cost in USD cents                    |
| latencyMs     | Number  | No       | No    | Request latency                                |
| blocked       | Boolean | Yes      | No    | Whether request was blocked by limits          |
| blockedReason | String  | No       | No    | Reason code if blocked                         |
| createdAt     | Date    | Yes      | Yes   | Indexed for time-range queries                 |

### 6.5 AppSetting

| Field     | Type   | Required | Index  | Notes                                                          |
| --------- | ------ | -------- | ------ | -------------------------------------------------------------- |
| key       | String | Yes      | unique | Setting identifier                                             |
| value     | Mixed  | Yes      | No     | Setting value (JSON-compatible)                                |
| category  | String | Yes      | Yes    | `plans` / `models` / `theme` / `limits` / `trial` / `features` |
| updatedAt | Date   | Yes      | No     |                                                                |
| updatedBy | String | Yes      | No     | Admin clerkId who last changed                                 |

### 6.6 PublicPage

| Field       | Type    | Required | Index  | Notes                        |
| ----------- | ------- | -------- | ------ | ---------------------------- |
| slug        | String  | Yes      | unique | URL slug (e.g., `about`)     |
| title       | String  | Yes      | No     |                              |
| content     | String  | Yes      | No     | HTML content (Tiptap output) |
| sortOrder   | Number  | Yes      | No     | Display order                |
| isPublished | Boolean | Yes      | No     | Publish state                |
| createdAt   | Date    | Yes      | No     |                              |
| updatedAt   | Date    | Yes      | No     |                              |
| updatedBy   | String  | Yes      | No     | Admin clerkId                |

### 6.7 AdminAuditLog

| Field      | Type   | Required | Index | Notes                          |
| ---------- | ------ | -------- | ----- | ------------------------------ |
| adminId    | String | Yes      | Yes   | Admin clerkId                  |
| action     | String | Yes      | Yes   | Action performed               |
| targetType | String | Yes      | No    | Entity type                    |
| targetId   | String | Yes      | No    | Entity ID                      |
| details    | Mixed  | No       | No    | Additional context             |
| createdAt  | Date   | Yes      | Yes   | Indexed for time-range queries |

### 6.8 RateLimitEntry

| Field     | Type     | Required | Index  | Notes                          |
| --------- | -------- | -------- | ------ | ------------------------------ |
| key       | String   | Yes      | unique | User/route identifier          |
| requests  | [Object] | Yes      | No     | Sliding window request entries |
| expireAt  | Date     | Yes      | TTL    | TTL index for auto-cleanup     |
| createdAt | Date     | Yes      | No     | Mongoose timestamps            |
| updatedAt | Date     | Yes      | No     | Mongoose timestamps            |

---

## 7. API Routes

### 7.1 POST /api/openai

- Auth: Required (Clerk `auth()`)
- Rate limiting: 20 requests / 60s per user (MongoDB-backed persistent sliding window via `RateLimitEntry` with TTL index)
- Plan expiration check: Blocks expired paid plans; Lite never expires
- Entitlement resolution: Checks plan-level persona access and media capabilities
- Usage limit enforcement: All limits checked before OpenAI calls
- Conversation stop enforcement: Ends conversation with stop reason on limit hit
- Creates/updates Task documents
- Calls plan-appropriate AI models
- Server-side task complexity classification via `classifyTaskComplexity()` for automatic model routing
- Uses tool calling for media generation dispatch
- Emits `UsageEvent` for every request
- Error classification: Maps OpenAI APIError to structured types
- **Implemented**: Streaming responses via SSE (`text/event-stream`) with `meta`, `chunk`, `final`, `error` events
- Non-streaming JSON fallback preserved for backward compatibility

### 7.2 POST /api/upload

- Auth: Required
- Validates file type (JPEG, PNG, WebP, GIF) and size (5MB max)
- Uploads to AWS S3 under `{userId}/uploads/`

### 7.3 GET /api/download

- Auth: Required
- SSRF protection via URL allowlist
- Proxies image download

### 7.4 POST/DELETE /api/aws

- Auth: Required
- POST: Uploads base64-encoded image buffer to S3 (10MB limit)
- DELETE: Removes object from S3 with ownership verification

### 7.5 POST /api/webhooks/clerk

- Auth: `verifyWebhook()` from `@clerk/nextjs/webhooks` using Clerk's signing secret
- Handles: `user.created`, `user.updated`, `user.deleted`
- **Idempotency**: `user.created` checks for existing user before insert (safe for Clerk event replay). `user.updated` and `user.deleted` handle missing documents gracefully (return 200, no throw).
- On `user.deleted`: deletes User, Transaction, and Task documents; cleans up S3 objects under user prefix
- Each cleanup step has independent error handling � partial failure does not break webhook response
- Verification failures are logged server-side and return a generic 400 response to Clerk

### 7.6 POST /api/webhooks/stripe

- Auth: `stripe.webhooks.constructEvent` verification
- Handles: `checkout.session.completed`
- Idempotency check on `Transaction.stripeId`
- Resets usage counters on plan renewal

---

## 8. OpenAI Integration & Model Policy

### 8.1 Model Policy Architecture

The model policy system controls which OpenAI model is used for every AI request. Three governing principles:

1. **Plan sets the maximum allowed tier** � not the exact model. The plan defines the model ceiling.
2. **Feature type sets the default** � utility tasks (titles) always use the cheapest model regardless of plan.
3. **Backend decides the final model** � budget state, latency, retry attempts, and task class trigger automatic downgrades. The frontend must never send the final model ID.

Central resolver: `resolveModelPolicy()` in `src/lib/utils/ai-model-policy.ts`. **Implementation complete (Phase 21).** All OpenAI utilities (`generateTitle`, `generateImage`, `generateAudio`, `generateResponse`) consume the resolver � no hardcoded model names. Message token management via `compactMessagesToTokenLimit()` in `src/lib/utils/openai/message-policy.ts`.

### 8.2 Model Policy Matrix

| Feature          | Plan    | Default Model      | Fallback Model                 | Cost-Control Notes                                                                                                                                             |
| ---------------- | ------- | ------------------ | ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Title generation | All     | `gpt-4.1-nano`     | `gpt-4o-mini`                  | Hard cap: 1,200 input tokens, 20 output tokens. Always cheapest model regardless of plan.                                                                      |
| Chat             | Lite    | `gpt-4o-mini`      | `gpt-4.1-nano`                 | Strict context compaction; max output tokens per reply; no expensive tools; block retries beyond one.                                                          |
| Chat             | Pro     | `gpt-4.1`          | `gpt-4o-mini`                  | Degrade to fallback on soft budget, high latency, simple tasks, or retries.                                                                                    |
| Chat             | Premium | `gpt-4.1`          | `gpt-4o-mini` / `gpt-4.1-mini` | Default `gpt-4.1` for routine chat. `gpt-5.4` only for complex with `explicitPremium`. Simple/standard fall to `gpt-4o-mini`; complex falls to `gpt-4.1-mini`. |
| Image            | Lite    | `gpt-image-1-mini` | _(none)_                       | One model only. Limit size, count, concurrency. Monthly quota enforced.                                                                                        |
| Image            | Pro     | `gpt-image-1.5`    | `gpt-image-1-mini`             | Downgrade for retries, previews, or users beyond soft budget.                                                                                                  |
| Image            | Premium | `gpt-image-1.5`    | `gpt-image-1-mini`             | Same model tiers as Pro; Premium gets unlimited quota.                                                                                                         |
| Audio            | Lite    | `gpt-4o-mini-tts`  | _(none)_                       | TTS only (no `audio_in_out`). Monthly quota: 3. Cheapest audio model for budget tier.                                                                          |
| Audio            | Pro     | `gpt-audio-mini`   | `gpt-4o-mini-tts`              | TTS-only fallback. Do NOT use TTS fallback for `audio_in_out` mode.                                                                                            |
| Audio            | Premium | `gpt-audio-mini`   | `gpt-4o-mini-tts`              | `gpt-audio-1.5` inaccessible (403) in current OpenAI project � verified live 2026-03-16. Using `gpt-audio-mini` until access restored.                         |
| Video            | Lite    | `sora-2`           | _(none)_                       | Monthly quota: 1. Budget tier � differentiated by quantity only.                                                                                               |
| Video            | Pro     | `sora-2`           | _(none)_                       | Monthly quota: 10. Differentiated by quantity only.                                                                                                            |
| Video            | Premium | `sora-2-pro`       | `sora-2`                       | `sora-2` for previews/drafts. `sora-2-pro` only for final renders with `explicitPremium`.                                                                      |

### 8.3 Task Classes

Each AI request is classified into a task class that affects model selection and token limits.

| Task Class | Purpose                   | Default For                            |
| ---------- | ------------------------- | -------------------------------------- |
| `utility`  | Metadata, always cheapest | `title_generation`                     |
| `simple`   | Basic/general questions   | �                                      |
| `standard` | Normal conversation turns | `chat`                                 |
| `complex`  | Deep reasoning, analysis  | �                                      |
| `preview`  | Draft/preview generation  | `video_generation`                     |
| `final`    | Final quality render      | `image_generation`, `audio_generation` |

**Implementation (Phase 25.4):** Chat requests are classified server-side by `classifyTaskComplexity()` in `src/lib/utils/openai/classify-task-complexity.ts`. The classifier uses heuristics: message length, conversation history depth, analytical/technical keyword presence, and explicit deep-analysis intent (regex pattern). Returns `ChatTaskClass` (`simple` | `standard` | `complex`). The `/api/openai` route passes the classified `taskClass` to `resolveModelPolicy()`. Frontend does not send `taskClass` � all classification is backend-only.

### 8.4 Token Limits by Plan and Task Class

| Feature | Plan    | Task Class | Max Input Tokens | Max Output Tokens |
| ------- | ------- | ---------- | ---------------- | ----------------- |
| Title   | All     | utility    | 1,200            | 20                |
| Chat    | Lite    | simple     | 8,000            | 600               |
| Chat    | Lite    | standard   | 12,000           | 900               |
| Chat    | Lite    | complex    | 14,000           | 1,200             |
| Chat    | Pro     | simple     | 12,000           | 700               |
| Chat    | Pro     | standard   | 24,000           | 1,400             |
| Chat    | Pro     | complex    | 32,000           | 2,000             |
| Chat    | Premium | simple     | 16,000           | 900               |
| Chat    | Premium | standard   | 32,000           | 1,800             |
| Chat    | Premium | complex    | 48,000           | 2,800             |

### 8.5 Downgrade Triggers

The resolver downgrades to the fallback model when any condition is met:

1. **Hard limit reached** (`hard_limit_reached`) � block the request entirely.
2. **Soft limit reached** (`soft_limit_reached`) � use fallback model.
3. **High latency** � use fallback model.
4. **Retry attempt** (`retryAttempt > 0`) � use fallback model.
5. **Audio mode mismatch** � do not use TTS-only fallback (`gpt-4o-mini-tts`) for `audio_in_out` requests.

Retries should almost always go down a tier, not sideways or up.

### 8.6 Audio Mode Differentiation

Audio features must be split internally:

- **TTS mode** (`tts`): plain text-to-speech. Cheaper model path (e.g., `gpt-4o-mini-tts`).
- **Audio in/out mode** (`audio_in_out`): rich audio conversation. Uses full audio model.

TTS fallbacks must NOT be used for `audio_in_out` requests. The resolver must check `audioMode` before allowing TTS fallback.

### 8.7 Hard Non-Negotiables

1. Frontend must never send the final model ID as authority.
2. Backend resolves model from plan + feature + task class + cost state.
3. Titles are permanently pinned to `gpt-4.1-nano`.
4. Premium access means eligibility, not "every request gets the most expensive model."
5. Retries should go down a tier, not sideways or up.
6. `gpt-5.4` is reserved for complex/premium-explicit requests only � Premium chat defaults to `gpt-4.1`.

### 8.8 Resolver Types (Reference)

```typescript
type PlanTier = "lite" | "pro" | "premium";

type FeatureType =
  | "title_generation"
  | "chat"
  | "image_generation"
  | "audio_generation"
  | "video_generation";

type TaskClass =
  | "utility"
  | "simple"
  | "standard"
  | "complex"
  | "preview"
  | "final";
type AudioMode = "tts" | "audio_in_out";
type BudgetState = "normal" | "soft_limit_reached" | "hard_limit_reached";

type ResolveModelInput = {
  plan: PlanTier;
  feature: FeatureType;
  taskClass?: TaskClass;
  budgetState?: BudgetState;
  retryAttempt?: number;
  highLatency?: boolean;
  explicitPremium?: boolean;
  audioMode?: AudioMode;
};

type ResolvedModelPolicy = {
  model: string;
  fallbackModel?: string;
  feature: FeatureType;
  plan: PlanTier;
  taskClass: TaskClass;
  maxInputTokens?: number;
  maxOutputTokens?: number;
  wasDowngraded: boolean;
  downgradeReasons: string[];
  hardBlocked: boolean;
  isTtsOnly: boolean;
  notes?: string;
};
```

### 8.9 Streaming (Implemented)

Server-side streaming via `generateStreamingResponse()` in `src/lib/utils/openai/generateResponse.tsx`.
Route streams via SSE events (`meta`, `chunk`, `final`, `error`) in `/api/openai`.
Client consumes via `ReadableStream.getReader()` in `chat-wrapper.tsx` with JSON fallback for non-streaming clients.
All auth/limit checks execute before streaming begins. Final task persistence and usage event emission happen after stream completion.

### OpenAI Technical Debt

- **TD-AI-08**: Video generation IMPLEMENTED (Phase 34, COMPLETED 2026-03-17). Phase 34.9 quality fixes COMPLETED. Sora API (`sora-2`, `sora-2-pro`) operational. Full tool chain delivered. `supportsVideoGeneration` is `true`.
- **TD-AI-09**: Image/audio generation prompts not yet persona-aware. Chat prompts are fully persona-aware (Phase 22). Tracked as Phase 26.1.
- **TD-AI-13**: 5 model pricing entries in `ai-model-policy.ts` are placeholders pending OpenAI confirmation (`gpt-audio-mini`, `gpt-audio-1.5`, `gpt-4o-mini-tts`, `sora-2`, `sora-2-pro`).
- **TD-AI-18** (advisory): OpenAI route `errorMessage` forwarding pattern is safe today but fragile — if any future code sets `aiPayload.errorMessage` to a raw OpenAI error, it will leak to clients. Consider always using generic constants.
- **TD-AI-25**: ~~Persona system prompts had zero video generation awareness~~ — **RESOLVED (Phase 51.1)**: `CHAT_PLATFORM_PROMPT` updated to include explicit media-tool awareness (images, audio, video). Model now knows it can invoke `getGeneratedVideo` tool.

---

## 9. File Handling

All file handling technical debt has been resolved. S3 cleanup on task/user deletion, FormData uploads, and blob previews are all operational.

---

## 10. Security Posture

### Strengths

- Clerk proxy-based route protection with admin role check
- Webhook signature verification with idempotency
- File upload/download validation with allowlists
- Auth + ownership enforcement on all operations
- Mongoose `strict: true`, `upsert: false`
- Generic error messages to clients

### Requirements

- Admin mutations must produce audit trail entries
- Users can only access their own data
- Admin role enforced at proxy AND server-side levels

---

## 11. Frontend Architecture

### Route Map (Target)

| Route                                 | Type      | Description                                                                                           |
| ------------------------------------- | --------- | ----------------------------------------------------------------------------------------------------- |
| `/`                                   | Public    | Landing (Hero + product sections + CTAs)                                                              |
| `/about`                              | Public    | How app works (stacked sections)                                                                      |
| `/plans`                              | Public    | Pricing (plan cards)                                                                                  |
| `/personas`                           | Public    | Personas showcase                                                                                     |
| `/privacy`                            | Public    | Privacy & Cookie Policy                                                                               |
| `/cookies`                            | Public    | Cookie Policy                                                                                         |
| `/terms`                              | Public    | Terms & Conditions                                                                                    |
| `/sign-in`, `/sign-up`                | Auth      | Clerk auth                                                                                            |
| `/app`                                | Protected | Chat dashboard                                                                                        |
| `/app/new`                            | Protected | New conversation                                                                                      |
| `/app/library`                        | Protected | Media library (tabs: Chats, Images, Audios, Videos) � **Implemented (Phase 32.3 + 32.4 media cards)** |
| `/app/personas`                       | Protected | In-app personas                                                                                       |
| `/app/c/[conversationId]`             | Protected | Resume conversation                                                                                   |
| `/app/profile`                        | Protected | User profile + plan + history                                                                         |
| `/app/plans`                          | Protected | Plan upgrade + checkout                                                                               |
| `/admin`                              | Admin     | Dashboard overview                                                                                    |
| `/admin/users`                        | Admin     | User management list                                                                                  |
| `/admin/users/[userId]`               | Admin     | User detail + actions                                                                                 |
| `/admin/transactions`                 | Admin     | Transaction management                                                                                |
| `/admin/transactions/[transactionId]` | Admin     | Transaction detail                                                                                    |
| `/admin/usage`                        | Admin     | Usage analytics                                                                                       |
| `/admin/settings`                     | Admin     | App settings                                                                                          |
| `/admin/website`                      | Admin     | Content management                                                                                    |
| `/admin/website/[pageId]`             | Admin     | Page editor (textarea fallback � Tiptap replaced)                                                     |

### Public Pages Content

- **`/`**: Hero + product sections + CTAs. Not just another chatbot.
- **`/about`**: How app works. Stacked sections with text + image.
- **`/plans`**: Plan cards (public pricing) + FAQ accordion.
- **`/privacy`**, **`/cookies`**, **`/terms`**: Real legal content, adapted for Droplet.

### Design System

- Tailwind CSS v4.2 with custom design tokens
- Custom fonts: Dosis + Albert Sans
- Dark/light themes via `data-Droplet-theme` attribute
- Bootstrap Icons

#### Brand Color Palette (Milestone 22 — IMPLEMENTED Phase 64; Milestone 23 — Lime Green accent PENDING Phase 68)

| Token Name       | Base Hex  | Role                                     | Status                                   |
| ---------------- | --------- | ---------------------------------------- | ---------------------------------------- |
| `nightIndigo`    | `#1B003F` | Dark theme background                    | Implemented                              |
| `twilightPurple` | `#4B0082` | Structural accent (non-button contexts)  | Implemented                              |
| `midnightBlue`   | `#191970` | Light theme text                         | Implemented                              |
| `lavenderHaze`   | `#E6E6FA` | Light theme background + dark theme text | Implemented                              |
| `dustyBlue`      | `#6495ED` | Structural accent (non-button contexts)  | Implemented                              |
| `limeGreen`      | `#D9F20C` | **Accent color** (buttons, CTAs)         | Implemented (Phase 68, updated Phase 82) |

**Light Theme:** Text (Primary) = `midnightBlue-500`, Background (Secondary) = `lavenderHaze-500`.

**Dark Theme:** Text (Primary) = `lavenderHaze-500`, Background (Secondary) = `nightIndigo-700`.

#### Button Style Definitions (IMPLEMENTED Phase 68 — Correction Phase 68.4 pending)

All button styles use Lime Green as the accent color in **both** light and dark themes:

| Class            | Property   | Default State       | Hover State         |
| ---------------- | ---------- | ------------------- | ------------------- |
| `.btn-text`      | Color      | Lime Green (500)    | Lime Green (800)    |
| `.btn-outlined`  | Text       | Lime Green (500)    | Lime Green (800)    |
| `.btn-outlined`  | Border     | Lime Green (500)    | Lime Green (800)    |
| `.btn-outlined`  | Background | Transparent         | Transparent         |
| `.btn-contained` | Text       | Midnight Blue (500) | Midnight Blue (500) |
| `.btn-contained` | Border     | Lime Green (500)    | Lime Green (800)    |
| `.btn-contained` | Background | Lime Green (500)    | Lime Green (800)    |
| `.icon-btn`      | —          | **UNCHANGED**       | **UNCHANGED**       |

> **CORRECTION (PM audit #34):** `.btn-contained` text is Midnight Blue (500), NOT Lavender Haze. Both default and hover use Midnight Blue (500). `.btn-text` hover is Lime Green (800), not 500. Phase 68.4 tracks this fix.

> **Note:** Lime Green supersedes Twilight Purple (light) and Dusty Blue (dark) for button styling. Those tokens remain in the palette for non-button structural uses.

**Borders:** TailwindCSS `slate` palette (unchanged from Milestone 21).

**Previous palette (Milestone 21, superseded):** Navy (#0D3B66), Lemon (#FAF0CA), Grass (#27A148) — replaced. Semantic tokens `lightBackground`, `darkBackground`, `lightText`, `darkText` → removed. New tokens use brand palette names directly.

---

## 12. Admin Dashboard (Target)

### Capabilities (admin role only)

- **Users**: List, view, add, suspend, remove. User detail page with info + usage per model.
- **Transactions**: List, view, suspend, decline. Transaction detail page.
- **Usage**: Model usage, costs per user/time/provider. **Top Personas** statistic card showing top 5 personas by usage count with labels and percentages. Powered by UsageEvent aggregation. (Implemented � Phase 36.2)
- **Settings**: AI model per plan, pricing, limits, theme. Proper form controls (selects, number inputs, radios � no raw JSON editors). **Persona Access**: per-plan persona access checkbox matrix � admin can toggle each persona's full access per plan. Saves to AppSetting, consumed at runtime by `resolveEntitlements()` via `getEffectivePersonaAccessByPlan()` (Phase 30.4 � operational). **Pricing/Limits/Model propagation**: all admin settings consumed at runtime via `getEffectivePlanConfig()` and `getEffectiveModelConfig()` (Phase 27.5 � operational). Powered by AppSetting. **TD-ADMIN-02 fully resolved.**
- **Website**: Add, edit, remove, sort, publish/unpublish public pages. Textarea-based editor (Tiptap replaced with fallback). Powered by PublicPage.
- All mutations logged to AdminAuditLog.
- Admin panel design aligned with client app design system (Phase 36.1 � consistent borders, backgrounds, backdrop tokens, fonts).

### Navigation (Authenticated App)

- **Sidebar**: Chat Dashboard, New Conversation, recent conversation history. No Library, Personas, Plans, or Profile links (moved to AvatarMenu � Phase 38.4).
- **AvatarMenu** (header): Dashboard (admin only) ? Library ? Personas ? Plans ? Profile ? Logout.
- **ChatHeader**: Present on all `/app/*` pages. Contains sidebar toggle (left), persona dropdown selector, conversation info (persona label, message count, ended badge).

---

## 13. Testing

- **Unit tests**: 83 suites, 537 tests (Vitest) — organized by domain in `tests/unit/{actions,components,routes,utils,models,constants,stores}/`. TDD rebuild IN PROGRESS (Phase 120). Phase 120.1 COMPLETE (TDD infrastructure). Phase 120.2 COMPLETE — all ~40 utility test files rebuilt from scratch with zero `as never`. Phase 120.3 COMPLETE — all 4 server action test files rebuilt (TDD). Phase 128.1 COMPLETE (shared Button component + TDD tests). Phase 128.2 COMPLETE (Button migration). Phase 106 COMPLETE (shared ChatApiResponse types). Phase 129 COMPLETE (PageHead heading-level TDD test). Includes streaming, webhook, chat-wrapper, chat-body stop-state, upload flow, S3 cleanup, idempotency, model policy, retry/backoff, persona prompt, rate limiting, task complexity classification, conversation stop enforcement, entitlement resolver, checkout-success page, admin audit trail, OpenAI route tests, atomic prompt limit, daily conversation limit, media error handling, universal feature access, trial access tests, video generation, validation schema security injection tests, AudioPlayer ARIA tests, abort behavior tests, Zustand store tests, upload file size validation, component tests for confirmation-modal/plan-card/persona-card/checkout-form/button/page-head, user model tests. Shared test factories in `tests/unit/test-support/` (Phase 94.5 + 120.1). **100 `as never` casts remain in 12 non-rebuilt test files (routes/components/constants)** — will be eliminated as each file is rebuilt per TDD methodology (Phases 120.4–120.5).
- **E2E tests**: 14 Playwright spec files. 108 passed, 25 skipped, 0 failed. Default 3 browsers (Chromium, Firefox, WebKit); full 7-browser matrix via `PLAYWRIGHT_FULL_MATRIX=1`. Specs: accessibility (Phase 97.1), auth-boundaries, public-pages (incl. checkout-success redirect Phase 113.2), error-handling, chat-app-shell, conversation-lifecycle, user-profile, admin-users, admin-features, admin-bulk-actions, plans-public, authenticated-flows, persona-trial-access, live-image-generation. 25 skips are intentional: credential-gated tests without E2E env vars + Chromium-only tests on Firefox/WebKit. All E2E assertions are structural (no hardcoded prices/copy — Phase 95). WCAG E2E via @axe-core/playwright scanning all 7 public routes — all WCAG violations fixed (Phase 103.1–103.4), known violations list reduced to zero.
- **Coverage**: v8 provider, thresholds: 76% statements / 65% branches / 79% functions / 76% lines. Actual: ~85/~72/~89/~85. Gate PASSES. Reporters: text, json-summary, lcov. Setup file: `tests/unit/vitest.setup.ts` (global mock cleanup).
- **Config**: Vitest `environmentMatchGlobs` for auto-jsdom on `.tsx`. Playwright `actionTimeout: 10s`, `expect.timeout: 5s`. ESLint `no-console` (error), `no-restricted-globals` (alert/confirm). TS `noFallthroughCasesInSwitch`, `forceConsistentCasingInFileNames`. All 7 validation gates GREEN (lint, knip, tsc, unit, E2E, build, prettier).
- **Gaps**: No E2E for Stripe checkout flow. No admin action behavioral tests. No E2E for user deletion cascade. Branch coverage ~72% is lowest metric — worst files: chat-body.tsx, admin-queries.ts, admin.actions.tsx. 51 of 69 components have zero test files. 100 `as never` casts in 12 non-rebuilt tests (tracked for elimination). **Phase 120 is primary work directive: full TDD test rebuild from scratch** (owner mandate). Phase 120.2 utility rebuild COMPLETE. Phase 120.3 action tests COMPLETE. Phase 128.2 Button migration COMPLETE. Phase 106 shared types COMPLETE. Next: Phase 120.4 (route test TDD rebuild). TD-SEC-10 RESOLVED (Phase 113.1). TD-SEC-11 RESOLVED (Phase 113.2). TD-SEC-12 RESOLVED (Phase 121). Phase 129 COMPLETE (PageHead heading-level + E2E locator).

---

## 14. Environment Variables

| Variable                            | Purpose                                                                                 |
| ----------------------------------- | --------------------------------------------------------------------------------------- |
| `MONGODB_URL`                       | MongoDB connection string                                                               |
| `MONGODB_URL_FALLBACK`              | Optional non-SRV MongoDB URI used when SRV DNS resolution fails in local environments   |
| `MONGODB_DB_NAME`                   | MongoDB database name                                                                   |
| `NEXT_PUBLIC_API_BASE_URL`          | App base URL                                                                            |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk public key                                                                        |
| `CLERK_SECRET_KEY`                  | Clerk secret                                                                            |
| `CLERK_WEBHOOK_SIGNING_SECRET`      | Clerk webhook signing secret used by `verifyWebhook()`                                  |
| `OPENAI_ORG`                        | OpenAI organization                                                                     |
| `OPENAI_PRJ`                        | OpenAI project                                                                          |
| `OPENAI_KEY`                        | OpenAI API key                                                                          |
| `STRIPE_SECRET_KEY`                 | Stripe secret                                                                           |
| `STRIPE_WEBHOOK_SECRET`             | Stripe webhook verification                                                             |
| `AWS_S3_REGION`                     | S3 region                                                                               |
| `AWS_S3_BUCKET`                     | S3 bucket name                                                                          |
| `AWS_S3_ACCESS_ID`                  | S3 access key                                                                           |
| `AWS_S3_SECRET_KEY`                 | S3 secret key                                                                           |
| `DOWNLOAD_URL_ALLOWLIST`            | Allowed download hosts (opt.)                                                           |
| `NEXT_ALLOWED_DEV_ORIGINS`          | Comma-separated dev origins for local/LAN dev (opt., defaults to `localhost,127.0.0.1`) |

`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, and `CLERK_WEBHOOK_SIGNING_SECRET` must all come from the same Clerk instance.

---

## 15. Technical Debt Summary

> Only unresolved items live here. All resolved TDs are archived in `DONE.md`.
> Last updated: PM audit #59 (2026-03-24).

### Active — HIGH Priority

| ID             | Area    | Description                                                                                                                                                                                                                                          | Phase |
| -------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| TD-HARDCODE-01 | Content | Stop reason messages in `src/constants/stop-reasons.ts` are hardcoded user-facing copy. Must be admin-configurable via `effective-*` pattern.                                                                                                        | 107   |
| TD-TEST-03     | Test    | Full TDD test rebuild from scratch required (Owner directive). 203 `as never` casts remain in 17 non-rebuilt files (actions/routes/components/constants), ~20+ components untested. Phase 120.2 utility rebuild COMPLETE. Coverage: ~85/~72/~89/~85. | 120   |

### Active — MEDIUM Priority

| ID          | Area | Description                                                                                                                                                                                            | Phase |
| ----------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----- |
| TD-REUSE-04 | Code | ~~`ChatApiResponse` interface defined identically in `src/app/api/openai/route.tsx` and `src/components/chat/chat-wrapper.tsx`.~~ **RESOLVED (Phase 106).** Shared types in `src/types/chat-api.d.ts`. | 106   |
| TD-WCAG-05  | A11y | Library tabs and admin settings tabs have `role="tablist"` but no arrow-key navigation. WCAG tablist pattern requires Left/Right arrow key focus movement. Phase 108.                                  | 108   |
| TD-WCAG-07  | A11y | `AvatarMenu` dropdown lacks keyboard navigation: no Escape handler, no Arrow key navigation, no `role="menu"`/`role="menuitem"`. Phase 114.                                                            | 114   |
| TD-TEST-02  | Test | `openai-route.test.ts` retains IO boundary mocks (appropriate). Pure utilities un-mocked (Phase 96.2). Further refinement deferred to TDD rebuild (Phase 112.4).                                       | 112.4 |

### Active — Low Priority

| ID         | Area    | Description                                                                                                                                                            | Phase    |
| ---------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| TD-DB-01   | DB      | ~~`getAllTransactions()` in `transaction.action.tsx` missing `.select()` projection and `.limit()`.~~ **RESOLVED (Phase 125.2).** `.select()` and `.limit(100)` added. | 125.2    |
| TD-AI-09   | OpenAI  | Image/audio generation prompts not persona-aware (chat prompts done Phase 22).                                                                                         | 26.1     |
| TD-AI-13   | OpenAI  | 5 model pricing entries are placeholders pending OpenAI confirmation.                                                                                                  | Deferred |
| TD-PLAN-01 | Billing | No recurring subscriptions (deferred v1).                                                                                                                              | Deferred |
| TD-AI-18   | OpenAI  | errorMessage forwarding pattern in `/api/openai` is safe but fragile.                                                                                                  | Advisory |
| TD-API-09  | API     | `messageTextContentSchema` uses `.strict()` — may reject extra fields.                                                                                                 | Monitor  |

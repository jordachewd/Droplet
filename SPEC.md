# Droplet � Application Specification

> Canonical product and system specification for the Droplet AI assistant SaaS.
> This document is governed by **Droplet-PM** and must reflect approved direction only.
> Last updated: 2026-03-19 (PM audit #35. All Phases 1–71.2 complete (incl. 63.1–63.2, 61.1, 68.1–68.4, 69.1, 70.1–70.2, 71.1–71.2). Milestone 22 COMPLETE. Milestone 23 Block A COMPLETE. Node.js 20.20.1 verified. `/faqs` route removed — FAQs in `/plans`. TD-DS-07 RESOLVED (Phase 68.4). TD-ADMIN-15 RESOLVED (Phase 71.1–71.2). Active: TD-DS-04 (MEDIUM), TD-API-09 (LOW), TD-NODE-01 (HIGH, @types/node mismatch), TD-SEC-04 (HIGH, missing server-only guards). 379 unit tests (66 suites). Build passing.)

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
| **Premium** | $39   | Monthly       | `gpt-4.1` / `gpt-5.4` (complex) | Unlimited conversations, unlimited prompts, unlimited image + audio, 10 video/month            |

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

| Limit                         | Value     | Reset Window          |
| ----------------------------- | --------- | --------------------- |
| Conversations per day         | Unlimited | N/A                   |
| User prompts per conversation | Unlimited | N/A                   |
| Image generations             | Unlimited | N/A                   |
| Audio generations             | Unlimited | N/A                   |
| Video generations             | 10        | 30-day rolling window |

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

| Field     | Type   | Required | Index  | Notes                                                |
| --------- | ------ | -------- | ------ | ---------------------------------------------------- |
| key       | String | Yes      | unique | Setting identifier                                   |
| value     | Mixed  | Yes      | No     | Setting value (JSON-compatible)                      |
| category  | String | Yes      | Yes    | `plans` / `models` / `theme` / `limits` / `features` |
| updatedAt | Date   | Yes      | No     |                                                      |
| updatedBy | String | Yes      | No     | Admin clerkId who last changed                       |

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

| Token Name       | Base Hex  | Role                                     | Status                 |
| ---------------- | --------- | ---------------------------------------- | ---------------------- |
| `nightIndigo`    | `#1B003F` | Dark theme background                    | Implemented            |
| `twilightPurple` | `#4B0082` | Structural accent (non-button contexts)  | Implemented            |
| `midnightBlue`   | `#191970` | Light theme text                         | Implemented            |
| `lavenderHaze`   | `#E6E6FA` | Light theme background + dark theme text | Implemented            |
| `dustyBlue`      | `#6495ED` | Structural accent (non-button contexts)  | Implemented            |
| `limeGreen`      | `#B8F60D` | **Accent color** (buttons, CTAs)         | Implemented (Phase 68) |

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

- **Unit tests**: 65 suites, 374 tests (Vitest) — includes streaming, webhook, chat-wrapper, chat-body stop-state, upload flow, S3 cleanup, idempotency, model policy, retry/backoff, persona prompt, rate limiting, task complexity classification, conversation stop enforcement, entitlement resolver full coverage (including admin override tests), checkout-success page, admin audit trail, OpenAI route tests, atomic prompt limit, daily conversation limit, media error handling, universal feature access, trial access tests, effective model config, effective plan config, checkout price bypass regression, video generation.
- **E2E tests**: 13 Playwright spec files across browser projects (chat-app-shell, auth-boundaries, public-pages with 70+ tests, conversation-lifecycle, user-profile, admin-users, admin-features, landing-page, plans-public, pricing-public, authenticated-flows, persona-trial-access). 228 total. **165 passing, 5 failed (stale Clerk auth session + DB connectivity), 48 skipped** (explained: Chromium-only trial spec × 6 non-Chromium projects = 24 new skips, all intentional). Note: `pricing-public.spec.ts` is a duplicate of `plans-public.spec.ts` — to be removed (Phase 31.4).
- **Coverage**: Configured (Phase 24.1) — v8 provider, thresholds: 70% statements / 60% branches / 70% functions / 70% lines. Current: 82/71/88/82.
- **Gap**: No dedicated E2E spec for streamed chunk-by-chunk rendering (manually verified via Playwright MCP). Persona selector E2E (35.2) pending.

---

## 14. Environment Variables

| Variable                            | Purpose                                                                                 |
| ----------------------------------- | --------------------------------------------------------------------------------------- |
| `MONGODB_URL`                       | MongoDB connection string                                                               |
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

### ~~Active — Critical Priority~~ (All Resolved — Phase 51.1)

| ID       | Area   | Description                                                                                                                                                                                     | Severity              |
| -------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| TD-AI-25 | OpenAI | ~~Persona system prompts have zero video generation awareness~~ — **RESOLVED (Phase 51.1)**: `CHAT_PLATFORM_PROMPT` updated with media-tool awareness. Model now invokes video tool on request. | ~~Critical~~ Resolved |

### ~~Active � Critical Priority~~ (All Resolved)

| ID       | Area   | Description                                                                                                                 | Status   |
| -------- | ------ | --------------------------------------------------------------------------------------------------------------------------- | -------- |
| TD-AI-16 | OpenAI | ~~Image model IDs are placeholders~~ � **CLOSED: model IDs verified real (OpenAI docs)**                                    | Resolved |
| TD-AI-17 | OpenAI | ~~Audio model IDs are placeholders~~ � **CLOSED: model IDs verified real (OpenAI docs)**                                    | Resolved |
| TD-AI-21 | OpenAI | ~~Audio model IDs unverified~~ � **CLOSED: live-tested 2026-03-16. gpt-audio-mini ?, gpt-audio-1.5 ? (403). SPEC updated.** | Resolved |

### ~~Active � High Priority~~ (All Resolved)

_None._

### ~~Active � High Priority~~ (Resolved)

| ID          | Area   | Description                                                                                                                       | Status                                                                                                              |
| ----------- | ------ | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| TD-LIMIT-03 | Limits | ~~Daily conversation limit bypassed via task deletion~~ � `checkDailyConversationLimit` used `Task.countDocuments` (live count)   | **Resolved (Phase 27.1)** � durable counter `User.dailyConversationsStarted` replaces `Task.countDocuments`         |
| TD-LIMIT-04 | Limits | ~~Daily conversation limit off-by-one~~ � task created BEFORE `checkDailyConversationLimit` runs, creating effective limit of N-1 | **Resolved (Phase 27.1)** � check now happens BEFORE task creation in `/api/openai` route (L869 check, L917 create) |

### ~~Active — Medium Priority~~ (All Resolved)

| ID          | Area   | Description                                                                                                                                                                                                                                                                                                               | Status              |
| ----------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| TD-ADMIN-02 | Admin  | ~~Admin settings: pricing, limits, model config saved to AppSetting but not yet consumed by app behavior~~ — **RESOLVED (Phase 27.5)**: all admin settings (pricing, limits, models, persona access) now propagate to runtime via `effective-plan-config.ts`, `effective-model-config.ts`, `effective-persona-access.ts`. | ~~Medium~~ Resolved |
| TD-AI-08    | OpenAI | Video generation IMPLEMENTED (Phase 34 complete). Phase 34.9 quality fixes COMPLETE.                                                                                                                                                                                                                                      | ~~Medium~~ Resolved |

### Active � Low Priority

| ID         | Area    | Description                                                                   | Severity |
| ---------- | ------- | ----------------------------------------------------------------------------- | -------- |
| TD-AI-09   | OpenAI  | Image/audio generation prompts not persona-aware (chat prompts done Phase 22) | Low      |
| TD-AI-13   | OpenAI  | 5 model pricing entries are placeholders pending OpenAI confirmation          | Low      |
| TD-PLAN-01 | Billing | No recurring subscriptions (deferred v1)                                      | Low      |
| TD-AI-18   | OpenAI  | errorMessage forwarding pattern in /api/openai is safe but fragile (advisory) | Low      |

### Active — Critical Priority (PM Audit #31, Triple-Audit Confirmed) — ALL RESOLVED (PM Audit #32)

| ID          | Area | Description                                                                                                                                                                                                                                                                         | Severity     | Status                                                                                                    |
| ----------- | ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | --------------------------------------------------------------------------------------------------------- |
| TD-MEDIA-01 | API  | Generic `media_limit_reached` stop reason masks per-media-type limiting. Premium users hitting video cap (10/month) see "media generation limit" — implies ALL media is limited when only video is. Split into `image_limit_reached`, `audio_limit_reached`, `video_limit_reached`. | ~~Critical~~ | **RESOLVED (Phase 65.1)** — type-specific stop reasons implemented. Shared constant in `stop-reasons.ts`. |
| TD-DATA-01  | Data | User deletion does NOT cascade to `UsageEvent` records. All 3 deletion paths miss `UsageEvent.deleteMany`. Orphaned records accumulate forever. GDPR compliance risk.                                                                                                               | ~~Critical~~ | **RESOLVED (Phase 65.2)** — `UsageEvent.deleteMany` in all 3 paths.                                       |
| TD-DATA-02  | Data | Admin `removeUserByAdmin` races `User.findByIdAndDelete` in parallel with child cleanup. If User deletes first but child cleanup fails, orphaned data is unrecoverable. Must match sequential pattern from user self-delete.                                                        | ~~High~~     | **RESOLVED (Phase 65.3)** — User deleted LAST, sequential operations.                                     |

### ~~Active — High Priority (PM Audit #30, Owner-Directed)~~ (Resolved — PM Audit #31)

| ID       | Area   | Description                                                                                                                 | Status   |
| -------- | ------ | --------------------------------------------------------------------------------------------------------------------------- | -------- |
| TD-DS-03 | Design | Brand palette v2 migration — **RESOLVED (Phase 64.1–64.7)**. All 5 brand tokens operational. Zero legacy references remain. | Resolved |

### ~~Active — Critical Priority (PM Audit #33)~~ (Resolved — PM Audit #34)

| ID       | Area | Description                                                                                                                         | Status                                                                                                                                                                                           |
| -------- | ---- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| TD-UX-07 | UX   | Premium users hitting video cap saw generic "video generation limit" + `contact_support` end action. Confusing for $39/month users. | **RESOLVED (Phase 69.1)** — Media-specific limits are now non-terminal. `endAction: "start_new_conversation"`, `taskStatus: "active"`. Messages say chat can continue. Admin bypasses unchanged. |

### ~~Active — High Priority (PM Audit #33)~~ (Resolved / Partially Resolved — PM Audit #34)

| ID       | Area   | Description                                             | Status                                                                                                                          |
| -------- | ------ | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| TD-DS-05 | Design | Lime Green palette + button restyle.                    | **RESOLVED (Phase 68.1–68.3)** — Palette added, buttons restyled. Text color correction tracked as TD-DS-07.                    |
| TD-DS-06 | Design | Admin panel layout alignment with `/app` design system. | **RESOLVED (Phase 70.1)** — Admin shell structurally aligned (same tokens, sidebar, header). Polish pass tracked as Phase 70.2. |

### ~~Active — High Priority (PM Audit #34, Owner-Directed)~~ (Resolved — PM Audit #35)

| ID          | Area   | Description                                                                                                                                 | Severity | Status                                                                                  |
| ----------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------- |
| TD-DS-07    | Design | `.btn-contained` text color was `lavenderHaze-500/800` — corrected to `midnightBlue-500`. `.btn-text` hover corrected to `limeGreen-800`.   | ~~High~~ | **RESOLVED (Phase 68.4)** — Button text/hover corrections applied.                      |
| TD-ADMIN-15 | Admin  | Persona content (names, descriptions, taglines, starter prompts) was hardcoded. Now admin-editable via `admin.personaOverrides` AppSetting. | ~~High~~ | **RESOLVED (Phase 71.1–71.2)** — Effective persona config + admin editing UI delivered. |

### Active — High Priority (PM Audit #35, Triple-Audit)

| ID         | Area     | Description                                                                                                                                                                                                                                             | Severity |
| ---------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| TD-NODE-01 | Build    | `@types/node@^25.3.3` provides type definitions for Node 25.x APIs but runtime is Node 20.20.1. No `engines` field or `.nvmrc` file. Type/runtime mismatch risk.                                                                                        | High     |
| TD-SEC-05  | Security | 6+ server-side utility files with direct DB/API access lack `import "server-only"` guard: `task-queries.tsx`, `admin-audit.ts`, `admin-auth.ts`, `rate-limit.ts`, `usage-event-utils.ts`, `check-daily-conversations.ts`. Latent risk of client import. | High     |

### Active — Medium Priority (PM Audit #31)

| ID       | Area   | Description                                                                                                                                                                 | Severity |
| -------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| TD-DS-04 | Design | 55+ pre-existing dark mode pairing gaps: light tokens used without `dark:` counterpart or vice versa. Inherited from Milestone 21. Track separately from palette migration. | Medium   |

### ~~Active~~ Resolved — Critical Priority (PM Audit #29)

| ID         | Area | Description                                                                                                                                                                                                | Severity | Status   |
| ---------- | ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | -------- |
| TD-AUTH-05 | Auth | Client self-delete Clerk orphan. FIXED: `deleteUser()` now calls `clerkClient().users.deleteUser()` before MongoDB cleanup. Clerk failure prevents MongoDB deletion. Unit test added. Phase 63.1 COMPLETE. | Critical | RESOLVED |

### ~~Active~~ Resolved — Medium Priority (PM Audit #29)

| ID        | Area | Description                                                                                                                                                                                                                                | Severity   | Status   |
| --------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- | -------- |
| TD-UX-05  | UI   | 4 locations used `window.confirm()` as temporary bridge instead of proper confirmation modal component. **RESOLVED (Phase 61.1)** — `ConfirmationModal` component created. Zero `window.confirm()` in src/.                                | ~~Medium~~ | RESOLVED |
| TD-API-09 | API  | `messageTextContentSchema` still uses `.strict()` — inner content items could reject extra fields from model responses on conversation resumption. `chatMessageSchema` is passthrough (53.3) but content items are strict. Monitor needed. | Low        | Active   |

### ~~Active~~ Resolved — High Priority (PM Audit #29)

| ID       | Area  | Description                                                                                                                                                               | Status   |
| -------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| TD-UX-06 | Admin | Admin limits form unlimited (-1) safeguard. FIXED: LimitInput component with badge, min={-1}, amber warning on unlimited→finite change, helper text. Phase 63.2 COMPLETE. | RESOLVED |

### ~~Active — High Priority (PM Audit #28, Owner-Directed)~~ (All Resolved — PM Audit #29)

| ID       | Area   | Description                                                                                         | Status                                                                                                              |
| -------- | ------ | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| TD-DS-01 | Design | 58 source files depend on 14 custom color palettes scheduled for replacement with Navy/Lemon/Grass. | **Resolved (Phase 60.1–60.7)** — Full palette migration complete. Zero legacy palette references. 58 files changed. |
| TD-DS-02 | Design | 45 `bg-white` instances across 20 non-admin files. Inconsistent with admin.                         | **Resolved (Phase 60.2)** — Zero `bg-white` references remain. All tokenized with dark mode pairing.                |

### ~~Active — High Priority (PM Audit #27, Owner-Directed)~~ (All Resolved — PM Audit #28)

| ID          | Area  | Description                                                                                                                 | Status                                                                                                             |
| ----------- | ----- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| TD-UX-01    | Admin | ALL 14 admin forms had ZERO confirmation dialogs on destructive actions, ZERO visual feedback, and ZERO loading indicators. | **Resolved (Phases 57.1–57.3)** — `AdminManagedForm` + `AdminFormSubmitButton` + `AlertMessage` on all 14 forms.   |
| TD-UX-02    | Admin | ZERO admin data tables had bulk selection or bulk action capability.                                                        | **Resolved (Phases 58.1–58.3)** — users, transactions, website tables all have bulk select + actions.              |
| TD-UX-03    | Admin | Admin user detail showed `{used} / {limit}` but not "remaining".                                                            | **Resolved (Phase 59.1)** — format: `{used} / {limit} ({remaining} left)` with progress bars.                      |
| TD-ADMIN-14 | Admin | Admin form inputs used `bg-white` instead of design tokens.                                                                 | **Resolved (Phase 59.2)** — zero `bg-white` in admin. All use `bg-lightBackground-100` + `dark:bg-jwdMarine-1000`. |
| TD-UX-04    | UI    | User-facing delete error paths used `window.alert()`.                                                                       | **Resolved (Phase 57.4)** — zero `window.alert()` in src/. Delete flows use `window.confirm` + `AlertMessage`.     |

### ~~Active — High Priority (PM Audit #26)~~ (All Resolved — PM Audit #27)

| ID          | Area  | Description                                                                                | Status                                                                                                      |
| ----------- | ----- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| TD-ADMIN-10 | Admin | Admin UI persona gap: 5 `/app` pages call `resolveEntitlements()` without `isAdmin: true`. | **Resolved (Phase 56.1)** — all 5 pages pass `isAdmin: true` when user is admin.                            |
| TD-ADMIN-11 | Admin | Top Personas aggregation: legacy persona IDs resolve to "Strategist" via fallback.         | **Resolved (Phase 56.2)** — `$match` now uses `{ personaId: { $in: PERSONAS.map(p => p.id) } }`.            |
| TD-ADMIN-12 | Admin | Admin page design token inconsistency: `bg-white/70` in 6 pages.                           | **Resolved (Phase 56.3)** — all pages use `bg-lightBackground-100/80`.                                      |
| TD-ADMIN-09 | Admin | Video model not admin-overridable.                                                         | **Resolved (Phase 50.1)** — `videoGenerationModel` added to admin settings, effective config, and resolver. |

### ~~Active — Critical/High Priority (PM Audit #25)~~ (All Resolved — PM Audit #26)

| ID          | Area   | Description                                                                         | Status                                                                                                                 |
| ----------- | ------ | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| TD-ADMIN-03 | Admin  | Admin role had ZERO special treatment in `/api/openai`.                             | **Resolved (Phase 53.1)** — admin bypass: unlimited limits, all personas full, no quota enforcement.                   |
| TD-AI-26    | OpenAI | Video tool silently removed when `videoLimitReached`, causing confusing AI refusal. | **Resolved (Phase 53.2)** — tools stay registered at limit; limit enforced in tool handlers.                           |
| TD-API-08   | API    | Zod `.strict()` on `chatMessageSchema` rejects extra fields on resumption.          | **Resolved (Phase 53.3)** — changed to `.passthrough()`. Server-side error logging added.                              |
| TD-ADMIN-04 | Admin  | Admin user detail missing `videoGenerations` and remaining limits context.          | **Resolved (Phase 54.2)** — shows image/audio/video `used/limit` format + trial usage.                                 |
| TD-ADMIN-05 | Admin  | Admin dashboard only 4 metric cards.                                                | **Resolved (Phase 54.1)** — 7 cards: Users, Conversations, Transactions, Usage Events, Images, Audio, Video Generated. |
| TD-ADMIN-06 | Admin  | Hardcoded `$` currency symbol in admin views.                                       | **Resolved (Phase 54.3)** — all admin views use `getEffectiveCurrencySymbol()`.                                        |
| TD-ADMIN-07 | Admin  | Top Personas null `personaId` events creating duplicates.                           | **Partially resolved (Phase 54.4)** — null filter added. Legacy ID fallback remains (tracked as TD-ADMIN-11).          |
| TD-ADMIN-08 | Admin  | Admin settings page 735 lines, no tabs.                                             | **Resolved (Phase 52.1-52.2)** — 5-tab UI, extracted sections, thin shell page.                                        |

### Active � High Priority (Security)

_None._

### Resolved

| ID             | Description                                            | Resolution                                                                                                                                                                                                                          |
| -------------- | ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SEC-01         | getUserById no ownership check                         | Ownership enforced                                                                                                                                                                                                                  |
| SEC-02         | getAllTransactions no ownership check                  | Ownership enforced                                                                                                                                                                                                                  |
| SEC-03         | console.log in /api/openai                             | Removed                                                                                                                                                                                                                             |
| TD-ADMIN-01    | Admin settings JSON textarea editors                   | Resolved (Phase 27.4) � proper form controls: selects, number inputs, radios                                                                                                                                                        |
| TD-API-03      | generateImage temporary URLs                           | Persisted to S3                                                                                                                                                                                                                     |
| TD-API-05      | console.log in OpenAI utils                            | Removed                                                                                                                                                                                                                             |
| TD-PLAN-02     | Usage limits not enforced                              | Implemented                                                                                                                                                                                                                         |
| TD-PLAN-04     | Lite 3-day expiry                                      | Removed � Lite now "Free forever"                                                                                                                                                                                                   |
| TD-PLAN-05     | Prices $29/$69                                         | Updated to $19/$39                                                                                                                                                                                                                  |
| TD-PLAN-06     | Lite restricts 2 personas                              | Resolved � 6 personas total, plan-gated with three-tier access (full/limited/blocked). Lite: 2 full + 4 limited. Pro: 5 full + 1 limited. Premium: 6 full.                                                                          |
| TD-PLAN-09     | Plan descriptions outdated                             | Updated with accurate limits                                                                                                                                                                                                        |
| TD-UI-11       | FAQ copy outdated (trial references)                   | Rewritten for Droplet                                                                                                                                                                                                               |
| TD-AI-02       | No OpenAI error classification                         | Implemented                                                                                                                                                                                                                         |
| TD-AI-05       | Audio base64 in messages                               | Audio now uploaded to S3                                                                                                                                                                                                            |
| TD-API-06      | handleError loses stack traces                         | Resolved in Phase 20 via `{ cause: error }` pattern                                                                                                                                                                                 |
| TD-FILE-01     | S3 cleanup on task deletion                            | Fully resolved in Phase 20: deleteTask + Clerk webhook + admin remove                                                                                                                                                               |
| TD-FILE-02     | Inline base64 in chat-input.tsx                        | Resolved in Phase 20 via `/api/upload` FormData                                                                                                                                                                                     |
| TD-ACT-01      | deleteAllTransactions unaudited                        | Resolved in Phase 20: function removed entirely                                                                                                                                                                                     |
| TD-WEBHOOK-02  | Clerk webhook no idempotency                           | Resolved in Phase 20: duplicate check + graceful miss handling                                                                                                                                                                      |
| TD-UI-04       | No error boundaries                                    | Added                                                                                                                                                                                                                               |
| TD-UI-05       | mapDateToLabel duplicated                              | Extracted                                                                                                                                                                                                                           |
| TD-RENAME-01   | "role" to "persona" rename                             | Completed                                                                                                                                                                                                                           |
| TD-RENAME-02   | Cellesseon ? Droplet rename                            | Completed (3 legacy migration keys intentional)                                                                                                                                                                                     |
| TD-DB-07       | Audio base64 inflates Task docs                        | Audio uploads to S3, stores URL                                                                                                                                                                                                     |
| TD-DB-08       | getUserById missing .lean()/.select()                  | Added                                                                                                                                                                                                                               |
| TD-DB-09       | getAllTransactions missing .lean()                     | Added                                                                                                                                                                                                                               |
| TD-DB-10       | Task missing lifecycle fields                          | Added in Phase 14                                                                                                                                                                                                                   |
| TD-DB-11       | UsageEvent model missing                               | Created in Phase 14                                                                                                                                                                                                                 |
| TD-DB-12       | AppSetting model missing                               | Created in Phase 14                                                                                                                                                                                                                 |
| TD-DB-13       | PublicPage model missing                               | Created in Phase 14                                                                                                                                                                                                                 |
| TD-DB-14       | AdminAuditLog model missing                            | Created in Phase 14                                                                                                                                                                                                                 |
| TD-UI-02       | No loading skeletons                                   | Added                                                                                                                                                                                                                               |
| TD-UI-06       | No conversation delete UI                              | Added                                                                                                                                                                                                                               |
| TD-AI-06       | No retry/backoff for transient failures                | Resolved in Phase 22 via `withOpenAIRetry()` � exponential backoff, model downgrade                                                                                                                                                 |
| TD-AI-14       | Dead `chatSystemMsg` export in `openai.tsx`            | Resolved in Phase 23.1 � constant removed, zero usages confirmed                                                                                                                                                                    |
| TD-AI-11       | Dead combinedCount parameter                           | Resolved in Phase 21-C � removed from interface, body, and callers                                                                                                                                                                  |
| TD-AI-12       | Video matrix/resolver dual source of truth             | Resolved in Phase 21-C � matrix now shows `sora-2` with notes                                                                                                                                                                       |
| TD-PLAN-07     | No daily conversation limit                            | Implemented in Phase 15 via `checkDailyConversationLimit` + route enforcement                                                                                                                                                       |
| TD-PLAN-08     | No per-conversation prompt limit                       | Implemented in Phase 15 via `Task.promptCount` + route enforcement                                                                                                                                                                  |
| TD-DB-05       | Task messages unbounded (16MB risk)                    | Implemented in Phase 15 via `estimatedBytes` tracking + 12MB threshold guard                                                                                                                                                        |
| TD-AI-07       | Models hardcoded                                       | Resolved in Phase 16 via `ai-model-policy.ts` + `resolveModelForPlan()`                                                                                                                                                             |
| TD-AI-03       | No per-user cost tracking                              | Resolved in Phase 16 via `UsageEvent` + `usage-event-utils.ts`                                                                                                                                                                      |
| TD-AUTH-01     | Proxy protects old routes                              | Resolved in Phase 17 � proxy now protects `/app(.*)` and `/admin(.*)` only                                                                                                                                                          |
| TD-AUTH-02     | Admin at /dashboard not /admin                         | Resolved in Phase 17 � admin is at `/admin` with full control plane                                                                                                                                                                 |
| TD-UI-09       | Account pages at wrong routes                          | Resolved in Phase 17 � profile/plans under `/app/*`                                                                                                                                                                                 |
| TD-UI-10       | Admin has no operational capability                    | Resolved in Phase 17 � 9 admin routes with full CRUD, audit, Tiptap                                                                                                                                                                 |
| TD-BILL-01     | Stripe redirect URLs hardcode old routes               | Resolved in Phase 17 � redirects point to `/app/profile` and `/app/plans`                                                                                                                                                           |
| TD-BILL-02     | Stripe checkout redirect to /sign-in                   | Resolved in HF-4 � public `/checkout-success` intermediary route with Stripe session verification, `success_url` updated                                                                                                            |
| TD-UI-08       | Missing 5 public pages                                 | Resolved in Phase 18 � /about, /faqs, /privacy, /cookies, /terms created                                                                                                                                                            |
| TD-UI-07       | Homepage needs more sections                           | Resolved in Phase 18 � 7 sections: Hero, Features, Workflow, Personas, CTA, Plans, FAQs                                                                                                                                             |
| TD-UI-12       | Footer links non-functional (spans)                    | Resolved in Phase 18 � `<Link>` to `/privacy` and `/terms`                                                                                                                                                                          |
| TD-UI-13       | Header nav missing /about, /faqs links                 | Resolved in Phase 18 � Header has About, Personas, Plans, FAQs links                                                                                                                                                                |
| TD-LOG-01      | console.error in production code (15)                  | Resolved in Phase 17-C � zero console.error/log/warn in `src/`                                                                                                                                                                      |
| TD-AI-01       | No streaming                                           | Resolved in Phase 19 � `generateStreamingResponse()` + SSE events                                                                                                                                                                   |
| TD-API-07      | No streaming implementation                            | Resolved in Phase 19 � streaming branch in `/api/openai` route                                                                                                                                                                      |
| TD-DB-15       | Clerk user.deleted doesn't clean Tasks                 | Resolved in Phase 19 � `Task.deleteMany` in Clerk webhook handler                                                                                                                                                                   |
| TD-WEBHOOK-01  | Clerk user.deleted orphans S3 objects                  | Resolved in Phase 19 � `deleteS3Prefix` in Clerk webhook handler                                                                                                                                                                    |
| TD-AI-10       | Model policy flat resolver                             | Resolved in Phase 21 � `MODEL_POLICY_MATRIX` + `resolveModelPolicy()` with task classes, fallbacks, downgrade triggers, token limits, audio mode                                                                                    |
| TD-AI-15       | Hardcoded TTS model-name branch                        | Resolved in Phase 23.2 � `isTtsOnly` policy flag via `MODEL_CAPABILITIES` map                                                                                                                                                       |
| TD-API-01      | In-memory rate limiter                                 | Resolved in Phase 25.3 � MongoDB-backed `RateLimitEntry` with TTL index, atomic sliding window                                                                                                                                      |
| TD-CODE-01     | Relative import violations                             | Resolved in Phase 24.4 � all 15 relative imports replaced with `@/*` alias across 10 files                                                                                                                                          |
| TD-SEC-01      | Stripe webhook event type leak                         | Resolved in HF-8.2 � generic `"Unhandled event"` response, event type logged server-side only                                                                                                                                       |
| TD-SEC-02      | Chat input upload error leak                           | Resolved in HF-9.1 � fixed generic message `"Failed to upload file. Please try again."`, no `error.message` exposed                                                                                                                 |
| TD-SEC-03      | updateUser error handling inconsistency                | Resolved in HF-9.2 � `handleError({ error, source: "updateUser" })` pattern, consistent with all other server actions                                                                                                               |
| TD-AUTH-03     | Missing MongoDB user self-healing                      | Resolved in HF-2 � `ensureUserSynced()` in `ensure-user-synced.ts`, wired into `/app/profile`, `/app/plans`, `/api/openai`                                                                                                          |
| TD-AUTH-04     | `/api/openai` silently degrades to Lite                | Resolved in HF-2 � returns HTTP 503 on self-healing failure instead of silent Lite degradation                                                                                                                                      |
| TD-SEC-03      | `updateUser` error handling inconsistency              | Resolved in HF-9.2 � `handleError({ error, source: "updateUser" })` pattern, consistent with all other server actions                                                                                                               |
| TD-LIMIT-01    | Prompt limit race condition                            | Resolved in Phase 27.1 � atomic `findOneAndUpdate` with `$lt` condition, no read-check-write race                                                                                                                                   |
| TD-LIMIT-02    | Daily conversation limit race condition                | Resolved in Phase 27.1 � compensating delete pattern after `createTask`, UTC timezone fix                                                                                                                                           |
| TD-LIMIT-05    | Daily conversation limit TOCTOU race                   | Resolved in Phase 28.1 � atomic `claimDailyConversationSlot` with `findOneAndUpdate` + `$lt` guard, midnight reset in single operation                                                                                              |
| TD-LIMIT-06    | Midnight reset race                                    | Resolved in Phase 28.1 � stale-window reset handled atomically in `claimDailyConversationSlot`                                                                                                                                      |
| TD-LIMIT-07    | Media counter TOCTOU race                              | Resolved in Phase 28.6 � `claimMediaGenerationSlot()` atomic `findOneAndUpdate` with `$lt` guard                                                                                                                                    |
| TD-AI-23       | Audio tool content description misleading              | Resolved in Phase 28.7 � description updated to specify literal text for TTS                                                                                                                                                        |
| TD-AI-20       | Image generation broken (model IDs + response_format)  | Resolved in Phase 28.2-fix � `response_format: "b64_json"` removed from `generateImage.tsx`, model IDs live-tested (`gpt-image-1-mini`, `gpt-image-1.5` confirmed working), response handler supports both URL and b64_json formats |
| TD-AI-24       | `response_format` compatibility risk with image models | Resolved in Phase 28.2-fix � `response_format` parameter removed entirely, API returns default format (b64_json) which is handled correctly                                                                                         |
| TD-AI-22       | Audio messages parameter bug                           | Resolved in Phase 28.3-code � `ttsText` extracted from `parsedArgs.content`, not raw `parsedArgs` as messages                                                                                                                       |
| TD-AI-19       | Image/audio generation unhandled exceptions            | Resolved in Phase 27.2 � try-catch at call sites in `buildOpenAIResponsePayload()`, graceful error payloads                                                                                                                         |
| TD-FEAT-01     | Rule 10 violation (features blocked)                   | Resolved in Phase 27.3 � all 6 blocking layers opened, all features available in all plans and all personas                                                                                                                         |
| TD-UI-14       | Layout inconsistency across /app/\* pages              | Resolved in Phase 27.6 � shared `(chat)/layout.tsx` provides ChatSidebar + main content to all `/app/*` routes                                                                                                                      |
| TD-SEC-04      | Clerk webhook responses leak user data                 | Resolved in Phase 27.8 � all three Clerk webhook handlers return `{ message: "OK" }` only, deletion counts logged server-side                                                                                                       |
| TD-BILL-03     | Stripe webhook missing videoGenerations reset          | Resolved in Phase 27.9 � `videoGenerations: 0` included in checkout plan update                                                                                                                                                     |
| TD-OBS-01      | UsageEvent silent catch                                | Resolved in Phase 27.10 � `.catch()` handler logs via `process.stderr.write()`, fire-and-forget preserved                                                                                                                           |
| TD-UI-15       | Profile page display-only                              | Resolved in Phase 27.7 � full edit form (name, email, avatar upload) + account self-deletion with confirmation                                                                                                                      |
| TD-ACT-02      | deleteUser incomplete cleanup                          | Resolved in Phase 27.7 � `deleteUser()` now removes Tasks, Transactions, S3 assets, and MongoDB User record; signs out from Clerk                                                                                                   |
| TD-UI-14       | ChatHeader sidebarExpanded always true on mobile       | Resolved in 31.2-fix � viewport-aware `isDesktop` via `useState` + `matchMedia` listener, ternary per viewport                                                                                                                      |
| TD-CHECKOUT-01 | Checkout trusts client-submitted price                 | Resolved in Phase 39.1 � `checkoutPlan()` now calls `getEffectivePlanConfig()` for server-side price re-verification. Mismatched price rejected with generic error. Stripe `unit_amount` uses server-derived price only.            |

# Droplet — Application Specification

> Canonical product and system specification for the Droplet AI assistant SaaS.
> This document is governed by **Droplet-PM** and must reflect approved direction only.
> Last updated: 2026-03-12 (Phase 25.5.2 complete — auth-boundary E2E coverage added, pre-Phase-26 verification in progress)

---

## 1. Product Overview

Droplet is an AI assistant SaaS built on OpenAI models.
Users **must create an account** to use the app — there is no anonymous/guest chat access.
Authenticated users interact with an AI assistant through predefined **personas** that shape conversation tone and capabilities.
Each conversation is bound to one persona. Personas control system prompt, tool availability, and behavioral boundaries.
The product monetises through tiered subscription plans paid via Stripe.

### Terminology

- **Persona** (plural: **Personas**): A predefined AI assistant profile that controls system prompt, capabilities, and tone. Not to be confused with `User.role` which refers to the user access level (`client` | `admin`).

### Core Value Proposition

- Multi-modal AI assistant (text + image + audio + video generation)
- 9 predefined personas with distinct system prompts and capabilities
- Streaming responses for real-time chat UX
- Conversation history persisted per user with resume capability
- Three-tier subscription model (Lite / Pro / Premium) with per-plan entitlements
- File upload and image download capabilities
- Full admin control plane for operational management

### Approved v1 Release Scope

- 9 predefined personas (no dynamic persona creation)
- Text chat as primary mode with **streaming responses**
- Image upload support
- Image generation (all tiers, with enforced usage limits)
- Audio generation (all tiers, with enforced usage limits)
- Video generation (Premium only)
- Account-required access — no anonymous usage
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
| **Anonymous** | Public pages only: `/`, `/about`, `/plans`, `/faqs`, `/personas`, `/privacy`, `/cookies`, `/terms`        |
| **Client**    | All public pages + chat (`/app`), conversation resume, library, new conversation, profile, plans, billing |
| **Admin**     | All client access + admin dashboard (`/admin/*`)                                                          |

`User.role` is stored in Mongoose and synced to Clerk `publicMetadata.role`.
Admin access is enforced at the proxy level (`src/proxy.tsx`) via Clerk session claims (`metadata.role === "admin"`).

> **Note:** `User.role` refers to user access level (`client` / `admin`). It is unrelated to AI **personas**.

---

## 3. Personas

9 predefined personas defined in `src/constants/assistant-personas.tsx`:

| Persona ID    | Label       | Category     | Image | Audio |
| ------------- | ----------- | ------------ | ----- | ----- |
| `strategist`  | Strategist  | Productivity | Yes   | No    |
| `teacher`     | Teacher     | Learning     | Yes   | Yes   |
| `developer`   | Developer   | Productivity | Yes   | No    |
| `creator`     | Creator     | Creative     | Yes   | Yes   |
| `wellness`    | Wellness    | Lifestyle    | No    | Yes   |
| `analyst`     | Analyst     | Productivity | Yes   | No    |
| `best-friend` | Best Friend | Companion    | No    | Yes   |
| `boyfriend`   | Boyfriend   | Companion    | No    | Yes   |
| `girlfriend`  | Girlfriend  | Companion    | No    | Yes   |

Each persona has: `id`, `label`, `tagline`, `description`, `category`, `icon`, `starterPrompts[]`, `systemPrompt`, `supportsImage`, `supportsAudio`.

### Persona Selection & Entitlements

- **All personas are available in all plans** (Lite, Pro, Premium).
- Persona selection UI: `ChatPersonaPicker` component in the chat interface.
- Persona is stored per task in `Task.personaId`.
- System prompt is built per-persona via `buildPersonaAwareSystemPrompt()`.
- Entitlements resolved via `resolveEntitlements()` in `src/lib/utils/resolve-entitlements.tsx`.

### Prompt Architecture (Implemented — Phase 22)

Prompt system implemented in `src/constants/persona-prompts.ts` (server-only, versioned).

Current implementation covers:

- **Persona identity**: unique personality, tone, domain expertise — all 9 personas have distinct prompts
- **Plan tier**: model-family-aware prompt adaptation (nano/mini/standard/reasoning model families)
- **Model family resolution**: `resolvePromptModelFamily()` maps model IDs to prompt families
- **Temperature/max-token settings**: per-persona, per-model-family configuration
- **Safety constraints**: `COMPANION_SAFETY_RULES` for companion personas (boyfriend, girlfriend, best-friend), `WELLNESS_SAFETY_RULES` for wellness
- **Answer style and formatting**: persona-specific output formatting rules
- **Version identifier**: `PROMPT_VERSION = "1.0"`
- **Fallback chain**: model-family prompt → persona default `systemPrompt` in assistant-personas.tsx

Prompts are versioned and separated from request handlers. `buildPersonaAwareSystemPrompt()` resolves prompts from the new config first, falling back to persona defaults.

**Remaining gap**: Image and audio generation requests are not yet persona-aware — they do not receive persona-specific prompt context. Chat prompts are fully persona-aware.

---

## 4. Subscription Plans

| Plan        | Price | Duration      | Chat Model (default)            | Limits                                                                                                      |
| ----------- | ----- | ------------- | ------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| **Lite**    | Free  | **Permanent** | `gpt-4o-mini`                   | 5 conversations/day, 10 prompts/conversation, 3 image generations/month, no audio, no video                 |
| **Pro**     | $19   | Monthly       | `gpt-4.1`                       | 50 conversations/day, 100 prompts/conversation, 50 image + 50 audio generations/month, no video             |
| **Premium** | $39   | Monthly       | `gpt-4.1` / `gpt-5.4` (complex) | Unlimited conversations, unlimited prompts, unlimited image + audio generations, 10 video generations/month |

> Full model policy (all features × plans × task classes) in **Section 8**.

### Plan Rules

1. **Lite is permanent and free.** There is no 3-day trial. There is no expiry. New users receive Lite by default upon account creation.
2. **All personas are available in all plans.** There are no persona restrictions per plan.
3. **Pro and Premium are paid-only.** Activated via Stripe Checkout one-time payment.
4. **Premium advantages over Pro:** premium audio quality (`gpt-audio-1.5`), `gpt-5.4` for complex reasoning, video generation, and unlimited image/audio quotas. See Section 8 for full model policy.
5. When any limit is reached, the server **must end the conversation** with an exact stop reason and exact next-action instruction.
6. After a forced stop, the user is told one of: start a new conversation (if resources remain), upgrade plan (if applicable), or contact support.

### Lite Plan Limits (Detailed)

| Limit                         | Value | Reset Window                     |
| ----------------------------- | ----- | -------------------------------- |
| Conversations per day         | 5     | 24 hours                         |
| User prompts per conversation | 10    | Per conversation                 |
| Image generations             | 3     | 30-day rolling window            |
| Audio generation              | 0     | N/A (blocked — Pro/Premium only) |
| Video generation              | 0     | N/A (blocked — Premium only)     |

### Pro Plan Limits (Detailed)

| Limit                         | Value | Reset Window          |
| ----------------------------- | ----- | --------------------- |
| Conversations per day         | 50    | 24 hours              |
| User prompts per conversation | 100   | Per conversation      |
| Image generations             | 50    | 30-day rolling window |
| Audio generations             | 50    | 30-day rolling window |
| Video generation              | 0     | N/A                   |

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
5. No auto-renewal — plans are one-time payments with set expiration dates for paid tiers.

### Usage Limit Enforcement

- Plan limits stored as constants in `PLAN_LIMITS`.
- Daily conversation count tracked via `Task.countDocuments` queries on `createdAt` (uses compound index `{userId, createdAt}`).
- Per-conversation prompt count tracked on `Task.promptCount` field (initialized on creation, incremented via `$inc`).
- Conversation storage tracked via `Task.estimatedBytes` field (12MB threshold, 4MB buffer before MongoDB 16MB limit).
- Media generation counters on User model plan subdoc.
- `checkDailyConversationLimit()` utility validates daily quota per plan.
- `/api/openai` route checks all limits before making OpenAI calls: daily limit (new conversations only), prompt limit, storage limit, media limit.
- When any limit is hit: conversation is stopped with `taskStatus: "ended"`, stop reason is recorded on Task, user receives next-action message.
- Unlimited plans (`-1` values in `PLAN_LIMITS`) always bypass limit checks.

### Conversation Stop Reasons

| Reason Code                          | Message to User                                              | Next Action                                |
| ------------------------------------ | ------------------------------------------------------------ | ------------------------------------------ |
| `prompt_limit_reached`               | "You've reached the message limit for this conversation."    | `start_new_conversation` or `upgrade_plan` |
| `media_limit_reached`                | "You've reached your media generation limit."                | `upgrade_plan` or `contact_support`        |
| `daily_conversation_limit_reached`   | "You've reached the daily conversation limit for your plan." | `upgrade_plan` or `contact_support`        |
| `conversation_storage_limit_reached` | "This conversation has reached its storage limit."           | `start_new_conversation`                   |
| `billing_state_invalid`              | "Your plan has expired."                                     | `upgrade_plan`                             |

### Plan Technical Debt

- **TD-PLAN-01**: No recurring subscriptions (deferred v1).

---

## 5. Authentication & Authorization

- **Provider**: Clerk (`@clerk/nextjs` v7)
- **Route protection**: `src/proxy.tsx` (Next.js 16 proxy convention). No `middleware.ts`.
- **Protected routes (target)**: `/app(.*)`, `/admin(.*)`
- **Admin routes**: `/admin(.*)` — requires `sessionClaims.metadata.role === "admin"`
- **Server actions**: Must verify `auth()` before DB operations. Ownership enforcement on all read/write operations.
- **API routes**: Must verify `auth()` before processing.
- **Webhooks**: Exempt from auth — verified via Svix (Clerk) and `stripe.webhooks.constructEvent` (Stripe).

### Auth Technical Debt

- ~~**TD-AUTH-01**: Proxy protects old routes~~ — **Resolved** in Phase 17. Proxy now protects `/app(.*)` and `/admin(.*)` only.
- ~~**TD-AUTH-02**: Admin at `/dashboard`~~ — **Resolved** in Phase 17. Admin is at `/admin`.

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

### Data Model Technical Debt

- ~~**TD-DB-05**: Task messages array unbounded (16MB risk)~~ — **Resolved** in Phase 15 via `estimatedBytes` tracking with 12MB threshold guard.

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
- Each cleanup step has independent error handling — partial failure does not break webhook response
- Verification failures are logged server-side and return a generic 400 response to Clerk

### 7.6 POST /api/webhooks/stripe

- Auth: `stripe.webhooks.constructEvent` verification
- Handles: `checkout.session.completed`
- Idempotency check on `Transaction.stripeId`
- Resets usage counters on plan renewal

### API Technical Debt

- ~~**TD-API-01**: In-memory rate limiter~~ — **Resolved** in Phase 25.3 via MongoDB-backed `RateLimitEntry` with TTL index, atomic sliding window.
- ~~**TD-API-06**: handleError loses stack traces~~ — **Resolved** in Phase 20 via `{ cause: error }` pattern.
- ~~**TD-API-07**: No streaming implementation~~ — **Resolved** in Phase 19.

---

## 8. OpenAI Integration & Model Policy

### 8.1 Model Policy Architecture

The model policy system controls which OpenAI model is used for every AI request. Three governing principles:

1. **Plan sets the maximum allowed tier** — not the exact model. The plan defines the model ceiling.
2. **Feature type sets the default** — utility tasks (titles) always use the cheapest model regardless of plan.
3. **Backend decides the final model** — budget state, latency, retry attempts, and task class trigger automatic downgrades. The frontend must never send the final model ID.

Central resolver: `resolveModelPolicy()` in `src/lib/utils/ai-model-policy.ts`. **Implementation complete (Phase 21).** All OpenAI utilities (`generateTitle`, `generateImage`, `generateAudio`, `generateResponse`) consume the resolver — no hardcoded model names. Message token management via `compactMessagesToTokenLimit()` in `src/lib/utils/openai/message-policy.ts`.

### 8.2 Model Policy Matrix

| Feature          | Plan    | Default Model      | Fallback Model     | Cost-Control Notes                                                                                    |
| ---------------- | ------- | ------------------ | ------------------ | ----------------------------------------------------------------------------------------------------- |
| Title generation | All     | `gpt-4.1-nano`     | `gpt-4o-mini`      | Hard cap: 1,200 input tokens, 20 output tokens. Always cheapest model regardless of plan.             |
| Chat             | Lite    | `gpt-4o-mini`      | `gpt-4.1-nano`     | Strict context compaction; max output tokens per reply; no expensive tools; block retries beyond one. |
| Chat             | Pro     | `gpt-4.1`          | `gpt-4o-mini`      | Degrade to fallback on soft budget, high latency, simple tasks, or retries.                           |
| Chat             | Premium | `gpt-4.1`          | `gpt-4.1`          | Default `gpt-4.1` for routine chat. `gpt-5.4` only for complex reasoning with `explicitPremium`.      |
| Image            | Lite    | `gpt-image-1-mini` | _(none)_           | One model only. Limit size, count, concurrency. Monthly quota enforced.                               |
| Image            | Pro     | `gpt-image-1.5`    | `gpt-image-1-mini` | Downgrade for retries, previews, or users beyond soft budget.                                         |
| Image            | Premium | `gpt-image-1.5`    | `gpt-image-1-mini` | Same model tiers as Pro; Premium gets unlimited quota.                                                |
| Audio            | Lite    | _(blocked)_        | —                  | Audio not available on Lite.                                                                          |
| Audio            | Pro     | `gpt-audio-mini`   | `gpt-4o-mini-tts`  | TTS-only fallback. Do NOT use TTS fallback for `audio_in_out` mode.                                   |
| Audio            | Premium | `gpt-audio-1.5`    | `gpt-audio-mini`   | Downgrade for retries, previews, long-form beyond soft budget.                                        |
| Video            | Lite    | _(blocked)_        | —                  | Video not available on Lite.                                                                          |
| Video            | Pro     | _(blocked)_        | —                  | Video not available on Pro.                                                                           |
| Video            | Premium | `sora-2-pro`       | `sora-2`           | `sora-2` for previews/drafts. `sora-2-pro` only for final renders with `explicitPremium`.             |

### 8.3 Task Classes

Each AI request is classified into a task class that affects model selection and token limits.

| Task Class | Purpose                   | Default For                            |
| ---------- | ------------------------- | -------------------------------------- |
| `utility`  | Metadata, always cheapest | `title_generation`                     |
| `simple`   | Basic/general questions   | —                                      |
| `standard` | Normal conversation turns | `chat`                                 |
| `complex`  | Deep reasoning, analysis  | —                                      |
| `preview`  | Draft/preview generation  | `video_generation`                     |
| `final`    | Final quality render      | `image_generation`, `audio_generation` |

**Implementation (Phase 25.4):** Chat requests are classified server-side by `classifyTaskComplexity()` in `src/lib/utils/openai/classify-task-complexity.ts`. The classifier uses heuristics: message length, conversation history depth, analytical/technical keyword presence, and explicit deep-analysis intent (regex pattern). Returns `ChatTaskClass` (`simple` | `standard` | `complex`). The `/api/openai` route passes the classified `taskClass` to `resolveModelPolicy()`. Frontend does not send `taskClass` — all classification is backend-only.

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

1. **Hard limit reached** (`hard_limit_reached`) — block the request entirely.
2. **Soft limit reached** (`soft_limit_reached`) — use fallback model.
3. **High latency** — use fallback model.
4. **Retry attempt** (`retryAttempt > 0`) — use fallback model.
5. **Audio mode mismatch** — do not use TTS-only fallback (`gpt-4o-mini-tts`) for `audio_in_out` requests.

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
6. `gpt-5.4` is reserved for complex/premium-explicit requests only — Premium chat defaults to `gpt-4.1`.

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

- ~~**TD-AI-01**: No streaming~~ — **Resolved** in Phase 19 via `generateStreamingResponse()` + SSE events.
- ~~**TD-AI-03**: No per-user cost tracking~~ — **Resolved** in Phase 16 via `UsageEvent` + `usage-event-utils.ts`.
- ~~**TD-AI-06**: No retry/backoff for transient failures~~ — **Resolved** in Phase 22 via `withOpenAIRetry()` in `generateResponse.tsx`. Exponential backoff (1s/2s/4s), transient-only retries (429/500/502/503), model downgrade via `retryAttempt` parameter, SDK auto-retry disabled (`maxRetries: 0`).
- ~~**TD-AI-07**: Models hardcoded~~ — **Resolved** in Phase 16 via `ai-model-policy.ts`.
- **TD-AI-08**: No video generation (Premium). UI now shows "Coming soon" — implementation deferred.
- ~~**TD-AI-09**: Prompts not optimized per persona/model~~ — **Partially resolved** in Phase 22 via `persona-prompts.ts`. Chat prompts are now per-persona, per-model-family with safety constraints. Image/audio generation prompts remain non-persona-aware.
- ~~**TD-AI-10**: Model policy overhaul~~ — **Resolved** in Phase 21 via `MODEL_POLICY_MATRIX` + `resolveModelPolicy()` in `ai-model-policy.ts`.
- ~~**TD-AI-11**: Dead `combinedCount` parameter~~ — **Resolved** in Phase 21-C. Removed from interface, function body, and all callers.
- ~~**TD-AI-12**: Video matrix/resolver dual source of truth~~ — **Resolved** in Phase 21-C. Matrix `final.model` now `sora-2` with notes documenting `explicitPremium` override.
- **TD-AI-13**: 5 model pricing entries in `ai-model-policy.ts` are placeholders pending OpenAI confirmation (`gpt-audio-mini`, `gpt-audio-1.5`, `gpt-4o-mini-tts`, `sora-2`, `sora-2-pro`).
- ~~**TD-AI-14**: Dead `chatSystemMsg` export in `openai.tsx`~~ — **Resolved** in Phase 23.1. Constant removed, zero remaining usages.
- ~~**TD-AI-15**: Hardcoded TTS model-name branch in `generateAudio.tsx`~~ — **Resolved** in Phase 23.2 via `isTtsOnly` policy flag. `MODEL_CAPABILITIES` map drives resolution centrally; `generateAudio.tsx` uses `policy.isTtsOnly` instead of string comparison.

---

## 9. File Handling

All file handling technical debt has been resolved.

- ~~**TD-FILE-01**: No S3 cleanup on user/task deletion~~ — **Fully resolved** in Phase 20. `deleteTask` now scans messages for S3 asset URLs and deletes objects (best-effort). Clerk webhook `user.deleted` cleans S3 prefix (Phase 19). Admin `removeUserByAdminAction` cleans S3 prefix (Phase 17).
- ~~**TD-FILE-02**: Inline base64 in chat-input.tsx~~ — **Resolved** in Phase 20. Chat input now uploads via `/api/upload` FormData. S3 URLs used in message content. Blob previews for local display only.

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

| Route                                 | Type      | Description                              |
| ------------------------------------- | --------- | ---------------------------------------- |
| `/`                                   | Public    | Landing (Hero + product sections + CTAs) |
| `/about`                              | Public    | How app works (stacked sections)         |
| `/plans`                              | Public    | Pricing (plan cards)                     |
| `/faqs`                               | Public    | FAQ accordion                            |
| `/personas`                           | Public    | Personas showcase                        |
| `/privacy`                            | Public    | Privacy & Cookie Policy                  |
| `/cookies`                            | Public    | Cookie Policy                            |
| `/terms`                              | Public    | Terms & Conditions                       |
| `/sign-in`, `/sign-up`                | Auth      | Clerk auth                               |
| `/app`                                | Protected | Chat dashboard                           |
| `/app/new`                            | Protected | New conversation                         |
| `/app/library`                        | Protected | Conversation history                     |
| `/app/personas`                       | Protected | In-app personas                          |
| `/app/c/[conversationId]`             | Protected | Resume conversation                      |
| `/app/profile`                        | Protected | User profile + plan + history            |
| `/app/plans`                          | Protected | Plan upgrade + checkout                  |
| `/admin`                              | Admin     | Dashboard overview                       |
| `/admin/users`                        | Admin     | User management list                     |
| `/admin/users/[userId]`               | Admin     | User detail + actions                    |
| `/admin/transactions`                 | Admin     | Transaction management                   |
| `/admin/transactions/[transactionId]` | Admin     | Transaction detail                       |
| `/admin/usage`                        | Admin     | Usage analytics                          |
| `/admin/settings`                     | Admin     | App settings                             |
| `/admin/website`                      | Admin     | Content management                       |
| `/admin/website/[pageId]`             | Admin     | Page editor (Tiptap)                     |

### Public Pages Content

- **`/`**: Hero + product sections + CTAs. Not just another chatbot.
- **`/about`**: How app works. Stacked sections with text + image.
- **`/plans`**: Plan cards (public pricing).
- **`/faqs`**: FAQ accordion.
- **`/privacy`**, **`/cookies`**, **`/terms`**: Real legal content, adapted for Droplet.

### Design System

- Tailwind CSS v4.2 with custom design tokens
- Custom fonts: Dosis + Albert Sans
- Dark/light themes via `data-Droplet-theme` attribute
- Bootstrap Icons

---

## 12. Admin Dashboard (Target)

### Capabilities (admin role only)

- **Users**: List, view, add, suspend, remove. User detail page with info + usage per model.
- **Transactions**: List, view, suspend, decline. Transaction detail page.
- **Usage**: Model usage, costs per user/time/provider. Powered by UsageEvent.
- **Settings**: AI model per plan, pricing, limits, theme. Powered by AppSetting.
- **Website**: Add, edit, remove, sort, publish/unpublish public pages. Tiptap editor. Powered by PublicPage.
- All mutations logged to AdminAuditLog.

---

## 13. Testing

- **Unit tests**: 53 suites, 248 tests (Vitest) — includes streaming, webhook, chat-wrapper, chat-body stop-state, upload flow, S3 cleanup, idempotency, model policy, retry/backoff, persona prompt, rate limiting, task complexity classification, and OpenAI route tests
- **E2E tests**: 6 Playwright spec files across browser projects (auth-boundaries added in Phase 25.5.2, 70 public-page tests added in Phase 25.5.1)
- **Coverage**: Configured (Phase 24.1) — v8 provider, thresholds: 70% statements / 60% branches / 70% functions / 70% lines. Current: 82/71/88/82.
- **Gap**: No dedicated E2E spec for streamed chunk-by-chunk rendering (manually verified via Playwright MCP)

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

### Active — No Critical TDs Remaining

All critical-severity technical debt resolved. Remaining items are medium or low priority.

### Active — Medium Priority

| ID       | Area   | Description                                                                     | Severity |
| -------- | ------ | ------------------------------------------------------------------------------- | -------- |
| TD-AI-08 | OpenAI | No video generation (Premium) — UI shows "Coming soon", implementation deferred | Medium   |

### Active — Low Priority

| ID         | Area    | Description                                                                   | Severity |
| ---------- | ------- | ----------------------------------------------------------------------------- | -------- |
| TD-AI-09   | OpenAI  | Image/audio generation prompts not persona-aware (chat prompts done Phase 22) | Low      |
| TD-AI-13   | OpenAI  | 5 model pricing entries are placeholders pending OpenAI confirmation          | Low      |
| TD-PLAN-01 | Billing | No recurring subscriptions (deferred v1)                                      | Low      |

### Resolved

| ID            | Description                                 | Resolution                                                                                                                                       |
| ------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| SEC-01        | getUserById no ownership check              | Ownership enforced                                                                                                                               |
| SEC-02        | getAllTransactions no ownership check       | Ownership enforced                                                                                                                               |
| SEC-03        | console.log in /api/openai                  | Removed                                                                                                                                          |
| TD-API-03     | generateImage temporary URLs                | Persisted to S3                                                                                                                                  |
| TD-API-05     | console.log in OpenAI utils                 | Removed                                                                                                                                          |
| TD-PLAN-02    | Usage limits not enforced                   | Implemented                                                                                                                                      |
| TD-PLAN-04    | Lite 3-day expiry                           | Removed — Lite now "Free forever"                                                                                                                |
| TD-PLAN-05    | Prices $29/$69                              | Updated to $19/$39                                                                                                                               |
| TD-PLAN-06    | Lite restricts 2 personas                   | All 9 available in all plans                                                                                                                     |
| TD-PLAN-09    | Plan descriptions outdated                  | Updated with accurate limits                                                                                                                     |
| TD-UI-11      | FAQ copy outdated (trial references)        | Rewritten for Droplet                                                                                                                            |
| TD-AI-02      | No OpenAI error classification              | Implemented                                                                                                                                      |
| TD-AI-05      | Audio base64 in messages                    | Audio now uploaded to S3                                                                                                                         |
| TD-API-06     | handleError loses stack traces              | Resolved in Phase 20 via `{ cause: error }` pattern                                                                                              |
| TD-FILE-01    | S3 cleanup on task deletion                 | Fully resolved in Phase 20: deleteTask + Clerk webhook + admin remove                                                                            |
| TD-FILE-02    | Inline base64 in chat-input.tsx             | Resolved in Phase 20 via `/api/upload` FormData                                                                                                  |
| TD-ACT-01     | deleteAllTransactions unaudited             | Resolved in Phase 20: function removed entirely                                                                                                  |
| TD-WEBHOOK-02 | Clerk webhook no idempotency                | Resolved in Phase 20: duplicate check + graceful miss handling                                                                                   |
| TD-UI-04      | No error boundaries                         | Added                                                                                                                                            |
| TD-UI-05      | mapDateToLabel duplicated                   | Extracted                                                                                                                                        |
| TD-RENAME-01  | "role" to "persona" rename                  | Completed                                                                                                                                        |
| TD-RENAME-02  | Cellesseon → Droplet rename                 | Completed (3 legacy migration keys intentional)                                                                                                  |
| TD-DB-07      | Audio base64 inflates Task docs             | Audio uploads to S3, stores URL                                                                                                                  |
| TD-DB-08      | getUserById missing .lean()/.select()       | Added                                                                                                                                            |
| TD-DB-09      | getAllTransactions missing .lean()          | Added                                                                                                                                            |
| TD-DB-10      | Task missing lifecycle fields               | Added in Phase 14                                                                                                                                |
| TD-DB-11      | UsageEvent model missing                    | Created in Phase 14                                                                                                                              |
| TD-DB-12      | AppSetting model missing                    | Created in Phase 14                                                                                                                              |
| TD-DB-13      | PublicPage model missing                    | Created in Phase 14                                                                                                                              |
| TD-DB-14      | AdminAuditLog model missing                 | Created in Phase 14                                                                                                                              |
| TD-UI-02      | No loading skeletons                        | Added                                                                                                                                            |
| TD-UI-06      | No conversation delete UI                   | Added                                                                                                                                            |
| TD-AI-06      | No retry/backoff for transient failures     | Resolved in Phase 22 via `withOpenAIRetry()` — exponential backoff, model downgrade                                                              |
| TD-AI-14      | Dead `chatSystemMsg` export in `openai.tsx` | Resolved in Phase 23.1 — constant removed, zero usages confirmed                                                                                 |
| TD-AI-11      | Dead combinedCount parameter                | Resolved in Phase 21-C — removed from interface, body, and callers                                                                               |
| TD-AI-12      | Video matrix/resolver dual source of truth  | Resolved in Phase 21-C — matrix now shows `sora-2` with notes                                                                                    |
| TD-PLAN-07    | No daily conversation limit                 | Implemented in Phase 15 via `checkDailyConversationLimit` + route enforcement                                                                    |
| TD-PLAN-08    | No per-conversation prompt limit            | Implemented in Phase 15 via `Task.promptCount` + route enforcement                                                                               |
| TD-DB-05      | Task messages unbounded (16MB risk)         | Implemented in Phase 15 via `estimatedBytes` tracking + 12MB threshold guard                                                                     |
| TD-AI-07      | Models hardcoded                            | Resolved in Phase 16 via `ai-model-policy.ts` + `resolveModelForPlan()`                                                                          |
| TD-AI-03      | No per-user cost tracking                   | Resolved in Phase 16 via `UsageEvent` + `usage-event-utils.ts`                                                                                   |
| TD-AUTH-01    | Proxy protects old routes                   | Resolved in Phase 17 — proxy now protects `/app(.*)` and `/admin(.*)` only                                                                       |
| TD-AUTH-02    | Admin at /dashboard not /admin              | Resolved in Phase 17 — admin is at `/admin` with full control plane                                                                              |
| TD-UI-09      | Account pages at wrong routes               | Resolved in Phase 17 — profile/plans under `/app/*`                                                                                              |
| TD-UI-10      | Admin has no operational capability         | Resolved in Phase 17 — 9 admin routes with full CRUD, audit, Tiptap                                                                              |
| TD-BILL-01    | Stripe redirect URLs hardcode old routes    | Resolved in Phase 17 — redirects point to `/app/profile` and `/app/plans`                                                                        |
| TD-UI-08      | Missing 5 public pages                      | Resolved in Phase 18 — /about, /faqs, /privacy, /cookies, /terms created                                                                         |
| TD-UI-07      | Homepage needs more sections                | Resolved in Phase 18 — 7 sections: Hero, Features, Workflow, Personas, CTA, Plans, FAQs                                                          |
| TD-UI-12      | Footer links non-functional (spans)         | Resolved in Phase 18 — `<Link>` to `/privacy` and `/terms`                                                                                       |
| TD-UI-13      | Header nav missing /about, /faqs links      | Resolved in Phase 18 — Header has About, Personas, Plans, FAQs links                                                                             |
| TD-LOG-01     | console.error in production code (15)       | Resolved in Phase 17-C — zero console.error/log/warn in `src/`                                                                                   |
| TD-AI-01      | No streaming                                | Resolved in Phase 19 — `generateStreamingResponse()` + SSE events                                                                                |
| TD-API-07     | No streaming implementation                 | Resolved in Phase 19 — streaming branch in `/api/openai` route                                                                                   |
| TD-DB-15      | Clerk user.deleted doesn't clean Tasks      | Resolved in Phase 19 — `Task.deleteMany` in Clerk webhook handler                                                                                |
| TD-WEBHOOK-01 | Clerk user.deleted orphans S3 objects       | Resolved in Phase 19 — `deleteS3Prefix` in Clerk webhook handler                                                                                 |
| TD-AI-10      | Model policy flat resolver                  | Resolved in Phase 21 — `MODEL_POLICY_MATRIX` + `resolveModelPolicy()` with task classes, fallbacks, downgrade triggers, token limits, audio mode |
| TD-AI-15      | Hardcoded TTS model-name branch             | Resolved in Phase 23.2 — `isTtsOnly` policy flag via `MODEL_CAPABILITIES` map                                                                    |
| TD-API-01     | In-memory rate limiter                      | Resolved in Phase 25.3 — MongoDB-backed `RateLimitEntry` with TTL index, atomic sliding window                                                   |
| TD-CODE-01    | Relative import violations                  | Resolved in Phase 24.4 — all 15 relative imports replaced with `@/*` alias across 10 files                                                       |

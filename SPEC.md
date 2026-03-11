# Droplet — Application Specification

> Canonical product and system specification for the Droplet AI assistant SaaS.
> This document is governed by **Droplet-PM** and must reflect approved direction only.
> Last updated: 2026-03-11
> Support contact: `office@jordachewd.com`

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

### Prompt Architecture (Target)

Prompt design must evolve from isolated persona strings to a managed matrix:

- **Persona identity**: unique personality, tone, domain expertise
- **Plan tier**: model-aware prompt adaptation (cheaper models need more explicit instructions)
- **Model family/version**: adapt prompt style to model capabilities
- **Content modality**: chat, image, audio — each with modality-specific instructions
- **Safety constraints**: per-persona behavioral boundaries
- **Answer style and formatting**: persona-specific output formatting rules

Prompts must be versioned and kept separate from request handlers.

---

## 4. Subscription Plans

| Plan        | Price | Duration      | AI Model          | Limits                                                                                                      |
| ----------- | ----- | ------------- | ----------------- | ----------------------------------------------------------------------------------------------------------- |
| **Lite**    | Free  | **Permanent** | Cheapest approved | 5 conversations/day, 10 user prompts/conversation, 3 media generations/month, no video                      |
| **Pro**     | $19   | Monthly       | `gpt-5.2-pro`     | 50 conversations/day, 100 prompts/conversation, 50 image + 50 audio generations/month, no video             |
| **Premium** | $39   | Monthly       | `gpt-5.4-pro`     | Unlimited conversations, unlimited prompts, unlimited image + audio generations, 10 video generations/month |

### Plan Rules

1. **Lite is permanent and free.** There is no 3-day trial. There is no expiry. New users receive Lite by default upon account creation.
2. **All personas are available in all plans.** There are no persona restrictions per plan.
3. **Pro and Premium are paid-only.** Activated via Stripe Checkout one-time payment.
4. **Premium has 3 exclusive media features:** quality image generation, quality audio generation, and video generation.
5. When any limit is reached, the server **must end the conversation** with an exact stop reason and exact next-action instruction.
6. After a forced stop, the user is told one of: start a new conversation (if resources remain), upgrade plan (if applicable), or contact support.

### Lite Plan Limits (Detailed)

| Limit                                      | Value | Reset Window          |
| ------------------------------------------ | ----- | --------------------- |
| Conversations per day                      | 5     | 24 hours              |
| User prompts per conversation              | 10    | Per conversation      |
| Media generations (image + audio combined) | 3     | 30-day rolling window |
| Video generation                           | 0     | N/A                   |

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
- Daily conversation count tracked via `UsageEvent` model queries.
- Per-conversation prompt count tracked on `Task.promptCount` field.
- Media generation counters on User model plan subdoc.
- `checkUsageLimit()` utility validates against plan limits.
- `/api/openai` route checks all limits before making OpenAI calls.
- When any limit is hit: conversation is stopped, stop reason is recorded, user receives next-action message.

### Conversation Stop Reasons

| Reason Code                          | Message to User                                              | Next Action                                |
| ------------------------------------ | ------------------------------------------------------------ | ------------------------------------------ |
| `prompt_limit_reached`               | "You've reached the message limit for this conversation."    | `start_new_conversation` or `upgrade_plan` |
| `media_limit_reached`                | "You've reached your media generation limit."                | `upgrade_plan` or `contact_support`        |
| `daily_conversation_limit_reached`   | "You've reached the daily conversation limit for your plan." | `upgrade_plan` or `contact_support`        |
| `conversation_storage_limit_reached` | "This conversation has reached its storage limit."           | `start_new_conversation`                   |
| `billing_state_invalid`              | "Your plan has expired."                                     | `upgrade_plan`                             |

### Plan Technical Debt

- **TD-PLAN-04**: Lite still has 3-day expiry in code — **must be removed**.
- **TD-PLAN-05**: Prices still $29/$69 in code — **must update to $19/$39**.
- **TD-PLAN-06**: Lite restricts 2 companion personas — **must allow all 9**.
- **TD-PLAN-07**: No daily conversation limit enforcement — **must implement**.
- **TD-PLAN-08**: No per-conversation prompt limit — **must implement**.
- **TD-PLAN-09**: Plan descriptions outdated (trial language, old features) — **must update**.
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

- **TD-AUTH-01**: Proxy still protects `/profile(.*)`, `/plans(.*)`, `/dashboard/:path*` separately — **must update** after route restructure.
- **TD-AUTH-02**: Admin route is `/dashboard` — **must move to `/admin`**.

---

## 6. Data Models

### 6.1 User

| Field      | Type            | Required | Index  | Notes                           |
| ---------- | --------------- | -------- | ------ | ------------------------------- |
| clerkId    | String          | Yes      | unique | Clerk user ID                   |
| username   | String          | Yes      | unique |                                 |
| email      | String          | Yes      | No     | Not currently queried by filter |
| role       | String (enum)   | Yes      | No     | `"client"` or `"admin"`         |
| registerAt | Date            | Yes      | No     |                                 |
| plan       | Embedded subdoc | Yes      | No     | See Plan embedded schema        |
| firstName  | String          | No       | No     |                                 |
| lastName   | String          | No       | No     |                                 |
| updatedAt  | Date            | No       | No     |                                 |
| userimg    | String          | No       | No     |                                 |

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

### Data Model Technical Debt

- **TD-DB-05**: Task messages array unbounded (16MB risk). Must add size guard.

---

## 7. API Routes

### 7.1 POST /api/openai

- Auth: Required (Clerk `auth()`)
- Rate limiting: 20 requests / 60s per user (in-memory sliding window)
- Plan expiration check: Blocks expired paid plans; Lite never expires
- Entitlement resolution: Checks plan-level persona access and media capabilities
- Usage limit enforcement: All limits checked before OpenAI calls
- Conversation stop enforcement: Ends conversation with stop reason on limit hit
- Creates/updates Task documents
- Calls plan-appropriate AI models
- Uses tool calling for media generation dispatch
- Emits `UsageEvent` for every request
- Error classification: Maps OpenAI APIError to structured types
- **Target**: Streaming responses via SSE

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

- Auth: Svix signature verification
- Handles: `user.created`, `user.updated`, `user.deleted`
- On `user.deleted`: cleans up S3 objects under user prefix

### 7.6 POST /api/webhooks/stripe

- Auth: `stripe.webhooks.constructEvent` verification
- Handles: `checkout.session.completed`
- Idempotency check on `Transaction.stripeId`
- Resets usage counters on plan renewal

### API Technical Debt

- **TD-API-01**: In-memory rate limiter.
- **TD-API-06**: handleError loses stack traces.
- **TD-API-07**: No streaming implementation.

---

## 8. OpenAI Integration

### Models (Target)

| Model             | Plan    | Purpose           |
| ----------------- | ------- | ----------------- |
| Cheapest approved | Lite    | Chat completion   |
| `gpt-5.2-pro`     | Pro     | Chat completion   |
| `gpt-5.4-pro`     | Premium | Chat completion   |
| `gpt-4o-mini`     | All     | Title generation  |
| Provider TBD      | All     | Image generation  |
| Provider TBD      | Premium | Quality image gen |
| Provider TBD      | All     | Audio generation  |
| Provider TBD      | Premium | Quality audio gen |
| Provider TBD      | Premium | Video generation  |

### Current Models (Hardcoded)

`gpt-4o`, `gpt-4o-mini`, `dall-e-3`, `gpt-4o-audio-preview`

### AI Policy Model (Target)

Central resolver for model selection by plan, persona, and modality. No hardcoded model names.

### Streaming (Target)

Server-side streaming via OpenAI SDK. Client renders partial responses incrementally.

### OpenAI Technical Debt

- **TD-AI-01**: No streaming — must implement.
- **TD-AI-03**: No per-user cost tracking — must implement via UsageEvent.
- **TD-AI-06**: No retry/backoff for transient failures.
- **TD-AI-07**: Models hardcoded — must be plan-aware.
- **TD-AI-08**: No video generation (Premium feature).
- **TD-AI-09**: Prompts not optimized per persona/model.

---

## 9. File Handling

### Technical Debt

- **TD-FILE-01**: No S3 cleanup on user/task deletion.
- **TD-FILE-02**: Some flows send file as inline base64.

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

- **Unit tests**: 41 suites, 184 tests (Vitest)
- **E2E tests**: 3 Playwright specs
- **Coverage**: Not configured (planned)

---

## 14. Environment Variables

| Variable                            | Purpose                       |
| ----------------------------------- | ----------------------------- |
| `MONGODB_URL`                       | MongoDB connection string     |
| `NEXT_PUBLIC_API_BASE_URL`          | App base URL                  |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk public key              |
| `CLERK_SECRET_KEY`                  | Clerk secret                  |
| `CLERK_WEBHOOK_SECRET`              | Webhook verification          |
| `OPENAI_ORG`                        | OpenAI organization           |
| `OPENAI_PRJ`                        | OpenAI project                |
| `OPENAI_KEY`                        | OpenAI API key                |
| `STRIPE_SECRET_KEY`                 | Stripe secret                 |
| `STRIPE_WEBHOOK_SECRET`             | Stripe webhook verification   |
| `AWS_S3_REGION`                     | S3 region                     |
| `AWS_S3_BUCKET`                     | S3 bucket name                |
| `AWS_S3_ACCESS_ID`                  | S3 access key                 |
| `AWS_S3_SECRET_KEY`                 | S3 secret key                 |
| `DOWNLOAD_URL_ALLOWLIST`            | Allowed download hosts (opt.) |

---

## 15. Technical Debt Summary

### Active — Critical (Must Fix Before v1)

| ID         | Area     | Description                                  | Severity |
| ---------- | -------- | -------------------------------------------- | -------- |
| TD-PLAN-07 | Billing  | No daily conversation limit enforcement      | Critical |
| TD-PLAN-08 | Billing  | No per-conversation prompt limit enforcement | Critical |
| TD-AI-01   | OpenAI   | No streaming                                 | High     |
| TD-AI-07   | OpenAI   | Models hardcoded — need plan-aware selection | High     |
| TD-DB-05   | Database | Task messages unbounded (16MB risk)          | High     |
| TD-AUTH-01 | Auth     | Proxy protects old routes                    | High     |
| TD-AUTH-02 | Auth     | Admin at /dashboard not /admin               | High     |
| TD-UI-08   | UI       | Missing 5 public pages                       | High     |
| TD-UI-10   | UI       | Admin has no operational capability          | High     |

### Active — Medium/Low Priority

| ID         | Area     | Description                                       | Severity |
| ---------- | -------- | ------------------------------------------------- | -------- |
| TD-API-01  | API      | In-memory rate limiter                            | Medium   |
| TD-API-06  | API      | handleError loses stack traces                    | Medium   |
| TD-AI-03   | OpenAI   | No per-user cost tracking                         | Medium   |
| TD-AI-06   | OpenAI   | No retry/backoff                                  | Medium   |
| TD-AI-08   | OpenAI   | No video generation (Premium)                     | Medium   |
| TD-AI-09   | OpenAI   | Prompts not optimized                             | Medium   |
| TD-FILE-01 | Files    | No S3 cleanup on deletion                         | Medium   |
| TD-FILE-02 | Files    | Inline base64 file in some flows                  | Low      |
| TD-UI-07   | UI       | Homepage needs more sections                      | Medium   |
| TD-UI-09   | UI       | Account pages at wrong routes                     | Medium   |
| TD-UI-12   | UI       | Footer links non-functional (spans)               | Medium   |
| TD-UI-13   | UI       | Header nav missing /about, /faqs links            | Medium   |
| TD-DB-15   | Database | User deletion doesn't clean up Tasks              | Medium   |
| TD-PLAN-01 | Billing  | No recurring subscriptions (deferred v1)          | Low      |
| TD-BILL-01 | Billing  | Stripe redirect URLs hardcode old routes          | Medium   |
| TD-ACT-01  | Actions  | deleteAllTransactions has no audit trail          | Medium   |
| TD-LOG-01  | Logging  | console.error in production routes                | Low      |

### Resolved

| ID           | Description                           | Resolution                                      |
| ------------ | ------------------------------------- | ----------------------------------------------- |
| SEC-01       | getUserById no ownership check        | Ownership enforced                              |
| SEC-02       | getAllTransactions no ownership check | Ownership enforced                              |
| SEC-03       | console.log in /api/openai            | Removed                                         |
| TD-API-03    | generateImage temporary URLs          | Persisted to S3                                 |
| TD-API-05    | console.log in OpenAI utils           | Removed                                         |
| TD-PLAN-02   | Usage limits not enforced             | Implemented                                     |
| TD-PLAN-04   | Lite 3-day expiry                     | Removed — Lite now "Free forever"               |
| TD-PLAN-05   | Prices $29/$69                        | Updated to $19/$39                              |
| TD-PLAN-06   | Lite restricts 2 personas             | All 9 available in all plans                    |
| TD-PLAN-09   | Plan descriptions outdated            | Updated with accurate limits                    |
| TD-UI-11     | FAQ copy outdated (trial references)  | Rewritten for Droplet                           |
| TD-AI-02     | No OpenAI error classification        | Implemented                                     |
| TD-AI-05     | Audio base64 in messages              | Audio now uploaded to S3                         |
| TD-UI-04     | No error boundaries                   | Added                                           |
| TD-UI-05     | mapDateToLabel duplicated             | Extracted                                       |
| TD-RENAME-01 | "role" to "persona" rename            | Completed                                       |
| TD-RENAME-02 | Cellesseon → Droplet rename           | Completed (3 legacy migration keys intentional) |
| TD-DB-07     | Audio base64 inflates Task docs       | Audio uploads to S3, stores URL                 |
| TD-DB-08     | getUserById missing .lean()/.select() | Added                                           |
| TD-DB-09     | getAllTransactions missing .lean()    | Added                                           |
| TD-DB-10     | Task missing lifecycle fields         | Added in Phase 14                               |
| TD-DB-11     | UsageEvent model missing              | Created in Phase 14                             |
| TD-DB-12     | AppSetting model missing              | Created in Phase 14                             |
| TD-DB-13     | PublicPage model missing              | Created in Phase 14                             |
| TD-DB-14     | AdminAuditLog model missing           | Created in Phase 14                             |
| TD-UI-02     | No loading skeletons                  | Added                                           |
| TD-UI-06     | No conversation delete UI             | Added                                           |

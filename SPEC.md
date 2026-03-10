# Cellesseon — Application Specification

> Canonical product and system specification for the Cellesseon AI assistant SaaS.
> This document is governed by **CellesseonPM2** and must reflect approved direction only.

---

## 1. Product Overview

Cellesseon is a chatbot / AI assistant SaaS built on OpenAI models.
Authenticated users interact with an AI assistant through predefined **personas** that shape conversation tone and capabilities.
Each conversation is bound to one persona. Personas control system prompt, tool availability, and behavioral boundaries.
The product monetises through tiered subscription plans paid via Stripe.

### Terminology

- **Persona** (plural: **Personas**): A predefined AI assistant profile that controls system prompt, capabilities, and tone. Previously referred to as "assistant role" or "role." Not to be confused with `User.role` which refers to the user access level (`client` | `admin`).

### Core Value Proposition

- Multi-modal AI assistant (text + image + audio generation)
- 9 predefined personas with distinct system prompts and capabilities
- Conversation history persisted per user with resume capability
- Three-tier subscription model (Lite / Pro / Premium) with per-plan entitlements
- File upload and image download capabilities

### Approved v1 Release Scope

- 9 predefined personas (no dynamic persona creation)
- Text chat as primary mode
- Image upload support
- Image generation for paid tiers (with enforced usage limits)
- Audio generation for paid tiers (with enforced usage limits)
- Guest marketing site with persona showcase
- Authenticated `/app` experience with persona-led UX
- Real conversation history (list, resume, delete)
- Billing + entitlements that match product claims
- Minimal admin dashboard with real operational data

### Deferred from v1

- Relationship-persona expansion without policy work
- Team/workspace features
- Multi-provider LLM routing
- Stripe subscription mode (auto-renewal)
- Advanced admin CRUD (persona management, user management)
- Response streaming

---

## 2. User Roles

| Role          | Access                                                                                              |
| ------------- | --------------------------------------------------------------------------------------------------- |
| **Anonymous** | Landing page, pricing, personas showcase, sign-in/sign-up only                                      |
| **Client**    | Chat (`/app`), conversation resume, library, new conversation, profile, plans, billing history       |
| **Admin**     | All client access + admin dashboard (`/dashboard`)                                                  |

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

### New Personas (v1)

- **Wellness** — Lifestyle persona focused on mindfulness, stress management, healthy routines, and self-improvement. Audio-enabled for guided exercises.
- **Analyst** — Productivity persona for data interpretation, report writing, market research, and critical thinking. Image-enabled for chart/data analysis.

### Persona Selection & Entitlements

- Lite plan: access to `strategist`, `teacher`, `developer`, `creator`, `best-friend`, `wellness`, `analyst` only.
- Pro/Premium plan: access to all 9 personas.
- Persona selection UI: `ChatPersonaPicker` component in the chat interface.
- Persona is stored per task in `Task.personaId`.
- System prompt is built per-persona via `buildPersonaAwareSystemPrompt()`.
- Entitlements resolved via `resolveEntitlements()` in `src/lib/utils/resolve-entitlements.tsx`.

---

## 4. Subscription Plans

| Plan        | Price | Duration          | Limits                                                         |
| ----------- | ----- | ----------------- | -------------------------------------------------------------- |
| **Lite**    | Free  | 3 days            | Limited messaging, file uploads, 3 image generations, no audio |
| **Pro**     | $29   | Monthly or Yearly | Unlimited messaging/uploads, 20/mo image/audio                 |
| **Premium** | $69   | Monthly or Yearly | Unlimited everything                                           |

### Plan Lifecycle

1. New users start on **Lite** (3-day trial).
2. Upgrade via Stripe Checkout (one-time payment per billing cycle).
3. On successful `checkout.session.completed` webhook, the user's plan and expiration are updated.
4. Expired plans block OpenAI API calls (checked in `/api/openai` route).
5. No auto-renewal — plans are one-time payments with set expiration dates.

### Usage Limit Enforcement (Implemented)

- `plan.imageGenerations` and `plan.audioGenerations` counters on User model.
- `plan.usagePeriodStart` tracks the 30-day rolling window.
- `checkUsageLimit()` utility validates against `PLAN_LIMITS` constant.
- `/api/openai` route checks limits before making OpenAI calls.
- Counters increment after successful generation via `$inc` with `strict: true`.
- Counters reset to 0 on plan renewal (Stripe webhook).

### Plan Technical Debt

- **TD-PLAN-01**: No recurring subscription support — Stripe is in one-time payment mode. Deferred from v1.
- **TD-PLAN-03**: Yearly billing has no pricing discount defined.

---

## 5. Authentication & Authorization

- **Provider**: Clerk (`@clerk/nextjs` v7)
- **Route protection**: `src/proxy.tsx` (Next.js 16 proxy convention). No `middleware.ts`.
- **Protected routes**: `/app(.*)`, `/profile(.*)`, `/plans(.*)`, `/dashboard/:path*`
- **Admin routes**: `/dashboard/:path*` — requires `sessionClaims.metadata.role === "admin"`
- **Server actions**: Must verify `auth()` before DB operations. Ownership enforcement on all read/write operations.
- **API routes**: Must verify `auth()` before processing.
- **Webhooks**: Exempt from auth — verified via Svix (Clerk) and `stripe.webhooks.constructEvent` (Stripe).

### Security Issues — All Resolved

- **SEC-01**: `getUserById` ownership enforcement — **RESOLVED**.
- **SEC-02**: `getAllTransactions` ownership enforcement — **RESOLVED**.
- **SEC-03**: `console.log` in `/api/openai` route — **RESOLVED**.

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

| Field     | Type             | Required | Index | Notes                                  |
| --------- | ---------------- | -------- | ----- | -------------------------------------- |
| userId    | String           | Yes      | Yes   | Indexed, compound index with updatedAt |
| title     | String           | Yes      | No    |                                        |
| messages  | [Message] subdoc | Yes      | No    | Array of messages                      |
| personaId | String           | Yes      | Yes   | Indexed, defaults to "strategist"      |
| usage     | Number           | Yes      | No    | Token usage counter                    |
| createdAt | Date             | No       | No    |                                        |
| updatedAt | Date             | No       | Yes   | Indexed descending                     |

Compound index: `{ userId: 1, updatedAt: -1 }`

### Data Model Technical Debt

- **TD-DB-05**: Task stores entire message history as embedded array. Unbounded growth risk — MongoDB 16MB document limit.
- **TD-DB-07**: Audio generation stores base64 data directly in `Task.messages[].content[].audio_url`, inflating document size.
- **TD-DB-08**: `getUserById` does not use `.lean()` or `.select()` — fetches full Mongoose documents.
- **TD-DB-09**: `getAllTransactions` does not use `.lean()` — returns full Mongoose documents.

---

## 7. API Routes

### 7.1 POST /api/openai

- Auth: Required (Clerk `auth()`)
- Rate limiting: 20 requests / 60s per user (in-memory sliding window)
- Plan expiration check: Blocks expired plans
- Entitlement resolution: Checks plan-level persona access and image/audio capabilities
- Usage limit enforcement: Validates image/audio generation counts against plan limits
- Creates/updates Task documents
- Calls OpenAI `gpt-4o` for chat, `dall-e-3` for images, `gpt-4o-audio-preview` for audio
- Uses tool calling for image/audio generation dispatch
- Error classification: Maps OpenAI APIError status codes to structured error types

### 7.2 POST /api/upload

- Auth: Required
- Validates file type (JPEG, PNG, WebP, GIF only) and size (5MB max)
- Uploads to AWS S3 under `{userId}/uploads/`

### 7.3 GET /api/download

- Auth: Required
- SSRF protection via URL allowlist (protocol must be HTTPS, hostname must match)
- Proxies image download

### 7.4 POST/DELETE /api/aws

- Auth: Required (`currentUser()`)
- POST: Uploads base64-encoded image buffer to S3 (10MB limit)
- DELETE: Removes object from S3 with ownership verification

### 7.5 POST /api/webhooks/clerk

- Auth: Svix signature verification
- Handles: `user.created`, `user.updated`, `user.deleted`
- `createUserFromWebhook` is a non-exported private function

### 7.6 POST /api/webhooks/stripe

- Auth: `stripe.webhooks.constructEvent` signature verification
- Handles: `checkout.session.completed`
- Idempotency: Checks `Transaction.stripeId` before creating
- Validates metadata against plan name and billing cycle allowlists
- Resets usage counters on plan renewal

### API Technical Debt

- **TD-API-01**: In-memory rate limiter. Does not survive restarts, does not work across instances.
- **TD-API-06**: `handleError` utility re-throws with string concatenation, losing stack trace.

---

## 8. OpenAI Integration

### Models Used

| Model                  | Purpose              |
| ---------------------- | -------------------- |
| `gpt-4o`               | Main chat completion |
| `gpt-4o-mini`          | Title generation     |
| `dall-e-3`             | Image generation     |
| `gpt-4o-audio-preview` | Audio generation     |

### System Prompts

Persona-aware system prompts built via `buildPersonaAwareSystemPrompt()`. Each persona has its own `systemPrompt` field.

### Tool Calling

Two tools: `getGeneratedImage` and `getGeneratedAudio`. Conditionally included based on plan entitlements and persona capabilities.

### Error Classification (Implemented)

OpenAI `APIError` is caught and classified into structured error types:

- `rate_limit` (429) -> HTTP 429
- `timeout` (408/504) -> HTTP 504
- `service_error` (500/502/503) -> HTTP 502
- `unknown` -> HTTP 500

Generic error messages returned to client. No OpenAI details leaked.

### OpenAI Technical Debt

- **TD-AI-01**: No streaming. Users see "Thinking..." with no incremental feedback. Deferred from v1.
- **TD-AI-03**: No per-user token/cost tracking beyond `usage` field on Task documents.
- **TD-AI-05**: Audio base64 stored directly in message array, inflating document size.
- **TD-AI-06**: No retry/backoff for transient OpenAI failures.

---

## 9. File Handling

### Upload Flow

1. Client-side: File selected via `ChatInput` or `UploadFileInput`
2. `/api/upload`: Validates type + size, uploads to S3 under `{userId}/uploads/`
3. File URL returned to client

### Image Generation Flow

1. OpenAI generates image via DALL-E 3
2. Image converted to PNG via `sharp`
3. PNG uploaded to S3 under `{userId}/images/`
4. S3 URL stored in task message content

### Download Flow

1. Client requests `/api/download?url=...`
2. Server validates URL against allowlist (HTTPS only, hostname match)
3. Server proxies the download

### File Handling Technical Debt

- **TD-FILE-01**: No cleanup of orphaned S3 objects when tasks or users are deleted.
- **TD-FILE-02**: Chat input sends file as base64 in message body for some flows, bypassing `/api/upload`.

---

## 10. Security Posture

### Strengths

- Clerk proxy-based route protection with admin role check
- Webhook signature verification (Svix + Stripe) with idempotency
- Stripe metadata validation against allowlists
- File upload type/size validation with allowlists
- Download URL allowlisting (SSRF prevention, HTTPS-only)
- `crypto.getRandomValues` used (not `Math.random`)
- Auth checks in all server actions and API routes
- Ownership enforcement in `getUserById`, `getAllTransactions`, `deleteTask`, `updateUser`, `deleteUser`, `updateTask`
- Generic error messages to clients
- `/api/aws` DELETE verifies user-owned folder prefix
- Mongoose `strict: true`, `upsert: false` on all updates
- `createUserFromWebhook` is non-exported
- No `console.log` in production code (only `console.error` for actual errors)

### All Previously Reported Security Issues: RESOLVED

No active security issues as of this revision.

---

## 11. Frontend Architecture

### Routing

| Route                     | Type      | Description                                |
| ------------------------- | --------- | ------------------------------------------ |
| `/`                       | Public    | Landing page                               |
| `/pricing`                | Public    | Pricing page                               |
| `/personas`               | Public    | Personas showcase                          |
| `/sign-in`                | Auth      | Clerk sign-in                              |
| `/sign-up`                | Auth      | Clerk sign-up                              |
| `/app`                    | Protected | Chat dashboard with persona picker         |
| `/app/new`                | Protected | Persona selection to start new conversation |
| `/app/library`            | Protected | Conversation history list                  |
| `/app/personas`           | Protected | In-app personas page                       |
| `/app/c/[conversationId]` | Protected | Resume existing conversation               |
| `/profile`                | Protected | User profile + billing                     |
| `/plans`                  | Protected | Plan selection + checkout                  |
| `/dashboard`              | Admin     | Admin dashboard with live stats            |

### Design System

- Tailwind CSS v4.2 with custom design tokens
- Custom fonts: Dosis + Albert Sans
- Dark/light themes via `data-cellesseon-theme` attribute
- Bootstrap Icons for iconography

### Error Boundaries

- App-level: `src/app/error.tsx` — generic "Something went wrong" with "Try again" button
- Chat-level: `src/app/(chat)/error.tsx` — same pattern, scoped to chat routes

### Frontend Technical Debt

- **TD-UI-02**: No loading skeleton for page transitions.
- **TD-UI-06**: No conversation delete UI. `deleteTask` server action exists but no frontend calls it.
- **TD-RENAME-01**: All code references to "assistant role" / "AssistantRole" / `assistantRoleId` must be renamed to "persona" / "Persona" / `personaId`. This includes types, constants, components, models, tests, and route paths (`/roles` -> `/personas`).

---

## 12. Testing

- **Unit tests**: 31 suites, 139 tests (Vitest) — all passing
- **E2E tests**: 2 Playwright specs (landing page + authenticated flows)
- **Coverage**: Not configured
- **Test coverage areas**: Server actions (user, task, transaction), API routes (openai, upload, download, aws, webhooks), utilities (rate-limit, serialize, plan-status, date-formatting, usage-limit, entitlements, map-date-to-label), OpenAI functions (generateResponse, generateTitle, filterAssistantMsg), components (ChatWrapper, ChatInput, CellesseonTheme, AlertMessage), proxy

---

## 13. Environment Variables (Required)

| Variable                            | Purpose                                      |
| ----------------------------------- | -------------------------------------------- |
| `MONGODB_URL`                       | MongoDB connection string                    |
| `NEXT_PUBLIC_API_BASE_URL`          | App base URL                                 |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk public key                             |
| `CLERK_SECRET_KEY`                  | Clerk secret                                 |
| `CLERK_WEBHOOK_SECRET`              | Clerk webhook verification                   |
| `OPENAI_ORG`                        | OpenAI organization                          |
| `OPENAI_PRJ`                        | OpenAI project                               |
| `OPENAI_KEY`                        | OpenAI API key                               |
| `STRIPE_SECRET_KEY`                 | Stripe secret                                |
| `STRIPE_WEBHOOK_SECRET`             | Stripe webhook verification                  |
| `AWS_S3_REGION`                     | S3 region                                    |
| `AWS_S3_BUCKET`                     | S3 bucket name                               |
| `AWS_S3_ACCESS_ID`                  | S3 access key                                |
| `AWS_S3_SECRET_KEY`                 | S3 secret key                                |
| `DOWNLOAD_URL_ALLOWLIST`            | Additional allowed download hosts (optional) |

---

## 14. Technical Debt Summary

### Active

| ID           | Area     | Description                                                                        | Severity |
| ------------ | -------- | ---------------------------------------------------------------------------------- | -------- |
| TD-RENAME-01 | All      | Rename "role" → "persona" across types, constants, components, models, tests, routes | High     |
| TD-API-01    | API      | In-memory rate limiter; does not survive restarts or work across instances          | Medium   |
| TD-API-06    | API      | handleError utility re-throws with string concatenation, losing stack trace        | Medium   |
| TD-AI-01     | OpenAI   | No response streaming (deferred v1)                                                | Low      |
| TD-AI-03     | OpenAI   | No per-user token/cost tracking beyond Task.usage field                            | Low      |
| TD-AI-05     | OpenAI   | Audio base64 stored directly in message array, inflating document size             | High     |
| TD-AI-06     | OpenAI   | No retry/backoff for transient OpenAI failures                                     | Medium   |
| TD-DB-05     | Database | Task messages array unbounded growth (MongoDB 16MB limit risk)                     | High     |
| TD-DB-07     | Database | Audio base64 inflates Task document size (related to TD-AI-05)                     | High     |
| TD-DB-08     | Database | getUserById missing .lean() and .select()                                          | Medium   |
| TD-DB-09     | Database | getAllTransactions missing .lean()                                                 | Medium   |
| TD-FILE-01   | Files    | No S3 cleanup on user/task deletion                                                | Medium   |
| TD-FILE-02   | Files    | Some chat flows send file as base64 in message body                                | Low      |
| TD-PLAN-01   | Billing  | No recurring Stripe subscriptions (deferred v1)                                    | Low      |
| TD-PLAN-03   | Billing  | Yearly billing has no pricing discount                                             | Low      |
| TD-UI-02     | Frontend | No loading skeleton for page transitions                                           | Low      |
| TD-UI-06     | Frontend | No conversation delete UI (server action exists)                                   | High     |

### Resolved

| ID         | Description                                              | Resolution                                        |
| ---------- | -------------------------------------------------------- | ------------------------------------------------- |
| SEC-01     | getUserById no ownership check                           | Ownership enforced via authedUserId comparison    |
| SEC-02     | getAllTransactions no ownership check                    | Ownership enforced via authedUserId comparison    |
| SEC-03     | console.log in /api/openai                               | All console.log removed                           |
| TD-API-03  | generateImage returns temporary OpenAI URLs              | Images persisted to S3                            |
| TD-API-05  | console.log in generateImage, generateAudio, /api/openai | All removed                                       |
| TD-PLAN-02 | Usage limits not enforced                                | Full limit system implemented                     |
| TD-AI-02   | No OpenAI error classification                           | APIError classified with structured error types   |
| TD-UI-04   | No error boundary components                             | error.tsx at app-level and chat route group level |
| TD-UI-05   | mapDateToLabel duplicated                                | Extracted to shared utility                       |

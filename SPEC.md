# Cellesseon — Application Specification

> Canonical product and system specification for the Cellesseon AI assistant SaaS.
> This document is governed by **CellesseonPM2** and must reflect approved direction only.
> See `NewPlan.md` for the original architectural assessment that informed the current direction.

---

## 1. Product Overview

Cellesseon is a chatbot / AI assistant SaaS built on OpenAI models.
Authenticated users interact with an AI assistant through predefined assistant roles that shape conversation tone and capabilities.
Each conversation is bound to one assistant role. Roles control system prompt, tool availability, and behavioral boundaries.
The product monetises through tiered subscription plans paid via Stripe.

### Core Value Proposition

- Multi-modal AI assistant (text + image + audio generation)
- 7 predefined assistant roles with distinct system prompts and capabilities
- Conversation history persisted per user with resume capability
- Three-tier subscription model (Lite / Pro / Premium) with per-plan entitlements
- File upload and image download capabilities

### Approved v1 Release Scope

Based on the validated direction from `NewPlan.md`:

- 7 predefined assistant roles (no dynamic role creation)
- Text chat as primary mode
- Image upload support
- Image generation for paid tiers (with enforced usage limits)
- Audio generation for paid tiers (with enforced usage limits)
- Guest marketing site with role showcase
- Authenticated `/app` experience with role-led UX
- Real conversation history (list, resume, delete)
- Billing + entitlements that match product claims
- Minimal admin dashboard with real operational data

### Deferred from v1

- Relationship-role expansion without policy work
- Team/workspace features
- Multi-provider LLM routing
- Stripe subscription mode (auto-renewal)
- Advanced admin CRUD (role management, user management)
- Response streaming

---

## 2. User Roles

| Role          | Access                                                                                         |
| ------------- | ---------------------------------------------------------------------------------------------- |
| **Anonymous** | Landing page, pricing, roles showcase, sign-in/sign-up only                                    |
| **Client**    | Chat (`/app`), conversation resume, library, new conversation, profile, plans, billing history |
| **Admin**     | All client access + admin dashboard (`/dashboard`)                                             |

Role is stored in `User.role` (Mongoose) and synced to Clerk `publicMetadata.role`.
Admin access is enforced at the proxy level (`src/proxy.tsx`) via Clerk session claims (`metadata.role === "admin"`).

---

## 3. Assistant Roles

7 predefined roles defined in `src/constants/assistant-roles.tsx`:

| Role ID       | Label       | Category     | Image | Audio |
| ------------- | ----------- | ------------ | ----- | ----- |
| `strategist`  | Strategist  | Productivity | Yes   | No    |
| `teacher`     | Teacher     | Learning     | Yes   | Yes   |
| `developer`   | Developer   | Productivity | Yes   | No    |
| `creator`     | Creator     | Creative     | Yes   | Yes   |
| `best-friend` | Best Friend | Companion    | No    | Yes   |
| `boyfriend`   | Boyfriend   | Companion    | No    | Yes   |
| `girlfriend`  | Girlfriend  | Companion    | No    | Yes   |

Each role has: `id`, `label`, `tagline`, `description`, `category`, `icon`, `starterPrompts[]`, `systemPrompt`, `supportsImage`, `supportsAudio`.

### Role Selection & Entitlements

- Lite plan: access to `strategist`, `teacher`, `developer`, `creator`, `best-friend` only.
- Pro/Premium plan: access to all 7 roles.
- Role selection UI: `ChatRolePicker` component in the chat interface.
- Role is stored per task in `Task.assistantRoleId`.
- System prompt is built per-role via `buildRoleAwareSystemPrompt()`.
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

### Plan Technical Debt

- **TD-PLAN-01**: No recurring subscription support — Stripe is in one-time payment mode. Deferred from v1.
- **TD-PLAN-02**: Usage limits for image/audio generation are not enforced in code. No server-side counters tracking generation counts against plan limits. **Critical gap — marketing claims are unenforceable.**
- **TD-PLAN-03**: Yearly billing has no pricing discount defined.

---

## 5. Authentication & Authorization

- **Provider**: Clerk (`@clerk/nextjs` v7)
- **Route protection**: `src/proxy.tsx` (Next.js 16 proxy convention). No `middleware.ts`.
- **Protected routes**: `/app(.*)`, `/profile(.*)`, `/plans(.*)`, `/dashboard/:path*`
- **Admin routes**: `/dashboard/:path*` — requires `sessionClaims.metadata.role === "admin"`
- **Server actions**: Must verify `auth()` before DB operations.
- **API routes**: Must verify `auth()` before processing.
- **Webhooks**: Exempt from auth — verified via Svix (Clerk) and `stripe.webhooks.constructEvent` (Stripe).

### Security Issues (Active)

- **SEC-01**: `getUserById` in `user.actions.tsx` allows any authenticated user to read any other user's data. The `userId` parameter is not compared against `authedUserId`. **Ownership not enforced.**
- **SEC-02**: `getAllTransactions` in `transaction.action.tsx` allows any authenticated user to pass any `userId` to retrieve another user's transaction history. **Ownership not enforced.**
- **SEC-03**: `/api/openai` route contains a `console.log` that outputs generated task content to server logs. Should be removed.

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

**Plan subdoc**: `{ id, name, amount, billing, startedOn, expiresOn, stripeId }`

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

| Field           | Type             | Required | Index | Notes                                  |
| --------------- | ---------------- | -------- | ----- | -------------------------------------- |
| userId          | String           | Yes      | Yes   | Indexed, compound index with updatedAt |
| title           | String           | Yes      | No    |                                        |
| messages        | [Message] subdoc | Yes      | No    | Array of messages                      |
| assistantRoleId | String           | Yes      | Yes   | Indexed, defaults to "strategist"      |
| usage           | Number           | Yes      | No    | Token usage counter                    |
| createdAt       | Date             | No       | No    |                                        |
| updatedAt       | Date             | No       | Yes   | Indexed descending                     |

Compound index: `{ userId: 1, updatedAt: -1 }`

### Data Model Technical Debt

- **TD-DB-05**: Task stores entire message history as embedded array. Unbounded growth risk — MongoDB 16MB document limit.
- **TD-DB-07**: Audio generation stores base64 data directly in `Task.messages[].content[].audio_url`, inflating document size.

---

## 7. API Routes

### 7.1 POST /api/openai

- Auth: Required (Clerk `auth()`)
- Rate limiting: 20 requests / 60s per user (in-memory sliding window)
- Plan expiration check: Blocks expired plans
- Entitlement resolution: Checks plan-level role access and image/audio capabilities
- Creates/updates Task documents
- Calls OpenAI `gpt-4o` for chat, `dall-e-3` for images, `gpt-4o-audio-preview` for audio
- Uses tool calling for image/audio generation dispatch

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

### API Technical Debt

- **TD-API-01**: In-memory rate limiter. Does not survive restarts, does not work across instances.
- **TD-API-03**: `generateImage` returns temporary OpenAI URLs, not persisted to S3. URLs expire.
- **TD-API-05**: `console.log` statements in `generateImage`, `generateAudio`, and `/api/openai` route.
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

Role-aware system prompts built via `buildRoleAwareSystemPrompt()`. Each assistant role has its own `systemPrompt` field.

### Tool Calling

Two tools: `getGeneratedImage` and `getGeneratedAudio`. Conditionally included based on plan entitlements and role capabilities.

### OpenAI Technical Debt

- **TD-AI-01**: No streaming. Users see "Thinking..." with no incremental feedback. Deferred from v1.
- **TD-AI-02**: No error classification for OpenAI rate limits (429s), timeouts, or service degradation.
- **TD-AI-03**: No per-user token/cost tracking beyond `usage` field on Task documents.
- **TD-AI-04**: Premium plan promises "Multiple AI model selection" — no implementation exists.
- **TD-AI-05**: Audio base64 stored directly in message array, inflating document size.
- **TD-AI-06**: No retry/backoff for transient OpenAI failures.

---

## 9. File Handling

### Upload Flow

1. Client-side: File selected via `ChatInput` or `UploadFileInput`
2. `/api/upload`: Validates type + size, uploads to S3 under `{userId}/uploads/`
3. File URL returned to client

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
- Generic error messages to clients
- `/api/aws` DELETE verifies user-owned folder prefix
- Mongoose `strict: true`, `upsert: false` on all updates
- `createUserFromWebhook` is non-exported

### Active Security Issues

- **SEC-01**: `getUserById` — no ownership enforcement (any authed user can read any user)
- **SEC-02**: `getAllTransactions` — no ownership enforcement (any authed user can read any user's transactions)
- **SEC-03**: `console.log` in `/api/openai` route outputs task content to server logs

---

## 11. Frontend Architecture

### Routing

| Route                     | Type      | Description                              |
| ------------------------- | --------- | ---------------------------------------- |
| `/`                       | Public    | Landing page                             |
| `/pricing`                | Public    | Pricing page                             |
| `/roles`                  | Public    | Assistant roles showcase                 |
| `/sign-in`                | Auth      | Clerk sign-in                            |
| `/sign-up`                | Auth      | Clerk sign-up                            |
| `/app`                    | Protected | Chat dashboard with role picker          |
| `/app/new`                | Protected | Role selection to start new conversation |
| `/app/library`            | Protected | Conversation history list                |
| `/app/roles`              | Protected | In-app roles page                        |
| `/app/c/[conversationId]` | Protected | Resume existing conversation             |
| `/profile`                | Protected | User profile + billing                   |
| `/plans`                  | Protected | Plan selection + checkout                |
| `/dashboard`              | Admin     | Admin dashboard with live stats          |

### Design System

- Tailwind CSS v4.2 with custom design tokens
- Custom fonts: Dosis + Albert Sans
- Dark/light themes via `data-cellesseon-theme` attribute
- Bootstrap Icons for iconography

### Frontend Technical Debt

- **TD-UI-02**: No loading skeleton for page transitions.
- **TD-UI-04**: No error boundary components (`error.tsx` missing).
- **TD-UI-05**: `mapDateToLabel` function duplicated in `chat-sidebar.tsx` and `library/page.tsx`.
- **TD-UI-06**: No conversation delete UI.

---

## 12. Testing

- **Unit tests**: 24 suites, 107 tests (Vitest) — all passing
- **E2E tests**: 2 Playwright specs (landing page + authenticated flows)
- **Coverage**: Not configured
- **Missing test areas**: OpenAI utility functions, deleteTask, conversation resume flow, admin dashboard

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

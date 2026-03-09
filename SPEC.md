# Cellesseon — Application Specification

> Canonical product and system specification for the Cellesseon AI assistant SaaS.
> This document is governed by **CellesseonPM2** and must reflect approved direction only.

---

## 1. Product Overview

Cellesseon is a chatbot / AI assistant SaaS built on OpenAI models.
Authenticated users interact with an AI assistant that can generate text, images (DALL-E 3), and audio.
The product monetises through tiered subscription plans paid via Stripe.

### Core Value Proposition

- Multi-modal AI assistant (text + image + audio generation)
- Conversation history (tasks) persisted per user
- Three-tier subscription model (Lite / Pro / Premium)
- File upload and image download capabilities

---

## 2. User Roles

| Role | Access |
|---|---|
| **Anonymous** | Landing page, sign-in/sign-up only |
| **Client** | Chat, profile, plans, billing history |
| **Admin** | All client access + admin dashboard (/dashboard) |

Role is stored in User.role (Mongoose) and synced to Clerk publicMetadata.role.
Admin access is enforced at the proxy level (src/proxy.tsx) via Clerk session claims (metadata.role === "admin").

---

## 3. Subscription Plans

| Plan | Price | Duration | Limits |
|---|---|---|---|
| **Lite** | Free | 3 days | Limited messaging, file uploads, 3 image/audio generations |
| **Pro** |  | Monthly or Yearly | Unlimited messaging/uploads, 20/mo image/audio |
| **Premium** |  | Monthly or Yearly | Multiple AI models, unlimited everything |

### Plan Lifecycle

1. New users start on **Lite** (3-day trial).
2. Upgrade via Stripe Checkout (one-time payment per billing cycle).
3. On successful checkout.session.completed webhook, the user's plan and expiration are updated.
4. Expired plans block OpenAI API calls (checked in /api/openai route).
5. No auto-renewal — plans are one-time payments with set expiration dates.

### Known Plan Issues (Technical Debt)

- **TD-PLAN-01**: No recurring subscription support — Stripe is used in one-time payment mode, not subscription mode. This means no auto-renewal, no proration, and no Stripe-managed billing lifecycle.
- **TD-PLAN-02**: Usage limits (e.g., "20/mo image generation" for Pro) are not enforced in code. These are marketing claims only — there is no server-side counter tracking image/audio generation counts against plan limits.
- **TD-PLAN-03**: Yearly billing discount is not defined in the pricing constants. The price is the same regardless of billing cycle selection.

---

## 4. Authentication & Authorization

- **Provider**: Clerk (@clerk/nextjs v7)
- **Route protection**: src/proxy.tsx (Next.js 16 proxy convention). No middleware.ts.
- **Protected routes**: /profile(.*), /plans(.*), /dashboard/:path*
- **Admin routes**: /dashboard/:path* — requires sessionClaims.metadata.role === "admin"
- **Server actions**: Must verify uth() before DB operations.
- **API routes**: Must verify uth() before processing.
- **Webhooks**: Exempt from auth — verified via Svix (Clerk) and stripe.webhooks.constructEvent (Stripe).

### Known Auth Issues (Technical Debt)

- **TD-AUTH-01**: The chat page (/) is not in the protected routes list, but the page fetches user data and renders the chat UI for authenticated users. The /api/openai route correctly requires auth, but the page itself can be accessed by anyone — which is by design (it shows the landing page for anonymous users and the chat for authenticated users).

---

## 5. Data Models

### 5.1 User

| Field | Type | Required | Index | Notes |
|---|---|---|---|---|
| clerkId | String | Yes | unique | Clerk user ID |
| username | String | Yes | unique | |
| email | String | Yes | No | **Missing index** — queried indirectly |
| role | String (enum) | Yes | No | `"client"` or `"admin"` |
| registerAt | Date | Yes | No | |
| plan | Embedded subdoc | Yes | No | See Plan embedded schema |
| firstName | String | No | No | |
| lastName | String | No | No | |
| updatedAt | Date | No | No | |
| userimg | String | No | No | |

**Plan subdoc**: `{ id, name, amount, billing, startedOn, expiresOn, stripeId }`

### 5.2 Transaction

| Field | Type | Required | Index | Notes |
|---|---|---|---|---|
| userId | ObjectId (ref User) | Yes | No | **Missing index** |
| stripeId | String | Yes | unique | Stripe session ID |
| clerkId | String | Yes | No | **Missing index** — queried in `getAllTransactions` |
| createdAt | Date | Yes | No | |
| expiresOn | Date | Yes | No | |
| plan | String (enum) | Yes | No | |
| billing | String (enum) | Yes | No | |
| amount | Number | Yes | No | |

### 5.3 Task

| Field | Type | Required | Index | Notes |
|---|---|---|---|---|
| userId | String | Yes | No | **Missing index** — queried in `updateTask` |
| title | String | Yes | No | |
| messages | [Message] subdoc | Yes | No | Array of messages |
| usage | Number | Yes | No | Token usage counter |
| createdAt | Date | No | No | |
| updatedAt | Date | No | No | |

### Known Data Model Issues (Technical Debt)

- **TD-DB-01**: Missing indexes on `Transaction.clerkId`, `Transaction.userId`, and `Task.userId`. These fields are used in query filters and will cause full collection scans. Violates AGENTS.md rule: "Add `index: true` on any Mongoose field used in query filters."
- **TD-DB-02**: `user.actions.tsx` → `updateUser` uses `strict: false` and `upsert: true`. This violates AGENTS.md rules for both `strict: true` and `upsert: false`.
- **TD-DB-03**: Clerk webhook `user.updated` handler also uses `strict: false` and `upsert: true`.
- **TD-DB-04**: Stripe webhook `User.findOneAndUpdate` uses `strict: false`.
- **TD-DB-05**: Task model stores the entire message history as an embedded array. This will grow unbounded and could hit MongoDB's 16MB document size limit for long conversations.
- **TD-DB-06**: No chat history listing endpoint. The sidebar shows `"History"` with only a `"New Task"` link. There is no API or server action to list a user's previous tasks/conversations.

---

## 6. API Routes

### 6.1 POST /api/openai

- Auth: Required (Clerk `auth()`)
- Rate limiting: 20 requests / 60s per user (in-memory sliding window)
- Plan expiration check: Blocks expired plans
- Creates/updates Task documents
- Calls OpenAI `gpt-4o` for chat, `dall-e-3` for images, `gpt-4o-audio-preview` for audio
- Uses tool calling for image/audio generation dispatch

### 6.2 POST /api/upload

- Auth: Required
- Validates file type (JPEG, PNG, WebP, GIF only) and size (5MB max)
- Uploads to AWS S3 under `{userId}/uploads/`

### 6.3 GET /api/download

- Auth: Required
- SSRF protection via URL allowlist (`oaidalleapiprodscus.blob.core.windows.net`, `img.clerk.com`)
- Proxies image download

### 6.4 POST/DELETE /api/aws

- Auth: Required (`currentUser()`)
- POST: Uploads base64-encoded image buffer to S3
- DELETE: Removes object from S3

### 6.5 POST /api/webhooks/clerk

- Auth: Svix signature verification
- Handles: `user.created`, `user.updated`, `user.deleted`

### 6.6 POST /api/webhooks/stripe

- Auth: `stripe.webhooks.constructEvent` signature verification
- Handles: `checkout.session.completed`
- Idempotency: Checks `Transaction.stripeId` before creating

### Known API Issues (Technical Debt)

- **TD-API-01**: `/api/openai` rate limiter is in-memory only. It will not survive server restarts and does not work across multiple server instances.
- **TD-API-02**: `/api/aws` POST route accepts raw base64 image data in the JSON body without size validation. This could allow very large payloads.
- **TD-API-03**: `generateImage` has commented-out AWS upload code (axios-based). The generated image URL is returned directly from OpenAI (temporary URL), not persisted to S3. These URLs expire.
- **TD-API-04**: `/api/aws` DELETE route does not verify that the user owns the file being deleted — it accepts any `folder`/`fileName` combination.

---

## 7. OpenAI Integration

### Models Used

| Model | Purpose |
|---|---|
| `gpt-4o` | Main chat completion |
| `gpt-4o-mini` | Title generation |
| `dall-e-3` | Image generation |
| `gpt-4o-audio-preview` | Audio generation |

### System Prompt

Single monolithic system prompt for all users. No assistant role customization or predefined personas exist yet.

### Tool Calling

Two tools defined: `getGeneratedImage` and `getGeneratedAudio`. Dispatched via OpenAI function calling from `generateResponse`.

### Known OpenAI Issues (Technical Debt)

- **TD-AI-01**: No streaming — responses are waited for in full before returning. For long responses, users see "Thinking..." with no incremental feedback.
- **TD-AI-02**: No error handling for OpenAI rate limits (429s), timeouts, or service degradation. Errors propagate as generic 500s.
- **TD-AI-03**: No token/cost tracking per user beyond the `usage` field on Task documents.
- **TD-AI-04**: Premium plan promises "Multiple AI model selection" but there is no model selection UI or logic.
- **TD-AI-05**: Audio generation stores base64 audio data directly in the message array, which inflates Task document size.
- **TD-AI-06**: No retry/backoff for transient OpenAI failures.

---

## 8. File Handling

### Upload Flow

1. Client-side: File selected, converted to base64
2. `/api/upload`: Validates type + size, uploads to S3
3. File URL returned to client for inclusion in chat message

### Download Flow

1. Client requests `/api/download?url=...`
2. Server validates URL against allowlist
3. Server proxies the download

### AWS S3 Storage

- Upload utility: `src/lib/utils/aws/uploadFileToAWS.tsx`
- Delete utility: `src/lib/utils/aws/deleteFileFromAWS.tsx`
- S3 client config: `src/constants/aws.tsx`
- File organization: `{userId}/{context}/{filename}`

### Known File Handling Issues (Technical Debt)

- **TD-FILE-01**: No cleanup of orphaned S3 objects when tasks are deleted or users are deleted.
- **TD-FILE-02**: Chat input sends file as base64 in the message body (client-side), bypassing the `/api/upload` route. The upload route exists but is not used by the chat input flow.

---

## 9. Security Posture

### Strengths

- Clerk proxy-based route protection
- Webhook signature verification (Svix + Stripe)
- File upload type/size validation with allowlists
- Download URL allowlisting (SSRF prevention)
- `crypto.getRandomValues` used in `generateString` (not Math.random)
- Auth checks in all server actions and API routes
- Generic error messages to clients

### Weaknesses

- `strict: false` on multiple Mongoose `findOneAndUpdate` calls (allows arbitrary field injection)
- `upsert: true` usage creates records on miss when not intended
- `/api/aws` DELETE does not verify file ownership
- In-memory rate limiter is bypassable via server restart
- No CSRF protection beyond what Clerk provides

---

## 10. Frontend Architecture

### Server Components

- All pages and layouts are Server Components
- Data fetched server-side via server actions
- `src/app/page.tsx` — conditional rendering (landing vs chat)

### Client Components

- `ChatWrapper` — main chat state management
- `ChatInput` — text + file input
- `ChatBody` — message rendering with markdown
- `ChatSidebar` — sidebar with plan promo
- `CellesseonTheme` — theme toggle
- Various shared components (alerts, tooltips, etc.)

### Design System

- Tailwind CSS v4.2 with custom design tokens
- Custom fonts: Dosis + Albert Sans
- Dark/light themes via `data-cellesseon-theme` attribute
- Bootstrap Icons for iconography

### Known Frontend Issues (Technical Debt)

- **TD-UI-01**: No conversation history list — sidebar only shows "New Task". Users cannot resume previous conversations.
- **TD-UI-02**: No loading skeleton for page transitions.
- **TD-UI-03**: Admin dashboard is placeholder content (lorem ipsum).
- **TD-UI-04**: No error boundary components.

---

## 11. Testing

- **Unit tests**: 24 suites, 103 tests (Vitest) — all passing
- **E2E tests**: 2 Playwright specs (landing page + authenticated flows)
- **Coverage**: Not configured
- **Missing test areas**: OpenAI utility functions (generateResponse, generateImage, generateAudio), checkout flow, user deletion cascade

---

## 12. Environment Variables (Required)

| Variable | Purpose |
|---|---|
| `MONGODB_URL` | MongoDB connection string |
| `NEXT_PUBLIC_API_BASE_URL` | App base URL |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk public key |
| `CLERK_SECRET_KEY` | Clerk secret |
| `CLERK_WEBHOOK_SECRET` | Clerk webhook verification |
| `OPENAI_ORG` | OpenAI organization |
| `OPENAI_PRJ` | OpenAI project |
| `OPENAI_KEY` | OpenAI API key |
| `STRIPE_SECRET_KEY` | Stripe secret |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook verification |
| `AWS_S3_REGION` | S3 region |
| `AWS_S3_BUCKET` | S3 bucket name |
| `AWS_S3_ACCESS_ID` | S3 access key |
| `AWS_S3_SECRET_KEY` | S3 secret key |
| `DOWNLOAD_URL_ALLOWLIST` | Additional allowed download hosts (optional) |

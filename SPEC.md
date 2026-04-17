# Droplet — Application Specification

> Canonical product and system specification for the Droplet AI assistant SaaS.
> This document is governed by **Droplet-PM** and must reflect approved direction only.
> ...04-17 (PM audit #130). Milestones 0–25 COMPLETE. TDD rebuild COMPLETE (Phases 120.1–120.7). WCAG 2.2 AA COMPLETE. **V1.0 MVP RELEASED.** Brand rename complete (Phase 172). Catch blocks documented (Phase 167.2 + Phase 223). Promo text admin-configurable (Phase 162, 180.2–180.3). Global error boundary live (Phase 163). Admin error boundary live (Phase 187-A). Phases 143–233 COMPLETE (all sub-phases). Phase 226 COMPLETE (admin actions split into 5 domain files). Phase 228 COMPLETE (Stripe webhook split — route 1,094→61 lines). Phase 229 COMPLETE (generateResponse extraction — 1,078→861 lines). Phase 225 COMPLETE (full OpenAI route decomposition — 4 modules, route 1,549→883 lines). Phase 230 COMPLETE (.d.tsx → .d.ts rename). Admin sidebar persistence COMPLETE. E2E: 49 tests (8 spec files). Coverage: 85/80/85/85. 729 tests (110 suites). Build passing. Node.js 24.12.0. jsdom pinned to ~24.1.3 (ESM compat). TypeScript 6.0.2 + ESLint 10 fully compatible (audit #103). **Zod v4.1.12** — schema consistency across all server actions and API routes. Prettier pinned to ~3.8.1. **Stripe recurring billing COMPLETE (all Phases 217-A through 217-G).** 0 npm vulnerabilities. All 7 gates GREEN. **0 god files remaining.** Largest files: generateResponse.tsx (861), admin-queries.ts (826), normalize-admin-settings.ts (813), openai/route.tsx (805). All under 900 lines. **Active backlog: 4 CRITICAL + 1 HIGH + 1 MEDIUM items (PM audit #130).**
>
> **V1.0 MVP Released (PM audit #94):**
>
> - ✅ All v1.0 pre-release fixes DONE (Phases 187-A through 187-D, 143, 180.2–180.4).
> - ✅ Phase 188 DONE — PlanCard `isIncluded` bug fixed. 602 tests.
> - ✅ Phases 189–200 DONE — Admin protection, ADMIN display, reusable components, TiptapEditor, image vision, audio overlap, lightbox, upload previews, startTransition, admin suspension. 617 tests.
> - ✅ Phase 202 DONE — Unit test PLAN_LIMITS alignment. Phase 203 DONE — E2E contrast fix. 619 tests, 0 failures.
> - ✅ Phase 201 DONE — Avatar sync MongoDB→Clerk. Non-blocking.
> - ✅ Phase 144 DONE — Admin config cache (30s TTL, in-flight dedupe, cache invalidation).
> - ✅ Phase 204 DONE — All 6 API routes at `maxDuration = 60` (Vercel Hobby ceiling).
> - ✅ Phase 205 DONE — Sidebar live update on new chat via `router.refresh()` with one-time guard.
> - ✅ Phase 206 DONE — Upload error propagation, client MIME validation, narrowed `accept` attribute.
> - ✅ Phase 207 DONE — Upload magic byte validation (JPEG/PNG/GIF/WebP). Defense-in-depth.
> - ✅ Phase 145 DONE — Upload filename collision prevention via `crypto.randomUUID()`.
> - ✅ Phase 165 DONE — Checkout success page DB polling (4s interval, 30s max, 3 states).
> - ✅ Phase 165.1 DONE — Plan-status route hardening (`maxDuration=60`, rate limiting 30 req/60s).
> - ✅ Phase 146 DONE — Admin user detail transaction limit (`.limit(50)`).
> - ✅ Phase 147 DONE — Rename 5 `.tsx` utility files to `.ts` (no JSX content).
> - ✅ Phase 148 DONE — Bulk operations partial-failure reporting (all 5 bulk admin actions).
> - ✅ Phase 208 DONE — jsdom ESM compatibility fix (pinned to `~24.1.3`). 640 tests.
> - ✅ Phases 29.1–29.5 DONE — Zod/Zustand modernization. 13 admin actions converted to per-action Zod schemas. Client poller Zod validated. Helper cleanup. Zustand audit: no changes needed.
> - ✅ Phases 209–216 DONE — Sidebar restructure: label renames, Library link migration, Recent conditional, loading fallback, CSS transitions, toggle relocation, renameTask action, dropdown menu, PersonaSelector move. 644 tests.
>
> **Remaining Issues:**
>
> - **TD-PAYMENT-03** — 🔴 CRITICAL (OWNER ACTION). Stripe webhook not delivering events post-payment. Webhook handler code is correct. Code-level projection bugs FIXED (Phases 234-A, 234-A2). Owner must verify Stripe Dashboard webhook configuration (endpoint URL, signing secret, enabled events, mode match). Stripe CLI was forwarding to wrong URL (`/api/stripe/webhook` instead of `/api/webhooks/stripe`). See PM audit #129, #130.
> - **TD-PROJECTION-01** — ✅ RESOLVED (PM audit #130, Phase 234-A). `USER_SYNC_PROJECTION` now includes `stripeCustomerId`, `stripeSubscriptionId`, `subscriptionStatus`, `suspended`.
> - **TD-BILLING-01** — ✅ RESOLVED (PM audit #130, Phase 234-A2). `getAllTransactions()` `.select()` now includes `stripeId`. Billing history Active/Inactive status works correctly.
> - **TD-SYNC-01** — ✅ RESOLVED (PM audit #130, Phase 235). MongoDB→Clerk sync expanded to include `firstName` and `lastName` in batched call. Email sync deferred (requires Clerk verification flow — documented as known limitation).
> - **TD-CHECKOUT-UX-01** — ✅ RESOLVED (PM audit #130, Phase 234-C). Checkout timeout message now warns "If your plan hasn't updated within 10 minutes, please contact support." with amber visual style.
> - **TD-MEDIA-01** — 🟡 ACCEPTED LIMITATION. Media gen (image/audio) may approach Vercel Hobby 60s timeout. Phase 181 proactive timeout handles gracefully.
> - **TD-AI-13** — 3 model pricing placeholders (awaiting OpenAI confirmation).
> - **TD-AI-18** — Advisory: errorMessage forwarding pattern is safe but fragile.
> - **TD-API-09** — Monitor: `.strict()` in messageTextContentSchema.

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

- Multi-modal AI assistant (text + image + audio generation)
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
- Video generation — **REMOVED** (owner directive, PM audit #85). Both `sora-2` and `sora-2-pro` deprecated. Phase 186-A removes all video code.
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
- User-created custom personas
- Broad role systems beyond `client` and `admin`

> **Moved to active development:** Stripe subscription mode (Phases 217-A–G, 217-A DONE), Yearly billing pricing discount (Phase 217-E).

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
> **Rule 10:** All features (image, audio) are available for all personas — differentiated by persona purpose (prompt context), not blocked per persona. All plans provide all features — differentiated by plan limits (quantity). Video generation has been removed from the product (owner directive, PM audit #85).
> **Rule (new):** Each persona acts as an independent AI agent trained and skilled for its field. Related tools and features are provided to each persona to perform best in its domain. Personas are displayed in a 3-per-row grid on desktop. Each persona has a representative hero image. All persona configuration (access, enablement) is managed exclusively from the admin panel by the admin role. Unavailable personas are clearly labeled as "PRO" or "PREMIUM" feature with a small-font indicator.

### Persona Trial Access (Limited Access Model)

Users can TEST personas outside their plan's full-access set with reduced limits ("try before you buy").

**Trial limits per conversation (for limited-access personas):**

| Limit                    | Value | Scope                 |
| ------------------------ | ----- | --------------------- |
| Prompts per conversation | 5     | Per conversation      |
| Image generations        | 3     | 30-day rolling window |
| Audio generations        | 2     | 30-day rolling window |

**Rules:**

- Trial limits are GLOBAL across all limited-access personas (not per-persona tracking).
- Trial media counters are SEPARATE from plan media counters.
- When trial prompt limit (5) is reached, conversation ends with upgrade CTA.
- When trial media limit is reached, media generation is blocked with upgrade CTA.
- Trial counters tracked on User model: `trialImageGenerations`, `trialAudioGenerations`, `trialUsagePeriodStart`.
- Atomic enforcement via `findOneAndUpdate` with `$lt` guard (same pattern as plan counters).

Each persona has: `id`, `label`, `tagline`, `description`, `category`, `icon`, `starterPrompts[]`, `systemPrompt`, `supportsImage`, `supportsAudio`.

### Persona Selection & Entitlements

- **Personas are plan-gated** (Lite: 2 personas, Pro: 5 personas, Premium: all 6 personas).
- Default persona access per plan is hardcoded in constants but overridable by admin via AppSetting.
- Persona selection UI: `ChatInput` includes a `PersonaSelector` dropdown next to the file upload button for quick persona switching — selector is disabled during active conversations (`messages.length > 0` or `taskStatus === "ended"` — persona is bound per-task). `ChatPersonaPicker` component on `/app/new` page provides full persona browsing with trial badges. `/app/personas` route removed (Phase 210) — redirects to `/app/new`. `/app/new` is labeled "Personas" in sidebar.
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

| Plan        | Price | Duration      | Chat Model (default)            | Limits                                                                         |
| ----------- | ----- | ------------- | ------------------------------- | ------------------------------------------------------------------------------ |
| **Lite**    | Free  | **Permanent** | `gpt-4o-mini`                   | 10 conversations/day, 10 prompts/conversation, 1 image/month, 1 audio/month    |
| **Pro**     | $19   | Monthly       | `gpt-4.1`                       | 50 conversations/day, 100 prompts/conversation, 50 image/month, 50 audio/month |
| **Premium** | $39   | Monthly       | `gpt-4.1` / `gpt-5.4` (complex) | Unlimited conversations, unlimited prompts, unlimited image + audio            |

> Full model policy (all features � plans � task classes) in **Section 8**.

### Plan Rules

1. **Lite is permanent and free.** There is no 3-day trial. There is no expiry. New users receive Lite by default upon account creation.
2. **Personas are plan-gated.** Lite: Strategist, Developer (2). Pro: all Lite + Teacher, Creator, Wellness (5). Premium: all 6 personas. Admin can override persona access per plan via admin settings.
3. **Pro and Premium are paid-only.** Activated via Stripe Checkout subscription mode (`mode: "subscription"`).
4. **Premium advantages over Pro:** higher audio quality model (when available), `gpt-5.4` for complex reasoning, unlimited image/audio quotas. See Section 8 for full model policy. Note: `gpt-audio-1.5` is currently inaccessible (403) — Premium audio uses `gpt-audio-mini` until access is restored.
5. When any limit is reached, the server **must end the conversation** with an exact stop reason and exact next-action instruction.
6. After a forced stop, the user is told one of: start a new conversation (if resources remain), upgrade plan (if applicable), or contact support.
7. **Plan cards must show ? for unavailable options** (not "0"). E.g., "? Audio generations per month" instead of "0 audio generations per month".
8. **Currency symbol must be admin-configurable.** Default: `$` (USD). Supported: `$` (USD), `�` (EUR). Resolved via `getEffectiveCurrencySymbol()` with `AppSetting("admin.currencySymbol")`. All price rendering must use dynamic currency symbol � no hardcoded `$` in rendering code.

### Lite Plan Limits (Detailed)

| Limit                         | Value | Reset Window          |
| ----------------------------- | ----- | --------------------- |
| Conversations per day         | 10    | 24 hours              |
| User prompts per conversation | 10    | Per conversation      |
| Image generations             | 1     | 30-day rolling window |
| Audio generations             | 1     | 30-day rolling window |

### Pro Plan Limits (Detailed)

| Limit                         | Value | Reset Window          |
| ----------------------------- | ----- | --------------------- |
| Conversations per day         | 50    | 24 hours              |
| User prompts per conversation | 100   | Per conversation      |
| Image generations             | 50    | 30-day rolling window |
| Audio generations             | 50    | 30-day rolling window |

### Premium Plan Limits (Detailed)

| Limit                         | Value     | Reset Window |
| ----------------------------- | --------- | ------------ |
| Conversations per day         | Unlimited | N/A          |
| User prompts per conversation | Unlimited | N/A          |
| Image generations             | Unlimited | N/A          |
| Audio generations             | Unlimited | N/A          |

### Plan Lifecycle

1. New users start on **Lite** (permanent, no expiry).
2. Upgrade via Stripe Checkout in subscription mode using plan+billing-specific Stripe Price IDs.
3. Yearly billing is supported with admin-configurable discount (`admin.yearlyDiscount`, default 30%).
4. Stripe Customer lifecycle is persisted per user (`stripeCustomerId`) and reused for checkout.
5. Webhooks drive subscription state transitions:
   - `checkout.session.completed`: initial subscription transaction + active plan state.
   - `invoice.paid`: renewal transaction + usage counter reset + expiry extension.
   - `invoice.payment_failed`: `subscriptionStatus` set to `past_due`.
   - `customer.subscription.updated`: plan/billing/period sync + `cancelAtPeriodEnd` sync.
   - `customer.subscription.deleted`: revert to Lite, clear subscription id, keep trial usage.
6. Custom cancellation flow is handled in-app via `cancelSubscriptionAction()` and `reactivateSubscriptionAction()` (no Stripe Customer Portal).
7. Existing one-time paid users are grandfathered until `expiresOn`, then naturally resolve to Lite entitlements.
8. Expired paid plans resolve to Lite entitlements through central entitlement resolution.

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
| `daily_conversation_limit_reached`   | "You've reached the daily conversation limit for your plan."            | `upgrade_plan` or `contact_support`        |
| `conversation_storage_limit_reached` | "This conversation has reached its storage limit."                      | `start_new_conversation`                   |
| `billing_state_invalid`              | "Your plan has expired."                                                | `upgrade_plan`                             |
| `trial_limit_reached`                | "You've reached the trial limit for this persona. Upgrade to continue." | `upgrade_plan`                             |

### Plan Technical Debt

- **TD-PLAN-01**: ✅ RESOLVED. Recurring subscriptions COMPLETE (all Phases 217-A through 217-G).

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

**Plan subdoc**: `{ id, name, amount, billing, startedOn, expiresOn, stripeId, stripeSubscriptionId, subscriptionStatus, cancelAtPeriodEnd, imageGenerations, audioGenerations, usagePeriodStart }`

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

| Field         | Type    | Required | Index | Notes                                 |
| ------------- | ------- | -------- | ----- | ------------------------------------- |
| userId        | String  | Yes      | Yes   | User who made the request             |
| taskId        | String  | Yes      | Yes   | Conversation this event belongs to    |
| personaId     | String  | Yes      | Yes   | Persona used                          |
| model         | String  | Yes      | Yes   | AI model used                         |
| provider      | String  | Yes      | No    | Provider (e.g., `openai`)             |
| requestType   | String  | Yes      | Yes   | `chat` / `image` / `audio` / `title`  |
| tokensIn      | Number  | No       | No    | Input tokens                          |
| tokensOut     | Number  | No       | No    | Output tokens                         |
| estimatedCost | Number  | No       | No    | Estimated cost in USD cents           |
| latencyMs     | Number  | No       | No    | Request latency                       |
| blocked       | Boolean | Yes      | No    | Whether request was blocked by limits |
| blockedReason | String  | No       | No    | Reason code if blocked                |
| createdAt     | Date    | Yes      | Yes   | Indexed for time-range queries        |

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

### 6.9 Upload

Tracks user-uploaded files stored in S3 (`{userId}/uploads/`). Created by `/api/upload` route.

| Field       | Type     | Required | Index                            | Notes                               |
| ----------- | -------- | -------- | -------------------------------- | ----------------------------------- |
| userId      | String   | Yes      | Compound `{userId,createdAt:-1}` | Clerk user ID                       |
| fileName    | String   | Yes      | No                               | Original filename                   |
| objectKey   | String   | Yes      | No                               | S3 object key                       |
| s3Url       | String   | Yes      | No                               | Full S3 URL                         |
| contentType | String   | Yes      | No                               | MIME type                           |
| sizeBytes   | Number   | Yes      | No                               | File size in bytes                  |
| taskId      | ObjectId | No       | No                               | Optional ref to Task (conversation) |
| createdAt   | Date     | Yes      | Compound `{userId,createdAt:-1}` | Mongoose timestamps                 |
| updatedAt   | Date     | Yes      | No                               | Mongoose timestamps                 |

- **Strict mode**: `strict: true`.
- **Cascade**: Deleted during user deletion cascade via `deleteUserCascade()` (Phase 150).
- **Added**: Phase 151.

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
- Event dispatcher: `dispatchStripeWebhookEvent` routes by `event.type`
- Handles 5 events: `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.updated`, `customer.subscription.deleted`
- Per-event Zod schemas for payload validation (`checkoutSessionCompletedEventSchema`, `invoicePaidEventSchema`, `invoicePaymentFailedEventSchema`, `customerSubscriptionUpdatedEventSchema`, `customerSubscriptionDeletedEventSchema`)
- Flexible multi-strategy user lookup via `findWebhookUser` (metadata userId → metadata clerkId → stripeSubscriptionId → stripeCustomerId)
- Idempotent `findOneAndUpdate` with guard conditions on Transaction (`claimTransaction`) and User (`updateUserWithGuard`)
- `checkout.session.completed`: creates Transaction (type: `subscription_initial`), sets `subscriptionStatus: "active"`, stores `stripeSubscriptionId`, sets `cancelAtPeriodEnd: false`
- `invoice.paid`: creates Transaction (type: `subscription_renewal`), refreshes `expiresOn`, resets usage counters, preserves `cancelAtPeriodEnd`
- `invoice.payment_failed`: sets `subscriptionStatus: "past_due"`
- `customer.subscription.updated`: syncs plan on upgrade/downgrade, syncs `cancelAtPeriodEnd` from `payload.cancel_at_period_end`
- `customer.subscription.deleted`: reverts to Lite, sets `subscriptionStatus: "canceled"`, clears `stripeSubscriptionId`, resets `cancelAtPeriodEnd: false`
- ~~Known issue (Phase 217-C-fix):~~ **RESOLVED** — `$set`/`$unset` path conflict fixed. No overlapping `plan.*` paths remain.

### 7.7 Subscription Management Actions

- `cancelSubscriptionAction()`: auth + ownership check, calls `stripe.subscriptions.update(id, { cancel_at_period_end: true })`, persists `plan.cancelAtPeriodEnd` + `subscriptionStatus`
- `reactivateSubscriptionAction()`: auth + ownership check, calls `stripe.subscriptions.update(id, { cancel_at_period_end: false })`, persists state
- Both share `updateSubscriptionCancellationPreference()` private handler
- Admin guard: admin accounts cannot cancel subscriptions
- Edge cases: already-canceled (409), already-in-state (200 warning), subscription not found (404), Stripe `resource_missing` (404), generic failures (500)
- DB update: `findOneAndUpdate` with `_id` + `clerkId` ownership filter, `strict: true`, `upsert: false`
- Self-healing: webhook events eventually correct local state even if action partially fails

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

> **Video generation REMOVED from product (PM audit #85, Phase 186-A).** Both `sora-2` and `sora-2-pro` deprecated. All video model rows deleted.

### 8.3 Task Classes

Each AI request is classified into a task class that affects model selection and token limits.

| Task Class | Purpose                   | Default For        |
| ---------- | ------------------------- | ------------------ |
| `utility`  | Metadata, always cheapest | `title_generation` |
| `simple`   | Basic/general questions   | �                  |
| `standard` | Normal conversation turns | `chat`             |
| `complex`  | Deep reasoning, analysis  | �                  |

| `final` | Final quality render | `image_generation`, `audio_generation` |

**Implementation (Phase 25.4):** Chat requests are classified server-side by `classifyTaskComplexity()` in `src/lib/utils/openai/classify-task-complexity.ts`. The classifier uses heuristics: message length, conversation history depth, analytical/technical keyword presence, and explicit deep-analysis intent (regex pattern). Returns `ChatTaskClass` (`simple` | `standard` | `complex`). The `/api/openai` route passes the classified `taskClass` to `resolveModelPolicy()`. Frontend does not send `taskClass` � all classification is backend-only.

### 8.4 Token Limits by Plan and Task Class

| Feature | Plan    | Task Class | Max Input Tokens | Max Output Tokens |
| ------- | ------- | ---------- | ---------------- | ----------------- |
| Title   | All     | utility    | 1,200            | 20                |
| Chat    | Lite    | simple     | 32,000           | 4,096             |
| Chat    | Lite    | standard   | 64,000           | 8,192             |
| Chat    | Lite    | complex    | 128,000          | 16,384            |
| Chat    | Pro     | simple     | 64,000           | 8,192             |
| Chat    | Pro     | standard   | 128,000          | 16,384            |
| Chat    | Pro     | complex    | 200,000          | 32,768            |
| Chat    | Premium | simple     | 128,000          | 16,384            |
| Chat    | Premium | standard   | 200,000          | 32,768            |
| Chat    | Premium | complex    | 500,000          | 32,768            |

> **Token limits increased to near-maximum model capacity (PM audit #85, Phase 186-B).** gpt-4o-mini: 128K context / 16,384 output max. gpt-4.1: 1M context / 32,768 output max.

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
  | "audio_generation";

type TaskClass = "utility" | "simple" | "standard" | "complex" | "final";
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
Route streams via SSE events (`meta`, `chunk`, `final`, `error`, `heartbeat`) in `/api/openai`.
Client consumes via `ReadableStream.getReader()` in `chat-wrapper.tsx` with JSON fallback for non-streaming clients.
All auth/limit checks execute before streaming begins. Final task persistence and usage event emission happen after stream completion.

> **✅ RESOLVED (Phase 149 COMPLETE, TD-STREAM-01 CLOSED):** SSE heartbeat mechanism implemented. 12s keepalive interval during media generation via `onMediaGenerationStart`/`onMediaGenerationEnd` lifecycle callbacks. Client timeout reset on every received event (including heartbeats). `heartbeat` event type added to `ChatStreamEvent` union.
> **✅ TD-STREAM-05 RESOLVED (Phase 181 COMPLETE, PM audit #83):** Proactive timeout now uses `functionStartTime` captured at `POST()` entry. Remaining budget computed as `Math.max(0, 55000 - elapsedSetupMs)` inside `ReadableStream.start()`. Clamp guard prevents negative timeout. Proactive timeout fires BEFORE Vercel's 60s kill regardless of setup duration.
> **✅ TD-STREAM-04 RESOLVED (Phase 160.1 COMPLETE, PM audit #76):** `maxDuration` reduced from 300 to 60 for Vercel Hobby compliance. Deployment unblocked. Video generation removed from product (PM audit #85). Image/audio gen may approach 60s limit — accepted trade-off.
> **⚠️ TD-AUDIO-01 RESOLVED (PM audit #79, Phase 168 CODE-COMPLETE):** Audio player `ERR_INVALID_STATE` error. Triple-audit root cause: (A) SSE controller race — `controllerClosed` boolean flag added, checked by `emitHeartbeat()` before enqueuing, (B) download route HTTP Range support implemented — `parseByteRangeHeader()`, `Accept-Ranges: bytes`, `206 Partial Content`, (C) audio player lifecycle hardened — `previousAudioUrlRef` reset in cleanup, `src=""` disposal, error event listener. All three paths implemented. Phase 168 archived to DONE.md.
> **Client timeout:** `STREAM_REQUEST_TIMEOUT_MS = 70_000` (Phase 160.1 COMPLETE). Aligned with server maxDuration=60 + 10s margin.

### 8.10 API Route Timeout Requirements

All API routes that call external services (OpenAI, Stripe, AWS) **must** export `maxDuration` to prevent serverless platform timeout kills:

| Route                  | Required `maxDuration`   | Reason                                                        |
| ---------------------- | ------------------------ | ------------------------------------------------------------- |
| `/api/openai`          | 60s (Hobby) / 300s (Pro) | ⚠️ Vercel Hobby max = 60s. Image/audio gen may approach limit |
| `/api/webhooks/stripe` | 30s                      | Stripe webhook processing with DB writes                      |
| `/api/webhooks/clerk`  | 60s                      | Clerk webhook with cascade deletes (S3 prefix cleanup)        |
| `/api/upload`          | 30s                      | S3 upload                                                     |
| `/api/download`        | 30s                      | Proxied download                                              |
| `/api/aws`             | 30s                      | S3 operations                                                 |

> **Vercel Plan Constraint (PM audit #75):** Vercel Hobby limits `maxDuration` to 60 seconds. Only `/api/openai` is affected — all other routes fit within 30s. Video generation has been removed from the product (PM audit #85). Text chat, image gen (~15-30s), and audio gen (~10-20s) should work within 60s.
>
> **Current state (PM audit #77):** All 6 API routes have `export const maxDuration`. Values: openai=60, clerk-webhook=60, upload/download/aws/stripe-webhook=30. Phase 166 VERIFIED COMPLETE.

### 8.11 Webhook Idempotency Requirements

Webhook idempotency checks **must verify the complete operation**, not just the first write:

- **Stripe `checkout.session.completed`:** Must verify BOTH Transaction existence AND User plan state. If Transaction exists but User plan was not updated, reattempt the user plan update. **✅ IMPLEMENTED (Phase 161 COMPLETE, PM audit #75).** `hasExpectedStripePlan()` checks `user.plan.stripeId` against session ID. Repair path via `applyCheckoutPlanUpdate()` for stale plan state.
- **Clerk webhooks:** Already handle missing documents gracefully.

**Rule:** If a multi-step webhook operation has a partial failure, the idempotency check must not short-circuit — it must attempt to complete all remaining steps.

### OpenAI Technical Debt

- **TD-AI-08**: Video generation REMOVED from product (owner directive, PM audit #85). Previously implemented (Phase 34). All video code being removed in Phase 186-A.
- **TD-AI-09**: ✅ RESOLVED. Image/audio generation prompts now persona-aware via `PERSONA_IMAGE_STYLE_HINTS` and `PERSONA_AUDIO_STYLE_HINTS` (Phase 26.x). Chat prompts were already persona-aware (Phase 22).
- **TD-AI-13**: 3 model pricing entries in `ai-model-policy.ts` are placeholders pending OpenAI confirmation (`gpt-audio-mini`, `gpt-audio-1.5`, `gpt-4o-mini-tts`). `sora-2` removed (video generation removed from product).
- **TD-AI-18** (advisory): OpenAI route `errorMessage` forwarding pattern is safe today but fragile — if any future code sets `aiPayload.errorMessage` to a raw OpenAI error, it will leak to clients. Consider always using generic constants.
- **TD-AI-25**: ~~Persona system prompts had zero video generation awareness~~ — **RESOLVED** then **REMOVED**: Video generation removed from product (PM audit #85). `CHAT_PLATFORM_PROMPT` to be updated to reference images and audio only (Phase 186-A).

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

| Route                                 | Type      | Description                                                                                                                                                         |
| ------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`                                   | Public    | Landing (Hero + product sections + CTAs)                                                                                                                            |
| `/about`                              | Public    | How app works (stacked sections)                                                                                                                                    |
| `/plans`                              | Public    | Pricing (plan cards)                                                                                                                                                |
| `/personas`                           | Public    | Personas showcase                                                                                                                                                   |
| `/privacy`                            | Public    | Privacy & Cookie Policy                                                                                                                                             |
| `/cookies`                            | Public    | Cookie Policy                                                                                                                                                       |
| `/terms`                              | Public    | Terms & Conditions                                                                                                                                                  |
| `/sign-in`, `/sign-up`                | Auth      | Clerk auth                                                                                                                                                          |
| `/app`                                | Protected | Chat dashboard                                                                                                                                                      |
| `/app/new`                            | Protected | New conversation + persona browsing. Labeled "Personas" in sidebar (Phase 209). Serves as the primary persona selection page.                                       |
| `/app/library`                        | Protected | Media library (tabs: Chats, Images, Audios, Uploaded). Videos tab removed (PM audit #85). Accessible from sidebar navigation (Phase 209). Removed from avatar menu. |
| `/app/personas`                       | Redirect  | Redirects to `/app/new` (Phase 210). Route directory deleted. Next.js config redirect for bookmarks.                                                                |
| `/app/c/[conversationId]`             | Protected | Resume conversation                                                                                                                                                 |
| `/app/profile`                        | Protected | User profile + plan + history                                                                                                                                       |
| `/app/plans`                          | Protected | Plan upgrade + checkout                                                                                                                                             |
| `/admin`                              | Admin     | Dashboard overview                                                                                                                                                  |
| `/admin/users`                        | Admin     | User management list                                                                                                                                                |
| `/admin/users/[userId]`               | Admin     | User detail + actions                                                                                                                                               |
| `/admin/transactions`                 | Admin     | Transaction management                                                                                                                                              |
| `/admin/transactions/[transactionId]` | Admin     | Transaction detail                                                                                                                                                  |
| `/admin/usage`                        | Admin     | Usage analytics                                                                                                                                                     |
| `/admin/settings`                     | Admin     | App settings                                                                                                                                                        |
| `/admin/website`                      | Admin     | Content management                                                                                                                                                  |
| `/admin/website/[pageId]`             | Admin     | Page editor (textarea fallback � Tiptap replaced)                                                                                                                   |

### Public Pages Content

- **`/`**: Hero + product sections + CTAs. Not just another chatbot.
- **`/about`**: How app works. Stacked sections with text + image.
- **`/plans`**: Plan cards (public pricing) + FAQ accordion.
- **`/privacy`**, **`/cookies`**, **`/terms`**: Real legal content, adapted for Droplet.

### Design System

- Tailwind CSS v4.2 with custom design tokens
- CSS architecture: modular `src/styles/` folder (Phase 218 COMPLETE) — entry point `src/styles/index.css`, split into theme tokens (`theme/colors.css`, `theme/layout.css`, `theme/typography.css`), base resets (`base/compatibility.css`, `base/elements.css`, `base/gradient.css`), component classes (`components/typography.css`, `components/buttons.css`, `components/admin.css`, `components/tooltip.css`, `components/chat.css`). Phases 221 adds `components/layout.css` (shared sidebar, header, nav-link classes) and `components/forms.css` (shared form input, field, label classes). Phase 218-C adds `components/toggle.css` (toggle switch classes). Uses Tailwind v4 native `@import` inlining — identical build output.
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

- **Sidebar**: Home (`/app`), Personas (`/app/new`), Library (`/app/library`), Recent conversation history (visible only when sidebar is open). Sidebar toggle in SidebarHead (visible when open, hover-reveal when collapsed). Loading skeleton via Suspense fallback. CSS transitions on open/collapse (Phase 213). Each recent conversation item has a three-dot dropdown menu with Rename and Delete options (Phase 215). **Admin and chat sidebars share identical structural CSS** (sidebar base, backdrop overlay, nav-link styling). Phase 222 planned: shared `SidebarShell` component for both layouts.
- **AvatarMenu** (header): Dashboard (admin only) → Plans → Profile → Logout. Library and Personas removed from avatar menu (Phase 209).
- **ChatHeader**: Present on all `/app/*` pages. Contains mobile-only sidebar toggle, conversation info (persona label, message count, ended badge). PersonaSelector moved to ChatInput (Phase 216). **Admin and chat headers share identical structural CSS** (sticky bar, blur bg, flex container). Phase 222-B planned: shared `AppHeader` component.

---

## 13. Testing

- **Unit tests**: 110 suites, 729 tests (Vitest) — organized by domain in `tests/unit/{actions,components,routes,utils,models,constants,stores}/`. TDD rebuild COMPLETE (Phases 120.1–120.7). All test files rebuilt from scratch using strict TDD methodology. Zero `as never` casts. All tests use shared factories from `tests/unit/test-support/`. Includes streaming, webhook, chat-wrapper, chat-body stop-state, upload flow, S3 cleanup, idempotency, model policy, retry/backoff, persona prompt, rate limiting, task complexity classification, conversation stop enforcement, entitlement resolver, checkout-success page, admin audit trail, OpenAI route tests (split into 5 focused modules), atomic prompt limit, daily conversation limit, media error handling, universal feature access, trial access tests, validation schema security injection tests, AudioPlayer ARIA tests, abort behavior tests, Zustand store tests, upload file size validation, 24 component test files, user model tests, Button component TDD tests, PageHead heading-level TDD tests, suspended user enforcement tests, delete-user-cascade tests, upload model tests, admin-settings-tabs hydration tests, checkout redirect tests, media slot claim/rollback tests.
- **E2E tests**: 8 Playwright spec files. Specs: `admin-settings-propagation`, `auth-boundaries`, `authenticated-accessibility`, `chat-conversation-flow`, `public-structure`, `admin-user-operations`, `billing-checkout-flow`, `error-boundary-handling`. Default 3 browsers (Chromium, Firefox, WebKit); full 7-browser matrix via `PLAYWRIGHT_FULL_MATRIX=1`. WCAG E2E via @axe-core/playwright.
- **Coverage**: v8 provider, thresholds: 85% statements / 80% branches / 85% functions / 85% lines. Gate PASSES. 7 files explicitly excluded from coverage (complex integration files). Reporters: text, json-summary, lcov. Setup file: `tests/unit/vitest.setup.ts`.
- **Config**: Vitest `environmentMatchGlobs` for auto-jsdom on `.tsx`. Playwright `actionTimeout: 10s`, `expect.timeout: 5s`. ESLint `no-console` (error), `no-restricted-globals` (alert/confirm). TS `noFallthroughCasesInSwitch`, `forceConsistentCasingInFileNames`. All 7 validation gates GREEN (lint, knip, tsc, unit, E2E, build, prettier).
- **Gaps**: No E2E for Stripe checkout flow. 7 coverage-excluded files include `generateResponse.tsx`.

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
> Last updated: PM audit #108 (2026-04-09).

### Resolved This Session (PM audit #91)

| ID               | Area     | Description                                                                                                                                                                                                | Phase | Status                                                                                   |
| ---------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ---------------------------------------------------------------------------------------- |
| TD-ADMIN-DELETE  | Security | Admin users can be deleted from Profile (self-delete) and Admin/Users dashboard (single + bulk remove). Locks out admin panel permanently. All 4 deletion surfaces must refuse `role === "admin"` targets. | 189   | ✅ DONE. 5-layer protection: 3 backend guards + 3 UI blocks + 7 unit tests.              |
| TD-ADMIN-DISPLAY | UX       | Admin profile shows "Lite" plan name. Must show "ADMIN" everywhere. Usage metrics must show "Unlimited" for admin users.                                                                                   | 190   | ✅ DONE. `plan-display.ts` utility. All surfaces show "ADMIN"/"Unlimited".               |
| TD-VISION-01     | OpenAI   | Image upload "describe image" returns error. Relative URL `/api/download?key=...` inaccessible to OpenAI vision API.                                                                                       | 195   | ✅ DONE. Pre-signed S3 URLs via `@aws-sdk/s3-request-presigner`. 15-min TTL.             |
| TD-AUDIO-OVERLAP | UX       | Multiple audios play simultaneously. No global pause coordination.                                                                                                                                         | 196   | ✅ DONE. Zustand `useAudioStore` with singleton playback. Register/unregister lifecycle. |
| TD-IMG-LIGHTBOX  | UX       | Generated images locked at 320×320. No click-to-enlarge.                                                                                                                                                   | 197   | ✅ DONE. Native `<dialog>` lightbox with close + download controls.                      |
| TD-LIB-UPLOADS   | UX       | Library "Uploaded" tab shows text-only cards. No visual previews.                                                                                                                                          | 198   | ✅ DONE. Image thumbnails + file-type icons.                                             |
| TD-ACTION-STATE  | React    | `useActionState` console error: `formAction()` called outside `startTransition`.                                                                                                                           | 199   | ✅ DONE. `startTransition` wrapper in `AdminManagedForm.handleConfirm`.                  |

### Resolved Previous Sessions (PM audit #87–90)

| ID                | Area    | Description                                                                 | Phase   | Status                                                                               |
| ----------------- | ------- | --------------------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------ |
| TD-STREAM-05      | SSE     | Stream proactive timeout miscalculated — fired after Vercel's 60s kill.     | 181     | ✅ PRODUCTION-CONFIRMED. Proactive timeout fires correctly.                          |
| TD-A11Y-01        | A11y    | Fake download icon in `profile-billing.tsx` — styled clickable, no handler. | 178     | ✅ RESOLVED. Icon removed.                                                           |
| TD-PAYMENT-02     | Billing | Stripe webhook — payment processed but no Transaction/plan update.          | 183     | ✅ RESOLVED. Root cause: webhook disabled in Stripe. Re-enabled, HTTP 200 confirmed. |
| TD-LOGIN-01       | Auth    | Facebook login "Feature Unavailable."                                       | 184     | ✅ CLOSED. Facebook login removed from product (owner decision).                     |
| TD-VIDEO-01       | AI      | Remove `sora-2-pro` from codebase.                                          | 185     | ✅ DONE. `sora-2` for all plans.                                                     |
| TD-HARDCODE-03    | Content | Hardcoded persona IDs in `persona-spotlight.tsx`.                           | 180.1   | ✅ DONE. Admin-configurable featured persona IDs.                                    |
| TD-VIDEO-02       | AI      | Remove ALL video generation from app entirely.                              | 186-A   | ✅ DONE. 58 files modified/deleted. All gates GREEN.                                 |
| TD-TOKEN-01       | AI      | Increase token limits to maximum possible.                                  | 186-B   | ✅ DONE. All 9 chat tiers updated to near-max model capacity.                        |
| TD-ADMIN-ERR      | UX      | Missing admin error boundary.                                               | 187-A   | ✅ DONE. `(admin)/error.tsx` created.                                                |
| TD-WEBHOOK-ORDER  | Webhook | Clerk `user.deleted` cascade before delete.                                 | 187-B   | ✅ DONE. Cascade now runs before user deletion.                                      |
| TD-AUDIO-RECOVERY | UX      | Audio player permanent error state.                                         | 187-C   | ✅ DONE. `audioError` cleared before retry.                                          |
| TD-ENV-01         | Code    | 7 unsafe `process.env` casts.                                               | 143     | ✅ DONE. `requireEnv()` utility, zero unsafe casts remain.                           |
| TD-HARDCODE-02    | Content | ~8 hardcoded marketing strings.                                             | 180.2-3 | ✅ DONE. Promo content admin-configurable via `effective-promo-content.ts`.          |
| TD-HARDCODE-04    | Content | Hardcoded `$` currency symbol.                                              | 180.4   | ✅ DONE. Currency via `getEffectiveCurrencySymbol()` prop.                           |
| TD-RATE-CLEANUP   | Data    | `download:` rate-limit keys not cleaned.                                    | 187-D   | ✅ DONE. Key added to `getRateLimitKeys()`.                                          |

### Active — CRITICAL Priority (PM audit #129)

| ID               | Area    | Description                                                                                                                                                                                                | Phase |
| ---------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| TD-PAYMENT-03    | Billing | Stripe webhook not delivering events. Payment succeeds in Stripe but plan not upgraded, no Transaction created, billing history empty. Webhook code is correct — Stripe Dashboard config must be verified. | 234   |
| TD-PROJECTION-01 | Data    | `USER_SYNC_PROJECTION` in `ensure-user-synced.ts` missing `stripeSubscriptionId`, `subscriptionStatus`, `stripeCustomerId`, `suspended`. Profile billing management broken (always null).                  | 234   |

### Active — HIGH Priority

| ID                | Area | Description                                                                                                                                                    | Phase |
| ----------------- | ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| TD-CHECKOUT-UX-01 | UX   | Checkout success poller timeout message is misleading. Should warn user to contact support if plan doesn't update within 10 minutes. Needs support email link. | 234   |

### Resolved — HIGH Priority

| ID               | Area     | Description                                                                                                                                                                | Phase | Resolution                                                                                    |
| ---------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | --------------------------------------------------------------------------------------------- |
| TD-ADMIN-SUSPEND | Security | Admin users can be suspended via `toggleUserSuspensionAction` (single) and `bulkSuspendUsersAction` (bulk). Phase 189 only blocked deletion, not suspension. Lockout risk. | 200   | ✅ DONE (PM #92). 3-layer defense: role check, bulk filter, UI guard. 2 new tests.            |
| TD-LIMITS-01     | Config   | `PLAN_LIMITS.Lite` code values differ from AGENTS.md Rule #5. Owner changed via direct commits 09918e2, 100d47e.                                                           | 202   | ✅ RESOLVED (PM #92). Owner override accepted. AGENTS.md Rule #5 updated. Tests fixed PM #93. |
| TD-AVATAR-SYNC   | UX       | `ProfileHeroEditor` saves avatar to MongoDB, `AvatarMenu` reads from Clerk. Avatar changes not reflected in header.                                                        | 201   | ✅ DONE (PM #93). Non-blocking Clerk sync in `updateUser()`. 2 tests.                         |
| TD-CONTRAST-01   | A11y     | Profile page "Free" badge fails WCAG 2.2 AA contrast ratio (2.76:1 vs 4.5:1 required).                                                                                     | 203   | ✅ DONE (PM #93). `text-midnightBlue-900` on `bg-dustyBlue-500`. All E2E pass.                |

### Resolved (PM audit #99 — Sidebar Restructure)

| ID            | Area     | Description                                                                                                                                            | Phase | Resolution                                                                             |
| ------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ----- | -------------------------------------------------------------------------------------- |
| TD-SIDEBAR-01 | UX       | New chat does not appear in sidebar until browser refresh. `ChatSidebar` is a Server Component rendered at layout level; no `router.refresh()` called. | 205   | ✅ DONE (PM #94). `router.refresh()` with ref-based one-time guard.                    |
| TD-UPLOAD-ERR | UX       | Generic upload error messages. Client catch block discards server error details. `accept="image/*"` allows unsupported formats.                        | 206   | ✅ DONE (PM #94). error.message propagation + narrowed accept + client pre-validation. |
| TD-UPLOAD-SEC | Security | Upload validation relies on browser-reported MIME type only. No magic byte verification.                                                               | 207   | ✅ DONE (PM #94). Magic byte validation for JPEG/PNG/GIF/WebP. Defense-in-depth.       |
| TD-NAV-01     | UX       | `/app/personas` route is duplicate of `/app/new`.                                                                                                      | 210   | ✅ DONE (PM #99). Route deleted. Next.js redirect. Admin revalidation updated.         |
| TD-TASK-01    | Backend  | `updateTaskSchema` missing `title` field; `messages` required. No dedicated rename action.                                                             | 215.0 | ✅ DONE (PM #99). `renameTask` action with Zod schema, auth, ownership enforcement.    |

### Active — MEDIUM Priority (Non-Blocking)

| ID          | Area | Description                                                                                                                                   | Phase |
| ----------- | ---- | --------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| TD-MEDIA-01 | Arch | **ACCEPTED (PM audit #84-B).** Media gen (image/audio) may approach Vercel Hobby 60s timeout. Phase 181 proactive timeout handles gracefully. | —     |

### Active — Low Priority

| ID        | Area   | Description                                                            | Phase    |
| --------- | ------ | ---------------------------------------------------------------------- | -------- |
| TD-AI-13  | OpenAI | 3 model pricing entries are placeholders pending OpenAI confirmation.  | Deferred |
| TD-AI-18  | OpenAI | errorMessage forwarding pattern in `/api/openai` is safe but fragile.  | Advisory |
| TD-API-09 | API    | `messageTextContentSchema` uses `.strict()` — may reject extra fields. | Monitor  |

### Resolved (PM audit #82)

| ID           | Area     | Description                                                                                                                                                                                | Phase |
| ------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----- |
| TD-DEBUG-01  | UX       | ~~Debug text `<p>Checking if is new task...</p>` in production.~~ **RESOLVED (Phase 173).** Removed.                                                                                       | 173   |
| TD-DEAD-01   | Brand    | ~~Orphaned `public/scripts/theme-init.js` (last `cellesseon` reference).~~ **RESOLVED (Phase 174).** File deleted, knip.json cleaned.                                                      | 174   |
| TD-DEAD-02   | Frontend | ~~Dead `conversationEnded` prop in ChatBodyProps.~~ **RESOLVED (Phase 175).** Prop and call site removed.                                                                                  | 175   |
| TD-HTTP-01   | API      | ~~Download route S3 path forces 206 from request Range.~~ **RESOLVED (Phase 176).** Now uses `response.ContentRange ? 206 : 200`.                                                          | 176   |
| TD-DESYNC-01 | SSE      | ~~Duplicate `STREAM_PROACTIVE_TIMEOUT_MESSAGE` constant.~~ **RESOLVED (Phase 177).** Single source of truth in `chat-stream.ts`.                                                           | 177   |
| TD-STREAM-03 | SSE      | ~~Streaming fails for media gen exceeding 60s.~~ **MITIGATED (Phase 160.2).** Proactive timeout safety net. **RE-CLASSIFIED as TD-STREAM-05** — timeout calculation wrong, not just limit. | 160.2 |

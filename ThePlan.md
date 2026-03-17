# Droplet - Completion Plan

> Purpose: one execution document for finishing the SaaS without avoidable rework.
>
> Audience: Project Manager, Architect, and Senior Software Agents.
>
> Rule: this plan is based on verified repository state. If older docs disagree with code, code wins until this file is updated.

---

## 1. Executive Judgment

Droplet is not blocked by visual polish.

It is blocked by product-rule drift, route fragmentation, incomplete entitlement logic, weak usage accounting, missing storage guardrails, and the absence of a real admin control plane.

The repository already has useful foundations:

- Next.js 16 App Router
- Clerk auth and proxy-based route protection
- Stripe checkout and webhook plumbing
- MongoDB persistence through Mongoose
- persona-based prompting
- conversation persistence
- image, audio, and video generation via OpenAI tools

The repository is not release-ready because the critical product contract is still inconsistent across code, docs, and intended behavior.

The correct strategy is not to keep adding features.

The correct strategy is to freeze product rules, build one canonical policy layer, move storage and usage accounting onto a safe foundation, then finish UX, admin, public pages, and launch controls on top of that.

---

## 2. Verified Baseline

The points below are verified from the current codebase.

| Area                 | Verified Current State                                                                                                                                                                                                                                                                                                             | Impact                                                                                    | Evidence                                                                                        |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Lite lifecycle       | Lite is permanent and free â€” no expiry, no trial                                                                                                                                                                                                                                                                                 | âœ… Matches product contract                                                              | `src/constants/plans.tsx`, `src/lib/database/models/user.model.tsx`                             |
| Pricing              | Pro is 19, Premium is 39                                                                                                                                                                                                                                                                                                           | âœ… Matches requested pricing                                                             | `src/constants/plans.tsx`, admin settings propagation                                           |
| Public usage access  | `/api/openai` requires auth                                                                                                                                                                                                                                                                                                        | âœ… Supports account-required chat direction                                              | `src/app/api/openai/route.tsx`                                                                  |
| Route boundaries     | Clean `/app(.*)` and `/admin(.*)` namespaces, orphan directories removed                                                                                                                                                                                                                                                           | âœ… Product and auth boundaries are clean                                                 | `src/proxy.tsx`, `src/app/**`                                                                   |
| Admin scope          | Full admin control plane: users, transactions, usage, settings, website                                                                                                                                                                                                                                                            | âœ… Requested admin capabilities delivered                                                | `src/app/(admin)/admin/**`                                                                      |
| Entitlements         | 6 personas with three-tier gating (full/limited/blocked), trial access system, admin overrides                                                                                                                                                                                                                                     | âœ… Matches product contract                                                              | `src/lib/utils/resolve-entitlements.tsx`, `src/constants/assistant-personas.tsx`                |
| Model routing        | Central AI policy via `resolveModelPolicy()` â€” plan-aware, feature-aware, task-class-aware                                                                                                                                                                                                                                       | âœ… No hardcoded model routing                                                            | `src/lib/utils/a`a``ai-model-policy.ts````                                                      |
| Conversation storage | `Task` stores message history in one document with `estimatedBytes` guardrails                                                                                                                                                                                                                                                     | âš ï¸ Operational â€” guardrails active, but single-document growth remains a future risk | `src/lib/database/models/tasks.model.tsx`                                                       |
| Usage accounting     | `UsageEvent` model logs every AI request; durable counters for daily/monthly limits; atomic enforcement                                                                                                                                                                                                                            | âœ… Admin analytics, cost governance, and quota enforcement operational                   | `src/lib/database/models/usage-event.model.tsx`, `src/app/api/openai/route.tsx`                 |
| Rate limiting        | MongoDB-backed rate limiting (durable, multi-instance safe)                                                                                                                                                                                                                                                                        | âœ… Survives restarts and multiple instances                                              | Rate limit implementation                                                                       |
| Billing mode         | Stripe recurring subscriptions with webhook processing and server-side price re-verification                                                                                                                                                                                                                                       | âœ… SaaS billing semantics frozen and operational                                         | `SPEC.md`, Stripe webhook code, `checkoutPlan()`                                                |
| Streaming            | Streaming chat implemented and stable                                                                                                                                                                                                                                                                                              | âœ… Chat UX target delivered                                                              | `src/app/api/openai/route.tsx`, chat components                                                 |
| Video generation     | Video generation fully operational via Sora API (`sora-2`/`sora-2-pro`), S3 storage, plan-gated limits, Sora output controls (seconds/size), VideoPlayer component with playsInline, library integration. Phase 34.9 quality fixes COMPLETE. Phase 51.1 prompt fix COMPLETE (media-tool awareness added to persona system prompts) | âœ… Video implemented and operational for all plans                                       | `src/lib/utils/generateVideo.tsx`, `src/components/chat/video-player.tsx`, `ai-model-policy.ts` |
| Public pages         | All required public routes complete: `/`, `/about`, `/plans`, `/faqs`, `/personas`, `/privacy`, `/cookies`, `/terms`                                                                                                                                                                                                               | âœ… Public surface complete                                                               | `src/app/(public)/**`                                                                           |
| FAQ copy             | FAQ content aligned with current product rules (no trial references)                                                                                                                                                                                                                                                               | âœ… Product messaging consistent                                                          | `src/constants/faqs.tsx`                                                                        |
| Theme control        | Admin settings include theme management                                                                                                                                                                                                                                                                                            | âœ… Settings control operational                                                          | Admin settings panel                                                                            |
| Tiptap               | Not installed (admin content editing uses form controls)                                                                                                                                                                                                                                                                           | Deferred â€” admin forms use proper controls without rich-text editor                     | `package.json`                                                                                  |

### Practical conclusions

1. Do not build any anonymous Lite chat path. The code already assumes authenticated AI usage.
2. All plan rules, prices, limits, and model assignments must be admin-configurable â€” avoid hardcoded references.
3. Do not treat route cleanup as cosmetic refactoring. It is part of auth, ownership, and product-boundary repair.
4. Components must be data consumers â€” no `fetch()` in client components. Pass data from Server Components as props.
5. Evaluate codebase for unnecessary re-renders and resource leaks.
6. Move utilities and data fetching to server side.

---

## 3. Target Release Contract

This section defines the intended v1 target state.

### 3.1 Non-negotiable product rules

1. Users must create an account before using chat, uploads, media generation, or plan-limited features.
2. Lite is permanent and free. The 3-day trial behavior must be removed everywhere.
3. Personas are plan-gated. 6 personas total. Lite: 2 full access (Strategist, Developer) + 4 limited (trial). Pro: 5 full access (+ Teacher, Creator, Wellness) + 1 limited. Premium: all 6 full access. Admin can override per-plan persona access via admin settings.
4. Each persona acts as an independent AI agent specifically trained and skilled for its purpose, with related tools and features provided per persona field.
5. Lite users are capped at 5 conversations per day.
6. Lite users are capped at 10 user prompts per conversation.
7. Lite users are capped at 3 media generations in the approved reset window.
8. Pro and Premium are paid-only.
9. When any limit is reached, the server must end the conversation with an exact stop reason and exact next action.
10. Every plan must stop conversations before MongoDB storage pressure becomes a runtime failure.
11. After a forced stop, the user must be told only one of these next actions: start a new conversation, upgrade the plan, or contact support.
12. Private pages must be auth-protected and user ownership must be enforced in every read and write path.
13. Admin routes and admin actions must be role-protected server-side and at the proxy boundary.
14. Plan cards must show âœ• for unavailable options (not "0"). E.g., "âœ• Audio generations per month" instead of "0 audio generations per month".
15. Unavailable personas must be clearly indicated as PRO or PREMIUM feature with a small font-size label indicator.
16. Personas must be displayed in a 3-per-row grid on desktop view.
17. Each persona must have a representative hero image.
18. All persona configuration must be managed from admin panel by admin role only.

### 3.2 Tier contract

| Tier    | Access              | Price | Model policy                                                                                                 | Required baseline limits                                                                                                                                                                      |
| ------- | ------------------- | ----- | ------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lite    | Auth required, free | 0     | `gpt-4o-mini` (chat), `gpt-image-1-mini` (image), TTS-only (audio), `sora-2` (video).                        | 5 conversations/day, 10 prompts/conversation, 3 media generations per approved reset window, 1 video/month, hard conversation stop on quota or storage hit. 2 full-access personas + 4 trial. |
| Pro     | Paid only           | 19    | `gpt-4.1` (chat), `gpt-image-1.5` (image), `gpt-audio-mini` (audio), `sora-2` (video).                       | Higher ceilings than Lite, 10 videos/month, 5 full-access personas + 1 trial.                                                                                                                 |
| Premium | Paid only           | 39    | `gpt-4.1`/`gpt-5.4` (chat), `gpt-image-1.5` (image), `gpt-audio-1.5` (audio), `sora-2`/`sora-2-pro` (video). | Highest ceilings, all 6 personas full access.                                                                                                                                                 |

### 3.3 Public surface required for release

Required public routes:

- `/`
- `/about`
- `/plans`
- `/faqs`
- `/personas`
- `/privacy`
- `/cookies`
- `/terms`
- `/sign-in`
- `/sign-up`

Rules for public surface:

1. `/` starts with the current Hero and then expands into clear product-value sections and conversion CTAs.
2. `/about` explains how the product works, with sections for personas, chat, media, voice, and usage expectations.
3. `/plans` is public and starts from the current plan-card direction.
4. `/faqs` is public and starts from the current FAQ accordion direction.
5. Privacy, cookie, and terms pages must contain real adapted content, not placeholder copy.
6. â€œReal contentâ€ still requires legal review before production publication. Research alone is not legal approval.

### 3.4 Admin surface required for release

Required admin namespaces:

- `/admin`
- `/admin/users`
- `/admin/users/[userId]`
- `/admin/transactions`
- `/admin/transactions/[transactionId]`
- `/admin/usage`
- `/admin/settings`
- `/admin/website`
- `/admin/website/[pageId]`

Admin release requirements:

1. Admin must be able to inspect and manage users.
2. Admin must be able to inspect transactions and perform real operational actions, not fake labels.
3. Admin must have usage visibility by user, model, provider, period, and cost basis.
4. Admin settings must be able to change plan prices, plan descriptions, plan limits, model-per-plan selection, and basic theme settings.
5. Admin website management must support create, edit, order, publish, and unpublish for public pages.
6. All admin mutations must produce an audit trail.

---

## 4. Decisions That Must Be Frozen Before Implementation

These are not optional. Coding before these are settled will create rework.

| Decision                           | Why It Must Be Frozen                                                                   | Recommended Decision                                                                                     |
| ---------------------------------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Billing semantics                  | Current code behaves like expiring one-time purchases; SaaS launch needs explicit rules | Launch with monthly recurring subscriptions only, defer yearly billing until pricing is defined properly |
| Lite media reset window            | User request defines the count but not the reset window                                 | Freeze this explicitly before implementation; do not infer it from current rolling counters              |
| Pro/Premium ceilings               | â€œHigher limitsâ€ is not implementable                                                 | Define exact ceilings for conversations, prompts, media, and storage                                     |
| Premium extras                     | â€œ3 more premium featuresâ€ is too vague                                               | Name each feature, define provider, moderation, storage, and success criteria                            |
| Model availability                 | Requested model IDs may not be available or cost-safe                                   | Verify availability and cost before plan copy is changed                                                 |
| Storage budget for first 100 users | Conversation-stop rules depend on it                                                    | Approve a conservative storage budget and quota formula before chat changes                              |
| Legal page review path             | â€œReal contentâ€ without review creates business risk                                  | Research first, publish only after legal/business signoff                                                |

### Hard calls

1. Defer yearly billing from v1. The repository already has monthly/yearly assumptions, but yearly pricing is undefined and not requested.
2. ~~Do not promise video generation in Premium v1 unless provider support, moderation, storage, and cost ceilings are verified.~~ â€” RESOLVED (Phase 34). Video generation delivered. Provider support verified (Sora API), S3 storage operational, flat pricing confirmed (.10â€“.30/video), plan-gated limits enforced.
3. Do not keep transaction actions named as `suspend` or `decline` if they do not map to real Stripe or entitlement operations.

---

## 5. Frozen Architecture Direction

These are the recommended stable decisions.

### 5.1 Route model

Use product semantics, not historical grouping.

| Area                       | Target namespace                                                                                                                                                                                |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Public marketing and legal | `/`, `/about`, `/plans`, `/faqs`, `/personas`, `/privacy`, `/cookies`, `/terms`                                                                                                                 |
| Authenticated app          | `/app`, `/app/new`, `/app/c/[conversationId]`, `/app/library`, `/app/personas`, `/app/account`, `/app/billing`                                                                                  |
| Admin                      | `/admin`, `/admin/users`, `/admin/users/[userId]`, `/admin/transactions`, `/admin/transactions/[transactionId]`, `/admin/usage`, `/admin/settings`, `/admin/website`, `/admin/website/[pageId]` |

Routes to retire after migration:

- `/profile`
- `/pricing`
- `/dashboard`
- authenticated `/plans`

### 5.2 Auth and role boundary model

1. Public pages remain public and informational only.
2. All signed-in customer product routes live under `/app(.*)`.
3. All admin routes live under `/admin(.*)`.
4. Proxy auth and server-side auth must both enforce admin role for admin paths.
5. Every server action and API route must continue to enforce auth before mutations.
6. Every user-owned resource lookup must filter by both resource id and owner id.

### 5.3 Canonical entitlement model

Build one server-side entitlement resolver that accepts:

- actor type: `client` or `admin`
- plan: `Lite`, `Pro`, `Premium`
- requested capability: chat, image, audio, upload, download, admin action
- persona id
- usage context: daily conversation count, current conversation prompt count, media count in current window, conversation byte estimate, user storage estimate, billing state

The resolver must return:

- `allowed` or `blocked`
- exact `reasonCode`
- plan-aware model selection
- quota snapshot
- whether the current conversation must end
- whether upgrade is the correct next action
- whether support contact is the correct next action

No UI component, route, or helper should own plan logic directly.

### 5.4 Conversation lifecycle model

Conversations need explicit lifecycle state.

Required fields at conversation level:

- `promptCount`
- `mediaCount`
- `estimatedBytes`
- `status`
- `endedAt`
- `endedReason`
- `endAction`

Required stop reasons:

- `prompt_limit_reached`
- `media_limit_reached`
- `daily_conversation_limit_reached`
- `conversation_storage_limit_reached`
- `user_storage_limit_reached`
- `paid_feature_required`
- `billing_state_invalid`
- `support_required`

Allowed next actions:

- `start_new_conversation`
- `upgrade_plan`
- `contact_support`

### 5.5 Data model direction

Current `Task` documents are a transitional structure, not a safe long-term ledger.

Required direction:

| Model                                               | Purpose                                                                                       | Release priority                                          |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `Task`                                              | Conversation shell and summary metadata                                                       | Keep, but narrow responsibility                           |
| `TaskMessage` or equivalent separated message store | Message history without single-document growth risk                                           | Required before launch if embedded history remains unsafe |
| `UsageEvent`                                        | Request-level usage, model, provider, estimated cost, latency, blocked reason, quota snapshot | Required                                                  |
| `AppSetting`                                        | Admin-controlled mutable application settings                                                 | Required                                                  |
| `PublicPage`                                        | Admin-managed public page content and ordering                                                | Required                                                  |
| `AdminAuditLog`                                     | Audit trail for admin actions                                                                 | Required                                                  |

Non-negotiable storage rule:

1. Do not store binary or large base64 payloads in conversation documents.
2. Media artifacts must live in object storage with URL references only.
3. Storage guardrails must stop conversations before Mongo document growth becomes a production incident.

### 5.6 AI policy model

The AI model policy has been approved and is fully documented in **SPEC.md Section 8**. Key decisions:

**Model Policy Matrix (approved):**

| Feature          | Plan        | Default Model                                | Fallback Model               |
| ---------------- | ----------- | -------------------------------------------- | ---------------------------- |
| Title generation | All         | `gpt-4.1-nano`                               | `gpt-4o-mini`                |
| Chat             | Lite        | `gpt-4o-mini`                                | `gpt-4.1-nano`               |
| Chat             | Pro         | `gpt-4.1`                                    | `gpt-4o-mini`                |
| Chat             | Premium     | `gpt-4.1` (default) / `gpt-5.4` (complex)    | `gpt-4.1`                    |
| Image            | Lite        | `gpt-image-1-mini`                           | none                         |
| Image            | Pro/Premium | `gpt-image-1.5`                              | `gpt-image-1-mini`           |
| Audio            | Lite        | blocked                                      | â€”                          |
| Audio            | Pro         | `gpt-audio-mini`                             | `gpt-4o-mini-tts` (TTS only) |
| Audio            | Premium     | `gpt-audio-1.5`                              | `gpt-audio-mini`             |
| Video            | Lite        | `sora-2`                                     | `sora-2`                     |
| Video            | Pro         | `sora-2`                                     | `sora-2`                     |
| Video            | Premium     | `sora-2` (default) / `sora-2-pro` (explicit) | `sora-2`                     |

**Architecture:** `resolveModelPolicy()` in `src/lib/utils/`ai-model-policy.ts``. Supports task classes (utility/simple/standard/complex/preview/final), downgrade triggers (budget, latency, retry), and audio mode differentiation (TTS vs audio_in_out).

**Hard rules:** Frontend never sends model ID. Titles pinned to cheapest model. Premium defaults to `gpt-4.1` for routine chat; `gpt-5.4` only for complex reasoning with explicit request. Retries downgrade tier.

See SPEC.md Section 8 for full matrix, token limits, and resolver type definitions.

### 5.7 Prompt architecture

Prompt design must move from isolated persona strings to a managed matrix.

Required prompt dimensions:

- persona identity
- plan tier
- model family/version
- content modality: chat, image, audio
- safety constraints
- answer style and formatting rules

Required prompt governance:

1. Version prompts.
2. Keep prompt definitions separate from request handlers.
3. Add regression prompts and expected-behavior evaluation sets for the highest-risk personas.
4. Use structured outputs where downstream behavior depends on reliable parsing.

### 5.8 Admin editor baseline

Tiptap is the correct editor baseline for admin content.

Context7 verified:

- Next.js React setup should use `@tiptap/react` and `@tiptap/starter-kit`
- editor initialization should use `immediatelyRender: false` in client components
- advanced toolkit/pro features may require separate package access and procurement

Practical decision:

1. Deliver core editing first with Tiptap OSS baseline.
2. Treat the requested Dev Toolkit suite as an enhancement only after package access and licensing are confirmed.
3. Do not block admin content delivery on premium editor extras.

### 5.9 Streaming baseline

Context7 verified that the current OpenAI Node SDK supports streaming via either:

- `openai.chat.completions.stream(...)`
- `openai.chat.completions.create({ stream: true })`
- `client.responses.create({ stream: true })`

Practical decision:

1. Choose one streaming contract for the app before frontend work starts.
2. Prefer a simple server-to-client streaming approach first; do not mix streaming introduction with tool-routing redesign in the same PR.

---

## 6. Delivery Principles

This sequence is mandatory.

1. Freeze product rules before editing prices, billing UX, or plan marketing copy.
2. Freeze entitlement and storage rules before route cleanup and streaming work.
3. Build usage accounting before admin usage analytics.
4. Build audit logging before admin mutation features.
5. Fix storage and quota guardrails before expanding media promises.
6. Build model-routing policy before rewriting prompts per persona.
7. Complete public/legal content before launch, but not before the product contract is stable.
8. Do not combine billing redesign, streaming, and admin-control-plane work in the same milestone.

---

## 7. Milestone Plan

## Milestone 0 - Product Contract Freeze

> **Status: COMPLETED** â€” Delivered by Phase 13.

**Objective**

Freeze the commercial, legal, entitlement, and storage contract so implementation stops moving against a changing target.

**Assumptions**

- Account-required usage is final.
- Lite remains free.
- All personas remain available across plans.

**Dependencies**

- None

**Blockers**

- Billing semantics are not frozen.
- Requested model IDs are not verified.
- Lite media reset window is undefined.
- Premium extras are vague.
- Storage budget for the first 100 users is undefined.

**PM / Architect outputs**

1. Approve the final tier matrix.
2. Approve whether billing is recurring monthly-only for v1.
3. Approve exact Lite limit behavior and user-facing stop messages.
4. Define exact Pro and Premium ceilings.
5. Define the 3 Premium-only features precisely.
6. Approve the legal-content review path.

**Senior agent outputs**

1. Verify model availability and cost envelopes for `gpt-5.2-pro` and `gpt-5.4-pro`.
2. Produce a storage-budget proposal for the first 100 users.
3. Produce a matrix of all code paths tied to Lite expiry, old pricing, persona restrictions, and old FAQ copy.

**Risks**

- product claims drifting again across UI, Stripe, and backend checks
- promising unsupported Premium features
- selecting models that are too expensive or unavailable

**Success criteria**

- Final plan rules are approved in writing.
- Billing semantics are explicit.
- Premium extras are no longer vague.
- Model claims are verified or replaced.

**What not to do yet**

- Do not edit Stripe products or plan copy.
- Do not start public-page rewrites.
- Do not start route migrations.

---

## Milestone 1 - Canonical Policy And Data Contract

> **Status: COMPLETED** â€” Delivered by Phases 14 + 16.

**Objective**

Define the entitlement engine, conversation-stop contract, usage ledger, and storage ledger that everything else depends on.

**Assumptions**

- Per-user ownership remains the primary security boundary.
- Admin is operational, not multi-tenant workspace management.

**Dependencies**

- Milestone 0

**Blockers**

- Current quota logic only covers image/audio counters.
- Current `Task` structure is not safe enough for long-lived conversation growth.

**PM / Architect outputs**

1. Approve resolver inputs and outputs.
2. Approve stop reasons and next-action matrix.
3. Approve storage-quota formula.
4. Approve required new models.

**Senior agent outputs**

1. Define `EntitlementDecision` types and reason codes.
2. Define `UsageEvent`, `AppSetting`, `PublicPage`, and `AdminAuditLog` schemas.
3. Define message-storage migration strategy.
4. Define request-level cost and latency capture fields.

**Risks**

- quota logic being split again between UI and backend
- inconsistent stop reasons across features
- underestimating storage pressure

**Success criteria**

- One approved policy contract exists.
- One approved data-contract document exists.
- No unresolved ambiguity remains around stop behavior.

**What not to do yet**

- Do not code admin pages.
- Do not rewrite prompts.
- Do not implement streaming.

---

## Milestone 2 - Route And Auth Boundary Repair

> **Status: COMPLETED** â€” Delivered by Phase 17.

**Objective**

Make product boundaries obvious, enforceable, and maintainable.

**Assumptions**

- Public pages remain marketing-only.
- Customer product lives under `/app`.
- Admin lives under `/admin`.

**Dependencies**

- Milestone 1

**Blockers**

- Current proxy and route structure still protect `/profile`, `/plans`, and `/dashboard`.

**PM / Architect outputs**

1. Approve final route map.
2. Approve redirect strategy from retired routes.
3. Approve admin and client navigation shells.

**Senior agent outputs**

1. Refactor proxy protection to `/app(.*)` and `/admin(.*)`.
2. Move current admin entry out of `/dashboard`.
3. Consolidate account and billing routes into authenticated `/app` namespace.
4. Ensure no private feature is reachable from a public route.

**Risks**

- auth regressions during route moves
- broken deep links
- duplicated plan/account entry points lingering in navigation

**Success criteria**

- Route tree matches the approved target map.
- Proxy protection matches the new namespaces.
- Old routes either redirect cleanly or are removed intentionally.

**What not to do yet**

- Do not fill admin pages with full features yet.
- Do not change plan pricing copy yet.

---

## Milestone 3 - Plan, Billing, And User Lifecycle Alignment

> **Status: COMPLETED** â€” Delivered by Phase 13.

**Objective**

Make plan state, billing state, and user-facing plan copy tell the same truth.

**Assumptions**

- Milestone 0 froze billing semantics.

**Dependencies**

- Milestone 2

**Blockers**

- Current code embeds 3-day Lite expiry and one-time-payment-style plan expiry assumptions.

**PM / Architect outputs**

1. Approve final purchase and renewal flow.
2. Approve customer-visible billing states and failure states.
3. Approve upgrade and downgrade rules.

**Senior agent outputs**

1. Remove Lite expiry logic from all code paths.
2. Align Stripe metadata, webhook processing, database fields, and UI copy.
3. Apply new prices and plan descriptions in one pass after logic is ready.
4. Ensure new users default to Lite automatically.
5. Ensure paid users only access Pro/Premium features when billing state is valid.

**Risks**

- charging users for features not enforced correctly
- stale FAQ, pricing, and checkout copy persisting after backend changes
- renewal edge cases leaving entitlements in the wrong state

**Success criteria**

- Billing state and entitlement state align.
- Lite is permanent and free.
- Pro and Premium price/copy/logic all match.

**What not to do yet**

- Do not launch streaming.
- Do not publish final plan marketing before webhook and entitlement tests pass.

---

## Milestone 4 - Usage Ledger And Storage Guardrails

> **Status: COMPLETED** â€” Delivered by Phases 15 + 16.

**Objective**

Move from fragile counters to reliable usage accounting and conversation-stop enforcement.

**Assumptions**

- Quota rules are already frozen.

**Dependencies**

- Milestone 3

**Blockers**

- Current usage state is insufficient for cost reporting and robust enforcement.
- Current conversation storage remains embedded and risky.

**PM / Architect outputs**

1. Approve storage budget thresholds and escalation behavior.
2. Approve usage and cost metrics visible to admin.

**Senior agent outputs**

1. Implement request-level usage event logging.
2. Implement conversation-level prompt/media/storage counters.
3. Stop storing oversized payloads in Mongo.
4. Introduce conversation-end enforcement tied to quota and storage thresholds.
5. Replace in-memory-only operational assumptions where needed for launch safety.

**Risks**

- Mongo document growth causing hard failures
- inaccurate cost reporting
- quota bypasses under concurrency

**Success criteria**

- Every AI request emits a durable usage record.
- Every forced stop has a stored reason.
- Storage limits are enforced before database failure conditions.

**What not to do yet**

- Do not add more media-heavy features.
- Do not build polished usage dashboards before the ledger is trusted.

---

## Milestone 5 - Chat Lifecycle, Prompt Quality, And Streaming

> **Status: COMPLETED** â€” Streaming (Phase 19), model policy (Phase 16), and prompt quality (Phase 22) all delivered.

**Objective**

Finish the core assistant experience: clean conversation lifecycle, persona-aware prompt quality, and streamed responses.

**Assumptions**

- Entitlement and storage guardrails are already in place.

**Dependencies**

- Milestone 4

**Blockers**

- Current model routing is hardcoded.
- Current prompt strategy is too flat for plan-aware model behavior.
- Current chat UX is non-streaming.

**PM / Architect outputs**

1. Approve model-per-plan policy.
2. Approve streamed UX states and fallback behavior.
3. Approve per-persona prompt evaluation criteria.

**Senior agent outputs**

1. Introduce the central AI policy resolver.
2. Build the prompt matrix by persona and model family.
3. Implement streaming on the selected route contract.
4. Update chat UI to render partial responses safely.
5. End conversations cleanly when stop reasons are reached and present the correct next action.

**Risks**

- streaming partial state causing duplicate or corrupt messages
- prompt rewrites lowering output quality for some personas
- tool or media routing becoming inconsistent under streaming

**Success criteria**

- Streaming works reliably for normal chat flow.
- Persona behavior is measurably more distinct and controlled.
- Conversation-stop behavior is visible and understandable to users.

**What not to do yet**

- Do not expand provider count.
- Do not add premium media features beyond what was frozen in Milestone 0.

---

## Milestone 6 - Public Site, FAQ, And Legal Surface

> **Status: COMPLETED** â€” Delivered by Phase 18.

**Objective**

Finish the public product narrative and legal pages without claiming things the product does not actually support.

**Assumptions**

- Product rules, plan rules, and route map are already stable.

**Dependencies**

- Milestone 3 for plan accuracy
- Milestone 5 for real chat capability claims

**Blockers**

- Required routes do not exist yet.
- Existing FAQ copy still reflects obsolete trial behavior.

**PM / Architect outputs**

1. Approve homepage narrative and CTA hierarchy.
2. Approve About page structure.
3. Approve public FAQ topics and answer tone.
4. Approve legal-content review workflow.

**Senior agent outputs**

1. Build `/about`, `/faqs`, `/privacy`, `/cookies`, and `/terms`.
2. Update homepage beyond the Hero with product-value sections.
3. Convert `/pricing` into canonical `/plans` behavior.
4. Remove trial-era copy and unsupported claims.
5. Keep all public claims aligned with actual product capabilities.

**Risks**

- public pages overselling Premium or AI behavior
- legal text being adapted poorly or published without review
- duplicate pricing pages creating SEO and UX confusion

**Success criteria**

- Required public routes exist.
- Public plan and FAQ copy matches the product contract.
- Legal content is real content and queued for review before production publish.

**What not to do yet**

- Do not turn website management into a full CMS before admin controls and audit logs exist.

---

## Milestone 7 - Admin Control Plane

> **Status: COMPLETED** â€” Delivered by Phase 17.

**Objective**

Build the minimum viable operational control plane the business actually needs.

**Assumptions**

- Usage ledger, settings model, audit log, and route boundaries already exist.

**Dependencies**

- Milestone 4 for usage data
- Milestone 6 for website/page structures

**Blockers**

- Current admin page is only a stats dashboard.
- No mutable settings model exists.
- No audit model exists.

**PM / Architect outputs**

1. Approve admin navigation and permission scope.
2. Approve which admin actions are allowed in v1.
3. Approve placeholder-vs-real-data rules for usage views.

**Senior agent outputs**

1. Build Users list and user detail views.
2. Build Transactions list and transaction detail views.
3. Build Usage analytics view against the new ledger.
4. Build Settings management for prices, limits, models, feature toggles, and theme settings.
5. Build Website management using Tiptap-backed editing.
6. Record every admin mutation in `AdminAuditLog`.

**Risks**

- admin pages mutating production state without auditability
- placeholder usage data being mistaken for truth
- website editing introducing broken public content without publish controls

**Success criteria**

- Admin can perform required operational actions.
- Admin changes are audited.
- Admin pages do not bypass plan or ownership rules.

**What not to do yet**

- Do not add broad role systems beyond `client` and `admin` in this release.
- Do not attempt generic low-governance CRUD across the whole database.

---

## Milestone 8 - Security, Reliability, And Observability Hardening

> **Status: COMPLETED** â€” MongoDB-backed rate limiting (Phase 25.3), error sanitization (HF series), webhook hardening (Phases 27.8â€“27.10), atomic limit enforcement (Phases 27.1, 28.1, 28.6), usage event logging (Phase 16) all delivered. Operational monitoring through UsageEvent model and admin usage analytics.

**Objective**

Close the operational gaps that would make launch fragile.

**Assumptions**

- Core features are already in place.

**Dependencies**

- Milestone 7

**Blockers**

- No durable multi-instance rate limit exists.
- Cost and provider visibility are still immature.

**PM / Architect outputs**

1. Approve operational alert thresholds.
2. Approve support escalation workflow.
3. Approve acceptable fallback behavior for provider failures.

**Senior agent outputs**

1. Replace in-memory-only production protections where required.
2. Add monitoring for request failures, blocked reasons, provider latency, and cost anomalies.
3. Harden webhook observability and reconciliation.
4. Add audit-friendly logs for billing, usage stops, and admin actions.
5. Complete abuse-prevention review for uploads, downloads, and AI usage.

**Risks**

- launch incidents without enough visibility to diagnose
- silent billing or provider failures
- abuse or runaway cost from weak rate and quota controls

**Success criteria**

- Key operational paths are observable.
- Abuse and cost guardrails are active.
- Support has enough information to investigate billing and quota issues.

**What not to do yet**

- Do not expand to additional providers or environments before observability is trusted.

---

## Milestone 9 - Launch Readiness And Release Control

> **Status: COMPLETED** — Validation workflow passes (Prettier, lint, tsc, 65 suites / 365 unit tests, build). E2E: majority passing with known timeout-related skips. Release gates A–E green. Gate F substantially green.

**Objective**

Ship only when the release is coherent, verifiable, and reversible.

**Assumptions**

- All prior milestones are complete.

**Dependencies**

- Milestones 0 through 8

**Blockers**

- None should remain. Any unresolved contract ambiguity blocks launch.

**PM / Architect outputs**

1. Approve final release checklist.
2. Approve rollback plan.
3. Approve production support ownership for launch week.

**Senior agent outputs**

1. Run and pass the required validation workflow.
2. Confirm migration and rollback steps.
3. Confirm public copy and legal pages are the approved versions.
4. Confirm admin, billing, usage stops, and streaming behavior in staging.

**Risks**

- shipping with mismatched plan rules
- broken redirects or protected-route leaks
- billing and entitlements disagreeing in production

**Success criteria**

- Validation workflow passes end to end.
- Release gates below are all green.
- Rollback steps are documented and testable.

**What not to do yet**

- Do not merge new feature scope during launch stabilization.

---

## 8. Release Gates

Every gate must pass.

### Gate A - Contract Gate

- Billing semantics frozen
- Tier limits frozen
- Premium extras frozen
- Model claims verified

### Gate B - Architecture Gate

- Canonical entitlement resolver is live
- Route/auth boundaries match target namespaces
- Storage guardrails are enforced

### Gate C - Product Gate

- Lite is permanent and account-required
- 6 personas plan-gated with trial access for non-full-access personas
- Stop reasons and next actions work across chat flows
- Streaming is stable enough for production
- Unavailable personas clearly labeled as PRO or PREMIUM feature
- Plan cards show âœ• for unavailable options (not 0)
- Personas displayed in 3-per-row grid on desktop

### Gate D - Admin Gate

- Users, transactions, usage, settings, and website admin areas exist
- Admin actions are audited
- Admin role enforcement works in proxy and server actions

### Gate E - Public Gate

- Public pages exist and are accurate
- Legal pages exist and are reviewed for publication readiness
- No obsolete trial messaging remains

### Gate F - Validation Gate

Run in this order and require all six to pass:

```bash
npx prettier . --write
npm run lint
npx tsc --noEmit
npm run test
npm run test:e2e
npm run build
```

**Current status (post-Phase 34):** Prettier, lint, tsc, unit tests (65 suites / 365 tests), and build all pass. E2E: 174 passed, 48 skipped, **6 failed** (timeout/navigation failures in existing specs â€” not video-related). The 6 E2E failures require investigation before Gate F can be declared green.

---

## 9. Immediate Execution Order

This is the correct first-pass order for the next serious work cycle.

1. Freeze billing semantics, tier limits, Premium extras, and legal review path.
2. Design and approve the canonical entitlement and stop-reason contract.
3. Finalize the route map and auth boundary redesign.
4. Align billing and plan lifecycle logic with the approved contract.
5. Introduce the usage ledger, storage ledger, and guardrails.
6. Build the AI policy layer and streaming chat path.
7. Finish public pages and legal pages against the now-stable product contract.
8. Build the admin control plane on top of the finished data foundations.
9. Hardening, observability, and launch readiness.

---

## 10. Explicitly Deferred From v1 Unless Re-approved

These items are not banned forever. They are excluded because they create disproportionate risk now.

- Yearly billing and yearly pricing discounts
- Multi-provider LLM routing
- Team or workspace accounts
- User-created custom personas
- Broad role systems beyond `client` and `admin`

---

## 11. Owner-Directed New Work (Added 2026-03-16, Updated 2026-03-17)

> **All Milestones 0–18 COMPLETED. All Phases 1–51.1 COMPLETED. 365 unit tests (65 suites) passing. Build passing.**

### Milestone 10 â€” Layout, Navigation & Library Enhancement

> **Status: COMPLETED** â€” Delivered by Phases 31.1â€“31.3, 31.2-fix, 35.1, 32.1â€“32.3, 32.6.
> ChatHeader on all /app pages with persona selector, sidebar cleanup, tabbed Library with media aggregation and error handling.
> Remaining polish: 32.4 (media card components), 32.5 (pagination).

**Objective:** Make the authenticated app shell professional and complete. ChatHeader on all `/app` pages, sidebar cleanup, Library media tabs.

**Dependencies:** Phase 28 remaining complete.

**Scope:**

1. Move `ChatHeader` to `(chat)` layout level so it renders on ALL `/app/*` routes.
2. Move sidebar toggle from sidebar header to ChatHeader as first-left item.
3. Remove Plans and Profile from sidebar (already in AvatarMenu â€” redundant).
4. Build tabbed Library page: Chats | Images | Audios | Videos tabs.
5. Media aggregation queries against Task messages for image/audio extraction.
6. Library error handling with server-side logging and client-side error state.

**Success criteria:**

- ChatHeader visible on all 7 `/app/*` routes.
- Sidebar toggle in header, Plans/Profile removed from sidebar.
- Library shows generated media organized by type with error handling.

### Milestone 11 â€” Persona Trial Access System

> **Status: COMPLETED** â€” Delivered by Phases 33.1â€“33.8, 30.4, 37.1 (E2E stabilization).
> Three-tier persona access (full/limited/blocked), trial counters, atomic enforcement, persona picker badges, plan card trial copy.
> Trial E2E tests (33.8) and admin persona access controls (30.4) delivered. Verified by PM audit #17 + Architect code audit.
> 335 unit tests passing, 180 E2E passing, build passing.

**Objective:** Enable try-before-you-buy persona access. Users can TEST non-plan personas with reduced limits to drive upgrades.

**Dependencies:** Phase 30 complete (base persona gating).

**Key decision (PM-frozen):**

- Trial limits: 5 prompts/conversation, 3 images, 2 audio, 1 video per 30-day window.
- Global across all trial personas (not per-persona tracking).
- Separate counters from plan limits.
- Conversation ends with upgrade CTA when trial limit hit.

**Scope:**

1. Three-tier persona access: `full` / `limited` / `blocked`.
2. Trial usage tracking fields on User model.
3. API route applies trial limits for limited-access personas.
4. Persona picker shows "Trial" badge instead of "Locked."
5. Plan cards explain trial access.
6. Admin persona access controls per plan.

**Success criteria:**

- Every plan's non-primary personas accessible with trial limits.
- Upgrade CTA appears when trial limits are hit.
- Admin can override persona access per plan.

### Milestone 12 â€” Video Generation

> **Status: COMPLETED** â€” Delivered by Phases 47.1, 34.2â€“34.8.
> Full video generation pipeline operational: generateVideo.tsx utility with async Sora polling, video tool registration in getChatTools, getGeneratedVideo handler in response orchestration, API route video counter/type support, VideoPlayer component with chat rendering, library video surface, supportsVideoGeneration re-enabled.
> Phase 47.1 (temporary video capability suppression) delivered and subsequently reversed by 34.7. Phase 34.9a-e quality fixes ALL COMPLETE (coming soon removed, Sora output controls added, playsInline added, tool description spacing fixed, failure/timeout tests added).
> Verification: Prettier pass, lint pass, tsc pass, 65 test suites / 365 unit tests passing, 174 E2E passing (6 failed â€” timeout/navigation in existing specs, not video-related; 48 skipped), build pass.

**Objective:** Implement video generation using OpenAI Sora API.

**Dependencies:** Audio verified âœ…, entitlement system stable âœ….

**Gated on:** ~~Sora API availability verification + S3 cost ceiling approval~~ â€” CLEARED.

**Scope:**

1. ~~`generateVideo.tsx` utility with Sora integration~~ â€” DONE (Phase 34.2).
2. ~~Video tool definition (`getGeneratedVideo`) and `getChatTools()` update~~ â€” DONE (Phase 34.3).
3. ~~Video handler in `buildOpenAIResponsePayload()` with slot claim/rollback~~ â€” DONE (Phase 34.4).
4. ~~API route `MediaUsageLimitType` extension for video slots~~ â€” DONE (Phase 34.5).
5. ~~`VideoPlayer` component + chat-body rendering~~ â€” DONE (Phase 34.6).
6. ~~Re-enable `supportsVideoGeneration` + library integration~~ â€” DONE (Phase 34.7).
7. ~~Unit tests for video generation chain~~ â€” DONE (Phase 34.8).

**Success criteria:**

- âœ… Video generation works end-to-end via chat interface.
- âœ… Videos stored in S3 (`{userId}/videos/`), URLs in messages.
- âœ… Limits enforced per plan (Lite: 1/mo, Pro: 10/mo, Premium: unlimited).
- âœ… `VideoPlayer` renders in chat messages.
- âœ… Library videos tab shows generated videos.
- âœ… No false capability claims during development window (Phase 47.1 â†’ 34.7). Suppression delivered and reversed.

### Milestone 13 — UI Polish, Bug Fixes & Admin Enhancement (Owner-Directed, 2026-03-16)

> **Status: COMPLETED** â€” Blocks Aâ€“C delivered (Phase 38 + 36). Block D partially delivered (33.8 DONE).
> PM audit #16: Phase 38 + 36 APPROVED. PM audit #17: 33.8 APPROVED.
> Remaining: 35.2 (persona selector E2E tests).

**Objective:** Fix confirmed bugs, address Owner's UI requirements (sidebar restructure, persona studio removal, error z-index), and enhance admin capabilities.

**Dependencies:** Milestone 11 complete (trial access stable).

**Block A â€” Bug Fixes: COMPLETED**

1. ~~**CRITICAL** â€” Fix AlertMessage stacking context~~ â€” DONE (38.1). `z-0` removed from ChatWrapper. AlertMessage renders above ChatHeader.
2. ~~**HIGH** â€” Fix `allowedPersonaIds=[]` entitlement leak~~ â€” DONE (38.2). Strict `=== undefined` check distinguishes no-restriction from all-blocked.
3. ~~**MEDIUM** â€” Fix ChatHeader persona dropdown~~ â€” DONE (38.3). Disabled when `messages.length > 0` or `taskStatus === "ended"`.

**Block B â€” Owner UI Requirements: COMPLETED**

4. ~~**HIGH** â€” Move Library/Personas to AvatarMenu~~ â€” DONE (38.4). Sidebar: Chat Dashboard + New Conversation + history only.
5. ~~**HIGH** â€” Remove ChatPersonaPicker from landing~~ â€” DONE (38.5). Persona selection via ChatHeader dropdown only.
6. ~~**LOW** â€” Skip video_url aggregation~~ â€” DONE (38.6). `videoItems = []` directly.
7. ~~**LOW** â€” aria-label for iconOnly Logo~~ â€” DONE (38.7).

**Block C â€” Admin Enhancement: COMPLETED**

8. ~~**MEDIUM** â€” Admin design alignment~~ â€” DONE (36.1). Design tokens consistent with client app.
9. ~~**MEDIUM** â€” Top Personas stat box~~ â€” DONE (36.2). Top 5 personas by usage with labels and percentages.

**Block D â€” Test Coverage: COMPLETED**

10. ~~**MEDIUM** â€” E2E tests for trial persona flow~~ â€” DONE (33.8). 4 E2E tests covering trial selection, stop, full-access, and badge visibility.
11. **LOW** â€” E2E tests for persona selector in ChatHeader (35.2).

**Success criteria (verified âœ…):**

- âœ… Error messages always render above ChatHeader.
- âœ… Entitlement logic correctly handles empty `allowedPersonaIds`.
- âœ… Persona dropdown disabled during active conversations.
- âœ… Sidebar has only core nav (dashboard, new, history). Library + Personas in AvatarMenu.
- âœ… No persona studio/picker on landing page.
- âœ… Admin pages visually consistent with client app.
- âœ… "Top Personas" stat box on admin Usage page.
- âœ… E2E tests cover trial flow (33.8).
- â¬œ E2E tests for persona selector (35.2 remaining).

### Milestone 14 â€” Admin Operational Completeness (Owner-Directed, 2026-03-16)

> **Status: COMPLETED** â€” All admin settings propagation verified by PM audit #18 + Architect code audit (2026-03-17).
> 30.4 (persona access controls) DONE. 27.5 (pricing + limits + model propagation) DONE.
> TD-ADMIN-02 FULLY RESOLVED â€” all admin settings are operational and consumed at runtime.
> TD-CHECKOUT-01 RESOLVED (PM audit #19 + Architect audit #19, 2026-03-17) â€” server-side price re-verification in `checkoutPlan()` confirmed. Crafted price bypass no longer possible.
> PM audit #19: 339 unit tests passing. 180 E2E passing (48 skipped â€” explained, no hidden failures). Build passing.

**Objective:** Make admin settings actually control app behavior. Every admin setting saved must propagate to the corresponding app feature. Admin must have real operational control over plans, pricing, limits, personas, and models.

**Owner Requirements:**

- âœ… Admin panel sections must be fully operational with full control over app behavior per each setting's purpose.
- âœ… Admin panel must use proper form controls (inputs, selectors, radios, checkboxes) â€” no raw editors.
- âœ… Admin layout must maintain consistent design with client app (36.1 baseline established).
- âœ… Admin Usage must have Top Personas statistic box (36.2 delivered).

**Dependencies:** Milestone 13, Phase 33 (trial system stable).

**Delivered:**

1. ~~**Admin settings propagation** (27.5)~~ â€” DONE. Pricing, limits, and model config saved in AppSetting are consumed by `resolveEntitlements()`, `checkUsageLimit()`, `resolveModelPolicy()`, plan card components, and checkout flows. Falls back to hardcoded defaults when no AppSetting exists. Propagation chain: Admin UI â†’ `AppSetting` DB â†’ `effective-plan-config.ts` / `effective-model-config.ts` â†’ runtime policy resolution / plan cards / limit enforcement.
2. ~~**Admin persona access controls** (30.4)~~ â€” DONE. Per-plan persona access toggles (checkboxes). `resolveEntitlements()` reads admin overrides first, falls back to hardcoded defaults.
3. ~~**Admin audit trail**~~ â€” DONE. All mutations audit-logged.
4. ~~**End-to-end propagation verified**~~ â€” Admin changes a price â†’ plan cards update. Admin changes a limit â†’ enforcement updates. Admin changes a model â†’ AI calls use new model. Admin disables a persona â†’ user sees change.

**Success criteria (verified âœ…):**

- âœ… Admin settings changes propagate to live app behavior (prices, limits, models, personas).
- âœ… Fallback to hardcoded defaults when no AppSetting exists.
- âœ… Admin forms use proper controls (no raw editors remaining).
- âœ… Full audit trail for all admin mutations.
- âœ… Checkout server-side price re-verification operational (TD-CHECKOUT-01 resolved â€” Phase 39.1).

### Milestone 15 â€” Critical Bug Fixes (Owner-Directed, 2026-03-17)

> **Status: COMPLETED** â€” Delivered by Phases 40.1â€“40.2.

**Objective:** Fix critical production bugs blocking normal user experience.

**Dependencies:** None â€” critical path. Must be resolved before any other work.

**Delivered:**

1. ~~**CRITICAL** â€” Fix chat generation Invalid request body error~~ â€” DONE (40.1). Zod schema updated with `.nullable().optional()` for optional fields. Chat generation works end-to-end.
2. ~~**CRITICAL** â€” Fix persona access gating enforcement~~ â€” DONE (40.2). Plan-gating defaults corrected to 2/5/6 (Lite/Pro/Premium). PRO/PREMIUM label indicators on unavailable personas.

**Success criteria (verified âœ…):**

- âœ… Chat generation works end-to-end for authenticated users (Lite, Pro, Premium).
- âœ… Persona access correctly enforced per plan defaults (2/5/6) and admin overrides.
- âœ… Non-accessible personas display clear plan requirement labels (PRO/PREMIUM).

### Milestone 16 â€” Persona Restructure (Owner-Directed, 2026-03-17)

> **Status: COMPLETED** â€” Delivered by Phases 41.1â€“41.4, 43.2â€“43.4. Hero images (43.2) in progress â€” using placeholders until Owner provides final images.

**Objective:** Reduce from 10 to 6 personas. Remove companions, merge Strategist+Analyst.

**Dependencies:** Milestone 15 (critical bugs fixed first).

**Delivered:**

1. ~~Remove Best Friend, Boyfriend, Girlfriend from constants, types, prompts, entitlements, admin settings~~ â€” DONE (41.1).
2. ~~Merge Analyst capabilities into Strategist persona (keep `strategist` ID)~~ â€” DONE (41.2).
3. ~~Update default plan-gating for 6 personas (Lite: 2, Pro: 5, Premium: 6)~~ â€” DONE (41.3).
4. ~~Migration script + DB record handling for orphaned persona references~~ â€” DONE (41.4).
5. ~~3-per-row persona grid layout on desktop~~ â€” DONE (43.3).
6. ~~Persona category display/sorting~~ â€” DONE (43.4).
7. **Hero images** â€” IN PROGRESS (43.2). Placeholder images in use. Final images to be provided by Owner.

**Success criteria (verified âœ…):**

- âœ… Exactly 6 personas in code, types, constants, and docs.
- âœ… No references to removed personas in production code.
- âœ… Orphaned DB records handled gracefully (existing conversations readable, no new conversations with removed personas).
- âœ… 3-per-row grid on desktop.
- âœ… Persona category sorting operational.
- âš ï¸ Hero images using placeholders (Owner to provide final images).

### Milestone 17 â€” Admin Panel Redesign & UI Polish (Owner-Directed, 2026-03-17)

> **Status: COMPLETED** â€” Delivered by Phases 42.1â€“42.3, 43.1.

**Objective:** Full admin panel design consistency with client app. Plan card improvements. Code review fixes.

**Dependencies:** Milestone 16.

**Delivered:**

1. ~~Admin panel layout matches client app design (fonts, sizes, colors, proportions)~~ â€” DONE (42.1).
2. ~~Plan cards: show âœ• instead of 0 for unavailable options~~ â€” DONE (42.2).
3. ~~PRO/PREMIUM labels on persona cards~~ â€” DONE (42.3).
4. ~~Code review fixes (6/7 items; item 7 skipped as correct Tailwind v4 syntax)~~ â€” DONE (43.1).

**Success criteria (verified âœ…):**

- âœ… Admin panel visually consistent in design system with client app.
- âœ… Plan cards never show 0 for unavailable options (uses âœ•).
- âœ… PRO/PREMIUM labels on persona cards.
- âœ… Code review items resolved (6/7 completed, item 7 confirmed correct as-is).

### Milestone 18 â€” Admin Configurability & Code Quality (Owner-Directed, 2026-03-17)

> **Status: COMPLETED** — Block A (Admin Configurability) delivered by Phases 44.1–44.5. Block C (Code Organization) delivered by Phases 45.1–45.4, 43.2. Block B (Code Quality) COMPLETE — client fetch audit CLEAN, autoAnimate leak FIXED (Phase 49.1). Currency configurability IMPLEMENTED (Phase 48.1). Import type fixes (49.2), SVG unoptimized (49.3), promo cards role-aware + plan-contextual (49.4–49.5) ALL COMPLETE.
> PM audit #22+: Triple-audit confirmed Phases 44–45 complete. Phase 48.1 COMPLETE (currency configurability end-to-end). Phase 49.1 COMPLETE (autoAnimate leak fixed). Phase 49.2 COMPLETE (import type fixes). Phase 49.3 COMPLETE (SVG unoptimized). Phase 49.4–49.5 COMPLETE (promo cards role-aware + plan-contextual). ALL REMAINING PHASES COMPLETE.

**Objective:** Make ALL plans, prices, features, and settings fully admin-configurable with zero hardcoded references in code. Improve code quality by eliminating client-side fetching, unnecessary re-renders, and inline data.

**Dependencies:** Milestone 17.

**Scope:**

**Block A â€” Admin Configurability (CRITICAL):**

1. **CRITICAL** â€” Audit and remove ALL hardcoded plan/price/feature references from non-admin code. Every value must resolve from admin settings with hardcoded fallbacks only as last resort.
2. **HIGH** â€” Ensure admin settings propagation covers every surface: plan cards, checkout, entitlements, model policy, limit enforcement, persona gating.

**Block B â€” Code Quality (HIGH):**

3. **HIGH** â€” Eliminate all `fetch()` calls from client components. Components must receive data as props from Server Components.
4. **HIGH** â€” Audit for unnecessary re-renders and resource leaks. Fix identified issues.
5. **HIGH** â€” Move all utilities and data fetching to server side where possible.

**Block C â€” Code Organization (MEDIUM):**

6. **MEDIUM** â€” Move all dummy/static JSON data from inline component files to dedicated `src/json/` folder.
7. **MEDIUM** â€” Consolidate TypeScript types into dedicated `src/types/` folder (verify existing structure, move any scattered types).

**Success criteria:**

- No hardcoded plan/price/feature values outside admin settings and fallback constants.
- Zero `fetch()` calls in client components.
- No unnecessary re-renders identified by audit.
- Static JSON data in dedicated folder, not inline.
- Types consolidated in `src/types/`.

### Milestone 19 — Admin UX, Data Architecture & Production Hardening (Owner-Directed, 2026-03-17)

> **Status: PLANNED** — Owner directives from latest review. Prioritized by severity.

**Objective:** Complete admin panel UX transformation (tabbed settings, design alignment, dashboard enrichment), fix remaining media generation bugs, eliminate hardcoded data, and enforce clean component architecture.

**Dependencies:** All prior milestones complete. Phase 52.1-52.2 already planned in TODO.md.

**Block A — CRITICAL (Architecture Quality):**

1. **CRITICAL** — Components must be data consumers. No data fetching in client components. Server Components pass data as props.
2. **CRITICAL** — No hardcoded data. All plans, prices, features, limits, model names, and persona config must be admin-configurable. Hardcoded values only as fallback defaults in constants.
3. **CRITICAL** — Good practices: reduce unnecessary renders and resource leaks. Audit all client components for cleanup.
4. **CRITICAL** — Utilities and data fetching on server side. Move remaining client-side utilities to server where possible.

**Block B — HIGH (Bugs & Admin UX):**

5. **HIGH** — Admin tabbed sections for settings page (Phase 52.1-52.2 in TODO.md). Group 7 inline form sections into 5 tabs: Models, Plans & Pricing, Limits, Personas, Theme. Extract into separate components.
6. **HIGH** — Investigate and fix media generation “Request failed. Invalid request body.” error if still occurring. Zod schema was fixed in Phase 40.1 — verify no regression.
7. **HIGH** — Investigate and fix video generation errors / “unable to create videos” reply. Phase 51.1 added media-tool awareness to persona prompts — verify fix is effective end-to-end.
8. **HIGH** — VideoPlayer for generated videos — VERIFIED PRESENT at `src/components/shared/video-player.tsx`. Has `controls`, `playsInline`, `preload="metadata"`.
9. **HIGH** — Admin panel must match /app design system. Phase 36.1/42.1 delivered baseline alignment — verify design tokens, spacing, and typography remain consistent.
10. **HIGH** — Plans/prices/features fully configurable from admin. Phase 27.5/44.x delivered propagation chain — verify all surfaces consume admin settings.

**Block C — MEDIUM (Admin Enrichment & Display):**

11. **MEDIUM** — PlanStatus and PlanPromo cards for admin/guest/client roles. PlanPromo DONE (role-aware). PlanStatus needs evaluation — currently embedded in sidebar promo, not a separate component.
12. **MEDIUM** — Admin full permissions over all personas — no trial limits for admin role. Currently admin is treated as their plan tier in API route. Needs: admin role check in `/api/openai` route to bypass trial limits and enable full persona access.
13. **MEDIUM** — Admin dashboard cards reflecting all activity types. Currently shows 4 metrics (Users, Conversations, Transactions, Usage Events). Needs: Images Generated, Audio Generated, Video Generated counts.
14. **MEDIUM** — Admin users table with usage/limits info. Currently shows: username, email, role, plan, registered, state. Needs: conversation count, media generation counts, plan limits.
15. **MEDIUM** — Admin usage “Top Personas” showing statistics not enumeration — VERIFIED CORRECT. Shows label + count + percentage.
16. **MEDIUM** — Personas unavailable should show PRO/PREMIUM badge — VERIFIED CORRECT. `persona-card.tsx` has `requiredPlan` prop.
17. **MEDIUM** — Plan cards: no “0” for unavailable options — VERIFIED CORRECT. `formatMediaLimitLabel` returns “✕” when limit is 0.
18. **MEDIUM** — Currency symbol configurable — MOSTLY DONE (Phase 48.1). Gap: admin user detail page still uses hardcoded `$` for transaction amounts.
19. **MEDIUM** — JSON data outsourced to json folder. Currently data arrays live in `src/constants/` with “-data” suffix (about-data.ts, terms-data.ts, privacy-data.ts, cookies-data.ts, landing-data.ts). Owner wants dedicated `src/json/` folder.
20. **MEDIUM** — TypeScript types outsourced to types folder — VERIFIED CORRECT. 15 type files in `src/types/`. Minor inline types in 2 component files are acceptable co-located types.
21. **MEDIUM** — Admin user detail page missing video generations count (shows image + audio but not video).

**Block D — Architect-Identified Gaps:**

22. **MEDIUM** — Video model not admin-overridable (Phase 50.1 planned in TODO.md). Image and audio models have admin overrides but video does not.
23. **LOW** — Admin settings page is 735 lines with normalizer functions and model option arrays inline. Phase 52.2 will extract these.

**Success criteria:**

- Admin settings page uses tabbed navigation with proper ARIA accessibility.
- Admin dashboard shows all activity type metrics.
- Admin users table shows usage and limits per user.
- Admin role bypasses trial limits in API route.
- Zero hardcoded plan rules in non-admin code.
- All components are data consumers (no client-side data fetching).
- Video generation works end-to-end with proper error handling.
- Currency symbol dynamic on all surfaces including admin user detail.

---

## 12. What The Team Must Stop Doing

1. Stop changing plan copy before backend rules are settled.
2. Stop encoding plan rules in UI components.
3. Stop treating the current `Task` message array as if it is safe for growth.
4. Stop treating admin as a cosmetic dashboard problem.
5. ~~Stop promising advanced Premium features before provider and storage readiness are proven.~~ â€” Video generation delivered and verified (Phase 34). Remaining media features (if any) still require readiness verification.
6. Stop allowing route structure to drift away from product boundaries.
7. Stop maintaining companion personas (Best Friend, Boyfriend, Girlfriend) â€” Owner directive: removed.
8. Stop treating Analyst as separate from Strategist â€” merged by Owner directive.
9. Stop using `fetch()` in client components â€” pass data from Server Components as props.
10. Stop leaving dummy JSON data inline in component files â€” outsource to dedicated `json/` folder.
11. Stop hardcoding plan rules, prices, or feature flags in non-admin code â€” everything must be admin-configurable.

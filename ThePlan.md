# Cellesseon - Completion Plan

> Purpose: one execution document for finishing the SaaS without avoidable rework.
>
> Audience: Project Manager, Architect, and Senior Software Agents.
>
> Rule: this plan is based on verified repository state. If older docs disagree with code, code wins until this file is updated.

---

## 1. Executive Judgment

Cellesseon is not blocked by visual polish.

It is blocked by product-rule drift, route fragmentation, incomplete entitlement logic, weak usage accounting, missing storage guardrails, and the absence of a real admin control plane.

The repository already has useful foundations:

- Next.js 16 App Router
- Clerk auth and proxy-based route protection
- Stripe checkout and webhook plumbing
- MongoDB persistence through Mongoose
- persona-based prompting
- conversation persistence
- basic image and audio generation hooks

The repository is not release-ready because the critical product contract is still inconsistent across code, docs, and intended behavior.

The correct strategy is not to keep adding features.

The correct strategy is to freeze product rules, build one canonical policy layer, move storage and usage accounting onto a safe foundation, then finish UX, admin, public pages, and launch controls on top of that.

---

## 2. Verified Baseline

The points below are verified from the current codebase.

| Area                 | Verified Current State                                                                                        | Impact                                                                          | Evidence                                                                                                   |
| -------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Lite lifecycle       | Lite still expires after 3 days                                                                               | Conflicts with permanent free Lite requirement                                  | `src/constants/plans.tsx`, `src/lib/database/models/user.model.tsx`, `src/app/api/openai/route.tsx`        |
| Pricing              | Pro is 29 and Premium is 69                                                                                   | Conflicts with requested 19 / 39 pricing                                        | `src/constants/plans.tsx`                                                                                  |
| Public usage access  | `/api/openai` already requires auth                                                                           | Supports account-required chat direction                                        | `src/app/api/openai/route.tsx`                                                                             |
| Route boundaries     | Protected pages are split across `/app`, `/profile`, `/plans`, `/dashboard`                                   | Product and auth boundaries are harder to reason about than necessary           | `src/proxy.tsx`, `src/app/**`                                                                              |
| Admin scope          | Admin is a single dashboard page with only aggregate counts                                                   | Requested admin capabilities do not exist                                       | `src/app/(chat)/dashboard/page.tsx`                                                                        |
| Entitlements         | Lite excludes `boyfriend` and `girlfriend`; media capability is plan-gated in a narrow resolver               | Conflicts with “all personas for all plans” and does not cover full quota logic | `src/lib/utils/resolve-entitlements.tsx`                                                                   |
| Model routing        | Chat, title, image, and audio models are hardcoded separately                                                 | No plan-aware or model-family-aware AI policy layer exists                      | `src/lib/utils/openai/generateResponse.tsx`, `generateTitle.tsx`, `generateImage.tsx`, `generateAudio.tsx` |
| Conversation storage | `Task` stores the full message history in one document                                                        | Unsafe for growth; MongoDB document growth remains a release risk               | `src/lib/database/models/tasks.model.tsx`                                                                  |
| Usage accounting     | Only image/audio counters exist on the user plan subdocument; no cost ledger or durable request ledger exists | Admin analytics, cost governance, and reliable quota enforcement are incomplete | `src/lib/database/models/user.model.tsx`, `src/app/api/openai/route.tsx`                                   |
| Rate limiting        | OpenAI request limiting is in-memory sliding window                                                           | Does not survive restarts or multiple instances                                 | `src/app/api/openai/route.tsx`, `src/lib/utils/rate-limit.ts*`                                             |
| Billing mode         | Stripe flow is still one-time/payment-mode behavior with expiry dates                                         | SaaS billing semantics are not yet frozen                                       | `SPEC.md`, Stripe webhook code                                                                             |
| Streaming            | No streaming route or client implementation exists                                                            | Chat UX target is incomplete                                                    | repository search under `src/**`                                                                           |
| Public pages         | `/`, `/pricing`, `/personas` exist; `/about`, `/faqs`, privacy, cookie, and terms pages do not                | Requested public-information surface is incomplete                              | `src/app/(public)/**`                                                                                      |
| FAQ copy             | FAQ content still references a free trial                                                                     | Product messaging is already inconsistent                                       | `src/constants/faqs.tsx`                                                                                   |
| Theme control        | Theme exists as app-level light/dark switching, but no admin management surface exists                        | Requested settings control is absent                                            | `src/app/layout.tsx`, `src/components/layout/cellesseon-theme.tsx`                                         |
| Tiptap               | Not installed                                                                                                 | Admin rich-text editing work has not started                                    | `package.json`                                                                                             |

### Practical conclusions

1. Do not build any anonymous Lite chat path. The code already assumes authenticated AI usage.
2. Do not touch pricing, paid-plan copy, or plan upgrade UX before plan rules and billing semantics are frozen.
3. Do not promise Premium-only media features until provider support, moderation flow, storage lifecycle, and cost ceilings are approved.
4. Do not build admin analytics before a real usage ledger exists.
5. Do not treat route cleanup as cosmetic refactoring. It is part of auth, ownership, and product-boundary repair.

---

## 3. Target Release Contract

This section defines the intended v1 target state.

### 3.1 Non-negotiable product rules

1. Users must create an account before using chat, uploads, media generation, or plan-limited features.
2. Lite is permanent and free. The 3-day trial behavior must be removed everywhere.
3. All personas are available in all plans.
4. Lite is limited by usage, not by persona access.
5. Lite users are capped at 5 conversations per day.
6. Lite users are capped at 10 user prompts per conversation.
7. Lite users are capped at 3 media generations in the approved reset window.
8. Pro and Premium are paid-only.
9. When any limit is reached, the server must end the conversation with an exact stop reason and exact next action.
10. Every plan must stop conversations before MongoDB storage pressure becomes a runtime failure.
11. After a forced stop, the user must be told only one of these next actions: start a new conversation, upgrade the plan, or contact support.
12. Private pages must be auth-protected and user ownership must be enforced in every read and write path.
13. Admin routes and admin actions must be role-protected server-side and at the proxy boundary.

### 3.2 Tier contract

| Tier    | Access              | Price | Model policy                                                                                                    | Required baseline limits                                                                                                                                 |
| ------- | ------------------- | ----- | --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lite    | Auth required, free | 0     | Cheapest approved text + media stack at implementation time                                                     | 5 conversations per day, 10 user prompts per conversation, 3 media generations per approved reset window, hard conversation stop on quota or storage hit |
| Pro     | Paid only           | 19    | `gpt-5.2-pro` only if verified available and cost-approved; otherwise approved fallback with explicit plan note | Higher ceilings than Lite, paid-only reliability and quality improvements                                                                                |
| Premium | Paid only           | 39    | `gpt-5.4-pro` only if verified available and cost-approved; otherwise approved fallback with explicit plan note | Highest ceilings plus 3 explicitly defined Premium-only features                                                                                         |

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
6. “Real content” still requires legal review before production publication. Research alone is not legal approval.

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
| Pro/Premium ceilings               | “Higher limits” is not implementable                                                    | Define exact ceilings for conversations, prompts, media, and storage                                     |
| Premium extras                     | “3 more premium features” is too vague                                                  | Name each feature, define provider, moderation, storage, and success criteria                            |
| Model availability                 | Requested model IDs may not be available or cost-safe                                   | Verify availability and cost before plan copy is changed                                                 |
| Storage budget for first 100 users | Conversation-stop rules depend on it                                                    | Approve a conservative storage budget and quota formula before chat changes                              |
| Legal page review path             | “Real content” without review creates business risk                                     | Research first, publish only after legal/business signoff                                                |

### Hard calls

1. Defer yearly billing from v1. The repository already has monthly/yearly assumptions, but yearly pricing is undefined and not requested.
2. Do not promise video generation in Premium v1 unless provider support, moderation, storage, and cost ceilings are verified. Premium feature ambition is fine; ungoverned media scope is not.
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

Create one AI policy layer that resolves:

- text model by plan
- title model by plan
- image model by plan
- audio model by plan
- prompt template version by persona and model family
- output mode where reliability matters: free text vs structured output
- estimated cost and latency expectations per request

Do not keep model names hardcoded across separate utilities.

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
- All personas are available for all plans
- Stop reasons and next actions work across chat flows
- Streaming is stable enough for production

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
- Premium video generation without verified provider and moderation design
- Broad role systems beyond `client` and `admin`
- CMS-like website complexity beyond the required public pages

---

## 11. What The Team Must Stop Doing

1. Stop changing plan copy before backend rules are settled.
2. Stop encoding plan rules in UI components.
3. Stop treating the current `Task` message array as if it is safe for growth.
4. Stop treating admin as a cosmetic dashboard problem.
5. Stop promising advanced Premium features before provider and storage readiness are proven.
6. Stop allowing route structure to drift away from product boundaries.

# Cellesseon - Delivery Completion Plan

> Purpose: one execution document for finishing the SaaS with the least avoidable rework.
>
> Audience: Project Manager, Architect, and Senior Software Agents.
>
> Rule: this plan is evidence-driven. If repository code and older docs disagree, code wins until this plan is explicitly updated.

---

## 1. Executive Position

Cellesseon is not blocked by missing pages.

It is blocked by product-rule drift, incomplete entitlement design, weak usage accounting, route fragmentation, and the absence of a real admin control plane.

The repository already has useful foundations:

- Next.js 16 App Router structure
- Clerk authentication and proxy-based route protection
- Stripe checkout and webhook plumbing
- MongoDB persistence via Mongoose
- persona-driven prompting
- persisted conversations
- basic image and audio generation hooks

What is still not trustworthy enough to finish the product cleanly:

- Lite plan business rules
- pricing and billing alignment
- model routing by paid tier
- all-personas-for-all-plans entitlement policy
- server-side conversation and storage stop rules
- admin control surface and auditability
- usage and cost visibility
- route and auth boundary clarity
- prompt strategy by persona and model family
- streaming response lifecycle

This plan fixes sequencing first. Feature work follows that order.

---

## 2. Verified Current State

The points below are verified from the current repository and must be treated as fact.

| Area | Verified Current State | Why It Matters |
| --- | --- | --- |
| Lite lifecycle | Lite still expires after 3 days in plan constants, user defaults, and OpenAI route gating | Permanent free Lite is not implemented |
| Pricing | Pro is 29 and Premium is 69 in plan constants | Requested pricing is not reflected in code |
| Auth requirement | `/api/openai` already requires Clerk auth | This now aligns with the new requirement that users must create an account to use the app |
| Route boundaries | Protected pages are split across `/app`, `/profile`, `/plans`, and `/dashboard` | Product boundaries are harder to reason about than they should be |
| Admin | Admin is a single dashboard page with three count cards only | Requested admin capabilities do not exist yet |
| Entitlements | Persona and media access are partially centralized, but conversation caps, storage caps, and daily conversation limits are not | There is no complete entitlement engine |
| Personas | Lite currently excludes `boyfriend` and `girlfriend` | Requested rule says all personas must be available in all plans |
| Model routing | Chat, title, image, and audio models are hardcoded in separate utilities | Tier-aware model policy does not exist |
| Conversations | A `Task` stores the full message history in an embedded array | Document growth, quota enforcement, and analytics remain fragile |
| Usage accounting | Image and audio counters exist, but request limiting is in-memory and cost tracking is weak | Production abuse control and admin reporting are not ready |
| Billing mode | Stripe checkout is payment-mode, not recurring subscription-mode | Plan lifecycle semantics must stay explicit |
| Streaming | Streaming responses are not implemented | Chat UX target is incomplete |
| Admin editor | Tiptap is not installed | Admin content editing is not started |

### Verified implications

1. Do not design any anonymous or public Lite chat path. The current product direction requires authentication before usage.
2. Do not update prices, plan copy, or paid-plan promises before entitlement rules and billing semantics are frozen.
3. Do not promise Premium media features until exact capabilities, moderation flow, storage lifecycle, and cost ceilings are approved.
4. Do not expand AI features before usage accounting exists outside ad hoc conversation state.
5. Do not treat route cleanup as cosmetic refactoring. It is an auth and product-boundary refactor.

---

## 3. Target Product Contract

This section defines the intended target state for the next serious release.

### 3.1 Commercial tiers

| Tier | Access | Price | Model policy | Core limits |
| --- | --- | --- | --- | --- |
| Lite | Account required | Free | Cheapest approved text model at implementation time | Max 5 conversations per day, max 10 user prompts per conversation, max 3 media generations within the approved usage window, conversation hard-stops on any plan or storage limit |
| Pro | Paid only | 19 | `gpt-5.2-pro` only if verified available and cost-approved | Higher usage ceilings than Lite, paid-only quality improvements, no public access |
| Premium | Paid only | 39 | `gpt-5.4-pro` only if verified available and cost-approved | Highest usage ceilings plus 3 explicitly defined premium-only features |

### 3.2 Non-negotiable product rules

1. Users must create an account before using chat, uploads, or media generation.
2. Lite is permanent and free. The old 3-day availability must be removed everywhere.
3. All personas are available in all plans. Plan tiers must not hide personas.
4. Lite is limited by usage, not by persona access.
5. When any limit is reached, the server must end the conversation cleanly and return an exact stop reason.
6. When a conversation is ended, the UI must direct the user to one of three outcomes only: start a new conversation, upgrade the plan, or contact support.
7. Every plan must stop conversations before MongoDB storage pressure becomes a runtime failure.
8. Premium must not promise video or any other advanced media feature until provider support, moderation, storage, and cost controls are approved.

### 3.3 Required contract clarifications before implementation

The following are still incomplete and must be frozen before implementation starts:

| Topic | Required decision |
| --- | --- |
| Lite media reset window | Define whether Lite media limit resets daily, monthly, or on another fixed window. The current codebase has 30-day-style counters; the requested product rules do not state the new reset window clearly. |
| Pro and Premium ceilings | Define exact daily or monthly ceilings for conversations, prompts, storage, and media so paid plans are enforceable, not vague. |
| Premium extras | Name the exact 3 premium-only capabilities and define acceptance criteria for each. |
| Storage budget | Define how per-user and per-conversation storage is calculated for the first 100 users and which limits trigger hard-stop behavior. |
| Support messaging | Standardize exact user-facing stop messages for usage cap, storage cap, paid-feature block, billing problem, and support escalation. |
| Yearly billing exposure | Decide whether yearly billing remains exposed in this release or is deferred to reduce billing complexity. |

### 3.4 Recommended contract decisions

These are recommended because they reduce implementation risk and reuse existing code patterns.

1. Keep paid plans as payment-mode purchases for this release. Do not redesign billing into auto-renewing subscriptions at the same time as entitlement rewrite.
2. Keep Lite media limits on an explicit rolling window rather than lifetime limits. Lifetime caps create irreversible support noise and poor UX.
3. Do not commit to Premium video generation in this release. It is high-cost, high-storage, high-moderation work and the repository is not ready for it.

---

## 4. Frozen Architecture Decisions

These decisions are the recommended stable path. Reversing them later will create avoidable rework.

### 4.1 Route and namespace model

Use product semantics, not historical grouping.

| Area | Target namespace |
| --- | --- |
| Public marketing | `/`, `/pricing`, `/personas`, `/sign-in`, `/sign-up` |
| Authenticated app | `/app`, `/app/new`, `/app/c/[conversationId]`, `/app/library`, `/app/personas`, `/app/account`, `/app/billing` |
| Admin | `/admin`, `/admin/users`, `/admin/users/[userId]`, `/admin/transactions`, `/admin/transactions/[transactionId]`, `/admin/usage`, `/admin/settings`, `/admin/website`, `/admin/website/[pageId]` |

Routes to retire after migration:

- `/profile`
- `/plans`
- `/dashboard`

### 4.2 Auth boundary model

1. Public routes stay public by explicit design, but they do not provide app usage.
2. All signed-in product routes live under `/app(.*)`.
3. All admin routes live under `/admin(.*)`.
4. Admin authorization is role-based and enforced in both proxy and server-side actions.
5. API route auth remains explicit. There is no anonymous actor path in this release.

### 4.3 Canonical entitlement model

Build one server-side entitlement resolver that accepts:

- actor type: client or admin
- plan: Lite, Pro, Premium
- requested capability: chat, image, audio, upload, download, admin action
- persona id
- usage context: daily conversation count, prompt count in current conversation, media count in current window, conversation byte estimate, user storage estimate, billing status

The resolver must return:

- allowed or blocked
- exact reason code
- applicable model route
- quota snapshot
- conversation end requirement
- upgrade requirement if relevant
- support escalation requirement if relevant

No UI component, route, or helper should own business rules directly.

### 4.4 Conversation lifecycle model

Each conversation must have explicit lifecycle state, not implicit failure behavior.

Required conversation state fields:

- `promptCount`
- `mediaCount`
- `estimatedBytes`
- `endedAt`
- `endedReason`
- `endAction`

Recommended `endedReason` codes:

- `prompt_limit_reached`
- `media_limit_reached`
- `daily_conversation_limit_reached`
- `conversation_storage_limit_reached`
- `user_storage_limit_reached`
- `paid_feature_required`
- `billing_state_invalid`
- `support_required`

Recommended `endAction` values:

- `start_new_conversation`
- `upgrade_plan`
- `contact_support`

### 4.5 Data model direction

Current `Task` documents are acceptable only as a transitional state.

Recommended model direction:

| Model | Purpose | Status |
| --- | --- | --- |
| `Task` | Conversation shell and summary metadata | Keep, but stop treating it as the entire ledger |
| `TaskMessage` or equivalent separated message store | Scalable message history outside a single growing document | Strongly recommended |
| `UsageEvent` | Per request usage, model, provider, tokens, estimated cost, latency, blocked reason | Required |
| `ConversationCounter` or embedded task counters | Prompt count, media count, estimated bytes, end reason | Required |
| `AppSetting` | Mutable admin-controlled application configuration | Recommended |
| `PublicPage` | Admin-managed public pages and ordering | Recommended |
| `AdminAuditLog` | Admin actions and reason trail | Required |

### 4.6 AI orchestration model

Create one AI policy layer that resolves:

- text model by plan
- title model by plan
- image model by plan
- audio model by plan
- prompt template version by persona and model family
- cost and latency telemetry per request

Do not keep model names hardcoded across independent helpers.

### 4.7 Admin domain boundaries

Admin is an operational control plane, not a generic CRUD playground.

Required admin areas:

| Area | Required capability |
| --- | --- |
| Users | Search, inspect, invite or create, suspend or reactivate, soft-remove, view plan, view usage by model, inspect conversations |
| Transactions | Inspect, annotate, refund-or-flag workflow, entitlement correction workflow |
| Usage | Per user, per model, per provider, per period analytics; placeholder cards allowed initially if the data layer is still landing |
| Settings | Manage feature flags, limits, provider toggles, support copy, pricing presentation, plan rules |
| Website | Create, edit, sort, publish or unpublish public pages and rich content blocks |

Important correction:

- Transactions should not implement fake `suspend` or `decline` semantics after Stripe success. Admin actions must map to real operations such as refund, note, investigate, freeze entitlements, or reconcile.

### 4.8 Tiptap decision

Tiptap is the correct editor baseline for admin rich-text fields.

Context7 confirms:

- baseline React and Next.js setup uses `@tiptap/react`, `@tiptap/pm`, and `@tiptap/starter-kit`
- Next.js client components should use `immediatelyRender: false`
- Pro packages require private registry access and token-based setup

Practical decision:

1. Baseline admin editor delivery should target Tiptap core first.
2. If the requested `Dev Toolkit Editor Suite` depends on Pro packages, procurement and token setup are prerequisites.
3. Do not block the entire admin milestone on premium editor extras if core editing satisfies release needs.

---

## 5. Delivery Principles

This order is mandatory because it prevents waste:

1. Freeze product rules before touching billing, pricing copy, or plan UX.
2. Freeze entitlement and storage policy before route cleanup and streaming.
3. Build usage accounting before admin analytics.
4. Build admin auditability before admin mutations.
5. Build storage guardrails before promising heavier media features.
6. Improve AI prompts only after the model-routing contract exists.
7. Do not mix billing redesign with admin expansion and streaming in the same milestone.

---

## 6. Milestone Plan

## Milestone 0 - Product Contract Freeze

**Objective**

Freeze the commercial, entitlement, storage, and premium-capability contract so implementation stops chasing moving targets.

**Assumptions**

- Account-required access is final.
- Lite stays free and permanent.
- Payment-mode Stripe checkout remains acceptable for this release unless explicitly changed.

**Dependencies**

- None

**Blockers**

- Premium extras are vague.
- Requested model IDs are unverified.
- Lite media reset window is not defined.
- Storage-stop calculations for the first 100 users are not defined.

**PM / Architect outputs**

1. Approve the final tier matrix.
2. Approve exact Lite limits, stop reasons, and upgrade messaging.
3. Define the 3 Premium-only capabilities by exact user-visible behavior.
4. Approve whether yearly billing stays visible in this release.
5. Approve support escalation conditions.

**Senior implementation outputs**

1. Verify OpenAI model availability and approximate cost envelopes for `gpt-5.2-pro` and `gpt-5.4-pro`.
2. Produce a storage-budget proposal for 100 initial users.
3. Identify every code path currently tied to Lite expiry, old pricing, and persona restrictions.

**Risks**

- pricing drift across UI, Stripe metadata, and backend checks
- selling unimplemented Premium features
- choosing model tiers that are operationally too expensive

**Success criteria**

- Lite is approved as permanent free access.
- Pro is 19 and Premium is 39 in the approved contract.
- Premium extras are no longer vague.
- Model promises are either verified or replaced before coding starts.

**What not to do yet**

- Do not update Stripe metadata.
- Do not update plan copy globally.
- Do not start route migrations.

---

## Milestone 1 - Canonical Policy And Data Contract

**Objective**

Define the entitlement, conversation-stop, and storage-accounting contract that all later work depends on.

**Assumptions**

- The app remains single-tenant per user account.
- All personas remain selectable across all plans.

**Dependencies**

- Milestone 0

**Blockers**

- Current logic only partially covers persona and media access.
- Current `Task` model is too coarse to act as the sole policy source.

**PM / Architect outputs**

1. Approve the canonical entitlement contract.
2. Approve all user-visible blocked-state messages.
3. Approve the conversation-end state model and action matrix.
4. Approve the storage budget formula and thresholds.

**Senior implementation outputs**

1. Define the canonical resolver input and output types.
2. Define the required counters for conversations, media, and storage.
3. Define the migration path from current `Task.messages` behavior.
4. Define the new models required for usage, settings, and auditability.

**Risks**

- plan text diverges from backend behavior again
- storage rules become approximate and inconsistent
- UX messaging differs from actual stop reasons

**Success criteria**

- One approved policy contract exists before feature coding starts.
- Every required stop reason and next action is defined.
- Required model additions are explicit, not implied.

**What not to do yet**

- Do not hardcode new limits directly in components.
- Do not start admin CRUD before policy contracts exist.

---

## Milestone 2 - Route And Auth Boundary Redesign

**Objective**

Make product boundaries obvious, enforceable, and maintainable.

**Assumptions**

- Public pages remain marketing-only.
- All app usage requires authentication.

**Dependencies**

- Milestone 0
- Milestone 1

**Blockers**

- Final route map must be approved.

**PM / Architect outputs**

1. Approve the namespace map for public, app, and admin.
2. Freeze redirect behavior for legacy routes.
3. Approve account and billing information architecture under `/app`.

**Senior implementation outputs**

1. Move account semantics under `/app/account`.
2. Move billing semantics under `/app/billing`.
3. Move admin semantics under `/admin`.
4. Simplify proxy protection rules.
5. Update internal navigation and CTA targets.
6. Add tests for protected and admin-only route behavior.

**Risks**

- redirect loops
- broken deep links
- hidden unprotected routes
- stale links in header, avatar menu, and chat sidebar

**Success criteria**

- Public routes are public by design only.
- Signed-in routes are fully under `/app`.
- Admin routes are fully under `/admin`.
- Legacy route compatibility is explicit and temporary.

**What not to do yet**

- Do not redesign the full UI during the route move.
- Do not broaden existing API auth exceptions.

---

## Milestone 3 - Entitlement Engine Rewrite

**Objective**

Create one source of truth for plans, capabilities, limits, stop reasons, and model selection.

**Assumptions**

- All persona access is plan-independent.
- Limits, not personas, differentiate plans.

**Dependencies**

- Milestone 0
- Milestone 1

**Blockers**

- Current logic covers only part of the rule set.

**PM / Architect outputs**

1. Approve the final entitlement matrix.
2. Approve all stop-message copy.
3. Approve paid-feature upgrade prompts.

**Senior implementation outputs**

1. Replace Lite expiry logic across model defaults, route gating, and billing state.
2. Remove persona restrictions from plan enforcement.
3. Centralize conversation count, prompt count, media count, and storage checks.
4. Resolve model policy through the entitlement layer.
5. Return exact reason codes for UI and admin analytics.

**Risks**

- old plan checks survive in hidden paths
- upgrade prompts trigger at the wrong time
- conversation termination feels inconsistent

**Success criteria**

- Every capability check goes through one policy layer.
- Lite no longer expires by date.
- All personas are available on Lite, Pro, and Premium.
- UI does not hardcode business limits.

**What not to do yet**

- Do not start streaming work before this is stable.
- Do not add new persona families during this rewrite.

---

## Milestone 4 - Conversation, Storage, And Usage Accounting

**Objective**

Make quota enforcement, storage safety, and cost visibility durable.

**Assumptions**

- MongoDB remains the persistence layer.
- S3 remains the file storage layer.

**Dependencies**

- Milestone 1
- Milestone 3

**Blockers**

- `Task` documents still embed full message histories.
- There is no real usage ledger.

**PM / Architect outputs**

1. Approve per-user and per-conversation storage budget rules.
2. Approve conversation retention policy by plan.
3. Approve which metrics must be visible to users versus admin only.

**Senior implementation outputs**

1. Add explicit per-conversation counters: prompt count, media count, estimated bytes, ended reason.
2. Introduce `UsageEvent` or equivalent usage ledger.
3. Track model, provider, token counts, latency, estimated cost, and blocked reasons.
4. Define and implement a safe migration path from `Task`-only storage.
5. Add index strategy for usage queries and admin reporting.
6. Stop storing heavy payloads inline where references are sufficient.

**Risks**

- inability to explain model cost per user
- quota checks depending on parsing message arrays
- MongoDB document growth reaching failure thresholds
- support unable to explain why a conversation ended

**Success criteria**

- Lite daily conversation cap can be enforced server-side.
- Prompt and media caps are enforced server-side.
- Storage budget breaches are detected before document failure.
- Usage can be reported per user, per model, per provider, and per period.

**What not to do yet**

- Do not over-engineer multi-tenant analytics.
- Do not change database technology.

---

## Milestone 5 - Pricing And Billing Alignment

**Objective**

Align account defaults, pricing, checkout, and persisted plan state with the approved contract.

**Assumptions**

- Stripe remains the payment provider.
- Payment-mode checkout stays in place unless approved otherwise.

**Dependencies**

- Milestone 0
- Milestone 3
- Milestone 4

**Blockers**

- Old trial semantics are still embedded in constants, models, and webhook behavior.

**PM / Architect outputs**

1. Approve final plan copy after backend rules are stable.
2. Approve yearly billing exposure for this release.
3. Approve billing-history expectations for permanent Lite users.

**Senior implementation outputs**

1. Make new accounts default to permanent Lite.
2. Remove old trial copy and expiry logic everywhere.
3. Update Stripe checkout mapping, webhook updates, and user plan persistence.
4. Verify plan status rendering across app, billing, pricing, and upgrade surfaces.
5. Extend tests for sign-up default plan, upgrade flow, and webhook idempotency.

**Risks**

- wrong plan state after checkout
- stale pricing on public or private surfaces
- hidden date-expiry checks breaking Lite users

**Success criteria**

- New users land on Lite permanently.
- Pro is 19 and Premium is 39 everywhere.
- Billing and entitlement state match after checkout and webhook processing.

**What not to do yet**

- Do not update marketing first and backend later.
- Do not leave trial-language remnants in any UI or support flow.

---

## Milestone 6 - AI Control Plane, Persona Prompting, And Streaming

**Objective**

Move from hardcoded model calls to tier-aware, persona-aware AI orchestration with streaming.

**Assumptions**

- Requested GPT-5 model IDs must be verified before promise or implementation.
- Persona prompts can be versioned without exposing authoring to end users.

**Dependencies**

- Milestone 3
- Milestone 4
- Milestone 5

**Blockers**

- Model routing and prompt strategy are currently scattered.
- Streaming currently has no quota-aware lifecycle.

**PM / Architect outputs**

1. Approve model routing by tier and capability.
2. Approve prompt versioning strategy by persona and model family.
3. Approve streaming UX rules and failure handling.

**Senior implementation outputs**

1. Create a central model registry by plan and capability.
2. Version persona prompts by persona and model family.
3. Improve system prompts for each persona and each allowed model tier.
4. Add streaming responses for authenticated chat.
5. Capture latency, token usage, and cost metrics per request, including streamed requests.

**Risks**

- model promises not matching runtime behavior
- higher latency or cost from wrong tier routing
- streaming creating state inconsistencies on partial failure

**Success criteria**

- Model selection is policy-driven.
- Persona prompting is versioned and maintainable.
- Streaming works without breaking quota enforcement or history persistence.

**What not to do yet**

- Do not add a second AI provider.
- Do not promise unsupported premium media features.

---

## Milestone 7 - Admin Control Plane

**Objective**

Build a real admin surface for operations, support, content, and release control.

**Assumptions**

- Admin remains a role on the user account, not a separate product.
- Placeholder usage cards are acceptable only where data is not yet landed.

**Dependencies**

- Milestone 2
- Milestone 3
- Milestone 4
- Milestone 5

**Blockers**

- No settings, website, usage, or audit models exist yet.

**PM / Architect outputs**

1. Approve admin information architecture.
2. Approve which admin actions are destructive, reversible, or soft-only.
3. Approve placeholder rules for usage dashboards where real data is still missing.

**Senior implementation outputs**

1. Build `/admin` overview with real operational summaries.
2. Build `/admin/users` and `/admin/users/[userId]` with support-safe actions.
3. Build `/admin/transactions` and `/admin/transactions/[transactionId]` with refund, flag, and audit workflows.
4. Build `/admin/usage` with drill-downs for user, model, provider, and period.
5. Build `/admin/settings` backed by durable settings storage.
6. Build `/admin/website` backed by a public page model and Tiptap editor.
7. Record admin actions in audit logs.

**Risks**

- powerful admin actions without auditability
- user deletion creating billing or data integrity problems
- fake transaction controls disconnected from Stripe reality
- content editing blocked by Tiptap Pro procurement issues

**Success criteria**

- Admin can inspect users, entitlements, usage, and financial records.
- Admin actions are auditable.
- Public content can be managed without code edits.
- Rich-text editing works through Tiptap on required admin fields.

**What not to do yet**

- Do not implement hard delete for financially relevant users by default.
- Do not expose raw internal settings without validation and role checks.

---

## Milestone 8 - Product UX And Design Differentiation

**Objective**

Deliver a persona-first product that does not feel like another generic chatbot shell.

**Assumptions**

- Product behavior and stop rules are stable enough to design around.

**Dependencies**

- Milestone 2 through Milestone 7

**Blockers**

- Product behavior must be stable first.

**PM / Architect outputs**

1. Approve the interaction thesis for what makes Cellesseon distinct.
2. Approve where limits, upgrades, and support escalations appear in the UX.
3. Approve which public pages are admin-editable versus fixed in code.

**Senior implementation outputs**

1. Make persona selection a first-class part of the journey.
2. Improve chat affordances around streaming, limits, ended conversations, and new conversation creation.
3. Keep plan differentiation clear without turning the product into billing noise.
4. Refine public-page structure and content architecture.
5. Improve responsive behavior and information hierarchy.

**Risks**

- visual redesign before product behavior stabilizes
- novelty hurting usability
- inconsistent UX between billing, chat, and admin surfaces

**Success criteria**

- The chat experience feels persona-led, not generic.
- Limit states and upgrade paths are clear.
- Public and private experiences feel connected but correctly separated.

**What not to do yet**

- Do not redesign everything before the underlying flows are stable.
- Do not hide entitlement state from users.

---

## Milestone 9 - Production Hardening And Release Control

**Objective**

Make the app safe to operate in production.

**Assumptions**

- Launch quality requires both behavioral and operational verification.

**Dependencies**

- Milestone 3 through Milestone 8

**Blockers**

- Rate limiting is still in-memory.
- Operational visibility is incomplete.

**PM / Architect outputs**

1. Approve release gates and rollback conditions.
2. Approve the minimum observability bar for launch.
3. Approve abuse-response and billing-incident handling processes.

**Senior implementation outputs**

1. Replace in-memory-only abuse controls with shared infrastructure.
2. Add structured logs and failure monitoring for OpenAI, Stripe, Clerk, upload, and download paths.
3. Add operational dashboards or at least queryable metrics sources.
4. Expand automated coverage for route auth, plan enforcement, admin actions, streaming, and webhook flows.
5. Run the full repository validation workflow before release.

**Risks**

- AI cost rise without attribution
- silent billing failures
- admin actions with no audit trail
- broken streaming or quota enforcement in production only

**Success criteria**

- The team can answer who used what, under which plan, with which model, at what estimated cost, and why a request failed or was blocked.
- Shared abuse controls protect the platform.
- Full quality gate passes before release.

**What not to do yet**

- Do not launch on top of in-memory-only protections.
- Do not add more feature surface before observability exists.

---

## 7. Stop-State Matrix

This matrix must become product behavior, not just documentation.

| Stop reason | User message intent | Next action | Notes |
| --- | --- | --- | --- |
| Prompt limit reached | This conversation reached the prompt limit for your plan | Start new conversation or upgrade | Lite-specific cap must end the current conversation |
| Media limit reached | You reached your media generation limit for the current usage window | Upgrade or wait for reset window | Message must state reset rules once approved |
| Daily conversation limit reached | You reached your conversation limit for today | Upgrade or come back later | Lite-specific daily cap |
| Conversation storage limit reached | This conversation reached the maximum allowed size | Start new conversation | Protects document growth |
| User storage limit reached | Your account reached the current storage allowance | Upgrade or contact support | Protects platform storage budget |
| Paid feature required | This feature requires a higher plan | Upgrade | Used for plan-differentiated premium capabilities |
| Billing state invalid | Your billing state must be resolved before continuing | Contact support | Must not leak provider internals |
| Support required | This account needs manual support review | Contact support | Rare operational path |

---

## 8. Admin Information Architecture

This is the recommended route map for admin delivery.

| Route | Purpose |
| --- | --- |
| `/admin` | Overview: users, conversations, transactions, provider status, recent failures |
| `/admin/users` | Searchable user list |
| `/admin/users/[userId]` | User detail, plan, usage, conversations, account status actions |
| `/admin/transactions` | Transaction list |
| `/admin/transactions/[transactionId]` | Transaction detail, audit notes, refund or flag workflow |
| `/admin/usage` | Aggregate reporting and filters |
| `/admin/settings` | Product settings, limits, flags, pricing presentation, provider toggles |
| `/admin/website` | Public pages and content list |
| `/admin/website/[pageId]` | Page editor with Tiptap |

### Admin action rules

| Action | Required rule |
| --- | --- |
| Add user | Use Clerk-compatible create or invite path; do not bypass identity source of truth |
| Suspend user | Soft action only; preserve financial and audit records |
| Remove user | Default to soft-delete or deactivate; hard delete only via controlled process |
| Change plan | Audit log required; reason required |
| Refund transaction | Must reconcile Stripe state and entitlement state |
| Edit public page | Revision trail required |
| Change app settings | Validation and audit log required |

---

## 9. Storage And Capacity Guardrails

The product requires conversations to stop on application limits and on MongoDB storage pressure. This must be explicit policy, not accidental database failure.

### Required guardrails

1. Add an estimated byte counter per conversation.
2. Add a per-user storage budget rule.
3. Add a per-conversation storage budget rule.
4. End a conversation when either business caps or storage caps are reached.
5. Persist an `endedReason` value so support and admin can explain the stop.
6. Prefer storing media as references instead of expanding embedded payloads.

### Required calculation work before implementation

The team must define:

- actual MongoDB deployment tier and storage ceiling
- acceptable storage budget reserved for the first 100 users
- expected average text message size
- expected metadata size per media action
- expected retained conversations per user by plan

Until those numbers exist, any storage-limit implementation is guesswork.

---

## 10. Testing And Readiness Gates

No milestone is complete until the related gate passes.

### Gate A - Contract Gate

- tier matrix approved
- model availability verified or corrected
- Premium extras frozen
- stop messages approved

### Gate B - Policy Gate

- canonical entitlement contract approved
- stop reasons approved
- storage budget formula approved
- required new models approved

### Gate C - Boundary Gate

- route map migrated
- proxy rules simplified
- auth tests cover public, signed-in, and admin boundaries

### Gate D - Entitlement Gate

- one canonical policy layer is in use
- Lite no-expiry behavior verified
- all personas available across plans
- blocked reasons surfaced consistently

### Gate E - Usage Gate

- prompt, conversation, media, and storage caps enforced server-side
- usage ledger queryable for admin needs
- conversation end reasons persisted

### Gate F - Billing Gate

- new user defaults verified
- Pro and Premium prices corrected everywhere
- webhook and checkout behavior tested end-to-end

### Gate G - Admin Gate

- audit logs for privileged actions
- user and transaction detail flows operational
- usage and settings pages usable even if some cards are placeholder-backed
- Tiptap admin editing working on required fields

### Gate H - Release Gate

- `npx prettier . --write`
- `npm run lint`
- `npx tsc --noEmit`
- `npm run test`
- `npm run test:e2e`
- `npm run build`
- rollback plan documented

---

## 11. Risk Register

| Risk | Severity | Why It Matters | Mitigation |
| --- | --- | --- | --- |
| Model mismatch | High | Product promises fail at runtime | Verify real model IDs before implementation |
| Plan drift | High | UI, billing, and backend diverge | Canonical entitlement layer |
| Conversation growth | High | Task documents become fragile | Counters, storage budget, message separation, usage ledger |
| Premium overpromise | High | Billing disputes and trust damage | Freeze exact Premium extras before copy changes |
| Admin overreach | High | Destructive actions without auditability | Soft actions first, audit logs, validation |
| Route confusion | Medium | User flows and auth rules stay brittle | Normalize public, app, and admin namespaces |
| Streaming regressions | Medium | Broken persistence and quota handling | Ship after entitlement and usage accounting are stable |
| Tiptap procurement gap | Medium | Admin CMS work stalls on package access | Use core Tiptap first; treat Pro access as separate prerequisite |

---

## 12. What To Defer Safely

These items are not required to finish the requested product shape for the next serious release:

1. multi-provider LLM routing
2. recurring subscription redesign
3. team or workspace features
4. dynamic user-created personas
5. advanced Tiptap collaboration features
6. video generation unless explicitly re-approved after provider and storage review

---

## 13. Recommended Delivery Order

Execute in this order:

1. Milestone 0 - Product Contract Freeze
2. Milestone 1 - Canonical Policy And Data Contract
3. Milestone 2 - Route And Auth Boundary Redesign
4. Milestone 3 - Entitlement Engine Rewrite
5. Milestone 4 - Conversation, Storage, And Usage Accounting
6. Milestone 5 - Pricing And Billing Alignment
7. Milestone 6 - AI Control Plane, Persona Prompting, And Streaming
8. Milestone 7 - Admin Control Plane
9. Milestone 8 - Product UX And Design Differentiation
10. Milestone 9 - Production Hardening And Release Control

This order is strict where risk becomes expensive to reverse.

Pricing changes before billing alignment are wrong.

Streaming before usage accounting is wrong.

Admin mutations before audit logging are wrong.

Premium feature copy before provider and storage review is wrong.

---

## 14. Immediate Next Actions

If execution starts now, the first work packet should be:

1. freeze the tier contract, premium extras, and Lite reset windows
2. verify requested OpenAI model availability and cost
3. approve the route namespace migration plan
4. approve the canonical entitlement and stop-state contract
5. define the storage budget rule for the first 100 users

Anything started before those five items is likely to create rework.

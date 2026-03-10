# Cellesseon - Delivery Completion Plan

> Purpose: one execution document for finishing the SaaS with the least avoidable rework.
>
> Audience: Project Manager, Architect, and Senior Software Agents.
>
> Rule: this plan is evidence-driven. If repository code and older docs disagree, code wins until this plan is explicitly updated.

---

## 1. Executive Position

Cellesseon is not blocked by lack of features.

It is blocked by product-rule drift, incomplete entitlement design, route/auth fragmentation, and missing operational/admin architecture.

The repository already has usable foundations:

- Next.js 16 App Router structure
- Clerk auth and proxy-based route protection
- Stripe checkout + webhook plumbing
- MongoDB persistence via Mongoose
- persona-driven prompting
- persisted conversations
- basic image/audio generation hooks

What is still not trustworthy enough to scale:

- Lite commercial rules
- plan enforcement consistency
- public anonymous usage design
- model routing by tier
- usage accounting and cost visibility
- admin control surface
- storage guardrails for chat/media growth
- deployment-safe operational controls

This plan fixes sequencing first. Feature work follows that order.

---

## 2. Verified Current State

The points below are verified from the current repository and must be treated as fact.

| Area | Verified Current State | Why It Matters |
| --- | --- | --- |
| Plan defaults | Lite still expires after 3 days in plan constants, user defaults, and OpenAI route gating | Permanent free Lite is not implemented |
| Pricing | Pro is 29 and Premium is 69 in plan constants | Requested pricing is not reflected in code |
| Public Lite | There is no anonymous chat architecture; the current OpenAI route requires auth | Public Lite cannot be shipped by changing copy |
| Auth boundaries | Protected routes are split across `/app`, `/profile`, `/plans`, and `/dashboard` | Product boundaries are harder to reason about than they should be |
| Admin | Admin is a single dashboard page with counts only | Requested admin capabilities do not exist yet |
| Entitlements | Persona/media access is partially centralized, but conversation caps and actor-type policy are not | There is no complete entitlement engine |
| Model routing | Chat, title, image, and audio models are hardcoded in separate utilities | Tier-aware model policy does not exist |
| Conversations | A Task stores the full message history in an embedded array | Document growth, analytics, and quota enforcement stay fragile |
| Usage limits | Image/audio counters exist, but request limiting is in-memory and token/cost accounting is weak | Production abuse and cost visibility are not ready |
| Billing mode | Stripe checkout is payment-mode, not recurring subscription-mode | Plan lifecycle semantics must stay explicit |
| Streaming | Streaming responses are not implemented | Chat UX target is not complete |
| CMS/admin editor | Tiptap is not installed | Admin content editing is not started |

### Verified implications

1. Do not start route cleanup as a visual refactor. It is an auth and product-boundary refactor.
2. Do not make the current authenticated OpenAI endpoint public.
3. Do not update prices or plan copy before entitlement rules and billing semantics are frozen.
4. Do not promise Premium media features until exact capabilities, moderation, storage, and cost controls are defined.
5. Do not expand AI features before usage accounting exists outside ad hoc conversation state.

---

## 3. Target Product Freeze

This section defines the intended target state. Anything marked `verification gate` must be validated before implementation starts.

### 3.1 Commercial tiers

| Tier | Access | Price | Model policy | Core limits |
| --- | --- | --- | --- | --- |
| Anonymous Lite | Public | Free | Cheapest verified OpenAI-compatible text path available at implementation time | Max 3 conversations, max 10 user prompts per conversation, max 3 total media actions, hard-stop when limit or storage budget is reached |
| Authenticated Lite | Default on sign-up | Free | Same cheapest verified text path unless cost review proves a better default is safe | Same numeric limits as Anonymous Lite, persisted to account, no time expiry |
| Pro | Paid only | 19 | `gpt-5.2-pro` if verified available and cost-approved | Higher chat/media limits, better model tier, paid-only features |
| Premium | Paid only | 39 | `gpt-5.4-pro` if verified available and cost-approved | Highest model tier plus 3 explicitly defined premium features |

### 3.2 Non-negotiable clarifications

1. `gpt-5.2-pro` and `gpt-5.4-pro` are requirements only after model availability is verified in the real OpenAI account used by this app.
2. If either requested model is unavailable, unstable, or economically wrong, the product promise must be adjusted before code changes begin.
3. Lite is free and permanent. The old 3-day trial model must be fully removed.
4. Anonymous Lite and Authenticated Lite share numeric caps, but not identity or trust boundaries.
5. Relationship-style personas may remain available for testing, but they must keep explicit anti-dependency and safety boundaries.
6. Premium must not claim video or any other advanced media feature unless provider support, moderation flow, storage lifecycle, and cost ceilings are approved.

### 3.3 Product rules that must be frozen before build

The following are still incomplete and must be frozen before implementation:

| Topic | Required decision |
| --- | --- |
| Premium extras | Name the exact 3 premium-only capabilities and define acceptance criteria for each |
| Lite storage budget | Define how Lite conversations stop when storage budget is reached and how that budget is calculated |
| Conversation retention | Define whether Lite conversations persist forever, rotate, or auto-expire |
| Paid plan lifecycle | Keep one-time purchase semantics or redesign billing semantics later; do not mix both |
| Support messaging | Standardize the exact user-facing stop messages for quota, storage, auth, and billing blocks |

---

## 4. Frozen Architecture Decisions

These decisions are recommended as the stable architecture path. Changing them later will create avoidable rework.

### 4.1 Route and namespace model

Use product semantics, not historical folder grouping.

| Area | Target namespace |
| --- | --- |
| Public marketing | `/`, `/pricing`, `/personas`, `/lite`, `/sign-in`, `/sign-up` |
| Authenticated app | `/app`, `/app/new`, `/app/c/[conversationId]`, `/app/library`, `/app/personas`, `/app/account`, `/app/billing` |
| Admin | `/admin`, `/admin/users`, `/admin/transactions`, `/admin/usage`, `/admin/settings`, `/admin/website` |

Routes to retire after migration:

- `/plans`
- `/profile`
- `/dashboard`

### 4.2 Auth boundary model

1. Public routes stay public by explicit design.
2. All signed-in product routes live under `/app(.*)`.
3. All admin routes live under `/admin(.*)`.
4. Admin authorization is role-based and enforced in both proxy and server-side data actions.
5. API route auth must remain explicit. Public Lite must have its own actor path or dedicated endpoint.

### 4.3 Entitlement model

Build one canonical server-side entitlement resolver that accepts:

- actor type: anonymous, client, admin
- plan: Lite, Pro, Premium
- persona id
- requested capability: chat, image, audio, video, upload, download, admin action
- usage context: conversation count, prompt count, media count, storage usage, billing status

The resolver must return:

- allowed or blocked
- exact reason code
- applicable model route
- quota snapshot
- upgrade requirement if relevant
- storage state if relevant

No UI component should own business rules.

### 4.4 Data model direction

Current Task documents are acceptable only as a transitional state.

Recommended model direction:

| Model | Purpose | Status |
| --- | --- | --- |
| `Task` | Conversation shell and summary metadata | Keep, but stop treating it as the full usage ledger |
| `UsageEvent` | Per-request usage, model, tokens, estimated cost, blocked reason, provider, actor scope | Recommended new model |
| `ConversationQuota` or counters on `Task` | Prompt count, media count, estimated bytes, ended reason | Required, whether embedded or separate |
| `AppSetting` | Mutable admin-controlled product configuration | Recommended new model |
| `PublicPage` | Admin-managed public pages and sort order | Recommended new model |
| `AdminAuditLog` | Admin actions: suspend, refund, settings changes, content changes | Recommended new model |

### 4.5 Admin domain boundaries

Admin is not a generic CRUD playground. It is an operational control plane.

Required admin areas:

| Area | Required capability |
| --- | --- |
| Users | Search, inspect, add/invite, suspend/reactivate, soft-remove, view plan, view usage by model, inspect conversations |
| Transactions | Inspect, annotate, refund-or-flag workflow, entitlement correction workflow |
| Usage | Per user, per model, per provider, per period analytics; drill-down views; placeholder cards allowed until real data lands |
| Settings | Manage core application settings, feature flags, plan limits, provider toggles, support copy, public Lite behavior |
| Website | Create, edit, sort, publish/unpublish public pages and rich content blocks |

Important correction:

- Transactions should not implement fake `suspend` or `decline` semantics after Stripe success. Admin actions must map to real operations such as refund, mark disputed, freeze entitlements, or annotate for support.

### 4.6 Tiptap decision

Tiptap should be the standard editor for admin rich-text fields.

Context7 confirms:

- core React/Next.js path uses `@tiptap/react`, `@tiptap/pm`, and `@tiptap/starter-kit`
- `immediatelyRender: false` is recommended for Next.js client components
- Tiptap Pro extensions are delivered through a private registry and require authentication via `TIPTAP_PRO_TOKEN`

Practical decision:

1. Baseline admin editor work should target Tiptap core first.
2. If the requested `Dev Toolkit Editor Suite` depends on Tiptap Pro or adjacent paid packages, procurement and private registry access are implementation prerequisites.
3. Do not block the whole admin milestone on premium editor extras if core editing is sufficient for v1.

---

## 5. Delivery Principles

This order is mandatory because it prevents waste:

1. Freeze product rules before touching billing, prices, or plan copy.
2. Freeze route/auth boundaries before building public Lite.
3. Build entitlements before model routing and premium differentiation.
4. Build usage accounting before streaming and admin analytics.
5. Build admin auditability before powerful admin mutations.
6. Build storage guardrails before promising heavier media features.

---

## 6. Milestone Plan

## Milestone 0 - Product Contract Freeze

**Objective**

Freeze the commercial, entitlement, and premium-capability contract so implementation stops chasing moving targets.

**Dependencies**

- None

**Blockers**

- Premium extras are still vague.
- Requested model IDs are unverified.
- Lite storage-stop logic is not defined.

**PM / Architect outputs**

1. Approve the final tier matrix.
2. Approve exact Lite limits, stop reasons, and upgrade messaging.
3. Define the 3 Premium-only capabilities by exact user-visible behavior.
4. Approve whether paid plans remain one-time purchases for this release.

**Senior implementation outputs**

1. Verify OpenAI model availability and approximate cost envelopes.
2. Produce a storage-budget proposal for Lite conversations.
3. Identify every code path currently tied to Lite expiry or old pricing.

**Risks**

- Pricing drift across UI, Stripe metadata, and backend checks
- Selling unimplemented Premium features
- Choosing model tiers that are operationally too expensive

**Success criteria**

- Lite is defined as permanent free access.
- Pro is 19 and Premium is 39 in the approved product contract.
- Premium extras are no longer vague.
- Model promises are either verified or replaced before coding starts.

**What not to do yet**

- Do not update Stripe metadata.
- Do not update plan copy globally.
- Do not start route migrations.

---

## Milestone 1 - Route And Auth Boundary Redesign

**Objective**

Make product boundaries obvious and enforceable.

**Dependencies**

- Milestone 0

**Blockers**

- Final route map must be approved.

**PM / Architect outputs**

1. Approve the namespace map for public, app, and admin.
2. Freeze redirect behavior for legacy routes.
3. Define where public Lite lives and how it differs from `/app`.

**Senior implementation outputs**

1. Move account semantics under `/app`.
2. Move admin semantics under `/admin`.
3. Simplify proxy protection rules.
4. Update internal navigation and CTA targets.
5. Add tests for protected and admin-only route behavior.

**Risks**

- redirect loops
- broken deep links
- hidden unprotected routes
- auth assumptions leaking into public Lite

**Success criteria**

- Public routes are public by design.
- Signed-in routes are fully under `/app`.
- Admin routes are fully under `/admin`.
- Legacy route compatibility is explicit and temporary.

**What not to do yet**

- Do not redesign the entire UI during the route move.
- Do not broaden existing API auth exceptions.

---

## Milestone 2 - Entitlement Engine Rewrite

**Objective**

Create one source of truth for plans, capabilities, limits, and block reasons.

**Dependencies**

- Milestone 0
- Milestone 1

**Blockers**

- Current logic only partially covers persona/media access.

**PM / Architect outputs**

1. Approve the canonical entitlement contract.
2. Approve all user-visible blocked-state messages.
3. Approve plan-specific persona access rules.

**Senior implementation outputs**

1. Replace Lite expiry logic across model defaults, route gating, and billing state.
2. Centralize conversation count, prompt count, media count, and storage checks.
3. Resolve model policy through the entitlement layer.
4. Return exact blocked reason codes for UI and admin analytics.

**Risks**

- plan text diverges from backend behavior again
- upgrade prompts trigger at the wrong time
- anonymous abuse policy stays inconsistent

**Success criteria**

- Every capability check goes through one policy layer.
- Lite no longer expires by date.
- UI does not hardcode business limits.
- Admin can explain why any request was blocked.

**What not to do yet**

- Do not bolt new rules directly into components.
- Do not start streaming work before this is stable.

---

## Milestone 3 - Conversation, Storage, And Usage Accounting

**Objective**

Make quota enforcement, storage safety, and cost analytics durable.

**Dependencies**

- Milestone 2

**Blockers**

- Task documents still embed full message histories.
- There is no real usage ledger.

**PM / Architect outputs**

1. Approve the Lite storage budget rule.
2. Approve retention policy for anonymous and authenticated Lite conversations.
3. Approve what gets surfaced in user-facing quota messages.

**Senior implementation outputs**

1. Add explicit per-conversation counters: prompt count, media count, estimated bytes, ended reason.
2. Introduce `UsageEvent` or equivalent usage ledger.
3. Track model, provider, token counts, latency, estimated cost, and blocked reasons.
4. Define a safe migration path from current Task-only storage.
5. Add index strategy for usage queries and admin reporting.

**Risks**

- MongoDB document growth
- inability to explain model cost per user
- quota checks that depend on parsing message arrays
- storage limits reached silently

**Success criteria**

- The system can enforce `3 conversations max` and `10 user prompts max` server-side.
- Conversation stop reasons are persisted.
- Storage budget breaches are detected before document failure.
- Usage can be reported per user, per model, per provider, and per period.

**What not to do yet**

- Do not over-engineer multi-tenant analytics.
- Do not move to a new database technology.

---

## Milestone 4 - Public Lite Release Path

**Objective**

Ship anonymous Lite without weakening authenticated chat or blowing cost controls.

**Dependencies**

- Milestone 1
- Milestone 2
- Milestone 3

**Blockers**

- No anonymous actor path exists today.

**PM / Architect outputs**

1. Approve public Lite funnel behavior.
2. Approve anonymous identity scope: cookie, signed session token, or equivalent bounded mechanism.
3. Approve end-of-conversation and upgrade/signup messaging.

**Senior implementation outputs**

1. Build `/lite` as a dedicated public route.
2. Add anonymous request handling isolated from authenticated app behavior.
3. Enforce server-side conversation/prompt/media/storage caps for anonymous actors.
4. Prevent anonymous history from leaking into the authenticated library.
5. Add abuse controls stronger than the current in-memory-only limiter.

**Risks**

- anonymous abuse and cost leakage
- confusion between public demo and real signed-in usage
- inconsistent stop behavior between anonymous and authenticated Lite

**Success criteria**

- Anonymous users can use Lite without auth.
- They cannot exceed 3 conversations or 10 prompts per conversation.
- The conversation ends clearly and predictably at limits.
- Public Lite remains operationally isolated from the signed-in app.

**What not to do yet**

- Do not reuse authenticated history UX for anonymous traffic.
- Do not claim persistence for anonymous conversations.

---

## Milestone 5 - Signed-In Lite, Pricing, And Billing Alignment

**Objective**

Align account defaults, pricing, and Stripe state with the approved commercial model.

**Dependencies**

- Milestone 0
- Milestone 2

**Blockers**

- Old trial semantics are still embedded in code.

**PM / Architect outputs**

1. Approve final plan copy after backend rules are stable.
2. Approve whether yearly billing remains exposed in this release.
3. Approve billing history semantics for permanent Lite users.

**Senior implementation outputs**

1. Make new accounts default to permanent Lite.
2. Remove old trial copy and logic everywhere.
3. Update Stripe checkout mapping, webhook updates, and user plan persistence.
4. Verify plan status rendering across app, profile/account, and pricing surfaces.
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
- Do not leave trial-language remnants in support or UI copy.

---

## Milestone 6 - AI Control Plane, Persona Prompting, And Streaming

**Objective**

Move from hardcoded model calls to tier-aware, persona-aware AI orchestration with streaming.

**Dependencies**

- Milestone 2
- Milestone 3
- Milestone 5

**Blockers**

- Model routing and prompt strategy are currently scattered.

**PM / Architect outputs**

1. Approve model routing by tier and feature type.
2. Approve prompt versioning strategy per persona and model family.
3. Approve when streaming is turned on and how partial failures surface.

**Senior implementation outputs**

1. Create a central model registry by plan and capability.
2. Version persona prompts by persona x model family.
3. Improve system prompts for each persona and each allowed model tier.
4. Add streaming responses for chat in authenticated app first, then Lite if safe.
5. Capture latency, token usage, and cost metrics per streamed request.

**Risks**

- model promises not matching runtime behavior
- higher latency or cost from wrong tier routing
- streaming creating state inconsistencies on failed responses

**Success criteria**

- Model selection is policy-driven.
- Persona prompting is versioned and maintainable.
- Streaming works without breaking quota enforcement or history persistence.

**What not to do yet**

- Do not add a second AI provider.
- Do not add new persona families until the current set is stable.

---

## Milestone 7 - Admin Control Plane

**Objective**

Build a real admin surface for operations, support, and release control.

**Dependencies**

- Milestone 1
- Milestone 2
- Milestone 3
- Milestone 5

**Blockers**

- No admin models exist for settings, website content, or audit logs.

**PM / Architect outputs**

1. Approve admin information architecture.
2. Approve which admin actions are destructive, reversible, or soft-only.
3. Approve placeholder rules for usage dashboards where data is not yet complete.

**Senior implementation outputs**

1. Build `/admin` overview with real operational summaries.
2. Build `/admin/users` and `/admin/users/[userId]` with support-safe actions.
3. Build `/admin/transactions` and `/admin/transactions/[transactionId]` with refund/flag/audit workflows.
4. Build `/admin/usage` with drill-downs for user, model, provider, and time windows.
5. Build `/admin/settings` backed by durable settings storage.
6. Build `/admin/website` backed by a public page model and Tiptap editor.
7. Record admin actions in audit logs.

**Risks**

- powerful admin actions without auditability
- user deletion creating billing/data integrity problems
- fake transaction controls disconnected from Stripe reality

**Success criteria**

- Admin can inspect users, entitlements, usage, and financial records.
- Admin actions are auditable.
- Website/public content can be managed without code edits.
- Rich-text editing works through Tiptap for admin content fields.

**What not to do yet**

- Do not implement hard delete for financially relevant users by default.
- Do not expose raw internal settings without validation and role checks.

---

## Milestone 8 - Product UX And Public Experience Polish

**Objective**

Deliver a persona-first chat product that does not feel like another generic chatbot shell.

**Dependencies**

- Milestone 1 through Milestone 7

**Blockers**

- Product behavior must be stable first.

**PM / Architect outputs**

1. Approve the interaction thesis for what makes Cellesseon distinct.
2. Approve where plan limits and upgrade prompts appear in the UX.
3. Approve which public pages are editable through admin versus fixed in code.

**Senior implementation outputs**

1. Make persona selection a first-class part of the journey.
2. Improve chat affordances around streaming, limits, blocked states, and new conversation creation.
3. Make Lite versus paid affordances obvious without turning the interface into billing noise.
4. Refine public page structure and content architecture.
5. Improve responsive behavior and information hierarchy.

**Risks**

- visual redesign before product behavior stabilizes
- novelty hurting usability
- inconsistent UX between public Lite and signed-in app

**Success criteria**

- The chat experience feels persona-led, not prompt-box generic.
- Limit states and upgrade paths are clear.
- Public and private experiences feel connected but correctly separated.

**What not to do yet**

- Do not redesign everything before the underlying flows are stable.
- Do not hide entitlement state from users.

---

## Milestone 9 - Production Hardening And Release Control

**Objective**

Make the app safe to operate in production.

**Dependencies**

- Milestone 2 through Milestone 8

**Blockers**

- Rate limiting is still in-memory.
- Operational visibility is incomplete.

**PM / Architect outputs**

1. Approve release gates and rollback conditions.
2. Approve the minimum observability bar for launch.
3. Approve abuse response process for Lite and admin response process for billing issues.

**Senior implementation outputs**

1. Replace in-memory-only abuse controls with shared infrastructure.
2. Add structured logs and failure monitoring for OpenAI, Stripe, Clerk, upload, and download paths.
3. Add operational dashboards or at least queryable metrics sources.
4. Expand automated coverage for public Lite, plan enforcement, route auth, admin actions, and webhook flows.
5. Run the full repository validation workflow before release.

**Risks**

- anonymous abuse
- silent billing failures
- rising AI cost without attribution
- admin actions with no audit trail

**Success criteria**

- The team can answer who used what, under which plan, with which model, at what cost estimate, and why a request failed or was blocked.
- Shared abuse controls protect public Lite.
- Full quality gate passes before release.

**What not to do yet**

- Do not launch public Lite on top of in-memory-only protections.
- Do not add more feature surface before observability exists.

---

## 7. Admin Information Architecture

This is the recommended route map for admin delivery.

| Route | Purpose |
| --- | --- |
| `/admin` | Overview: users, conversations, transactions, provider status, recent failures |
| `/admin/users` | Searchable user list |
| `/admin/users/[userId]` | User detail, plan, usage, conversations, account status actions |
| `/admin/transactions` | Transaction list |
| `/admin/transactions/[transactionId]` | Transaction detail, audit notes, refund/flag workflow |
| `/admin/usage` | Aggregate reporting and filters |
| `/admin/usage/users/[userId]` | User usage drill-down |
| `/admin/usage/models/[modelKey]` | Model usage and cost drill-down |
| `/admin/settings` | Product settings, flags, limits, provider config toggles |
| `/admin/website` | Public pages/content list |
| `/admin/website/[pageId]` | Page editor with Tiptap |

### Admin action rules

| Action | Required rule |
| --- | --- |
| Add user | Use Clerk-compatible create/invite path; do not bypass identity source of truth |
| Suspend user | Soft action only; preserve financial and audit records |
| Remove user | Default to soft-delete/deactivate; hard delete only via controlled process |
| Change plan | Audit log required; reason required |
| Refund transaction | Must reconcile Stripe state and entitlement state |
| Edit public page | Version or revision trail required |
| Change app settings | Validation + audit log required |

---

## 8. Data And Storage Guardrails

The request requires conversations to stop not only on plan limits, but also when MongoDB usage/storage limits are reached.

This must be implemented as explicit policy, not as accidental database failure.

### Required guardrails

1. Add an estimated byte counter per conversation.
2. Add a platform-level storage budget rule for Lite.
3. End a conversation when either business caps or storage caps are reached.
4. Persist an `endedReason` value so support and admin can explain the stop.
5. Prefer storing generated media as references rather than expanding embedded task payloads.

### Required calculation work before implementation

The team must define:

- actual MongoDB deployment/storage tier
- acceptable storage budget reserved for the first 100 Lite users
- expected average text message size
- expected media metadata size per conversation
- whether anonymous Lite conversation data is retained or aggressively expired

Until those numbers exist, any storage-limit implementation is guesswork.

---

## 9. Testing And Readiness Gates

No milestone is complete until the related gate passes.

### Gate A - Contract Gate

- tier matrix approved
- model availability verified or corrected
- Premium extras frozen
- stop messages approved

### Gate B - Boundary Gate

- route map migrated
- proxy rules simplified
- auth tests cover public, signed-in, and admin boundaries

### Gate C - Entitlement Gate

- one canonical policy layer in use
- Lite no-expiry behavior verified
- blocked reasons surfaced consistently

### Gate D - Usage Gate

- prompt, conversation, media, and storage caps enforced server-side
- usage ledger queryable for admin needs

### Gate E - Billing Gate

- new user defaults verified
- Pro/Premium prices corrected everywhere
- webhook and checkout behavior tested end-to-end

### Gate F - Admin Gate

- audit logs for privileged actions
- user and transaction detail flows operational
- usage and settings pages usable even if some cards are placeholder-backed
- Tiptap admin editing working on required fields

### Gate G - Release Gate

- Prettier
- ESLint
- TypeScript no-emit
- unit tests
- e2e tests
- production build
- rollback plan for launch issues

---

## 10. Risk Register

| Risk | Severity | Why It Matters | Mitigation |
| --- | --- | --- | --- |
| Model mismatch | High | Product promises fail at runtime | Verify real model IDs before code changes |
| Public Lite abuse | High | Anonymous traffic can burn cost quickly | Isolated Lite path, shared abuse controls, strict quotas |
| Plan drift | High | UI, billing, and backend diverge | Canonical entitlement layer |
| Conversation growth | High | Task documents become fragile | Add counters, storage budget, media references, usage ledger |
| Premium overpromise | High | Billing disputes and trust damage | Freeze exact Premium extras before copy changes |
| Admin overreach | High | Destructive actions without auditability | Soft actions first, audit logs, validation |
| Transaction semantics confusion | Medium | Fake controls mislead operations | Map admin actions to real Stripe-compatible workflows |
| Route confusion | Medium | User flows and auth rules stay brittle | Normalize public/app/admin namespaces |
| Streaming regressions | Medium | Broken persistence and quota handling | Ship after entitlement and usage accounting are stable |

---

## 11. What To Defer Safely

These items are not required to finish the requested product shape for the next serious release:

1. multi-provider LLM routing
2. team/workspace features
3. advanced collaboration in Tiptap
4. automatic recurring subscription redesign
5. dynamic user-created personas
6. advanced BI/reporting beyond operational usage views

---

## 12. Recommended Delivery Order

Execute in this order:

1. Milestone 0 - Product Contract Freeze
2. Milestone 1 - Route And Auth Boundary Redesign
3. Milestone 2 - Entitlement Engine Rewrite
4. Milestone 3 - Conversation, Storage, And Usage Accounting
5. Milestone 4 - Public Lite Release Path
6. Milestone 5 - Signed-In Lite, Pricing, And Billing Alignment
7. Milestone 6 - AI Control Plane, Persona Prompting, And Streaming
8. Milestone 7 - Admin Control Plane
9. Milestone 8 - Product UX And Public Experience Polish
10. Milestone 9 - Production Hardening And Release Control

This order is strict where risk becomes expensive to reverse.

Public Lite before entitlements is wrong.

Pricing changes before billing alignment are wrong.

Streaming before usage accounting is wrong.

Admin mutations before audit logging are wrong.

---

## 13. Immediate Next Actions

If the team starts execution now, the first work packet should be:

1. freeze the tier contract and Premium extras
2. verify requested OpenAI model availability and cost
3. approve the route namespace migration plan
4. define the canonical entitlement contract
5. define the Lite storage budget rule for the first 100 users

Anything else started before those five items is likely to create rework.

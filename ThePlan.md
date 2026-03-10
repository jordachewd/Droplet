# Cellesseon — Completion Plan

> Purpose: replace drifted planning with one execution document based on the current repository state and the requested target product.
>
> Constraint: this plan is sequencing guidance, not marketing copy. If a capability is not verified, it is treated as unconfirmed.

---

## 1. Verified Current State

This is what is true in the codebase now and must be treated as the starting point:

| Area            | Verified State                                                                                       | Why It Matters                                                        |
| --------------- | ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Lite plan       | Lite still expires after 3 days in plan logic and user defaults                                      | The requested permanent free Lite plan is not implemented yet         |
| Pricing         | Pro is 29 and Premium is 69 in plan constants                                                        | Requested commercial model is not reflected in code                   |
| Public Lite     | Public AI chat does not exist yet; the OpenAI route requires auth                                    | Anonymous trial usage cannot be shipped by tweaking copy alone        |
| Models          | Chat, title, image, and audio models are hardcoded globally                                          | There is no plan-aware model routing policy yet                       |
| Personas        | Persona catalog exists and is wired into prompting                                                   | Persona product direction is partially in place                       |
| Conversations   | Conversations are stored in one Task document with embedded messages                                 | Limits, history growth, analytics, and asset lifecycle remain fragile |
| Rate limiting   | Request limiting is in-memory                                                                        | It is not durable across instances or restarts                        |
| Route structure | Public and app routes are split by groups, but account and admin remain separate top-level semantics | Route cleanup is still needed to make product boundaries obvious      |
| Admin           | Dashboard is a minimal stats page                                                                    | There is no real operational surface yet                              |
| Demo flows      | Demo conversations exist only as placeholders inside authenticated app surfaces                      | This is not the same as a public Lite product                         |

### Immediate consequences

1. Do not treat current docs as authoritative over the code.
2. Do not start UI cleanup before commercial rules and access boundaries are frozen.
3. Do not make the existing authenticated OpenAI route public. Anonymous Lite must be isolated behind stricter policy.
4. Do not sell Premium media promises before exact capabilities, cost limits, moderation, and storage flows are defined.

---

## 2. Target Product Freeze

These are the product rules that should be treated as the target state for implementation planning.

### 2.1 Commercial model

| Tier                | Access             | Price | Model Policy                                                                         | Core Limits                                                                                                                       |
| ------------------- | ------------------ | ----- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| Anonymous Lite Demo | Public             | Free  | Cheapest verified OpenAI text model available at implementation time                 | Max 3 demo conversations, max 10 user prompts per conversation, max 3 media actions total, hard stop with upgrade/sign-up message |
| Authenticated Lite  | Default on sign-up | Free  | Same cheapest verified text model as public Lite unless cost review proves otherwise | Same numeric limits as Lite Demo, persisted to account, no 3-day expiry                                                           |
| Pro                 | Paid only          | 19    | `gpt-5-mini` if verified available in the account used by this app                   | Higher limits, paid-only access, stronger file/chat experience                                                                    |
| Premium             | Paid only          | 39    | `gpt-5.2-pro` only if verified available and economically acceptable                 | Best model tier plus exact Premium extras frozen before checkout and copy changes                                                 |

### 2.2 Non-negotiable clarifications

1. Model IDs must be verified in the actual OpenAI account before implementation starts. If `gpt-5-mini` or `gpt-5.2-pro` are unavailable, the commercial promise must be adjusted before code is changed.
2. Anonymous Lite and authenticated Lite should share the same numeric limits, but not the same trust model. Anonymous Lite should be browser or device scoped and treated as disposable. Authenticated Lite should be account scoped and persisted.
3. All personas can be exposed in Lite for testing only if relationship-style personas keep explicit dependency-avoidance and safety boundaries.
4. Premium must not claim video generation until provider support, cost ceilings, moderation, storage, and UX handling are approved.

### 2.3 Recommended final route map

Use product semantics, not implementation history.

| Route Group       | Target Routes                                                                                                  | Notes                                              |
| ----------------- | -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| Public            | `/`, `/pricing`, `/personas`, `/lite`, `/sign-in`, `/sign-up`                                                  | `/lite` becomes the explicit public demo surface   |
| Authenticated App | `/app`, `/app/new`, `/app/c/[conversationId]`, `/app/library`, `/app/personas`, `/app/account`, `/app/billing` | Collapse current account semantics into app space  |
| Admin             | `/admin`                                                                                                       | Prefer one clear admin namespace over `/dashboard` |

Routes to retire after migration:

- `/plans`
- `/profile`
- `/dashboard`

---

## 3. Planning Principles

This sequence is mandatory because it protects the team from rework:

1. Freeze plan rules before billing or pricing updates.
2. Freeze route and auth boundaries before building public Lite.
3. Freeze entitlement and usage accounting before model expansion.
4. Freeze Premium feature claims before changing copy or checkout metadata.
5. Harden the data model before adding heavier media features.

---

## 4. Milestone Plan

## Milestone 0 — Product And Commerce Freeze

**Objective**

Lock the exact rules for Lite, Pro, and Premium so implementation stops chasing moving targets.

**Assumptions**

- Stripe remains the billing provider.
- OpenAI remains the only AI provider for the current delivery plan.
- Lite must remain free with no expiry.

**Blockers**

- Premium extras are not frozen.
- Target model IDs are not verified.
- Public Lite trust model is not written down.

**Dependencies**

- None.

**Risks**

- Pricing and entitlement drift across UI, webhook metadata, user defaults, and enforcement.
- Selling Premium features that do not exist.
- Shipping the wrong model-cost structure.

**Recommended order**

1. Freeze the final tier matrix.
2. Verify model availability and approximate cost envelopes.
3. Freeze the three Premium extras by exact user-facing behavior.
4. Define anonymous Lite versus authenticated Lite scope.
5. Define hard stop messaging for all limit exhaustion cases.

**Success criteria**

- One canonical entitlement matrix exists for all tiers.
- Lite has no time-based expiry in the approved product rules.
- Pro and Premium prices are locked at 19 and 39.
- Premium feature claims are implementation-ready, not aspirational.

**What not to do yet**

- Do not update Stripe product metadata.
- Do not update pricing copy everywhere.
- Do not start public Lite coding.

---

## Milestone 1 — Access And Route Boundary Redesign

**Objective**

Make route intent obvious and make auth coverage explicit.

**Assumptions**

- Marketing and product should not share the same route semantics.
- Private areas should sit under one protected namespace.

**Blockers**

- Final route map not approved.

**Dependencies**

- Milestone 0.

**Risks**

- Broken navigation and redirect loops.
- Partial auth protection after route moves.
- Confusion between public Lite and authenticated app flows.

**Recommended order**

1. Approve the target route map.
2. Move account routes under `/app` semantics.
3. Move admin to `/admin` semantics.
4. Update proxy rules so protected coverage is simple: `/app(.*)` and `/admin(.*)`.
5. Replace public CTAs that currently point to protected routes without context.

**Success criteria**

- Public routes are public by design.
- Authenticated routes are protected by one obvious rule set.
- No user-facing navigation depends on legacy route names.

**What not to do yet**

- Do not refactor every page component during the route move.
- Do not widen auth exemptions on existing API routes.

---

## Milestone 2 — Entitlement Engine Rewrite

**Objective**

Create one source of truth for plan access, limits, persona eligibility, and model policy.

**Assumptions**

- Entitlements should be resolved server-side.
- Anonymous Lite and authenticated Lite need different identity scopes but the same numeric cap policy.

**Blockers**

- No canonical matrix currently enforced beyond partial persona and media rules.

**Dependencies**

- Milestone 0.

**Risks**

- Plan text and backend behavior diverge again.
- Upgrade flow appears to work while enforcement stays wrong.
- Abuse control remains weak for anonymous users.

**Recommended order**

1. Define a formal entitlement object for actor type, plan, personas, models, message caps, conversation caps, media caps, and persistence rights.
2. Split anonymous Lite resolution from authenticated account resolution.
3. Remove time-based Lite expiration logic from defaults and checks.
4. Ensure every chat and media operation reads the same entitlement resolver.
5. Define upgrade prompts and blocked-state payloads centrally.

**Success criteria**

- Every product limit is resolved in one server-side policy layer.
- Lite no longer expires by date.
- Persona access, model access, and quota checks are all centralized.

**What not to do yet**

- Do not change checkout logic until entitlements are final.
- Do not hardcode limits in UI components.

---

## Milestone 3 — Conversation And Usage Data Correction

**Objective**

Make conversation persistence, quota tracking, and analytics durable enough for a real SaaS.

**Assumptions**

- The current Task document can remain transitional, but it should not be the long-term product boundary.

**Blockers**

- Message growth and media storage are still embedded in conversation documents.

**Dependencies**

- Milestone 2.

**Risks**

- Anonymous and Lite quotas become hard to enforce cleanly.
- Large conversations and media inflate document size.
- Cost and abuse analysis remain weak.

**Recommended order**

1. Define the transitional or final conversation schema strategy.
2. Add explicit counters for user prompts per conversation, conversations created per period, and media actions.
3. Separate usage accounting from UI history retrieval.
4. Plan how anonymous Lite sessions are tracked: cookie-backed session key, signed token, or similar bounded mechanism.
5. Define retention rules for anonymous Lite conversations versus account conversations.

**Success criteria**

- The system can enforce `3 conversations max` and `10 user prompts per conversation` without UI-only checks.
- Usage is attributable to either anonymous session or authenticated user.
- History and quota tracking no longer depend on parsing message arrays ad hoc.

**What not to do yet**

- Do not redesign the entire database if a staged migration is faster and safe.
- Do not add advanced analytics before usage accounting is trustworthy.

---

## Milestone 4 — Public Lite Architecture

**Objective**

Ship a real public Lite experience without weakening the authenticated app.

**Assumptions**

- Anonymous usage is intentionally limited and disposable.
- Public Lite should act as a funnel, not as an unbounded free product.

**Blockers**

- No anonymous chat endpoint exists.
- Current main CTA sends users into a protected area.

**Dependencies**

- Milestones 1, 2, and 3.

**Risks**

- Abuse if the authenticated AI endpoint is simply made public.
- Confusing overlap between demo conversations and real account conversations.
- Cost leakage from anonymous traffic.

**Recommended order**

1. Create a dedicated public Lite chat path, preferably `/lite`.
2. Implement a dedicated Lite request boundary: separate endpoint or explicit actor branch with stricter rate and quota policy.
3. Enforce the public Lite caps server-side.
4. Provide clear limit-reached responses that end the conversation and route users toward sign-up or upgrade.
5. Make all personas selectable in Lite only within the frozen safety boundaries.

**Success criteria**

- Anonymous users can start and use Lite without auth.
- Anonymous users cannot exceed 3 demo conversations.
- No conversation accepts more than 10 user prompts.
- Limit exhaustion is communicated clearly and the conversation stops.

**What not to do yet**

- Do not reuse authenticated history UI for anonymous Lite.
- Do not promise persistence for public Lite conversations.

---

## Milestone 5 — Signed-In Lite And Billing Alignment

**Objective**

Make newly created accounts land on permanent Lite with the same core caps and a clean upgrade path.

**Assumptions**

- New users should not receive expiring trial logic.
- Paid plans remain the only route to Pro and Premium.

**Blockers**

- User defaults and webhook logic still reflect the old commercial model.

**Dependencies**

- Milestones 0 and 2.

**Risks**

- Users receive the wrong plan on creation.
- Upgrade state does not match Stripe checkout metadata.
- Old 3-day assumptions remain in hidden UI or validation paths.

**Recommended order**

1. Change account creation defaults to permanent Lite.
2. Remove all date-expiration checks that only exist for Lite trial logic.
3. Update checkout metadata, price mapping, plan descriptions, and renewal/reset behavior for Pro and Premium.
4. Ensure upgrade, downgrade, and billing history semantics still make sense after Lite stops expiring.
5. Sweep all UI copy and FAQs only after backend rules are correct.

**Success criteria**

- Every new account starts on Lite with no 3-day expiry.
- Pro and Premium are paid-only and priced at 19 and 39.
- Billing webhooks and user plan state match the new commercial rules.

**What not to do yet**

- Do not change marketing text first.
- Do not keep “trial” language anywhere once defaults change.

---

## Milestone 6 — AI Control Plane And Model Routing

**Objective**

Replace hardcoded global model choices with plan-aware routing, cost control, and explicit capability checks.

**Assumptions**

- Pro and Premium need distinct model policy.
- Lite must remain cost-governed.

**Blockers**

- Current chat, title, image, and audio model selection is global.

**Dependencies**

- Milestones 0, 2, and 5.

**Risks**

- Cost spikes from wrong routing.
- Model promises cannot be trusted.
- Premium becomes an expensive label without differentiated behavior.

**Recommended order**

1. Define model routing policy by actor type and plan.
2. Verify exact OpenAI model IDs before coding.
3. Route Lite to the cheapest verified text path.
4. Route Pro to `gpt-5-mini` if verified.
5. Route Premium to `gpt-5.2-pro` only if verified and affordable.
6. Apply the same policy to title generation, media generation, and any tool calls where needed.
7. Add per-request cost and usage logging before broad rollout.

**Success criteria**

- Model selection is policy-driven, not scattered constants.
- Lite, Pro, and Premium behavior differs exactly as defined.
- Cost visibility exists before traffic scale increases.

**What not to do yet**

- Do not add a second AI provider.
- Do not add streaming before routing and cost accounting are correct.

---

## Milestone 7 — Premium Feature Definition And Media Pipeline

**Objective**

Turn Premium extras into real, enforceable features instead of vague plan bullets.

**Assumptions**

- Premium should include three exact extras.

**Blockers**

- “Quality media generation” is not specific enough to ship.
- Video is not currently implemented.

**Dependencies**

- Milestones 0, 2, 3, and 6.

**Risks**

- Premium description overpromises.
- Media storage and moderation costs are underestimated.
- UX becomes inconsistent across text, image, audio, and future video outputs.

**Recommended order**

1. Freeze the three Premium extras by exact acceptance criteria.
2. Define allowed media types, size limits, quality settings, and monthly caps.
3. Define storage lifecycle and cleanup rules for generated assets.
4. Add moderation and abuse protections for richer media capabilities.
5. Update plan descriptions only when each Premium extra has an approved implementation path.

**Success criteria**

- Premium extras are named, scoped, and enforceable.
- No media capability exists without cost and retention rules.
- Premium copy maps to actual backend capability.

**What not to do yet**

- Do not promise video generation if it is still undefined.
- Do not mark features “unlimited” without explicit cost approval.

---

## Milestone 8 — Distinctive Product UX

**Objective**

Deliver a chat product that looks and behaves differently from standard chatbot clones without harming usability.

**Assumptions**

- Persona identity should be a first-class UI concept.
- The interface should still remain legible, fast, and practical.

**Blockers**

- Final route structure and product rules must be stable first.

**Dependencies**

- Milestones 1 through 7.

**Risks**

- Visual novelty without product value.
- Rework if UI is built before Lite and paid behaviors are stable.
- Accessibility regressions from overly experimental layout choices.

**Recommended order**

1. Define the interaction thesis: what makes Cellesseon feel different.
2. Make persona selection the entry point, not a secondary control.
3. Differentiate chat by adding a side result canvas, persona context panel, or mode-specific workspace where useful.
4. Surface remaining limits, current plan, and upgrade prompts inside the experience without turning the UI into billing noise.
5. Only then execute the visual redesign system-wide.

**Success criteria**

- The chat experience is recognizably not a generic left-sidebar chatbot clone.
- Persona identity changes both presentation and workflow, not only the prompt.
- Limit states and upgrade paths are visible without being intrusive.

**What not to do yet**

- Do not redesign everything before the information architecture is final.
- Do not chase novelty that makes typing, reading, or history management worse.

---

## Milestone 9 — Operational Hardening And Release Gate

**Objective**

Make the product safe to launch and support.

**Assumptions**

- Launch quality depends more on correctness and visibility than on feature count.

**Blockers**

- Persistent rate limiting, cost visibility, anonymous abuse controls, and operational dashboards are still incomplete.

**Dependencies**

- Milestones 2 through 8.

**Risks**

- Anonymous abuse.
- Silent billing or webhook failures.
- High AI cost without traceability.
- Support load from unclear plan behavior.

**Recommended order**

1. Replace in-memory rate limiting with shared infrastructure.
2. Add structured request and usage logging.
3. Add visibility for quota exhaustion, webhook failures, and model cost spikes.
4. Add explicit tests for anonymous Lite, signed-in Lite defaults, paid upgrade paths, and auth boundaries.
5. Run the full validation gate before release.

**Success criteria**

- The team can answer who used what, under which plan, and why it was blocked or failed.
- Anonymous Lite abuse is rate-limited and observable.
- Full validation passes: formatting, lint, type-check, unit tests, e2e tests, and production build.

**What not to do yet**

- Do not launch public Lite on top of in-memory-only abuse control.
- Do not add more personas before the first public release is stable.

---

## 5. Risk Register

| Risk                         | Severity | Why It Is Dangerous                                         | Mitigation                                                    |
| ---------------------------- | -------- | ----------------------------------------------------------- | ------------------------------------------------------------- |
| Model availability mismatch  | High     | Pricing and plan promises fail at runtime                   | Verify exact model IDs before implementation                  |
| Public Lite abuse            | High     | Anonymous traffic can burn cost fast                        | Separate Lite boundary, shared rate limit, hard quotas        |
| Plan drift across code paths | High     | Users receive wrong access or pricing                       | Central entitlement resolver and plan mapping                 |
| Embedded message growth      | High     | Conversation documents will bloat over time                 | Add usage counters and staged data correction                 |
| Premium overpromise          | High     | Trust and billing disputes                                  | Freeze exact extras before copy and checkout updates          |
| Route confusion              | Medium   | Users and developers both hit wrong surfaces                | Normalize around public, app, and admin namespaces            |
| Relationship-persona safety  | Medium   | Companion personas can create trust and moderation problems | Keep explicit dependency-avoidance guardrails and review copy |

---

## 6. What To Defer Safely

These are not completion blockers for the requested product shape:

1. Multi-provider LLM routing.
2. Team or workspace features.
3. Streaming responses, if cost control and limits are not ready yet.
4. Rich admin CRUD beyond operational stats and failure visibility.
5. Advanced analytics beyond what is needed for entitlements, abuse control, and billing support.

---

## 7. Recommended Delivery Order

If the goal is to finish the SaaS with the least avoidable rework, the order should be:

1. Milestone 0 — Product And Commerce Freeze
2. Milestone 1 — Access And Route Boundary Redesign
3. Milestone 2 — Entitlement Engine Rewrite
4. Milestone 3 — Conversation And Usage Data Correction
5. Milestone 4 — Public Lite Architecture
6. Milestone 5 — Signed-In Lite And Billing Alignment
7. Milestone 6 — AI Control Plane And Model Routing
8. Milestone 7 — Premium Feature Definition And Media Pipeline
9. Milestone 8 — Distinctive Product UX
10. Milestone 9 — Operational Hardening And Release Gate

This order is strict where risk is irreversible. Billing, routing, and public Lite should not move ahead of entitlement and access design.

---

## 8. Bottom Line

Cellesseon is not blocked by lack of features. It is blocked by policy drift, unclear access boundaries, and incomplete entitlement architecture.

The app already has usable persona foundations, a functioning chat stack, auth, billing primitives, and conversation history scaffolding. What it does not have yet is a trustworthy product contract across public Lite, signed-in Lite, Pro, Premium, routes, models, and media claims.

Finish that contract first. Everything else becomes cheaper after that.

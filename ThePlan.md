# Droplet — Completion Plan

> Purpose: one execution document for finishing the SaaS without avoidable rework.
> Audience: Project Manager, Architect, and Senior Software Agents.
> Rule: this plan is based on verified repository state. If older docs disagree with code, code wins until this file is updated.
> Last verified: Architect deep audit #82, 2026-04-01. Post Phase 173-177 deployment.

---

## 1. Executive Judgment

Droplet is deployed to production with all 25 milestones complete. The TDD testing rebuild is done (101 suites, 601 tests, 8 E2E specs, 85/80/85/85 coverage). WCAG 2.2 AA is complete. Admin configurability (promo text, FAQ, landing, stop reasons, persona content) is done. Global error boundary is done. Brand rename (`cellesseon` → `droplet`) is complete.

**The app is blocked by two CRITICAL production bugs reported by owner:**

1. **🔴 CRITICAL — Stream error on media generation.** When users request media generation (image, audio, video), the error "The response stream ended unexpectedly" is triggered. Same error occurs intermittently with large text responses. **Root cause identified by Architect audit #82:** the proactive timeout (55s) is measured from STREAM START, not FUNCTION START. Setup time (auth, DB queries, title generation) consumes 10-20s before the stream begins, so the proactive timeout is scheduled to fire at 65-75s from function start — AFTER Vercel kills the function at 60s (`maxDuration`). The stream is hard-terminated without any error/final event reaching the client.

2. **🔴 CRITICAL — Stripe payment transaction not registered.** Stripe charges the card, the webhook returns 200 OK (confirmed by owner), but NO transaction is created in MongoDB and the user's plan is NOT updated. **Architect audit #82 determined the webhook code is structurally correct** — all paths that return 200 for `checkout.session.completed` DO create a transaction and update the user plan. The issue is most likely OPERATIONAL: (a) `checkout.session.completed` event not enabled in Stripe webhook endpoint; (b) owner observing 200 for a different event type (e.g., `charge.succeeded`) that returns 200 "Unhandled event"; (c) webhook signing secret mismatch; or (d) webhook endpoint URL not pointing to current deployment. Requires Stripe dashboard verification and Vercel function log inspection.

3. **HIGH — Admin configurability incomplete.** ~20-30 hardcoded display strings remain across homepage/chat/profile components (CTA banner, persona spotlight, chat intro, plans section, etc.). Phase 180 not started.

**Phases completed since last plan update:**
Phases 173 (debug text removal), 174 (theme-init.js deletion), 175 (dead prop removal), 176 (download route 206 fix), 177 (constant deduplication) — ALL COMPLETED by Engineer. Phase 178 (fake download icon) NOT completed. DONE.md not updated for any of these.

---

## 2. Completed Work Summary

> **Milestones 0–25 ALL COMPLETE.** Detailed phase records archived in `DONE.md`.

Key deliverables: Next.js 16 App Router, Clerk auth + proxy route protection, Stripe checkout + webhooks, MongoDB persistence (Mongoose, strict mode, indexes), 6 personas with three-tier gating, streaming SSE chat, image/audio/video generation (OpenAI tools + S3 storage), AI model policy resolver, central entitlement resolver, admin control plane (users, transactions, usage, settings, website), 7 public marketing/legal routes, WCAG 2.2 AA compliance, TDD test suite (601 tests), E2E suite (49 tests, 8 specs), brand color palette v2, lime green accent, admin-configurable promo/FAQ/landing/stop-reason/persona content, global error boundary, user deletion cascade, rate limiting, Node.js 24.12.0, all config hardening.

Resolved production bugs: Audio playback (Phase 168), hydration mismatch (Phase 169), script tag warning (Phase 170), payment webhook schema (Phase 157/161), catch block documentation (Phase 167+167.2), test failures (Phase 171), cellesseon rename (Phase 172), debug text (Phase 173), dead files (Phase 174-175), download 206 (Phase 176), constant dedup (Phase 177).

---

## 3. Verified Baseline (Architect Audit #82, 2026-04-01)

### Architecture Status — SOUND (core), TWO CRITICAL RUNTIME BUGS

| Area                | Status | Evidence                                         |
| ------------------- | ------ | ------------------------------------------------ |
| Route boundaries    | ✅     | Clean `/app(.*)` + `/admin(.*)` proxy protection |
| Server/client split | ✅     | Server Components for pages, client for UX only  |
| Auth in all actions | ✅     | All server actions + API routes verify auth      |
| Admin double-check  | ✅     | All 15 admin functions use `requireAdminAccess`  |
| Schema strict mode  | ✅     | All 9 Mongoose models have `strict: true`        |
| Index coverage      | ✅     | 18 indexed fields across all query-filtered cols |
| maxDuration exports | ✅     | All 6 API routes (openai=60, clerk=60, rest=30)  |
| Server-only guards  | ✅     | 50+ utility files with `import "server-only"`    |
| Rate limiting       | ✅     | MongoDB-backed, durable, all API routes covered  |
| SSRF prevention     | ✅     | `isAllowedDownloadUrl()` allowlist               |
| Error handling      | ✅     | All catches documented, `handleError` → `never`  |
| **Stream timeout**  | 🔴     | **Proactive timeout miscalculated — see C1**     |
| **Stripe webhook**  | 🔴     | **Operational issue — see C2**                   |
| Knip                | ✅     | 0 findings                                       |
| TSC                 | ✅     | 0 errors                                         |
| Lint                | ✅     | 0 errors, 0 warnings                             |
| Tests               | ✅     | 101 suites, 601 tests, all pass                  |
| E2E                 | ✅     | 8 specs, 49 tests                                |

### Issues Found by This Audit

| #   | Severity    | Issue                                                                    | File/Location                                      |
| --- | ----------- | ------------------------------------------------------------------------ | -------------------------------------------------- |
| C1  | 🔴 CRITICAL | Stream timeout miscalculated: 55s from stream start, not function start  | `api/openai/route.tsx:1395` (startTime capture)    |
| C2  | 🔴 CRITICAL | Stripe webhook returns 200 but no transaction/plan update — ops config   | `api/webhooks/stripe/route.tsx` + Stripe dashboard |
| H4  | HIGH        | Fake download icon — styled clickable, no handler, no keyboard access    | `profile-billing.tsx:40`                           |
| H6  | HIGH        | Audio player button permanently disabled after transient error           | `audio-player.tsx:171`                             |
| M1  | MEDIUM      | No video player error state (unlike audio player)                        | `video-player.tsx`                                 |
| M2  | MEDIUM      | ~20-30 hardcoded display strings across homepage/chat/profile components | Multiple files                                     |
| M3  | MEDIUM      | Hardcoded persona IDs in homepage spotlight                              | `persona-spotlight.tsx:6`                          |

### Phase 173-178 Completion Status

| Phase | Task                                         | Status    | Evidence                                                       |
| ----- | -------------------------------------------- | --------- | -------------------------------------------------------------- |
| 173   | Remove debug text from chat-wrapper.tsx      | ✅ DONE   | Grep confirms text removed                                     |
| 174   | Delete theme-init.js + clean knip.json       | ✅ DONE   | File deleted; knip.json cleaned; layout.tsx has inline script  |
| 175   | Remove dead conversationEnded prop           | ✅ DONE   | Prop removed from ChatBodyProps interface                      |
| 176   | Fix download route 206 status                | ✅ DONE   | Now uses `response.ContentRange ? 206 : 200`                   |
| 177   | Deduplicate STREAM_PROACTIVE_TIMEOUT_MESSAGE | ✅ DONE   | route.tsx imports from `@/constants/chat-stream`               |
| 178   | Fix fake download icon in profile-billing    | ❌ UNDONE | Icon at `profile-billing.tsx:40` still present with no handler |

**NOTE:** DONE.md was NOT updated for Phases 173-177. Engineer must update DONE.md.

### Ongoing Constraints

- **Vercel Hobby 60s timeout** — Root cause of C1. Media gen (especially video) WILL exceed. Even image generation fails when setup + chat + gen approaches 60s. Full fix requires either: (a) computing proactive timeout from function start, or (b) Vercel Pro ($20/mo, 300s), or (c) architecture change (background job + polling).
- **Single-document conversation storage** — `Task` model with `estimatedBytes` guardrails. Future risk, not current blocker.
- **Stripe billing is one-time purchase** — Recurring subscription deferred from v1.

---

## 4. SWOT Analysis (Architect Audit #82)

**Strengths:** Clean architecture, strong auth, comprehensive tests (601+49), central policy resolvers, WCAG 2.2 AA complete, durable usage counters, thorough user deletion cascade, zero lint/type/knip issues, correct webhook code structure.

**Weaknesses:** Stream timeout miscalculation (C1), Stripe ops config issue (C2), Phase 178 incomplete, ~20-30 hardcoded display strings, no video error state, DONE.md not updated for 5 phases.

**Opportunities:** Admin config cache (5+ DB hits/request → 30s TTL), env var validation (8 unsafe casts), checkout success polling (webhook delay safety net), structured SSE error codes, Vercel Pro upgrade for media gen reliability.

**Threats:** Vercel Hobby 60s timeout makes ALL media gen unreliable, Stripe ops misconfiguration blocks revenue, hardcoded display text undermines admin configurability promise, single-document growth risk.

---

## 5. Release Gates

| Gate | Name            | Status | Notes                                                                             |
| ---- | --------------- | ------ | --------------------------------------------------------------------------------- |
| A    | Contract Gate   | GREEN  | Billing, tier limits, Premium extras — all frozen and verified                    |
| B    | Architecture    | RED    | Stream timeout miscalculation (C1). Webhook ops issue (C2). Must fix before ship. |
| C    | Product Gate    | RED    | Media gen broken for users. Payment flow broken. Both must be resolved.           |
| D    | Admin Gate      | YELLOW | Core admin config done. ~20-30 hardcoded strings remain (Phase 180).              |
| E    | Public Gate     | GREEN  | All 7 public routes accurate, legal content real, no obsolete trial messaging     |
| F    | Validation Gate | GREEN  | 601 tests, lint 0/0, TSC clean, knip 0, E2E 49 tests, coverage 85/80/85/85        |

---

## 6. Current Execution Order

> Critical production issues FIRST. All other work blocked until C1 and C2 are resolved.

**Priority order:**

1. **🔴 Phase 181 CRITICAL — Fix stream timeout miscalculation.**
   - **Root cause:** `startTime` captured inside `ReadableStream.start()`, not at function entry. Proactive timeout of 55s fires at 65-75s from function start (after 10-20s setup), exceeding Vercel's 60s kill.
   - **Fix:** Capture `functionStartTime = Date.now()` at the top of `POST()` (before any setup). Pass it into the stream's `start()` function. Compute remaining budget: `timeoutSafetyMs = (maxDuration - STREAM_TIMEOUT_SAFETY_BUFFER_SECONDS) * 1000 - (Date.now() - functionStartTime)`. This ensures the proactive timeout fires BEFORE Vercel kills the function regardless of setup time.
   - **Files:** `src/app/api/openai/route.tsx`
   - **Test:** Verify with image generation request. Proactive timeout should fire cleanly with proper error message instead of abrupt stream termination.

2. **🔴 Phase 182 CRITICAL — Diagnose and fix Stripe webhook payment flow.**
   - **Code is structurally correct.** All paths verified by Architect.
   - **Required investigation (owner/ops):**
     - Check Vercel function logs for `[stripe-webhook]` entries during payment attempts
     - Verify `checkout.session.completed` is enabled in Stripe webhook endpoint event list
     - Verify webhook endpoint URL matches production deployment URL
     - Verify `STRIPE_WEBHOOK_SECRET` env var in Vercel matches the webhook endpoint's signing secret
     - Check if owner is observing 200 response for `charge.succeeded` (returns 200 "Unhandled event") vs `checkout.session.completed`
   - **If code fix needed:** Add `logStripeWebhookInfo` at the very first line before signature verification to confirm the handler is even reached. Add event type to 200 "Unhandled event" response body for easier Stripe dashboard inspection.
   - **Files:** `src/app/api/webhooks/stripe/route.tsx`, Stripe dashboard, Vercel env vars

3. **HIGH Phase 178** — Fix profile-billing.tsx fake download icon (remove or make functional + keyboard-accessible).

4. **HIGH Phase 180** — Hardcoded display text sweep: `cta-banner.tsx`, `persona-spotlight.tsx`, `chat-intro.tsx`, `plans-section.tsx`, `chat-input.tsx`, `profile-usage.tsx`, `profile-hero.tsx`, `plan-card.tsx`, `profile-danger-zone.tsx`. Owner escalated this as HIGH priority.

5. **MEDIUM Phase 179** — Add error state to `video-player.tsx` (match audio-player pattern).

6. **MEDIUM Phase 143** — Env var runtime validation (replace `as string` / `!` casts).

7. **MEDIUM Phase 144** — Admin config in-memory cache with 30s TTL.

8. **MEDIUM Phase 145** — Upload filename collision fix (`crypto.randomUUID()`).

9. **MEDIUM Phase 165** — Checkout success page DB polling (safety net).

10. **LOW Phase 146** — Admin user detail transaction `.limit(50)`.

11. **LOW Phase 147** — Rename `.tsx` utility files to `.ts` where no JSX.

12. **LOW Phase 148** — Admin bulk operations partial-failure reporting.

13. **CLEANUP** — Update DONE.md for Phases 173-177.

---

## 7. Owner Directives Status

| #    | Directive                              | Status                                                                           |
| ---- | -------------------------------------- | -------------------------------------------------------------------------------- |
| OI1  | TDD rebuild ALL tests                  | ✅ COMPLETE. 601 tests, 101 suites.                                              |
| OI2  | No hardcoded data — admin-configurable | ⚠️ INCOMPLETE. Core done. ~20-30 UI strings remain (Phase 180). Owner escalated. |
| OI3  | Reuse repetitive code                  | ✅ COMPLETE.                                                                     |
| OI4  | WCAG 2.2 AA compliance                 | ✅ COMPLETE.                                                                     |
| OI5  | Components = data consumers            | ✅ COMPLETE.                                                                     |
| OI6  | Reduce renders/leaks                   | ✅ COMPLETE.                                                                     |
| OI7  | Server-side utilities                  | ✅ COMPLETE. 50+ server-only guards.                                             |
| OI8  | User removal cascades                  | ✅ COMPLETE. Shared `deleteUserCascade()`.                                       |
| OI9  | Knip clean                             | ✅ COMPLETE (0 findings).                                                        |
| OI10 | Admin fully configurable               | ⚠️ INCOMPLETE. Core done. Remaining strings need admin config (Phase 180).       |
| OI11 | Node.js 24.12.0                        | ✅ COMPLETE.                                                                     |
| OI12 | Deep techstack config audit            | ✅ COMPLETE.                                                                     |
| OI13 | Profile displays plan limits/usage     | ✅ COMPLETE.                                                                     |
| OI14 | Admin panel design matches /app        | ✅ COMPLETE.                                                                     |
| OI15 | Admin shows usage/limits               | ✅ COMPLETE.                                                                     |
| OI16 | Fix merging leftovers                  | ✅ COMPLETE.                                                                     |
| OI17 | Plans/prices/features configurable     | ✅ COMPLETE (core).                                                              |
| OI18 | `cellesseon` → `droplet` rename        | ✅ COMPLETE. All references resolved.                                            |
| OI19 | Fix stream error on media gen          | 🔴 NEW. Phase 181.                                                               |
| OI20 | Fix payment transaction registration   | 🔴 NEW. Phase 182.                                                               |

---

## 8. Target Release Contract

> Full product specification in `SPEC.md`. Key rules here for reference.

### Non-negotiable product rules

1. Account required for chat — no anonymous usage
2. Lite is permanent and free — no expiry
3. Personas are plan-gated (Lite: 2 full + 4 trial, Pro: 5 full + 1 trial, Premium: all 6 full)
4. Pro = $19, Premium = $39
5. Lite limits: 5 conv/day, 10 prompts/conv, 3 img/mo, 3 audio/mo, 1 video/mo
6. Conversations end with stop reason + next-action when limits hit
7. Users can only access their own data
8. Admin routes under `/admin/*` protected at proxy + server level
9. Admin role = full permissions, no limitations
10. All features available in all plans — differentiated by quantity limits

### Tier contract

| Tier    | Price | Chat Model            | Key Limits                                                    |
| ------- | ----- | --------------------- | ------------------------------------------------------------- |
| Lite    | Free  | `gpt-4o-mini`         | 5 conv/day, 10 prompts/conv, 3 img/mo, 3 audio/mo, 1 video/mo |
| Pro     | $19   | `gpt-4.1`             | 50/day, 100/conv, 50 img, 50 audio, 10 video                  |
| Premium | $39   | `gpt-4.1` / `gpt-5.4` | Unlimited                                                     |

---

## 9. Frozen Architecture Direction

> Full architecture spec in `SPEC.md`. Key decisions here for reference.

- **Route model:** Public (`/`, `/about`, `/plans`, etc.), Auth (`/app(.*)`), Admin (`/admin(.*)`)
- **Auth boundary:** Proxy + server-side double-check. Admin: proxy role check + `requireAdminActionAccess()` in every action.
- **Entitlement resolver:** Central `resolveEntitlements()` — never scatter plan logic.
- **AI model policy:** Central `resolveModelPolicy()` — frontend never sends model ID.
- **Conversation lifecycle:** `Task` with `promptCount`, `estimatedBytes`, `status`, `endedReason`, `endAction`.
- **Usage accounting:** `UsageEvent` model logs every AI request. Durable counters with atomic enforcement.
- **Streaming:** SSE with heartbeat, `didSendFinal` guard, proactive timeout safety net. **Timeout must be computed from function start, not stream start.**
- **Data rule:** No binary/base64 in MongoDB. Media → S3. URLs in DB only.

---

## 10. Explicitly Deferred From v1

- Yearly billing / pricing discounts
- Multi-provider LLM routing
- Team / workspace accounts
- User-created custom personas
- Broad role systems beyond `client` and `admin`
- Stripe subscription mode (auto-renewal)
- Legal/nav/footer admin configurability (v2)
- Supabase/PostgreSQL migration (future strategic direction)
- Tiptap rich-text editor (admin forms use standard controls)

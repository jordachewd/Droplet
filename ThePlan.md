# Droplet — Completion Plan

> Purpose: one execution document for finishing the SaaS without avoidable rework.
> Audience: Project Manager, Architect, and Senior Software Agents.
> Rule: this plan is based on verified repository state. If older docs disagree with code, code wins until this file is updated.
> Last verified: Architect audit #84, 2026-04-02. Post owner production test (C1 confirmed, C2 persists, C3 new).

---

## 1. Executive Judgment

Droplet is deployed to production with all 25 milestones complete. The TDD testing rebuild is done (101 suites, 603 tests, 8 E2E specs, 85/80/85/85 coverage). WCAG 2.2 AA is complete. Admin configurability (promo text, FAQ, landing, stop reasons, persona content) is done. Global error boundary is done. Brand rename (cellesseon → droplet) is complete.

**Owner production test (2026-04-02) found THREE critical issues:**

1. **🟢 CRITICAL C1 — Media generation timeout (ARCHITECTURE LIMITATION, not code bug).** Owner tested image, audio, and video generation on Lite and Pro plans. ALL return the Phase 181 proactive timeout message: “Request taking longer than expected. Your request is taking longer than expected. Media generation may still be processing in the background.” **This confirms Phase 181 IS WORKING CORRECTLY** — the proactive timeout fires cleanly before Vercel kills the function, producing a user-friendly message instead of a stream death. The root cause is an **architecture limitation**: media generation (30–120s) exceeds the Vercel Hobby plan’s 60s function timeout. **Resolution: upgrade to Vercel Pro ($20/mo, 300s maxDuration) or implement async media generation (background job + polling).**

2. **🔴 CRITICAL C2 — Stripe payment processed but no transaction or plan update (PERSISTS after ops verification).** Owner confirmed ALL ops items previously requested: (a) payment processed in Stripe dashboard ✅, (b) redirected to /checkout-success ✅, (c) checkout.session.completed IS enabled in webhook events ✅, (d) endpoint URL is https://droplet.jwd-apps.com/api/webhooks/stripe ✅, (e) signing secret matches STRIPE_WEBHOOK_SECRET in .env.local ✅. Despite this, user plan stays Lite, no transaction in MongoDB, can re-subscribe. **Architect audit #84 confirmed webhook CODE is correct** — no bugs found. The .env.local signing secret match is irrelevant: Vercel production uses dashboard env vars, NOT .env.local. **PRIMARY SUSPECT: Vercel production env var mismatch.** Phase 183 created for deeper investigation.

3. **🔴 CRITICAL C3 — Facebook login not working (NEW).** Error: “Feature Unavailable / Facebook Login is currently unavailable for this app.” This is a Clerk + Facebook Developer Console configuration issue (not code). Phase 184 created.

**Phases completed since last plan update:**
Phase 178 (fake download icon removal) — DONE. Phase 181 (stream timeout budget fix) — CONFIRMED WORKING IN PRODUCTION. Phase 182 (Stripe diagnostic hardening) — CODE-COMPLETE. 603 tests, all pass. DONE.md not yet updated for Phases 173–178, 181–182.

---

## 2. Completed Work Summary

> **Milestones 0–25 ALL COMPLETE.** Detailed phase records archived in DONE.md.

Key deliverables: Next.js 16 App Router, Clerk auth + proxy route protection, Stripe checkout + webhooks, MongoDB persistence (Mongoose, strict mode, indexes), 6 personas with three-tier gating, streaming SSE chat, image/audio/video generation (OpenAI tools + S3 storage), AI model policy resolver, central entitlement resolver, admin control plane (users, transactions, usage, settings, website), 7 public marketing/legal routes, WCAG 2.2 AA compliance, TDD test suite (603 tests), E2E suite (49 tests, 8 specs), brand color palette v2, lime green accent, admin-configurable promo/FAQ/landing/stop-reason/persona content, global error boundary, user deletion cascade, rate limiting, Node.js 24.12.0, all config hardening.

Resolved production bugs: Audio playback (Phase 168), hydration mismatch (Phase 169), script tag warning (Phase 170), payment webhook schema (Phase 157/161), catch block documentation (Phase 167+167.2), test failures (Phase 171), cellesseon rename (Phase 172), debug text (Phase 173), dead files (Phase 174–175), download 206 (Phase 176), constant dedup (Phase 177), fake download icon (Phase 178), stream timeout budget (Phase 181 — **confirmed working in production**), Stripe diagnostic hardening (Phase 182).

---

## 3. Verified Baseline (Architect Audit #84, 2026-04-02)

### Architecture Status — SOUND (core), TWO ISSUES REQUIRING INVESTIGATION

| Area                | Status | Evidence                                                                           |
| ------------------- | ------ | ---------------------------------------------------------------------------------- |
| Route boundaries    | ✅     | Clean `/app(.*)` + `/admin(.*)` proxy protection                                   |
| Server/client split | ✅     | Server Components for pages, client for UX only                                    |
| Auth in all actions | ✅     | All server actions + API routes verify auth                                        |
| Admin double-check  | ✅     | All 15 admin functions use `requireAdminAccess`                                    |
| Schema strict mode  | ✅     | All 9 Mongoose models have `strict: true`                                          |
| Index coverage      | ✅     | 18 indexed fields across all query-filtered cols                                   |
| maxDuration exports | ✅     | All 6 API routes (openai=60, clerk=60, rest=30)                                    |
| Server-only guards  | ✅     | 50+ utility files with `import "server-only"`                                      |
| Rate limiting       | ✅     | MongoDB-backed, durable, all API routes covered                                    |
| SSRF prevention     | ✅     | `isAllowedDownloadUrl()` allowlist                                                 |
| Error handling      | ✅     | All catches documented, `handleError` → `never`                                    |
| **Stream timeout**  | ✅     | **Phase 181 CONFIRMED WORKING in production. Proactive timeout fires correctly.**  |
| **Stripe webhook**  | 🔴     | **Code audited — no bugs. Suspected Vercel env var mismatch. Phase 183 required.** |
| **Facebook login**  | 🔴     | **Clerk + Facebook Developer Console config issue. Phase 184 required.**           |
| Knip                | ✅     | 0 findings                                                                         |
| TSC                 | ✅     | 0 errors                                                                           |
| Lint                | ✅     | 0 errors, 0 warnings                                                               |
| Tests               | ✅     | 101 suites, 603 tests, all pass                                                    |
| E2E                 | ✅     | 8 specs, 49 tests                                                                  |

### Issues Found by Audit #82–#84 — Updated Status

| #   | Severity           | Issue                                                                    | Status                                                                                                         |
| --- | ------------------ | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| C1  | ✅ ARCH-LIMITATION | Media gen timeout — Phase 181 proactive timeout confirmed working        | Not a code bug. Vercel Hobby 60s limit. Fix: upgrade Vercel Pro ($20/mo) or async media gen.                   |
| C2  | 🔴 INVESTIGATION   | Stripe webhook — payment processed, no transaction, no plan update       | Code audited — no bugs found. Owner confirmed ops items. Vercel env var mismatch suspected. Phase 183 created. |
| C3  | 🔴 CONFIG-ISSUE    | Facebook login — “Feature Unavailable” error                             | Clerk + Facebook Developer Console configuration. Phase 184 created.                                           |
| H4  | ✅ RESOLVED        | Fake download icon — removed in Phase 178                                | Icon removed from `profile-billing.tsx`                                                                        |
| H6  | HIGH               | Audio player button permanently disabled after transient error           | `audio-player.tsx:171` — not yet addressed                                                                     |
| M1  | MEDIUM             | No video player error state (unlike audio player)                        | `video-player.tsx` — not yet addressed                                                                         |
| M2  | MEDIUM             | ~20–30 hardcoded display strings across homepage/chat/profile components | Phase 180 — next code priority                                                                                 |
| M3  | MEDIUM             | Hardcoded persona IDs in homepage spotlight                              | Part of Phase 180                                                                                              |

### Phase 173–184 Completion Status

| Phase | Task                                         | Status                  | Evidence                                                        |
| ----- | -------------------------------------------- | ----------------------- | --------------------------------------------------------------- |
| 173   | Remove debug text from chat-wrapper.tsx      | ✅ DONE                 | Grep confirms text removed                                      |
| 174   | Delete theme-init.js + clean knip.json       | ✅ DONE                 | File deleted; knip.json cleaned; layout.tsx has inline script   |
| 175   | Remove dead conversationEnded prop           | ✅ DONE                 | Prop removed from ChatBodyProps interface                       |
| 176   | Fix download route 206 status                | ✅ DONE                 | Now uses `response.ContentRange ? 206 : 200`                    |
| 177   | Deduplicate STREAM_PROACTIVE_TIMEOUT_MESSAGE | ✅ DONE                 | route.tsx imports from `@/constants/chat-stream`                |
| 178   | Fix fake download icon in profile-billing    | ✅ DONE                 | Icon removed from `profile-billing.tsx`                         |
| 181   | Fix stream timeout budget miscalculation     | ✅ PRODUCTION-CONFIRMED | Owner tested — proactive timeout fires correctly with clean msg |
| 182   | Stripe webhook diagnostic hardening          | ✅ CODE-COMPLETE        | `eventType` added to unhandled response body                    |
| 183   | Stripe payment investigation (Vercel envs)   | 🔴 NOT STARTED          | Phase created — investigate Vercel env vars + Stripe mode match |
| 184   | Facebook login investigation                 | 🔴 NOT STARTED          | Phase created — Clerk + Facebook Developer Console config       |

**NOTE:** DONE.md was NOT updated for Phases 173–178, 181–182. Engineer must update DONE.md.

### Ongoing Constraints

- **Vercel Hobby 60s timeout** — CONFIRMED architecture limitation for media gen. Phase 181 proactive timeout works correctly (clean user message). Media gen (images: 30–90s, audio: 15–60s, video: 60–180s) will consistently exceed 60s budget on Hobby plan. **Recommendation: upgrade to Vercel Pro ($20/mo) which raises maxDuration to 300s.** Alternative: async media gen architecture (background job + polling pattern) — significantly more complex.
- **Single-document conversation storage** — `Task` model with `estimatedBytes` guardrails. Future risk, not current blocker.
- **Stripe billing is one-time purchase** — Recurring subscription deferred from v1.

---

## 4. SWOT Analysis (Updated 2026-04-02, post owner production test)

**Strengths:** Clean architecture, strong auth, comprehensive tests (603+49), central policy resolvers, WCAG 2.2 AA complete, durable usage counters, thorough user deletion cascade, zero lint/type/knip issues, correct webhook code structure (audit #84 confirmed), Stream timeout fix confirmed working in production (Phase 181), SSE heartbeat + proactive timeout pattern is robust.

**Weaknesses:** Stripe payment flow non-functional in production (C2 — suspected env var mismatch), Facebook login broken (C3 — Clerk config), ~20–30 hardcoded display strings (Phase 180), no video error state (Phase 179), DONE.md not updated for 8 phases, audio player error recovery (H6), media gen impossible on Vercel Hobby (architecture limitation).

**Opportunities:** Vercel Pro upgrade unlocks media generation ($20/mo), admin config cache (5+ DB hits/request → 30s TTL), env var validation (8 unsafe casts), checkout success polling (webhook delay safety net), structured SSE error codes.

**Threats:** Stripe env var mismatch blocks ALL revenue until resolved, Facebook auth gap may lose social-login users, Vercel Hobby timeout makes media generation features non-functional (core product promise), hardcoded display text undermines admin configurability promise, single-document growth risk.

---

## 5. Release Gates

| Gate | Name            | Status | Notes                                                                                                            |
| ---- | --------------- | ------ | ---------------------------------------------------------------------------------------------------------------- |
| A    | Contract Gate   | GREEN  | Billing, tier limits, Premium extras — all frozen and verified                                                   |
| B    | Architecture    | YELLOW | Phase 181 confirmed. Media gen is architecture-limited (Vercel Hobby). Stripe flow blocked (suspected env vars). |
| C    | Product Gate    | RED    | Payment flow broken in production (C2). Facebook login broken (C3). Media gen timeout (architecture limitation). |
| D    | Admin Gate      | YELLOW | Core admin config done. ~20–30 hardcoded strings remain (Phase 180).                                             |
| E    | Public Gate     | GREEN  | All 7 public routes accurate, legal content real, no obsolete trial messaging                                    |
| F    | Validation Gate | GREEN  | 603 tests, lint 0/0, TSC clean, knip 0, E2E 49 tests, coverage 85/80/85/85                                       |

---

## 6. Current Execution Order

> C2 (Stripe) is the #1 BLOCKER — blocks all revenue. C3 (Facebook login) is #2. Media gen timeout requires Vercel Pro upgrade (owner decision). Phase 180 is the next code task after critical issues resolved.

### Confirmed Working

- **✅ Phase 181** — Stream timeout budget fix. PRODUCTION-CONFIRMED. Proactive timeout fires correctly.
- **✅ Phase 178** — Fake download icon removed. DONE.
- **✅ Phase 182** — Stripe diagnostic hardening. CODE-COMPLETE.

### Critical Priority (Revenue/Auth Blockers)

1. **🔴 Phase 183 — Stripe payment deep investigation (REVENUE BLOCKER).**
   Owner action + potential code work. Investigation checklist:
   - [ ] **Verify Vercel production env vars**: Owner must check Vercel Dashboard → Project → Settings → Environment Variables. Confirm `STRIPE_WEBHOOK_SECRET` exists and matches the webhook signing secret from Stripe Dashboard → Developers → Webhooks → endpoint → Signing secret. These are DIFFERENT from `.env.local`.
   - [ ] **Check Stripe mode alignment**: Verify that the Stripe API keys (`STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`) in Vercel env vars are for the SAME mode (test vs live) as the webhook endpoint. Test mode keys start with `sk_test_` / `pk_test_`. Live mode keys start with `sk_live_` / `pk_live_`.
   - [ ] **Check Stripe webhook delivery logs**: Stripe Dashboard → Developers → Webhooks → select endpoint → Recent deliveries. Look for failed attempts (HTTP 400 = signature mismatch, HTTP 500 = server error). If no delivery attempts, the endpoint URL or event selection is wrong.
   - [ ] **Check Vercel function logs**: Vercel Dashboard → Project → Logs. Filter for `/api/webhooks/stripe`. Look for `[stripe-webhook]` log lines. If no logs at all, Stripe is not reaching the endpoint. If logs show “Invalid webhook signature”, the signing secret is wrong.
   - [ ] **Verify env var scope**: Vercel env vars can be scoped to Production/Preview/Development. Ensure `STRIPE_WEBHOOK_SECRET` and `STRIPE_SECRET_KEY` are set for the **Production** environment.

2. **🔴 Phase 184 — Facebook login investigation (AUTH BLOCKER).**
   Owner action (Clerk + Facebook config). Investigation checklist:
   - [ ] Clerk Dashboard → Social Connections → Facebook: verify enabled and configured
   - [ ] Facebook Developer Console → App Dashboard: verify app is in “Live” mode (not “Development”)
   - [ ] Facebook App → Settings → Basic: verify App Domain matches `droplet.jwd-apps.com`
   - [ ] Facebook App → Facebook Login → Settings: verify Valid OAuth Redirect URI matches Clerk’s expected callback URL
   - [ ] If Facebook app is still in Development mode, submit for App Review

3. **🟠 Vercel Pro Upgrade (OWNER DECISION).**
   Required to make media generation functional. Current architecture is correct — Phase 181 proactive timeout works — but Vercel Hobby’s 60s limit is too short for image/audio/video generation. Vercel Pro ($20/mo) raises `maxDuration` to 300s, which covers all media gen operations.

### Active Code Priority Order

4. **HIGH Phase 180 — Hardcoded display text sweep.** Owner escalated. Split into sub-phases:

   **Phase 180.1 — Homepage public display text** (≤ 30 min)
   - `cta-banner.tsx`: heading, body paragraph, 2 button labels (“Create account”, “Explore plans”)
   - `persona-spotlight.tsx`: section label, heading, body paragraph, hardcoded featured persona IDs (`["strategist", "teacher", "creator"]`)
   - Pattern: Server Components — call `getEffectiveWebsiteCopy()` directly. Add new keys to `AppSetting` + `effective-website-copy.ts` defaults.

   **Phase 180.2 — Chat display text** (≤ 20 min)
   - `chat-intro.tsx`: greeting heading (“Hello {name}”), subtitle (“welcome to your chat dashboard”)
   - `chat-input.tsx`: default personaLabel fallback (“Droplet”), placeholder text
   - Pattern: Client Components — admin settings must be passed as props from parent Server Component.

   **Phase 180.3 — Profile display text** (≤ 20 min)
   - `profile-danger-zone.tsx`: “Danger zone” heading, deletion warning message, “Delete My Account” button text
   - `profile-usage.tsx`: “Usage” heading, metric labels (evaluate: structural vs configurable)
   - `profile-hero.tsx`: field labels (“Member since”, “Last update”, “Plan expires”) — likely structural/exempt
   - Pattern: Mix of client/server. Danger zone text is user-facing marketing; field labels are structural (likely exempt).

   **Phase 180.4 — Plan display text** (≤ 15 min)
   - `plans-section.tsx`: “Subscribe Now” CTA button text
   - `plan-card.tsx`: “Current”/“Popular” badge text, “/Mo” suffix
   - Pattern: Badge text and suffix are structural (exempt). “Subscribe Now” is marketing copy (configurable).

   **Phase 180.5 — Test updates for Phase 180.1–180.4** (≤ 30 min)
   - Update affected unit tests to mock admin settings
   - Verify existing tests still pass with new prop/resolver patterns

5. **MEDIUM Phase 179** — Add error state to `video-player.tsx` (match audio-player pattern).

6. **MEDIUM Phase 143** — Env var runtime validation (replace `as string` / `!` casts).

7. **MEDIUM Phase 144** — Admin config in-memory cache with 30s TTL.

8. **MEDIUM Phase 145** — Upload filename collision fix (`crypto.randomUUID()`).

9. **MEDIUM Phase 165** — Checkout success page DB polling (safety net).

10. **LOW Phase 146** — Admin user detail transaction `.limit(50)`.

11. **LOW Phase 147** — Rename `.tsx` utility files to `.ts` where no JSX.

12. **LOW Phase 148** — Admin bulk operations partial-failure reporting.

13. **CLEANUP** — Update DONE.md for Phases 173–178, 181–182.

---

## 7. Owner Directives Status

| #    | Directive                              | Status                                                                                                             |
| ---- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| OI1  | TDD rebuild ALL tests                  | ✅ COMPLETE. 603 tests, 101 suites.                                                                                |
| OI2  | No hardcoded data — admin-configurable | ⚠️ INCOMPLETE. Core done. ~20–30 UI strings remain (Phase 180). Owner escalated to HIGH.                           |
| OI3  | Reuse repetitive code                  | ✅ COMPLETE.                                                                                                       |
| OI4  | WCAG 2.2 AA compliance                 | ✅ COMPLETE.                                                                                                       |
| OI5  | Components = data consumers            | ✅ COMPLETE.                                                                                                       |
| OI6  | Reduce renders/leaks                   | ✅ COMPLETE.                                                                                                       |
| OI7  | Server-side utilities                  | ✅ COMPLETE. 50+ server-only guards.                                                                               |
| OI8  | User removal cascades                  | ✅ COMPLETE. Shared `deleteUserCascade()`.                                                                         |
| OI9  | Knip clean                             | ✅ COMPLETE (0 findings).                                                                                          |
| OI10 | Admin fully configurable               | ⚠️ INCOMPLETE. Core done. Remaining strings need admin config (Phase 180).                                         |
| OI11 | Node.js 24.12.0                        | ✅ COMPLETE.                                                                                                       |
| OI12 | Deep techstack config audit            | ✅ COMPLETE.                                                                                                       |
| OI13 | Profile displays plan limits/usage     | ✅ COMPLETE.                                                                                                       |
| OI14 | Admin panel design matches /app        | ✅ COMPLETE.                                                                                                       |
| OI15 | Admin shows usage/limits               | ✅ COMPLETE.                                                                                                       |
| OI16 | Fix merging leftovers                  | ✅ COMPLETE.                                                                                                       |
| OI17 | Plans/prices/features configurable     | ✅ COMPLETE (core).                                                                                                |
| OI18 | `cellesseon` → `droplet` rename        | ✅ COMPLETE. All references resolved.                                                                              |
| OI19 | Fix stream error on media gen          | ✅ PRODUCTION-CONFIRMED. Phase 181 proactive timeout works. Timeout is architecture limitation (Vercel Hobby 60s). |
| OI20 | Fix payment transaction registration   | 🔴 PERSISTS. Code audited — no bugs. Vercel env var mismatch suspected. Phase 183 investigation created.           |
| OI21 | Fix Facebook login                     | 🔴 NEW. Clerk + Facebook Developer Console config issue. Phase 184 investigation created.                          |

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
- **Streaming:** SSE with heartbeat, `didSendFinal` guard, proactive timeout safety net. **Timeout must be computed from function start, not stream start.** **Confirmed working in production (Phase 181).**
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
- Async media generation (background job + polling) — alternative to Vercel Pro upgrade

---

## 11. Architect Audit #84 — Stripe Webhook Code Analysis

> Evidence record for C2 investigation. Filed 2026-04-02.

### Files Audited

- `src/app/api/webhooks/stripe/route.tsx` — Full webhook handler
- `src/lib/actions/transaction.action.tsx` — Checkout session creation
- `node_modules/stripe/package.json` — Stripe SDK v20.4.1
- `node_modules/stripe/cjs/stripe.core.js` — SDK static method verification
- `node_modules/stripe/cjs/Webhooks.js` — `constructEvent` implementation
- `node_modules/stripe/types/index.d.ts` — Type declarations

### Findings

1. **`import stripe from "stripe"` + `stripe.webhooks.constructEvent()`** — VALID. In Stripe v20.4.1, `import stripe from "stripe"` imports the Stripe class. `Stripe.webhooks` is a static property set during module initialization. `constructEvent()` is a synchronous method that verifies the webhook signature and parses the JSON payload. No issue here.

2. **Zod schemas** — CORRECT. `stripeWebhookEventSchema` uses `.passthrough()` and validates `type` + `data.object`. `checkoutSessionMetadataSchema` validates all 5 required fields (`userId`, `clerkId`, `planId`, `plan`, `billing`). `checkoutSessionPayloadSchema` validates `id`, `amount_total`, and `metadata`. All schemas match what the checkout session creation sets.

3. **Metadata alignment** — VERIFIED. `transaction.action.tsx` sets metadata: `{ userId, clerkId, plan, billing, planId: String(planId) }`. The webhook schema expects exactly these fields with matching types.

4. **Idempotency** — CORRECT. Checks for existing transaction, repairs user plan if transaction exists but plan doesn’t match (handles partial failure on replay).

5. **Error handling** — CORRECT. Top-level try/catch returns 500. Inner error paths return 400/500. All error paths log with `[stripe-webhook]` prefix. No silent failures.

6. **Database operations** — CORRECT. Uses `connectToDatabase()`, `findOneAndUpdate` with `strict: true`, ownership verified by `_id` + `clerkId`.

### Verdict

**No code bug found in the Stripe webhook flow.** If the signing secret is wrong, `constructEvent` throws and the webhook returns HTTP 400 — no transaction is created, no plan is updated. This matches the observed behavior exactly.

### Most Probable Root Cause

**Vercel env var mismatch.** The owner confirmed `.env.local` has the correct signing secret, but `.env.local` is local-only. Vercel production uses dashboard environment variables. The most likely scenarios:

- `STRIPE_WEBHOOK_SECRET` is not set in Vercel production env vars, or has a different value
- Stripe keys are for test mode but the webhook is in live mode (or vice versa)
- Env var is scoped to Preview/Development but not Production

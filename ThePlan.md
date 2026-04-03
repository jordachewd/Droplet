# Droplet � Completion Plan

> Purpose: one execution document for finishing the SaaS without avoidable rework.
> Audience: Project Manager, Architect, and Senior Software Agents.
> Rule: this plan is based on verified repository state. If older docs disagree with code, code wins until this file is updated.
> Last verified: PM audit #90, 2026-04-03. V1.0 MVP RELEASED. Phases 189–194 DONE (admin deletion protection, ADMIN display, FormInput, PersonaSelector, UsageMetricRow, TiptapEditor). 611 tests. 5 new owner bugs (OI34–OI38).

---

## 1. Executive Judgment

Droplet is deployed to production with all 25 milestones complete. The TDD testing rebuild is done (101+ suites, 611 tests, 8 E2E specs, 85/80/85/85 coverage). WCAG 2.2 AA is complete. Admin configurability (promo text, FAQ, landing, stop reasons, persona content) is done. Global error boundary is done. Brand rename (cellesseon ? droplet) is complete.

**Owner investigation results (2026-04-02, PM audit #84-B):**

1. **? C1 � Video generation � REMOVED.** Owner directive (2026-04-03): remove ALL video generation from the app. Both `sora-2` and `sora-2-pro` are deprecated. Phase 186-A DONE (58 files modified/deleted, all gates GREEN, 594 tests passing).

2. **? C2 � Stripe payment � RESOLVED.** Root cause: Stripe webhook endpoint was **disabled** in Stripe Dashboard. Owner re-enabled it. All env vars verified correct. Vercel log confirms HTTP 200 + plan update. Revenue flow operational.

3. **? C3 � Facebook login � CLOSED.** Owner removed Facebook login from product. No longer used.

**Phases completed since last plan update:**
Phase 178, 181, 182 � DONE. Phase 183 (Stripe) � RESOLVED (webhook was disabled). Phase 184 (Facebook) � CLOSED (removed from product). Phase 185 (sora-2-pro removal) � DONE. Phase 180.1 (homepage text extraction) � DONE. Phase 186-A (video generation removal) � DONE. Phase 186-B (token limits maximized) � DONE. Phase 187-A (admin error boundary) � DONE. Phase 187-B (Clerk webhook cascade order) � DONE. Phase 187-C (audio player error recovery) � DONE. Phase 187-D (download rate-limit key cleanup) � DONE. Phase 143 (env var runtime validation) � DONE. Phase 180.2 (chat display text extraction) � DONE. Phase 180.3 (plans display text extraction) � DONE. Phase 180.4 (currency symbol compliance) � DONE. Phase 188 (PlanCard isIncluded fix) — DONE. Phase 189 (admin deletion protection) — DONE. Phase 190 (admin ADMIN display + unlimited) — DONE. Phase 191 (reusable FormInput) — DONE. Phase 192 (reusable PersonaSelector) — DONE. Phase 193 (reusable UsageMetricRow) — DONE. Phase 194 (TiptapEditor redesign) — DONE.

---

## 2. Completed Work Summary

> **Milestones 0�25 ALL COMPLETE.** Detailed phase records archived in DONE.md.

Key deliverables: Next.js 16 App Router, Clerk auth + proxy route protection, Stripe checkout + webhooks, MongoDB persistence (Mongoose, strict mode, indexes), 6 personas with three-tier gating, streaming SSE chat, image/audio generation (OpenAI tools + S3 storage), AI model policy resolver, central entitlement resolver, admin control plane (users, transactions, usage, settings, website), 7 public marketing/legal routes, WCAG 2.2 AA compliance, TDD test suite (602 tests), E2E suite (49 tests, 8 specs), brand color palette v2, lime green accent, admin-configurable promo/FAQ/landing/stop-reason/persona content, global error boundary, user deletion cascade, rate limiting, Node.js 24.12.0, all config hardening, video generation removal (Phase 186-A), token limits maximized to near-maximum model capacity (Phase 186-B), admin error boundary (Phase 187-A), Clerk webhook cascade fix (Phase 187-B), audio player error recovery (Phase 187-C), env var runtime validation (Phase 143), all display text admin-configurable (Phases 180.2�180.4), download rate-limit cleanup (Phase 187-D), PlanCard isIncluded fix (Phase 188), admin deletion protection (Phase 189), admin ADMIN display + unlimited permissions (Phase 190), reusable FormInput/PersonaSelector/UsageMetricRow components (Phases 191–193), TiptapEditor WYSIWYG redesign (Phase 194).

Resolved production bugs: Audio playback (Phase 168), hydration mismatch (Phase 169), script tag warning (Phase 170), payment webhook schema (Phase 157/161), catch block documentation (Phase 167+167.2), test failures (Phase 171), cellesseon rename (Phase 172), debug text (Phase 173), dead files (Phase 174�175), download 206 (Phase 176), constant dedup (Phase 177), fake download icon (Phase 178), stream timeout budget (Phase 181 � **confirmed working in production**), Stripe diagnostic hardening (Phase 182).

---

## 3. Verified Baseline (Architect Audit #84, 2026-04-02)

### Architecture Status � SOUND. ALL GATES GREEN.

| Area                | Status | Evidence                                                                          |
| ------------------- | ------ | --------------------------------------------------------------------------------- |
| Route boundaries    | ?      | Clean `/app(.*)` + `/admin(.*)` proxy protection                                  |
| Server/client split | ?      | Server Components for pages, client for UX only                                   |
| Auth in all actions | ?      | All server actions + API routes verify auth                                       |
| Admin double-check  | ?      | All 15 admin functions use `requireAdminAccess`                                   |
| Schema strict mode  | ?      | All 9 Mongoose models have `strict: true`                                         |
| Index coverage      | ?      | 18 indexed fields across all query-filtered cols                                  |
| maxDuration exports | ?      | All 6 API routes (openai=60, clerk=60, rest=30)                                   |
| Server-only guards  | ?      | 50+ utility files with `import "server-only"`                                     |
| Rate limiting       | ?      | MongoDB-backed, durable, all API routes covered                                   |
| SSRF prevention     | ?      | `isAllowedDownloadUrl()` allowlist                                                |
| Error handling      | ?      | All catches documented, `handleError` ? `never`                                   |
| **Stream timeout**  | ?      | **Phase 181 CONFIRMED WORKING in production. Proactive timeout fires correctly.** |
| **Stripe webhook**  | ?      | **RESOLVED. Root cause: webhook was disabled. Re-enabled, HTTP 200 confirmed.**   |
| **Facebook login**  | ?      | **CLOSED. Owner removed Facebook login from product.**                            |
| Knip                | ?      | 0 findings                                                                        |
| TSC                 | ?      | 0 errors                                                                          |
| Lint                | ?      | 0 errors, 0 warnings                                                              |
| Tests               | ?      | 101+ suites, 611 tests, all pass                                                   |
| E2E                 | ?      | 8 specs, 49 tests                                                                 |

### Issues Found by Audit #82�#84 � Updated Status

| #   | Severity    | Issue                                                              | Status                                                                                |
| --- | ----------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| C1  | ? REMOVED   | Video generation removed from product entirely per owner directive | Owner directive: remove all video generation. Phase 186.                              |
| C2  | ? RESOLVED  | Stripe webhook � payment processed, no transaction, no plan update | Root cause: webhook was disabled in Stripe Dashboard. Re-enabled. HTTP 200 confirmed. |
| C3  | ? CLOSED    | Facebook login � "Feature Unavailable" error                       | Owner removed Facebook login from product.                                            |
| H4  | ? RESOLVED  | Fake download icon � removed in Phase 178                          | Icon removed from `profile-billing.tsx`                                               |
| H6  | ✅ RESOLVED | Audio player button permanently disabled after transient error     | Phase 187-C DONE. Error recovery implemented.                                         |
| M1  | ? CANCELLED | No video player error state (unlike audio player)                  | CANCELLED � video-player being removed (Phase 186).                                   |
| M2  | ? RESOLVED  | ~8 hardcoded display strings across chat/profile components        | Phases 180.2, 180.3, 180.4 DONE. All strings admin-configurable.                      |
| M3  | ? RESOLVED  | Hardcoded persona IDs in homepage spotlight                        | Phase 180.1 DONE. Homepage spotlight admin-configurable.                              |

### Phase 173�184 Completion Status

| Phase | Task                                           | Status                 | Evidence                                                            |
| ----- | ---------------------------------------------- | ---------------------- | ------------------------------------------------------------------- |
| 173   | Remove debug text from chat-wrapper.tsx        | ? DONE                 | Grep confirms text removed                                          |
| 174   | Delete theme-init.js + clean knip.json         | ? DONE                 | File deleted; knip.json cleaned; layout.tsx has inline script       |
| 175   | Remove dead conversationEnded prop             | ? DONE                 | Prop removed from ChatBodyProps interface                           |
| 176   | Fix download route 206 status                  | ? DONE                 | Now uses `response.ContentRange ? 206 : 200`                        |
| 177   | Deduplicate STREAM_PROACTIVE_TIMEOUT_MESSAGE   | ? DONE                 | route.tsx imports from `@/constants/chat-stream`                    |
| 178   | Fix fake download icon in profile-billing      | ? DONE                 | Icon removed from `profile-billing.tsx`                             |
| 181   | Fix stream timeout budget miscalculation       | ? PRODUCTION-CONFIRMED | Owner tested � proactive timeout fires correctly with clean msg     |
| 182   | Stripe webhook diagnostic hardening            | ? CODE-COMPLETE        | `eventType` added to unhandled response body                        |
| 183   | Stripe payment investigation (Vercel envs)     | ? RESOLVED             | Root cause: webhook disabled. Owner re-enabled. HTTP 200 confirmed. |
| 184   | Facebook login investigation                   | ? CLOSED               | Owner removed Facebook login from product.                          |
| 185   | Remove `sora-2-pro` from codebase              | ? DONE                 | Owner decision: `sora-2` for all plans including Premium.           |
| 186-A | Remove all video generation from codebase      | ? DONE                 | 58 files modified/deleted. All gates GREEN. 594 tests passing.      |
| 186-B | Increase token limits to near-maximum capacity | ? DONE                 | All 9 chat tiers updated. All gates GREEN.                          |
| 180.1 | Homepage text extraction                       | ? DONE                 | Public display text extracted to admin config.                      |
| 180.2 | Chat display text extraction                   | ? DONE                 | Chat display strings extracted to admin config.                     |
| 180.3 | Plans display text extraction                  | ? DONE                 | Plans display strings extracted to admin config.                    |
| 180.4 | Currency symbol compliance                     | ? DONE                 | Currency display uses admin-configurable values.                    |
| 187-A | Add admin error boundary                       | ? DONE                 | Admin error.tsx added for production resilience.                    |
| 187-B | Fix Clerk webhook cascade order                | ? DONE                 | Cascade deletion order corrected for reliability.                   |
| 187-C | Fix audio player error recovery                | ? DONE                 | Error recovery implemented, button no longer stuck disabled.        |
| 187-D | Download rate-limit key cleanup                | ? DONE                 | Rate-limit key cascade cleanup for download routes.                 |
| 143   | Env var runtime validation                     | ? DONE                 | All unsafe casts replaced with proper validation.                   |
| 188   | Fix PlanCard isIncluded logic                  | ✅ DONE                 | uildPlans() uses limit !== 0. 3 new tests. 602 total.         |
| 189   | Admin deletion protection                      | ✅ DONE                 | 5-layer protection: server + UI. deleteUser(), removeUserByAdmin(), bulkRemoveUsersAction(), profile UI, admin UI. |
| 190   | Admin ADMIN display + unlimited permissions    | ✅ DONE                 | plan-display.ts utility. ADMIN_PLAN_LABEL. Unlimited usage display. |
| 191   | Reusable FormInput component                   | ✅ DONE                 | All input types, exported class constant, migrated across admin.   |
| 192   | Reusable PersonaSelector component             | ✅ DONE                 | Extracted from chat-header.tsx. No dotted border. ARIA labels.     |
| 193   | Reusable UsageMetricRow component              | ✅ DONE                 | Shared between profile + admin user detail. Unlimited + near-limit.|
| 194   | TiptapEditor redesign                          | ✅ DONE                 | Full WYSIWYG: 10 toolbar actions, link/image mgmt, no base64.     |

### Ongoing Constraints

- **Vercel Hobby 60s timeout** � Architecture limitation for media gen. Phase 181 proactive timeout works correctly (clean user message). With video removed, remaining media gen (images: 30�90s, audio: 15�60s) is closer to the 60s limit but not as severe. **Recommendation: upgrade to Vercel Pro ($20/mo) which raises maxDuration to 300s.**
- **Single-document conversation storage** � `Task` model with `estimatedBytes` guardrails. Future risk, not current blocker.
- **Stripe billing is one-time purchase** � Recurring subscription deferred from v1.

---

## 4. SWOT Analysis (Updated 2026-04-03, post PM audit #90)

**Strengths:** Clean architecture, strong auth, comprehensive tests (611+49), central policy resolvers, WCAG 2.2 AA complete, durable usage counters, thorough user deletion cascade, zero lint/type/knip issues, correct webhook code structure, stream timeout confirmed in production (Phase 181), video generation cleanly removed (Phase 186-A), token limits maximized (Phase 186-B), admin error boundary (Phase 187-A), env var runtime validation (Phase 143), all display text admin-configurable (Phases 180.1–180.4), audio player error recovery (Phase 187-C), admin deletion protection with 5-layer defense (Phase 189), reusable component library: FormInput/PersonaSelector/UsageMetricRow (Phases 191–193), TiptapEditor WYSIWYG (Phase 194), plan-display utility for admin ADMIN label (Phase 190).

**Weaknesses:** Image vision completely broken — uploaded image URLs are relative (/api/download?key=...) and inaccessible to OpenAI. No global audio playback coordination (multiple players overlap). No image lightbox for generated images. Library Uploaded tab lacks visual previews. useActionState console warning in admin forms.

**Opportunities:** Vercel Pro upgrade unlocks media generation (/mo), admin config cache (5+ DB hits/request → 30s TTL), checkout success polling (webhook delay safety net), Zustand audio store for singleton playback, image lightbox for chat and library.

**Threats:** Single-document growth risk. S3 URL inaccessibility for OpenAI vision API (image upload "describe image" broken in production).

---

## 5. Release Gates

| Gate | Name            | Status | Notes                                                                                      |
| ---- | --------------- | ------ | ------------------------------------------------------------------------------------------ |
| A    | Contract Gate   | GREEN  | Billing, tier limits, Premium extras � all frozen and verified                             |
| B    | Architecture    | GREEN  | Phase 181 confirmed. Stripe RESOLVED. Video generation removed from product.               |
| C    | Product Gate    | GREEN  | All display strings admin-configurable. Video removed. Stripe + Facebook resolved.         |
| D    | Admin Gate      | GREEN  | Admin config complete. Error boundary added (Phase 187-A). All strings admin-configurable. |
| E    | Public Gate     | GREEN  | All 7 public routes accurate, legal content real, no obsolete trial messaging              |
| F    | Validation Gate | GREEN  | 611 tests, lint 0/0, TSC clean, knip 0, E2E 49 tests, coverage 85/80/85/85                 |

---

## 6. Current Execution Order

> All critical issues RESOLVED. All v1.0 pre-release phases DONE. **V1.0 MVP RELEASED.** Phases 189-194 DONE. 5 new owner bugs queued (Phases 195-199).

### Post-Release Active

- **🔴 Phase 195** — HIGH: Image upload "describe image" broken. S3 proxy URLs inaccessible to OpenAI vision API.
- **🔴 Phase 196** — MEDIUM-HIGH: Audio player overlap. Multiple audio players can play simultaneously.
- **🟡 Phase 197** — Image lightbox for generated images in chat. UX gap for image generation product.
- **🟡 Phase 198** — Library Uploaded tab visual previews. Image thumbnails + file icons.
- **🟢 Phase 199** — useActionState startTransition fix in AdminManagedForm. Trivial one-line fix.

### Confirmed Working

- **✅ Phase 189** — Admin deletion protection. DONE. 5-layer defense.
- **✅ Phase 190** — Admin ADMIN display + unlimited permissions. DONE.
- **✅ Phase 191** — Reusable FormInput component. DONE.
- **✅ Phase 192** — Reusable PersonaSelector component. DONE.
- **✅ Phase 193** — Reusable UsageMetricRow component. DONE.
- **✅ Phase 194** — TiptapEditor redesign. DONE.
- **✅ Phase 188** — PlanCard isIncluded fix. DONE. 602 tests.
- **✅ Phase 181** — Stream timeout budget fix. PRODUCTION-CONFIRMED.

### Post-Release Backlog

> All v1.0 pre-release phases COMPLETE (OI24). Remaining items are post-release improvements.

1. **MEDIUM Phase 144 � Admin config in-memory cache.**
   5+ DB hits/request for admin settings. Add 30s TTL cache.

2. **MEDIUM Phase 145 — Upload filename collision prevention.**
   Use `crypto.randomUUID()` instead of `Date.now()` for S3 filenames.

3. **MEDIUM Phase 165 — Checkout success page DB polling.**
   Safety net for webhook delay — poll DB for plan update on success page.

4. **LOW Phase 146–148 — Low priority improvements.**
   Admin user detail transaction limit, rename `.tsx` utility files to `.ts`, bulk operations partial-failure reporting.

---

## 7. Owner Directives Status

| #    | Directive                              | Status                                                                                                                             |
| ---- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | --- | ---- | ---------------------------- | ------------------------------------------------------------------------------ |
| OI1  | TDD rebuild ALL tests                  | ? COMPLETE. 594 tests, 99 suites.                                                                                                  |
| OI2  | No hardcoded data � admin-configurable | ? COMPLETE. All display strings extracted to admin config (Phases 180.1�180.4).                                                    |
| OI3  | Reuse repetitive code                  | ? COMPLETE.                                                                                                                        |
| OI4  | WCAG 2.2 AA compliance                 | ? COMPLETE.                                                                                                                        |
| OI5  | Components = data consumers            | ? COMPLETE.                                                                                                                        |
| OI6  | Reduce renders/leaks                   | ? COMPLETE.                                                                                                                        |
| OI7  | Server-side utilities                  | ? COMPLETE. 50+ server-only guards.                                                                                                |
| OI8  | User removal cascades                  | ? COMPLETE. Shared `deleteUserCascade()`.                                                                                          |
| OI9  | Knip clean                             | ? COMPLETE (0 findings).                                                                                                           |
| OI10 | Admin fully configurable               | ? COMPLETE. All display strings admin-configurable (Phases 180.1�180.4).                                                           |
| OI11 | Node.js 24.12.0                        | ? COMPLETE.                                                                                                                        |
| OI12 | Deep techstack config audit            | ? COMPLETE.                                                                                                                        |
| OI13 | Profile displays plan limits/usage     | ? COMPLETE.                                                                                                                        |
| OI14 | Admin panel design matches /app        | ? COMPLETE.                                                                                                                        |
| OI15 | Admin shows usage/limits               | ? COMPLETE.                                                                                                                        |
| OI16 | Fix merging leftovers                  | ? COMPLETE.                                                                                                                        |
| OI17 | Plans/prices/features configurable     | ? COMPLETE (core).                                                                                                                 |
| OI18 | `cellesseon` ? `droplet` rename        | ? COMPLETE. All references resolved.                                                                                               |
| OI19 | Fix stream error on media gen          | ? PRODUCTION-CONFIRMED. Phase 181 proactive timeout works. Timeout is architecture limitation (Vercel Hobby 60s).                  |
| OI20 | Fix payment transaction registration   | ? RESOLVED. Root cause: Stripe webhook endpoint was disabled in Stripe Dashboard. Owner re-enabled � confirmed working (HTTP 200). |
| OI21 | Fix Facebook login                     | ? CLOSED. Owner removed Facebook login from product entirely.                                                                      |
| OI22 | Remove all video generation            | ? COMPLETE. Phase 186-A DONE. 58 files modified/deleted. All gates GREEN.                                                          |
| OI23 | Increase token limits to maximum       | ? COMPLETE. Phase 186-B DONE. All 9 chat tiers updated to near-maximum model capacity.                                             |
| OI24 | V1.0 MVP pre-release task list         | ? COMPLETE. All 8 pre-release phases DONE (187-A/B/C/D, 143, 180.2/3/4).                                                           |     | OI25 | Env vars validated in Vercel | ✅ ACKNOWLEDGED. `requireEnv()` kept as defense-in-depth for local dev and CI. |
| OI26 | PlanCard isIncluded bug                | ✅ COMPLETE. Phase 188 DONE. `buildPlans()` uses `limit !== 0`. 602 tests.                                                         |
| OI27 | App is now released                    | ✅ V1.0 MVP RELEASED. Post-release backlog active.                                                                                 |
| OI28 | Admin cannot be deleted                | ✅ COMPLETE. Phase 189 DONE. 5-layer protection (server + UI).                                                                     |
| OI29 | Admin unlimited + "ADMIN" display      | ✅ COMPLETE. Phase 190 DONE. plan-display.ts utility.                                                                             |
| OI30 | Reusable input component               | ✅ COMPLETE. Phase 191 DONE. FormInput with all types + exported class.                                                             |
| OI31 | Persona selector reusable              | ✅ COMPLETE. Phase 192 DONE. Extracted, validated, consistent styling.                                                              |
| OI32 | UsageMetricRow reusable                | ✅ COMPLETE. Phase 193 DONE. Shared between profile and admin.                                                                      |
| OI33 | TiptapEditor redesign                  | ✅ COMPLETE. Phase 194 DONE. Full WYSIWYG toolbar.                                                                                  |
| OI34 | Image upload describe error            | 🔴 Phase 195. HIGH. S3 proxy URLs inaccessible to OpenAI vision API. Image vision broken.                                          |
| OI35 | Audio player overlap fix               | 🔴 Phase 196. MEDIUM-HIGH. Multiple audios play simultaneously. Need global coordination.                                          |
| OI36 | Image lightbox for generated images    | 🟡 Phase 197. Click-to-enlarge modal for images in chat.                                                                           |
| OI37 | Library uploaded tab visual previews   | 🟡 Phase 198. Image thumbnails + file icons in Uploaded tab.                                                                       |
| OI38 | useActionState console warning         | 🟢 Phase 199. Wrap formAction in startTransition in AdminManagedForm.                                                              |

---

## 8. Target Release Contract

> Full product specification in `SPEC.md`. Key rules here for reference.

### Non-negotiable product rules

1. Account required for chat � no anonymous usage
2. Lite is permanent and free � no expiry
3. Personas are plan-gated (Lite: 2 full + 4 trial, Pro: 5 full + 1 trial, Premium: all 6 full)
4. Pro = $19, Premium = $39
5. Lite limits: 5 conv/day, 10 prompts/conv, 3 img/mo, 3 audio/mo
6. Conversations end with stop reason + next-action when limits hit
7. Users can only access their own data
8. Admin routes under `/admin/*` protected at proxy + server level
9. Admin role = full permissions, no limitations
10. All features (image, audio) available in all plans � differentiated by quantity limits

### Tier contract

| Tier    | Price | Chat Model            | Key Limits                                        |
| ------- | ----- | --------------------- | ------------------------------------------------- |
| Lite    | Free  | `gpt-4o-mini`         | 5 conv/day, 10 prompts/conv, 3 img/mo, 3 audio/mo |
| Pro     | $19   | `gpt-4.1`             | 50/day, 100/conv, 50 img, 50 audio                |
| Premium | $39   | `gpt-4.1` / `gpt-5.4` | Unlimited                                         |

---

## 9. Frozen Architecture Direction

> Full architecture spec in `SPEC.md`. Key decisions here for reference.

- **Route model:** Public (`/`, `/about`, `/plans`, etc.), Auth (`/app(.*)`), Admin (`/admin(.*)`)
- **Auth boundary:** Proxy + server-side double-check. Admin: proxy role check + `requireAdminActionAccess()` in every action.
- **Entitlement resolver:** Central `resolveEntitlements()` � never scatter plan logic.
- **AI model policy:** Central `resolveModelPolicy()` � frontend never sends model ID.
- **Conversation lifecycle:** `Task` with `promptCount`, `estimatedBytes`, `status`, `endedReason`, `endAction`.
- **Usage accounting:** `UsageEvent` model logs every AI request. Durable counters with atomic enforcement.
- **Streaming:** SSE with heartbeat, `didSendFinal` guard, proactive timeout safety net. **Timeout must be computed from function start, not stream start.** **Confirmed working in production (Phase 181).**
- **Data rule:** No binary/base64 in MongoDB. Media ? S3. URLs in DB only.

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
- ~~Tiptap rich-text editor~~ — RECLASSIFIED. Now active as Phase 194 (OI33).

---

## 11. Architect Audit #84 � Stripe Webhook Code Analysis

> Evidence record for C2 investigation. Filed 2026-04-02.

### Files Audited

- `src/app/api/webhooks/stripe/route.tsx` � Full webhook handler
- `src/lib/actions/transaction.action.tsx` � Checkout session creation
- `node_modules/stripe/package.json` � Stripe SDK v20.4.1
- `node_modules/stripe/cjs/stripe.core.js` � SDK static method verification
- `node_modules/stripe/cjs/Webhooks.js` � `constructEvent` implementation
- `node_modules/stripe/types/index.d.ts` � Type declarations

### Findings

1. **`import stripe from "stripe"` + `stripe.webhooks.constructEvent()`** � VALID. In Stripe v20.4.1, `import stripe from "stripe"` imports the Stripe class. `Stripe.webhooks` is a static property set during module initialization. `constructEvent()` is a synchronous method that verifies the webhook signature and parses the JSON payload. No issue here.

2. **Zod schemas** � CORRECT. `stripeWebhookEventSchema` uses `.passthrough()` and validates `type` + `data.object`. `checkoutSessionMetadataSchema` validates all 5 required fields (`userId`, `clerkId`, `planId`, `plan`, `billing`). `checkoutSessionPayloadSchema` validates `id`, `amount_total`, and `metadata`. All schemas match what the checkout session creation sets.

3. **Metadata alignment** � VERIFIED. `transaction.action.tsx` sets metadata: `{ userId, clerkId, plan, billing, planId: String(planId) }`. The webhook schema expects exactly these fields with matching types.

4. **Idempotency** � CORRECT. Checks for existing transaction, repairs user plan if transaction exists but plan doesn�t match (handles partial failure on replay).

5. **Error handling** � CORRECT. Top-level try/catch returns 500. Inner error paths return 400/500. All error paths log with `[stripe-webhook]` prefix. No silent failures.

6. **Database operations** � CORRECT. Uses `connectToDatabase()`, `findOneAndUpdate` with `strict: true`, ownership verified by `_id` + `clerkId`.

### Verdict

**No code bug found in the Stripe webhook flow.** If the signing secret is wrong, `constructEvent` throws and the webhook returns HTTP 400 � no transaction is created, no plan is updated. This matches the observed behavior exactly.

### Most Probable Root Cause

**Vercel env var mismatch.** The owner confirmed `.env.local` has the correct signing secret, but `.env.local` is local-only. Vercel production uses dashboard environment variables. The most likely scenarios:

- `STRIPE_WEBHOOK_SECRET` is not set in Vercel production env vars, or has a different value
- Stripe keys are for test mode but the webhook is in live mode (or vice versa)
- Env var is scoped to Preview/Development but not Production

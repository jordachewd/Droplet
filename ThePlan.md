# Droplet — Completion Plan

> Purpose: one execution document for finishing the SaaS without avoidable rework.
> Audience: Project Manager, Architect, and Senior Software Agents.
> Rule: this plan is based on verified repository state. If older docs disagree with code, code wins until this file is updated.
> Last verified: Architect update #83, 2026-04-02. Post Phase 178/181/182 code completion.

---

## 1. Executive Judgment

Droplet is deployed to production with all 25 milestones complete. The TDD testing rebuild is done (101 suites, 603 tests, 8 E2E specs, 85/80/85/85 coverage). WCAG 2.2 AA is complete. Admin configurability (promo text, FAQ, landing, stop reasons, persona content) is done. Global error boundary is done. Brand rename (`cellesseon` → `droplet`) is complete.

**Two CRITICAL production issues have CODE-LEVEL FIXES COMPLETE but require production deployment verification:**

1. **🟡 CRITICAL C1 — Stream error on media generation (CODE-COMPLETE, deploy pending).** Phase 181 DONE: `functionStartTime` now captured at `POST()` entry, timeout delay uses remaining budget with `Math.max(0, ...)`. Fix ensures proactive timeout fires BEFORE Vercel kills the function regardless of setup time. **Needs production deploy + verification with image gen request.** Root cause was: proactive timeout (55s) measured from stream start, not function start. Setup time (10–20s) pushed the effective timeout past Vercel's 60s kill.

2. **🟡 CRITICAL C2 — Stripe payment transaction not registered (OPS issue, diagnostic hardening done).** Phase 182 DONE: diagnostic `eventType` added to "Unhandled event" response body for easier Stripe Dashboard inspection. **Architect audit #82 confirmed webhook code is structurally correct** — all paths that return 200 for `checkout.session.completed` DO create a transaction and update the user plan. **This is an OPERATIONAL issue:** owner must verify (a) `checkout.session.completed` is enabled in Stripe webhook endpoint event list, (b) webhook endpoint URL matches current deployment, (c) `STRIPE_WEBHOOK_SECRET` matches signing secret, (d) Vercel function logs show which event type is actually being received.

3. **HIGH — Admin configurability incomplete.** ~20–30 hardcoded display strings remain across homepage/chat/profile components (CTA banner, persona spotlight, chat intro, plans section, etc.). Phase 180 not started. Owner escalated to HIGH.

**Phases completed since last plan update:**
Phase 178 (fake download icon removal) — DONE. Phase 181 (stream timeout budget fix) — CODE-COMPLETE. Phase 182 (Stripe diagnostic hardening) — CODE-COMPLETE. 603 tests, all pass. DONE.md not yet updated for Phases 173–178, 181–182.

---

## 2. Completed Work Summary

> **Milestones 0–25 ALL COMPLETE.** Detailed phase records archived in `DONE.md`.

Key deliverables: Next.js 16 App Router, Clerk auth + proxy route protection, Stripe checkout + webhooks, MongoDB persistence (Mongoose, strict mode, indexes), 6 personas with three-tier gating, streaming SSE chat, image/audio/video generation (OpenAI tools + S3 storage), AI model policy resolver, central entitlement resolver, admin control plane (users, transactions, usage, settings, website), 7 public marketing/legal routes, WCAG 2.2 AA compliance, TDD test suite (603 tests), E2E suite (49 tests, 8 specs), brand color palette v2, lime green accent, admin-configurable promo/FAQ/landing/stop-reason/persona content, global error boundary, user deletion cascade, rate limiting, Node.js 24.12.0, all config hardening.

Resolved production bugs: Audio playback (Phase 168), hydration mismatch (Phase 169), script tag warning (Phase 170), payment webhook schema (Phase 157/161), catch block documentation (Phase 167+167.2), test failures (Phase 171), cellesseon rename (Phase 172), debug text (Phase 173), dead files (Phase 174–175), download 206 (Phase 176), constant dedup (Phase 177), fake download icon (Phase 178), stream timeout budget (Phase 181), Stripe diagnostic hardening (Phase 182).

---

## 3. Verified Baseline (Architect Audit #82/#83, 2026-04-01/02)

### Architecture Status — SOUND (core), TWO ISSUES PENDING PRODUCTION VERIFICATION

| Area                | Status | Evidence                                                                  |
| ------------------- | ------ | ------------------------------------------------------------------------- |
| Route boundaries    | ✅     | Clean `/app(.*)` + `/admin(.*)` proxy protection                          |
| Server/client split | ✅     | Server Components for pages, client for UX only                           |
| Auth in all actions | ✅     | All server actions + API routes verify auth                               |
| Admin double-check  | ✅     | All 15 admin functions use `requireAdminAccess`                           |
| Schema strict mode  | ✅     | All 9 Mongoose models have `strict: true`                                 |
| Index coverage      | ✅     | 18 indexed fields across all query-filtered cols                          |
| maxDuration exports | ✅     | All 6 API routes (openai=60, clerk=60, rest=30)                           |
| Server-only guards  | ✅     | 50+ utility files with `import "server-only"`                             |
| Rate limiting       | ✅     | MongoDB-backed, durable, all API routes covered                           |
| SSRF prevention     | ✅     | `isAllowedDownloadUrl()` allowlist                                        |
| Error handling      | ✅     | All catches documented, `handleError` → `never`                           |
| **Stream timeout**  | 🟡     | **Phase 181 code-complete — pending production deploy verification**      |
| **Stripe webhook**  | 🟡     | **Phase 182 diagnostic done — ops config verification required by owner** |
| Knip                | ✅     | 0 findings                                                                |
| TSC                 | ✅     | 0 errors                                                                  |
| Lint                | ✅     | 0 errors, 0 warnings                                                      |
| Tests               | ✅     | 101 suites, 603 tests, all pass                                           |
| E2E                 | ✅     | 8 specs, 49 tests                                                         |

### Issues Found by Audit #82 — Updated Status

| #   | Severity     | Issue                                                                    | Status                                                                     |
| --- | ------------ | ------------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| C1  | 🟡 CODE-DONE | Stream timeout miscalculated: now fixed in Phase 181                     | Pending production deploy verification                                     |
| C2  | 🟡 OPS-ISSUE | Stripe webhook returns 200 but no transaction — ops config               | Diagnostic hardening done (Phase 182). Owner must verify Stripe Dashboard. |
| H4  | ✅ RESOLVED  | Fake download icon — removed in Phase 178                                | Icon removed from `profile-billing.tsx`                                    |
| H6  | HIGH         | Audio player button permanently disabled after transient error           | `audio-player.tsx:171` — not yet addressed                                 |
| M1  | MEDIUM       | No video player error state (unlike audio player)                        | `video-player.tsx` — not yet addressed                                     |
| M2  | MEDIUM       | ~20–30 hardcoded display strings across homepage/chat/profile components | Phase 180 — next priority                                                  |
| M3  | MEDIUM       | Hardcoded persona IDs in homepage spotlight                              | Part of Phase 180                                                          |

### Phase 173–182 Completion Status

| Phase | Task                                         | Status           | Evidence                                                      |
| ----- | -------------------------------------------- | ---------------- | ------------------------------------------------------------- |
| 173   | Remove debug text from chat-wrapper.tsx      | ✅ DONE          | Grep confirms text removed                                    |
| 174   | Delete theme-init.js + clean knip.json       | ✅ DONE          | File deleted; knip.json cleaned; layout.tsx has inline script |
| 175   | Remove dead conversationEnded prop           | ✅ DONE          | Prop removed from ChatBodyProps interface                     |
| 176   | Fix download route 206 status                | ✅ DONE          | Now uses `response.ContentRange ? 206 : 200`                  |
| 177   | Deduplicate STREAM_PROACTIVE_TIMEOUT_MESSAGE | ✅ DONE          | route.tsx imports from `@/constants/chat-stream`              |
| 178   | Fix fake download icon in profile-billing    | ✅ DONE          | Icon removed from `profile-billing.tsx`                       |
| 181   | Fix stream timeout budget miscalculation     | ✅ CODE-COMPLETE | `functionStartTime` at POST() entry, remaining budget calc    |
| 182   | Stripe webhook diagnostic hardening          | ✅ CODE-COMPLETE | `eventType` added to unhandled response body                  |

**NOTE:** DONE.md was NOT updated for Phases 173–178, 181–182. Engineer must update DONE.md.

### Ongoing Constraints

- **Vercel Hobby 60s timeout** — Root cause of C1. Phase 181 fix ensures proactive timeout fires within budget. Media gen (especially video) WILL still be tight. Full headroom requires either: (a) Vercel Pro ($20/mo, 300s), or (b) architecture change (background job + polling).
- **Single-document conversation storage** — `Task` model with `estimatedBytes` guardrails. Future risk, not current blocker.
- **Stripe billing is one-time purchase** — Recurring subscription deferred from v1.

---

## 4. SWOT Analysis (Updated 2026-04-02)

**Strengths:** Clean architecture, strong auth, comprehensive tests (603+49), central policy resolvers, WCAG 2.2 AA complete, durable usage counters, thorough user deletion cascade, zero lint/type/knip issues, correct webhook code structure, stream timeout budget now correctly computed (Phase 181).

**Weaknesses:** C1 fix unverified in production, C2 ops config unresolved, ~20–30 hardcoded display strings (Phase 180), no video error state (Phase 179), DONE.md not updated for 8 phases, audio player error recovery (H6).

**Opportunities:** Admin config cache (5+ DB hits/request → 30s TTL), env var validation (8 unsafe casts), checkout success polling (webhook delay safety net), structured SSE error codes, Vercel Pro upgrade for media gen reliability.

**Threats:** Vercel Hobby 60s timeout makes media gen tight even with Phase 181 fix, Stripe ops misconfiguration blocks revenue until owner verifies, hardcoded display text undermines admin configurability promise, single-document growth risk.

---

## 5. Release Gates

| Gate | Name            | Status | Notes                                                                                                        |
| ---- | --------------- | ------ | ------------------------------------------------------------------------------------------------------------ |
| A    | Contract Gate   | GREEN  | Billing, tier limits, Premium extras — all frozen and verified                                               |
| B    | Architecture    | RED    | Phase 181 code-complete but UNVERIFIED in production (C1). Must deploy and confirm.                          |
| C    | Product Gate    | RED    | Media gen fix unverified (C1). Payment flow ops issue unresolved (C2). Both must be confirmed in production. |
| D    | Admin Gate      | YELLOW | Core admin config done. ~20–30 hardcoded strings remain (Phase 180).                                         |
| E    | Public Gate     | GREEN  | All 7 public routes accurate, legal content real, no obsolete trial messaging                                |
| F    | Validation Gate | GREEN  | 603 tests, lint 0/0, TSC clean, knip 0, E2E 49 tests, coverage 85/80/85/85                                   |

---

## 6. Current Execution Order

> C1/C2 code work is complete. Next step: production deploy + owner verification. Phase 180 is the next code task.

### Completed (pending production verification)

- **✅ Phase 181** — Stream timeout budget fix. CODE-COMPLETE. Needs production deploy + image gen test.
- **✅ Phase 182** — Stripe diagnostic hardening. CODE-COMPLETE. Owner must verify Stripe Dashboard config.
- **✅ Phase 178** — Fake download icon removed. DONE.

### Active Priority Order

1. **🟠 DEPLOY + VERIFY** — Deploy current build to production. Verify C1 (image gen request) and C2 (Stripe Dashboard config). This is an OWNER action, not code work.

2. **HIGH Phase 180 — Hardcoded display text sweep.** Owner escalated. Split into sub-phases:

   **Phase 180.1 — Homepage public display text** (≤ 30 min)
   - `cta-banner.tsx`: heading, body paragraph, 2 button labels ("Create account", "Explore plans")
   - `persona-spotlight.tsx`: section label, heading, body paragraph, hardcoded featured persona IDs (`["strategist", "teacher", "creator"]`)
   - Pattern: Server Components — call `getEffectiveWebsiteCopy()` directly. Add new keys to `AppSetting` + `effective-website-copy.ts` defaults.

   **Phase 180.2 — Chat display text** (≤ 20 min)
   - `chat-intro.tsx`: greeting heading ("Hello {name}"), subtitle ("welcome to your chat dashboard")
   - `chat-input.tsx`: default personaLabel fallback ("Droplet"), placeholder text
   - Pattern: Client Components — admin settings must be passed as props from parent Server Component.

   **Phase 180.3 — Profile display text** (≤ 20 min)
   - `profile-danger-zone.tsx`: "Danger zone" heading, deletion warning message, "Delete My Account" button text
   - `profile-usage.tsx`: "Usage" heading, metric labels (evaluate: structural vs configurable)
   - `profile-hero.tsx`: field labels ("Member since", "Last update", "Plan expires") — likely structural/exempt
   - Pattern: Mix of client/server. Danger zone text is user-facing marketing; field labels are structural (likely exempt).

   **Phase 180.4 — Plan display text** (≤ 15 min)
   - `plans-section.tsx`: "Subscribe Now" CTA button text
   - `plan-card.tsx`: "Current"/"Popular" badge text, "/Mo" suffix
   - Pattern: Badge text and suffix are structural (exempt). "Subscribe Now" is marketing copy (configurable).

   **Phase 180.5 — Test updates for Phase 180.1–180.4** (≤ 30 min)
   - Update affected unit tests to mock admin settings
   - Verify existing tests still pass with new prop/resolver patterns

3. **MEDIUM Phase 179** — Add error state to `video-player.tsx` (match audio-player pattern).

4. **MEDIUM Phase 143** — Env var runtime validation (replace `as string` / `!` casts).

5. **MEDIUM Phase 144** — Admin config in-memory cache with 30s TTL.

6. **MEDIUM Phase 145** — Upload filename collision fix (`crypto.randomUUID()`).

7. **MEDIUM Phase 165** — Checkout success page DB polling (safety net).

8. **LOW Phase 146** — Admin user detail transaction `.limit(50)`.

9. **LOW Phase 147** — Rename `.tsx` utility files to `.ts` where no JSX.

10. **LOW Phase 148** — Admin bulk operations partial-failure reporting.

11. **CLEANUP** — Update DONE.md for Phases 173–178, 181–182.

---

## 7. Owner Directives Status

| #    | Directive                              | Status                                                                                             |
| ---- | -------------------------------------- | -------------------------------------------------------------------------------------------------- |
| OI1  | TDD rebuild ALL tests                  | ✅ COMPLETE. 603 tests, 101 suites.                                                                |
| OI2  | No hardcoded data — admin-configurable | ⚠️ INCOMPLETE. Core done. ~20–30 UI strings remain (Phase 180). Owner escalated to HIGH.           |
| OI3  | Reuse repetitive code                  | ✅ COMPLETE.                                                                                       |
| OI4  | WCAG 2.2 AA compliance                 | ✅ COMPLETE.                                                                                       |
| OI5  | Components = data consumers            | ✅ COMPLETE.                                                                                       |
| OI6  | Reduce renders/leaks                   | ✅ COMPLETE.                                                                                       |
| OI7  | Server-side utilities                  | ✅ COMPLETE. 50+ server-only guards.                                                               |
| OI8  | User removal cascades                  | ✅ COMPLETE. Shared `deleteUserCascade()`.                                                         |
| OI9  | Knip clean                             | ✅ COMPLETE (0 findings).                                                                          |
| OI10 | Admin fully configurable               | ⚠️ INCOMPLETE. Core done. Remaining strings need admin config (Phase 180).                         |
| OI11 | Node.js 24.12.0                        | ✅ COMPLETE.                                                                                       |
| OI12 | Deep techstack config audit            | ✅ COMPLETE.                                                                                       |
| OI13 | Profile displays plan limits/usage     | ✅ COMPLETE.                                                                                       |
| OI14 | Admin panel design matches /app        | ✅ COMPLETE.                                                                                       |
| OI15 | Admin shows usage/limits               | ✅ COMPLETE.                                                                                       |
| OI16 | Fix merging leftovers                  | ✅ COMPLETE.                                                                                       |
| OI17 | Plans/prices/features configurable     | ✅ COMPLETE (core).                                                                                |
| OI18 | `cellesseon` → `droplet` rename        | ✅ COMPLETE. All references resolved.                                                              |
| OI19 | Fix stream error on media gen          | 🟡 CODE-COMPLETE. Phase 181 done. Pending production deploy + verification.                        |
| OI20 | Fix payment transaction registration   | 🟡 DIAGNOSTIC DONE. Phase 182 code hardening done. OPS issue — owner must verify Stripe Dashboard. |

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

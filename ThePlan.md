# Droplet — Completion Plan

> Purpose: one execution document for finishing the SaaS without avoidable rework.
> Audience: Project Manager, Architect, and Senior Software Agents.
> Rule: this plan is based on verified repository state. If older docs disagree with code, code wins until this file is updated.
> Last verified: PM audit #81, Architect + Engineer + PM triple audit, 2026-04-01.

---

## 1. Executive Judgment

Droplet is deployed to production with all 25 milestones complete. The TDD testing rebuild is done (101 suites, 601 tests, 8 E2E specs, 85/80/85/85 coverage). WCAG 2.2 AA is complete. Admin configurability (promo text, FAQ, landing, stop reasons, persona content) is done. Global error boundary is done. Empty catch blocks are documented. Brand rename (`cellesseon` → `droplet`) is complete in `src/`.

**The app is blocked by one critical bug discovered in PM audit #81:**

1. **🔴 CRITICAL — Debug text in production.** `chat-wrapper.tsx:601` renders `<p>Checking if is new task...</p>` to every user viewing an existing conversation. Must be removed immediately.

**Remaining work is cleanup and hardening:**

- Delete orphaned `public/scripts/theme-init.js` (dead file, last `cellesseon` reference)
- Remove unused `conversationEnded` prop from `ChatBodyProps`
- Fix download route 206 status derivation (should use upstream ContentRange)
- Deduplicate `STREAM_PROACTIVE_TIMEOUT_MESSAGE` constant (route.tsx vs chat-stream.ts)
- Fix/remove fake download icon in profile-billing.tsx
- Add video player error state
- Env var runtime validation (Phase 143)
- Admin config cache (Phase 144)
- Remaining hardcoded display text sweep
- Backlog phases (145–148, 165)

**Phases completed since last plan update (PM audit #80):**
Phases 171 (test fixes), 172 (cellesseon rename), 167.2 (catch blocks), 162 (promo text admin-configurable), 163 (global error boundary) — ALL COMPLETED by Engineer. All 7 validation gates GREEN.

---

## 2. Completed Work Summary

> **Milestones 0–25 ALL COMPLETE.** Detailed phase records archived in `DONE.md`.

Key deliverables: Next.js 16 App Router, Clerk auth + proxy route protection, Stripe checkout + webhooks, MongoDB persistence (Mongoose, strict mode, indexes), 6 personas with three-tier gating, streaming SSE chat, image/audio/video generation (OpenAI tools + S3 storage), AI model policy resolver, central entitlement resolver, admin control plane (users, transactions, usage, settings, website), 7 public marketing/legal routes, WCAG 2.2 AA compliance, TDD test suite (601 tests), E2E suite (49 tests, 8 specs), brand color palette v2, lime green accent, admin-configurable promo/FAQ/landing/stop-reason/persona content, global error boundary, user deletion cascade, rate limiting, Node.js 24.12.0, all config hardening.

Resolved production bugs: Audio playback (Phase 168), hydration mismatch (Phase 169), script tag warning (Phase 170), payment webhook (Phase 157/161), catch block documentation (Phase 167+167.2), test failures (Phase 171), cellesseon rename in src (Phase 172), proactive stream timeout (Phase 160.2).

---

## 3. Verified Baseline (PM Audit #81, 2026-04-01)

### Architecture Status — SOUND

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
| Knip                | ✅     | 0 findings                                       |
| TSC                 | ✅     | 0 errors                                         |
| Lint                | ✅     | 0 errors, 0 warnings                             |
| Tests               | ✅     | 101 suites, 601 tests, all pass                  |
| E2E                 | ✅     | 8 specs, 49 tests                                |

### Issues Found by This Audit

| #   | Severity    | Issue                                                                    | File/Location                       |
| --- | ----------- | ------------------------------------------------------------------------ | ----------------------------------- |
| C1  | 🔴 CRITICAL | Debug text "Checking if is new task..." rendered to all users            | `chat-wrapper.tsx:601`              |
| H1  | HIGH        | Dead `public/scripts/theme-init.js` — orphaned, last `cellesseon` ref    | `public/scripts/theme-init.js`      |
| H2  | HIGH        | Duplicate `STREAM_PROACTIVE_TIMEOUT_MESSAGE` constant (desync risk)      | `route.tsx:81` + `chat-stream.ts:4` |
| H3  | HIGH        | Dead `conversationEnded` prop in ChatBodyProps                           | `chat-body.tsx:18`                  |
| H4  | HIGH        | Fake download icon — styled clickable, no handler, no keyboard access    | `profile-billing.tsx:75`            |
| H5  | HIGH        | Download route S3 path forces 206 from request Range, not upstream       | `download/route.tsx:232`            |
| H6  | HIGH        | Audio player button permanently disabled after transient error           | `audio-player.tsx:171`              |
| M1  | MEDIUM      | No video player error state (unlike audio player)                        | `video-player.tsx`                  |
| M2  | MEDIUM      | ~30 hardcoded display strings across 8+ homepage/chat/profile components | Multiple files                      |
| M3  | MEDIUM      | Hardcoded persona IDs in homepage spotlight                              | `persona-spotlight.tsx:6`           |

### Ongoing Constraints

- **Vercel Hobby 60s timeout** — Media gen (especially video) may exceed. Proactive 55s safety net mitigates (Phase 160.2). Full fix: Vercel Pro ($20/mo, 300s) or architecture change.
- **Single-document conversation storage** — `Task` model with `estimatedBytes` guardrails. Future risk, not current blocker.
- **Stripe billing is one-time purchase** — Recurring subscription deferred from v1.

---

## 4. SWOT Analysis (PM Audit #81)

**Strengths:** Clean architecture, strong auth, comprehensive tests (601+49), central policy resolvers, WCAG 2.2 AA complete, durable usage counters, thorough user deletion cascade, zero lint/type/knip issues.

**Weaknesses:** Debug text in production (C1), dead files (H1), duplicate constants (H2), ~30 hardcoded display strings, no video error state.

**Opportunities:** Admin config cache (5+ DB hits/request → 30s TTL), env var validation (8 unsafe casts), checkout success polling (webhook delay safety net), structured SSE error codes.

**Threats:** Vercel Hobby 60s timeout limits media gen, single-document growth risk, no subscription auto-renewal, Stripe ops misconfiguration risk.

---

## 5. Release Gates

| Gate | Name            | Status | Notes                                                                         |
| ---- | --------------- | ------ | ----------------------------------------------------------------------------- |
| A    | Contract Gate   | GREEN  | Billing, tier limits, Premium extras — all frozen and verified                |
| B    | Architecture    | GREEN  | Entitlement resolver, route/auth boundaries, storage guardrails — all correct |
| C    | Product Gate    | YELLOW | Debug text in production (C1). All other bugs resolved or mitigated.          |
| D    | Admin Gate      | GREEN  | Admin configurability complete (Phase 162 delivered)                          |
| E    | Public Gate     | GREEN  | All 7 public routes accurate, legal content real, no obsolete trial messaging |
| F    | Validation Gate | GREEN  | 601 tests, lint 0/0, TSC clean, knip 0, E2E 49 tests, coverage 85/80/85/85    |

---

## 6. Current Execution Order

> All major milestones and owner directives COMPLETE. Remaining work is audit-discovered fixes + hardening.

**Priority order:**

1. **🔴 Phase 173 CRITICAL** — Remove debug `<p>Checking if is new task...</p>` from `chat-wrapper.tsx:601`.
2. **HIGH Phase 174** — Delete orphaned `public/scripts/theme-init.js` + remove from `knip.json` ignoreFiles.
3. **HIGH Phase 175** — Remove dead `conversationEnded` prop from `ChatBodyProps` + call site in `ChatWrapper`.
4. **HIGH Phase 176** — Fix download route S3 206: change `byteRange ? 206 : 200` to `response.ContentRange ? 206 : 200`.
5. **HIGH Phase 177** — Deduplicate `STREAM_PROACTIVE_TIMEOUT_MESSAGE`: import from `chat-stream.ts` in route.tsx.
6. **HIGH Phase 178** — Fix profile-billing.tsx fake download icon (remove or make functional + keyboard-accessible).
7. **MEDIUM Phase 179** — Add error state to `video-player.tsx` (match audio-player pattern).
8. **MEDIUM Phase 180** — Hardcoded display text sweep: `cta-banner.tsx`, `persona-spotlight.tsx`, `chat-intro.tsx`, `plans-section.tsx`, `chat-input.tsx`, `profile-usage.tsx`, `profile-hero.tsx`, `plan-card.tsx`, `profile-danger-zone.tsx`.
9. **MEDIUM Phase 143** — Env var runtime validation (replace `as string` / `!` casts).
10. **MEDIUM Phase 144** — Admin config in-memory cache with 30s TTL.
11. **MEDIUM Phase 145** — Upload filename collision fix (`crypto.randomUUID()`).
12. **MEDIUM Phase 165** — Checkout success page DB polling (safety net).
13. **LOW Phase 146** — Admin user detail transaction `.limit(50)`.
14. **LOW Phase 147** — Rename `.tsx` utility files to `.ts` where no JSX.
15. **LOW Phase 148** — Admin bulk operations partial-failure reporting.

---

## 7. Owner Directives Status

| #    | Directive                              | Status                                                                         |
| ---- | -------------------------------------- | ------------------------------------------------------------------------------ |
| OI1  | TDD rebuild ALL tests                  | ✅ COMPLETE. 601 tests, 101 suites.                                            |
| OI2  | No hardcoded data — admin-configurable | ✅ COMPLETE (core). ~30 structural UI strings remain (Phase 180).              |
| OI3  | Reuse repetitive code                  | ✅ COMPLETE.                                                                   |
| OI4  | WCAG 2.2 AA compliance                 | ✅ COMPLETE.                                                                   |
| OI5  | Components = data consumers            | ✅ COMPLETE.                                                                   |
| OI6  | Reduce renders/leaks                   | ✅ COMPLETE.                                                                   |
| OI7  | Server-side utilities                  | ✅ COMPLETE. 50+ server-only guards.                                           |
| OI8  | User removal cascades                  | ✅ COMPLETE. Shared `deleteUserCascade()`.                                     |
| OI9  | Knip clean                             | ✅ COMPLETE (0 findings).                                                      |
| OI10 | Admin fully configurable               | ✅ COMPLETE (core). Promo text (162), FAQ, landing, stop msgs all operational. |
| OI11 | Node.js 24.12.0                        | ✅ COMPLETE.                                                                   |
| OI12 | Deep techstack config audit            | ✅ COMPLETE.                                                                   |
| OI13 | Profile displays plan limits/usage     | ✅ COMPLETE.                                                                   |
| OI14 | Admin panel design matches /app        | ✅ COMPLETE.                                                                   |
| OI15 | Admin shows usage/limits               | ✅ COMPLETE.                                                                   |
| OI16 | Fix merging leftovers                  | ✅ COMPLETE.                                                                   |
| OI17 | Plans/prices/features configurable     | ✅ COMPLETE (core).                                                            |
| OI18 | `cellesseon` → `droplet` rename        | ✅ COMPLETE in `src/`. Dead file `public/scripts/theme-init.js` remains (H1).  |

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
- **Streaming:** SSE with heartbeat, `didSendFinal` guard, proactive 55s timeout safety net.
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

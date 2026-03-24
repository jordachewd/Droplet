# Droplet - Completion Plan

> Purpose: one execution document for finishing the SaaS without avoidable rework.
>
> Audience: Project Manager, Architect, and Senior Software Agents.
>
> Rule: this plan is based on verified repository state. If older docs disagree with code, code wins until this file is updated.

---

## 1. Executive Judgment

Droplet is not blocked by net-new features or visual polish.

It is currently blocked by verification debt and runtime stability gaps: owner-reported regressions that must be re-verified, incomplete admin-configurability closure, unresolved development/runtime errors, remaining accessibility and architecture enforcement work, and stale documentation that still overstates what is fully closed.

The repository already has useful foundations:

- Next.js 16 App Router
- Clerk auth and proxy-based route protection
- Stripe checkout and webhook plumbing
- MongoDB persistence through Mongoose
- persona-based prompting
- conversation persistence
- image, audio, and video generation via OpenAI tools

The repository is not release-ready because the critical product contract is still inconsistent across code, docs, runtime behavior, and owner verification.

The correct strategy is not to keep adding features.

The correct strategy is to finish the remaining verification-and-hardening loop: stabilize Node 24.12.0 runtime behavior, investigate active dev/runtime warnings and failures, run a repo-wide unused-code audit with item-by-item judgment, close the remaining admin-configurability gaps, and re-verify owner-reported UX and entitlement issues before any further expansion.

**March 2026 Pivot — TDD Testing Rebuild:**

The owner has mandated a full TDD rebuild of the entire testing infrastructure. This is the **primary blocking directive** for Milestone 25 and all subsequent work:

1. **Remove all existing unit and E2E tests** and rebuild from scratch using strict Test-Driven Development methodology.
2. **Zero hardcoded data anywhere** — every configurable value must flow from the admin panel.
3. **WCAG 2.2 AA compliance** must be verified across the full application.
4. **All components must be data consumers** — especially `"use client"` components.
5. **Maximize code reuse** — extract all repetitive patterns.
6. **Server-side utilities** — move all data fetching and utility logic server-side.
7. **User removal cascade** — Clerk + DB + all related data must be verified clean.
8. **Knip must stay clean** — zero unused code findings at all times.
9. **Reduce unnecessary renders and resource leaks** throughout the application.

The execution order is: **CRITICAL bugs → TDD testing rebuild → admin configurability closure → WCAG full audit → remaining backlog.**

---

## 2. Verified Baseline

The points below are verified from the current codebase.

| Area                     | Verified Current State                                                                                                                                                                                                                                                                                                                                                                                                                             | Impact                                                                                        | Evidence                                                                                        |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Lite lifecycle           | Lite is permanent and free — no expiry, no trial                                                                                                                                                                                                                                                                                                                                                                                                   | ✅ Matches product contract                                                                   | `src/constants/plans.tsx`, `src/lib/database/models/user.model.tsx`                             |
| Pricing                  | Pro is 19, Premium is 39                                                                                                                                                                                                                                                                                                                                                                                                                           | ✅ Matches requested pricing                                                                  | `src/constants/plans.tsx`, admin settings propagation                                           |
| Public usage access      | `/api/openai` requires auth                                                                                                                                                                                                                                                                                                                                                                                                                        | ✅ Supports account-required chat direction                                                   | `src/app/api/openai/route.tsx`                                                                  |
| Route boundaries         | Clean `/app(.*)` and `/admin(.*)` namespaces, orphan directories removed                                                                                                                                                                                                                                                                                                                                                                           | ✅ Product and auth boundaries are clean                                                      | `src/proxy.tsx`, `src/app/**`                                                                   |
| Admin scope              | Full admin control plane: users, transactions, usage, settings, website                                                                                                                                                                                                                                                                                                                                                                            | ✅ Requested admin capabilities delivered                                                     | `src/app/(admin)/admin/**`                                                                      |
| Entitlements             | 6 personas with three-tier gating (full/limited/blocked), trial access system, admin overrides                                                                                                                                                                                                                                                                                                                                                     | ✅ Matches product contract                                                                   | `src/lib/utils/resolve-entitlements.tsx`, `src/constants/assistant-personas.tsx`                |
| Model routing            | Central AI policy via `resolveModelPolicy()` — plan-aware, feature-aware, task-class-aware                                                                                                                                                                                                                                                                                                                                                         | ✅ No hardcoded model routing                                                                 | `src/lib/utils/ai-model-policy.ts                                                               |
| Conversation storage     | `Task` stores message history in one document with `estimatedBytes` guardrails                                                                                                                                                                                                                                                                                                                                                                     | ⚠️ Operational — guardrails active, but single-document growth remains a future risk          | `src/lib/database/models/tasks.model.tsx`                                                       |
| Usage accounting         | `UsageEvent` model logs every AI request; durable counters for daily/monthly limits; atomic enforcement                                                                                                                                                                                                                                                                                                                                            | ✅ Admin analytics, cost governance, and quota enforcement operational                        | `src/lib/database/models/usage-event.model.tsx`, `src/app/api/openai/route.tsx`                 |
| Rate limiting            | MongoDB-backed rate limiting (durable, multi-instance safe)                                                                                                                                                                                                                                                                                                                                                                                        | ✅ Survives restarts and multiple instances                                                   | Rate limit implementation                                                                       |
| Billing mode             | Stripe recurring subscriptions with webhook processing and server-side price re-verification                                                                                                                                                                                                                                                                                                                                                       | ✅ SaaS billing semantics frozen and operational                                              | `SPEC.md`, Stripe webhook code, `checkoutPlan()`                                                |
| Streaming                | Streaming chat implemented and stable                                                                                                                                                                                                                                                                                                                                                                                                              | ✅ Chat UX target delivered                                                                   | `src/app/api/openai/route.tsx`, chat components                                                 |
| Video generation         | Video generation fully operational via Sora API (`sora-2`/`sora-2-pro`), S3 storage, plan-gated limits, Sora output controls (seconds/size), VideoPlayer component with playsInline, library integration. Phase 34.9 quality fixes COMPLETE. Phase 51.1 prompt fix COMPLETE (media-tool awareness added to persona system prompts)                                                                                                                 | ✅ Video implemented and operational for all plans                                            | `src/lib/utils/generateVideo.tsx`, `src/components/chat/video-player.tsx`, `ai-model-policy.ts` |
| Public pages             | All required public routes complete: `/`, `/about`, `/plans`, `/personas`, `/privacy`, `/cookies`, `/terms`. `/faqs` route removed — FAQs now live in `/plans` page                                                                                                                                                                                                                                                                                | ✅ Public surface complete                                                                    | `src/app/(public)/**`                                                                           |
| FAQ copy                 | FAQ content aligned with current product rules (no trial references). `/faqs` route removed; FAQs rendered in `/plans` and landing page                                                                                                                                                                                                                                                                                                            | ✅ Product messaging consistent                                                               | `src/constants/faqs.tsx`                                                                        |
| Theme control            | Admin settings include theme management. **Light Theme:** Text (Primary) = Midnight Blue (#191970), BG (Secondary) = Lavender Haze (#E6E6FA). **Dark Theme:** Text (Primary) = Lavender Haze (#E6E6FA), BG (Secondary) = Night Indigo (#1B003F). **Button accent = Lime Green (#D9F20C) IMPLEMENTED in both themes** (Phase 68.1-68.3). See Milestone 22 for button style definitions.                                                             | ✅ Settings control operational + Lime Green button accent IMPLEMENTED                        | Admin settings panel                                                                            |
| Tiptap                   | Not installed (admin content editing uses form controls)                                                                                                                                                                                                                                                                                                                                                                                           | Deferred — admin forms use proper controls without rich-text editor                           | `package.json`                                                                                  |
| Admin UX safety          | Confirmation dialogs on all destructive admin actions, AlertMessage feedback on all 14 admin forms, loading indicators, bulk actions on users/transactions/website tables                                                                                                                                                                                                                                                                          | ✅ Admin UX safety directives fully implemented                                               | Admin pages, AdminActionButton, AlertMessage integration                                        |
| Color palette            | Brand palette v2 delivered: nightIndigo (#1B003F), twilightPurple (#4B0082), midnightBlue (#191970), lavenderHaze (#E6E6FA), dustyBlue (#6495ED), **limeGreen (#D9F20C) IMPLEMENTED** (Phase 68.1). All M21 legacy tokens (lightBackground, darkBackground, lightText, darkText, grass, navy, lemon) removed. Clerk appearance updated. Button styles use Lime Green (Phase 68.2-68.3). .btn-contained text = Midnight Blue (Phase 68.4 COMPLETE). | ✅ Brand identity v2 + Lime Green accent IMPLEMENTED                                          | Phase 64, `src/app/globals.css`, 58+ migrated files                                             |
| Node.js runtime          | Node.js 24.12.0 runtime confirmed. `@types/node@^25.5.0`. Phase 76 delivered: `server-only` guards on 6 utility files, `knip` audit, MongoDB SRV-failure resilience, self-heal dedupe/throttling, Next.js smooth-scroll warning fix. `.nvmrc` and `engines` not required — stack works without them (owner decision).                                                                                                                              | ✅ Runtime confirmed and operational                                                          | `package.json`, Phase 76 deliverables                                                           |
| Dev/runtime stability    | MongoDB SRV-failure resilience added (Phase 76) with fallback URI support. Self-heal dedupe/throttling implemented to prevent amplification storms. Next.js smooth-scroll warning resolved. Clerk development-key console messages classified as environment warnings — not code issues.                                                                                                                                                           | ✅ All three reported issues resolved or classified (Phase 76)                                | Phase 76 deliverables                                                                           |
| Premium video limit      | `PLAN_LIMITS.Premium.video` is `-1` (unlimited). **FIXED (Phase 80.1).** Was `10` (same as Pro), confirmed root cause of owner-reported Premium media-limitation error. Now matches Premium images (`-1`) and audio (`-1`).                                                                                                                                                                                                                        | ✅ Fixed (Phase 80.1, PM audit #37)                                                           | `src/constants/plans.tsx` L47                                                                   |
| Profile usage visibility | `ProfileUsage` delivered and wired into `/app/profile`. Shows per-type usage counters with progress bars, daily conversations, reset dates. Data fetched server-side.                                                                                                                                                                                                                                                                              | ✅ Delivered (Phase 66.1)                                                                     | `src/app/(chat)/app/profile/page.tsx`, `src/components/sections/profile-usage.tsx`              |
| Admin usage visibility   | Admin users table shows media used / convos today columns with `∞` for unlimited. User detail page shows `{used} / {limit} ({remaining} left)` with progress bars for all limit types.                                                                                                                                                                                                                                                             | ✅ Delivered (Phase 66.3 + 59.1)                                                              | `src/components/admin/users/admin-users-table.tsx`, admin user detail page                      |
| Configurability closure  | Core prices, limits, theme, currency, persona access, and persona text are admin-configurable. Support email gap CLOSED (Phase 74.1 COMPLETE). Verified gaps remain: FAQ content, hero/about/landing copy, stop-reason messages, nav/footer content. These are real remaining v2 work items. Premium video default is a bug, not a config gap.                                                                                                     | ⚠️ Core delivered, documented gaps remain (Phase 74)                                          | `src/app/(admin)/admin/settings/**`, `src/lib/utils/effective-*.ts*`, `src/constants/**`        |
| Persona configurability  | Admin persona content editing operational (Phase 71.1 + 71.2). Persona labels, taglines, descriptions, starter prompts admin-editable via AppSetting overrides. System prompts and hero images remain in code (v2)                                                                                                                                                                                                                                 | ✅ Persona content admin-configurable (Phase 71.1 + 71.2)                                     | `src/lib/utils/effective-persona-config.ts`, admin settings                                     |
| Admin table P1 fix       | Stale selectedUserIds / selectedTransactionIds cleared on pagination via useEffect. Bulk-action state across pages eliminated (Phase 88.1 + 88.2)                                                                                                                                                                                                                                                                                                  | ✅ P1 fix verified (Phase 88)                                                                 | admin-users-table.tsx, admin-transactions-table.tsx                                             |
| Config hardening         | Dead .eslintrc.json deleted (89.1). Runtime deps moved to dependencies (89.2). Vitest environmentMatchGlobs configured for auto-jsdom on .tsx (89.3). Playwright reduced to 3 default browsers with env var for full matrix (89.4)                                                                                                                                                                                                                 | ✅ All config issues resolved (Phase 89)                                                      | eslint.config.mjs, package.json, vitest.config.mts, playwright.config.ts                        |
| Test infrastructure      | **TDD REBUILD IN PROGRESS (Phase 120.2).** 62 unit test suites, 370 tests (all pass). E2E: 14 spec files, 108 passed, 0 failed, 25 skipped. Build passing. All 7 gates GREEN. TDD infrastructure built (Phase 120.1). 20 utility test files rebuilt out of ~40 target. Previous 532-test suite deleted per owner directive; rebuild from scratch underway. Phases 121, 122, 123 COMPLETE.                                                          | ✅ All 7 gates GREEN. 370 tests (62 suites). E2E: 14 specs, 108 passed, 0 failed, 25 skipped. | tests/unit/**, tests/e2e/**, vitest.config.mts, playwright.config.ts                            |

### Practical conclusions

1. Do not build any anonymous Lite chat path. The code already assumes authenticated AI usage.
2. All plan rules, prices, limits, and model assignments must be admin-configurable — avoid hardcoded references.
3. Do not treat route cleanup as cosmetic refactoring. It is part of auth, ownership, and product-boundary repair.
4. Components must be data consumers — no `fetch()` in client components. Pass data from Server Components as props.
5. Evaluate codebase for unnecessary re-renders and resource leaks.
6. Move utilities and data fetching to server side.
7. User removal must cascade Clerk + DB + all related data (Phase 63.1 delivered).
8. Premium media-limit behavior was corrected in code (Phases 65.1 + 69.1), but the owner repro must be rerun against the current app before the issue is treated as fully closed.
9. Client profile usage/limits display was delivered in code (Phase 66.1), but it must be re-verified in the live app against current entitlements.
10. Entire application must comply with **WCAG 2.2 AA** accessibility standards.
11. Node.js runtime hardening is not complete until the repo-wide scan, `knip` audit, runtime-error investigation, and all six validation gates are green again. Runtime upgraded to 24.12.0.
12. ~~npm run knip reported findings.~~ **RESOLVED (Phase 83).** @typescript-eslint/parser removed, chatTools made non-exported. npm run knip clean. Treat knip as investigation workflow, not deletion list.
13. Dev/runtime warnings resolved (Phase 76): MongoDB SRV resilience path added, smooth-scroll warning fixed, Clerk dev-key messages classified as environment warnings.
14. ~~`PLAN_LIMITS.Premium.video` is `10`, not `-1` (unlimited).~~ **RESOLVED (Phase 80.1).** Changed to `-1`. Premium video now unlimited.
15. ~~5 client components still import constants directly.~~ **RESOLVED (Phase 73.1).** All 5 converted to data-consumer pattern. ~~3 admin client components still have violations (Phase 73.3).~~ **ALL RESOLVED (Phase 73.3).** Admin sidebar, models section, personas section converted to data-consumer pattern.
16. Admin configurability has real remaining gaps: FAQ content, hero/about/landing copy, stop-reason messages, nav/footer content. Support email DONE (Phase 74.1). Phase 74 scope.
17. Node.js 24.12.0 runtime confirmed. `.nvmrc` and `engines` field not required — stack works without them (owner decision).
18. ~~limeGreen brand color change from `#B8F60D` to `#D9F20C` pending — Phase 82.~~ **RESOLVED (Phase 82).** limeGreen updated to #D9F20C with all 10 steps recalculated.
19. WCAG 2.2 AA compliance substantially delivered: admin skip-link (72.1 ✅), opacity contrast (72.2 ✅), form labels/ARIA (72.3 ✅), table semantics (72.4 ✅), viewport zoom (101 ✅), AudioPlayer ARIA (99.5 ✅), WCAG E2E (97.1 ✅), landing contrast (103.1 ✅), plans contrast (103.2 ✅), heading order (103.3 ✅), duplicate landmarks (103.4 ✅), **decorative icons aria-hidden (109 ✅)**, **hamburger aria-expanded (110 ✅ — already implemented)**. Remaining: tabs arrow-key nav (108), AvatarMenu keyboard nav (114).
20. ~~`knip` reports 2 findings: unused `@typescript-eslint/parser` devDep, unused `chatTools` export. Phase 83.~~ **RESOLVED (Phase 83).** `@typescript-eslint/parser` removed from devDeps, `chatTools` made non-exported. `npm run knip` clean.
21. ~~2 server utilities missing `server-only` guard: `ai-model-policy.ts`, `check-usage-limit.ts`. Phase 84.~~ **RESOLVED (Phase 84).** `import "server-only"` added to both files. TD-SEC-05 FULLY RESOLVED.
22. ~~Admin table stale selection P1 bug.~~ **RESOLVED (Phase 88).** Selection cleared on pagination for both users and transactions tables.
23. ~~Config hardening issues: dead .eslintrc.json, wrong devDeps, fragile vitest env, 7 Playwright browsers.~~ **RESOLVED (Phase 89).** All 4 sub-phases delivered.
24. Testing infrastructure rebuild delivered through Phase 120.1 + 117 + 113.2 + 112.2 + 109 + 115 + 116. **TDD REBUILD IN PROGRESS.** Previous 532-test suite deleted. Current: **62 suites, 370 tests — all pass. E2E: 14 specs, 108 passed, 0 failed, 25 skipped. Build passing. All 7 gates GREEN.** Phase 120.2 partially complete (20 of ~40 utility test files rebuilt). Phases 121, 122, 123 COMPLETE. **Owner directive: FULL TDD REBUILD from scratch.**
25. Owner directives (March 2026 update — ESCALATED): **TDD REBUILD MANDATED.** Owner directive: remove ALL existing unit and E2E tests and rebuild entire testing process from scratch using strict TDD methodology. Previous incremental rebuild (Phases 88–103.4) is complete and archived. Previous 532-test suite has been deleted. Current 370 tests (62 suites) and 14 E2E spec files represent the partially-rebuilt baseline. Additional mandates: NO hardcoded data (everything admin-configurable), WCAG 2.2 AA full compliance, components as data consumers, code reuse maximized, server-side utilities, user removal cascade verified, knip stays clean, reduce unnecessary renders/leaks.
26. Owner directives (March 2026 — FINAL, consolidated): (a) **TDD rebuild — CRITICAL: IN PROGRESS. Old tests deleted. 370 tests (62 suites) rebuilt so far. Phase 120.2 partially complete (20/~40 utility files).** (b) Full admin configurability NON-NEGOTIABLE — NO HARDCODED data, everything admin-configurable. Remaining: FAQ (74.2), landing copy (104), stop msgs (107). (c) WCAG 2.2 AA compliance — major fixes done (Phases 72, 97.1, 99.5, 101, 103), full audit pass remaining. (d) `npm run knip` must stay clean — CLEAN (0 findings, Phase 122 resolved orphan). (e) `/app/profile` plan limitations display — DELIVERED (Phase 66.1). (f) Code reuse maximized — TD-REUSE-01/02/03/05 ALL RESOLVED. Remaining: TD-REUSE-04 (Phase 106). (g) Client components must be pure data consumers — COMPLETE (Phase 73.1 + 73.3). (h) Reduce resource leaks — COMPLETE (Phase 102, TD-LEAK-01 RESOLVED). (i) User removal cascades — COMPLETE. (j) Components consume data via props — COMPLETE. (k) Reduce unnecessary renders — COMPLETE. (l) Admin configurability — core done, FAQ/landing/stop-reasons remaining.

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
14. Plan cards must show ✕ for unavailable options (not "0"). E.g., "✕ Audio generations per month" instead of "0 audio generations per month".
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
4. FAQs are embedded in the `/plans` page — no separate `/faqs` route.
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
2. ~~Do not promise video generation in Premium v1 unless provider support, moderation, storage, and cost ceilings are verified.~~ — RESOLVED (Phase 34). Video generation delivered. Provider support verified (Sora API), S3 storage operational, flat pricing confirmed (.10–.30/video), plan-gated limits enforced.
3. Do not keep transaction actions named as `suspend` or `decline` if they do not map to real Stripe or entitlement operations.

---

## 5. Frozen Architecture Direction

These are the recommended stable decisions.

### 5.1 Route model

Use product semantics, not historical grouping.

| Area                       | Target namespace                                                                                                                                                                                |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Public marketing and legal | `/`, `/about`, `/plans`, `/personas`, `/privacy`, `/cookies`, `/terms`                                                                                                                          |
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
| Audio            | Lite        | blocked                                      | —                            |
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

## Milestones 0–24 — ALL COMPLETED

> Milestones 0–24 represent the full build-out of the Droplet SaaS product from initial contract freeze through production readiness. All are COMPLETE. Detailed phase-level records are archived in `DONE.md`.

| Milestone | Name                                                | Status    | Key Deliverables                                                                                      |
| --------- | --------------------------------------------------- | --------- | ----------------------------------------------------------------------------------------------------- |
| M0        | Product Contract Freeze                             | COMPLETED | Tier matrix, billing semantics, Lite limits frozen (Phase 13)                                         |
| M1        | Canonical Policy & Data Contract                    | COMPLETED | Entitlement resolver, stop-reason contract, UsageEvent/AppSetting/PublicPage/AdminAuditLog models     |
| M2        | Route & Auth Boundary Repair                        | COMPLETED | Proxy protection `/app(.*)` + `/admin(.*)`, route tree cleanup (Phase 17)                             |
| M3        | Plan, Billing & User Lifecycle Alignment            | COMPLETED | Lite permanent/free, Stripe checkout, plan pricing `/` (Phase 13)                                     |
| M4        | Usage Ledger & Storage Guardrails                   | COMPLETED | UsageEvent logging, prompt/media/storage counters, conversation-stop enforcement (Phases 15-16)       |
| M5        | Chat Lifecycle, Prompt Quality & Streaming          | COMPLETED | Streaming SSE, `resolveModelPolicy()`, persona-aware prompts (Phases 16, 19, 22)                      |
| M6        | Public Site, FAQ & Legal Surface                    | COMPLETED | 7 public routes: `/`, `/about`, `/plans`, `/personas`, `/privacy`, `/cookies`, `/terms`               |
| M7        | Admin Control Plane                                 | COMPLETED | Users, transactions, usage, settings, website admin — full CRUD, audit trail (Phase 17)               |
| M8        | Security, Reliability & Observability Hardening     | COMPLETED | MongoDB rate limiting, webhook hardening, atomic limits, error sanitization                           |
| M9        | Launch Readiness & Release Control                  | COMPLETED | All 7 gates GREEN. Phases 115/116 resolved. 532 tests (79 suites), E2E 108 pass.                      |
| M10       | Layout, Navigation & Library Enhancement            | COMPLETED | ChatSidebar, AvatarMenu, media library tabs (Phases 31-32)                                            |
| M11       | Persona Trial Access System                         | COMPLETED | Three-tier gating (full/limited/blocked), trial counters, atomic enforcement (Phase 33)               |
| M12       | Video Generation                                    | COMPLETED | Sora API (`sora-2`/`sora-2-pro`), S3 storage, VideoPlayer, plan-gated (Phase 34)                      |
| M13       | UI Polish, Bug Fixes & Admin Enhancement            | COMPLETED | ChatHeader, persona selector, bug fixes, admin enhancements (Phases 35-40)                            |
| M14       | Admin Operational Completeness                      | COMPLETED | Admin user detail, pagination, transaction detail, audit log UI                                       |
| M15       | Critical Bug Fixes                                  | COMPLETED | Media-specific stop reasons, checkout price verification, auto-title (Phases 39-40)                   |
| M16       | Persona Restructure (10 to 6)                       | COMPLETED | Removed 4 personas, merged Analyst into Strategist, 3-per-row grid (Phase 41-43)                      |
| M17       | Admin Panel Redesign & UI Polish                    | COMPLETED | Admin design consistency, plan cards, PRO/PREMIUM labels (Phase 42-43)                                |
| M18       | Admin Configurability & Code Quality                | COMPLETED | `effective-*` resolvers, zero hardcoded plan rules, data-consumer pattern (Phases 44-49)              |
| M19       | Admin UX, Data Architecture & Production Hardening  | COMPLETED | Tabbed settings, admin bypass, video tools, dashboard enrichment (Phases 50-56)                       |
| M20       | Admin UX Safety, Bulk Actions & Design              | COMPLETED | Confirmation dialogs, AlertMessage feedback, loading indicators, bulk actions (Phases 57-59)          |
| M21       | Color Palette Upgrade & Design System Overhaul      | COMPLETED | Navy/Lemon/Grass palette, zero bg-white, design tokens (Phase 60)                                     |
| M22       | Brand Color Palette v2 Migration                    | COMPLETED | nightIndigo/twilightPurple/midnightBlue/lavenderHaze/dustyBlue tokens, Clerk appearance (Phase 64)    |
| M23       | Owner Corrections, Accessibility & Codebase Quality | COMPLETED | Lime Green buttons, persona admin editing, WCAG 72.1-72.4, admin design polish (Phases 68-75)         |
| M24       | Runtime Stabilization, Knip Audit & Re-Verification | COMPLETED | Node 24.12.0, MongoDB SRV resilience, knip clean, server-only guards, admin pagination (Phases 76-85) |

---

## 8. Release Gates

**All 7 gates GREEN.** Updated PM audit #53.

| Gate | Name              | Status | Notes                                                                                                                                                     |
| ---- | ----------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A    | Contract Gate     | GREEN  | Billing, tier limits, Premium extras, model claims — all frozen and verified                                                                              |
| B    | Architecture Gate | GREEN  | Entitlement resolver live, route/auth boundaries correct, storage guardrails enforced                                                                     |
| C    | Product Gate      | GREEN  | 6 personas plan-gated, streaming stable, stop reasons working, trial access live                                                                          |
| D    | Admin Gate        | GREEN  | Users+transactions+usage+settings+website, audit trail, admin role enforced                                                                               |
| E    | Public Gate       | GREEN  | All 7 public routes accurate, legal content real, no obsolete trial messaging                                                                             |
| F    | Validation Gate   | GREEN  | All 7 gates GREEN. Lint (0 errors, 6 warnings), knip (0 findings), TSC clean, unit (370/62 suites), E2E (14 specs, 108 passed, 25 skipped), build passes. |

---

## 9. Current Execution Order

> Milestones 0–24 COMPLETE. Milestone 25 IN PROGRESS — TDD testing rebuild is primary focus.
> **All 7 gates GREEN.** 62 unit test suites, 370 tests (all pass). E2E: 14 specs, 108 passed, 0 failed, 25 skipped.
> Node.js 24.12.0 runtime. Build passing. TSC clean. Lint: 0 errors, 6 warnings. Knip: 0 findings.
> **Owner directive (CRITICAL): FULL TDD REBUILD of ALL tests from scratch.**
> **Phase 120.1 COMPLETE** — TDD infrastructure built (factories, mock helpers, vitest.setup, tests/README.md).
> **Phase 117 COMPLETE** — `isMongoDuplicateKeyError` extracted to shared `type-guards.ts`.
> **Phase 122 COMPLETE** — Orphan `_update_plan.js` deleted. Knip clean (0 findings).
> **Phase 121 COMPLETE** — Raw `error.message` leak fixed in `profile-hero-editor.tsx`. TD-SEC-12 RESOLVED.
> **Phase 123 COMPLETE** — `type="button"` added to error boundary buttons.
> **Phase 120.2 continued** — 20/~40 utility test files rebuilt (8 more files this session).

**Priority order (PM audit #56):**

1. **Phase 120.2 CRITICAL** — TDD utility test rebuild from scratch (owner directive — continue, 20/~40 done)
2. **Phase 120.3 CRITICAL** — TDD server action test rebuild
3. **Phase 106 HIGH** — Extract shared `ChatApiResponse` types (before 120.4 to prevent duplication cement)
4. **Phase 120.4 CRITICAL** — TDD API route test rebuild (split openai-route)
5. **Phase 120.5 HIGH** — TDD component test rebuild
6. **Phase 120.6 HIGH** — TDD E2E test rebuild
7. **Phase 120.7 HIGH** — Raise coverage thresholds post-rebuild
8. **Phase 107 HIGH** — Stop reason messages admin-configurable
9. **Phase 108 MEDIUM** — Tablist arrow-key navigation (WCAG)
10. **Phase 114 MEDIUM** — AvatarMenu keyboard navigation (WCAG)
11. **Phase 74.2 MEDIUM** — FAQ content admin-configurable
12. **Phase 104 MEDIUM** — Landing/hero/about content admin-configurable

---

## 10. Explicitly Deferred From v1

- Yearly billing and yearly pricing discounts
- Multi-provider LLM routing
- Team or workspace accounts
- User-created custom personas
- Broad role systems beyond `client` and `admin`
- Stripe subscription mode (auto-renewal)
- Legal/nav/footer admin configurability (deferred v2)

---

## 11. Owner Directives (Consolidated — PM audit #52)

> Single canonical tracking table. Replaces all previous directive tables.

| #    | Directive                                         | Priority | Status                                                                                                                                                                                                            |
| ---- | ------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OI1  | TDD rebuild ALL tests from scratch                | CRITICAL | IN PROGRESS. Old tests deleted, rebuild underway. Current: 370 tests (62 suites). Phase 120.1 COMPLETE (TDD infra). Phase 120.2 PARTIALLY COMPLETE (20/~40 utility files rebuilt). Phases 121, 122, 123 COMPLETE. |
| OI2  | NO hardcoded data — everything admin-configurable | CRITICAL | MOSTLY DONE. Core done. Remaining: FAQ (74.2), landing copy (104), stop msgs (107).                                                                                                                               |
| OI3  | RE-USE repetitive code                            | HIGH     | MOSTLY COMPLETE. TD-REUSE-01/02/03/05 all resolved. **Phase 117 COMPLETE** — TD-REUSE-05 resolved. Remaining: TD-REUSE-04 (ChatApiResponse types — Phase 106).                                                    |
| OI4  | WCAG 2.2 AA compliance                            | HIGH     | MOSTLY DONE. Phases 72.1-72.4, 97.1, 99.5, 101, 103.1-103.4 delivered. Icons DONE (109). Remaining: tabs (108), AvatarMenu (114).                                                                                 |
| OI5  | Components = data consumers                       | CRITICAL | COMPLETE. Phase 73.1 + 73.3. All components converted.                                                                                                                                                            |
| OI6  | Reduce renders/leaks                              | CRITICAL | COMPLETE. AbortController (Phase 102). All useEffect cleanup verified.                                                                                                                                            |
| OI7  | Server-side utilities                             | CRITICAL | COMPLETE. 44 files with `import "server-only"` guards.                                                                                                                                                            |
| OI8  | User removal cascades                             | CRITICAL | COMPLETE. All 3 paths: Clerk -> Tasks -> Transactions -> UsageEvents -> S3 -> User.                                                                                                                               |
| OI9  | `npm run knip` clean                              | HIGH     | CLEAN (0 findings). Phase 122 COMPLETE — orphan `_update_plan.js` deleted.                                                                                                                                        |
| OI10 | Admin fully configurable                          | HIGH     | MOSTLY DONE. Core operational. Remaining: FAQ (74.2), landing (104), stop msgs (107).                                                                                                                             |
| OI11 | Node.js 24.12.0 compatibility                     | CRITICAL | COMPLETE. Runtime confirmed. All 7 gates GREEN. Phases 115/116 resolved.                                                                                                                                          |
| OI12 | Deep techstack config audit                       | CRITICAL | COMPLETE. Phase 89 + 94 config hardening.                                                                                                                                                                         |
| OI13 | Profile displays plan limits/usage                | HIGH     | COMPLETE. ProfileUsage with progress bars (Phase 66.1).                                                                                                                                                           |
| OI14 | Admin panel design matches /app                   | HIGH     | COMPLETE. Phase 70.1 + 70.2 full alignment.                                                                                                                                                                       |
| OI15 | Admin shows usage/limits remained vs included     | MEDIUM   | COMPLETE. Phase 66.3 + 59.1 with progress bars + pagination (Phase 85).                                                                                                                                           |

---

### Milestone 25 — Testing Infrastructure Rebuild & Config Hardening (Owner-Directed, 2026-03-21)

> **Status: IN PROGRESS** — TDD rebuild underway. Previous 532-test suite deleted per owner directive. Current: 62 suites, 370 tests. Phase 120.2 partially complete (20/~40 utility test files rebuilt). Phases 121, 122, 123 COMPLETE.

**Objective:** Rebuild the entire testing infrastructure from scratch with TDD discipline, achieve coverage gate enforcement, and close remaining E2E quality gaps.

**Dependencies:** Milestones 0–24 (all complete). Blocks A–F COMPLETE (archived to DONE.md).

**Completed blocks (archived):** Block A (P1 bug fixes), Block B (config hardening), Block C (unit test rebuild), Block D (E2E test rebuild), Block E (security guards), Block F (coverage & config tightening). Phases 88–103.4, 105, 109, 111.1, 112.1–112.2, 113.1–113.2, 115–117, 120.1, 121, 122, 123 all complete. See DONE.md for full phase records.

**Block G — TDD Full Rebuild (IN PROGRESS):**

1. **HIGH** — Phase 97: E2E quality rebuild — **97.1 DONE** (WCAG axe-core). Remaining: admin propagation E2E, Mongo dedup E2E.
2. **HIGH** — Phase 98: Coverage gate — **IN PROGRESS**. Baseline: 78.55/66.3/83.53/78.85.
3. **CRITICAL** — Phase 120.2: TDD utility test rebuild from scratch — **IN PROGRESS** (20/~40 files rebuilt).

**Remaining Success Criteria:**

- ⬜ Remaining E2E quality — Phase 97.2+ PENDING.
- ⬜ Coverage gate GREEN (branches ≥78%, statements ≥82%) — Phase 98 IN PROGRESS.
- ⚬ TDD utility test rebuild from scratch — Phase 120.2 IN PROGRESS (20/~40 files).
- ⬜ TDD server action test rebuild — Phase 120.3 PENDING.
- ⬜ TDD API route test rebuild — Phase 120.4 PENDING.
- ⬜ TDD component test rebuild — Phase 120.5 PENDING.
- ⬜ TDD E2E test rebuild — Phase 120.6 PENDING.
- ⬜ Coverage thresholds raised post-rebuild — Phase 120.7 PENDING.

---

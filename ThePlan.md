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

The execution order is: **CRITICAL production bugs (Phase 160 stream fix + Phase 161 payment fix) → admin configurability promo text (Phase 162) → security hardening (Phases 156, 142) → env hardening (Phase 143) → performance (Phase 144 config cache) → remaining backlog.**

---

## 2. Verified Baseline

The points below are verified from the current codebase.

| Area                     | Verified Current State                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Impact                                                                                                                               | Evidence                                                                                        |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| Lite lifecycle           | Lite is permanent and free — no expiry, no trial                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | ✅ Matches product contract                                                                                                          | `src/constants/plans.tsx`, `src/lib/database/models/user.model.tsx`                             |
| Pricing                  | Pro is 19, Premium is 39                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | ✅ Matches requested pricing                                                                                                         | `src/constants/plans.tsx`, admin settings propagation                                           |
| Public usage access      | `/api/openai` requires auth                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | ✅ Supports account-required chat direction                                                                                          | `src/app/api/openai/route.tsx`                                                                  |
| Route boundaries         | Clean `/app(.*)` and `/admin(.*)` namespaces, orphan directories removed                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | ✅ Product and auth boundaries are clean                                                                                             | `src/proxy.tsx`, `src/app/**`                                                                   |
| Admin scope              | Full admin control plane: users, transactions, usage, settings, website                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | ✅ Requested admin capabilities delivered                                                                                            | `src/app/(admin)/admin/**`                                                                      |
| Entitlements             | 6 personas with three-tier gating (full/limited/blocked), trial access system, admin overrides                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | ✅ Matches product contract                                                                                                          | `src/lib/utils/resolve-entitlements.tsx`, `src/constants/assistant-personas.tsx`                |
| Model routing            | Central AI policy via `resolveModelPolicy()` — plan-aware, feature-aware, task-class-aware                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | ✅ No hardcoded model routing                                                                                                        | `src/lib/utils/ai-model-policy.ts                                                               |
| Conversation storage     | `Task` stores message history in one document with `estimatedBytes` guardrails                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | ⚠️ Operational — guardrails active, but single-document growth remains a future risk                                                 | `src/lib/database/models/tasks.model.tsx`                                                       |
| Usage accounting         | `UsageEvent` model logs every AI request; durable counters for daily/monthly limits; atomic enforcement                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | ✅ Admin analytics, cost governance, and quota enforcement operational                                                               | `src/lib/database/models/usage-event.model.tsx`, `src/app/api/openai/route.tsx`                 |
| Rate limiting            | MongoDB-backed rate limiting (durable, multi-instance safe)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | ✅ Survives restarts and multiple instances                                                                                          | Rate limit implementation                                                                       |
| Billing mode             | Stripe recurring subscriptions with webhook processing and server-side price re-verification                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | 🔴 CRITICAL — Stripe checkout succeeds but Transaction/User not updated (Phase 161)                                                  | `SPEC.md`, Stripe webhook code, `checkoutPlan()`                                                |
| Streaming                | Streaming chat has SSE implementation with heartbeat (Phase 149) and catch/finally hardening (Phase 158). **120s auto-timeout safety net** (Phase 133). **CRITICAL: `export const maxDuration` missing from route — serverless platform kills long-running requests before media generation completes. No heartbeat during text-only streaming. See Phase 160.**                                                                                                                                                                                                         | 🔴 CRITICAL — stream breaks on media gen and large text (Phase 160)                                                                  | `src/app/api/openai/route.tsx`, `src/components/chat/chat-wrapper.tsx`                          |
| Video generation         | Video generation fully operational via Sora API (`sora-2`/`sora-2-pro`), S3 storage, plan-gated limits, Sora output controls (seconds/size), VideoPlayer component with playsInline, library integration. Phase 34.9 quality fixes COMPLETE. Phase 51.1 prompt fix COMPLETE (media-tool awareness added to persona system prompts)                                                                                                                                                                                                                                       | ✅ Video implemented and operational for all plans                                                                                   | `src/lib/utils/generateVideo.tsx`, `src/components/chat/video-player.tsx`, `ai-model-policy.ts` |
| Public pages             | All required public routes complete: `/`, `/about`, `/plans`, `/personas`, `/privacy`, `/cookies`, `/terms`. `/faqs` route removed — FAQs now live in `/plans` page                                                                                                                                                                                                                                                                                                                                                                                                      | ✅ Public surface complete                                                                                                           | `src/app/(public)/**`                                                                           |
| FAQ copy                 | FAQ content aligned with current product rules (no trial references). `/faqs` route removed; FAQs rendered in `/plans` and landing page                                                                                                                                                                                                                                                                                                                                                                                                                                  | ✅ Product messaging consistent                                                                                                      | `src/constants/faqs.tsx`                                                                        |
| Theme control            | Admin settings include theme management. **Light Theme:** Text (Primary) = Midnight Blue (#191970), BG (Secondary) = Lavender Haze (#E6E6FA). **Dark Theme:** Text (Primary) = Lavender Haze (#E6E6FA), BG (Secondary) = Night Indigo (#1B003F). **Button accent = Lime Green (#D9F20C) IMPLEMENTED in both themes** (Phase 68.1-68.3). See Milestone 22 for button style definitions.                                                                                                                                                                                   | ✅ Settings control operational + Lime Green button accent IMPLEMENTED                                                               | Admin settings panel                                                                            |
| Tiptap                   | Not installed (admin content editing uses form controls)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Deferred — admin forms use proper controls without rich-text editor                                                                  | `package.json`                                                                                  |
| Admin UX safety          | Confirmation dialogs on all destructive admin actions, AlertMessage feedback on all 14 admin forms, loading indicators, bulk actions on users/transactions/website tables                                                                                                                                                                                                                                                                                                                                                                                                | ✅ Admin UX safety directives fully implemented                                                                                      | Admin pages, AdminActionButton, AlertMessage integration                                        |
| Color palette            | Brand palette v2 delivered: nightIndigo (#1B003F), twilightPurple (#4B0082), midnightBlue (#191970), lavenderHaze (#E6E6FA), dustyBlue (#6495ED), **limeGreen (#D9F20C) IMPLEMENTED** (Phase 68.1). All M21 legacy tokens (lightBackground, darkBackground, lightText, darkText, grass, navy, lemon) removed. Clerk appearance updated. Button styles use Lime Green (Phase 68.2-68.3). .btn-contained text = Midnight Blue (Phase 68.4 COMPLETE).                                                                                                                       | ✅ Brand identity v2 + Lime Green accent IMPLEMENTED                                                                                 | Phase 64, `src/app/globals.css`, 58+ migrated files                                             |
| Node.js runtime          | Node.js 24.12.0 runtime confirmed. `@types/node@^25.5.0`. Phase 76 delivered: `server-only` guards on 6 utility files, `knip` audit, MongoDB SRV-failure resilience, self-heal dedupe/throttling, Next.js smooth-scroll warning fix. `.nvmrc` and `engines` not required — stack works without them (owner decision).                                                                                                                                                                                                                                                    | ✅ Runtime confirmed and operational                                                                                                 | `package.json`, Phase 76 deliverables                                                           |
| Dev/runtime stability    | MongoDB SRV-failure resilience added (Phase 76) with fallback URI support. Self-heal dedupe/throttling implemented to prevent amplification storms. Next.js smooth-scroll warning resolved. Clerk development-key console messages classified as environment warnings — not code issues.                                                                                                                                                                                                                                                                                 | ✅ All three reported issues resolved or classified (Phase 76)                                                                       | Phase 76 deliverables                                                                           |
| Premium video limit      | `PLAN_LIMITS.Premium.video` is `-1` (unlimited). **FIXED (Phase 80.1).** Was `10` (same as Pro), confirmed root cause of owner-reported Premium media-limitation error. Now matches Premium images (`-1`) and audio (`-1`).                                                                                                                                                                                                                                                                                                                                              | ✅ Fixed (Phase 80.1, PM audit #37)                                                                                                  | `src/constants/plans.tsx` L47                                                                   |
| Profile usage visibility | `ProfileUsage` delivered and wired into `/app/profile`. Shows per-type usage counters with progress bars, daily conversations, reset dates. Data fetched server-side.                                                                                                                                                                                                                                                                                                                                                                                                    | ✅ Delivered (Phase 66.1)                                                                                                            | `src/app/(chat)/app/profile/page.tsx`, `src/components/sections/profile-usage.tsx`              |
| Admin usage visibility   | Admin users table shows media used / convos today columns with `∞` for unlimited. User detail page shows `{used} / {limit} ({remaining} left)` with progress bars for all limit types.                                                                                                                                                                                                                                                                                                                                                                                   | ✅ Delivered (Phase 66.3 + 59.1)                                                                                                     | `src/components/admin/users/admin-users-table.tsx`, admin user detail page                      |
| Configurability closure  | Core prices, limits, theme, currency, persona access, persona text admin-configurable. Support email (74.1 ✅), stop-reason messages (107 ✅), FAQ content (74.2 ✅), landing/hero/about copy (104 ✅). **Remaining gaps: promo/upgrade text in chat-sidebar-promo.tsx and plan-promo.tsx still hardcoded String literals (Phase 162). NOT COMPLETE.**                                                                                                                                                                                                                   | ⚠️ PARTIAL — promo text still hardcoded (Phase 162)                                                                                  | `src/app/(admin)/admin/settings/**`, `src/lib/utils/effective-*.ts*`, `src/constants/**`        |
| Persona configurability  | Admin persona content editing operational (Phase 71.1 + 71.2). Persona labels, taglines, descriptions, starter prompts admin-editable via AppSetting overrides. System prompts and hero images remain in code (v2)                                                                                                                                                                                                                                                                                                                                                       | ✅ Persona content admin-configurable (Phase 71.1 + 71.2)                                                                            | `src/lib/utils/effective-persona-config.ts`, admin settings                                     |
| Admin table P1 fix       | Stale selectedUserIds / selectedTransactionIds cleared on pagination via useEffect. Bulk-action state across pages eliminated (Phase 88.1 + 88.2)                                                                                                                                                                                                                                                                                                                                                                                                                        | ✅ P1 fix verified (Phase 88)                                                                                                        | admin-users-table.tsx, admin-transactions-table.tsx                                             |
| Config hardening         | Dead .eslintrc.json deleted (89.1). Runtime deps moved to dependencies (89.2). Vitest environmentMatchGlobs configured for auto-jsdom on .tsx (89.3). Playwright reduced to 3 default browsers with env var for full matrix (89.4)                                                                                                                                                                                                                                                                                                                                       | ✅ All config issues resolved (Phase 89)                                                                                             | eslint.config.mjs, package.json, vitest.config.mts, playwright.config.ts                        |
| Test infrastructure      | **TDD REBUILD COMPLETE (Phases 120.1–120.7 ALL DONE).** 101 unit test suites, 591 tests (all pass). E2E: 8 spec files, 49 tests. Build passing. All 7 gates GREEN. Zero `as never` casts (was 99, now 0). Coverage thresholds: 85/80/85/85. OpenAI route tests split into 5 focused modules ≤321 lines each. 24 component test files. TDD methodology enforced throughout. 3 new E2E specs added (Phase 134): billing checkout, admin user ops, error boundary. Phase 155.1 (scrollbar cleanup), Phase 158 (stream hardening), Phase 159 (button test fix) ALL COMPLETE. | ✅ TDD REBUILD COMPLETE. All 7 gates GREEN. 591 tests (101 suites). E2E: 49 tests (8 specs). Zero `as never`. Coverage: 85/80/85/85. | tests/unit/**, tests/e2e/**, vitest.config.mts, playwright.config.ts                            |

| Schema strict mode | All Mongoose models have explicit `strict: true` in schema options. User, Task, Transaction models hardened (Phase 125.1 COMPLETE). | ✅ Schema governance enforced (Phase 125.1) | All model files in `src/lib/database/models/` |
| API error handling | All server actions have try/catch + `handleError` (Phase 135 ✅). Error response keys standardized to `{ error: ... }` across all API routes (Phase 136 ✅). `handleError` return type changed to `never` for type safety (Phase 137 ✅). Generate functions return typed objects instead of JSON strings (Phase 138 ✅). | ✅ API error handling hardened (Phases 135–138) | `src/lib/utils/handleError.tsx`, `src/app/api/**` |
| Lint cleanliness | Zero lint warnings (was 7, now 0). All 6 `setState-in-effect` warnings resolved. `no-img-element` test warning resolved. Phase 126.2 COMPLETE. | ✅ Lint 0 errors, 0 warnings (Phase 126.2) | `eslint.config.mjs`, all component files |
| Admin query safety | Unbounded admin queries capped with `.limit()` (Phase 140 ✅). Terms page wrapper ID fixed (Phase 139 ✅). Rate-limit bypass comment added (Phase 125.3 ✅). | ✅ Admin query safety hardened (Phases 139–140) | `src/lib/utils/admin-queries.ts` |
| Server-only guards | 50+ server-side utility files have `import "server-only"` guards. Phase 84 (2 files) + Phase 131 (4 additional files) COMPLETE. | ✅ Server-only boundary enforcement comprehensive (Phase 131) | `src/lib/utils/*.ts` |
| Stop-reason messages | All 9 stop-reason messages admin-configurable via `getEffectiveStopReasonMessages()` resolver. Admin UI for editing all stop codes. Consumers wired to resolver. Phase 107.1–107.3 ALL COMPLETE. TD-HARDCODE-01 RESOLVED. | ✅ Stop reasons admin-configurable (Phase 107) | `src/lib/utils/effective-stop-reasons.ts`, admin settings |
| WCAG 2.2 AA | **FULLY COMPLETE.** All sub-phases delivered: admin skip-link (72.1), opacity contrast (72.2), form labels/ARIA (72.3), table semantics (72.4), viewport zoom (101), AudioPlayer ARIA (99.5), WCAG E2E (97.1), landing contrast (103.1), plans contrast (103.2), heading order (103.3), duplicate landmarks (103.4), decorative icons aria-hidden (109), hamburger aria-expanded (110), **tablist arrow-key navigation (108 ✅)**, **AvatarMenu keyboard navigation (114 ✅)**. | ✅ WCAG 2.2 AA FULLY COMPLETE | All component files, E2E accessibility specs |
| Suspended user enforcement | ~~`User.suspended` never enforced in API routes (PM audit #67 SWOT).~~ **RESOLVED (Phase 141).** Suspension now enforced in all API routes via `resolveEntitlements` `isSuspended` param. | ✅ RESOLVED (Phase 141 COMPLETE) | `src/app/api/openai/route.tsx`, `src/lib/utils/resolve-entitlements.tsx` |
| Stream error on media gen | ~~**CRITICAL production bug.** Media generation via tool calls triggers `Error: The response stream ended unexpectedly.`~~ Phase 149 (SSE heartbeat) + Phase 158 (catch/finally hardening) both applied. **OWNER STILL REPORTS IN PRODUCTION.** Root cause: missing `export const maxDuration` on route — serverless function killed before media gen completes. No heartbeat during text-only streaming. Silent failure swallowing in catch blocks. | **🔴 CRITICAL — STILL BROKEN IN PRODUCTION.** Phase 160 tracks fix. | `src/app/api/openai/route.tsx`, `src/components/chat/chat-wrapper.tsx` |
| User deletion cascade fix | ~~`RateLimitEntry` records and `AdminAuditLog` entries NOT cleaned in any of 3 deletion paths.~~ **RESOLVED (Phase 150).** Shared `deleteUserCascade()` utility extracts all cascade steps (Tasks, Transactions, UsageEvents, RateLimitEntries, Uploads, S3). All 3 deletion paths (self-delete, admin-delete, webhook) use shared utility. `RateLimitEntry` cleanup included. | ✅ RESOLVED (Phase 150 COMPLETE) | `src/lib/utils/delete-user-cascade.ts`, `src/lib/actions/user.actions.tsx`, `src/app/api/webhooks/clerk/route.tsx` |
| Library uploaded tab | ~~Conversation Library has no "Uploaded" tab for user-uploaded media.~~ **RESOLVED (Phase 151).** "Uploaded" tab added to Conversation Library. `Upload` model with compound `{ userId: 1, createdAt: -1 }` index. Upload records persisted on file upload. | ✅ RESOLVED (Phase 151 COMPLETE) | `src/lib/database/models/upload.model.ts`, `src/components/chat/library-tabs.tsx`, `src/app/(chat)/app/library/page.tsx` |
| Payment checkout fix | ~~**CRITICAL production bug (PM audit #69).** `redirect()` inside try/catch in `checkoutPlan()`.~~ Phase 152 fixed redirect. Phase 157 fixed webhook schema (.strict()→.strip()). **OWNER STILL REPORTS IN PRODUCTION:** Payment goes through Stripe but no Transaction registered, user plan not updated. Root causes: (1) Stripe Dashboard webhook likely misconfigured. (2) Non-atomic Transaction/User update — idempotency check returns 200 if Transaction exists but User plan update failed, permanently orphaning the update. (3) `constructEvent` error swallowed without details. | **🔴 CRITICAL — STILL BROKEN IN PRODUCTION.** Phase 161 tracks fix. | `src/app/api/webhooks/stripe/route.tsx`, `src/lib/actions/transaction.action.tsx` |
| Admin settings hydration fix | ~~**HIGH bug (PM audit #69).** `AdminSettingsTabs` SSR/client mismatch.~~ **RESOLVED (Phase 153).** `getInitialActiveTabId()` function removed. `useState` initializer uses `tabs[0]?.id ?? ""`. localStorage synced via `useEffect` after mount. No SSR/client divergence. | ✅ RESOLVED (Phase 153 COMPLETE) | `src/components/admin/settings/admin-settings-tabs.tsx` |
| Suspended user UX messaging | ~~**HIGH UX gap (PM audit #69).** Suspended users get no visual feedback.~~ **RESOLVED (Phase 154).** `isSuspended` prop added to `ChatSidebarPromo` and `PlanPromo`. Suspension-specific messaging displayed with contact support CTA. | ✅ RESOLVED (Phase 154 COMPLETE) | `src/components/chat/sidebar/chat-sidebar-promo.tsx`, `src/components/shared/plan-promo.tsx` |
| Custom scrollbar removal | ~~**HIGH directive (PM audit #69).** Remove all custom scrollbar CSS.~~ **RESOLVED (Phase 155 + 155.1 COMPLETE).** CSS class deleted from `globals.css`. All JSX references removed. Zero `droplet-scrollbar` references remaining in codebase. | ✅ RESOLVED (Phase 155 + 155.1 COMPLETE) | `src/app/globals.css`, `src/components/admin/admin-layout-shell.tsx` |

### Practical conclusions

1. Do not build any anonymous Lite chat path. The code already assumes authenticated AI usage.
2. All plan rules, prices, limits, and model assignments must be admin-configurable — avoid hardcoded references.
3. Do not treat route cleanup as cosmetic refactoring. It is part of auth, ownership, and product-boundary repair.
4. Components must be data consumers — no `fetch()` in client components. Pass data from Server Components as props.
5. Evaluate codebase for unnecessary re-renders and resource leaks.
6. Move utilities and data fetching to server side.
7. ~~User removal must cascade Clerk + DB + all related data (Phase 63.1 delivered).~~ **COMPLETE (Phase 150).** Shared `deleteUserCascade()` utility handles all cascade steps including `RateLimitEntry` and `Upload` cleanup. All 3 deletion paths use shared utility.
8. Premium media-limit behavior was corrected in code (Phases 65.1 + 69.1), but the owner repro must be rerun against the current app before the issue is treated as fully closed.
9. Client profile usage/limits display was delivered in code (Phase 66.1), but it must be re-verified in the live app against current entitlements.
10. ~~Entire application must comply with **WCAG 2.2 AA** accessibility standards.~~ **FULLY COMPLETE (Phase 114).** All WCAG 2.2 AA sub-phases delivered including tablist arrow-key nav (108) and AvatarMenu keyboard nav (114).
11. Node.js runtime hardening is not complete until the repo-wide scan, `knip` audit, runtime-error investigation, and all six validation gates are green again. Runtime upgraded to 24.12.0.
12. ~~npm run knip reported findings.~~ **RESOLVED (Phase 83).** @typescript-eslint/parser removed, chatTools made non-exported. npm run knip clean. Treat knip as investigation workflow, not deletion list.
13. Dev/runtime warnings resolved (Phase 76): MongoDB SRV resilience path added, smooth-scroll warning fixed, Clerk dev-key messages classified as environment warnings.
14. ~~`PLAN_LIMITS.Premium.video` is `10`, not `-1` (unlimited).~~ **RESOLVED (Phase 80.1).** Changed to `-1`. Premium video now unlimited.
15. ~~5 client components still import constants directly.~~ **RESOLVED (Phase 73.1).** All 5 converted to data-consumer pattern. ~~3 admin client components still have violations (Phase 73.3).~~ **ALL RESOLVED (Phase 73.3).** Admin sidebar, models section, personas section converted to data-consumer pattern.
16. ~~Admin configurability has real remaining gaps: FAQ content, hero/about/landing copy.~~ Core resolved: Support email (74.1 ✅), stop-reason messages (107 ✅), FAQ content (74.2 ✅), landing/hero/about copy (104 ✅). **Remaining: promo/upgrade text still hardcoded in chat-sidebar-promo.tsx and plan-promo.tsx (Phase 162).** OI2/OI10/OI17 NOT FULLY COMPLETE.
17. Node.js 24.12.0 runtime confirmed. `.nvmrc` and `engines` field not required — stack works without them (owner decision).
18. ~~limeGreen brand color change from `#B8F60D` to `#D9F20C` pending — Phase 82.~~ **RESOLVED (Phase 82).** limeGreen updated to #D9F20C with all 10 steps recalculated.
19. ~~WCAG 2.2 AA compliance substantially delivered.~~ **FULLY COMPLETE.** All sub-phases delivered: admin skip-link (72.1 ✅), opacity contrast (72.2 ✅), form labels/ARIA (72.3 ✅), table semantics (72.4 ✅), viewport zoom (101 ✅), AudioPlayer ARIA (99.5 ✅), WCAG E2E (97.1 ✅), landing contrast (103.1 ✅), plans contrast (103.2 ✅), heading order (103.3 ✅), duplicate landmarks (103.4 ✅), decorative icons aria-hidden (109 ✅), hamburger aria-expanded (110 ✅), **tablist arrow-key navigation (108 ✅)**, **AvatarMenu keyboard navigation (114 ✅)**. Zero remaining WCAG items.
20. ~~`knip` reports 2 findings: unused `@typescript-eslint/parser` devDep, unused `chatTools` export. Phase 83.~~ **RESOLVED (Phase 83).** `@typescript-eslint/parser` removed from devDeps, `chatTools` made non-exported. `npm run knip` clean.
21. ~~2 server utilities missing `server-only` guard: `ai-model-policy.ts`, `check-usage-limit.ts`. Phase 84.~~ **RESOLVED (Phase 84).** `import "server-only"` added to both files. TD-SEC-05 FULLY RESOLVED.
22. ~~Admin table stale selection P1 bug.~~ **RESOLVED (Phase 88).** Selection cleared on pagination for both users and transactions tables.
23. ~~Config hardening issues: dead .eslintrc.json, wrong devDeps, fragile vitest env, 7 Playwright browsers.~~ **RESOLVED (Phase 89).** All 4 sub-phases delivered.
24. Testing infrastructure rebuild COMPLETE through Phases 120.1–120.7 + 117 + 113.2 + 112.2 + 109 + 115 + 116. **TDD REBUILD DONE.** Previous 532-test suite deleted. Current: **101 suites, 591 tests — all pass. E2E: 8 spec files. Build passing. All 7 gates GREEN.** Phase 120.2 COMPLETE — all ~40 utility test files rebuilt. Phase 120.3 COMPLETE — all action tests rebuilt. Phase 120.4 COMPLETE — route tests rebuilt, openai split into 5 modules. Phase 120.5 COMPLETE — 24 component test files. Phase 120.6 COMPLETE — E2E rebuilt (5 specs, structural assertions). Phase 120.7 COMPLETE — thresholds raised to 85/80/85/85. Phase 134 COMPLETE — 3 new E2E specs (billing checkout, admin user ops, error boundary). Zero `as never` casts remaining.
25. Owner directives (March 2026 — FINAL): (a) **TDD rebuild — COMPLETE.** 591 tests (101 suites). 8 E2E specs. Zero `as never`. Coverage 85/80/85/85. Phases 120.1–120.7 ALL COMPLETE. (b) **Full admin configurability — PARTIAL.** FAQ (74.2) ✅, landing copy (104) ✅, stop msgs (107) ✅. **Remaining: promo/upgrade text hardcoded (Phase 162).** (c) **WCAG 2.2 AA compliance — FULLY COMPLETE.** Tabs (108) ✅, AvatarMenu (114) ✅. All other sub-directives COMPLETE: code reuse (TD-REUSE-01–05 resolved), data consumers (73.1+73.3), resource leaks (102), user cascades, server-side utilities, knip clean, shared Button (128.1+128.2), shared types (106).
26. PM audit #65 architect/engineer verification: Phases 120.4–120.7 COMPLETE in codebase (verified independently). Zero `as never` casts (verified). ~~Lint: 7 warnings (not 6).~~ **RESOLVED (Phase 126.2).** Lint: 0 warnings. ~~3 models without explicit `strict: true` (Phase 125.1).~~ **RESOLVED (Phase 125.1).** ~~Stop reasons still hardcoded (Phase 107).~~ **RESOLVED (Phase 107).** ~~4 stale TODOs in ai-model-policy (Phase 132).~~ **RESOLVED (Phase 132).** ~~Streaming fetch has no auto-timeout (Phase 133).~~ **RESOLVED (Phase 133).** ~~4 files missing `server-only` guard (Phase 131).~~ **RESOLVED (Phase 131).** No CRITICAL issues. ~~E2E coverage reduced from 14 → 5 specs during rebuild (Phase 134 tracks expansion).~~ **RESOLVED (Phase 134).** E2E: 8 specs. ~~Lint warnings (126.2).~~ **RESOLVED (Phase 126.2).** ALL PM audit #65 findings RESOLVED.
27. PM audit #61/#63 architect findings ALL RESOLVED: AppSetting enum (Phase 127), transactions hardening (Phase 125.2), handleError sanitization (Phase 126.1), `as never` casts eliminated (120.4+120.5), shared Button (128.1+128.2), PageHead heading-level (129). ~~Remaining defense: 4 files missing `server-only` guard (Phase 131), stale TODO comments in ai-model-policy (Phase 132).~~ **ALL RESOLVED (Phases 131 + 132).**
28. PM audit #67 API error hardening COMPLETE: `checkoutPlan` try/catch (135 ✅), error response key standardization (136 ✅), `handleError` return type `never` (137 ✅), generate functions return typed objects (138 ✅). Lint 0 warnings (126.2 ✅). 3 new E2E specs (134 ✅). Admin query `.limit()` (140 ✅). FAQ admin-configurable (74.2 ✅). Landing/hero/about admin-configurable (104 ✅). 12 phases completed in one session.
29. ~~PM audit #67 SWOT: **CRITICAL finding** — `User.suspended` is never enforced in API routes.~~ **RESOLVED (Phase 141 COMPLETE).** Suspension is now enforced in all API routes. `resolveEntitlements` `isSuspended` param is now correctly passed. Triple-confirmed by Architect, Engineer, and PM. Phase 141 COMPLETE.
30. ~~**CRITICAL production bug — stream error on media generation.**~~ **RESOLVED (Phase 149 COMPLETE).** SSE heartbeat mechanism implemented with 12s interval, media lifecycle callbacks, and client timeout reset. Video generation (up to 180s) now works within 200s timeout window.
31. ~~**HIGH production bug — user deletion does not cascade RateLimitEntry or AdminAuditLog.**~~ **RESOLVED (Phase 150 COMPLETE).** Shared `deleteUserCascade()` utility handles full cascade. All 3 deletion paths updated.
32. ~~**HIGH feature gap — Library "Uploaded" tab missing.**~~ **RESOLVED (Phase 151 COMPLETE).** "Uploaded" tab added. `Upload` model with compound index. Upload records persisted on file upload.
33. **Future direction — PostgreSQL migration planned.** Migration to Supabase/PostgreSQL is a future strategic direction. Current MongoDB implementation should avoid over-investment in MongoDB-specific workarounds. Design data access patterns to be portable where practical. Not blocking current work.
34. ~~**CRITICAL production bug — payment checkout broken (PM audit #69, Phase 152).**~~ **RESOLVED (Phase 152 + Phase 157 COMPLETE).** Redirect fixed (Phase 152). Webhook schema mismatch TD-WEBHOOK-01 RESOLVED (Phase 157): `.strict()` → `.strip()`, unused `name` field removed, regression test added. Payment processing fully operational.
35. ~~**HIGH bug — admin settings hydration mismatch (PM audit #69, Phase 153).**~~ **RESOLVED (Phase 153 COMPLETE).** `getInitialActiveTabId()` removed. localStorage synced via `useEffect` after mount.
36. ~~**HIGH UX gap — suspended user messaging (PM audit #69, Phase 154).**~~ **RESOLVED (Phase 154 COMPLETE).** `isSuspended` prop added to both components. Suspension messaging with contact support CTA.
37. ~~**HIGH directive — remove all custom scrollbar CSS (PM audit #69, Phase 155).**~~ **RESOLVED (Phase 155 + 155.1 COMPLETE).** CSS class removed. All JSX class references removed. Zero `droplet-scrollbar` references in codebase.
38. ~~**CRITICAL production bug — Stripe webhook silently drops payment processing (PM audit #71, Phase 157).**~~ **RESOLVED (Phase 157 COMPLETE).** Root cause: `.strict()` vs `.strip()` on Zod schema + unused `name` field in checkout metadata. Fix: schema changed to `.strip()`, `name` field removed from metadata, regression test added for extra metadata tolerance. Triple-confirmed by Architect, Engineer, and PM. All 7 gates GREEN.
39. ~~**HIGH — SSE streaming catch/finally can throw on closed controller (PM audit #71, Phase 158).**~~ **RESOLVED (Phase 158 COMPLETE).** `writeStreamEvent` in catch and `controller.close()` in finally wrapped in try/catch. **However, owner STILL reports "stream ended unexpectedly" in production — root cause is infrastructure timeout, not catch/finally. See Phase 160.**
40. **CRITICAL — Stream error persists in production (Phase 160).** Owner still reports "The response stream ended unexpectedly" on media generation AND large text responses. Phases 149 + 158 are applied — the in-container error handling is structurally complete. Root causes identified (triple audit): (a) Missing `export const maxDuration` on `/api/openai` route — serverless function timeout kills the connection before media generation completes. (b) No heartbeat runs during text-only streaming — infrastructure idle timeouts can drop the connection. (c) Silent failure swallowing in catch blocks — no server-side logging when stream event writes fail.
41. **CRITICAL — Payment/transaction still not registering (Phase 161).** Owner still reports payment goes through Stripe but no Transaction in DB and user plan not updated. Code-level fixes (Phase 152 + Phase 157) are applied. Root causes identified (triple audit): (a) Stripe Dashboard webhook endpoint likely misconfigured for production. (b) **CRITICAL code bug:** Non-atomic Transaction/User update with incorrect idempotency — if `Transaction.create` succeeds but `User.findOneAndUpdate` fails, the idempotency check returns 200 "Already processed" on retry, permanently orphaning the user plan update. (c) `constructEvent` error is swallowed (actual error not logged). (d) `createTransaction` error details swallowed.
42. **HIGH — Admin promo text still hardcoded (Phase 162).** "Go Pro"/"Go Premium" and promo descriptions in `chat-sidebar-promo.tsx` are hardcoded. Should be admin-configurable. Note: plan NAMES (Lite/Pro/Premium) are TypeScript enum literals throughout the type system — making names themselves configurable requires a v2-level refactor and is NOT recommended now. Only DISPLAY TEXT should be extracted to admin settings.

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

**5 of 7 gates GREEN. Product Gate RED, Admin Gate YELLOW.** Two CRITICAL production bugs block release. Updated Architect audit (2026-03-30).

| Gate | Name              | Status | Notes                                                                                                                                                                                                                                                                                                                                   |
| ---- | ----------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A    | Contract Gate     | GREEN  | Billing, tier limits, Premium extras, model claims — all frozen and verified                                                                                                                                                                                                                                                            |
| B    | Architecture Gate | GREEN  | Entitlement resolver live, route/auth boundaries correct, storage guardrails enforced                                                                                                                                                                                                                                                   |
| C    | Product Gate      | RED    | 6 personas plan-gated, stop reasons working, trial access live. **BLOCKED: streaming broken on media gen (Phase 160), payment not registering (Phase 161)**                                                                                                                                                                             |
| D    | Admin Gate        | YELLOW | Users+transactions+usage+settings+website, audit trail, admin role enforced. Core admin-configurability delivered (FAQ 74.2, landing 104, stop msgs 107). **Remaining: promo/upgrade text still hardcoded (Phase 162)**                                                                                                                 |
| E    | Public Gate       | GREEN  | All 7 public routes accurate, legal content real, no obsolete trial messaging                                                                                                                                                                                                                                                           |
| F    | Validation Gate   | GREEN  | All 7 validation commands pass. Lint (0 errors, 0 warnings), knip (0 findings), TSC clean, unit (101 suites, 591 tests), E2E (8 specs), build passes. Coverage: 85/80/85/85. **Known issue:** pre-existing Button component test expects `btn-md` but component renders `btn-sm` — cosmetic test mismatch, not a functional regression. |

---

## 9. Current Execution Order

> Milestones 0—25 ALL COMPLETE. TDD testing rebuild finished (Phases 120.1—7). Phase 141 (suspended user enforcement) COMPLETE. Phase 149 (SSE heartbeat streaming fix) COMPLETE. Phases 150—155 ALL COMPLETE (PM audit #69 session). Phase 157 (Stripe webhook schema fix) COMPLETE. Phase 155.1 (scrollbar cleanup) COMPLETE. Phase 158 (SSE catch/finally hardening) COMPLETE. Phase 159 (button test fix) COMPLETE.
> **5 of 7 gates GREEN (Product RED, Admin YELLOW).** 101 unit test suites, 591 tests (all pass). E2E: 8 specs (49 tests). Zero `as never` casts.
> Coverage thresholds: 85/80/85/85. Node.js 24.12.0. Build passing. TSC clean. Lint: 0 errors, 0 warnings. Knip: 0 findings.
> Admin-configurability PARTIAL: core resolved (FAQ 74.2, landing 104, stop msgs 107, support email 74.1). **Remaining: promo/upgrade text still hardcoded (Phase 162).**
> **TWO CRITICAL production bugs STILL BROKEN:** Stream error on media gen (Phase 160). Payment not registering (Phase 161).

**Priority order (Architect audit — CRITICAL-first):**

1. **Phase 160 🔴 CRITICAL** — Fix stream error on media generation. Root causes verified by code audit: (a) Add `export const maxDuration = 300` to `/api/openai/route.tsx` — serverless platform kills function before media gen completes (confirmed: no `maxDuration` export exists). (b) Add periodic heartbeat during text-only streaming — currently heartbeat only runs during media generation callbacks, not during text chunk gaps where infrastructure idle timeout can kill the connection. (c) Add server-side error logging in streaming catch blocks — currently the outer catch in the SSE `start(controller)` has a nested `catch {}` that silently swallows errors, preventing debugging.
2. **Phase 161 🔴 CRITICAL** — Fix payment not registering after Stripe checkout. Root causes verified by code audit: (a) **Non-atomic Transaction/User update with broken idempotency** — if `Transaction.create` succeeds but `User.findOneAndUpdate` fails (or function crashes between them), the idempotency check (`Transaction.findOne({ stripeId: id })`) returns HTTP 200 "Already processed" on retry, permanently orphaning the user plan update. Fix: idempotency gate must verify BOTH Transaction existence AND User plan state, or wrap both operations atomically. (b) `createTransaction()` catch block logs "Failed to create transaction." but swallows the actual error object — impossible to diagnose failures. (c) `constructEvent` catch block logs "Invalid webhook signature." but discards the actual error — makes signature debugging impossible. (d) Verify Stripe Dashboard webhook endpoint URL matches production deployment URL exactly.
3. **Phase 162 HIGH** — Extract hardcoded promo/upgrade text from `chat-sidebar-promo.tsx` ("Go Pro"/"Go Premium" titles and descriptions) and `plan-promo.tsx` ("Unlock premium features with an upgrade!") to admin-configurable settings via `AppSetting` + `effective-*` resolver pattern.
4. **Phase 156 HIGH** — Add `server-only` guards to 4 constants files (plans, personas, faqs, stop-reasons)
5. **Phase 142 HIGH** — Add rate limiting to `/api/upload`, `/api/aws`, and `/api/download` endpoints
6. **Phase 143 MEDIUM** — Replace `as string` / `!` casts on env vars with runtime validation
7. **Phase 144 MEDIUM** — Admin config in-memory cache with 30s TTL
8. **Phase 145 MEDIUM** — Upload filename collision fix (`crypto.randomUUID()`)
9. **Phase 146 LOW** — Admin user detail transaction `.limit(50)`
10. **Phase 147 LOW** — Rename `.tsx` utility files to `.ts` where no JSX
11. **Phase 148 LOW** — Admin bulk operations partial-failure reporting

---

## 10. Explicitly Deferred From v1

- Yearly billing and yearly pricing discounts
- Multi-provider LLM routing
- Team or workspace accounts
- User-created custom personas
- Broad role systems beyond `client` and `admin`
- Stripe subscription mode (auto-renewal)
- Legal/nav/footer admin configurability (deferred v2)
- Supabase/PostgreSQL migration (future strategic direction — not blocking current MongoDB work)

---

## 11. Owner Directives (Consolidated — PM audit #57)

> Single canonical tracking table. Replaces all previous directive tables.

| #    | Directive                                         | Priority | Status                                                                                                                                                                                                                                                    |
| ---- | ------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OI1  | TDD rebuild ALL tests from scratch                | CRITICAL | COMPLETE. 591 tests (101 suites). 8 E2E specs. Zero `as never` casts. Coverage 85/80/85/85. Phases 120.1–120.7 ALL COMPLETE. TDD infrastructure, utilities, actions, routes, components, E2E all rebuilt from scratch. 3 new E2E specs added (Phase 134). |
| OI2  | NO hardcoded data — everything admin-configurable | CRITICAL | **PARTIAL.** Core done. Stop msgs (107) ✅. FAQ (74.2) ✅. Landing/hero/about (104) ✅. **Remaining: promo/upgrade text in sidebar and plan promo still hardcoded (Phase 162).**                                                                          |
| OI3  | RE-USE repetitive code                            | HIGH     | COMPLETE. TD-REUSE-01/02/03/04/05 all resolved. TD-REUSE-04 closed by Phase 106 (shared ChatApiResponse types).                                                                                                                                           |
| OI4  | WCAG 2.2 AA compliance                            | HIGH     | **COMPLETE.** All sub-phases delivered. Tabs (108) ✅, AvatarMenu (114) ✅. WCAG 2.2 AA FULLY COMPLETE.                                                                                                                                                   |
| OI5  | Components = data consumers                       | CRITICAL | COMPLETE. Phase 73.1 + 73.3. All components converted.                                                                                                                                                                                                    |
| OI6  | Reduce renders/leaks                              | CRITICAL | COMPLETE. AbortController (Phase 102). All useEffect cleanup verified.                                                                                                                                                                                    |
| OI7  | Server-side utilities                             | CRITICAL | COMPLETE. 50+ files with `import "server-only"` guards (Phase 84 + Phase 131).                                                                                                                                                                            |
| OI8  | User removal cascades                             | CRITICAL | **COMPLETE (Phase 150).** Full cascade: Clerk — Tasks — Transactions — UsageEvents — RateLimitEntries — Uploads — S3 — User. Shared `deleteUserCascade()` utility. All 3 deletion paths (self-delete, admin-delete, webhook) use shared utility.          |
| OI9  | `npm run knip` clean                              | HIGH     | CLEAN (0 findings). Phase 122 COMPLETE.                                                                                                                                                                                                                   |
| OI10 | Admin fully configurable                          | HIGH     | **PARTIAL.** Core operational. Stop msgs (107) ✅. FAQ (74.2) ✅. Landing/hero/about (104) ✅. **Remaining: promo/upgrade text hardcoded (Phase 162).**                                                                                                   |
| OI11 | Node.js 24.12.0 compatibility                     | CRITICAL | COMPLETE. Runtime confirmed. All 7 gates GREEN.                                                                                                                                                                                                           |
| OI12 | Deep techstack config audit                       | CRITICAL | COMPLETE. Phase 89 + 94 config hardening.                                                                                                                                                                                                                 |
| OI13 | Profile displays plan limits/usage                | HIGH     | COMPLETE. ProfileUsage with progress bars (Phase 66.1).                                                                                                                                                                                                   |
| OI14 | Admin panel design matches /app                   | HIGH     | COMPLETE. Phase 70.1 + 70.2 full alignment.                                                                                                                                                                                                               |
| OI15 | Admin shows usage/limits remained vs included     | MEDIUM   | COMPLETE. Phase 66.3 + 59.1 with progress bars + pagination (Phase 85).                                                                                                                                                                                   |
| OI16 | Fix merging leftovers and errors                  | CRITICAL | COMPLETE. Phase 124+125+126. Zero conflict markers in repo (verified PM audit #62 + #65).                                                                                                                                                                 |
| OI17 | Plans/prices/features configurable from admin     | HIGH     | **PARTIAL.** Core pricing, limits, models, personas, theme, currency, support email admin-configurable. Stop msgs (107) ✅. FAQ (74.2) ✅. Landing/hero/about (104) ✅. **Remaining: promo/upgrade text hardcoded (Phase 162).** OI2/OI10 overlap.        |

---

### Milestone 25 — Testing Infrastructure Rebuild & Config Hardening (Owner-Directed, 2026-03-21)

> **Status: COMPLETE** — TDD rebuild finished. 101 suites, 591 tests. 8 E2E specs. Coverage thresholds raised to 85/80/85/85. Zero `as never` casts. All 7 gates GREEN. Phases 120.1–120.7 ALL COMPLETE.

**Objective:** Rebuild the entire testing infrastructure from scratch with TDD discipline, achieve coverage gate enforcement, and close remaining E2E quality gaps.

**Dependencies:** Milestones 0–24 (all complete). Blocks A–F COMPLETE (archived to DONE.md).

**Completed blocks (archived):** Block A (P1 bug fixes), Block B (config hardening), Block C (unit test rebuild), Block D (E2E test rebuild), Block E (security guards), Block F (coverage & config tightening). Phases 88–103.4, 105, 109, 111.1, 112.1–112.2, 113.1–113.2, 115–117, 120.1, 121–125 all complete. See DONE.md for full phase records.

**Block G — TDD Full Rebuild (COMPLETE):**

1. **COMPLETE** — Phase 120.1: TDD test infrastructure built.
2. **COMPLETE** — Phase 120.2: All ~40 utility test files rebuilt (Batch A+B+C).
3. **COMPLETE** — Phase 120.3: All 4 server action test files rebuilt.
4. **COMPLETE** — Phase 127: AppSetting enum fix.
5. **COMPLETE** — Phase 128.1: Shared Button component + TDD tests.
6. **COMPLETE** — Phase 128.2: Button migration to shared component.
7. **COMPLETE** — Phase 106: Shared ChatApiResponse types.
8. **COMPLETE** — Phase 126.1: handleError sanitization.
9. **COMPLETE** — Phase 125.2: getAllTransactions hardening.
10. **COMPLETE** — Phase 130: Status-routes test fix.
11. **COMPLETE** — Phase 120.4: TDD API route test rebuild (openai split into 5 modules).
12. **COMPLETE** — Phase 120.5: TDD component test rebuild (24 component test files).
13. **COMPLETE** — Phase 120.6: TDD E2E test rebuild (5 specs, structural assertions).
14. **COMPLETE** — Phase 120.7: Coverage thresholds raised to 85/80/85/85.
15. **COMPLETE** — Phase 107: Stop-reason messages admin-configurable (107.1 resolver + 107.2 admin UI + 107.3 consumer wiring). TD-HARDCODE-01 RESOLVED.
16. **COMPLETE** — Phase 108: Tablist arrow-key navigation (WCAG TD-WCAG-05 RESOLVED).
17. **COMPLETE** — Phase 114: AvatarMenu keyboard navigation (WCAG TD-WCAG-07 RESOLVED).
18. **COMPLETE** — Phase 125.1: Schema explicit `strict: true` on User, Task, Transaction models.
19. **COMPLETE** — Phase 133: Streaming auto-timeout 120s safety net.
20. **COMPLETE** — Phase 131: Server-only guards on 4 additional utility files.
21. **COMPLETE** — Phase 132: Stale TODO comments resolved in ai-model-policy.ts.

**All Success Criteria MET:**

- ✅ TDD utility test rebuild from scratch — Phase 120.2 COMPLETE.
- ✅ TDD server action test rebuild — Phase 120.3 COMPLETE.
- ✅ TDD API route test rebuild — Phase 120.4 COMPLETE.
- ✅ TDD component test rebuild — Phase 120.5 COMPLETE.
- ✅ TDD E2E test rebuild — Phase 120.6 COMPLETE.
- ✅ Coverage thresholds raised post-rebuild — Phase 120.7 COMPLETE.
- ✅ handleError sanitization — Phase 126.1 COMPLETE.
- ✅ getAllTransactions hardening — Phase 125.2 COMPLETE.
- ✅ Status-routes test fix — Phase 130 COMPLETE.
- ✅ Button migration — Phase 128.2 COMPLETE.
- ✅ Extract shared types — Phase 106 COMPLETE.

---

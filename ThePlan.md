# Droplet ? Completion Plan

> Purpose: one execution document for finishing the SaaS without avoidable rework.
> Audience: Project Manager, Architect, and Senior Software Agents.
> Rule: this plan is based on verified repository state. If older docs disagree with code, code wins until this file is updated.
> Last verified: PM audit #110, 2026-04-10. V1.0 MVP RELEASED. Phase 217-A COMPLETE (Stripe schema + product setup). Phase 217-B COMPLETE (checkout mode switch + customer management). Phase 222 COMPLETE. 652 tests (106 suites), 0 failures. All gates GREEN. Prettier pinned to ~3.8.1. 0 critical issues.

---

## 1. Executive Judgment

Droplet is deployed to production with all 25 milestones complete. The TDD testing rebuild is done (106 suites, 649 tests, 8 E2E specs, 85/80/85/85 coverage). WCAG 2.2 AA is complete. Admin configurability (promo text, FAQ, landing, stop reasons, persona content) is done. Global error boundary is done. Brand rename (cellesseon → droplet) is complete. All post-release backlog items DONE (Phases 165.1, 146, 147, 148). jsdom ESM compatibility resolved (Phase 208). Zod/Zustand modernization DONE (Phases 29.1–29.5; 29.7 Zustand was already complete; 29.6 deferred). Sidebar restructure DONE (Phases 209–216): label renames, Library migration, Recent conditional, loading fallback, CSS transitions, toggle relocation, renameTask action, conversation dropdown, PersonaSelector move. CSS modular architecture DONE (Phase 218). Orphan cleanup DONE (Phase 219). **Phase 220 (useIsDesktop hook extraction) DONE** — 3 desktop media query copies consolidated into shared hook. **Phase 221 (shared layout/form CSS extraction) DONE** — 9 shared CSS classes (`.app-sidebar`, `.sidebar-backdrop`, `.app-header-bar`, `.app-header-inner`, `.sidebar-nav-link`, `.form-input`, `.form-field`, `.admin-label`, `.admin-form-surface`) extracted to `layout.css` + `forms.css`. 50+ inline Tailwind duplicates eliminated across 17 components. **Phase 222-A (shared SidebarShell) DONE** — slot-based composition component with render-prop slots (header/navigation/footer), type-safe `expandedWidth` prop, Zustand state, close-on-pathname, mobile backdrop. AdminSidebar and ChatSidebarShell refactored to thin domain wrappers. ~80 lines of duplicated sidebar logic eliminated. **Phase 222-B (shared AppHeader) DONE** — slot-based composition component with `as` prop for semantic element selection (`header`/`section`), `leftSlot`/`rightSlot` ReactNode props, default ToggleTheme + AvatarMenu. AdminLayoutShell and ChatHeader refactored to thin wrappers. Header duplication fully eliminated. Admin `gap-3` normalized to `gap-2` (intentional minor spacing delta accepted). **E2E fragile homepage heading FIXED** — `global.setup.ts` no longer hardcodes admin-configurable text (uses structural `h1` assertion). **Stripe recurring billing UNBLOCKED** — owner provided all required answers: grandfather existing one-time users until expiry then Lite, Monthly + Yearly billing (30% yearly discount), custom cancel UI (not Stripe Customer Portal). **TypeScript 6 / ESLint compatibility CLOSED** — no issues found (audit #103). **Phase 222-C (shared AppLayoutShell) DONE** — slot-based layout scaffold with sidebar/header/children slots, standardized skip-link, auto-mainId targeting. Admin (admin)/layout.tsx and chat (chat)/layout.tsx refactored to thin consumers. Duplicate skip link removed from admin layout. **Phase 222 COMPLETE** — entire shared layout initiative (SidebarShell + AppHeader + AppLayoutShell) delivered. Admin and chat layouts fully unified through 3 shared composition components. **jsdom pin MAINTAINED** — ESM TLA incompatibility persists in Vitest forks pool.

**Owner investigation results (2026-04-02, PM audit #84-B):**

1. **? C1 ? Video generation ? REMOVED.** Owner directive (2026-04-03): remove ALL video generation from the app. Both `sora-2` and `sora-2-pro` are deprecated. Phase 186-A DONE (58 files modified/deleted, all gates GREEN, 594 tests passing).

2. **? C2 ? Stripe payment ? RESOLVED.** Root cause: Stripe webhook endpoint was **disabled** in Stripe Dashboard. Owner re-enabled it. All env vars verified correct. Vercel log confirms HTTP 200 + plan update. Revenue flow operational.

3. **? C3 ? Facebook login ? CLOSED.** Owner removed Facebook login from product. No longer used.

**Phases completed since last plan update:**
Phase 178, 181, 182 ? DONE. Phase 183 (Stripe) ? RESOLVED (webhook was disabled). Phase 184 (Facebook) ? CLOSED (removed from product). Phase 185 (sora-2-pro removal) ? DONE. Phase 180.1 (homepage text extraction) ? DONE. Phase 186-A (video generation removal) ? DONE. Phase 186-B (token limits maximized) ? DONE. Phase 187-A (admin error boundary) ? DONE. Phase 187-B (Clerk webhook cascade order) ? DONE. Phase 187-C (audio player error recovery) ? DONE. Phase 187-D (download rate-limit key cleanup) ? DONE. Phase 143 (env var runtime validation) ? DONE. Phase 180.2 (chat display text extraction) ? DONE. Phase 180.3 (plans display text extraction) ? DONE. Phase 180.4 (currency symbol compliance) ? DONE. Phase 188 (PlanCard isIncluded fix) � DONE. Phase 189 (admin deletion protection) � DONE. Phase 190 (admin ADMIN display + unlimited) � DONE. Phase 191 (reusable FormInput) � DONE. Phase 192 (reusable PersonaSelector) � DONE. Phase 193 (reusable UsageMetricRow) � DONE. Phase 194 (TiptapEditor redesign) � DONE. Phase 195 (image vision presigned URLs) � DONE. Phase 196 (Zustand audio overlap fix) � DONE. Phase 197 (image lightbox) � DONE. Phase 198 (library upload previews) → DONE. Phase 199 (useActionState fix) → DONE. Phase 200 (admin suspension protection) → DONE.
Phase 202 (unit test PLAN_LIMITS fix) → DONE. Phase 203 (E2E contrast fix) → DONE. Phase 201 (avatar sync) → DONE. Phase 144 (admin config cache) → DONE.
Phase 204 (API route timeouts to max) → DONE. Phase 205 (sidebar live update) → DONE. Phase 206 (upload error propagation) → DONE. Phase 207 (upload magic byte validation) → DONE.
Phase 145 (upload filename collision prevention) → DONE. Phase 165 (checkout success DB polling) → DONE.
Phase 165.1 (plan-status route hardening) → DONE. Phase 146 (admin transaction limit) → DONE. Phase 147 (rename .tsx to .ts) → DONE. Phase 148 (bulk partial-failure reporting) → DONE. Phase 208 (jsdom ESM fix) → DONE. Phase 29.1–29.5 (Zod/Zustand modernization) → DONE.
Phase 209 (sidebar labels + Library migration) → DONE. Phase 210 (/app/personas route removal) → DONE. Phase 211 (Recent section conditional) → DONE. Phase 212 (sidebar loading fallback) → DONE. Phase 213 (sidebar smooth transitions) → DONE. Phase 214 (sidebar toggle relocation) → DONE. Phase 215.0 (renameTask server action) → DONE. Phase 215 (conversation dropdown menu) → DONE. Phase 216 (PersonaSelector move to ChatInput) → DONE.

---

## 2. Completed Work Summary

> **Milestones 0?25 ALL COMPLETE.** Detailed phase records archived in DONE.md.

Key deliverables: Next.js 16 App Router, Clerk auth + proxy route protection, Stripe checkout + webhooks, MongoDB persistence (Mongoose, strict mode, indexes), 6 personas with three-tier gating, streaming SSE chat, image/audio generation (OpenAI tools + S3 storage), AI model policy resolver, central entitlement resolver, admin control plane (users, transactions, usage, settings, website), 7 public marketing/legal routes, WCAG 2.2 AA compliance, TDD test suite (640 tests), E2E suite (49 tests, 8 specs), brand color palette v2, lime green accent, admin-configurable promo/FAQ/landing/stop-reason/persona content, global error boundary, user deletion cascade, rate limiting, Node.js 24.12.0, all config hardening, video generation removal (Phase 186-A), token limits maximized to near-maximum model capacity (Phase 186-B), admin error boundary (Phase 187-A), Clerk webhook cascade fix (Phase 187-B), audio player error recovery (Phase 187-C), env var runtime validation (Phase 143), all display text admin-configurable (Phases 180.2–180.4), download rate-limit cleanup (Phase 187-D), PlanCard isIncluded fix (Phase 188), admin deletion protection (Phase 189), admin ADMIN display + unlimited permissions (Phase 190), reusable FormInput/PersonaSelector/UsageMetricRow components (Phases 191–193), TiptapEditor WYSIWYG redesign (Phase 194), plan-status route hardening (Phase 165.1), admin transaction query limit (Phase 146), utility file extension cleanup (Phase 147), bulk operations partial-failure reporting (Phase 148), per-action Zod schemas for 13 admin actions + client response Zod validation (Phases 29.1–29.5).

Resolved production bugs: Audio playback (Phase 168), hydration mismatch (Phase 169), script tag warning (Phase 170), payment webhook schema (Phase 157/161), catch block documentation (Phase 167+167.2), test failures (Phase 171), cellesseon rename (Phase 172), debug text (Phase 173), dead files (Phase 174?175), download 206 (Phase 176), constant dedup (Phase 177), fake download icon (Phase 178), stream timeout budget (Phase 181 ? **confirmed working in production**), Stripe diagnostic hardening (Phase 182).

---

## 3. Verified Baseline (Architect Audit #109, 2026-04-09)

### Architecture Status ? SOUND. ALL GATES GREEN.

| Area                | Status | Evidence                                                                          |
| ------------------- | ------ | --------------------------------------------------------------------------------- |
| Route boundaries    | ?      | Clean `/app(.*)` + `/admin(.*)` proxy protection                                  |
| Server/client split | ?      | Server Components for pages, client for UX only                                   |
| Auth in all actions | ?      | All server actions + API routes verify auth                                       |
| Admin double-check  | ?      | All 15 admin functions use `requireAdminAccess`                                   |
| Schema strict mode  | ?      | All 9 Mongoose models have `strict: true`                                         |
| Index coverage      | ?      | 20+ indexed fields across all query-filtered cols                                 |
| maxDuration exports | ✓      | All 7 API routes at maxDuration=60 (Vercel Hobby ceiling)                         |
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
| Tests               | ✓      | 106 suites, 652 tests. 0 failures. All gates GREEN.                               |
| E2E                 | ?      | 8 specs, 49 tests                                                                 |
| Prettier            | ?      | Pinned to ~3.8.1. 66 files reformatted. Gate GREEN.                               |

### Issues Found by Audit #82?#84 ? Updated Status

| #   | Severity    | Issue                                                              | Status                                                                                |
| --- | ----------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| C1  | ? REMOVED   | Video generation removed from product entirely per owner directive | Owner directive: remove all video generation. Phase 186.                              |
| C2  | ? RESOLVED  | Stripe webhook ? payment processed, no transaction, no plan update | Root cause: webhook was disabled in Stripe Dashboard. Re-enabled. HTTP 200 confirmed. |
| C3  | ? CLOSED    | Facebook login ? "Feature Unavailable" error                       | Owner removed Facebook login from product.                                            |
| H4  | ? RESOLVED  | Fake download icon ? removed in Phase 178                          | Icon removed from `profile-billing.tsx`                                               |
| H6  | ? RESOLVED  | Audio player button permanently disabled after transient error     | Phase 187-C DONE. Error recovery implemented.                                         |
| M1  | ? CANCELLED | No video player error state (unlike audio player)                  | CANCELLED ? video-player being removed (Phase 186).                                   |
| M2  | ? RESOLVED  | ~8 hardcoded display strings across chat/profile components        | Phases 180.2, 180.3, 180.4 DONE. All strings admin-configurable.                      |
| M3  | ? RESOLVED  | Hardcoded persona IDs in homepage spotlight                        | Phase 180.1 DONE. Homepage spotlight admin-configurable.                              |

### Phase 173?184 Completion Status

| Phase | Task                                           | Status                 | Evidence                                                                                                           |
| ----- | ---------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------ |
| 173   | Remove debug text from chat-wrapper.tsx        | ? DONE                 | Grep confirms text removed                                                                                         |
| 174   | Delete theme-init.js + clean knip.json         | ? DONE                 | File deleted; knip.json cleaned; layout.tsx has inline script                                                      |
| 175   | Remove dead conversationEnded prop             | ? DONE                 | Prop removed from ChatBodyProps interface                                                                          |
| 176   | Fix download route 206 status                  | ? DONE                 | Now uses `response.ContentRange ? 206 : 200`                                                                       |
| 177   | Deduplicate STREAM_PROACTIVE_TIMEOUT_MESSAGE   | ? DONE                 | route.tsx imports from `@/constants/chat-stream`                                                                   |
| 178   | Fix fake download icon in profile-billing      | ? DONE                 | Icon removed from `profile-billing.tsx`                                                                            |
| 181   | Fix stream timeout budget miscalculation       | ? PRODUCTION-CONFIRMED | Owner tested ? proactive timeout fires correctly with clean msg                                                    |
| 182   | Stripe webhook diagnostic hardening            | ? CODE-COMPLETE        | `eventType` added to unhandled response body                                                                       |
| 183   | Stripe payment investigation (Vercel envs)     | ? RESOLVED             | Root cause: webhook disabled. Owner re-enabled. HTTP 200 confirmed.                                                |
| 184   | Facebook login investigation                   | ? CLOSED               | Owner removed Facebook login from product.                                                                         |
| 185   | Remove `sora-2-pro` from codebase              | ? DONE                 | Owner decision: `sora-2` for all plans including Premium.                                                          |
| 186-A | Remove all video generation from codebase      | ? DONE                 | 58 files modified/deleted. All gates GREEN. 594 tests passing.                                                     |
| 186-B | Increase token limits to near-maximum capacity | ? DONE                 | All 9 chat tiers updated. All gates GREEN.                                                                         |
| 180.1 | Homepage text extraction                       | ? DONE                 | Public display text extracted to admin config.                                                                     |
| 180.2 | Chat display text extraction                   | ? DONE                 | Chat display strings extracted to admin config.                                                                    |
| 180.3 | Plans display text extraction                  | ? DONE                 | Plans display strings extracted to admin config.                                                                   |
| 180.4 | Currency symbol compliance                     | ? DONE                 | Currency display uses admin-configurable values.                                                                   |
| 187-A | Add admin error boundary                       | ? DONE                 | Admin error.tsx added for production resilience.                                                                   |
| 187-B | Fix Clerk webhook cascade order                | ? DONE                 | Cascade deletion order corrected for reliability.                                                                  |
| 187-C | Fix audio player error recovery                | ? DONE                 | Error recovery implemented, button no longer stuck disabled.                                                       |
| 187-D | Download rate-limit key cleanup                | ? DONE                 | Rate-limit key cascade cleanup for download routes.                                                                |
| 143   | Env var runtime validation                     | ? DONE                 | All unsafe casts replaced with proper validation.                                                                  |
| 188   | Fix PlanCard isIncluded logic                  | ? DONE                 | uildPlans() uses limit !== 0. 3 new tests. 602 total.                                                              |
| 189   | Admin deletion protection                      | ? DONE                 | 5-layer protection: server + UI. deleteUser(), removeUserByAdmin(), bulkRemoveUsersAction(), profile UI, admin UI. |
| 190   | Admin ADMIN display + unlimited permissions    | ? DONE                 | plan-display.ts utility. ADMIN_PLAN_LABEL. Unlimited usage display.                                                |
| 191   | Reusable FormInput component                   | ? DONE                 | All input types, exported class constant, migrated across admin.                                                   |
| 192   | Reusable PersonaSelector component             | ? DONE                 | Extracted from chat-header.tsx. No dotted border. ARIA labels.                                                     |
| 193   | Reusable UsageMetricRow component              | ? DONE                 | Shared between profile + admin user detail. Unlimited + near-limit.                                                |
| 194   | TiptapEditor redesign                          | ? DONE                 | Full WYSIWYG: 10 toolbar actions, link/image mgmt, no base64.                                                      |
| 195   | Image vision presigned URL rewrite             | ✅ DONE                | S3 presigned URLs for OpenAI vision API. @aws-sdk/s3-request-presigner.                                            |
| 196   | Zustand audio overlap fix                      | ✅ DONE                | Global audio store, singleton playback, register/unregister.                                                       |
| 197   | Image lightbox                                 | ✅ DONE                | Native <dialog>, fullscreen overlay, download.                                                                     |
| 198   | Library upload previews                        | ✅ DONE                | Image thumbnails, file-type icons.                                                                                 |
| 199   | useActionState startTransition fix             | ✅ DONE                | formAction wrapped in startTransition.                                                                             |
| 200   | Admin suspension protection                    | ✅ DONE                | 3-layer defense: role check in toggle, admin filter in bulk, UI guard. 2 new tests. 617 total.                     |
| 202   | Fix 10 unit tests (PLAN_LIMITS alignment)      | ✅ DONE                | Tests match PLAN_LIMITS. `promoAdminLabel` → "ADMIN". 619 total.                                                   |
| 203   | Fix 3 E2E contrast failures                    | ✅ DONE                | `text-midnightBlue-900` on `bg-dustyBlue-500`. All E2E pass.                                                       |
| 201   | Avatar sync MongoDB→Clerk                      | ✅ DONE                | Non-blocking Clerk sync in updateUser. 2 tests.                                                                    |
| 144   | Admin config cache                             | ✅ DONE                | 30s TTL, in-flight dedupe, 8 effective-\*.ts wrapped. clearConfigCache on admin writes.                            |
| 217-A | Stripe schema + product setup                  | ✅ DONE                | User+Transaction model fields, indexes, types, admin-queries defaults, seed script, 3 new test files               |
| 204   | API route timeouts to max                      | ✅ DONE                | All 7 API routes at maxDuration=60 (Vercel Hobby ceiling).                                                         |
| 205   | Sidebar live update on new chat                | ✅ DONE                | router.refresh() with ref-based one-time guard. 5 call sites.                                                      |
| 206   | Upload error propagation + client validation   | ✅ DONE                | error.message propagation, narrowed accept, client MIME pre-validation.                                            |
| 207   | Upload magic byte validation                   | ✅ DONE                | JPEG/PNG/GIF/WebP signatures. Cross-match MIME. Blocks before S3 write. 11 tests.                                  |
| 145   | Upload filename collision prevention           | ✅ DONE                | `crypto.randomUUID()` replaces `Date.now()`. UUID-based S3 filenames.                                              |
| 165   | Checkout success page DB polling               | ✅ DONE                | Plan-status API + poller component + page integration. 10 new tests. 638 total.                                    |
| 165.1 | Plan-status route hardening                    | ✅ DONE                | `maxDuration=60` + rate limiting (30 req/60s). 429 with headers. 640 tests.                                        |
| 146   | Admin user detail transaction limit            | ✅ DONE                | `.limit(50)` on transaction query. Sort preserved.                                                                 |
| 147   | Rename `.tsx` utility files to `.ts`           | ✅ DONE                | 5 files renamed. No JSX content. All imports updated.                                                              |
| 148   | Bulk operations partial-failure reporting      | ✅ DONE                | All 5 bulk actions report skipped/failed/not-found counts. Per-user error isolation.                               |
| 208   | jsdom ESM compatibility fix                    | ✅ DONE                | jsdom pinned `~24.1.3`. ESM top-level await incompatibility resolved. 640 tests.                                   |
| 29.1  | Admin single-value actions Zod schemas         | ✅ DONE                | 4 actions converted to per-action Zod schemas with z.infer types.                                                  |
| 29.2  | Admin toggle/numeric actions Zod schemas       | ✅ DONE                | 3 actions converted to per-action Zod schemas.                                                                     |
| 29.3  | Admin bulk actions Zod schemas                 | ✅ DONE                | 6 bulk actions converted to direct Zod array schemas.                                                              |
| 29.4  | Admin helper cleanup + schema consolidation    | ✅ DONE                | getMultiStringField removed. requiredStringSchema consolidated to nonEmptyStringSchema.                            |
| 29.5  | Client API response Zod validation (poller)    | ✅ DONE                | Unsafe type assertion replaced with Zod safeParse on unknown payload.                                              |

### Ongoing Constraints

- **Vercel Hobby 60s timeout** ? Architecture limitation for media gen. Phase 181 proactive timeout works correctly (clean user message). With video removed, remaining media gen (images: 30?90s, audio: 15?60s) is closer to the 60s limit but not as severe. **Recommendation: upgrade to Vercel Pro ($20/mo) which raises maxDuration to 300s.**
- **Single-document conversation storage** ? `Task` model with `estimatedBytes` guardrails. Future risk, not current blocker.
- **Stripe billing migration in progress** — Checkout now uses `mode: "subscription"` (Phase 217-B DONE). Webhook expansion for subscription events (Phase 217-C) is next.

---

## 4. SWOT Analysis (Updated 2026-04-10, PM audit #110)

**Strengths:** Clean architecture, strong auth, comprehensive tests (652+49), central policy resolvers, WCAG 2.2 AA complete, durable usage counters, thorough user deletion cascade, zero lint/type/knip issues, correct webhook code structure, stream timeout confirmed in production (Phase 181), video generation cleanly removed (Phase 186-A), token limits maximized (Phase 186-B), admin error boundary (Phase 187-A), env var runtime validation (Phase 143), all display text admin-configurable (Phases 180.1–180.4), audio player error recovery (Phase 187-C), admin deletion protection with 5-layer defense (Phase 189), reusable component library: FormInput/PersonaSelector/UsageMetricRow (Phases 191–193), TiptapEditor WYSIWYG (Phase 194), plan-display utility for admin ADMIN label (Phase 190), admin suspension protection with symmetric 3-layer defense (Phase 200), avatar sync MongoDB→Clerk (Phase 201), admin config cache 30s TTL (Phase 144), full test baseline (652 tests, 0 failures), all API routes at Vercel Hobby ceiling (Phase 204), sidebar live-updates on new chat without browser refresh (Phase 205), upload error messages propagated to user with client pre-validation (Phase 206), upload magic byte validation prevents MIME spoofing (Phase 207), upload filenames collision-proof via UUID (Phase 145), checkout success page polls DB for webhook-delayed plan updates (Phase 165), plan-status route hardened with rate limiting and maxDuration (Phase 165.1), admin transaction query bounded (Phase 146), utility file extensions clean (Phase 147), bulk operations report partial failures for admin visibility (Phase 148), post-release active backlog fully cleared. Per-action Zod schemas for all 13 non-settings admin actions (Phases 29.1–29.3), shared nonEmptyStringSchema consolidation (Phase 29.4), client API response Zod validation replacing unsafe type assertions (Phase 29.5). Sidebar restructured with Suspense loading, conditional Recent rendering, CSS transitions, Zustand-driven toggle state (Phases 209–214). Conversation dropdown menu with full ARIA compliance, keyboard navigation, inline rename (Phase 215). PersonaSelector moved to ChatInput for better UX flow (Phase 216). `renameTask` server action with Zod validation, auth, ownership enforcement (Phase 215.0). `/app/personas` route removed with redirect (Phase 210). CSS modular architecture complete with 12 files under `src/styles/` (Phase 218). Orphan cleanup complete — zero dead code, no duplicate types (Phase 219). **Shared `useIsDesktop()` hook eliminates 3 duplicate media query implementations (Phase 220).** TypeScript 6 + ESLint 10 + eslint-config-next 16 fully compatible — no issues (audit #103). **Shared layout/form CSS classes eliminate 50+ inline Tailwind duplicates across admin/chat (Phase 221).** 9 classes in 2 files (`layout.css`, `forms.css`), zero duplication. **Shared `SidebarShell` component eliminates sidebar shell duplication between admin and chat (Phase 222-A).** Type-safe slot API with render-prop pattern. **Shared `AppHeader` component eliminates header duplication between admin and chat (Phase 222-B).** Type-safe `as` prop, ReactNode slot composition, centralized ToggleTheme + AvatarMenu defaults. E2E fragile homepage heading resolved — structural assertion replaces content-dependent check. **Shared AppLayoutShell component completes layout unification between admin and chat (Phase 222-C).** Slot-based layout scaffold with skip-link standardization, flexible mainId targeting. **Phase 222 COMPLETE** — entire shared layout chain (SidebarShell + AppHeader + AppLayoutShell) delivered. Both admin and chat layouts are now thin domain wrappers composing 3 shared components. Zero remaining layout-level duplication. **Phase 217-A (Stripe schema + product setup) DONE** — additive schema changes for recurring billing foundation. **Phase 217-B (checkout mode switch + customer management) DONE** — `mode: "subscription"`, Stripe Customer management, persistent Price IDs, yearly billing, `subscription_data.metadata`. 652 tests (up from 649), 106 suites.

**Weaknesses:** CSS duplication: `text-sm text-midnightBlue-600 dark:text-lavenderHaze-600` pattern appears 20+ times across 12 component files — needs CSS class extraction (Phase 218-B scoped). `updateAdminSettingAction` still uses per-field Zod helper pattern (deferred — 15+ branches, low marginal value, Zod enforced under the hood). No dedicated unit tests for sidebar dropdown menu interaction patterns (keyboard/outside-click/blur race). `FORM_INPUT_CONTROL_CLASS` JS constant and `.form-input` CSS class coexist with slightly different border colors — minor visual inconsistency (low priority). Admin sidebar does not persist collapsed state to localStorage (chat does via `droplet-sidebar-collapsed` key). Missing unit tests for pure billing functions: `resolveStripePriceId()`, `resolveExpectedCheckoutAmount()`, `normalizeYearlyDiscount()` in `effective-stripe-billing-config.ts` (Phase 217-G will cover). Seed script requires manual run per environment. 20+ `catch {}` blocks across production code without explanatory comments (most are URL parsing with obvious intent — low severity, rule compliance gap).

**Opportunities:** Vercel Pro upgrade ($20/mo) for 300s maxDuration. Persona-aware media prompts (Phase 26.x — low effort, product differentiation). **Stripe subscription billing migration well underway** — checkout mode switched to subscription (217-B DONE), webhook expansion (217-C) is the highest-risk remaining phase. **Yearly billing with 30% discount** — revenue optimization and reduced churn. CSS component class extraction (Phase 218-B) — quick win for maintainability.

**Threats:** Single-document growth risk (Task model). Vercel Hobby 60s timeout remains architecture constraint for media generation edge cases. jsdom pinned to 24.x — older version, lacks newer CSS/DOM APIs; monitor Vitest ESM environment loading progress for future upgrade. **Stripe webhook handler complexity** — Phase 217-C triples webhook handler complexity with 5 event types, each requiring idempotency checks. This is the highest-risk remaining billing work. Custom cancellation edge cases (Phase 217-D). **E2E Clerk FAPI connectivity flake** — Firefox/WebKit affected by transient Clerk Testing API timeouts. Not a code bug.

---

## 5. Release Gates

| Gate | Name            | Status | Notes                                                                                                           |
| ---- | --------------- | ------ | --------------------------------------------------------------------------------------------------------------- |
| A    | Contract Gate   | GREEN  | Billing, tier limits, Premium extras ? all frozen and verified                                                  |
| B    | Architecture    | GREEN  | Phase 181 confirmed. Stripe RESOLVED. Video generation removed from product.                                    |
| C    | Product Gate    | GREEN  | All display strings admin-configurable. Video removed. Stripe + Facebook resolved.                              |
| D    | Admin Gate      | GREEN  | Admin config complete. Error boundary added (Phase 187-A). All strings admin-configurable.                      |
| E    | Public Gate     | GREEN  | All 7 public routes accurate, legal content real, no obsolete trial messaging                                   |
| F    | Validation Gate | GREEN  | 652 tests (106 suites), lint 0/0, TSC clean, knip 0, E2E 49 tests, coverage 85/80/85/85. Prettier pinned ~3.8.1 |

---

## 6. Current Execution Order

> All critical issues RESOLVED. All v1.0 pre-release phases DONE. **V1.0 MVP RELEASED.** Phases 143–216. 0 critical issues. **Phase 29.x COMPLETE — Zod modernization done (Phases 29.1–29.5). Zustand audit complete (no changes needed). Sidebar restructure COMPLETE (Phases 209–216).**

### Confirmed Working

- **✅ Phase 209** — Sidebar label renames + Library link migration. DONE. Home/Personas/Library. Avatar menu cleaned.
- **✅ Phase 210** — Remove `/app/personas` route. DONE. Route deleted, Next.js redirect added, admin revalidation updated.
- **✅ Phase 211** — Sidebar Recent section conditional on open state. DONE.
- **✅ Phase 212** — Sidebar loading fallback with Suspense boundary. DONE. Skeleton + LoadingBubbles.
- **✅ Phase 213** — Sidebar smooth CSS transitions. DONE. duration-300 on open/collapse.
- **✅ Phase 214** — Sidebar toggle moved to SidebarHead. DONE. Mobile toggle retained in ChatHeader.
- **✅ Phase 215.0** — `renameTask` server action. DONE. Zod schema, auth, ownership, atomic update. 3 tests.
- **✅ Phase 215** — Conversation dropdown menu (Rename + Delete). DONE. Full ARIA, keyboard nav, ConfirmationModal.
- **✅ Phase 216** — PersonaSelector moved from ChatHeader to ChatInput. DONE. Disable logic preserved.
- **✅ Phase 222-A** — Shared `SidebarShell` component. DONE (PM audit #105). Slot-based render-prop composition. AdminSidebar + ChatSidebarShell refactored. E2E fragile heading fixed.
- **✅ Phase 222-B** — Shared `AppHeader` component. DONE (PM audit #106). Slot-based composition with `as` prop (`header`/`section`), `leftSlot`/`rightSlot` ReactNode slots, default ToggleTheme + AvatarMenu. AdminLayoutShell and ChatHeader refactored. Admin `gap-3` normalized to `gap-2`.
- **✅ Phase 222-C** — Shared `AppLayoutShell` component. DONE (PM audit #108). Slot-based layout scaffold with sidebar/header/children slots, standardized skip-link, `mainId` targeting. Admin and chat layouts refactored to thin consumers. 2 unit tests. 649 tests total.
- **✅ Phase 221** — Shared layout/form CSS extraction. DONE. 9 classes, 2 CSS files, 17 components migrated.
- **✅ Phase 218** — CSS modular architecture. DONE. 12 modular files under `src/styles/`. Zero visual changes.
- **✅ Phase 217-B** — Checkout mode switch + Customer management. DONE (PM audit #110). `getOrCreateStripeCustomer()`, `mode: "subscription"`, persistent Price IDs, yearly billing option. 652 tests.
- **✅ Phase 219** — Orphan cleanup. DONE. `route-group-layout.tsx` deleted, `LegalSection` deduped, prompt file deleted.
- **✅ Phase 208** — jsdom ESM compatibility fix. DONE. Pinned `~24.1.3`. 640 tests passing.
- **✅ Phase 29.1** — Admin single-value actions Zod schemas. DONE. 4 actions with per-action schemas.
- **✅ Phase 29.2** — Admin toggle/numeric actions Zod schemas. DONE. 3 actions.
- **✅ Phase 29.3** — Admin bulk actions Zod schemas. DONE. 6 bulk actions.
- **✅ Phase 29.4** — Admin helper cleanup + schema consolidation. DONE. getMultiStringField removed.
- **✅ Phase 29.5** — Client API response Zod validation. DONE. Poller type assertion removed.
- **✅ Phase 165.1** — Plan-status route hardening. DONE. `maxDuration=60` + rate limiting (30 req/60s).
- **✅ Phase 146** — Admin user detail transaction limit. DONE. `.limit(50)`.
- **✅ Phase 147** — Rename `.tsx` utility files to `.ts`. DONE. 5 files renamed.
- **✅ Phase 148** — Bulk operations partial-failure reporting. DONE. All 5 bulk actions.
- **✅ Phase 165** — Checkout success page DB polling. DONE. Plan-status API + poller + page integration. 10 new tests.
- **✅ Phase 145** — Upload filename collision prevention. DONE. `crypto.randomUUID()` replaces `Date.now()`.
- **✅ Phase 207** — Upload magic byte validation. DONE. JPEG/PNG/GIF/WebP signatures. 11 tests.
- **✅ Phase 206** — Upload error propagation + client validation. DONE.
- **✅ Phase 205** — Sidebar live update on new chat. DONE.
- **✅ Phase 204** — API route timeouts to max. DONE. All 7 routes at maxDuration=60.
- **✅ Phase 200** — Admin suspension protection. DONE. Symmetric 3-layer defense matching Phase 189.
- **✅ Phase 202** — Unit test PLAN_LIMITS alignment. DONE. 619 tests, 0 failures.
- **✅ Phase 203** — E2E contrast fix. DONE. `text-midnightBlue-900` on badges.
- **✅ Phase 201** — Avatar sync MongoDB→Clerk. DONE. Non-blocking Clerk sync.
- **✅ Phase 144** — Admin config cache. DONE. 30s TTL, in-flight dedupe, 8 resolvers wrapped.
- **✅ Phase 195** — Image vision presigned URL rewrite. DONE.
- **✅ Phase 196** — Zustand audio overlap fix. DONE.
- **✅ Phase 197** — Image lightbox. DONE.
- **✅ Phase 198** — Library upload previews. DONE.
- **✅ Phase 199** — useActionState startTransition fix. DONE.
- **? Phase 189** � Admin deletion protection. DONE. 5-layer defense.
- **? Phase 190** � Admin ADMIN display + unlimited permissions. DONE.
- **? Phase 191** � Reusable FormInput component. DONE.
- **? Phase 192** � Reusable PersonaSelector component. DONE.
- **? Phase 193** � Reusable UsageMetricRow component. DONE.
- **? Phase 194** � TiptapEditor redesign. DONE.
- **? Phase 188** � PlanCard isIncluded fix. DONE. 602 tests.
- **? Phase 181** � Stream timeout budget fix. PRODUCTION-CONFIRMED.

### Post-Release Backlog

> Phase 29.x COMPLETE (PM audit #97, 2026-04-06). Phases 29.1–29.5 DONE. Phase 29.6 DEFERRED. Phase 29.7 (Zustand) was already complete — no changes needed.

### Post-Release Active

> PM audit #110 (2026-04-10). Sidebar restructure COMPLETE (Phases 209–216). Phase 218 COMPLETE (CSS modular architecture). Phase 219 COMPLETE (orphan cleanup). **Phase 220 COMPLETE (useIsDesktop hook).** **Phase 221 COMPLETE (shared layout/form CSS).** **Phase 222-A COMPLETE (SidebarShell).** **Phase 222-B COMPLETE (AppHeader).** **Phase 222 COMPLETE** (all sub-phases: 222-A SidebarShell, 222-B AppHeader, 222-C AppLayoutShell). **Stripe recurring billing UNBLOCKED** (Phases 217-A–G). Phase 217-A COMPLETE. Phase 217-B COMPLETE. Phase 217-C NEXT.

#### CSS Modular Architecture (Phase 218) — COMPLETE

> Phase 218 DONE (PM audit #101). See DONE.md for detailed completion record.

#### Sidebar & Navigation Restructure (Phases 209–216) — COMPLETE

All phases DONE. See DONE.md for detailed records.

#### Codebase Cleanup & Shared Layout (Phases 219–222) — COMPLETE

> Owner directives OI53–OI57 (PM audit #101). DX/maintainability improvements. Shared layout unification between admin and chat.

- **✅ Phase 219** — Orphan cleanup. DONE (PM audit #102). Deleted `route-group-layout.tsx`, cleaned `knip.json`, deduplicated `LegalSection` to `legal-shared.ts`, deleted obsolete prompt file. All gates GREEN.

- **✅ Phase 220** — Extract `useIsDesktop()` hook. DONE (PM audit #103). Consolidated 3 separate `useSyncExternalStore` + `window.matchMedia("(min-width: 1024px)")` implementations into single shared hook at `src/lib/hooks/use-is-desktop.ts`. Replaced in `admin-layout-shell.tsx`, `chat-sidebar-shell.tsx`, `sidebar-head.tsx`. All gates GREEN. Playwright verified desktop + mobile.

- **✅ Phase 221** — Extract shared layout/form CSS classes. DONE (PM audit #104). Created `src/styles/components/layout.css` (`.app-sidebar`, `.sidebar-backdrop`, `.app-header-bar`, `.app-header-inner`, `.sidebar-nav-link`) and `src/styles/components/forms.css` (`.form-input`, `.form-field`, `.admin-label`, `.admin-form-surface`). 9 classes total, 50+ inline Tailwind duplicates eliminated, 17 components migrated. All gates GREEN.

- **✅ Phase 222** — Shared layout components COMPLETE (PM audit #108). All 3 sub-phases delivered:
  - **✅ 222-A** — `SidebarShell` shared component (DONE, PM audit #105)
  - **✅ 222-B** — `AppHeader` shared component (DONE, PM audit #106)
  - **✅ 222-C** — `AppLayoutShell` integration (DONE, PM audit #108). Admin + chat layouts unified through 3 shared composition components. Zero remaining layout duplication.

#### Stripe Recurring Payment (Phases 217-A through 217-G) — UNBLOCKED

> Owner directive OI51. HIGH RISK — billing architecture migration. **Owner answers received (PM audit #103):** (1) Grandfather existing one-time users until expiry, then revert to Lite. (2) Both Monthly and Yearly billing (30% yearly discount). (3) Custom cancel UI (NOT Stripe Customer Portal). (4) Refactor plans and add admin edit capabilities.

- **✅ Phase 217-A** — Schema + Stripe Product setup. DONE (PM audit #108). User model: stripeCustomerId (unique/sparse), stripeSubscriptionId (indexed), subscriptionStatus (indexed). Transaction model: type enum + stripeInvoiceId. admin-queries defaults. Seed script. 3 new test files. 649 tests total.
- **✅ Phase 217-B** — Checkout mode switch + Stripe Customer management. DONE (PM audit #110). `getOrCreateStripeCustomer()` utility, `mode: "subscription"`, persistent Price IDs, yearly billing, `subscription_data.metadata`. 652 tests total.
- **Phase 217-C** — Webhook expansion for subscription events. Handle `invoice.paid` (renewal transaction + usage counter reset), `invoice.payment_failed` (mark past_due), `customer.subscription.updated` (plan changes), `customer.subscription.deleted` (revert to Lite). Each handler with Zod schema + idempotency. **Dependencies:** Phase 217-B. **Effort:** ~2h. **Risk:** High.
- **Phase 217-D** — Custom cancellation flow. `cancelSubscriptionAction()` server action calling `stripe.subscriptions.update(id, { cancel_at_period_end: true })`. Profile subscription status UI: active, canceling, past_due states. ConfirmationModal before cancel. Reactivation path optional. **Dependencies:** Phase 217-C. **Effort:** ~1h. **Risk:** Medium.
- **Phase 217-E** — Yearly billing UI + pricing display. Plan cards show Monthly/Yearly toggle. Yearly prices with 30% discount display. Checkout routes yearly price IDs. Admin-configurable yearly discount percentage. **Dependencies:** Phase 217-B. **Effort:** ~1h. **Risk:** Medium.
- **Phase 217-F** — Admin Stripe settings. Admin can edit Stripe Price IDs, yearly discount. AppSetting keys: `admin.stripePriceIds`, `admin.yearlyDiscount`. New branch in `updateAdminSettingAction`. **Dependencies:** Phase 217-E. **Effort:** ~30min. **Risk:** Low.
- **Phase 217-G** — Tests + doc updates + grandfathering verification. 30+ new unit tests (webhook events, cancellation, yearly pricing). E2E billing flow update. SPEC.md + README.md + AGENTS.md updates. Verify grandfathering: existing one-time users untouched until expiry. **Dependencies:** All preceding 217 phases. **Effort:** ~2h. **Risk:** Low.

### Deferred / ON HOLD

1. **Phase 29.6** — updateAdminSettingAction Zod schema map. DEFERRED (17 branches, working correctly, low marginal value — current helper pattern validates with Zod under the hood). Revisit only if branch count exceeds ~25 or bugs emerge.
2. **Phase 26.x** — Persona-aware media prompts. APPROVED. Proceed after Phase 217 Stripe billing. Low effort (~60-80 lines, 4 files). Product differentiation improvement.
3. **Legal/nav/footer admin configurability** — Deferred to v2. Legal text rarely changes, nav is structural, footer changes ~yearly. Minimal value.
4. **TypeScript 6 / @typescript-eslint compatibility** — **CLOSED** (audit #103). TypeScript 6.0.2, ESLint 10.x, eslint-config-next 16.x, @typescript-eslint 8.58.1 (transitive). All gates pass. No issues.
5. **jsdom upgrade** — **PIN MAINTAINED** (audit #103). Pinned to `~24.1.3`. ESM top-level await incompatibility persists in Vitest forks pool with jsdom 25+. Zero negative impact from pin. Monitor Vitest changelog.

---

## 7. Owner Directives Status

| #    | Directive                                                               | Status                                                                                                                                                          |
| ---- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- | ---- | ---------------------------- | ----------------------------------------------------------------------------- |
| OI1  | TDD rebuild ALL tests                                                   | ? COMPLETE. 594 tests, 99 suites.                                                                                                                               |
| OI2  | No hardcoded data ? admin-configurable                                  | ? COMPLETE. All display strings extracted to admin config (Phases 180.1?180.4).                                                                                 |
| OI3  | Reuse repetitive code                                                   | ? COMPLETE.                                                                                                                                                     |
| OI4  | WCAG 2.2 AA compliance                                                  | ? COMPLETE.                                                                                                                                                     |
| OI5  | Components = data consumers                                             | ? COMPLETE.                                                                                                                                                     |
| OI6  | Reduce renders/leaks                                                    | ? COMPLETE.                                                                                                                                                     |
| OI7  | Server-side utilities                                                   | ? COMPLETE. 50+ server-only guards.                                                                                                                             |
| OI8  | User removal cascades                                                   | ? COMPLETE. Shared `deleteUserCascade()`.                                                                                                                       |
| OI9  | Knip clean                                                              | ? COMPLETE (0 findings).                                                                                                                                        |
| OI10 | Admin fully configurable                                                | ? COMPLETE. All display strings admin-configurable (Phases 180.1?180.4).                                                                                        |
| OI11 | Node.js 24.12.0                                                         | ? COMPLETE.                                                                                                                                                     |
| OI12 | Deep techstack config audit                                             | ? COMPLETE.                                                                                                                                                     |
| OI13 | Profile displays plan limits/usage                                      | ? COMPLETE.                                                                                                                                                     |
| OI14 | Admin panel design matches /app                                         | ? COMPLETE.                                                                                                                                                     |
| OI15 | Admin shows usage/limits                                                | ? COMPLETE.                                                                                                                                                     |
| OI16 | Fix merging leftovers                                                   | ? COMPLETE.                                                                                                                                                     |
| OI17 | Plans/prices/features configurable                                      | ? COMPLETE (core).                                                                                                                                              |
| OI18 | `cellesseon` ? `droplet` rename                                         | ? COMPLETE. All references resolved.                                                                                                                            |
| OI19 | Fix stream error on media gen                                           | ? PRODUCTION-CONFIRMED. Phase 181 proactive timeout works. Timeout is architecture limitation (Vercel Hobby 60s).                                               |
| OI20 | Fix payment transaction registration                                    | ? RESOLVED. Root cause: Stripe webhook endpoint was disabled in Stripe Dashboard. Owner re-enabled ? confirmed working (HTTP 200).                              |
| OI21 | Fix Facebook login                                                      | ? CLOSED. Owner removed Facebook login from product entirely.                                                                                                   |
| OI22 | Remove all video generation                                             | ? COMPLETE. Phase 186-A DONE. 58 files modified/deleted. All gates GREEN.                                                                                       |
| OI23 | Increase token limits to maximum                                        | ? COMPLETE. Phase 186-B DONE. All 9 chat tiers updated to near-maximum model capacity.                                                                          |
| OI24 | V1.0 MVP pre-release task list                                          | ? COMPLETE. All 8 pre-release phases DONE (187-A/B/C/D, 143, 180.2/3/4).                                                                                        |     | OI25 | Env vars validated in Vercel | ? ACKNOWLEDGED. `requireEnv()` kept as defense-in-depth for local dev and CI. |
| OI26 | PlanCard isIncluded bug                                                 | ? COMPLETE. Phase 188 DONE. `buildPlans()` uses `limit !== 0`. 602 tests.                                                                                       |
| OI27 | App is now released                                                     | ? V1.0 MVP RELEASED. Post-release backlog active.                                                                                                               |
| OI28 | Admin cannot be deleted                                                 | ? COMPLETE. Phase 189 DONE. 5-layer protection (server + UI).                                                                                                   |
| OI29 | Admin unlimited + "ADMIN" display                                       | ? COMPLETE. Phase 190 DONE. plan-display.ts utility.                                                                                                            |
| OI30 | Reusable input component                                                | ? COMPLETE. Phase 191 DONE. FormInput with all types + exported class.                                                                                          |
| OI31 | Persona selector reusable                                               | ? COMPLETE. Phase 192 DONE. Extracted, validated, consistent styling.                                                                                           |
| OI32 | UsageMetricRow reusable                                                 | ? COMPLETE. Phase 193 DONE. Shared between profile and admin.                                                                                                   |
| OI33 | TiptapEditor redesign                                                   | ? COMPLETE. Phase 194 DONE. Full WYSIWYG toolbar.                                                                                                               |
| OI34 | Image upload describe error                                             | ✅ COMPLETE. Phase 195 DONE. S3 presigned URLs for OpenAI vision API.                                                                                           |
| OI35 | Audio player overlap fix                                                | ✅ COMPLETE. Phase 196 DONE. Zustand global audio store, singleton playback.                                                                                    |
| OI36 | Image lightbox for generated images                                     | ✅ COMPLETE. Phase 197 DONE. Native <dialog>, fullscreen overlay, download.                                                                                     |
| OI37 | Library uploaded tab visual previews                                    | ✅ COMPLETE. Phase 198 DONE. Image thumbnails + file-type icons.                                                                                                |
| OI38 | useActionState console warning                                          | ✅ COMPLETE. Phase 199 DONE. formAction wrapped in startTransition.                                                                                             |
| OI39 | Admin suspension protection gap                                         | ✅ COMPLETE. Phase 200 DONE. Symmetric 3-layer protection matching Phase 189.                                                                                   |
| OI40 | Avatar sync MongoDB↔Clerk                                               | ✅ COMPLETE. Phase 201 DONE. Non-blocking Clerk sync in updateUser.                                                                                             |
| OI41 | API route timeouts must be max                                          | ✅ COMPLETE. Phase 204 DONE. All 7 routes at maxDuration=60 (Vercel Hobby ceiling).                                                                             |
| OI42 | New chat not appearing in sidebar                                       | ✅ COMPLETE. Phase 205 DONE. router.refresh() with ref-based one-time guard. 5 call sites.                                                                      |
| OI43 | Image upload error messages generic                                     | ✅ COMPLETE. Phase 206 DONE. error.message propagation + narrowed accept + client pre-validation.                                                               |
| OI44 | Upload file sanitization security                                       | ✅ COMPLETE. Phase 207 DONE. Magic byte validation for JPEG/PNG/GIF/WebP. Defense-in-depth.                                                                     |
| OI45 | Sidebar UI improvements (loader, hide recent, transitions, toggle move) | ✅ COMPLETE. Phases 211–214 DONE.                                                                                                                               |
| OI46 | Rename "Chat Dashboard" → "Home", "New Conversation" → "Personas"       | ✅ COMPLETE. Phase 209 DONE.                                                                                                                                    |
| OI47 | Remove `/app/personas` route (duplicate of `/app/new`)                  | ✅ COMPLETE. Phase 210 DONE. Next.js redirect in place.                                                                                                         |
| OI48 | Library link moves to sidebar, removed from avatar menu                 | ✅ COMPLETE. Phase 209 DONE.                                                                                                                                    |
| OI49 | Conversation dropdown menu with Rename + Delete                         | ✅ COMPLETE. Phase 215 DONE. Full ARIA + keyboard nav. renameTask action (Phase 215.0).                                                                         |
| OI50 | PersonaSelector moves from ChatHeader to ChatInput                      | ✅ COMPLETE. Phase 216 DONE.                                                                                                                                    |
| OI51 | Stripe recurring payment (monthly + yearly auto-renewal)                | ⏳ ACTIVE. UNBLOCKED. Owner answers: grandfather until expiry→Lite, Monthly+Yearly (30% yearly discount), custom cancel UI (not Stripe Portal). Phases 217-A–G. |
| OI52 | Tailwind CSS modular architecture (`src/styles/` folder)                | ✅ COMPLETE. Phase 218 DONE. 12 modular files under `src/styles/`. Zero visual changes.                                                                         |
| OI53 | Orphan cleanup — dead code, duplicate types, obsolete artifacts         | ✅ COMPLETE. Phase 219 DONE. `RouteGroupLayout` deleted, `LegalSection` deduped, prompt file deleted. All gates GREEN.                                          |
| OI54 | Shared admin/chat layout — unify sidebar + header + main wrappers       | ✅ COMPLETE. Phase 222 DONE (all sub-phases: 222-A SidebarShell, 222-B AppHeader, 222-C AppLayoutShell). Admin + chat layouts fully unified.                    |
| OI55 | Extract CSS layout classes — sidebar, header, nav, form input to styles | ✅ COMPLETE. Phase 221 DONE. 9 shared classes in `layout.css` + `forms.css`. 50+ inline duplicates eliminated.                                                  |
| OI56 | Extract `useIsDesktop()` hook — consolidate 3 media query copies        | ✅ COMPLETE. Phase 220 DONE. Single shared hook in `src/lib/hooks/use-is-desktop.ts`.                                                                           |
| OI57 | Reuse styles, functions, utilities, components across admin/chat        | ✅ COMPLETE. Phases 219–222 ALL DONE. Orphan cleanup, shared hook, shared CSS, shared layout components.                                                        |
| OI58 | Resolve persona-aware media prompts                                     | 🆕 NEW. Phase 26.x. Image/audio prompts not persona-aware. Proceed after Phase 217 Stripe billing.                                                              |
| OI59 | Resolve TypeScript 6 / ESLint compatibility question                    | ✅ CLOSED (audit #103). No compatibility issues. All gates pass. No action required.                                                                            |
| OI60 | Resolve jsdom upgrade question                                          | ✅ CLOSED (audit #103). Keep pinned to ~24.1.3. ESM TLA incompatibility persists. No negative impact.                                                           |
| OI61 | Explain token limits by plan and task class                             | ✅ ANSWERED (audit #103). Dual-purpose: technical model limits + business cost/quality differentiation. See SPEC.md §8.4.                                       |

---

## 8. Target Release Contract

> Full product specification in `SPEC.md`. Key rules here for reference.

### Non-negotiable product rules

1. Account required for chat ? no anonymous usage
2. Lite is permanent and free ? no expiry
3. Personas are plan-gated (Lite: 2 full + 4 trial, Pro: 5 full + 1 trial, Premium: all 6 full)
4. Pro = $19, Premium = $39
5. Lite limits: 10 conv/day, 10 prompts/conv, 1 img/mo, 1 audio/mo
6. Conversations end with stop reason + next-action when limits hit
7. Users can only access their own data
8. Admin routes under `/admin/*` protected at proxy + server level
9. Admin role = full permissions, no limitations
10. All features (image, audio) available in all plans ? differentiated by quantity limits

### Tier contract

| Tier    | Price | Chat Model            | Key Limits                                         |
| ------- | ----- | --------------------- | -------------------------------------------------- |
| Lite    | Free  | `gpt-4o-mini`         | 10 conv/day, 10 prompts/conv, 1 img/mo, 1 audio/mo |
| Pro     | $19   | `gpt-4.1`             | 50/day, 100/conv, 50 img, 50 audio                 |
| Premium | $39   | `gpt-4.1` / `gpt-5.4` | Unlimited                                          |

---

## 9. Frozen Architecture Direction

> Full architecture spec in `SPEC.md`. Key decisions here for reference.

- **Route model:** Public (`/`, `/about`, `/plans`, etc.), Auth (`/app(.*)`), Admin (`/admin(.*)`)
- **Auth boundary:** Proxy + server-side double-check. Admin: proxy role check + `requireAdminActionAccess()` in every action.
- **Entitlement resolver:** Central `resolveEntitlements()` ? never scatter plan logic.
- **AI model policy:** Central `resolveModelPolicy()` ? frontend never sends model ID.
- **Conversation lifecycle:** `Task` with `promptCount`, `estimatedBytes`, `status`, `endedReason`, `endAction`.
- **Usage accounting:** `UsageEvent` model logs every AI request. Durable counters with atomic enforcement.
- **Streaming:** SSE with heartbeat, `didSendFinal` guard, proactive timeout safety net. **Timeout must be computed from function start, not stream start.** **Confirmed working in production (Phase 181).**
- **Data rule:** No binary/base64 in MongoDB. Media ? S3. URLs in DB only.

---

## 10. Explicitly Deferred From v1

- Multi-provider LLM routing
- Team / workspace accounts
- User-created custom personas
- Broad role systems beyond `client` and `admin`
- Legal/nav/footer admin configurability (v2)
- Supabase/PostgreSQL migration (future strategic direction)
- ~~Tiptap rich-text editor~~ � RECLASSIFIED. Now active as Phase 194 (OI33).

---

## 11. Architect Audit #84 ? Stripe Webhook Code Analysis

> Evidence record for C2 investigation. Filed 2026-04-02.

### Files Audited

- `src/app/api/webhooks/stripe/route.tsx` ? Full webhook handler
- `src/lib/actions/transaction.action.tsx` ? Checkout session creation
- `node_modules/stripe/package.json` ? Stripe SDK v20.4.1
- `node_modules/stripe/cjs/stripe.core.js` ? SDK static method verification
- `node_modules/stripe/cjs/Webhooks.js` ? `constructEvent` implementation
- `node_modules/stripe/types/index.d.ts` ? Type declarations

### Findings

1. **`import stripe from "stripe"` + `stripe.webhooks.constructEvent()`** ? VALID. In Stripe v20.4.1, `import stripe from "stripe"` imports the Stripe class. `Stripe.webhooks` is a static property set during module initialization. `constructEvent()` is a synchronous method that verifies the webhook signature and parses the JSON payload. No issue here.

2. **Zod schemas** ? CORRECT. `stripeWebhookEventSchema` uses `.passthrough()` and validates `type` + `data.object`. `checkoutSessionMetadataSchema` validates all 5 required fields (`userId`, `clerkId`, `planId`, `plan`, `billing`). `checkoutSessionPayloadSchema` validates `id`, `amount_total`, and `metadata`. All schemas match what the checkout session creation sets.

3. **Metadata alignment** ? VERIFIED. `transaction.action.tsx` sets metadata: `{ userId, clerkId, plan, billing, planId: String(planId) }`. The webhook schema expects exactly these fields with matching types.

4. **Idempotency** ? CORRECT. Checks for existing transaction, repairs user plan if transaction exists but plan doesn?t match (handles partial failure on replay).

5. **Error handling** ? CORRECT. Top-level try/catch returns 500. Inner error paths return 400/500. All error paths log with `[stripe-webhook]` prefix. No silent failures.

6. **Database operations** ? CORRECT. Uses `connectToDatabase()`, `findOneAndUpdate` with `strict: true`, ownership verified by `_id` + `clerkId`.

### Verdict

**No code bug found in the Stripe webhook flow.** If the signing secret is wrong, `constructEvent` throws and the webhook returns HTTP 400 ? no transaction is created, no plan is updated. This matches the observed behavior exactly.

### Most Probable Root Cause

**Vercel env var mismatch.** The owner confirmed `.env.local` has the correct signing secret, but `.env.local` is local-only. Vercel production uses dashboard environment variables. The most likely scenarios:

- `STRIPE_WEBHOOK_SECRET` is not set in Vercel production env vars, or has a different value
- Stripe keys are for test mode but the webhook is in live mode (or vice versa)
- Env var is scoped to Preview/Development but not Production

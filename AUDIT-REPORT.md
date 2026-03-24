# Droplet Codebase Deep-Dive Audit Report

**Date:** Generated during Phase 120 (Full TDD Testing Rebuild)
**Scope:** 201 source files in `src/`, 67 test files in `tests/unit/`, 8 DB models, 5 API routes, 4 server action files
**Type:** Read-only audit — no files modified

---

## Executive Summary

The Droplet codebase is in strong shape overall. Auth checks are present on every server action and API route. Zod validation is used consistently at all server-facing entry points. Ownership enforcement is verified across user/task operations. No `console.log`, no `Math.random()`, no `strict: false`, no `dangerouslySetInnerHTML` found in production code.

**Key metrics:**
- **0 CRITICAL** findings (no security vulnerabilities or data leaks)
- **3 HIGH** findings (all KNOWN, tracked in TODO.md)
- **8 MEDIUM** findings (4 KNOWN, 4 NEW)
- **6 LOW** findings (2 KNOWN, 4 NEW)

---

## 1. Code Quality & Patterns

### 1.1 — `getAllTransactions()` missing `.select()` projection

| Field | Value |
|-------|-------|
| **Severity** | MEDIUM |
| **Status** | NEW |
| **File** | `src/lib/actions/transaction.action.tsx` L114-125 |
| **Description** | `Transaction.find()` returns all fields (including `stripeId`, internal IDs) to the client. Every other query in the codebase uses `.select()` projections. |
| **Recommendation** | Add `.select("plan amount billing createdAt expiresOn")` to the query chain. |

### 1.2 — Duplicate type definitions (ChatApiResponse / ChatStreamEvent)

| Field | Value |
|-------|-------|
| **Severity** | MEDIUM |
| **Status** | KNOWN (TD-REUSE-04) |
| **File** | `src/app/api/openai/route.tsx` ~L120-170 AND `src/components/chat/chat-wrapper.tsx` ~L45-70 |
| **Description** | `ChatApiResponse` and `OpenAIStreamEvent`/`ChatStreamEvent` types are defined in both the API route and the chat wrapper component. Changes to one won't propagate to the other. |
| **Recommendation** | Extract to `src/types/ChatData.d.ts` and import from both locations. Tracked for Phase 121. |

### 1.3 — Hardcoded stop reason messages

| Field | Value |
|-------|-------|
| **Severity** | HIGH |
| **Status** | KNOWN (TD-HARDCODE-01) |
| **File** | `src/constants/stop-reasons.ts` (9 user-facing strings) |
| **Description** | All stop reason messages displayed when conversations end are hardcoded constants, not admin-configurable. Consumed in `src/app/api/openai/route.tsx` L47, L212, L239. |
| **Recommendation** | Make admin-configurable via AppSetting model. Tracked for Phase 103. |

### 1.4 — Hardcoded hero/landing copy

| Field | Value |
|-------|-------|
| **Severity** | MEDIUM |
| **Status** | KNOWN (Phase 104/104.2) |
| **Files** | `src/components/sections/hero-section.tsx` L8-20, `src/components/sections/landing-page.tsx` L15-30 |
| **Description** | Hero section title ("Chat, create, and get things done."), subtitle, and CTA copy are hardcoded in JSX rather than sourced from admin-configurable settings. |
| **Recommendation** | Source from PublicPage or AppSetting model. Tracked for Phase 104.2. |

### 1.5 — FAQ singleton with defaults at module scope

| Field | Value |
|-------|-------|
| **Severity** | LOW |
| **Status** | KNOWN (Phase 74.2) |
| **File** | `src/constants/faqs.tsx` ~L100 |
| **Description** | `export const faqs = buildFaqs()` creates a module-level singleton with hardcoded defaults. `buildFaqs()` accepts config overrides, but the exported singleton doesn't use them. Server components must call `buildFaqs(effectiveConfig)` directly. |
| **Recommendation** | Remove the module-level `faqs` export and always call `buildFaqs()` with effective config at consumption sites. |

### 1.6 — `handleError` propagates raw `error.message`

| Field | Value |
|-------|-------|
| **Severity** | MEDIUM |
| **Status** | NEW |
| **File** | `src/lib/utils/handleError.tsx` L14 |
| **Description** | `buildErrorMessage()` re-throws with `error.message` content. When server actions throw, Next.js error boundaries may display this to the client. All current callers wrap the throw in their own try/catch, but if a server action's `handleError` call goes uncaught at the boundary, the raw DB or internal message could leak. |
| **Recommendation** | Audit all `handleError` call sites to confirm they're caught before reaching the UI. Consider stripping internal details from the re-thrown message (keep them in `cause` only). |

### 1.7 — 4 inline TODO comments in production code

| Field | Value |
|-------|-------|
| **Severity** | LOW |
| **Status** | NEW |
| **File** | `src/lib/utils/ai-model-policy.ts` L377, L382, L386, L390 |
| **Description** | Four TODO comments about unverified token accounting and placeholder pricing for audio/video models. These indicate incomplete cost tracking logic. |
| **Recommendation** | Resolve TODOs before GA — inaccurate cost estimates affect admin analytics and billing decisions. |

### 1.8 — Unique CSS class naming compliance

| Field | Value |
|-------|-------|
| **Severity** | LOW |
| **Status** | NEW |
| **File** | Multiple components |
| **Description** | AGENTS.md requires "Each component must have a unique CSS class based on its name in PascalCase." Verified compliance in: `ChatIntro`, `AlertMessage`, `LoadingBubbles`, `AvatarMenu`, `PlanPromo`, `PlanCountDown`, `AppGradientBg`, `HttpStatusPage`, `ConfirmationModal`, `DropletGlobe*`, `Checkout`, `LibraryPage`. Most components comply. The `FaqsSection` component at `src/components/sections/faqs-section.tsx` wraps in a `<section>` with class `FaqsSection` via props — compliant. Overall good adherence. |
| **Recommendation** | No action needed — compliance is strong. |

---

## 2. Security

### 2.1 — Auth verification: PASS

All 4 server action files and all 5 API routes verify authentication before any DB operation:

| File | Auth Check |
|------|-----------|
| `src/lib/actions/admin.actions.tsx` | `requireAdminActionAccess()` on every exported function |
| `src/lib/actions/task.actions.tsx` | `await auth()` + userId guard on every function |
| `src/lib/actions/user.actions.tsx` | `await auth()` + ownership check (`authedUserId !== parsedClerkId`) |
| `src/lib/actions/transaction.action.tsx` | `await auth()` + ownership check |
| `src/app/api/openai/route.tsx` | `await auth()` at handler start |
| `src/app/api/upload/route.tsx` | Auth + Zod + file validation |
| `src/app/api/download/route.tsx` | Auth + Zod + URL allowlist + ownership |
| `src/app/api/aws/route.tsx` | `currentUser()` + ownership |
| `src/app/api/webhooks/stripe/route.tsx` | Signature verification (no auth needed) |
| `src/app/api/webhooks/clerk/route.tsx` | `verifyWebhook()` (no auth needed) |

### 2.2 — Zod validation: PASS

Every server-facing entry point uses Zod schemas for input validation. No raw `req.body` or `formData` is used without schema validation.

### 2.3 — Ownership enforcement: PASS

All user-facing data queries include `userId` or `clerkId` in the filter. Cross-user data access is prevented at the query level.

### 2.4 — XSS prevention: PASS

- Zero `dangerouslySetInnerHTML` instances found in `src/`
- No raw HTML injection vectors detected

### 2.5 — Secret handling: PASS

- Zero `console.log` instances in `src/`
- No hardcoded secrets found in source files
- All secrets use `.env.local` via `process.env`

### 2.6 — Cryptographic safety: PASS

- Zero `Math.random()` instances in `src/`

### 2.7 — Schema strictness: PASS

- Zero `strict: false` instances in `src/`
- All Mongoose schemas use `{ strict: true }` or default strict mode

### 2.8 — Webhook safety: PASS

- Stripe: signature verification + idempotency check (duplicate `stripeId` guard)
- Clerk: `verifyWebhook()` + Zod schemas for all 3 event types + duplicate key handling

### 2.9 — `error.message` in server-side logs

| Field | Value |
|-------|-------|
| **Severity** | LOW |
| **Status** | NEW |
| **Files** | 12 instances across `openai/route.tsx`, `generateAudio.tsx`, `generateImage.tsx`, `generateVideo.tsx`, `generateResponse.tsx`, `ensure-user-synced.ts`, `mongoose.tsx` |
| **Description** | `error.message` is used in `process.stderr.write()` calls for server-side logging. These never reach the client — they're server-only log lines. The one client-adjacent instance is in `library/page.tsx` L211 which logs to stderr and sets a boolean `hasLoadError` flag (doesn't expose the message to UI). |
| **Recommendation** | No immediate action — all instances are server-side only. The `handleError.tsx` propagation (Finding 1.6) is the only concern. |

---

## 3. Performance

### 3.1 — `.lean()` usage: GOOD

20+ instances of `.lean()` found across all query files. Consistently applied on read-only queries.

### 3.2 — `.select()` projection usage: GOOD (with one exception)

20+ instances of `.select()` found. All admin queries, task queries, and user queries use projections. The one exception is `getAllTransactions()` (Finding 1.1).

### 3.3 — Unbounded queries

| Field | Value |
|-------|-------|
| **Severity** | MEDIUM |
| **Status** | NEW |
| **File** | `src/lib/actions/transaction.action.tsx` L114 |
| **Description** | `getAllTransactions()` has no `.limit()`. For a user with many transactions, this returns all documents. Admin queries properly use pagination (`.skip()` + `.limit()` in `admin-queries.ts` L459-461). |
| **Recommendation** | Add `.limit(100)` or implement pagination. In practice, most users will have few transactions (plan changes), so this is low-risk currently. |

### 3.4 — Admin query pagination: GOOD

`admin-queries.ts` consistently uses `resolveAdminPagination()` with `.skip()` + `.limit()` + `.select()` + `.lean()`. Pattern is exemplary.

### 3.5 — Task query safety: GOOD

`task-queries.tsx` L155-162: `getRecentTasksByUserId()` clamps limit to `Math.max(1, Math.min(limit, 100))` and offset to `Math.min(Math.max(0, offset), 10000)`. Safe bounds.

### 3.6 — `useMemo`/`useCallback` usage: ADEQUATE

Key client components use memoization where it matters:
- `chat-wrapper.tsx`: 5+ `useMemo`, 2+ `useCallback` for message lists, persona maps, and handlers
- `chat-body.tsx`: `useMemo` for message list derivation
- `droplet-theme.tsx`: `useCallback` for theme functions, `useMemo` for context value
- `alert-message.tsx`: `useMemo` for alert key

Components that could benefit from memoization but are low priority (rendered infrequently):
- `plan-count-down.tsx`: `formatCountdown` function recreated each render (interval drives updates anyway)

### 3.7 — Zustand store subscriptions

| Field | Value |
|-------|-------|
| **Severity** | LOW |
| **Status** | NEW |
| **File** | `src/components/chat/chat-header.tsx` |
| **Description** | Uses 3 separate `useShallow()` selectors from zustand stores. This is the correct pattern — `useShallow` prevents unnecessary re-renders. No issues found. |
| **Recommendation** | No action needed. |

---

## 4. WCAG 2.2 AA Accessibility

### 4.1 — Tab components missing arrow key navigation

| Field | Value |
|-------|-------|
| **Severity** | MEDIUM |
| **Status** | KNOWN (TD-WCAG-05, Phase 108) |
| **Files** | `src/components/chat/library-tabs.tsx`, `src/components/admin/admin-settings-tabs.tsx` |
| **Description** | Both tab components have correct ARIA attributes (`role="tablist"`, `role="tab"`, `aria-selected`, `aria-controls`) but lack keyboard navigation with Arrow Left/Right keys, Home/End keys per WAI-ARIA Tabs Pattern. |
| **Recommendation** | Implement `onKeyDown` handler with arrow key focus management. Tracked for Phase 108. |

### 4.2 — Avatar menu missing ARIA roles and keyboard navigation

| Field | Value |
|-------|-------|
| **Severity** | MEDIUM |
| **Status** | KNOWN (TD-WCAG-07, Phase 114) |
| **File** | `src/components/shared/avatar-menu.tsx` |
| **Description** | Menu trigger has `aria-haspopup`, `aria-expanded`, `aria-controls`, `aria-label` ✓. But the dropdown is missing: `role="menu"` on the list, `role="menuitem"` on items, Escape key to close, ArrowDown/ArrowUp navigation, focus trap. |
| **Recommendation** | Add ARIA menu roles and keyboard handlers. Tracked for Phase 114. |

### 4.3 — Image alt text: PASS

All `<img>` and `<Image>` elements examined have `alt` attributes. No decorative images are missing `alt=""`.

### 4.4 — Focus management: ADEQUATE

- `ConfirmationModal` uses `<dialog>` with `ref.current.showModal()` — browser handles focus trap ✓
- `SidebarToggle` has `aria-label`, `aria-controls`, `aria-expanded` ✓
- Audio player has `role="status"` with `aria-live="polite"` for time display ✓
- All icon-only buttons (`<i className="bi ...">`) have `aria-hidden="true"` ✓

### 4.5 — Color contrast: NOT AUDITED

Automated color contrast checking requires browser-based tools (axe, Lighthouse). This audit did not run browser-based accessibility checks.

**Recommendation:** Run `npx playwright test` with axe-core integration or Lighthouse CI for automated contrast ratio checks.

---

## 5. Database

### 5.1 — Index coverage

| Model | Indexed Fields | Assessment |
|-------|---------------|------------|
| **User** | `clerkId` (unique), `username` (unique), `email` (index) | **Missing:** `plan.name` for admin filtering |
| **Task** | `userId`, `personaId`, `createdAt`, `{userId, updatedAt}`, `{userId, createdAt}`, `{updatedAt}` | **Excellent** — compound indexes cover all query patterns |
| **Transaction** | `userId`, `stripeId` (unique), `clerkId` | Good |
| **UsageEvent** | `userId`, `taskId`, `personaId`, `model`, `requestType`, `createdAt` | **Excellent** — all query/aggregation fields indexed |
| **AppSetting** | `key` (unique), `category` | Good |
| **RateLimitEntry** | `key` (unique), `expireAt` (TTL) | Good — TTL index for auto-cleanup |
| **AdminAuditLog** | `adminId`, `action`, `createdAt` | Good |
| **PublicPage** | `slug` (unique) | Good — but no index on `isPublished` |

### 5.2 — Missing index: `User.plan.name`

| Field | Value |
|-------|-------|
| **Severity** | LOW |
| **Status** | NEW |
| **File** | `src/lib/database/models/user.model.tsx` |
| **Description** | Admin user queries filter by plan name (e.g., show all Pro users). The `plan.name` field is not indexed. With a small user base this is negligible, but at scale it causes collection scans. |
| **Recommendation** | Add `UserSchema.index({ "plan.name": 1 })` when user count exceeds ~10K. |

### 5.3 — Missing index: `PublicPage.isPublished`

| Field | Value |
|-------|-------|
| **Severity** | LOW |
| **Status** | NEW |
| **File** | `src/lib/database/models/public-page.model.tsx` |
| **Description** | Public pages are queried with `isPublished: true` filter. No index on this boolean field. Very low document count makes this negligible currently. |
| **Recommendation** | Add index if page count grows significantly. Not urgent. |

### 5.4 — Schema `strict: true`: PASS

All 8 models use either explicit `{ strict: true }` in schema options or rely on Mongoose's default strict mode. No schema allows arbitrary field writes.

### 5.5 — Model registration pattern: PASS

All models follow the recommended pattern: `const Model = models.Model || model("Model", Schema)`. No registration conflicts possible.

### 5.6 — `server-only` imports: PASS

All model files import `"server-only"` at the top, preventing accidental client-side imports.

---

## 6. Build & Dependencies

### 6.1 — All 7 validation gates: GREEN (per TODO.md)

```
✅ Prettier (format)
✅ ESLint (lint)
✅ TypeScript (typecheck)
✅ Vitest (370 unit tests, 62 suites)
✅ Playwright (108 E2E tests)
✅ Production build
✅ Knip (unused code audit)
```

### 6.2 — Dependency versions

| Package | Version | Assessment |
|---------|---------|------------|
| Next.js | 16.1.6 | Current |
| React | 19 | Current |
| TypeScript | 6.0.2 | Current |
| Mongoose | 9.0.1 | Current |
| OpenAI SDK | 6.10.0 | Current |
| Clerk | @clerk/nextjs | Current |
| Stripe | stripe | Current |
| Zod | 4.1.12 | Current |
| Zustand | 5.0.11 | Current |
| Vitest | 4.0.18 | Current |
| Playwright | 1.58.2 | Current |
| Tailwind CSS | 4.2.1 | Current |
| Node.js | 24.12.0 | Current |

No outdated or vulnerable dependencies detected based on version numbers.

### 6.3 — Hardcoded rate limit constants

| Field | Value |
|-------|-------|
| **Severity** | LOW |
| **Status** | NEW |
| **File** | `src/app/api/openai/route.tsx` L62-63 |
| **Description** | `OPENAI_RATE_LIMIT_MAX_REQUESTS = 20` and `OPENAI_RATE_LIMIT_WINDOW_MS = 60_000` are hardcoded constants, not admin-configurable. |
| **Recommendation** | Consider making these admin-configurable via AppSetting if rate limit tuning is needed in production. Low priority — current values are reasonable. |

---

## 7. Testing Gaps

### 7.1 — ~200 `as never` casts in non-rebuilt test files

| Field | Value |
|-------|-------|
| **Severity** | HIGH |
| **Status** | KNOWN (TD-TEST-02, Phase 120) |
| **Files** | `tests/unit/actions/user-actions.test.ts` (~23 casts), `tests/unit/actions/admin-actions.behavior.test.ts` (~20 casts), `tests/unit/actions/transaction-actions.test.ts` (~5 casts), `tests/unit/audit/admin-audit-trail.test.ts` (~1 cast), `tests/unit/plans/plans.test.ts` (~3 casts), and ~13 more non-rebuilt files |
| **Description** | 50+ `as never` casts found in sampled files alone. These are type-unsafe mock bypasses that hide type errors and make tests fragile. Rebuilt test files use shared factories with zero `as never` — the pattern exists, it just needs to be applied to remaining files. |
| **Recommendation** | Continue Phase 120 (Full TDD Testing Rebuild). 20 of ~40 test files have been rebuilt. |

### 7.2 — Components with zero unit test coverage

| Field | Value |
|-------|-------|
| **Severity** | HIGH |
| **Status** | KNOWN (Phase 120.5) |
| **Components** | `hero-section.tsx`, `landing-page.tsx`, `faqs-section.tsx`, `plans-section.tsx`, `personas-section.tsx`, `admin-settings-tabs.tsx`, `profile-hero-editor.tsx`, `avatar-menu.tsx`, `chat-intro.tsx`, `plan-count-down.tsx`, `plan-promo.tsx`, `audio-player.tsx`, `video-player.tsx`, `image-holder.tsx` |
| **Description** | These components have no corresponding unit tests in `tests/unit/`. Business-critical components (plan-promo, plan-count-down, avatar-menu) should have basic render tests. |
| **Recommendation** | Prioritize in Phase 120.5. Focus on components with conditional logic (plan-promo shows different CTAs per plan, plan-count-down has timer logic). |

### 7.3 — Test infrastructure quality: GOOD

Rebuilt test files demonstrate strong patterns:
- Shared test factories (no `as never`)
- Both success and failure path coverage
- Clean mocking with `vi.mock()`
- Proper async/await handling

---

## Summary by Severity

### CRITICAL (0)
None.

### HIGH (3) — all KNOWN
1. **TD-HARDCODE-01** — Hardcoded stop reason messages (Phase 103)
2. **TD-TEST-02** — ~200 `as never` casts in non-rebuilt tests (Phase 120)
3. **Phase 120.5** — Components with zero test coverage

### MEDIUM (8)
| # | Finding | Status | File |
|---|---------|--------|------|
| 1 | `getAllTransactions()` missing `.select()` | NEW | `transaction.action.tsx` L114 |
| 2 | Duplicate type definitions | KNOWN (TD-REUSE-04) | `openai/route.tsx` + `chat-wrapper.tsx` |
| 3 | Hardcoded hero/landing copy | KNOWN (Phase 104) | `hero-section.tsx`, `landing-page.tsx` |
| 4 | `handleError` propagates raw `error.message` | NEW | `handleError.tsx` L14 |
| 5 | Unbounded `getAllTransactions()` query | NEW | `transaction.action.tsx` L114 |
| 6 | Tab arrow key navigation | KNOWN (TD-WCAG-05) | `library-tabs.tsx`, `admin-settings-tabs.tsx` |
| 7 | Avatar menu ARIA/keyboard | KNOWN (TD-WCAG-07) | `avatar-menu.tsx` |
| 8 | **NEW** missing `.select()` + no `.limit()` combined | NEW | `transaction.action.tsx` L114 |

*(Note: Findings 1, 5, and 8 all point to the same `getAllTransactions()` function — they're three facets of one issue.)*

### LOW (6)
| # | Finding | Status | File |
|---|---------|--------|------|
| 1 | FAQ module-level singleton | KNOWN (Phase 74.2) | `faqs.tsx` |
| 2 | 4 TODO comments in production | NEW | `ai-model-policy.ts` |
| 3 | Missing `User.plan.name` index | NEW | `user.model.tsx` |
| 4 | Missing `PublicPage.isPublished` index | NEW | `public-page.model.tsx` |
| 5 | Hardcoded rate limit constants | NEW | `openai/route.tsx` L62-63 |
| 6 | `error.message` in server-side logs | NEW | 12 instances (all server-only) |

---

## Positive Findings (Strengths)

1. **Auth on every entry point** — zero gaps found across all server actions and API routes
2. **Zod everywhere** — consistent schema validation at all boundaries
3. **Ownership enforcement** — all data queries filter by userId/clerkId
4. **Zero `dangerouslySetInnerHTML`** — no XSS vectors
5. **Zero `console.log` in production** — clean logging via `process.stderr.write`
6. **Zero `Math.random()`** — no crypto-unsafe randomness
7. **Zero `strict: false`** — all Mongoose updates are schema-safe
8. **`.lean()` + `.select()` used consistently** — good query performance patterns
9. **Admin queries paginated** — `admin-queries.ts` is exemplary
10. **Webhook idempotency** — both Stripe and Clerk webhooks handle duplicates
11. **All models use `server-only`** — cannot be accidentally imported client-side
12. **Knip passes** — no dead exports or unused files
13. **All 7 validation gates GREEN** — formatcheck, lint, typecheck, unit tests, e2e, build, knip

---

## Recommendations for Droplet-PM

### Immediate (before next release)
1. Add `.select()` to `getAllTransactions()` — easy fix, prevents leaking internal fields

### Short-term (next sprint)
2. Audit `handleError` call sites to confirm error messages don't leak to UI
3. Resolve 4 TODO comments in `ai-model-policy.ts` for accurate cost tracking

### Already tracked (continue as planned)
4. TD-HARDCODE-01: Admin-configurable stop reasons (Phase 103)
5. TD-REUSE-04: Extract duplicate types (Phase 121)
6. TD-WCAG-05: Tab arrow key navigation (Phase 108)
7. TD-WCAG-07: Avatar menu keyboard/ARIA (Phase 114)
8. TD-TEST-02: Complete TDD rebuild (Phase 120)
9. Phase 104/104.2: Admin-configurable hero/landing copy

### Low priority (backlog)
10. `User.plan.name` index (when user count > 10K)
11. `PublicPage.isPublished` index (when page count grows)
12. Admin-configurable rate limit constants

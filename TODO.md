# Droplet — TODO

> Prioritized, actionable development tasks. Each task max ~30 minutes.
> Governed by **Droplet-PM**. Do not add tasks without PM approval.
> Ref: `SPEC.md` for full specification. `AGENTS.md` for coding rules. `DONE.md` for completed phases.
> Implementation agent: **Droplet-Engineer** (Senior Developer).
>
> **STATUS: PM audit #80 (2026-04-01). DEPLOYED TO PRODUCTION. Phases 169, 170, 160.2 COMPLETED this session. BUG-HYDRATION RESOLVED. BUG-SCRIPT RESOLVED. BUG-STREAM MITIGATED (proactive 55s timeout). BUG-PAYMENT RESOLVED. BUG-AUDIO RESOLVED. 2 unit test failures remain (test assertions stale vs component). E2E: 49 tests (8 spec files). Build passes. TSC clean. Node.js 24.12.0 runtime.**
> **GATE STATUS: Validation Gate YELLOW (2 unit test failures). Product Gate YELLOW (streaming mitigated, not fully resolved). Admin Gate YELLOW (Phase 162 pending).**
> **Zero: `as never`, `as any`, `console.log`, `console.error`, `window.alert`, `window.confirm`, `strict: false`, `droplet-scrollbar`, stale TODOs — all in `src/`.**
>
> **ACTIVE ISSUES (PM audit #80):**
>
> - ✅ ~~BUG-PAYMENT~~: **RESOLVED.** Stripe webhook returning 200 OK.
> - ✅ ~~BUG-AUDIO~~: **RESOLVED (Phase 168, archived).**
> - ✅ ~~BUG-HYDRATION~~: **RESOLVED (Phase 169, archived).**
> - ✅ ~~BUG-SCRIPT~~: **RESOLVED (Phase 170, archived).**
> - ✅ ~~BUG-STREAM~~: **MITIGATED (Phase 160.2, proactive 55s timeout — archived).** Root cause persists (Vercel Hobby 60s limit). Full fix requires Vercel Pro upgrade or architecture change.
> - 🔴 TEST-FAIL-01: `chat-body.test.tsx:160` — stale amber class assertions vs current component.
> - 🔴 TEST-FAIL-02: `chat-sidebar-promo.test.tsx:19` — expects "Manage Plan" but component renders "Upgrade Now".
> - 🔴 BRAND-LEGACY: 5 src files still reference `cellesseon` (owner directs immediate rename to `droplet`).
> - ⚠️ CATCH-BLOCKS: 34 parameterless `catch {}` blocks in `src/`.
> - ⚠️ HARDCODED-TEXT: ~15 hardcoded promo/marketing strings across 4 components.
>
> **EXECUTION ORDER (PM audit #80 — test fixes + owner directives first, then hardening):**
>
> 1. **🔴 Phase 171 CRITICAL** — Fix 2 failing unit tests (stale assertions).
> 2. **🔴 Phase 172 CRITICAL** — `cellesseon` → `droplet` localStorage key migration (owner override).
> 3. **Phase 167.2 HIGH** — Remaining 34 empty catch blocks.
> 4. **Phase 162 HIGH** — Promo text admin-configurable (expanded scope).
> 5. **Phase 163 HIGH** — Global error boundary.
> 6. **Phase 165 MEDIUM** — Checkout success page DB polling (safety net).
> 7. **Phase 143 MEDIUM** — Env var runtime validation.
> 8. **Phase 144–148 MEDIUM/LOW** — Backlog.
>
> _Test failures and owner directives block ALL other work. No exceptions._

---

## 🔴 ENGINEER START HERE — Phase 171 CRITICAL — Fix 2 Failing Unit Tests (PM audit #80)

> **2 unit tests failing due to stale assertions.** Test expectations do not match current component implementation. Test-component drift from recent refactoring.

### Test 1: `chat-body.test.tsx` line 160 — "applies amber ended-conversation styling"

**Root cause:** Test expects `.ChatBody` to have conditional amber border/bg classes (`border-amber-400/45`, `bg-amber-50/40`) when `conversationEnded=true`, and `.ChatBodyEndNotice` to have `border-amber-500/60` and `bg-amber-100/85`. But the component uses:

- `.ChatBody` has NO conditional amber classes (static class only)
- `.ChatBodyEndNotice` uses `border-amber-500/30 bg-amber-500/10` (different opacity values)

**File:** `tests/unit/components/chat-body.test.tsx`

**What to do:**

1. Update test assertions to match actual component classes:
   - Remove assertions for `border-amber-400/45` and `bg-amber-50/40` on `.ChatBody` (component has no conditional amber styling)
   - Change `.ChatBodyEndNotice` assertions from `border-amber-500/60` to `border-amber-500/30` and from `bg-amber-100/85` to `bg-amber-500/10`
2. Keep the test's intent (verify end-notice renders with amber styling) but align with current implementation.

### Test 2: `chat-sidebar-promo.test.tsx` line 19 — "shows the upgrade CTA"

**Root cause:** Test expects `screen.getByRole("link", { name: "Manage Plan" })` but the component renders `"Upgrade Now"` as the CTA link text.

**File:** `tests/unit/components/chat-sidebar-promo.test.tsx`

**What to do:**

1. Change `{ name: "Manage Plan" }` to `{ name: "Upgrade Now" }`.

**Acceptance criteria:**

- [ ] Both tests pass
- [ ] All 7 validation gates GREEN
- [ ] No behavioral changes to components

---

## 🔴 Phase 172 CRITICAL — `cellesseon` → `droplet` localStorage Key Migration (PM audit #80, owner override)

> **Owner directive OI18: ALL `cellesseon` references in `/src` must be changed to `droplet`.** The previous deprecation cycle protection (AGENTS.md Rule 9) is hereby OVERRIDDEN by the owner. Legacy migration keys must be replaced, not just kept for backward compatibility.

**Files and changes:**

1. **`src/components/layout/droplet-theme.tsx` line 26** — Remove `LEGACY_STORAGE_KEY` constant and its one-time migration logic. The migration has had sufficient time. Remove the `getStoredMode()` legacy fallback read.

2. **`src/app/layout.tsx` line 59** — Remove `legacyStorageKey` variable and the `localStorage.getItem(legacyStorageKey)` fallback in the inline theme init script. Keep reading from `"droplet-theme-mode"` only.

3. **`src/components/chat/sidebar/chat-sidebar-shell.tsx` line 29** — Remove `legacySidebarStorageKey` constant and the migration logic. Keep reading from `"droplet-sidebar-collapsed"` only.

4. **`src/json/privacy.json` line 35** — Remove references to "legacy migration keys cellesseon-theme-mode and cellesseon-sidebar-collapsed". Update text to reference only `droplet-theme-mode` and `droplet-sidebar-collapsed`.

5. **`src/json/cookies.json` line 9** — Remove references to "legacy migration keys cellesseon-theme-mode and cellesseon-sidebar-collapsed". Update text to reference only `droplet-theme-mode` and `droplet-sidebar-collapsed`.

**Acceptance criteria:**

- [ ] Zero `cellesseon` references in `src/` (verified by `grep -r "cellesseon" src/`)
- [ ] Theme mode reads from `droplet-theme-mode` only
- [ ] Sidebar state reads from `droplet-sidebar-collapsed` only
- [ ] Privacy and cookies JSON files updated
- [ ] Build passes, tests pass

---

## MEDIUM — Checkout Success Page DB Polling (PM audit #75)

### Phase 165 MEDIUM — Add plan confirmation polling to checkout success page

> BUG-PAYMENT resolved (PM audit #78.1 — owner verified). Deprioritized back to MEDIUM. Still a good safety net: after Stripe redirects to `/checkout-success`, webhook may not have processed yet. User sees "success" but plan is still Lite.

**File:** `src/app/(public)/checkout-success/page.tsx` (or add client component)

**What to do:**

1. Add a client component that polls a plan-status endpoint every 3-5s for up to 30s.
2. Show "Confirming your plan upgrade..." initially.
3. On confirmation: "Plan upgraded successfully!" with green indicator.
4. On timeout: "Payment successful. Your plan will be updated shortly. If not updated within a few minutes, contact support."

**Acceptance criteria:**

- [ ] Checkout success page shows plan confirmation status
- [ ] Polling stops after confirmation or 30s timeout
- [ ] Build passes

---

## HIGH — Remaining Empty Catch Blocks (PM audit #78)

### Phase 167.2 HIGH — Fix remaining 34 parameterless `catch {` blocks across `src/`

> Phase 167 was partially completed (targeted catches in API routes, admin actions, delete cascade, sidebar — see DONE.md Phase 167). **34 parameterless `catch {` blocks remain across `src/`.** This phase covers the remaining ones.
>
> AGENTS.md: "No empty catch blocks — every catch must either capture the error variable and log to `process.stderr.write()`, or have a code comment explaining why the error is intentionally discarded."

**Category A — Server-side catches that MUST LOG (production debugging at stake):**

| #   | File                                         | Line | Context                     |
| --- | -------------------------------------------- | ---- | --------------------------- |
| 1   | `src/app/api/webhooks/clerk/route.tsx`       | 292  | Webhook verify failure      |
| 2   | `src/app/api/webhooks/clerk/route.tsx`       | 497  | User delete cleanup         |
| 3   | `src/app/api/webhooks/clerk/route.tsx`       | 523  | Webhook processing failure  |
| 4   | `src/lib/actions/user.actions.tsx`           | 104  | Clerk user deletion failure |
| 5   | `src/lib/actions/task.actions.tsx`           | 338  | S3 cleanup                  |
| 6   | `src/lib/actions/task.actions.tsx`           | 348  | Task deletion               |
| 7   | `src/lib/utils/ensure-user-synced.ts`        | 108  | Clerk metadata sync         |
| 8   | `src/lib/utils/aws/uploadFileToAWS.tsx`      | 37   | S3 upload (use `{ cause }`) |
| 9   | `src/app/(public)/checkout-success/page.tsx` | 45   | Stripe session verify       |
| 10  | `src/lib/utils/openai/generateResponse.tsx`  | 425  | JSON.parse args             |

**Category B — Effective-\* resolver fallback catches (add comment — intentional fallback to defaults):**

| #   | File                                        | Line          | Count |
| --- | ------------------------------------------- | ------------- | ----- |
| 11  | `src/lib/utils/effective-website-copy.ts`   | 326, 340      | 2     |
| 12  | `src/lib/utils/effective-stop-reasons.ts`   | 65            | 1     |
| 13  | `src/lib/utils/effective-plan-config.ts`    | 267, 285, 299 | 3     |
| 14  | `src/lib/utils/effective-persona-config.ts` | 163           | 1     |
| 15  | `src/lib/utils/effective-persona-access.ts` | 69            | 1     |
| 16  | `src/lib/utils/effective-model-config.ts`   | 92            | 1     |
| 17  | `src/lib/utils/effective-faq-content.ts`    | 93            | 1     |

**Category C — Client catches (add comment for intentional discards):**

| #   | File                                               | Line | Context            |
| --- | -------------------------------------------------- | ---- | ------------------ |
| 18  | `src/components/shared/audio-player.tsx`           | 109  | Audio init failure |
| 19  | `src/components/chat/sidebar/chat-sidebar-nav.tsx` | 144  | Delete failure     |
| 20  | `src/components/chat/library-delete-button.tsx`    | 66   | Delete failure     |
| 21  | `src/components/chat/chat-wrapper.tsx`             | 300  | JSON parse         |
| 22  | `src/components/chat/chat-input.tsx`               | 115  | Upload failure     |

**Category D — Utility catches (add comment for URL/parse fallbacks):**

| #   | File                                          | Line  | Count |
| --- | --------------------------------------------- | ----- | ----- |
| 23  | `src/lib/utils/normalize-public-asset-url.ts` | 8, 33 | 2     |
| 24  | `src/lib/utils/aws/s3-file-reference.ts`      | 9, 99 | 2     |
| 25  | `src/lib/utils/download-url-allowlist.ts`     | 54    | 1     |
| 26  | `src/app/api/download/route.tsx`              | 55    | 1     |

**Already have comments (NO CHANGE):** `image-holder.tsx` L48, `droplet-theme.tsx` L49 + L59, `layout.tsx` L73.

**Instructions:**

1. **Category A:** Capture error — `catch (error)` → `process.stderr.write(\`[source] Error: ${error instanceof Error ? error.message : "unknown"}\\n\`)`. For `uploadFileToAWS`: use `throw new Error("File upload failed", { cause: error })`.
2. **Category B:** Add comment: `// Intentional fallback to defaults — admin config DB error is non-fatal`
3. **Category C:** Add comment where intentional, or capture error if genuinely useful.
4. **Category D:** Add comment: `// URL/path parse failure — non-fatal, fallback value used`

**Acceptance criteria:**

- [ ] Zero uncommented parameterless `catch {` blocks in `src/`
- [ ] Server-side catches (Category A) log error details via `process.stderr.write()`
- [ ] Client/utility catches (Categories B-D) have explaining comments or capture error
- [ ] `uploadFileToAWS` uses `{ cause: error }` pattern
- [ ] Build passes, tests pass

---

## HIGH — Phase 162 — Make Promo/Upgrade Text Admin-Configurable

> Owner directive: admin settings must control ALL display text. ~25 hardcoded marketing/promo strings across 3 files. Must be admin-configurable via `effective-promo-content.ts` resolver.

**Hardcoded strings to extract (triple-audit verified):**

**`src/components/chat/sidebar/chat-sidebar-promo.tsx`:**

- "Admin" (heading), "You have admin access." (description)
- "Account Suspended" (heading), "Your account has been suspended..." (description)
- "Go Premium" / "Go Pro" (heading), upgrade descriptions
- "Upgrade Now" (CTA)

**`src/components/shared/plan-promo.tsx`:**

- "Free forever" (badge), "Your plan" (badge)
- "Admin" / "You have admin access." / "Account suspended" / suspension description
- "Unlock premium features with an upgrade!" / "Upgrade now" / "Contact support"

**`src/components/shared/persona-card.tsx`:**

- "Upgrade to ${requiredPlan} to unlock this persona" / "Trial access with reduced limits..."

**What to do:**

1. Create `src/lib/utils/effective-promo-content.ts` resolver following existing `effective-*` pattern. Keys: `admin.promoTitle.pro`, `admin.promoTitle.premium`, `admin.promoDescription.pro`, `admin.promoDescription.premium`, `admin.promoUpgradeCta`, `admin.promoAdminLabel`, `admin.promoAdminDescription`, `admin.promoSuspensionTitle`, `admin.promoSuspensionDescription`, `admin.promoFreeLabel`, `admin.promoUpgradeMessage`, `admin.promoTrialLabel`, `admin.promoPersonaUpgrade`.
2. Parent server components pass resolved promo text as props to client components.
3. Remove ALL hardcoded marketing/promo strings from the 3 files above. CSS class names and route paths are excluded (structural).
4. Add admin UI section for editing promo text in `/admin/settings`.

**Acceptance criteria:**

- [ ] Zero hardcoded promo/marketing text in `chat-sidebar-promo.tsx`
- [ ] Zero hardcoded promo/marketing text in `plan-promo.tsx`
- [ ] Zero hardcoded upgrade messaging text in `persona-card.tsx`
- [ ] `effective-promo-content.ts` resolver with admin override + default fallback
- [ ] Admin UI section for editing promo text in `/admin/settings`
- [ ] Build passes, tests pass

---

## HIGH — Phase 163 — Global Error Boundary

> No `global-error.tsx` exists. `error.tsx` catches errors within the root layout's children, but `global-error.tsx` is needed for root layout errors themselves. Without it, root layout failures produce a raw browser error page.

**File:** `src/app/global-error.tsx` (new)

**What to do:**

1. Create `src/app/global-error.tsx` as a `"use client"` component.
2. Render minimal error UI: "Something went wrong" message, "Try again" button (`reset()`), "Return home" link.
3. Include required `<html>` and `<body>` tags (Next.js requirement for global-error).
4. Apply basic inline styling — no theme dependency since root layout may have failed.

**Acceptance criteria:**

- [ ] `src/app/global-error.tsx` exists and is a valid `"use client"` component
- [ ] Contains `<html>` and `<body>` tags
- [ ] Shows error recovery UI with "Try again" and "Return home"
- [ ] Build passes

---

## MEDIUM — Phase 165 — Checkout Success Page DB Polling

> After Stripe redirects to checkout success, webhook may not have processed yet. User sees "success" but plan is still Lite until webhook fires.

**File:** `src/app/(public)/checkout-success/page.tsx` (or new client component)

**What to do:**

1. Add a client component that polls a plan-status endpoint every 3-5s for up to 30s.
2. Show "Confirming your plan upgrade..." initially.
3. On confirmation: "Plan upgraded successfully!" with green indicator.
4. On timeout: "Payment successful. Your plan will be updated shortly. If not updated within a few minutes, contact support."

**Acceptance criteria:**

- [ ] Checkout success page shows plan confirmation status
- [ ] Polling stops after confirmation or 30s timeout
- [ ] Build passes

---

## MEDIUM — Phase 143 — Env Var Runtime Validation

> 8 unsafe `process.env` casts: 4 `as string` + 4 `!`. Missing env vars produce cryptic runtime crashes instead of clear startup errors.

**Locations (triple-audit verified):**

| File                                     | Line | Pattern     | Variable            |
| ---------------------------------------- | ---- | ----------- | ------------------- |
| `src/lib/database/mongoose.tsx`          | 5    | `as string` | `MONGODB_URL`       |
| `src/constants/aws.tsx`                  | 5    | `as string` | `AWS_S3_REGION`     |
| `src/constants/aws.tsx`                  | 7    | `as string` | `AWS_S3_ACCESS_ID`  |
| `src/constants/aws.tsx`                  | 8    | `as string` | `AWS_S3_SECRET_KEY` |
| `src/constants/openai.tsx`               | 5    | `!`         | `OPENAI_ORG`        |
| `src/constants/openai.tsx`               | 6    | `!`         | `OPENAI_PRJ`        |
| `src/constants/openai.tsx`               | 7    | `!`         | `OPENAI_KEY`        |
| `src/lib/actions/transaction.action.tsx` | 52   | `!`         | `STRIPE_SECRET_KEY` |

**What to do:**

1. Create a shared `requireEnv(name: string): string` utility that throws with a clear message if undefined.
2. Replace all `process.env.VAR as string` and `process.env.VAR!` with `requireEnv("VAR")`.

**Acceptance criteria:**

- [ ] Zero `as string` on `process.env` in codebase
- [ ] Zero `!` on `process.env` in codebase
- [ ] Missing env vars throw clear error at module load
- [ ] Build passes, tests pass

---

## MEDIUM — Phase 144 — Admin Config In-Memory Cache

> 5+ DB round trips per `/api/openai` request for admin settings that change infrequently.

**What to do:**

1. Create `src/lib/utils/config-cache.ts` — simple in-memory cache with 30s TTL.
2. Wrap each `getEffective*` resolver's DB calls in the cache.

**Acceptance criteria:**

- [ ] Admin config queries cached with 30s TTL
- [ ] Repeated calls within TTL window return cached result
- [ ] Build passes, tests pass

---

## MEDIUM — Phase 145 — Upload Filename Collision Prevention

**File:** `src/app/api/upload/route.tsx`

**What to do:** Replace `Date.now()` with `crypto.randomUUID()` in upload filename generation.

**Acceptance criteria:**

- [ ] Upload filenames use `crypto.randomUUID()`
- [ ] Build passes

---

## LOW — Phase 146 — Admin User Detail Transaction Limit

**File:** `src/lib/utils/admin-queries.ts`

**What to do:** Add `.limit(50)` to the transaction query in `getAdminUserDetail`.

**Acceptance criteria:**

- [ ] Transaction query has `.limit(50)`
- [ ] Build passes

---

## LOW — Phase 147 — Rename `.tsx` Utility Files to `.ts`

**Files to evaluate:**

1. `src/lib/utils/handleError.tsx` → `.ts`
2. `src/lib/utils/getPlanStatus.tsx` → `.ts`
3. `src/lib/utils/getFullName.tsx` → `.ts`
4. `src/lib/utils/getFormattedDate.tsx` → `.ts`
5. `src/lib/utils/generateString.tsx` → `.ts`

**Acceptance criteria:**

- [ ] All utility-only files use `.ts` extension
- [ ] All imports updated
- [ ] Build passes, tests pass

---

## LOW — Phase 148 — Bulk Operations Partial-Failure Reporting

**File:** `src/lib/actions/admin.actions.tsx`

**What to do:**

1. Track successful and failed operations in the loop.
2. Return partial results: `{ success: N, failed: M, errors: [...] }`.
3. Apply to `bulkRemoveUsersAction` and `bulkSuspendUsersAction`.

**Acceptance criteria:**

- [ ] Bulk operations report partial success/failure
- [ ] Build passes

---

## LOW — Remaining Work

### Phase 73.2 LOW — Minor re-render and code quality fixes

### Phase 46.1 LOW — Admin error boundary

---

## ON HOLD — Deferred

### Phase 29.x — Zod/Zustand app-wide modernization

### Phase 26.x — Persona-aware media prompts, Stripe auto-renewal

### Legal/nav/footer admin configurability — Deferred to v2

### TypeScript 6 / @typescript-eslint compatibility — Monitor for official TS 6 support in `@typescript-eslint`

---

> **Completed phases** archived in [`DONE.md`](DONE.md).
> All phases through 166 complete + 160.1 + 164 + 168 complete (incl. 135–142, 149–161, 160.1, 164, 166, 168, 74.2, 104, 125.3, 126.2, 134, plus 107.1–107.3, 108, 114, 125.1, 131, 132, 133, 120.1–120.7, 121–130, 128.2, 106, 156).
> All Milestones 0–25 COMPLETE.

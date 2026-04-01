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

1. `src/app/api/webhooks/clerk/route.tsx` lines 292, 497, 523 — 3 webhook catches
2. `src/lib/actions/user.actions.tsx` line 104 — Clerk user deletion failure
3. `src/lib/actions/task.actions.tsx` lines 338, 348 — S3 cleanup and task deletion
4. `src/lib/utils/ensure-user-synced.ts` line 108 — Clerk metadata sync
5. `src/lib/utils/aws/uploadFileToAWS.tsx` line 37 — file upload (must use `{ cause: error }`)
6. `src/app/(public)/checkout-success/page.tsx` line 45 — Stripe session verify
7. `src/lib/utils/openai/generateResponse.tsx` line 425 — JSON.parse args

**Category B — Effective-\* resolver catches (add comment — intentional fallback to defaults):**

8-16. `effective-website-copy.ts` (2), `effective-stop-reasons.ts` (1), `effective-plan-config.ts` (3), `effective-persona-config.ts` (1), `effective-persona-access.ts` (1), `effective-model-config.ts` (1), `effective-faq-content.ts` (1)

**Category C — Client catches (add comment for intentional discards, log for real errors):**

17. `src/components/shared/audio-player.tsx` line 109 — audio init failure
18. `src/components/shared/image-holder.tsx` line 48 — download failure (already has comment ✅)
19. `src/components/layout/droplet-theme.tsx` lines 49, 67 — localStorage (already has comment ✅)
20. `src/components/chat/sidebar/chat-sidebar-nav.tsx` line 144 — delete failure
21. `src/components/chat/library-delete-button.tsx` line 66 — delete failure
22. `src/components/chat/chat-wrapper.tsx` line 300 — JSON parse
23. `src/components/chat/chat-input.tsx` line 115 — upload failure
24. `src/app/layout.tsx` line 73 — theme init (inline script — intentional)

**Category D — Utility catches (add comment for URL/parse fallbacks):**

25-28. `normalize-public-asset-url.ts` (2), `s3-file-reference.ts` (2), `download-url-allowlist.ts` (1), `download/route.tsx` (1)

**What to do:**

1. **For Category A blocks:** Capture error variable `catch (error)`, add `process.stderr.write(\`[source] Error: ${error instanceof Error ? error.message : "unknown"}\\n\`)`before the return/rethrow. For`uploadFileToAWS`: use `throw new Error("File upload failed", { cause: error })`.
2. **For Category B blocks:** Add comment: `// Intentional fallback to defaults — DB error non-fatal for admin config resolution`
3. **For Category C blocks 17, 20, 21, 22, 23:** Add comment or capture error where appropriate.
4. **For Category D blocks:** Add comment: `// URL/path parse failure — non-fatal, fallback value used`
5. For blocks that already have comments (#18, #19, #24): No change needed.

**Acceptance criteria:**

- [ ] Zero uncommented parameterless `catch {` blocks in `src/`
- [ ] Server-side catches (Category A) log error details via `process.stderr.write()`
- [ ] Client/utility catches (Categories B-D) have explaining comments or capture error
- [ ] `uploadFileToAWS` uses `{ cause: error }` pattern
- [ ] Build passes, tests pass

---

## HIGH — Admin Promo Text Configurability (PM audit #73)

### Phase 162 HIGH — Make sidebar promo upgrade text admin-configurable

> Owner directive: admin settings must control ALL display text. `ChatSidebarPromo` has hardcoded "Go Pro"/"Go Premium" and hardcoded promo descriptions. `PlanPromo` has hardcoded "Unlock premium features", "Free forever", "Admin access - full permissions". `PersonaCard` has hardcoded upgrade messaging. These should come from admin-configurable settings or at minimum from the effective plan config.

**Files:**

1. `src/components/chat/sidebar/chat-sidebar-promo.tsx` — "Go Pro"/"Go Premium", promo descriptions, "Admin"/"Account Suspended" text
2. `src/components/shared/plan-promo.tsx` — "Free forever", "Admin access - full permissions", "Unlock premium features with an upgrade!", "Upgrade now", suspension text
3. `src/components/shared/persona-card.tsx` — "Upgrade to ${requiredPlan} to unlock this persona", "Trial access with reduced limits..."

**What to do:**

1. Create `src/lib/utils/effective-promo-content.ts` resolver following the existing `effective-*` pattern. Keys: `admin.promoTitle.pro`, `admin.promoTitle.premium`, `admin.promoDescription.pro`, `admin.promoDescription.premium`, `admin.promoUpgradeCta`, `admin.promoAdminLabel`, `admin.promoAdminDescription`, `admin.promoSuspensionTitle`, `admin.promoSuspensionDescription`.
2. Parent server components pass resolved promo text as props to client components.
3. Remove ALL hardcoded marketing/promo strings from the 3 files above. CSS class names and route paths are excluded (those are structural, not marketing).

**Acceptance criteria:**

- [ ] Zero hardcoded promo/marketing text in `chat-sidebar-promo.tsx`
- [ ] Zero hardcoded promo/marketing text in `plan-promo.tsx`
- [ ] Zero hardcoded upgrade messaging text in `persona-card.tsx`
- [ ] Promo text comes from admin-configurable source via `effective-promo-content.ts` resolver
- [ ] Admin UI section for editing promo text in `/admin/settings`
- [ ] Build passes, tests pass

---

## HIGH — Global Error Boundary (PM audit #74 — Architect finding)

### Phase 163 HIGH — Add `global-error.tsx` for root layout error recovery

> No `global-error.tsx` exists. In Next.js, `global-error.tsx` catches errors in the root layout itself. Without it, a root layout error produces a raw browser error page with no recovery path.

**File:** `src/app/global-error.tsx` (new)

**What to do:**

1. Create `src/app/global-error.tsx` as a client component (`"use client"`).
2. Render a minimal error UI with "Something went wrong" message, a "Try again" button (calls `reset()`), and a "Return home" link.
3. Include required `<html>` and `<body>` tags (Next.js requirement for global-error).
4. Apply basic Droplet styling inline (no theme dependency since root layout may have failed).

**Acceptance criteria:**

- [ ] `src/app/global-error.tsx` exists and is a valid `"use client"` component
- [ ] Contains `<html>` and `<body>` tags
- [ ] Shows error recovery UI with "Try again" and "Return home"
- [ ] Build passes

---

## MEDIUM — Environment Variable Runtime Validation (PM audit #67)

### Phase 143 MEDIUM — Replace `as string` / `!` casts on env vars with runtime validation

> Architect finding W-2, Engineer finding H-1/H-2/H-4. 4 `as string` casts and 4 `!` non-null assertions on `process.env` values. If any env var is missing, broken clients are silently constructed.

**Files:**

1. `src/constants/aws.tsx` — 3 `as string` casts on `AWS_S3_REGION`, `AWS_S3_ACCESS_ID`, `AWS_S3_SECRET_KEY`
2. `src/constants/openai.tsx` — 3 `!` on `OPENAI_ORG`, `OPENAI_PRJ`, `OPENAI_KEY`
3. `src/lib/database/mongoose.tsx` — 1 `as string` on `MONGODB_URL`
4. `src/lib/actions/transaction.action.tsx` — 1 `!` on `STRIPE_SECRET_KEY`

**What to do:**

1. Create a shared `requireEnv(name: string): string` utility that throws with a clear message.
2. Replace all `process.env.VAR as string` and `process.env.VAR!` with `requireEnv("VAR")`.

**Acceptance criteria:**

- [ ] Zero `as string` on `process.env` in codebase
- [ ] Zero `!` on `process.env` in codebase
- [ ] Missing env vars throw clear error at module load
- [ ] Build passes, tests pass

---

## MEDIUM — Admin Config In-Memory Cache (PM audit #67)

### Phase 144 MEDIUM — Cache admin config queries with short TTL

> 5+ DB round trips per `/api/openai` request for admin settings that change infrequently.

**What to do:**

1. Create `src/lib/utils/config-cache.ts` — simple in-memory cache with 30s TTL.
2. Wrap each `getEffective*` resolver's DB calls in the cache.

**Acceptance criteria:**

- [ ] Admin config queries cached with 30s TTL
- [ ] Repeated calls within TTL window return cached result
- [ ] Build passes, tests pass

---

## MEDIUM — Upload Filename Collision Prevention (PM audit #67)

### Phase 145 MEDIUM — Use `crypto.randomUUID()` for upload filenames

**File:** `src/app/api/upload/route.tsx`

**What to do:** Replace `Date.now()` with `crypto.randomUUID()` in upload filename generation.

**Acceptance criteria:**

- [ ] Upload filenames use `crypto.randomUUID()`
- [ ] Build passes

---

## LOW — Admin User Detail Transaction Limit (PM audit #67)

### Phase 146 LOW — Add `.limit(50)` to admin user detail transaction query

**File:** `src/lib/utils/admin-queries.ts`

**What to do:** Add `.limit(50)` to the transaction query in `getAdminUserDetail`.

**Acceptance criteria:**

- [ ] Transaction query has `.limit(50)`
- [ ] Build passes

---

## LOW — Rename `.tsx` Utility Files to `.ts` (PM audit #67)

### Phase 147 LOW — Rename utility files with `.tsx` extension that contain no JSX

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

## LOW — Bulk Operations Partial-Failure Reporting (PM audit #67)

### Phase 148 LOW — Report partial success/failure in admin bulk operations

> Engineer finding H-6. `bulkRemoveUsersAction` fails midway through a batch with no partial-failure reporting. Users deleted so far are not reported and no rollback is possible.

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

### TypeScript 6 / @typescript-eslint compatibility — Monitor for official TS 6 support in `@typescript-eslint` (Engineer finding M-3, PM audit #66)

---

> **Completed phases** archived in [`DONE.md`](DONE.md).
> All phases through 166 complete + 160.1 + 164 + 168 complete (incl. 135–142, 149–161, 160.1, 164, 166, 168, 74.2, 104, 125.3, 126.2, 134, plus 107.1–107.3, 108, 114, 125.1, 131, 132, 133, 120.1–120.7, 121–130, 128.2, 106, 156).
> All Milestones 0–25 COMPLETE.

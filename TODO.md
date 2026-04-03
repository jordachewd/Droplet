# Droplet — TODO

> Prioritized, actionable development tasks. Each task max ~30 minutes.
> Governed by **Droplet-PM**. Do not add tasks without PM approval.
> Ref: `SPEC.md` for full specification. `AGENTS.md` for coding rules. `DONE.md` for completed phases.
> Implementation agent: **Droplet-Engineer** (Senior Developer).
>
> **STATUS: PM audit #86 (2026-04-03). DEPLOYED TO PRODUCTION. All 7 validation gates GREEN (594 tests, lint 0/0, TSC clean, build passes, knip 0). All Milestones 0–25 COMPLETE. Phases 185, 186-A, 186-B, 180.1 COMPLETE. V1.0 MVP pre-release phase.**
>
> **GATE STATUS: Validation GREEN. Architecture GREEN. Product YELLOW (~8 hardcoded marketing strings remain). Admin YELLOW (missing error boundary). Public GREEN. Contract GREEN.**
>
> **OWNER DIRECTIVES (PM audit #85 — ALL DONE):**
>
> - ✅ Remove ALL video generation from the app entirely — **DONE (Phase 186-A).**
> - ✅ Increase Token Limits by Plan and Task Class to the maximum possible — **DONE (Phase 186-B).**
>
> **OWNER DIRECTIVE (PM audit #86 — NEW):**
>
> - 🔴 Prepare pre-release task list for Engineer — fix all crucial bugs and errors for v1.0 MVP release. HIGH!
>
> **EXECUTION ORDER (PM audit #86 — V1.0 Pre-Release):**
>
> 1. **🔴 Phase 187-A — ENGINEER** — Add admin error boundary (missing `error.tsx`). Blocks release.
> 2. **🔴 Phase 187-B — ENGINEER** — Fix Clerk webhook `user.deleted` cascade order. Data integrity risk.
> 3. **🔴 Phase 187-C — ENGINEER** — Fix audio player permanent error state. UX defect in paid feature.
> 4. **HIGH Phase 143** — Env var runtime validation (7 unsafe casts). Deployment risk.
> 5. **HIGH Phase 180.4** — Currency symbol compliance (hardcoded `$`). Spec violation.
> 6. **HIGH Phase 180.2** — Chat display text extraction.
> 7. **HIGH Phase 180.3** — Plans display text extraction.
> 8. **MEDIUM Phase 187-D** — Add `download:` rate-limit key to cascade cleanup.
> 9. **MEDIUM Phase 144** — Admin config cache.
> 10. **MEDIUM Phase 165** — Checkout success page DB polling.

---

## ✅ Phase 185 — Remove `sora-2-pro` — DONE (2026-04-02)

> Archived in DONE.md.

---

## ✅ Phase 180.1 — Homepage Marketing Text Extraction — DONE (2026-04-03)

> Archived in DONE.md.

---

## ✅ Phase 186-A — Remove ALL Video Generation — DONE (2026-04-03)

> Archived in DONE.md.

---

## ✅ Phase 186-B — Increase Token Limits — DONE (2026-04-03)

> Archived in DONE.md.

---

## 🔴 ENGINEER START HERE — Phase 187-A — Add Admin Error Boundary

> PM audit #86 (v1.0 pre-release). Missing error boundary for admin route group. When an admin page throws at render time, the error bubbles to root boundary — admin loses sidebar navigation and must manually navigate back.

**File to CREATE:** `src/app/(admin)/error.tsx`

**What to do:**

1. Create an error boundary component following the same pattern as `src/app/(chat)/error.tsx`.
2. Wrap in admin layout styling (maintain sidebar context).
3. Include a "Back to Admin" link to `/admin`.
4. Include the error reset button.

**Acceptance criteria:**

- [ ] `src/app/(admin)/error.tsx` exists
- [ ] Admin render errors show within admin layout context
- [ ] "Back to Admin" navigation link present
- [ ] Error reset button present
- [ ] Build passes, tests pass

---

## 🔴 Phase 187-B — Fix Clerk Webhook `user.deleted` Cascade Order

> PM audit #86 (v1.0 pre-release). Clerk webhook deletes User document FIRST, then runs cascade. If cascade fails mid-way, orphaned tasks/transactions/uploads remain with no user record to reference for retry. The `user.actions.tsx` `deleteUser` does it correctly: cascade first, then delete user.

**File:** `src/app/api/webhooks/clerk/route.tsx`

**What to do:**

1. Move the `deleteUserCascade(clerkId, ...)` call BEFORE `User.findByIdAndDelete(userToDelete._id)`.
2. Match the pattern in `src/lib/actions/user.actions.tsx` (cascade first, delete user last).

**Acceptance criteria:**

- [ ] `deleteUserCascade` executes before `User.findByIdAndDelete`
- [ ] If cascade fails, User record remains for retry
- [ ] Build passes, tests pass

---

## 🔴 Phase 187-C — Fix Audio Player Permanent Error State

> PM audit #86 (v1.0 pre-release). When `audioElement.play()` rejects (network blip, autoplay policy), `setAudioError("Audio unavailable.")` is called and the play button becomes permanently disabled (`disabled={audioError !== null}`). No recovery path — user must reload the page.

**File:** `src/components/shared/audio-player.tsx`

**What to do:**

1. Clear `audioError` at the start of `togglePlay()` before attempting `play()`.
2. This allows the user to retry after a transient failure.

**Acceptance criteria:**

- [ ] `audioError` is cleared before each play attempt
- [ ] User can retry audio playback after a transient error
- [ ] Build passes, tests pass

---

## HIGH — Phase 180.2 — Chat Display Text Extraction

> Both are Client Components — admin settings must be passed as props from parent Server Components.

**Files:** `src/components/chat/chat-intro.tsx`, `src/components/chat/chat-input.tsx`

**Strings to extract (2-3 configurable):**

1. `chat-intro.tsx`: `"welcome to your chat dashboard."` — greeting subheading
2. `chat-input.tsx`: `"Ask Droplet..."` — input placeholder (brand-adjacent)

**Structural strings (EXEMPT — no extraction):**

- `"Active persona:"` — UI label
- `"This conversation has ended."` — system state indicator
- `"Send message"` / `"Write a message first"` — tooltips
- `"Attach media"` — tooltip
- Error messages — system text

**Acceptance criteria:**

- [ ] Configurable strings flow from admin settings via props
- [ ] Default values match current text
- [ ] Build passes, tests pass

---

## HIGH — Phase 180.3 — Plans Display Text Extraction

**Files:** `src/components/sections/shared/plans-section.tsx`, `src/components/shared/plan-card.tsx`

**Strings to extract (2 configurable):**

1. `plans-section.tsx`: `"Subscribe Now"` — CTA button label
2. `plan-card.tsx`: `"Popular"` — marketing badge

**Structural strings (EXEMPT — no extraction):**

- `"Current"` — plan status badge
- `"Free"` — pricing display
- `"/Mo"` — billing period abbreviation

**Acceptance criteria:**

- [ ] Both configurable strings flow from admin settings
- [ ] Default values match current text
- [ ] Build passes, tests pass

---

## HIGH — Phase 180.4 — Currency Symbol Compliance

> SPEC.md Section 4, Rule 8: "Currency symbol must be admin-configurable. Resolved via `getEffectiveCurrencySymbol()`."

**File:** `src/components/sections/profile/profile-billing.tsx`

**Issue:** Line 55 uses hardcoded `$` in `${txn.amount}`. Should use `getEffectiveCurrencySymbol()`.

**What to do:**

1. Pass currency symbol as prop from parent Server Component (which calls `getEffectiveCurrencySymbol()`).
2. Replace `$` with the prop value in the template literal.

**Acceptance criteria:**

- [ ] Currency symbol resolved from admin setting
- [ ] Default remains `$` (USD)
- [ ] Build passes, tests pass

---

## HIGH — Phase 143 — Env Var Runtime Validation

> **Escalated to HIGH (PM audit #86).** 7 unsafe `process.env` casts: 4 `as string` + 3 `!`. Missing env vars produce cryptic runtime crashes. Deployment risk.

**Files:** `src/constants/openai.tsx` (3x `!`), `src/constants/aws.tsx` (3x `as string`), `src/lib/database/mongoose.tsx` (1x `as string`), `src/lib/actions/transaction.action.tsx` (1x `!`)

**What to do:**

1. Create a shared `requireEnv(name: string): string` utility that throws with a clear message if undefined.
2. Replace all `process.env.VAR as string` and `process.env.VAR!` with `requireEnv("VAR")`.

**Acceptance criteria:**

- [ ] Zero `as string` on `process.env` in codebase
- [ ] Zero `!` on `process.env` in codebase
- [ ] Build passes, tests pass

---

## MEDIUM — Phase 144 — Admin Config In-Memory Cache

> 5+ DB round trips per `/api/openai` request for admin settings that change infrequently.

**What to do:**

1. Create `src/lib/utils/config-cache.ts` — simple in-memory cache with 30s TTL.
2. Wrap each `getEffective*` resolver's DB calls in the cache.

**Acceptance criteria:**

- [ ] Admin config queries cached with 30s TTL
- [ ] Build passes, tests pass

---

## MEDIUM — Phase 187-D — Add `download:` Rate-Limit Key to Cascade Cleanup

> PM audit #86 (v1.0 pre-release). `download:${userId}` rate-limit entries are NOT cleaned up in `deleteUserCascade`. Keys have TTL (expire naturally) but should be cleaned for data hygiene.

**File:** `src/lib/utils/delete-user-cascade.ts`

**What to do:**

1. Add `download:${clerkId}` to the `getRateLimitKeys()` array.

**Acceptance criteria:**

- [ ] `download:` rate-limit key included in cascade cleanup
- [ ] Build passes, tests pass

---

## MEDIUM — Phase 145 — Upload Filename Collision Prevention

**File:** `src/app/api/upload/route.tsx`

**What to do:** Replace `Date.now()` with `crypto.randomUUID()` in upload filename generation.

**Acceptance criteria:**

- [ ] Upload filenames use `crypto.randomUUID()`
- [ ] Build passes

---

## MEDIUM — Phase 165 — Checkout Success Page DB Polling

> After Stripe redirects to checkout success, webhook may not have processed yet. User sees "success" but plan is still Lite.

**What to do:**

1. Add a client component that polls a plan-status endpoint every 3-5s for up to 30s.
2. Show "Confirming your plan upgrade..." initially.
3. On confirmation: "Plan upgraded successfully!" with green indicator.
4. On timeout: "Payment successful. Your plan will be updated shortly."

**Acceptance criteria:**

- [ ] Checkout success page shows plan confirmation status
- [ ] Polling stops after confirmation or 30s timeout
- [ ] Build passes

---

## LOW — Phase 146 — Admin User Detail Transaction Limit

**What to do:** Add `.limit(50)` to the transaction query in `getAdminUserDetail`.

---

## LOW — Phase 147 — Rename `.tsx` Utility Files to `.ts`

**Files:** `handleError.tsx`, `getPlanStatus.tsx`, `getFullName.tsx`, `getFormattedDate.tsx`, `generateString.tsx`

---

## LOW — Phase 148 — Bulk Operations Partial-Failure Reporting

**What to do:** Track successful/failed operations in bulk admin actions, return partial results.

---

## ON HOLD — Deferred

### Phase 29.x — Zod/Zustand app-wide modernization

### Phase 26.x — Persona-aware media prompts, Stripe auto-renewal

### Legal/nav/footer admin configurability — Deferred to v2

### TypeScript 6 / @typescript-eslint compatibility — Monitor

---

> **Completed phases** archived in [`DONE.md`](DONE.md).

# Droplet — TODO

> Prioritized, actionable development tasks. Each task max ~30 minutes.
> Governed by **Droplet-PM**. Do not add tasks without PM approval.
> Ref: `SPEC.md` for full specification. `AGENTS.md` for coding rules. `DONE.md` for completed phases.
> Implementation agent: **Droplet-Engineer** (Senior Developer).
>
> **STATUS: PM audit #84-B (2026-04-02). DEPLOYED TO PRODUCTION. All 7 validation gates GREEN (603 tests, lint 0/0, TSC clean, build passes, knip 0). All Milestones 0–25 COMPLETE. Phases 178, 181, 182, 183 COMPLETED. C2 Stripe RESOLVED. C3 Facebook CLOSED (removed). C1 media gen ACCEPTED (Hobby plan stays).**
>
> **GATE STATUS: Validation GREEN. Architecture YELLOW (media gen architecture-limited by Vercel Hobby 60s timeout — accepted). Product YELLOW (media gen limited, `sora-2-pro` removal pending). Admin YELLOW (~12 hardcoded marketing strings). Public GREEN. Contract GREEN.**
>
> **CRITICAL ISSUES STATUS (PM audit #84-B):**
>
> - ✅ C1: Media generation timeout — ACCEPTED LIMITATION. Owner staying on Vercel Hobby. Phase 181 proactive timeout works correctly.
> - ✅ C2: Stripe payment — RESOLVED. Root cause: webhook was **disabled** in Stripe Dashboard. Owner re-enabled. Vercel logs confirm HTTP 200 + `User plan updated successfully.`
> - ✅ C3: Facebook login — CLOSED. Owner removed Facebook login from product entirely.
>
> **EXECUTION ORDER (PM audit #84-B):**
>
> 1. **🔴 Phase 185 — ENGINEER** — Remove `sora-2-pro` from codebase (owner decision: `sora-2` for all plans).
> 2. **HIGH Phase 180.1** — Homepage marketing text extraction (cta-banner + persona-spotlight).
> 3. **HIGH Phase 180.2** — Chat display text extraction (chat-intro + chat-input).
> 4. **HIGH Phase 180.3** — Plans display text extraction (plans-section + plan-card).
> 5. **HIGH Phase 180.4** — Currency symbol compliance (profile-billing).
> 6. **MEDIUM Phase 179** — Video player error state.
> 7. **MEDIUM Phase 143** — Env var runtime validation.
> 8. **MEDIUM Phase 144** — Admin config cache.
> 9. **MEDIUM Phase 145–165** — Remaining backlog.

---

## ✅ Phase 183 — Stripe Payment — RESOLVED (2026-04-02)

> Root cause: Stripe webhook endpoint was **disabled** in Stripe Dashboard. Owner re-enabled it. Vercel logs confirm: `[stripe-webhook] Checkout session cs_test_...: User plan updated successfully.` HTTP 200. All env vars verified correct.

---

## ✅ Phase 184 — Facebook Login — CLOSED (2026-04-02)

> Owner decision: Facebook login/register option **removed** from product. No longer used. No code changes needed (zero Facebook code in `src/`).

---

## 🔴 ENGINEER START HERE — Phase 185 — Remove `sora-2-pro` from Codebase

> Owner decision: use `sora-2` for ALL plans. Remove `sora-2-pro` entirely.

**Files to modify:**

1. `src/lib/utils/ai-model-policy.ts`:
   - Remove the `"sora-2-pro"` entry from `MODEL_PRICING` (~line 388)
   - Remove the Premium video resolver override that sets `model = "sora-2-pro"` (~line 650). Premium video should use `sora-2` like all other plans.
   - Update the `final` task class notes in Premium `video_generation` policy (~line 344) — remove `sora-2-pro` reference.

2. `src/constants/admin-options.ts`:
   - Change `VIDEO_MODEL_OPTIONS` from `["sora-2", "sora-2-pro"]` to `["sora-2"]`.

3. `tests/unit/utils/ai-model-policy.test.ts`:
   - Update the test at ~line 156 that asserts `premiumFinalPolicy.model` is `"sora-2-pro"` — should now be `"sora-2"`.

**Acceptance criteria:**

- [ ] Zero `sora-2-pro` references in `src/`
- [ ] Zero `sora-2-pro` references in `tests/`
- [ ] Premium video generation resolves to `sora-2`
- [ ] Admin video model options show only `sora-2`
- [ ] Build passes, tests pass

---

## HIGH — Phase 180.1 — Homepage Marketing Text Extraction

> AGENTS.md Rule 11: "No hardcoded display text." Owner escalated to HIGH. Homepage is the highest-visibility surface.

**Files:** `src/components/sections/homepage/cta-banner.tsx`, `src/components/sections/homepage/persona-spotlight.tsx`

**Strings to extract (7 marketing + 1 config):**

1. `cta-banner.tsx`: `"Create an account, pick a persona, and let the conversation stay focused."` — heading
2. `cta-banner.tsx`: `"Explore the persona catalog first, or compare the plan limits if you already know how much capacity you need."` — body
3. `cta-banner.tsx`: `"Create account"` — CTA button label
4. `cta-banner.tsx`: `"Explore plans"` — CTA button label
5. `persona-spotlight.tsx`: `"Persona spotlight"` — section label
6. `persona-spotlight.tsx`: `"Different jobs need different voices."` — heading
7. `persona-spotlight.tsx`: `"Droplet starts with purpose-built personas so planning, teaching, and creative work do not feel like the same assistant wearing a different label."` — body
8. `persona-spotlight.tsx`: `["strategist", "teacher", "creator"]` — hardcoded featured persona IDs

**What to do:**

1. Add new admin-configurable keys to the existing `effective-promo-content.ts` resolver (or create `effective-website-copy.ts` if the existing resolver scope doesn't fit).
2. Add corresponding defaults to `DEFAULT_PROMO_CONTENT` (or new defaults constant).
3. Update both components to receive configurable text as props from Server Component parents.
4. For featured persona IDs: add admin setting key `admin.homepageFeaturedPersonas` with default `["strategist", "teacher", "creator"]`.

**Acceptance criteria:**

- [ ] All 7 marketing strings flow from admin-configurable settings
- [ ] Featured persona IDs flow from admin setting
- [ ] Default values match current hardcoded strings
- [ ] Admin panel shows editable fields for these strings
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

## MEDIUM — Phase 179 — Add Video Player Error State

> `video-player.tsx` has no error handling. If the video URL fails to load, the browser shows a default broken element with no user-facing message. The audio player (`audio-player.tsx`) already handles this well — match that pattern.

**File:** `src/components/shared/video-player.tsx`

**What to do:**

1. Add `onError` handler to the `<video>` element.
2. Show user-facing error state ("Video unavailable.") similar to `AudioPlayer`.

**Acceptance criteria:**

- [ ] Video player shows error message on failed load
- [ ] Build passes

---

## MEDIUM — Phase 143 — Env Var Runtime Validation

> 8 unsafe `process.env` casts: 4 `as string` + 4 `!`. Missing env vars produce cryptic runtime crashes.

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

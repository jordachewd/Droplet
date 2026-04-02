# Droplet — TODO

> Prioritized, actionable development tasks. Each task max ~30 minutes.
> Governed by **Droplet-PM**. Do not add tasks without PM approval.
> Ref: `SPEC.md` for full specification. `AGENTS.md` for coding rules. `DONE.md` for completed phases.
> Implementation agent: **Droplet-Engineer** (Senior Developer).
>
> **STATUS: PM audit #84 (2026-04-02). DEPLOYED TO PRODUCTION. All 7 validation gates GREEN (603 tests, lint 0/0, TSC clean, build passes, knip 0). All Milestones 0–25 COMPLETE. Phases 178, 181, 182 COMPLETED. Owner production test confirmed THREE critical issues.**
>
> **GATE STATUS: Validation GREEN. Architecture YELLOW (media gen architecture-limited by Vercel Hobby 60s timeout). Product RED (C2 Stripe payment broken, C3 Facebook login broken, C1 media gen architecture-limited). Admin YELLOW (~12 hardcoded marketing strings). Public GREEN. Contract GREEN.**
>
> **CRITICAL ISSUES STATUS (PM audit #84):**
>
> - 🔴 C1: Media generation timeout — ARCHITECTURE LIMITATION (NOT code bug). Phase 181 proactive timeout CONFIRMED WORKING in production. Vercel Hobby 60s limit too short for media gen (image 30–90s, audio 15–60s, video 60–180s). Fix: Vercel Pro upgrade ($20/mo) or async media gen.
> - 🔴 C2: Stripe payment — REVENUE BLOCKER. Payment processes in Stripe, but no Transaction in MongoDB and no plan update. Code sextuple-audited correct (PM + Architect + Engineer, zero bugs found). PRIMARY SUSPECT: `STRIPE_WEBHOOK_SECRET` not set or wrong in Vercel production env vars. Owner must verify Vercel Dashboard (NOT .env.local). Phase 183.
> - 🔴 C3: Facebook login — "Feature Unavailable." Zero Facebook-related code in src/. 100% Clerk + Meta Developer Console configuration issue. Phase 184.
>
> **EXECUTION ORDER (PM audit #84):**
>
> 1. **🔴 Phase 183 — OWNER ACTION** — Stripe payment investigation (Vercel env vars + Stripe delivery logs). REVENUE BLOCKER.
> 2. **🔴 Phase 184 — OWNER ACTION** — Facebook login investigation (Clerk + Meta Developer Console config).
> 3. **🟠 OWNER DECISION** — Vercel Pro upgrade ($20/mo) to unlock media generation (raises maxDuration to 300s).
> 4. **HIGH Phase 180.1** — Homepage marketing text extraction (cta-banner + persona-spotlight).
> 5. **HIGH Phase 180.2** — Chat display text extraction (chat-intro + chat-input).
> 6. **HIGH Phase 180.3** — Plans display text extraction (plans-section + plan-card).
> 7. **HIGH Phase 180.4** — Currency symbol compliance (profile-billing).
> 8. **MEDIUM Phase 179** — Video player error state.
> 9. **MEDIUM Phase 143** — Env var runtime validation.
> 10. **MEDIUM Phase 144** — Admin config cache.
> 11. **MEDIUM Phase 145–165** — Remaining backlog.

---

## � CRITICAL — Phase 183 — Stripe Payment Investigation (REVENUE BLOCKER)

> **OWNER ACTION REQUIRED.** No code fix needed. Code sextuple-audited correct by PM, Architect, and Engineer. The issue is almost certainly a Vercel production environment variable mismatch.

**Investigation Checklist:**

1. **Verify Vercel production env vars:**
   - Go to Vercel Dashboard → Project → Settings → Environment Variables
   - Confirm `STRIPE_WEBHOOK_SECRET` exists and is set for the **Production** environment
   - Confirm its value matches the signing secret from: Stripe Dashboard → Developers → Webhooks → select the endpoint → Signing secret
   - **IMPORTANT:** `.env.local` is LOCAL ONLY. Vercel production uses dashboard env vars, NOT `.env.local`.

2. **Check Stripe mode alignment:**
   - Verify `STRIPE_SECRET_KEY` in Vercel env vars. Test keys start with `sk_test_`, live keys start with `sk_live_`.
   - The webhook endpoint's signing secret must be from the SAME mode (test vs live) as the API keys.
   - If you have separate test and live webhook endpoints in Stripe, each has a DIFFERENT signing secret.

3. **Check Stripe webhook delivery logs:**
   - Stripe Dashboard → Developers → Webhooks → select the production endpoint → Recent deliveries
   - Look for `checkout.session.completed` events. Check HTTP status code:
     - **400** = signature verification failed (signing secret mismatch — most likely)
     - **500** = server error (DB connection or other runtime failure)
     - **No delivery attempts** = endpoint URL wrong or event type not enabled
   - Click on a failed delivery to see the response body for diagnostic info.

4. **Check Vercel function logs:**
   - Vercel Dashboard → Project → Logs → Filter for `/api/webhooks/stripe`
   - Look for `[stripe-webhook]` log lines. If no logs exist, Stripe is not reaching the endpoint at all.
   - If logs show "Invalid webhook signature", the `STRIPE_WEBHOOK_SECRET` value is wrong.

5. **Also verify these env vars exist in Vercel for Production:**
   - `STRIPE_SECRET_KEY` (confirmed working — checkout-success page uses it successfully)
   - `MONGODB_URL` and `MONGODB_DB_NAME` (must match the DB you're reading from in the admin panel)
   - `NEXT_PUBLIC_API_BASE_URL` (used for checkout redirect URLs)

**After fix:** Make a test payment and verify:

- [ ] Transaction appears in MongoDB (admin panel → Transactions)
- [ ] User plan updates from Lite to purchased plan
- [ ] Stripe Dashboard shows 200 response on webhook delivery

---

## 🔴 CRITICAL — Phase 184 — Facebook Login Investigation (AUTH BLOCKER)

> **OWNER ACTION REQUIRED.** Zero Facebook-related code in `src/`. This is 100% a Clerk + Meta Developer Console configuration issue.

**Investigation Checklist:**

1. **Clerk Dashboard → Social Connections → Facebook:**
   - Verify Facebook is enabled as a social connection
   - Verify Facebook App ID and App Secret are configured
   - Note the OAuth callback URL Clerk expects (you'll need this for Facebook)

2. **Meta Developer Console (developers.facebook.com):**
   - Verify the Facebook App is in **Live** mode (not Development mode)
   - If in Development mode, only test users can log in — regular users get "Feature Unavailable"
   - Go to App Review and submit for review if needed (usually `email` + `public_profile` permissions)

3. **Facebook App → Facebook Login → Settings:**
   - Verify **Valid OAuth Redirect URIs** includes Clerk's callback URL
   - The callback URL is typically: `https://clerk.droplet.jwd-apps.com/v1/oauth_callback` (or similar — check Clerk Dashboard)

4. **Facebook App → Settings → Basic:**
   - Verify App Domains includes `droplet.jwd-apps.com`
   - Verify Privacy Policy URL and Terms of Service URL are set (required for Live mode)

**After fix:** Test Facebook login from the sign-in page. Verify redirect + account creation works.

---

## 🟠 OWNER DECISION — Vercel Pro Upgrade (Media Generation)

> **Not a code bug.** Phase 181 proactive timeout IS working correctly in production — users get a clean warning message instead of a stream death. The issue is that media generation operations exceed the Vercel Hobby plan's 60s function timeout.

**Timing analysis (Engineer audit):**

| Operation          | Best Case | Worst Case | Fits in 55s budget?    |
| ------------------ | --------- | ---------- | ---------------------- |
| Image gen          | ~19s      | ~58s       | Marginal — often fails |
| Audio gen (TTS)    | ~11s      | ~33s       | Usually OK             |
| Audio gen (in/out) | ~15s      | ~40s       | Usually OK             |
| Video gen          | ~42s      | ~223s      | NEVER fits             |

**Options:**

1. **Vercel Pro ($20/mo)** — raises `maxDuration` to 300s. Engineer changes one line (`export const maxDuration = 300`). Image/audio immediately functional. Video likely works. **RECOMMENDED.**
2. **Async media gen** — background job + polling pattern. Major architecture change. Deferred to v2.

**After decision:** If upgrading, tell Engineer to update `maxDuration` in [route.tsx](src/app/api/openai/route.tsx) and [route.tsx](src/app/api/download/route.tsx).

---

## 🔵 ENGINEER START HERE — Phase 180.1 HIGH — Homepage Marketing Text Extraction

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

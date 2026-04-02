# Droplet — TODO

> Prioritized, actionable development tasks. Each task max ~30 minutes.
> Governed by **Droplet-PM**. Do not add tasks without PM approval.
> Ref: `SPEC.md` for full specification. `AGENTS.md` for coding rules. `DONE.md` for completed phases.
> Implementation agent: **Droplet-Engineer** (Senior Developer).
>
> **STATUS: PM audit #82 (2026-04-01). DEPLOYED TO PRODUCTION. All 7 validation gates GREEN (601 tests, lint 0/0, TSC clean, build passes, knip 0). All Milestones 0–25 COMPLETE. Phases 173–177 COMPLETED this session. Phase 178 NOT completed (fake icon still present).**
>
> **GATE STATUS: Validation GREEN. Architecture RED (C1 stream timeout). Product RED (C1 media gen broken, C2 payment flow broken). Admin YELLOW (~20-30 hardcoded strings). Public GREEN. Contract GREEN.**
>
> **ACTIVE CRITICAL ISSUES (PM audit #82 — triple-audit: Architect + Engineer + PM):**
>
> - 🔴 C1: Stream timeout miscalculated — proactive 55s timer starts from STREAM START, not FUNCTION START. Setup takes 10-20s, so timer fires at 65-75s — AFTER Vercel kills at 60s. Media gen and large text responses fail with "The response stream ended unexpectedly."
> - 🔴 C2: Stripe webhook returns 200 but no Transaction created / User plan not updated. Code verified correct by triple audit — issue is operational (event type config, endpoint URL, or signing secret in Stripe dashboard).
>
> **ACTIVE NON-CRITICAL ISSUES:**
>
> - ⚠️ H4: Fake download icon in `profile-billing.tsx` — styled clickable, no handler, no keyboard access. Phase 178 NOT done.
> - ⚠️ M1: No video player error state (unlike audio player).
> - ⚠️ M2: ~20-30 hardcoded display strings across 8+ components (AGENTS.md Rule 11 violation). Owner escalated to HIGH.
> - ⚠️ M3: Hardcoded persona IDs `["strategist", "teacher", "creator"]` in homepage spotlight.
>
> **EXECUTION ORDER (PM audit #82 — critical production fixes FIRST, everything else blocked):**
>
> 1. **🔴 Phase 181 CRITICAL** — Fix stream timeout miscalculation.
> 2. **🔴 Phase 182 CRITICAL** — Diagnose and fix Stripe webhook payment flow (ops investigation + code hardening).
> 3. **HIGH Phase 178** — Fix/remove fake download icon (was not completed by Engineer).
> 4. **HIGH Phase 180** — Hardcoded display text sweep (owner escalated).
> 5. **MEDIUM Phase 179** — Add video player error state.
> 6. **MEDIUM Phase 143** — Env var runtime validation.
> 7. **MEDIUM Phase 144** — Admin config cache.
> 8. **MEDIUM Phase 145–165** — Remaining backlog.
>
> _Critical issues block ALL other work. No exceptions._

---

## 🔴 ENGINEER START HERE — Phase 181 CRITICAL — Fix Stream Timeout Miscalculation

> **Root cause confirmed by triple-audit (Architect + Engineer + PM).** The proactive safety timeout (55s) is measured from STREAM START (`ReadableStream.start()` callback), NOT from FUNCTION START (`POST()` entry point). Setup work (auth, DB queries, title generation) consumes 2-20s before the stream begins. The proactive timeout fires 55s after stream start = 57-75s from function start — AFTER Vercel kills the function at 60s (`maxDuration`). The client never receives a clean error event; instead Vercel hard-terminates the function and the client gets "The response stream ended unexpectedly."

**File:** `src/app/api/openai/route.tsx`

**Root cause location:**

- `POST()` function starts at ~line 772
- Setup work (auth, rate limit, DB queries, title generation) runs from ~line 772 to ~line 1438
- `startTime = Date.now()` captured at ~line 1440 inside `ReadableStream.start()`
- `timeoutSafetyMs = (maxDuration - STREAM_TIMEOUT_SAFETY_BUFFER_SECONDS) * 1000` = 55,000ms at ~line 1441-1442
- Proactive timeout scheduled at ~line 1587: `setTimeout(() => {...}, timeoutSafetyMs)` — 55s from stream start, NOT function start

**What to do:**

1. Add `const functionStartTime = Date.now();` as the **very first line** inside `POST()`, before the `try` block (or as first line inside try).
2. Inside `ReadableStream.start()`, replace:
   ```typescript
   const startTime = Date.now();
   const timeoutSafetyMs =
     (maxDuration - STREAM_TIMEOUT_SAFETY_BUFFER_SECONDS) * 1000;
   ```
   with:
   ```typescript
   const startTime = Date.now();
   const elapsedSetupMs = startTime - functionStartTime;
   const timeoutSafetyMs = Math.max(
     0,
     (maxDuration - STREAM_TIMEOUT_SAFETY_BUFFER_SECONDS) * 1000 -
       elapsedSetupMs,
   );
   ```
3. `Math.max(0, ...)` prevents negative timeout in pathological cases (setup exceeds full budget).
4. Update unit tests for the new timeout computation if existing tests assert `timeoutSafetyMs` value.

**Acceptance criteria:**

- [ ] `functionStartTime` captured at `POST()` entry, before any async work
- [ ] Proactive timeout computation accounts for setup elapsed time
- [ ] Proactive timeout always fires BEFORE Vercel's 60s kill regardless of setup duration
- [ ] `Math.max(0, ...)` guard against negative timeout
- [ ] Build passes, tests pass
- [ ] Deploy and verify: image generation request should produce a clean proactive timeout message instead of "stream ended unexpectedly"

**Important note:** This fix ensures the proactive timeout fires correctly. However, media generation operations that inherently exceed 60s total (e.g., video at 30-120s + setup) will still fail on Vercel Hobby. The proactive timeout will now correctly send a clean error message instead of an abrupt stream death. Full media gen reliability requires either Vercel Pro ($20/mo, 300s limit) or architecture change.

---

## 🔴 Phase 182 CRITICAL — Diagnose and Fix Stripe Webhook Payment Flow

> **Code verified correct by triple-audit (Architect + Engineer + PM).** All code paths that return 200 for `checkout.session.completed` DO create a Transaction and update the User plan. The 200 responses the owner sees are most likely for NON-checkout events (`charge.succeeded`, `payment_intent.created`, etc.) which correctly return 200 "Unhandled event" without creating records.

**File:** `src/app/api/webhooks/stripe/route.tsx`

**Investigation steps (OWNER/OPS — must be done before code changes):**

1. **Check Vercel function logs** during a test payment — search for `[stripe-webhook]` entries. Look for `"Event type received: checkout.session.completed"`. If this log line is ABSENT, the `checkout.session.completed` event is not reaching the handler.
2. **Check Stripe Dashboard → Webhooks → Endpoint configuration** — verify `checkout.session.completed` is in the enabled events list. Stripe sends multiple events per checkout (`payment_intent.created`, `charge.succeeded`, etc.) — only `checkout.session.completed` triggers Transaction+Plan updates.
3. **Check Stripe Dashboard → Webhooks → Endpoint URL** — verify it matches the current production deployment URL (e.g., `https://droplet.jwd-apps.com/api/webhooks/stripe`).
4. **Check Vercel env vars** — verify `STRIPE_WEBHOOK_SECRET` matches the signing secret shown on the webhook endpoint page in Stripe Dashboard.
5. **Check Stripe live vs test mode** — ensure webhook events, endpoint, and secrets are all in the same mode.

**Code hardening (after ops investigation):**

1. Add the event type to the "Unhandled event" response body so it's visible in Stripe Dashboard delivery logs:
   ```typescript
   return NextResponse.json(
     { message: "Unhandled event", eventType },
     { status: 200 },
   );
   ```
2. This makes it immediately clear when the webhook is receiving non-checkout events.

**Acceptance criteria:**

- [ ] Owner confirms `checkout.session.completed` event reaches the handler (via Vercel logs)
- [ ] If event is not reaching handler: fix Stripe Dashboard config (enable event type, verify URL, verify secret)
- [ ] "Unhandled event" response includes `eventType` field for easier diagnosis
- [ ] Test payment creates Transaction AND updates User plan
- [ ] Build passes, tests pass

---

## HIGH — Phase 178 — Fix Profile Billing Fake Download Icon

> **NOT COMPLETED by Engineer despite Phase 178 being in the work report.** The icon is still present at `profile-billing.tsx` line 49. It renders a styled `<i>` element inside a `<TooltipArrow>` with no click handler, no button wrapper, and `aria-hidden="true"`.

**File:** `src/components/sections/profile/profile-billing.tsx` ~line 45-53

**Current code:**

```tsx
<TooltipArrow title="Invoice" placement="top">
  <i className="bi bi-cloud-download ml-4 text-base" aria-hidden="true"></i>
</TooltipArrow>
```

**What to do:**

1. Remove the entire `<TooltipArrow>` + `<i>` block from the billing table header.
2. No download functionality exists — remove is the correct action.

**Acceptance criteria:**

- [ ] No fake clickable elements in profile billing
- [ ] Build passes, tests pass

---

## HIGH — Phase 180 — Hardcoded Display Text Sweep

> AGENTS.md Rule 11: "No hardcoded display text — all user-facing marketing/promo text must flow from admin-configurable settings." ~20-30 strings across 8+ components violate this. **Owner escalated to HIGH priority.**

**Files and strings to evaluate:**

1. `src/components/sections/homepage/cta-banner.tsx` — 4 strings: heading, body, 2 CTA button labels
2. `src/components/sections/homepage/persona-spotlight.tsx` — 3 strings + hardcoded persona IDs `["strategist", "teacher", "creator"]`
3. `src/components/chat/chat-intro.tsx` — 2 strings: greeting subheading, "Active persona:" label
4. `src/components/sections/shared/plans-section.tsx` — "Subscribe Now"
5. `src/components/chat/chat-input.tsx` — 2 strings: ended placeholder, active placeholder
6. `src/components/sections/profile/profile-usage.tsx` — media generation labels
7. `src/components/sections/profile/profile-hero.tsx` — "Member since:", "Last update:"
8. `src/components/shared/plan-card.tsx` — "Current", "Popular", "Free", "/Mo"
9. `src/components/sections/profile/profile-danger-zone.tsx` — "Danger zone", "Deleting your account..."

**What to do:**

1. Evaluate each string: structural UI label (exempt per Rule 11) vs marketing/configurable text.
2. For configurable text: add to `effective-promo-content.ts` or create new `effective-ui-labels.ts` resolver.
3. For structural UI labels: document as intentionally exempt with brief comment if needed.

**Note:** This is a large phase. PM may split into sub-phases (180.1, 180.2, etc.) if needed.

**Acceptance criteria:**

- [ ] Every hardcoded string classified as exempt or extracted
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

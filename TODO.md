# Droplet — TODO

> Prioritized, actionable development tasks. Each task max ~30 minutes.
> Governed by **Droplet-PM**. Do not add tasks without PM approval.
> Ref: `SPEC.md` for full specification. `AGENTS.md` for coding rules. `DONE.md` for completed phases.
> Implementation agent: **Droplet-Engineer** (Senior Developer).
>
> **STATUS: PM audit #130 (2026-04-17). 4 CRITICAL bugs found. Stripe billing UI broken (2 projection bugs + webhook config). Clerk sync incomplete (silent data loss risk). All other gates GREEN.**
>
> **GATE STATUS: All 7 gates GREEN. 0 npm vulnerabilities. Code hygiene 100%.**
>
> **TEST STATUS: 729 tests (110 suites), 49 E2E (6 skipped). 0 failures. All gates GREEN.**
>
> **ACTIVE BACKLOG: PM audit #130 — 4 CRITICAL items. 1 HIGH item. 1 MEDIUM item. 0 god files. Largest: generateResponse.tsx (861), admin-queries.ts (826), normalize-admin-settings.ts (813), openai/route.tsx (805). All under 900 lines.**

---

## Archived Phases — See [DONE.md](DONE.md)

> All phases through 233 + Phase 226 + Phase 228 + Phase 229 + admin sidebar persistence + type file cleanup archived. See DONE.md for completion records.

---

## Execution Order (PM audit #130) — CRITICAL PATH

> **4 CRITICAL + 1 HIGH + 1 MEDIUM items. All feature work ON HOLD until resolved.**

### Phase 234-A — CRITICAL: Fix `USER_SYNC_PROJECTION` Missing Fields

**Issue:** `ensure-user-synced.ts` `USER_SYNC_PROJECTION` constant does not include `stripeSubscriptionId`, `subscriptionStatus`, `stripeCustomerId`, or `suspended`. These top-level User fields are stripped from all queries that use `ensureUserSynced()`, causing the profile billing section to always show null for subscription data.

**File:** `src/lib/utils/ensure-user-synced.ts` line 9–10.

**Fix:** Add the 4 missing fields to the projection string:

```
Old: "clerkId username email role plan firstName lastName userimg registerAt updatedAt dailyConversationsStarted dailyConversationWindowStart"
New: "clerkId username email role plan firstName lastName userimg registerAt updatedAt dailyConversationsStarted dailyConversationWindowStart stripeCustomerId stripeSubscriptionId subscriptionStatus suspended"
```

**Acceptance criteria:**

- [ ] `USER_SYNC_PROJECTION` includes `stripeCustomerId stripeSubscriptionId subscriptionStatus suspended`
- [ ] Profile page receives non-null `stripeSubscriptionId` and `subscriptionStatus` when user has active subscription
- [ ] `ProfileBilling` shows correct subscription state (Active/Canceling/Past due/Canceled)
- [ ] Sidebar suspension display works when `user.suspended === true`
- [ ] All 7 gates pass

---

### Phase 234-A2 — CRITICAL: Fix `getAllTransactions` Missing `stripeId` in Projection

**Issue:** `getAllTransactions()` uses `.select("plan amount billing createdAt expiresOn")` — missing `stripeId`. The billing history UI in `ProfileBilling` compares `txn.stripeId === stripeId` to determine Active vs Inactive status. Since `stripeId` is never fetched, `txn.stripeId` is always `undefined`, causing ALL transactions to display as "Inactive" regardless of actual state.

**File:** `src/lib/actions/transaction.action.tsx` line ~449.

**Fix:** Add `stripeId` to the `.select()` projection:

```
Old: .select("plan amount billing createdAt expiresOn")
New: .select("plan amount billing createdAt expiresOn stripeId")
```

**Acceptance criteria:**

- [ ] `getAllTransactions` `.select()` includes `stripeId`
- [ ] The current active subscription's transaction shows "Active" (green badge) in billing history
- [ ] Previous/older transactions show "Inactive" (gray badge) — this is correct behavior
- [ ] All 7 gates pass

---

### Phase 234-B — CRITICAL: Stripe Webhook Verification (Owner Action Required)

**Issue:** Stripe webhook is not delivering events to the app. Payment succeeds in Stripe but plan stays Lite, no Transaction created, billing history empty.

**This was previously resolved as C2 (PM audit #84-B) — webhook was disabled. The issue has recurred.**

**IMPORTANT: Stripe CLI localhost testing was using the WRONG URL.** Terminal shows `--forward-to http://localhost:3000/api/stripe/webhook` — the correct URL is `http://localhost:3000/api/webhooks/stripe`. This explains localhost test failures.

**Owner must verify in Stripe Dashboard (cannot be fixed from code):**

1. **Stripe Dashboard → Developers → Webhooks** — Verify endpoint exists.
2. **Endpoint URL** — Must be `https://<production-domain>/api/webhooks/stripe` (NOT `/api/stripe/webhook`).
3. **Events to send** — Must include ALL of these:
   - `checkout.session.completed`
   - `invoice.paid`
   - `invoice.payment_failed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. **Signing secret** — The webhook's signing secret (starts with `whsec_`) must match `STRIPE_WEBHOOK_SECRET` in **production** environment variables (Vercel Dashboard → Settings → Environment Variables). Not just `.env.local`.
5. **Mode match** — Both the Stripe API keys (used for checkout) and the webhook endpoint must be in the **same mode** (Test or Live). A Live-mode checkout won't trigger Test-mode webhooks.
6. **Recent deliveries** — Check the webhook's "Recent deliveries" tab for failed delivery attempts (HTTP 400/500 responses).
7. **Endpoint status** — Must be "Enabled", not "Disabled".

**For localhost testing with Stripe CLI — use this exact command:**

```bash
stripe listen --events checkout.session.completed,invoice.paid,invoice.payment_failed,customer.subscription.updated,customer.subscription.deleted --forward-to http://localhost:3000/api/webhooks/stripe
```

**Acceptance criteria:**

- [ ] Stripe Dashboard shows webhook endpoint pointing to correct production URL (`/api/webhooks/stripe`)
- [ ] All 5 event types are enabled on the endpoint
- [ ] Signing secret matches production `STRIPE_WEBHOOK_SECRET`
- [ ] New test payment triggers `checkout.session.completed` webhook with HTTP 200 response
- [ ] Transaction appears in MongoDB after payment
- [ ] User `plan.name` updates to "Pro" in MongoDB after payment
- [ ] Profile page shows correct plan name and billing history
- [ ] Sidebar promo card reflects updated plan

---

### Phase 235 — CRITICAL: MongoDB→Clerk Bidirectional Sync for Name Fields

**Issue:** When users edit their profile (firstName, lastName) in the app, changes are saved to MongoDB but NOT synced to Clerk. This creates two problems:

1. **Stale display:** Clerk-powered UI components (session tokens, Clerk-managed elements) show old name.
2. **Silent data loss:** The next `user.updated` webhook from Clerk (triggered by any Clerk-side change) will OVERWRITE the MongoDB values with the stale Clerk values — effectively reverting the user's profile edits.

**Current state (verified):**

- Avatar (`userimg` → `imageUrl`) syncs MongoDB→Clerk ✅ (Phase 201)
- `firstName` — NOT synced to Clerk ❌
- `lastName` — NOT synced to Clerk ❌
- `email` — NOT synced to Clerk ❌ (requires Clerk verification flow — see note below)

**File:** `src/lib/actions/user.actions.tsx` lines 78–93.

**Fix:** Expand the Clerk sync block to include `firstName` and `lastName`:

```typescript
// Current: only syncs imageUrl
if (typeof parsedUser.data.userimg === "string") {
  await client.users.updateUser(parsedClerkId.data, {
    imageUrl: parsedUser.data.userimg,
  });
}

// Fixed: sync imageUrl + firstName + lastName
const clerkSyncPayload: Record<string, string> = {};
if (typeof parsedUser.data.userimg === "string") {
  clerkSyncPayload.imageUrl = parsedUser.data.userimg;
}
if (typeof parsedUser.data.firstName === "string") {
  clerkSyncPayload.firstName = parsedUser.data.firstName;
}
if (typeof parsedUser.data.lastName === "string") {
  clerkSyncPayload.lastName = parsedUser.data.lastName;
}
if (Object.keys(clerkSyncPayload).length > 0) {
  await client.users.updateUser(parsedClerkId.data, clerkSyncPayload);
}
```

**Email sync note:** Clerk treats email as a verified identity. Changing email requires Clerk's email verification flow (create → verify → set primary). This is complex and should be deferred. For now, email editing in the profile should either: (a) be disabled with a note directing users to Clerk's account settings, or (b) left as-is with the understanding that email changes are MongoDB-only. PM decision: defer email sync to a future phase. Document as known limitation.

**Acceptance criteria:**

- [ ] `updateUser` syncs `firstName` to Clerk when changed
- [ ] `updateUser` syncs `lastName` to Clerk when changed
- [ ] `updateUser` syncs `imageUrl` to Clerk when changed (existing, preserved)
- [ ] All syncs are non-blocking (try/catch with stderr logging)
- [ ] Clerk sync is batched into a single `updateUser` call (not 3 separate calls)
- [ ] All 7 gates pass
- [ ] After editing name in app, Clerk Dashboard shows updated name

---

### Phase 234-C — HIGH: Improve Checkout Success Timeout Message

**Issue:** When the plan status poller times out (webhook delayed or failed), it shows a misleading message that implies the plan will update "shortly" — but if the webhook is broken, it never will.

**File:** `src/components/shared/checkout-plan-status-poller.tsx`

**Fix:** Change the timeout state message to include a warning and support contact instruction.

**Acceptance criteria:**

- [ ] Timeout message explicitly warns: "If your plan hasn't updated within 10 minutes, please contact support."
- [ ] Message uses a warning color (amber/orange tone) to distinguish from the success state
- [ ] All 7 gates pass

---

### Phase 234-D — MEDIUM: Email/Invoice Setup Guidance (Owner Action)

**Issue:** No payment confirmation email, no downloadable invoice.

**Stripe handles this natively — zero code changes required. Owner configuration:**

1. **Payment receipts:** Stripe Dashboard → Settings → Customer emails → Enable "Successful payments" email receipts. Stripe will automatically send a receipt email to the customer's email address after each successful payment.

2. **Invoices for subscriptions:** Stripe already generates invoices for all subscription payments. These are accessible via:
   - Stripe Dashboard → Customers → [customer] → Invoices tab
   - Programmatically via `invoice.hosted_invoice_url` (web view) or `invoice.invoice_pdf` (PDF download)

3. **To show download links in the app (future enhancement — not required now):** The `invoice.paid` webhook already receives the invoice object. The app could store `hosted_invoice_url` in the Transaction model and display it in the billing history table. This is a v1.1 feature, not a v1.0 blocker.

**Acceptance criteria:**

- [ ] Stripe Dashboard "Successful payments" email enabled
- [ ] New test payment triggers a receipt email to the customer
- [ ] Owner has access to invoice PDFs via Stripe Dashboard

---

## SORTED DEFERRED ITEMS (PM audit #128)

> Owner requested all deferred items be sorted. Sorted by value, with PM verdict.

### 1. Vercel Pro Upgrade — RECOMMENDED (Business Decision)

> $20/mo. Raises `maxDuration` from 60s to 300s. Eliminates media generation timeout edge cases. Zero engineering effort. Highest-leverage infrastructure spend. **Promote when monthly revenue exceeds ~$100/mo or when first user reports a timeout.** Not a code change.

### 2. Phase 29.6 — updateAdminSettingAction Zod Schema Map — MONITOR

> **Current state:** 18 branches in main update function (verified PM audit #128). Working correctly with Zod under the hood. Deferral threshold was ~25 branches. **Still 7 branches below threshold.** Revisit only if branch count approaches 25 or bugs emerge. CLOSED as accepted pattern — reopen only if growth resumes.

### 3. E2E Firefox Flake — MONITOR

> 1 test (`error-boundary-handling > API failure feedback`) fails intermittently on Firefox only. Chromium/WebKit pass. Browser timing issue, not product bug. Fix only if it becomes persistent or blocks CI.

### 4. Legal/Nav/Footer Admin Configurability — DEFERRED TO V2

> Legal text requires legal review regardless of configurability. Nav is structural (tied to routes). Footer changes ~yearly. Zero user impact. Lowest priority of all deferred items.

---

> **Completed phases** archived in [`DONE.md`](DONE.md).
> Includes: Phases 143–148, 165, 165.1, 180.1–180.4, 185–222 (all sub-phases), 217-A/B/C/C-fix/D/E/F/G, 218-B, 218-C, 218-C-fix, 26.x, 29.1–29.5, 29.7, 223, 224, 225-A/B/C/D, 226, 227, 228, 229, 230, 231, 231-fix, 232, 233, type file cleanup, admin sidebar persistence.
> Phase 29.7 (Zustand audit) — COMPLETE. No changes needed. 4 stores, all properly implemented.
> TypeScript 6 / ESLint compatibility — **CLOSED** (audit #103). No issues.
> jsdom upgrade — **PIN MAINTAINED** (audit #103). ~24.1.3 stable. ESM TLA incompatibility persists.
> E2E fragile homepage heading — **FIXED** (audit #105). Structural assertion.

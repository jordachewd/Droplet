# Droplet — TODO

> Prioritized, actionable development tasks. Each task max ~30 minutes.
> Governed by **Droplet-PM**. Do not add tasks without PM approval.
> Ref: `SPEC.md` for full specification. `AGENTS.md` for coding rules. `DONE.md` for completed phases.
> Implementation agent: **Droplet-Engineer** (Senior Developer).
>
> **STATUS: PM audit #130 (2026-04-17). Phases 234-A, 234-A2, 235, 234-C, 236 COMPLETE. 2 remaining items: 1 CRITICAL owner action (Stripe webhook config), 1 MEDIUM owner action (email/invoice setup). All code fixes applied. All 7 gates GREEN.**
>
> **GATE STATUS: All 7 gates GREEN. 0 lint errors. 0 npm vulnerabilities. Code hygiene 100%.**
>
> **TEST STATUS: 730 tests (110 suites), 49 E2E (6 skipped). 0 failures. All gates GREEN.**
>
> **ACTIVE BACKLOG: PM audit #130 — 1 CRITICAL owner action. 1 MEDIUM owner action. 0 code items. 0 god files. Largest: generateResponse.tsx (861), admin-queries.ts (826), normalize-admin-settings.ts (813), openai/route.tsx (805). All under 900 lines.**

---

## Archived Phases — See [DONE.md](DONE.md)

> All phases through 236 archived. See DONE.md for completion records.

---

## Execution Order (PM audit #130) — REMAINING ITEMS

> **Code fixes COMPLETE. Remaining items are owner actions only.**

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

## Known Limitations (Documented, Not Blocking)

### Email Sync to Clerk — DEFERRED

> MongoDB→Clerk email sync requires Clerk's email verification flow (create → verify → set primary). Complex to implement, low user frequency. Profile email edits currently save to MongoDB only. If Clerk `user.updated` webhook fires for another reason, email in MongoDB may revert. **Accept for v1.0.** Consider adding an "email changes require Clerk account settings" note in profile editor for v1.1.

### Lint Warnings — 6 `set-state-in-effect` Warnings — ACCEPTED

> 6 pre-existing `react-hooks/set-state-in-effect` warnings in `chat-input.tsx` (2), `chat-wrapper.tsx` (1), `library-tabs.tsx` (1), `chat-sidebar-nav.tsx` (1), `profile-hero-editor.tsx` (1). All are warnings, not errors. All are patterns where setState in effect is intentional (initializing from external state). Lint gate is GREEN (0 errors). Monitor only — fix if React Compiler requires it.

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
> Includes: Phases 143–148, 165, 165.1, 180.1–180.4, 185–222 (all sub-phases), 217-A/B/C/C-fix/D/E/F/G, 218-B, 218-C, 218-C-fix, 26.x, 29.1–29.5, 29.7, 223, 224, 225-A/B/C/D, 226, 227, 228, 229, 230, 231, 231-fix, 232, 233, 234-A, 234-A2, 234-C, 235, 236, type file cleanup, admin sidebar persistence.
> Phase 29.7 (Zustand audit) — COMPLETE. No changes needed. 4 stores, all properly implemented.
> TypeScript 6 / ESLint compatibility — **CLOSED** (audit #103). No issues.
> jsdom upgrade — **PIN MAINTAINED** (audit #103). ~24.1.3 stable. ESM TLA incompatibility persists.
> E2E fragile homepage heading — **FIXED** (audit #105). Structural assertion.

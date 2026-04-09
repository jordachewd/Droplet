# Droplet — TODO

> Prioritized, actionable development tasks. Each task max ~30 minutes.
> Governed by **Droplet-PM**. Do not add tasks without PM approval.
> Ref: `SPEC.md` for full specification. `AGENTS.md` for coding rules. `DONE.md` for completed phases.
> Implementation agent: **Droplet-Engineer** (Senior Developer).
>
> **STATUS: PM audit #108 (2026-04-09). V1.0 MVP RELEASED. Phase 222 COMPLETE. Phase 217-A COMPLETE (Stripe schema + product setup). POST-MERGE AUDIT CLEAN. Phase 217-B NEXT.**
>
> **GATE STATUS: Validation GREEN. Architecture GREEN. Product GREEN. Admin GREEN. Public GREEN. Contract GREEN.**
>
> **TEST STATUS: 649 tests (106 suites), 49 E2E (6 skipped). 0 failures. All gates GREEN.**
>
> **EXECUTION ORDER: 217-B → 217-C → 217-D → 217-E → 217-F → 217-G → 26.x.**

---

## COMPLETED — Shared Layout Components (Phase 222) — ALL DONE

> ✅ Phase 222 COMPLETE (PM audit #107). All sub-phases delivered: 222-A SidebarShell, 222-B AppHeader, 222-C AppLayoutShell. See [DONE.md](DONE.md) for detailed completion records.

---

## COMPLETED — Phases 218–222: CSS Architecture + Orphan Cleanup + Hook + CSS Extraction + SidebarShell + AppHeader + AppLayoutShell (Archived to DONE.md)

> Phases 218–222 ALL COMPLETE. See [DONE.md](DONE.md) for detailed completion records.

---

## COMPLETED — Sidebar & Navigation Restructure (Archived to DONE.md)

> Phases 209–216 ALL COMPLETE. See [DONE.md](DONE.md) for detailed completion records.

---

## ON HOLD — (Legacy section removed — Stripe now UNBLOCKED)

---

## NEXT — Stripe Recurring Payment (Phases 217-A through 217-G)

> **Owner:** OI51. **UNBLOCKED** (PM audit #103). Owner answers: (1) Grandfather existing one-time users until expiry then revert to Lite. (2) Both Monthly + Yearly billing (30% yearly discount). (3) Custom cancel UI (NOT Stripe Customer Portal). (4) Refactor plans and add admin edit capabilities.
>
> **Sequencing:** Phase 222 COMPLETE. Stripe is NEXT.

## COMPLETED — Phase 217-A: Schema + Stripe Product Setup (Archived to DONE.md)

> ✅ Phase 217-A COMPLETE (PM audit #108). All 6 subtasks delivered: schema fields, types, Stripe products, AppSettings, seed script, validation. See [DONE.md](DONE.md) for detailed completion records.

### Phase 217-B — Checkout Mode Switch + Customer Management

> **Risk:** MEDIUM. **Effort:** ~45min. **Dependencies:** Phase 217-A.

- [ ] **217-B.1** — Create `getOrCreateStripeCustomer(user)` utility that creates/retrieves Stripe Customer and stores `stripeCustomerId` on User
- [ ] **217-B.2** — Switch `checkoutPlan()` from `mode: "payment"` to `mode: "subscription"` with `customer` param
- [ ] **217-B.3** — Replace inline `price_data` with persistent Stripe Price ID from AppSetting
- [ ] **217-B.4** — Add yearly billing option: accept `billing: "Monthly" | "Yearly"` param, route to correct Price ID
- [ ] **217-B.5** — Add `subscription_data.metadata` with `userId`, `clerkId`, `plan`, `billing`
- [ ] **217-B.6** — Validation: all 7 gates GREEN.

### Phase 217-C — Webhook Expansion for Subscription Events

> **Risk:** HIGH. **Effort:** ~2h. **Dependencies:** Phase 217-B. **Critical: idempotency on every handler.**

- [ ] **217-C.1** — Refactor webhook handler to event dispatcher pattern (switch on `event.type`)
- [ ] **217-C.2** — Modify `checkout.session.completed` handler: create Transaction (type: `subscription_initial`), set `subscriptionStatus: "active"`, store `stripeSubscriptionId`
- [ ] **217-C.3** — Add `invoice.paid` handler: create Transaction (type: `subscription_renewal`), refresh `expiresOn`, reset usage counters, idempotency on `stripeInvoiceId`
- [ ] **217-C.4** — Add `invoice.payment_failed` handler: set `subscriptionStatus: "past_due"`, log warning
- [ ] **217-C.5** — Add `customer.subscription.updated` handler: handle plan upgrade/downgrade, update `subscriptionStatus` and plan details
- [ ] **217-C.6** — Add `customer.subscription.deleted` handler: revert to Lite, set `subscriptionStatus: "canceled"`, clear `stripeSubscriptionId`
- [ ] **217-C.7** — Add Zod schemas for each new webhook event payload
- [ ] **217-C.8** — Validation: all 7 gates GREEN.

### Phase 217-D — Custom Cancellation Flow

> **Risk:** MEDIUM. **Effort:** ~1h. **Dependencies:** Phase 217-C.

- [ ] **217-D.1** — Create `cancelSubscriptionAction()` server action: auth check, calls `stripe.subscriptions.update(id, { cancel_at_period_end: true })`, updates `subscriptionStatus`
- [ ] **217-D.2** — Create subscription management UI in profile: active/canceling/past_due status display, next billing date, cancel button with ConfirmationModal
- [ ] **217-D.3** — Optional: reactivation path (`cancel_at_period_end: false`) to undo pending cancellation
- [ ] **217-D.4** — Handle edge cases: already-canceled, past-due, subscription not found, Stripe API failures
- [ ] **217-D.5** — Validation: all 7 gates GREEN.

### Phase 217-E — Yearly Billing UI + Pricing Display

> **Risk:** MEDIUM. **Effort:** ~1h. **Dependencies:** Phase 217-B.

- [ ] **217-E.1** — Add Monthly/Yearly billing toggle to plan cards (public `/plans` and authenticated `/app/plans`)
- [ ] **217-E.2** — Display yearly price with savings info (e.g., "$159.60/year — Save 30%")
- [ ] **217-E.3** — Checkout flow routes to correct Stripe Price ID based on billing toggle
- [ ] **217-E.4** — Admin-configurable yearly discount via AppSetting `admin.yearlyDiscount`
- [ ] **217-E.5** — Validation: all 7 gates GREEN. Zero visual regression on existing plan display.

### Phase 217-F — Admin Stripe Settings

> **Risk:** LOW. **Effort:** ~30min. **Dependencies:** Phase 217-E.

- [ ] **217-F.1** — Add `admin.stripePriceIds` branch to `updateAdminSettingAction` for editing Stripe Price IDs per plan per billing cycle
- [ ] **217-F.2** — Add admin UI section for Stripe Price ID management (4 price inputs: Pro Monthly/Yearly, Premium Monthly/Yearly)
- [ ] **217-F.3** — Add `admin.yearlyDiscount` numeric input to admin settings
- [ ] **217-F.4** — Validation: all 7 gates GREEN.

### Phase 217-G — Tests + Documentation + Grandfathering Verification

> **Risk:** LOW. **Effort:** ~2h. **Dependencies:** All preceding 217 phases.

- [ ] **217-G.1** — 30+ new unit tests: webhook event handlers (all 5 types), cancellation action, yearly pricing, Stripe Customer management, idempotency, edge cases
- [ ] **217-G.2** — Update SPEC.md: subscription plan lifecycle, new webhook events, cancellation flow, yearly pricing
- [ ] **217-G.3** — Update README.md: pricing table with yearly option
- [ ] **217-G.4** — Verify grandfathering: existing one-time paid users retain plan until `expiresOn`, then revert to Lite naturally
- [ ] **217-G.5** — Full E2E suite pass + manual Stripe test mode verification
- [ ] **217-G.6** — Validation: all 7 gates GREEN. Test count target: 670+.

---

## QUEUED — Post-Stripe Improvements

### Phase 26.x — Persona-aware Media Prompts

> **Owner:** OI58. **Risk:** LOW. **Effort:** ~2h. **Dependencies:** None (can proceed after Stripe billing). **Files:** 4 (persona-prompts.ts, generateImage.tsx, generateAudio.tsx, generateResponse.tsx). **Lines:** ~60-80 added.

- [ ] **26.x.1** — Add `PERSONA_IMAGE_STYLE_HINTS` and `PERSONA_AUDIO_STYLE_HINTS` to `persona-prompts.ts`
- [ ] **26.x.2** — Add `personaId` parameter to `generateImage()`, prefix prompt with persona style hint
- [ ] **26.x.3** — Add `personaId` parameter to `generateAudio()`, apply persona voice/tone context
- [ ] **26.x.4** — Pass `personaId` from `generateResponse()` tool call handlers to media generators
- [ ] **26.x.5** — Unit tests for persona-specific media prompt generation
- [ ] **26.x.6** — Validation: all 7 gates GREEN.

---

## DEFERRED

### Phase 29.6 — updateAdminSettingAction Zod Schema Map (DEFERRED)

> 17 branches, working correctly with Zod under the hood. Revisit only if branch count exceeds ~25 or bugs emerge. New branches added for Stripe settings (Phase 217-F) follow existing pattern.

### Legal/nav/footer admin configurability — Deferred to v2

> Legal text rarely changes (requires legal review), nav is structural (tied to routes), footer changes ~yearly. Minimal value.

### E2E Firefox Flake — Monitor

> 1 test (`error-boundary-handling > API failure feedback`) fails intermittently on Firefox only. Chromium/WebKit pass. Browser timing issue, not product bug. Monitor.

### E2E Fragile Homepage Heading — COMPLETED

> ✅ FIXED (PM audit #105). `global.setup.ts` now uses `page.locator("h1").first()` structural assertion instead of hardcoded admin-configurable text. See [DONE.md](DONE.md).

---

> **Completed phases** archived in [`DONE.md`](DONE.md).
> Includes: Phases 143–148, 165, 165.1, 180.1–180.4, 185–222 (all sub-phases), 217-A, 29.1–29.5, 29.7.
> Phase 29.7 (Zustand audit) — COMPLETE. No changes needed. 4 stores, all properly implemented.
> TypeScript 6 / ESLint compatibility — **CLOSED** (audit #103). No issues.
> jsdom upgrade — **PIN MAINTAINED** (audit #103). ~24.1.3 stable. ESM TLA incompatibility persists.
> E2E fragile homepage heading — **FIXED** (audit #105). Structural assertion.

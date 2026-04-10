# Droplet — TODO

> Prioritized, actionable development tasks. Each task max ~30 minutes.
> Governed by **Droplet-PM**. Do not add tasks without PM approval.
> Ref: `SPEC.md` for full specification. `AGENTS.md` for coding rules. `DONE.md` for completed phases.
> Implementation agent: **Droplet-Engineer** (Senior Developer).
>
> **STATUS: PM audit #111 (2026-04-10). V1.0 MVP RELEASED. Phase 222 COMPLETE. Phase 217-A COMPLETE. Phase 217-B COMPLETE. Phase 217-C COMPLETE. 1 HIGH bug (MongoDB path conflict). All 7 gates GREEN.**
>
> **GATE STATUS: All 7 gates GREEN. 0 vulnerabilities. 1 HIGH runtime bug (path conflict in subscription.deleted handler).**
>
> **TEST STATUS: 653 tests (106 suites), 49 E2E (6 skipped). 0 failures. All gates GREEN.**
>
> **EXECUTION ORDER: 217-C-fix → 217-D → 217-E → 217-F → 217-G → 218-B → 26.x.**

---

## NEXT — Stripe Recurring Payment (Phases 217-A through 217-G)

> **Owner:** OI51. **UNBLOCKED** (PM audit #103). Owner answers: (1) Grandfather existing one-time users until expiry then revert to Lite. (2) Both Monthly + Yearly billing (30% yearly discount). (3) Custom cancel UI (NOT Stripe Customer Portal). (4) Refactor plans and add admin edit capabilities.
>
> **Sequencing:** Phase 222 COMPLETE. Stripe is NEXT.

## COMPLETED — Phase 217-A: Schema + Stripe Product Setup (Archived to DONE.md)

> ✅ Phase 217-A COMPLETE (PM audit #108). All 6 subtasks delivered: schema fields, types, Stripe products, AppSettings, seed script, validation. See [DONE.md](DONE.md) for detailed completion records.

## COMPLETED — Phase 217-B: Checkout Mode Switch + Customer Management (Archived to DONE.md)

> ✅ Phase 217-B COMPLETE (PM audit #110). All 6 subtasks delivered: Stripe Customer utility, subscription mode, persistent Price IDs, yearly billing, subscription metadata, validation. See [DONE.md](DONE.md) for detailed completion records.

## COMPLETED — Phase 217-C: Webhook Expansion for Subscription Events (Archived to DONE.md)

> ✅ Phase 217-C COMPLETE (PM audit #111). All 8 subtasks delivered: event dispatcher, 5 handlers, per-event Zod schemas, idempotency guards, flexible user lookup. 1 HIGH bug discovered during audit (path conflict). See [DONE.md](DONE.md) for detailed completion records.

### Phase 217-C-fix — Webhook Bug Fixes (Path Conflict + Phantom Writes)

> **Risk:** HIGH (path conflict will crash subscription deletion in production). **Effort:** ~15min. **Dependencies:** Phase 217-C. **NEXT.**
>
> **Bugs discovered during PM audit #111 Architect review, independently verified by PM:**
>
> 1. **HIGH-1 — MongoDB ConflictingUpdateOperators** in `handleCustomerSubscriptionDeleted` (~line 1131): `$set: { plan: litePlan }` overwrites the entire `plan` subdocument, but `$unset: { "plan.stripeSubscriptionId": "", "plan.stripeId": "" }` targets paths within `plan`. MongoDB will throw `ConflictingUpdateOperators` at runtime. Unit tests don't catch this because MongoDB is mocked. **Fix:** Remove `"plan.stripeSubscriptionId"` and `"plan.stripeId"` from `$unset` — the `$set: { plan: litePlan }` already replaces the entire subdocument so those fields won't exist.
> 2. **MEDIUM-1 — Phantom writes silently stripped** in `handleInvoicePaymentFailed` (~line 916): writes `"plan.subscriptionStatus": "past_due"` and `"plan.stripeSubscriptionId": subscriptionId` but User model's `plan` subdocument schema has no `subscriptionStatus` or `stripeSubscriptionId` fields. Mongoose `strict: true` silently strips them. The top-level `subscriptionStatus` and `stripeSubscriptionId` fields are correct. **Fix:** Remove the phantom `plan.*` writes.

- [ ] **217-C-fix.1** — In `handleCustomerSubscriptionDeleted`: remove `"plan.stripeSubscriptionId": ""` and `"plan.stripeId": ""` from the `$unset` block. Keep `stripeSubscriptionId: ""` (top-level field unset is correct).
- [ ] **217-C-fix.2** — In `handleInvoicePaymentFailed`: remove `"plan.subscriptionStatus": "past_due"` from `updateFields`. Remove `updateFields["plan.stripeSubscriptionId"] = subscriptionId` line. Keep top-level `subscriptionStatus` and `stripeSubscriptionId` writes.
- [ ] **217-C-fix.3** — Add unit test: verify `handleCustomerSubscriptionDeleted` update operation does NOT have overlapping `$set`/`$unset` paths targeting `plan.*`.
- [ ] **217-C-fix.4** — Validation: all 7 gates GREEN.

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

### Phase 218-B — CSS Component Class Extraction (Muted Text + Danger Button)

> **Owner directive:** CSS/Tailwind audit. Move duplicated inline patterns into `.css` files under `src/styles/`. **Risk:** LOW. **Effort:** ~30min. **Dependencies:** None.

- [ ] **218-B.1** — Create `.admin-muted-text` class in `src/styles/components/admin/admin.css` for `text-sm text-midnightBlue-600 dark:text-lavenderHaze-600` pattern (20+ duplicates across 12 component files)
- [ ] **218-B.2** — Replace all 20+ inline instances across admin settings, tables, confirmation-modal, and website-manager with `.admin-muted-text` class
- [ ] **218-B.3** — Extract `.btn-danger` class in `src/styles/components/buttons.css` for destructive action button patterns if duplicated 3+ times
- [ ] **218-B.4** — Audit `toggle-theme.tsx` for ~310-char className extraction opportunity
- [ ] **218-B.5** — Validation: all 7 gates GREEN. Zero visual regression.

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

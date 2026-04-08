# Droplet — TODO

> Prioritized, actionable development tasks. Each task max ~30 minutes.
> Governed by **Droplet-PM**. Do not add tasks without PM approval.
> Ref: `SPEC.md` for full specification. `AGENTS.md` for coding rules. `DONE.md` for completed phases.
> Implementation agent: **Droplet-Engineer** (Senior Developer).
>
> **STATUS: PM audit #103 (2026-04-08). V1.0 MVP RELEASED. Phase 220 COMPLETE. Phases 221–222 ACTIVE (layout CSS + shared layout shell). Stripe recurring UNBLOCKED (Phases 217-A–G).**
>
> **GATE STATUS: Validation GREEN. Architecture GREEN. Product GREEN. Admin GREEN. Public GREEN. Contract GREEN.**
>
> **TEST STATUS: 644 tests (104 suites), 49 E2E (6 skipped). 0 failures. All gates GREEN.**
>
> **EXECUTION ORDER: Phase 221 → 222 (222-A → 222-B → 222-C) → 217 (217-A → 217-B → 217-C → 217-D → 217-E → 217-F → 217-G) → 26.x.**

---

## ACTIVE — Codebase Cleanup & Shared Layout (Phases 221–222)

> Owner directives OI53–OI57 (PM audit #103). DX/maintainability improvements. Shared layout unification between admin and chat. All findings verified by triple-audit (Architect + Engineer + PM).

### Phase 219 — Orphan Cleanup — COMPLETED

> ✅ DONE (PM audit #102). See [DONE.md](DONE.md) for detailed completion record.

### Phase 220 — Extract `useIsDesktop()` Hook — COMPLETED

> ✅ DONE (PM audit #103). See [DONE.md](DONE.md) for detailed completion record.

### Phase 221 — Extract Shared Layout CSS Classes

> **Owner:** OI55. **Risk:** LOW (CSS extraction, same pattern as Phase 218). **Effort:** ~20min. **Dependencies:** None.
>
> Inline Tailwind patterns used 2-50+ times across different files should be extracted to `src/styles/components/`.
>
> **Acceptance Criteria:**

- [ ] **221.1** — Create `src/styles/components/layout.css` with: `.app-sidebar` (sidebar base classes), `.sidebar-backdrop` (mobile overlay), `.app-header-bar` (sticky header), `.app-header-inner` (header flex container), `.sidebar-nav-link` (navigation link)
- [ ] **221.2** — Create `src/styles/components/forms.css` with: `.form-input` (input field base), `.form-field` (label+input container), `.admin-label` (section label), `.admin-form-surface` (admin surface + form gap)
- [ ] **221.3** — Add `@import "./components/layout.css"` and `@import "./components/forms.css"` to `src/styles/index.css`
- [ ] **221.4** — Apply `.app-sidebar` in `admin-sidebar.tsx`, `chat-sidebar-shell.tsx`, `chat-sidebar-loading.tsx`
- [ ] **221.5** — Apply `.sidebar-backdrop` in `admin-sidebar.tsx`, `chat-sidebar-shell.tsx`
- [ ] **221.6** — Apply `.app-header-bar` + `.app-header-inner` in `admin-layout-shell.tsx`, `chat-header.tsx`
- [ ] **221.7** — Apply `.sidebar-nav-link` in `admin-sidebar.tsx`, `chat-sidebar-nav.tsx`
- [ ] **221.8** — Apply `.form-input` in all admin form sections (50+ occurrences across admin settings forms)
- [ ] **221.9** — Apply `.admin-label` in admin tables and form sections (20+ occurrences)
- [ ] **221.10** — Validation: prettier ✓, lint ✓, tsc ✓, tests ✓, build ✓, knip ✓. Zero visual changes.

### Phase 222 — Shared `AppLayoutShell` + `SidebarShell` Components

> **Owner:** OI54. **Risk:** MEDIUM (affects both layouts simultaneously). **Effort:** ~30min. **Dependencies:** Phases 220, 221.
>
> Admin and chat layouts share ~60% identical code: sidebar wrapper, mobile backdrop, close-on-pathname, sticky header, main content wrapper. Extract shared components with slot-based composition.
>
> **Sub-phases for safety:**

#### Phase 222-A — `SidebarShell` Shared Component

- [ ] **222-A.1** — Create `src/components/shared/sidebar-shell.tsx` (client component) with: sidebar wrapper (uses `.app-sidebar`), mobile backdrop (uses `.sidebar-backdrop`), close-on-pathname effect, Zustand sidebar state. Accepts `header`, `navigation`, `footer` slot props + `id` + `expandedWidth` (w-72 vs w-56).
- [ ] **222-A.2** — Refactor `AdminSidebar` to use `SidebarShell` wrapper (pass admin nav links, head, footer as slots)
- [ ] **222-A.3** — Refactor `ChatSidebarShell` to use `SidebarShell` wrapper (pass chat nav, head, recent section as slots)
- [ ] **222-A.4** — Validation: all gates GREEN. E2E regression check.

#### Phase 222-B — `AppHeader` Shared Component

- [ ] **222-B.1** — Create `src/components/shared/app-header.tsx` (client component) with: sticky header bar (uses `.app-header-bar` + `.app-header-inner`), left content slot, right content slot (default: `ToggleTheme` + `AvatarMenu`)
- [ ] **222-B.2** — Refactor `AdminLayoutShell` header to use `AppHeader` (pass `SidebarToggle` + "Open App" link as left/right content)
- [ ] **222-B.3** — Refactor `ChatHeader` to use `AppHeader` (pass mobile-only `SidebarToggle` + badges as left content)
- [ ] **222-B.4** — Validation: all gates GREEN.

#### Phase 222-C — `AppLayoutShell` Integration

- [ ] **222-C.1** — Create `src/components/shared/app-layout-shell.tsx` with: outer section wrapper, sidebar slot, main content column, skip link. Accepts `sidebar`, `header`, `children`, `mainId`, `skipLinkTarget`.
- [ ] **222-C.2** — Refactor `AdminLayoutShell` to use `AppLayoutShell` (pass `AdminSidebar`, `AppHeader` with admin actions)
- [ ] **222-C.3** — Refactor `(chat)/layout.tsx` to use `AppLayoutShell` (pass `ChatSidebar` with Suspense, `AppHeader` with chat badges)
- [ ] **222-C.4** — Validation: all gates GREEN. Full E2E suite. Zero visual regression.

---

## COMPLETED — Phases 218–219: CSS Architecture + Orphan Cleanup (Archived to DONE.md)

> Phase 218 (CSS modular architecture) ALL COMPLETE. Phase 219 (orphan cleanup) ALL COMPLETE. See [DONE.md](DONE.md) for detailed completion records.

---

## COMPLETED — Sidebar & Navigation Restructure (Archived to DONE.md)

> Phases 209–216 ALL COMPLETE. See [DONE.md](DONE.md) for detailed completion records.

---

## ON HOLD — Stripe Recurring Payment

### Phase 217-A through 217-D — Stripe Subscription Billing

> **Owner:** OI51. **Risk:** HIGH. **BLOCKED pending owner decisions.** See ThePlan.md for full phase breakdown.
>
> **Questions for owner before implementation:**

---

## NEXT — Stripe Recurring Payment (Phases 217-A through 217-G)

> **Owner:** OI51. **UNBLOCKED** (PM audit #103). Owner answers: (1) Grandfather existing one-time users until expiry then revert to Lite. (2) Both Monthly + Yearly billing (30% yearly discount). (3) Custom cancel UI (NOT Stripe Customer Portal). (4) Refactor plans and add admin edit capabilities.
>
> **Sequencing:** Complete Phases 221–222 first (low-risk pipeline completion), then proceed with Stripe.

### Phase 217-A — Schema + Stripe Product Setup

> **Risk:** LOW (additive). **Effort:** ~30min. **Dependencies:** Stripe Dashboard product creation.

- [ ] **217-A.1** — Add `stripeCustomerId` (String, optional, unique sparse index), `stripeSubscriptionId` (String, optional), `subscriptionStatus` (String enum: `active | past_due | canceled | unpaid`, default `null`) to User model
- [ ] **217-A.2** — Add `type` (String enum: `one_time | subscription_initial | subscription_renewal`, default `one_time`), `stripeInvoiceId` (String, optional, unique sparse index) to Transaction model
- [ ] **217-A.3** — Update `PlanData` and `TransactionData` TypeScript types to reflect new fields
- [ ] **217-A.4** — Create 4 Stripe Price objects in Stripe Dashboard: Pro Monthly ($19), Pro Yearly ($159.60), Premium Monthly ($39), Premium Yearly ($327.60)
- [ ] **217-A.5** — Create `admin.stripePriceIds` and `admin.yearlyDiscount` AppSetting keys
- [ ] **217-A.6** — Validation: all 7 gates GREEN. No behavior change.

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

---

> **Completed phases** archived in [`DONE.md`](DONE.md).
> Includes: Phases 143–148, 165, 165.1, 180.1–180.4, 185–220, 29.1–29.5, 29.7.
> Phase 29.7 (Zustand audit) — COMPLETE. No changes needed. 4 stores, all properly implemented.
> TypeScript 6 / ESLint compatibility — **CLOSED** (audit #103). No issues.
> jsdom upgrade — **PIN MAINTAINED** (audit #103). ~24.1.3 stable. ESM TLA incompatibility persists.

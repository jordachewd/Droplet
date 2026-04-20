# Droplet — TODO

> Prioritized, actionable development tasks. Each task max ~30 minutes.
> Governed by **Droplet-PM**. Do not add tasks without PM approval.
> Ref: `SPEC.md` for full specification. `AGENTS.md` for coding rules. `DONE.md` for completed phases.
> Implementation agent: **Droplet-Engineer** (Senior Developer).
>
> **STATUS: PM audit #133 (2026-04-20). Tri-agent audit (PM + Architect + Engineer). Onboarding + Persona Selector + Handoff features DELIVERED (Phases 240-248). 3 HIGH code bugs found by audit. 1 CRITICAL owner action remaining. 1 MEDIUM owner action remaining. TSC clean. Lint clean on modified files.**
>
> **GATE STATUS: TSC clean. Lint 0 errors (6 pre-existing warnings). Build not yet verified post-Phase 248.**
>
> **ACTIVE BACKLOG: 3 HIGH code fixes (onboarding/handoff bugs). 1 HIGH code task (file rename — 31 files). 1 CRITICAL owner action. 1 MEDIUM owner action. `/design` page KEPT per owner override (dev-only, remove before production).**

---

## Archived Phases — See [DONE.md](DONE.md)

> All phases through 248 archived. See DONE.md for completion records.
> Phases 240-246 (onboarding wizard) COMPLETE.
> Phase 248 (persona selector to ChatInput) COMPLETE.
> Phase 237 CLOSED per owner override (PM audit #132) — `/design` page kept as dev-only design system preview.
> Prettier reformat (PM audit #131) — 70 files fixed.

---

## Execution Order (PM audit #133) — ACTIVE

### Phase 249-A — HIGH: HandoffDialog Must Filter by Plan Entitlement (~10 min)

**Issue:** `HandoffDialog` receives the full unfiltered `personas` array. A Lite user sees all 6 personas in the handoff picker, including Premium-only personas they cannot access. Breaks Critical Product Rule #3 (persona plan gating).

**Root cause:** [chat-wrapper.tsx](src/components/chat/chat-wrapper.tsx) line 710 passes `personas` instead of `selectablePersonas`.

**Fix:** Change `personas={personas}` to `personas={selectablePersonas}` in the `HandoffDialog` render.

**Acceptance criteria:**

- [ ] `HandoffDialog` receives only plan-entitled personas
- [ ] Lite user sees max 2 personas + trial-eligible in handoff dialog (not 6)
- [ ] TypeScript compiles cleanly
- [ ] No visual regression on handoff flow

---

### Phase 249-B — HIGH: System Prompt Must Use All 4 User Preferences (~20 min)

**Issue:** `buildUserPreferencesPrompt()` in `persona-prompts.ts` only injects `expectation` and `communicationStyle` into the AI system prompt. The user's `intent` and `challenge` — the two most decision-relevant onboarding signals — are collected but never sent to the AI model. This means the AI has no awareness of why the user chose this persona or what their biggest challenge is.

**Root cause:** [persona-prompts.ts](src/constants/persona-prompts.ts) — `buildUserPreferencesPrompt()` ignores `intent` and `challenge` fields.

**Fix:** Add `INTENT_INSTRUCTIONS` and `CHALLENGE_INSTRUCTIONS` lookup maps (same pattern as existing `EXPECTATION_INSTRUCTIONS` and `COMMUNICATION_STYLE_INSTRUCTIONS`). Include their text in the returned prompt string.

**Acceptance criteria:**

- [ ] `buildUserPreferencesPrompt()` includes text derived from `intent` when present
- [ ] `buildUserPreferencesPrompt()` includes text derived from `challenge` when present
- [ ] Prompt text is concise (1 sentence each) and actionable for the AI
- [ ] Existing tests pass
- [ ] TypeScript compiles cleanly

---

### Phase 249-C — HIGH: Fix Onboarding "Change in Settings" Copy (~5 min)

**Issue:** The onboarding wizard's persona selection step says "You can change this later in Settings." but the Settings page no longer has a persona selector (it was moved to ChatInput in Phase 248). This misleads users.

**Root cause:** [onboarding-wizard.tsx](src/components/chat/onboarding/onboarding-wizard.tsx) — persona step subtitle.

**Fix:** Change copy to: "You can always pick a different persona when starting a new conversation."

**Acceptance criteria:**

- [ ] Onboarding persona step no longer references "Settings"
- [ ] Copy accurately describes where persona can be changed (ChatInput on new conversation)
- [ ] No other references to "change in Settings" for persona exist in codebase

---

### Phase 249-D — MEDIUM: `completeOnboarding` Idempotency + Dot-Notation (~15 min)

**Issue:** `completeOnboarding` uses `$set: { preferences: {...} }` which replaces the entire subdocument. Also lacks idempotency guard — can overwrite preferences if called twice.

**Fix:**

1. Change to dot-notation `$set`: `"preferences.intent": ..., "preferences.challenge": ..., etc.`
2. Add `onboardingCompleted: { $ne: true }` to the query filter so it won't overwrite if already completed.
3. If no document matched (already completed), return `{ success: true }` without error.

**Acceptance criteria:**

- [ ] Uses dot-notation for all preference fields
- [ ] Query filter includes `onboardingCompleted: { $ne: true }`
- [ ] Double-call is idempotent (returns success, doesn't overwrite)
- [ ] TypeScript compiles cleanly
- [ ] Existing tests pass

---

### Phase 238 — HIGH: Rename 31 Non-JSX `.tsx` Files to `.ts`

**Issue:** 31 files use `.tsx` extension but contain zero JSX. Violates AGENTS.md coding standard: "Utility-only files: `.ts` extension (no JSX)." Phase 147 renamed 5 utility files but missed models, constants, actions, and other utils. Original Phase 238 scope was only 8 model files — expanded to full violation surface by PM audit #132 tri-agent audit.

**Split into 4 sub-phases for safe execution:**

#### Phase 238-A — Rename 8 Database Model Files (~15 min)

- `src/lib/database/models/user.model.tsx` → `.ts`
- `src/lib/database/models/usage-event.model.tsx` → `.ts`
- `src/lib/database/models/transaction.model.tsx` → `.ts`
- `src/lib/database/models/tasks.model.tsx` → `.ts`
- `src/lib/database/models/rate-limit-entry.model.tsx` → `.ts`
- `src/lib/database/models/public-page.model.tsx` → `.ts`
- `src/lib/database/models/app-setting.model.tsx` → `.ts`
- `src/lib/database/models/admin-audit-log.model.tsx` → `.ts`

**Acceptance criteria:**

- [ ] All 8 files renamed
- [ ] All imports across `src/` and `tests/` updated
- [ ] All 7 gates GREEN

#### Phase 238-B — Rename Database + Constants + Types (~15 min)

- `src/lib/database/mongoose.tsx` → `.ts`
- `src/constants/assistant-personas.tsx` → `.ts`
- `src/constants/aws.tsx` → `.ts`
- `src/constants/faqs.tsx` → `.ts`
- `src/constants/openai.tsx` → `.ts`
- `src/constants/plans.tsx` → `.ts`
- `src/types/index.tsx` → `.ts`

**Acceptance criteria:**

- [ ] All 7 files renamed
- [ ] All imports across `src/` and `tests/` updated
- [ ] All 7 gates GREEN

#### Phase 238-C — Rename Server Action Files (~15 min)

- `src/lib/actions/user.actions.tsx` → `.ts`
- `src/lib/actions/transaction.action.tsx` → `.ts`
- `src/lib/actions/task.actions.tsx` → `.ts`
- `src/lib/actions/admin-user.actions.tsx` → `.ts`
- `src/lib/actions/admin-transaction.actions.tsx` → `.ts`
- `src/lib/actions/admin-settings.actions.tsx` → `.ts`
- `src/lib/actions/admin-pages.actions.tsx` → `.ts`

**Acceptance criteria:**

- [ ] All 7 files renamed
- [ ] All imports across `src/` and `tests/` updated
- [ ] All 7 gates GREEN

#### Phase 238-D — Rename Utility Files (~20 min)

- `src/lib/utils/resolve-entitlements.tsx` → `.ts`
- `src/lib/utils/task-queries.tsx` → `.ts`
- `src/lib/utils/aws/deleteFileFromAWS.tsx` → `.ts`
- `src/lib/utils/aws/uploadFileToAWS.tsx` → `.ts`
- `src/lib/utils/openai/filterAssistantMsg.tsx` → `.ts`
- `src/lib/utils/openai/generateAudio.tsx` → `.ts`
- `src/lib/utils/openai/generateImage.tsx` → `.ts`
- `src/lib/utils/openai/generateResponse.tsx` → `.ts`
- `src/lib/utils/openai/generateTitle.tsx` → `.ts`

**Acceptance criteria:**

- [ ] All 9 files renamed
- [ ] All imports across `src/` and `tests/` updated
- [ ] `knip.json` updated if needed
- [ ] All 7 gates GREEN
- [ ] Zero non-route/non-page/non-component `.tsx` files with no JSX remain

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

## SORTED DEFERRED ITEMS (PM audit #132 — Ruthless Re-Sort)

> All deferred items sorted by value/risk. Tri-agent consensus: no promotions needed.

### 1. Vercel Pro Upgrade — RECOMMENDED (Business Decision)

> $20/mo. Raises `maxDuration` from 60s to 300s. Eliminates media generation timeout edge cases. Zero engineering effort. Highest-leverage infrastructure spend. **Promote when monthly revenue exceeds ~$100/mo or when first user reports a timeout.** Not a code change.

### 2. Phase 29.6 — updateAdminSettingAction Zod Schema Map — CLOSED/MONITOR

> **Current state:** 18 branches in main update function (verified PM audit #128). Working correctly with Zod under the hood. Deferral threshold was ~25 branches. **Still 7 branches below threshold.** CLOSED as accepted pattern — reopen only if branch count approaches 25 or bugs emerge.

### 3. E2E Firefox Flake — MONITOR

> 1 test (`error-boundary-handling > API failure feedback`) fails intermittently on Firefox only. Chromium/WebKit pass. Browser timing issue, not product bug. Fix only if it becomes persistent or blocks CI.

### 4. Stripe Webhook Handler Unit Tests — MEDIUM (Future Hardening)

> **Found by:** Architect audit (PM audit #131). The Stripe webhook handlers (`stripe-webhook-handlers.ts`, `stripe-webhook-shared.ts`) are the most complex billing code paths but have no dedicated unit tests. The idempotency logic, user-matching fallback chain, and plan state transitions are tested only through the route-level integration test file (`stripe-webhook-route.test.ts`). Not blocking — current route-level tests cover the critical paths. Add dedicated unit tests when billing logic expands or bugs emerge.

### 5. Config Cache Unit Tests — LOW (Future Hardening)

> **Found by:** Architect audit (PM audit #131). `config-cache.ts` (30s TTL, in-flight dedup, `clearConfigCache()`) has no dedicated unit tests. The cache works correctly (proven by 730 passing tests that depend on it). Add tests when cache behavior changes.

### 6. Audio Player `act()` Test Warnings — LOW (Test Noise)

> **Found by:** Engineer audit (PM audit #131). `audio-player.test.tsx` produces `act(...)` warnings from React 19 strict mode. Tests still pass. Fix by wrapping state-triggering interactions in `act()` or `waitFor()`. Not blocking.

### 7. Legal/Nav/Footer Admin Configurability — DEFERRED TO V2

> Legal text requires legal review regardless of configurability. Nav is structural (tied to routes). Footer changes ~yearly. Zero user impact. Lowest priority of all deferred items.

### 8. `generateResponse.tsx` at 861 lines — MONITOR

> **Found by:** Engineer audit (PM audit #132). 39 lines from 900-line god file threshold. No action needed now. If any feature addition pushes it over, decompose proactively. Candidate extractions: tool call dispatch handlers, error recovery logic.

---

> **Completed phases** archived in [`DONE.md`](DONE.md).
> Includes: Phases 143–148, 165, 165.1, 180.1–180.4, 185–222 (all sub-phases), 217-A/B/C/C-fix/D/E/F/G, 218-B, 218-C, 218-C-fix, 26.x, 29.1–29.5, 29.7, 223, 224, 225-A/B/C/D, 226, 227, 228, 229, 230, 231, 231-fix, 232, 233, 234-A, 234-A2, 234-C, 235, 236, 237 (closed), type file cleanup, admin sidebar persistence, Prettier reformat (PM audit #131).
> Phase 29.7 (Zustand audit) — COMPLETE. No changes needed. 4 stores, all properly implemented.
> TypeScript 6 / ESLint compatibility — **CLOSED** (audit #103). No issues.
> jsdom upgrade — **PIN MAINTAINED** (audit #103). ~24.1.3 stable. ESM TLA incompatibility persists.
> E2E fragile homepage heading — **FIXED** (audit #105). Structural assertion.

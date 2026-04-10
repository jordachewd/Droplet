# Droplet — TODO

> Prioritized, actionable development tasks. Each task max ~30 minutes.
> Governed by **Droplet-PM**. Do not add tasks without PM approval.
> Ref: `SPEC.md` for full specification. `AGENTS.md` for coding rules. `DONE.md` for completed phases.
> Implementation agent: **Droplet-Engineer** (Senior Developer).
>
> **STATUS: PM audit #114 (2026-04-10). V1.0 MVP RELEASED. Phase 218-B COMPLETE. Phase 217-E COMPLETE. 0 HIGH bugs. All 7 gates GREEN.**
>
> **GATE STATUS: All 7 gates GREEN. 0 vulnerabilities. 0 critical issues.**
>
> **TEST STATUS: 666 tests (106 suites), 49 E2E (6 skipped). 0 failures. All gates GREEN.**
>
> **EXECUTION ORDER: 217-F → 217-G → 26.x.**

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

## COMPLETED — Phase 217-C-fix: Webhook Bug Fixes (Archived to DONE.md)

> ✅ Phase 217-C-fix COMPLETE (PM audit #112). Path conflict + phantom writes fixed. See [DONE.md](DONE.md).

## COMPLETED — Phase 217-D: Custom Cancellation Flow (Archived to DONE.md)

> ✅ Phase 217-D COMPLETE (PM audit #112). Cancel/reactivate server actions, 5-state profile UI, webhook sync. See [DONE.md](DONE.md).

---

## COMPLETED — Phase 218-B: CSS Component Class Extraction (Archived to DONE.md)

> ✅ Phase 218-B COMPLETE (PM audit #114). 4 CSS classes extracted (`.admin-muted-text`, `.btn-danger`, `.error-card`, `.toggle-theme-button`). 32+ inline replacements. Zero visual regression. See [DONE.md](DONE.md).

## COMPLETED — Phase 217-E: Yearly Billing UI + Pricing Display (Archived to DONE.md)

> ✅ Phase 217-E COMPLETE (PM audit #114). Billing toggle, yearly pricing with savings badge, admin-configurable yearly discount, server-side price verification. 666 tests. See [DONE.md](DONE.md).

---

## NEXT — Stripe Recurring Payment (Remaining Phases)

> **Owner:** OI51. Phases 217-A/B/C/C-fix/D/E COMPLETE. Remaining: 217-F → 217-G.

### Phase 217-F — Admin Stripe Settings

> **Risk:** LOW. **Effort:** ~30min. **Dependencies:** Phase 217-E.

- [ ] **217-F.1** — Add `admin.stripePriceIds` branch to `updateAdminSettingAction` for editing Stripe Price IDs per plan per billing cycle
- [ ] **217-F.2** — Add admin UI section for Stripe Price ID management (4 price inputs: Pro Monthly/Yearly, Premium Monthly/Yearly)
- [ ] **217-F.3** — Validation: all 7 gates GREEN.

### Phase 217-G — Tests + Documentation + Grandfathering Verification

> **Risk:** LOW. **Effort:** ~2h. **Dependencies:** All preceding 217 phases.

- [ ] **217-G.1** — 30+ new unit tests: webhook event handlers (all 5 types), cancellation action, yearly pricing, Stripe Customer management, idempotency, edge cases
- [ ] **217-G.2** — Update SPEC.md: subscription plan lifecycle, new webhook events, cancellation flow, yearly pricing
- [ ] **217-G.3** — Update README.md: pricing table with yearly option
- [ ] **217-G.4** — Verify grandfathering: existing one-time paid users retain plan until `expiresOn`, then revert to Lite naturally
- [ ] **217-G.5** — Full E2E suite pass + manual Stripe test mode verification
- [ ] **217-G.6** — Validation: all 7 gates GREEN. Test count target: 670+.

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
> Includes: Phases 143–148, 165, 165.1, 180.1–180.4, 185–222 (all sub-phases), 217-A/B/C/C-fix/D/E, 218-B, 29.1–29.5, 29.7.
> Phase 29.7 (Zustand audit) — COMPLETE. No changes needed. 4 stores, all properly implemented.
> TypeScript 6 / ESLint compatibility — **CLOSED** (audit #103). No issues.
> jsdom upgrade — **PIN MAINTAINED** (audit #103). ~24.1.3 stable. ESM TLA incompatibility persists.
> E2E fragile homepage heading — **FIXED** (audit #105). Structural assertion.

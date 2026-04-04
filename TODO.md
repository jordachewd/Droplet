# Droplet — TODO

> Prioritized, actionable development tasks. Each task max ~30 minutes.
> Governed by **Droplet-PM**. Do not add tasks without PM approval.
> Ref: `SPEC.md` for full specification. `AGENTS.md` for coding rules. `DONE.md` for completed phases.
> Implementation agent: **Droplet-Engineer** (Senior Developer).
>
> **STATUS: PM audit #94 (2026-04-05). V1.0 MVP RELEASED. All 7 validation gates GREEN (628 tests, lint 0/0, TSC clean, build passes, knip 0). All Milestones 0–25 COMPLETE. Phases 189–207, 144 COMPLETE.**
>
> **GATE STATUS: Validation GREEN. Architecture GREEN. Product GREEN. Admin GREEN. Public GREEN. Contract GREEN.**
>
> **TEST STATUS: 628 tests (102 suites), 49 E2E (6 skipped). 0 failures. All gates GREEN.**
>
> **OWNER DIRECTIVES:**
>
> - ✅ Remove ALL video generation — **DONE (Phase 186-A).**
> - ✅ Increase Token Limits to maximum — **DONE (Phase 186-B).**
> - ✅ Pre-release task list — **DONE. All 8 phases complete (PM audit #87).**
> - ✅ Env vars validated in Vercel — **ACKNOWLEDGED. `requireEnv()` kept as defense-in-depth.**
> - ✅ PlanCard `isIncluded` bug — **DONE (Phase 188). 602 tests.**
> - ✅ App is now released — **V1.0 MVP RELEASED.**
> - ✅ Admin cannot be deleted — **DONE (Phase 189). 5-layer protection.**
> - ✅ Admin unlimited permissions + "ADMIN" display — **DONE (Phase 190).**
> - ✅ Reusable input component — **DONE (Phase 191).**
> - ✅ Persona selector reusable component — **DONE (Phase 192).**
> - ✅ UsageMetricRow reusable component — **DONE (Phase 193).**
> - ✅ TiptapEditor redesign (TinyMCE-style) — **DONE (Phase 194).**
> - ✅ Image upload "describe image" error — **DONE (Phase 195). Pre-signed S3 URLs.**
> - ✅ Audio player overlap — **DONE (Phase 196). Zustand global audio store.**
> - ✅ Image lightbox for generated images — **DONE (Phase 197). Native `<dialog>` overlay.**
> - ✅ Library Uploaded tab visual previews — **DONE (Phase 198). Thumbnails + icons.**
> - ✅ useActionState console warning — **DONE (Phase 199). `startTransition` fix.**
> - ✅ Admin suspension protection gap — **DONE (Phase 200). 3-layer defense.**
> - ✅ PLAN_LIMITS frozen rule override — **RESOLVED (PM #92). Owner override accepted. AGENTS.md Rule #5 updated.**
> - ✅ Avatar sync MongoDB↔Clerk — **DONE (Phase 201). Non-blocking Clerk sync.**
> - ⚪ PlanPromo + ChatSidebarPromo merge — **REJECTED. Acceptable pattern.**
> - ⚪ TiptapEditor useEffect concern — **ACKNOWLEDGED. Stable reference from DB fetch. No action needed.**
> - ✅ API route timeouts must be max — **DONE (Phase 204). All 6 routes at maxDuration=60.**
> - ✅ New chat not appearing in sidebar — **DONE (Phase 205). router.refresh() with one-time guard.**
> - ✅ Image upload error messages generic — **DONE (Phase 206). Error propagation + client MIME validation + narrowed accept.**
> - ✅ Upload file sanitization (magic bytes) — **DONE (Phase 207). JPEG/PNG/GIF/WebP magic byte validation.**
>
> **EXECUTION ORDER (PM audit #94 — Post-Release):**
>
> 1. **MEDIUM Phase 145** — Upload filename collision prevention (`crypto.randomUUID()`).
> 2. **MEDIUM Phase 165** — Checkout success page DB polling.
> 3. **LOW Phase 146** — Admin user detail transaction limit.
> 4. **LOW Phase 147** — Rename `.tsx` utility files to `.ts`.
> 5. **LOW Phase 148** — Bulk operations partial-failure reporting.

---

## ✅ Phase 185 — Remove `sora-2-pro` — DONE (2026-04-02)

> Archived in DONE.md.

---

## ✅ Phase 180.1 — Homepage Marketing Text Extraction — DONE (2026-04-03)

> Archived in DONE.md.

---

## ✅ Phase 186-A — Remove ALL Video Generation — DONE (2026-04-03)

> Archived in DONE.md.

---

## ✅ Phase 186-B — Increase Token Limits — DONE (2026-04-03)

> Archived in DONE.md.

---

## ✅ Phase 187-A — Add Admin Error Boundary — DONE (2026-04-03)

> Archived in DONE.md.

---

## ✅ Phase 187-B — Fix Clerk Webhook Cascade Order — DONE (2026-04-03)

> Archived in DONE.md.

---

## ✅ Phase 187-C — Fix Audio Player Error Recovery — DONE (2026-04-03)

> Archived in DONE.md.

---

## ✅ Phase 143 — Env Var Runtime Validation — DONE (2026-04-03)

> Archived in DONE.md.

---

## ✅ Phase 180.2 — Chat Display Text Extraction — DONE (2026-04-03)

> Archived in DONE.md.

---

## ✅ Phase 180.3 — Plans Display Text Extraction — DONE (2026-04-03)

> Archived in DONE.md.

---

## ✅ Phase 180.4 — Currency Symbol Compliance — DONE (2026-04-03)

> Archived in DONE.md.

---

## ✅ Phase 187-D — Download Rate-Limit Key Cleanup — DONE (2026-04-03)

> Archived in DONE.md.

---

## ✅ Phase 188 — Fix PlanCard `isIncluded` Logic — DONE (2026-04-03)

> Archived in DONE.md.

---

## ✅ Phase 189 — Admin Deletion Protection — DONE (2026-04-03)

> Archived in DONE.md.

---

## ✅ Phase 190 — Admin "ADMIN" Display + Unlimited — DONE (2026-04-03)

> Archived in DONE.md.

---

## ✅ Phase 191 — Reusable FormInput Component — DONE (2026-04-03)

> Archived in DONE.md.

---

## ✅ Phase 192 — Reusable PersonaSelector Component — DONE (2026-04-03)

> Archived in DONE.md.

---

## ✅ Phase 193 — Reusable UsageMetricRow Component — DONE (2026-04-03)

> Archived in DONE.md.

---

## ✅ Phase 194 — TiptapEditor Redesign — DONE (2026-04-03)

> Archived in DONE.md.

---

## ✅ Phase 195 — Image Upload "Describe Image" Fix — DONE (2026-04-03)

> Archived in DONE.md.

---

## ✅ Phase 196 — Audio Player Overlap Fix — DONE (2026-04-03)

> Archived in DONE.md.

---

## ✅ Phase 197 — Image Lightbox — DONE (2026-04-03)

> Archived in DONE.md.

---

## ✅ Phase 198 — Library Upload Previews — DONE (2026-04-03)

> Archived in DONE.md.

---

## ✅ Phase 199 — useActionState startTransition Fix — DONE (2026-04-03)

> Archived in DONE.md.

---

## ✅ Phase 200 — Admin Suspension Protection — DONE (2026-04-04)

> Archived in DONE.md.

---

## ✅ Phase 202 — Fix 10 Unit Test Failures (PLAN_LIMITS Baseline) — DONE (2026-04-04)

> Archived in DONE.md.

---

## ✅ Phase 203 — Fix 3 E2E Contrast Failures — DONE (2026-04-04)

> Archived in DONE.md.

---

## ✅ Phase 201 — Avatar Sync MongoDB↔Clerk — DONE (2026-04-04)

> Archived in DONE.md.

---

## ✅ Phase 144 — Admin Config In-Memory Cache — DONE (2026-04-04)

> Archived in DONE.md.

---

## MEDIUM — Phase 145 — Upload Filename Collision Prevention

**File:** `src/app/api/upload/route.tsx`

**What to do:** Replace `Date.now()` with `crypto.randomUUID()` in upload filename generation.

**Acceptance criteria:**

- [ ] Upload filenames use `crypto.randomUUID()`
- [ ] Build passes

---

## ✅ Phase 204 — Set All API Route Timeouts to Maximum — DONE (2026-04-05)

> Archived in DONE.md.

---

## ✅ Phase 205 — Sidebar Live Update on New Chat — DONE (2026-04-05)

> Archived in DONE.md.

---

## ✅ Phase 206 — Upload Error Message Propagation + Client-Side Validation — DONE (2026-04-05)

> Archived in DONE.md.

---

## ✅ Phase 207 — Upload Magic Byte Validation (Security) — DONE (2026-04-05)

> Archived in DONE.md.

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

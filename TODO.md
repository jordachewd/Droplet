# Droplet — TODO

> Prioritized, actionable development tasks. Each task max ~30 minutes.
> Governed by **Droplet-PM**. Do not add tasks without PM approval.
> Ref: `SPEC.md` for full specification. `AGENTS.md` for coding rules. `DONE.md` for completed phases.
> Implementation agent: **Droplet-Engineer** (Senior Developer).
>
> **STATUS: PM audit #90 (2026-04-03). V1.0 MVP RELEASED. All 7 validation gates GREEN (611 tests, lint 0/0, TSC clean, build passes, knip 0). All Milestones 0–25 COMPLETE. Phases 189–194 COMPLETE.**
>
> **GATE STATUS: Validation GREEN. Architecture GREEN. Product GREEN. Admin GREEN. Public GREEN. Contract GREEN.**
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
> - 🔴 Image upload "describe image" error — **Phase 195. HIGH. S3 proxy URLs inaccessible to OpenAI.**
> - 🔴 Audio player overlap — **Phase 196. MEDIUM-HIGH. Multiple audios play simultaneously.**
> - 🟡 Image lightbox for generated images — **Phase 197. MEDIUM.**
> - 🟡 Library Uploaded tab visual previews — **Phase 198. MEDIUM.**
> - 🟢 useActionState console warning — **Phase 199. LOW. Trivial fix.**
> - ⚪ PlanPromo + ChatSidebarPromo merge — **REJECTED. Acceptable pattern.**
>
> **EXECUTION ORDER (PM audit #90 — Post-Release):**
>
> 1. **HIGH Phase 195** — Image upload "describe image" fix (S3 URL resolution).
> 2. **LOW Phase 199** — useActionState startTransition fix (trivial, do first).
> 3. **MEDIUM-HIGH Phase 196** — Audio player overlap fix (global audio coordination).
> 4. **MEDIUM Phase 197** — Image lightbox for generated images.
> 5. **MEDIUM Phase 198** — Library Uploaded tab visual previews.
> 6. **MEDIUM Phase 144** — Admin config cache (30s TTL).
> 7. **MEDIUM Phase 145** — Upload filename collision prevention.
> 8. **MEDIUM Phase 165** — Checkout success page DB polling.
> 9. **LOW Phase 146** — Admin user detail transaction limit.
> 10. **LOW Phase 147** — Rename `.tsx` utility files to `.ts`.
> 11. **LOW Phase 148** — Bulk operations partial-failure reporting.

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

## HIGH — Phase 195 — Image Upload "Describe Image" Fix

> **Owner bug report (PM audit #90).** When uploading an image and asking the model to "describe image", user gets error: "An error occurred while processing your request." Root cause: uploaded image URL is a relative path (`/api/download?key=...`) that OpenAI's vision API cannot access.

**Files:**

- `src/lib/utils/openai/generateResponse.tsx` — message preparation before OpenAI call
- `src/lib/utils/aws/s3-file-reference.ts` — `buildPrivateS3AssetUrl()` returns relative URL
- `src/app/api/openai/route.tsx` — passes messages to `generateResponse`

**What to do:**

1. Before sending messages to OpenAI, scan user message content items for `image_url` entries with internal `/api/download` URLs.
2. For each such URL, resolve the S3 object key and generate a pre-signed S3 URL with 15-minute TTL using `@aws-sdk/s3-request-presigner`.
3. Replace the internal URL with the pre-signed URL in the message content before passing to OpenAI.

**Acceptance criteria:**

- [ ] User-uploaded images with `/api/download` URLs are resolved to pre-signed S3 URLs before OpenAI call
- [ ] Pre-signed URLs have appropriate TTL (15 minutes)
- [ ] Image vision/description requests work correctly
- [ ] Build passes, tests pass

---

## LOW — Phase 199 — useActionState startTransition Fix

> **Owner bug report (PM audit #90).** Console error when confirming bulk delete: "An async function with useActionState was called outside of a transition."

**File:** `src/components/admin/admin-managed-form.tsx`

**What to do:**

1. Import `startTransition` from React.
2. Wrap `formAction(pendingFormData)` call in `handleConfirm` with `startTransition`.

**Acceptance criteria:**

- [ ] `formAction` call wrapped in `startTransition`
- [ ] Console error no longer appears
- [ ] Build passes, tests pass

---

## MEDIUM-HIGH — Phase 196 — Audio Player Overlap Fix

> **Owner bug report (PM audit #90).** Multiple audios play simultaneously when starting a new audio.

**Files:**

- `src/components/shared/audio-player.tsx`
- `src/components/chat/library-tabs.tsx`

**What to do:**

1. Create Zustand store (`useAudioStore`) with `activeAudioId` and coordination.
2. When any audio player starts, pause any previously playing audio.
3. Replace native `<audio controls>` in library with `AudioPlayer`.

**Acceptance criteria:**

- [ ] Only one audio plays at a time across the entire app
- [ ] Starting a new audio pauses any currently playing audio
- [ ] Library audios use `AudioPlayer` instead of native `<audio controls>`
- [ ] Build passes, tests pass

---

## MEDIUM — Phase 197 — Image Lightbox for Generated Images

> **Owner bug report (PM audit #90).** Generated images must be viewable at larger size.

**File:** `src/components/shared/image-holder.tsx`

**What to do:**

1. Add click handler to open full-viewport lightbox overlay using `<dialog>`.
2. Include close button and download button in the lightbox.

**Acceptance criteria:**

- [ ] Clicking an image opens a full-viewport lightbox
- [ ] Close button and download button available
- [ ] Build passes, tests pass

---

## MEDIUM — Phase 198 — Library Uploaded Tab Visual Previews

> **Owner bug report (PM audit #90).** Image uploads must show thumbnails, files must show icons.

**File:** `src/components/chat/library-tabs.tsx` — `LibraryUploadCard`

**What to do:**

1. If `item.contentType` starts with `image/`, render `<Image>` thumbnail.
2. For non-image types, render file-type icon.

**Acceptance criteria:**

- [ ] Image uploads show visual thumbnail preview
- [ ] Non-image uploads show file-type icon
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

# Droplet — TODO

> Prioritized, actionable development tasks. Each task max ~30 minutes.
> Governed by **Droplet-PM**. Do not add tasks without PM approval.
> Ref: `SPEC.md` for full specification. `AGENTS.md` for coding rules. `DONE.md` for completed phases.
> Implementation agent: **Droplet-Engineer** (Senior Developer).
>
> **STATUS: PM audit #93 (2026-04-04). V1.0 MVP RELEASED. All 7 validation gates GREEN (619 tests, lint 0/0, TSC clean, build passes, knip 0). All Milestones 0–25 COMPLETE. Phases 189–203, 144 COMPLETE.**
>
> **GATE STATUS: Validation GREEN. Architecture GREEN. Product GREEN. Admin GREEN. Public GREEN. Contract GREEN.**
>
> **TEST STATUS: 619 tests (102 suites), 49 E2E (6 skipped). 0 failures. All gates GREEN.**
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
> - 🔴 API route timeouts must be max — **Phase 204. HIGH. Owner directive PM #93.**
> - 🔴 New chat not appearing in sidebar — **Phase 205. HIGH. Owner bug PM #93.**
> - 🔴 Image upload error messages generic — **Phase 206. HIGH. Owner bug PM #93.**
> - 🟡 Upload file sanitization (magic bytes) — **Phase 207. MEDIUM. Owner directive PM #93.**
>
> **EXECUTION ORDER (PM audit #93 — Post-Release):**
>
> 1. **HIGH Phase 204** — Set all API route `maxDuration` to 60 (Vercel Hobby ceiling). ~5 min.
> 2. **HIGH Phase 205** — Sidebar live update on new chat (`router.refresh()` after task creation). ~15 min.
> 3. **HIGH Phase 206** — Upload error propagation + client-side type validation + narrow `accept` attribute. ~30 min.
> 4. **MEDIUM Phase 207** — Upload magic byte validation (JPEG/PNG/GIF/WebP signatures). ~30 min.
> 5. **MEDIUM Phase 145** — Upload filename collision prevention (`crypto.randomUUID()`).
> 6. **MEDIUM Phase 165** — Checkout success page DB polling.
> 7. **LOW Phase 146** — Admin user detail transaction limit.
> 8. **LOW Phase 147** — Rename `.tsx` utility files to `.ts`.
> 9. **LOW Phase 148** — Bulk operations partial-failure reporting.

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

## HIGH — Phase 204 — Set All API Route Timeouts to Maximum

> **Owner directive (PM #93).** API route timeouts must be set to maximum possible to avoid/reduce stalled queries or incomplete requests to external services. Vercel Hobby ceiling is 60s.

**Files:**

- `src/app/api/webhooks/stripe/route.tsx` — currently `maxDuration = 30`, change to `60`
- `src/app/api/upload/route.tsx` — currently `maxDuration = 30`, change to `60`
- `src/app/api/download/route.tsx` — currently `maxDuration = 30`, change to `60`
- `src/app/api/aws/route.tsx` — currently `maxDuration = 30`, change to `60`

**Already at 60:** `/api/openai`, `/api/webhooks/clerk`.

**What to do:** Change `export const maxDuration = 30` to `export const maxDuration = 60` in all 4 files.

**Acceptance criteria:**

- [ ] All API routes have `maxDuration = 60`
- [ ] Build passes

---

## HIGH — Phase 205 — Sidebar Live Update on New Chat

> **Owner bug (PM #93).** When starting a new chat with any persona, the new conversation does not appear in the sidebar until browser refresh. Root cause: `ChatSidebar` is a Server Component rendered at layout level, fetches data from `getRecentTasksByUserId()` during SSR. No `router.refresh()` or revalidation is called after client-side task creation in `ChatWrapper`.

**Files:**

- `src/components/chat/chat-wrapper.tsx` — needs `router.refresh()` after new task creation

**What to do:**

1. In `ChatWrapper`, after `setTaskId(responseData.taskId)` for a **new** conversation (when previous `dbTaskId` was `null`), call `router.refresh()` to trigger a Server Component re-render of the layout.
2. This forces `ChatSidebar` to re-fetch from DB and display the new conversation.
3. Use `useRouter()` from `next/navigation` (likely already imported).
4. Only call `router.refresh()` on the first message of a new conversation, not on subsequent messages.

**Acceptance criteria:**

- [ ] New conversation appears in sidebar after first message without browser refresh
- [ ] Subsequent messages in existing conversation do NOT trigger unnecessary refreshes
- [ ] Build passes, tests pass

---

## HIGH — Phase 206 — Upload Error Message Propagation + Client-Side Validation

> **Owner bug (PM #93).** Image upload in ChatInput shows "Failed to upload file. Please try again." for ALL errors instead of specific messages. `.avif` files are not supported but the user only sees "File upload failed" instead of listing allowed types. Root cause: `chat-input.tsx` catch block intentionally discards server error messages and replaces with generic text.

**Files:**

- `src/components/chat/chat-input.tsx` — Fix catch block to propagate server error messages
- `src/components/chat/chat-input.tsx` — Narrow `accept` attribute from `image/*` to specific types
- `src/components/chat/chat-input.tsx` — Add client-side pre-validation before upload

**What to do:**

1. **Fix error propagation:** Change catch block from:
   ```typescript
   void error;
   setUploadError("Failed to upload file. Please try again.");
   ```
   to:
   ```typescript
   const message =
     error instanceof Error
       ? error.message
       : "Failed to upload file. Please try again.";
   setUploadError(message);
   ```
2. **Narrow accept attribute:** Change `accept="image/*"` to `accept="image/jpeg,image/png,image/webp,image/gif"` — prevents file picker from showing unsupported formats.
3. **Add client-side pre-validation:** Before calling `uploadSelectedFile()`, check file type against the allowlist on the client side. Show immediate error for invalid types without making a round-trip.

**Acceptance criteria:**

- [ ] Server error messages (invalid type, too large, etc.) shown to user
- [ ] File picker only shows supported image formats
- [ ] `.avif` files rejected with specific error message listing allowed types
- [ ] Build passes

---

## MEDIUM — Phase 207 — Upload Magic Byte Validation (Security)

> **Owner directive (PM #93).** Upload sanitization: deep security audit performed. Server-side validation relies solely on browser-reported MIME type which is trivially spoofable. Must verify actual file content via magic byte signatures.

**File:** `src/lib/utils/upload-file-validation.ts`

**What to do:**

1. Add a `validateImageMagicBytes(buffer: ArrayBuffer): boolean` function that checks the first 8-16 bytes against known image format signatures:
   - JPEG: starts with `FF D8 FF`
   - PNG: starts with `89 50 4E 47 0D 0A 1A 0A`
   - GIF: starts with `47 49 46 38` (`GIF8`)
   - WebP: starts with `52 49 46 46` at offset 0, `57 45 42 50` at offset 8
2. Call this function in the upload route after reading the file buffer, before uploading to S3.
3. Return a specific error message if magic bytes don't match claimed MIME type: "File content does not match declared type."

**Acceptance criteria:**

- [ ] Upload validates file content matches claimed MIME type
- [ ] Spoofed MIME type with non-image content is rejected
- [ ] Valid images with correct magic bytes still upload successfully
- [ ] Build passes, tests pass

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

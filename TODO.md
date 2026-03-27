# Droplet — TODO

> Prioritized, actionable development tasks. Each task max ~30 minutes.
> Governed by **Droplet-PM**. Do not add tasks without PM approval.
> Ref: `SPEC.md` for full specification. `AGENTS.md` for coding rules. `DONE.md` for completed phases.
> Implementation agent: **Droplet-Engineer** (Senior Developer).
>
> **STATUS: PM audit #69 (2026-03-27). Milestones 0–25 COMPLETE. All phases through 149 complete. 574 unit tests (97 suites). 8 E2E specs. Build passes. TSC clean. Node.js 24.12.0 runtime.**
> **GATE STATUS: All 7 gates GREEN. Lint (0 errors, 0 warnings), Knip (0 findings), TSC clean, build passes, unit tests (97/574), E2E (8 specs), coverage 85/80/85/85.**
> **TDD REBUILD COMPLETE. WCAG 2.2 AA COMPLETE. Admin configurability ALL RESOLVED. Phase 149 (SSE heartbeat streaming fix) COMPLETE.**
> **Zero: `as never`, `as any`, `console.log`, `console.error`, `window.alert`, `window.confirm`, `strict: false`, stale TODOs — all in `src/`.**
> **SWOT audit #69 conducted. Architect + Engineer + PM triple audit. 4 new production bugs identified (owner-reported). 1 CRITICAL regression (billing).**
> **NEXT SESSION: 152 (CRITICAL billing fix) → 153 (HIGH hydration fix) → 154 (HIGH suspended UX) → 155 (HIGH scrollbar removal) → 150 (HIGH user deletion cascade) → 151 (HIGH library uploaded tab) → 142 (HIGH rate limiting) → 143–148 (MEDIUM/LOW)**

---

## CRITICAL — Payment Checkout Broken (PM audit #69 — Owner-reported production bug)

### Phase 152 CRITICAL — Fix `redirect()` inside try/catch in `checkoutPlan()`

> **Owner-reported CRITICAL production bug.** Clicking "SUBSCRIBE" on `/app/plans` shows "Something went wrong." Billing is 100% broken — zero users can subscribe. Root cause: `redirect()` inside try/catch. Next.js `redirect()` throws `NEXT_REDIRECT` error internally — this is caught by the surrounding catch block and passed to `handleError()`, which re-throws as a generic error. The Stripe session is created successfully but the redirect never executes. **Regression introduced by Phase 135** (try/catch addition).

**Root cause chain:**

1. `checkoutPlan()` in `transaction.action.tsx` calls `redirect(session.url!)` at line ~102
2. `redirect()` throws a special `NEXT_REDIRECT` error (this is how Next.js redirects work in server actions)
3. The `catch (error)` block at line ~104 catches the `NEXT_REDIRECT` error
4. `handleError()` calls `buildSafeClientMessage()` which doesn't recognize `NEXT_REDIRECT` → returns "An unexpected error occurred"
5. `handleError()` throws `new Error("An unexpected error occurred")` — stripping the `NEXT_REDIRECT` digest
6. Client receives the generic error → "Something went wrong"

**Files:**

1. `src/lib/actions/transaction.action.tsx` — Move `redirect()` outside try/catch

**What to do:**

1. Store `session.url` in a variable declared before the try/catch block.
2. Inside the try block, assign `redirectUrl = session.url` instead of calling `redirect()` directly.
3. After the try/catch block, call `redirect(redirectUrl)` — this way the `NEXT_REDIRECT` throw propagates correctly.
4. Update the unit test for `checkoutPlan` to correctly mock `redirect` as throwing (matches production behavior).

**Fix pattern:**

```typescript
let redirectUrl: string | undefined;
try {
  // ... create Stripe session ...
  redirectUrl = session.url!;
} catch (error) {
  handleError({ error, source: "checkoutPlan" });
}
if (redirectUrl) redirect(redirectUrl);
```

**Acceptance criteria:**

- [x] `redirect()` called outside try/catch block
- [x] Stripe checkout flow completes without error
- [x] Unit test updated to verify redirect behavior
- [x] Build passes, tests pass

---

## HIGH — Admin Settings Hydration Mismatch (PM audit #69 — Owner-reported production bug)

### Phase 153 HIGH — Fix `AdminSettingsTabs` SSR/client hydration mismatch

> **Owner-reported HIGH bug.** `/admin/settings` shows React hydration mismatch errors. `AdminSettingsTabs` reads `localStorage` in `useState` initializer — SSR returns fallback (`tabs[0].id`), but client hydration may return a different tab ID from localStorage. This causes `aria-selected`, `className`, and `tabIndex` attributes to differ between server HTML and client's first render.

**File:** `src/components/admin/settings/admin-settings-tabs.tsx`

**What to do:**

1. Remove the `getInitialActiveTabId()` function.
2. Initialize `useState` with `tabs[0]?.id ?? ""` (same value for SSR and client).
3. Add a `useEffect` that reads `localStorage` after mount and updates state if a stored valid tab is found.
4. This ensures hydration matches, then updates client-side only after mount.

**Fix pattern:**

```typescript
const [activeTabId, setActiveTabId] = useState(tabs[0]?.id ?? "");

useEffect(() => {
  const stored = localStorage.getItem(ADMIN_SETTINGS_TAB_STORAGE_KEY);
  if (stored && tabs.some((t) => t.id === stored)) {
    setActiveTabId(stored);
  }
}, [tabs]);
```

**Acceptance criteria:**

- [x] No hydration mismatch errors on `/admin/settings`
- [x] Tab persistence still works (stored tab restored after mount)
- [x] Arrow-key navigation still works
- [x] Build passes, tests pass

---

## HIGH — Suspended User UX Messaging (PM audit #69 — Owner-reported UX gap)

### Phase 154 HIGH — Add suspension message to `ChatSidebarPromo` and `PlanPromo`

> **Owner-reported HIGH UX gap.** Suspended users can access `/app` but see normal upgrade CTAs instead of suspension messaging. Backend enforcement exists (Phase 141 — API routes return 403) but the UI provides no explanation. Owner wants `ChatSidebarPromo` to display a relevant suspension message and `PlanPromo` on `/app/profile` to display a relevant suspension message.

**Files:**

1. `src/components/chat/sidebar/chat-sidebar-promo.tsx` — Add `isSuspended` prop and suspension-specific display
2. `src/components/shared/plan-promo.tsx` — Add `isSuspended` prop and suspension-specific display
3. `src/components/chat/sidebar/chat-sidebar-shell.tsx` — Pass `isSuspended` to `ChatSidebarPromo`
4. `src/components/sections/profile/profile-hero.tsx` — Pass `isSuspended` to `PlanPromo`
5. Server component parents — Provide `isSuspended` data

**What to do:**

1. Add `isSuspended?: boolean` prop to `ChatSidebarPromoProps` and `PlanPromoProps`.
2. In `ChatSidebarPromo`: if `isSuspended` is true, render a suspension message (e.g., "Account Suspended — Your account has been suspended. Contact support for assistance.") instead of upgrade CTA. No "Manage Plan" link.
3. In `PlanPromo`: if `isSuspended` is true, render a suspension notice with contact-support CTA instead of upgrade prompt.
4. Pass `isSuspended` from server components to these client components via props.

**Acceptance criteria:**

- [x] `ChatSidebarPromo` shows suspension message when `isSuspended` is true
- [x] `PlanPromo` shows suspension notice when `isSuspended` is true
- [x] Normal behavior preserved when `isSuspended` is false/undefined
- [x] No upgrade CTAs visible to suspended users
- [x] Unit tests cover suspension display
- [x] Build passes, tests pass

---

## HIGH — Remove Custom Scrollbar CSS (PM audit #69 — Owner directive)

### Phase 155 HIGH — Remove `.droplet-scrollbar` class and all usages

> **Owner directive.** Remove ALL custom scrollbar manipulation — let the browser handle scrollbars natively. The `.droplet-scrollbar` class in `globals.css` customizes WebKit scrollbars. Used in 5 components.

**Files:**

1. `src/app/globals.css` — Delete `.droplet-scrollbar` class definition
2. `src/components/chat/chat-wrapper.tsx` — Remove `droplet-scrollbar` from className
3. `src/components/chat/sidebar/chat-sidebar-shell.tsx` — Remove `droplet-scrollbar` from className
4. `src/components/chat/chat-page-wrapper.tsx` — Remove `droplet-scrollbar` from className
5. `src/components/admin/admin-layout-shell.tsx` — Remove `droplet-scrollbar` from className
6. `src/components/admin/admin-sidebar.tsx` — Remove `droplet-scrollbar` from className

**What to do:**

1. Delete the `.droplet-scrollbar { ... }` block from `globals.css`.
2. Remove the `droplet-scrollbar` class name from all 5 component className strings.
3. No replacement needed — browser default scrollbars will apply.

**Acceptance criteria:**

- [x] `.droplet-scrollbar` CSS class deleted from `globals.css`
- [x] Zero usages of `droplet-scrollbar` in any component file
- [x] Browser default scrollbars work correctly
- [x] Build passes, tests pass

---

## HIGH — User Deletion Cascade Gap (PM audit #68 — Owner-reported production bug)

### Phase 150 HIGH — Complete user deletion cascade + extract shared utility

> **Owner-reported HIGH production bug.** When a user is deleted, `RateLimitEntry` records (keyed as `openai:${userId}`, `upload:${userId}`, `aws:${userId}`) survive in ALL THREE deletion paths. This is orphaned data. Additionally, all three deletion paths duplicate the same cascade logic independently — extract a shared utility to prevent future cascade gaps.

**Current cascade (incomplete in all 3 paths):** Clerk → Tasks → Transactions → UsageEvents → S3 → User
**Missing:** RateLimitEntry cleanup
**AdminAuditLog decision:** RETAIN for audit trail compliance — do NOT delete. These are permanent admin forensics records.

**Files:**

1. Create `src/lib/utils/delete-user-cascade.ts` — shared cascade utility
2. `src/lib/actions/user.actions.tsx` — Refactor `deleteUser()` to use shared utility
3. `src/lib/actions/admin.actions.tsx` — Refactor `removeUserByAdmin()` to use shared utility
4. `src/app/api/webhooks/clerk/route.tsx` — Refactor `user.deleted` handler to use shared utility

**What to do:**

1. Create `deleteUserCascade(clerkId: string)` in a new shared utility file. This function performs:
   - `Task.deleteMany({ userId: clerkId })`
   - `Transaction.deleteMany({ clerkId })`
   - `UsageEvent.deleteMany({ userId: clerkId })`
   - `RateLimitEntry.deleteMany({ key: { $in: [\`openai:${clerkId}\`, \`upload:${clerkId}\`, \`aws:${clerkId}\`] } })`
   - `deleteS3Prefix(\`${clerkId}/\`)`Returns:`{ deletedTasks, deletedTransactions, deletedUsageEvents, deletedRateLimitEntries, deletedObjectsCount }`
2. Each error in the cascade should be caught independently (existing pattern in webhook) so partial failure doesn't break the cascade.
3. Refactor all 3 deletion paths to call the shared utility.
4. Add unit tests verifying RateLimitEntry is cleaned.

**Acceptance criteria:**

- [ ] Shared `deleteUserCascade()` utility extracted
- [ ] `RateLimitEntry.deleteMany` included in cascade
- [ ] All 3 deletion paths use the shared utility
- [ ] Webhook handler maintains independent error handling per step
- [ ] Unit tests verify RateLimitEntry cleanup in all paths
- [ ] Build passes, tests pass

---

## HIGH — Library "Uploaded" Tab (PM audit #68 — Owner-reported production bug)

### Phase 151 HIGH — Add "Uploaded" tab to Conversation Library

> **Owner-reported HIGH feature gap.** The Conversation Library only tracks AI-generated media (images, audios, videos). User-uploaded files (images, documents via `/api/upload`) are stored in S3 under `{userId}/uploads/` but are NOT tracked in MongoDB — there is no way to list, browse, or manage uploaded files after the upload.

**Files:**

1. Create `src/lib/database/models/upload.model.ts` — new Upload Mongoose model
2. `src/app/api/upload/route.tsx` — Persist upload metadata to new model
3. `src/lib/utils/task-queries.tsx` — Add `getUploadsByUserId()` query
4. `src/app/(chat)/app/library/page.tsx` — Fetch uploads and pass to LibraryTabs
5. `src/components/chat/library-tabs.tsx` — Add 5th "Uploaded" tab
6. `src/types/LibraryData.d.ts` — Add `LibraryUploadCardItem` type
7. `src/lib/utils/delete-user-cascade.ts` — Add `Upload.deleteMany({ userId })` to cascade

**What to do:**

1. Create `Upload` model: `{ userId: String, fileName: String, objectKey: String, s3Url: String, contentType: String, sizeBytes: Number, taskId: String (optional — conversation it was used in), createdAt: Date }`. Use `strict: true`. Use compound index `{ userId: 1, createdAt: -1 }` instead of two separate indexes (covers filter + sort in single scan per Architect recommendation).
2. In upload API route: after successful S3 upload, persist an `Upload` document.
3. Add `getUploadsByUserId(userId, page, limit)` query with `.lean().select()` and pagination.
4. In library page: fetch uploads server-side and pass as props.
5. In LibraryTabs: add `uploads` tab with uploaded file cards (filename, content type, date, download link).
6. Add `Upload.deleteMany({ userId })` to the deletion cascade utility (Phase 150).
7. Add unit tests for the new model and query.

**Acceptance criteria:**

- [ ] `Upload` model created with proper schema, indexes, and `strict: true`
- [ ] Upload API persists metadata on successful upload
- [ ] Library page fetches and displays uploads in new "Uploaded" tab
- [ ] Uploaded tab shows filename, type, date, and download link
- [ ] Upload.deleteMany included in user deletion cascade
- [ ] Pagination works for uploaded files
- [ ] Unit tests for model and query
- [ ] Build passes, tests pass

---

## HIGH — Rate Limiting on Upload/AWS Endpoints (PM audit #67)

### Phase 142 HIGH — Add rate limiting to `/api/upload` and `/api/aws` endpoints

> Architect finding T-1. Upload and AWS endpoints have auth checks but zero rate limiting. An authenticated user can flood S3 with unlimited uploads — each triggers S3 PUT operations. This is a cost attack vector. The `/api/openai` endpoint has rate limiting but these don't.

**Files:**

1. `src/app/api/upload/route.tsx` — Add `enforceSlidingWindowRateLimit`
2. `src/app/api/aws/route.tsx` — Add `enforceSlidingWindowRateLimit`

**What to do:**

1. Import `enforceSlidingWindowRateLimit` from `@/lib/utils/rate-limit`.
2. Apply `enforceSlidingWindowRateLimit({ key: \`upload:${userId}\`, limit: 30, windowMs: 60_000 })` before processing in upload route.
3. Apply `enforceSlidingWindowRateLimit({ key: \`aws:${userId}\`, limit: 30, windowMs: 60_000 })` before processing in aws route.
4. Return proper 429 response with `Retry-After` header on rate limit hit.

**Acceptance criteria:**

- [ ] `/api/upload` has per-user rate limiting (30 req/60s)
- [ ] `/api/aws` has per-user rate limiting (30 req/60s)
- [ ] Rate limit returns 429 with `Retry-After` header
- [ ] Build passes, tests pass

---

## MEDIUM — Environment Variable Runtime Validation (PM audit #67)

### Phase 143 MEDIUM — Replace `as string` / `!` casts on env vars with runtime validation

> Architect finding W-2, Engineer finding H-1/H-2/H-4. 4 `as string` casts and 4 `!` non-null assertions on `process.env` values. If any env var is missing, broken clients are silently constructed (S3Client with `undefined` region, OpenAI with `undefined` API key). Errors surface later as cryptic API failures.

**Files:**

1. `src/constants/aws.tsx` — 3 `as string` casts on `AWS_S3_REGION`, `AWS_S3_ACCESS_ID`, `AWS_S3_SECRET_KEY`
2. `src/constants/openai.tsx` — 3 `!` on `OPENAI_ORG`, `OPENAI_PRJ`, `OPENAI_KEY`
3. `src/lib/database/mongoose.tsx` — 1 `as string` on `MONGODB_URL`
4. `src/lib/actions/transaction.action.tsx` — 1 `!` on `STRIPE_SECRET_KEY`

**What to do:**

1. Create a shared `throwEnvError(name: string): never` utility (or inline).
2. Replace `process.env.VAR as string` with `process.env.VAR ?? throwEnvError("VAR")`.
3. Replace `process.env.VAR!` with `process.env.VAR ?? throwEnvError("VAR")`.
4. This ensures fast failure with clear error messages on missing env vars.

**Acceptance criteria:**

- [ ] Zero `as string` on `process.env` in codebase
- [ ] Zero `!` on `process.env` in codebase
- [ ] Missing env vars throw clear error at module load
- [ ] Build passes, tests pass

---

## MEDIUM — Admin Config In-Memory Cache (PM audit #67)

### Phase 144 MEDIUM — Cache admin config queries with short TTL

> Architect finding O-2. `getEffectivePlanConfig()`, `getEffectivePersonaAccessByPlan()`, `getEffectiveModelConfig()`, `getEffectiveSupportEmail()`, `getEffectiveStopReasonMessages()` are called on every `/api/openai` request (5 DB round trips per chat message). These settings change only when admin updates them.

**Files:**

1. Create `src/lib/utils/config-cache.ts` — simple in-memory cache with TTL (30s)
2. Update all `effective-*.ts` resolvers to use cache

**What to do:**

1. Create a generic `cachedQuery<T>(key: string, fetcher: () => Promise<T>, ttlMs: number): Promise<T>` utility.
2. Wrap each `getEffective*` resolver's DB calls in the cache.
3. TTL of 30 seconds balances freshness with DB load reduction.
4. Cache invalidation happens naturally via TTL expiry (admin updates are infrequent).

**Acceptance criteria:**

- [ ] Admin config queries cached with 30s TTL
- [ ] Repeated calls within TTL window return cached result
- [ ] Cache is per-process (no shared state concerns)
- [ ] Build passes, tests pass

---

## MEDIUM — Upload Filename Collision Prevention (PM audit #67)

### Phase 145 MEDIUM — Use `crypto.randomUUID()` for upload filenames

> Engineer finding M-7. `uploaded_file_${Date.now()}.${fileExtension}` could collide under high-concurrency uploads from the same user.

**File:** `src/app/api/upload/route.tsx`

**What to do:**

1. Replace `Date.now()` with `crypto.randomUUID()` in upload filename generation.
2. Result: `uploaded_file_${crypto.randomUUID()}.${fileExtension}`.

**Acceptance criteria:**

- [ ] Upload filenames use `crypto.randomUUID()` instead of `Date.now()`
- [ ] Build passes

---

## LOW — Admin User Detail Transaction Limit (PM audit #67)

### Phase 146 LOW — Add `.limit(50)` to admin user detail transaction query

> Architect finding W-6. `Transaction.find({ clerkId: user.clerkId })` in `getAdminUserDetail` has no `.limit()`. A user with many transactions causes an unbounded query.

**File:** `src/lib/utils/admin-queries.ts`

**What to do:** Add `.limit(50)` to the transaction query in `getAdminUserDetail`.

**Acceptance criteria:**

- [ ] Transaction query in admin user detail has `.limit(50)`
- [ ] Build passes

---

## LOW — Rename `.tsx` Utility Files to `.ts` (PM audit #67)

### Phase 147 LOW — Rename utility files with `.tsx` extension that contain no JSX

> Engineer finding L-4/L-5. Per coding standards, utility-only files should use `.ts` extension. Several utility files use `.tsx` but contain no JSX.

**Files to evaluate:**

1. `src/lib/utils/handleError.tsx` → `.ts`
2. `src/lib/utils/getPlanStatus.tsx` → `.ts`
3. `src/lib/utils/getFullName.tsx` → `.ts`
4. `src/lib/utils/getFormattedDate.tsx` → `.ts`
5. `src/lib/utils/generateString.tsx` → `.ts`

**What to do:**

1. Verify each file contains no JSX.
2. Rename `.tsx` → `.ts`.
3. Update all imports.
4. Update test file imports if needed.

**Acceptance criteria:**

- [ ] All utility-only files use `.ts` extension
- [ ] All imports updated
- [ ] Build passes, tests pass

---

## LOW — Bulk Operations Partial-Failure Reporting (PM audit #67)

### Phase 148 LOW — Report partial success/failure in admin bulk operations

> Engineer finding H-6. `bulkRemoveUsersAction` fails midway through a batch with no partial-failure reporting. Users deleted so far are not reported and no rollback is possible.

**File:** `src/lib/actions/admin.actions.tsx`

**What to do:**

1. Track successful and failed operations in the loop.
2. Return partial results: `{ success: N, failed: M, errors: [...] }`.
3. Apply to `bulkRemoveUsersAction` and `bulkSuspendUsersAction`.

**Acceptance criteria:**

- [ ] Bulk operations report partial success/failure
- [ ] Build passes

---

## LOW — Remaining Work

### Phase 73.2 LOW — Minor re-render and code quality fixes

### Phase 46.1 LOW — Admin error boundary

### Phase 46.2 LOW — Silent catch logging

---

## ON HOLD — Deferred

### Phase 29.x — Zod/Zustand app-wide modernization

### Phase 26.x — Persona-aware media prompts, Stripe auto-renewal

### Legal/nav/footer admin configurability — Deferred to v2

### TypeScript 6 / @typescript-eslint compatibility — Monitor for official TS 6 support in `@typescript-eslint` (Engineer finding M-3, PM audit #66)

### Admin config caching (Phase 144) — Optional performance optimization, not blocking

---

> **Completed phases** archived in [`DONE.md`](DONE.md).
> All phases through 149 complete (incl. 135–141, 149, 74.2, 104, 125.3, 126.2, 134, plus 107.1–107.3, 108, 114, 125.1, 131, 132, 133, 120.1–120.7, 121–130, 128.2, 106).
> All Milestones 0–25 COMPLETE.

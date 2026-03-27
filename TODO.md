# Droplet — TODO

> Prioritized, actionable development tasks. Each task max ~30 minutes.
> Governed by **Droplet-PM**. Do not add tasks without PM approval.
> Ref: `SPEC.md` for full specification. `AGENTS.md` for coding rules. `DONE.md` for completed phases.
> Implementation agent: **Droplet-Engineer** (Senior Developer).
>
> **STATUS: PM audit #68 (2026-03-27). Milestones 0–25 COMPLETE. All phases through 141 complete. 571 unit tests (97 suites). 8 E2E specs. Build passes. TSC clean. Node.js 24.12.0 runtime.**
> **GATE STATUS: All 7 gates GREEN. Lint (0 errors, 0 warnings), Knip (0 findings), TSC clean, build passes, unit tests (97/571), E2E (8 specs), coverage 85/80/85/85.**
> **TDD REBUILD COMPLETE. WCAG 2.2 AA COMPLETE. Admin configurability ALL RESOLVED. Phase 141 (suspended user enforcement) COMPLETE.**
> **Zero: `as never`, `as any`, `console.log`, `console.error`, `window.alert`, `window.confirm`, `strict: false`, stale TODOs — all in `src/`.**
> **SWOT audit #68 conducted. Architect + Engineer + PM triple audit. 3 production bugs identified (owner-reported).**
> **NEXT SESSION: 149 (CRITICAL streaming fix) → 150 (HIGH user deletion cascade) → 151 (HIGH library uploaded tab) → 142 (HIGH upload/aws rate limiting) → 143 (MEDIUM env var validation) → 144 (MEDIUM admin config caching) → 145 (MEDIUM upload filename collision) → 146–148 (LOW)**

---

## CRITICAL — SSE Streaming Timeout During Media Generation (PM audit #68 — Owner-reported production bug)

### Phase 149 CRITICAL — Fix "The response stream ended unexpectedly" error

> **Owner-reported CRITICAL production bug.** When asking for media generation (image, audio, video) it triggers `Error: The response stream ended unexpectedly.` Also occurs with large text responses. Triple-confirmed root cause: when OpenAI returns a tool call (media generation), the SSE stream goes silent while the server performs media generation (generateImage/generateAudio/generateVideo). No heartbeat/keepalive events are sent during this gap. Video generation polls Sora for up to 180s, but the client has a 120s timeout — **video generation ALWAYS fails in streaming mode**. Image/audio (5-20s) may also fail if network intermediaries drop idle connections.

**Root cause chain:**

1. Client sends streaming request with 120s timeout (`STREAM_REQUEST_TIMEOUT_MS` in `chat-wrapper.tsx:36`)
2. Server creates `ReadableStream` and sends `meta` SSE event (`route.tsx:1433`)
3. OpenAI streaming completes (text chunks sent to client)
4. OpenAI returns tool call → `buildOpenAIResponsePayload()` runs media generation synchronously
5. During media generation: **zero SSE data flows** — stream is silent
6. Client 120s timeout fires → abort → stream ends without `final` event → error shown

**Files:**

1. `src/app/api/openai/route.tsx` — Add heartbeat mechanism to `ReadableStream.start()` during media generation
2. `src/components/chat/chat-wrapper.tsx` — Handle `heartbeat` events; make timeout resettable on any received event
3. `src/types/chat-api.d.ts` — Add `heartbeat` to `ChatStreamEvent` union type
4. `src/lib/utils/openai/generateResponse.tsx` — Signal to caller when media generation starts (for heartbeat coordination)

**What to do:**

1. Add a `type: "heartbeat"` event to the `ChatStreamEvent` type.
2. In the streaming branch of `route.tsx`: when `generateStreamingResponse` is processing (especially during media tool calls), start a `setInterval` that writes `{ type: "heartbeat" }` SSE events every 10-15 seconds.
3. In `generateStreamingResponse` or `buildOpenAIResponsePayload`: add a callback (`onMediaGenerationStart`/`onMediaGenerationEnd`) so the route can coordinate the heartbeat interval.
4. In `chat-wrapper.tsx`: (a) Handle `heartbeat` events in `handleEvent` — ignore content-wise but the data received keeps the connection alive. (b) Reset the timeout timer on every received event (including heartbeats) instead of using a fixed 120s from request start.
5. Increase `STREAM_REQUEST_TIMEOUT_MS` to 200s as a safety margin (video can take up to 180s).

**Acceptance criteria:**

- [ ] SSE heartbeat events sent every 10-15s during media generation
- [ ] Client handles heartbeat events without error
- [ ] Client timeout resets on every received event
- [ ] Video generation (180s max) completes without stream timeout
- [ ] Image/audio generation completes without stream timeout
- [ ] Large text responses complete without timeout
- [ ] `ChatStreamEvent` type includes `heartbeat`
- [ ] Unit tests cover heartbeat emission and client handling
- [ ] Build passes, tests pass

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

1. Create `Upload` model: `{ userId: String (indexed), fileName: String, objectKey: String, s3Url: String, contentType: String, sizeBytes: Number, taskId: String (optional — conversation it was used in), createdAt: Date (indexed) }`. Use `strict: true`.
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
> All phases through 141 complete (incl. 135–141, 74.2, 104, 125.3, 126.2, 134, plus 107.1–107.3, 108, 114, 125.1, 131, 132, 133, 120.1–120.7, 121–130, 128.2, 106).
> All Milestones 0–25 COMPLETE.

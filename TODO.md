# Droplet — TODO

> Prioritized, actionable development tasks. Each task max ~30 minutes.
> Governed by **Droplet-PM**. Do not add tasks without PM approval.
> Ref: `SPEC.md` for full specification. `AGENTS.md` for coding rules. `DONE.md` for completed phases.
> Implementation agent: **Droplet-Engineer** (Senior Developer).
>
> **STATUS: PM audit #81 (2026-04-01). DEPLOYED TO PRODUCTION. All 7 validation gates GREEN (601 tests, lint 0/0, TSC clean, build passes, knip 0). All Milestones 0–25 COMPLETE. Phases 171–172, 167.2, 162, 163 ALL COMPLETED this session. Brand rename complete in `src/`. Catch blocks documented. Promo text admin-configurable. Global error boundary live.**
>
> **GATE STATUS: Validation GREEN. Architecture GREEN. Admin GREEN. Public GREEN. Contract GREEN. Product YELLOW (C1 debug text in production).**
>
> **ACTIVE ISSUES (PM audit #81 — triple-audit: Architect + Engineer + PM):**
>
> - 🔴 C1: Debug text "Checking if is new task..." visible to all users in production (`chat-wrapper.tsx:601`).
> - ⚠️ H1: Dead `public/scripts/theme-init.js` — orphaned since Phase 170, last `cellesseon` reference.
> - ⚠️ H2: Duplicate `STREAM_PROACTIVE_TIMEOUT_MESSAGE` constant — desync risk between server and client.
> - ⚠️ H3: Dead `conversationEnded` prop in `ChatBodyProps` — accepted but never consumed.
> - ⚠️ H4: Fake download icon in `profile-billing.tsx` — styled clickable, no handler, no keyboard access.
> - ⚠️ H5: Download route S3 path forces 206 from request Range header, not upstream ContentRange.
> - ⚠️ H6: Audio player button permanently disabled after transient error (no retry mechanism).
> - ⚠️ M1: No video player error state (unlike audio player).
> - ⚠️ M2: ~30 hardcoded display strings across 8+ components (AGENTS.md Rule 11 violation).
> - ⚠️ M3: Hardcoded persona IDs `["strategist", "teacher", "creator"]` in homepage spotlight.
>
> **EXECUTION ORDER (PM audit #81 — critical production fix first, then audit findings, then backlog):**
>
> 1. **🔴 Phase 173 CRITICAL** — Remove debug text from production.
> 2. **HIGH Phase 174** — Delete dead file + update knip.json.
> 3. **HIGH Phase 175** — Remove dead prop from ChatBodyProps.
> 4. **HIGH Phase 176** — Fix download route 206 status logic.
> 5. **HIGH Phase 177** — Deduplicate timeout message constant.
> 6. **HIGH Phase 178** — Fix/remove fake download icon.
> 7. **MEDIUM Phase 179** — Add video player error state.
> 8. **MEDIUM Phase 180** — Hardcoded display text sweep.
> 9. **MEDIUM Phase 143** — Env var runtime validation.
> 10. **MEDIUM Phase 144** — Admin config cache.
> 11. **MEDIUM Phase 145–165** — Remaining backlog.
>
> _Debug text in production blocks ALL other work. No exceptions._

---

## 🔴 ENGINEER START HERE — Phase 173 CRITICAL — Remove Debug Text from Production

> **Debug text `<p>Checking if is new task...</p>` visible to every user on every existing conversation.** This is a production-visible debug artifact that must be removed immediately.

**File:** `src/components/chat/chat-wrapper.tsx` line 601

**Current code:**

```tsx
{
  !isNewTask && <p>Checking if is new task...</p>;
}
```

**What to do:**

1. Remove the entire line `{!isNewTask && <p>Checking if is new task...</p>}`.

**Acceptance criteria:**

- [ ] Zero debug text visible in production
- [ ] Build passes, tests pass

---

## HIGH — Phase 174 — Delete Orphaned `public/scripts/theme-init.js`

> Dead file orphaned since Phase 170 (inline script replaced it). Contains last `cellesseon` reference in the repository. Listed in `knip.json` ignoreFiles because it's unreferenced by code.

**What to do:**

1. Delete `public/scripts/theme-init.js`.
2. Remove `"public/scripts/theme-init.js"` from `knip.json` `ignoreFiles` array.

**Acceptance criteria:**

- [ ] File deleted
- [ ] `knip.json` updated
- [ ] Zero `cellesseon` references in entire repository (verify with `grep -r "cellesseon" .`)
- [ ] Knip still clean
- [ ] Build passes

---

## HIGH — Phase 175 — Remove Dead `conversationEnded` Prop from ChatBodyProps

> `conversationEnded` is declared in `ChatBodyProps` (line 18) and passed from `ChatWrapper` (line 612), but is NOT destructured or consumed by `ChatBody`. Dead API surface.

**Files:** `src/components/chat/chat-body.tsx`, `src/components/chat/chat-wrapper.tsx`

**What to do:**

1. Remove `conversationEnded?: boolean;` from `ChatBodyProps` interface in `chat-body.tsx`.
2. Remove `conversationEnded={isConversationEnded}` from the `<ChatBody>` JSX in `chat-wrapper.tsx`.
3. Update any test that references this prop.

**Acceptance criteria:**

- [ ] `conversationEnded` removed from interface and call site
- [ ] Build passes, tests pass

---

## HIGH — Phase 176 — Fix Download Route S3 206 Status Logic

> S3 path returns `status: byteRange ? 206 : 200` — derives HTTP 206 from client request, not S3 response. Should check `response.ContentRange` (upstream-derived). If S3 ignores the range and returns full file, proxy incorrectly returns 206 without a Content-Range header.

**File:** `src/app/api/download/route.tsx` ~line 232

**Current code:**

```ts
status: byteRange ? 206 : 200,
```

**What to do:**

1. Change to `status: response.ContentRange ? 206 : 200,`.

**Acceptance criteria:**

- [ ] 206 returned only when upstream S3 response includes ContentRange
- [ ] Build passes, tests pass

---

## HIGH — Phase 177 — Deduplicate `STREAM_PROACTIVE_TIMEOUT_MESSAGE` Constant

> Same string defined independently in `src/app/api/openai/route.tsx:81` (local const) and `src/constants/chat-stream.ts:4` (shared export). If either side changes, the client's proactive timeout detection silently breaks (it compares by string equality).

**Files:** `src/app/api/openai/route.tsx`, `src/constants/chat-stream.ts`

**What to do:**

1. In `route.tsx`, remove the local `const STREAM_PROACTIVE_TIMEOUT_MESSAGE = "..."`.
2. Import `STREAM_PROACTIVE_TIMEOUT_MESSAGE` from `@/constants/chat-stream`.
3. Note: `chat-stream.ts` needs `import "server-only"` if not already present, OR this constant must be moved to a file without server-only guard since it's used by both server (`route.tsx`) and client (`chat-wrapper.tsx`). Verify the import chain works.

**Acceptance criteria:**

- [ ] Single source of truth for the timeout message string
- [ ] Both server and client import from the same location
- [ ] Build passes, tests pass

---

## HIGH — Phase 178 — Fix Profile Billing Fake Download Icon

> `profile-billing.tsx:75` renders `<i className="bi bi-file-earmark-arrow-down cursor-pointer" aria-hidden="true">` — styled as clickable (`cursor-pointer`) but has no `onClick` handler, no `<button>` wrapper, and `aria-hidden="true"`. Users expect a download action but nothing happens.

**File:** `src/components/sections/profile/profile-billing.tsx` ~line 75

**What to do:**

Option A (preferred): Remove the icon entirely (no download functionality exists).
Option B: Make it a functional download button (would require receipt/invoice generation — likely out of scope).

1. Remove the `<i>` element entirely.

**Acceptance criteria:**

- [ ] No fake clickable elements in profile billing
- [ ] Build passes, tests pass

---

## MEDIUM — Phase 179 — Add Video Player Error State

> `video-player.tsx` has no error handling. If the video URL fails to load, the browser shows a default broken element with no user-facing message. The audio player (`audio-player.tsx`) already handles this well — match that pattern.

**File:** `src/components/shared/video-player.tsx`

**What to do:**

1. Add `onError` handler to the `<video>` element.
2. Show user-facing error state ("Video unavailable.") similar to `AudioPlayer`.

**Acceptance criteria:**

- [ ] Video player shows error message on failed load
- [ ] Build passes

---

## MEDIUM — Phase 180 — Hardcoded Display Text Sweep

> AGENTS.md Rule 11: "No hardcoded display text — all user-facing marketing/promo text must flow from admin-configurable settings." ~30 strings across 8+ components violate this.

**Files and strings to evaluate:**

1. `src/components/sections/homepage/cta-banner.tsx` — "Create an account, pick a persona...", "Explore the persona catalog...", "Create account", "Explore plans"
2. `src/components/sections/homepage/persona-spotlight.tsx` — "Persona spotlight", "Different jobs need different voices.", hardcoded IDs `["strategist", "teacher", "creator"]`
3. `src/components/chat/chat-intro.tsx` — "Hello {name},", "welcome to your chat dashboard.", "Active persona:"
4. `src/components/sections/shared/plans-section.tsx` — "Subscribe Now"
5. `src/components/chat/chat-input.tsx` — "This conversation has ended.", "Ask Droplet...", "can still make mistakes."
6. `src/components/sections/profile/profile-usage.tsx` — "Image Generations", "Audio Generations", etc.
7. `src/components/sections/profile/profile-hero.tsx` — "Member since:", "Last update:"
8. `src/components/shared/plan-card.tsx` — "Current", "Popular", "Free", "/Mo"
9. `src/components/sections/profile/profile-danger-zone.tsx` — "Danger zone", "Deleting your account..."

**What to do:**

1. Evaluate each string: structural UI label (exempt per Rule 11) vs marketing/configurable text.
2. For configurable text: add to `effective-promo-content.ts` or create new `effective-ui-labels.ts` resolver.
3. For structural UI labels: document as intentionally exempt with brief comment if needed.

**Note:** This is a large phase. PM may split into sub-phases (180.1, 180.2, etc.) if needed.

**Acceptance criteria:**

- [ ] Every hardcoded string classified as exempt or extracted
- [ ] Build passes, tests pass

---

## MEDIUM — Phase 143 — Env Var Runtime Validation

> 8 unsafe `process.env` casts: 4 `as string` + 4 `!`. Missing env vars produce cryptic runtime crashes.

**What to do:**

1. Create a shared `requireEnv(name: string): string` utility that throws with a clear message if undefined.
2. Replace all `process.env.VAR as string` and `process.env.VAR!` with `requireEnv("VAR")`.

**Acceptance criteria:**

- [ ] Zero `as string` on `process.env` in codebase
- [ ] Zero `!` on `process.env` in codebase
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

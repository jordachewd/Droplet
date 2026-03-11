# Droplet — TODO

> Prioritized, actionable development tasks. Each task max ~30 minutes.
> Governed by **Droplet-PM**. Do not add tasks without PM approval.
> Ref: `SPEC.md` for full specification. `AGENTS.md` for coding rules. `DONE.md` for completed phases.
> Implementation agent: **Codex Agent** (Senior Developer).

---

## Phase 17-C: Pre-Phase-18 Cleanup — CURRENT PRIORITY

> Remove dead code and production violations before starting new feature work.
> These are small, fast tasks that must be completed before Phase 18.

---

### 17-C.1 Delete orphaned `(account)` route group

**Files to delete:** `src/app/(account)/layout.tsx`, `src/app/(account)/loading.tsx`

**What to do:**

- Delete the entire `src/app/(account)/` directory.
- This route group has no pages — layout and loading files are dead code.
- Verify no imports reference these files.

**Acceptance criteria:**

- [ ] `src/app/(account)/` directory deleted
- [ ] No import errors — `npx tsc --noEmit` passes
- [ ] `npm run build` passes
- [ ] No navigation or routing regressions

---

### 17-C.2 Remove `console.error` from production source code

**Files:** Multiple (see list below)
**Ref:** TD-LOG-01, AGENTS.md Do/Don't table

**What to do:**

- Remove all `console.error` calls from production source code.
- Known locations (15 instances):
  - `src/app/api/webhooks/stripe/route.tsx` (4)
  - `src/app/(chat)/app/library/page.tsx` (1)
  - `src/app/api/aws/route.tsx` (2)
  - `src/lib/utils/aws/uploadFileToAWS.tsx` (1)
  - `src/app/api/download/route.tsx` (1)
  - `src/app/api/webhooks/clerk/route.tsx` (1)
  - `src/components/chat/audio-player.tsx` (2)
  - `src/components/chat/image-holder.tsx` (1)
  - `src/components/chat/sidebar/chat-sidebar.tsx` (1)
  - `src/components/chat/chat-wrapper.tsx` (1)
- Replace with: `handleError()` utility call for server-side errors, silent catch for client-side errors, or remove entirely if the catch block already handles the error.
- Do NOT swallow errors silently in API routes — ensure the response still returns proper status codes.
- Do NOT leak error details to clients.

**Acceptance criteria:**

- [ ] Zero `console.error` calls in `src/` directory (verify via grep)
- [ ] Errors still handled gracefully (proper HTTP status codes, user-facing generic messages)
- [ ] `npx tsc --noEmit` passes
- [ ] `npm run test` passes
- [ ] `npm run build` passes

---

## Phase 18: Public Pages & Navigation — NEXT PRIORITY

> Create the 5 missing public pages and complete header/footer navigation.
> The main drive is to not just have another chatbot — distinctive product narrative.
> Ref: TD-UI-08, TD-UI-12, TD-UI-13

---

### 18.1 Create `/about` page

**Files (new):** `src/app/(public)/about/page.tsx`
**Ref:** TD-UI-08

**What to do:**

- Create server component with stacked sections explaining how Droplet works.
- Sections: (1) What is Droplet — persona-driven AI assistant, (2) How it works — choose persona, start chatting, (3) Personas overview — the 9 personas and their categories, (4) Media generation — images, audio, video capabilities, (5) Plans overview — link to `/plans`.
- Each section: heading + descriptive text + image placeholder (CSS placeholder or public image).
- Reuse `PageWrapper` and `PageHead` layout components if they exist.

**Acceptance criteria:**

- [ ] `/about` renders with 4-5 stacked content sections
- [ ] Sections explain personas, features, and media capabilities
- [ ] Page is public (no auth required)
- [ ] Responsive layout
- [ ] `npx tsc --noEmit` passes
- [ ] `npm run build` passes

---

### 18.2 Create `/faqs` page

**Files (new):** `src/app/(public)/faqs/page.tsx`
**Ref:** TD-UI-08

**What to do:**

- Create page that renders the FAQ accordion.
- Reuse existing `FaqsSection` component (currently used on the plans page).
- Wrap in appropriate page layout.

**Acceptance criteria:**

- [ ] `/faqs` renders the FAQ accordion
- [ ] Reuses existing `FaqsSection` component
- [ ] Page is public
- [ ] `npx tsc --noEmit` passes
- [ ] `npm run build` passes

---

### 18.3 Create `/privacy` page

**Files (new):** `src/app/(public)/privacy/page.tsx`
**Ref:** TD-UI-08

**What to do:**

- Create page with real Privacy & Cookie Policy content.
- Content adapted for Droplet's context: AI chatbot SaaS collecting user data, using OpenAI API, Clerk auth, Stripe payments, AWS S3 storage.
- Cover: data collection, usage, storage, third-party sharing (OpenAI, Clerk, Stripe, AWS), cookies, user rights, contact info.
- Use structured sections with headings.
- Add disclaimer: "This policy is provided for informational purposes. Legal review recommended before production publication."

**Acceptance criteria:**

- [ ] `/privacy` renders real privacy policy content
- [ ] Content covers data collection, usage, storage, third-party sharing, cookies, user rights
- [ ] Adapted for Droplet context (OpenAI, Clerk, Stripe, S3)
- [ ] Includes legal review disclaimer
- [ ] Page is public
- [ ] `npx tsc --noEmit` passes

---

### 18.4 Create `/cookies` page

**Files (new):** `src/app/(public)/cookies/page.tsx`
**Ref:** TD-UI-08

**What to do:**

- Create page with real Cookie Policy content.
- Document cookies used: Clerk session cookies, theme preference (`cellesseon-theme-mode` legacy key), sidebar collapsed preference (`cellesseon-sidebar-collapsed` legacy key).
- Explain cookie categories: essential (auth), functional (theme/sidebar), optional (analytics if any).
- Add same legal review disclaimer as privacy page.

**Acceptance criteria:**

- [ ] `/cookies` renders real cookie policy content
- [ ] Documents actual cookies used by Droplet
- [ ] Includes legal review disclaimer
- [ ] Page is public
- [ ] `npx tsc --noEmit` passes

---

### 18.5 Create `/terms` page

**Files (new):** `src/app/(public)/terms/page.tsx`
**Ref:** TD-UI-08

**What to do:**

- Create page with real Terms & Conditions content.
- Cover: service description, user responsibilities, AI-generated content disclaimer, payment terms ($19 Pro / $39 Premium), refund policy, account termination, limitation of liability, governing law.
- Adapted for Droplet SaaS context.
- Add legal review disclaimer.

**Acceptance criteria:**

- [ ] `/terms` renders real terms & conditions content
- [ ] Covers standard SaaS legal topics
- [ ] AI-generated content disclaimer included
- [ ] Payment terms match approved pricing ($19/$39)
- [ ] Includes legal review disclaimer
- [ ] Page is public
- [ ] `npx tsc --noEmit` passes

---

### 18.6 Enhance homepage with product sections

**Files:** `src/components/sections/landing-page.tsx` or `src/app/(public)/page.tsx`
**Ref:** TD-UI-07

**What to do:**

- After the existing Hero section, add 3-4 additional sections:
  - **Feature showcase**: Key capabilities — persona-driven chat, media generation, streaming responses.
  - **How it works**: 3-step visual — choose persona → start chatting → get results.
  - **Social proof / CTA**: Strong call-to-action to sign up or explore plans.
- Each section: compelling heading, descriptive text, and visual element.
- Maintain existing design system (Tailwind, fonts, theme tokens).

**Acceptance criteria:**

- [ ] Homepage has 3-4 sections beyond the Hero
- [ ] Sections include feature showcase, how-it-works, and CTA
- [ ] Design consistent with existing theme/system
- [ ] `npx tsc --noEmit` passes
- [ ] `npm run build` passes

---

### 18.7 Update header navigation for public pages

**Files:** `src/components/layout/header.tsx`
**Ref:** TD-UI-13, formerly Phase 17.15

**What to do:**

- Add `/about` link to navigation.
- Add `/faqs` link to navigation.
- Verify `/plans` link exists (should already be there from Phase 17).
- Ensure all navigation links match the target route map.

**Acceptance criteria:**

- [ ] Header nav includes `/about` link
- [ ] Header nav includes `/faqs` link
- [ ] Header nav includes `/plans` link
- [ ] `npx tsc --noEmit` passes
- [ ] All E2E tests pass (`npm run test:e2e`)

---

### 18.8 Update footer links for legal pages

**Files:** `src/components/layout/footer.tsx`
**Ref:** TD-UI-12, formerly Phase 17.16

**What to do:**

- Convert "Privacy & Cookie Policy" `<span>` to `<Link>` pointing to `/privacy`.
- Convert "Terms & Conditions" `<span>` to `<Link>` pointing to `/terms`.
- Import `Link` from `next/link`.

**Acceptance criteria:**

- [ ] Footer "Privacy & Cookie Policy" is a working `<Link>` to `/privacy`
- [ ] Footer "Terms & Conditions" is a working `<Link>` to `/terms`
- [ ] `npx tsc --noEmit` passes
- [ ] All E2E tests pass (`npm run test:e2e`)

---

### 18.9 Run full validation gate

**What to do:**

- Run the full 6-step validation workflow.
- Fix any failures.

**Acceptance criteria:**

- [ ] `npx prettier . --write` — no errors
- [ ] `npm run lint` — no errors
- [ ] `npx tsc --noEmit` — no errors
- [ ] `npm run test` — all tests pass
- [ ] `npm run test:e2e` — all tests pass
- [ ] `npm run build` — no errors

---

## Phase 19: Streaming Implementation

> Add streaming responses for real-time chat UX.
> Ref: TD-AI-01

---

### 19.1 Create streaming API route

**Files:** `src/app/api/openai/route.tsx` (modify) or `src/app/api/openai/stream/route.tsx` (new)
**Ref:** TD-AI-01

**What to do:**

- Implement streaming using OpenAI SDK's `openai.chat.completions.stream(...)`.
- Return a `ReadableStream` or use the Next.js streaming response pattern.
- Include all existing auth, rate limiting, plan expiry, and entitlement checks.
- Emit usage event after stream completes.
- Handle tool calls (image/audio generation) after stream completion.

**Acceptance criteria:**

- [ ] Streaming endpoint returns partial responses via SSE/ReadableStream
- [ ] All auth and limit checks remain in place
- [ ] Tool calls dispatched after stream completion
- [ ] Usage event emitted after completion
- [ ] Error handling works for streaming failures
- [ ] `npx tsc --noEmit` passes

---

### 19.2 Update chat UI to render streamed responses

**Files:** `src/components/chat/chat-wrapper.tsx`, `src/components/chat/chat-body.tsx`
**Ref:** TD-AI-01

**What to do:**

- Update `ChatWrapper` to consume streaming responses using `ReadableStream` reader or EventSource.
- Render partial text incrementally in `ChatBody` as chunks arrive.
- Replace "Thinking..." indicator with actual incremental text display.
- Handle stream completion, errors, and tool-call follow-ups.
- Maintain existing markdown rendering, code blocks, etc.

**Acceptance criteria:**

- [ ] Chat renders text incrementally as stream chunks arrive
- [ ] "Thinking..." replaced with real progressive rendering
- [ ] Message finalization works correctly after stream completion
- [ ] Error states handled gracefully
- [ ] Existing features (markdown, code blocks) still work
- [ ] `npx tsc --noEmit` passes

---

## Phase 20: Error Handling & File Cleanup

---

### 20.1 Refactor handleError to preserve stack traces

**File:** `src/lib/utils/handleError.tsx`
**Ref:** TD-API-06

**What to do:**

- Use `new Error(message, { cause: error })` pattern to preserve original stack trace.
- Keep the `source` annotation for debugging context.

**Acceptance criteria:**

- [ ] Original error preserved as `cause` on thrown error
- [ ] Source string still in error message
- [ ] Stack trace accessible via `error.cause`
- [ ] `npx tsc --noEmit` passes
- [ ] All existing tests pass

---

### 20.2 Add S3 cleanup on user deletion in Clerk webhook

**File:** `src/app/api/webhooks/clerk/route.tsx`
**Ref:** TD-FILE-01

**What to do:**

- In `user.deleted` handler, after MongoDB deletion, list and delete all S3 objects under `{clerkId}/` prefix.
- Use batch deletion (`ListObjectsV2` + `DeleteObjects`).
- Log errors but do not fail the webhook response.

**Acceptance criteria:**

- [ ] S3 objects cleaned up on user deletion
- [ ] Uses batch deletion
- [ ] Errors logged but webhook succeeds
- [ ] `npx tsc --noEmit` passes

---

### 20.3 Delete orphaned Task documents on user deletion

**File:** `src/app/api/webhooks/clerk/route.tsx`
**Ref:** TD-DB-15

**What to do:**

- In `user.deleted` handler, after deleting the User document and before S3 cleanup, delete all Task documents belonging to the deleted user.
- Use `Task.deleteMany({ userId: clerkId })`.
- Log errors but do not fail the webhook response.

**Acceptance criteria:**

- [ ] All Task documents for deleted user are removed
- [ ] Deletion happens before S3 cleanup
- [ ] Errors logged but webhook succeeds
- [ ] `npx tsc --noEmit` passes

---

### 20.4 Add S3 cleanup on task deletion

**File:** `src/lib/actions/task.actions.tsx`
**Ref:** TD-FILE-01

**What to do:**

- In `deleteTask`, scan task messages for S3 image URLs before deletion.
- Delete matching S3 objects via `deleteFileFromAWS`.
- Wrap in try/catch — log errors but do not fail deletion.

**Acceptance criteria:**

- [ ] Task messages scanned for S3 URLs before deletion
- [ ] S3 objects deleted for matching URLs
- [ ] Task deletion succeeds even if S3 cleanup fails
- [ ] `npx tsc --noEmit` passes

---

### 20.5 Refactor chat input to upload via /api/upload

**File:** `src/components/chat/chat-input.tsx`
**Ref:** TD-FILE-02

**What to do:**

- Upload files via `/api/upload` FormData before building message content.
- Replace inline base64 URLs with S3 URLs in message content.
- Handle upload failure gracefully.

**Acceptance criteria:**

- [ ] All file attachments go through `/api/upload`
- [ ] No base64 in message content sent to `/api/openai`
- [ ] Upload failures prevent message send with user feedback
- [ ] `npx tsc --noEmit` passes

---

### 20.6 Audit or remove `deleteAllTransactions` action

**Files:** `src/lib/actions/transaction.action.tsx`
**Ref:** TD-ACT-01

**What to do:**

- Evaluate whether `deleteAllTransactions` is needed. If yes: add admin role check, `AdminAuditLog` entry, require confirmation parameter. If no: delete the function and any references.
- No unaudited bulk deletion path may exist.

**Acceptance criteria:**

- [ ] Action either removed or protected with admin role check + audit log
- [ ] No unaudited bulk deletion path exists
- [ ] `npx tsc --noEmit` passes

---

## Phase 21: Prompt Improvement

> Improve and adapt prompts per persona and per model.
> Ref: TD-AI-09

---

### 21.1 Create prompt versioning and management system

**Files (new):** `src/constants/persona-prompts.ts`
**Ref:** TD-AI-09

**What to do:**

- Create a prompt configuration file that defines system prompts per persona, per model family.
- Structure: `{ [personaId]: { [modelFamily]: { systemPrompt, temperature, maxTokens } } }`.
- Current `systemPrompt` field on persona objects becomes the default/fallback.
- Add prompt version identifier.

**Acceptance criteria:**

- [ ] Prompt configuration file created
- [ ] Prompts organized by persona and model family
- [ ] Version identifier present
- [ ] `npx tsc --noEmit` passes

---

### 21.2 Improve persona-specific prompts

**Files:** `src/constants/assistant-personas.tsx` and/or the new prompt config
**Ref:** TD-AI-09

**What to do:**

- Review and improve each persona's system prompt for:
  - Distinct personality and tone
  - Clear domain expertise boundaries
  - Safety constraints (especially companion personas: boyfriend, girlfriend, best-friend)
  - Answer formatting preferences
  - Model-aware instructions (simpler prompts for cheaper models, richer for premium)

**Acceptance criteria:**

- [ ] All 9 personas have improved, distinct prompts
- [ ] Safety constraints defined for companion personas
- [ ] Prompts vary by model tier where appropriate
- [ ] `npx tsc --noEmit` passes

---

## Phase 22: Testing & Hardening

---

### 22.1 Add test coverage configuration

**File:** `vitest.config.mts`, `package.json`

**What to do:**

- Add `coverage` config with `v8` provider and 70/60/70/70 thresholds.
- Add `test:coverage` script.

**Acceptance criteria:**

- [ ] Coverage config in Vitest config
- [ ] `npm run test:coverage` works
- [ ] All existing tests pass

---

### 22.2 Add unit tests for updated entitlements

**File (new):** `tests/unit/resolve-entitlements.test.ts`

**What to do:**

- Test all plans return all 9 persona IDs.
- Test Lite has audio generation enabled.
- Test fallback behavior for `resolvePersonaForPlan`.

**Acceptance criteria:**

- [ ] Tests verify all plans allow all 9 personas
- [ ] Tests verify Lite audio generation enabled
- [ ] All tests pass

---

### 22.3 Add unit tests for chat-body stop-state rendering

**File (new):** `tests/unit/chat-body.test.tsx`

**What to do:**

- Test `ChatBodyEndNotice` renders correct stop reason titles for each reason code.
- Test action links point to correct routes (`/app/new`, `/app/plans`, `mailto:`).
- Test amber visual styling applied for ended conversations.
- Test `billing_state_invalid` stop reason rendering.

**Acceptance criteria:**

- [ ] Tests cover all stop reason titles
- [ ] Tests verify action link routes
- [ ] Tests verify visual distinction
- [ ] All tests pass

---

### 22.4 Implement retry/backoff for OpenAI failures

**Files:** `src/lib/utils/openai/generateResponse.tsx`
**Ref:** TD-AI-06

**What to do:**

- Add exponential backoff for transient OpenAI errors (429, 500, 502, 503).
- Max 3 retries with increasing delay.
- Log retries server-side (NOT `console.error`).

**Acceptance criteria:**

- [ ] Transient errors trigger retry with backoff
- [ ] Max 3 retries
- [ ] Non-retryable errors fail immediately
- [ ] `npx tsc --noEmit` passes

---

## Phase 23: Resilience & Deferred Items

> Lower priority. Not blocking v1 launch but important for production hardening.

- [ ] **23.1** Replace in-memory rate limiter with persistent store — Ref: TD-API-01
- [ ] **23.2** Implement Stripe subscription mode (auto-renewal) — Ref: TD-PLAN-01
- [ ] **23.3** Add video generation support for Premium — Ref: TD-AI-08
- [ ] **23.4** Verify all admin server actions emit audit log entries

---

> **Completed phases** are archived in [`DONE.md`](DONE.md).
> Phases 1–9, 13–17 are complete. Phase 10–12 superseded (see DONE.md for mapping).

# Droplet — TODO

> Prioritized, actionable development tasks. Each task max ~30 minutes.
> Governed by **Droplet-PM**. Do not add tasks without PM approval.
> Ref: `SPEC.md` for full specification. `AGENTS.md` for coding rules. `DONE.md` for completed phases.
> Implementation agent: **Droplet-Engineer** (Senior Developer).
>
> **STATUS: Phases 1–25.7 + 27.1–27.4 + 27.6–27.10 + 28.1 + 28.2-fix + 28.3-code + 28.3-verify + 28.4 + 28.6 + 28.7 + 30.1 + 30.2 + 30.3 + 31.1 + 31.2 + 31.3 + 31.2-fix + 32.1 + 32.2 + 32.3 + 32.6 + 33.1–33.7 + 35.1 + 37.1 + 38.1–38.7 + 36.1–36.2 complete.**
> **PM deep audit #16 (2026-03-16): Phase 38 + 36 verified DONE (Architect code audit + PM approval). All 9 tasks confirmed in code. No regressions. 334 unit tests passing. 176 E2E passing. Build passing.**
> **OWNER INSTRUCTIONS (latest): Admin panel must be fully operational with full control over each setting's purpose. Admin forms must use proper controls. Admin design consistency maintained (36.1 baseline). Top Personas delivered (36.2).**
> **NO CRITICAL BUGS REMAINING.**
> **Priority order: 33.8 (trial E2E) → 30.4 (admin persona controls) → 27.5 (admin settings propagation) → 32.4 → 32.5 → 31.4 → 30.5 → 34.x → 29.1 → 29.2 → Phase 26.**
> **All Phase 26+ deferred work is ON HOLD until Milestone 13 Block D + Milestone 14 are PM-approved complete.**

---

## Phase 38: UI Polish, Bug Fixes & Owner UI Restructure — COMPLETE

> PM audit #16: All 7 tasks (38.1–38.7) verified DONE by Architect code audit + PM approval. Archived in DONE.md.

---

## Phase 36: Admin Design Consistency & Enhancement — COMPLETE

> PM audit #16: Both tasks (36.1–36.2) verified DONE by Architect code audit + PM approval. Archived in DONE.md.

---

## Phase 33: Persona Trial Access System — MOSTLY COMPLETE

> **33.1–33.7 DONE** — Core trial system implemented and verified. Archived in DONE.md.
> Remaining: **33.8** (trial E2E tests).

---

### 33.8 MEDIUM — E2E tests for persona trial access flow

**Files:** `tests/e2e/` (new or updated specs)

**What to do:**

1. Test: Lite user can select a trial persona and start conversation.
2. Test: Trial conversation stops at 5 prompts with upgrade CTA.
3. Test: Full-access persona conversation uses plan limits (10 prompts).
4. Test: Persona picker shows "Trial" badge for limited personas.

**Acceptance criteria:**

- [ ] E2E covers trial persona selection + limit enforcement
- [ ] E2E covers upgrade CTA on trial limit
- [ ] `npm run test:e2e` passes

---

## Phase 35: ChatHeader Persona Selector — COMPLETE

> **35.1 DONE** (persona dropdown selector — archived in DONE.md).
> **35.2** (E2E tests) — merged into Milestone 13 Block D test coverage.

---

## Phase 28: Media Generation Fixes & Limit Enforcement — COMPLETE

> All tasks completed. Archived in DONE.md.

---

## Phase 30: Persona Policy Implementation (remaining)

> 30.1 DONE (Interviewer persona), 30.2 DONE (per-plan persona gating), 30.3 DONE (persona picker UI).
> Remaining: 30.4 (admin persona controls), 30.5 (persona hero images).
> **30.4 elevated to MEDIUM-HIGH** — Owner requires admin operational completeness (Milestone 14).

---

### 30.4 MEDIUM-HIGH — Add admin persona access control per plan

**Files:** `src/app/(admin)/admin/settings/page.tsx`, `src/lib/utils/resolve-entitlements.tsx`, `src/lib/database/models/app-setting.model.tsx`
**Ref:** Owner instruction: admin must be able to enable/disable persona access per plan
**Depends on:** Phase 33 complete (trial access system must be stable first)

**What to do:**

1. Add admin settings section for "Persona Access" with checkboxes per plan per persona.
2. Save as AppSetting (key: `persona_access_lite`, `persona_access_pro`, `persona_access_premium`).
3. `resolveEntitlements()` reads AppSetting first, falls back to hardcoded defaults.
4. Admin audit trail for persona access changes.

**Acceptance criteria:**

- [ ] Admin can toggle persona access per plan in settings
- [ ] Changes take effect on next entitlement check
- [ ] Falls back to defaults when no AppSetting exists
- [ ] Audit log entry created
- [ ] `npx tsc --noEmit` passes
- [ ] All tests pass

---

### 30.5 MEDIUM — Generate persona hero images

**Ref:** Owner instruction: each persona must have a representative character/image as hero
**Depends on:** 30.1 complete (Interviewer added — DONE)

**What to do:**

1. Generate a representative character image for each of the 10 personas.
2. Store images in `public/personas/` as optimized WebP/PNG.
3. Add `heroImage` field to persona definition in `assistant-personas.tsx`.
4. Display hero images on persona cards, persona picker, and `/personas` public page.

**Acceptance criteria:**

- [ ] 10 persona hero images exist in `public/personas/`
- [ ] Each persona definition has `heroImage` path
- [ ] Hero images visible on persona cards and public personas page
- [ ] Images are optimized (< 200KB each)
- [ ] `npx tsc --noEmit` passes
- [ ] All tests pass

---

## Phase 31: Layout & Navigation Updates (remaining)

> 31.1 DONE (ChatHeader in layout), 31.2 DONE (sidebar toggle to header), 31.3 DONE (Plans/Profile from sidebar).
> Remaining: 31.4 (E2E tests).

---

### 31.4 LOW — Update E2E tests for layout changes

**Files:** `tests/e2e/chat-app-shell.spec.ts`, related E2E specs
**Ref:** Phase 31.1–31.3

**What to do:**

1. Update sidebar navigation assertions (fewer links).
2. Add assertions for ChatHeader presence on non-chat pages.
3. Verify sidebar toggle works from its new position in header.

**Acceptance criteria:**

- [ ] E2E tests reflect new layout structure
- [ ] No false positives from old layout assertions
- [ ] `npm run test:e2e` passes

---

## Phase 27: UX & Architecture Completion (remaining)

> 27.1–27.4 + 27.6–27.10 DONE. Remaining: 27.5 (settings propagation).
> **27.5 elevated to MEDIUM-HIGH** — Owner requires admin operational completeness (Milestone 14).
> **ON HOLD until 33.8 + 30.4 are PM-approved complete.**

---

### 27.5 MEDIUM-HIGH — Admin settings — propagate pricing & limits to plan cards

**Files:** `src/constants/plans.tsx`, `src/lib/utils/resolve-entitlements.tsx`, `src/lib/utils/check-usage-limit.ts`, `src/lib/utils/admin-queries.ts`, plan card components
**Ref:** TD-ADMIN-02

**What to do:**

1. Create a server-side utility (e.g., `getEffectivePlanConfig()`) that reads `AppSetting` values for pricing and limits, falling back to hardcoded `PLAN_LIMITS` defaults.
2. Wire plan card components to use effective config instead of static constants.
3. Wire entitlement resolver and usage limit checks to use effective config.
4. Ensure admin changes take effect on next page load.
5. Add cache-control / `revalidatePath` so changes propagate without stale data.

**Acceptance criteria:**

- [ ] Plan cards show prices from AppSetting (or defaults)
- [ ] Entitlement resolver uses limits from AppSetting (or defaults)
- [ ] Admin saves new price → plan cards reflect on next load
- [ ] Fallback to hardcoded defaults when AppSetting is empty
- [ ] `npx tsc --noEmit` passes
- [ ] All tests pass

---

## Phase 34: Video Generation — ON HOLD (gated)

> **GATED:** Requires Sora API verification + S3 cost ceiling approval before implementation.
> Depends on: Phase 28 audio verification complete, Phase 33 entitlement system stable.
> Owner requests video generation to work — this is the implementation phase.

---

### 34.1 DECISION GATE — Verify Sora API availability and pricing

**What to do:**

1. Live-test `sora-2` and `sora-2-pro` model IDs against OpenAI API.
2. Measure video generation latency and output size.
3. Calculate S3 storage cost for video files.
4. Present cost ceiling analysis to PM/Owner for approval.

**Acceptance criteria:**

- [ ] Sora API availability confirmed or alternative chosen
- [ ] Cost analysis presented and approved

---

### 34.2 HIGH — Implement generateVideo utility

**Files:** `src/lib/utils/openai/generateVideo.tsx` (new)

**What to do:**

1. Create `generateVideo()` following same pattern as `generateImage()`/`generateAudio()`.
2. Use `resolveModelPolicy()` for model selection.
3. Upload video file to S3, return URL.
4. Handle video-specific constraints (longer generation time, larger files).

---

### 34.3 HIGH — Add video tool definition and API route integration

**Files:** `src/constants/openai.tsx`, `src/app/api/openai/route.tsx`, `src/lib/utils/openai/generateResponse.tsx`

**What to do:**

1. Add video tool definition in OpenAI constants.
2. Wire video generation into `buildOpenAIResponsePayload` tool call handler.
3. Wire video counter tracking in API route.

---

### 34.4 MEDIUM — Video player component for chat messages

**Files:** `src/components/chat/` (new component)

**What to do:**

1. Create inline video player component for chat message rendering.
2. Support basic controls: play, pause, volume, fullscreen.

---

## Phase 29: App-Wide Modernization — ON HOLD

> **ON HOLD until Milestone 13 Block D + Milestone 14 are PM-approved complete.**
> Owner-approved modernization items. Dependencies already installed.

---

### 29.1 Implement Zod schema validation across the app

**Ref:** Owner instruction (2026-03-16)

**What to do:**

1. Read available Zod Skills and MCPs for best practices and updated documentation.
2. Add Zod schemas for all API route request bodies (`/api/openai`, `/api/upload`, `/api/download`, `/api/aws`).
3. Add Zod schemas for server action inputs (user actions, task actions, transaction actions, admin actions).
4. Add Zod schemas for webhook payloads (Clerk, Stripe) as additional validation after signature verification.
5. Replace manual `typeof` / truthiness checks with Zod `.safeParse()` at system boundaries.
6. Use `z.infer<>` for TypeScript type derivation where it reduces duplication.
7. Do NOT add Zod to internal utility functions that receive already-validated data.

**Acceptance criteria:**

- [ ] All API route request bodies validated with Zod schemas
- [ ] All server action inputs validated with Zod schemas
- [ ] Webhook payloads have Zod validation after signature verification
- [ ] `z.infer<>` used where it reduces type duplication
- [ ] No Zod on internal utility functions (only at system boundaries)
- [ ] `npx tsc --noEmit` passes
- [ ] All tests pass

---

### 29.2 Implement Zustand for client-side state management

**Ref:** Owner instruction (2026-03-16)

**What to do:**

1. Read available Zustand Skills and Context7 MCP for documentation and best practices.
2. Create Zustand stores for: chat state (current conversation, messages, loading), UI state (sidebar, theme), user preferences.
3. Replace prop-drilling and scattered `useState` with Zustand stores where appropriate.
4. Keep Server Component data flow unchanged — Zustand is for CLIENT components only.
5. Do NOT replace simple local state (single-component `useState`) with Zustand — only shared state.

**Acceptance criteria:**

- [ ] Zustand stores created for shared client state (chat, UI, preferences)
- [ ] Prop-drilling reduced in chat components
- [ ] Server Component data flow unchanged
- [ ] Simple local state left as `useState`
- [ ] `npx tsc --noEmit` passes
- [ ] All tests pass

---

## Phase 26: Deferred Features — ON HOLD

> **ON HOLD until Milestone 13 Block D + Milestone 14 + Phases 34 + 29 are PM-approved complete.**
> Depends on: All preceding phases complete.

---

### 26.1 Persona-aware media generation prompts

**Ref:** TD-AI-09 (remaining gap)

### 26.2 Implement Stripe subscription mode (auto-renewal)

**Ref:** TD-PLAN-01

---

> **Completed phases** are archived in [`DONE.md`](DONE.md).
> HF-1 through HF-9.2 complete. Phases 1–25.7 + 27.1–27.4 + 27.6–27.10 + 28.1 + 28.2-fix + 28.3-code + 30.1 + 30.2 + 30.3 + 35.1 + 37.1 + 38.1–38.7 + 36.1–36.2 complete.
> Phase 10–12 superseded (see DONE.md for mapping).

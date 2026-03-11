# Droplet — DONE (Completed Phases)

> Archive of completed development phases. Moved from `TODO.md` to keep it focused on actionable work.
> Governed by **Droplet-PM**.

---

## Phase 15: Entitlement Engine & Usage Enforcement — COMPLETED

- [x] **15.1** Build daily conversation limit check utility (`checkDailyConversationLimit` in `check-daily-conversations.ts`)
- [x] **15.2** Add prompt count tracking to conversation flow (`promptCount` init/increment via `$inc` in `task.actions.tsx`)
- [x] **15.3** Integrate daily conversation limit into `/api/openai` (new conversations only, unlimited plans bypass)
- [x] **15.4** Add conversation stop handling to chat UI (stop reason messages, action links, input disabled for ended conversations)
- [x] **15.5** Add message count / document size guard for Task (`estimatedBytes` tracking, 12MB threshold, pre/post-response checks)

Resolved: TD-PLAN-07, TD-PLAN-08, TD-DB-05. 46 test suites, 188 tests passing, 58 E2E tests passing. Lint, typecheck, build all green.

**Remaining gap**: UsageEvent emission not implemented (TD-AI-03) — elevated to Phase 16.

---

## Phase 14: Data Model Foundation — COMPLETED

- [x] **14.1** Add conversation lifecycle fields to Task model (promptCount, mediaCount, estimatedBytes, status, endedAt, endedReason, endAction)
- [x] **14.2** Create UsageEvent model with all SPEC.md 6.4 fields and indexes
- [x] **14.3** Create UsageEvent type definition (UsageEventData, CreateUsageEventParams)
- [x] **14.4** Create AppSetting model with key (unique), value (Mixed), category (indexed)
- [x] **14.5** Create PublicPage model with slug (unique), content, sortOrder, isPublished
- [x] **14.6** Create AdminAuditLog model with adminId, action, targetType, targetId (all indexed)

All 6 tasks verified. 41 test suites, 184 tests passing. Lint, typecheck, build all green.

---

## Phase 13: Product Rule Reconciliation — COMPLETED

- [x] **13.1** Remove Lite plan 3-day expiry — Lite is now "Free forever" with far-future expiry
- [x] **13.2** Update plan prices to $19 (Pro) / $39 (Premium)
- [x] **13.3** Allow all 9 personas in all plans (removed Lite persona restrictions)
- [x] **13.4** Update Lite plan inclusions and limits display
- [x] **13.5** Update Pro plan inclusions display
- [x] **13.6** Update Premium plan inclusions display (3 premium media features)
- [x] **13.7** Update PLAN_LIMITS constant for all tiers (conversationsPerDay, promptsPerConversation, video)
- [x] **13.8** Update FAQ content — remove trial references, add support email, rewrite free plan FAQ

---

## Phase 9: Production UX Polish — COMPLETED

- [x] **9.1** Add conversation delete button to chat sidebar
- [x] **9.2** Add conversation delete button to library page
- [x] **9.3** Add loading skeleton for chat layout
- [x] **9.4** Add loading skeleton for account layout

---

## Phase 8: Database Optimization — COMPLETED

- [x] **8.1** `.lean()` and `.select()` on getUserById
- [x] **8.2** `.lean()` on getAllTransactions
- [x] **8.3** Optimize task-queries with `.lean()` and `.select()`
- [x] **8.4** Index on Task.personaId
- [x] **8.5** Mongoose connection pooling review

---

## Phase 7: Persona Rename — COMPLETED

- [x] **7.1–7.26** Full persona rename from "assistant role" to "persona" across all files

---

## Phase 6: Testing — COMPLETED

- [x] **6.1–6.5** generateResponse, generateTitle, deleteTask, getUserById tests

---

## Phase 5: Error Handling — COMPLETED

- [x] **5.1–5.2** OpenAI error classification, chat error boundary

---

## Phase 4: Plan Enforcement (Usage Limits) — COMPLETED

- [x] **4.1–4.6** Usage tracking fields, plan limits, usage check, enforcement, reset

---

## Phase 3: Core Feature Gaps — COMPLETED

- [x] **3.1–3.5** deleteTask, mapDateToLabel, generateImage S3, error.tsx, .env example

---

## Phase 2: Security Fixes (Ownership) — COMPLETED

- [x] **2.1–2.5** Ownership enforcement, console.log removal

---

## Phase 1: Security & Data Integrity — COMPLETED

- [x] **1.1–1.9** strict:true fixes, index additions, ownership validation, createUser non-export

---

## Phase 16: AI Model Policy & Usage Logging — COMPLETED

- [x] **16.1** Create AI model policy resolver (`ai-model-policy.ts` with `resolveModelForPlan`, `MODEL_POLICY`, `estimateModelCostCents`)
- [x] **16.2** Wire model policy into `generateResponse` (plan-aware chat model selection)
- [x] **16.3** Wire model policy into `generateTitle`, `generateImage`, `generateAudio` (all plan-aware)
- [x] **16.4** Emit UsageEvent for every AI request in `/api/openai` (fire-and-forget, blocked events with reason, `usage-event-utils.ts`)
- [x] **16.5** Add unit tests for AI model policy resolver (`ai-model-policy.test.ts`)

Resolved: TD-AI-07 (hardcoded models), TD-AI-03 (no usage logging). 48 test suites, 204 tests passing, 65 E2E tests passing. All gates green.

---

## Phase 17: Route Restructure & Admin Control Plane — COMPLETED

- [x] **17.1** Create `/admin` route group and layout (admin sidebar, dashboard with stats, `requireAdminPageAccess()`)
- [x] **17.2** Create `/admin/users` list page (search, role filter, plan display)
- [x] **17.3** Create `/admin/users/[userId]` detail page (suspend, reinstate, remove actions, audit logged)
- [x] **17.4** Create `/admin/transactions` list page (with user join, optimized queries)
- [x] **17.5** Create `/admin/transactions/[transactionId]` detail page
- [x] **17.6** Create `/admin/usage` page (by user, model, type, day, provider, cost estimates)
- [x] **17.7** Create `/admin/settings` page (AI models, pricing, limits, theme — read/write via AppSetting)
- [x] **17.8** Create `/admin/website` management page (CRUD for public pages, publish/unpublish, sort)
- [x] **17.9** Create `/admin/website/[pageId]` editor page (Tiptap rich-text editor integrated)
- [x] **17.10** Move `/profile` to `/app/profile` (with plan info, purchase history, upgrade link)
- [x] **17.11** Move `/plans` to `/app/plans` and rename `/pricing` to `/plans` (public)
- [x] **17.12** Update proxy for new route structure (now: `/app(.*)`, `/admin(.*)` only)
- [x] **17.13** Update Stripe checkout redirect URLs (`success_url` → `/app/profile`, `cancel_url` → `/app/plans`)
- [x] **17.14** Remove old `/dashboard` route
- [x] **17.17** Update E2E tests for new route structure

**Deferred to Phase 18:** 17.15 (header nav for `/about`, `/faqs`) and 17.16 (footer links for `/privacy`, `/terms`) — blocked by public page routes not existing yet.

Resolved: TD-AUTH-01, TD-AUTH-02, TD-UI-09, TD-UI-10, TD-BILL-01. Admin infrastructure: `admin-auth.ts`, `admin-audit.ts`, `admin-queries.ts`, `admin.actions.tsx`, `admin-sidebar.tsx`, `admin-layout-shell.tsx`, `tiptap-editor.tsx`. Tiptap packages installed. 48 test suites, 204 tests, 65 E2E tests passing. All gates green.

---

## Phase 17-C: Pre-Phase-18 Cleanup — COMPLETED

- [x] **17-C.1** Delete orphaned `(account)` route group (`src/app/(account)/` directory removed)
- [x] **17-C.2** Remove all `console.error` calls from production source code (15 instances across webhooks, API routes, chat components)

Resolved: TD-LOG-01. Zero `console.error` / `console.log` / `console.warn` in `src/`. 48 test suites, 205 tests passing, 77 E2E tests passing. All gates green.

---

## Phase 18: Public Pages & Navigation — COMPLETED

- [x] **18.1** Create `/about` page (5 content sections: persona-led guidance, workflow, nine personas, media, plans & limits)
- [x] **18.2** Create `/faqs` page (FaqsSection reuse + "Still need help?" CTA)
- [x] **18.3** Create `/privacy` page (6-section privacy policy with legal review disclaimer)
- [x] **18.4** Create `/cookies` page (3 cookie categories + managing preferences guidance)
- [x] **18.5** Create `/terms` page (6 sections: service, accounts, AI disclaimer, payment, refunds, liability)
- [x] **18.6** Enhance homepage with product sections (7 sections: Hero, Features, Workflow, Persona Spotlight, CTA, Plans, FAQs)
- [x] **18.7** Update header navigation for public pages (`/about`, `/personas`, `/plans`, `/faqs` links)
- [x] **18.8** Update footer links for legal pages (`<Link>` to `/privacy` and `/terms`)
- [x] **18.9** Run full validation gate (all 6 steps pass)

Resolved: TD-UI-08 (5 public pages), TD-UI-07 (homepage sections), TD-UI-12 (footer links), TD-UI-13 (header nav). Legal pages include disclaimer for pre-production legal review. 48 test suites, 205 tests passing, 77 E2E tests passing. All gates green.

---

## Phase 10–12: (Superseded)

Old Phase 10-12 tasks have been incorporated into the new phase structure:

- 10.1 → 20.1, 10.2 → 20.2, 10.3 → 20.3, 10.4 → 20.4
- 11.1 → 22.1, 11.2 → 22.2
- 12.x → 23.x (deferred items)

# Droplet — DONE (Completed Phases)

> Archive of completed development phases. Moved from `TODO.md` to keep it focused on actionable work.
> Governed by **Droplet-PM**.

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

## Phase 10–12: (Superseded)

Old Phase 10-12 tasks have been incorporated into the new phase structure:

- 10.1 → 20.1, 10.2 → 20.2, 10.3 → 20.3, 10.4 → 20.4
- 11.1 → 22.1, 11.2 → 22.2
- 12.x → 23.x (deferred items)

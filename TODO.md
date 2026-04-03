# Droplet — TODO

> Prioritized, actionable development tasks. Each task max ~30 minutes.
> Governed by **Droplet-PM**. Do not add tasks without PM approval.
> Ref: `SPEC.md` for full specification. `AGENTS.md` for coding rules. `DONE.md` for completed phases.
> Implementation agent: **Droplet-Engineer** (Senior Developer).
>
> **STATUS: PM audit #89 (2026-04-03). V1.0 MVP RELEASED. All 7 validation gates GREEN (602 tests, lint 0/0, TSC clean, build passes, knip 0). All Milestones 0–25 COMPLETE. Phase 188 COMPLETE.**
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
> - 🔴 Admin cannot be deleted — **Phase 189. CRITICAL. Neither from Profile nor Admin/Users dashboard.**
> - 🔴 Admin unlimited permissions + "ADMIN" display — **Phase 190. HIGH.**
> - 🟡 Reusable input component — **Phase 191. MEDIUM.**
> - 🟡 Persona selector reusable component — **Phase 192. MEDIUM.**
> - 🟡 TiptapEditor redesign (TinyMCE-style) — **Phase 194. MEDIUM.**
> - 🟡 UsageMetricRow reusable component — **Phase 193. MEDIUM.**
>
> **EXECUTION ORDER (PM audit #89 — Post-Release):**
>
> 1. **CRITICAL Phase 189** — Admin deletion protection (security gap).
> 2. **HIGH Phase 190** — Admin unlimited permissions + "ADMIN" display.
> 3. **MEDIUM Phase 191** — Reusable `FormInput` component.
> 4. **MEDIUM Phase 192** — Reusable `PersonaSelector` component (depends on 191).
> 5. **MEDIUM Phase 193** — Reusable `UsageMetricRow` component.
> 6. **MEDIUM Phase 194** — TiptapEditor redesign (depends on 191).
> 7. **MEDIUM Phase 144** — Admin config cache (30s TTL).
> 8. **MEDIUM Phase 145** — Upload filename collision prevention.
> 9. **MEDIUM Phase 165** — Checkout success page DB polling.
> 10. **LOW Phase 146** — Admin user detail transaction limit.
> 11. **LOW Phase 147** — Rename `.tsx` utility files to `.ts`.
> 12. **LOW Phase 148** — Bulk operations partial-failure reporting.

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

## CRITICAL — Phase 189 — Admin Deletion Protection

> **Owner directive (PM audit #89). SECURITY GAP.** Admin users can currently delete themselves from the Profile page (locks out admin panel permanently) and can be deleted by other admins via Admin/Users dashboard (bulk or single remove). All 4 deletion surfaces must refuse to delete users with `role === "admin"`.

**Files:**

- `src/lib/actions/user.actions.tsx` — `deleteUser()` self-delete action
- `src/lib/actions/admin.actions.tsx` — `removeUserByAdmin()`, `bulkRemoveUsersAction()`
- `src/components/sections/profile/profile-danger-zone.tsx` — Profile UI
- `src/app/(admin)/admin/users/[userId]/page.tsx` — Admin user detail UI
- `src/components/admin/users/admin-users-table.tsx` — Admin bulk actions UI

**What to do:**

1. **Backend — `deleteUser()`**: After auth check, query `User.findOne({ clerkId }).select("role").lean()`. If `role === "admin"`, return error: "Admin accounts cannot be deleted."
2. **Backend — `removeUserByAdmin()`**: After finding target user (already has `select("clerkId email username")`), add `role` to select. If `targetUser.role === "admin"`, throw: "Cannot remove an admin user."
3. **Backend — `bulkRemoveUsersAction()`**: Before the loop, query admin user IDs and filter them out. Log skipped admin users.
4. **UI — `ProfileDangerZone`**: If `userData.role === "admin"`, do not render the danger zone section at all.
5. **UI — Admin user detail page**: If `user.role === "admin"`, hide the "Remove User" form.
6. **UI — Admin users table**: Disable checkbox selection for admin-role users in the table.
7. **Tests**: Add unit tests for all 3 backend guards.

**Acceptance criteria:**

- [ ] `deleteUser()` refuses to delete admin-role users with clear error message
- [ ] `removeUserByAdmin()` refuses to delete admin-role users
- [ ] `bulkRemoveUsersAction()` silently skips admin-role users
- [ ] Profile page hides danger zone for admin users
- [ ] Admin user detail page hides remove button for admin users
- [ ] Admin users table prevents admin user selection for bulk remove
- [ ] Unit tests for all 3 backend guards
- [ ] Build passes, all existing tests pass

---

## HIGH — Phase 190 — Admin Unlimited Permissions + "ADMIN" Display

> **Owner directive (PM audit #89).** Admin users must display "ADMIN" instead of plan name (currently shows "LITE" in `/app/profile`) everywhere. Admin usage metrics must show unlimited.

**What to do:**

1. Identify all locations where plan name is displayed to the user (profile hero, profile usage, sidebar, plan promo, etc.).
2. When `userData.role === "admin"`, display "ADMIN" instead of the plan name.
3. When `userData.role === "admin"`, display unlimited usage metrics ("Unlimited" instead of numeric limits).
4. Verify `resolveEntitlements()` already bypasses all limits for admin — this is about display, not enforcement.

**Acceptance criteria:**

- [ ] Profile page shows "ADMIN" instead of plan name for admin users
- [ ] All plan name display locations show "ADMIN" for admin users
- [ ] Usage metrics show "Unlimited" for admin users
- [ ] Build passes, tests pass

---

## MEDIUM — Phase 191 — Reusable `FormInput` Component

> **Owner directive (PM audit #89).** Create a reusable input component with improved styling for all input types (checkbox, date, email, number, password, radio, range, search, tel, text). Reduce JSX load across the app.

**What to do:**

1. Create `src/components/shared/form-input.tsx` with consistent styling for all input types.
2. Support props: `type`, `label`, `name`, `value`, `placeholder`, `required`, `disabled`, `className`, `onChange`.
3. Apply consistent styling aligned with the app’s design system (rounded, bordered, dark mode support).
4. Migrate existing inline-styled inputs across admin and app surfaces.

**Acceptance criteria:**

- [ ] `FormInput` component supports all listed input types
- [ ] Consistent styling across all input types
- [ ] Dark mode support
- [ ] Existing inputs migrated to use `FormInput`
- [ ] Build passes, tests pass

---

## MEDIUM — Phase 192 — Reusable `PersonaSelector` Component

> **Owner directive (PM audit #89).** Extract persona selector from `chat-header.tsx` into a reusable component. No dotted border. Styling consistent with `FormInput`.

**Depends on:** Phase 191 (FormInput).

**What to do:**

1. Create `src/components/shared/persona-selector.tsx`.
2. Move persona selection logic from `chat-header.tsx`.
3. Remove dotted border. Use styling consistent with `FormInput`.
4. Accept props: `personas`, `selectedPersonaId`, `disabled`, `onSelect`.

**Acceptance criteria:**

- [ ] Persona selector extracted into reusable component
- [ ] No dotted border
- [ ] Styling consistent with `FormInput`
- [ ] `chat-header.tsx` uses the new component
- [ ] Build passes, tests pass

---

## MEDIUM — Phase 193 — Reusable `UsageMetricRow` Component

> **Owner directive (PM audit #89).** `<UsageMetricRow />` in `/app/profile` and "Usage Snapshot" in `/admin/users/[userId]` must share the same component and style.

**What to do:**

1. Identify the existing `UsageMetricRow` in profile and the usage display in admin user detail.
2. Create a shared `src/components/shared/usage-metric-row.tsx`.
3. Replace both implementations with the shared component.

**Acceptance criteria:**

- [ ] Single `UsageMetricRow` component used in both profile and admin
- [ ] Same visual style in both locations
- [ ] Build passes, tests pass

---

## MEDIUM — Phase 194 — TiptapEditor Redesign (TinyMCE-style)

> **Owner directive (PM audit #89).** TiptapEditor must be redesigned to feel like a modern TinyMCE/WordPress text editor. Needs: bold, italic, underline, strikethrough, align (left, center, right, justify), lists (bullet, numbered), insert/edit link, insert/edit image. Styling consistent with `FormInput`.

**Depends on:** Phase 191 (FormInput for consistent styling).

**What to do:**

1. Verify `@tiptap/*` package compatibility with React 19 / Next.js 16.
2. Install required Tiptap extensions (Underline, TextAlign, Link, Image, etc.).
3. Build a WYSIWYG toolbar with common formatting options.
4. Apply consistent styling with the app’s design system.
5. Replace the current TiptapEditor implementation.

**Acceptance criteria:**

- [ ] WYSIWYG toolbar with bold, italic, underline, strikethrough
- [ ] Text alignment (left, center, right, justify)
- [ ] Ordered and unordered lists
- [ ] Insert/edit link
- [ ] Insert/edit image
- [ ] Styling consistent with `FormInput`
- [ ] Build passes, tests pass

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

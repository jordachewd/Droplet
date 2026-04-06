# Droplet — TODO

> Prioritized, actionable development tasks. Each task max ~30 minutes.
> Governed by **Droplet-PM**. Do not add tasks without PM approval.
> Ref: `SPEC.md` for full specification. `AGENTS.md` for coding rules. `DONE.md` for completed phases.
> Implementation agent: **Droplet-Engineer** (Senior Developer).
>
> **STATUS: PM audit #96 (2026-04-06). V1.0 MVP RELEASED. All 7 validation gates GREEN (640 tests, lint 0/0, TSC clean, build passes, knip 0). All Milestones 0–25 COMPLETE. Phases 143–208 COMPLETE.**
>
> **GATE STATUS: Validation GREEN. Architecture GREEN. Product GREEN. Admin GREEN. Public GREEN. Contract GREEN.**
>
> **TEST STATUS: 640 tests (104 suites), 49 E2E (6 skipped). 0 failures. All gates GREEN.**
>
> **EXECUTION ORDER (PM audit #96 — Phase 29.x APPROVED):**
>
> 1. **MEDIUM Phase 29.1** — Admin single-value actions Zod schemas.
> 2. **MEDIUM Phase 29.2** — Admin toggle/numeric actions Zod schemas.
> 3. **MEDIUM Phase 29.3** — Admin bulk actions Zod schemas.
> 4. **LOW Phase 29.4** — Admin helper cleanup + schema consolidation.
> 5. **LOW Phase 29.5** — Client-side API response Zod validation.
>
> All owner directives (OI1–OI44) RESOLVED. See `DONE.md` for archive.
> Phase 29.7 (Zustand) determined ALREADY COMPLETE by PM audit — no changes needed.

---

## PM Audit Notes — Phase 29.x Scope Assessment

> **Zod audit result:** 12 files already use Zod correctly. All 7 API routes, all 4 server action files use Zod at boundaries. The gap: `admin.actions.tsx` (14 exported actions) uses per-field Zod via helper functions (`getStringField`, `getNumericField`, `getMultiStringField`) instead of proper per-action Zod schemas. The helpers DO call Zod internally — this is a pattern consistency issue, not a security gap. Also 1 client component (`checkout-plan-status-poller.tsx`) has an unsafe `as` type assertion on API response.
>
> **Zustand audit result:** 4 stores, all excellent. `useShallow` everywhere, `persist` middleware correct, no prop drilling, no state duplication, no state needing Zustand migration. Zustand v5.0.11. **No changes needed — marked COMPLETE.**
>
> **Deferred:** `updateAdminSettingAction` (15+ branches, 6-8 hour refactor, high risk, low marginal value — current helper pattern works correctly with Zod). Revisit only if bugs or maintainability issues arise.

---

## MEDIUM — Phase 29.1 — Admin Single-Value Actions Zod Schemas

> Convert 4 admin actions from `getStringField()` helper pattern to direct Zod FormData schemas. Each action defines a Zod schema, validates all fields in one `safeParse()` call, and uses `z.infer<>` for type safety.

**File:** `src/lib/actions/admin.actions.tsx`

**Actions to convert:**

1. `removeUserByAdminAction` — Fields: `userId` (string)
2. `createPublicPageAction` — Fields: `title` (string), `slug` (string)
3. `deletePublicPageAction` — Fields: `pageId` (string)
4. `savePublicPageAction` — Fields: `pageId` (string), `title` (string), `content` (string)

**Pattern to follow (matches user.actions.tsx, task.actions.tsx):**

```typescript
const removeUserSchema = z.object({
  userId: z.string().trim().min(1, "User ID is required"),
});

// In action: extract fields from FormData into object, safeParse, return error on failure
```

**Acceptance criteria:**

- [ ] Each action defines a Zod schema for its input
- [ ] All fields extracted from FormData, validated via `schema.safeParse()`
- [ ] On validation failure, return `AdminActionState` with error message (not throw)
- [ ] Type derived via `z.infer<typeof schema>`
- [ ] Existing tests pass, build passes

---

## MEDIUM — Phase 29.2 — Admin Toggle/Numeric Actions Zod Schemas

> Convert 3 admin actions with boolean/numeric coercion from helper pattern to direct Zod schemas.

**File:** `src/lib/actions/admin.actions.tsx`

**Actions to convert:**

1. `toggleUserSuspensionAction` — Fields: `userId` (string), `suspended` (coerce boolean from string "true"/"false")
2. `togglePublicPagePublishedAction` — Fields: `pageId` (string), `isPublished` (coerce boolean)
3. `updatePublicPageSortOrderAction` — Fields: `pageId` (string), `sortOrder` (coerce number)

**Notes:**

- Use `z.coerce.boolean()` or `z.string().transform(v => v === "true")` for boolean fields from FormData
- Use `z.coerce.number().finite()` for numeric fields (consistent with existing `numericFieldSchema`)

**Acceptance criteria:**

- [ ] Each action defines a Zod schema with proper coercion
- [ ] Boolean/numeric FormData strings correctly parsed by Zod
- [ ] Existing tests pass, build passes

---

## MEDIUM — Phase 29.3 — Admin Bulk Actions Zod Schemas

> Convert 6 bulk admin actions from `getMultiStringField()` helper to direct Zod array schemas.

**File:** `src/lib/actions/admin.actions.tsx`

**Actions to convert:**

1. `bulkSuspendUsersAction` — Fields: `userIds` (string[])
2. `bulkRemoveUsersAction` — Fields: `userIds` (string[])
3. `bulkDeleteTransactionsAction` — Fields: `transactionIds` (string[])
4. `bulkDeletePublicPagesAction` — Fields: `pageIds` (string[])
5. `bulkPublishPublicPagesAction` — Fields: `pageIds` (string[])
6. `bulkUnpublishPublicPagesAction` — Fields: `pageIds` (string[])

**Notes:**

- FormData `getAll()` returns `FormDataEntryValue[]` — extract strings, then validate with `z.array(z.string().trim().min(1)).min(1)`
- Consistent pattern: extract → validate → use typed result

**Acceptance criteria:**

- [ ] Each bulk action defines a Zod array schema
- [ ] Empty arrays rejected with proper error message
- [ ] Existing tests pass, build passes

---

## LOW — Phase 29.4 — Admin Helper Cleanup + Schema Consolidation

> After Phases 29.1–29.3, remove unused helper functions and consolidate shared schemas.

**File:** `src/lib/actions/admin.actions.tsx`

**What to do:**

1. Remove `getStringField()` if no longer used (note: `updateAdminSettingAction` still uses it — keep if needed)
2. Remove `getNumericField()` if no longer used (same caveat)
3. Remove `getMultiStringField()` if no longer used
4. Move shared admin schemas (e.g., `requiredStringSchema`) to `src/lib/utils/validation-schemas.ts` if they duplicate existing schemas there (note: `nonEmptyStringSchema` already exists in validation-schemas.ts — identical to `requiredStringSchema`)
5. Verify no dead code introduced

**Acceptance criteria:**

- [ ] Unused helpers removed
- [ ] No duplicate schemas between admin.actions.tsx and validation-schemas.ts
- [ ] Knip passes (0 findings)
- [ ] Build passes, tests pass

---

## LOW — Phase 29.5 — Client-Side API Response Zod Validation

> Add Zod schema validation for the checkout plan-status poller API response.

**File:** `src/components/shared/checkout-plan-status-poller.tsx`

**What to do:**

1. Replace unsafe type assertion `as { confirmed?: boolean }` (line ~37) with Zod schema validation
2. Define a response schema: `z.object({ confirmed: z.boolean() })`
3. Use `safeParse()` — treat parse failure as `confirmed: false` (safe fallback)

**Acceptance criteria:**

- [ ] API response validated with Zod before use
- [ ] No `as` type assertions on external data
- [ ] Existing tests pass, build passes

---

## ON HOLD — Deferred

### Phase 29.6 — updateAdminSettingAction Zod Schema Map (DEFERRED)

> 15+ branches, 6-8 hour refactor, high risk. Current helper pattern works correctly with Zod under the hood. Revisit only if bugs or maintainability issues arise.

### Phase 26.x — Persona-aware media prompts, Stripe auto-renewal

### Legal/nav/footer admin configurability — Deferred to v2

### TypeScript 6 / @typescript-eslint compatibility — Monitor

### jsdom upgrade — Monitor (pinned to ~24.1.3 due to ESM top-level await incompatibility with Vitest forks pool; upgrade when Vitest resolves ESM environment loading)

---

> **Completed phases** archived in [`DONE.md`](DONE.md).
> Includes: Phases 143, 144, 145, 146, 147, 148, 165, 165.1, 180.1–180.4, 185–208.
> Phase 29.7 (Zustand audit) — COMPLETE. No changes needed. 4 stores, all properly implemented.

# Droplet — TODO

---

## CRITICAL OWNER BLOCKER (Phase 260 — Mongo SRV resilience and authenticated failure handling)

> Last audit: PM audit #142, May 27, 2026. `npm run dev` on this workstation logs `querySrv ECONNREFUSED _mongodb._tcp.droplet.vd7t2fs.mongodb.net` during authenticated `/app` load. Verified: Windows `Resolve-DnsName` succeeds, Node `dns.resolveSrv()` fails with the same error, and local `.env.local` defines `MONGODB_URL` + `MONGODB_DB_NAME` but not `MONGODB_URL_FALLBACK`. The connector already supports SRV fallback, but the fallback path is inactive locally. Current page behavior also violates SPEC self-healing rules by treating authenticated user-sync failure as `notFound()` or `redirect("/sign-in")`, and the chat sidebar masks DB outage as an empty history list.

### Phase 260-A — Restore local Mongo connectivity with fallback URI

- **Task**: Define `MONGODB_URL_FALLBACK` in local `.env.local` using the cluster's non-SRV standard connection string, restart `npm run dev`, and reload `/app`.
- **Why**: `src/lib/database/mongoose.ts` already retries SRV DNS failures with `MONGODB_URL_FALLBACK`, but local config currently exposes only the SRV URI.
- **AC**: Authenticated `/app` load succeeds on this workstation even if Node SRV lookup still fails; `ensure-user-synced` and `chat-sidebar` no longer log `querySrv ECONNREFUSED` during normal `/app` load.
- **Effort**: 5 min.

---

### Phase 260-B — Stop 404 or sign-in fallback on authenticated sync failure

- **Task**: Replace authenticated `ensureUserSynced() === null` handling across affected `/app` routes with a shared retry/support surface (`AccountLoadErrorState` or equivalent). At minimum cover `/app`, `/app/new`, `/app/settings`, and `/app/c/[conversationId]`, then audit the remaining authenticated chat routes for the same fallback bug. Do not use `notFound()` or `redirect("/sign-in")` after Clerk auth already succeeded.
- **Why**: SPEC requires a clear retry/support state when self-healing fails. Current route behavior is inconsistent and misleading.
- **AC**: With `ensureUserSynced()` mocked to return `null`, every affected authenticated chat route renders retry/support UI instead of 404 or sign-in redirect.
- **Effort**: 20 min.

---

### Phase 260-C — Stop sidebar from masking DB outage as empty history

- **Task**: In `ChatSidebar`, skip `getRecentTasksByUserId()` when `ensureUserSynced()` returns `null`, and render explicit unavailable messaging when history loading fails instead of the normal "No saved conversations yet." empty state.
- **Why**: Empty history is a false signal during DB outage and makes infrastructure failure look like valid zero-state UX.
- **AC**: Unit test proves `getRecentTasksByUserId()` is not called when user sync fails, and sidebar outage renders unavailable copy instead of the normal empty-history copy.
- **Effort**: 15 min.

---

### Phase 260-D — Do not cache transient infrastructure failure as null user state

- **Task**: Update `ensureUserSynced()` so successful sync results may be cached, but transient DB/connectivity failures are retried on the next call instead of being cached as `null` for 5 seconds.
- **Why**: Current null caching can preserve a transient SRV/DNS miss across adjacent authenticated requests.
- **AC**: A focused unit test proves a failed `connectToDatabase()` call followed by recovery within 5 seconds triggers a fresh retry instead of serving cached `null`.
- **Effort**: 15 min.

---

### Phase 260-E — Add outage regression tests and env diagnostics

- **Task**: Add focused tests for authenticated route behavior on `ensureUserSynced() === null`, sidebar outage handling, and retry-after-failure behavior. Add one secret-safe diagnostic log indicating whether `MONGODB_URL_FALLBACK` is configured when SRV fallback is attempted.
- **AC**: New targeted tests pass; first SRV fallback attempt logs configuration presence without printing connection strings or secrets.
- **Effort**: 25 min.

---

## CRITICAL BLOCKERS (Phase 259 — pre-deployment gate restoration)

> Phase 259 is on hold until Phase 260-A through 260-C are resolved. Gate cleanup is not the top priority while authenticated `/app` access is still broken on the owner-reported workstation.

> Last audit: PM audit #140, May 21, 2026. TypeScript gate RED (4 real errors + 1 stale). Test gate RED (13 failures, 7 files). Root cause: commit `2003629` renamed components to PascalCase and updated props but tests weren't fully aligned and 3 components are missing AGENTS.md-required PascalCase CSS classes.

### Phase 259-A — Delete stale `.next` cache

- **Task**: Run `Remove-Item -Recurse -Force .next` in project root.
- **Why**: `.next/types/validator.ts` still references deleted `/design/page.js`, causing 1 spurious TypeScript error.
- **AC**: `npx tsc --noEmit` no longer shows the validator.ts error. `.next` folder is absent.
- **Effort**: 1 min.

---

### Phase 259-B — Fix 3 AGENTS.md component violations

All three components must have a unique CSS class based on `PascalCase` component name on their root element.

**B1 — `src/components/shared/button.tsx`**

- **Task**: Prepend `"Button"` to `btnClass` classNames for non-icon buttons.
- **Change**: `classNames(isIcon ? "icon-btn" : ["btn", ...], className)` → `classNames("Button", isIcon ? "icon-btn" : ["btn", ...], className)`.
- **AC**: `button.className.toContain("Button")` passes in tests. Icon buttons still get `"icon-btn"` (no `Button` class needed for icon variant — the test only checks default contained variant).
- **Effort**: 2 min.

**B2 — `src/components/shared/loading-bubbles.tsx`**

- **Task**: Prepend `"LoadingBubbles"` to the `loaderClass` classNames.
- **Change**: `classNames("flex w-full items-center justify-center gap-1", className)` → `classNames("LoadingBubbles", "flex w-full items-center justify-center gap-1", className)`.
- **AC**: `button.querySelector(".LoadingBubbles")` returns a truthy element in button loading state test.
- **Effort**: 2 min.

**B3 — `src/components/shared/CheckoutForm.tsx`**

- **Task**: Add `"CheckoutForm"` as the permanent base class on the `<form>` element. The `className` prop is still merged alongside it.
- **Change**: Add `import classNames from "classnames"`. Change `<form action={onCheckout} className={className}>` → `<form action={onCheckout} className={classNames("CheckoutForm", className)}>`.
- **AC**: `container.querySelector("form.CheckoutForm")` returns a truthy form element in checkout tests.
- **Effort**: 3 min.

---

### Phase 259-C — Fix TypeScript errors in test files (required props)

**C1 — `tests/unit/components/hero-section.test.tsx`**

- **Task**: Add `id="homepage-hero"` to the `HeroSection` render call (required `id` prop added in commit `aaa43bf`/`2003629`).
- **Change**: `render(<HeroSection />)` → `render(<HeroSection id="homepage-hero" />)`.
- **AC**: TypeScript error on line 37 gone. Test compiles.
- **Effort**: 1 min.

**C2 — `tests/unit/components/page-head.test.tsx`**

- **Task**: Add `id="test-page-head"` (or appropriate) to all 3 `PageHead` render calls in this test file.
- **AC**: All 3 TypeScript errors on lines 10, 23, 40 gone. `npx tsc --noEmit` returns 0 errors after clearing `.next` cache.
- **Effort**: 2 min.

---

### Phase 259-D — Fix stale hero-section CTA assertion

**File**: `tests/unit/components/hero-section.test.tsx`

- **Task**: Change CTA href assertion from `"/app/new"` → `"/sign-up"`. The HeroSection CTA was intentionally changed to link sign-up visitors (commit `2003629`).
- **AC**: `hero-section.test.tsx > HeroSection > renders the homepage headline, CTA, and hero image` passes.
- **Effort**: 1 min.

---

### Phase 259-E — Fix stale mock paths (kebab → PascalCase)

Three test files mock old kebab-case component paths. Components were renamed to PascalCase in commit `2003629`. Mocks must use the same import path as the component under test.

**E1 — `tests/unit/components/personas-section.test.tsx`**

- **Task**: Change `vi.mock("@/components/shared/persona-card", ...)` → `vi.mock("@/components/shared/PersonaCard", ...)`.
- **AC**: All 4 personas-section tests pass (mock now intercepts the actual import).
- **Effort**: 1 min.

**E2 — `tests/unit/components/plan-card.test.tsx`**

- **Task**: Change `vi.mock("@/components/shared/checkout-form", ...)` → `vi.mock("@/components/shared/CheckoutForm", ...)`.
- **AC**: PlanCard mock intercepts CheckoutForm. React form submission error gone.
- **Effort**: 1 min.

**E3 — `tests/unit/components/plans-section.test.tsx`**

- **Task**: Change `vi.mock("@/components/shared/plan-card", ...)` → `vi.mock("@/components/shared/PlanCard", ...)`.
- **AC**: PlansSection mock intercepts PlanCard. Plan card render calls tracked correctly.
- **Effort**: 1 min.

---

### Phase 259-F — Fix stale test assertions

**F1 — `tests/unit/components/checkout-form.test.tsx`**

- **Task**: Change `container.querySelector("form.Checkout")` → `container.querySelector("form.CheckoutForm")`.
- **Why**: AGENTS.md PascalCase class is `CheckoutForm`, not `Checkout`. Phase 259-B3 adds this class.
- **AC**: `checkout-form.test.tsx > Checkout form > submits checkout with selected plan payload` passes.
- **Effort**: 1 min.

**F2 — `tests/unit/components/persona-card.test.tsx`**

- **Task** (trial badge): Change `getByText("Trial")` → `getByText("Trial access with reduced limits. Upgrade to unlock full access.")`.
- **Task** (locked state): Remove the redundant `expect(screen.getByText("Premium")).toBeTruthy()` assertion. The correct assertion `expect(screen.getByText("Upgrade to Premium to unlock this persona.")).toBeTruthy()` immediately follows it and is sufficient.
- **AC**: Both persona-card test cases pass.
- **Effort**: 2 min.

**F3 — `tests/unit/components/plans-section.test.tsx`**

- **Task**: Change `expect(screen.getByText("Save 35% yearly")).toBeTruthy()` → `expect(screen.getByText("-35%")).toBeTruthy()`.
- **Why**: PlansSection computes `badge = \`-${yearlyDiscount}%\``→`-35%`. "Save 35% yearly" is not rendered anywhere.
- **AC**: Plans-section billing toggle assertion passes.
- **Effort**: 1 min.

**F4 — `tests/unit/components/plan-card.test.tsx`**

- **Task**: Replace `expect(screen.getByText("$159.60/year - Save 30%")).toBeTruthy()` with two assertions:
  ```
  expect(screen.getByText("/Yr")).toBeTruthy();
  expect(screen.getByText("Save $68.40")).toBeTruthy();
  ```
- **Why**: PlanCard renders price and savings as separate elements. Pro monthly $19 × 12 = $228; 30% discount = $159.60/yr; savings = $228 − $159.60 = $68.40. The `/Yr` suffix and savings are in separate `<span>` elements.
- **AC**: `plan-card.test.tsx > PlanCard > shows yearly pricing details and passes yearly checkout payload` passes.
- **Effort**: 3 min.

---

### Phase 259 — Gate Verification (run after all sub-phases complete)

```bash
npx prettier . --write           # 1. Format
npm run lint                     # 2. Lint (expect 0 errors, 6 warnings)
npx tsc --noEmit                 # 3. TypeScript (expect 0 errors)
npm run test                     # 4. Unit tests (expect 730 tests, 0 failures)
npm run build                    # 5. Build (clears .next cache stale reference)
npm run knip                     # 6. Knip (expect 0 issues)
```

**AC**: All 6 mandatory gates GREEN. Production deployment is then unblocked pending Phase 258 decision.

---

## PENDING OWNER DECISION

### Phase 258 — UsageEvent TTL Index

- **Status**: Awaiting owner decision since PM audit #139 (April 22, 2026).
- **Issue (TD-USAGEEVENT-01)**: `UsageEvent` collection has no TTL index. Every AI request creates a document. In production, this collection grows without bound. At 100 req/day × 365 days × N users = unbounded MongoDB storage cost.
- **Decision needed**: Choose a retention window. Recommendation: 90 days. Alternative: 365 days.
- **Engineer task after decision**: Add `createdAt: { type: Date, index: { expires: '90d' } }` to `UsageEvent` schema. Run migration or let TTL purge naturally. Update SPEC.md.
- **Risk of further delay**: Each day in production without TTL adds irreversible storage debt. At scale this becomes a real cost driver.

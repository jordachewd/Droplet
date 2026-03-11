# Repository Guidelines

> Read `ThePlan.md` for high-level strategic direction and milestone plan.
> Read `SPEC.md` for the full application specification, data models, API surface, and known technical debt.
> **Canonical spec file is `SPEC.md`** (not `SPECS.md`). Some agent config files reference `SPECS.md` — this is a naming error. Always use `SPEC.md`.
> Read `TODO.md` for prioritized, actionable development tasks.
> Read `DONE.md` for completed development phases (archive).

## Critical Product Rules (Frozen)

These rules are **non-negotiable**. All agents must respect them in every implementation decision:

1. **Account required** — users MUST create an account to use chat. No anonymous/guest usage.
2. **Lite is permanent and free** — no 3-day trial, no expiry. Default plan on account creation.
3. **All 9 personas available in all plans** — no persona restrictions per plan.
4. **Prices: Pro = $19, Premium = $39** — enforce everywhere.
5. **Lite limits: 5 conversations/day, 10 prompts/conversation, 3 image generations/month.** Audio and video blocked for Lite.
6. **When limits are hit, conversation MUST end** with a stop reason and next-action instruction.
7. **Users can only access their own data** — ownership enforcement on every query.
8. **Admin routes under `/admin/*`** — protected by role at proxy AND server level.
9. **App name is Droplet** — the rename from Cellesseon is complete. Three legacy localStorage migration keys (`cellesseon-theme-mode`, `cellesseon-sidebar-collapsed`) are intentional and must not be removed until a deprecation cycle has passed.

## Validation Workflow

Run these checks in order before every commit:

```bash
npx prettier . --write        # 1. Format
npm run lint                   # 2. Lint
npx tsc --noEmit               # 3. Type-check
npm run test                   # 4. Unit tests
npm run test:e2e               # 5. E2E tests
npm run build                  # 6. Production build
```

All six gates must pass.

## Architecture Rules

1. **Server Components first** — all pages/layouts are Server Components. Read data server-side; never initial-fetch via `useEffect` + `fetch`.
2. **Server Actions for mutations** — live in `src/lib/actions/`. Invoke via `<form action={...}>` or direct call. Every server action MUST verify auth before DB operations.
3. **Server-side queries** — read-only data access helpers live in `src/lib/utils/` (e.g., `task-queries.tsx`). These are NOT server actions — they are plain async functions called from Server Components.
4. **Client Components minimal** — `"use client"` only for browser APIs, listeners, `useState`, `useEffect`. Keep small; push reads to parent Server Components.
5. **Proxy, not middleware** — `src/proxy.tsx` is the Next.js 16 proxy file. Never create `middleware.ts`.
6. **Path alias** — use `@/*` from `tsconfig.json` (e.g., `import Header from "@/components/layout/header"`).
7. **Central policy — no scattered plan logic** — plan limits, model selection, and entitlements must be resolved through central utilities (`resolve-entitlements.tsx`, `ai-model-policy.ts`, `PLAN_LIMITS`). Never hardcode plan rules in UI components, routes, or action files.
8. **Admin audit trail** — every admin mutation must log to `AdminAuditLog` model.

## Route Boundaries

> Route restructure is **complete** (Phase 17). Proxy protects `/app(.*)` and `/admin(.*)` only. Profile and plans are under `/app/*`. Admin is at `/admin/*`. The `(account)` route group has been deleted (Phase 17-C). Public pages (about, faqs, privacy, cookies, terms) are live (Phase 18). Orphan directories (`/dashboard`, `/pricing`) removed (Phase 20).

| Area   | Namespace                                                                       | Protection                           |
| ------ | ------------------------------------------------------------------------------- | ------------------------------------ |
| Public | `/`, `/about`, `/plans`, `/faqs`, `/personas`, `/privacy`, `/cookies`, `/terms` | None                                 |
| Auth   | `/sign-in`, `/sign-up`                                                          | Clerk managed                        |
| App    | `/app(.*)`                                                                      | Auth required (proxy + server)       |
| Admin  | `/admin(.*)`                                                                    | Admin role required (proxy + server) |

## Coding Standards

- TypeScript `strict: true`, `noUnusedLocals`, `noUnusedParameters`.
- 2-space indent, semicolons, explicit types where useful.
- File names: `kebab-case` (except Next.js convention files).
- Component exports: `PascalCase`. Functions/hooks/variables: `camelCase`.
- Each component must have a unique CSS class based on its name in `PascalCase`.
- Route files: `.tsx` extension for API routes and pages.
- Utility-only files: `.ts` extension (no JSX).

## Database Rules

- Add `index: true` on any Mongoose field used in query filters (e.g., `userId`, `clerkId`).
- Use `strict: true` on all `findOneAndUpdate` calls — never allow arbitrary field writes.
- Prefer `upsert: false` unless document creation on miss is explicitly intended.
- Use `.lean()` for read-only queries to avoid Mongoose document overhead.
- Use `.select()` projections to fetch only needed fields.
- New models follow existing pattern: `const Model = models.Model || model("Model", Schema);`
- Guard against unbounded document growth — use `estimatedBytes` checks before adding messages to Task documents.

## Security Rules

- **Zero trust**: protect all routes unless explicitly public. Verify auth in every server action and API route before DB writes.
- **Admin double-check**: admin routes must verify `role === "admin"` at both proxy AND server-action/page level.
- **Webhooks**: verify signatures (Svix for Clerk, `stripe.webhooks.constructEvent` for Stripe) before processing. Ensure idempotency — check for duplicate event IDs before creating records. Webhook handlers must not throw on replayed or missing documents.
- **Secrets**: never commit; use `.env.local`. Only `NEXT_PUBLIC_*` values reach the browser.
- **Error responses**: generic messages to clients; detailed logs server-side only. Never leak provider error messages (OpenAI, AWS, Stripe). Use `new Error(message, { cause: originalError })` to preserve stack traces when rethrowing.
- **Uploads**: validate type and size at the boundary. Use allowlists, not blocklists.
- **Downloads**: validate and allowlist URLs before proxying (SSRF prevention).
- **No `Math.random()`** for security-sensitive values — use `crypto`.
- **API routes** must return proper HTTP status codes (4xx/5xx for errors). Never return HTTP 200 with an error body.
- **Server actions** exported as `"use server"` must have auth checks. If an action is only called from a trusted server context (e.g., webhook handler), do not export it — keep it as a private helper.
- **Ownership enforcement**: all data access must verify that the authenticated user owns the resource (filter by both `_id` and `userId`/`clerkId`).

## AI / OpenAI Rules

- **No hardcoded model names** in OpenAI utility functions — use the AI model policy resolver (`resolveModelPolicy()` in `ai-model-policy.ts`).
- **Frontend must never send the final model ID** — the backend resolves model from plan + feature + task class + cost state.
- **Titles permanently pinned to cheapest model** (`gpt-4.1-nano`) — never use flagship models for this utility task.
- **Premium access means eligibility, not automatic flagship cost** — Premium chat defaults to `gpt-4.1`; `gpt-5.4` only for complex reasoning with explicit request.
- **Retries should downgrade model tier** — never retry on the same or higher-tier model.
- **No binary/base64 in MongoDB** — upload media (audio, images) to S3 and store URLs only.
- **Log every AI request** to `UsageEvent` model for cost tracking and admin analytics.
- **Enforce all limits** before making OpenAI calls: daily conversations, prompt count, media generations, document size.
- **Stop conversations cleanly** when limits are hit — record stop reason and end action on the Task.
- **Audio mode differentiation** — TTS-only fallback (`gpt-4o-mini-tts`) must NOT be used for `audio_in_out` requests.

## Testing Rules

- Unit: Vitest in `tests/unit/`. E2E: Playwright in `tests/e2e/`.
- E2E artifacts: `tests/e2e/test-results` only.
- E2E credentials: resolve via `tests/e2e/utils/e2e-test-user.ts` — never hardcode.
- E2E specs target this app's `baseURL` only; no external sites.
- Tests must assert behavior, not implementation. Cover success AND failure paths.
- Remove test artifacts when done.
- Update `README.md` where necessary. Never include secrets in `README.md`.

## Project Structure

```
src/app/
  (public)/         — public marketing/legal pages (/, /about, /plans, /faqs, /personas, /privacy, /cookies, /terms)
  (auth)/           — Clerk sign-in/sign-up
  (chat)/app/       — authenticated chat routes (/app, /app/new, /app/library, /app/c/[id], /app/profile, /app/plans)
  (admin)/admin/    — admin routes (/admin, /admin/users, /admin/transactions, /admin/usage, /admin/settings, /admin/website)
  api/              — API route handlers
src/components/     — UI components by domain (chat, layout, sections, shared)
src/lib/actions/    — server actions (mutations only)
src/lib/database/   — Mongoose models and connection
src/lib/hooks/      — client hooks
src/lib/utils/      — utilities + server-side query helpers
src/constants/      — app constants (plans, openai, aws, assistant-personas)
src/types/          — shared TypeScript types
src/proxy.tsx       — route protection (Next.js 16 proxy)
public/             — static assets
tests/unit/         — Vitest unit tests
tests/e2e/          — Playwright E2E tests
```

## Do / Don't

| Do                                                  | Don't                                       |
| --------------------------------------------------- | ------------------------------------------- |
| Read data in Server Components                      | Initial-fetch with `useEffect` + `fetch`    |
| Auth-check in every server action and API route     | Trust request origin                        |
| Return generic error messages to UI                 | Leak `error.message` to clients             |
| Use `@/*` path alias                                | Use relative `../../` paths                 |
| Return proper HTTP status codes for errors          | Return HTTP 200 with error in body          |
| Keep commits focused (one logical change)           | Mix unrelated feature/refactor/docs         |
| Update `README.md` when relevant                    | Put secrets in `README.md`                  |
| Index fields used in query filters                  | Leave frequently-queried fields unindexed   |
| Use `strict: true` in Mongoose updates              | Allow arbitrary fields via `strict: false`  |
| Use `.lean()` + `.select()` for reads               | Fetch full Mongoose documents for display   |
| Validate resource ownership before operations       | Allow cross-user data access                |
| Remove `console.log` / `console.error` before merge | Leave debug logging in production code      |
| Use central plan/limit/model policy resolvers       | Hardcode plan rules in components or routes |
| Log admin mutations to AdminAuditLog                | Allow admin changes without audit trail     |
| Upload media to S3, store URLs in MongoDB           | Store base64/binary in MongoDB documents    |
| Check ALL limits before OpenAI calls                | Skip limit checks for any plan tier         |
| End conversations with stop reason on limit hit     | Silently fail or ignore quota violations    |

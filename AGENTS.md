## GENERAL REQUIREMENTS

- ALWAYS perform a **React2Shell Security Check** at first start; Do this only once; Read latest documentation on Context7 MCP (https://context7.com/freeqaz/react2shell); Perform needed updates and fixes when necessary;

# Repository Guidelines

> See `SPEC.md` for the full application specification, data models, API surface, and known technical debt.

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

## Security Rules

- **Zero trust**: protect all routes unless explicitly public. Verify auth in every server action and API route before DB writes.
- **Webhooks**: verify signatures (Svix for Clerk, `stripe.webhooks.constructEvent` for Stripe) before processing. Ensure idempotency — check for duplicate event IDs before creating records.
- **Secrets**: never commit; use `.env.local`. Only `NEXT_PUBLIC_*` values reach the browser.
- **Error responses**: generic messages to clients; detailed logs server-side only. Never leak provider error messages (OpenAI, AWS, Stripe).
- **Uploads**: validate type and size at the boundary. Use allowlists, not blocklists.
- **Downloads**: validate and allowlist URLs before proxying (SSRF prevention).
- **No `Math.random()`** for security-sensitive values — use `crypto`.
- **API routes** must return proper HTTP status codes (4xx/5xx for errors). Never return HTTP 200 with an error body.
- **Server actions** exported as `"use server"` must have auth checks. If an action is only called from a trusted server context (e.g., webhook handler), do not export it — keep it as a private helper.
- **Ownership enforcement**: all data access must verify that the authenticated user owns the resource (filter by both `_id` and `userId`/`clerkId`).

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
src/app/          — routes, layouts, API handlers
src/components/   — UI components by domain (chat, layout, sections, shared)
src/lib/actions/  — server actions (mutations only)
src/lib/database/ — Mongoose models and connection
src/lib/hooks/    — client hooks
src/lib/utils/    — utilities + server-side query helpers
src/constants/    — app constants (plans, openai, aws, assistant-roles)
src/types/        — shared TypeScript types
src/proxy.tsx     — route protection (Next.js 16 proxy)
public/           — static assets
tests/unit/       — Vitest unit tests
tests/e2e/        — Playwright E2E tests
```

## Do / Don't

| Do                                              | Don't                                      |
| ----------------------------------------------- | ------------------------------------------ |
| Read data in Server Components                  | Initial-fetch with `useEffect` + `fetch`   |
| Auth-check in every server action and API route | Trust request origin                       |
| Return generic error messages to UI             | Leak `error.message` to clients            |
| Use `@/*` path alias                            | Use relative `../../` paths                |
| Return proper HTTP status codes for errors      | Return HTTP 200 with error in body         |
| Keep commits focused (one logical change)       | Mix unrelated feature/refactor/docs        |
| Update `README.md` when relevant                | Put secrets in `README.md`                 |
| Index fields used in query filters              | Leave frequently-queried fields unindexed  |
| Use `strict: true` in Mongoose updates          | Allow arbitrary fields via `strict: false` |
| Use `.lean()` + `.select()` for reads           | Fetch full Mongoose documents for display  |
| Validate resource ownership before operations   | Allow cross-user data access               |
| Remove `console.log` before merge               | Leave debug logging in production code     |

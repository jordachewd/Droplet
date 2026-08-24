# Engineering Guidelines

Conventions and constraints for working in this codebase. Written for both human
contributors and AI coding agents. `SPEC.md` holds the full application
specification — data models, API surface, and product behaviour.

---

## Product Rules

These are load-bearing; they shape data models and authorization throughout.

1. **Account required** — no anonymous or guest chat usage.
2. **Lite is permanent and free** — no trial, no expiry. Default plan on signup.
3. **Personas are plan-gated across three tiers.** _Full access:_ Lite → Strategist,
   Developer. Pro → those plus Teacher, Creator, Wellness. Premium → all six.
   _Limited (trial):_ non-full-access personas run with reduced quotas, tracked
   globally and separately from plan limits. _Blocked:_ admins may disable a
   persona per plan. Personas are the core product differentiator.
4. **Pricing** — Pro $19, Premium $39. Enforced everywhere.
5. **Lite quotas** — 10 conversations/day, 10 prompts/conversation, 1 image and
   1 audio generation/month. Every feature is limited; none is blocked outright.
6. **Hitting a limit ends the conversation** with a recorded stop reason and a
   next-action instruction.
7. **Users can only access their own data** — ownership enforced on every query.
8. **Admin routes live under `/admin/*`** — role-checked at both proxy and server level.
9. **Six personas** — Strategist, Teacher, Developer, Creator, Wellness, Interviewer.
   Each behaves as an independent agent for its field: pragmatic, direct, grounded,
   no filler. All persona configuration is admin-managed.
10. **Media features are universal, quotas differentiate** — image and audio are
    available on every plan and persona; plans differ by quantity, personas by
    prompt context. No feature is plan- or persona-exclusive.
11. **Admin role bypasses all limits** — full access to every feature and persona,
    enforced in the backend (`/api/openai`), not merely hidden in the UI.

---

## Validation Workflow

All seven gates must pass before a commit:

```bash
npx prettier . --write   # 1. Format
npm run lint             # 2. Lint
npx tsc --noEmit         # 3. Type-check
npm run test             # 4. Unit tests
npm run test:e2e         # 5. E2E tests
npm run build            # 6. Production build
npm run knip             # 7. Unused-code audit
```

---

## Architecture Rules

1. **Server Components first** — pages and layouts are Server Components. Read data
   server-side; never initial-fetch via `useEffect` + `fetch`.
2. **Server Actions for mutations** — in `src/lib/actions/`. Every action verifies
   auth before touching the database.
3. **Read helpers are not actions** — read-only query helpers live in
   `src/lib/utils/` (e.g. `task-queries.ts`) as plain async functions called from
   Server Components.
4. **Client Components stay minimal** — `"use client"` only for browser APIs,
   listeners, and local state. Push reads up to the parent Server Component.
5. **Proxy, not middleware** — route protection lives in `src/proxy.ts` (Next.js 16
   proxy). Never create `middleware.ts`.
6. **Path alias** — import via `@/*`, never relative `../../` chains.
7. **Central policy, no scattered plan logic** — limits, model selection, and
   entitlements resolve through `resolve-entitlements.ts`, `ai-model-policy.ts`,
   and `PLAN_LIMITS`. Never hardcode plan rules in components or routes.
8. **Admin audit trail** — every admin mutation writes to `AdminAuditLog`.
9. **Extract on the third repeat** — if a pattern appears three or more times,
   promote it to a shared utility, component, or constant.
10. **API route timeouts** — any route calling OpenAI, Stripe, or AWS exports
    `maxDuration`. Image generation runs 15–30s and audio 10–20s, both inside the
    60s ceiling.
11. **No hardcoded display text** — user-facing marketing and promo copy flows from
    admin-configurable settings through the `effective-*` resolver pattern. CSS
    class names, route paths, and plan enum literals are structural and exempt.

---

## Route Boundaries

| Area     | Namespace                                                              | Protection                                      |
| -------- | ---------------------------------------------------------------------- | ----------------------------------------------- |
| Public   | `/`, `/about`, `/plans`, `/personas`, `/privacy`, `/cookies`, `/terms` | None                                            |
| Checkout | `/checkout-success`                                                    | Auth (page-level guard, Stripe redirect target) |
| Auth     | `/sign-in`, `/sign-up`                                                 | Clerk-managed                                   |
| App      | `/app(.*)`                                                             | Auth required (proxy + server)                  |
| Admin    | `/admin(.*)`                                                           | Admin role required (proxy + server)            |

`/checkout-success` carries its own `auth()` guard rather than proxy protection,
because Stripe redirects there before the user reaches `/app`.

---

## Coding Standards

- TypeScript `strict: true`, with `noUnusedLocals` and `noUnusedParameters`.
- Two-space indent, semicolons, explicit types where they aid the reader.
- File names are `kebab-case`, except Next.js convention files and components.
- Component files and exports are `PascalCase`; functions, hooks, and variables
  are `camelCase`.
- Each component carries a unique CSS class named after it, in `PascalCase`.
- `.tsx` for API routes and pages; `.ts` for utility-only files with no JSX.

---

## Styling

- Canonical styles live in `src/styles/`, orchestrated by `src/styles/index.css`.
- Components use semantic CSS classes alongside utility classes — this hybrid is
  intentional.
- Inline styles are acceptable for dynamic runtime values, CSS variable injection,
  framework-generated layout, and isolated fallback surfaces.

---

## Database Rules

- Add `index: true` to any field used in a query filter (`userId`, `clerkId`, …).
- Use `strict: true` on every `findOneAndUpdate` — never allow arbitrary field writes.
- Prefer `upsert: false` unless creation-on-miss is explicitly intended.
- Use `.lean()` for read-only queries and `.select()` projections to fetch only
  what is needed.
- New models follow the existing guard: `const Model = models.Model || model("Model", Schema);`
- Guard against unbounded document growth — check `estimatedBytes` before appending
  messages to a Task.
- **Durable usage counters** — quota counters increment on creation and are never
  decremented by deletion. Never derive usage from `countDocuments`, which a user
  can move by deleting their own data.

---

## Security Rules

- **Zero trust** — every route is protected unless explicitly public. Verify auth in
  every server action and API route before any database write.
- **Admin double-check** — admin surfaces verify `role === "admin"` at both the proxy
  and the server action/page level.
- **Admin users cannot be deleted** — from any surface. Deletion paths check the
  target's role and refuse; the UI hides delete controls for admins.
- **Webhooks** — verify via `verifyWebhook()` (Clerk) and `stripe.webhooks.constructEvent`
  (Stripe) before processing. Idempotency must validate the _complete_ operation: a
  partially failed multi-step webhook must not short-circuit on replay, it must finish
  the remaining steps.
- **Webhook error boundaries** — every webhook POST handler has a top-level try/catch
  returning a controlled response. Never crash the function; never swallow the original
  error.
- **Secrets** — never committed; they live in `.env.local`. Only `NEXT_PUBLIC_*`
  values reach the browser.
- **Error responses** — generic messages to clients, detail in server logs only. Never
  leak provider errors from OpenAI, AWS, or Stripe. Preserve stack traces with
  `new Error(message, { cause: originalError })`.
- **Uploads** — validate type and size at the boundary, using allowlists.
- **Downloads** — validate and allowlist URLs before proxying (SSRF prevention).
- **No `Math.random()`** for anything security-sensitive; use `crypto`.
- **Correct status codes** — never return HTTP 200 with an error body.
- **Unexported private helpers** — an action called only from a trusted server context
  (a webhook handler, say) is not exported as `"use server"`.
- **Ownership enforcement** — filter by both `_id` and `userId`/`clerkId`.
- **Self-healing user sync** — an authenticated user with no MongoDB record triggers
  on-demand creation via the Clerk API. Never show a permanent loading state or
  silently degrade entitlements; API routes return HTTP 503 if self-healing fails.

---

## AI / OpenAI Rules

- **No hardcoded model names** in OpenAI utilities — resolve through
  `resolveModelPolicy()` in `ai-model-policy.ts`.
- **The frontend never sends the final model ID.** The backend derives it from plan,
  feature, task class, and cost state.
- **Titles are pinned to the cheapest model** — never spend a flagship model on a
  utility task.
- **Premium means eligibility, not automatic flagship cost** — Premium chat defaults to
  the mid-tier model; the top model is reserved for complex reasoning on explicit request.
- **Retries downgrade tier** — never retry on the same or a higher-tier model.
- **No binary or base64 in MongoDB** — media goes to S3; documents store URLs.
- **Log every AI request** to `UsageEvent` for cost tracking and analytics.
- **Enforce all limits before calling OpenAI** — conversations, prompts, media, document size.
- **Stop conversations cleanly** on limit — record the stop reason and end action.
- **Audio mode differentiation** — the TTS-only fallback is not valid for
  `audio_in_out` requests.
- **Tool call arguments are not messages** — extract the specific field (text to speak,
  prompt to render) from the tool call. Never forward raw `parsedArgs` as `messages`.
- **Limit checks are atomic** — `findOneAndUpdate` with a `$lt` guard, check and
  increment in one operation. Read-then-write (TOCTOU) is not acceptable for quotas.
- **Rollbacks need their own error handling** — compensating deletes in catch blocks get
  their own try/catch and stderr logging, so a rollback failure never masks the original error.
- **No empty catch blocks** — capture and log to `process.stderr.write()`, or leave a
  comment explaining why the error is deliberately discarded.

---

## Testing Rules

- Unit tests: Vitest in `tests/unit/`. E2E: Playwright in `tests/e2e/`.
- E2E artifacts belong in `tests/e2e/test-results` only.
- E2E credentials resolve through `tests/e2e/utils/e2e-test-user.ts` — never hardcoded.
- E2E specs target this app's `baseURL` only; never external sites.
- Assert behaviour, not implementation. Cover success _and_ failure paths.
- Clean up test artifacts. Keep `README.md` current, and free of secrets.

---

## UX Safety Rules

- **Destructive actions require confirmation** — every delete, remove, suspend, or
  otherwise irreversible action shows a confirmation dialog first, in both admin and
  user-facing flows.
- **Every action shows visual feedback** via the `AlertMessage` component — green for
  success, red for error, orange for warning, blue for info. No silent reloads.
- **Long-running actions show loading state** — `useFormStatus()` or equivalent, which
  also prevents double submission.
- **No native browser dialogs in production UI** — use `AlertMessage` and
  `ConfirmationModal` (`src/components/shared/confirmation-modal.tsx`) rather than
  `window.alert()` or `window.confirm()`.

---

## Project Structure

```
src/app/
  (public)/         — public marketing and legal pages
  (auth)/           — Clerk sign-in / sign-up
  (chat)/app/       — authenticated chat routes
  (admin)/admin/    — admin routes
  api/              — API route handlers
src/styles/         — modular Tailwind architecture
  index.css         — entry point: @import "tailwindcss" + orchestrator
  theme/            — @theme tokens: colors, layout, typography
  base/             — @layer base: wrapper, compatibility, elements
  components/       — @layer components, incl. admin/, chat/, public/
src/components/     — UI components by domain (chat, layout, sections, shared)
src/lib/actions/    — server actions (mutations only)
src/lib/database/   — Mongoose models and connection
src/lib/hooks/      — client hooks
src/lib/utils/      — utilities and server-side query helpers
src/constants/      — plans, openai, aws, personas
src/types/          — shared TypeScript types
src/proxy.ts        — route protection (Next.js 16 proxy)
public/             — static assets
tests/unit/         — Vitest unit tests
tests/e2e/          — Playwright E2E tests
```

---

## Do / Don't

| Do                                              | Don't                                       |
| ----------------------------------------------- | ------------------------------------------- |
| Read data in Server Components                  | Initial-fetch with `useEffect` + `fetch`    |
| Auth-check in every server action and API route | Trust request origin                        |
| Return generic error messages to the UI         | Leak `error.message` to clients             |
| Use the `@/*` path alias                        | Use relative `../../` paths                 |
| Return proper HTTP status codes                 | Return HTTP 200 with an error in the body   |
| Keep commits to one logical change              | Mix feature, refactor, and docs             |
| Index fields used in query filters              | Leave frequently-queried fields unindexed   |
| Use `strict: true` in Mongoose updates          | Allow arbitrary fields via `strict: false`  |
| Use `.lean()` + `.select()` for reads           | Fetch full documents just to display them   |
| Validate ownership before operations            | Allow cross-user data access                |
| Strip debug logging before merge                | Leave `console.log` in production code      |
| Use central plan/limit/model resolvers          | Hardcode plan rules in components or routes |
| Log admin mutations to `AdminAuditLog`          | Allow admin changes without an audit trail  |
| Upload media to S3 and store URLs               | Store base64 or binary in MongoDB           |
| Check every limit before OpenAI calls           | Skip limit checks for any plan tier         |
| End conversations with a stop reason            | Silently ignore quota violations            |

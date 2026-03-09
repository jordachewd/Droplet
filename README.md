# Cellesseon

Smart AI assistant SaaS built with Next.js 16, React 19, TypeScript, Tailwind CSS v4.2, Clerk, Stripe, MongoDB, and OpenAI.

## Current Status

- **Validation pipeline:** TypeScript, ESLint, Prettier, and Vitest all pass (31 suites, 139 tests).
- **E2E:** 2 Playwright specs covering landing page and authenticated flows.
- **Architecture:** Server Components first, Server Actions for mutations, Clerk proxy-based route protection (Next.js 16 convention).
- **Product routing:** Public marketing on `/`, authenticated app experience under `/app`, admin dashboard at `/dashboard`.
- **Assistant model:** 7 predefined AI roles (Strategist, Teacher, Developer, Creator, Best Friend, Boyfriend, Girlfriend) with role-bound system prompts and per-plan entitlements.
- **Conversation persistence:** Full CRUD with conversation history in sidebar, library page, and resume via `/app/c/[conversationId]`.
- **Billing:** Three-tier plan system (Lite/Pro/Premium) via Stripe one-time payments.
- **Usage limits:** Per-plan image and audio generation limits enforced with 30-day rolling counters.
- **Security:** Ownership enforcement on all data access, webhook signature verification, SSRF-protected downloads, file upload allowlists.

## Tech Stack

- Next.js 16 (App Router)
- React 19
- TypeScript 5.7 (`strict`)
- Tailwind CSS 4.2 + `@tailwindcss/postcss`
- Clerk authentication (v7)
- Stripe payments
- MongoDB + Mongoose 9
- OpenAI SDK 6 (GPT-4o, GPT-4o-mini, DALL-E 3, GPT-4o Audio Preview)
- AWS S3 (file storage)
- Vitest + Playwright

## Project Structure

```text
src/
  app/
    globals.css            # Tailwind tokens, shared layers, global styles
    layout.tsx             # Root layout + Clerk + theme init
    (public)/              # Marketing routes (/, /pricing, /roles)
    (chat)/app/            # Authenticated chat routes (/app, /app/new, /app/library, /app/roles, /app/c/[id])
    (chat)/dashboard/      # Admin dashboard
    (account)/             # Profile + plans
    api/                   # Route handlers (openai, upload, download, aws, webhooks)
  components/
    chat/                  # Chat UI (wrapper, input, body, sidebar, header, intro, role picker)
    layout/                # App shell + theme provider
    sections/              # Landing/plans/profile sections
    shared/                # Reusable UI primitives
  constants/               # Plans, OpenAI config, AWS config, assistant roles
  lib/
    actions/               # Server actions (user, task, transaction)
    database/              # Mongoose models and connection
    hooks/                 # Client hooks (screen size, theme)
    utils/                 # Utilities (OpenAI, AWS, validation, rate-limit, task-queries)
  types/                   # Shared TypeScript types
  proxy.tsx                # Route protection (Next.js 16 proxy)
tests/
  unit/                    # 31 suites, 139 tests (Vitest)
  e2e/                     # 2 specs (Playwright)
```

## Getting Started

1. Clone the repository
2. Copy `.env.local.example` to `.env.local` and fill in values
3. `npm install`
4. `npm run dev`

## Validation Workflow

Run in this order:

```bash
npx prettier --write .
npm run lint
npx tsc --noEmit
npm run test
npm run test:e2e
npm run build
```

All six gates must pass before every commit.

## License

Private — all rights reserved.

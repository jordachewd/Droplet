# Cellesseon

Smart AI assistant SaaS built with Next.js 16, React 19, TypeScript, Tailwind CSS v4.2, Clerk, Stripe, MongoDB, and OpenAI.

## Current Status

- **Validation pipeline:** TypeScript, ESLint, Prettier, and Vitest all pass (24 suites, 103 tests).
- **E2E:** 2 Playwright specs covering landing page and authenticated flows.
- **Architecture:** Server Components first, Server Actions for mutations, Clerk proxy-based route protection.
- **Product routing:** Public marketing on `/`, authenticated app experience under `/app`.
- **Assistant model:** Demo role catalog (single-provider OpenAI stack, role-bound conversations).

## Tech Stack

- Next.js 16 (App Router)
- React 19
- TypeScript 5.7 (`strict`)
- Tailwind CSS 4.2 + `@tailwindcss/postcss`
- Clerk authentication (v7)
- Stripe payments
- MongoDB + Mongoose 9
- OpenAI SDK (GPT-4o, DALL-E 3, GPT-4o Audio Preview)
- AWS S3 (file storage)
- Vitest + Playwright

## Project Structure

```text
src/
  app/
    globals.css            # Tailwind tokens, shared layers, global styles
    layout.tsx             # Root layout + Clerk + theme init
    (public)/              # Marketing routes (`/`, `/pricing`, `/roles`)
    (chat)/app/            # Authenticated chat routes (`/app`, `/app/new`, `/app/library`, `/app/roles`)
    api/                   # Route handlers (openai, upload, download, webhooks)
  components/
    chat/                  # Chat UI (wrapper, input, body, sidebar, header, intro)
    layout/                # App shell + theme provider
    sections/              # Landing/plans/profile sections
    shared/                # Reusable UI primitives/components
  constants/               # Plans, OpenAI config, AWS config
  lib/
    actions/               # Server actions (user, task, transaction)
    database/              # Mongoose models and connection
    hooks/                 # Client hooks (screen size, theme)
    utils/                 # Utilities (OpenAI, AWS, validation, rate-limit)
  types/                   # Shared TypeScript types
  proxy.tsx                # Route protection (Next.js 16 proxy)
tests/
  unit/                    # 24 suites, 103 tests (Vitest)
  e2e/                     # 2 specs (Playwright)
```

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

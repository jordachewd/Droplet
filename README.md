# Droplet

Smart AI assistant SaaS with multiple predefined personas. Users choose a persona (Strategist, Teacher, Developer, Creator, Wellness, Analyst, Best Friend, Boyfriend, Girlfriend) and the AI adapts its personality, expertise, and tone accordingly.

Built with Next.js 16, React 19, TypeScript, Tailwind CSS v4.2, Clerk, Stripe, MongoDB, and OpenAI.

## Features

- **9 AI Personas** — each with distinct personality, system prompt, and domain expertise
- **Multi-modal AI** — text chat, image generation, audio generation
- **Conversation history** — persist, resume, and manage conversations
- **Three subscription tiers:**
  - **Lite** (Free forever) — 5 conversations/day, 10 messages/conversation, 3 media generations/month
  - **Pro** ($19/month) — advanced AI model, 50 conversations/day, 100 messages/conversation, 50 image + 50 audio generations/month
  - **Premium** ($39/month) — best AI model, unlimited conversations and messages, unlimited image/audio, 10 video generations/month, premium media quality
- **All personas available in all plans**
- **Secure by design** — Clerk auth, webhook signature verification, ownership enforcement, SSRF protection

### Planned (In Development)

- **Streaming responses** — real-time incremental chat rendering
- **Video generation** — Premium plan exclusive
- **Admin dashboard** — user management, transaction oversight, usage analytics, app settings, website content management
- **Public pages** — About, FAQs, Privacy Policy, Cookie Policy, Terms & Conditions
- **AI model policy** — plan-aware model selection (cheapest for Lite, gpt-5.2-pro for Pro, gpt-5.4-pro for Premium)
- **Usage event logging** — per-request cost tracking and admin analytics

## Tech Stack

- Next.js 16 (App Router, Server Components, Server Actions)
- React 19
- TypeScript 5.7 (`strict`)
- Tailwind CSS 4.2 + custom design tokens
- Clerk authentication (v7) with proxy-based route protection
- Stripe payments (one-time checkout)
- MongoDB + Mongoose 9
- OpenAI SDK 6
- AWS S3 (private server-side file storage)
- Vitest + Playwright (testing)

## Project Structure

```text
src/
  app/
    (public)/              # Marketing + legal pages (/, /about, /plans, /faqs, /personas, /privacy, /cookies, /terms)
    (auth)/                # Clerk sign-in/sign-up
    (chat)/app/            # Authenticated chat routes (/app, /app/new, /app/library, /app/c/[id], /app/profile, /app/plans)
    (admin)/admin/         # Admin routes (/admin, /admin/users, /admin/transactions, /admin/usage, /admin/settings, /admin/website)
    api/                   # Route handlers (openai, upload, download, aws, webhooks)
  components/
    chat/                  # Chat UI (wrapper, input, body, sidebar, header, intro, persona picker)
    layout/                # App shell + theme provider
    sections/              # Landing/plans/profile/about sections
    shared/                # Reusable UI primitives
  constants/               # Plans, OpenAI config, AWS config, assistant personas, FAQs
  lib/
    actions/               # Server actions (user, task, transaction)
    database/              # Mongoose models (User, Task, Transaction, UsageEvent, AppSetting, PublicPage, AdminAuditLog)
    hooks/                 # Client hooks (screen size, theme)
    utils/                 # Utilities (OpenAI, AWS, validation, rate-limit, entitlements, model policy, task-queries)
  types/                   # Shared TypeScript types
  proxy.tsx                # Route protection (Next.js 16 proxy)
tests/
  unit/                    # Vitest unit tests
  e2e/                     # Playwright E2E tests
```

## Getting Started

1. Clone the repository
2. Copy `.env.local.example` to `.env.local` and fill in values
3. `npm install`
4. `npm run dev`

Environment notes:

- `MONGODB_URL` and `MONGODB_DB_NAME` must both be set.
- `NEXT_ALLOWED_DEV_ORIGINS` is an optional comma-separated list for local/LAN dev hosts. It defaults to `localhost,127.0.0.1`.

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

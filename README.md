# Droplet

Smart AI assistant SaaS with multiple predefined personas. Users choose a persona (Strategist, Teacher, Developer, Creator, Wellness, Analyst, Best Friend, Boyfriend, Girlfriend) and the AI adapts its personality, expertise, and tone accordingly.

Built with Next.js 16, React 19, TypeScript, Tailwind CSS v4.2, Clerk, Stripe, MongoDB, and OpenAI.

## Features

- **9 AI Personas** — each with distinct personality, system prompt, and domain expertise (Strategist, Teacher, Developer, Creator, Wellness, Analyst, Best Friend, Boyfriend, Girlfriend)
- **All personas available in all plans** — no persona restrictions per tier
- **Multi-modal AI** — text chat, image generation, audio generation (video generation planned for Premium)
- **Streaming responses** — real-time incremental chat rendering via SSE with progressive text display
- **Plan-aware AI model selection** — comprehensive model policy matrix: `gpt-4o-mini` for Lite, `gpt-4.1` for Pro, `gpt-4.1`/`gpt-5.4` for Premium via `resolveModelPolicy()` with task classes, fallbacks, downgrade triggers, token limits, audio mode differentiation, and server-side task complexity classification
- **Retry/backoff resilience** — automatic retry with exponential backoff (1s/2s/4s) for transient OpenAI errors, model tier downgrade on retry, SDK auto-retry disabled for deterministic behavior
- **Persona prompt system** — versioned, server-only prompt matrix with per-persona, per-model-family system prompts, temperature/max-token tuning, and companion safety rules
- **Usage event logging** — per-request cost tracking, latency measurement, and blocked-request recording
- **Conversation lifecycle** — prompt count tracking, media count tracking, storage size guard (12MB threshold), stop reason enforcement with next-action instructions
- **File uploads via S3** — all attachments uploaded to AWS S3 via `/api/upload`, no inline base64 in messages
- **Conversation history** — persist, resume, and manage conversations
- **Three subscription tiers:**
  - **Lite** (Free forever) — 5 conversations/day, 10 messages/conversation, 3 image generations/month, no audio, no video
  - **Pro** ($19/month) — `gpt-4.1` chat model, 50 conversations/day, 100 messages/conversation, 50 image + 50 audio generations/month
  - **Premium** ($39/month) — `gpt-4.1`/`gpt-5.4` chat models, unlimited conversations and messages, unlimited image/audio, 10 video generations/month, premium audio quality
- **Admin dashboard** — user management, transaction oversight, usage analytics, app settings (AI models, pricing, limits, theme), website content management with Tiptap editor, full audit trail
- **Public marketing site** — About, FAQs, Privacy Policy, Cookie Policy, Terms & Conditions, plus enhanced homepage with feature showcase, workflow, persona spotlight, and CTAs
- **Secure by design** — Clerk auth, webhook signature verification with idempotency, ownership enforcement, SSRF protection, double-layer admin role protection (proxy + server-side), error cause chain preservation, persistent MongoDB-backed rate limiting
- **Test coverage** — 53 Vitest unit test suites (248 tests), 7 Playwright E2E spec files, v8 coverage enforced at 70/60/70/70 thresholds

### Planned (In Development)

- **Video generation** — Premium plan exclusive (`sora-2-pro` / `sora-2`)
- **Stripe subscriptions** — auto-renewal billing (currently one-time payments)
- **Persona-aware media prompts** — image and audio generation with persona-specific style/tone context

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
    (chat)/app/            # Authenticated chat routes (/app, /app/new, /app/library, /app/c/[conversationId], /app/personas, /app/profile, /app/plans)
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

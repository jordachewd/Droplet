# Droplet

**Your AI assistant, your way.**

Droplet is a smart AI chatbot with 6 specialized personas — each with its own personality, expertise, and conversational style. Choose the assistant that fits your need, and start a real conversation.

---

## What is Droplet?

Droplet is not just another chatbot. It's a personal AI assistant that adapts to you.

Pick a persona — from a strategic advisor to a creative partner, a coding companion, or even a wellness coach — and have conversations that feel natural, helpful, and uniquely tailored.

Every response is shaped by the persona you choose, giving you a truly personalized AI experience.

---

## Meet the Personas

| Persona         | Category     | What They Do                                     |
| --------------- | ------------ | ------------------------------------------------ |
| **Strategist**  | Productivity | Business strategy, planning, analysis, decisions |
| **Developer**   | Productivity | Code, debugging, and technical solutions         |
| **Teacher**     | Learning     | Learning, explanations, and educational guidance |
| **Creator**     | Creative     | Creative writing, brainstorming, and content     |
| **Wellness**    | Lifestyle    | Mental health tips, mindfulness, and self-care   |
| **Interviewer** | Career       | Interview prep, practice sessions, and feedback  |

Each persona is an independent AI agent — pragmatic, direct, and grounded in reality. Personas are available based on your plan.

---

## Key Features

- **6 AI Personas** — each with a distinct personality, tone, and expertise
- **Real-time Streaming** — watch responses appear as they're generated
- **Image Generation** — create images through conversation
- **Audio Generation** — generate audio content through conversation
- **Conversation History** — save, resume, and manage your chats
- **Media Library** — browse and download all generated images, audio, and uploaded files
- **File Uploads** — share images with your AI assistant
- **Secure & Private** — your data stays yours, always

---

## Plans & Pricing

|                          | Lite         | Pro        | Premium    |
| ------------------------ | ------------ | ---------- | ---------- |
| **Price (Monthly)**      | Free forever | $19/mo     | $39/mo     |
| **Price (Yearly)**       | —            | $159.60/yr | $327.60/yr |
| **Personas (full)**      | 2            | 5          | All 6      |
| **Trial access**         | All others   | Remaining  | —          |
| **Conversations/Day**    | 10           | 50         | Unlimited  |
| **Prompts/Conversation** | 10           | 100        | Unlimited  |
| **Image Generation**     | 1/month      | 50/month   | Unlimited  |
| **Audio Generation**     | 1/month      | 50/month   | Unlimited  |

All plans include all features — differentiated by usage limits, not by feature lockout. Personas not fully included in your plan are available as trials with reduced limits. Yearly billing available with 30% discount.

Create a free account and start chatting today. Upgrade anytime — no commitment.

---

## How It Works

1. **Create an account** — sign up for free in seconds
2. **Choose a persona** — pick the AI personality that fits your needs
3. **Start chatting** — get personalized, streaming responses instantly
4. **Generate media** — create images and audio right in the conversation
5. **Save & resume** — come back to any conversation anytime

---

## Why Droplet?

- **It's personal** — every conversation is shaped by the persona you choose
- **It's powerful** — built on the latest AI models for speed and quality
- **It's flexible** — from productivity to creativity to career growth
- **It's private** — your conversations, your data, your control
- **It's free to start** — no credit card required for the Lite plan

---

## Get Started

Visit [Droplet](https://droplet.jwd-apps.com) to create your free account and start chatting today.

---

## Getting Started

```bash
nvm use                            # Node.js 24 LTS (see .nvmrc)
npm ci
cp .env.local.example .env.local   # then fill in your own credentials
npm run dev
```

`.env.local.example` documents every environment variable, which are required, and
how to run the Clerk and Stripe webhook listeners locally. `.env.local` is
gitignored and must never be committed.

```bash
npm run lint      # ESLint
npx tsc --noEmit  # type-check
npm test          # Vitest unit tests
npm run test:e2e  # Playwright E2E
npm run build     # production build
```

---

## Development Runtime

- Use Node.js 24 LTS. The repo includes `.nvmrc` and `package.json` engines set to `24`.
- For local Atlas connections, keep `MONGODB_URL_FALLBACK` configured with the non-SRV MongoDB URI. This protects local development when Node SRV DNS lookups fail against a loopback resolver.
- Optional: set `DNS_FALLBACK_SERVERS` to a comma-separated DNS server list if the default `1.1.1.1,8.8.8.8` is not appropriate for your network.

---

## License

Copyright (c) 2026 JordacheWD. All rights reserved.

Source-available for portfolio review and technical study — **not open source**.
You may read, study, and reference this code; you may not reuse, redistribute, or
deploy it. See [LICENSE](LICENSE) for the full terms.

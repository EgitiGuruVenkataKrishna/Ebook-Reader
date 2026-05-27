# Forge

Forge is a production-shaped SaaS starter for turning YouTube sources into newsletters, LinkedIn posts, and short-form scripts. The current implementation includes a premium workbench UI, guarded API routes, duration-based content planning, deterministic draft generation, tests, and Vercel-ready configuration.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Zod validation
- Vitest
- Vercel deployment target

## Local Setup

```bash
npm.cmd install
npm.cmd run dev
```

Open `http://localhost:3000`.

PowerShell may block `npm.ps1` on Windows, so the commands above use `npm.cmd`.

## Environment

Copy `.env.example` to `.env.local` and fill in keys as integrations are added.

```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
YOUTUBE_API_KEY=
OPENAI_API_KEY=
DATABASE_URL=
SENTRY_DSN=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```

Without `YOUTUBE_API_KEY`, the app still works in demo mode with safe metadata fallbacks. Pasting transcript notes produces richer drafts until transcript extraction is wired in.

## Production Architecture

The code is organized so providers can be swapped in without rewriting the UI:

- `lib/youtube.ts`: YouTube parsing and metadata fetching
- `lib/content/planner.ts`: video-length-to-output planning
- `lib/content/generator.ts`: content generation adapter boundary
- `lib/content/processor.ts`: orchestrates validation, metadata, planning, and generation
- `lib/jobs/store.ts`: development job storage

For production SaaS use, replace the memory job store with Postgres and move long-running work to Trigger.dev, Inngest, or Upstash QStash. Vercel request handlers should create jobs and return quickly; workers should handle transcript extraction, transcription fallback, AI generation, retries, and usage metering.

## Deployment

1. Push this repository to GitHub.
2. Import the GitHub repository into Vercel.
3. Add environment variables in Vercel.
4. Use preview deployments for pull requests.
5. Promote to production after CI passes.

The included GitHub Actions workflow runs install, typecheck, tests, lint, and build.

## Verification

```bash
npm.cmd run typecheck
npm.cmd run test
npm.cmd run lint
npm.cmd run build
```

## Next Production Steps

- Add auth with Clerk or Auth.js.
- Add Postgres with Drizzle or Prisma.
- Replace `lib/jobs/store.ts` with persisted jobs.
- Add transcript extraction and transcription fallback.
- Add OpenAI/Anthropic generation providers behind `lib/content/generator.ts`.
- Add Stripe metering and plan limits.
- Add Sentry and product analytics.

# WA Automations

WhatsApp Business automation platform — shared inbox, campaigns, chatbots, catalogue and analytics.

**Stack:** Next.js 15 · Node.js + Express · Supabase (Postgres + Auth + Storage + Realtime) · Redis/BullMQ

See [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) for the full feature inventory, database schema and phase-by-phase build order.

## Layout

```
apps/web      Next.js app (App Router, Tailwind, TanStack Query)
apps/api      Express API, WhatsApp webhooks, campaign workers
packages/types Shared entities + zod schemas
supabase/migrations  Postgres schema and RLS policies
```

## Getting started

```bash
pnpm install
cp .env.example .env        # then fill in the values below
```

Required before anything runs:

| Variable | Where to get it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET` | Supabase project → Settings → API |
| `ENCRYPTION_KEY` | `openssl rand -hex 32` — encrypts WABA tokens at rest |
| `META_APP_ID`, `META_APP_SECRET`, `META_WEBHOOK_VERIFY_TOKEN` | Meta for Developers → your WhatsApp app |
| `REDIS_URL` | Local Redis or Upstash |

Apply the schema (Supabase CLI, or paste each file into the SQL editor in order):

```bash
supabase db push
```

Then:

```bash
pnpm dev        # web on :3000, api on :4000
pnpm typecheck
pnpm build
```

## Status

Phases 0–12 of the plan are built: 47 web routes and the full API compile and build clean.
All 40 sidebar items resolve to a real page wired to a real endpoint.

**Still to do (Phase 13):**
1. Create a Supabase project and run the four migrations — they are written but have never
   been executed, so expect to fix a syntax slip or two on the first `db push`.
2. Create a public `media` bucket in Supabase Storage (used by Media Uploads).
3. Connect a real WABA under Manage Credentials, then point Meta's webhook at the API.
4. Run Redis so the campaign worker and scheduler have a queue.
5. Tests (Vitest/Supertest/Playwright) and deployment.

## Webhooks

Point the Meta app's WhatsApp webhook at `https://<api-host>/webhooks/whatsapp` using the same
verify token as `META_WEBHOOK_VERIFY_TOKEN`. Locally, tunnel with `ngrok http 4000`.

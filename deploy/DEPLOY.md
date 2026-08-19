# Deploying WA Automations to your VPS

Target: `waautomation.peculiex.com`, alongside your existing `interviewaceai`,
`wedding-api`, `wedding-web` PM2 apps. Everything below runs **on the VPS**
over SSH — not on your local machine.

## 0. One-time setup

```bash
# pnpm, if not already installed (node/pm2 are already on this box)
npm install -g pnpm

# A place for the repo, alongside your other apps
mkdir -p /var/www
cd /var/www
git clone https://github.com/ankit-datatrainer/wa-automation.git
cd wa-automation
```

## 1. Install and build

```bash
pnpm install
# @wa/types has no build step — both apps transpile its TS source directly.
# The API runs via tsx in production (see ecosystem.config.js), so no build
# step is required for it either — only the web app needs building.
pnpm --filter @wa/web build
```

## 2. Environment files

These are **not** in the repo (gitignored on purpose — they hold secrets).
Create them directly on the server:

```bash
nano apps/api/.env
```

Paste, filling in the real values (same Supabase project you've already been
using in development, or a fresh one — your call):

```
NODE_ENV=production
PORT=4300
CORS_ORIGIN=https://waautomation.peculiex.com

NEXT_PUBLIC_SUPABASE_URL=https://mwqxxlckupapyfjriacy.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<your service role key>
SUPABASE_JWT_SECRET=<your JWT secret>

ENCRYPTION_KEY=<64 hex chars — generate fresh with: openssl rand -hex 32>

REDIS_URL=redis://localhost:6379

META_GRAPH_API_VERSION=v21.0
META_APP_ID=
META_APP_SECRET=
META_WEBHOOK_VERIFY_TOKEN=<any 8+ char string, reused across all tenants>
META_CONFIG_ID=

RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
```

> **Generate a new `ENCRYPTION_KEY` for production** — don't reuse the one
> from local development. Run `openssl rand -hex 32` on the VPS itself.

```bash
nano apps/web/.env.local
```

```
NEXT_PUBLIC_SUPABASE_URL=https://mwqxxlckupapyfjriacy.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your anon key>
# No trailing /api — the app code appends /api/... itself.
NEXT_PUBLIC_API_URL=https://waautomation.peculiex.com
```

Rebuild after adding env files, since Next.js inlines `NEXT_PUBLIC_*` vars at
build time:

```bash
pnpm --filter @wa/web build
```

## 3. Start with PM2

```bash
mkdir -p logs
pm2 start deploy/ecosystem.config.js
pm2 save
```

Check it joined the others cleanly:

```bash
pm2 list
```

You should now see `wa-automation-api` and `wa-automation-web` alongside
`interviewaceai`, `wedding-api`, `wedding-web`.

If port `3300` or `4300` is already taken by something else on this box,
edit `PORT` in `apps/api/.env` and the `-p 3300` arg in
`deploy/ecosystem.config.js`, then `pm2 restart` both.

## 4. Nginx + domain

```bash
sudo cp deploy/nginx-waautomation.conf /etc/nginx/sites-available/waautomation.peculiex.com
sudo ln -s /etc/nginx/sites-available/waautomation.peculiex.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

Confirm `waautomation.peculiex.com` already points at this server's IP in
your DNS (an A record) before this step — if it doesn't resolve yet, the
site just won't be reachable until it does; nginx itself will still load.

Visit `http://waautomation.peculiex.com` — you should hit the login page.

## 5. HTTPS

```bash
sudo apt install -y certbot python3-certbot-nginx   # if not already installed
sudo certbot --nginx -d waautomation.peculiex.com
```

Certbot edits the nginx config in place to add the certificate and redirect
HTTP to HTTPS. After this, update `apps/api/.env`'s `CORS_ORIGIN` and
`apps/web/.env.local`'s `NEXT_PUBLIC_API_URL` to `https://…` if they aren't
already, and `pm2 restart wa-automation-api wa-automation-web`.

## 6. Database schema

If this VPS points at the **same** Supabase project you developed against,
the schema is already there and this step is done.

If you created a **new** Supabase project for production, run every file in
`supabase/migrations/` in order through the Supabase SQL Editor (or
`supabase/migrations/RUN_THIS_NEXT.sql`, which already combines the two most
recent ones) — same process you used in development.

## 7. Point Meta's webhook here

In Meta for Developers → your app → WhatsApp → Configuration:

- **Callback URL:** `https://waautomation.peculiex.com/webhooks/whatsapp`
- **Verify token:** whatever you set as `META_WEBHOOK_VERIFY_TOKEN`

## 8. Redeploying after future changes

```bash
cd /var/www/wa-automation
git pull
pnpm install
pnpm --filter @wa/api build
pnpm --filter @wa/web build
pm2 restart wa-automation-api wa-automation-web
```

## Logs

```bash
pm2 logs wa-automation-api
pm2 logs wa-automation-web
```

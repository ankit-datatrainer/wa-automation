# WA Automations — Implementation Plan

WhatsApp Business API SaaS platform.
**Stack:** Next.js 15 (App Router, TypeScript) · Node.js + Express · Supabase (Postgres + Auth + Storage + Realtime)

---

## 1. Feature Inventory

Derived from the reference dashboard's navigation tree. Every item below is a deliverable.

### 1.1 Global Shell
| Feature | Notes |
|---|---|
| Collapsible left sidebar | Grouped sections, expand/collapse, active-state highlight, `New`/`Admin` badges |
| Global search (⌘K) | Command palette across contacts, templates, campaigns, chats |
| `+ Create` button | Dropdown → new campaign / template / chatbot / contact |
| Live status pill | Green dot when WABA webhook healthy |
| Notification bell | Unread count badge, dropdown feed |
| WhatsApp Connected chip | Shows connected phone number + connection state |
| User avatar menu | Profile, org switch, logout |
| Breadcrumbs + Refresh | Per-page header |

### 1.2 Dashboard
- Six KPI stat cards: **Account Days Left** (with `Active` badge + progress bar), **Templates** (total), **Reports** (total), **Balance** (₹, current), **Quality Rating** (`High/Medium/Low` + WhatsApp quality), **Per-Day Message Limit** (tier, e.g. 2.0k)
- Progress bar under each card
- Info tooltip (ⓘ) on every metric
- **Account Information** panel — email, mobile, country, `Demo Account` badge
- **Message Charges by Category** panel — per-message cost breakdown: Marketing / Utility / Authentication / Service
- Refresh action

### 1.3 Inbox (Team Inbox)
- Conversation list, grouped by day (Sunday / Saturday / Friday / …), unread count badges, avatar initials
- Filters: **All · Unread · Active**
- Contact search within conversations
- Filter icon (assignee, tag, status)
- `+` new conversation
- Empty state ("Welcome to Your Inbox" + unread summary)
- Chat pane: message thread, delivery ticks (sent/delivered/read/failed), media, reply, 24-hour session-window indicator, template send when window closed
- Canned message insertion, agent assignment, notes, tags

### 1.4 Chat History
Searchable/filterable archive of all conversations with export.

### 1.5 Contacts
CRUD, CSV import/export, tags, groups, custom attributes, opt-in status, bulk actions, dedupe on phone.

### 1.6 Campaigns
| Page | Purpose |
|---|---|
| Campaigns | List + create wizard |
| Template Library | Pre-built marketing/utility templates to clone |
| Your Templates | Submitted templates + Meta approval status (Approved/Pending/Rejected) |
| Send to Contacts | Pick individual contacts |
| Send By Tags | Audience = tag selection |
| Send By Groups | Audience = group selection |
| CSV Campaign | Upload CSV, map columns → template variables |
| Broadcast | One-to-many blast |
| Campaign History | Sent/delivered/read/failed/replied per campaign |
| Scheduled Campaigns | Future-dated queue, edit/cancel |

Template builder: header (text/image/video/document), body with `{{1}}` variables, footer, buttons (quick reply / URL / phone), category, language, live WhatsApp-style preview, Meta submission.

### 1.7 Ads Manager
- **Setup** — connect Meta Ads account, Click-to-WhatsApp ad campaigns, attribution of inbound chats to ads.

### 1.8 Automation
| Page | Purpose |
|---|---|
| Chatbots | Overview + create |
| Chatbots Library | 21 prebuilt templates (Banking & Finance Support, Delivery & Logistics, Restaurant Support, Ecommerce Support, Customer Support, SaaS Product Demo, Car Service & Maintenance, Travel Package Booking, …) each with `Try this Template` |
| Your Chatbots | User's bots, enable/disable |
| Chatbot History | Execution logs per contact |
| Manage Flows | Visual flow builder (nodes: message, question, condition, API call, handoff-to-agent, delay, tag) |
| Flow Submissions | Data captured by WhatsApp Flows forms |

Also: keyword triggers, welcome message, away message, auto-reply rules.

### 1.9 Catalogue
Product catalogue synced to WhatsApp Commerce — products, collections, prices, images, cart/order messages.

### 1.10 Analytics
- **Credit History** — message credit debits/credits
- **Chat History** — conversation-level analytics
- **Subscription History** — plan changes, invoices
- **Wallet History** — top-ups, balance ledger

### 1.11 Administration
- **User and Permission Manager** (Admin) — invite users, roles (Owner/Admin/Manager/Agent), granular permissions
- **Agents Login** — agent accounts, online/offline, assignment rules

### 1.12 Support
- **Support Tickets** — raise/track tickets, priority, status, threads
- **Setup Support** — onboarding assistance requests
- **Support Reports** — ticket SLA/volume analytics

### 1.13 Settings
- **API Docs** — public API reference + key management
- **Integrations** — Shopify, WooCommerce, Zapier, Webhooks, Google Sheets, CRM
- **Support** — contact channel

### 1.14 Manage
- **Business Profile** — WABA display name, about, address, logo, website
- **User Profile** — personal details, password, 2FA
- **Media Uploads** — media library, Meta media handle upload
- **Manage Groups** — contact groups CRUD
- **Manage Credentials** — WABA ID, phone number ID, permanent token, app secret, webhook verify token
- **Opt-in Management** — opt-in/opt-out lists, keywords (STOP/START), compliance log
- **Canned Message** — saved quick replies with shortcodes
- **Live Chat Setting** — website widget, working hours, routing

---

## 2. Architecture

```
wa-automations/
├── apps/
│   ├── web/                  # Next.js 15 — App Router, TS, Tailwind, shadcn/ui
│   └── api/                  # Express + TS
├── packages/
│   ├── types/                # Shared DTOs + zod schemas
│   └── config/               # eslint, tsconfig, tailwind preset
└── supabase/
    └── migrations/
```

**Why split API from Next.js:** WhatsApp webhooks, BullMQ campaign workers, and long-running flow execution need a persistent Node process, not serverless functions.

### Request flow
```
Browser → Next.js (SSR/RSC) → Express API → Supabase Postgres
                                    ↓
                          Meta Graph API (WhatsApp Cloud API)
                                    ↑
Meta Webhook → Express /webhooks/whatsapp → Redis queue → workers → Supabase Realtime → Browser
```

### Auth
Supabase Auth (email/password + magic link). JWT verified in Express middleware. Multi-tenant via `organization_id` on every table, enforced by Postgres **Row Level Security**.

---

## 3. Database Schema (Supabase / Postgres)

**Core tenancy**
- `organizations` — name, slug, plan, wallet_balance, trial_ends_at, is_demo
- `users` — extends `auth.users`; name, email, phone, country, avatar_url
- `organization_members` — org_id, user_id, role (`owner|admin|manager|agent`), permissions jsonb
- `waba_accounts` — org_id, waba_id, phone_number_id, display_phone, permanent_token (encrypted), quality_rating, messaging_limit_tier, verify_token, status

**Messaging**
- `contacts` — org_id, wa_id (phone), name, email, attributes jsonb, opt_in_status, last_seen_at, source
- `contact_tags` / `tags`
- `contact_groups` / `groups`
- `conversations` — org_id, contact_id, status (`open|pending|closed`), assigned_to, last_message_at, unread_count, session_expires_at
- `messages` — conversation_id, direction, type, content jsonb, wamid, status (`queued|sent|delivered|read|failed`), error jsonb, template_id, sent_at
- `canned_messages` — shortcode, body

**Templates & campaigns**
- `templates` — org_id, name, language, category, components jsonb, meta_template_id, status (`draft|pending|approved|rejected`), rejection_reason
- `template_library` — global prebuilt templates
- `campaigns` — org_id, name, template_id, audience_type (`contacts|tags|groups|csv|broadcast`), audience_config jsonb, status (`draft|scheduled|running|paused|completed|failed`), scheduled_at, stats jsonb
- `campaign_recipients` — campaign_id, contact_id, status, wamid, error, variables jsonb

**Automation**
- `chatbots` — org_id, name, trigger_type (`keyword|welcome|away|all`), trigger_config jsonb, is_active
- `chatbot_library` — 21 prebuilt bot templates (industry, definition jsonb)
- `flows` — org_id, name, definition jsonb (nodes + edges), meta_flow_id, status
- `flow_submissions` — flow_id, contact_id, data jsonb
- `chatbot_executions` — chatbot_id, contact_id, current_node, context jsonb, status

**Commerce**
- `catalogs` / `products` — retailer_id, name, price, currency, image_url, availability

**Billing & ledger**
- `wallet_transactions` — org_id, type (`credit|debit`), amount, balance_after, reference
- `credit_history` — message-level charge, category (`marketing|utility|authentication|service`), cost
- `subscriptions` — plan, period, amount, status
- `message_pricing` — country, category, price

**Ops**
- `support_tickets` / `ticket_messages`
- `media_uploads` — file_path (Supabase Storage), meta_media_id, mime_type
- `api_keys` — hashed key, scopes, last_used_at
- `integrations` — provider, config jsonb, is_active
- `webhook_events` — raw Meta payload, processed_at (idempotency on `wamid`)
- `audit_logs`
- `notifications`
- `ads_accounts` / `ad_campaigns`

RLS policy on every tenant table: `organization_id = auth_org_id()`.

---

## 4. Build Phases

### Phase 0 — Foundation
1. Monorepo (pnpm workspaces + Turborepo)
2. `apps/web` — Next.js 15, TS, Tailwind, shadcn/ui, brand tokens (green `#16A34A` primary, matching the reference look)
3. `apps/api` — Express + TS, pino logging, zod validation, error middleware
4. Supabase project, local CLI, migration runner
5. Shared `packages/types`
6. Env config, Docker Compose (Postgres + Redis for local)

### Phase 1 — Auth & Tenancy
1. Supabase Auth: signup, login, forgot/reset, email verify
2. Org creation on signup + slug
3. `organization_members`, role model, permission matrix
4. Express `requireAuth` + `requirePermission` middleware
5. RLS policies across all tables
6. Protected Next.js layout, middleware redirect

### Phase 2 — App Shell
1. Sidebar with all 9 sections + collapse
2. Topbar: search, Create, Live pill, bell, WhatsApp chip, avatar menu
3. Breadcrumbs, page-header component, refresh
4. ⌘K command palette
5. Toasts, skeletons, empty states, error boundaries
6. Responsive (mobile drawer)

### Phase 3 — WABA Connection
1. **Manage Credentials** — store WABA ID, phone number ID, token (encrypted at rest), verify token
2. Meta Embedded Signup (optional path)
3. `/webhooks/whatsapp` — GET verify + POST receive, signature validation (`X-Hub-Signature-256`)
4. Webhook event persistence + idempotency
5. Health check → drives the Live pill
6. Sync quality rating + messaging limit from Graph API

### Phase 4 — Contacts
1. Contacts table: pagination, sort, search, column filters
2. Create/edit drawer + custom attributes
3. CSV import with column mapping + validation report; CSV export
4. Tags CRUD + bulk tag/untag
5. **Manage Groups** CRUD + membership
6. **Opt-in Management** — status, STOP/START keyword handling, compliance log

### Phase 5 — Inbox
1. Conversation list, day grouping, unread badges, All/Unread/Active filters
2. Supabase Realtime subscription for live messages
3. Chat pane: bubbles, ticks, media rendering, timestamps
4. Send text/media/template; 24-hour window enforcement with template fallback UI
5. Assignment to agents, status transitions, internal notes, tags
6. **Canned Message** insertion via `/shortcode`
7. Advanced filter panel
8. **Chat History** page + export

### Phase 6 — Templates
1. Template builder: header/body/footer/buttons, variable inserter, live WhatsApp preview
2. Submit to Meta Graph API; poll/webhook status sync
3. **Your Templates** — status chips, resubmit, delete
4. **Template Library** — browse + clone
5. Media header upload → Meta media handle

### Phase 7 — Campaigns
1. Campaign wizard: name → template → audience → variable mapping → schedule → review
2. Audience modes: **Send to Contacts / By Tags / By Groups / CSV / Broadcast**
3. BullMQ queue + worker, rate limiting to messaging tier, retry with backoff
4. **Scheduled Campaigns** — cron dispatcher, edit/cancel
5. **Campaign History** — per-campaign funnel (sent/delivered/read/replied/failed), recipient drill-down, CSV export
6. Pause/resume/duplicate

### Phase 8 — Automation
1. **Chatbots** CRUD; triggers: keyword, welcome, away, catch-all
2. **Chatbots Library** — seed 21 industry templates, `Try this Template` clone flow
3. **Manage Flows** — React Flow visual builder; node types: send message, ask question, condition, API request, delay, add tag, assign agent, end
4. Flow execution engine in the API worker, per-contact state machine
5. **Flow Submissions** — captured form data, export
6. **Chatbot History** — execution logs
7. WhatsApp Flows (Meta native forms) publish + endpoint

### Phase 9 — Catalogue & Commerce
1. Product CRUD + image upload
2. Sync to Meta Commerce catalog
3. Send product/multi-product/cart messages
4. Order webhook handling

### Phase 10 — Analytics & Billing
1. **Dashboard** KPI cards wired to real aggregates + tooltips + progress bars
2. **Account Information** + **Message Charges by Category** panels
3. **Credit History**, **Wallet History**, **Subscription History** ledgers
4. Wallet top-up (Razorpay/Stripe) + auto-debit per conversation category
5. Charts (Recharts): message volume, delivery rate, campaign performance, agent performance
6. Reports export

### Phase 11 — Administration & Support
1. **User and Permission Manager** — invites, roles, granular permission matrix
2. **Agents Login** — agent portal, presence, round-robin/load-based assignment
3. **Support Tickets** — create/track/reply, priority, status
4. **Setup Support**, **Support Reports**
5. Audit log viewer

### Phase 12 — Settings, Integrations, Ads
1. **Business Profile** (push to Meta), **User Profile**, **Media Uploads** library
2. **API Docs** — public REST API + key issuance, rate limits, OpenAPI page
3. **Integrations** — outbound webhooks, Zapier, Shopify/WooCommerce, Google Sheets
4. **Live Chat Setting** — embeddable widget + working hours + routing
5. **Ads Manager → Setup** — Meta Ads connect, CTWA campaigns, attribution

### Phase 13 — Hardening & Launch
1. Rate limiting, Helmet, CORS, input sanitization, secrets encryption review
2. Tests: Vitest (unit), Supertest (API), Playwright (E2E critical paths)
3. Sentry, structured logs, uptime/queue dashboards
4. Deploy: Vercel (web) + Railway/Render (api + workers) + Supabase (db) + Upstash (redis)
5. Seed data, onboarding wizard, docs

---

## 5. Key Technical Decisions

| Decision | Choice | Reason |
|---|---|---|
| Monorepo | pnpm + Turborepo | Shared types between web and api |
| UI | Tailwind + shadcn/ui | Matches the clean card/table aesthetic; fully customizable |
| State | TanStack Query + Zustand | Server cache vs. UI state |
| Realtime | Supabase Realtime | Inbox live updates without extra socket infra |
| Queue | BullMQ + Redis | Campaign throughput, retries, scheduling |
| Forms | react-hook-form + zod | Same schemas shared with API validation |
| Flow builder | React Flow | Node/edge canvas |
| Tables | TanStack Table | Sorting/filtering/pagination on large contact sets |
| Charts | Recharts | Dashboard + analytics |
| Secrets | pgsodium / app-level AES-GCM | WABA tokens must not sit in plaintext |

---

## 6. Critical Constraints (WhatsApp Cloud API)

- **24-hour session window** — free-form replies only within 24h of the last user message; otherwise template-only. Must be enforced in UI and API.
- **Template approval** — Meta review required; handle `pending`/`rejected` with reason.
- **Messaging tiers** — 250 / 1k / 10k / 100k / unlimited per 24h. Campaign workers must throttle to the current tier.
- **Quality rating** — Green/Yellow/Red; degradation can drop the tier. Surface on dashboard.
- **Pricing** — per-conversation, per-category (marketing / utility / authentication / service), country-dependent. Drives the wallet ledger.
- **Opt-in required** — must record consent before marketing sends.
- **Webhook idempotency** — Meta retries; dedupe on `wamid`.

---

## 7. Execution Order

Phases run sequentially; 0→3 are blocking prerequisites for everything else. Phases 4–7 form the core product (contacts → inbox → templates → campaigns) and deliver a usable MVP. 8–12 layer on the differentiators. Each phase ends with working, testable UI wired to a real API — no stubbed screens carried forward.

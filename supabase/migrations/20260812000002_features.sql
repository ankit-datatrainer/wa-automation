-- WA Automations — templates, campaigns, automation, catalogue, billing, support.

create type template_status as enum ('draft', 'pending', 'approved', 'rejected', 'paused', 'disabled');
create type campaign_status as enum ('draft', 'scheduled', 'running', 'paused', 'completed', 'failed', 'cancelled');
create type audience_type as enum ('contacts', 'tags', 'groups', 'csv', 'broadcast');
create type chatbot_trigger as enum ('keyword', 'welcome', 'away', 'catch_all');
create type ticket_status as enum ('open', 'in_progress', 'waiting', 'resolved', 'closed');
create type ticket_priority as enum ('low', 'medium', 'high', 'urgent');

-- ---------------------------------------------------------------- templates
create table templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  name text not null,
  language text not null default 'en',
  category message_category not null,
  components jsonb not null,
  meta_template_id text,
  status template_status not null default 'draft',
  rejection_reason text,
  created_by uuid references users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Meta scopes template names by name+language.
  unique (organization_id, name, language)
);

create index on templates (organization_id, status);

alter table messages
  add constraint messages_template_fk
  foreign key (template_id) references templates (id) on delete set null;

-- Global, tenant-agnostic starter templates for the Template Library page.
create table template_library (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  industry text,
  language text not null default 'en',
  category message_category not null,
  components jsonb not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- campaigns
create table campaigns (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  name text not null,
  template_id uuid not null references templates (id) on delete restrict,
  audience_type audience_type not null,
  audience_config jsonb not null default '{}'::jsonb,
  variable_mapping jsonb not null default '{}'::jsonb,
  status campaign_status not null default 'draft',
  scheduled_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  stats jsonb not null default
    '{"total":0,"sent":0,"delivered":0,"read":0,"replied":0,"failed":0}'::jsonb,
  created_by uuid references users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index on campaigns (organization_id, created_at desc);
-- Drives the Scheduled Campaigns dispatcher.
create index campaigns_due on campaigns (scheduled_at)
  where status = 'scheduled';

create table campaign_recipients (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns (id) on delete cascade,
  contact_id uuid not null references contacts (id) on delete cascade,
  variables jsonb not null default '{}'::jsonb,
  status message_status not null default 'queued',
  wamid text,
  error jsonb,
  sent_at timestamptz,
  unique (campaign_id, contact_id)
);

create index on campaign_recipients (campaign_id, status);

alter table messages
  add constraint messages_campaign_fk
  foreign key (campaign_id) references campaigns (id) on delete set null;

-- ---------------------------------------------------------------- automation
create table flows (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  name text not null,
  definition jsonb not null default '{"nodes":[],"edges":[]}'::jsonb,
  meta_flow_id text,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table chatbots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  name text not null,
  description text,
  trigger_type chatbot_trigger not null default 'keyword',
  trigger_config jsonb not null default '{"keywords":[]}'::jsonb,
  flow_id uuid references flows (id) on delete set null,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index on chatbots (organization_id) where is_active;

-- The 21 prebuilt bots behind "Try this Template".
create table chatbot_library (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  industry text not null,
  definition jsonb not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table chatbot_executions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  chatbot_id uuid not null references chatbots (id) on delete cascade,
  contact_id uuid not null references contacts (id) on delete cascade,
  current_node text,
  context jsonb not null default '{}'::jsonb,
  status text not null default 'running',
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

create index on chatbot_executions (organization_id, started_at desc);
-- At most one live execution per contact per bot.
create unique index chatbot_executions_active
  on chatbot_executions (chatbot_id, contact_id)
  where status = 'running';

create table flow_submissions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  flow_id uuid not null references flows (id) on delete cascade,
  contact_id uuid references contacts (id) on delete set null,
  data jsonb not null default '{}'::jsonb,
  submitted_at timestamptz not null default now()
);

create index on flow_submissions (organization_id, submitted_at desc);

-- ---------------------------------------------------------------- catalogue
create table catalogs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  meta_catalog_id text,
  name text not null,
  created_at timestamptz not null default now()
);

create table products (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  catalog_id uuid references catalogs (id) on delete cascade,
  retailer_id text not null,
  name text not null,
  description text,
  price numeric(12, 2) not null default 0,
  currency char(3) not null default 'INR',
  image_url text,
  availability text not null default 'in stock',
  created_at timestamptz not null default now(),
  unique (organization_id, retailer_id)
);

-- ---------------------------------------------------------------- billing
create table wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  type text not null check (type in ('credit', 'debit')),
  amount numeric(12, 2) not null check (amount > 0),
  balance_after numeric(12, 2) not null,
  reference text,
  description text not null,
  created_at timestamptz not null default now()
);

create index on wallet_transactions (organization_id, created_at desc);

create table credit_history (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  conversation_id uuid references conversations (id) on delete set null,
  message_id uuid references messages (id) on delete set null,
  category message_category not null,
  cost numeric(10, 4) not null,
  currency char(3) not null default 'INR',
  created_at timestamptz not null default now()
);

create index on credit_history (organization_id, created_at desc);

create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  plan text not null,
  amount numeric(12, 2) not null,
  currency char(3) not null default 'INR',
  period_start timestamptz not null,
  period_end timestamptz not null,
  status text not null default 'active',
  invoice_url text,
  created_at timestamptz not null default now()
);

create index on subscriptions (organization_id, period_start desc);

-- Per-country, per-category conversation pricing; feeds the dashboard panel.
create table message_pricing (
  id uuid primary key default gen_random_uuid(),
  country char(2) not null,
  category message_category not null,
  price numeric(10, 4) not null,
  currency char(3) not null default 'INR',
  unique (country, category)
);

-- ---------------------------------------------------------------- support & ops
create table support_tickets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  subject text not null,
  status ticket_status not null default 'open',
  priority ticket_priority not null default 'medium',
  created_by uuid references users (id) on delete set null,
  assigned_to uuid references users (id) on delete set null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index on support_tickets (organization_id, status);

create table ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references support_tickets (id) on delete cascade,
  author_id uuid references users (id) on delete set null,
  body text not null,
  is_internal boolean not null default false,
  created_at timestamptz not null default now()
);

create table media_uploads (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  file_path text not null,
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null,
  meta_media_id text,
  uploaded_by uuid references users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table api_keys (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  name text not null,
  -- SHA-256 of the key; the plaintext is shown once at creation.
  key_hash text not null unique,
  key_prefix text not null,
  scopes jsonb not null default '[]'::jsonb,
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create table integrations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  provider text not null,
  config jsonb not null default '{}'::jsonb,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  unique (organization_id, provider)
);

create table ads_accounts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  meta_ad_account_id text not null,
  access_token_encrypted text,
  status text not null default 'connected',
  created_at timestamptz not null default now(),
  unique (organization_id)
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  user_id uuid references users (id) on delete cascade,
  title text not null,
  body text,
  href text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index on notifications (user_id, created_at desc) where read_at is null;

create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  actor_id uuid references users (id) on delete set null,
  action text not null,
  resource_type text,
  resource_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index on audit_logs (organization_id, created_at desc);

create trigger templates_updated_at before update on templates
  for each row execute function set_updated_at();
create trigger campaigns_updated_at before update on campaigns
  for each row execute function set_updated_at();
create trigger chatbots_updated_at before update on chatbots
  for each row execute function set_updated_at();
create trigger flows_updated_at before update on flows
  for each row execute function set_updated_at();

-- WA Automations — core tenancy, WABA connection, contacts, conversations.

create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";

-- ---------------------------------------------------------------- enums
create type role as enum ('owner', 'admin', 'manager', 'agent');
create type message_category as enum ('marketing', 'utility', 'authentication', 'service');
create type message_status as enum ('queued', 'sent', 'delivered', 'read', 'failed');
create type message_direction as enum ('inbound', 'outbound');
create type conversation_status as enum ('open', 'pending', 'closed');
create type opt_in_status as enum ('opted_in', 'opted_out', 'unknown');
create type quality_rating as enum ('high', 'medium', 'low', 'unknown');
create type waba_status as enum ('connected', 'disconnected', 'error');

-- ---------------------------------------------------------------- organizations
create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  plan text not null default 'trial',
  wallet_balance numeric(12, 2) not null default 0,
  currency char(3) not null default 'INR',
  trial_ends_at timestamptz,
  is_demo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Mirrors auth.users so we can join profile data without touching the auth schema.
create table users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  name text,
  phone text,
  country char(2),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  user_id uuid not null references users (id) on delete cascade,
  role role not null default 'agent',
  permissions jsonb not null default '[]'::jsonb,
  is_online boolean not null default false,
  last_active_at timestamptz,
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create index on organization_members (user_id);
create index on organization_members (organization_id);

-- ---------------------------------------------------------------- WABA
create table waba_accounts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  waba_id text not null,
  phone_number_id text not null,
  display_phone text not null,
  verified_name text,
  -- AES-256-GCM ciphertext, never the raw token.
  access_token_encrypted text not null,
  app_secret_encrypted text,
  verify_token text not null,
  quality_rating quality_rating not null default 'unknown',
  messaging_tier text not null default 'TIER_250',
  status waba_status not null default 'disconnected',
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  unique (organization_id)
);

-- ---------------------------------------------------------------- contacts
create table contacts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  wa_id text not null,
  name text,
  email text,
  attributes jsonb not null default '{}'::jsonb,
  opt_in_status opt_in_status not null default 'unknown',
  opt_in_updated_at timestamptz,
  source text,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- One contact per phone number per tenant; CSV imports upsert on this.
  unique (organization_id, wa_id)
);

create index on contacts (organization_id, created_at desc);
create index contacts_name_trgm on contacts using gin (name gin_trgm_ops);

create table tags (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  name text not null,
  color text not null default '#16A34A',
  created_at timestamptz not null default now(),
  unique (organization_id, name)
);

create table contact_tags (
  contact_id uuid not null references contacts (id) on delete cascade,
  tag_id uuid not null references tags (id) on delete cascade,
  primary key (contact_id, tag_id)
);

create index on contact_tags (tag_id);

create table groups (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  unique (organization_id, name)
);

create table contact_groups (
  contact_id uuid not null references contacts (id) on delete cascade,
  group_id uuid not null references groups (id) on delete cascade,
  primary key (contact_id, group_id)
);

create index on contact_groups (group_id);

-- ---------------------------------------------------------------- conversations
create table conversations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  contact_id uuid not null references contacts (id) on delete cascade,
  status conversation_status not null default 'open',
  assigned_to uuid references users (id) on delete set null,
  unread_count integer not null default 0,
  last_message_at timestamptz,
  last_message_preview text,
  -- Free-form replies are allowed only while this is in the future.
  session_expires_at timestamptz,
  created_at timestamptz not null default now(),
  unique (organization_id, contact_id)
);

create index on conversations (organization_id, last_message_at desc nulls last);
create index on conversations (assigned_to) where assigned_to is not null;
create index on conversations (organization_id, status);

create table messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  conversation_id uuid not null references conversations (id) on delete cascade,
  direction message_direction not null,
  type text not null,
  content jsonb not null default '{}'::jsonb,
  -- Meta's message id; the dedupe key for retried webhooks.
  wamid text,
  status message_status not null default 'queued',
  error jsonb,
  template_id uuid,
  campaign_id uuid,
  sent_by uuid references users (id) on delete set null,
  sent_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create unique index messages_wamid_key on messages (wamid) where wamid is not null;
create index on messages (conversation_id, sent_at desc);
create index on messages (organization_id, sent_at desc);

create table canned_messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  shortcode text not null,
  body text not null,
  created_at timestamptz not null default now(),
  unique (organization_id, shortcode)
);

-- ---------------------------------------------------------------- webhook intake
create table webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'whatsapp',
  payload jsonb not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  error text
);

create index on webhook_events (processed_at) where processed_at is null;

-- ---------------------------------------------------------------- triggers
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger organizations_updated_at before update on organizations
  for each row execute function set_updated_at();
create trigger users_updated_at before update on users
  for each row execute function set_updated_at();
create trigger contacts_updated_at before update on contacts
  for each row execute function set_updated_at();

-- Mirror new auth.users rows into public.users.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Keep the conversation summary and 24-hour window in step with new messages.
create or replace function touch_conversation()
returns trigger
language plpgsql
as $$
begin
  update conversations
  set
    last_message_at = new.sent_at,
    last_message_preview = left(coalesce(new.content ->> 'text', new.type), 120),
    unread_count = case
      when new.direction = 'inbound' then unread_count + 1
      else unread_count
    end,
    -- Only an inbound message reopens the free-form window.
    session_expires_at = case
      when new.direction = 'inbound' then new.sent_at + interval '24 hours'
      else session_expires_at
    end
  where id = new.conversation_id;
  return new;
end;
$$;

create trigger messages_touch_conversation
  after insert on messages
  for each row execute function touch_conversation();
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
-- Row Level Security. Every tenant table is readable only by members of its org.

-- Organizations the caller belongs to. STABLE + security definer so the
-- membership lookup itself is not subject to RLS (which would recurse).
create or replace function auth_org_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select organization_id
  from organization_members
  where user_id = auth.uid();
$$;

create or replace function auth_has_role(minimum role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from organization_members m
    where m.user_id = auth.uid()
      and case m.role
            when 'owner' then 4
            when 'admin' then 3
            when 'manager' then 2
            else 1
          end
          >= case minimum
               when 'owner' then 4
               when 'admin' then 3
               when 'manager' then 2
               else 1
             end
  );
$$;

-- Tables keyed directly by organization_id get an identical tenant policy.
do $$
declare
  t text;
  tenant_tables text[] := array[
    'waba_accounts', 'contacts', 'tags', 'groups', 'conversations', 'messages',
    'canned_messages', 'templates', 'campaigns', 'flows', 'chatbots',
    'chatbot_executions', 'flow_submissions', 'catalogs', 'products',
    'wallet_transactions', 'credit_history', 'subscriptions', 'support_tickets',
    'media_uploads', 'api_keys', 'integrations', 'ads_accounts', 'notifications',
    'audit_logs'
  ];
begin
  foreach t in array tenant_tables loop
    execute format('alter table %I enable row level security', t);
    execute format(
      'create policy tenant_access on %I
         for all
         using (organization_id in (select auth_org_ids()))
         with check (organization_id in (select auth_org_ids()))',
      t
    );
  end loop;
end;
$$;

-- ---------------------------------------------------------------- organizations
alter table organizations enable row level security;

create policy org_read on organizations
  for select using (id in (select auth_org_ids()));

create policy org_update on organizations
  for update using (id in (select auth_org_ids()) and auth_has_role('admin'));

-- ---------------------------------------------------------------- users
alter table users enable row level security;

create policy user_self on users
  for all using (id = auth.uid()) with check (id = auth.uid());

-- Teammates are visible so the inbox can show assignee names.
create policy user_teammates on users
  for select using (
    exists (
      select 1
      from organization_members m
      where m.user_id = users.id
        and m.organization_id in (select auth_org_ids())
    )
  );

-- ---------------------------------------------------------------- membership
alter table organization_members enable row level security;

create policy member_read on organization_members
  for select using (organization_id in (select auth_org_ids()));

create policy member_manage on organization_members
  for all
  using (organization_id in (select auth_org_ids()) and auth_has_role('admin'))
  with check (organization_id in (select auth_org_ids()) and auth_has_role('admin'));

-- ---------------------------------------------------------------- join tables
-- These lack organization_id, so they inherit tenancy through their parent row.
alter table contact_tags enable row level security;
create policy contact_tags_tenant on contact_tags
  for all
  using (exists (
    select 1 from contacts c
    where c.id = contact_tags.contact_id
      and c.organization_id in (select auth_org_ids())
  ))
  with check (exists (
    select 1 from contacts c
    where c.id = contact_tags.contact_id
      and c.organization_id in (select auth_org_ids())
  ));

alter table contact_groups enable row level security;
create policy contact_groups_tenant on contact_groups
  for all
  using (exists (
    select 1 from contacts c
    where c.id = contact_groups.contact_id
      and c.organization_id in (select auth_org_ids())
  ))
  with check (exists (
    select 1 from contacts c
    where c.id = contact_groups.contact_id
      and c.organization_id in (select auth_org_ids())
  ));

alter table campaign_recipients enable row level security;
create policy campaign_recipients_tenant on campaign_recipients
  for all
  using (exists (
    select 1 from campaigns c
    where c.id = campaign_recipients.campaign_id
      and c.organization_id in (select auth_org_ids())
  ))
  with check (exists (
    select 1 from campaigns c
    where c.id = campaign_recipients.campaign_id
      and c.organization_id in (select auth_org_ids())
  ));

alter table ticket_messages enable row level security;
create policy ticket_messages_tenant on ticket_messages
  for all
  using (exists (
    select 1 from support_tickets t
    where t.id = ticket_messages.ticket_id
      and t.organization_id in (select auth_org_ids())
  ))
  with check (exists (
    select 1 from support_tickets t
    where t.id = ticket_messages.ticket_id
      and t.organization_id in (select auth_org_ids())
  ));

-- ---------------------------------------------------------------- shared catalogs
-- Readable by any signed-in user; writable only via the service role.
alter table template_library enable row level security;
create policy template_library_read on template_library
  for select to authenticated using (true);

alter table chatbot_library enable row level security;
create policy chatbot_library_read on chatbot_library
  for select to authenticated using (true);

alter table message_pricing enable row level security;
create policy message_pricing_read on message_pricing
  for select to authenticated using (true);

-- ---------------------------------------------------------------- service-only
-- No policies: only the service role (which bypasses RLS) may touch these.
alter table webhook_events enable row level security;

-- ---------------------------------------------------------------- realtime
-- Powers live inbox updates.
alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table conversations;
-- Global reference data: India conversation pricing and the prebuilt chatbot library.

-- Meta's per-conversation rates for India (INR). Update as Meta revises pricing.
insert into message_pricing (country, category, price, currency) values
  ('IN', 'marketing', 0.7846, 'INR'),
  ('IN', 'utility', 0.1150, 'INR'),
  ('IN', 'authentication', 0.1250, 'INR'),
  ('IN', 'service', 0.0000, 'INR')
on conflict (country, category) do update set price = excluded.price;

-- A minimal two-node starter flow; the builder replaces it on first edit.
create or replace function starter_flow(greeting text, prompt text)
returns jsonb
language sql
immutable
as $$
  select jsonb_build_object(
    'nodes', jsonb_build_array(
      jsonb_build_object(
        'id', 'start',
        'type', 'send_message',
        'position', jsonb_build_object('x', 0, 'y', 0),
        'data', jsonb_build_object('text', greeting)
      ),
      jsonb_build_object(
        'id', 'ask',
        'type', 'ask_question',
        'position', jsonb_build_object('x', 0, 'y', 160),
        'data', jsonb_build_object('text', prompt, 'variable', 'answer')
      )
    ),
    'edges', jsonb_build_array(
      jsonb_build_object('id', 'e1', 'source', 'start', 'target', 'ask')
    )
  );
$$;

insert into chatbot_library (title, description, industry, sort_order, definition) values
  ('Banking & Finance Support',
   'High-priority banking chatbot helper for card blocking, fraud reporting, transaction issues, and accounts FAQ.',
   'Banking', 1,
   starter_flow('Welcome to secure banking support. How can we help?', 'Choose: Block card, Report fraud, Transaction issue, or Account FAQ.')),

  ('Delivery & Logistics Tracking',
   'Logistics tracking chatbot for checking package status via Tracking ID, reporting delivery issues, or agent handoff.',
   'Logistics', 2,
   starter_flow('Hi! I can help track your shipment.', 'Please share your Tracking ID.')),

  ('Restaurant Support & Feedback',
   'Restaurant customer service chatbot for missing items reporting, FAQ searches, and feedback collection.',
   'Restaurant', 3,
   starter_flow('Thanks for dining with us!', 'Is this about a missing item, a question, or feedback?')),

  ('Ecommerce Support Flow',
   'Complete ecommerce support flow handling order tracking with Order ID verification, returns/refunds processing, and product FAQs.',
   'Ecommerce', 4,
   starter_flow('Welcome to our store support.', 'Please share your Order ID to continue.')),

  ('Customer Support Chatbot',
   'Complete customer support flow with ticket creation, FAQ search, and agent assignment. Customers can raise issues and get help fast.',
   'General', 5,
   starter_flow('Hello! How can we help you today?', 'Describe your issue and we will create a ticket.')),

  ('SaaS Product Demo Booking',
   'Software demo booking flow with product interest qualification, company details collection, and calendar scheduling.',
   'SaaS', 6,
   starter_flow('Thanks for your interest in a demo!', 'Which product would you like to see?')),

  ('Car Service & Maintenance',
   'Automotive service scheduler with vehicle information, service type selection, appointment booking, and reminders.',
   'Automotive', 7,
   starter_flow('Let us book your car service.', 'What is your vehicle registration number?')),

  ('Travel Package Booking',
   'Complete travel booking experience with destination selection, package customization, traveler details, and payment.',
   'Travel', 8,
   starter_flow('Ready to plan your trip?', 'Which destination are you interested in?')),

  ('Healthcare Appointment Booking',
   'Clinic appointment scheduler covering department selection, doctor availability, and confirmation reminders.',
   'Healthcare', 9,
   starter_flow('Welcome to our clinic.', 'Which department do you need an appointment with?')),

  ('Real Estate Lead Qualification',
   'Property enquiry flow capturing budget, location preference, property type and site-visit scheduling.',
   'Real Estate', 10,
   starter_flow('Looking for a property?', 'What is your preferred location and budget?')),

  ('Education Course Enquiry',
   'Course enquiry bot collecting programme interest, qualification and counsellor callback scheduling.',
   'Education', 11,
   starter_flow('Interested in our courses?', 'Which programme would you like to know about?')),

  ('Insurance Policy Assistant',
   'Policy support flow for premium reminders, claim status checks, and new policy quotes.',
   'Insurance', 12,
   starter_flow('Welcome to policy support.', 'Do you need a claim status, premium info, or a new quote?')),

  ('Fitness & Gym Membership',
   'Membership bot handling plan comparison, trial booking, and renewal reminders.',
   'Fitness', 13,
   starter_flow('Ready to start training?', 'Would you like a trial session or membership details?')),

  ('Salon & Spa Booking',
   'Appointment flow for service selection, stylist preference, slot booking and confirmations.',
   'Beauty', 14,
   starter_flow('Book your next appointment.', 'Which service would you like?')),

  ('Event Registration',
   'Event bot handling registration, ticket type selection, attendee details and reminders.',
   'Events', 15,
   starter_flow('Welcome to the event desk.', 'Which ticket type would you like to register for?')),

  ('Retail Store Locator',
   'Helps customers find the nearest store, check stock availability and opening hours.',
   'Retail', 16,
   starter_flow('Looking for a store near you?', 'Share your city or pincode.')),

  ('Utility Bill Payment Reminder',
   'Bill reminder and payment flow with due date lookup and payment link delivery.',
   'Utilities', 17,
   starter_flow('Check your bill status here.', 'Please share your consumer number.')),

  ('Job Application Screening',
   'Recruitment bot collecting role interest, experience, resume upload and interview scheduling.',
   'Recruitment', 18,
   starter_flow('Thanks for applying!', 'Which role are you applying for?')),

  ('Order Feedback & NPS',
   'Post-purchase feedback flow with star rating, NPS score and open comments.',
   'General', 19,
   starter_flow('How did we do?', 'Rate your experience from 1 to 5.')),

  ('Abandoned Cart Recovery',
   'Re-engagement flow reminding customers of items left in cart with a discount offer.',
   'Ecommerce', 20,
   starter_flow('You left something behind!', 'Would you like to complete your order?')),

  ('Lead Capture & Routing',
   'Generic lead qualification bot capturing name, requirement and budget, then routing to the right agent.',
   'General', 21,
   starter_flow('Thanks for reaching out!', 'Tell us what you are looking for.'));

drop function starter_flow(text, text);

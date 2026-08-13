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

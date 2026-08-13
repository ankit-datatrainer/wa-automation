-- Platform-level super admin, organization suspension, and chatbot runtime support.

-- ---------------------------------------------------------------- super admin
alter table users add column if not exists is_super_admin boolean not null default false;

-- Organizations can be suspended platform-wide without deleting their data.
alter table organizations add column if not exists is_suspended boolean not null default false;
alter table organizations add column if not exists suspended_reason text;
alter table organizations add column if not exists suspended_at timestamptz;

create index if not exists users_super_admin on users (id) where is_super_admin;

/**
 * True when the caller is a platform super admin.
 * SECURITY DEFINER so the lookup itself bypasses RLS on `users` and cannot recurse.
 */
create or replace function is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select u.is_super_admin from users u where u.id = auth.uid()),
    false
  );
$$;

-- Super admins bypass tenant isolation on every org-scoped table.
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
    execute format('drop policy if exists super_admin_access on %I', t);
    execute format(
      'create policy super_admin_access on %I
         for all
         using (is_super_admin())
         with check (is_super_admin())',
      t
    );
  end loop;
end;
$$;

drop policy if exists super_admin_orgs on organizations;
create policy super_admin_orgs on organizations
  for all using (is_super_admin()) with check (is_super_admin());

drop policy if exists super_admin_users on users;
create policy super_admin_users on users
  for all using (is_super_admin()) with check (is_super_admin());

drop policy if exists super_admin_members on organization_members;
create policy super_admin_members on organization_members
  for all using (is_super_admin()) with check (is_super_admin());

-- ---------------------------------------------------------------- platform audit
-- Separate from per-tenant audit_logs: records actions taken *across* tenants.
create table if not exists platform_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references users (id) on delete set null,
  action text not null,
  target_type text,
  target_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists platform_audit_created on platform_audit_logs (created_at desc);

alter table platform_audit_logs enable row level security;

drop policy if exists platform_audit_super_admin on platform_audit_logs;
create policy platform_audit_super_admin on platform_audit_logs
  for all using (is_super_admin()) with check (is_super_admin());

-- ---------------------------------------------------------------- chatbot runtime
-- The flow engine parks an execution here while it waits for the contact's reply.
alter table chatbot_executions
  add column if not exists awaiting_input boolean not null default false;
alter table chatbot_executions
  add column if not exists resume_at timestamptz;

create index if not exists chatbot_executions_waiting
  on chatbot_executions (contact_id)
  where status = 'running' and awaiting_input;

-- Delayed steps are picked up by the scheduler once resume_at has passed.
create index if not exists chatbot_executions_resume
  on chatbot_executions (resume_at)
  where status = 'running' and resume_at is not null;

-- ---------------------------------------------------------------- opt-out log
-- Compliance trail for STOP/START keywords, separate from the contact's status.
create table if not exists opt_in_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  contact_id uuid not null references contacts (id) on delete cascade,
  event text not null check (event in ('opted_in', 'opted_out')),
  source text not null default 'keyword',
  keyword text,
  created_at timestamptz not null default now()
);

create index if not exists opt_in_events_org on opt_in_events (organization_id, created_at desc);

alter table opt_in_events enable row level security;

drop policy if exists opt_in_events_tenant on opt_in_events;
create policy opt_in_events_tenant on opt_in_events
  for all
  using (organization_id in (select auth_org_ids()) or is_super_admin())
  with check (organization_id in (select auth_org_ids()) or is_super_admin());

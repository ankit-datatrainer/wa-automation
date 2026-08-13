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

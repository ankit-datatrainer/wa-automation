-- Commerce orders and payment-gateway top-ups.

-- ---------------------------------------------------------------- catalogue
alter table catalogs add column if not exists is_default boolean not null default false;
alter table catalogs add column if not exists last_synced_at timestamptz;
alter table catalogs add column if not exists product_count integer not null default 0;

-- One catalog per organization is the one products sync to.
create unique index if not exists catalogs_one_default
  on catalogs (organization_id)
  where is_default;

-- ---------------------------------------------------------------- orders
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  contact_id uuid not null references contacts (id) on delete cascade,
  conversation_id uuid references conversations (id) on delete set null,
  -- The message the order arrived on; the dedupe key for webhook redelivery.
  wamid text,
  catalog_id text,
  items jsonb not null default '[]'::jsonb,
  total numeric(12, 2) not null default 0,
  currency char(3) not null default 'INR',
  note text,
  status text not null default 'placed'
    check (status in ('placed', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists orders_wamid_key on orders (wamid) where wamid is not null;
create index if not exists orders_org_created on orders (organization_id, created_at desc);
create index if not exists orders_org_status on orders (organization_id, status);

alter table orders enable row level security;

drop policy if exists orders_tenant on orders;
create policy orders_tenant on orders
  for all
  using (organization_id in (select auth_org_ids()) or is_super_admin())
  with check (organization_id in (select auth_org_ids()) or is_super_admin());

drop trigger if exists orders_updated_at on orders;
create trigger orders_updated_at before update on orders
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------- payments
create table if not exists payment_orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  provider text not null default 'razorpay',
  -- Gateway's order id; unique so a redelivered webhook cannot double-credit.
  provider_order_id text not null unique,
  provider_payment_id text,
  amount numeric(12, 2) not null check (amount > 0),
  currency char(3) not null default 'INR',
  status text not null default 'created'
    check (status in ('created', 'paid', 'failed', 'refunded')),
  created_by uuid references users (id) on delete set null,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

create index if not exists payment_orders_org on payment_orders (organization_id, created_at desc);

alter table payment_orders enable row level security;

drop policy if exists payment_orders_tenant on payment_orders;
create policy payment_orders_tenant on payment_orders
  for all
  using (organization_id in (select auth_org_ids()) or is_super_admin())
  with check (organization_id in (select auth_org_ids()) or is_super_admin());
-- Subscription plans: platform-defined tiers, billed monthly or yearly, and
-- the record of which organization is on which plan and until when.

create type billing_cycle as enum ('monthly', 'yearly');
create type subscription_status as enum ('active', 'expired', 'cancelled', 'trialing');

-- ---------------------------------------------------------------- plans
-- The catalog of plans a super admin can assign. Not tenant-scoped — plans are
-- platform-wide, the same way a SaaS pricing page is the same for everyone.
create table if not exists plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  -- Price per billing cycle; a monthly and yearly row for "Pro" are two plans.
  price numeric(12, 2) not null default 0,
  currency char(3) not null default 'INR',
  billing_cycle billing_cycle not null default 'monthly',
  -- Limits enforced elsewhere in the app (messaging tier, seats, etc.).
  message_limit integer,
  contact_limit integer,
  agent_limit integer,
  features jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists plans_active on plans (sort_order) where is_active;

alter table plans enable row level security;

-- Every signed-in user can see the plan catalog (e.g. an upgrade page);
-- only super admins can change it.
drop policy if exists plans_read on plans;
create policy plans_read on plans
  for select to authenticated using (true);

drop policy if exists plans_super_admin_write on plans;
create policy plans_super_admin_write on plans
  for all using (is_super_admin()) with check (is_super_admin());

drop trigger if exists plans_updated_at on plans;
create trigger plans_updated_at before update on plans
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------- assignment
-- The organization's current (and historical) subscription. One active row
-- per org at a time; history is kept by inserting new rows rather than
-- overwriting, so "how long has this tenant been paying" stays answerable.
create table if not exists org_subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  plan_id uuid not null references plans (id) on delete restrict,
  status subscription_status not null default 'active',
  -- Duration in whole billing cycles (e.g. 3 = "quarterly" on a monthly plan).
  cycle_count integer not null default 1 check (cycle_count > 0),
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  cancelled_at timestamptz,
  assigned_by uuid references users (id) on delete set null,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists org_subscriptions_org on org_subscriptions (organization_id, created_at desc);
create index if not exists org_subscriptions_active on org_subscriptions (organization_id) where status = 'active';
-- Drives the "expiring soon" / auto-expire sweep.
create index if not exists org_subscriptions_ends_at on org_subscriptions (ends_at) where status = 'active';

alter table org_subscriptions enable row level security;

drop policy if exists org_subscriptions_tenant_read on org_subscriptions;
create policy org_subscriptions_tenant_read on org_subscriptions
  for select
  using (organization_id in (select auth_org_ids()) or is_super_admin());

drop policy if exists org_subscriptions_super_admin_write on org_subscriptions;
create policy org_subscriptions_super_admin_write on org_subscriptions
  for insert with check (is_super_admin());

drop policy if exists org_subscriptions_super_admin_update on org_subscriptions;
create policy org_subscriptions_super_admin_update on org_subscriptions
  for update using (is_super_admin()) with check (is_super_admin());

-- ---------------------------------------------------------------- seed plans
-- Guarded so re-running this migration file doesn't duplicate the catalog —
-- there's no natural unique key on (name, billing_cycle) since a platform
-- admin may legitimately create two plans with the same name later.
insert into plans (name, description, price, currency, billing_cycle, message_limit, contact_limit, agent_limit, features, sort_order)
select
  seed.name, seed.description, seed.price, seed.currency,
  -- VALUES rows resolve to text here, not the "unknown" literal type that
  -- would auto-cast on a direct INSERT, so the enum needs an explicit cast.
  seed.billing_cycle::billing_cycle,
  seed.message_limit, seed.contact_limit, seed.agent_limit, seed.features, seed.sort_order
from (values
  ('Starter', 'For small teams getting started with WhatsApp automation.', 999, 'INR', 'monthly', 1000, 500, 2,
   '["1,000 conversations/month", "500 contacts", "2 agent seats", "Basic chatbot flows", "Email support"]'::jsonb, 1),
  ('Starter', 'For small teams getting started with WhatsApp automation.', 9990, 'INR', 'yearly', 1000, 500, 2,
   '["1,000 conversations/month", "500 contacts", "2 agent seats", "Basic chatbot flows", "Email support", "2 months free"]'::jsonb, 1),
  ('Growth', 'For growing businesses running regular campaigns.', 2999, 'INR', 'monthly', 10000, 5000, 5,
   '["10,000 conversations/month", "5,000 contacts", "5 agent seats", "Unlimited chatbot flows", "Campaign automation", "Priority support"]'::jsonb, 2),
  ('Growth', 'For growing businesses running regular campaigns.', 29990, 'INR', 'yearly', 10000, 5000, 5,
   '["10,000 conversations/month", "5,000 contacts", "5 agent seats", "Unlimited chatbot flows", "Campaign automation", "Priority support", "2 months free"]'::jsonb, 2),
  ('Enterprise', 'For high-volume senders needing full platform access.', 9999, 'INR', 'monthly', null, null, null,
   '["Unlimited conversations", "Unlimited contacts", "Unlimited agent seats", "Dedicated onboarding", "Custom integrations", "SLA support"]'::jsonb, 3),
  ('Enterprise', 'For high-volume senders needing full platform access.', 99990, 'INR', 'yearly', null, null, null,
   '["Unlimited conversations", "Unlimited contacts", "Unlimited agent seats", "Dedicated onboarding", "Custom integrations", "SLA support", "2 months free"]'::jsonb, 3)
) as seed(name, description, price, currency, billing_cycle, message_limit, contact_limit, agent_limit, features, sort_order)
where not exists (select 1 from plans);

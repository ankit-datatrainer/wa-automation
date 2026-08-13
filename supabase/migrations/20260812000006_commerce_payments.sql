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

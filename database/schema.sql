-- iPhoneHub PostgreSQL schema for Supabase.
-- Run this in Supabase Dashboard > SQL Editor.
-- Create users through Supabase Authentication; profiles references auth.users.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'customer' check (role in ('customer','admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  model text not null unique check (lower(model) like '%iphone%'),
  description text not null default '',
  base_price numeric(12,2) not null check (base_price > 0),
  image_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete restrict,
  storage text not null,
  color text not null,
  condition text not null default 'brand_new'
    check (condition in ('brand_new','pre_owned','refurbished')),
  price numeric(12,2) not null check (price > 0),
  stock integer not null default 0 check (stock >= 0),
  created_at timestamptz not null default now(),
  unique(product_id, storage, color, condition)
);

-- Individual device identity is private inventory data; do not expose IMEI in public APIs.
create table if not exists public.inventory_units (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references public.product_variants(id) on delete restrict,
  imei_or_serial text not null unique,
  unit_status text not null default 'available'
    check (unit_status in ('available','reserved','sold','returned','service')),
  created_at timestamptz not null default now()
);

create table if not exists public.carts (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(customer_id)
);

create table if not exists public.cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.carts(id) on delete cascade,
  variant_id uuid not null references public.product_variants(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  unique(cart_id, variant_id)
);

create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  discount_type text not null check (discount_type in ('percentage','fixed')),
  discount_value numeric(12,2) not null check (discount_value > 0),
  minimum_spend numeric(12,2) not null default 0 check (minimum_spend >= 0),
  expires_at timestamptz,
  usage_limit integer check (usage_limit is null or usage_limit >= 0),
  used_count integer not null default 0 check (used_count >= 0),
  is_active boolean not null default true
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references auth.users(id) on delete restrict,
  status text not null default 'pending_payment'
    check (status in ('pending_payment','paid','processing','shipped','delivered','cancelled','expired','payment_failed')),
  subtotal numeric(12,2) not null check (subtotal >= 0),
  discount numeric(12,2) not null default 0 check (discount >= 0),
  shipping_fee numeric(12,2) not null default 0 check (shipping_fee >= 0),
  total numeric(12,2) not null check (total >= 0),
  coupon_id uuid references public.coupons(id) on delete set null,
  shipping_name text,
  shipping_phone text,
  shipping_address text,
  idempotency_key text,
  payment_reference text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(customer_id, idempotency_key)
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  variant_id uuid references public.product_variants(id) on delete set null,
  product_name_snapshot text not null,
  variant_snapshot text not null,
  unit_price numeric(12,2) not null check (unit_price >= 0),
  quantity integer not null check (quantity > 0),
  line_total numeric(12,2) not null check (line_total >= 0)
);

create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references public.product_variants(id) on delete restrict,
  previous_stock integer not null,
  new_stock integer not null check (new_stock >= 0),
  quantity_change integer not null,
  reason text not null,
  actor uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.trade_in_requests (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references auth.users(id) on delete cascade,
  iphone_model text not null check (lower(iphone_model) like '%iphone%'),
  storage text not null,
  condition text not null check (condition in ('excellent','good','fair','poor')),
  battery_health integer not null check (battery_health between 1 and 100),
  notes text default '',
  quoted_value numeric(12,2),
  status text not null default 'submitted'
    check (status in ('submitted','under_review','quoted','accepted','rejected','completed')),
  created_at timestamptz not null default now()
);

create table if not exists public.payment_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_event_id text not null unique,
  order_id uuid references public.orders(id) on delete restrict,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  old_status text,
  new_status text not null,
  actor uuid references auth.users(id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists idx_products_active_created on public.products(is_active, created_at desc);
create index if not exists idx_variants_product on public.product_variants(product_id);
create index if not exists idx_orders_customer_created on public.orders(customer_id, created_at desc);
create index if not exists idx_tradeins_customer on public.trade_in_requests(customer_id, created_at desc);

-- Create a profile automatically when a customer registers with Supabase Auth.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles(id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name',''));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Atomic stock adjustment + audit record. Called by the protected backend.
create or replace function public.adjust_variant_stock(
  p_variant_id uuid,
  p_quantity_change integer,
  p_reason text,
  p_actor uuid
)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  old_qty integer;
  new_qty integer;
begin
  if p_quantity_change = 0 or length(trim(coalesce(p_reason,''))) = 0 then
    raise exception 'A non-zero adjustment and reason are required';
  end if;

  select stock into old_qty
  from public.product_variants
  where id = p_variant_id
  for update;

  if old_qty is null then raise exception 'Variant not found'; end if;
  new_qty := old_qty + p_quantity_change;
  if new_qty < 0 then raise exception 'Insufficient stock'; end if;

  update public.product_variants set stock = new_qty where id = p_variant_id;
  insert into public.stock_movements(variant_id, previous_stock, new_stock, quantity_change, reason, actor)
  values (p_variant_id, old_qty, new_qty, p_quantity_change, p_reason, p_actor);

  return jsonb_build_object('variant_id', p_variant_id, 'previous_stock', old_qty, 'new_stock', new_qty);
end;
$$;

-- RLS: browser-side users cannot access tables directly by default.
-- Backend uses the Supabase secret/service key; all authorization must be checked in Express.
alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.inventory_units enable row level security;
alter table public.carts enable row level security;
alter table public.cart_items enable row level security;
alter table public.coupons enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.stock_movements enable row level security;
alter table public.trade_in_requests enable row level security;
alter table public.payment_events enable row level security;
alter table public.order_status_history enable row level security;

-- No permissive public policies are created. The backend service key bypasses RLS.
-- Never send SUPABASE_SECRET_KEY to the React application.

-- Seed a few example iPhones. Add more models/variants through the admin API or SQL.
insert into public.products(name, model, description, base_price, image_url)
values
('Apple iPhone 13', 'iPhone 13', 'Apple iPhone 13 smartphone.', 23990, null),
('Apple iPhone 14', 'iPhone 14', 'Apple iPhone 14 smartphone.', 28990, null),
('Apple iPhone 15', 'iPhone 15', 'Apple iPhone 15 smartphone.', 34990, null),
('Apple iPhone 16 Pro', 'iPhone 16 Pro', 'Apple iPhone 16 Pro smartphone.', 59990, null),
('Apple iPhone 17 Pro', 'iPhone 17 Pro', 'Apple iPhone 17 Pro smartphone.', 69990, null)
on conflict do nothing;

-- HLM Book Sales Management — Database Schema (Postgres / Supabase)

create table customers (
  id uuid primary key default gen_random_uuid(),
  whatsapp_name text not null,
  whatsapp_number text not null,
  address text,
  receiver_name text,
  receiver_phone text,
  whatsapp_group text,
  created_at timestamptz not null default now()
);

create table books (
  id uuid primary key default gen_random_uuid(),
  publisher text not null,
  isbn text,
  title text not null,
  format text not null check (format in ('PB', 'HC')),
  price_gbp numeric(10,2),
  price_idr numeric(12,0) not null,
  eta date,
  status text not null default 'available' check (status in ('available', 'oos')),
  created_at timestamptz not null default now()
);

create table orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  book_id uuid not null references books(id) on delete restrict,
  qty integer not null check (qty > 0),
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'dp_paid', 'paid_off', 'queued', 'shipped')),
  created_at timestamptz not null default now()
);

create table payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  kind text not null check (kind in ('dp', 'pelunasan')),
  amount numeric(12,0) not null,
  paid_at date not null,
  bank_account text,
  created_at timestamptz not null default now()
);

create table shipments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  expedition text,
  tracking_number text,
  queue_no integer,
  shipped_at date,
  created_at timestamptz not null default now()
);

create index idx_orders_customer on orders(customer_id);
create index idx_orders_book on orders(book_id);
create index idx_payments_order on payments(order_id);
create index idx_shipments_order on shipments(order_id);

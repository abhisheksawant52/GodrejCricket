create table if not exists public.registrations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  type text not null check (type in ('Player', 'Owner', 'Audience')),
  name text not null,
  phone text not null,
  email text not null,
  apartment text,
  details jsonb not null default '{}'::jsonb,
  payment_status text not null default 'Pending' check (payment_status in ('Pending', 'Paid')),
  payment_reference text
);
alter table public.registrations enable row level security;
-- Keep this table private. The Vercel API accesses it using the service role key.

-- Shared, admin-only auction state. The Vercel API accesses it with the service role key.
create table if not exists public.gnpl_auction_state (
  id text primary key,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.gnpl_auction_state enable row level security;

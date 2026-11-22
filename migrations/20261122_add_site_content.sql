create table if not exists public.site_content (
  id text primary key check (id = 'public'),
  schedule jsonb not null default '[]'::jsonb,
  announcements jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.site_content enable row level security;
-- The Vercel API reads and writes this table using the Supabase service role key.

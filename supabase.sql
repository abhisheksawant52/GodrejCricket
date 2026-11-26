create table if not exists public.registrations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  type text not null check (type in ('Player', 'Owner', 'Audience', 'Sponsor')),
  name text not null,
  phone text not null,
  email text not null,
  apartment text,
  details jsonb not null default '{}'::jsonb,
  payment_status text not null default 'Pending' check (payment_status in ('Pending', 'Paid')),
  payment_reference text
);
-- Permit sponsor pledges submitted through the public sponsorship form.
alter table public.registrations drop constraint if exists registrations_type_check;
alter table public.registrations add constraint registrations_type_check check (type in ('Player', 'Owner', 'Audience', 'Sponsor'));
alter table public.registrations enable row level security;
-- Keep this table private. The Vercel API accesses it using the service role key.

create table if not exists public.site_content (
  id text primary key check (id = 'public'),
  schedule jsonb not null default '[]'::jsonb,
  announcements jsonb not null default '[]'::jsonb,
  player_registration_open boolean default null,
  updated_at timestamptz not null default now()
);
alter table public.site_content add column if not exists player_registration_open boolean default null;
alter table public.site_content enable row level security;
-- The Vercel API accesses site content using the service role key.

-- Seed the two requested community sponsors. These are in-kind offers, so no
-- phone number or cash amount is fabricated. Re-running this file is safe.
insert into public.registrations (type, name, phone, email, apartment, details, payment_status, payment_reference)
select 'Sponsor', 'Sanjay Bajaj', '', '', 'C-1705', jsonb_build_object(
  'wing', 'C', 'flat_no', '1705', 'sponsorship_area', 'Snacks & refreshments',
  'sponsorship_type', 'In-kind', 'contribution_amount', '',
  'contribution_details', 'Snack sponsor', 'organization_name', 'Sanjay Bajaj',
  'public_showcase_permission', 'yes'
), 'Pending', ''
where not exists (select 1 from public.registrations where type = 'Sponsor' and lower(name) = lower('Sanjay Bajaj') and (apartment = 'C-1705' or (details->>'wing' = 'C' and details->>'flat_no' = '1705')));

insert into public.registrations (type, name, phone, email, apartment, details, payment_status, payment_reference)
select 'Sponsor', 'Anand Dubey', '', '', 'B-2201', jsonb_build_object(
  'wing', 'B', 'flat_no', '2201', 'sponsorship_area', 'Cricket equipment',
  'sponsorship_type', 'In-kind', 'contribution_amount', '',
  'contribution_details', 'Ball box sponsor', 'organization_name', 'Anand Dubey',
  'public_showcase_permission', 'yes'
), 'Pending', ''
where not exists (select 1 from public.registrations where type = 'Sponsor' and lower(name) = lower('Anand Dubey') and (apartment = 'B-2201' or (details->>'wing' = 'B' and details->>'flat_no' = '2201')));


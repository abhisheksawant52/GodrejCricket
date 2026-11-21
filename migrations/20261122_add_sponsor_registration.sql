-- Run once in the Supabase SQL editor to enable sponsorship registrations.
alter table public.registrations
  drop constraint if exists registrations_type_check;

alter table public.registrations
  add constraint registrations_type_check
  check (type in ('Player', 'Owner', 'Audience', 'Sponsor'));

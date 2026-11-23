-- Run once in the Supabase SQL editor to enable sponsorship registrations.
alter table public.registrations
  drop constraint if exists registrations_type_check;

alter table public.registrations
  add constraint registrations_type_check
  check (type in ('Player', 'Owner', 'Audience', 'Sponsor'));

-- Add the community sponsors requested for the GNPL sponsor tab and public showcase.
-- Safe to re-run: update a matching sponsor record or insert it if it does not exist.

update public.registrations
set apartment = 'C-1705',
    details = coalesce(details, '{}'::jsonb) || jsonb_build_object(
      'wing', 'C',
      'flat_no', '1705',
      'sponsorship_area', 'Snacks & refreshments',
      'sponsorship_type', 'In-kind',
      'contribution_amount', '',
      'contribution_details', 'Snack sponsor',
      'organization_name', 'Sanjay Bajaj',
      'public_showcase_permission', 'yes'
    )
where type = 'Sponsor'
  and lower(name) = lower('Sanjay Bajaj')
  and (apartment = 'C-1705' or (details->>'wing' = 'C' and details->>'flat_no' = '1705'));

insert into public.registrations (type, name, phone, email, apartment, details, payment_status, payment_reference)
select 'Sponsor', 'Sanjay Bajaj', '', '', 'C-1705', jsonb_build_object(
  'wing', 'C', 'flat_no', '1705',
  'sponsorship_area', 'Snacks & refreshments',
  'sponsorship_type', 'In-kind', 'contribution_amount', '',
  'contribution_details', 'Snack sponsor',
  'organization_name', 'Sanjay Bajaj', 'public_showcase_permission', 'yes'
), 'Pending', ''
where not exists (
  select 1 from public.registrations
  where type = 'Sponsor' and lower(name) = lower('Sanjay Bajaj')
    and (apartment = 'C-1705' or (details->>'wing' = 'C' and details->>'flat_no' = '1705'))
);

update public.registrations
set apartment = 'B-2201',
    details = coalesce(details, '{}'::jsonb) || jsonb_build_object(
      'wing', 'B',
      'flat_no', '2201',
      'sponsorship_area', 'Cricket equipment',
      'sponsorship_type', 'In-kind',
      'contribution_amount', '',
      'contribution_details', 'Ball box sponsor',
      'organization_name', 'Anand Dubey',
      'public_showcase_permission', 'yes'
    )
where type = 'Sponsor'
  and lower(name) = lower('Anand Dubey')
  and (apartment = 'B-2201' or (details->>'wing' = 'B' and details->>'flat_no' = '2201'));

insert into public.registrations (type, name, phone, email, apartment, details, payment_status, payment_reference)
select 'Sponsor', 'Anand Dubey', '', '', 'B-2201', jsonb_build_object(
  'wing', 'B', 'flat_no', '2201',
  'sponsorship_area', 'Cricket equipment',
  'sponsorship_type', 'In-kind', 'contribution_amount', '',
  'contribution_details', 'Ball box sponsor',
  'organization_name', 'Anand Dubey', 'public_showcase_permission', 'yes'
), 'Pending', ''
where not exists (
  select 1 from public.registrations
  where type = 'Sponsor' and lower(name) = lower('Anand Dubey')
    and (apartment = 'B-2201' or (details->>'wing' = 'B' and details->>'flat_no' = '2201'))
);

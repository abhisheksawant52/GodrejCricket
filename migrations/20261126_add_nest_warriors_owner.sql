-- Assign Abhishek Vaishnavi as the Nest Warriors owner.
-- Safe to apply repeatedly; no contact or shirt details are fabricated.
update public.registrations
set details = coalesce(details, '{}'::jsonb) || jsonb_build_object('team_name', 'Nest Warriors')
where type = 'Owner'
  and lower(trim(name)) = lower('Abhishek Vaishnavi');

insert into public.registrations (type, name, phone, email, apartment, details, payment_status, payment_reference)
select 'Owner', 'Abhishek Vaishnavi', '', '', '', jsonb_build_object(
  'team_name', 'Nest Warriors',
  'registration_source', 'Owner assignment'
), 'Pending', ''
where not exists (
  select 1 from public.registrations
  where type = 'Owner'
    and lower(trim(name)) = lower('Abhishek Vaishnavi')
);

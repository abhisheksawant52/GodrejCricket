-- Add the two community participants to the shared player list without inventing
-- contact, category, or team details. Safe to apply more than once.
insert into public.registrations (type, name, phone, email, apartment, details, payment_status, payment_reference)
select 'Player', names.name, '', '', '', jsonb_build_object('registration_source', 'Audience request'), 'Pending', ''
from (values ('Abhishek Sawant'), ('Chetan patil')) as names(name)
where not exists (
  select 1 from public.registrations r
  where r.type = 'Player' and lower(trim(r.name)) = lower(names.name)
);

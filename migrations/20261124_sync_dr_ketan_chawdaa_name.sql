-- Canonicalize Ketan's owner record to the exact name supplied by the organiser.
-- Idempotent and limited to known spelling/title variants.
update public.registrations
set name = 'Dr Ketan Chawdaa'
where type = 'Owner'
  and lower(trim(name)) in (
    'ketan chawda', 'ketan chawada', 'ketan chawdaa',
    'dr ketan chawda', 'dr ketan chawada', 'dr ketan chawdaa'
  );

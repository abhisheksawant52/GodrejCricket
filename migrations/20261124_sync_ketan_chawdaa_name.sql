-- Keep Ketan's owner name consistent with the GNPL team sheet spelling.
-- Run this after confirming which shirt name/number should be printed.
update public.registrations
set name = 'Ketan Chawdaa'
where type = 'Owner'
  and lower(trim(name)) in ('ketan chawada', 'ketan chawdaa');

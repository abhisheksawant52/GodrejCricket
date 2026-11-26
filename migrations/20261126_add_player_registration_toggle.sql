alter table public.site_content
  add column if not exists player_registration_open boolean default null;

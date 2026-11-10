-- Platform brand is now Sewsiness. Update the defaults, and move existing
-- settings only if an admin hasn't customised them (still the old default text).
alter table public.system_platform_settings alter column brand_name set default 'Sewsiness';
alter table public.system_platform_settings alter column login_footer set default 'Sewsiness · Atelier management system';

update public.system_platform_settings
   set brand_name = 'Sewsiness', updated_at = now()
 where brand_name = 'Madam Studio';
update public.system_platform_settings
   set login_footer = 'Sewsiness · Atelier management system', updated_at = now()
 where login_footer = 'Madam Studio · Atelier management system';

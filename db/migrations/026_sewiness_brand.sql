-- The official logo spells the platform name "Sewiness". Update the defaults,
-- and move existing settings only if an admin hasn't customised them (still one
-- of the earlier default names).
alter table public.system_platform_settings alter column brand_name set default 'Sewiness';
alter table public.system_platform_settings alter column login_footer set default 'Sewiness · Atelier management system';

update public.system_platform_settings
   set brand_name = 'Sewiness', updated_at = now()
 where brand_name in ('Sewsiness', 'Madam Studio');
update public.system_platform_settings
   set login_footer = 'Sewiness · Atelier management system', updated_at = now()
 where login_footer in ('Sewsiness · Atelier management system', 'Madam Studio · Atelier management system');

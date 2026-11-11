-- The platform name is spelled "Sewsiness". Fix the defaults, and move any row
-- still on the earlier spelling or the old product name. A name an admin typed
-- themselves is left alone.
alter table public.system_platform_settings alter column brand_name set default 'Sewsiness';
alter table public.system_platform_settings alter column login_footer set default 'Sewsiness · Atelier management system';

update public.system_platform_settings
   set brand_name = 'Sewsiness', updated_at = now()
 where brand_name in ('Sewiness', 'Madam Studio');
update public.system_platform_settings
   set login_footer = 'Sewsiness · Atelier management system', updated_at = now()
 where login_footer in ('Sewiness · Atelier management system', 'Madam Studio · Atelier management system');

-- Website text edited from the admin portal: correct the spelling in saved content.
update public.system_website_content
   set content = replace(content::text, 'Sewiness', 'Sewsiness')::jsonb, updated_at = now()
 where content::text like '%Sewiness%';

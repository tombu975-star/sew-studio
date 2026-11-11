-- Sewiness purple theme: move the login backdrop default, and any row still on the
-- previous default, to the new tinted neutral.
alter table public.system_platform_settings alter column background_color set default '#F6F2F9';
update public.system_platform_settings set background_color = '#F6F2F9', updated_at = now()
 where upper(background_color) = '#F4F6F8';

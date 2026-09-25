create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  t text;
  tables_with_updated_at text[] := array[
    'shops', 'profiles', 'freelancer_profiles', 'freelancer_shop_links',
    'freelance_jobs', 'customers', 'orders', 'tasks', 'training_programs',
    'competency_units', 'style_concepts', 'settings', 'community_posts',
    'training_logs'
  ];
begin
  foreach t in array tables_with_updated_at loop
    execute format(
      'create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()',
      t
    );
  end loop;
end $$;

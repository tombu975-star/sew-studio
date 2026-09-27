-- Tighten write policies so shop members can create and edit records, but
-- only madam/trainers can delete them. Keep freelancer self-service access
-- and protect profile roles and tenant ownership at the database boundary.

drop policy if exists "users can update their own profile"
  on public.profiles;

drop policy if exists "madam or trainer can update any trainee in their shop"
  on public.profiles;

create policy "users can update safe fields on their own profile"
  on public.profiles for update
  using (id = auth.uid() and shop_id = public.current_shop_id())
  with check (
    id = auth.uid()
    and shop_id = public.current_shop_id()
    and role = public.current_role()
  );

create policy "managers can update eligible profiles in their shop"
  on public.profiles for update
  using (
    shop_id = public.current_shop_id()
    and (
      public.current_role() = 'madam'
      or (
        public.current_role() = 'trainer'
        and role = 'trainee'
        and mentor_id = auth.uid()
      )
    )
  )
  with check (
    shop_id = public.current_shop_id()
    and (
      public.current_role() = 'madam'
      or (public.current_role() = 'trainer' and role = 'trainee')
    )
  );

drop policy if exists "shop members can manage payments on their orders"
  on public.payments;

create policy "shop members can view payments on their orders"
  on public.payments for select
  using (
    exists (
      select 1 from public.orders o
      where o.id = payments.order_id and o.shop_id = public.current_shop_id()
    )
  );

create policy "shop members can insert payments on their orders"
  on public.payments for insert
  with check (
    exists (
      select 1 from public.orders o
      where o.id = payments.order_id and o.shop_id = public.current_shop_id()
    )
  );

create policy "shop members can update payments on their orders"
  on public.payments for update
  using (
    exists (
      select 1 from public.orders o
      where o.id = payments.order_id and o.shop_id = public.current_shop_id()
    )
  )
  with check (
    exists (
      select 1 from public.orders o
      where o.id = payments.order_id and o.shop_id = public.current_shop_id()
    )
  );

create policy "shop managers can delete payments on their orders"
  on public.payments for delete
  using (
    public.is_shop_manager()
    and exists (
      select 1 from public.orders o
      where o.id = payments.order_id and o.shop_id = public.current_shop_id()
    )
  );

drop policy if exists "shop members can manage fittings on their orders"
  on public.fittings;

create policy "shop members can view fittings on their orders"
  on public.fittings for select
  using (
    exists (
      select 1 from public.orders o
      where o.id = fittings.order_id and o.shop_id = public.current_shop_id()
    )
  );

create policy "shop members can insert fittings on their orders"
  on public.fittings for insert
  with check (
    exists (
      select 1 from public.orders o
      where o.id = fittings.order_id and o.shop_id = public.current_shop_id()
    )
  );

create policy "shop members can update fittings on their orders"
  on public.fittings for update
  using (
    exists (
      select 1 from public.orders o
      where o.id = fittings.order_id and o.shop_id = public.current_shop_id()
    )
  )
  with check (
    exists (
      select 1 from public.orders o
      where o.id = fittings.order_id and o.shop_id = public.current_shop_id()
    )
  );

create policy "shop managers can delete fittings on their orders"
  on public.fittings for delete
  using (
    public.is_shop_manager()
    and exists (
      select 1 from public.orders o
      where o.id = fittings.order_id and o.shop_id = public.current_shop_id()
    )
  );

drop policy if exists "shop members can manage their freelancer links"
  on public.freelancer_shop_links;

create policy "shop members can view their freelancer links"
  on public.freelancer_shop_links for select
  using (shop_id = public.current_shop_id());

create policy "shop members can insert their freelancer links"
  on public.freelancer_shop_links for insert
  with check (shop_id = public.current_shop_id());

create policy "shop members can update their freelancer links"
  on public.freelancer_shop_links for update
  using (shop_id = public.current_shop_id())
  with check (shop_id = public.current_shop_id());

create policy "shop managers can delete their freelancer links"
  on public.freelancer_shop_links for delete
  using (shop_id = public.current_shop_id() and public.is_shop_manager());

drop policy if exists "shop members can manage jobs they commissioned"
  on public.freelance_jobs;

create policy "shop members can view jobs they commissioned"
  on public.freelance_jobs for select
  using (shop_id = public.current_shop_id());

create policy "shop members can insert jobs they commissioned"
  on public.freelance_jobs for insert
  with check (shop_id = public.current_shop_id());

create policy "shop members can update jobs they commissioned"
  on public.freelance_jobs for update
  using (shop_id = public.current_shop_id())
  with check (shop_id = public.current_shop_id());

create policy "shop managers can delete jobs they commissioned"
  on public.freelance_jobs for delete
  using (shop_id = public.current_shop_id() and public.is_shop_manager());
-- Studio tasks that are created but not assigned automatically become open jobs
-- freelancers can request. A trigger keeps this in sync no matter which code path
-- creates, assigns, completes or edits the task.
alter table public.freelance_job_posts
  add column if not exists task_id uuid unique references public.tasks (id) on delete cascade;

-- Post statuses: Open | Filled | Closed (manual) | Paused (task assigned/done; reopens if unassigned again)
create or replace function public.sync_task_job_post() returns trigger
language plpgsql as $$
declare
  eligible boolean;
begin
  -- Training exercises (graded, tied to a competency unit) are for trainees, not freelancers.
  eligible := new.staff_id is null
          and new.status <> 'Done'
          and new.competency_unit_id is null
          and new.max_score is null;
  if eligible then
    insert into public.freelance_job_posts (shop_id, task_id, task_description, due_date, status)
    values (new.shop_id, new.id, new.title, new.due_date, 'Open')
    on conflict (task_id) do update
      set task_description = excluded.task_description,
          due_date = excluded.due_date,
          status = case when public.freelance_job_posts.status = 'Paused' then 'Open'
                        else public.freelance_job_posts.status end,
          updated_at = now();
  else
    update public.freelance_job_posts
       set status = 'Paused', updated_at = now()
     where task_id = new.id and status = 'Open';
  end if;
  return null;
end;
$$;

drop trigger if exists tasks_sync_job_post on public.tasks;
create trigger tasks_sync_job_post
  after insert or update on public.tasks
  for each row execute function public.sync_task_job_post();

-- Existing unassigned tasks
insert into public.freelance_job_posts (shop_id, task_id, task_description, due_date, status)
select t.shop_id, t.id, t.title, t.due_date, 'Open'
  from public.tasks t
 where t.staff_id is null and t.status <> 'Done'
   and t.competency_unit_id is null and t.max_score is null
on conflict (task_id) do nothing;

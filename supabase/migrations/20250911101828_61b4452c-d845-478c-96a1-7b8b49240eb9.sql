-- Ensure task-attachments bucket exists
insert into storage.buckets (id, name, public)
values ('task-attachments', 'task-attachments', true)
on conflict (id) do nothing;

-- Storage object policies for task attachments
do $$ begin
  create policy "Task attachments read (authenticated)"
  on storage.objects
  for select
  to authenticated
  using (bucket_id = 'task-attachments');
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Task attachments insert (own folder)"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'task-attachments'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Task attachments update (owner or admin)"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'task-attachments'
    and (
      auth.uid()::text = (storage.foldername(name))[1]
      or public.has_role(auth.uid(), 'admin'::app_role)
    )
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Task attachments delete (owner or admin)"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'task-attachments'
    and (
      auth.uid()::text = (storage.foldername(name))[1]
      or public.has_role(auth.uid(), 'admin'::app_role)
    )
  );
exception when duplicate_object then null; end $$;

-- Set defaults on tasks before insert
create or replace function public.set_task_defaults()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.assigned_by is null then
    new.assigned_by := auth.uid();
  end if;

  if new.assigned_to is null then
    new.assigned_to := auth.uid();
  end if;

  if new.created_by is null then
    new.created_by := auth.uid();
  end if;

  if new.org_id is null then
    new.org_id := public.get_current_user_org_id();
  end if;

  if new.status is null then
    new.status := 'pending';
  end if;

  if new.priority is null then
    new.priority := 'medium';
  end if;

  if new.credit_points is null then
    new.credit_points := 0;
  end if;

  if new.is_self_task is null then
    new.is_self_task := (new.assigned_to = new.assigned_by);
  end if;

  if new.due_date is null then
    -- Tomorrow at 17:00 local time
    new.due_date := date_trunc('day', now()) + interval '1 day' + interval '17 hours';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_set_task_defaults on public.tasks;
create trigger trg_set_task_defaults
before insert on public.tasks
for each row
execute function public.set_task_defaults();

-- Fix restrictive INSERT policies on tasks
do $$ begin
  drop policy "Users can insert tasks" on public.tasks;
exception when undefined_object then null; end $$;

do $$ begin
  drop policy "Users can insert tasks they assign" on public.tasks;
exception when undefined_object then null; end $$;

do $$ begin
  drop policy "Team heads can assign tasks" on public.tasks;
exception when undefined_object then null; end $$;

create policy "Insert tasks per role"
on public.tasks
as permissive
for insert
to authenticated
with check (
  assigned_by = auth.uid()
  and (
    assigned_to = auth.uid()
    or public.has_role(auth.uid(), 'admin'::app_role)
    or public.is_team_head(auth.uid())
  )
);

-- Simplify profiles SELECT policy so org members can see each other
do $$ begin
  drop policy "Users can view org profiles" on public.profiles;
exception when undefined_object then null; end $$;

do $$ begin
  drop policy "Users can view profiles" on public.profiles;
exception when undefined_object then null; end $$;

create policy "Profiles visible in org or self or admin"
on public.profiles
as permissive
for select
to authenticated
using (
  (id = auth.uid())
  or (public.get_current_user_role() = 'admin'::app_role)
  or (org_id is not null and org_id = public.get_current_user_org_id())
);
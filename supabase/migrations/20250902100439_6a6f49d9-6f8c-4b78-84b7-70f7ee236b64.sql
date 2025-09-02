
-- 1) Helper: admin role checker (uses profiles.role)
create or replace function public.is_admin(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = _user_id
      and p.role = 'admin'
  );
$$;

-- 2) Teams and membership
create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.teams enable row level security;

-- Admins manage all teams
create policy if not exists "Admins can manage teams"
  on public.teams for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- Members can view their teams
create policy if not exists "Members can view their teams"
  on public.teams for select
  using (
    exists (
      select 1
      from public.team_members tm
      where tm.team_id = id and tm.user_id = auth.uid()
    )
    or public.is_admin(auth.uid())
  );

create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text default 'member',
  created_at timestamptz not null default now(),
  unique(team_id, user_id)
);

alter table public.team_members enable row level security;

-- Admins manage membership
create policy if not exists "Admins manage team members"
  on public.team_members for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- Users can view members of their teams
create policy if not exists "Users view members of their teams"
  on public.team_members for select
  using (
    exists (
      select 1
      from public.team_members tm
      where tm.team_id = team_id and tm.user_id = auth.uid()
    )
    or public.is_admin(auth.uid())
  );

-- 3) Task assignments (multi-user and/or team assignments)
create table if not exists public.task_assignments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  team_id uuid references public.teams(id) on delete cascade,
  created_at timestamptz not null default now(),
  created_by uuid not null default auth.uid(),
  check ((user_id is not null) or (team_id is not null))
);

-- Unique per (task,user) and (task,team)
create unique index if not exists task_assignments_task_user_uq
  on public.task_assignments(task_id, user_id) where user_id is not null;

create unique index if not exists task_assignments_task_team_uq
  on public.task_assignments(task_id, team_id) where team_id is not null;

alter table public.task_assignments enable row level security;

-- View assignments if admin, assigned directly, member of assigned team, or creator of the task
create policy if not exists "Users can view task assignments"
  on public.task_assignments for select
  using (
    public.is_admin(auth.uid())
    or (user_id = auth.uid())
    or exists (
      select 1
      from public.team_members tm
      where tm.team_id = task_assignments.team_id
        and tm.user_id = auth.uid()
    )
    or exists (
      select 1 from public.tasks t
      where t.id = task_assignments.task_id
        and t.assigned_by = auth.uid()
    )
  );

-- Admins or task creators can add/remove/modify assignments
create policy if not exists "Admins or creators manage assignments"
  on public.task_assignments for all
  using (
    public.is_admin(auth.uid())
    or exists (
      select 1 from public.tasks t
      where t.id = task_assignments.task_id
        and t.assigned_by = auth.uid()
    )
  )
  with check (
    public.is_admin(auth.uid())
    or exists (
      select 1 from public.tasks t
      where t.id = task_assignments.task_id
        and t.assigned_by = auth.uid()
    )
  );

-- 4) Expand task visibility/update via assignments and team membership
-- Existing policies remain; add extra policies (OR'ed) for assignment-based access.

-- Allow view if assigned via task_assignments (direct or via team membership)
create policy if not exists "Users can view tasks via assignments"
  on public.tasks for select
  using (
    exists (
      select 1
      from public.task_assignments ta
      where ta.task_id = tasks.id
        and ta.user_id = auth.uid()
    )
    or exists (
      select 1
      from public.task_assignments ta
      join public.team_members tm on tm.team_id = ta.team_id
      where ta.task_id = tasks.id
        and tm.user_id = auth.uid()
    )
  );

-- Allow update if assigned via task_assignments (keep existing update policy too)
create policy if not exists "Users can update tasks via assignments"
  on public.tasks for update
  using (
    exists (
      select 1
      from public.task_assignments ta
      where ta.task_id = tasks.id
        and ta.user_id = auth.uid()
    )
    or exists (
      select 1
      from public.task_assignments ta
      join public.team_members tm on tm.team_id = ta.team_id
      where ta.task_id = tasks.id
        and tm.user_id = auth.uid()
    )
  );

-- Admins can update any task (e.g., verify/close)
create policy if not exists "Admins can update any task"
  on public.tasks for update
  using (public.is_admin(auth.uid()))
  with check (true);

-- 5) Verification audit columns on tasks
alter table public.tasks
  add column if not exists verified_by uuid references auth.users(id),
  add column if not exists verified_at timestamptz;

-- 6) Notifications: allow inserts for self
alter table public.notifications enable row level security;

create policy if not exists "Users can insert their notifications"
  on public.notifications for insert
  with check (user_id = auth.uid());

-- 7) Notification triggers
-- a) Notify on assignment (direct or team)
create or replace function public.notify_on_task_assignment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  task_title text;
begin
  select title into task_title from public.tasks where id = NEW.task_id;

  if NEW.user_id is not null then
    insert into public.notifications (user_id, task_id, title, message, type)
    values (
      NEW.user_id,
      NEW.task_id,
      'New Task Assigned',
      coalesce(task_title, 'A task') || ' has been assigned to you',
      'task'
    )
    on conflict do nothing;
  end if;

  if NEW.team_id is not null then
    insert into public.notifications (user_id, task_id, title, message, type)
    select tm.user_id,
           NEW.task_id,
           'New Team Task',
           coalesce(task_title, 'A task') || ' has been assigned to your team',
           'task'
    from public.team_members tm
    where tm.team_id = NEW.team_id
    on conflict do nothing;
  end if;

  return NEW;
end;
$$;

drop trigger if exists on_task_assigned on public.task_assignments;
create trigger on_task_assigned
  after insert on public.task_assignments
  for each row execute procedure public.notify_on_task_assignment();

-- b) Notify on completion (admins + task creator)
create or replace function public.notify_on_task_completed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  task_title text;
begin
  if NEW.status = 'completed' and coalesce(OLD.status, '') <> 'completed' then
    select title into task_title from public.tasks where id = NEW.id;

    -- notify all admins
    insert into public.notifications (user_id, task_id, title, message, type)
    select p.id,
           NEW.id,
           'Task Completed',
           coalesce(task_title, 'A task') || ' was marked completed',
           'task'
    from public.profiles p
    where p.role = 'admin'
    on conflict do nothing;

    -- notify task creator
    if NEW.assigned_by is not null then
      insert into public.notifications (user_id, task_id, title, message, type)
      values (
        NEW.assigned_by,
        NEW.id,
        'Task Completed',
        coalesce(task_title, 'A task') || ' was marked completed',
        'task'
      )
      on conflict do nothing;
    end if;
  end if;

  return NEW;
end;
$$;

drop trigger if exists on_task_completed on public.tasks;
create trigger on_task_completed
  after update on public.tasks
  for each row execute procedure public.notify_on_task_completed();

-- 8) Task comments (for collaboration)
create table if not exists public.task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

alter table public.task_comments enable row level security;

-- Users can read comments on tasks they have access to
create policy if not exists "Users can view comments on accessible tasks"
  on public.task_comments for select
  using (
    public.is_admin(auth.uid())
    or exists (select 1 from public.tasks t
               where t.id = task_id
                 and (t.assigned_by = auth.uid() or t.assigned_to = auth.uid()))
    or exists (select 1 from public.task_assignments ta
               where ta.task_id = task_id and ta.user_id = auth.uid())
    or exists (select 1 from public.task_assignments ta
               join public.team_members tm on tm.team_id = ta.team_id
               where ta.task_id = task_id and tm.user_id = auth.uid())
  );

-- Users can add comments if they have access to the task
create policy if not exists "Users can add comments on accessible tasks"
  on public.task_comments for insert
  with check (
    public.is_admin(auth.uid())
    or exists (select 1 from public.tasks t
               where t.id = task_id
                 and (t.assigned_by = auth.uid() or t.assigned_to = auth.uid()))
    or exists (select 1 from public.task_assignments ta
               where ta.task_id = task_id and ta.user_id = auth.uid())
    or exists (select 1 from public.task_assignments ta
               join public.team_members tm on tm.team_id = ta.team_id
               where ta.task_id = task_id and tm.user_id = auth.uid())
  );

-- Authors or admins can edit/delete their comments
create policy if not exists "Authors or admins manage their comments"
  on public.task_comments for update
  using (user_id = auth.uid() or public.is_admin(auth.uid()))
  with check (user_id = auth.uid() or public.is_admin(auth.uid()));

create policy if not exists "Authors or admins delete their comments"
  on public.task_comments for delete
  using (user_id = auth.uid() or public.is_admin(auth.uid()));

-- 9) Calendar custom events (tasks will also appear based on due_date)
create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  start_time timestamptz not null,
  end_time timestamptz,
  color text default 'green',
  is_recurring boolean default false,
  recurring_rule text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.calendar_events enable row level security;

-- Users manage their own events
create policy if not exists "Users manage their own events (select)"
  on public.calendar_events for select
  using (user_id = auth.uid());

create policy if not exists "Users manage their own events (insert)"
  on public.calendar_events for insert
  with check (user_id = auth.uid());

create policy if not exists "Users manage their own events (update)"
  on public.calendar_events for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy if not exists "Users manage their own events (delete)"
  on public.calendar_events for delete
  using (user_id = auth.uid());

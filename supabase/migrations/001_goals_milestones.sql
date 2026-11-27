-- Run ONCE in the Supabase SQL Editor on your existing project. Keeps all existing data.

-- 1. Goals: custom timelines (old month/target/progress/deadline columns are kept, so Our Progress keeps working)
alter table goals add column if not exists description text not null default '';
alter table goals add column if not exists start_date date;
alter table goals add column if not exists end_date date;
update goals set start_date = (month || '-01')::date where start_date is null;
update goals set end_date = coalesce(deadline, (date_trunc('month', (month || '-01')::date) + interval '1 month - 1 day')::date) where end_date is null;
update goals set end_date = start_date where end_date < start_date;
alter table goals alter column start_date set not null, alter column end_date set not null;
alter table goals drop constraint if exists goals_dates_check;
alter table goals add constraint goals_dates_check check (end_date >= start_date);
create index if not exists goals_ws_end on goals (workspace_id, end_date);

-- 2. Dynamic categories (shared vocabulary for the workspace)
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null default my_workspace() references workspaces on delete cascade,
  name text not null,
  created_by uuid default auth.uid(),
  unique (workspace_id, name)
);
insert into categories (workspace_id, name)
  select w.id, c from workspaces w cross join unnest(array['DSA','LeetCode','Transformers','GenAI','Practical Implementation']) c
  on conflict do nothing;
insert into categories (workspace_id, name) select distinct workspace_id, category from goals on conflict do nothing;
alter table categories enable row level security;
create policy "categories read" on categories for select using (workspace_id = my_workspace());
create policy "categories insert" on categories for insert with check (workspace_id = my_workspace());
create policy "categories delete" on categories for delete using (workspace_id = my_workspace());

-- 3. Weekly tasks / questions checklist, attached to a goal
create table if not exists weekly_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references profiles on delete cascade,
  workspace_id uuid not null default my_workspace() references workspaces on delete cascade,
  goal_id uuid not null references goals on delete cascade,
  week_start date not null,               -- Monday of the week
  title text not null,
  link text,
  is_done boolean not null default false,
  created_at timestamptz default now()
);
create index if not exists weekly_tasks_goal on weekly_tasks (goal_id, week_start);
alter table weekly_tasks enable row level security;
create policy "tasks read" on weekly_tasks for select using (workspace_id = my_workspace());
create policy "tasks insert own" on weekly_tasks for insert with check (
  user_id = auth.uid() and workspace_id = my_workspace()
  and exists (select 1 from goals g where g.id = goal_id and g.user_id = auth.uid()));
create policy "tasks update own" on weekly_tasks for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "tasks delete own" on weekly_tasks for delete using (user_id = auth.uid());

alter publication supabase_realtime add table categories, weekly_tasks;

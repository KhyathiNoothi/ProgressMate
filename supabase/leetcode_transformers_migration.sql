-- ProgressMate additive migration: LeetCode Tracking & Transformers Learning Tracker
-- Safe to review and execute once in Supabase SQL Editor.
-- Preserves all existing tables, constraints, policies, functions, and user data.

-- 1. Additive goal_type on goals (existing goals default to 'general')
alter table public.goals
  add column if not exists goal_type text not null default 'general';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'goals_goal_type_check'
      and conrelid = 'public.goals'::regclass
  ) then
    alter table public.goals
      add constraint goals_goal_type_check
      check (goal_type in ('general', 'leetcode', 'transformers'));
  end if;
end $$;

-- 2. Manual weekly topics for structured goal checklists (e.g., Transformers)
create table if not exists public.weekly_topics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  workspace_id uuid not null default public.my_workspace() references public.workspaces(id) on delete cascade,
  goal_id uuid not null references public.goals(id) on delete cascade,
  week_start date not null,
  title text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists weekly_topics_goal_week_idx
  on public.weekly_topics (goal_id, week_start);

alter table public.weekly_topics enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'weekly_topics' and policyname = 'weekly_topics read'
  ) then
    create policy "weekly_topics read" on public.weekly_topics
      for select using (workspace_id = public.my_workspace());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'weekly_topics' and policyname = 'weekly_topics insert own'
  ) then
    create policy "weekly_topics insert own" on public.weekly_topics
      for insert with check (user_id = auth.uid() and workspace_id = public.my_workspace());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'weekly_topics' and policyname = 'weekly_topics update own'
  ) then
    create policy "weekly_topics update own" on public.weekly_topics
      for update using (user_id = auth.uid())
      with check (user_id = auth.uid() and workspace_id = public.my_workspace());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'weekly_topics' and policyname = 'weekly_topics delete own'
  ) then
    create policy "weekly_topics delete own" on public.weekly_topics
      for delete using (user_id = auth.uid());
  end if;
end $$;

-- 3. Additive topic_id on existing weekly_tasks (preserves all existing tasks with topic_id = null)
alter table public.weekly_tasks
  add column if not exists topic_id uuid references public.weekly_topics(id) on delete set null;

create index if not exists weekly_tasks_topic_idx
  on public.weekly_tasks (topic_id);

-- 4. Per-goal daily logs so multiple goals and general daily updates never overwrite on the same date
create table if not exists public.goal_daily_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  workspace_id uuid not null default public.my_workspace() references public.workspaces(id) on delete cascade,
  goal_id uuid not null references public.goals(id) on delete cascade,
  date date not null,
  questions_solved int not null default 0 check (questions_solved >= 0),
  hours_spent numeric not null default 0 check (hours_spent >= 0),
  learning_notes text not null default '',
  is_draft boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, goal_id, date)
);

create index if not exists goal_daily_logs_ws_date_idx
  on public.goal_daily_logs (workspace_id, date);

create index if not exists goal_daily_logs_goal_date_idx
  on public.goal_daily_logs (goal_id, date);

alter table public.goal_daily_logs enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'goal_daily_logs' and policyname = 'goal_daily_logs read'
  ) then
    create policy "goal_daily_logs read" on public.goal_daily_logs
      for select using (workspace_id = public.my_workspace());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'goal_daily_logs' and policyname = 'goal_daily_logs insert own'
  ) then
    create policy "goal_daily_logs insert own" on public.goal_daily_logs
      for insert with check (user_id = auth.uid() and workspace_id = public.my_workspace());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'goal_daily_logs' and policyname = 'goal_daily_logs update own'
  ) then
    create policy "goal_daily_logs update own" on public.goal_daily_logs
      for update using (user_id = auth.uid())
      with check (user_id = auth.uid() and workspace_id = public.my_workspace());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'goal_daily_logs' and policyname = 'goal_daily_logs delete own'
  ) then
    create policy "goal_daily_logs delete own" on public.goal_daily_logs
      for delete using (user_id = auth.uid());
  end if;
end $$;

-- 5. Enable Realtime safely for new tables (and weekly_tasks if not already added)
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'weekly_topics'
  ) then
    alter publication supabase_realtime add table public.weekly_topics;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'goal_daily_logs'
  ) then
    alter publication supabase_realtime add table public.goal_daily_logs;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'weekly_tasks'
  ) then
    alter publication supabase_realtime add table public.weekly_tasks;
  end if;
end $$;

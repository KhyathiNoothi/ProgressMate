-- ProgressMate schema. Run in Supabase SQL Editor.
create table workspaces (id uuid primary key default gen_random_uuid(), created_at timestamptz default now());

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text not null,
  workspace_id uuid not null references workspaces on delete cascade
);

-- Every signup joins the single shared workspace; a 3rd signup is rejected.
create function handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
declare ws uuid; n int;
begin
  select id into ws from workspaces order by created_at limit 1;
  if ws is null then insert into workspaces default values returning id into ws; end if;
  select count(*) into n from profiles where workspace_id = ws;
  if n >= 2 then raise exception 'Workspace is full (2 members max)'; end if;
  insert into profiles values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)), ws);
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();

create function my_workspace() returns uuid language sql stable security definer set search_path = public as
$$ select workspace_id from profiles where id = auth.uid() $$;

create table goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references profiles on delete cascade,
  workspace_id uuid not null default my_workspace() references workspaces on delete cascade,
  month text not null,                       -- 'YYYY-MM'
  category text not null,
  title text not null,
  target numeric not null check (target > 0),
  progress numeric not null default 0 check (progress >= 0),
  unit text not null default 'items',
  deadline date,
  priority text not null default 'medium' check (priority in ('low','medium','high')),
  status text not null default 'not_started' check (status in ('not_started','in_progress','completed')),
  milestones jsonb not null default '[]',    -- [{week,text,done}]
  created_at timestamptz default now()
);

create table daily_updates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references profiles on delete cascade,
  workspace_id uuid not null default my_workspace() references workspaces on delete cascade,
  date date not null,
  tasks text not null default '',
  leetcode_count int not null default 0,
  leetcode_links text[] not null default '{}',
  topics text[] not null default '{}',
  practical text not null default '',
  hours numeric not null default 0,
  challenges text not null default '',
  github_links text[] not null default '{}',
  files jsonb not null default '[]',         -- [{name,path}] in storage bucket
  unique (user_id, date)
);
create index on goals (workspace_id, month);
create index on daily_updates (workspace_id, date);

-- Row Level Security: read everything in your workspace, write only your own rows.
alter table workspaces enable row level security;
alter table profiles enable row level security;
alter table goals enable row level security;
alter table daily_updates enable row level security;

create policy "ws read" on workspaces for select using (id = my_workspace());
create policy "profiles read" on profiles for select using (workspace_id = my_workspace());
create policy "profiles update own" on profiles for update using (id = auth.uid()) with check (id = auth.uid());

create policy "goals read" on goals for select using (workspace_id = my_workspace());
create policy "goals insert own" on goals for insert with check (user_id = auth.uid() and workspace_id = my_workspace());
create policy "goals update own" on goals for update using (user_id = auth.uid()) with check (user_id = auth.uid() and workspace_id = my_workspace());
create policy "goals delete own" on goals for delete using (user_id = auth.uid());

create policy "updates read" on daily_updates for select using (workspace_id = my_workspace());
create policy "updates insert own" on daily_updates for insert with check (user_id = auth.uid() and workspace_id = my_workspace());
create policy "updates update own" on daily_updates for update using (user_id = auth.uid()) with check (user_id = auth.uid() and workspace_id = my_workspace());
create policy "updates delete own" on daily_updates for delete using (user_id = auth.uid());

-- Storage: private bucket, files stored under <user_id>/...
insert into storage.buckets (id, name, public) values ('attachments', 'attachments', false) on conflict do nothing;
create policy "attachments read" on storage.objects for select to authenticated using (bucket_id = 'attachments');
create policy "attachments upload own" on storage.objects for insert to authenticated
  with check (bucket_id = 'attachments' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "attachments delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'attachments' and (storage.foldername(name))[1] = auth.uid()::text);

-- Realtime
alter publication supabase_realtime add table goals, daily_updates, profiles;

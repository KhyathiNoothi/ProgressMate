-- Run ONCE after 001. Adds the structured daily-update fields. Existing rows are kept.
alter table daily_updates add column if not exists worked_on text not null default '';
alter table daily_updates add column if not exists completed text not null default '';
alter table daily_updates add column if not exists learned text not null default '';
alter table daily_updates add column if not exists plan_tomorrow text not null default '';
alter table daily_updates add column if not exists goal_id uuid references goals(id) on delete set null;
alter table daily_updates add column if not exists is_draft boolean not null default false;
update daily_updates set completed = tasks where completed = '' and tasks <> '';

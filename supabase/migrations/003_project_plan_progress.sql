-- Persist the Tuesday delivery plan and item-level progress in hosted Supabase.

create table if not exists public.project_plan (
  plan_id text primary key,
  title text not null,
  subtitle text,
  deadline_at timestamptz not null,
  source_path text not null,
  version text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_plan_item (
  plan_id text not null references public.project_plan(plan_id) on delete cascade,
  item_id text not null,
  sort_order integer not null,
  day_id text not null check (day_id in ('sat','sun','mon','tue')),
  plan_date date not null,
  day_label text not null,
  phase text not null,
  time_range text not null,
  duration_minutes integer not null check (duration_minutes > 0),
  title text not null,
  criteria text not null,
  kind text not null default 'task' check (kind in ('task','buffer')),
  status text not null default 'pending' check (status in ('pending','in_progress','done','blocked')),
  progress integer not null default 0 check (progress between 0 and 100),
  note text not null default '',
  updated_by text not null default 'Manus',
  updated_at timestamptz not null default now(),
  primary key (plan_id, item_id)
);

create index if not exists project_plan_item_day_order_idx
  on public.project_plan_item(plan_id, day_id, sort_order);
create index if not exists project_plan_item_status_idx
  on public.project_plan_item(plan_id, status, sort_order);

create table if not exists public.project_plan_event (
  event_id bigint generated always as identity primary key,
  plan_id text not null,
  item_id text not null,
  before_status text,
  after_status text,
  before_progress integer,
  after_progress integer,
  before_note text,
  after_note text,
  updated_by text not null,
  occurred_at timestamptz not null default now()
);

create index if not exists project_plan_event_item_idx
  on public.project_plan_event(plan_id, item_id, occurred_at desc);

create or replace function private.capture_project_plan_event()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
begin
  if new.status is distinct from old.status
     or new.progress is distinct from old.progress
     or new.note is distinct from old.note then
    insert into public.project_plan_event(
      plan_id, item_id,
      before_status, after_status,
      before_progress, after_progress,
      before_note, after_note,
      updated_by
    ) values (
      new.plan_id, new.item_id,
      old.status, new.status,
      old.progress, new.progress,
      old.note, new.note,
      new.updated_by
    );
  end if;
  new.updated_at := now();
  return new;
end
$$;

revoke all on function private.capture_project_plan_event() from public, anon, authenticated;

drop trigger if exists project_plan_item_event_trg on public.project_plan_item;
create trigger project_plan_item_event_trg
before update on public.project_plan_item
for each row execute function private.capture_project_plan_event();

alter table public.project_plan enable row level security;
alter table public.project_plan_item enable row level security;
alter table public.project_plan_event enable row level security;

grant select on public.project_plan, public.project_plan_item, public.project_plan_event to anon, authenticated;
grant insert, update, delete on public.project_plan_item to anon, authenticated;

create policy plan_read on public.project_plan
for select to anon, authenticated
using (private.demo_access_enabled());

create policy plan_item_read on public.project_plan_item
for select to anon, authenticated
using (private.demo_access_enabled());
create policy plan_item_insert on public.project_plan_item
for insert to anon, authenticated
with check (private.demo_write_enabled() and plan_id = 'yongin-tuesday-20260908');
create policy plan_item_update on public.project_plan_item
for update to anon, authenticated
using (private.demo_write_enabled() and plan_id = 'yongin-tuesday-20260908')
with check (private.demo_write_enabled() and plan_id = 'yongin-tuesday-20260908');
create policy plan_item_delete on public.project_plan_item
for delete to anon, authenticated
using (private.demo_write_enabled() and plan_id = 'yongin-tuesday-20260908');

create policy plan_event_read on public.project_plan_event
for select to anon, authenticated
using (private.demo_access_enabled());

-- Realtime keeps multiple open progress boards synchronized.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'project_plan_item'
  ) then
    alter publication supabase_realtime add table public.project_plan_item;
  end if;
end $$;

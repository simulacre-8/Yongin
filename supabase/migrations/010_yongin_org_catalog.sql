-- Official Yongin organization-chart reference catalog.
-- This is separated from mutable demo org/profile rows so a new official snapshot
-- cannot overwrite scenario assignments or user-edited workflow data.

create table if not exists public.ref_yongin_org_snapshot (
  snapshot_date date primary key,
  fetched_at timestamptz not null,
  source_urls jsonb not null default '[]'::jsonb,
  summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.ref_yongin_org_unit (
  org_key text primary key,
  parent_org_key text references public.ref_yongin_org_unit(org_key) deferrable initially deferred,
  source_code text,
  name text not null,
  org_type text not null check (org_type in (
    'CITY', 'EXECUTIVE', 'OFFICE', 'BUREAU', 'DEPARTMENT', 'GROUP',
    'COUNCIL_OFFICE', 'DIRECT_AGENCY', 'SERVICE_OFFICE', 'DISTRICT',
    'LOCAL_OFFICE', 'TEAM'
  )),
  hierarchy_level smallint not null check (hierarchy_level between 0 and 8),
  hierarchy_path text not null unique,
  source_section text not null,
  location text,
  representative_phone text,
  source_url text not null,
  snapshot_date date not null references public.ref_yongin_org_snapshot(snapshot_date) deferrable initially deferred,
  fetched_at timestamptz not null,
  is_active boolean not null default true,
  attributes jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_yongin_org_parent on public.ref_yongin_org_unit(parent_org_key, sort_order);
create index if not exists idx_yongin_org_name on public.ref_yongin_org_unit(name);
create index if not exists idx_yongin_org_source_code on public.ref_yongin_org_unit(source_code) where source_code is not null;
create index if not exists idx_yongin_org_type on public.ref_yongin_org_unit(org_type, is_active);

create or replace function public.touch_yongin_org_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_touch_yongin_org on public.ref_yongin_org_unit;
create trigger trg_touch_yongin_org
before update on public.ref_yongin_org_unit
for each row execute function public.touch_yongin_org_updated_at();

alter table public.ref_yongin_org_snapshot enable row level security;
alter table public.ref_yongin_org_unit enable row level security;

grant select on public.ref_yongin_org_snapshot, public.ref_yongin_org_unit to anon, authenticated;

drop policy if exists demo_read on public.ref_yongin_org_snapshot;
create policy demo_read on public.ref_yongin_org_snapshot
for select to anon, authenticated
using (private.demo_role_allowed(array['target_manager','inspector','executive']::text[]));

drop policy if exists demo_read on public.ref_yongin_org_unit;
create policy demo_read on public.ref_yongin_org_unit
for select to anon, authenticated
using (private.demo_role_allowed(array['target_manager','inspector','executive']::text[]));

comment on table public.ref_yongin_org_unit is
  'Official Yongin organization reference snapshot; no personal names. Team rows are derived from public team-leader position labels.';
comment on column public.ref_yongin_org_unit.source_code is
  'Official department code exposed by yongin.go.kr. Structural groups and derived team rows can be null.';
comment on column public.ref_yongin_org_unit.org_key is
  'Stable path-aware key because the official site reuses some department codes for institution and child units.';

-- Yongin facility catalog and facility-to-obligation mapping.
-- The FMS source is read-only. Scenario-only rail/contract rows are explicitly labelled DEMO_VIRTUAL.

create table if not exists public.ref_managed_target (
  target_ref text primary key,
  source_id text not null,
  target_name text not null,
  target_category text not null check (target_category in (
    '사업장', '공중이용시설', '공중교통수단', '원료·제조물', '사업', '도급·용역·위탁'
  )),
  facility_group text,
  facility_kind text,
  facility_class text,
  safety_grade text,
  completion_date date,
  age_years numeric,
  address text,
  gross_area numeric,
  subject_tier text,
  managing_body text,
  subject_name text,
  subject_source text,
  subject_confidence text,
  l2_result text not null check (l2_result in ('해당', '검토필요', '제외')),
  l2_rule text,
  l2_basis_path text,
  l2_basis_quote text,
  l2_confidence text,
  l2_need_data text,
  source_kind text not null check (source_kind in ('FMS', 'DEMO_VIRTUAL')),
  source_version text not null,
  source_note text,
  source_status text,
  is_demo_virtual boolean not null default false,
  attributes jsonb not null default '{}'::jsonb,
  imported_at timestamptz not null default now(),
  unique (source_kind, source_id)
);

create index if not exists ref_managed_target_category_idx
  on public.ref_managed_target(target_category, facility_group, facility_kind);
create index if not exists ref_managed_target_name_idx
  on public.ref_managed_target(target_name);
create index if not exists ref_managed_target_result_idx
  on public.ref_managed_target(l2_result, is_demo_virtual);

create table if not exists public.ref_managed_target_obligation (
  target_ref text not null references public.ref_managed_target(target_ref) on delete cascade,
  obl_id text not null references public.ref_obligation(obl_id) on delete cascade,
  law_name text not null,
  unit_path text,
  layer text not null,
  cycle text,
  evidence text,
  map_basis text,
  map_reason text,
  map_confidence text not null check (map_confidence in ('high', 'medium', 'low', 'demo')),
  l2_result text not null check (l2_result in ('해당', '검토필요', '제외')),
  l2_rule text,
  mapping_source text not null check (mapping_source in ('CLIENT_CSV', 'CLIENT_SCENARIO')),
  is_demo_virtual boolean not null default false,
  source_version text not null,
  metadata jsonb not null default '{}'::jsonb,
  primary key (target_ref, obl_id)
);

create index if not exists ref_managed_target_obligation_obl_idx
  on public.ref_managed_target_obligation(obl_id);
create index if not exists ref_managed_target_obligation_result_idx
  on public.ref_managed_target_obligation(target_ref, l2_result, map_confidence);

alter table public.ref_managed_target enable row level security;
alter table public.ref_managed_target_obligation enable row level security;

revoke all on public.ref_managed_target, public.ref_managed_target_obligation from anon, authenticated;
grant select on public.ref_managed_target, public.ref_managed_target_obligation to anon, authenticated;

drop policy if exists demo_read on public.ref_managed_target;
create policy demo_read on public.ref_managed_target
for select to anon, authenticated
using (private.demo_role_allowed(array['target_manager','inspector','executive']::text[]));

drop policy if exists demo_read on public.ref_managed_target_obligation;
create policy demo_read on public.ref_managed_target_obligation
for select to anon, authenticated
using (private.demo_role_allowed(array['target_manager','inspector','executive']::text[]));

create or replace view public.v_managed_target_summary
with (security_invoker = true)
as
select
  t.target_ref,
  t.target_name,
  t.target_category,
  t.facility_group,
  t.facility_kind,
  t.facility_class,
  t.safety_grade,
  t.address,
  t.subject_name,
  t.l2_result,
  t.l2_confidence,
  t.source_kind,
  t.is_demo_virtual,
  count(m.obl_id) filter (where m.l2_result <> '제외') as mapped_obligation_count,
  count(m.obl_id) filter (where m.l2_result = '해당') as applicable_obligation_count,
  count(m.obl_id) filter (where m.l2_result = '검토필요') as review_obligation_count
from public.ref_managed_target t
left join public.ref_managed_target_obligation m on m.target_ref = t.target_ref
group by
  t.target_ref, t.target_name, t.target_category, t.facility_group,
  t.facility_kind, t.facility_class, t.safety_grade, t.address,
  t.subject_name, t.l2_result, t.l2_confidence, t.source_kind,
  t.is_demo_virtual;

grant select on public.v_managed_target_summary to anon, authenticated;

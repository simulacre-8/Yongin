-- Idempotent operational projection for the Yongin facility workflow.
-- Re-running this seed preserves user-edited due_value, compliance records, evidence and inspections.

insert into public.target (
  scenario_id,
  org_id,
  target_ref,
  name,
  target_type,
  detail_type,
  address,
  manager_name,
  attributes,
  is_demo
)
select
  '10000000-0000-0000-0000-000000000001'::uuid,
  '20000000-0000-0000-0000-000000000002'::uuid,
  r.target_ref,
  r.target_name,
  r.target_category,
  concat_ws(' / ', r.facility_group, r.facility_kind, r.facility_class),
  r.address,
  coalesce(r.subject_name, '용인특례시'),
  jsonb_build_object(
    'source_kind', r.source_kind,
    'source_id', r.source_id,
    'source_version', r.source_version,
    'subject_name', r.subject_name,
    'l2_result', r.l2_result,
    'is_demo_virtual', r.is_demo_virtual
  ) || coalesce(r.attributes, '{}'::jsonb),
  true
from public.ref_managed_target r
where r.l2_result <> '제외'
order by r.target_ref
limit 500
on conflict (scenario_id, target_ref) where target_ref is not null
do update set
  name = excluded.name,
  target_type = excluded.target_type,
  detail_type = excluded.detail_type,
  address = excluded.address,
  manager_name = excluded.manager_name,
  attributes = excluded.attributes,
  is_demo = true;

insert into public.target_obligation (
  target_id,
  obl_id,
  due_type,
  due_value,
  applicability_snapshot,
  is_active
)
select
  t.target_id,
  m.obl_id,
  case
    when coalesce(m.cycle, '') ~ '(반기|상·하반기|상/하반기)' then 'half'
    when coalesce(m.cycle, '') ~ '(발생|수시|사건)' then 'event'
    else 'month'
  end,
  case
    when coalesce(m.cycle, '') ~ '(반기|상·하반기|상/하반기)' then '2026-H2'
    when coalesce(m.cycle, '') ~ '(발생|수시|사건)' then 'EVENT'
    else '2026-09'
  end,
  jsonb_build_object(
    'target_ref', m.target_ref,
    'obl_id', m.obl_id,
    'law_name', m.law_name,
    'unit_path', m.unit_path,
    'layer', m.layer,
    'cycle', m.cycle,
    'map_reason', m.map_reason,
    'mapping_source', m.mapping_source,
    'source_version', m.source_version,
    'is_demo_virtual', m.is_demo_virtual
  ),
  true
from public.ref_managed_target_obligation m
join public.target t
  on t.target_ref = m.target_ref
 and t.scenario_id = '10000000-0000-0000-0000-000000000001'::uuid
where m.l2_result <> '제외'
order by m.target_ref, m.obl_id
limit 5000
on conflict (target_id, obl_id)
do update set
  due_type = excluded.due_type,
  applicability_snapshot = excluded.applicability_snapshot,
  is_active = true;

-- Keep the fixed 2026 H2 inspection run available for all facility workflows.
insert into public.inspection_run (
  inspection_run_id,
  scenario_id,
  title,
  period_key,
  status,
  created_by
) values (
  '60000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  '2026년 하반기 용인시 관리대상 의무이행 점검',
  '2026-H2',
  'OPEN',
  '30000000-0000-0000-0000-000000000002'
)
on conflict (inspection_run_id)
do update set
  title = excluded.title,
  period_key = excluded.period_key,
  status = 'OPEN';

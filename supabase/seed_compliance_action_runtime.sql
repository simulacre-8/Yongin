-- Run after every compliance/evidence-producing seed.
-- Idempotently preserves pre-existing compliance snapshots as first correction events.

insert into public.demo_compliance_action_event (
  compliance_id,
  target_obligation_id,
  period_key,
  sequence_no,
  work_category,
  action_kind,
  status_before,
  status_after,
  action_date,
  action_start_date,
  action_end_date,
  action_detail,
  note,
  document_form_name,
  actor_employee_no,
  actor_org_name,
  actor_display_name,
  work_origin,
  occurred_at
)
select
  cr.compliance_id,
  cr.target_obligation_id,
  cr.period_key,
  1,
  private.demo_compliance_work_category_from_title(ro.title_ko),
  'IMPLEMENT',
  case
    when latest.before_data ->> 'status' in ('DONE', 'SUPP', 'NONE', 'NA')
      then latest.before_data ->> 'status'
    else null
  end,
  cr.status,
  coalesce(cr.action_date, cr.submitted_at::date, cr.updated_at::date),
  coalesce(cr.action_date, cr.submitted_at::date, cr.updated_at::date),
  coalesce(cr.action_date, cr.submitted_at::date, cr.updated_at::date),
  coalesce(nullif(btrim(cr.action_detail), ''), '기존 이행상태 기준기록'),
  null,
  case private.demo_compliance_work_category_from_title(ro.title_ko)
    when 'PLAN' then '양식 1 안전 및 유지관리계획서'
    when 'CONTRACT' then '양식 2 도급·용역·위탁 계약관리서'
    when 'PRECISION_DIAGNOSIS' then '양식 3 정밀안전진단 실시·결과서'
    when 'SAFETY_INSPECTION' then '양식 4 안전점검 실시·결과서'
    else '양식 5 기타 조치 및 증빙자료서'
  end,
  'DEMO-SEED',
  '시연 기준데이터',
  '시드 이관',
  'ORIGINAL',
  coalesce(cr.submitted_at, latest.occurred_at, cr.updated_at)
from public.compliance_record cr
join public.target_obligation tro
  on tro.target_obligation_id = cr.target_obligation_id
join public.ref_obligation ro
  on ro.obl_id = tro.obl_id
left join lateral (
  select ae.before_data, ae.occurred_at
  from public.audit_event ae
  where ae.entity_type = 'compliance_record'
    and ae.entity_id = cr.target_obligation_id::text
  order by ae.occurred_at desc, ae.audit_event_id desc
  limit 1
) latest on true
on conflict (target_obligation_id, period_key, sequence_no) do nothing;

insert into public.demo_compliance_action_evidence (
  action_event_id,
  evidence_id,
  linked_at
)
select dae.action_event_id, ev.evidence_id, ev.uploaded_at
from public.evidence ev
join public.demo_compliance_action_event dae
  on dae.compliance_id = ev.compliance_id
 and dae.sequence_no = 1
on conflict (evidence_id) do nothing;

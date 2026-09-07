-- Classify legacy compliance action events from their canonical obligation title.
-- New events already receive an explicit work_category from the UI/RPC.

create or replace function private.demo_compliance_work_category_from_title(p_title text)
returns text
language sql
immutable
strict
set search_path = pg_catalog
as $$
  select case
    when p_title ilike '%계획%' then 'PLAN'
    when p_title ilike any (array['%도급%', '%용역%', '%위탁%', '%계약%']) then 'CONTRACT'
    when p_title ilike '%정밀안전진단%' then 'PRECISION_DIAGNOSIS'
    when p_title ilike '%점검%' then 'SAFETY_INSPECTION'
    else 'OTHER'
  end
$$;

revoke all on function private.demo_compliance_work_category_from_title(text)
  from public, anon, authenticated;

with classified as (
  select
    dae.action_event_id,
    private.demo_compliance_work_category_from_title(ro.title_ko) as work_category
  from public.demo_compliance_action_event dae
  join public.target_obligation tob
    on tob.target_obligation_id = dae.target_obligation_id
  join public.ref_obligation ro
    on ro.obl_id = tob.obl_id
  where dae.actor_employee_no = 'DEMO-UNASSIGNED'
), updated as (
  update public.demo_compliance_action_event dae
  set
    work_category = classified.work_category,
    document_form_name = case classified.work_category
      when 'PLAN' then '양식 1 안전 및 유지관리계획서'
      when 'CONTRACT' then '양식 2 도급·용역·위탁 계약관리서'
      when 'PRECISION_DIAGNOSIS' then '양식 3 정밀안전진단 실시·결과서'
      when 'SAFETY_INSPECTION' then '양식 4 안전점검 실시·결과서'
      else '양식 5 기타 조치 및 증빙자료서'
    end
  from classified
  where dae.action_event_id = classified.action_event_id
  returning dae.action_event_id
)
select count(*) as updated_count
from updated;

notify pgrst, 'reload schema';

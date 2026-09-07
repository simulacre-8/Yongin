-- Transitional compatibility for cached/staggered browser bundles from migrations 020 and 021.
-- Both wrappers normalize the old one-day action model into the 022 document-event model.

create or replace function public.demo_log_compliance_action(
  p_request_id uuid,
  p_compliance_id uuid,
  p_target_obligation_id uuid,
  p_period_key text,
  p_action_kind text,
  p_status_before text,
  p_status_after text,
  p_action_date date,
  p_action_detail text,
  p_note text,
  p_actor_role text,
  p_evidence_ids uuid[],
  p_occurred_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_actor_profile_id uuid;
  v_title text;
  v_work_category text;
  v_document_form_name text;
  v_action_date date;
begin
  select ro.title_ko
  into v_title
  from public.target_obligation tob
  join public.ref_obligation ro on ro.obl_id = tob.obl_id
  where tob.target_obligation_id = p_target_obligation_id;
  if v_title is null then
    raise exception 'Target obligation was not found';
  end if;

  v_work_category := private.demo_compliance_work_category_from_title(v_title);
  v_document_form_name := case v_work_category
    when 'PLAN' then '양식 1 안전 및 유지관리계획서'
    when 'CONTRACT' then '양식 2 도급·용역·위탁 계약관리서'
    when 'PRECISION_DIAGNOSIS' then '양식 3 정밀안전진단 실시·결과서'
    when 'SAFETY_INSPECTION' then '양식 4 안전점검 실시·결과서'
    else '양식 5 기타 조치 및 증빙자료서'
  end;

  select p.profile_id
  into v_actor_profile_id
  from public.profile p
  where p.role_code = case lower(coalesce(p_actor_role, ''))
    when '경영책임자' then 'executive'
    when '실·국 점검자' then 'inspector'
    when '담당자' then 'target_manager'
    when 'executive' then 'executive'
    when 'inspector' then 'inspector'
    when 'target_manager' then 'target_manager'
    else 'target_manager'
  end
  order by p.profile_id
  limit 1;
  if v_actor_profile_id is null then
    raise exception 'Demo actor profile was not found';
  end if;

  v_action_date := coalesce(p_action_date, coalesce(p_occurred_at, now())::date);

  return public.demo_log_compliance_action(
    p_request_id,
    p_compliance_id,
    p_target_obligation_id,
    p_period_key,
    v_work_category,
    case p_action_kind when 'URGENT' then 'CORRECTION' else p_action_kind end,
    p_status_before,
    p_status_after,
    v_action_date,
    v_action_date,
    p_action_detail,
    v_document_form_name,
    v_actor_profile_id,
    p_evidence_ids,
    p_occurred_at
  );
end
$$;

revoke all on function public.demo_log_compliance_action(uuid, uuid, uuid, text, text, text, text, date, text, text, text, uuid[], timestamptz) from public;
grant execute on function public.demo_log_compliance_action(uuid, uuid, uuid, text, text, text, text, date, text, text, text, uuid[], timestamptz) to anon, authenticated;

create or replace function public.demo_log_compliance_action(
  p_compliance_id uuid,
  p_target_obligation_id uuid,
  p_period_key text,
  p_action_kind text,
  p_status_before text,
  p_status_after text,
  p_action_date date,
  p_action_detail text,
  p_note text,
  p_actor_role text,
  p_evidence_ids uuid[],
  p_occurred_at timestamptz
)
returns uuid
language sql
security definer
set search_path = public, private, pg_temp
as $$
  select public.demo_log_compliance_action(
    gen_random_uuid(),
    p_compliance_id,
    p_target_obligation_id,
    p_period_key,
    p_action_kind,
    p_status_before,
    p_status_after,
    p_action_date,
    p_action_detail,
    p_note,
    p_actor_role,
    p_evidence_ids,
    p_occurred_at
  )
$$;

revoke all on function public.demo_log_compliance_action(uuid, uuid, text, text, text, text, date, text, text, text, uuid[], timestamptz) from public;
grant execute on function public.demo_log_compliance_action(uuid, uuid, text, text, text, text, date, text, text, text, uuid[], timestamptz) to anon, authenticated;

notify pgrst, 'reload schema';

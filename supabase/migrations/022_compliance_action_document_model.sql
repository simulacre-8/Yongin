-- Model facility-obligation records as document-backed work events.
-- Work category and record kind are separate; execution period and registration timestamps remain distinct.

alter table public.demo_compliance_action_event
  add column if not exists work_category text,
  add column if not exists action_start_date date,
  add column if not exists action_end_date date,
  add column if not exists document_form_name text,
  add column if not exists actor_profile_id uuid references public.profile(profile_id),
  add column if not exists actor_employee_no text,
  add column if not exists actor_org_id uuid references public.org(org_id),
  add column if not exists actor_org_name text,
  add column if not exists actor_display_name text,
  add column if not exists work_origin text,
  add column if not exists delegated_at timestamptz;

alter table public.demo_compliance_action_event
  drop constraint if exists demo_compliance_action_event_action_kind_check;

update public.demo_compliance_action_event
set
  work_category = coalesce(work_category, 'OTHER'),
  action_start_date = coalesce(action_start_date, action_date, occurred_at::date),
  action_end_date = coalesce(action_end_date, action_date, action_start_date, occurred_at::date),
  document_form_name = coalesce(document_form_name, '양식 5 기타 조치 및 증빙자료서'),
  action_kind = case action_kind
    when 'CHANGE' then 'CHANGE'
    when 'IMPLEMENT' then 'IMPLEMENT'
    when 'URGENT' then 'CORRECTION'
    else 'IMPLEMENT'
  end,
  actor_employee_no = coalesce(actor_employee_no, 'DEMO-UNASSIGNED'),
  actor_org_name = coalesce(actor_org_name, '시연 조직 미지정'),
  actor_display_name = coalesce(actor_display_name, actor_role, '시연 담당자'),
  work_origin = coalesce(work_origin, 'ORIGINAL')
where
  work_category is null
  or action_start_date is null
  or action_end_date is null
  or document_form_name is null
  or action_kind = 'URGENT'
  or actor_employee_no is null
  or actor_org_name is null
  or actor_display_name is null
  or work_origin is null;

alter table public.demo_compliance_action_event
  alter column work_category set not null,
  alter column action_start_date set not null,
  alter column action_end_date set not null,
  alter column document_form_name set not null,
  alter column actor_employee_no set not null,
  alter column actor_org_name set not null,
  alter column actor_display_name set not null,
  alter column work_origin set not null;

alter table public.demo_compliance_action_event
  add constraint demo_compliance_action_event_action_kind_check
  check (action_kind in ('CHANGE', 'IMPLEMENT', 'CORRECTION'));

alter table public.demo_compliance_action_event
  drop constraint if exists demo_compliance_action_event_work_category_check;
alter table public.demo_compliance_action_event
  add constraint demo_compliance_action_event_work_category_check
  check (work_category in ('PLAN', 'CONTRACT', 'PRECISION_DIAGNOSIS', 'SAFETY_INSPECTION', 'OTHER'));

alter table public.demo_compliance_action_event
  drop constraint if exists demo_compliance_action_event_action_period_check;
alter table public.demo_compliance_action_event
  add constraint demo_compliance_action_event_action_period_check
  check (action_end_date >= action_start_date);

alter table public.demo_compliance_action_event
  drop constraint if exists demo_compliance_action_event_work_origin_check;
alter table public.demo_compliance_action_event
  add constraint demo_compliance_action_event_work_origin_check
  check (work_origin in ('ORIGINAL', 'DELEGATED'));

create index if not exists demo_compliance_action_actor_profile_idx
  on public.demo_compliance_action_event(actor_profile_id, created_at desc);
create index if not exists demo_compliance_action_actor_org_idx
  on public.demo_compliance_action_event(actor_org_id, created_at desc);
create index if not exists demo_compliance_action_category_idx
  on public.demo_compliance_action_event(work_category, action_kind, action_start_date desc);

revoke all on function public.demo_log_compliance_action(uuid, uuid, uuid, text, text, text, text, date, text, text, text, uuid[], timestamptz) from anon, authenticated;
drop function if exists public.demo_log_compliance_action(uuid, uuid, uuid, text, text, text, text, date, text, text, text, uuid[], timestamptz);

create or replace function public.demo_log_compliance_action(
  p_request_id uuid,
  p_compliance_id uuid,
  p_target_obligation_id uuid,
  p_period_key text,
  p_work_category text,
  p_action_kind text,
  p_status_before text,
  p_status_after text,
  p_action_start_date date,
  p_action_end_date date,
  p_action_detail text,
  p_document_form_name text,
  p_actor_profile_id uuid,
  p_evidence_ids uuid[],
  p_occurred_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_action_event_id uuid;
  v_sequence_no integer;
  v_evidence_id uuid;
  v_profile public.profile%rowtype;
  v_actor_org_id uuid;
  v_actor_org_name text;
  v_employee_no text;
  v_work_origin text := 'ORIGINAL';
  v_delegated_at timestamptz;
begin
  if not private.demo_write_enabled() or not private.demo_access_enabled() then
    raise exception 'Demo compliance action logging is disabled';
  end if;
  if p_request_id is null then
    raise exception 'Request ID is required';
  end if;
  if p_work_category not in ('PLAN', 'CONTRACT', 'PRECISION_DIAGNOSIS', 'SAFETY_INSPECTION', 'OTHER') then
    raise exception 'Invalid compliance work category';
  end if;
  if p_action_kind not in ('CHANGE', 'IMPLEMENT', 'CORRECTION') then
    raise exception 'Invalid compliance action kind';
  end if;
  if p_status_after not in ('DONE', 'SUPP', 'NONE', 'NA') then
    raise exception 'Invalid compliance status';
  end if;
  if p_status_before is not null and p_status_before not in ('DONE', 'SUPP', 'NONE', 'NA') then
    raise exception 'Invalid previous compliance status';
  end if;
  if p_action_start_date is null or p_action_end_date is null then
    raise exception 'Action execution period is required';
  end if;
  if p_action_end_date < p_action_start_date then
    raise exception 'Action end date must not be before start date';
  end if;
  if nullif(btrim(p_action_detail), '') is null then
    raise exception 'Action summary is required';
  end if;
  if nullif(btrim(p_document_form_name), '') is null then
    raise exception 'Document form name is required';
  end if;
  if not exists (
    select 1
    from public.compliance_record cr
    where cr.compliance_id = p_compliance_id
      and cr.target_obligation_id = p_target_obligation_id
      and cr.period_key = p_period_key
  ) then
    raise exception 'Compliance record does not match the target obligation and period';
  end if;

  select p.* into v_profile
  from public.profile p
  where p.profile_id = p_actor_profile_id;
  if not found then
    raise exception 'Demo actor profile was not found';
  end if;

  v_actor_org_id := v_profile.org_id;
  select o.name into v_actor_org_name
  from public.org o
  where o.org_id = v_actor_org_id;
  v_actor_org_name := coalesce(v_actor_org_name, '시연 조직 미지정');
  v_employee_no := 'DEMO-' || upper(substr(replace(v_profile.profile_id::text, '-', ''), 1, 8));

  select
    case when wi.delegation_requested_at is not null then 'DELEGATED' else 'ORIGINAL' end,
    wi.delegation_requested_at
  into v_work_origin, v_delegated_at
  from public.demo_work_item wi
  where wi.target_obligation_id = p_target_obligation_id
  limit 1;
  v_work_origin := coalesce(v_work_origin, 'ORIGINAL');

  perform pg_advisory_xact_lock(hashtext(p_target_obligation_id::text || ':' || p_period_key));

  select dae.action_event_id into v_action_event_id
  from public.demo_compliance_action_event dae
  where dae.request_id = p_request_id;
  if v_action_event_id is not null then
    return v_action_event_id;
  end if;

  foreach v_evidence_id in array coalesce(p_evidence_ids, array[]::uuid[])
  loop
    if not exists (
      select 1 from public.evidence ev
      where ev.evidence_id = v_evidence_id
        and ev.compliance_id = p_compliance_id
    ) then
      raise exception 'Evidence does not belong to the compliance record';
    end if;
    if exists (
      select 1 from public.demo_compliance_action_evidence link
      where link.evidence_id = v_evidence_id
    ) then
      raise exception 'Evidence is already linked to a correction event';
    end if;
  end loop;

  select coalesce(max(sequence_no), 0) + 1 into v_sequence_no
  from public.demo_compliance_action_event
  where target_obligation_id = p_target_obligation_id
    and period_key = p_period_key;

  insert into public.demo_compliance_action_event (
    request_id,
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
    actor_role,
    actor_profile_id,
    actor_employee_no,
    actor_org_id,
    actor_org_name,
    actor_display_name,
    work_origin,
    delegated_at,
    occurred_at
  ) values (
    p_request_id,
    p_compliance_id,
    p_target_obligation_id,
    p_period_key,
    v_sequence_no,
    p_work_category,
    p_action_kind,
    p_status_before,
    p_status_after,
    p_action_end_date,
    p_action_start_date,
    p_action_end_date,
    btrim(p_action_detail),
    null,
    btrim(p_document_form_name),
    v_profile.role_code,
    v_profile.profile_id,
    v_employee_no,
    v_actor_org_id,
    v_actor_org_name,
    v_profile.display_name,
    v_work_origin,
    v_delegated_at,
    coalesce(p_occurred_at, now())
  )
  returning action_event_id into v_action_event_id;

  foreach v_evidence_id in array coalesce(p_evidence_ids, array[]::uuid[])
  loop
    insert into public.demo_compliance_action_evidence (action_event_id, evidence_id)
    values (v_action_event_id, v_evidence_id);
  end loop;

  return v_action_event_id;
end
$$;

revoke all on function public.demo_log_compliance_action(uuid, uuid, uuid, text, text, text, text, text, date, date, text, text, uuid, uuid[], timestamptz) from public;
grant execute on function public.demo_log_compliance_action(uuid, uuid, uuid, text, text, text, text, text, date, date, text, text, uuid, uuid[], timestamptz) to anon, authenticated;

notify pgrst, 'reload schema';

-- Make repeatable correction logging idempotent and reject silently dropped evidence links.

alter table public.demo_compliance_action_event
  add column if not exists request_id uuid;

create unique index if not exists demo_compliance_action_request_uidx
  on public.demo_compliance_action_event(request_id)
  where request_id is not null;

revoke all on function public.demo_log_compliance_action(uuid, uuid, text, text, text, text, date, text, text, text, uuid[], timestamptz) from anon, authenticated;
drop function if exists public.demo_log_compliance_action(uuid, uuid, text, text, text, text, date, text, text, text, uuid[], timestamptz);

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
set search_path = public, private
as $$
declare
  v_action_event_id uuid;
  v_sequence_no integer;
  v_evidence_id uuid;
begin
  if not private.demo_write_enabled() or not private.demo_access_enabled() then
    raise exception 'Demo compliance action logging is disabled';
  end if;
  if p_request_id is null then
    raise exception 'Request ID is required';
  end if;
  if p_action_kind not in ('IMPLEMENT', 'CHANGE', 'URGENT') then
    raise exception 'Invalid compliance action kind';
  end if;
  if p_status_after not in ('DONE', 'SUPP', 'NONE', 'NA') then
    raise exception 'Invalid compliance status';
  end if;
  if p_status_before is not null and p_status_before not in ('DONE', 'SUPP', 'NONE', 'NA') then
    raise exception 'Invalid previous compliance status';
  end if;
  if nullif(btrim(p_action_detail), '') is null then
    raise exception 'Action detail is required';
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

  perform pg_advisory_xact_lock(hashtext(p_target_obligation_id::text || ':' || p_period_key));

  select dae.action_event_id
    into v_action_event_id
  from public.demo_compliance_action_event dae
  where dae.request_id = p_request_id;

  if v_action_event_id is not null then
    return v_action_event_id;
  end if;

  foreach v_evidence_id in array coalesce(p_evidence_ids, array[]::uuid[])
  loop
    if not exists (
      select 1
      from public.evidence ev
      where ev.evidence_id = v_evidence_id
        and ev.compliance_id = p_compliance_id
    ) then
      raise exception 'Evidence does not belong to the compliance record';
    end if;
    if exists (
      select 1
      from public.demo_compliance_action_evidence link
      where link.evidence_id = v_evidence_id
    ) then
      raise exception 'Evidence is already linked to a correction event';
    end if;
  end loop;

  select coalesce(max(sequence_no), 0) + 1
    into v_sequence_no
  from public.demo_compliance_action_event
  where target_obligation_id = p_target_obligation_id
    and period_key = p_period_key;

  insert into public.demo_compliance_action_event (
    request_id,
    compliance_id,
    target_obligation_id,
    period_key,
    sequence_no,
    action_kind,
    status_before,
    status_after,
    action_date,
    action_detail,
    note,
    actor_role,
    occurred_at
  ) values (
    p_request_id,
    p_compliance_id,
    p_target_obligation_id,
    p_period_key,
    v_sequence_no,
    p_action_kind,
    p_status_before,
    p_status_after,
    p_action_date,
    btrim(p_action_detail),
    nullif(btrim(p_note), ''),
    nullif(btrim(p_actor_role), ''),
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

revoke all on function public.demo_log_compliance_action(uuid, uuid, uuid, text, text, text, text, date, text, text, text, uuid[], timestamptz) from public;
grant execute on function public.demo_log_compliance_action(uuid, uuid, uuid, text, text, text, text, date, text, text, text, uuid[], timestamptz) to anon, authenticated;

notify pgrst, 'reload schema';

-- Repeatable facility-obligation correction events with exact evidence linkage.
-- This is shared demo runtime data, not a production user-identity boundary.

alter table public.demo_compliance_export_event
  drop constraint if exists demo_compliance_export_event_row_count_check;
alter table public.demo_compliance_export_event
  add constraint demo_compliance_export_event_row_count_check
  check (row_count between 0 and 500);

create table if not exists public.demo_compliance_action_event (
  action_event_id uuid primary key default gen_random_uuid(),
  compliance_id uuid not null references public.compliance_record(compliance_id) on delete cascade,
  target_obligation_id uuid not null references public.target_obligation(target_obligation_id) on delete cascade,
  period_key text not null,
  sequence_no integer not null check (sequence_no > 0),
  action_kind text not null check (action_kind in ('IMPLEMENT', 'CHANGE', 'URGENT')),
  status_before text check (status_before in ('DONE', 'SUPP', 'NONE', 'NA')),
  status_after text not null check (status_after in ('DONE', 'SUPP', 'NONE', 'NA')),
  action_date date,
  action_detail text not null check (btrim(action_detail) <> ''),
  note text,
  actor_role text,
  occurred_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (target_obligation_id, period_key, sequence_no)
);

create index if not exists demo_compliance_action_compliance_idx
  on public.demo_compliance_action_event(compliance_id, occurred_at desc);
create index if not exists demo_compliance_action_target_obligation_idx
  on public.demo_compliance_action_event(target_obligation_id, occurred_at desc);
create index if not exists demo_compliance_action_created_idx
  on public.demo_compliance_action_event(created_at desc);

create table if not exists public.demo_compliance_action_evidence (
  action_event_id uuid not null references public.demo_compliance_action_event(action_event_id) on delete cascade,
  evidence_id uuid not null references public.evidence(evidence_id) on delete cascade,
  linked_at timestamptz not null default now(),
  primary key (action_event_id, evidence_id),
  unique (evidence_id)
);

create index if not exists demo_compliance_action_evidence_evidence_idx
  on public.demo_compliance_action_evidence(evidence_id);

alter table public.demo_compliance_action_event enable row level security;
alter table public.demo_compliance_action_evidence enable row level security;

grant select on public.demo_compliance_action_event to anon, authenticated;
grant select on public.demo_compliance_action_evidence to anon, authenticated;

drop policy if exists demo_compliance_action_event_read on public.demo_compliance_action_event;
create policy demo_compliance_action_event_read
  on public.demo_compliance_action_event
  for select
  to anon, authenticated
  using (private.demo_access_enabled());

drop policy if exists demo_compliance_action_evidence_read on public.demo_compliance_action_evidence;
create policy demo_compliance_action_evidence_read
  on public.demo_compliance_action_evidence
  for select
  to anon, authenticated
  using (private.demo_access_enabled());

-- Preserve the latest pre-020 compliance snapshot as the first repeatable event.
insert into public.demo_compliance_action_event (
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
  occurred_at,
  created_at
)
select
  cr.compliance_id,
  cr.target_obligation_id,
  cr.period_key,
  1,
  'IMPLEMENT',
  case
    when latest.before_data ->> 'status' in ('DONE', 'SUPP', 'NONE', 'NA')
      then latest.before_data ->> 'status'
    else null
  end,
  cr.status,
  cr.action_date,
  coalesce(nullif(btrim(cr.action_detail), ''), '기존 이행상태 기준기록'),
  cr.note,
  coalesce(cr.submitted_at, latest.occurred_at, cr.updated_at),
  coalesce(latest.occurred_at, cr.updated_at)
from public.compliance_record cr
left join lateral (
  select ae.before_data, ae.occurred_at
  from public.audit_event ae
  where ae.entity_type = 'compliance_record'
    and ae.entity_id = cr.target_obligation_id::text
  order by ae.occurred_at desc, ae.audit_event_id desc
  limit 1
) latest on true
on conflict (target_obligation_id, period_key, sequence_no) do nothing;

-- Existing evidence belongs to the first preserved event for its compliance record.
insert into public.demo_compliance_action_evidence (action_event_id, evidence_id, linked_at)
select dae.action_event_id, ev.evidence_id, ev.uploaded_at
from public.evidence ev
join public.demo_compliance_action_event dae
  on dae.compliance_id = ev.compliance_id
 and dae.sequence_no = 1
on conflict (evidence_id) do nothing;

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
  select coalesce(max(sequence_no), 0) + 1
    into v_sequence_no
  from public.demo_compliance_action_event
  where target_obligation_id = p_target_obligation_id
    and period_key = p_period_key;

  insert into public.demo_compliance_action_event (
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
    if not exists (
      select 1
      from public.evidence ev
      where ev.evidence_id = v_evidence_id
        and ev.compliance_id = p_compliance_id
    ) then
      raise exception 'Evidence does not belong to the compliance record';
    end if;
    insert into public.demo_compliance_action_evidence (action_event_id, evidence_id)
    values (v_action_event_id, v_evidence_id)
    on conflict (evidence_id) do nothing;
  end loop;

  return v_action_event_id;
end
$$;

revoke all on function public.demo_log_compliance_action(uuid, uuid, text, text, text, text, date, text, text, text, uuid[], timestamptz) from public;
grant execute on function public.demo_log_compliance_action(uuid, uuid, text, text, text, text, date, text, text, text, uuid[], timestamptz) to anon, authenticated;

create or replace function public.demo_log_compliance_export(
  p_target_ref text,
  p_period_key text,
  p_row_count integer,
  p_file_name text,
  p_actor_role text,
  p_filter_snapshot jsonb,
  p_occurred_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_export_event_id uuid;
begin
  if not private.demo_write_enabled() or not private.demo_access_enabled() then
    raise exception 'Demo export logging is disabled';
  end if;
  if nullif(btrim(p_target_ref), '') is null then
    raise exception 'Target reference is required';
  end if;
  if p_row_count < 0 or p_row_count > 500 then
    raise exception 'Export row count must be between 0 and 500';
  end if;
  if nullif(btrim(p_file_name), '') is null then
    raise exception 'Export file name is required';
  end if;

  insert into public.demo_compliance_export_event (
    export_kind,
    target_ref,
    period_key,
    row_count,
    file_name,
    actor_role,
    filter_snapshot,
    occurred_at
  ) values (
    'FACILITY_WORKFLOW_CSV',
    btrim(p_target_ref),
    coalesce(nullif(btrim(p_period_key), ''), '2026-H2'),
    p_row_count,
    btrim(p_file_name),
    nullif(btrim(p_actor_role), ''),
    coalesce(p_filter_snapshot, '{}'::jsonb),
    coalesce(p_occurred_at, now())
  )
  returning export_event_id into v_export_event_id;

  return v_export_event_id;
end
$$;

revoke all on function public.demo_log_compliance_export(text, text, integer, text, text, jsonb, timestamptz) from public;
grant execute on function public.demo_log_compliance_export(text, text, integer, text, text, jsonb, timestamptz) to anon, authenticated;

notify pgrst, 'reload schema';

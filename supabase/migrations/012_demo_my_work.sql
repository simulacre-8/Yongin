-- Resettable My Work operating layer for the Yongin sales demo.
-- Legal, facility, organization and compliance reference/source tables are not reset.

create table if not exists public.demo_work_assignment_rule (
  rule_id uuid primary key default gen_random_uuid(),
  rule_name text not null unique,
  priority integer not null default 100,
  match_law_name text,
  match_target_category text,
  match_subject_pattern text,
  match_target_name_pattern text,
  assigned_org_key text not null references public.ref_yongin_org_unit(org_key),
  assignment_basis text not null,
  basis_type text not null default 'DEMO_INTERNAL' check (basis_type in ('DEMO_INTERNAL','APPROVED_INTERNAL')),
  is_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.demo_work_item (
  work_item_id uuid primary key default gen_random_uuid(),
  target_obligation_id uuid not null unique references public.target_obligation(target_obligation_id) on delete cascade,
  target_id uuid not null references public.target(target_id) on delete cascade,
  target_ref text not null,
  target_name text not null,
  target_category text not null,
  obligation_id text not null references public.ref_obligation(obl_id),
  obligation_title text not null,
  law_name text not null,
  article_path text,
  cycle text,
  evidence_requirement text,
  due_at date,
  priority_code text not null default 'NORMAL' check (priority_code in ('URGENT','HIGH','NORMAL','LOW')),
  status_code text not null default 'UNASSIGNED' check (status_code in (
    'UNASSIGNED','ASSIGNED','ACCEPTED','IN_PROGRESS','SUPPLEMENT_REQUIRED',
    'DELEGATION_REQUESTED','COMPLETED','NOT_APPLICABLE'
  )),
  assignment_mode text not null default 'MANUAL' check (assignment_mode in ('AUTO','MANUAL')),
  assignment_rule_id uuid references public.demo_work_assignment_rule(rule_id),
  assigned_org_key text references public.ref_yongin_org_unit(org_key),
  assignee_display_name text,
  assigned_by_profile_id uuid references public.profile(profile_id),
  assigned_at timestamptz,
  accepted_by_profile_id uuid references public.profile(profile_id),
  accepted_at timestamptz,
  status_changed_at timestamptz,
  delegation_requested_at timestamptz,
  reassigned_at timestamptz,
  completed_at timestamptz,
  completion_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status_code = 'COMPLETED' and completed_at is not null) or status_code <> 'COMPLETED'),
  check ((status_code = 'UNASSIGNED' and assigned_org_key is null) or status_code <> 'UNASSIGNED')
);

create index if not exists demo_work_item_status_idx on public.demo_work_item(status_code, priority_code, due_at);
create index if not exists demo_work_item_org_idx on public.demo_work_item(assigned_org_key, status_code);
create index if not exists demo_work_item_target_idx on public.demo_work_item(target_ref, obligation_id);

create table if not exists public.demo_work_assignment_event (
  event_id bigint generated always as identity primary key,
  work_item_id uuid not null references public.demo_work_item(work_item_id) on delete cascade,
  event_type text not null check (event_type in (
    'CREATED','AUTO_ASSIGNED','MANUAL_ASSIGNED','REASSIGNED','ACCEPTED',
    'STATUS_CHANGED','DELEGATION_REQUESTED','DELEGATION_APPROVED',
    'DELEGATION_REJECTED','COMPLETED','ATTACHMENT_ADDED','ATTACHMENT_REMOVED'
  )),
  from_org_key text references public.ref_yongin_org_unit(org_key),
  to_org_key text references public.ref_yongin_org_unit(org_key),
  from_assignee text,
  to_assignee text,
  from_status text,
  to_status text,
  reason text,
  actor_profile_id uuid references public.profile(profile_id),
  actor_display_name text,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists demo_work_event_item_idx on public.demo_work_assignment_event(work_item_id, occurred_at desc, event_id desc);

create table if not exists public.demo_work_delegation_request (
  delegation_request_id uuid primary key default gen_random_uuid(),
  work_item_id uuid not null references public.demo_work_item(work_item_id) on delete cascade,
  from_org_key text references public.ref_yongin_org_unit(org_key),
  to_org_key text not null references public.ref_yongin_org_unit(org_key),
  requested_assignee_name text,
  basis_note text not null,
  status_code text not null default 'REQUESTED' check (status_code in ('REQUESTED','APPROVED','REJECTED','CANCELLED')),
  requested_by_profile_id uuid references public.profile(profile_id),
  requested_at timestamptz not null default now(),
  decided_by_profile_id uuid references public.profile(profile_id),
  decided_at timestamptz,
  decision_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists demo_work_delegation_item_idx on public.demo_work_delegation_request(work_item_id, requested_at desc);

create table if not exists public.demo_work_attachment (
  attachment_id uuid primary key default gen_random_uuid(),
  work_item_id uuid not null references public.demo_work_item(work_item_id) on delete cascade,
  delegation_request_id uuid references public.demo_work_delegation_request(delegation_request_id) on delete cascade,
  attachment_type text not null default 'WORK_EVIDENCE' check (attachment_type in ('WORK_EVIDENCE','DELEGATION_BASIS')),
  storage_bucket text not null default 'evidence-private' check (storage_bucket = 'evidence-private'),
  storage_path text not null unique check (storage_path like 'demo/my-work/%'),
  original_name text not null,
  file_extension text,
  mime_type text,
  size_bytes bigint not null check (size_bytes between 1 and 10485760),
  uploaded_by_profile_id uuid references public.profile(profile_id),
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists demo_work_attachment_item_idx on public.demo_work_attachment(work_item_id, created_at desc);

create table if not exists public.demo_work_reset_log (
  reset_id bigint generated always as identity primary key,
  actor_profile_id uuid references public.profile(profile_id),
  actor_display_name text,
  deleted_work_items integer not null,
  deleted_events integer not null,
  deleted_delegations integer not null,
  deleted_attachments integer not null,
  seeded_work_items integer not null,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create or replace function private.demo_work_actor_name(p_actor_profile_id uuid)
returns text
language sql
stable
security definer
set search_path = public, private, pg_temp
as $$
  select coalesce(
    (select display_name from public.profile where profile_id = p_actor_profile_id),
    '시연 사용자'
  )
$$;

revoke all on function private.demo_work_actor_name(uuid) from public, anon, authenticated;

create or replace function private.seed_demo_work_items()
returns integer
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  inserted_count integer;
begin
  with current_workflow as (
    select distinct on (workflow.target_obligation_id)
      workflow.*
    from public.v_facility_workflow workflow
    where workflow.target_obligation_id is not null
      and workflow.target_id is not null
    order by
      workflow.target_obligation_id,
      (workflow.period_key = '2026-H2') desc,
      workflow.inspected_at desc nulls last,
      workflow.updated_at desc nulls last
  ), matched as (
    select
      workflow.*,
      rule.rule_id,
      rule.assigned_org_key,
      case
        when coalesce(workflow.inspection_status, workflow.compliance_status) = 'DONE' then 'COMPLETED'
        when coalesce(workflow.inspection_status, workflow.compliance_status) = 'SUPP' then 'SUPPLEMENT_REQUIRED'
        when coalesce(workflow.inspection_status, workflow.compliance_status) = 'NONE' then 'IN_PROGRESS'
        when coalesce(workflow.inspection_status, workflow.compliance_status) = 'NA' then 'NOT_APPLICABLE'
        when rule.rule_id is not null then 'ASSIGNED'
        else 'UNASSIGNED'
      end as initial_status,
      case
        when workflow.due_value ~ '^20[0-9]{2}-(0[1-9]|1[0-2])$'
          then ((workflow.due_value || '-01')::date + interval '1 month - 1 day')::date
        when workflow.due_value ~ '^20[0-9]{2}-H1$'
          then make_date(left(workflow.due_value, 4)::integer, 6, 30)
        when workflow.due_value ~ '^20[0-9]{2}-H2$'
          then make_date(left(workflow.due_value, 4)::integer, 12, 31)
        else null
      end as resolved_due_at
    from current_workflow workflow
    left join lateral (
      select candidate.*
      from public.demo_work_assignment_rule candidate
      where candidate.is_enabled
        and (candidate.match_law_name is null or candidate.match_law_name = workflow.law_name)
        and (candidate.match_target_category is null or candidate.match_target_category = workflow.target_category)
        and (candidate.match_subject_pattern is null or coalesce(workflow.subject_name, '') ilike candidate.match_subject_pattern)
        and (candidate.match_target_name_pattern is null or workflow.target_name ilike candidate.match_target_name_pattern)
      order by candidate.priority asc, candidate.rule_name asc
      limit 1
    ) rule on true
  ), inserted as (
    insert into public.demo_work_item (
      target_obligation_id,
      target_id,
      target_ref,
      target_name,
      target_category,
      obligation_id,
      obligation_title,
      law_name,
      article_path,
      cycle,
      evidence_requirement,
      due_at,
      priority_code,
      status_code,
      assignment_mode,
      assignment_rule_id,
      assigned_org_key,
      assignee_display_name,
      assigned_at,
      status_changed_at,
      completed_at,
      created_at,
      updated_at
    )
    select
      matched.target_obligation_id,
      matched.target_id,
      matched.target_ref,
      matched.target_name,
      matched.target_category,
      matched.obl_id,
      matched.obligation_title,
      matched.law_name,
      matched.unit_path,
      matched.cycle,
      matched.evidence_requirement,
      matched.resolved_due_at,
      case
        when matched.resolved_due_at is not null and matched.resolved_due_at < current_date then 'URGENT'
        when matched.resolved_due_at is not null and matched.resolved_due_at <= current_date + 7 then 'HIGH'
        else 'NORMAL'
      end,
      matched.initial_status,
      case when matched.rule_id is null then 'MANUAL' else 'AUTO' end,
      matched.rule_id,
      matched.assigned_org_key,
      organization.name,
      case when matched.rule_id is null then null else now() end,
      now(),
      case when matched.initial_status = 'COMPLETED' then coalesce(matched.inspected_at, matched.updated_at, now()) else null end,
      now(),
      now()
    from matched
    left join public.ref_yongin_org_unit organization
      on organization.org_key = matched.assigned_org_key
    on conflict (target_obligation_id) do nothing
    returning work_item_id, assigned_org_key, assignee_display_name, assignment_rule_id, status_code
  )
  insert into public.demo_work_assignment_event (
    work_item_id,
    event_type,
    to_org_key,
    to_assignee,
    to_status,
    reason,
    actor_display_name,
    occurred_at,
    created_at,
    metadata
  )
  select
    inserted.work_item_id,
    case when inserted.assignment_rule_id is null then 'CREATED' else 'AUTO_ASSIGNED' end,
    inserted.assigned_org_key,
    inserted.assignee_display_name,
    inserted.status_code,
    case
      when inserted.assignment_rule_id is null then '승인된 자동배정 규칙 없음 — 수동 선택 필요'
      else '시연 내부 소관규칙으로 자동배정'
    end,
    '시스템',
    now(),
    now(),
    jsonb_build_object('baseline_seed', true)
  from inserted;

  get diagnostics inserted_count = row_count;
  return inserted_count;
end
$$;

revoke all on function private.seed_demo_work_items() from public, anon, authenticated;

create or replace function public.demo_work_assign(
  p_work_item_id uuid,
  p_to_org_key text,
  p_assignee_display_name text,
  p_actor_profile_id uuid,
  p_reason text,
  p_occurred_at timestamptz default now()
)
returns public.demo_work_item
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  previous_item public.demo_work_item;
  updated_item public.demo_work_item;
  event_kind text;
begin
  if not private.demo_write_enabled() or not private.demo_role_allowed(array['target_manager','inspector','executive']::text[]) then
    raise exception 'Demo work write is disabled';
  end if;
  if not exists (select 1 from public.ref_yongin_org_unit where org_key = p_to_org_key and is_active) then
    raise exception 'Unknown or inactive organization unit';
  end if;

  select * into previous_item from public.demo_work_item where work_item_id = p_work_item_id for update;
  if not found then raise exception 'Work item not found'; end if;
  event_kind := case when previous_item.assigned_org_key is null then 'MANUAL_ASSIGNED' else 'REASSIGNED' end;

  update public.demo_work_item
  set assigned_org_key = p_to_org_key,
      assignee_display_name = coalesce(nullif(trim(p_assignee_display_name), ''), (select name from public.ref_yongin_org_unit where org_key = p_to_org_key)),
      assignment_mode = 'MANUAL',
      assignment_rule_id = null,
      assigned_by_profile_id = p_actor_profile_id,
      assigned_at = p_occurred_at,
      accepted_by_profile_id = null,
      accepted_at = null,
      reassigned_at = case when event_kind = 'REASSIGNED' then p_occurred_at else reassigned_at end,
      status_code = 'ASSIGNED',
      status_changed_at = p_occurred_at,
      updated_at = now()
  where work_item_id = p_work_item_id
  returning * into updated_item;

  insert into public.demo_work_assignment_event (
    work_item_id,event_type,from_org_key,to_org_key,from_assignee,to_assignee,
    from_status,to_status,reason,actor_profile_id,actor_display_name,occurred_at,created_at
  ) values (
    p_work_item_id,event_kind,previous_item.assigned_org_key,updated_item.assigned_org_key,
    previous_item.assignee_display_name,updated_item.assignee_display_name,
    previous_item.status_code,updated_item.status_code,nullif(trim(p_reason),''),
    p_actor_profile_id,private.demo_work_actor_name(p_actor_profile_id),p_occurred_at,now()
  );
  return updated_item;
end
$$;

create or replace function public.demo_work_accept(
  p_work_item_id uuid,
  p_actor_profile_id uuid,
  p_occurred_at timestamptz default now()
)
returns public.demo_work_item
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  previous_item public.demo_work_item;
  updated_item public.demo_work_item;
begin
  if not private.demo_write_enabled() or not private.demo_role_allowed(array['target_manager','inspector','executive']::text[]) then
    raise exception 'Demo work write is disabled';
  end if;
  select * into previous_item from public.demo_work_item where work_item_id = p_work_item_id for update;
  if not found then raise exception 'Work item not found'; end if;
  if previous_item.assigned_org_key is null then raise exception 'Assign an organization before acceptance'; end if;

  update public.demo_work_item
  set status_code = 'ACCEPTED',
      accepted_by_profile_id = p_actor_profile_id,
      accepted_at = p_occurred_at,
      status_changed_at = p_occurred_at,
      updated_at = now()
  where work_item_id = p_work_item_id
  returning * into updated_item;

  insert into public.demo_work_assignment_event (
    work_item_id,event_type,from_org_key,to_org_key,from_assignee,to_assignee,
    from_status,to_status,actor_profile_id,actor_display_name,occurred_at,created_at
  ) values (
    p_work_item_id,'ACCEPTED',previous_item.assigned_org_key,updated_item.assigned_org_key,
    previous_item.assignee_display_name,updated_item.assignee_display_name,
    previous_item.status_code,updated_item.status_code,p_actor_profile_id,
    private.demo_work_actor_name(p_actor_profile_id),p_occurred_at,now()
  );
  return updated_item;
end
$$;

create or replace function public.demo_work_change_status(
  p_work_item_id uuid,
  p_status_code text,
  p_note text,
  p_actor_profile_id uuid,
  p_occurred_at timestamptz default now()
)
returns public.demo_work_item
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  previous_item public.demo_work_item;
  updated_item public.demo_work_item;
  event_kind text;
begin
  if not private.demo_write_enabled() or not private.demo_role_allowed(array['target_manager','inspector','executive']::text[]) then
    raise exception 'Demo work write is disabled';
  end if;
  if p_status_code not in ('ASSIGNED','ACCEPTED','IN_PROGRESS','SUPPLEMENT_REQUIRED','COMPLETED','NOT_APPLICABLE') then
    raise exception 'Unsupported work status';
  end if;
  select * into previous_item from public.demo_work_item where work_item_id = p_work_item_id for update;
  if not found then raise exception 'Work item not found'; end if;
  event_kind := case when p_status_code = 'COMPLETED' then 'COMPLETED' else 'STATUS_CHANGED' end;

  update public.demo_work_item
  set status_code = p_status_code,
      status_changed_at = p_occurred_at,
      completed_at = case when p_status_code = 'COMPLETED' then p_occurred_at else null end,
      completion_note = case when p_status_code = 'COMPLETED' then nullif(trim(p_note),'') else completion_note end,
      updated_at = now()
  where work_item_id = p_work_item_id
  returning * into updated_item;

  insert into public.demo_work_assignment_event (
    work_item_id,event_type,from_org_key,to_org_key,from_assignee,to_assignee,
    from_status,to_status,reason,actor_profile_id,actor_display_name,occurred_at,created_at
  ) values (
    p_work_item_id,event_kind,previous_item.assigned_org_key,updated_item.assigned_org_key,
    previous_item.assignee_display_name,updated_item.assignee_display_name,
    previous_item.status_code,updated_item.status_code,nullif(trim(p_note),''),
    p_actor_profile_id,private.demo_work_actor_name(p_actor_profile_id),p_occurred_at,now()
  );
  return updated_item;
end
$$;

create or replace function public.demo_work_request_delegation(
  p_work_item_id uuid,
  p_to_org_key text,
  p_requested_assignee_name text,
  p_basis_note text,
  p_storage_path text,
  p_original_name text,
  p_mime_type text,
  p_size_bytes bigint,
  p_actor_profile_id uuid,
  p_occurred_at timestamptz default now()
)
returns public.demo_work_delegation_request
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  previous_item public.demo_work_item;
  request_row public.demo_work_delegation_request;
begin
  if not private.demo_write_enabled() or not private.demo_role_allowed(array['target_manager','inspector','executive']::text[]) then
    raise exception 'Demo work write is disabled';
  end if;
  if p_storage_path not like 'demo/my-work/%' or p_size_bytes < 1 or p_size_bytes > 10485760 then
    raise exception 'A valid delegation evidence file is required';
  end if;
  if nullif(trim(p_basis_note),'') is null then raise exception 'Delegation basis is required'; end if;
  if not exists (select 1 from public.ref_yongin_org_unit where org_key = p_to_org_key and is_active) then
    raise exception 'Unknown or inactive organization unit';
  end if;

  select * into previous_item from public.demo_work_item where work_item_id = p_work_item_id for update;
  if not found then raise exception 'Work item not found'; end if;

  insert into public.demo_work_delegation_request (
    work_item_id,from_org_key,to_org_key,requested_assignee_name,basis_note,
    status_code,requested_by_profile_id,requested_at,created_at,updated_at
  ) values (
    p_work_item_id,previous_item.assigned_org_key,p_to_org_key,
    nullif(trim(p_requested_assignee_name),''),trim(p_basis_note),'REQUESTED',
    p_actor_profile_id,p_occurred_at,now(),now()
  ) returning * into request_row;

  insert into public.demo_work_attachment (
    work_item_id,delegation_request_id,attachment_type,storage_bucket,storage_path,
    original_name,file_extension,mime_type,size_bytes,uploaded_by_profile_id,occurred_at,created_at
  ) values (
    p_work_item_id,request_row.delegation_request_id,'DELEGATION_BASIS','evidence-private',p_storage_path,
    p_original_name,nullif(regexp_replace(p_original_name, '^.*\.', ''), p_original_name),
    p_mime_type,p_size_bytes,p_actor_profile_id,p_occurred_at,now()
  );

  update public.demo_work_item
  set status_code = 'DELEGATION_REQUESTED',
      delegation_requested_at = p_occurred_at,
      status_changed_at = p_occurred_at,
      updated_at = now()
  where work_item_id = p_work_item_id;

  insert into public.demo_work_assignment_event (
    work_item_id,event_type,from_org_key,to_org_key,from_assignee,to_assignee,
    from_status,to_status,reason,actor_profile_id,actor_display_name,occurred_at,created_at,
    metadata
  ) values (
    p_work_item_id,'DELEGATION_REQUESTED',previous_item.assigned_org_key,p_to_org_key,
    previous_item.assignee_display_name,nullif(trim(p_requested_assignee_name),''),
    previous_item.status_code,'DELEGATION_REQUESTED',trim(p_basis_note),p_actor_profile_id,
    private.demo_work_actor_name(p_actor_profile_id),p_occurred_at,now(),
    jsonb_build_object('delegation_request_id',request_row.delegation_request_id,'attachment_name',p_original_name)
  );
  return request_row;
end
$$;

create or replace function public.demo_work_add_attachment(
  p_work_item_id uuid,
  p_storage_path text,
  p_original_name text,
  p_mime_type text,
  p_size_bytes bigint,
  p_actor_profile_id uuid,
  p_occurred_at timestamptz default now()
)
returns public.demo_work_attachment
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  attachment_row public.demo_work_attachment;
begin
  if not private.demo_write_enabled() or not private.demo_role_allowed(array['target_manager','inspector','executive']::text[]) then
    raise exception 'Demo work write is disabled';
  end if;
  if p_storage_path not like 'demo/my-work/%' or p_size_bytes < 1 or p_size_bytes > 10485760 then
    raise exception 'Invalid attachment';
  end if;
  insert into public.demo_work_attachment (
    work_item_id,attachment_type,storage_bucket,storage_path,original_name,file_extension,
    mime_type,size_bytes,uploaded_by_profile_id,occurred_at,created_at
  ) values (
    p_work_item_id,'WORK_EVIDENCE','evidence-private',p_storage_path,p_original_name,
    nullif(regexp_replace(p_original_name, '^.*\.', ''), p_original_name),p_mime_type,
    p_size_bytes,p_actor_profile_id,p_occurred_at,now()
  ) returning * into attachment_row;

  insert into public.demo_work_assignment_event (
    work_item_id,event_type,to_org_key,to_assignee,to_status,reason,
    actor_profile_id,actor_display_name,occurred_at,created_at,metadata
  )
  select work_item_id,'ATTACHMENT_ADDED',assigned_org_key,assignee_display_name,status_code,
    p_original_name,p_actor_profile_id,private.demo_work_actor_name(p_actor_profile_id),
    p_occurred_at,now(),jsonb_build_object('attachment_id',attachment_row.attachment_id)
  from public.demo_work_item where work_item_id = p_work_item_id;
  return attachment_row;
end
$$;

create or replace function public.demo_work_remove_attachment(
  p_attachment_id uuid,
  p_actor_profile_id uuid,
  p_occurred_at timestamptz default now()
)
returns boolean
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  attachment_row public.demo_work_attachment;
begin
  if not private.demo_write_enabled() or not private.demo_role_allowed(array['target_manager','inspector','executive']::text[]) then
    raise exception 'Demo work write is disabled';
  end if;
  select * into attachment_row from public.demo_work_attachment where attachment_id = p_attachment_id for update;
  if not found then return false; end if;

  insert into public.demo_work_assignment_event (
    work_item_id,event_type,reason,actor_profile_id,actor_display_name,occurred_at,created_at,metadata
  ) values (
    attachment_row.work_item_id,'ATTACHMENT_REMOVED',attachment_row.original_name,
    p_actor_profile_id,private.demo_work_actor_name(p_actor_profile_id),p_occurred_at,now(),
    jsonb_build_object('attachment_id',attachment_row.attachment_id,'storage_path',attachment_row.storage_path)
  );
  delete from public.demo_work_attachment where attachment_id = p_attachment_id;
  return true;
end
$$;

create or replace function public.demo_work_reset(
  p_actor_profile_id uuid,
  p_occurred_at timestamptz default now()
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  work_count integer;
  event_count integer;
  delegation_count integer;
  attachment_count integer;
  seeded_count integer;
begin
  if not private.demo_write_enabled() or not private.demo_role_allowed(array['target_manager','inspector','executive']::text[]) then
    raise exception 'Demo work reset is disabled';
  end if;
  select count(*)::integer into work_count from public.demo_work_item;
  select count(*)::integer into event_count from public.demo_work_assignment_event;
  select count(*)::integer into delegation_count from public.demo_work_delegation_request;
  select count(*)::integer into attachment_count from public.demo_work_attachment;

  delete from public.demo_work_item;
  seeded_count := private.seed_demo_work_items();

  insert into public.demo_work_reset_log (
    actor_profile_id,actor_display_name,deleted_work_items,deleted_events,
    deleted_delegations,deleted_attachments,seeded_work_items,occurred_at,created_at
  ) values (
    p_actor_profile_id,private.demo_work_actor_name(p_actor_profile_id),work_count,event_count,
    delegation_count,attachment_count,seeded_count,p_occurred_at,now()
  );

  return jsonb_build_object(
    'deleted_work_items',work_count,
    'deleted_events',event_count,
    'deleted_delegations',delegation_count,
    'deleted_attachments',attachment_count,
    'seeded_work_items',seeded_count,
    'reset_at',p_occurred_at
  );
end
$$;

revoke all on function public.demo_work_assign(uuid,text,text,uuid,text,timestamptz) from public;
revoke all on function public.demo_work_accept(uuid,uuid,timestamptz) from public;
revoke all on function public.demo_work_change_status(uuid,text,text,uuid,timestamptz) from public;
revoke all on function public.demo_work_request_delegation(uuid,text,text,text,text,text,text,bigint,uuid,timestamptz) from public;
revoke all on function public.demo_work_add_attachment(uuid,text,text,text,bigint,uuid,timestamptz) from public;
revoke all on function public.demo_work_remove_attachment(uuid,uuid,timestamptz) from public;
revoke all on function public.demo_work_reset(uuid,timestamptz) from public;
grant execute on function public.demo_work_assign(uuid,text,text,uuid,text,timestamptz) to anon, authenticated;
grant execute on function public.demo_work_accept(uuid,uuid,timestamptz) to anon, authenticated;
grant execute on function public.demo_work_change_status(uuid,text,text,uuid,timestamptz) to anon, authenticated;
grant execute on function public.demo_work_request_delegation(uuid,text,text,text,text,text,text,bigint,uuid,timestamptz) to anon, authenticated;
grant execute on function public.demo_work_add_attachment(uuid,text,text,text,bigint,uuid,timestamptz) to anon, authenticated;
grant execute on function public.demo_work_remove_attachment(uuid,uuid,timestamptz) to anon, authenticated;
grant execute on function public.demo_work_reset(uuid,timestamptz) to anon, authenticated;

create or replace view public.v_demo_my_work
with (security_invoker = true)
as
select
  item.work_item_id,
  item.target_obligation_id,
  item.target_id,
  item.target_ref,
  item.target_name,
  item.target_category,
  item.obligation_id,
  item.obligation_title,
  item.law_name,
  item.article_path,
  item.cycle,
  item.evidence_requirement,
  item.due_at,
  item.priority_code,
  item.status_code,
  item.assignment_mode,
  item.assignment_rule_id,
  rule.rule_name as assignment_rule_name,
  rule.assignment_basis,
  rule.basis_type,
  item.assigned_org_key,
  organization.name as assigned_org_name,
  organization.org_type as assigned_org_type,
  organization.hierarchy_path as assigned_org_path,
  item.assignee_display_name,
  item.assigned_by_profile_id,
  assigned_by.display_name as assigned_by_name,
  item.assigned_at,
  item.accepted_by_profile_id,
  accepted_by.display_name as accepted_by_name,
  item.accepted_at,
  item.status_changed_at,
  item.delegation_requested_at,
  item.reassigned_at,
  item.completed_at,
  item.completion_note,
  item.created_at,
  item.updated_at,
  coalesce(files.attachment_count, 0)::integer as attachment_count,
  files.attachment_names,
  latest_delegation.delegation_request_id,
  latest_delegation.to_org_key as delegation_to_org_key,
  latest_delegation.to_org_name as delegation_to_org_name,
  latest_delegation.status_code as delegation_status
from public.demo_work_item item
left join public.demo_work_assignment_rule rule on rule.rule_id = item.assignment_rule_id
left join public.ref_yongin_org_unit organization on organization.org_key = item.assigned_org_key
left join public.profile assigned_by on assigned_by.profile_id = item.assigned_by_profile_id
left join public.profile accepted_by on accepted_by.profile_id = item.accepted_by_profile_id
left join lateral (
  select count(*)::integer as attachment_count,
         string_agg(attachment.original_name, ', ' order by attachment.created_at) as attachment_names
  from public.demo_work_attachment attachment
  where attachment.work_item_id = item.work_item_id
) files on true
left join lateral (
  select request.delegation_request_id, request.to_org_key, destination.name as to_org_name, request.status_code
  from public.demo_work_delegation_request request
  join public.ref_yongin_org_unit destination on destination.org_key = request.to_org_key
  where request.work_item_id = item.work_item_id
  order by request.requested_at desc, request.created_at desc
  limit 1
) latest_delegation on true;

grant select on public.v_demo_my_work to anon, authenticated;

alter table public.demo_work_assignment_rule enable row level security;
alter table public.demo_work_item enable row level security;
alter table public.demo_work_assignment_event enable row level security;
alter table public.demo_work_delegation_request enable row level security;
alter table public.demo_work_attachment enable row level security;
alter table public.demo_work_reset_log enable row level security;

revoke all on public.demo_work_assignment_rule, public.demo_work_item,
  public.demo_work_assignment_event, public.demo_work_delegation_request,
  public.demo_work_attachment, public.demo_work_reset_log from anon, authenticated;
grant select on public.demo_work_assignment_rule, public.demo_work_item,
  public.demo_work_assignment_event, public.demo_work_delegation_request,
  public.demo_work_attachment, public.demo_work_reset_log to anon, authenticated;
grant usage, select on sequence public.demo_work_assignment_event_event_id_seq to anon, authenticated;
grant usage, select on sequence public.demo_work_reset_log_reset_id_seq to anon, authenticated;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'demo_work_assignment_rule','demo_work_item','demo_work_assignment_event',
    'demo_work_delegation_request','demo_work_attachment','demo_work_reset_log'
  ] loop
    execute format('drop policy if exists demo_read on public.%I', table_name);
    execute format(
      'create policy demo_read on public.%I for select to anon, authenticated using (private.demo_role_allowed(array[''target_manager'',''inspector'',''executive'']::text[]))',
      table_name
    );
  end loop;
end $$;

drop policy if exists my_work_attachment_read on storage.objects;
drop policy if exists my_work_attachment_insert on storage.objects;
drop policy if exists my_work_attachment_update on storage.objects;
drop policy if exists my_work_attachment_delete on storage.objects;
create policy my_work_attachment_read on storage.objects
for select to anon, authenticated
using (
  bucket_id = 'evidence-private'
  and (storage.foldername(name))[1] = 'demo'
  and (storage.foldername(name))[2] = 'my-work'
  and private.demo_role_allowed(array['target_manager','inspector','executive']::text[])
);
create policy my_work_attachment_insert on storage.objects
for insert to anon, authenticated
with check (
  bucket_id = 'evidence-private'
  and (storage.foldername(name))[1] = 'demo'
  and (storage.foldername(name))[2] = 'my-work'
  and private.demo_write_enabled()
  and private.demo_role_allowed(array['target_manager','inspector','executive']::text[])
);
create policy my_work_attachment_update on storage.objects
for update to anon, authenticated
using (
  bucket_id = 'evidence-private'
  and (storage.foldername(name))[1] = 'demo'
  and (storage.foldername(name))[2] = 'my-work'
  and private.demo_write_enabled()
  and private.demo_role_allowed(array['target_manager','inspector','executive']::text[])
)
with check (
  bucket_id = 'evidence-private'
  and (storage.foldername(name))[1] = 'demo'
  and (storage.foldername(name))[2] = 'my-work'
  and private.demo_write_enabled()
  and private.demo_role_allowed(array['target_manager','inspector','executive']::text[])
);
create policy my_work_attachment_delete on storage.objects
for delete to anon, authenticated
using (
  bucket_id = 'evidence-private'
  and (storage.foldername(name))[1] = 'demo'
  and (storage.foldername(name))[2] = 'my-work'
  and private.demo_write_enabled()
  and private.demo_role_allowed(array['target_manager','inspector','executive']::text[])
);

comment on table public.demo_work_assignment_rule is 'Reset-safe assignment rules. DEMO_INTERNAL rules are sales-demo assumptions, not legal conclusions.';
comment on table public.demo_work_item is 'Resettable My Work operating records linked to immutable facility-obligation IDs.';
comment on table public.demo_work_assignment_event is 'Bitemporal-style assignment/status log: occurred_at is business event time; created_at is database record time.';
comment on table public.demo_work_reset_log is 'Reset audit retained while mutable My Work records are deleted and reseeded.';
comment on function public.demo_work_reset(uuid,timestamptz) is 'Reset My Work database rows only. Client must remove Storage objects first after explicit confirmation.';

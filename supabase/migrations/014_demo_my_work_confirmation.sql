-- Separate completion from final confirmation in the resettable demo runtime layer.
-- Physical tables stay in public for PostgREST compatibility; demo_work_* is the logical demo_runtime domain.

alter table public.demo_work_item
  add column if not exists confirmed_by_profile_id uuid references public.profile(profile_id),
  add column if not exists confirmed_at timestamptz,
  add column if not exists confirmation_note text;

alter table public.demo_work_item
  drop constraint if exists demo_work_item_confirmation_consistency;
alter table public.demo_work_item
  add constraint demo_work_item_confirmation_consistency check (
    (confirmed_at is null and confirmed_by_profile_id is null)
    or (
      status_code = 'COMPLETED'
      and completed_at is not null
      and confirmed_at is not null
      and confirmed_by_profile_id is not null
    )
  );

alter table public.demo_work_assignment_event
  drop constraint if exists demo_work_assignment_event_event_type_check;
alter table public.demo_work_assignment_event
  add constraint demo_work_assignment_event_event_type_check check (event_type in (
    'CREATED','AUTO_ASSIGNED','MANUAL_ASSIGNED','REASSIGNED','ACCEPTED',
    'STATUS_CHANGED','DELEGATION_REQUESTED','DELEGATION_APPROVED',
    'DELEGATION_REJECTED','COMPLETED','CONFIRMED','ATTACHMENT_ADDED','ATTACHMENT_REMOVED'
  ));

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
set search_path = pg_catalog, public, private, pg_temp
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

  select * into previous_item
  from public.demo_work_item
  where work_item_id = p_work_item_id
  for update;
  if not found then raise exception 'Work item not found'; end if;
  if p_status_code = 'COMPLETED' and previous_item.assigned_org_key is null then
    raise exception 'Assign an organization before completion';
  end if;

  event_kind := case when p_status_code = 'COMPLETED' then 'COMPLETED' else 'STATUS_CHANGED' end;

  update public.demo_work_item
  set status_code = p_status_code,
      status_changed_at = p_occurred_at,
      completed_at = case when p_status_code = 'COMPLETED' then p_occurred_at else null end,
      completion_note = case when p_status_code = 'COMPLETED' then nullif(trim(p_note),'') else completion_note end,
      confirmed_by_profile_id = case when p_status_code = 'COMPLETED' then confirmed_by_profile_id else null end,
      confirmed_at = case when p_status_code = 'COMPLETED' then confirmed_at else null end,
      confirmation_note = case when p_status_code = 'COMPLETED' then confirmation_note else null end,
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

create or replace function public.demo_work_confirm_completion(
  p_work_item_id uuid,
  p_confirmation_note text,
  p_actor_profile_id uuid,
  p_occurred_at timestamptz default now()
)
returns public.demo_work_item
language plpgsql
security definer
set search_path = pg_catalog, public, private, pg_temp
as $$
declare
  previous_item public.demo_work_item;
  updated_item public.demo_work_item;
begin
  if not private.demo_write_enabled() or not private.demo_role_allowed(array['inspector','executive']::text[]) then
    raise exception 'Demo work confirmation is disabled';
  end if;

  select * into previous_item
  from public.demo_work_item
  where work_item_id = p_work_item_id
  for update;
  if not found then raise exception 'Work item not found'; end if;
  if previous_item.status_code <> 'COMPLETED' or previous_item.completed_at is null then
    raise exception 'Only completed work can be confirmed';
  end if;
  if previous_item.confirmed_at is not null then
    raise exception 'Work completion is already confirmed';
  end if;

  update public.demo_work_item
  set confirmed_by_profile_id = p_actor_profile_id,
      confirmed_at = p_occurred_at,
      confirmation_note = nullif(trim(p_confirmation_note),''),
      updated_at = now()
  where work_item_id = p_work_item_id
  returning * into updated_item;

  insert into public.demo_work_assignment_event (
    work_item_id,event_type,from_org_key,to_org_key,from_assignee,to_assignee,
    from_status,to_status,reason,actor_profile_id,actor_display_name,occurred_at,created_at,
    metadata
  ) values (
    p_work_item_id,'CONFIRMED',previous_item.assigned_org_key,previous_item.assigned_org_key,
    previous_item.assignee_display_name,previous_item.assignee_display_name,
    previous_item.status_code,previous_item.status_code,nullif(trim(p_confirmation_note),''),
    p_actor_profile_id,private.demo_work_actor_name(p_actor_profile_id),p_occurred_at,now(),
    jsonb_build_object('completed_at', previous_item.completed_at)
  );
  return updated_item;
end
$$;

revoke all on function public.demo_work_change_status(uuid,text,text,uuid,timestamptz) from public;
revoke all on function public.demo_work_confirm_completion(uuid,text,uuid,timestamptz) from public;
grant execute on function public.demo_work_change_status(uuid,text,text,uuid,timestamptz) to anon, authenticated;
grant execute on function public.demo_work_confirm_completion(uuid,text,uuid,timestamptz) to anon, authenticated;

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
  latest_delegation.status_code as delegation_status,
  item.confirmed_by_profile_id,
  confirmed_by.display_name as confirmed_by_name,
  item.confirmed_at,
  item.confirmation_note
from public.demo_work_item item
left join public.demo_work_assignment_rule rule on rule.rule_id = item.assignment_rule_id
left join public.ref_yongin_org_unit organization on organization.org_key = item.assigned_org_key
left join public.profile assigned_by on assigned_by.profile_id = item.assigned_by_profile_id
left join public.profile accepted_by on accepted_by.profile_id = item.accepted_by_profile_id
left join public.profile confirmed_by on confirmed_by.profile_id = item.confirmed_by_profile_id
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

comment on column public.demo_work_item.completed_at is 'Business event time when the assignee marked work complete.';
comment on column public.demo_work_item.confirmed_at is 'Business event time when an inspector or executive confirmed the completion.';
comment on column public.demo_work_item.confirmed_by_profile_id is 'Demo profile that performed final completion confirmation.';
comment on function public.demo_work_confirm_completion(uuid,text,uuid,timestamptz) is
  'Confirm an already completed work item and append a separate CONFIRMED event with occurred_at and created_at.';

-- Preserve event-specific timestamps and reject invalid My Work transitions.

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
  if not exists (select 1 from public.ref_yongin_org_unit where org_key = p_to_org_key and is_active) then
    raise exception 'Unknown or inactive organization unit';
  end if;

  select * into previous_item
  from public.demo_work_item
  where work_item_id = p_work_item_id
  for update;
  if not found then raise exception 'Work item not found'; end if;
  if previous_item.status_code = 'COMPLETED' then
    raise exception 'Completed work cannot be reassigned';
  end if;

  event_kind := case when previous_item.assigned_org_key is null then 'MANUAL_ASSIGNED' else 'REASSIGNED' end;

  update public.demo_work_item
  set assigned_org_key = p_to_org_key,
      assignee_display_name = coalesce(nullif(trim(p_assignee_display_name), ''), (select name from public.ref_yongin_org_unit where org_key = p_to_org_key)),
      assignment_mode = 'MANUAL',
      assignment_rule_id = null,
      assigned_by_profile_id = case when event_kind = 'MANUAL_ASSIGNED' then p_actor_profile_id else assigned_by_profile_id end,
      assigned_at = case when event_kind = 'MANUAL_ASSIGNED' then p_occurred_at else assigned_at end,
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
set search_path = pg_catalog, public, private, pg_temp
as $$
declare
  previous_item public.demo_work_item;
  updated_item public.demo_work_item;
begin
  if not private.demo_write_enabled() or not private.demo_role_allowed(array['target_manager','inspector','executive']::text[]) then
    raise exception 'Demo work write is disabled';
  end if;

  select * into previous_item
  from public.demo_work_item
  where work_item_id = p_work_item_id
  for update;
  if not found then raise exception 'Work item not found'; end if;
  if previous_item.assigned_org_key is null then
    raise exception 'Assign an organization before acceptance';
  end if;
  if previous_item.status_code <> 'ASSIGNED' then
    raise exception 'Only assigned work can be accepted';
  end if;

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
  if p_status_code not in ('IN_PROGRESS','SUPPLEMENT_REQUIRED','COMPLETED','NOT_APPLICABLE') then
    raise exception 'Unsupported work status transition';
  end if;

  select * into previous_item
  from public.demo_work_item
  where work_item_id = p_work_item_id
  for update;
  if not found then raise exception 'Work item not found'; end if;
  if previous_item.status_code = 'COMPLETED' then
    raise exception 'Completed work cannot change status';
  end if;
  if previous_item.assigned_org_key is null then
    raise exception 'Assign an organization before status change';
  end if;
  if previous_item.accepted_at is null then
    raise exception 'Accept the assignment before status change';
  end if;
  if previous_item.status_code = p_status_code then
    raise exception 'Work is already in the requested status';
  end if;

  event_kind := case when p_status_code = 'COMPLETED' then 'COMPLETED' else 'STATUS_CHANGED' end;

  update public.demo_work_item
  set status_code = p_status_code,
      status_changed_at = p_occurred_at,
      completed_at = case when p_status_code = 'COMPLETED' then p_occurred_at else null end,
      completion_note = case when p_status_code = 'COMPLETED' then nullif(trim(p_note),'') else completion_note end,
      confirmed_by_profile_id = null,
      confirmed_at = null,
      confirmation_note = null,
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

-- Backfill a distinct completion event if a baseline projection already contained completed work.
insert into public.demo_work_assignment_event (
  work_item_id,event_type,from_org_key,to_org_key,from_assignee,to_assignee,
  from_status,to_status,reason,actor_display_name,occurred_at,created_at,metadata
)
select
  item.work_item_id,'COMPLETED',item.assigned_org_key,item.assigned_org_key,
  item.assignee_display_name,item.assignee_display_name,
  'IN_PROGRESS','COMPLETED','기준 workflow 완료상태 투영','시스템',
  item.completed_at,item.created_at,jsonb_build_object('baseline_seed', true)
from public.demo_work_item item
where item.status_code = 'COMPLETED'
  and item.completed_at is not null
  and not exists (
    select 1
    from public.demo_work_assignment_event event
    where event.work_item_id = item.work_item_id
      and event.event_type = 'COMPLETED'
  );

create or replace function public.demo_work_reset(
  p_actor_profile_id uuid,
  p_occurred_at timestamptz default now()
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private, pg_temp
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

  perform pg_advisory_xact_lock(hashtextextended('demo-work-reset:yongin', 0));

  select count(*)::integer into work_count from public.demo_work_item;
  select count(*)::integer into event_count from public.demo_work_assignment_event;
  select count(*)::integer into delegation_count from public.demo_work_delegation_request;
  select count(*)::integer into attachment_count from public.demo_work_attachment;

  delete from public.demo_work_item where work_item_id is not null;
  seeded_count := private.seed_demo_work_items();

  insert into public.demo_work_assignment_event (
    work_item_id,event_type,from_org_key,to_org_key,from_assignee,to_assignee,
    from_status,to_status,reason,actor_display_name,occurred_at,created_at,metadata
  )
  select
    item.work_item_id,'COMPLETED',item.assigned_org_key,item.assigned_org_key,
    item.assignee_display_name,item.assignee_display_name,
    'IN_PROGRESS','COMPLETED','기준 workflow 완료상태 투영','시스템',
    item.completed_at,item.created_at,jsonb_build_object('baseline_seed', true)
  from public.demo_work_item item
  where item.status_code = 'COMPLETED'
    and item.completed_at is not null
    and not exists (
      select 1
      from public.demo_work_assignment_event event
      where event.work_item_id = item.work_item_id
        and event.event_type = 'COMPLETED'
    );

  insert into public.demo_work_reset_log (
    actor_profile_id,actor_display_name,deleted_work_items,deleted_events,
    deleted_delegations,deleted_attachments,seeded_work_items,occurred_at,created_at
  ) values (
    p_actor_profile_id,private.demo_work_actor_name(p_actor_profile_id),work_count,event_count,
    delegation_count,attachment_count,seeded_count,p_occurred_at,now()
  );

  return jsonb_build_object(
    'deleted_work_items', work_count,
    'deleted_events', event_count,
    'deleted_delegations', delegation_count,
    'deleted_attachments', attachment_count,
    'seeded_work_items', seeded_count,
    'reset_at', p_occurred_at
  );
end
$$;

revoke all on function public.demo_work_assign(uuid,text,text,uuid,text,timestamptz) from public;
revoke all on function public.demo_work_accept(uuid,uuid,timestamptz) from public;
revoke all on function public.demo_work_change_status(uuid,text,text,uuid,timestamptz) from public;
revoke all on function public.demo_work_reset(uuid,timestamptz) from public;
grant execute on function public.demo_work_assign(uuid,text,text,uuid,text,timestamptz) to anon, authenticated;
grant execute on function public.demo_work_accept(uuid,uuid,timestamptz) to anon, authenticated;
grant execute on function public.demo_work_change_status(uuid,text,text,uuid,timestamptz) to anon, authenticated;
grant execute on function public.demo_work_reset(uuid,timestamptz) to anon, authenticated;

comment on function public.demo_work_assign(uuid,text,text,uuid,text,timestamptz) is
  'Assign or reassign work while preserving the original assigned_at and recording reassigned_at in a separate event.';
comment on function public.demo_work_accept(uuid,uuid,timestamptz) is
  'Accept only work currently in ASSIGNED state.';
comment on function public.demo_work_change_status(uuid,text,text,uuid,timestamptz) is
  'Change accepted work to an execution status; completed work is terminal in the demo runtime.';

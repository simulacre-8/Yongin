-- Treat delegation as a guarded status transition in the resettable demo runtime.

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
set search_path = pg_catalog, public, private, pg_temp
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
  if nullif(trim(p_basis_note),'') is null then
    raise exception 'Delegation basis is required';
  end if;
  if not exists (select 1 from public.ref_yongin_org_unit where org_key = p_to_org_key and is_active) then
    raise exception 'Unknown or inactive organization unit';
  end if;

  select * into previous_item
  from public.demo_work_item
  where work_item_id = p_work_item_id
  for update;
  if not found then raise exception 'Work item not found'; end if;
  if previous_item.assigned_org_key is null then
    raise exception 'Assign an organization before delegation';
  end if;
  if previous_item.accepted_at is null or previous_item.status_code not in ('ACCEPTED','IN_PROGRESS','SUPPLEMENT_REQUIRED') then
    raise exception 'Only accepted active work can request delegation';
  end if;
  if previous_item.assigned_org_key = p_to_org_key then
    raise exception 'Delegation target must differ from the current organization';
  end if;

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

revoke all on function public.demo_work_request_delegation(uuid,text,text,text,text,text,text,bigint,uuid,timestamptz) from public;
grant execute on function public.demo_work_request_delegation(uuid,text,text,text,text,text,text,bigint,uuid,timestamptz) to anon, authenticated;

comment on function public.demo_work_request_delegation(uuid,text,text,text,text,text,text,bigint,uuid,timestamptz) is
  'Request delegation only for accepted active work, with a distinct target organization and required basis attachment.';

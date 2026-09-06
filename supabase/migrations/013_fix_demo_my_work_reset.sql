-- Supabase pg-safeupdate compatibility for the resettable My Work layer.
-- Storage objects remain a client-side pre-step; this function resets DB rows only.

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

  -- Explicit WHERE satisfies the project's pg-safeupdate guard. Child rows cascade.
  delete from public.demo_work_item where work_item_id is not null;
  seeded_count := private.seed_demo_work_items();

  insert into public.demo_work_reset_log (
    actor_profile_id,
    actor_display_name,
    deleted_work_items,
    deleted_events,
    deleted_delegations,
    deleted_attachments,
    seeded_work_items,
    occurred_at,
    created_at
  ) values (
    p_actor_profile_id,
    private.demo_work_actor_name(p_actor_profile_id),
    work_count,
    event_count,
    delegation_count,
    attachment_count,
    seeded_count,
    p_occurred_at,
    now()
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

revoke all on function public.demo_work_reset(uuid,timestamptz) from public;
grant execute on function public.demo_work_reset(uuid,timestamptz) to anon, authenticated;

comment on function public.demo_work_reset(uuid,timestamptz) is
  'After explicit UI confirmation and client-side demo/my-work Storage cleanup, reset only My Work DB rows and retain a reset audit log.';

-- Distinguish a pending delegation request from an actually reassigned delegated task.
-- A compliance action is marked DELEGATED only after a REASSIGNED event occurred on or after the request.

create or replace function private.set_compliance_action_work_origin()
returns trigger
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_delegated_at timestamptz;
begin
  select reassigned.occurred_at
  into v_delegated_at
  from public.demo_work_item wi
  join lateral (
    select e.occurred_at
    from public.demo_work_assignment_event e
    where e.work_item_id = wi.work_item_id
      and e.event_type = 'REASSIGNED'
      and wi.delegation_requested_at is not null
      and e.occurred_at >= wi.delegation_requested_at
    order by e.occurred_at desc, e.event_id desc
    limit 1
  ) reassigned on true
  where wi.target_obligation_id = new.target_obligation_id
  limit 1;

  if v_delegated_at is null then
    new.work_origin := 'ORIGINAL';
    new.delegated_at := null;
  else
    new.work_origin := 'DELEGATED';
    new.delegated_at := v_delegated_at;
  end if;

  return new;
end
$$;

revoke all on function private.set_compliance_action_work_origin() from public, anon, authenticated;

drop trigger if exists set_compliance_action_work_origin_before_insert
  on public.demo_compliance_action_event;
create trigger set_compliance_action_work_origin_before_insert
before insert on public.demo_compliance_action_event
for each row execute function private.set_compliance_action_work_origin();

notify pgrst, 'reload schema';

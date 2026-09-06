-- Enforce the demo runtime lifecycle at the table boundary, not only in individual RPCs.

create or replace function private.guard_demo_work_status_transition()
returns trigger
language plpgsql
set search_path = pg_catalog, public, private, pg_temp
as $$
begin
  if new.status_code = old.status_code then
    return new;
  end if;

  if old.status_code = 'COMPLETED' then
    raise exception 'Completed work cannot change status';
  end if;

  if new.status_code = 'ACCEPTED' and old.status_code <> 'ASSIGNED' then
    raise exception 'Only assigned work can be accepted';
  end if;

  if new.status_code in ('IN_PROGRESS','SUPPLEMENT_REQUIRED','COMPLETED','NOT_APPLICABLE')
     and old.status_code not in ('ACCEPTED','IN_PROGRESS','SUPPLEMENT_REQUIRED') then
    raise exception 'Only accepted active work can change execution status';
  end if;

  if new.status_code = 'DELEGATION_REQUESTED'
     and old.status_code not in ('ACCEPTED','IN_PROGRESS','SUPPLEMENT_REQUIRED') then
    raise exception 'Only accepted active work can request delegation';
  end if;

  if old.status_code = 'DELEGATION_REQUESTED' and new.status_code <> 'ASSIGNED' then
    raise exception 'Delegation-requested work must be reassigned before execution resumes';
  end if;

  if old.status_code = 'NOT_APPLICABLE' and new.status_code <> 'ASSIGNED' then
    raise exception 'Not-applicable work must be reassigned before execution resumes';
  end if;

  return new;
end
$$;

revoke all on function private.guard_demo_work_status_transition() from public, anon, authenticated;

drop trigger if exists demo_work_status_transition_guard on public.demo_work_item;
create trigger demo_work_status_transition_guard
before update of status_code on public.demo_work_item
for each row execute function private.guard_demo_work_status_transition();

comment on function private.guard_demo_work_status_transition() is
  'Table-level lifecycle guard for the resettable shared demo runtime; real production authorization still requires Supabase Auth and organization-scoped RLS.';

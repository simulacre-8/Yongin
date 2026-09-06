-- Audit CSV exports from the facility-obligation execution screen.
-- This is shared demo runtime data, not a production user-identity boundary.

create table if not exists public.demo_compliance_export_event (
  export_event_id uuid primary key default gen_random_uuid(),
  export_kind text not null check (export_kind in ('FACILITY_WORKFLOW_CSV')),
  target_ref text not null check (btrim(target_ref) <> ''),
  period_key text not null,
  row_count integer not null check (row_count between 1 and 500),
  file_name text not null check (btrim(file_name) <> ''),
  actor_role text,
  filter_snapshot jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists demo_compliance_export_target_idx
  on public.demo_compliance_export_event(target_ref, occurred_at desc);
create index if not exists demo_compliance_export_created_idx
  on public.demo_compliance_export_event(created_at desc);

alter table public.demo_compliance_export_event enable row level security;

grant select on public.demo_compliance_export_event to anon, authenticated;

drop policy if exists demo_compliance_export_read on public.demo_compliance_export_event;
create policy demo_compliance_export_read
  on public.demo_compliance_export_event
  for select
  to anon, authenticated
  using (private.demo_access_enabled());

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
  if p_row_count < 1 or p_row_count > 500 then
    raise exception 'Export row count must be between 1 and 500';
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
  )
  values (
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

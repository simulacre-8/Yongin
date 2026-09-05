-- Yongin safety demo: hosted Supabase/PostgreSQL schema (no Docker required)
-- Apply once in Supabase Dashboard > SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.app_setting (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

insert into public.app_setting(key, value)
values
  ('demo_access_enabled', 'true'::jsonb),
  ('demo_write_enabled', 'true'::jsonb)
on conflict (key) do update set value = excluded.value, updated_at = now();

create or replace function public.demo_write_enabled()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select (value #>> '{}')::boolean from public.app_setting where key = 'demo_write_enabled'), false)
$$;

revoke all on function public.demo_write_enabled() from public;
grant execute on function public.demo_write_enabled() to anon, authenticated;

create or replace function public.demo_access_enabled()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select (value #>> '{}')::boolean from public.app_setting where key = 'demo_access_enabled'), false)
$$;

revoke all on function public.demo_access_enabled() from public;
grant execute on function public.demo_access_enabled() to anon, authenticated;

-- Read-only legal projection. Preserve source ontology IDs for later graph migration.
create table if not exists public.ref_law (
  law_id text primary key,
  title_ko text not null,
  law_kind text not null,
  relation_type text,
  ministry text,
  source_version text not null,
  effective_from date,
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.ref_unit (
  unit_id text primary key,
  law_id text not null references public.ref_law(law_id) on delete cascade,
  unit_path text,
  unit_label text,
  unit_type text,
  article_no text,
  display_text text not null,
  source_version text not null,
  metadata jsonb not null default '{}'::jsonb
);
create index if not exists ref_unit_law_idx on public.ref_unit(law_id);

create table if not exists public.ref_rule (
  rul_id text primary key,
  source_unit_id text references public.ref_unit(unit_id),
  condition_kind text,
  condition_item text not null,
  metric_key text not null,
  operator text not null check (operator in ('eq','neq','gt','gte','lt','lte','in','contains')),
  threshold_value numeric,
  threshold_text text,
  threshold_unit text,
  source_quote text not null,
  review_status text not null default 'pending',
  demo_approved boolean not null default false,
  source_version text not null,
  metadata jsonb not null default '{}'::jsonb
);
create index if not exists ref_rule_demo_idx on public.ref_rule(demo_approved, metric_key);

create table if not exists public.ref_obligation (
  obl_id text primary key,
  anchor_unit_id text references public.ref_unit(unit_id),
  parent_obl_id text references public.ref_obligation(obl_id),
  title_ko text not null,
  detail_ko text,
  obligation_group text not null,
  cycle text,
  evidence_required boolean not null default true,
  review_status text not null default 'pending',
  source_version text not null,
  display_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.ref_rule_obligation (
  rul_id text not null references public.ref_rule(rul_id) on delete cascade,
  obl_id text not null references public.ref_obligation(obl_id) on delete cascade,
  link_basis text,
  link_confidence text not null check (link_confidence in ('high','medium','low')),
  review_status text not null default 'pending',
  demo_approved boolean not null default false,
  link_evidence text,
  primary key (rul_id, obl_id)
);

-- Scenario pack: clone this data, not the frontend, for another industry.
create table if not exists public.demo_scenario (
  scenario_id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  target_track text not null,
  source_snapshot jsonb not null default '{}'::jsonb,
  ui_config jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.org (
  org_id uuid primary key default gen_random_uuid(),
  parent_org_id uuid references public.org(org_id),
  name text not null,
  org_type text not null,
  code text unique,
  is_demo boolean not null default true
);

create table if not exists public.profile (
  profile_id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique,
  org_id uuid references public.org(org_id),
  display_name text not null,
  role_code text not null check (role_code in ('target_manager','inspector','executive')),
  is_demo boolean not null default true
);

create or replace function public.demo_role_allowed(allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    (auth.uid() is null and public.demo_access_enabled())
    or exists (
      select 1
      from public.profile p
      where p.auth_user_id = auth.uid()
        and p.role_code = any(allowed_roles)
    )
$$;

revoke all on function public.demo_role_allowed(text[]) from public;
grant execute on function public.demo_role_allowed(text[]) to anon, authenticated;

create table if not exists public.target (
  target_id uuid primary key default gen_random_uuid(),
  scenario_id uuid not null references public.demo_scenario(scenario_id) on delete cascade,
  org_id uuid references public.org(org_id),
  name text not null,
  target_type text not null,
  detail_type text,
  address text,
  manager_name text,
  attributes jsonb not null default '{}'::jsonb,
  is_demo boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists target_scenario_idx on public.target(scenario_id);
create index if not exists target_org_idx on public.target(org_id);
create index if not exists target_type_idx on public.target(target_type, detail_type);

create table if not exists public.scenario_law (
  scenario_id uuid not null references public.demo_scenario(scenario_id) on delete cascade,
  law_id text not null references public.ref_law(law_id) on delete cascade,
  primary key (scenario_id, law_id)
);

create table if not exists public.scenario_rule (
  scenario_id uuid not null references public.demo_scenario(scenario_id) on delete cascade,
  rul_id text not null references public.ref_rule(rul_id) on delete cascade,
  primary key (scenario_id, rul_id)
);

create table if not exists public.target_applicability (
  applicability_id uuid primary key default gen_random_uuid(),
  target_id uuid not null references public.target(target_id) on delete cascade,
  rul_id text not null references public.ref_rule(rul_id),
  is_applicable boolean not null,
  input_snapshot jsonb not null,
  rule_snapshot jsonb not null,
  source_version text not null,
  evaluated_at timestamptz not null default now(),
  unique (target_id, rul_id)
);
create index if not exists target_applicability_target_idx on public.target_applicability(target_id, is_applicable);
create index if not exists target_applicability_rule_idx on public.target_applicability(rul_id);

create table if not exists public.target_obligation (
  target_obligation_id uuid primary key default gen_random_uuid(),
  target_id uuid not null references public.target(target_id) on delete cascade,
  obl_id text not null references public.ref_obligation(obl_id),
  due_type text not null check (due_type in ('month','half','event')),
  due_value text,
  applicability_snapshot jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  unique (target_id, obl_id)
);
create index if not exists target_obligation_target_idx on public.target_obligation(target_id, is_active);
create index if not exists target_obligation_obl_idx on public.target_obligation(obl_id);

create table if not exists public.compliance_record (
  compliance_id uuid primary key default gen_random_uuid(),
  target_obligation_id uuid not null references public.target_obligation(target_obligation_id) on delete cascade,
  period_key text not null,
  status text not null check (status in ('DONE','SUPP','NONE','NA')),
  action_date date,
  action_detail text,
  note text,
  submitted_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (target_obligation_id, period_key)
);
create index if not exists compliance_period_status_idx on public.compliance_record(period_key, status);
create index if not exists compliance_updated_idx on public.compliance_record(updated_at desc);

create table if not exists public.evidence (
  evidence_id uuid primary key default gen_random_uuid(),
  compliance_id uuid not null references public.compliance_record(compliance_id) on delete cascade,
  storage_bucket text not null default 'evidence-private',
  storage_path text not null,
  original_name text not null,
  mime_type text,
  size_bytes bigint not null check (size_bytes between 1 and 10485760),
  version_no integer not null default 1,
  uploaded_by uuid references public.profile(profile_id),
  uploaded_at timestamptz not null default now(),
  is_current boolean not null default true
);
create index if not exists evidence_compliance_idx on public.evidence(compliance_id, is_current);

create table if not exists public.inspection_run (
  inspection_run_id uuid primary key default gen_random_uuid(),
  scenario_id uuid not null references public.demo_scenario(scenario_id),
  title text not null,
  period_key text not null,
  status text not null default 'OPEN' check (status in ('OPEN','SUBMITTED','APPROVED')),
  created_by uuid references public.profile(profile_id),
  created_at timestamptz not null default now()
);
create index if not exists inspection_run_scenario_period_idx on public.inspection_run(scenario_id, period_key);

create table if not exists public.inspection_scope (
  inspection_scope_id uuid primary key default gen_random_uuid(),
  inspection_run_id uuid not null references public.inspection_run(inspection_run_id) on delete cascade,
  target_id uuid not null references public.target(target_id) on delete cascade,
  target_obligation_id uuid references public.target_obligation(target_obligation_id) on delete cascade,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (inspection_run_id, target_id, target_obligation_id)
);
create index if not exists inspection_scope_run_idx on public.inspection_scope(inspection_run_id, is_active);
create index if not exists inspection_scope_target_idx on public.inspection_scope(target_id);

create table if not exists public.inspection_result (
  inspection_result_id uuid primary key default gen_random_uuid(),
  inspection_run_id uuid not null references public.inspection_run(inspection_run_id) on delete cascade,
  compliance_id uuid not null references public.compliance_record(compliance_id) on delete cascade,
  status text not null check (status in ('DONE','SUPP','NONE','NA')),
  inspection_note text,
  inspected_by uuid references public.profile(profile_id),
  inspected_at timestamptz not null default now(),
  previous_result_id uuid references public.inspection_result(inspection_result_id),
  unique (inspection_run_id, compliance_id)
);
create index if not exists inspection_result_run_status_idx on public.inspection_result(inspection_run_id, status);
create index if not exists inspection_result_compliance_idx on public.inspection_result(compliance_id);

create table if not exists public.audit_event (
  audit_event_id bigint generated always as identity primary key,
  actor_profile_id uuid references public.profile(profile_id),
  action text not null,
  entity_type text not null,
  entity_id text not null,
  before_data jsonb,
  after_data jsonb,
  occurred_at timestamptz not null default now()
);
create index if not exists audit_entity_idx on public.audit_event(entity_type, entity_id, occurred_at desc);

create or replace function public.capture_demo_audit_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  before_row jsonb;
  after_row jsonb;
  entity_row jsonb;
  actor_id uuid;
begin
  before_row := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end;
  after_row := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end;
  entity_row := coalesce(after_row, before_row, '{}'::jsonb);

  select p.profile_id into actor_id
  from public.profile p
  where p.auth_user_id = auth.uid()
  limit 1;

  insert into public.audit_event(actor_profile_id, action, entity_type, entity_id, before_data, after_data)
  values (
    actor_id,
    lower(tg_op),
    tg_table_name,
    coalesce(
      entity_row ->> 'target_id',
      entity_row ->> 'applicability_id',
      entity_row ->> 'target_obligation_id',
      entity_row ->> 'compliance_id',
      entity_row ->> 'evidence_id',
      entity_row ->> 'inspection_result_id',
      entity_row ->> 'inspection_run_id',
      'unknown'
    ),
    before_row,
    after_row
  );

  if tg_op = 'DELETE' then return old; end if;
  return new;
end
$$;

drop trigger if exists target_audit_trg on public.target;
create trigger target_audit_trg after insert or update or delete on public.target for each row execute function public.capture_demo_audit_event();
drop trigger if exists target_applicability_audit_trg on public.target_applicability;
create trigger target_applicability_audit_trg after insert or update or delete on public.target_applicability for each row execute function public.capture_demo_audit_event();
drop trigger if exists compliance_record_audit_trg on public.compliance_record;
create trigger compliance_record_audit_trg after insert or update or delete on public.compliance_record for each row execute function public.capture_demo_audit_event();
drop trigger if exists evidence_audit_trg on public.evidence;
create trigger evidence_audit_trg after insert or update or delete on public.evidence for each row execute function public.capture_demo_audit_event();
drop trigger if exists inspection_result_audit_trg on public.inspection_result;
create trigger inspection_result_audit_trg after insert or update or delete on public.inspection_result for each row execute function public.capture_demo_audit_event();

create or replace view public.v_compliance_matrix
with (security_invoker = true)
as
select
  t.target_id,
  t.name as target_name,
  o.obl_id,
  o.title_ko as obligation_title,
  cr.period_key,
  cr.status,
  case cr.status when 'DONE' then 'O' when 'SUPP' then '△' when 'NONE' then 'X' else '-' end as symbol
from public.compliance_record cr
join public.target_obligation tro on tro.target_obligation_id = cr.target_obligation_id
join public.target t on t.target_id = tro.target_id
join public.ref_obligation o on o.obl_id = tro.obl_id;

create or replace view public.v_dashboard_summary
with (security_invoker = true)
as
select
  t.scenario_id,
  cr.period_key,
  count(*) filter (where cr.status = 'DONE') as done_count,
  count(*) filter (where cr.status = 'SUPP') as supplement_count,
  count(*) filter (where cr.status = 'NONE') as missing_count,
  count(*) filter (where cr.status = 'NA') as not_applicable_count,
  round(100.0 * count(*) filter (where cr.status = 'DONE') / nullif(count(*) filter (where cr.status <> 'NA'), 0), 1) as completion_rate
from public.compliance_record cr
join public.target_obligation tro on tro.target_obligation_id = cr.target_obligation_id
join public.target t on t.target_id = tro.target_id
group by t.scenario_id, cr.period_key;

-- RLS: legal projection is read-only. Business writes are temporarily enabled by app_setting.
alter table public.app_setting enable row level security;
alter table public.ref_law enable row level security;
alter table public.ref_unit enable row level security;
alter table public.ref_rule enable row level security;
alter table public.ref_obligation enable row level security;
alter table public.ref_rule_obligation enable row level security;
alter table public.demo_scenario enable row level security;
alter table public.org enable row level security;
alter table public.profile enable row level security;
alter table public.target enable row level security;
alter table public.scenario_law enable row level security;
alter table public.scenario_rule enable row level security;
alter table public.target_applicability enable row level security;
alter table public.target_obligation enable row level security;
alter table public.compliance_record enable row level security;
alter table public.evidence enable row level security;
alter table public.inspection_run enable row level security;
alter table public.inspection_scope enable row level security;
alter table public.inspection_result enable row level security;
alter table public.audit_event enable row level security;

revoke all on all tables in schema public from anon, authenticated;
grant select on public.ref_law, public.ref_unit, public.ref_rule, public.ref_obligation, public.ref_rule_obligation to anon, authenticated;
grant select on public.demo_scenario, public.org, public.profile, public.target, public.scenario_law, public.scenario_rule, public.target_applicability, public.target_obligation, public.compliance_record, public.evidence, public.inspection_run, public.inspection_scope, public.inspection_result, public.audit_event, public.v_compliance_matrix, public.v_dashboard_summary to anon, authenticated;
grant insert, update, delete on public.target, public.target_applicability, public.target_obligation, public.compliance_record, public.evidence, public.inspection_run, public.inspection_scope, public.inspection_result to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;

-- Idempotent public read policies.
do $$
declare tbl text;
begin
  foreach tbl in array array['ref_law','ref_unit','ref_rule','ref_obligation','ref_rule_obligation','demo_scenario','org','profile','target','scenario_law','scenario_rule','target_applicability','target_obligation','compliance_record','evidence','inspection_run','inspection_scope','inspection_result','audit_event']
  loop
    execute format('drop policy if exists demo_read on public.%I', tbl);
    execute format('create policy demo_read on public.%I for select to anon, authenticated using (public.demo_role_allowed(array[''target_manager'',''inspector'',''executive'']::text[]))', tbl);
  end loop;
end $$;

drop policy if exists demo_read on public.ref_rule;
create policy demo_read on public.ref_rule for select to anon, authenticated using (demo_approved = true and public.demo_role_allowed(array['target_manager','inspector','executive']::text[]));
drop policy if exists demo_read on public.ref_rule_obligation;
create policy demo_read on public.ref_rule_obligation for select to anon, authenticated using (demo_approved = true and public.demo_role_allowed(array['target_manager','inspector','executive']::text[]));

-- Demo-only mutation policies. Disable immediately after the sales demo:
-- update public.app_setting set value = 'false' where key = 'demo_write_enabled';
do $$
declare tbl text;
begin
  foreach tbl in array array['target','target_applicability','target_obligation','compliance_record','evidence']
  loop
    execute format('drop policy if exists demo_insert on public.%I', tbl);
    execute format('drop policy if exists demo_update on public.%I', tbl);
    execute format('drop policy if exists demo_delete on public.%I', tbl);
    execute format('create policy demo_insert on public.%I for insert to anon, authenticated with check (public.demo_write_enabled() and public.demo_role_allowed(array[''target_manager'',''executive'']::text[]))', tbl);
    execute format('create policy demo_update on public.%I for update to anon, authenticated using (public.demo_write_enabled() and public.demo_role_allowed(array[''target_manager'',''executive'']::text[])) with check (public.demo_write_enabled() and public.demo_role_allowed(array[''target_manager'',''executive'']::text[]))', tbl);
    execute format('create policy demo_delete on public.%I for delete to anon, authenticated using (public.demo_write_enabled() and public.demo_role_allowed(array[''target_manager'',''executive'']::text[]))', tbl);
  end loop;
end $$;

drop policy if exists demo_insert on public.target;
drop policy if exists demo_update on public.target;
drop policy if exists demo_delete on public.target;
create policy demo_insert on public.target for insert to anon, authenticated with check (public.demo_write_enabled() and public.demo_role_allowed(array['target_manager','executive']::text[]) and is_demo = true);
create policy demo_update on public.target for update to anon, authenticated using (public.demo_write_enabled() and public.demo_role_allowed(array['target_manager','executive']::text[]) and is_demo = true) with check (public.demo_write_enabled() and public.demo_role_allowed(array['target_manager','executive']::text[]) and is_demo = true);
create policy demo_delete on public.target for delete to anon, authenticated using (public.demo_write_enabled() and public.demo_role_allowed(array['target_manager','executive']::text[]) and is_demo = true);

drop policy if exists demo_insert on public.evidence;
drop policy if exists demo_update on public.evidence;
drop policy if exists demo_delete on public.evidence;
create policy demo_insert on public.evidence for insert to anon, authenticated with check (public.demo_write_enabled() and public.demo_role_allowed(array['target_manager','executive']::text[]) and storage_bucket = 'evidence-private' and storage_path like 'demo/%');
create policy demo_update on public.evidence for update to anon, authenticated using (public.demo_write_enabled() and public.demo_role_allowed(array['target_manager','executive']::text[]) and storage_bucket = 'evidence-private' and storage_path like 'demo/%') with check (public.demo_write_enabled() and public.demo_role_allowed(array['target_manager','executive']::text[]) and storage_bucket = 'evidence-private' and storage_path like 'demo/%');
create policy demo_delete on public.evidence for delete to anon, authenticated using (public.demo_write_enabled() and public.demo_role_allowed(array['target_manager','executive']::text[]) and storage_bucket = 'evidence-private' and storage_path like 'demo/%');

do $$
declare tbl text;
begin
  foreach tbl in array array['inspection_run','inspection_scope','inspection_result']
  loop
    execute format('drop policy if exists demo_insert on public.%I', tbl);
    execute format('drop policy if exists demo_update on public.%I', tbl);
    execute format('drop policy if exists demo_delete on public.%I', tbl);
    execute format('create policy demo_insert on public.%I for insert to anon, authenticated with check (public.demo_write_enabled() and public.demo_role_allowed(array[''inspector'',''executive'']::text[]))', tbl);
    execute format('create policy demo_update on public.%I for update to anon, authenticated using (public.demo_write_enabled() and public.demo_role_allowed(array[''inspector'',''executive'']::text[])) with check (public.demo_write_enabled() and public.demo_role_allowed(array[''inspector'',''executive'']::text[]))', tbl);
    execute format('create policy demo_delete on public.%I for delete to anon, authenticated using (public.demo_write_enabled() and public.demo_role_allowed(array[''inspector'',''executive'']::text[]))', tbl);
  end loop;
end $$;

drop policy if exists demo_insert on public.audit_event;
drop policy if exists demo_update on public.audit_event;
drop policy if exists demo_delete on public.audit_event;

insert into storage.buckets (id, name, public, file_size_limit)
values ('evidence-private', 'evidence-private', false, 10485760)
on conflict (id) do update set public = false, file_size_limit = 10485760;

drop policy if exists evidence_demo_read on storage.objects;
drop policy if exists evidence_demo_insert on storage.objects;
drop policy if exists evidence_demo_update on storage.objects;
drop policy if exists evidence_demo_delete on storage.objects;
create policy evidence_demo_read on storage.objects for select to anon, authenticated using (bucket_id = 'evidence-private' and (storage.foldername(name))[1] = 'demo' and public.demo_role_allowed(array['target_manager','inspector','executive']::text[]));
create policy evidence_demo_insert on storage.objects for insert to anon, authenticated with check (bucket_id = 'evidence-private' and (storage.foldername(name))[1] = 'demo' and public.demo_write_enabled() and public.demo_role_allowed(array['target_manager','executive']::text[]));
create policy evidence_demo_update on storage.objects for update to anon, authenticated using (bucket_id = 'evidence-private' and (storage.foldername(name))[1] = 'demo' and public.demo_write_enabled() and public.demo_role_allowed(array['target_manager','executive']::text[])) with check (bucket_id = 'evidence-private' and (storage.foldername(name))[1] = 'demo' and public.demo_write_enabled() and public.demo_role_allowed(array['target_manager','executive']::text[]));
create policy evidence_demo_delete on storage.objects for delete to anon, authenticated using (bucket_id = 'evidence-private' and (storage.foldername(name))[1] = 'demo' and public.demo_write_enabled() and public.demo_role_allowed(array['target_manager','executive']::text[]));

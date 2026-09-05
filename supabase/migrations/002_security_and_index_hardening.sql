-- Security and index hardening after Supabase Advisor review.

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;

create or replace function private.demo_write_enabled()
returns boolean
language sql
stable
security definer
set search_path = public, private
as $$
  select coalesce((select (value #>> '{}')::boolean from public.app_setting where key = 'demo_write_enabled'), false)
$$;

create or replace function private.demo_access_enabled()
returns boolean
language sql
stable
security definer
set search_path = public, private
as $$
  select coalesce((select (value #>> '{}')::boolean from public.app_setting where key = 'demo_access_enabled'), false)
$$;

create or replace function private.demo_role_allowed(allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public, private
as $$
  select
    (auth.uid() is null and private.demo_access_enabled())
    or exists (
      select 1
      from public.profile p
      where p.auth_user_id = auth.uid()
        and p.role_code = any(allowed_roles)
    )
$$;

revoke all on function private.demo_write_enabled() from public;
revoke all on function private.demo_access_enabled() from public;
revoke all on function private.demo_role_allowed(text[]) from public;
grant execute on function private.demo_write_enabled() to anon, authenticated;
grant execute on function private.demo_access_enabled() to anon, authenticated;
grant execute on function private.demo_role_allowed(text[]) to anon, authenticated;

create or replace function private.capture_demo_audit_event()
returns trigger
language plpgsql
security definer
set search_path = public, private
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

revoke all on function private.capture_demo_audit_event() from public, anon, authenticated;

drop trigger if exists target_audit_trg on public.target;
create trigger target_audit_trg after insert or update or delete on public.target for each row execute function private.capture_demo_audit_event();
drop trigger if exists target_applicability_audit_trg on public.target_applicability;
create trigger target_applicability_audit_trg after insert or update or delete on public.target_applicability for each row execute function private.capture_demo_audit_event();
drop trigger if exists compliance_record_audit_trg on public.compliance_record;
create trigger compliance_record_audit_trg after insert or update or delete on public.compliance_record for each row execute function private.capture_demo_audit_event();
drop trigger if exists evidence_audit_trg on public.evidence;
create trigger evidence_audit_trg after insert or update or delete on public.evidence for each row execute function private.capture_demo_audit_event();
drop trigger if exists inspection_result_audit_trg on public.inspection_result;
create trigger inspection_result_audit_trg after insert or update or delete on public.inspection_result for each row execute function private.capture_demo_audit_event();

do $$
declare tbl text;
begin
  foreach tbl in array array['ref_law','ref_unit','ref_rule','ref_obligation','ref_rule_obligation','demo_scenario','org','profile','target','scenario_law','scenario_rule','target_applicability','target_obligation','compliance_record','evidence','inspection_run','inspection_scope','inspection_result','audit_event']
  loop
    execute format('drop policy if exists demo_read on public.%I', tbl);
    execute format('create policy demo_read on public.%I for select to anon, authenticated using (private.demo_role_allowed(array[''target_manager'',''inspector'',''executive'']::text[]))', tbl);
  end loop;
end $$;

drop policy if exists demo_read on public.ref_rule;
create policy demo_read on public.ref_rule for select to anon, authenticated using (demo_approved = true and private.demo_role_allowed(array['target_manager','inspector','executive']::text[]));
drop policy if exists demo_read on public.ref_rule_obligation;
create policy demo_read on public.ref_rule_obligation for select to anon, authenticated using (demo_approved = true and private.demo_role_allowed(array['target_manager','inspector','executive']::text[]));

do $$
declare tbl text;
begin
  foreach tbl in array array['target','target_applicability','target_obligation','compliance_record','evidence']
  loop
    execute format('drop policy if exists demo_insert on public.%I', tbl);
    execute format('drop policy if exists demo_update on public.%I', tbl);
    execute format('drop policy if exists demo_delete on public.%I', tbl);
    execute format('create policy demo_insert on public.%I for insert to anon, authenticated with check (private.demo_write_enabled() and private.demo_role_allowed(array[''target_manager'',''executive'']::text[]))', tbl);
    execute format('create policy demo_update on public.%I for update to anon, authenticated using (private.demo_write_enabled() and private.demo_role_allowed(array[''target_manager'',''executive'']::text[])) with check (private.demo_write_enabled() and private.demo_role_allowed(array[''target_manager'',''executive'']::text[]))', tbl);
    execute format('create policy demo_delete on public.%I for delete to anon, authenticated using (private.demo_write_enabled() and private.demo_role_allowed(array[''target_manager'',''executive'']::text[]))', tbl);
  end loop;
end $$;

drop policy if exists demo_insert on public.target;
drop policy if exists demo_update on public.target;
drop policy if exists demo_delete on public.target;
create policy demo_insert on public.target for insert to anon, authenticated with check (private.demo_write_enabled() and private.demo_role_allowed(array['target_manager','executive']::text[]) and is_demo = true);
create policy demo_update on public.target for update to anon, authenticated using (private.demo_write_enabled() and private.demo_role_allowed(array['target_manager','executive']::text[]) and is_demo = true) with check (private.demo_write_enabled() and private.demo_role_allowed(array['target_manager','executive']::text[]) and is_demo = true);
create policy demo_delete on public.target for delete to anon, authenticated using (private.demo_write_enabled() and private.demo_role_allowed(array['target_manager','executive']::text[]) and is_demo = true);

drop policy if exists demo_insert on public.evidence;
drop policy if exists demo_update on public.evidence;
drop policy if exists demo_delete on public.evidence;
create policy demo_insert on public.evidence for insert to anon, authenticated with check (private.demo_write_enabled() and private.demo_role_allowed(array['target_manager','executive']::text[]) and storage_bucket = 'evidence-private' and storage_path like 'demo/%');
create policy demo_update on public.evidence for update to anon, authenticated using (private.demo_write_enabled() and private.demo_role_allowed(array['target_manager','executive']::text[]) and storage_bucket = 'evidence-private' and storage_path like 'demo/%') with check (private.demo_write_enabled() and private.demo_role_allowed(array['target_manager','executive']::text[]) and storage_bucket = 'evidence-private' and storage_path like 'demo/%');
create policy demo_delete on public.evidence for delete to anon, authenticated using (private.demo_write_enabled() and private.demo_role_allowed(array['target_manager','executive']::text[]) and storage_bucket = 'evidence-private' and storage_path like 'demo/%');

do $$
declare tbl text;
begin
  foreach tbl in array array['inspection_run','inspection_scope','inspection_result']
  loop
    execute format('drop policy if exists demo_insert on public.%I', tbl);
    execute format('drop policy if exists demo_update on public.%I', tbl);
    execute format('drop policy if exists demo_delete on public.%I', tbl);
    execute format('create policy demo_insert on public.%I for insert to anon, authenticated with check (private.demo_write_enabled() and private.demo_role_allowed(array[''inspector'',''executive'']::text[]))', tbl);
    execute format('create policy demo_update on public.%I for update to anon, authenticated using (private.demo_write_enabled() and private.demo_role_allowed(array[''inspector'',''executive'']::text[])) with check (private.demo_write_enabled() and private.demo_role_allowed(array[''inspector'',''executive'']::text[]))', tbl);
    execute format('create policy demo_delete on public.%I for delete to anon, authenticated using (private.demo_write_enabled() and private.demo_role_allowed(array[''inspector'',''executive'']::text[]))', tbl);
  end loop;
end $$;

drop policy if exists evidence_demo_read on storage.objects;
drop policy if exists evidence_demo_insert on storage.objects;
drop policy if exists evidence_demo_update on storage.objects;
drop policy if exists evidence_demo_delete on storage.objects;
create policy evidence_demo_read on storage.objects for select to anon, authenticated using (bucket_id = 'evidence-private' and (storage.foldername(name))[1] = 'demo' and private.demo_role_allowed(array['target_manager','inspector','executive']::text[]));
create policy evidence_demo_insert on storage.objects for insert to anon, authenticated with check (bucket_id = 'evidence-private' and (storage.foldername(name))[1] = 'demo' and private.demo_write_enabled() and private.demo_role_allowed(array['target_manager','executive']::text[]));
create policy evidence_demo_update on storage.objects for update to anon, authenticated using (bucket_id = 'evidence-private' and (storage.foldername(name))[1] = 'demo' and private.demo_write_enabled() and private.demo_role_allowed(array['target_manager','executive']::text[])) with check (bucket_id = 'evidence-private' and (storage.foldername(name))[1] = 'demo' and private.demo_write_enabled() and private.demo_role_allowed(array['target_manager','executive']::text[]));
create policy evidence_demo_delete on storage.objects for delete to anon, authenticated using (bucket_id = 'evidence-private' and (storage.foldername(name))[1] = 'demo' and private.demo_write_enabled() and private.demo_role_allowed(array['target_manager','executive']::text[]));

drop function if exists public.capture_demo_audit_event();
drop function if exists public.demo_role_allowed(text[]);
drop function if exists public.demo_access_enabled();
drop function if exists public.demo_write_enabled();

-- Existing project helper should not be callable through the public API.
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    execute 'revoke execute on function public.rls_auto_enable() from public, anon, authenticated';
  end if;
end $$;

drop policy if exists app_setting_no_client_access on public.app_setting;
create policy app_setting_no_client_access on public.app_setting
for all to anon, authenticated
using (false)
with check (false);

create index if not exists audit_event_actor_idx on public.audit_event(actor_profile_id);
create index if not exists evidence_uploaded_by_idx on public.evidence(uploaded_by);
create index if not exists inspection_result_inspected_by_idx on public.inspection_result(inspected_by);
create index if not exists inspection_result_previous_idx on public.inspection_result(previous_result_id);
create index if not exists inspection_run_created_by_idx on public.inspection_run(created_by);
create index if not exists inspection_scope_target_obligation_idx on public.inspection_scope(target_obligation_id);
create index if not exists org_parent_idx on public.org(parent_org_id);
create index if not exists profile_org_idx on public.profile(org_id);
create index if not exists ref_obligation_anchor_idx on public.ref_obligation(anchor_unit_id);
create index if not exists ref_obligation_parent_idx on public.ref_obligation(parent_obl_id);
create index if not exists ref_rule_source_unit_idx on public.ref_rule(source_unit_id);
create index if not exists ref_rule_obligation_obl_idx on public.ref_rule_obligation(obl_id);
create index if not exists scenario_law_law_idx on public.scenario_law(law_id);
create index if not exists scenario_rule_rule_idx on public.scenario_rule(rul_id);

-- Bridge the read-only Yongin facility catalog to mutable workflow records.
-- Immutable legal and facility identifiers stay in ref_* tables; user work stays in target_* and compliance tables.

alter table public.target
  add column if not exists target_ref text;

alter table public.target
  drop constraint if exists target_target_ref_fkey;

alter table public.target
  add constraint target_target_ref_fkey
  foreign key (target_ref)
  references public.ref_managed_target(target_ref)
  on update cascade
  on delete restrict;

create unique index if not exists target_scenario_target_ref_uidx
  on public.target(scenario_id, target_ref)
  where target_ref is not null;

create index if not exists target_target_ref_idx
  on public.target(target_ref);

-- Persist due-date changes in the same audit stream as compliance and inspection changes.
drop trigger if exists target_obligation_audit_trg on public.target_obligation;
create trigger target_obligation_audit_trg
after insert or update or delete on public.target_obligation
for each row execute function private.capture_demo_audit_event();

-- One read model keeps target_ref, obl_id, due schedule, work record, evidence and inspection aligned.
create or replace view public.v_facility_workflow
with (security_invoker = true)
as
select
  rmt.target_ref,
  rmt.target_name,
  rmt.target_category,
  rmt.facility_group,
  rmt.facility_kind,
  rmt.address,
  rmt.subject_name,
  rmt.is_demo_virtual,
  t.target_id,
  m.obl_id,
  o.title_ko as obligation_title,
  o.detail_ko as obligation_detail,
  o.obligation_group,
  m.law_name,
  m.unit_path,
  m.layer,
  m.cycle,
  m.evidence as evidence_requirement,
  m.map_reason,
  m.mapping_source,
  tro.target_obligation_id,
  tro.due_type,
  tro.due_value,
  tro.is_active,
  cr.compliance_id,
  cr.period_key,
  cr.status as compliance_status,
  cr.action_date,
  cr.action_detail,
  cr.note as compliance_note,
  cr.submitted_at,
  cr.updated_at,
  ir.inspection_result_id,
  ir.status as inspection_status,
  ir.inspection_note,
  ir.inspected_at
from public.ref_managed_target rmt
join public.ref_managed_target_obligation m
  on m.target_ref = rmt.target_ref
 and m.l2_result <> '제외'
join public.ref_obligation o
  on o.obl_id = m.obl_id
left join public.target t
  on t.target_ref = rmt.target_ref
 and t.scenario_id = '10000000-0000-0000-0000-000000000001'::uuid
left join public.target_obligation tro
  on tro.target_id = t.target_id
 and tro.obl_id = m.obl_id
left join public.compliance_record cr
  on cr.target_obligation_id = tro.target_obligation_id
left join public.inspection_result ir
  on ir.compliance_id = cr.compliance_id;

grant select on public.v_facility_workflow to anon, authenticated;

comment on column public.target.target_ref is
  'Stable reference to ref_managed_target; mutable workflow records use target_id while retaining source identity.';
comment on view public.v_facility_workflow is
  'Facility-to-obligation workflow read model keyed by target_ref + obl_id + period_key.';

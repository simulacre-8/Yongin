-- Cover My Work foreign keys used by joins, history lookup, reset cascades and production-hardening diagnostics.

create index if not exists demo_work_rule_org_fk_idx
  on public.demo_work_assignment_rule(assigned_org_key);

create index if not exists demo_work_item_target_id_fk_idx
  on public.demo_work_item(target_id);
create index if not exists demo_work_item_obligation_fk_idx
  on public.demo_work_item(obligation_id);
create index if not exists demo_work_item_rule_fk_idx
  on public.demo_work_item(assignment_rule_id);
create index if not exists demo_work_item_assigned_by_fk_idx
  on public.demo_work_item(assigned_by_profile_id);
create index if not exists demo_work_item_accepted_by_fk_idx
  on public.demo_work_item(accepted_by_profile_id);
create index if not exists demo_work_item_confirmed_by_fk_idx
  on public.demo_work_item(confirmed_by_profile_id);

create index if not exists demo_work_event_from_org_fk_idx
  on public.demo_work_assignment_event(from_org_key);
create index if not exists demo_work_event_to_org_fk_idx
  on public.demo_work_assignment_event(to_org_key);
create index if not exists demo_work_event_actor_fk_idx
  on public.demo_work_assignment_event(actor_profile_id);

create index if not exists demo_work_delegation_from_org_fk_idx
  on public.demo_work_delegation_request(from_org_key);
create index if not exists demo_work_delegation_to_org_fk_idx
  on public.demo_work_delegation_request(to_org_key);
create index if not exists demo_work_delegation_requested_by_fk_idx
  on public.demo_work_delegation_request(requested_by_profile_id);
create index if not exists demo_work_delegation_decided_by_fk_idx
  on public.demo_work_delegation_request(decided_by_profile_id);

create index if not exists demo_work_attachment_delegation_fk_idx
  on public.demo_work_attachment(delegation_request_id);
create index if not exists demo_work_attachment_uploaded_by_fk_idx
  on public.demo_work_attachment(uploaded_by_profile_id);

create index if not exists demo_work_reset_actor_fk_idx
  on public.demo_work_reset_log(actor_profile_id);

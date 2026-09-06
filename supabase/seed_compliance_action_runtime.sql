-- Run after every compliance/evidence-producing seed.
-- Idempotently preserves pre-existing compliance snapshots as first correction events.

insert into public.demo_compliance_action_event (
  compliance_id,
  target_obligation_id,
  period_key,
  sequence_no,
  action_kind,
  status_before,
  status_after,
  action_date,
  action_detail,
  note,
  occurred_at,
  created_at
)
select
  cr.compliance_id,
  cr.target_obligation_id,
  cr.period_key,
  1,
  'IMPLEMENT',
  case
    when latest.before_data ->> 'status' in ('DONE', 'SUPP', 'NONE', 'NA')
      then latest.before_data ->> 'status'
    else null
  end,
  cr.status,
  cr.action_date,
  coalesce(nullif(btrim(cr.action_detail), ''), '기존 이행상태 기준기록'),
  cr.note,
  coalesce(cr.submitted_at, latest.occurred_at, cr.updated_at),
  coalesce(latest.occurred_at, cr.updated_at)
from public.compliance_record cr
left join lateral (
  select ae.before_data, ae.occurred_at
  from public.audit_event ae
  where ae.entity_type = 'compliance_record'
    and ae.entity_id = cr.target_obligation_id::text
  order by ae.occurred_at desc, ae.audit_event_id desc
  limit 1
) latest on true
on conflict (target_obligation_id, period_key, sequence_no) do nothing;

insert into public.demo_compliance_action_evidence (
  action_event_id,
  evidence_id,
  linked_at
)
select dae.action_event_id, ev.evidence_id, ev.uploaded_at
from public.evidence ev
join public.demo_compliance_action_event dae
  on dae.compliance_id = ev.compliance_id
 and dae.sequence_no = 1
on conflict (evidence_id) do nothing;

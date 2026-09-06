-- Run after seed_facility_workflow.sql and seed_yongin_org.sql.
-- Idempotently creates demo-internal assignment rules and missing My Work runtime rows.

insert into public.demo_work_assignment_rule (
  rule_name,priority,match_law_name,match_target_category,match_subject_pattern,
  match_target_name_pattern,assigned_org_key,assignment_basis,basis_type,is_enabled
) values
  ('중처법 핵심의무 → 중대재해예방팀',10,'중대재해처벌법',null,null,null,
   'YONGIN:TEAM:faaa5952a8d47363c146','중대재해처벌법 핵심 의무를 중대재해예방팀에 우선 배정하는 시연 내부 소관규칙','DEMO_INTERNAL',true),
  ('경전철 → 도시철도과',20,null,'공중교통수단',null,null,
   'YONGIN:DEPARTMENT:8ace6d30405328cd1bec','공중교통수단 관리대상을 도시철도과에 배정하는 시연 내부 소관규칙','DEMO_INTERNAL',true),
  ('고기상수도 → 수도시설과',30,null,null,null,'%고기상수도%',
   'YONGIN:DEPARTMENT:54242c3196219faeccd4','상수도 시설 관리대상을 수도시설과에 배정하는 시연 내부 소관규칙','DEMO_INTERNAL',true),
  ('기흥구 도로 → 기흥구청 도로과',40,null,null,'%기흥구청 도로과%',null,
   'YONGIN:DEPARTMENT:81ff213310d0eb291fe8','시설 원천 관리주체명을 공식 조직도 부서에 연결한 시연 내부 소관규칙','DEMO_INTERNAL',true),
  ('처인구 도로 → 처인구청 도로과',40,null,null,'%처인구청 도로과%',null,
   'YONGIN:DEPARTMENT:95a16bdcb062631e9822','시설 원천 관리주체명을 공식 조직도 부서에 연결한 시연 내부 소관규칙','DEMO_INTERNAL',true),
  ('수지구 도로 → 수지구청 건설도로과',40,null,null,'%수지구청 건설도로과%',null,
   'YONGIN:DEPARTMENT:2a326387069b39e49f14','시설 원천 관리주체명을 공식 조직도 부서에 연결한 시연 내부 소관규칙','DEMO_INTERNAL',true),
  ('재산관리 시설 → 재산관리과',40,null,null,'%재산관리과%',null,
   'YONGIN:DEPARTMENT:86b81d14b6d0f60b4bf4','시설 원천 관리주체명을 공식 조직도 부서에 연결한 시연 내부 소관규칙','DEMO_INTERNAL',true)
on conflict (rule_name) do update set
  priority = excluded.priority,
  match_law_name = excluded.match_law_name,
  match_target_category = excluded.match_target_category,
  match_subject_pattern = excluded.match_subject_pattern,
  match_target_name_pattern = excluded.match_target_name_pattern,
  assigned_org_key = excluded.assigned_org_key,
  assignment_basis = excluded.assignment_basis,
  basis_type = excluded.basis_type,
  is_enabled = excluded.is_enabled,
  updated_at = now();

select private.seed_demo_work_items();

insert into public.demo_work_assignment_event (
  work_item_id,event_type,from_org_key,to_org_key,from_assignee,to_assignee,
  from_status,to_status,reason,actor_display_name,occurred_at,created_at,metadata
)
select
  item.work_item_id,'COMPLETED',item.assigned_org_key,item.assigned_org_key,
  item.assignee_display_name,item.assignee_display_name,
  'IN_PROGRESS','COMPLETED','기준 workflow 완료상태 투영','시스템',
  item.completed_at,item.created_at,jsonb_build_object('baseline_seed', true)
from public.demo_work_item item
where item.status_code = 'COMPLETED'
  and item.completed_at is not null
  and not exists (
    select 1
    from public.demo_work_assignment_event event
    where event.work_item_id = item.work_item_id
      and event.event_type = 'COMPLETED'
  );

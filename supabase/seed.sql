-- Yongin safety demo seed. Run after 001_demo_schema.sql.

insert into public.ref_law(law_id, title_ko, law_kind, relation_type, source_version, metadata) values
('LAW-KR-SAPA', '중대재해 처벌 등에 관한 법률', 'act', '공통', 'fact-v2.1', '{"demo":true}'),
('LAW-KR-FMSA', '시설물의 안전 및 유지관리에 관한 특별법', 'act', '공중이용시설', 'fact-v2.1', '{"demo":true}'),
('LAW-KR-OSHA', '산업안전보건법', 'act', '사업장', 'fact-v2.1', '{"demo":true}'),
('LAW-KR-DISASTER', '재난 및 안전관리 기본법', 'act', '공통', 'fact-v2.1', '{"demo":true}'),
('LAW-KR-BUILDING', '건축물관리법', 'act', '건축물', 'fact-v2.1', '{"demo":true}'),
('LAW-KR-ROAD', '도로법', 'act', '도로·교량', 'fact-v2.1', '{"demo":true}'),
('LAW-KR-SEWER', '하수도법', 'act', '상하수도', 'fact-v2.1', '{"demo":true}')
on conflict (law_id) do update set title_ko=excluded.title_ko, relation_type=excluded.relation_type, source_version=excluded.source_version;

insert into public.ref_unit(unit_id, law_id, unit_path, unit_label, unit_type, article_no, display_text, source_version) values
('UNIT-DEMO-SAPA-04', 'LAW-KR-SAPA', 'a4', '제4조', 'article', '4', '사업주와 경영책임자 등의 안전 및 보건 확보의무', 'fact-v2.1'),
('UNIT-DEMO-FMSA-06', 'LAW-KR-FMSA', 'a6', '제6조', 'article', '6', '시설물의 안전 및 유지관리계획 수립·시행', 'fact-v2.1'),
('UNIT-DEMO-FMSA-11', 'LAW-KR-FMSA', 'a11', '제11조', 'article', '11', '시설물의 안전점검 실시', 'fact-v2.1'),
('UNIT-DEMO-OSHA-36', 'LAW-KR-OSHA', 'a36', '제36조', 'article', '36', '위험성평가의 실시', 'fact-v2.1'),
('UNIT-DEMO-DISASTER-35', 'LAW-KR-DISASTER', 'a35', '제35조', 'article', '35', '재난대비훈련 실시', 'fact-v2.1')
on conflict (unit_id) do update set display_text=excluded.display_text;

insert into public.ref_rule(rul_id, source_unit_id, condition_kind, condition_item, metric_key, operator, threshold_value, threshold_text, threshold_unit, source_quote, review_status, demo_approved, source_version) values
('RUL-DEMO-01', 'UNIT-DEMO-SAPA-04', 'target_enum', '공중이용시설 여부', 'target_track', 'eq', null, 'public_facility', null, '공중이용시설을 운영·관리하는 경우 안전 및 보건 확보의무 적용', 'approved', true, 'decision-v2.0'),
('RUL-DEMO-02', 'UNIT-DEMO-FMSA-11', 'target_enum', '시설물안전법 대상 여부', 'facility_safety_act', 'eq', null, 'true', null, '시설물안전법에 따른 대상 시설은 정기 안전점검을 실시', 'approved', true, 'decision-v2.0'),
('RUL-DEMO-03', 'UNIT-DEMO-OSHA-36', 'numeric', '상시근로자 수', 'worker_count', 'gte', 5, null, '명', '상시근로자를 사용하는 사업장은 위험성평가를 실시', 'approved', true, 'decision-v2.0'),
('RUL-DEMO-04', 'UNIT-DEMO-FMSA-06', 'numeric', '시설 규모', 'gross_area', 'gte', 5000, null, 'm2', '일정 규모 이상의 시설은 안전 및 유지관리계획을 수립', 'approved', true, 'decision-v2.0')
on conflict (rul_id) do update set review_status='approved', demo_approved=true, source_quote=excluded.source_quote;

insert into public.ref_obligation(obl_id, anchor_unit_id, title_ko, detail_ko, obligation_group, cycle, evidence_required, review_status, source_version, display_order) values
('OBL-DEMO-01','UNIT-DEMO-SAPA-04','필요한 안전인력 확보','안전관리 업무를 수행할 인력의 확보 및 배치','MG01','yearly',true,'approved','decision-v2.0',1),
('OBL-DEMO-02','UNIT-DEMO-SAPA-04','필요한 예산 편성·집행','안전점검, 보수·보강 및 안전조치 예산 관리','MG01','half',true,'approved','decision-v2.0',2),
('OBL-DEMO-03','UNIT-DEMO-FMSA-11','정기안전점검','시설물안전법상 정기안전점검 실시','MG01','yearly',true,'approved','decision-v2.0',3),
('OBL-DEMO-04','UNIT-DEMO-FMSA-11','정밀안전점검','시설 상태에 따른 정밀안전점검 실시','MG01','yearly',true,'approved','decision-v2.0',4),
('OBL-DEMO-05','UNIT-DEMO-FMSA-06','시설물 안전 및 유지관리계획','연간 안전 및 유지관리계획 수립','MG01','yearly',true,'approved','decision-v2.0',5),
('OBL-DEMO-06','UNIT-DEMO-OSHA-36','유해·위험요인의 확인·점검','유해·위험요인을 정기적으로 확인하고 개선','MG01','half',true,'approved','decision-v2.0',6),
('OBL-DEMO-07','UNIT-DEMO-DISASTER-35','비상대피훈련','중대시민재해 대응 비상대피훈련 실시','MG01','yearly',true,'approved','decision-v2.0',7),
('OBL-DEMO-08','UNIT-DEMO-SAPA-04','재발방지대책 수립·이행','재해 발생 시 원인분석 및 재발방지 조치','MG02','event',true,'approved','decision-v2.0',8),
('OBL-DEMO-09','UNIT-DEMO-SAPA-04','개선·시정 조치 이행','행정기관의 개선·시정 명령에 따른 조치','MG03','event',true,'approved','decision-v2.0',9),
('OBL-DEMO-10','UNIT-DEMO-FMSA-11','관계 법령상 의무이행','대상 시설에 적용되는 관계 법령의 조치와 증빙','MG04','half',true,'approved','decision-v2.0',10)
on conflict (obl_id) do update set title_ko=excluded.title_ko, detail_ko=excluded.detail_ko, review_status='approved';

insert into public.ref_rule_obligation(rul_id, obl_id, link_basis, link_confidence, review_status, demo_approved, link_evidence) values
('RUL-DEMO-01','OBL-DEMO-01','manual_review','high','approved',true,'demo-reviewed'),
('RUL-DEMO-01','OBL-DEMO-02','manual_review','high','approved',true,'demo-reviewed'),
('RUL-DEMO-02','OBL-DEMO-03','same_unit','high','approved',true,'a11'),
('RUL-DEMO-02','OBL-DEMO-04','manual_review','high','approved',true,'facility-class'),
('RUL-DEMO-02','OBL-DEMO-05','manual_review','high','approved',true,'a6'),
('RUL-DEMO-03','OBL-DEMO-06','same_unit','high','approved',true,'a36'),
('RUL-DEMO-01','OBL-DEMO-07','manual_review','high','approved',true,'demo-reviewed'),
('RUL-DEMO-01','OBL-DEMO-08','manual_review','high','approved',true,'demo-reviewed'),
('RUL-DEMO-01','OBL-DEMO-09','manual_review','high','approved',true,'demo-reviewed'),
('RUL-DEMO-02','OBL-DEMO-10','manual_review','high','approved',true,'demo-reviewed')
on conflict (rul_id, obl_id) do update set review_status='approved', demo_approved=true;

insert into public.demo_scenario(scenario_id, slug, name, target_track, source_snapshot, ui_config, is_active) values
('10000000-0000-0000-0000-000000000001','yongin-public-facility','용인시 공중이용시설 안전보건 시연','public_facility','{"fact":"v2.1","decision":"v2.0","extracted_at":"2026-09-05"}','{"brand":"yongin","statusSymbols":["O","△","X","-"]}',true)
on conflict (scenario_id) do update set source_snapshot=excluded.source_snapshot, ui_config=excluded.ui_config, is_active=true;

insert into public.org(org_id, parent_org_id, name, org_type, code, is_demo) values
('20000000-0000-0000-0000-000000000001',null,'용인특례시','CITY','YONGIN',true),
('20000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000001','시민안전관','DEPARTMENT','SAFE',true),
('20000000-0000-0000-0000-000000000003','20000000-0000-0000-0000-000000000001','하수시설과','DEPARTMENT','SEWER',true),
('20000000-0000-0000-0000-000000000004','20000000-0000-0000-0000-000000000001','도로관리과','DEPARTMENT','ROAD',true)
on conflict (org_id) do update set name=excluded.name;

insert into public.profile(profile_id, org_id, display_name, role_code, is_demo) values
('30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000002','김안전','target_manager',true),
('30000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000002','이점검','inspector',true),
('30000000-0000-0000-0000-000000000003','20000000-0000-0000-0000-000000000001','용인시장','executive',true)
on conflict (profile_id) do update set display_name=excluded.display_name, role_code=excluded.role_code;

insert into public.target(target_id, scenario_id, org_id, name, target_type, detail_type, address, manager_name, attributes, is_demo) values
('40000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000002','용인시청 청사 (시연)','public_facility','building','경기도 용인시 처인구 중부대로 1199','김안전','{"gross_area":39872,"capacity":1800,"completion_year":2005,"facility_safety_act":true,"worker_count":120,"target_track":"public_facility"}',true),
('40000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000003','수지레스피아 (시연)','public_facility','waterworks','경기도 용인시 수지구 포은대로 499','이점검','{"daily_capacity":150000,"worker_count":62,"facility_safety_act":true,"target_track":"public_facility"}',true),
('40000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000004','죽전교 (시연)','public_facility','bridge','경기도 용인시 수지구 죽전동 일원','박시설','{"length_m":284,"lanes":6,"facility_grade":"2종","facility_safety_act":true,"target_track":"public_facility"}',true)
on conflict (target_id) do update set attributes=excluded.attributes, name=excluded.name;

insert into public.scenario_law(scenario_id, law_id)
select '10000000-0000-0000-0000-000000000001'::uuid, law_id from public.ref_law
order by law_id
limit 150
on conflict do nothing;
insert into public.scenario_rule(scenario_id, rul_id)
select '10000000-0000-0000-0000-000000000001'::uuid, rul_id from public.ref_rule where demo_approved
order by rul_id
limit 40
on conflict do nothing;

insert into public.target_applicability(target_id, rul_id, is_applicable, input_snapshot, rule_snapshot, source_version)
select
  t.target_id,
  r.rul_id,
  case r.rul_id
    when 'RUL-DEMO-01' then coalesce(t.attributes ->> 'target_track', '') = 'public_facility'
    when 'RUL-DEMO-02' then coalesce((t.attributes ->> 'facility_safety_act')::boolean, false)
    when 'RUL-DEMO-03' then coalesce((t.attributes ->> 'worker_count')::numeric, 0) >= coalesce(r.threshold_value, 0)
    when 'RUL-DEMO-04' then coalesce((t.attributes ->> 'gross_area')::numeric, 0) >= coalesce(r.threshold_value, 0)
    else false
  end,
  t.attributes,
  jsonb_build_object(
    'metric_key', r.metric_key,
    'operator', r.operator,
    'threshold_value', r.threshold_value,
    'threshold_text', r.threshold_text,
    'source_quote', r.source_quote
  ),
  'decision-v2.0'
from public.target t
cross join public.ref_rule r
where t.scenario_id = '10000000-0000-0000-0000-000000000001'
  and r.demo_approved = true
order by t.target_id, r.rul_id
limit 12
on conflict (target_id, rul_id) do update set
  is_applicable=excluded.is_applicable,
  input_snapshot=excluded.input_snapshot,
  rule_snapshot=excluded.rule_snapshot,
  source_version=excluded.source_version,
  evaluated_at=now();

insert into public.target_obligation(target_obligation_id, target_id, obl_id, due_type, due_value, applicability_snapshot, is_active)
select
  ('50000000-0000-0000-' || lpad(t.n::text,4,'0') || '-' || lpad(o.n::text,12,'0'))::uuid,
  ('40000000-0000-0000-0000-' || lpad(t.n::text,12,'0'))::uuid,
  'OBL-DEMO-' || lpad(o.n::text,2,'0'),
  case when o.n in (8,9) then 'event' when o.n in (2,6,10) then 'half' else 'month' end,
  case when o.n in (2,6,8,9,10) then '2026-H2' else '2026-' || lpad((8 + ((o.n - 1) % 4))::text,2,'0') end,
  '{"source":"demo-approved-rules"}'::jsonb,
  true
from generate_series(1,3) t(n) cross join generate_series(1,10) o(n)
order by t.n, o.n
limit 30
on conflict (target_id, obl_id) do update set due_value=excluded.due_value, is_active=true;

insert into public.compliance_record(target_obligation_id, period_key, status, action_date, action_detail, note, submitted_at)
select
  tro.target_obligation_id,
  '2026-H2',
  case
    when t.target_id = '40000000-0000-0000-0000-000000000001' and o.obl_id in ('OBL-DEMO-02') then 'SUPP'
    when t.target_id = '40000000-0000-0000-0000-000000000001' and o.obl_id in ('OBL-DEMO-09') then 'NONE'
    when t.target_id = '40000000-0000-0000-0000-000000000002' and o.obl_id in ('OBL-DEMO-03') then 'NONE'
    when t.target_id = '40000000-0000-0000-0000-000000000002' and o.obl_id in ('OBL-DEMO-06','OBL-DEMO-09') then 'NA'
    when t.target_id = '40000000-0000-0000-0000-000000000003' and o.obl_id in ('OBL-DEMO-07') then 'NONE'
    when t.target_id = '40000000-0000-0000-0000-000000000003' and o.obl_id in ('OBL-DEMO-08') then 'SUPP'
    when t.target_id = '40000000-0000-0000-0000-000000000003' and o.obl_id in ('OBL-DEMO-03') then 'NA'
    else 'DONE'
  end,
  case when o.obl_id in ('OBL-DEMO-09') then null else date '2026-09-05' end,
  '용인시 안전보건 시연용 이행기록',
  case when o.obl_id = 'OBL-DEMO-02' then '세부 산출근거 보완 예정' else null end,
  now()
from public.target_obligation tro
join public.target t on t.target_id = tro.target_id
join public.ref_obligation o on o.obl_id = tro.obl_id
order by tro.target_obligation_id
limit 30
on conflict (target_obligation_id, period_key) do update set status=excluded.status, action_date=excluded.action_date, note=excluded.note, updated_at=now();

insert into public.inspection_run(inspection_run_id, scenario_id, title, period_key, status, created_by) values
('60000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','2026년 하반기 공중이용시설 의무이행 점검','2026-H2','OPEN','30000000-0000-0000-0000-000000000002')
on conflict (inspection_run_id) do update set status='OPEN';

insert into public.inspection_scope(inspection_run_id, target_id, target_obligation_id, is_active)
select
  '60000000-0000-0000-0000-000000000001',
  tro.target_id,
  tro.target_obligation_id,
  true
from public.target_obligation tro
order by tro.target_obligation_id
limit 30
on conflict (inspection_run_id, target_id, target_obligation_id) do update set is_active=true;

insert into public.inspection_result(inspection_run_id, compliance_id, status, inspection_note, inspected_by)
select
  '60000000-0000-0000-0000-000000000001',
  cr.compliance_id,
  cr.status,
  case when cr.status='SUPP' then '증빙자료의 세부 산출근거를 보완해 주세요.' when cr.status='NONE' then '이행결과와 증빙자료 등록이 필요합니다.' else '확인 완료' end,
  '30000000-0000-0000-0000-000000000002'
from public.compliance_record cr
order by cr.compliance_id
limit 30
on conflict (inspection_run_id, compliance_id) do update set status=excluded.status, inspection_note=excluded.inspection_note, inspected_at=now();

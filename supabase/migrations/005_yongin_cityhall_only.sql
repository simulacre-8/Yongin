-- Keep the client-confirmed demo scope to Yongin City Hall only.
-- Related applicability, obligations, records, evidence, and inspection rows
-- are removed by the existing ON DELETE CASCADE constraints.

delete from public.target
where is_demo = true
  and target_id in (
    '40000000-0000-0000-0000-000000000002'::uuid,
    '40000000-0000-0000-0000-000000000003'::uuid
  );

delete from public.org
where is_demo = true
  and org_id in (
    '20000000-0000-0000-0000-000000000003'::uuid,
    '20000000-0000-0000-0000-000000000004'::uuid
  );

update public.target
set name = '용인시청',
    attributes = attributes - 'capacity'
where target_id = '40000000-0000-0000-0000-000000000001'::uuid;

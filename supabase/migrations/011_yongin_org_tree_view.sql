-- Read model for the official Yongin organization catalog.
-- The underlying reference table remains immutable from browser clients.

create or replace view public.v_yongin_org_tree
with (security_invoker = true)
as
select
  unit.org_key,
  unit.parent_org_key,
  parent.name as parent_name,
  unit.source_code,
  unit.name,
  unit.org_type,
  unit.hierarchy_level,
  unit.hierarchy_path,
  unit.source_section,
  unit.location,
  unit.representative_phone,
  unit.source_url,
  unit.snapshot_date,
  unit.fetched_at,
  unit.is_active,
  unit.attributes,
  unit.sort_order,
  count(child.org_key)::integer as child_count
from public.ref_yongin_org_unit unit
left join public.ref_yongin_org_unit parent
  on parent.org_key = unit.parent_org_key
left join public.ref_yongin_org_unit child
  on child.parent_org_key = unit.org_key
 and child.is_active
where unit.is_active
group by
  unit.org_key,
  parent.name;

grant select on public.v_yongin_org_tree to anon, authenticated;

comment on view public.v_yongin_org_tree is
  'Current official Yongin organization hierarchy with parent label and active child count.';

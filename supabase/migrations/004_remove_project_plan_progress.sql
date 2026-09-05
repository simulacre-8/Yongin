-- Remove the internal delivery progress board. Client-facing WBS is maintained outside the demo app.

do $$
begin
  if to_regclass('public.project_plan_item') is not null and exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'project_plan_item'
  ) then
    alter publication supabase_realtime drop table public.project_plan_item;
  end if;
  if to_regclass('public.project_plan_item') is not null then
    execute 'drop trigger if exists project_plan_item_event_trg on public.project_plan_item';
  end if;
end $$;

drop function if exists private.capture_project_plan_event();

drop table if exists public.project_plan_event cascade;
drop table if exists public.project_plan_item cascade;
drop table if exists public.project_plan cascade;

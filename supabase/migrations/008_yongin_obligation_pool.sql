-- Promote the client-provided Yongin obligation pool to a first-class legal dataset.
-- ADOMS obligation IDs stay stable for future graph projection.

alter table public.ref_obligation
  add column if not exists law_id text,
  add column if not exists law_name text,
  add column if not exists doc_id text,
  add column if not exists unit_path text,
  add column if not exists article_no text,
  add column if not exists article_title text,
  add column if not exists nature text,
  add column if not exists is_umbrella boolean not null default false,
  add column if not exists item_count integer,
  add column if not exists anchor_text text;

create index if not exists ref_obligation_law_id_idx
  on public.ref_obligation(law_id);
create index if not exists ref_obligation_group_idx
  on public.ref_obligation(obligation_group);
create index if not exists ref_obligation_unit_path_idx
  on public.ref_obligation(law_id, unit_path);
create index if not exists ref_obligation_source_version_idx
  on public.ref_obligation(source_version);

comment on column public.ref_obligation.law_id is
  'Client/ADOMS stable law identifier from the Yongin obligation pool.';
comment on column public.ref_obligation.doc_id is
  'Client/ADOMS document identifier retained for later graph projection.';
comment on column public.ref_obligation.unit_path is
  'Legal provision path (article/paragraph/item) retained from the source pool.';
comment on column public.ref_obligation.anchor_text is
  'Source legal text that anchors the obligation.';

-- Legal-source bridge for the managed-target provision popup.
-- Keeps client/ADOMS obligation, unit and document identifiers immutable while
-- enriching the demo with a dated current-law snapshot from the official API.

create table if not exists public.ref_legal_document (
  doc_id text primary key,
  law_id text not null,
  law_name text not null,
  document_title text not null,
  norm_form text,
  promulgated_no text,
  last_amended_at date,
  effective_from date,
  amendment_kind text,
  official_law_id text,
  official_serial_no text,
  official_detail_url text,
  source_version text not null,
  official_checked_at date,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists ref_legal_document_law_idx
  on public.ref_legal_document(law_id, document_title);

create table if not exists public.ref_obligation_legal_source (
  obligation_key text not null,
  source_order integer not null default 1,
  source_obl_id text references public.ref_obligation(obl_id) on delete set null,
  source_unit_id text not null,
  doc_id text not null references public.ref_legal_document(doc_id) on delete cascade,
  law_id text not null,
  law_name text not null,
  document_title text not null,
  unit_path text,
  article_no text,
  article_title text,
  source_text text not null,
  provision_last_amended_at date,
  effective_from date,
  source_version text not null,
  source_kind text not null check (source_kind in ('CLIENT_ADOMS', 'DEMO_ALIAS')),
  metadata jsonb not null default '{}'::jsonb,
  primary key (obligation_key, source_order),
  unique (obligation_key, source_unit_id)
);

create index if not exists ref_obligation_legal_source_doc_idx
  on public.ref_obligation_legal_source(doc_id);
create index if not exists ref_obligation_legal_source_obl_idx
  on public.ref_obligation_legal_source(source_obl_id);

comment on table public.ref_legal_document is
  'Document-level current-law metadata. ADOMS document IDs are retained; official dates are a dated snapshot, not a live legal opinion.';
comment on table public.ref_obligation_legal_source is
  'Links both canonical ADOMS obligations and local demo obligation aliases to immutable ADOMS source unit IDs and provision text.';
comment on column public.ref_obligation_legal_source.obligation_key is
  'Canonical obl_id or local demo alias such as OBL-01.';
comment on column public.ref_obligation_legal_source.provision_last_amended_at is
  'Latest amendment date explicitly printed in the provision source text, when available.';
comment on column public.ref_legal_document.last_amended_at is
  'Promulgation date of the current official law revision returned by the National Law Information Center API.';

alter table public.ref_legal_document enable row level security;
alter table public.ref_obligation_legal_source enable row level security;

revoke all on public.ref_legal_document, public.ref_obligation_legal_source from anon, authenticated;
grant select on public.ref_legal_document, public.ref_obligation_legal_source to anon, authenticated;

drop policy if exists demo_read on public.ref_legal_document;
create policy demo_read on public.ref_legal_document
for select to anon, authenticated
using (private.demo_role_allowed(array['target_manager','inspector','executive']::text[]));

drop policy if exists demo_read on public.ref_obligation_legal_source;
create policy demo_read on public.ref_obligation_legal_source
for select to anon, authenticated
using (private.demo_role_allowed(array['target_manager','inspector','executive']::text[]));

-- cv_documents: stores uploaded CV files (metadata) + latest ATS score
create table public.cv_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  file_name text not null,
  file_path text not null,
  file_type text not null check (file_type in ('pdf', 'docx')),
  file_size integer not null,
  status text not null default 'to_review' check (status in ('active', 'to_review', 'archived')),
  ats_score integer check (ats_score is null or (ats_score >= 0 and ats_score <= 100)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.cv_documents enable row level security;

create policy "cv_documents_owner_all" on public.cv_documents
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ats_analyses: history of ATS analyses run against a stored CV
create table public.ats_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  cv_id uuid not null references public.cv_documents(id) on delete cascade,
  application_id text, -- informal reference to "Application".id (legacy text PK, no cross-type FK)
  title text not null,
  job_description text,
  score integer not null check (score >= 0 and score <= 100),
  missing_keywords text[] not null default '{}',
  recommendations text,
  created_at timestamptz not null default now()
);

alter table public.ats_analyses enable row level security;

create policy "ats_analyses_owner_all" on public.ats_analyses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Link extracted experiences back to the CV they came from (null = manual entry)
alter table public."Experience"
  add column "sourceCvId" uuid references public.cv_documents(id) on delete set null;

-- Private storage bucket for the original CV files
insert into storage.buckets (id, name, public)
values ('cv-documents', 'cv-documents', false)
on conflict (id) do nothing;

drop policy if exists "Users can read own cv documents" on storage.objects;
create policy "Users can read own cv documents"
on storage.objects for select
to authenticated
using (
  bucket_id = 'cv-documents'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users can upload own cv documents" on storage.objects;
create policy "Users can upload own cv documents"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'cv-documents'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users can delete own cv documents" on storage.objects;
create policy "Users can delete own cv documents"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'cv-documents'
  and auth.uid()::text = (storage.foldername(name))[1]
);

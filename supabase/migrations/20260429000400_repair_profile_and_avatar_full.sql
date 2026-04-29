create table if not exists "Profile" (
  "id" uuid primary key references auth.users(id) on delete cascade,
  "fullName" text not null default '',
  "email" text not null default '',
  "phone" text,
  "location" text,
  "title" text,
  "summary" text,
  "website" text,
  "linkedin" text,
  "github" text,
  "avatarUrl" text,
  "skills" text[] not null default '{}',
  "interests" text[] not null default '{}',
  "createdAt" timestamptz not null default now()
);

alter table "Profile" enable row level security;

drop policy if exists "Users can manage own profile" on "Profile";
create policy "Users can manage own profile"
on "Profile" for all
using (auth.uid() = "id")
with check (auth.uid() = "id");

grant select, insert, update, delete on table "Profile" to authenticated, service_role;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "Avatar images are publicly readable" on storage.objects;
create policy "Avatar images are publicly readable"
on storage.objects for select
to public
using (bucket_id = 'avatars');

drop policy if exists "Users can upload own avatar" on storage.objects;
create policy "Users can upload own avatar"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users can update own avatar" on storage.objects;
create policy "Users can update own avatar"
on storage.objects for update
to authenticated
using (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users can delete own avatar" on storage.objects;
create policy "Users can delete own avatar"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);

notify pgrst, 'reload schema';

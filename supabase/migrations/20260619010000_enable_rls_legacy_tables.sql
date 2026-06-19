-- Security fix: several tables had Row Level Security disabled, exposing
-- all rows to the anon/authenticated API roles. "Application" is actively
-- used by the app for every user's job applications.

alter table "Application" enable row level security;
create policy "Users can CRUD own applications" on "Application"
  for all using ("userId" = auth.uid()::text) with check ("userId" = auth.uid()::text);

alter table "Experience" enable row level security;
create policy "Users can CRUD own experiences" on "Experience"
  for all using ("userId" = auth.uid()::text) with check ("userId" = auth.uid()::text);

alter table "TimelineStep" enable row level security;
create policy "Users can CRUD own timeline steps" on "TimelineStep"
  for all using (
    exists (
      select 1 from "Application" a
      where a.id = "TimelineStep"."applicationId"
        and a."userId" = auth.uid()::text
    )
  )
  with check (
    exists (
      select 1 from "Application" a
      where a.id = "TimelineStep"."applicationId"
        and a."userId" = auth.uid()::text
    )
  );

-- Unused legacy tables (no app code references them). Lock down entirely;
-- service_role (admin/migration tooling) bypasses RLS, so this only blocks
-- the anon/authenticated API roles that should never see them.
alter table "User" enable row level security;
alter table "Resume" enable row level security;
alter table "JobOffer" enable row level security;
alter table "UserGoal" enable row level security;
alter table "_prisma_migrations" enable row level security;

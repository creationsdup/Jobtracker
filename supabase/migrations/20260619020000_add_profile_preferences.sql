-- Adds user preferences for in-app reminders and interface language.
alter table "Profile"
  add column if not exists language text not null default 'fr',
  add column if not exists "remindersEnabled" boolean not null default true,
  add column if not exists "reminderThresholdDays" integer not null default 7;

alter table "Profile"
  add constraint profile_language_check check (language in ('fr', 'en'));

alter table "Profile"
  add constraint profile_reminder_threshold_check check ("reminderThresholdDays" between 1 and 30);

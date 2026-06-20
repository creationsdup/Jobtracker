-- Extends user_goals for the job-matching rewrite: new criteria (sectors,
-- keywords, experience level, free-text title/priorities), and renames two
-- existing columns for clarity. Additive + rename only — no data is dropped.

alter table user_goals
  add column if not exists target_title text,
  add column if not exists sectors text[] default '{}',
  add column if not exists keywords_wanted text[] default '{}',
  add column if not exists keywords_excluded text[] default '{}',
  add column if not exists experience_level text[] default '{}',
  add column if not exists scoring_priorities text;

alter table user_goals rename column target_positions to target_roles;
alter table user_goals rename column zones to locations;

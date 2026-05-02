alter table user_goals
  add column if not exists target_positions text[] default '{}';

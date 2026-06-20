-- Adds support for multiple objectives per user: a single user_goals row
-- can now be flagged as the "active" one used for match scoring everywhere
-- else in the app, while other goals remain editable/viewable on the
-- Objectifs page without affecting scoring until activated.

alter table user_goals
  add column if not exists is_active boolean not null default false;

-- Backfill: mark each user's most recently created goal as active, so
-- existing single-goal users keep working exactly as before.
update user_goals ug
set is_active = true
where ug.created_at = (
  select max(ug2.created_at) from user_goals ug2 where ug2.user_id = ug.user_id
);

-- Guarantees at most one active goal per user — set_active_goal in the app
-- always clears the previous active row before setting the new one, but this
-- index makes that invariant impossible to violate even by a buggy update.
create unique index if not exists user_goals_one_active_per_user
  on user_goals (user_id)
  where is_active;

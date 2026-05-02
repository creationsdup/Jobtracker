-- Add target_companies column to user_goals
ALTER TABLE user_goals
  ADD COLUMN IF NOT EXISTS target_companies TEXT[] DEFAULT '{}';

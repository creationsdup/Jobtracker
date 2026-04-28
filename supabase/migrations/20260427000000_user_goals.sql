create table if not exists user_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  type text,
  contract_types text[] default '{}',
  target_date date,
  personal_target integer,
  zones text[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table user_goals enable row level security;

create policy "Users can manage own goals"
  on user_goals for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

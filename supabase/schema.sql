-- NexusOS Supabase schema
-- Run this script in Supabase SQL Editor. Keep email confirmation enabled in
-- Authentication → Providers → Email and add your app URLs under URL Configuration.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text not null default '',
  university text not null default '',
  degree text not null default '',
  semester smallint not null default 1 check (semester between 1 and 8),
  daily_target_hours numeric(4, 1) not null default 4 check (daily_target_hours between 0 and 24),
  weekly_coding_target_hours numeric(5, 1) not null default 15 check (weekly_coding_target_hours between 0 and 168),
  theme_preference text not null default 'dark' check (theme_preference in ('dark', 'light', 'oled', 'cyberpunk')),
  dsa_active boolean not null default false,
  onboarding_completed boolean not null default false,
  onboarding jsonb not null default '{}'::jsonb check (jsonb_typeof(onboarding) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- The existing app is a rich local-first Zustand application. Keep an exact
-- per-user snapshot as the synchronization source of truth so no app data is
-- silently dropped when users sign up. Normalized tables below are available
-- for focused querying and reporting as the app evolves.
create table if not exists public.user_state (
  user_id uuid primary key references auth.users(id) on delete cascade default auth.uid(),
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  revision bigint not null default 1,
  updated_at timestamptz not null default now()
);

create table if not exists public.study_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  log_date date not null,
  day_type text not null default 'college' check (day_type in ('college', 'weekend')),
  sleep_hours numeric(4, 1) not null default 7.5 check (sleep_hours between 0 and 24),
  energy smallint not null default 3 check (energy between 1 and 5),
  notes text not null default '',
  focus_minutes_by_subject jsonb not null default '{}'::jsonb check (jsonb_typeof(focus_minutes_by_subject) = 'object'),
  updated_at timestamptz not null default now(),
  unique (user_id, log_date)
);

create table if not exists public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  session_date date not null,
  start_time time not null,
  end_time time not null,
  subject_id text not null,
  category text not null,
  duration_minutes integer not null check (duration_minutes > 0),
  concentration smallint not null default 3 check (concentration between 1 and 5),
  energy smallint not null default 3 check (energy between 1 and 5),
  tags text[] not null default '{}',
  notes text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  title text not null,
  description text not null default '',
  status text not null default 'inbox',
  priority text not null default 'normal',
  area text not null default 'college',
  due_date date,
  start_date date,
  estimated_hours numeric(6, 2),
  actual_hours numeric(6, 2),
  subtasks jsonb not null default '[]'::jsonb check (jsonb_typeof(subtasks) = 'array'),
  recurrence text not null default 'none',
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  primary key (user_id, id)
);

create table if not exists public.habits (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  name text not null,
  icon text not null default 'sunrise',
  color text not null default 'var(--ink-1)',
  target_per_week smallint not null default 5 check (target_per_week between 0 and 7),
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.habit_completions (
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  habit_id text not null,
  completion_date date not null,
  completed boolean not null default true,
  primary key (user_id, habit_id, completion_date),
  foreign key (user_id, habit_id) references public.habits(user_id, id) on delete cascade
);

create table if not exists public.coding_roadmap (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  name text not null,
  color text not null default 'var(--ink-1)',
  status text not null default 'active' check (status in ('active', 'paused', 'completed')),
  current_level smallint not null default 0 check (current_level between 0 and 100),
  target_level smallint not null default 100 check (target_level between 0 and 100),
  weekly_hours_goal numeric(5, 1) not null default 0,
  next_milestone text not null default '',
  resources text not null default '',
  notes text not null default '',
  target_date date,
  primary key (user_id, id)
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists user_state_set_updated_at on public.user_state;
create trigger user_state_set_updated_at before update on public.user_state
for each row execute function public.set_updated_at();

-- Every snapshot write increments the revision so other devices can detect newer cloud data.
create or replace function public.bump_user_state_revision()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.revision = old.revision + 1;
  return new;
end;
$$;

drop trigger if exists user_state_bump_revision on public.user_state;
create trigger user_state_bump_revision before update on public.user_state
for each row execute function public.bump_user_state_revision();

drop trigger if exists study_logs_set_updated_at on public.study_logs;
create trigger study_logs_set_updated_at before update on public.study_logs
for each row execute function public.set_updated_at();

-- Create a default profile and empty local-first snapshot for each new account.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;

  insert into public.user_state (user_id, payload)
  values (new.id, '{}'::jsonb)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.user_state enable row level security;
alter table public.study_logs enable row level security;
alter table public.study_sessions enable row level security;
alter table public.tasks enable row level security;
alter table public.habits enable row level security;
alter table public.habit_completions enable row level security;
alter table public.coding_roadmap enable row level security;

-- Remove implicit API access and grant only the authenticated roles the app uses.
revoke all on table public.profiles, public.user_state, public.study_logs,
  public.study_sessions, public.tasks, public.habits, public.habit_completions,
  public.coding_roadmap from anon, authenticated;
grant select, insert, update, delete on table public.profiles, public.user_state,
  public.study_logs, public.study_sessions, public.tasks, public.habits,
  public.habit_completions, public.coding_roadmap to authenticated;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select to authenticated using ((select auth.uid()) = id);
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
drop policy if exists "profiles_delete_own" on public.profiles;
create policy "profiles_delete_own" on public.profiles for delete to authenticated using ((select auth.uid()) = id);

-- Apply explicit per-user policies to every table that carries user_id.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'user_state', 'study_logs', 'study_sessions', 'tasks', 'habits',
    'habit_completions', 'coding_roadmap'
  ] loop
    execute format('drop policy if exists %I on public.%I', table_name || '_select_own', table_name);
    execute format('create policy %I on public.%I for select to authenticated using ((select auth.uid()) = user_id)', table_name || '_select_own', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || '_insert_own', table_name);
    execute format('create policy %I on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)', table_name || '_insert_own', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || '_update_own', table_name);
    execute format('create policy %I on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', table_name || '_update_own', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || '_delete_own', table_name);
    execute format('create policy %I on public.%I for delete to authenticated using ((select auth.uid()) = user_id)', table_name || '_delete_own', table_name);
  end loop;
end;
$$;

grant usage on schema public to authenticated;

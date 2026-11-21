-- 20260101120200 — Repair profile access for existing databases.
--
-- Symptom this fixes: sign-up ends on "permission denied for table profiles"
-- (SQLSTATE 42501) because the `authenticated` role lost its table GRANT, or the
-- per-user policies never landed. That happens when the schema was applied
-- partially, or when a hardening pass revoked grants on every table.
--
-- This migration only re-creates permissions; it never touches rows. Running it
-- against a healthy database is a no-op in effect, so it is safe to apply again.
--
-- Note: the app no longer needs these grants to complete sign-up. Profiles are
-- created by /api/account/bootstrap with the service-role key. The grants remain
-- because other screens read and write user-owned rows directly.

grant usage on schema public to authenticated;

grant select, insert, update, delete on table public.profiles, public.user_state,
  public.study_logs, public.study_sessions, public.tasks, public.habits,
  public.habit_completions, public.coding_roadmap to authenticated;

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select to authenticated using ((select auth.uid()) = id);
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
drop policy if exists "profiles_delete_own" on public.profiles;
create policy "profiles_delete_own" on public.profiles for delete to authenticated using ((select auth.uid()) = id);

-- Re-create the new-user trigger: accounts that signed up while it was missing
-- would otherwise never get a profile row.
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

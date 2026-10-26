-- Habit tracker cloud storage.
-- Run once in the Supabase dashboard: SQL Editor → paste → Run.
--
-- One row per synced localStorage key per user. `value` holds the parsed
-- JSON (or a JSON string for plain-text keys). RLS limits every user to
-- their own rows, so the publishable key in the browser can't read anyone
-- else's data.

create table if not exists public.user_data (
  user_id    uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  key        text        not null,
  value      jsonb       not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

create index if not exists user_data_user_updated_idx
  on public.user_data (user_id, updated_at);

-- Server-side timestamp so "what changed since X" never depends on device clocks.
create or replace function public.user_data_touch()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists user_data_touch on public.user_data;
create trigger user_data_touch
  before insert or update on public.user_data
  for each row execute function public.user_data_touch();

alter table public.user_data enable row level security;

drop policy if exists "user_data select own" on public.user_data;
drop policy if exists "user_data insert own" on public.user_data;
drop policy if exists "user_data update own" on public.user_data;
drop policy if exists "user_data delete own" on public.user_data;

create policy "user_data select own" on public.user_data
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "user_data insert own" on public.user_data
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "user_data update own" on public.user_data
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "user_data delete own" on public.user_data
  for delete to authenticated using ((select auth.uid()) = user_id);

-- New tables aren't exposed automatically in this project, so grant explicitly.
grant select, insert, update, delete on public.user_data to authenticated;

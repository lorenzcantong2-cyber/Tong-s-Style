-- ============================================================
-- TONG'S STYLE — AUTH + PROFILES SETUP
-- Run once in Supabase Dashboard → SQL Editor → New query → Run.
-- Safe to re-run: every statement is idempotent.
--
-- Passwords are NEVER stored here. Supabase Auth hashes them in auth.users.
-- ============================================================

-- 1. Profiles table, 1:1 with auth.users ---------------------------------
create table if not exists public.profiles (
    id          uuid primary key references auth.users (id) on delete cascade,
    first_name  text not null check (char_length(btrim(first_name)) between 1 and 50),
    last_name   text not null check (char_length(btrim(last_name))  between 1 and 50),
    email       text not null,
    mobile      text check (mobile ~ '^[0-9]{11}$'),
    created_at  timestamptz not null default now()
);

comment on table public.profiles is 'Public profile for each auth user. Rows are created by the on_auth_user_created trigger.';

-- 2. Row Level Security --------------------------------------------------
alter table public.profiles enable row level security;

drop policy if exists "Users can view their own profile"   on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;

create policy "Users can view their own profile"
    on public.profiles for select
    to authenticated
    using ((select auth.uid()) = id);

create policy "Users can update their own profile"
    on public.profiles for update
    to authenticated
    using ((select auth.uid()) = id)
    with check ((select auth.uid()) = id);

-- No INSERT or DELETE policies: browsers can never create or delete profiles.
-- Inserts happen only through the SECURITY DEFINER trigger below;
-- deletes cascade from auth.users.

-- 3. Column-level privileges ---------------------------------------------
-- Logged-in users may edit only their name and mobile, never id/email/created_at.
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (first_name, last_name, mobile) on public.profiles to authenticated;

-- 4. Auto-create a profile when someone signs up ------------------------
-- Reads the first_name / last_name / mobile sent as sign-up metadata.
-- If any value breaks the CHECK constraints above, the whole sign-up is
-- rejected — this is the server-side half of the form validation.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    insert into public.profiles (id, first_name, last_name, email, mobile)
    values (
        new.id,
        btrim(new.raw_user_meta_data ->> 'first_name'),
        btrim(new.raw_user_meta_data ->> 'last_name'),
        new.email,
        nullif(btrim(new.raw_user_meta_data ->> 'mobile'), '')
    );
    return new;
end;
$$;

-- Only the auth system should run this function.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();

-- 5. Keep profiles.email in sync if a user changes their email ----------
create or replace function public.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    update public.profiles set email = new.email where id = new.id;
    return new;
end;
$$;

revoke execute on function public.handle_user_email_change() from public, anon, authenticated;

drop trigger if exists on_auth_user_email_changed on auth.users;
create trigger on_auth_user_email_changed
    after update of email on auth.users
    for each row
    when (old.email is distinct from new.email)
    execute function public.handle_user_email_change();

-- 6. Quick self-check (shows the policies that are now active) ----------
select policyname, cmd, roles from pg_policies where schemaname = 'public' and tablename = 'profiles';

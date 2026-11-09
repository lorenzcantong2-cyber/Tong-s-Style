-- ============================================================
-- TONG'S STYLE — ONLY LOGGED-IN USERS CAN PLACE ORDERS
-- Run once in Supabase Dashboard → SQL Editor → New query → Run.
-- Run this BEFORE publishing the matching menu.html, which sends user_id.
-- Safe to re-run.
-- ============================================================

-- 1. Link each order to the account that placed it.
--    Existing orders keep user_id = NULL. New ones default to the logged-in user.
alter table public.orders
    add column if not exists user_id uuid
        references auth.users (id) on delete set null
        default auth.uid();

create index if not exists orders_user_id_idx on public.orders (user_id);

alter table public.orders enable row level security;

-- 2. Remove every existing INSERT policy (e.g. an "anyone can order" rule).
do $$
declare p record;
begin
    for p in
        select policyname from pg_policies
        where schemaname = 'public' and tablename = 'orders' and cmd = 'INSERT'
    loop
        execute format('drop policy %I on public.orders', p.policyname);
    end loop;
end $$;

-- 3. Logged-out visitors (anon key without a user session) can no longer insert.
revoke insert on public.orders from anon;
grant insert on public.orders to authenticated;

-- 4. Logged-in users may insert orders only under their own account.
create policy "Logged-in users can place their own orders"
    on public.orders for insert
    to authenticated
    with check (user_id = (select auth.uid()));

-- 5. Logged-in users may read back only their own orders (for a future "My orders" page).
drop policy if exists "Users can view their own orders" on public.orders;
create policy "Users can view their own orders"
    on public.orders for select
    to authenticated
    using (user_id = (select auth.uid()));
grant select on public.orders to authenticated;

-- 6. Self-check: the policies now active on orders
select policyname, cmd, roles from pg_policies where schemaname = 'public' and tablename = 'orders';

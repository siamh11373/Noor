-- Signup inserts into auth.users, then trigger public.handle_new_user() inserts into public.profiles.
-- That insert runs as supabase_auth_admin (SECURITY DEFINER context), not as the "authenticated" JWT role.
-- RLS only had "profiles_insert_self" FOR authenticated → no policy matched → INSERT denied → signup fails
-- with a database error and no row in auth.users (transaction rolled back).

drop policy if exists "profiles_insert_signup_trigger" on public.profiles;

create policy "profiles_insert_signup_trigger"
on public.profiles
for insert
to supabase_auth_admin
with check (true);

-- Follow-up to 20260402000100_personal_accounts.sql
-- - Re-affirm set_updated_at with security definer + search_path (do not add a second definition without them).
-- - Split weekly_score_snapshots owner FOR ALL into INSERT/UPDATE/DELETE to avoid RLS overlap with SELECT.
-- - DELETE policies for accountability_invites and accountability_connections.
-- - RPCs: create_accountability_invite (secure codes), remove_accountability_connection (atomic pair delete).
-- Requires pgcrypto from 20260402000100 (gen_random_bytes).

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop policy if exists "weekly_score_snapshots_owner_write" on public.weekly_score_snapshots;

drop policy if exists "weekly_score_snapshots_owner_insert" on public.weekly_score_snapshots;
create policy "weekly_score_snapshots_owner_insert"
on public.weekly_score_snapshots
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "weekly_score_snapshots_owner_update" on public.weekly_score_snapshots;
create policy "weekly_score_snapshots_owner_update"
on public.weekly_score_snapshots
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "weekly_score_snapshots_owner_delete" on public.weekly_score_snapshots;
create policy "weekly_score_snapshots_owner_delete"
on public.weekly_score_snapshots
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "weekly_score_snapshots_connected_read" on public.weekly_score_snapshots;
create policy "weekly_score_snapshots_connected_read"
on public.weekly_score_snapshots
for select
to authenticated
using (
  auth.uid() = user_id
  or exists (
    select 1
    from public.accountability_connections connection
    where connection.user_id = auth.uid()
      and connection.peer_user_id = weekly_score_snapshots.user_id
  )
);

drop policy if exists "accountability_invites_owner_delete" on public.accountability_invites;
create policy "accountability_invites_owner_delete"
on public.accountability_invites
for delete
to authenticated
using (created_by = auth.uid());

drop policy if exists "accountability_connections_delete_own" on public.accountability_connections;
create policy "accountability_connections_delete_own"
on public.accountability_connections
for delete
to authenticated
using (user_id = auth.uid());

create or replace function public.create_accountability_invite(expires_in_hours int default 48)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  new_code text;
  new_invite_id uuid;
  expires timestamptz;
begin
  if current_user_id is null then
    return jsonb_build_object('status', 'unauthenticated');
  end if;

  new_code := replace(replace(replace(
    encode(gen_random_bytes(12), 'base64'),
    '+', 'A'), '/', 'B'), '=', '');

  expires := timezone('utc', now()) + (expires_in_hours || ' hours')::interval;

  insert into public.accountability_invites (created_by, code, expires_at)
  values (current_user_id, new_code, expires)
  returning id into new_invite_id;

  return jsonb_build_object(
    'status', 'created',
    'invite_id', new_invite_id,
    'code', new_code,
    'expires_at', expires
  );
end;
$$;

grant execute on function public.create_accountability_invite(int) to authenticated;

create or replace function public.remove_accountability_connection(peer_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  rows_deleted int;
begin
  if current_user_id is null then
    return jsonb_build_object('status', 'unauthenticated');
  end if;

  if current_user_id = peer_id then
    return jsonb_build_object('status', 'invalid');
  end if;

  delete from public.accountability_connections
  where
    (user_id = current_user_id and peer_user_id = peer_id)
    or (user_id = peer_id and peer_user_id = current_user_id);

  get diagnostics rows_deleted = row_count;

  if rows_deleted = 0 then
    return jsonb_build_object('status', 'not_found');
  end if;

  return jsonb_build_object('status', 'removed', 'rows_deleted', rows_deleted);
end;
$$;

grant execute on function public.remove_accountability_connection(uuid) to authenticated;

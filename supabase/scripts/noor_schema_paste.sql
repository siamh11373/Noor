-- Noor — single paste for Supabase SQL Editor (idempotent).
-- Safe to re-run: uses IF NOT EXISTS, DROP IF EXISTS, CREATE OR REPLACE.
-- Replaces separate migration files if you prefer one script.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Functions (set_updated_at first; handle_new_user after profiles table exists)
-- ---------------------------------------------------------------------------

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

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  timezone text,
  theme_preference text check (theme_preference is null or theme_preference in ('light', 'dark', 'pink')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, timezone)
  values (
    new.id,
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), ''),
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'timezone', '')), '')
  )
  on conflict (id) do update
  set
    display_name = excluded.display_name,
    timezone = coalesce(excluded.timezone, public.profiles.timezone),
    updated_at = timezone('utc', now());

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create table if not exists public.user_state (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  state jsonb not null,
  schema_version int not null default 1,
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.weekly_score_snapshots (
  user_id uuid not null references public.profiles(id) on delete cascade,
  week_start date not null,
  total_score int not null,
  trend_delta int not null default 0,
  pillar_scores jsonb not null,
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, week_start)
);

create table if not exists public.accountability_invites (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles(id) on delete cascade,
  code text not null unique,
  status text not null default 'active' check (status in ('active', 'accepted', 'expired', 'revoked')),
  expires_at timestamptz not null,
  accepted_by uuid references public.profiles(id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.accountability_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  peer_user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  constraint accountability_connections_user_peer_key unique (user_id, peer_user_id),
  constraint accountability_connections_no_self check (user_id <> peer_user_id)
);

create index if not exists accountability_connections_user_id_idx
  on public.accountability_connections(user_id);

create index if not exists accountability_invites_created_by_idx
  on public.accountability_invites(created_by);

-- Named circles (many members per group; parallel to 1:1 accountability)
create table if not exists public.circles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  constraint circles_name_len check (char_length(trim(name)) between 1 and 80)
);

create table if not exists public.circle_members (
  circle_id uuid not null references public.circles(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default timezone('utc', now()),
  primary key (circle_id, user_id)
);

create index if not exists circle_members_user_id_idx on public.circle_members(user_id);
create index if not exists circle_members_circle_id_idx on public.circle_members(circle_id);

create table if not exists public.circle_invites (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references public.circles(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete cascade,
  code text not null unique,
  status text not null default 'active' check (status in ('active', 'accepted', 'expired', 'revoked')),
  expires_at timestamptz not null,
  accepted_by uuid references public.profiles(id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists circle_invites_created_by_idx on public.circle_invites(created_by);
create index if not exists circle_invites_circle_id_idx on public.circle_invites(circle_id);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute procedure public.set_updated_at();

drop trigger if exists user_state_set_updated_at on public.user_state;
create trigger user_state_set_updated_at
before update on public.user_state
for each row execute procedure public.set_updated_at();

drop trigger if exists weekly_score_snapshots_set_updated_at on public.weekly_score_snapshots;
create trigger weekly_score_snapshots_set_updated_at
before update on public.weekly_score_snapshots
for each row execute procedure public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.user_state enable row level security;
alter table public.weekly_score_snapshots enable row level security;
alter table public.accountability_invites enable row level security;
alter table public.accountability_connections enable row level security;
alter table public.circles enable row level security;
alter table public.circle_members enable row level security;
alter table public.circle_invites enable row level security;

-- profiles
drop policy if exists "profiles_select_self_or_connected" on public.profiles;
create policy "profiles_select_self_or_connected"
on public.profiles
for select
to authenticated
using (
  auth.uid() = id
  or exists (
    select 1
    from public.accountability_connections connection
    where connection.user_id = auth.uid()
      and connection.peer_user_id = profiles.id
  )
  or exists (
    select 1
    from public.circle_members m1
    join public.circle_members m2 on m1.circle_id = m2.circle_id
    where m1.user_id = auth.uid()
      and m2.user_id = profiles.id
  )
);

drop policy if exists "profiles_insert_self" on public.profiles;
create policy "profiles_insert_self"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "profiles_insert_signup_trigger" on public.profiles;
create policy "profiles_insert_signup_trigger"
on public.profiles
for insert
to supabase_auth_admin
with check (true);

-- user_state
drop policy if exists "user_state_self_access" on public.user_state;
create policy "user_state_self_access"
on public.user_state
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- weekly_score_snapshots (split owner write — no FOR ALL overlap with SELECT)
drop policy if exists "weekly_score_snapshots_owner_write" on public.weekly_score_snapshots;
drop policy if exists "weekly_score_snapshots_owner_insert" on public.weekly_score_snapshots;
drop policy if exists "weekly_score_snapshots_owner_update" on public.weekly_score_snapshots;
drop policy if exists "weekly_score_snapshots_owner_delete" on public.weekly_score_snapshots;
drop policy if exists "weekly_score_snapshots_connected_read" on public.weekly_score_snapshots;

create policy "weekly_score_snapshots_owner_insert"
on public.weekly_score_snapshots
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "weekly_score_snapshots_owner_update"
on public.weekly_score_snapshots
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "weekly_score_snapshots_owner_delete"
on public.weekly_score_snapshots
for delete
to authenticated
using (auth.uid() = user_id);

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
  or exists (
    select 1
    from public.circle_members m1
    join public.circle_members m2 on m1.circle_id = m2.circle_id
    where m1.user_id = auth.uid()
      and m2.user_id = weekly_score_snapshots.user_id
  )
);

-- accountability_invites
drop policy if exists "accountability_invites_owner_read" on public.accountability_invites;
create policy "accountability_invites_owner_read"
on public.accountability_invites
for select
to authenticated
using (created_by = auth.uid() or accepted_by = auth.uid());

drop policy if exists "accountability_invites_owner_insert" on public.accountability_invites;
create policy "accountability_invites_owner_insert"
on public.accountability_invites
for insert
to authenticated
with check (created_by = auth.uid());

drop policy if exists "accountability_invites_owner_update" on public.accountability_invites;
create policy "accountability_invites_owner_update"
on public.accountability_invites
for update
to authenticated
using (created_by = auth.uid())
with check (created_by = auth.uid());

drop policy if exists "accountability_invites_owner_delete" on public.accountability_invites;
create policy "accountability_invites_owner_delete"
on public.accountability_invites
for delete
to authenticated
using (created_by = auth.uid());

-- accountability_connections
drop policy if exists "accountability_connections_view_own" on public.accountability_connections;
create policy "accountability_connections_view_own"
on public.accountability_connections
for select
to authenticated
using (user_id = auth.uid() or peer_user_id = auth.uid());

drop policy if exists "accountability_connections_insert_own" on public.accountability_connections;
create policy "accountability_connections_insert_own"
on public.accountability_connections
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "accountability_connections_delete_own" on public.accountability_connections;
create policy "accountability_connections_delete_own"
on public.accountability_connections
for delete
to authenticated
using (user_id = auth.uid());

-- circles
drop policy if exists "circles_select_member" on public.circles;
create policy "circles_select_member"
on public.circles
for select
to authenticated
using (
  exists (
    select 1 from public.circle_members m
    where m.circle_id = circles.id and m.user_id = auth.uid()
  )
);

drop policy if exists "circle_members_select_same_circle" on public.circle_members;
create policy "circle_members_select_same_circle"
on public.circle_members
for select
to authenticated
using (
  exists (
    select 1 from public.circle_members m
    where m.circle_id = circle_members.circle_id and m.user_id = auth.uid()
  )
);

drop policy if exists "circle_invites_select_relevant" on public.circle_invites;
create policy "circle_invites_select_relevant"
on public.circle_invites
for select
to authenticated
using (
  created_by = auth.uid()
  or accepted_by = auth.uid()
  or exists (
    select 1 from public.circle_members m
    where m.circle_id = circle_invites.circle_id and m.user_id = auth.uid()
  )
);

-- ---------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------

create or replace function public.accept_accountability_invite(invite_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  invite_row public.accountability_invites%rowtype;
begin
  if current_user_id is null then
    return jsonb_build_object('status', 'unauthenticated');
  end if;

  select *
  into invite_row
  from public.accountability_invites
  where code = invite_code
  for update;

  if not found then
    return jsonb_build_object('status', 'invalid');
  end if;

  if invite_row.created_by = current_user_id then
    return jsonb_build_object('status', 'self');
  end if;

  if invite_row.status = 'revoked' then
    return jsonb_build_object('status', 'revoked');
  end if;

  if invite_row.status = 'accepted' then
    return jsonb_build_object('status', 'accepted_already');
  end if;

  if invite_row.expires_at <= timezone('utc', now()) then
    update public.accountability_invites
    set status = 'expired'
    where id = invite_row.id;

    return jsonb_build_object('status', 'expired');
  end if;

  if exists (
    select 1
    from public.accountability_connections connection
    where (connection.user_id = current_user_id and connection.peer_user_id = invite_row.created_by)
       or (connection.user_id = invite_row.created_by and connection.peer_user_id = current_user_id)
  ) then
    return jsonb_build_object('status', 'duplicate');
  end if;

  insert into public.accountability_connections (user_id, peer_user_id)
  values
    (current_user_id, invite_row.created_by),
    (invite_row.created_by, current_user_id)
  on conflict (user_id, peer_user_id) do nothing;

  update public.accountability_invites
  set
    status = 'accepted',
    accepted_by = current_user_id,
    accepted_at = timezone('utc', now())
  where id = invite_row.id;

  return jsonb_build_object(
    'status', 'accepted',
    'peer_user_id', invite_row.created_by
  );
end;
$$;

grant execute on function public.accept_accountability_invite(text) to authenticated;

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

-- Circles (multi-group leaderboards)
create or replace function public.create_circle(p_name text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  new_id uuid;
  trimmed text := trim(p_name);
begin
  if current_user_id is null then
    return jsonb_build_object('status', 'unauthenticated');
  end if;

  if trimmed is null or length(trimmed) < 1 or length(trimmed) > 80 then
    return jsonb_build_object('status', 'invalid_name');
  end if;

  insert into public.circles (name, created_by)
  values (trimmed, current_user_id)
  returning id into new_id;

  insert into public.circle_members (circle_id, user_id)
  values (new_id, current_user_id)
  on conflict do nothing;

  return jsonb_build_object('status', 'created', 'circle_id', new_id, 'name', trimmed);
end;
$$;

grant execute on function public.create_circle(text) to authenticated;

create or replace function public.create_circle_invite(p_circle_id uuid, expires_in_hours int default 168)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  new_code text;
  new_id uuid;
  expires timestamptz;
begin
  if current_user_id is null then
    return jsonb_build_object('status', 'unauthenticated');
  end if;

  if not exists (
    select 1 from public.circle_members m
    where m.circle_id = p_circle_id and m.user_id = current_user_id
  ) then
    return jsonb_build_object('status', 'forbidden');
  end if;

  new_code := replace(replace(replace(
    encode(gen_random_bytes(14), 'base64'),
    '+', 'C'), '/', 'D'), '=', 'E');

  expires := timezone('utc', now()) + (coalesce(expires_in_hours, 168) || ' hours')::interval;

  insert into public.circle_invites (circle_id, created_by, code, expires_at)
  values (p_circle_id, current_user_id, new_code, expires)
  returning id into new_id;

  return jsonb_build_object(
    'status', 'created',
    'invite_id', new_id,
    'code', new_code,
    'expires_at', expires
  );
end;
$$;

grant execute on function public.create_circle_invite(uuid, int) to authenticated;

create or replace function public.accept_circle_invite(invite_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  invite_row public.circle_invites%rowtype;
begin
  if current_user_id is null then
    return jsonb_build_object('status', 'unauthenticated');
  end if;

  select *
  into invite_row
  from public.circle_invites
  where code = invite_code
  for update;

  if not found then
    return jsonb_build_object('status', 'invalid');
  end if;

  if invite_row.status = 'revoked' then
    return jsonb_build_object('status', 'revoked');
  end if;

  if invite_row.status = 'accepted' then
    return jsonb_build_object('status', 'accepted_already');
  end if;

  if invite_row.expires_at <= timezone('utc', now()) then
    update public.circle_invites
    set status = 'expired'
    where id = invite_row.id;

    return jsonb_build_object('status', 'expired');
  end if;

  if exists (
    select 1 from public.circle_members m
    where m.circle_id = invite_row.circle_id and m.user_id = current_user_id
  ) then
    return jsonb_build_object('status', 'duplicate', 'circle_id', invite_row.circle_id);
  end if;

  insert into public.circle_members (circle_id, user_id)
  values (invite_row.circle_id, current_user_id)
  on conflict do nothing;

  update public.circle_invites
  set
    status = 'accepted',
    accepted_by = current_user_id,
    accepted_at = timezone('utc', now())
  where id = invite_row.id;

  return jsonb_build_object(
    'status', 'accepted',
    'circle_id', invite_row.circle_id
  );
end;
$$;

grant execute on function public.accept_circle_invite(text) to authenticated;

create or replace function public.leave_circle(p_circle_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  deleted_rows int;
  member_count int;
begin
  if current_user_id is null then
    return jsonb_build_object('status', 'unauthenticated');
  end if;

  delete from public.circle_members
  where circle_id = p_circle_id and user_id = current_user_id;

  get diagnostics deleted_rows = row_count;

  if deleted_rows = 0 then
    return jsonb_build_object('status', 'not_member');
  end if;

  select count(*)::int into member_count
  from public.circle_members
  where circle_id = p_circle_id;

  if member_count = 0 then
    delete from public.circles where id = p_circle_id;
    return jsonb_build_object('status', 'left_and_circle_removed');
  end if;

  return jsonb_build_object('status', 'left', 'circle_id', p_circle_id);
end;
$$;

grant execute on function public.leave_circle(uuid) to authenticated;

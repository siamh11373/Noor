create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  timezone text,
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

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute procedure public.set_updated_at();

create trigger user_state_set_updated_at
before update on public.user_state
for each row execute procedure public.set_updated_at();

create trigger weekly_score_snapshots_set_updated_at
before update on public.weekly_score_snapshots
for each row execute procedure public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.user_state enable row level security;
alter table public.weekly_score_snapshots enable row level security;
alter table public.accountability_invites enable row level security;
alter table public.accountability_connections enable row level security;

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

drop policy if exists "user_state_self_access" on public.user_state;
create policy "user_state_self_access"
on public.user_state
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "weekly_score_snapshots_owner_write" on public.weekly_score_snapshots;
create policy "weekly_score_snapshots_owner_write"
on public.weekly_score_snapshots
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

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

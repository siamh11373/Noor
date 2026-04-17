-- Named circles: many members per circle, parallel to 1:1 accountability.
-- Members can read each other's weekly_score_snapshots and profiles (same as accountability pairs).

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

alter table public.circles enable row level security;
alter table public.circle_members enable row level security;
alter table public.circle_invites enable row level security;

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

-- Extend profile visibility to circle co-members
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

-- Extend weekly snapshot read to circle co-members
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
  or exists (
    select 1
    from public.circle_members m1
    join public.circle_members m2 on m1.circle_id = m2.circle_id
    where m1.user_id = auth.uid()
      and m2.user_id = weekly_score_snapshots.user_id
  )
);

-- ---------------------------------------------------------------------------
-- RPCs (security definer)
-- ---------------------------------------------------------------------------

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

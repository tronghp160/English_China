-- Sổ Từ — sharing, groups and explore (docs/PLAN.md §11.5, Phase 5)

-- ---------------------------------------------------------------------------
-- Keep group decks consistent when a group or a membership goes away.
-- decks.group_id is "on delete set null", which alone would violate
-- check (visibility <> 'group' or group_id is not null).
-- ---------------------------------------------------------------------------
create or replace function public.groups_before_delete()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  update public.decks
    set visibility = 'private', group_id = null, allow_member_edit = false
    where group_id = old.id;
  return old;
end;
$$;

create trigger groups_before_delete before delete on public.groups
  for each row execute function public.groups_before_delete();

-- A member who leaves (or is removed) takes their own group decks back as private:
-- they could not edit them any more (decks update policy requires membership).
create or replace function public.group_members_after_delete()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  update public.decks
    set visibility = 'private', group_id = null, allow_member_edit = false
    where group_id = old.group_id and owner_id = old.user_id and visibility = 'group';
  return old;
end;
$$;

create trigger group_members_after_delete after delete on public.group_members
  for each row execute function public.group_members_after_delete();

-- ---------------------------------------------------------------------------
-- join_group: same as before, plus a member cap.
-- ---------------------------------------------------------------------------
create or replace function public.join_group(p_code text)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  gid uuid;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;
  select id into gid from public.groups where invite_code = upper(trim(p_code));
  if gid is null then
    raise exception 'invalid_invite_code';
  end if;
  if exists (select 1 from public.group_members where group_id = gid and user_id = auth.uid()) then
    return gid;
  end if;
  if (select count(*) from public.group_members where group_id = gid) >= 100 then
    raise exception 'group_full' using hint = 'Nhóm đã đủ 100 thành viên.';
  end if;
  insert into public.group_members (group_id, user_id) values (gid, auth.uid())
  on conflict do nothing;
  return gid;
end;
$$;

-- ---------------------------------------------------------------------------
-- Groups the caller belongs to, with counts for the /groups list.
-- ---------------------------------------------------------------------------
create or replace function public.my_groups()
returns table (
  id uuid,
  name text,
  description text,
  owner_id uuid,
  role public.group_role,
  member_count bigint,
  deck_count bigint,
  week_xp bigint,
  joined_at timestamptz
)
language plpgsql stable security definer set search_path = ''
as $$
#variable_conflict use_column
declare
  uid uuid := auth.uid();
  week_start date := date_trunc('week', now() at time zone 'Asia/Ho_Chi_Minh')::date;
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;
  return query
    select g.id, g.name, g.description, g.owner_id, m.role,
           (select count(*) from public.group_members x where x.group_id = g.id),
           (select count(*) from public.decks d where d.group_id = g.id and d.visibility = 'group'),
           coalesce((select sum(s.xp) from public.daily_stats s
                     where s.user_id = uid and s.day >= week_start), 0)::bigint,
           m.joined_at
    from public.group_members m
    join public.groups g on g.id = m.group_id
    where m.user_id = uid
    order by m.joined_at desc;
end;
$$;

-- ---------------------------------------------------------------------------
-- Recent activity in a group (last 14 days): words added to group decks
-- (one row per member, deck and day) and members joining.
-- Streaks are added on the server from daily_stats (lib/srs/streak.ts).
-- ---------------------------------------------------------------------------
create or replace function public.group_activity(p_group_id uuid, p_limit int default 30)
returns table (
  kind text,              -- 'words' | 'joined' | 'created'
  user_id uuid,
  display_name text,
  deck_id uuid,
  deck_name text,
  n bigint,
  at timestamptz
)
language plpgsql stable security definer set search_path = ''
as $$
#variable_conflict use_column
declare
  since timestamptz := now() - interval '14 days';
begin
  if not public.is_group_member(p_group_id) then
    raise exception 'forbidden';
  end if;
  return query
  select * from (
    select 'words'::text, w.created_by, p.display_name, d.id, d.name, count(*), max(w.created_at)
    from public.words w
    join public.decks d on d.id = w.deck_id
    join public.group_members m on m.group_id = p_group_id and m.user_id = w.created_by
    join public.profiles p on p.id = w.created_by
    where d.group_id = p_group_id and d.visibility = 'group' and w.created_at >= since
    group by w.created_by, p.display_name, d.id, d.name,
             ((w.created_at at time zone 'Asia/Ho_Chi_Minh') - interval '4 hours')::date
    union all
    select case when m.role = 'owner' then 'created' else 'joined' end,
           m.user_id, p.display_name, null::uuid, null::text, 0::bigint, m.joined_at
    from public.group_members m
    join public.profiles p on p.id = m.user_id
    where m.group_id = p_group_id and m.joined_at >= since
  ) a
  order by 7 desc
  limit least(greatest(p_limit, 1), 100);
end;
$$;

-- ---------------------------------------------------------------------------
-- Execute privileges
-- ---------------------------------------------------------------------------
revoke execute on function public.groups_before_delete(), public.group_members_after_delete(),
  public.my_groups(), public.group_activity(uuid, int) from public, anon;
grant execute on function public.my_groups(), public.group_activity(uuid, int) to authenticated;

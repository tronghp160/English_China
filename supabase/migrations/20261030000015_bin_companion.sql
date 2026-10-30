-- One AI-written greeting per user per study day (docs/PLAN-bin-3.md §2.2).
create table public.bin_daily (
  user_id uuid not null references public.profiles on delete cascade,
  study_day date not null,
  greeting text not null check (char_length(greeting) <= 200),
  mood text not null check (mood in ('happy','wave','cheer','love','wink','cool','think')),
  word_id uuid references public.words on delete set null,
  source text not null check (source in ('ai', 'template')),
  created_at timestamptz not null default now(),
  primary key (user_id, study_day)
);

alter table public.bin_daily enable row level security;
create policy "bin_daily: own read" on public.bin_daily for select to authenticated using (user_id = auth.uid());
revoke insert, update, delete on public.bin_daily from authenticated, anon;

-- Top missed words in the last p_days for daily greeting context
create or replace function public.bin_recent_misses(p_days int default 2, p_user uuid default auth.uid())
returns table (word_id uuid, term text, meaning_vi text, language public.lang_code, misses int)
language sql stable security invoker set search_path = ''
as $$
  select w.id, w.term, w.meaning_vi, w.language, count(*)::int
  from public.review_logs l join public.words w on w.id = l.word_id
  where l.user_id = coalesce(p_user, auth.uid()) and l.rating = 1
    and l.reviewed_at >= now() - make_interval(days => greatest(1, least(p_days, 7)))
  group by w.id, w.term, w.meaning_vi, w.language
  order by count(*) desc, max(l.reviewed_at) desc
  limit 3;
$$;
grant execute on function public.bin_recent_misses(int, uuid) to authenticated;

-- Streak freezes (scarves) saved per day (docs/PLAN-bin-3.md §2.3).
create table public.bin_freezes (
  user_id uuid not null references public.profiles on delete cascade,
  day date not null,
  created_at timestamptz not null default now(),
  primary key (user_id, day)
);

alter table public.bin_freezes enable row level security;
create policy "bin_freezes: own or group mates" on public.bin_freezes
  for select to authenticated using (user_id = auth.uid() or public.shares_group_with(user_id));
revoke insert, update, delete on public.bin_freezes from authenticated, anon;

-- Uses one scarf per day in p_days (oldest first) while scarves last. Returns the days actually frozen.
create or replace function public.bin_use_freezes(p_user uuid, p_days date[])
returns date[]
language plpgsql security definer set search_path = ''
as $$
declare
  have int;
  d date;
  used date[] := '{}';
begin
  perform public.bin_lock(p_user);
  select qty into have from public.bin_items where user_id = p_user and item_id = 'streak_scarf';
  have := coalesce(have, 0);
  foreach d in array (select array_agg(x order by x) from unnest(p_days) x) loop
    exit when have <= 0;
    insert into public.bin_freezes (user_id, day) values (p_user, d) on conflict do nothing;
    if found then
      have := have - 1;
      used := array_append(used, d);
    end if;
  end loop;
  update public.bin_items set qty = have where user_id = p_user and item_id = 'streak_scarf';
  return used;
end;
$$;
grant execute on function public.bin_use_freezes(uuid, date[]) to service_role;

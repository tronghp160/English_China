-- Bin 3.0 (docs/PLAN-bin-3.md): the bone ledger, owned items, the room and trips.
-- Bones in hand = floor(sum(daily_stats.correct) / 10) + sum(bin_ledger.amount).
-- Every write goes through the service-role functions below, called by server actions after requireUser().

create table if not exists public.bin_ledger (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles on delete cascade,
  kind text not null check (kind in ('migrate', 'quest', 'feed', 'buy', 'trip')),
  amount int not null check (amount between -1000 and 1000),
  ref text check (char_length(ref) <= 80),
  study_day date not null,
  created_at timestamptz not null default now()
);
create index if not exists bin_ledger_user_created_idx on public.bin_ledger (user_id, created_at desc);
create index if not exists bin_ledger_user_kind_day_idx on public.bin_ledger (user_id, kind, study_day);
-- One row per quest reward, per trip, per migration: a retried call cannot pay twice.
create unique index if not exists bin_ledger_once on public.bin_ledger (user_id, kind, ref)
  where kind in ('migrate', 'quest', 'trip');

alter table public.bin_ledger enable row level security;
drop policy if exists "bin_ledger: own read" on public.bin_ledger;
create policy "bin_ledger: own read" on public.bin_ledger
  for select to authenticated using (user_id = auth.uid());
revoke insert, update, delete on public.bin_ledger from authenticated, anon;

-- Serializes bone writes of one user: lock their profile row for the transaction.
create or replace function public.bin_lock(p_user uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform 1 from public.profiles where id = p_user for update;
end;
$$;

create or replace function public.bin_balance(p_user uuid)
returns int
language sql stable security definer set search_path = ''
as $$
  select (coalesce((select sum(correct) from public.daily_stats where user_id = p_user), 0) / 10)::int
       + coalesce((select sum(amount) from public.bin_ledger where user_id = p_user), 0)::int;
$$;

-- What getProgress needs in one call, for the signed-in user (RLS client).
create or replace function public.bin_wallet()
returns table (balance int, fed_today boolean)
language sql stable security definer set search_path = ''
as $$
  select public.bin_balance(auth.uid()),
         exists (select 1 from public.bin_ledger l
                 where l.user_id = auth.uid() and l.kind = 'feed'
                   and l.study_day = public.study_day(auth.uid()));
$$;

-- Adds bones (quest reward, trip). Returns the new balance; a repeated (kind, ref) adds nothing.
create or replace function public.bin_grant(p_user uuid, p_kind text, p_amount int, p_ref text default null)
returns int
language plpgsql security definer set search_path = ''
as $$
begin
  if p_amount <= 0 then raise exception 'bad_amount'; end if;
  perform public.bin_lock(p_user);
  insert into public.bin_ledger (user_id, kind, amount, ref, study_day)
  values (p_user, p_kind, p_amount, p_ref, public.study_day(p_user))
  on conflict do nothing;
  return public.bin_balance(p_user);
end;
$$;

-- Takes bones (feed). Raises 'not_enough_bones' when the balance is short.
create or replace function public.bin_spend(p_user uuid, p_kind text, p_amount int, p_ref text default null)
returns int
language plpgsql security definer set search_path = ''
as $$
begin
  if p_amount <= 0 then raise exception 'bad_amount'; end if;
  perform public.bin_lock(p_user);
  if public.bin_balance(p_user) < p_amount then raise exception 'not_enough_bones'; end if;
  insert into public.bin_ledger (user_id, kind, amount, ref, study_day)
  values (p_user, p_kind, -p_amount, p_ref, public.study_day(p_user));
  return public.bin_balance(p_user);
end;
$$;

-- Moves the bones kept in prefs into the ledger once: +2 per quest reward taken, -1 per bone fed.
insert into public.bin_ledger (user_id, kind, amount, ref, study_day)
select s.user_id, 'migrate',
       2 * coalesce((s.prefs ->> 'quests_total')::int, 0) - coalesce((s.prefs ->> 'bin_treats_fed')::int, 0),
       'prefs-v1',
       public.study_day(s.user_id)
from public.user_settings s
where coalesce((s.prefs ->> 'quests_total')::int, 0) > 0
   or coalesce((s.prefs ->> 'bin_treats_fed')::int, 0) > 0
on conflict do nothing;

-- "Fed today" now comes from the ledger: keep today's feeding.
insert into public.bin_ledger (user_id, kind, amount, ref, study_day)
select s.user_id, 'feed', 0, 'prefs-v1-last-fed', (s.prefs ->> 'bin_last_fed')::date
from public.user_settings s
where (s.prefs ->> 'bin_last_fed') ~ '^\d{4}-\d{2}-\d{2}$'
  and (s.prefs ->> 'bin_last_fed')::date = public.study_day(s.user_id);

revoke execute on function public.bin_lock(uuid), public.bin_balance(uuid),
  public.bin_grant(uuid, text, int, text), public.bin_spend(uuid, text, int, text)
  from public, anon, authenticated;
grant execute on function public.bin_lock(uuid), public.bin_balance(uuid),
  public.bin_grant(uuid, text, int, text), public.bin_spend(uuid, text, int, text)
  to service_role;
revoke execute on function public.bin_wallet() from public, anon;
grant execute on function public.bin_wallet() to authenticated;

-- Items a user owns (room items now; the streak scarf and eggs later). qty > 1 only for consumables.
create table if not exists public.bin_items (
  user_id uuid not null references public.profiles on delete cascade,
  item_id text not null check (char_length(item_id) <= 40),
  qty int not null default 1 check (qty >= 0 and qty <= 99),
  acquired_at timestamptz not null default now(),
  primary key (user_id, item_id)
);

-- What stands in each spot of the room.
create table if not exists public.bin_room (
  user_id uuid not null references public.profiles on delete cascade,
  slot text not null check (slot in ('bowl', 'bed', 'wall', 'toy', 'rug', 'corner')),
  item_id text not null check (char_length(item_id) <= 40),
  primary key (user_id, slot)
);

alter table public.bin_items enable row level security;
alter table public.bin_room enable row level security;
drop policy if exists "bin_items: own read" on public.bin_items;
create policy "bin_items: own read" on public.bin_items for select to authenticated using (user_id = auth.uid());
drop policy if exists "bin_room: own read" on public.bin_room;
create policy "bin_room: own read" on public.bin_room for select to authenticated using (user_id = auth.uid());
revoke insert, update, delete on public.bin_items, public.bin_room from authenticated, anon;

-- Buys one item: takes the price and adds it to bin_items in one transaction.
-- p_max_qty: 1 for room items (raises 'already_owned'), 2 for the streak scarf, etc.
create or replace function public.bin_buy(p_user uuid, p_item text, p_price int, p_max_qty int)
returns int
language plpgsql security definer set search_path = ''
as $$
declare
  have int;
begin
  if p_price < 0 or p_max_qty < 1 then raise exception 'bad_amount'; end if;
  perform public.bin_lock(p_user);
  select qty into have from public.bin_items where user_id = p_user and item_id = p_item;
  if coalesce(have, 0) >= p_max_qty then raise exception 'already_owned'; end if;
  if p_price > 0 then
    if public.bin_balance(p_user) < p_price then raise exception 'not_enough_bones'; end if;
    insert into public.bin_ledger (user_id, kind, amount, ref, study_day)
    values (p_user, 'buy', -p_price, p_item, public.study_day(p_user));
  end if;
  insert into public.bin_items (user_id, item_id, qty) values (p_user, p_item, 1)
  on conflict (user_id, item_id) do update set qty = public.bin_items.qty + 1;
  return public.bin_balance(p_user);
end;
$$;

revoke execute on function public.bin_buy(uuid, text, int, int) from public, anon, authenticated;
grant execute on function public.bin_buy(uuid, text, int, int) to service_role;

-- ---------------------------------------------------------------------------
-- Bin trips (walks) and postcards (PLAN-bin-3.md §1.5)
-- ---------------------------------------------------------------------------
create table if not exists public.bin_trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  study_day date not null,
  lang public.lang_code not null,
  place_id text not null check (char_length(place_id) <= 40),
  word_id uuid references public.words on delete set null,
  word_term text check (char_length(word_term) <= 200),    -- kept so the postcard survives a deleted word
  story jsonb,                                             -- see BinStory in lib/bin/trip.ts; null until written
  bones int not null check (bones between 0 and 20),
  item_id text check (char_length(item_id) <= 40),
  started_at timestamptz not null default now(),
  returns_at timestamptz not null,
  collected_at timestamptz,
  notified_at timestamptz,
  unique (user_id, study_day)
);
create index if not exists bin_trips_user_started on public.bin_trips (user_id, started_at desc);
create index if not exists bin_trips_due on public.bin_trips (returns_at) where collected_at is null and notified_at is null;

alter table public.bin_trips enable row level security;
drop policy if exists "bin_trips: own read" on public.bin_trips;
create policy "bin_trips: own read" on public.bin_trips for select to authenticated using (user_id = auth.uid());
revoke insert, update, delete on public.bin_trips from authenticated, anon;

-- Collects a trip that is back: marks it, pays the bones and adds the item, all at once.
create or replace function public.bin_collect_trip(p_user uuid, p_trip uuid)
returns int
language plpgsql security definer set search_path = ''
as $$
declare
  t public.bin_trips;
begin
  perform public.bin_lock(p_user);
  select * into t from public.bin_trips where id = p_trip and user_id = p_user for update;
  if not found then raise exception 'no_trip'; end if;
  if t.collected_at is not null then raise exception 'already_collected'; end if;
  if t.returns_at > now() then raise exception 'not_back'; end if;
  update public.bin_trips set collected_at = now() where id = p_trip;
  if t.bones > 0 then
    insert into public.bin_ledger (user_id, kind, amount, ref, study_day)
    values (p_user, 'trip', t.bones, p_trip::text, public.study_day(p_user))
    on conflict do nothing;
  end if;
  if t.item_id is not null then
    insert into public.bin_items (user_id, item_id, qty) values (p_user, t.item_id, 1)
    on conflict (user_id, item_id) do nothing;
  end if;
  return public.bin_balance(p_user);
end;
$$;

create or replace function public.bin_trip_candidates(p_user uuid)
returns table (
  id uuid,
  term text,
  meaning_vi text,
  language public.lang_code,
  reading text,
  lapses int,
  state text,
  last_review timestamptz
)
language sql stable security definer set search_path = ''
as $$
  with pool as (
    select
      w.id,
      w.term,
      w.meaning_vi,
      w.language,
      w.reading,
      c.lapses,
      c.state::text as state,
      c.last_review,
      case
        when c.state in ('learning', 'relearning') or c.lapses >= 2 then 1
        when c.state = 'review' and c.last_review >= now() - interval '14 days' then 2
        else 3
      end as priority
    from public.user_cards c
    join public.words w on w.id = c.word_id
    where c.user_id = p_user
      and c.direction = 'recognize'
      and c.suspended = false
      and w.deck_id in (select public.study_deck_ids(p_user))
  )
  select id, term, meaning_vi, language, reading, lapses, state, last_review
  from pool
  where priority <= 2
  order by priority asc, lapses desc, last_review desc nulls last
  limit 30;
$$;

revoke execute on function public.bin_collect_trip(uuid, uuid) from public, anon, authenticated;
grant execute on function public.bin_collect_trip(uuid, uuid) to service_role;
revoke execute on function public.bin_trip_candidates(uuid) from public, anon, authenticated;
grant execute on function public.bin_trip_candidates(uuid) to service_role;


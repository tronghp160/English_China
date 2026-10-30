-- Bin 3.0 (docs/PLAN-bin-3.md): the bone ledger, owned items, the room and trips.
-- Bones in hand = floor(sum(daily_stats.correct) / 10) + sum(bin_ledger.amount).
-- Every write goes through the service-role functions below, called by server actions after requireUser().

create table public.bin_ledger (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles on delete cascade,
  kind text not null check (kind in ('migrate', 'quest', 'feed', 'buy', 'trip')),
  amount int not null check (amount between -1000 and 1000),
  ref text check (char_length(ref) <= 80),
  study_day date not null,
  created_at timestamptz not null default now()
);
create index on public.bin_ledger (user_id, created_at desc);
create index on public.bin_ledger (user_id, kind, study_day);
-- One row per quest reward, per trip, per migration: a retried call cannot pay twice.
create unique index bin_ledger_once on public.bin_ledger (user_id, kind, ref)
  where kind in ('migrate', 'quest', 'trip');

alter table public.bin_ledger enable row level security;
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

create table public.bin_buddies (
  user_id uuid not null references public.profiles on delete cascade,
  species text not null check (species in ('miu', 'panda', 'duck', 'bunny')),
  name text not null check (char_length(name) between 1 and 20),
  egg_at timestamptz not null default now(),
  start_correct int not null check (start_correct >= 0),  -- total right answers when the egg arrived
  hatched_at timestamptz,
  primary key (user_id, species)
);
alter table public.bin_buddies enable row level security;
create policy "bin_buddies: own read" on public.bin_buddies for select to authenticated using (user_id = auth.uid());
revoke insert, update, delete on public.bin_buddies from authenticated, anon;

-- Counts mastered words per language for the signed-in user (recognize cards, interval >= 21 days).
create or replace function public.bin_mastered_counts(p_user uuid default auth.uid())
returns table (language public.lang_code, n int)
language sql stable security definer set search_path = ''
as $$
  select w.language, count(*)::int
  from public.user_cards c join public.words w on w.id = c.word_id
  where c.user_id = coalesce(p_user, auth.uid()) and c.direction = 'recognize' and c.state = 'review'
    and c.scheduled_days >= 21 and not c.suspended
  group by w.language;
$$;
grant execute on function public.bin_mastered_counts(uuid) to authenticated, service_role;

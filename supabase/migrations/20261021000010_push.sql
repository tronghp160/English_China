-- Daily review reminders by Web Push. One row per browser/device subscription.
-- Written only by the server (service role) after it checked the session, so a
-- device that changes hands moves its subscription to the new account.

create table public.push_subscriptions (
  endpoint text primary key check (endpoint like 'https://%' and char_length(endpoint) <= 1000),
  user_id uuid not null references public.profiles on delete cascade,
  p256dh text not null check (char_length(p256dh) <= 200),
  auth text not null check (char_length(auth) <= 100),
  created_at timestamptz not null default now()
);
create index on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;
-- no client policies (service role only)
revoke all on public.push_subscriptions from anon, authenticated;

-- Study day of the last reminder, so the daily job sends at most one per day.
alter table public.user_settings add column reminded_on date;

-- Users with a subscription, cards due before their next day starts (same rule as
-- get_due_cards) and no reminder yet on their current study day.
create or replace function public.reminder_targets()
returns table (user_id uuid, due_count int)
language sql stable security definer set search_path = ''
as $$
  select s.user_id, count(*)::int
  from public.user_settings s
  join public.user_cards c on c.user_id = s.user_id
  join public.words w on w.id = c.word_id
  where exists (select 1 from public.push_subscriptions p where p.user_id = s.user_id)
    and s.reminded_on is distinct from public.study_day(s.user_id)
    and not c.suspended
    and c.state <> 'new'
    and c.due < public.next_day_start(s.user_id)
    and w.deck_id in (select public.study_deck_ids(s.user_id))
  group by s.user_id;
$$;

create or replace function public.mark_reminded(p_user_ids uuid[])
returns void
language sql security definer set search_path = ''
as $$
  update public.user_settings set reminded_on = public.study_day(user_id) where user_id = any(p_user_ids);
$$;

revoke execute on function public.reminder_targets(), public.mark_reminded(uuid[]) from public, anon, authenticated;
grant execute on function public.reminder_targets(), public.mark_reminded(uuid[]) to service_role;

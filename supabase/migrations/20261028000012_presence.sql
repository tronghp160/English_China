-- Presence and login history for /admin: who is online and where they signed in from.
-- Written only by the server (service role) after it verified the session.
-- Location is the hosting platform's IP geolocation (approximate, city level), never GPS.

create table public.user_presence (
  user_id uuid primary key references public.profiles on delete cascade,
  last_seen_at timestamptz not null default now(),
  session_id uuid,
  path text check (char_length(path) <= 200),
  ip text check (char_length(ip) <= 64),
  country text check (char_length(country) <= 8),
  region text check (char_length(region) <= 80),
  city text check (char_length(city) <= 120),
  latitude double precision check (latitude between -90 and 90),
  longitude double precision check (longitude between -180 and 180),
  timezone text check (char_length(timezone) <= 64),
  device_type text check (device_type in ('mobile', 'tablet', 'desktop', 'unknown')),
  browser text check (char_length(browser) <= 40),
  os text check (char_length(os) <= 40),
  user_agent text check (char_length(user_agent) <= 400)
);
create index on public.user_presence (last_seen_at desc);

create table public.login_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles on delete cascade,
  session_id uuid,
  ip text check (char_length(ip) <= 64),
  country text check (char_length(country) <= 8),
  region text check (char_length(region) <= 80),
  city text check (char_length(city) <= 120),
  latitude double precision check (latitude between -90 and 90),
  longitude double precision check (longitude between -180 and 180),
  timezone text check (char_length(timezone) <= 64),
  device_type text check (device_type in ('mobile', 'tablet', 'desktop', 'unknown')),
  browser text check (char_length(browser) <= 40),
  os text check (char_length(os) <= 40),
  user_agent text check (char_length(user_agent) <= 400),
  created_at timestamptz not null default now()
);
create unique index login_events_user_session on public.login_events (user_id, session_id) where session_id is not null;
create index on public.login_events (user_id, created_at desc);
create index on public.login_events (created_at desc);

alter table public.user_presence enable row level security;
alter table public.login_events enable row level security;
revoke all on public.user_presence from anon, authenticated;
revoke all on public.login_events from anon, authenticated;

-- A person may read (and so export) their own sign-in history; nobody else's.
grant select on public.login_events to authenticated;
create policy "login_events: owner read" on public.login_events
  for select to authenticated using (user_id = auth.uid());

-- One call per heartbeat: records a login when the session is new, then refreshes presence
-- (skipped when nothing changed in the last 20 seconds). Returns true when a login was recorded.
create or replace function public.record_presence(
  p_user_id uuid,
  p_path text default null,
  p_session_id uuid default null,
  p_ip text default null,
  p_country text default null,
  p_region text default null,
  p_city text default null,
  p_latitude double precision default null,
  p_longitude double precision default null,
  p_timezone text default null,
  p_device_type text default null,
  p_browser text default null,
  p_os text default null,
  p_user_agent text default null
) returns boolean
language plpgsql security definer set search_path = ''
as $$
declare
  is_new_login boolean := false;
begin
  if p_session_id is not null then
    insert into public.login_events
      (user_id, session_id, ip, country, region, city, latitude, longitude, timezone, device_type, browser, os, user_agent)
    values
      (p_user_id, p_session_id, p_ip, p_country, p_region, p_city, p_latitude, p_longitude, p_timezone, p_device_type, p_browser, p_os, p_user_agent)
    on conflict (user_id, session_id) where session_id is not null do nothing;
    is_new_login := found;
    if is_new_login then
      -- retention: 90 days and at most 200 rows per person
      delete from public.login_events where user_id = p_user_id and created_at < now() - interval '90 days';
      delete from public.login_events where id in (
        select id from public.login_events where user_id = p_user_id order by created_at desc offset 200
      );
    end if;
  end if;

  insert into public.user_presence as up
    (user_id, last_seen_at, session_id, path, ip, country, region, city, latitude, longitude, timezone, device_type, browser, os, user_agent)
  values
    (p_user_id, now(), p_session_id, p_path, p_ip, p_country, p_region, p_city, p_latitude, p_longitude, p_timezone, p_device_type, p_browser, p_os, p_user_agent)
  on conflict (user_id) do update set
    last_seen_at = excluded.last_seen_at, session_id = excluded.session_id, path = excluded.path,
    ip = excluded.ip, country = excluded.country, region = excluded.region, city = excluded.city,
    latitude = excluded.latitude, longitude = excluded.longitude, timezone = excluded.timezone,
    device_type = excluded.device_type, browser = excluded.browser, os = excluded.os, user_agent = excluded.user_agent
  where up.last_seen_at < now() - interval '20 seconds'
     or up.session_id is distinct from excluded.session_id
     or up.path is distinct from excluded.path;

  return is_new_login;
end;
$$;

revoke execute on function public.record_presence(uuid, text, uuid, text, text, text, text, double precision, double precision, text, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.record_presence(uuid, text, uuid, text, text, text, text, double precision, double precision, text, text, text, text, text)
  to service_role;

-- Per-person totals for the admin list (level, last study day) without paging through daily_stats.
create or replace function public.admin_user_rollup()
returns table (user_id uuid, total_xp bigint, total_reviews bigint, total_correct bigint, active_days int, last_active_day date)
language sql stable security definer set search_path = ''
as $$
  select s.user_id,
         coalesce(sum(s.xp), 0)::bigint,
         coalesce(sum(s.reviews), 0)::bigint,
         coalesce(sum(s.correct), 0)::bigint,
         (count(*) filter (where s.reviews > 0))::int,
         max(s.day) filter (where s.reviews > 0)
  from public.daily_stats s
  group by s.user_id;
$$;
revoke execute on function public.admin_user_rollup() from public, anon, authenticated;
grant execute on function public.admin_user_rollup() to service_role;

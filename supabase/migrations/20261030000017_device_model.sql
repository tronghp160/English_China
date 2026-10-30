-- Adds device_model to user_presence and login_events for specific device identification
alter table public.user_presence add column if not exists device_model text check (char_length(device_model) <= 80);
alter table public.login_events add column if not exists device_model text check (char_length(device_model) <= 80);

-- Drop previous 14-parameter record_presence overload to avoid ambiguous resolution
drop function if exists public.record_presence(uuid, text, uuid, text, text, text, text, double precision, double precision, text, text, text, text, text);

-- Update record_presence RPC with p_device_model parameter
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
  p_user_agent text default null,
  p_device_model text default null
) returns boolean
language plpgsql security definer set search_path = ''
as $$
declare
  is_new_login boolean := false;
begin
  if p_session_id is not null then
    insert into public.login_events
      (user_id, session_id, ip, country, region, city, latitude, longitude, timezone, device_type, browser, os, user_agent, device_model)
    values
      (p_user_id, p_session_id, p_ip, p_country, p_region, p_city, p_latitude, p_longitude, p_timezone, p_device_type, p_browser, p_os, p_user_agent, p_device_model)
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
    (user_id, last_seen_at, session_id, path, ip, country, region, city, latitude, longitude, timezone, device_type, browser, os, user_agent, device_model)
  values
    (p_user_id, now(), p_session_id, p_path, p_ip, p_country, p_region, p_city, p_latitude, p_longitude, p_timezone, p_device_type, p_browser, p_os, p_user_agent, p_device_model)
  on conflict (user_id) do update set
    last_seen_at = excluded.last_seen_at, session_id = excluded.session_id, path = excluded.path,
    ip = excluded.ip, country = excluded.country, region = excluded.region, city = excluded.city,
    latitude = excluded.latitude, longitude = excluded.longitude, timezone = excluded.timezone,
    device_type = excluded.device_type, browser = excluded.browser, os = excluded.os, user_agent = excluded.user_agent,
    device_model = coalesce(excluded.device_model, up.device_model)
  where up.last_seen_at < now() - interval '20 seconds'
     or up.session_id is distinct from excluded.session_id
     or up.path is distinct from excluded.path
     or (excluded.device_model is not null and up.device_model is distinct from excluded.device_model);

  return is_new_login;
end;
$$;

revoke execute on function public.record_presence(uuid, text, uuid, text, text, text, text, double precision, double precision, text, text, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.record_presence(uuid, text, uuid, text, text, text, text, double precision, double precision, text, text, text, text, text, text)
  to service_role;

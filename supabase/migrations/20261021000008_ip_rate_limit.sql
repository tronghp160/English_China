-- Rate limits for requests that have no user yet (sign-up, confirm), keyed by a
-- hash of the client IP. Shared by every server instance, unlike an in-memory map.

create table public.ip_rate_limits (
  key_hash text not null,
  bucket text not null,
  window_start timestamptz not null,
  hits int not null default 0,
  primary key (key_hash, bucket, window_start)
);

alter table public.ip_rate_limits enable row level security;
-- no client policies (service role only)
revoke all on public.ip_rate_limits from anon, authenticated;

create or replace function public.hit_ip_rate_limit(p_key_hash text, p_bucket text, p_window_seconds int, p_max int)
returns boolean
language plpgsql security definer set search_path = ''
as $$
declare
  win timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  n int;
begin
  insert into public.ip_rate_limits (key_hash, bucket, window_start, hits)
  values (p_key_hash, p_bucket, win, 1)
  on conflict (key_hash, bucket, window_start) do update set hits = public.ip_rate_limits.hits + 1
  returning hits into n;
  delete from public.ip_rate_limits where window_start < now() - interval '2 days';
  return n <= p_max;
end;
$$;

revoke execute on function public.hit_ip_rate_limit(text, text, int, int) from public, anon, authenticated;
grant execute on function public.hit_ip_rate_limit(text, text, int, int) to service_role;

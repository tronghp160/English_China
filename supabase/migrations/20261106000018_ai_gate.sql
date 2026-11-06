-- ai_gate: the per-minute rate limit and the daily AI quota check in ONE call.
-- /api/chat used to make three requests to Supabase for this (hit_rate_limit, ai_usage_total, a select on
-- ai_usage); each is an HTTP round trip. This adds a function only: no table changes, nothing is rewritten,
-- and the app falls back to the three old calls while the function does not exist yet (lib/ai/gate.ts).
--
-- Returns { allowed, reason, used, total }:
--   allowed  true when the request may go on
--   reason   null | 'rate' | 'quota_global' | 'quota_user' (checked in that order, like the app did)
--   used     the user's AI requests today; total: all users' requests today
-- It does NOT count a usage unit: the app records one (increment_ai_usage) only after an answer was written.
-- Hitting the rate limit counts, as hit_rate_limit always did.

create or replace function public.ai_gate(
  p_user_id uuid,
  p_bucket text,
  p_window_seconds int,
  p_max int,
  p_day date,
  p_units int,
  p_user_limit int,
  p_global_limit int
)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  rate_ok boolean;
  used int := 0;
  total bigint;
  reason text;
begin
  -- Fail open, like the app's hitRateLimit wrapper: a problem in the limiter must not block the app.
  begin
    rate_ok := public.hit_rate_limit(p_user_id, p_bucket, p_window_seconds, p_max);
  exception when others then
    rate_ok := true;
  end;

  total := public.ai_usage_total(p_day);
  select u.requests into used from public.ai_usage u where u.user_id = p_user_id and u.day = p_day;
  used := coalesce(used, 0);

  if not rate_ok then
    reason := 'rate';
  elsif total + p_units > p_global_limit then
    reason := 'quota_global';
  elsif used + p_units > p_user_limit then
    reason := 'quota_user';
  end if;

  return jsonb_build_object('allowed', reason is null, 'reason', reason, 'used', used, 'total', total);
end;
$$;

-- Server only (the service-role client), like hit_rate_limit and ai_usage_total.
revoke execute on function public.ai_gate(uuid, text, int, int, date, int, int, int) from public, anon, authenticated;
grant execute on function public.ai_gate(uuid, text, int, int, date, int, int, int) to service_role;

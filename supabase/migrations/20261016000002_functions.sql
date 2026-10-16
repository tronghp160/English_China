-- Sổ Từ — helper functions, triggers and RPCs (docs/PLAN.md §5.3)

-- ---------------------------------------------------------------------------
-- Day helpers: a "day" is in the user's timezone and rolls over at 04:00
-- ---------------------------------------------------------------------------
create or replace function public.user_tz(p_user_id uuid)
returns text
language sql stable security definer set search_path = ''
as $$
  select coalesce((select timezone from public.user_settings where user_id = p_user_id), 'Asia/Ho_Chi_Minh');
$$;

create or replace function public.study_day(p_user_id uuid, p_at timestamptz default now())
returns date
language sql stable security definer set search_path = ''
as $$
  select ((p_at at time zone public.user_tz(p_user_id)) - interval '4 hours')::date;
$$;

-- First instant of the next study day (04:00 local)
create or replace function public.next_day_start(p_user_id uuid)
returns timestamptz
language sql stable security definer set search_path = ''
as $$
  select ((public.study_day(p_user_id) + 1)::timestamp + interval '4 hours') at time zone public.user_tz(p_user_id);
$$;

-- ---------------------------------------------------------------------------
-- Access helpers (used by RLS)
-- ---------------------------------------------------------------------------
create or replace function public.is_group_member(gid uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.group_members m where m.group_id = gid and m.user_id = auth.uid()
  );
$$;

create or replace function public.shares_group_with(other uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.group_members a
    join public.group_members b on a.group_id = b.group_id
    where a.user_id = auth.uid() and b.user_id = other
  );
$$;

create or replace function public.can_read_deck(did uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.decks d
    where d.id = did
      and (
        d.owner_id = auth.uid()
        or d.visibility = 'public'
        or (d.visibility = 'group' and public.is_group_member(d.group_id))
        or (d.share_slug is not null and exists (
              select 1 from public.deck_subscriptions s
              where s.deck_id = d.id and s.user_id = auth.uid()))
      )
  );
$$;

create or replace function public.can_edit_deck(did uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.decks d
    where d.id = did
      and (
        d.owner_id = auth.uid()
        or (d.visibility = 'group' and d.allow_member_edit and public.is_group_member(d.group_id))
      )
  );
$$;

-- Decks a user studies: own, subscribed (still readable), and group decks.
create or replace function public.study_deck_ids(p_user_id uuid)
returns setof uuid
language sql stable security definer set search_path = ''
as $$
  select d.id from public.decks d where d.owner_id = p_user_id
  union
  select s.deck_id
  from public.deck_subscriptions s
  join public.decks d on d.id = s.deck_id
  where s.user_id = p_user_id
    and (d.visibility = 'public' or d.share_slug is not null
         or (d.visibility = 'group' and exists (
               select 1 from public.group_members m where m.group_id = d.group_id and m.user_id = p_user_id)))
  union
  select d.id
  from public.decks d
  join public.group_members m on m.group_id = d.group_id and m.user_id = p_user_id
  where d.visibility = 'group';
$$;

-- ---------------------------------------------------------------------------
-- New user -> profile + settings
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  base text;
  candidate text;
  n int := 0;
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  display text;
begin
  base := lower(split_part(coalesce(new.email, 'user'), '@', 1));
  base := regexp_replace(base, '[^a-z0-9_]', '', 'g');
  base := left(base, 16);
  if char_length(base) < 3 then
    base := rpad(base, 3, '0');
  end if;
  candidate := base;
  while exists (select 1 from public.profiles where username = candidate) loop
    n := n + 1;
    candidate := left(base, 16) || (floor(random() * 9000) + 1000)::int::text;
    exit when n > 50;
  end loop;

  display := coalesce(nullif(meta->>'full_name', ''), nullif(meta->>'name', ''), split_part(coalesce(new.email, 'Bạn mới'), '@', 1));

  insert into public.profiles (id, username, display_name, avatar_url)
  values (new.id, candidate, left(display, 50), coalesce(meta->>'avatar_url', meta->>'picture'));

  insert into public.user_settings (user_id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- updated_at, counters
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger decks_touch before update on public.decks
  for each row execute function public.touch_updated_at();
create trigger words_touch before update on public.words
  for each row execute function public.touch_updated_at();
create trigger user_settings_touch before update on public.user_settings
  for each row execute function public.touch_updated_at();

create or replace function public.words_after_change()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.decks set word_count = word_count + 1 where id = new.deck_id;
    if new.created_by is not null then
      insert into public.daily_stats (user_id, day, words_added, xp)
      values (new.created_by, public.study_day(new.created_by), 1, 2)
      on conflict (user_id, day) do update
        set words_added = public.daily_stats.words_added + 1,
            xp = public.daily_stats.xp + 2;
    end if;
    return new;
  elsif tg_op = 'DELETE' then
    update public.decks set word_count = greatest(word_count - 1, 0) where id = old.deck_id;
    return old;
  elsif tg_op = 'UPDATE' and new.deck_id <> old.deck_id then
    update public.decks set word_count = greatest(word_count - 1, 0) where id = old.deck_id;
    update public.decks set word_count = word_count + 1 where id = new.deck_id;
    return new;
  end if;
  return new;
end;
$$;

create trigger words_counter
  after insert or delete or update of deck_id on public.words
  for each row execute function public.words_after_change();

create or replace function public.subscriptions_after_change()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.decks set learner_count = learner_count + 1 where id = new.deck_id;
    return new;
  else
    update public.decks set learner_count = greatest(learner_count - 1, 0) where id = old.deck_id;
    return old;
  end if;
end;
$$;

create trigger subscriptions_counter
  after insert or delete on public.deck_subscriptions
  for each row execute function public.subscriptions_after_change();

-- ---------------------------------------------------------------------------
-- Groups: invite codes, owner membership, creation limit
-- ---------------------------------------------------------------------------
create or replace function public.generate_invite_code()
returns text
language plpgsql volatile set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; -- no 0/O, 1/I/l
  code text;
begin
  loop
    code := '';
    for i in 1..8 loop
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.groups where invite_code = code);
  end loop;
  return code;
end;
$$;

create or replace function public.groups_before_insert()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if (select count(*) from public.groups where owner_id = new.owner_id) >= 10 then
    raise exception 'group_limit_reached' using hint = 'Mỗi người tạo tối đa 10 nhóm.';
  end if;
  new.invite_code := public.generate_invite_code();
  return new;
end;
$$;

create trigger groups_before_insert before insert on public.groups
  for each row execute function public.groups_before_insert();

create or replace function public.groups_after_insert()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.group_members (group_id, user_id, role) values (new.id, new.owner_id, 'owner');
  return new;
end;
$$;

create trigger groups_after_insert after insert on public.groups
  for each row execute function public.groups_after_insert();

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
  insert into public.group_members (group_id, user_id) values (gid, auth.uid())
  on conflict do nothing;
  return gid;
end;
$$;

-- Preview shown on /join/[code] before joining
create or replace function public.group_preview(p_code text)
returns table (id uuid, name text, description text, member_count bigint, owner_name text)
language sql stable security definer set search_path = ''
as $$
  select g.id, g.name, g.description,
         (select count(*) from public.group_members m where m.group_id = g.id),
         p.display_name
  from public.groups g
  join public.profiles p on p.id = g.owner_id
  where g.invite_code = upper(trim(p_code));
$$;

create or replace function public.regenerate_invite_code(p_group_id uuid)
returns text
language plpgsql security definer set search_path = ''
as $$
declare
  code text;
begin
  if not exists (select 1 from public.groups where id = p_group_id and owner_id = auth.uid()) then
    raise exception 'forbidden';
  end if;
  code := public.generate_invite_code();
  update public.groups set invite_code = code where id = p_group_id;
  return code;
end;
$$;

-- Weekly leaderboard: XP since Monday 00:00 Vietnam time
create or replace function public.weekly_leaderboard(p_group_id uuid)
returns table (user_id uuid, username text, display_name text, avatar_url text, xp bigint, reviews bigint)
language plpgsql stable security definer set search_path = ''
as $$
#variable_conflict use_column
begin
  if not public.is_group_member(p_group_id) then
    raise exception 'forbidden';
  end if;
  return query
    select p.id, p.username, p.display_name, p.avatar_url,
           coalesce(sum(s.xp), 0)::bigint as xp,
           coalesce(sum(s.reviews), 0)::bigint as reviews
    from public.group_members m
    join public.profiles p on p.id = m.user_id
    left join public.daily_stats s
      on s.user_id = m.user_id
     and s.day >= date_trunc('week', now() at time zone 'Asia/Ho_Chi_Minh')::date
    where m.group_id = p_group_id
    group by p.id
    order by xp desc, reviews desc, p.display_name;
end;
$$;

-- ---------------------------------------------------------------------------
-- Study: card creation, due queue, overview
-- ---------------------------------------------------------------------------
create or replace function public.ensure_user_cards(p_deck_id uuid default null)
returns int
language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  inserted int := 0;
  n int;
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;

  -- recognize cards for every word in studied decks
  insert into public.user_cards (user_id, word_id, direction)
  select uid, w.id, 'recognize'
  from public.words w
  where w.deck_id in (select public.study_deck_ids(uid))
    and (p_deck_id is null or w.deck_id = p_deck_id)
  on conflict do nothing;
  get diagnostics n = row_count;
  inserted := inserted + n;

  -- recall cards unlock once the recognize card reached 'review'
  insert into public.user_cards (user_id, word_id, direction)
  select uid, c.word_id, 'recall'
  from public.user_cards c
  join public.words w on w.id = c.word_id
  join public.decks d on d.id = w.deck_id
  where c.user_id = uid
    and c.direction = 'recognize'
    and c.state = 'review'
    and d.enable_recall
    and d.id in (select public.study_deck_ids(uid))
    and (p_deck_id is null or d.id = p_deck_id)
  on conflict do nothing;
  get diagnostics n = row_count;
  inserted := inserted + n;

  return inserted;
end;
$$;

-- How many new cards the user may still start today
create or replace function public.new_cards_left(p_user_id uuid)
returns int
language sql stable security definer set search_path = ''
as $$
  select greatest(
    coalesce((select daily_new_limit from public.user_settings where user_id = p_user_id), 15)
    - coalesce((select new_learned from public.daily_stats
                where user_id = p_user_id and day = public.study_day(p_user_id)), 0),
    0);
$$;

-- Due cards (review/learning before next day start) + allowed new cards.
create or replace function public.get_due_cards(p_deck_id uuid default null, p_limit int default 200)
returns table (
  word_id uuid,
  direction text,
  state public.card_state,
  due timestamptz,
  stability double precision,
  difficulty double precision,
  elapsed_days int,
  scheduled_days int,
  learning_steps int,
  reps int,
  lapses int,
  last_review timestamptz,
  is_new boolean,
  word jsonb
)
language plpgsql stable security definer set search_path = ''
as $$
#variable_conflict use_column
declare
  uid uuid := auth.uid();
  boundary timestamptz;
  new_left int;
  review_cap int;
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;
  boundary := public.next_day_start(uid);
  new_left := public.new_cards_left(uid);
  review_cap := least(
    p_limit,
    greatest(coalesce((select daily_review_limit from public.user_settings where user_id = uid), 200)
      - coalesce((select reviews from public.daily_stats where user_id = uid and day = public.study_day(uid)), 0), 0)
  );

  return query
  (
    select c.word_id, c.direction, c.state, c.due, c.stability, c.difficulty, c.elapsed_days,
           c.scheduled_days, c.learning_steps, c.reps, c.lapses, c.last_review, false,
           to_jsonb(w) - 'normalized' - 'reading_key'
    from public.user_cards c
    join public.words w on w.id = c.word_id
    where c.user_id = uid
      and not c.suspended
      and c.state <> 'new'
      and c.due < boundary
      and w.deck_id in (select public.study_deck_ids(uid))
      and (p_deck_id is null or w.deck_id = p_deck_id)
    order by c.due
    limit review_cap
  )
  union all
  (
    select c.word_id, c.direction, c.state, c.due, c.stability, c.difficulty, c.elapsed_days,
           c.scheduled_days, c.learning_steps, c.reps, c.lapses, c.last_review, true,
           to_jsonb(w) - 'normalized' - 'reading_key'
    from public.user_cards c
    join public.words w on w.id = c.word_id
    where c.user_id = uid
      and not c.suspended
      and c.state = 'new'
      and w.deck_id in (select public.study_deck_ids(uid))
      and (p_deck_id is null or w.deck_id = p_deck_id)
    -- recognize before recall, oldest words first
    order by (c.direction = 'recall'), w.created_at
    limit least(new_left, p_limit)
  );
end;
$$;

-- Counts for the Today page, split by language
create or replace function public.study_overview()
returns table (language public.lang_code, due_count bigint, new_available bigint, total_cards bigint)
language plpgsql stable security definer set search_path = ''
as $$
#variable_conflict use_column
declare
  uid uuid := auth.uid();
  boundary timestamptz;
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;
  boundary := public.next_day_start(uid);
  return query
    select w.language,
           count(*) filter (where c.state <> 'new' and c.due < boundary),
           count(*) filter (where c.state = 'new'),
           count(*)
    from public.user_cards c
    join public.words w on w.id = c.word_id
    where c.user_id = uid
      and not c.suspended
      and w.deck_id in (select public.study_deck_ids(uid))
    group by w.language;
end;
$$;

-- ---------------------------------------------------------------------------
-- record_review: called only from the server (service role) after the server
-- recomputed the FSRS state with ts-fsrs. Never callable by clients.
-- ---------------------------------------------------------------------------
create or replace function public.record_review(
  p_user_id uuid,
  p_word_id uuid,
  p_direction text,
  p_mode public.review_mode,
  p_rating smallint,
  p_was_correct boolean,
  p_duration_ms int,
  p_update_card boolean,
  p_card jsonb,
  p_reviewed_at timestamptz default now()
)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  before_state public.card_state;
  the_day date;
  goal int;
  stats public.daily_stats;
  bonus int := 0;
begin
  select state into before_state
  from public.user_cards
  where user_id = p_user_id and word_id = p_word_id and direction = p_direction
  for update;

  if before_state is null then
    -- practice on a word without a card yet: create it lazily
    insert into public.user_cards (user_id, word_id, direction)
    values (p_user_id, p_word_id, p_direction)
    on conflict do nothing;
    before_state := 'new';
  end if;

  if p_update_card then
    update public.user_cards set
      state = (p_card->>'state')::public.card_state,
      due = (p_card->>'due')::timestamptz,
      stability = (p_card->>'stability')::double precision,
      difficulty = (p_card->>'difficulty')::double precision,
      elapsed_days = coalesce((p_card->>'elapsed_days')::int, 0),
      scheduled_days = coalesce((p_card->>'scheduled_days')::int, 0),
      learning_steps = coalesce((p_card->>'learning_steps')::int, 0),
      reps = (p_card->>'reps')::int,
      lapses = (p_card->>'lapses')::int,
      last_review = (p_card->>'last_review')::timestamptz
    where user_id = p_user_id and word_id = p_word_id and direction = p_direction;
  end if;

  insert into public.review_logs (user_id, word_id, direction, mode, rating, was_correct, duration_ms, state_before, reviewed_at)
  values (p_user_id, p_word_id, p_direction, p_mode, p_rating, p_was_correct, p_duration_ms, before_state, p_reviewed_at);

  the_day := public.study_day(p_user_id, p_reviewed_at);
  insert into public.daily_stats (user_id, day, reviews, correct, new_learned, xp)
  values (
    p_user_id, the_day, 1,
    case when coalesce(p_was_correct, p_rating >= 3) then 1 else 0 end,
    case when p_update_card and before_state = 'new' then 1 else 0 end,
    1
  )
  on conflict (user_id, day) do update set
    reviews = public.daily_stats.reviews + 1,
    correct = public.daily_stats.correct + excluded.correct,
    new_learned = public.daily_stats.new_learned + excluded.new_learned,
    xp = public.daily_stats.xp + 1
  returning * into stats;

  select daily_goal into goal from public.user_settings where user_id = p_user_id;
  if not stats.goal_reached and stats.reviews >= coalesce(goal, 20) then
    bonus := 10;
    update public.daily_stats
      set goal_reached = true, xp = xp + bonus
      where user_id = p_user_id and day = the_day
      returning * into stats;
  end if;

  return jsonb_build_object(
    'day', stats.day,
    'reviews', stats.reviews,
    'correct', stats.correct,
    'xp', stats.xp,
    'goal_reached', stats.goal_reached,
    'goal_bonus', bonus
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- AI usage counters (server only)
-- ---------------------------------------------------------------------------
create or replace function public.increment_ai_usage(p_user_id uuid, p_day date)
returns int
language sql security definer set search_path = ''
as $$
  insert into public.ai_usage (user_id, day, requests) values (p_user_id, p_day, 1)
  on conflict (user_id, day) do update set requests = public.ai_usage.requests + 1
  returning requests;
$$;

create or replace function public.ai_usage_total(p_day date)
returns bigint
language sql stable security definer set search_path = ''
as $$
  select coalesce(sum(requests), 0) from public.ai_usage where day = p_day;
$$;

create or replace function public.cache_hit(p_language public.lang_code, p_normalized text, p_prompt_version int)
returns void
language sql security definer set search_path = ''
as $$
  update public.dictionary_cache set hit_count = hit_count + 1
  where language = p_language and normalized = p_normalized and prompt_version = p_prompt_version;
$$;

-- Fixed-window rate limiter: returns true when the hit is allowed.
create or replace function public.hit_rate_limit(p_user_id uuid, p_bucket text, p_window_seconds int, p_max int)
returns boolean
language plpgsql security definer set search_path = ''
as $$
declare
  win timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  n int;
begin
  insert into public.rate_limits (user_id, bucket, window_start, hits)
  values (p_user_id, p_bucket, win, 1)
  on conflict (user_id, bucket, window_start) do update set hits = public.rate_limits.hits + 1
  returning hits into n;
  delete from public.rate_limits where window_start < now() - interval '2 days';
  return n <= p_max;
end;
$$;

-- ---------------------------------------------------------------------------
-- Clone a deck (server only, after the server checked access)
-- ---------------------------------------------------------------------------
create or replace function public.clone_deck(p_user_id uuid, p_deck_id uuid)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  src public.decks;
  new_id uuid;
begin
  select * into src from public.decks where id = p_deck_id;
  if src.id is null then
    raise exception 'deck_not_found';
  end if;
  insert into public.decks (owner_id, name, description, language, visibility, cloned_from)
  values (p_user_id, left(src.name, 80), src.description, src.language, 'private', src.id)
  returning id into new_id;

  insert into public.words (deck_id, created_by, language, term, normalized, reading, reading_key,
    parts_of_speech, meaning_vi, meaning_en, examples, synonyms, antonyms, collocations, word_family,
    topic, emoji, image_url, image_source, lang_extra, ai_generated)
  select new_id, null, w.language, w.term, w.normalized, w.reading, w.reading_key,
    w.parts_of_speech, w.meaning_vi, w.meaning_en, w.examples, w.synonyms, w.antonyms, w.collocations,
    w.word_family, w.topic, w.emoji, w.image_url, w.image_source, w.lang_extra, w.ai_generated
  from public.words w where w.deck_id = p_deck_id;

  return new_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Execute privileges
-- ---------------------------------------------------------------------------
revoke execute on all functions in schema public from public, anon;

grant execute on function
  public.is_group_member(uuid),
  public.shares_group_with(uuid),
  public.can_read_deck(uuid),
  public.can_edit_deck(uuid),
  public.join_group(text),
  public.group_preview(text),
  public.regenerate_invite_code(uuid),
  public.weekly_leaderboard(uuid),
  public.ensure_user_cards(uuid),
  public.get_due_cards(uuid, int),
  public.study_overview()
to authenticated;

-- group_preview is also used on the public /join page before login
grant execute on function public.group_preview(text) to anon;

-- Server-only functions
revoke execute on function
  public.record_review(uuid, uuid, text, public.review_mode, smallint, boolean, int, boolean, jsonb, timestamptz),
  public.increment_ai_usage(uuid, date),
  public.ai_usage_total(date),
  public.cache_hit(public.lang_code, text, int),
  public.hit_rate_limit(uuid, text, int, int),
  public.clone_deck(uuid, uuid),
  public.study_deck_ids(uuid),
  public.new_cards_left(uuid),
  public.study_day(uuid, timestamptz),
  public.next_day_start(uuid),
  public.user_tz(uuid)
from authenticated;

grant execute on function
  public.record_review(uuid, uuid, text, public.review_mode, smallint, boolean, int, boolean, jsonb, timestamptz),
  public.increment_ai_usage(uuid, date),
  public.ai_usage_total(date),
  public.cache_hit(public.lang_code, text, int),
  public.hit_rate_limit(uuid, text, int, int),
  public.clone_deck(uuid, uuid),
  public.study_deck_ids(uuid),
  public.new_cards_left(uuid),
  public.study_day(uuid, timestamptz),
  public.next_day_start(uuid),
  public.user_tz(uuid)
to service_role;

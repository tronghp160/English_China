-- Sổ Từ — Phase 4: review/practice support (docs/PLAN.md §10)

-- ---------------------------------------------------------------------------
-- Idempotent review submissions: the client outbox may resend after a lost
-- response, so each review carries a client-generated id.
-- ---------------------------------------------------------------------------
alter table public.review_logs add column client_id uuid;
create unique index review_logs_client_id_key on public.review_logs (user_id, client_id)
  where client_id is not null;

drop function public.record_review(uuid, uuid, text, public.review_mode, smallint, boolean, int, boolean, jsonb, timestamptz);

-- XP (§10.5): every flashcard review = 1, a practice answer = 1 only when correct.
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
  p_reviewed_at timestamptz default now(),
  p_client_id uuid default null
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
  gained int;
  correct boolean := coalesce(p_was_correct, p_rating >= 3);
begin
  if p_client_id is not null and exists (
    select 1 from public.review_logs where user_id = p_user_id and client_id = p_client_id
  ) then
    return jsonb_build_object('duplicate', true);
  end if;

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

  insert into public.review_logs (user_id, word_id, direction, mode, rating, was_correct, duration_ms,
                                  state_before, reviewed_at, client_id)
  values (p_user_id, p_word_id, p_direction, p_mode, p_rating, p_was_correct, p_duration_ms,
          before_state, p_reviewed_at, p_client_id);

  gained := case when p_mode = 'flashcard' or correct then 1 else 0 end;
  the_day := public.study_day(p_user_id, p_reviewed_at);
  insert into public.daily_stats (user_id, day, reviews, correct, new_learned, xp)
  values (
    p_user_id, the_day, 1,
    case when correct then 1 else 0 end,
    case when p_update_card and before_state = 'new' then 1 else 0 end,
    gained
  )
  on conflict (user_id, day) do update set
    reviews = public.daily_stats.reviews + 1,
    correct = public.daily_stats.correct + excluded.correct,
    new_learned = public.daily_stats.new_learned + excluded.new_learned,
    xp = public.daily_stats.xp + excluded.xp
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
    'xp_gained', gained + bonus,
    'goal_reached', stats.goal_reached,
    'goal_bonus', bonus
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Today page (§10.2): counts per language + what is left of today's limits
-- ---------------------------------------------------------------------------
create or replace function public.today_overview()
returns table (
  language public.lang_code,
  due_count bigint,
  new_available bigint,
  due_tomorrow bigint,
  total_cards bigint,
  new_left int,
  reviews_left int,
  study_day date
)
language plpgsql stable security definer set search_path = ''
as $$
#variable_conflict use_column
declare
  uid uuid := auth.uid();
  boundary timestamptz;
  v_new_left int;
  v_reviews_left int;
  v_day date;
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;
  boundary := public.next_day_start(uid);
  v_day := public.study_day(uid);
  v_new_left := public.new_cards_left(uid);
  v_reviews_left := greatest(
    coalesce((select daily_review_limit from public.user_settings where user_id = uid), 200)
    - coalesce((select reviews from public.daily_stats where user_id = uid and day = v_day), 0), 0);
  return query
    select w.language,
           count(*) filter (where c.state <> 'new' and c.due < boundary),
           count(*) filter (where c.state = 'new'),
           count(*) filter (where c.state <> 'new' and c.due >= boundary and c.due < boundary + interval '1 day'),
           count(*),
           v_new_left,
           v_reviews_left,
           v_day
    from public.user_cards c
    join public.words w on w.id = c.word_id
    where c.user_id = uid
      and not c.suspended
      and w.deck_id in (select public.study_deck_ids(uid))
    group by w.language;
end;
$$;

-- ---------------------------------------------------------------------------
-- Practice (§10.4): pick words from one deck (or all studied decks of a language)
-- p_source: all | due | hard | recent
-- ---------------------------------------------------------------------------
create or replace function public.practice_words(
  p_deck_id uuid,
  p_language public.lang_code,
  p_source text default 'all',
  p_limit int default 20
)
returns table (word jsonb, lapses int, card_state public.card_state)
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
  if p_deck_id is not null and not public.can_read_deck(p_deck_id) then
    return;
  end if;
  boundary := public.next_day_start(uid);

  return query
    select to_jsonb(w) - 'normalized' - 'reading_key', coalesce(c.lapses, 0), coalesce(c.state, 'new'::public.card_state)
    from public.words w
    left join public.user_cards c on c.word_id = w.id and c.user_id = uid and c.direction = 'recognize'
    where (case when p_deck_id is null
                then w.deck_id in (select public.study_deck_ids(uid)) and w.language = p_language
                else w.deck_id = p_deck_id end)
      and coalesce(c.suspended, false) = false
      and (p_source <> 'due' or (c.state is not null and c.state <> 'new' and c.due < boundary))
      and (p_source <> 'hard' or (c.lapses > 0 or c.difficulty >= 6))
    order by
      case when p_source = 'due' then extract(epoch from c.due) end asc,
      case when p_source = 'hard' then c.lapses end desc,
      case when p_source = 'hard' then c.difficulty end desc,
      case when p_source = 'recent' then w.created_at end desc,
      random()
    limit least(greatest(p_limit, 1), 300);
end;
$$;

-- ---------------------------------------------------------------------------
-- Stats page: card distribution over studied decks
-- ---------------------------------------------------------------------------
create or replace function public.card_distribution()
returns table (language public.lang_code, bucket text, n bigint)
language plpgsql stable security definer set search_path = ''
as $$
#variable_conflict use_column
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;
  return query
    select w.language,
           case
             when c.suspended then 'suspended'
             when c.state = 'new' then 'new'
             when c.state in ('learning', 'relearning') then 'learning'
             when c.stability >= 21 then 'mature'
             else 'young'
           end as bucket,
           count(*)
    from public.user_cards c
    join public.words w on w.id = c.word_id
    where c.user_id = uid
      and c.direction = 'recognize'
      and w.deck_id in (select public.study_deck_ids(uid))
    group by 1, 2;
end;
$$;

-- ---------------------------------------------------------------------------
-- Privileges
-- ---------------------------------------------------------------------------
revoke execute on function
  public.record_review(uuid, uuid, text, public.review_mode, smallint, boolean, int, boolean, jsonb, timestamptz, uuid),
  public.today_overview(),
  public.practice_words(uuid, public.lang_code, text, int),
  public.card_distribution()
from public, anon;

grant execute on function
  public.today_overview(),
  public.practice_words(uuid, public.lang_code, text, int),
  public.card_distribution()
to authenticated;

revoke execute on function
  public.record_review(uuid, uuid, text, public.review_mode, smallint, boolean, int, boolean, jsonb, timestamptz, uuid)
from authenticated;
grant execute on function
  public.record_review(uuid, uuid, text, public.review_mode, smallint, boolean, int, boolean, jsonb, timestamptz, uuid)
to service_role;

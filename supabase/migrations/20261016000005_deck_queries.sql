-- Sổ Từ — deck list and deck word search (docs/PLAN.md §11.1, §11.2)

-- Decks the caller studies (own, subscribed, group) with due counts.
create or replace function public.my_decks()
returns table (
  id uuid,
  name text,
  description text,
  language public.lang_code,
  visibility public.deck_visibility,
  group_id uuid,
  group_name text,
  owner_id uuid,
  owner_name text,
  relation text,            -- 'own' | 'subscribed' | 'group'
  word_count int,
  due_count bigint,
  new_count bigint,
  share_slug text,
  updated_at timestamptz
)
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
    select d.id, d.name, d.description, d.language, d.visibility, d.group_id, g.name,
           d.owner_id, p.display_name,
           case when d.owner_id = uid then 'own'
                when exists (select 1 from public.deck_subscriptions s where s.deck_id = d.id and s.user_id = uid) then 'subscribed'
                else 'group' end,
           d.word_count,
           (select count(*) from public.user_cards c join public.words w on w.id = c.word_id
             where c.user_id = uid and w.deck_id = d.id and not c.suspended
               and c.state <> 'new' and c.due < boundary),
           (select count(*) from public.words w
             where w.deck_id = d.id
               and not exists (select 1 from public.user_cards c
                               where c.user_id = uid and c.word_id = w.id and c.direction = 'recognize'
                                 and c.state <> 'new')),
           d.share_slug,
           d.updated_at
    from public.decks d
    join public.profiles p on p.id = d.owner_id
    left join public.groups g on g.id = d.group_id
    where d.id in (select public.study_deck_ids(uid))
    order by (d.owner_id = uid) desc, d.updated_at desc;
end;
$$;

-- Words in a deck with the caller's learning status, filtered and sorted.
-- security invoker: RLS on words / user_cards applies.
create or replace function public.search_deck_words(
  p_deck_id uuid,
  p_q text default null,
  p_topic text default null,
  p_pos text default null,
  p_status text default null,      -- 'new' | 'learning' | 'learned' | 'hard' | 'suspended'
  p_level text default null,       -- CEFR (A1..C2) or HSK level ('1'..'9')
  p_sort text default 'newest',    -- 'newest' | 'az' | 'hard'
  p_offset int default 0,
  p_limit int default 50
)
returns table (
  id uuid,
  term text,
  reading text,
  meaning_vi text,
  parts_of_speech text[],
  topic text,
  emoji text,
  image_url text,
  lang_extra jsonb,
  created_at timestamptz,
  card_state public.card_state,
  due timestamptz,
  lapses int,
  suspended boolean
)
language sql stable security invoker set search_path = ''
as $$
  with q as (
    select nullif(trim(p_q), '') as text,
           -- toneless ascii pinyin, same as words.reading_key ("píng guǒ" -> "pingguo")
           regexp_replace(
             translate(lower(coalesce(p_q, '')), 'āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜüv', 'aaaaeeeeiiiioooouuuuuuuuuu'),
             '[^a-z]', '', 'g') as ascii
  )
  select w.id, w.term, w.reading, w.meaning_vi, w.parts_of_speech, w.topic, w.emoji, w.image_url,
         w.lang_extra, w.created_at,
         coalesce(c.state, 'new'::public.card_state), c.due, coalesce(c.lapses, 0), coalesce(c.suspended, false)
  from public.words w
  cross join q
  left join public.user_cards c
    on c.word_id = w.id and c.user_id = auth.uid() and c.direction = 'recognize'
  where w.deck_id = p_deck_id
    and (q.text is null
         or w.term ilike '%' || q.text || '%'
         or w.meaning_vi ilike '%' || q.text || '%'
         or w.normalized ilike '%' || lower(q.text) || '%'
         or (q.ascii <> '' and w.reading_key ilike '%' || q.ascii || '%'))
    and (p_topic is null or w.topic = p_topic)
    and (p_pos is null or p_pos = any (w.parts_of_speech))
    and (p_level is null
         or w.lang_extra->>'cefr' = p_level
         or w.lang_extra->'hsk'->>'level' = p_level)
    and (p_status is null
         or (p_status = 'new' and coalesce(c.state, 'new') = 'new' and not coalesce(c.suspended, false))
         or (p_status = 'learning' and c.state in ('learning', 'relearning'))
         or (p_status = 'learned' and c.state = 'review' and c.lapses < 3)
         or (p_status = 'hard' and coalesce(c.lapses, 0) >= 3)
         or (p_status = 'suspended' and coalesce(c.suspended, false)))
  order by
    case when p_sort = 'az' then lower(w.term) end asc,
    case when p_sort = 'hard' then coalesce(c.lapses, 0) end desc,
    w.created_at desc,
    w.id
  offset greatest(p_offset, 0)
  limit least(greatest(p_limit, 1), 100);
$$;

-- Topics used in a deck (for the filter chips)
create or replace function public.deck_topics(p_deck_id uuid)
returns table (topic text, n bigint)
language sql stable security invoker set search_path = ''
as $$
  select w.topic, count(*) from public.words w
  where w.deck_id = p_deck_id and w.topic is not null
  group by w.topic order by count(*) desc, w.topic;
$$;

-- Suspend / unsuspend the caller's cards for some words
create or replace function public.set_suspended(p_word_ids uuid[], p_suspended boolean)
returns int
language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  n int;
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;
  -- make sure cards exist so a new word can be suspended too
  insert into public.user_cards (user_id, word_id, direction)
  select uid, w.id, 'recognize' from public.words w
  where w.id = any (p_word_ids) and public.can_read_deck(w.deck_id)
  on conflict do nothing;
  update public.user_cards set suspended = p_suspended
  where user_id = uid and word_id = any (p_word_ids);
  get diagnostics n = row_count;
  return n;
end;
$$;

-- Review history summary for one word (detail page)
create or replace function public.word_progress(p_word_id uuid)
returns table (direction text, state public.card_state, due timestamptz, last_review timestamptz,
               reps int, lapses int, suspended boolean)
language sql stable security invoker set search_path = ''
as $$
  select c.direction, c.state, c.due, c.last_review, c.reps, c.lapses, c.suspended
  from public.user_cards c
  where c.user_id = auth.uid() and c.word_id = p_word_id
  order by c.direction desc;
$$;

revoke execute on function public.my_decks(), public.search_deck_words(uuid, text, text, text, text, text, text, int, int),
  public.deck_topics(uuid), public.set_suspended(uuid[], boolean), public.word_progress(uuid) from public, anon;
grant execute on function public.my_decks(), public.search_deck_words(uuid, text, text, text, text, text, text, int, int),
  public.deck_topics(uuid), public.set_suspended(uuid[], boolean), public.word_progress(uuid) to authenticated;

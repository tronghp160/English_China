-- Sổ Từ — Row Level Security (docs/PLAN.md §5.4). RLS is on for every table.

alter table public.profiles enable row level security;
alter table public.user_settings enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.decks enable row level security;
alter table public.deck_subscriptions enable row level security;
alter table public.words enable row level security;
alter table public.user_cards enable row level security;
alter table public.review_logs enable row level security;
alter table public.daily_stats enable row level security;
alter table public.dictionary_cache enable row level security;
alter table public.ai_usage enable row level security;
alter table public.rate_limits enable row level security;

-- Nothing is readable anonymously; the share page (/d/[slug]) reads through the server.
revoke all on all tables in schema public from anon;

-- profiles: public columns only, readable by signed-in users; owner edits
create policy "profiles: signed-in read" on public.profiles
  for select to authenticated using (true);
create policy "profiles: owner update" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- user_settings: owner only
create policy "settings: owner read" on public.user_settings
  for select to authenticated using (user_id = auth.uid());
create policy "settings: owner update" on public.user_settings
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- groups
create policy "groups: members read" on public.groups
  for select to authenticated using (owner_id = auth.uid() or public.is_group_member(id));
create policy "groups: anyone creates" on public.groups
  for insert to authenticated with check (owner_id = auth.uid());
create policy "groups: owner update" on public.groups
  for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "groups: owner delete" on public.groups
  for delete to authenticated using (owner_id = auth.uid());
-- invite_code is regenerated through the RPC; owners must not set arbitrary codes
revoke update on public.groups from authenticated;
grant update (name, description) on public.groups to authenticated;

-- group_members: join via join_group(); leave yourself; owner removes others
create policy "members: same group read" on public.group_members
  for select to authenticated using (public.is_group_member(group_id));
create policy "members: leave or owner removes" on public.group_members
  for delete to authenticated using (
    (user_id = auth.uid() and role <> 'owner')
    or exists (select 1 from public.groups g where g.id = group_id and g.owner_id = auth.uid() and user_id <> auth.uid())
  );

-- decks
-- Inline (not can_read_deck) so INSERT ... RETURNING can see the new row.
create policy "decks: readable" on public.decks
  for select to authenticated using (
    owner_id = auth.uid()
    or visibility = 'public'
    or (visibility = 'group' and public.is_group_member(group_id))
    or (share_slug is not null and exists (
          select 1 from public.deck_subscriptions s
          where s.deck_id = decks.id and s.user_id = auth.uid()))
  );
create policy "decks: owner inserts" on public.decks
  for insert to authenticated with check (
    owner_id = auth.uid()
    and (group_id is null or public.is_group_member(group_id))
  );
create policy "decks: owner updates" on public.decks
  for update to authenticated using (owner_id = auth.uid()) with check (
    owner_id = auth.uid()
    and (group_id is null or public.is_group_member(group_id))
  );
create policy "decks: owner deletes" on public.decks
  for delete to authenticated using (owner_id = auth.uid());
revoke update on public.decks from authenticated;
grant update (name, description, visibility, group_id, share_slug, allow_member_edit, enable_recall)
  on public.decks to authenticated;

-- deck_subscriptions
create policy "subs: own read" on public.deck_subscriptions
  for select to authenticated using (user_id = auth.uid());
create policy "subs: own insert" on public.deck_subscriptions
  for insert to authenticated with check (user_id = auth.uid() and public.can_read_deck(deck_id));
create policy "subs: own delete" on public.deck_subscriptions
  for delete to authenticated using (user_id = auth.uid());

-- words
create policy "words: readable" on public.words
  for select to authenticated using (public.can_read_deck(deck_id));
create policy "words: editors insert" on public.words
  for insert to authenticated with check (public.can_edit_deck(deck_id) and created_by = auth.uid());
create policy "words: editors update" on public.words
  for update to authenticated using (public.can_edit_deck(deck_id)) with check (public.can_edit_deck(deck_id));
create policy "words: editors delete" on public.words
  for delete to authenticated using (public.can_edit_deck(deck_id));
revoke update on public.words from authenticated;
grant update (deck_id, term, normalized, reading, reading_key, parts_of_speech, meaning_vi, meaning_en,
  examples, synonyms, antonyms, collocations, word_family, topic, emoji, image_url, image_source,
  lang_extra, personal_note, ai_generated) on public.words to authenticated;

-- study data: owner reads; writes go through RPC / server
create policy "cards: own read" on public.user_cards
  for select to authenticated using (user_id = auth.uid());
create policy "logs: own read" on public.review_logs
  for select to authenticated using (user_id = auth.uid());
create policy "ai_usage: own read" on public.ai_usage
  for select to authenticated using (user_id = auth.uid());

-- daily_stats: own + group mates (leaderboard, activity)
create policy "stats: own or group mates" on public.daily_stats
  for select to authenticated using (user_id = auth.uid() or public.shares_group_with(user_id));

-- dictionary_cache, rate_limits: no client policies (service role only)

-- Write privileges clients never need
revoke insert, update, delete on public.user_cards, public.review_logs, public.daily_stats,
  public.ai_usage, public.dictionary_cache, public.rate_limits from authenticated;
revoke select on public.dictionary_cache, public.rate_limits from authenticated;
revoke insert, update, delete on public.profiles, public.user_settings from authenticated;
grant update (username, display_name, avatar_url) on public.profiles to authenticated;
grant update (daily_new_limit, daily_review_limit, daily_goal, study_langs, timezone, onboarded, prefs)
  on public.user_settings to authenticated;
revoke insert, update on public.group_members from authenticated;

-- Sổ Từ — core schema (docs/PLAN.md §5)
create extension if not exists pg_trgm with schema extensions;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.lang_code as enum ('en', 'zh');
create type public.deck_visibility as enum ('private', 'group', 'public');
create type public.group_role as enum ('owner', 'member');
create type public.card_state as enum ('new', 'learning', 'review', 'relearning');
-- 'cloze' added: it is one of the practice modes in §10.4.
create type public.review_mode as enum ('flashcard', 'quiz', 'typing', 'listening', 'cloze', 'writing', 'tones');

-- ---------------------------------------------------------------------------
-- Profiles (public part) — created by trigger on auth.users
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  username text unique not null check (username ~ '^[a-z0-9_]{3,20}$'),
  display_name text not null check (char_length(display_name) between 1 and 50),
  avatar_url text,
  created_at timestamptz not null default now()
);

-- Private per-user settings. Split from profiles so other users can read
-- only the public columns (§5.4) with plain row-level policies.
create table public.user_settings (
  user_id uuid primary key references public.profiles on delete cascade,
  daily_new_limit int not null default 15 check (daily_new_limit between 0 and 200),
  daily_review_limit int not null default 200 check (daily_review_limit between 0 and 2000),
  daily_goal int not null default 20 check (daily_goal between 1 and 1000),
  study_langs public.lang_code[] not null default '{en}',
  timezone text not null default 'Asia/Ho_Chi_Minh',
  onboarded boolean not null default false,
  -- UI preferences: voices, tts rate, auto-speak, hide images/pinyin, tone colors, ai auto-suggest
  prefs jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Groups
-- ---------------------------------------------------------------------------
create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 60),
  description text check (char_length(description) <= 300),
  owner_id uuid not null references public.profiles on delete cascade,
  invite_code text unique not null,
  created_at timestamptz not null default now()
);

create table public.group_members (
  group_id uuid references public.groups on delete cascade,
  user_id uuid references public.profiles on delete cascade,
  role public.group_role not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
create index on public.group_members (user_id);

-- ---------------------------------------------------------------------------
-- Decks
-- ---------------------------------------------------------------------------
create table public.decks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  description text check (char_length(description) <= 500),
  language public.lang_code not null,
  visibility public.deck_visibility not null default 'private',
  group_id uuid references public.groups on delete set null,
  share_slug text unique,
  allow_member_edit boolean not null default false,
  enable_recall boolean not null default true,      -- meaning -> word cards
  cloned_from uuid references public.decks on delete set null,
  word_count int not null default 0,
  learner_count int not null default 0,             -- subscribers, for /explore sorting
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (visibility <> 'group' or group_id is not null)
);
create index on public.decks (owner_id);
create index on public.decks (group_id) where group_id is not null;
create index on public.decks (visibility) where visibility = 'public';

create table public.deck_subscriptions (
  user_id uuid references public.profiles on delete cascade,
  deck_id uuid references public.decks on delete cascade,
  subscribed_at timestamptz not null default now(),
  primary key (user_id, deck_id)
);
create index on public.deck_subscriptions (deck_id);

-- ---------------------------------------------------------------------------
-- Words
-- ---------------------------------------------------------------------------
create table public.words (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid not null references public.decks on delete cascade,
  -- nullable: the plan's "not null ... on delete set null" would conflict
  created_by uuid references public.profiles on delete set null,
  language public.lang_code not null,
  term text not null check (char_length(term) between 1 and 80),
  normalized text not null,
  reading text,
  reading_key text,                                   -- toneless ascii pinyin for search (zh)
  parts_of_speech text[] not null default '{}',
  meaning_vi text not null check (char_length(meaning_vi) between 1 and 300),
  meaning_en text,
  examples jsonb not null default '[]',
  synonyms text[] not null default '{}',
  antonyms text[] not null default '{}',
  collocations jsonb not null default '[]',
  word_family jsonb not null default '[]',
  topic text,
  emoji text,
  image_url text,
  image_source jsonb,
  lang_extra jsonb not null default '{}',
  personal_note text check (char_length(personal_note) <= 1000),
  ai_generated boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (deck_id, normalized)
);
create index on public.words (deck_id, created_at desc);
create index words_term_trgm on public.words using gin (term extensions.gin_trgm_ops);
create index words_meaning_trgm on public.words using gin (meaning_vi extensions.gin_trgm_ops);
create index words_reading_key_trgm on public.words using gin (reading_key extensions.gin_trgm_ops);
create index on public.words (normalized);

-- ---------------------------------------------------------------------------
-- Study progress (FSRS)
-- ---------------------------------------------------------------------------
create table public.user_cards (
  user_id uuid references public.profiles on delete cascade,
  word_id uuid references public.words on delete cascade,
  direction text not null default 'recognize' check (direction in ('recognize', 'recall')),
  state public.card_state not null default 'new',
  due timestamptz not null default now(),
  stability double precision not null default 0,
  difficulty double precision not null default 0,
  elapsed_days int not null default 0,
  scheduled_days int not null default 0,
  learning_steps int not null default 0,              -- ts-fsrs v5 field
  reps int not null default 0,
  lapses int not null default 0,
  last_review timestamptz,
  suspended boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (user_id, word_id, direction)
);
create index on public.user_cards (user_id, due) where suspended = false;
create index on public.user_cards (word_id);

create table public.review_logs (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles on delete cascade,
  word_id uuid not null references public.words on delete cascade,
  direction text not null,
  mode public.review_mode not null,
  rating smallint not null check (rating between 1 and 4),
  was_correct boolean,
  duration_ms int,
  state_before public.card_state not null,
  reviewed_at timestamptz not null default now()
);
create index on public.review_logs (user_id, reviewed_at desc);
create index on public.review_logs (word_id);

create table public.daily_stats (
  user_id uuid references public.profiles on delete cascade,
  day date not null,
  reviews int not null default 0,
  correct int not null default 0,
  new_learned int not null default 0,
  words_added int not null default 0,
  xp int not null default 0,
  goal_reached boolean not null default false,
  primary key (user_id, day)
);
create index on public.daily_stats (day);

-- ---------------------------------------------------------------------------
-- AI cache / usage, rate limits
-- ---------------------------------------------------------------------------
create table public.dictionary_cache (
  language public.lang_code not null,
  normalized text not null,
  payload jsonb not null,
  model text not null,
  prompt_version int not null,
  hit_count int not null default 0,
  created_at timestamptz not null default now(),
  primary key (language, normalized, prompt_version)
);

create table public.ai_usage (
  user_id uuid references public.profiles on delete cascade,
  day date not null,
  requests int not null default 0,
  primary key (user_id, day)
);
create index on public.ai_usage (day);

create table public.rate_limits (
  user_id uuid references public.profiles on delete cascade,
  bucket text not null,
  window_start timestamptz not null,
  hits int not null default 0,
  primary key (user_id, bucket, window_start)
);

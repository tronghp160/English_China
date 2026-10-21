-- Study tutor chat ("Gia sư"): one thread per conversation, messages stored in
-- the AI SDK UIMessage shape (id + role + parts). Owner-only, like user_settings.

create table public.chat_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  language public.lang_code not null,
  deck_id uuid references public.decks on delete set null,
  title text check (char_length(title) <= 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.chat_threads (user_id, updated_at desc);

create table public.chat_messages (
  thread_id uuid not null references public.chat_threads on delete cascade,
  id text not null check (char_length(id) between 1 and 64),
  user_id uuid not null references public.profiles on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  parts jsonb not null,
  created_at timestamptz not null default now(),
  primary key (thread_id, id)
);
create index on public.chat_messages (thread_id, created_at);

alter table public.chat_threads enable row level security;
alter table public.chat_messages enable row level security;
revoke all on public.chat_threads, public.chat_messages from anon;

create policy "chat threads: owner read" on public.chat_threads
  for select to authenticated using (user_id = auth.uid());
create policy "chat threads: owner insert" on public.chat_threads
  for insert to authenticated with check (user_id = auth.uid());
create policy "chat threads: owner update" on public.chat_threads
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "chat threads: owner delete" on public.chat_threads
  for delete to authenticated using (user_id = auth.uid());

create policy "chat messages: owner read" on public.chat_messages
  for select to authenticated using (user_id = auth.uid());
create policy "chat messages: owner insert" on public.chat_messages
  for insert to authenticated with check (
    user_id = auth.uid()
    and exists (select 1 from public.chat_threads t where t.id = thread_id and t.user_id = auth.uid())
  );
-- Assistant messages are upserted when a stream ends (same id on retry).
create policy "chat messages: owner update" on public.chat_messages
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

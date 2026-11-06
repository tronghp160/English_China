-- Conversations with the AI companion ("Tâm sự" / Clone Chat).
-- Stored on the server and viewable only by admins in the admin panel.
-- Locked with RLS: revoked from anon and authenticated. Written and read only via the service role.

create table public.clone_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  title text check (char_length(title) <= 120),
  first_message text,
  last_message_at timestamptz not null default now(),
  message_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index on public.clone_threads (user_id, updated_at desc);
create index on public.clone_threads (updated_at desc);

create table public.clone_messages (
  thread_id uuid not null references public.clone_threads on delete cascade,
  id text not null check (char_length(id) between 1 and 64),
  user_id uuid not null references public.profiles on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null default '',
  parts jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  primary key (thread_id, id)
);

create index on public.clone_messages (thread_id, created_at asc);

alter table public.clone_threads enable row level security;
alter table public.clone_messages enable row level security;

-- Client roles (anon & authenticated) have no privileges on these tables.
-- All operations are performed exclusively via createAdminClient() (service role).
revoke all on public.clone_threads from anon, authenticated;
revoke all on public.clone_messages from anon, authenticated;

-- Who may open "Tâm sự" (/tam-su, /api/clone): admins, plus the people an admin switched it on for.
-- The default is nobody: a row here is the only way in for an ordinary account.
--
-- This is a table of its own on purpose. A column in profiles or user_settings would be one the user can update on
-- their own row (RLS lets people edit their own profile and settings), so they could switch the feature on for
-- themselves. Here the user can read their own row and nothing else; only the service role writes, from a server
-- action that checked the caller is an admin first (lib/actions/clone-access.ts).

create table public.clone_access (
  user_id uuid primary key references auth.users on delete cascade,
  granted_by uuid references auth.users on delete set null,
  granted_at timestamptz not null default now()
);

alter table public.clone_access enable row level security;

-- Table privileges are the first lock (no insert/update/delete is granted to a client role at all); the single
-- policy is the second (a person sees only their own row, so nobody can learn who else has access).
revoke all on public.clone_access from anon, authenticated;
grant select on public.clone_access to authenticated;
create policy "clone_access: read own row" on public.clone_access
  for select to authenticated
  using (user_id = (select auth.uid()));

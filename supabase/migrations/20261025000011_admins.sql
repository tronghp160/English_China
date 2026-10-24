-- People who may open /admin. Read and written only by the server (service role) after it checked the session;
-- the owner grants the first admin with `pnpm admin:grant <email>` (or lists emails in ADMIN_EMAILS).

create table public.app_admins (
  user_id uuid primary key references auth.users on delete cascade,
  granted_by uuid references auth.users on delete set null,
  granted_at timestamptz not null default now()
);

alter table public.app_admins enable row level security;
-- no client policies (service role only)
revoke all on public.app_admins from anon, authenticated;

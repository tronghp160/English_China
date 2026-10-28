create table public.admin_audit_log (
  id bigint generated always as identity primary key,
  admin_id uuid references auth.users on delete set null,
  admin_email text check (char_length(admin_email) <= 254),
  action text not null check (char_length(action) <= 60),
  target_user_id uuid, -- no foreign key: deleted accounts must stay in the log
  target_label text check (char_length(target_label) <= 200),
  meta jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index on public.admin_audit_log (created_at desc);
create index on public.admin_audit_log (target_user_id, created_at desc);

create table public.admin_user_notes (
  user_id uuid primary key references public.profiles on delete cascade,
  note text not null check (char_length(note) <= 2000),
  updated_by uuid references auth.users on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.admin_audit_log enable row level security;
alter table public.admin_user_notes enable row level security;
revoke all on public.admin_audit_log from anon, authenticated;
revoke all on public.admin_user_notes from anon, authenticated;

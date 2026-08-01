create table if not exists public.bonaflow_state (
  id text primary key,
  state jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.bonaflow_state enable row level security;
revoke all on public.bonaflow_state from anon, authenticated;

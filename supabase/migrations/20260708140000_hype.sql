-- « J'ai hâte » — signal d'anticipation partagé, visible par le groupe.
-- Léger : une ligne par (plan, membre) qui a cliqué.
create table if not exists public.plan_hype (
  plan_id uuid not null references public.plans(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (plan_id, user_id)
);
create index if not exists idx_plan_hype_plan on public.plan_hype (plan_id);

alter table public.plan_hype enable row level security;
alter table public.plan_hype force row level security;
revoke all on public.plan_hype from anon, authenticated;

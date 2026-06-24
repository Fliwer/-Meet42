-- Table « envies » : collecte des intentions de sortie (modèle Envies-first).
-- L'utilisateur dit ce qu'il veut (activités + quand + commune) ; le matching
-- regroupe ensuite (concierge/manuel au début). Idempotente, sûre à rejouer.

create extension if not exists pgcrypto;

create table if not exists public.envies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  activities text[] not null,
  when_slot text not null check (when_slot in ('tonight', 'weekend', 'week')),
  commune text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_envies_created_at on public.envies (created_at);
create index if not exists idx_envies_commune on public.envies (commune);
create index if not exists idx_envies_user_id on public.envies (user_id);

-- RLS (cohérent avec le reste : le backend passe par le service_role qui bypass).
alter table public.envies enable row level security;
alter table public.envies force row level security;

drop policy if exists "envies_insert_self" on public.envies;
create policy "envies_insert_self"
  on public.envies for insert
  with check (user_id = auth.uid());

drop policy if exists "envies_select_own" on public.envies;
create policy "envies_select_own"
  on public.envies for select
  using (user_id = auth.uid());

-- API de données verrouillée pour les rôles publics (comme les autres tables).
revoke all on public.envies from anon, authenticated;

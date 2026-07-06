-- Meet42 — Pivot « rituels » + graphe social réel
-- 1) reservations : une place réservée sur une occurrence de rituel
-- 2) encounters : qui a réellement rencontré qui (co-présence vérifiée)
-- 3) belles_rencontres : intention de recroiser (mutuelle = les 2 lignes croisées existent)
-- 4) profiles.interests : puces d'intérêts (points communs + brise-glace)
-- Idempotente : sûre à rejouer.

-- ── Intérêts sur le profil ──
alter table public.profiles
  add column if not exists interests text[] not null default '{}'::text[];

-- ── Réservations ──
create table if not exists public.reservations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ritual_id text not null,
  occurs_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending', 'matched', 'cancelled')),
  plan_id uuid references public.plans(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (user_id, ritual_id, occurs_at)
);
create index if not exists idx_reservations_slot on public.reservations (ritual_id, occurs_at, status);
create index if not exists idx_reservations_user on public.reservations (user_id);

-- ── Rencontres vécues (le graphe, silencieux au début) ──
-- Une ligne par paire et par plan. user_a < user_b (ordre canonique, pas de doublon).
create table if not exists public.encounters (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans(id) on delete cascade,
  user_a uuid not null references auth.users(id) on delete cascade,
  user_b uuid not null references auth.users(id) on delete cascade,
  met_at timestamptz not null default now(),
  unique (plan_id, user_a, user_b),
  check (user_a < user_b)
);
create index if not exists idx_encounters_user_a on public.encounters (user_a);
create index if not exists idx_encounters_user_b on public.encounters (user_b);

-- ── Belles rencontres (intention de recroiser) ──
-- Mutuelle quand (from,to) ET (to,from) existent. Pas de colonne status.
create table if not exists public.belles_rencontres (
  id uuid primary key default gen_random_uuid(),
  from_user uuid not null references auth.users(id) on delete cascade,
  to_user uuid not null references auth.users(id) on delete cascade,
  plan_id uuid references public.plans(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (from_user, to_user),
  check (from_user <> to_user)
);
create index if not exists idx_belles_to on public.belles_rencontres (to_user);

-- ── Sécurité : même pattern que le reste du schéma ──
-- RLS forcée + aucun accès direct anon/authenticated (tout passe par les API service_role).
alter table public.reservations enable row level security;
alter table public.reservations force row level security;
alter table public.encounters enable row level security;
alter table public.encounters force row level security;
alter table public.belles_rencontres enable row level security;
alter table public.belles_rencontres force row level security;

revoke all on public.reservations from anon, authenticated;
revoke all on public.encounters from anon, authenticated;
revoke all on public.belles_rencontres from anon, authenticated;

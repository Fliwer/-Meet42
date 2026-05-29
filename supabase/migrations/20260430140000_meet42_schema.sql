-- Meet42 MVP schema (Supabase / Postgres)
-- Migration baseline générée depuis supabase/schema.sql (source de vérité).
-- Idempotente : sûre à rejouer sur une base déjà initialisée.

create extension if not exists pgcrypto;

-- Profil minimal (auth -> public.profiles)
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  first_name text not null,
  age int not null check (age >= 18 and age <= 99),
  photo_url text,
  photo_urls text[] not null default '{}'::text[],
  bio text,
  created_at timestamptz not null default now()
);

-- Si la table profiles existe déjà sans la colonne photo_urls :
alter table public.profiles
  add column if not exists photo_urls text[] not null default '{}'::text[];

-- Plan IRL (petits groupes)
create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  activity text not null,
  start_time timestamptz not null,
  max_participants int not null check (max_participants >= 4 and max_participants <= 6),
  location_text text not null,
  lat double precision not null,
  lng double precision not null,
  creator_id uuid not null references public.profiles(user_id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists idx_plans_lat on public.plans (lat);
create index if not exists idx_plans_lng on public.plans (lng);
create index if not exists idx_plans_start_time on public.plans (start_time);

-- Participants (la création ajoute automatiquement le créateur)
create table if not exists public.plan_participants (
  plan_id uuid not null references public.plans(id) on delete cascade,
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (plan_id, user_id)
);

create index if not exists idx_participants_plan_id on public.plan_participants (plan_id);
create index if not exists idx_participants_user_id on public.plan_participants (user_id);

-- Gestion de présence (fiabilité des events)
create table if not exists public.plan_attendance (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans(id) on delete cascade,
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  status text not null check (status in ('pending', 'confirmed', 'cancelled', 'maybe')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (plan_id, user_id)
);

create index if not exists idx_plan_attendance_plan_id on public.plan_attendance (plan_id);
create index if not exists idx_plan_attendance_user_id on public.plan_attendance (user_id);

-- Check-in anti no-show (participant -> statut avant/pendant event)
create table if not exists public.plan_checkins (
  plan_id uuid not null references public.plans(id) on delete cascade,
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  status text not null check (status in ('on_my_way', 'arrived')),
  updated_at timestamptz not null default now(),
  primary key (plan_id, user_id)
);

create index if not exists idx_plan_checkins_plan_id on public.plan_checkins (plan_id);
create index if not exists idx_plan_checkins_user_id on public.plan_checkins (user_id);

-- Feedback ultra simple post-event (oui/non + commentaire optionnel)
create table if not exists public.plan_feedback (
  plan_id uuid not null references public.plans(id) on delete cascade,
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  would_rejoin boolean not null,
  comment text,
  created_at timestamptz not null default now(),
  primary key (plan_id, user_id)
);

create index if not exists idx_plan_feedback_plan_id on public.plan_feedback (plan_id);
create index if not exists idx_plan_feedback_user_id on public.plan_feedback (user_id);

-- Policies RLS
-- Note: le backend MVP utilise SUPABASE_SERVICE_ROLE_KEY (admin) et contourne donc RLS.
-- Les policies protègent les accès directs côté client (clé anon).
alter table public.profiles enable row level security;
alter table public.plans enable row level security;
alter table public.plan_participants enable row level security;
alter table public.plan_attendance enable row level security;
alter table public.plan_checkins enable row level security;
alter table public.plan_feedback enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  using (user_id = auth.uid());

drop policy if exists "profiles_upsert_own" on public.profiles;
create policy "profiles_upsert_own"
  on public.profiles for insert
  with check (user_id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "plans_select_auth" on public.plans;
create policy "plans_select_auth"
  on public.plans for select
  using (auth.role() is not null);

drop policy if exists "plans_insert_creator" on public.plans;
create policy "plans_insert_creator"
  on public.plans for insert
  with check (creator_id = auth.uid());

drop policy if exists "participants_select_auth" on public.plan_participants;
create policy "participants_select_auth"
  on public.plan_participants for select
  using (auth.role() is not null);

drop policy if exists "participants_insert_self" on public.plan_participants;
create policy "participants_insert_self"
  on public.plan_participants for insert
  with check (user_id = auth.uid());

drop policy if exists "attendance_select_auth" on public.plan_attendance;
create policy "attendance_select_auth"
  on public.plan_attendance for select
  using (auth.role() is not null);

drop policy if exists "attendance_insert_self" on public.plan_attendance;
create policy "attendance_insert_self"
  on public.plan_attendance for insert
  with check (user_id = auth.uid());

drop policy if exists "attendance_update_self" on public.plan_attendance;
create policy "attendance_update_self"
  on public.plan_attendance for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "checkins_select_self" on public.plan_checkins;
create policy "checkins_select_self"
  on public.plan_checkins for select
  using (user_id = auth.uid());

drop policy if exists "checkins_upsert_self" on public.plan_checkins;
create policy "checkins_upsert_self"
  on public.plan_checkins for insert
  with check (user_id = auth.uid());

drop policy if exists "checkins_update_self" on public.plan_checkins;
create policy "checkins_update_self"
  on public.plan_checkins for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "feedback_select_self" on public.plan_feedback;
create policy "feedback_select_self"
  on public.plan_feedback for select
  using (user_id = auth.uid());

drop policy if exists "feedback_upsert_self" on public.plan_feedback;
create policy "feedback_upsert_self"
  on public.plan_feedback for insert
  with check (user_id = auth.uid());

drop policy if exists "feedback_update_self" on public.plan_feedback;
create policy "feedback_update_self"
  on public.plan_feedback for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

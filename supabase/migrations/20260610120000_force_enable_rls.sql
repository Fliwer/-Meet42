-- Force RLS on all public tables (fix Supabase advisor: rls_disabled_in_public)
-- Idempotente : sûre à rejouer. Le backend utilise SUPABASE_SERVICE_ROLE_KEY
-- (bypass RLS), donc activer RLS ne change rien au fonctionnement de l'app ;
-- ça verrouille uniquement les accès directs via la clé anon (public).

-- 1) Active RLS (no-op si déjà actif)
alter table public.profiles          enable row level security;
alter table public.plans             enable row level security;
alter table public.plan_participants enable row level security;
alter table public.plan_attendance   enable row level security;
alter table public.plan_checkins     enable row level security;
alter table public.plan_feedback     enable row level security;

-- 2) Force RLS aussi pour le propriétaire de la table (ceinture + bretelles).
--    Le service_role reste exempté (bypassrls), donc l'app n'est pas impactée.
alter table public.profiles          force row level security;
alter table public.plans             force row level security;
alter table public.plan_participants force row level security;
alter table public.plan_attendance   force row level security;
alter table public.plan_checkins     force row level security;
alter table public.plan_feedback     force row level security;

-- 3) Réaffirme les policies (drop if exists + create = idempotent).
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

-- 4) Vérification : liste les tables public où RLS serait encore désactivé.
--    Doit renvoyer 0 ligne après exécution.
-- select relname from pg_class
--   where relnamespace = 'public'::regnamespace
--     and relkind = 'r' and relrowsecurity = false;

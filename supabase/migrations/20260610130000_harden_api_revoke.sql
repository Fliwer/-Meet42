-- Durcissement sécurité prod (Supabase advisor) — appliqué le 2026-06-10.
-- Idempotente : sûre à rejouer. Fige ce qui avait été joué à la main dans le
-- SQL Editor, pour que repo et prod restent alignés (db:push d'une base neuve).

-- 1) Purge de l'ancien schéma prototype (tables + fonctions trigger).
--    Ne contenait que du seed de test (Alice/Bob…, UUID 1111…). Jamais utilisé
--    par l'app (qui vit sur profiles/plans/...).
drop table if exists public.participant_ratings cascade;
drop table if exists public.participations      cascade;
drop table if exists public.messages            cascade;
drop table if exists public.events              cascade;
drop table if exists public.categories          cascade;
drop table if exists public.users               cascade;

do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p
    where p.pronamespace = 'public'::regnamespace
      and p.proname in (
        'set_updated_at','enforce_not_own_event','enforce_event_capacity',
        'enforce_rating_rules','recompute_trust_score','after_rating_update_trust'
      )
  loop
    execute 'drop function if exists ' || r.sig || ' cascade';
  end loop;
end $$;

-- 2) PostGIS : extension installée mais 100% inutilisée (géo calculée en JS via
--    haversineKm, lat/lng en double precision). On la retire → supprime aussi la
--    table système spatial_ref_sys que l'advisor signalait.
drop extension if exists postgis cascade;

-- 3) Verrouillage de l'API de données pour les rôles publics.
--    L'app passe 100% par le service_role côté serveur ; le client n'utilise la
--    clé anon que pour l'auth. On retire donc tout accès PostgREST/GraphQL aux
--    rôles anon/authenticated. Réversible via grant si besoin de client-side direct.
revoke all on all tables    in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on all functions in schema public from anon, authenticated;

-- Empêche les futurs objets créés par ce rôle d'être ré-exposés automatiquement.
alter default privileges in schema public revoke all on tables    from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke all on functions from anon, authenticated;

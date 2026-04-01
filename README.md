# Meet42

Application Next.js pour organiser des activités IRL en petits groupes (4 à 6), avec géolocalisation, création de plans rapides, OAuth social et logique d'annulation 24 h.

## Lancer en local

```bash
npm install
npm run dev
```

Ouvre `http://localhost:3000`.

## Variables d'environnement

Créer un fichier `.env.local` :

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_CONTACT_EMAIL=
```

Sans Supabase configuré, l'application tourne en mode mock (données locales).

## OAuth Google + Facebook (Supabase)

1. Dans Supabase > Authentication > Providers :
   - activer `Google`
   - activer `Facebook`
2. Ajouter dans chaque provider :
   - `Site URL` : `http://localhost:3000` (dev) puis ton domaine prod
   - `Redirect URL` :
     - `https://<PROJECT_REF>.supabase.co/auth/v1/callback`
3. Configurer les `Client ID / Secret` Google et Facebook dans Supabase.
4. Dans Google/Facebook console, ajouter les URI de redirection autorisées ci-dessus.

Ensuite les boutons `Continuer avec Google` et `Continuer avec Facebook` de la page login fonctionnent en un clic.

## Schéma Supabase

Le fichier `supabase/schema.sql` contient le schéma de base.

Si la table `plans` existe déjà en version 2-4, exécuter :

```sql
alter table public.plans
drop constraint if exists plans_max_participants_check;

alter table public.plans
add constraint plans_max_participants_check
check (max_participants >= 4 and max_participants <= 6);
```

## Mise en ligne GitHub

Après création du repo GitHub (ex: `Meet42`) :

```bash
git init
git add .
git commit -m "feat: social auth + pro UI + venue availability"
git branch -M main
git remote add origin https://github.com/<ton-user>/Meet42.git
git push -u origin main
```


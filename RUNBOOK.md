# Meet42 — Runbook fondateur

> Ce qui a été construit, ce qu'il te reste à faire pour lancer, et comment
> tout démontrer. Lis la section **« À faire au réveil »** en premier.

---

## 🌅 À faire au réveil (dans l'ordre)

1. **Appliquer les 3 migrations** dans Supabase → SQL Editor (voir §Migrations).
2. **Régénérer les types Supabase** (facultatif mais propre — voir §Dette).
3. **Ajouter les variables d'env sur Vercel** (Resend + CRON_SECRET, voir §Env),
   puis **redéployer**.
4. **Tester le parcours en prod** : réserver un 42, forcer le matching (§Concierge),
   ouvrir ton groupe.
5. Décider : garder le site verrouillé (`SITE_GATE_PASSWORD`) ou l'ouvrir.

Tant que les migrations ne sont pas appliquées, les réservations en prod
échouent silencieusement (mode réel). En local (mode mock), tout marche déjà.

---

## 🧠 Le produit en une phrase

Meet42 forme des groupes de 4 à 6 inconnus autour d'un **rituel** hebdo
(l'apéro du jeudi, la balade du dimanche). Tu **réserves** ta place, la veille
à midi c'est le **Reveal** (ton groupe + le lieu + vos points communs), tu vis
ton **42**, et le lendemain tu gardes tes **belles rencontres**. En arrière-plan
se construit ton **graphe social réel** — l'actif que personne ne peut copier.

Vocabulaire : on ne dit pas « événement », on dit **un 42**. La couleur, c'est
le corail. La voix, c'est le pote bruxellois qui organise.

---

## ⚙️ L'architecture du moteur (ce qui tourne)

```
Réservation ─▶ [cron/match, J-1 midi] ─▶ Groupes 4-6 + lieu + Reveal (e-mail)
                                              │
                                              ▼
                            Espace de groupe (GroupSpace)
                            avant · jour J · après
                                              │
              [cron/daily, matin] ───────────┤
                 ├─ rappel jour J             │
                 └─ après-42 : écrit encounters (graphe) + « Belle rencontre ? »
                                              ▼
                                    Belle rencontre (double opt-in)
                                              ▼
                              Fil rouge : retissage aux prochains 42
```

- **`/api/rituals`** + **`/api/rituals/reserve`** : les créneaux + la réservation 1-tap.
- **`/api/cron/match`** (Vercel Cron `0 10 * * *` = midi Bruxelles) : forme les
  groupes à J-1, crée un plan privé par groupe (`source='ritual'`, hors feed),
  révèle le lieu, envoie le Reveal. `<4` réservés → report auto + e-mail.
- **`/api/cron/daily`** (`30 7 * * *`) : rappel jour J + après-42 (écrit le
  graphe `encounters`, envoie « Alors, ton 42 ? »).
- **`/api/plans/[id]/group`** : les données de l'espace de groupe.
- **`/api/plans/[id]/hype`** / **`belle-rencontre`** : J'ai hâte / garder le lien.
- **`/api/me/carnet`** : l'historique + les stats + le cercle.

Le matcher (`src/lib/rituals/rituals.ts` → `composeGroups`) est une fonction
pure testée. Le Fil rouge (paires mutuelles assises ensemble, max 2 connus par
groupe) vit dans `cron/match`.

---

## 🗄️ Migrations à appliquer (SQL Editor → Run)

Trois fichiers dans `supabase/migrations/`, à jouer dans l'ordre. Ils sont
idempotents (sûrs à rejouer). Copie-colle le contenu de chacun :

1. `20260707100000_rituals_graph.sql` — reservations, **encounters** (le graphe),
   **belles_rencontres**, `profiles.interests`.
2. `20260708090000_plan_source.sql` — `plans.source` (groupes de rituel privés).
3. `20260708140000_hype.sql` — `plan_hype` (« J'ai hâte »).

Chacun doit répondre **« Success. No rows returned »**.

---

## 🔑 Variables d'environnement (Vercel → Settings → Environments → Production)

| Variable | Rôle | Sans elle |
|----------|------|-----------|
| `RESEND_API_KEY` | Envoi des e-mails (resend.com, gratuit) | Aucun e-mail (no-op) |
| `EMAIL_FROM` | Expéditeur (domaine vérifié Resend) | `onboarding@resend.dev` |
| `CRON_SECRET` | Protège `/api/cron/*` | Crons ouverts |
| `NEXT_PUBLIC_POSTHOG_KEY` | Analytics funnel (optionnel) | Analytics off |
| `SITE_GATE_PASSWORD` | Verrou du site | Site ouvert |

Après ajout : **redéployer** (une env var ne s'applique qu'au prochain déploiement).

> Vercel Cron envoie automatiquement `Authorization: Bearer $CRON_SECRET` aux
> chemins déclarés dans `vercel.json`. Rien à configurer de plus.

---

## 🎩 Mode concierge (les 4 premières semaines)

Au début, la densité est faible : tu opères à la main.

- **Forcer un matching maintenant** (sans attendre J-1) :
  `GET /api/cron/match?force=1` (ajoute le Bearer CRON_SECRET si défini).
  Utile pour composer les groupes quand tu juges qu'il y a assez de monde.
- **Compléter un groupe toi-même** : réserve avec ton compte, ou ajoute des
  amis. `<4` réservés = report auto, jamais d'annulation sèche.
- **Choisir les lieux** : `src/lib/rituals/venues.ts` — édite la liste des bars
  (rotation automatique par semaine).
- **Changer les rituels** : `src/lib/rituals/rituals.ts` (jour, heure, commune).

---

## 🎬 Démontrer la boucle complète (en local, mode mock)

Le mode mock s'active en retirant `.env.local` (déjà le cas en dev sans Supabase).

1. `npm run dev`
2. Crée un compte, complète ton profil (prénom, photo, bio, **3 intérêts**).
3. Réserve « L'apéro du jeudi ».
4. Force le matching : ouvre `http://localhost:3000/api/cron/match?force=1`.
   (En mock il faut ≥ 4 réservations sur le créneau — réserve avec plusieurs
   `x-user-id` via curl, ou baisse `GROUP_MIN` temporairement pour la démo.)
5. Va sur ton Carnet → « Voir mon groupe » → tu es dans l'espace de groupe :
   membres, points communs, brise-glace, « J'ai hâte ».
6. Le lendemain (phase `after`), l'espace propose « Belle rencontre ? ».

---

## ✅ État d'avancement (MVP)

| Bloc | État |
|------|------|
| Rituels + réservation 1-tap | ✅ |
| Matching batch J-1 + report auto | ✅ |
| E-mails (réservé, Reveal, rappel, après, report) | ✅ (clé Resend requise) |
| Espace de groupe (Reveal, points communs, brise-glace) | ✅ |
| J'ai hâte + check-in jour J | ✅ |
| Belle rencontre (double opt-in) + graphe encounters | ✅ |
| Intérêts au profil | ✅ |
| Carnet (historique + cercle + jalons) | ✅ |
| Home pivoté « Ton prochain 42 » | ✅ |
| Analytics funnel (PostHog) | ✅ (clé optionnelle) |
| OpenGraph + SEO | ✅ |
| Verrou d'accès | ✅ (env) |

**Reste V1 (post-lancement)** : carte de partage du Reveal (story), parrainage
« offre une place », PWA + push, illustrations, la Constellation (V2, quand la
densité existe).

---

## 🧹 Dette technique connue

- **`database.types.ts` est périmé** : il ne contient ni `reservations`,
  `encounters`, `belles_rencontres`, `plan_hype`, ni `profiles.interests` /
  `plans.source`. Le code compile via des casts `as unknown as SupabaseClient`.
  À régénérer après les migrations :
  `npx supabase gen types typescript --project-id <id> > src/lib/supabase/database.types.ts`
  puis retirer les casts.
- **Fins de ligne** : Git convertit LF→CRLF sous Windows (warnings inoffensifs).
- **Rate limiting** : pas encore posé sur les routes API (à ajouter avant fort
  trafic).
- **Suppression de compte (RGPD)** : les cascades DB sont en place, mais pas
  encore de bouton « supprimer mon compte » dans l'UI.
